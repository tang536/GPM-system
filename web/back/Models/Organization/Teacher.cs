// 业务域：组织与人员（Organization）
// 对应表：teacher　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 teacher</summary>
[Table("teacher")]
public class Teacher
{
    /// <summary>工号</summary>
    [Key]
    [Column("teacher_no")]
    [MaxLength(8)]
    public string TeacherNo { get; set; } = "";

    /// <summary>用户编号</summary>
    [Column("user_id")]
    public long? UserId { get; set; }

    /// <summary>姓名</summary>
    [Column("name")]
    [MaxLength(20)]
    public string Name { get; set; } = "";

    /// <summary>性别</summary>
    [Column("gender")]
    [MaxLength(2)]
    public string Gender { get; set; } = "";

    /// <summary>职称</summary>
    [Column("title")]
    [MaxLength(10)]
    public string Title { get; set; } = "";

    /// <summary>所属院系编号</summary>
    [Column("dept_no")]
    [MaxLength(4)]
    public string DeptNo { get; set; } = "";

    /// <summary>研究方向</summary>
    [Column("research_field")]
    [MaxLength(100)]
    public string? ResearchField { get; set; }

    /// <summary>联系电话</summary>
    [Column("phone")]
    [MaxLength(11)]
    public string? Phone { get; set; }

    /// <summary>电子邮箱</summary>
    [Column("email")]
    [MaxLength(50)]
    public string? Email { get; set; }

    /// <summary>可指导人数</summary>
    [Column("max_students")]
    public byte MaxStudents { get; set; }

    /// <summary>个人简介</summary>
    [Column("introduction")]
    [MaxLength(500)]
    public string? Introduction { get; set; }

}
