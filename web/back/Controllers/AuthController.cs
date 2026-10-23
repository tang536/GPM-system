using back.Data;
using back.DTOs;
using back.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace back.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(GradDb db, JwtTokenService jwt, LogService log) : ControllerBase
{
    /// <summary>登录：校验账号密码与账号状态，加载角色权限后签发 JWT（报告 3.2 节 P1 用户登录与权限校验）。</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginIn i)
    {
        if (i.Account.Blank() || i.Password.Blank())
            return BadRequest(new { error = "请输入账号和密码" });

        var user = await db.SysUserSet.FirstOrDefaultAsync(u => u.Account == i.Account.Trim());
        if (user is null) return BadRequest(new { error = "账号不存在" });
        if (user.Status != "启用") return BadRequest(new { error = "账号已停用，请联系系统管理员" });
        if (!PasswordUtil.Verify(i.Password, user.Password))
            return BadRequest(new { error = "密码不正确" });

        var profile = await ProfileLoader.LoadAsync(db, user);
        if (profile is null) return BadRequest(new { error = "账号未配置角色，无法登录" });

        var (token, exp) = jwt.Create(profile);
        await log.WriteAsync("登录", "用户与权限管理", $"{profile.Name}（{profile.UserType}）登录系统");

        return Ok(new
        {
            token,
            expireAt = exp,
            // 字段名与前端 LoginResult.profile 对应，前端据此写入登录态并分流首页
            profile = new
            {
                id = profile.UserId,
                account = profile.Account,
                name = profile.Name,
                userType = profile.UserType,
                studentNo = profile.StudentNo,
                teacherNo = profile.TeacherNo,
                roles = profile.Roles,
                perms = profile.Perms,
            }
        });
    }

    /// <summary>刷新当前登录信息（页面刷新后重新拉取权限）。</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var user = await db.SysUserSet.FirstOrDefaultAsync(u => u.UserId == User.Uid());
        if (user is null) return Unauthorized(new { error = "账号不存在" });
        var profile = await ProfileLoader.LoadAsync(db, user);
        return Ok(new
        {
            id = profile!.UserId,
            account = profile.Account,
            name = profile.Name,
            userType = profile.UserType,
            studentNo = profile.StudentNo,
            teacherNo = profile.TeacherNo,
            roles = profile.Roles,
            perms = profile.Perms,
        });
    }

    /// <summary>修改本人密码。</summary>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] PwdIn i)
    {
        if ((i.NewPassword ?? "").Length < 6)
            return BadRequest(new { error = "新密码长度不能少于 6 位" });
        var user = await db.SysUserSet.FirstOrDefaultAsync(u => u.UserId == User.Uid());
        if (user is null) return Unauthorized(new { error = "账号不存在" });
        if (!PasswordUtil.Verify(i.OldPassword, user.Password))
            return BadRequest(new { error = "原密码不正确" });

        user.Password = PasswordUtil.Hash(i.NewPassword!);
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "用户与权限管理", "修改本人登录密码");
        return Ok(new { ok = true });
    }
}
