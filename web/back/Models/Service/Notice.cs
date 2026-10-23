// 业务域：通知与服务（Service）
// 对应表：notice　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 notice</summary>
[Table("notice")]
public class Notice
{
    /// <summary>公告编号</summary>
    [Key]
    [Column("notice_id")]
    public long NoticeId { get; set; }

    /// <summary>公告标题</summary>
    [Column("title")]
    [MaxLength(100)]
    public string Title { get; set; } = "";

    /// <summary>公告内容</summary>
    [Column("content", TypeName = "text")]
    public string Content { get; set; } = "";

    /// <summary>公告类型</summary>
    [Column("notice_type")]
    [MaxLength(10)]
    public string NoticeType { get; set; } = "";

    /// <summary>发布范围（多个范围以逗号分隔存储）</summary>
    [Column("scope")]
    [MaxLength(100)]
    public string Scope { get; set; } = "";

    /// <summary>发布人用户编号</summary>
    [Column("publisher_id")]
    public long PublisherId { get; set; }

    /// <summary>发布时间</summary>
    [Column("publish_time")]
    public DateTime PublishTime { get; set; }

    /// <summary>置顶标记</summary>
    [Column("is_top")]
    public bool IsTop { get; set; }

}
