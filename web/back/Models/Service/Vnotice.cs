// 业务域：通知与服务（Service）
// 对应视图：v_notice　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_notice</summary>
[Table("v_notice")]
[Keyless]
public class Vnotice
{
    [Column("notice_id")]
    public long NoticeId { get; set; }

    [Column("title")]
    [MaxLength(100)]
    public string Title { get; set; } = "";

    [Column("content", TypeName = "text")]
    public string Content { get; set; } = "";

    [Column("notice_type")]
    [MaxLength(10)]
    public string NoticeType { get; set; } = "";

    [Column("scope")]
    [MaxLength(20)]
    public string Scope { get; set; } = "";

    [Column("publisher_account")]
    [MaxLength(20)]
    public string PublisherAccount { get; set; } = "";

    [Column("publish_time")]
    public DateTime PublishTime { get; set; }

    [Column("is_top")]
    public bool IsTop { get; set; }

}
