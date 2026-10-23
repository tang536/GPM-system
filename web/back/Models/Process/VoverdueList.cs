// 业务域：过程管理（Process）
// 对应视图：v_overdue_list　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_overdue_list</summary>
[Table("v_overdue_list")]
[Keyless]
public class VoverdueList
{
    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

    [Column("student_no")]
    [MaxLength(12)]
    public string StudentNo { get; set; } = "";

    [Column("student_name")]
    [MaxLength(20)]
    public string StudentName { get; set; } = "";

    [Column("phone")]
    [MaxLength(11)]
    public string? Phone { get; set; }

    [Column("teacher_name")]
    [MaxLength(20)]
    public string TeacherName { get; set; } = "";

    [Column("stage_name")]
    [MaxLength(20)]
    public string StageName { get; set; } = "";

    [Column("deadline")]
    public DateTime Deadline { get; set; }

    [Column("overdue_days")]
    public int? OverdueDays { get; set; }

}
