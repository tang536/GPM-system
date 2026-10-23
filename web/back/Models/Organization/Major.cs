// 业务域：组织与人员（Organization）
// 对应表：major　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 major</summary>
[Table("major")]
public class Major
{
    /// <summary>专业代码</summary>
    [Key]
    [Column("major_code")]
    [MaxLength(6)]
    public string MajorCode { get; set; } = "";

    /// <summary>专业名称</summary>
    [Column("major_name")]
    [MaxLength(40)]
    public string MajorName { get; set; } = "";

    /// <summary>所属院系编号</summary>
    [Column("dept_no")]
    [MaxLength(4)]
    public string DeptNo { get; set; } = "";

    /// <summary>学制</summary>
    [Column("duration")]
    public sbyte Duration { get; set; }

    /// <summary>学科门类</summary>
    [Column("discipline")]
    [MaxLength(30)]
    public string? Discipline { get; set; }

}
