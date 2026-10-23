using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using MySqlConnector;

namespace back.Filters;

/// <summary>
/// 全局异常过滤：把数据库触发器/存储过程抛出的业务错误转成 400 与中文提示，
/// 前端可直接展示，不必再解析 SQL 原文（对应报告 5.3 节的约束校验策略）。
/// </summary>
public sealed class DbErrorFilter : IExceptionFilter
{
    public void OnException(ExceptionContext ctx)
    {
        if (ctx.Exception is MySqlException my)
        {
            var msg = my.Message;
            // SIGNAL SQLSTATE '45000' 的业务提示原样返回
            if (msg.Contains("已超过阶段截止时间") || msg.Contains("文件格式")
                || msg.Contains("未配置时间节点") || msg.Contains("成绩已发布")
                || msg.Contains("Duplicate entry") || msg.Contains("foreign key constraint")
                || msg.Contains("Cannot delete or update a parent row"))
            {
                var text = msg.Contains("Duplicate entry") ? "数据已存在，编号或名称重复"
                    : msg.Contains("foreign key") || msg.Contains("Cannot delete")
                        ? "该记录被其他数据引用，无法删除或修改"
                        : msg;
                ctx.Result = new BadRequestObjectResult(new { error = text });
                ctx.ExceptionHandled = true;
                return;
            }
            ctx.Result = new ObjectResult(new { error = "数据库执行失败：" + msg })
            { StatusCode = 500 };
            ctx.ExceptionHandled = true;
            return;
        }

        var inner = ctx.Exception.InnerException?.Message;
        ctx.Result = new ObjectResult(new
        {
            error = inner is null ? ctx.Exception.Message : ctx.Exception.Message + " → " + inner
        })
        { StatusCode = 500 };
        ctx.ExceptionHandled = true;
    }
}
