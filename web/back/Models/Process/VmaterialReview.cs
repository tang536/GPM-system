// 业务域：过程管理（Process）
// 对应视图：v_material_review　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_material_review</summary>
[Table("v_material_review")]
[Keyless]
public class VmaterialReview
{
    [Column("submission_id")]
    public long SubmissionId { get; set; }

    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

    [Column("student_no")]
    [MaxLength(12)]
    public string StudentNo { get; set; } = "";

    [Column("student_name")]
    [MaxLength(20)]
    public string StudentName { get; set; } = "";

    [Column("stage_name")]
    [MaxLength(20)]
    public string StageName { get; set; } = "";

    [Column("version")]
    public int Version { get; set; }

    [Column("file_path")]
    [MaxLength(255)]
    public string FilePath { get; set; } = "";

    [Column("submit_time")]
    public DateTime SubmitTime { get; set; }

    [Column("audit_status")]
    [MaxLength(10)]
    public string AuditStatus { get; set; } = "";

    [Column("reviewer_name")]
    [MaxLength(20)]
    public string? ReviewerName { get; set; }

    [Column("conclusion")]
    [MaxLength(10)]
    public string? Conclusion { get; set; }

    [Column("review_opinion")]
    [MaxLength(500)]
    public string? ReviewOpinion { get; set; }

    [Column("review_time")]
    public DateTime? ReviewTime { get; set; }

}
