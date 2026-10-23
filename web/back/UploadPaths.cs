using Microsoft.Extensions.FileProviders;

namespace back;

/// <summary>
/// 上传材料的统一存放目录。固定解析到项目根目录下的 uploads，
/// 避免依赖 ContentRootPath——以 dll 方式运行时它会指向 bin/Debug/net10.0，
/// 文件会被构建清理，且不在静态文件映射范围内。
/// </summary>
public static class UploadPaths
{
    /// <summary>磁盘绝对路径，如 .../web/back/uploads。</summary>
    public static readonly string Root = Resolve();

    private static string Resolve()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !dir.GetFiles("*.csproj").Any())
            dir = dir.Parent;
        var root = dir?.FullName ?? AppContext.BaseDirectory;
        var uploads = Path.Combine(root, "uploads");
        Directory.CreateDirectory(uploads);
        return uploads;
    }

    /// <summary>
    /// 把库中存储的 "/uploads/子目录/文件名" 相对路径映射为磁盘绝对路径；
    /// 含 ".." 等越界写法返回 null。
    /// </summary>
    public static string? ResolvePhysical(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return null;
        var rel = relativePath.Replace('\\', '/').TrimStart('/');
        if (rel.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
            rel = rel["uploads/".Length..];
        var full = Path.GetFullPath(Path.Combine(Root, rel));
        var rootWithSep = Root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        return full.StartsWith(rootWithSep, StringComparison.OrdinalIgnoreCase) ? full : null;
    }
}
