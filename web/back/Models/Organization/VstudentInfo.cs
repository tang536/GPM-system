// 业务域：组织与人员（Organization）
// 对应视图：v_student_info　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_student_info</summary>
[Table("v_student_info")]
[Keyless]
public class VstudentInfo
{
    [Column("student_no")]
    [MaxLength(12)]
    public string StudentNo { get; set; } = "";

    [Column("student_name")]
    [MaxLength(20)]
    public string StudentName { get; set; } = "";

    [Column("gender")]
    [MaxLength(2)]
    public string Gender { get; set; } = "";

    [Column("class_no")]
    [MaxLength(8)]
    public string ClassNo { get; set; } = "";

    [Column("class_name")]
    [MaxLength(30)]
    public string ClassName { get; set; } = "";

    [Column("major_name")]
    [MaxLength(40)]
    public string MajorName { get; set; } = "";

    [Column("dept_name")]
    [MaxLength(40)]
    public string DeptName { get; set; } = "";

    [Column("phone")]
    [MaxLength(11)]
    public string? Phone { get; set; }

    [Column("email")]
    [MaxLength(50)]
    public string? Email { get; set; }

    [Column("enroll_year")]
    public short EnrollYear { get; set; }

}
