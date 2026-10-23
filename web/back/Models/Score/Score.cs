// 业务域：成绩与答辩（Score）
// 对应表：score　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 score</summary>
[Table("score")]
public class Score
{
    /// <summary>成绩编号</summary>
    [Key]
    [Column("score_id")]
    public long ScoreId { get; set; }

    /// <summary>课题编号</summary>
    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

    /// <summary>过程成绩</summary>
    [Column("process_score", TypeName = "decimal(5,2)")]
    public decimal? ProcessScore { get; set; }

    /// <summary>评阅成绩</summary>
    [Column("review_score", TypeName = "decimal(5,2)")]
    public decimal? ReviewScore { get; set; }

    /// <summary>答辩成绩</summary>
    [Column("defense_score", TypeName = "decimal(5,2)")]
    public decimal? DefenseScore { get; set; }

    /// <summary>过程成绩权重</summary>
    [Column("process_weight", TypeName = "decimal(3,2)")]
    public decimal ProcessWeight { get; set; }

    /// <summary>评阅成绩权重</summary>
    [Column("review_weight", TypeName = "decimal(3,2)")]
    public decimal ReviewWeight { get; set; }

    /// <summary>答辩成绩权重</summary>
    [Column("defense_weight", TypeName = "decimal(3,2)")]
    public decimal DefenseWeight { get; set; }

    /// <summary>发布状态</summary>
    [Column("publish_status")]
    [MaxLength(10)]
    public string PublishStatus { get; set; } = "";

}
