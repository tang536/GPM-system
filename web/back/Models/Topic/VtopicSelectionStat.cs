// 业务域：课题与选题（Topic）
// 对应视图：v_topic_selection_stat　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_topic_selection_stat</summary>
[Table("v_topic_selection_stat")]
[Keyless]
public class VtopicSelectionStat
{
    [Column("topic_no")]
    [MaxLength(12)]
    public string? TopicNo { get; set; }

    [Column("topic_name")]
    [MaxLength(100)]
    public string? TopicName { get; set; }

    [Column("teacher_name")]
    [MaxLength(20)]
    public string TeacherName { get; set; } = "";

    [Column("major_names", TypeName = "text")]
    public string? MajorNames { get; set; }

    [Column("capacity")]
    public byte? Capacity { get; set; }

    [Column("apply_count")]
    public long? ApplyCount { get; set; }

    [Column("taken_count")]
    public long? TakenCount { get; set; }

    [Column("remain_count")]
    public long? RemainCount { get; set; }

    [Column("status")]
    [MaxLength(10)]
    public string? Status { get; set; }

    [Column("cohort")]
    [MaxLength(4)]
    public string? Cohort { get; set; }

}
