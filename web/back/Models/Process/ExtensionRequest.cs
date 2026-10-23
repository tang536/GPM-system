// 业务域：过程管理（Process）
// 对应表：extension_request　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 extension_request</summary>
[Table("extension_request")]
public class ExtensionRequest
{
    /// <summary>申请编号</summary>
    [Key]
    [Column("request_id")]
    public long RequestId { get; set; }

    /// <summary>课题编号</summary>
    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

    /// <summary>阶段编号</summary>
    [Column("stage_id")]
    public int StageId { get; set; }

    /// <summary>申请理由</summary>
    [Column("reason")]
    [MaxLength(300)]
    public string Reason { get; set; } = "";

    /// <summary>申请时间</summary>
    [Column("apply_time")]
    public DateTime ApplyTime { get; set; }

    /// <summary>审批人工号</summary>
    [Column("approver_no")]
    [MaxLength(8)]
    public string? ApproverNo { get; set; }

    /// <summary>审批结果</summary>
    [Column("result")]
    [MaxLength(10)]
    public string? Result { get; set; }

    /// <summary>延期天数</summary>
    [Column("delay_days")]
    public int? DelayDays { get; set; }

}
