using System.Data;
using back.Authorization;
using back.Data;
using back.Models;
using back.DTOs;
using back.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace back.Controllers;

/// <summary>模块五：成绩与答辩管理（分项评定、审核发布、答辩分组与评分），报告 3.5 节。</summary>
[ApiController]
[Route("api")]
[Authorize]
public class ScoreController(GradDb db, LogService log, ScopeService scope) : ControllerBase
{
    /// <summary>答辩评分四个维度（报告 3.5 节：答辩小组按量表评分）。</summary>
    private static readonly (string Dim, decimal Max)[] Dims =
    [
        ("选题与综述", 20m), ("设计与实现", 40m), ("论文规范", 20m), ("答辩表现", 20m),
    ];

    // ---------------- 成绩 ----------------
    /// <summary>成绩清单（视图 v_score_report，总评与等级由视图实时计算）。</summary>
    [HttpGet("scores")]
    public async Task<IActionResult> GetScores([FromQuery] string? kw, [FromQuery] string? publishStatus,
                                               [FromQuery] string? cohort)
    {
        var allowed = await scope.ProjectScopeAsync(User);
        var q = db.VscoreReportSet.AsQueryable();
        if (allowed is not null) q = q.Where(x => allowed.Contains(x.ProjectNo!));
        if (!publishStatus.Blank()) q = q.Where(x => x.PublishStatus == publishStatus);

        var rows = await q.OrderBy(x => x.StudentNo).ToListAsync();

        if (!kw.Blank())
            rows = rows.Where(r => (r.StudentName ?? "").Contains(kw!)
                                   || (r.TopicName ?? "").Contains(kw!)
                                   || (r.StudentNo ?? "").Contains(kw!)).ToList();
        if (!cohort.Blank())
        {
            var inCohort = await (from p in db.ProjectSet
                                  join t in db.TopicSet on p.TopicNo equals t.TopicNo
                                  where t.Cohort == cohort
                                  select p.ProjectNo).ToListAsync();
            rows = rows.Where(r => inCohort.Contains(r.ProjectNo!)).ToList();
        }

        // 当前身份对每条成绩的分项录入权（过程/评阅/答辩）
        var result = new List<object>();
        foreach (var r in rows)
        {
            var (proc, rev, def) = await scope.ScoreRightsAsync(User, r.ProjectNo!);
            result.Add(new
            {
                projectNo = r.ProjectNo,
                studentNo = r.StudentNo,
                studentName = r.StudentName,
                className = r.ClassName,
                majorName = r.MajorName,
                deptName = r.DeptName,
                topicName = r.TopicName,
                teacherName = r.TeacherName,
                processScore = r.ProcessScore,
                reviewScore = r.ReviewScore,
                defenseScore = r.DefenseScore,
                totalScore = r.TotalScore,
                scoreLevel = r.ScoreLevel,
                publishStatus = r.PublishStatus,
                canProcess = proc,
                canReview = rev,
                canDefense = def,
                locked = r.PublishStatus == "已发布",
            });
        }
        return Ok(result);
    }

    /// <summary>
    /// 录入分项成绩：指导教师录过程成绩、评阅教师录评阅成绩、答辩组长录答辩成绩，
    /// 越权一律 403（报告 3.5 节三方评定职责）。
    /// </summary>
    [HttpPut("scores/{projectNo}")]
    [Perm("/score/manage")]
    public async Task<IActionResult> UpdateScore(string projectNo, [FromBody] ScoreIn i)
    {
        var p = await db.ProjectSet.FirstOrDefaultAsync(x => x.ProjectNo == projectNo);
        if (p is null) return NotFound(new { error = "课题不存在" });

        var (canProc, canRev, canDef) = await scope.ScoreRightsAsync(User, projectNo);
        if (!canProc && !canRev && !canDef)
            return StatusCode(403, new { error = "您不是该课题的指导教师、评阅教师或答辩组长，无权录入成绩" });

        var score = await db.ScoreSet.FirstOrDefaultAsync(s => s.ProjectNo == projectNo);
        if (score is null)
        {
            score = new Score { ProjectNo = projectNo, ProcessWeight = 0.40m, ReviewWeight = 0.30m, DefenseWeight = 0.30m, PublishStatus = "未发布" };
            db.ScoreSet.Add(score);
        }
        if (score.PublishStatus == "已发布")
            return BadRequest(new { error = "成绩已发布，分项成绩不允许修改" });

        if (i.ProcessScore is not null)
        {
            if (!canProc) return StatusCode(403, new { error = "过程成绩只能由该课题的指导教师评定" });
            if (i.ProcessScore is < 0 or > 100) return BadRequest(new { error = "过程成绩应在 0～100 之间" });
            score.ProcessScore = i.ProcessScore;
        }
        if (i.ReviewScore is not null)
        {
            if (!canRev) return StatusCode(403, new { error = "评阅成绩只能由被分配的评阅教师评定" });
            if (i.ReviewScore is < 0 or > 100) return BadRequest(new { error = "评阅成绩应在 0～100 之间" });
            score.ReviewScore = i.ReviewScore;
        }
        if (i.DefenseScore is not null)
        {
            if (!canDef) return StatusCode(403, new { error = "答辩成绩由答辩小组评定，您不是该组组长" });
            if (i.DefenseScore is < 0 or > 100) return BadRequest(new { error = "答辩成绩应在 0～100 之间" });
            score.DefenseScore = i.DefenseScore;
        }

        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "成绩与答辩管理", $"录入分项成绩：{projectNo}");
        return Ok(new { ok = true });
    }

    /// <summary>系主任审核成绩（未发布 → 已审核）。</summary>
    [HttpPost("scores/audit")]
    [Perm("/score/audit")]
    [RoleOnly("系主任")]
    public async Task<IActionResult> Audit([FromBody] NosIn i)
    {
        var okCount = 0;
        var errors = new List<string>();
        foreach (var no in i.ProjectNos ?? [])
        {
            var s = await db.ScoreSet.FirstOrDefaultAsync(x => x.ProjectNo == no);
            if (s is null) { errors.Add($"{no}：无成绩记录"); continue; }
            if (s.PublishStatus != "未发布") { errors.Add($"{no}：当前状态为「{s.PublishStatus}」"); continue; }
            if (s.ProcessScore is null || s.ReviewScore is null || s.DefenseScore is null)
            { errors.Add($"{no}：分项成绩不完整"); continue; }
            s.PublishStatus = "已审核";
            okCount++;
        }
        await db.SaveChangesAsync();
        if (okCount > 0) await log.WriteAsync("修改", "成绩与答辩管理", $"审核成绩 {okCount} 条");
        if (errors.Count > 0 && okCount == 0)
            return BadRequest(new { error = string.Join("；", errors) });
        return Ok(new { ok = true, count = okCount, errors });
    }

    /// <summary>发布成绩：调用存储过程 sp_publish_score，同一事务内置状态并推送成绩通知。</summary>
    [HttpPost("scores/publish")]
    [Perm("/score/audit")]
    public async Task<IActionResult> Publish([FromBody] NosIn i)
    {
        var messages = new List<string>();
        foreach (var no in i.ProjectNos ?? [])
            messages.Add(await CallPublishAsync(no));

        await log.WriteAsync("修改", "成绩与答辩管理",
            $"发布成绩 {i.ProjectNos?.Length ?? 0} 条：{string.Join("；", messages)}");

        var failed = messages.Where(m => !m.StartsWith("成绩发布成功")).ToList();
        if (failed.Count > 0 && failed.Count == messages.Count)
            return BadRequest(new { error = string.Join("；", failed) });
        return Ok(new { ok = true, messages });
    }

    private async Task<string> CallPublishAsync(string projectNo)
    {
        var conn = db.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open) await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "sp_publish_score";
        cmd.CommandType = CommandType.StoredProcedure;

        var p1 = new MySqlParameter("@p_project_no", projectNo);
        var p2 = new MySqlParameter("@p_msg", MySqlDbType.VarChar, 100)
        {
            Direction = ParameterDirection.Output
        };
        cmd.Parameters.Add(p1); cmd.Parameters.Add(p2);

        await cmd.ExecuteNonQueryAsync();
        return p2.Value?.ToString() ?? "发布失败：未知原因";
    }

    /// <summary>成绩分布统计（视图 v_score_stat，仅统计已发布成绩）。</summary>
    [HttpGet("score-stat")]
    [Perm("/score/manage")]
    public async Task<IActionResult> ScoreStat()
    {
        var rows = await db.VscoreStatSet.ToListAsync();
        return Ok(rows);
    }

    // ---------------- 答辩 ----------------
    [HttpGet("defense-groups")]
    public async Task<IActionResult> GetGroups([FromQuery] string? cohort)
    {
        var q = db.DefenseGroupSet.AsQueryable();
        if (!cohort.Blank()) q = q.Where(g => g.Cohort == cohort);
        var rows = await (from g in q
                          join t in db.TeacherSet on g.LeaderNo equals t.TeacherNo
                          join m in db.MajorSet on g.MajorCode equals m.MajorCode into mj
                          from m in mj.DefaultIfEmpty()
                          orderby g.DefenseTime
                          select new
                          {
                              groupId = (int)g.GroupId,
                              cohort = g.Cohort,
                              majorCode = g.MajorCode,
                              majorName = m == null ? "—" : m.MajorName,
                              leaderNo = g.LeaderNo,
                              leaderName = t.Name,
                              place = g.Place,
                              defenseTime = g.DefenseTime,
                              arrangeCount = db.DefenseArrangeSet.Count(a => a.GroupId == g.GroupId),
                          }).ToListAsync();
        return Ok(rows);
    }

    [HttpPost("defense-groups")]
    [Perm("/score/defense")]
    [RoleOnly("系主任")]
    public async Task<IActionResult> AddGroup([FromBody] GroupIn i)
    {
        if (!DateTime.TryParse(i.DefenseTime, out var dt)) return BadRequest(new { error = "答辩时间格式不正确" });
        db.DefenseGroupSet.Add(new DefenseGroup
        {
            Cohort = i.Cohort, MajorCode = i.MajorCode, LeaderNo = i.LeaderNo,
            Place = i.Place, DefenseTime = dt
        });
        await db.SaveChangesAsync();
        await log.WriteAsync("新增", "成绩与答辩管理", $"创建答辩分组：{i.Place}");
        return Ok(new { ok = true });
    }

    [HttpPut("defense-groups/{id:long}")]
    [Perm("/score/defense")]
    [RoleOnly("系主任")]
    public async Task<IActionResult> UpdateGroup(long id, [FromBody] GroupIn i)
    {
        var g = await db.DefenseGroupSet.FindAsync(id);
        if (g is null) return NotFound(new { error = "分组不存在" });
        if (!DateTime.TryParse(i.DefenseTime, out var dt)) return BadRequest(new { error = "答辩时间格式不正确" });
        g.MajorCode = i.MajorCode; g.LeaderNo = i.LeaderNo; g.Place = i.Place; g.DefenseTime = dt;
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "成绩与答辩管理", $"修改答辩分组 {id}");
        return Ok(new { ok = true });
    }

    [HttpDelete("defense-groups/{id:long}")]
    [Perm("/score/defense")]
    [RoleOnly("系主任")]
    public async Task<IActionResult> DeleteGroup(long id)
    {
        var g = await db.DefenseGroupSet.FindAsync(id);
        if (g is null) return NotFound(new { error = "分组不存在" });
        db.DefenseGroupSet.Remove(g);
        await db.SaveChangesAsync();
        await log.WriteAsync("删除", "成绩与答辩管理", $"删除答辩分组 {id}");
        return Ok(new { ok = true });
    }

    /// <summary>答辩安排（视图 v_defense_schedule + 四维得分）。</summary>
    [HttpGet("defense-arranges")]
    public async Task<IActionResult> GetArranges([FromQuery] string? groupId)
    {
        var allowed = await scope.ProjectScopeAsync(User);
        var q = db.VdefenseScheduleSet.AsQueryable();
        if (!groupId.Blank() && int.TryParse(groupId, out var gid))
            q = q.Where(x => x.GroupId == gid);
        var rows = await q.OrderBy(x => x.GroupId).ThenBy(x => x.DefenseOrder).ToListAsync();
        if (allowed is not null)
            rows = rows.Where(r => allowed.Contains(r.ProjectNo!)).ToList();

        var result = new List<object>();
        foreach (var r in rows)
        {
            // 视图不含安排主键，按课题回查一次以便前端携带 arrangeId 提交评分
            var arrangeId = await db.DefenseArrangeSet.Where(a => a.ProjectNo == r.ProjectNo)
                .Select(a => (long?)a.ArrangeId).FirstOrDefaultAsync();
            var items = arrangeId is null
                ? []
                : await db.DefenseScoreSet.Where(x => x.ArrangeId == arrangeId).ToListAsync();
            var (_, _, canDef) = await scope.ScoreRightsAsync(User, r.ProjectNo!);
            result.Add(new
            {
                arrangeId,
                groupId = r.GroupId,
                defenseTime = r.DefenseTime,
                place = r.Place,
                leaderName = r.LeaderName,
                defenseOrder = r.DefenseOrder,
                projectNo = r.ProjectNo,
                studentNo = r.StudentNo,
                studentName = r.StudentName,
                topicName = r.TopicName,
                teacherName = r.TeacherName,
                dims = items.Select(x => new { dimension = x.Dimension, score = x.Score, remark = x.Remark }).ToList(),
                subtotal = items.Count == 0 ? (decimal?)null : items.Sum(x => (decimal)x.Score),
                canScore = canDef,
            });
        }
        return Ok(result);
    }

    /// <summary>答辩小组录入四维评分，四维合计写入答辩成绩。</summary>
    [HttpPut("defense-arranges/{arrangeId:long}/scores")]
    [Perm("/score/defense")]
    public async Task<IActionResult> SaveDefenseScore(long arrangeId, [FromBody] ArrScoreIn i)
    {
        var arr = await db.DefenseArrangeSet.FirstOrDefaultAsync(a => a.ArrangeId == arrangeId);
        if (arr is null) return NotFound(new { error = "答辩安排不存在" });

        var (_, _, canDef) = await scope.ScoreRightsAsync(User, arr.ProjectNo);
        if (!canDef)
            return StatusCode(403, new { error = "答辩评分只能由该组答辩组长或系主任录入" });

        foreach (var it in i.Items ?? [])
        {
            var max = Dims.FirstOrDefault(d => d.Dim == it.Dimension).Max;
            if (max == 0) return BadRequest(new { error = $"评分维度「{it.Dimension}」不属于答辩量表" });
            if (it.Score < 0 || it.Score > max)
                return BadRequest(new { error = $"「{it.Dimension}」满分 {max} 分，请检查填写" });

            var row = await db.DefenseScoreSet.FirstOrDefaultAsync(x => x.ArrangeId == arrangeId && x.Dimension == it.Dimension);
            if (row is null)
                db.DefenseScoreSet.Add(new DefenseScore
                { ArrangeId = arrangeId, Dimension = it.Dimension, Score = it.Score, Remark = it.Remark });
            else { row.Score = it.Score; row.Remark = it.Remark; }
        }
        await db.SaveChangesAsync();

        // 四维合计回写答辩成绩
        var total = (await db.DefenseScoreSet.Where(x => x.ArrangeId == arrangeId).ToListAsync())
            .Sum(x => (decimal)x.Score);
        var score = await db.ScoreSet.FirstOrDefaultAsync(s => s.ProjectNo == arr.ProjectNo);
        if (score is null)
        {
            score = new Score { ProjectNo = arr.ProjectNo, ProcessWeight = 0.40m, ReviewWeight = 0.30m, DefenseWeight = 0.30m, PublishStatus = "未发布" };
            db.ScoreSet.Add(score);
        }
        if (score.PublishStatus != "已发布") score.DefenseScore = total;
        await db.SaveChangesAsync();

        await log.WriteAsync("修改", "成绩与答辩管理", $"答辩评分：{arr.ProjectNo}，四维合计 {total}");
        return Ok(new { ok = true, total });
    }

    /// <summary>答辩量表（供前端渲染评分表格）。</summary>
    [HttpGet("defense-dims")]
    public IActionResult GetDims() =>
        Ok(Dims.Select(d => new { dimension = d.Dim, max = d.Max }));
}
