// 业务域：组织与人员（Organization）
// 对应表：student　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 student</summary>
[Table("student")]
public class Student
{
    /// <summary>学号</summary>
    [Key]
    [Column("student_no")]
    [MaxLength(12)]
    public string StudentNo { get; set; } = "";

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

    /// <summary>班级编号</summary>
    [Column("class_no")]
    [MaxLength(8)]
    public string ClassNo { get; set; } = "";

    /// <summary>联系电话</summary>
    [Column("phone")]
    [MaxLength(11)]
    public string? Phone { get; set; }

    /// <summary>电子邮箱</summary>
    [Column("email")]
    [MaxLength(50)]
    public string? Email { get; set; }

    /// <summary>入学年份</summary>
    [Column("enroll_year")]
    public short EnrollYear { get; set; }

}
