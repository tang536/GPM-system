// 业务域：过程管理（Process）
// 对应表：stage_node　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 stage_node</summary>
[Table("stage_node")]
public class StageNode
{
    /// <summary>节点编号</summary>
    [Key]
    [Column("node_id")]
    public long NodeId { get; set; }

    /// <summary>阶段编号</summary>
    [Column("stage_id")]
    public int StageId { get; set; }

    /// <summary>开始时间</summary>
    [Column("start_time")]
    public DateTime StartTime { get; set; }

    /// <summary>截止时间</summary>
    [Column("deadline")]
    public DateTime Deadline { get; set; }

    /// <summary>允许提交格式</summary>
    [Column("allow_format")]
    [MaxLength(50)]
    public string AllowFormat { get; set; } = "";

    /// <summary>文件大小上限</summary>
    [Column("max_size")]
    public int MaxSize { get; set; }

    /// <summary>是否允许补交</summary>
    [Column("allow_late")]
    public bool AllowLate { get; set; }

}
