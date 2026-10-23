// 业务域：课题与选题（Topic）
// 对应视图：v_topic_pool　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_topic_pool</summary>
[Table("v_topic_pool")]
[Keyless]
public class VtopicPool
{
    [Column("topic_no")]
    [MaxLength(12)]
    public string? TopicNo { get; set; }

    [Column("topic_name")]
    [MaxLength(100)]
    public string? TopicName { get; set; }

    [Column("topic_type")]
    [MaxLength(10)]
    public string? TopicType { get; set; }

    [Column("research_field")]
    [MaxLength(100)]
    public string? ResearchField { get; set; }

    [Column("difficulty")]
    [MaxLength(6)]
    public string? Difficulty { get; set; }

    [Column("teacher_name")]
    [MaxLength(20)]
    public string TeacherName { get; set; } = "";

    [Column("teacher_title")]
    [MaxLength(10)]
    public string TeacherTitle { get; set; } = "";

    [Column("capacity")]
    public byte? Capacity { get; set; }

    [Column("taken_count")]
    public long? TakenCount { get; set; }

    [Column("remain_count")]
    public long? RemainCount { get; set; }

    [Column("cohort")]
    [MaxLength(4)]
    public string? Cohort { get; set; }

    [Column("topic_no_key")]
    [MaxLength(12)]
    public string? TopicNoKey { get; set; }

}
