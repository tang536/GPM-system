// 业务域：成绩与答辩（Score）
// 对应表：defense_arrange　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace back.Models;

/// <summary>表 defense_arrange</summary>
[Table("defense_arrange")]
public class DefenseArrange
{
    /// <summary>安排编号</summary>
    [Key]
    [Column("arrange_id")]
    public long ArrangeId { get; set; }

    /// <summary>分组编号</summary>
    [Column("group_id")]
    public long GroupId { get; set; }

    /// <summary>课题编号</summary>
    [Column("project_no")]
    [MaxLength(14)]
    public string ProjectNo { get; set; } = "";

    /// <summary>答辩顺序</summary>
    [Column("defense_order")]
    public byte DefenseOrder { get; set; }

}
