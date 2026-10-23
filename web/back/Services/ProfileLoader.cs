using back.Data;
using back.Models;
using Microsoft.EntityFrameworkCore;

namespace back.Services;

/// <summary>组装登录档案：账号 + 角色 + 权限 + 关联的学生/教师编号。</summary>
public static class ProfileLoader
{
    public static async Task<LoginProfile?> LoadAsync(GradDb db, SysUser user)
    {
        var roleIds = await db.SysUserRoleSet.Where(x => x.UserId == user.UserId)
            .Select(x => x.RoleId).ToListAsync();
        var roles = await db.SysRoleSet.Where(r => roleIds.Contains(r.RoleId))
            .Select(r => r.RoleName).ToListAsync();
        var perms = await (from rp in db.SysRolePermissionSet
                           join p in db.SysPermissionSet on rp.PermId equals p.PermId
                           where roleIds.Contains(rp.RoleId)
                           select p.PermPath!).Distinct().ToListAsync();

        var studentNo = await db.StudentSet.Where(s => s.UserId == user.UserId)
            .Select(s => s.StudentNo).FirstOrDefaultAsync();
        var teacherNo = await db.TeacherSet.Where(t => t.UserId == user.UserId)
            .Select(t => t.TeacherNo).FirstOrDefaultAsync();
        var name = user.UserType == "学生"
            ? await db.StudentSet.Where(s => s.UserId == user.UserId).Select(s => s.Name).FirstOrDefaultAsync() ?? user.Account
            : await db.TeacherSet.Where(t => t.UserId == user.UserId).Select(t => t.Name).FirstOrDefaultAsync()
              ?? (user.UserType == "管理员" ? "系统管理员" : user.Account);

        return new LoginProfile(user.UserId, user.Account, name, user.UserType,
            studentNo, teacherNo, roles, perms.Where(p => !string.IsNullOrEmpty(p)).ToList());
    }
}
