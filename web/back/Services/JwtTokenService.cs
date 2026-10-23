using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace back.Services;

/// <summary>JWT 签发：身份、角色、权限全部写进令牌，接口侧不再回表查权限。</summary>
public sealed class JwtTokenService(IConfiguration cfg)
{
    public (string token, DateTime expireAt) Create(LoginProfile p)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!));
        var hours = int.TryParse(cfg["Jwt:ExpireHours"], out var h) ? h : 12;
        var exp = DateTime.UtcNow.AddHours(hours);

        var claims = new List<Claim>
        {
            new(ClaimTypes2.UserId, p.UserId.ToString()),
            new(ClaimTypes.Name, p.Name),
            new(ClaimTypes2.UserType, p.UserType),
            new(ClaimTypes2.Role, string.Join(",", p.Roles)),
        };
        if (p.StudentNo is not null) claims.Add(new(ClaimTypes2.StudentNo, p.StudentNo));
        if (p.TeacherNo is not null) claims.Add(new(ClaimTypes2.TeacherNo, p.TeacherNo));
        foreach (var perm in p.Perms) claims.Add(new Claim(ClaimTypes2.Perm, perm));

        var token = new JwtSecurityTokenHandler().WriteToken(
            new JwtSecurityToken(
                issuer: cfg["Jwt:Issuer"],
                audience: cfg["Jwt:Audience"],
                claims: claims,
                expires: exp,
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)));

        return (token, exp);
    }
}
