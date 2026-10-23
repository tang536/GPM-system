using back.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace back.Authorization;

/// <summary>
/// 菜单/按钮级权限校验：以 sys_permission.perm_path 作为权限标识，
/// 与报告 3.2 节"以菜单和按钮为粒度定义权限"一致。
/// 管理员同样按授予的权限判定，不再隐式放行（报告 7.6 节：管理员只用于维护）。
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class PermAttribute(string path) : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext ctx)
    {
        var u = ctx.HttpContext.User;
        if (u.Identity?.IsAuthenticated != true)
        {
            ctx.Result = new UnauthorizedObjectResult(new { error = "登录状态已失效，请重新登录" });
            return;
        }
        if (!u.HasPerm(path))
        {
            ctx.Result = new ObjectResult(new { error = $"当前身份没有访问「{path}」的权限" })
            { StatusCode = StatusCodes.Status403Forbidden };
        }
    }
}

/// <summary>
/// 角色约束：用于"同一权限下进一步限定角色"的场景（如成绩审核只允许系主任），
/// 是 PermAttribute 的补充而非替代。需要运维角色参与时显式写出"系统管理员"，
/// 避免"管理员隐式通行"导致越权（报告 7.6 节最小权限原则）。
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RoleOnlyAttribute(params string[] roles) : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext ctx)
    {
        var u = ctx.HttpContext.User;
        if (u.Identity?.IsAuthenticated != true)
        {
            ctx.Result = new UnauthorizedObjectResult(new { error = "登录状态已失效，请重新登录" });
            return;
        }
        if (!roles.Any(u.InRole))
        {
            ctx.Result = new ObjectResult(new { error = $"该操作仅限：{string.Join("、", roles)}" })
            { StatusCode = StatusCodes.Status403Forbidden };
        }
    }
}
