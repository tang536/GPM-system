// 业务域：用户与权限（Security）
// 对应表：sys_role　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 sys_role</summary>
[Table("sys_role")]
public class SysRole
{
    /// <summary>角色编号</summary>
    [Key]
    [Column("role_id")]
    public byte RoleId { get; set; }

    /// <summary>角色名称</summary>
    [Column("role_name")]
    [MaxLength(20)]
    public string RoleName { get; set; } = "";

    /// <summary>角色描述</summary>
    [Column("role_desc")]
    [MaxLength(100)]
    public string? RoleDesc { get; set; }

}
