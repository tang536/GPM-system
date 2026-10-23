// 业务域：通知与服务（Service）
// 对应表：message　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 message</summary>
[Table("message")]
public class Message
{
    /// <summary>消息编号</summary>
    [Key]
    [Column("message_id")]
    public long MessageId { get; set; }

    /// <summary>接收人用户编号</summary>
    [Column("receiver_id")]
    public long ReceiverId { get; set; }

    /// <summary>消息内容</summary>
    [Column("content")]
    [MaxLength(500)]
    public string Content { get; set; } = "";

    /// <summary>消息类型</summary>
    [Column("message_type")]
    [MaxLength(10)]
    public string MessageType { get; set; } = "";

    /// <summary>已读状态</summary>
    [Column("is_read")]
    public bool IsRead { get; set; }

    /// <summary>发送时间</summary>
    [Column("send_time")]
    public DateTime SendTime { get; set; }

}
