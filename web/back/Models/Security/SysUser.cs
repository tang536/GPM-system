// 业务域：用户与权限（Security）
// 对应表：sys_user　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 sys_user</summary>
[Table("sys_user")]
public class SysUser
{
    /// <summary>用户编号</summary>
    [Key]
    [Column("user_id")]
    public long UserId { get; set; }

    /// <summary>登录账号</summary>
    [Column("account")]
    [MaxLength(20)]
    public string Account { get; set; } = "";

    /// <summary>登录密码</summary>
    [Column("password")]
    [MaxLength(64)]
    public string Password { get; set; } = "";

    /// <summary>用户类型</summary>
    [Column("user_type")]
    [MaxLength(10)]
    public string UserType { get; set; } = "";

    /// <summary>账号状态</summary>
    [Column("status")]
    [MaxLength(8)]
    public string Status { get; set; } = "";

    /// <summary>创建时间</summary>
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

}
