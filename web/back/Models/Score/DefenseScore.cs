// 业务域：成绩与答辩（Score）
// 对应表：defense_score　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 defense_score</summary>
[Table("defense_score")]
public class DefenseScore
{
    /// <summary>评分编号</summary>
    [Key]
    [Column("item_id")]
    public long ItemId { get; set; }

    /// <summary>安排编号</summary>
    [Column("arrange_id")]
    public long ArrangeId { get; set; }

    /// <summary>评分维度</summary>
    [Column("dimension")]
    [MaxLength(20)]
    public string Dimension { get; set; } = "";

    /// <summary>得分</summary>
    [Column("score", TypeName = "decimal(4,1)")]
    public decimal Score { get; set; }

    /// <summary>评语</summary>
    [Column("remark")]
    [MaxLength(200)]
    public string? Remark { get; set; }

}
