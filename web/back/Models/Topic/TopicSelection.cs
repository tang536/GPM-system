// 业务域：课题与选题（Topic）
// 对应表：topic_selection　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 topic_selection</summary>
[Table("topic_selection")]
public class TopicSelection
{
    /// <summary>记录编号</summary>
    [Key]
    [Column("selection_id")]
    public long SelectionId { get; set; }

    /// <summary>学号</summary>
    [Column("student_no")]
    [MaxLength(12)]
    public string StudentNo { get; set; } = "";

    /// <summary>题目编号</summary>
    [Column("topic_no")]
    [MaxLength(12)]
    public string TopicNo { get; set; } = "";

    /// <summary>志愿顺序</summary>
    [Column("preference")]
    public byte Preference { get; set; }

    /// <summary>记录状态</summary>
    [Column("status")]
    [MaxLength(10)]
    public string Status { get; set; } = "";

    /// <summary>确认时间</summary>
    [Column("confirm_time")]
    public DateTime? ConfirmTime { get; set; }

}
