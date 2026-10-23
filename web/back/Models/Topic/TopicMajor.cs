// 业务域：课题与选题（Topic）
// 对应表：topic_major　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 topic_major</summary>
[Table("topic_major")]
public class TopicMajor
{
    /// <summary>题目编号</summary>
    [Key]
    [Column("topic_no")]
    [MaxLength(12)]
    public string TopicNo { get; set; } = "";

    /// <summary>专业代码</summary>
    [Key]
    [Column("major_code")]
    [MaxLength(6)]
    public string MajorCode { get; set; } = "";

}
