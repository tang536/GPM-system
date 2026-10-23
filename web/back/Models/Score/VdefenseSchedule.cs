// 业务域：成绩与答辩（Score）
// 对应视图：v_defense_schedule　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_defense_schedule</summary>
[Table("v_defense_schedule")]
[Keyless]
public class VdefenseSchedule
{
    [Column("group_id")]
    public long GroupId { get; set; }

    [Column("defense_time")]
    public DateTime DefenseTime { get; set; }

    [Column("place")]
    [MaxLength(50)]
    public string Place { get; set; } = "";

    [Column("leader_name")]
    [MaxLength(20)]
    public string LeaderName { get; set; } = "";

    [Column("defense_order")]
    public byte DefenseOrder { get; set; }

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

    [Column("teacher_name")]
    [MaxLength(20)]
    public string TeacherName { get; set; } = "";

}
