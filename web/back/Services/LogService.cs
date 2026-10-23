using back.Data;
using back.Models;

namespace back.Services;

/// <summary>操作日志记录（对应 operation_log 表，报告 3.2/3.6 节）。</summary>
public sealed class LogService(GradDb db, IHttpContextAccessor accessor)
{
    public async Task WriteAsync(string type, string module, string desc)
    {
        var ctx = accessor.HttpContext;
        var uid = ctx?.User.Uid() ?? 0;
        db.OperationLogSet.Add(new OperationLog
        {
            UserId = uid == 0 ? null : uid,
            OpType = type,
            OpModule = module,
            Description = desc.Length > 200 ? desc[..200] : desc,
            OpTime = DateTime.Now,
            Ip = ctx?.Connection.RemoteIpAddress?.ToString()
        });
        await db.SaveChangesAsync();
    }
}

/// <summary>通用小工具。</summary>
public static class Ext
{
    public static bool Blank(this string? s) => string.IsNullOrWhiteSpace(s);
}
