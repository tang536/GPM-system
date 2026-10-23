// 业务域：用户与权限（Security）
// 对应表：sys_user_role　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 sys_user_role</summary>
[Table("sys_user_role")]
public class SysUserRole
{
    /// <summary>用户编号</summary>
    [Key]
    [Column("user_id")]
    public long UserId { get; set; }

    /// <summary>角色编号</summary>
    [Key]
    [Column("role_id")]
    public byte RoleId { get; set; }

    /// <summary>授予时间</summary>
    [Column("granted_at")]
    public DateTime GrantedAt { get; set; }

}
