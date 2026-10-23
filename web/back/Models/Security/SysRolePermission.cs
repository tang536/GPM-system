// 业务域：用户与权限（Security）
// 对应表：sys_role_permission　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 sys_role_permission</summary>
[Table("sys_role_permission")]
public class SysRolePermission
{
    /// <summary>角色编号</summary>
    [Key]
    [Column("role_id")]
    public byte RoleId { get; set; }

    /// <summary>权限编号</summary>
    [Key]
    [Column("perm_id")]
    public int PermId { get; set; }

}
