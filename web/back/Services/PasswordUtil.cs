using System.Security.Cryptography;
using System.Text;

namespace back.Services;

/// <summary>密码处理：按报告 5.2 节要求以 SHA-256 密文（64 位十六进制）存储，不保存明文。</summary>
public static class PasswordUtil
{
    public static string Hash(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static bool Verify(string raw, string stored) =>
        string.Equals(Hash(raw), stored, StringComparison.OrdinalIgnoreCase);
}
