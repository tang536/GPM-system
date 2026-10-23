// 业务域：成绩与答辩（Score）
// 对应视图：v_score_report　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_score_report</summary>
[Table("v_score_report")]
[Keyless]
public class VscoreReport
{
    [Column("student_no")]
    [MaxLength(12)]
    public string StudentNo { get; set; } = "";

    [Column("student_name")]
    [MaxLength(20)]
    public string StudentName { get; set; } = "";

    [Column("class_name")]
    [MaxLength(30)]
    public string ClassName { get; set; } = "";

    [Column("major_name")]
    [MaxLength(40)]
    public string MajorName { get; set; } = "";

    [Column("dept_name")]
    [MaxLength(40)]
    public string DeptName { get; set; } = "";

    [Column("topic_name")]
    [MaxLength(100)]
    public string TopicName { get; set; } = "";

    [Column("teacher_name")]
    [MaxLength(20)]
    public string TeacherName { get; set; } = "";

    [Column("process_score", TypeName = "decimal(5,2)")]
    public decimal? ProcessScore { get; set; }

    [Column("review_score", TypeName = "decimal(5,2)")]
    public decimal? ReviewScore { get; set; }

    [Column("defense_score", TypeName = "decimal(5,2)")]
    public decimal? DefenseScore { get; set; }

    [Column("process_weight", TypeName = "decimal(3,2)")]
    public decimal ProcessWeight { get; set; }

    [Column("review_weight", TypeName = "decimal(3,2)")]
    public decimal ReviewWeight { get; set; }

    [Column("defense_weight", TypeName = "decimal(3,2)")]
    public decimal DefenseWeight { get; set; }

    [Column("total_score", TypeName = "decimal(9,2)")]
    public decimal? TotalScore { get; set; }

    [Column("score_level")]
    [MaxLength(3)]
    public string? ScoreLevel { get; set; }

    [Column("publish_status")]
    [MaxLength(10)]
    public string PublishStatus { get; set; } = "";

    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

    [Column("teacher_no")]
    [MaxLength(8)]
    public string TeacherNo { get; set; } = "";

}
