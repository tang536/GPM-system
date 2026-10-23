// 业务域：组织与人员（Organization）
// 对应表：department　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 department</summary>
[Table("department")]
public class Department
{
    /// <summary>院系编号</summary>
    [Key]
    [Column("dept_no")]
    [MaxLength(4)]
    public string DeptNo { get; set; } = "";

    /// <summary>院系名称</summary>
    [Column("dept_name")]
    [MaxLength(40)]
    public string DeptName { get; set; } = "";

    /// <summary>院系负责人</summary>
    [Column("leader")]
    [MaxLength(20)]
    public string? Leader { get; set; }

    /// <summary>办公地点</summary>
    [Column("office")]
    [MaxLength(50)]
    public string? Office { get; set; }

    /// <summary>联系电话</summary>
    [Column("phone")]
    [MaxLength(20)]
    public string? Phone { get; set; }

}
