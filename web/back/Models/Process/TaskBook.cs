// 业务域：过程管理（Process）
// 对应表：task_book　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 task_book</summary>
[Table("task_book")]
public class TaskBook
{
    /// <summary>任务书编号</summary>
    [Key]
    [Column("task_id")]
    public long TaskId { get; set; }

    /// <summary>课题编号</summary>
    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

    /// <summary>设计任务</summary>
    [Column("design_task", TypeName = "text")]
    public string DesignTask { get; set; } = "";

    /// <summary>技术要求</summary>
    [Column("tech_requirement", TypeName = "text")]
    public string? TechRequirement { get; set; }

    /// <summary>进度安排</summary>
    [Column("schedule", TypeName = "text")]
    public string? Schedule { get; set; }

    /// <summary>下达时间</summary>
    [Column("issue_time")]
    public DateTime IssueTime { get; set; }

    /// <summary>确认状态</summary>
    [Column("confirm_status")]
    [MaxLength(10)]
    public string ConfirmStatus { get; set; } = "";

}
