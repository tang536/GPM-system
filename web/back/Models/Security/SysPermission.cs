// 业务域：用户与权限（Security）
// 对应表：sys_permission　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 sys_permission</summary>
[Table("sys_permission")]
public class SysPermission
{
    /// <summary>权限编号</summary>
    [Key]
    [Column("perm_id")]
    public int PermId { get; set; }

    /// <summary>权限名称</summary>
    [Column("perm_name")]
    [MaxLength(30)]
    public string PermName { get; set; } = "";

    /// <summary>权限类型</summary>
    [Column("perm_type")]
    [MaxLength(8)]
    public string PermType { get; set; } = "";

    /// <summary>访问路径</summary>
    [Column("perm_path")]
    [MaxLength(100)]
    public string? PermPath { get; set; }

}
