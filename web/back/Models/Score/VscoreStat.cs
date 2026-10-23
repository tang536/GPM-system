// 业务域：成绩与答辩（Score）
// 对应视图：v_score_stat　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace back.Models;

/// <summary>视图 v_score_stat</summary>
[Table("v_score_stat")]
[Keyless]
public class VscoreStat
{
    [Column("dept_name")]
    [MaxLength(40)]
    public string DeptName { get; set; } = "";

    [Column("major_name")]
    [MaxLength(40)]
    public string MajorName { get; set; } = "";

    [Column("class_name")]
    [MaxLength(30)]
    public string ClassName { get; set; } = "";

    [Column("excellent_count", TypeName = "decimal(23,0)")]
    public decimal? ExcellentCount { get; set; }

    [Column("good_count", TypeName = "decimal(23,0)")]
    public decimal? GoodCount { get; set; }

    [Column("medium_count", TypeName = "decimal(23,0)")]
    public decimal? MediumCount { get; set; }

    [Column("pass_count", TypeName = "decimal(23,0)")]
    public decimal? PassCount { get; set; }

    [Column("fail_count", TypeName = "decimal(23,0)")]
    public decimal? FailCount { get; set; }

    [Column("avg_score", TypeName = "decimal(10,2)")]
    public decimal? AvgScore { get; set; }

    [Column("max_score", TypeName = "decimal(9,2)")]
    public decimal? MaxScore { get; set; }

    [Column("min_score", TypeName = "decimal(9,2)")]
    public decimal? MinScore { get; set; }

}
