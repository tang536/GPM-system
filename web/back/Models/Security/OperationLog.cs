// 业务域：用户与权限（Security）
// 对应表：operation_log　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 operation_log</summary>
[Table("operation_log")]
public class OperationLog
{
    /// <summary>日志编号</summary>
    [Key]
    [Column("log_id")]
    public long LogId { get; set; }

    /// <summary>用户编号</summary>
    [Column("user_id")]
    public long? UserId { get; set; }

    /// <summary>操作类型</summary>
    [Column("op_type")]
    [MaxLength(10)]
    public string OpType { get; set; } = "";

    /// <summary>操作模块</summary>
    [Column("op_module")]
    [MaxLength(30)]
    public string OpModule { get; set; } = "";

    /// <summary>操作描述</summary>
    [Column("description")]
    [MaxLength(200)]
    public string? Description { get; set; }

    /// <summary>操作时间</summary>
    [Column("op_time")]
    public DateTime OpTime { get; set; }

    /// <summary>IP 地址</summary>
    [Column("ip")]
    [MaxLength(45)]
    public string? Ip { get; set; }

}
