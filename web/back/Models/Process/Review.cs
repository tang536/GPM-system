// 业务域：过程管理（Process）
// 对应表：review　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 review</summary>
[Table("review")]
public class Review
{
    /// <summary>评阅编号</summary>
    [Key]
    [Column("review_id")]
    public long ReviewId { get; set; }

    /// <summary>材料编号</summary>
    [Column("submission_id")]
    public long SubmissionId { get; set; }

    /// <summary>评阅人工号</summary>
    [Column("reviewer_no")]
    [MaxLength(8)]
    public string ReviewerNo { get; set; } = "";

    /// <summary>评阅意见</summary>
    [Column("review_opinion")]
    [MaxLength(500)]
    public string? ReviewOpinion { get; set; }

    /// <summary>评阅结论</summary>
    [Column("conclusion")]
    [MaxLength(10)]
    public string Conclusion { get; set; } = "";

    /// <summary>评阅时间</summary>
    [Column("review_time")]
    public DateTime ReviewTime { get; set; }

}
