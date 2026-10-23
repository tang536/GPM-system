// 业务域：过程管理（Process）
// 对应表：submission　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 submission</summary>
[Table("submission")]
public class Submission
{
    /// <summary>材料编号</summary>
    [Key]
    [Column("submission_id")]
    public long SubmissionId { get; set; }

    /// <summary>课题编号</summary>
    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

    /// <summary>阶段编号</summary>
    [Column("stage_id")]
    public int StageId { get; set; }

    /// <summary>版本号</summary>
    [Column("version")]
    public int Version { get; set; }

    /// <summary>文件路径</summary>
    [Column("file_path")]
    [MaxLength(255)]
    public string FilePath { get; set; } = "";

    /// <summary>提交时间</summary>
    [Column("submit_time")]
    public DateTime SubmitTime { get; set; }

    /// <summary>审核状态</summary>
    [Column("audit_status")]
    [MaxLength(10)]
    public string AuditStatus { get; set; } = "";

}
