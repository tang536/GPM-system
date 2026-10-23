// 业务域：过程管理（Process）
// 对应表：stage　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 stage</summary>
[Table("stage")]
public class Stage
{
    /// <summary>阶段编号</summary>
    [Key]
    [Column("stage_id")]
    public int StageId { get; set; }

    /// <summary>阶段名称</summary>
    [Column("stage_name")]
    [MaxLength(20)]
    public string StageName { get; set; } = "";

    /// <summary>阶段顺序</summary>
    [Column("stage_order")]
    public byte StageOrder { get; set; }

    /// <summary>所属届别</summary>
    [Column("cohort")]
    [MaxLength(4)]
    public string Cohort { get; set; } = "";

}
