// 业务域：用户与权限（Security）
// 对应视图：v_user_account　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_user_account</summary>
[Table("v_user_account")]
[Keyless]
public class VuserAccount
{
    [Column("user_id")]
    public long? UserId { get; set; }

    [Column("account")]
    [MaxLength(20)]
    public string? Account { get; set; }

    [Column("user_type")]
    [MaxLength(10)]
    public string? UserType { get; set; }

    [Column("status")]
    [MaxLength(8)]
    public string? Status { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("role_names", TypeName = "text")]
    public string? RoleNames { get; set; }

}
