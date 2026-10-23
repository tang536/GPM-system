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

/// <summary>模块三：题目与选题管理（申报、审核、志愿、互选、调剂），报告 3.3 节。</summary>
[ApiController]
[Route("api")]
[Authorize]
public class TopicController(GradDb db, LogService log, ScopeService scope) : ControllerBase
{
    // ---------------- 题目 ----------------
    /// <summary>题目列表：教师看本人申报，学生看已发布，系主任/管理员看全部。</summary>
    [HttpGet("topics")]
    public async Task<IActionResult> GetTopics([FromQuery] string? kw, [FromQuery] string? status,
                                               [FromQuery] string? cohort, [FromQuery] bool mine = false)
    {
        var q = db.TopicSet.AsQueryable();
        var utype = User.UserType();

        if (utype == "学生")
            q = q.Where(t => t.Status == "已发布");
        else if (utype == "指导教师" || utype == "评阅教师")
        {
            var tno = User.TeacherNo();
            q = mine ? q.Where(t => t.ApplicantNo == tno) : q.Where(t => t.ApplicantNo == tno || t.Status == "已发布");
        }

        if (!kw.Blank()) q = q.Where(t => t.TopicName.Contains(kw!) || t.TopicNo.Contains(kw!));
        if (!status.Blank()) q = q.Where(t => t.Status == status);
        if (!cohort.Blank()) q = q.Where(t => t.Cohort == cohort);

        // 主表只取标量列：面向专业是可重复集合，放在投影里会退化成逐行子查询（N+1）
        var rows = await (from t in q
                          join te in db.TeacherSet on t.ApplicantNo equals te.TeacherNo
                          orderby t.TopicNo descending
                          select new
                          {
                              topicNo = t.TopicNo,
                              topicName = t.TopicName,
                              topicType = t.TopicType,
                              researchField = t.ResearchField,
                              difficulty = t.Difficulty,
                              applicantNo = t.ApplicantNo,
                              teacherName = te.Name,
                              teacherTitle = te.Title,
                              capacity = (int)t.Capacity,
                              takenCount = db.ProjectSet.Count(p => p.TopicNo == t.TopicNo),
                              applyCount = db.TopicSelectionSet.Count(s => s.TopicNo == t.TopicNo),
                              cohort = t.Cohort,
                              status = t.Status,
                              auditOpinion = t.AuditOpinion,
                              mySelected = db.TopicSelectionSet.Any(s => s.TopicNo == t.TopicNo && s.StudentNo == User.StudentNo()),
                          }).ToListAsync();

        // 再按当前页的题目编号一次性补回面向专业（1 次查询替代 N 次）
        var nos = rows.Select(r => r.topicNo).ToList();
        var majors = await (from tm in db.TopicMajorSet
                            join m in db.MajorSet on tm.MajorCode equals m.MajorCode
                            where nos.Contains(tm.TopicNo)
                            select new { tm.TopicNo, tm.MajorCode, m.MajorName }).ToListAsync();
        var byTopic = majors.ToLookup(x => x.TopicNo);

        var result = rows.Select(r => new
        {
            r.topicNo,
            r.topicName,
            r.topicType,
            r.researchField,
            r.difficulty,
            r.applicantNo,
            r.teacherName,
            r.teacherTitle,
            r.capacity,
            r.takenCount,
            r.applyCount,
            r.cohort,
            r.status,
            r.auditOpinion,
            majorCodes = byTopic[r.topicNo].Select(x => x.MajorCode).ToList(),
            majorNames = byTopic[r.topicNo].Select(x => x.MajorName).ToList(),
            r.mySelected,
        }).ToList();
        return Ok(result);
    }

    /// <summary>教师申报题目（报告 P2：题目申报与审核）。</summary>
    [HttpPost("topics")]
    [Perm("/topic/apply")]
    public async Task<IActionResult> AddTopic([FromBody] TopicIn i)
    {
        var tno = User.TeacherNo();
        if (tno is null) return BadRequest(new { error = "只有指导教师可以申报题目" });
        if (i.TopicName.Blank()) return BadRequest(new { error = "题目名称不能为空" });
        if (i.Capacity is < 1 or > 5) return BadRequest(new { error = "可选人数应在 1～5 之间" });
        if ((i.MajorCodes ?? []).Length == 0) return BadRequest(new { error = "请至少选择一个面向专业" });

        var cohort = i.Cohort.Blank() ? "2026" : i.Cohort;
        var maxNo = await db.TopicSet.Where(t => t.TopicNo.StartsWith(cohort))
            .OrderByDescending(t => t.TopicNo).Select(t => t.TopicNo).FirstOrDefaultAsync();
        var seq = maxNo is null ? 1 : int.Parse(maxNo[4..]) + 1;
        var topicNo = cohort + seq.ToString("D8");

        var topic = new Topic
        {
            TopicNo = topicNo, TopicName = i.TopicName.Trim(), TopicType = i.TopicType,
            ResearchField = i.ResearchField, Difficulty = i.Difficulty,
            ApplicantNo = tno, Capacity = (byte)i.Capacity, Cohort = cohort,
            Status = "待审核", AuditOpinion = null,
        };
        db.TopicSet.Add(topic);
        foreach (var mc in i.MajorCodes ?? [])
            db.TopicMajorSet.Add(new TopicMajor { TopicNo = topicNo, MajorCode = mc });
        await db.SaveChangesAsync();
        await log.WriteAsync("新增", "题目与选题管理", $"申报题目 {topicNo}：{topic.TopicName}");
        return Ok(new { ok = true, topicNo });
    }

    [HttpPut("topics/{no}")]
    [Perm("/topic/apply")]
    public async Task<IActionResult> UpdateTopic(string no, [FromBody] TopicIn i)
    {
        var t = await db.TopicSet.FindAsync(no);
        if (t is null) return NotFound(new { error = "题目不存在" });
        if (!User.IsAdmin() && t.ApplicantNo != User.TeacherNo())
            return StatusCode(403, new { error = "只能修改本人申报的题目" });
        if (t.Status == "已发布" && db.ProjectSet.Any(p => p.TopicNo == no))
            return BadRequest(new { error = "该题目已有学生选定，不能修改" });

        t.TopicName = i.TopicName.Trim(); t.TopicType = i.TopicType;
        t.ResearchField = i.ResearchField; t.Difficulty = i.Difficulty;
        t.Capacity = (byte)i.Capacity;
        if (i.MajorCodes is { Length: > 0 })
        {
            var old = await db.TopicMajorSet.Where(x => x.TopicNo == no).ToListAsync();
            db.TopicMajorSet.RemoveRange(old);
            foreach (var mc in i.MajorCodes ?? [])
                db.TopicMajorSet.Add(new TopicMajor { TopicNo = no, MajorCode = mc });
        }
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "题目与选题管理", $"修改题目 {no}");
        return Ok(new { ok = true });
    }

    [HttpDelete("topics/{no}")]
    [Perm("/topic/apply")]
    public async Task<IActionResult> DeleteTopic(string no)
    {
        var t = await db.TopicSet.FindAsync(no);
        if (t is null) return NotFound(new { error = "题目不存在" });
        if (!User.IsAdmin() && t.ApplicantNo != User.TeacherNo())
            return StatusCode(403, new { error = "只能删除本人申报的题目" });
        if (db.ProjectSet.Any(p => p.TopicNo == no))
            return BadRequest(new { error = "该题目已生成课题，不能删除" });
        db.TopicSet.Remove(t);
        await db.SaveChangesAsync();
        await log.WriteAsync("删除", "题目与选题管理", $"删除题目 {no}");
        return Ok(new { ok = true });
    }

    /// <summary>系主任审核题目：通过则发布进入题目库。</summary>
    [HttpPost("topics/{no}/audit")]
    [Perm("/topic/audit")]
    [RoleOnly("系主任")]
    public async Task<IActionResult> AuditTopic(string no, [FromBody] AuditIn i)
    {
        var t = await db.TopicSet.FindAsync(no);
        if (t is null) return NotFound(new { error = "题目不存在" });
        if (i.Status is not ("已发布" or "未通过"))
            return BadRequest(new { error = "审核结论只能是「已发布」或「未通过」" });
        t.Status = i.Status;
        t.AuditOpinion = i.Opinion;

        if (i.Status == "已发布")
        {
            // 审核通过后推送消息给申报教师
            var teacherUserId = await db.TeacherSet.Where(x => x.TeacherNo == t.ApplicantNo)
                .Select(x => x.UserId).FirstOrDefaultAsync();
            if (teacherUserId is not null)
                db.MessageSet.Add(new Message
                {
                    ReceiverId = teacherUserId.Value,
                    Content = $"您申报的题目《{t.TopicName}》已审核通过并发布到题目库。",
                    MessageType = "审核结果", IsRead = false, SendTime = DateTime.Now
                });
        }
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "题目与选题管理", $"审核题目 {no}，结论：{i.Status}");
        return Ok(new { ok = true });
    }

    // ---------------- 选题志愿 ----------------
    /// <summary>学生提交选题志愿（每人最多 3 个志愿，报告 2.3 数据项）。</summary>
    [HttpPost("selections")]
    [Perm("/topic/select")]
    public async Task<IActionResult> AddSelection([FromBody] SelectionIn i)
    {
        var sno = User.StudentNo();
        if (sno is null) return BadRequest(new { error = "只有毕业生可以提交选题志愿" });
        if (await db.ProjectSet.AnyAsync(p => p.StudentNo == sno))
            return BadRequest(new { error = "您已完成选题，不能再次提交志愿" });
        if (i.Preference is < 1 or > 3) return BadRequest(new { error = "志愿顺序只能是 1～3" });
        if (await db.TopicSelectionSet.AnyAsync(s => s.StudentNo == sno && s.TopicNo == i.TopicNo))
            return BadRequest(new { error = "您已经选择了该题目" });
        if (await db.TopicSelectionSet.AnyAsync(s => s.StudentNo == sno && s.Preference == (byte)i.Preference))
            return BadRequest(new { error = $"第 {i.Preference} 志愿已填报，请选择其他志愿顺序" });

        var topic = await db.TopicSet.FirstOrDefaultAsync(t => t.TopicNo == i.TopicNo && t.Status == "已发布");
        if (topic is null) return BadRequest(new { error = "题目不存在或尚未发布" });

        db.TopicSelectionSet.Add(new TopicSelection
        {
            StudentNo = sno, TopicNo = i.TopicNo, Preference = (byte)i.Preference,
            Status = "待匹配", ConfirmTime = null
        });
        await db.SaveChangesAsync();
        await log.WriteAsync("新增", "题目与选题管理", $"提交选题志愿：{i.TopicNo}（第 {i.Preference} 志愿）");
        return Ok(new { ok = true });
    }

    [HttpDelete("selections/{id:long}")]
    [Perm("/topic/select")]
    public async Task<IActionResult> DropSelection(long id)
    {
        var s = await db.TopicSelectionSet.FindAsync(id);
        if (s is null) return NotFound(new { error = "选题记录不存在" });
        if (!User.IsAdmin() && s.StudentNo != User.StudentNo())
            return StatusCode(403, new { error = "只能撤销本人的志愿" });
        if (s.Status != "待匹配") return BadRequest(new { error = "已匹配的志愿不能撤销" });
        db.TopicSelectionSet.Remove(s);
        await db.SaveChangesAsync();
        await log.WriteAsync("删除", "题目与选题管理", $"撤销选题志愿 {id}");
        return Ok(new { ok = true });
    }

    /// <summary>选题记录：学生看本人，教师看本人题目的志愿，系主任看全部。</summary>
    [HttpGet("selections")]
    public async Task<IActionResult> GetSelections([FromQuery] string? topicNo, [FromQuery] string? studentNo)
    {
        var q = db.TopicSelectionSet.AsQueryable();
        var utype = User.UserType();
        if (utype == "学生") q = q.Where(s => s.StudentNo == User.StudentNo());
        else if (utype == "指导教师")
        {
            var tno = User.TeacherNo();
            q = q.Where(s => db.TopicSet.Any(t => t.TopicNo == s.TopicNo && t.ApplicantNo == tno));
        }
        if (!topicNo.Blank()) q = q.Where(s => s.TopicNo == topicNo);
        if (!studentNo.Blank()) q = q.Where(s => s.StudentNo == studentNo);

        var rows = await (from s in q
                          join st in db.StudentSet on s.StudentNo equals st.StudentNo
                          join t in db.TopicSet on s.TopicNo equals t.TopicNo
                          join te in db.TeacherSet on t.ApplicantNo equals te.TeacherNo
                          join c in db.ClassInfoSet on st.ClassNo equals c.ClassNo
                          orderby s.StudentNo, s.Preference
                          select new
                          {
                              selectionId = s.SelectionId,
                              studentNo = s.StudentNo,
                              studentName = st.Name,
                              className = c.ClassName,
                              topicNo = s.TopicNo,
                              topicName = t.TopicName,
                              teacherName = te.Name,
                              capacity = (int)t.Capacity,
                              takenCount = db.ProjectSet.Count(p => p.TopicNo == t.TopicNo),
                              preference = (int)s.Preference,
                              status = s.Status,
                              confirmTime = s.ConfirmTime,
                          }).ToListAsync();
        return Ok(rows);
    }

    /// <summary>师生互选确认：调用存储过程 sp_confirm_selection，在同一事务内锁名额、生成课题、推送消息。</summary>
    [HttpPost("selections/confirm")]
    [Perm("/topic/match")]
    public async Task<IActionResult> Confirm([FromBody] MatchIn i)
    {
        var result = await CallConfirmAsync(i.StudentNo, i.TopicNo);
        await log.WriteAsync("修改", "题目与选题管理", $"互选确认：{i.StudentNo} → {i.TopicNo}，结果：{result}");
        if (!result.StartsWith("互选成功"))
            return BadRequest(new { error = result });
        return Ok(new { ok = true, message = result });
    }

    /// <summary>调剂指派：系主任为未匹配学生直接指定题目（报告 3.3 节"调剂与改选"）。</summary>
    [HttpPost("selections/assign")]
    [Perm("/topic/match")]
    [RoleOnly("系主任")]
    public async Task<IActionResult> Assign([FromBody] MatchIn i)
    {
        // 学生若没有该题志愿，先补一条"已调剂"记录
        var sel = await db.TopicSelectionSet
            .FirstOrDefaultAsync(s => s.StudentNo == i.StudentNo && s.TopicNo == i.TopicNo);
        if (sel is null)
        {
            var used = await db.TopicSelectionSet.Where(s => s.StudentNo == i.StudentNo)
                .Select(s => (int)s.Preference).ToListAsync();
            var pref = Enumerable.Range(1, 3).FirstOrDefault(p => !used.Contains(p));
            if (pref == 0) return BadRequest(new { error = "该学生已填满 3 个志愿，请先撤销一个志愿" });
            db.TopicSelectionSet.Add(new TopicSelection
            {
                StudentNo = i.StudentNo, TopicNo = i.TopicNo, Preference = (byte)pref,
                Status = "待匹配", ConfirmTime = null
            });
            await db.SaveChangesAsync();
        }

        var result = await CallConfirmAsync(i.StudentNo, i.TopicNo);
        if (result.StartsWith("互选成功"))
        {
            var s = await db.TopicSelectionSet
                .FirstOrDefaultAsync(x => x.StudentNo == i.StudentNo && x.TopicNo == i.TopicNo);
            if (s is not null) { s.Status = "已调剂"; await db.SaveChangesAsync(); }
        }
        await log.WriteAsync("修改", "题目与选题管理", $"调剂指派：{i.StudentNo} → {i.TopicNo}，结果：{result}");
        if (!result.StartsWith("互选成功"))
            return BadRequest(new { error = result });
        return Ok(new { ok = true, message = "调剂成功" });
    }

    private async Task<string> CallConfirmAsync(string studentNo, string topicNo)
    {
        var conn = db.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open) await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "sp_confirm_selection";
        cmd.CommandType = CommandType.StoredProcedure;

        var p1 = new MySqlParameter("@p_student_no", studentNo);
        var p2 = new MySqlParameter("@p_topic_no", topicNo);
        var p3 = new MySqlParameter("@p_result", MySqlDbType.VarChar, 50)
        {
            Direction = ParameterDirection.Output
        };
        cmd.Parameters.Add(p1); cmd.Parameters.Add(p2); cmd.Parameters.Add(p3);

        await cmd.ExecuteNonQueryAsync();
        return p3.Value?.ToString() ?? "互选失败：未知原因";
    }

    /// <summary>题目库（视图 v_topic_pool）：只含已发布题目与剩余名额。</summary>
    [HttpGet("topics/pool")]
    public async Task<IActionResult> GetPool([FromQuery] string? kw, [FromQuery] string? majorCode)
    {
        var q = db.VtopicPoolSet.AsQueryable();
        if (!kw.Blank()) q = q.Where(t => t.TopicName!.Contains(kw!) || t.TeacherName!.Contains(kw!));
        var rows = await q.OrderByDescending(t => t.RemainCount).ToListAsync();
        if (!majorCode.Blank())
        {
            var allowed = await db.TopicMajorSet.Where(x => x.MajorCode == majorCode)
                .Select(x => x.TopicNo).ToListAsync();
            return Ok(rows.Where(r => allowed.Contains(r.TopicNo!)).ToList());
        }
        return Ok(rows);
    }

    /// <summary>选题进度统计（视图 v_topic_selection_stat），供系主任确定调剂依据。</summary>
    [HttpGet("topics/stat")]
    [Perm("/service/stat")]
    public async Task<IActionResult> GetSelectionStat()
    {
        var rows = await db.VtopicSelectionStatSet
            .OrderByDescending(x => x.ApplyCount)
            .ThenBy(x => x.TopicNo).ToListAsync();
        return Ok(rows);
    }

    /// <summary>课题列表（按数据范围过滤：学生本人、教师本人指导/评阅/答辩、系主任全部）。</summary>
    [HttpGet("projects")]
    public async Task<IActionResult> GetProjects([FromQuery] string? kw, [FromQuery] string? status)
    {
        var allowed = await scope.ProjectScopeAsync(User);
        var q = db.ProjectSet.AsQueryable();
        if (allowed is not null) q = q.Where(p => allowed.Contains(p.ProjectNo));
        if (!status.Blank()) q = q.Where(p => p.ProjectStatus == status);

        var rows = await (from p in q
                          join s in db.StudentSet on p.StudentNo equals s.StudentNo
                          join c in db.ClassInfoSet on s.ClassNo equals c.ClassNo
                          join t in db.TopicSet on p.TopicNo equals t.TopicNo
                          join te in db.TeacherSet on p.TeacherNo equals te.TeacherNo
                          orderby p.ProjectNo descending
                          select new
                          {
                              projectNo = p.ProjectNo,
                              studentNo = s.StudentNo,
                              studentName = s.Name,
                              className = c.ClassName,
                              topicNo = t.TopicNo,
                              topicName = t.TopicName,
                              cohort = t.Cohort,
                              teacherNo = te.TeacherNo,
                              teacherName = te.Name,
                              currentStage = p.CurrentStage,
                              projectStatus = p.ProjectStatus,
                              startDate = p.StartDate,
                              endDate = p.EndDate,
                          }).ToListAsync();

        if (!kw.Blank())
            rows = rows.Where(r => r.studentName.Contains(kw!) || r.topicName.Contains(kw!)
                                   || r.studentNo.Contains(kw!) || r.teacherName.Contains(kw!)).ToList();
        return Ok(rows);
    }
}
