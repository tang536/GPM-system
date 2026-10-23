using back.Authorization;
using back.Data;
using back.Models;
using back.DTOs;
using back.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace back.Controllers;

/// <summary>模块二：用户与权限管理（账号、角色、权限、日志），报告 3.2 节。</summary>
[ApiController]
[Route("api")]
[Authorize]
public class UserController(GradDb db, LogService log) : ControllerBase
{
    // ---------------- 账号 ----------------
    [HttpGet("users")]
    [Perm("/auth/user")]
    public async Task<IActionResult> GetUsers([FromQuery] string? kw, [FromQuery] string? userType, [FromQuery] string? role)
    {
        var q = db.SysUserSet.AsQueryable();
        if (!userType.Blank()) q = q.Where(u => u.UserType == userType);
        if (!kw.Blank()) q = q.Where(u => u.Account.Contains(kw!) || u.UserType.Contains(kw!));

        var rows = await (from u in q
                          orderby u.UserId
                          select new
                          {
                              userId = u.UserId,
                              account = u.Account,
                              userType = u.UserType,
                              status = u.Status,
                              createdAt = u.CreatedAt,
                              name = db.StudentSet.Where(s => s.UserId == u.UserId).Select(s => s.Name).FirstOrDefault()
                                     ?? db.TeacherSet.Where(t => t.UserId == u.UserId).Select(t => t.Name).FirstOrDefault()
                                     ?? (u.UserType == "管理员" ? "系统管理员" : ""),
                              studentNo = db.StudentSet.Where(s => s.UserId == u.UserId).Select(s => s.StudentNo).FirstOrDefault(),
                              teacherNo = db.TeacherSet.Where(t => t.UserId == u.UserId).Select(t => t.TeacherNo).FirstOrDefault(),
                          }).ToListAsync();

        // 角色是可重复集合，单独批量取回后在内存里合并，避免逐行子查询
        var uids = rows.Select(r => r.userId).ToList();
        var userRoles = await (from ur in db.SysUserRoleSet
                               join r in db.SysRoleSet on ur.RoleId equals r.RoleId
                               where uids.Contains(ur.UserId)
                               select new { ur.UserId, r.RoleName }).ToListAsync();
        var rolesOf = userRoles.ToLookup(x => x.UserId);

        var list = rows.Select(r => new
        {
            r.userId,
            r.account,
            r.userType,
            r.status,
            r.createdAt,
            r.name,
            r.studentNo,
            r.teacherNo,
            roles = rolesOf[r.userId].Select(x => x.RoleName).ToList(),
        }).ToList();

        if (!role.Blank())
            list = list.Where(r => r.roles.Contains(role!)).ToList();
        return Ok(list);
    }

    [HttpPost("users")]
    [Perm("/auth/user")]
    public async Task<IActionResult> AddUser([FromBody] UserIn i)
    {
        if (i.Account.Blank()) return BadRequest(new { error = "登录账号不能为空" });
        if (i.Account.Trim().Length > 20) return BadRequest(new { error = "账号长度不能超过 20 位" });
        if (await db.SysUserSet.AnyAsync(u => u.Account == i.Account.Trim()))
            return BadRequest(new { error = "该账号已存在" });

        var user = new SysUser
        {
            Account = i.Account.Trim(),
            Password = PasswordUtil.Hash(i.Password.Blank() ? "123456" : i.Password),
            UserType = i.UserType,
            Status = i.Status.Blank() ? "启用" : i.Status!,
            CreatedAt = DateTime.Now,
        };
        db.SysUserSet.Add(user);
        await db.SaveChangesAsync();

        foreach (var rid in i.RoleIds ?? [])
            db.SysUserRoleSet.Add(new SysUserRole { UserId = user.UserId, RoleId = (byte)rid, GrantedAt = DateTime.Now });

        if (!i.StudentNo.Blank())
        {
            var s = await db.StudentSet.FindAsync(i.StudentNo);
            if (s is not null) s.UserId = user.UserId;
        }
        if (!i.TeacherNo.Blank())
        {
            var t = await db.TeacherSet.FindAsync(i.TeacherNo);
            if (t is not null) t.UserId = user.UserId;
        }
        await db.SaveChangesAsync();
        await log.WriteAsync("新增", "用户与权限管理", $"新增账号 {user.Account}（{i.UserType}）");
        return Ok(new { ok = true, userId = user.UserId });
    }

    [HttpPut("users/{id:long}")]
    [Perm("/auth/user")]
    public async Task<IActionResult> UpdateUser(long id, [FromBody] UserUpd i)
    {
        var user = await db.SysUserSet.FindAsync(id);
        if (user is null) return NotFound(new { error = "账号不存在" });
        if (!i.Status.Blank()) user.Status = i.Status!;
        if (!i.NewPassword.Blank())
        {
            if (i.NewPassword!.Length < 6) return BadRequest(new { error = "密码长度不能少于 6 位" });
            user.Password = PasswordUtil.Hash(i.NewPassword);
        }
        if (i.RoleIds is not null)
        {
            var old = await db.SysUserRoleSet.Where(x => x.UserId == id).ToListAsync();
            db.SysUserRoleSet.RemoveRange(old);
            foreach (var rid in i.RoleIds)
                db.SysUserRoleSet.Add(new SysUserRole { UserId = id, RoleId = (byte)rid, GrantedAt = DateTime.Now });
        }
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "用户与权限管理", $"修改账号 {user.Account}");
        return Ok(new { ok = true });
    }

    [HttpDelete("users/{id:long}")]
    [Perm("/auth/user")]
    public async Task<IActionResult> DeleteUser(long id)
    {
        var user = await db.SysUserSet.FindAsync(id);
        if (user is null) return NotFound(new { error = "账号不存在" });
        if (user.UserType == "管理员" && await db.SysUserSet.CountAsync(u => u.UserType == "管理员") <= 1)
            return BadRequest(new { error = "系统至少需要保留一个管理员账号" });
        db.SysUserSet.Remove(user);
        await db.SaveChangesAsync();
        await log.WriteAsync("删除", "用户与权限管理", $"删除账号 {user.Account}");
        return Ok(new { ok = true });
    }

    /// <summary>学生名单（供建号、选题、成绩等下拉选择）。</summary>
    [HttpGet("students")]
    public async Task<IActionResult> GetStudents([FromQuery] string? kw)
    {
        var q = db.StudentSet.AsQueryable();
        if (!kw.Blank()) q = q.Where(s => s.Name.Contains(kw!) || s.StudentNo.Contains(kw!));
        var rows = await (from s in q
                          join c in db.ClassInfoSet on s.ClassNo equals c.ClassNo
                          orderby s.StudentNo
                          select new
                          {
                              studentNo = s.StudentNo, name = s.Name, gender = s.Gender,
                              classNo = s.ClassNo, className = c.ClassName,
                              enrollYear = s.EnrollYear, phone = s.Phone, email = s.Email,
                              hasAccount = s.UserId != null,
                              hasProject = db.ProjectSet.Any(p => p.StudentNo == s.StudentNo),
                          }).ToListAsync();
        return Ok(rows);
    }

    /// <summary>教师名单（含指导学生数、申报题目数）。</summary>
    [HttpGet("teachers")]
    public async Task<IActionResult> GetTeachers([FromQuery] string? kw)
    {
        var q = db.TeacherSet.AsQueryable();
        if (!kw.Blank()) q = q.Where(t => t.Name.Contains(kw!) || t.TeacherNo.Contains(kw!));
        var rows = await (from t in q
                          join d in db.DepartmentSet on t.DeptNo equals d.DeptNo
                          orderby t.TeacherNo
                          select new
                          {
                              teacherNo = t.TeacherNo, name = t.Name, gender = t.Gender,
                              title = t.Title, deptNo = t.DeptNo, deptName = d.DeptName,
                              researchField = t.ResearchField, phone = t.Phone, email = t.Email,
                              maxStudents = t.MaxStudents, introduction = t.Introduction,
                              hasAccount = t.UserId != null,
                              studentCount = db.ProjectSet.Count(p => p.TeacherNo == t.TeacherNo),
                              topicCount = db.TopicSet.Count(x => x.ApplicantNo == t.TeacherNo),
                          }).ToListAsync();
        return Ok(rows);
    }

    // ---------------- 角色 ----------------
    [HttpGet("roles")]
    [Perm("/auth/role")]
    public async Task<IActionResult> GetRoles()
    {
        var rows = await db.SysRoleSet.OrderBy(r => r.RoleId).Select(r => new
        {
            roleId = (int)r.RoleId,
            roleName = r.RoleName,
            roleDesc = r.RoleDesc,
            userCount = db.SysUserRoleSet.Count(ur => ur.RoleId == r.RoleId),
            permCount = db.SysRolePermissionSet.Count(rp => rp.RoleId == r.RoleId),
        }).ToListAsync();

        // 权限编号是集合，改为一次批量查询后在内存归组
        var rps = await db.SysRolePermissionSet
            .Select(rp => new { rp.RoleId, rp.PermId }).ToListAsync();
        var permsOf = rps.ToLookup(x => x.RoleId);

        return Ok(rows.Select(r => new
        {
            r.roleId,
            r.roleName,
            r.roleDesc,
            r.userCount,
            r.permCount,
            permIds = permsOf[(byte)r.roleId].Select(x => (int)x.PermId).ToList(),
        }).ToList());
    }

    [HttpPost("roles")]
    [Perm("/auth/role")]
    public async Task<IActionResult> AddRole([FromBody] RoleIn i)
    {
        if (i.RoleName.Blank()) return BadRequest(new { error = "角色名称不能为空" });
        var role = new SysRole { RoleName = i.RoleName.Trim(), RoleDesc = i.RoleDesc };
        db.SysRoleSet.Add(role);
        await db.SaveChangesAsync();
        foreach (var pid in i.PermIds ?? [])
            db.SysRolePermissionSet.Add(new SysRolePermission { RoleId = role.RoleId, PermId = (ushort)pid });
        await db.SaveChangesAsync();
        await log.WriteAsync("新增", "用户与权限管理", $"新增角色 {role.RoleName}");
        return Ok(new { ok = true });
    }

    [HttpPut("roles/{id:int}")]
    [Perm("/auth/role")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] RoleIn i)
    {
        var role = await db.SysRoleSet.FindAsync((byte)id);
        if (role is null) return NotFound(new { error = "角色不存在" });
        role.RoleName = i.RoleName.Trim(); role.RoleDesc = i.RoleDesc;
        if (i.PermIds is not null)
        {
            var old = await db.SysRolePermissionSet.Where(x => x.RoleId == role.RoleId).ToListAsync();
            db.SysRolePermissionSet.RemoveRange(old);
            foreach (var pid in i.PermIds)
                db.SysRolePermissionSet.Add(new SysRolePermission { RoleId = role.RoleId, PermId = (ushort)pid });
        }
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "用户与权限管理", $"修改角色 {role.RoleName} 的权限");
        return Ok(new { ok = true });
    }

    [HttpDelete("roles/{id:int}")]
    [Perm("/auth/role")]
    public async Task<IActionResult> DeleteRole(int id)
    {
        var role = await db.SysRoleSet.FindAsync((byte)id);
        if (role is null) return NotFound(new { error = "角色不存在" });
        db.SysRoleSet.Remove(role);
        await db.SaveChangesAsync();
        await log.WriteAsync("删除", "用户与权限管理", $"删除角色 {role.RoleName}");
        return Ok(new { ok = true });
    }

    // ---------------- 权限 ----------------
    [HttpGet("permissions")]
    [Perm("/auth/permission")]
    public async Task<IActionResult> GetPerms()
    {
        var rows = await db.SysPermissionSet.OrderBy(p => p.PermId).Select(p => new
        {
            permId = (int)p.PermId, permName = p.PermName,
            permType = p.PermType, permPath = p.PermPath,
            roleCount = db.SysRolePermissionSet.Count(rp => rp.PermId == p.PermId),
        }).ToListAsync();
        return Ok(rows);
    }

    // ---------------- 日志 ----------------
    [HttpGet("logs")]
    [Perm("/auth/log")]
    public async Task<IActionResult> GetLogs([FromQuery] string? kw, [FromQuery] string? opType, [FromQuery] int take = 200)
    {
        var q = db.OperationLogSet.AsQueryable();
        if (!opType.Blank()) q = q.Where(l => l.OpType == opType);
        if (!kw.Blank()) q = q.Where(l => (l.Description ?? "").Contains(kw!) || l.OpModule.Contains(kw!));
        var rows = await (from l in q
                          orderby l.OpTime descending
                          select new
                          {
                              logId = l.LogId,
                              userId = l.UserId,
                              account = db.SysUserSet.Where(u => u.UserId == l.UserId).Select(u => u.Account).FirstOrDefault() ?? "—",
                              opType = l.OpType,
                              opModule = l.OpModule,
                              description = l.Description,
                              opTime = l.OpTime,
                              ip = l.Ip,
                          }).Take(Math.Min(take, 500)).ToListAsync();
        return Ok(rows);
    }
}
