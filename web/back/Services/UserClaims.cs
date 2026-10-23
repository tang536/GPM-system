using System.Security.Claims;

namespace back.Services;

/// <summary>JWT 中携带的身份声明键（自定义短键，避免与框架默认声明冲突）。</summary>
public static class ClaimTypes2
{
    public const string UserId = "uid";
    public const string UserType = "utype";
    public const string StudentNo = "sno";
    public const string TeacherNo = "tno";
    public const string Perm = "perm";
    public const string Role = "roles";
}

/// <summary>登录档案：账号、姓名、身份、关联学生/教师编号、角色与权限集合。</summary>
public sealed record LoginProfile(
    long UserId, string Account, string Name, string UserType,
    string? StudentNo, string? TeacherNo, List<string> Roles, List<string> Perms);

/// <summary>从 ClaimsPrincipal 读取当前登录身份，供控制器与服务层复用。</summary>
public static class UserExt
{
    public static long Uid(this ClaimsPrincipal u) =>
        long.TryParse(u.FindFirst(ClaimTypes2.UserId)?.Value, out var v) ? v : 0;

    public static string UserType(this ClaimsPrincipal u) =>
        u.FindFirst(ClaimTypes2.UserType)?.Value ?? "";

    public static string? StudentNo(this ClaimsPrincipal u) =>
        NullIfEmpty(u.FindFirst(ClaimTypes2.StudentNo)?.Value);

    public static string? TeacherNo(this ClaimsPrincipal u) =>
        NullIfEmpty(u.FindFirst(ClaimTypes2.TeacherNo)?.Value);

    /// <summary>
    /// 读取角色集合。JWT 的 "roles" 可能被框架映射成 ClaimTypes.Role，
    /// 因此两处都取并按逗号拆分，避免角色判定失效导致 RoleOnly 一律 403。
    /// </summary>
    public static List<string> Roles(this ClaimsPrincipal u) =>
        u.FindAll(ClaimTypes2.Role).Select(c => c.Value)
            .Concat(u.FindAll(ClaimTypes.Role).Select(c => c.Value))
            .SelectMany(v => v.Split(',', StringSplitOptions.RemoveEmptyEntries))
            .Select(v => v.Trim())
            .Where(v => v.Length > 0)
            .Distinct()
            .ToList();

    public static List<string> Perms(this ClaimsPrincipal u) =>
        u.FindAll(ClaimTypes2.Perm).Select(c => c.Value).ToList();

    public static bool IsAdmin(this ClaimsPrincipal u) => u.UserType() == "管理员";

    /// <summary>
    /// 是否具备某个菜单/按钮权限（权限以访问路径标识，见 sys_permission.perm_path）。
    /// 严格按照 sys_role_permission 授予的集合判定，系统管理员不再默认放行——
    /// 报告 7.6 节要求"管理员账号只用于维护，不用于日常业务"。
    /// </summary>
    public static bool HasPerm(this ClaimsPrincipal u, string path) =>
        u.FindAll(ClaimTypes2.Perm).Any(c => c.Value == path);

    public static bool InRole(this ClaimsPrincipal u, string role) => u.Roles().Contains(role);

    private static string? NullIfEmpty(string? s) => string.IsNullOrWhiteSpace(s) ? null : s;
}
