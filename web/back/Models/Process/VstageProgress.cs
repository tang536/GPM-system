// 业务域：过程管理（Process）
// 对应视图：v_stage_progress　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_stage_progress</summary>
[Table("v_stage_progress")]
[Keyless]
public class VstageProgress
{
    [Column("project_no")]
    [MaxLength(14)]
    public string? ProjectNo { get; set; }

    [Column("student_no")]
    [MaxLength(12)]
    public string StudentNo { get; set; } = "";

    [Column("student_name")]
    [MaxLength(20)]
    public string StudentName { get; set; } = "";

    [Column("class_name")]
    [MaxLength(30)]
    public string ClassName { get; set; } = "";

    [Column("teacher_name")]
    [MaxLength(20)]
    public string TeacherName { get; set; } = "";

    [Column("stage_name")]
    [MaxLength(20)]
    public string? StageName { get; set; }

    [Column("stage_id")]
    public int? StageId { get; set; }

    [Column("deadline")]
    public DateTime Deadline { get; set; }

    [Column("last_submit")]
    public DateTime? LastSubmit { get; set; }

    [Column("last_version")]
    public long? LastVersion { get; set; }

    [Column("submit_status")]
    [MaxLength(4)]
    public string SubmitStatus { get; set; } = "";

}
