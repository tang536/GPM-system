// 业务域：组织与人员（Organization）
// 对应表：class_info　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 class_info</summary>
[Table("class_info")]
public class ClassInfo
{
    /// <summary>班级编号</summary>
    [Key]
    [Column("class_no")]
    [MaxLength(8)]
    public string ClassNo { get; set; } = "";

    /// <summary>班级名称</summary>
    [Column("class_name")]
    [MaxLength(30)]
    public string ClassName { get; set; } = "";

    /// <summary>专业代码</summary>
    [Column("major_code")]
    [MaxLength(6)]
    public string MajorCode { get; set; } = "";

    /// <summary>年级</summary>
    [Column("grade")]
    public short Grade { get; set; }

    /// <summary>班级人数</summary>
    [Column("student_count")]
    public int StudentCount { get; set; }

    /// <summary>班主任</summary>
    [Column("head_teacher")]
    [MaxLength(20)]
    public string? HeadTeacher { get; set; }

}
