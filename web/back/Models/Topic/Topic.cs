// 业务域：课题与选题（Topic）
// 对应表：topic　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 topic</summary>
[Table("topic")]
public class Topic
{
    /// <summary>题目编号</summary>
    [Key]
    [Column("topic_no")]
    [MaxLength(12)]
    public string TopicNo { get; set; } = "";

    /// <summary>题目名称</summary>
    [Column("topic_name")]
    [MaxLength(100)]
    public string TopicName { get; set; } = "";

    /// <summary>题目类型</summary>
    [Column("topic_type")]
    [MaxLength(10)]
    public string TopicType { get; set; } = "";

    /// <summary>研究方向</summary>
    [Column("research_field")]
    [MaxLength(100)]
    public string? ResearchField { get; set; }

    /// <summary>难度</summary>
    [Column("difficulty")]
    [MaxLength(6)]
    public string Difficulty { get; set; } = "";

    /// <summary>申报人工号</summary>
    [Column("applicant_no")]
    [MaxLength(8)]
    public string ApplicantNo { get; set; } = "";

    /// <summary>可选人数</summary>
    [Column("capacity")]
    public byte Capacity { get; set; }

    /// <summary>所属届别</summary>
    [Column("cohort")]
    [MaxLength(4)]
    public string Cohort { get; set; } = "";

    /// <summary>题目状态</summary>
    [Column("status")]
    [MaxLength(10)]
    public string Status { get; set; } = "";

    /// <summary>审核意见</summary>
    [Column("audit_opinion")]
    [MaxLength(200)]
    public string? AuditOpinion { get; set; }

}
