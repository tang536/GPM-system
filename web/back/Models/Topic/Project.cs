// 业务域：课题与选题（Topic）
// 对应表：project　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 project</summary>
[Table("project")]
public class Project
{
    /// <summary>课题编号</summary>
    [Key]
    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

    /// <summary>学号</summary>
    [Column("student_no")]
    [MaxLength(12)]
    public string StudentNo { get; set; } = "";

    /// <summary>题目编号</summary>
    [Column("topic_no")]
    [MaxLength(12)]
    public string TopicNo { get; set; } = "";

    /// <summary>指导教师工号</summary>
    [Column("teacher_no")]
    [MaxLength(8)]
    public string TeacherNo { get; set; } = "";

    /// <summary>当前阶段编号</summary>
    [Column("current_stage")]
    public int? CurrentStage { get; set; }

    /// <summary>课题状态</summary>
    [Column("project_status")]
    [MaxLength(10)]
    public string ProjectStatus { get; set; } = "";

    /// <summary>开始日期</summary>
    [Column("start_date")]
    public DateOnly StartDate { get; set; }

    /// <summary>结束日期</summary>
    [Column("end_date")]
    public DateOnly? EndDate { get; set; }

}
