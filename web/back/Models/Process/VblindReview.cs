// 业务域：过程管理（Process）
// 对应视图：v_blind_review　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_blind_review</summary>
[Table("v_blind_review")]
[Keyless]
public class VblindReview
{
    [Column("submission_id")]
    public long SubmissionId { get; set; }

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

    [Column("topic_name")]
    [MaxLength(100)]
    public string TopicName { get; set; } = "";

    [Column("topic_type")]
    [MaxLength(10)]
    public string TopicType { get; set; } = "";

    [Column("research_field")]
    [MaxLength(100)]
    public string? ResearchField { get; set; }

    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

}
