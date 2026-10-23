// 业务域：成绩与答辩（Score）
// 对应表：defense_group　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 defense_group</summary>
[Table("defense_group")]
public class DefenseGroup
{
    /// <summary>分组编号</summary>
    [Key]
    [Column("group_id")]
    public long GroupId { get; set; }

    /// <summary>所属届别</summary>
    [Column("cohort")]
    [MaxLength(4)]
    public string Cohort { get; set; } = "";

    /// <summary>面向专业</summary>
    [Column("major_code")]
    [MaxLength(6)]
    public string? MajorCode { get; set; }

    /// <summary>组长工号</summary>
    [Column("leader_no")]
    [MaxLength(8)]
    public string LeaderNo { get; set; } = "";

    /// <summary>答辩地点</summary>
    [Column("place")]
    [MaxLength(50)]
    public string Place { get; set; } = "";

    /// <summary>答辩时间</summary>
    [Column("defense_time")]
    public DateTime DefenseTime { get; set; }

}
