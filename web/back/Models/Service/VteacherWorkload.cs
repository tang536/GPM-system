// 业务域：通知与服务（Service）
// 对应视图：v_teacher_workload　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_teacher_workload</summary>
[Table("v_teacher_workload")]
[Keyless]
public class VteacherWorkload
{
    [Column("teacher_no")]
    [MaxLength(8)]
    public string? TeacherNo { get; set; }

    [Column("teacher_name")]
    [MaxLength(20)]
    public string? TeacherName { get; set; }

    [Column("title")]
    [MaxLength(10)]
    public string? Title { get; set; }

    [Column("dept_name")]
    [MaxLength(40)]
    public string DeptName { get; set; } = "";

    [Column("topic_count")]
    public long? TopicCount { get; set; }

    [Column("student_count")]
    public long? StudentCount { get; set; }

    [Column("review_count")]
    public long? ReviewCount { get; set; }

    [Column("avg_score", TypeName = "decimal(10,2)")]
    public decimal? AvgScore { get; set; }

}
