// 业务域：过程管理（Process）
// 对应视图：v_task_book　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_task_book</summary>
[Table("v_task_book")]
[Keyless]
public class VtaskBook
{
    [Column("task_id")]
    public long TaskId { get; set; }

    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

    [Column("student_no")]
    [MaxLength(12)]
    public string StudentNo { get; set; } = "";

    [Column("student_name")]
    [MaxLength(20)]
    public string StudentName { get; set; } = "";

    [Column("topic_name")]
    [MaxLength(100)]
    public string TopicName { get; set; } = "";

    [Column("design_task", TypeName = "text")]
    public string DesignTask { get; set; } = "";

    [Column("tech_requirement", TypeName = "text")]
    public string? TechRequirement { get; set; }

    [Column("schedule", TypeName = "text")]
    public string? Schedule { get; set; }

    [Column("issue_time")]
    public DateTime IssueTime { get; set; }

    [Column("confirm_status")]
    [MaxLength(10)]
    public string ConfirmStatus { get; set; } = "";

}
