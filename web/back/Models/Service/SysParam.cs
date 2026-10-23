// 业务域：通知与服务（Service）
// 对应表：sys_param　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 sys_param</summary>
[Table("sys_param")]
public class SysParam
{
    /// <summary>参数编号</summary>
    [Key]
    [Column("param_id")]
    public int ParamId { get; set; }

    /// <summary>参数名</summary>
    [Column("param_name")]
    [MaxLength(50)]
    public string ParamName { get; set; } = "";

    /// <summary>参数值</summary>
    [Column("param_value")]
    [MaxLength(200)]
    public string ParamValue { get; set; } = "";

    /// <summary>参数说明</summary>
    [Column("remark")]
    [MaxLength(200)]
    public string? Remark { get; set; }

}
