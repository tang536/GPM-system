using back.Authorization;
using back.Data;
using back.Models;
using back.DTOs;
using back.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace back.Controllers;

/// <summary>模块四：毕业设计过程管理（阶段节点、任务书、材料提交、阶段评阅、延期、进度），报告 3.4 节。</summary>
[ApiController]
[Route("api")]
[Authorize]
public class ProcessController(GradDb db, LogService log, ScopeService scope) : ControllerBase
{
    // ---------------- 阶段与时间节点 ----------------
    [HttpGet("stages")]
    public async Task<IActionResult> GetStages([FromQuery] string? cohort)
    {
        var q = db.StageSet.AsQueryable();
        if (!cohort.Blank()) q = q.Where(s => s.Cohort == cohort);
        var rows = await (from s in q
                          join n in db.StageNodeSet on s.StageId equals n.StageId into nj
                          from n in nj.DefaultIfEmpty()
                          orderby s.Cohort descending, s.StageOrder
                          select new
                          {
                              stageId = (int)s.StageId,
                              stageName = s.StageName,
                              stageOrder = (int)s.StageOrder,
                              cohort = s.Cohort,
                              startTime = n == null ? (DateTime?)null : n.StartTime,
                              deadline = n == null ? (DateTime?)null : n.Deadline,
                              allowFormat = n == null ? null : n.AllowFormat,
                              maxSize = n == null ? (int?)null : (int)n.MaxSize,
                              allowLate = n == null ? (bool?)null : n.AllowLate,
                          }).ToListAsync();
        return Ok(rows);
    }

    [HttpPut("stages/{id:int}/node")]
    [Perm("/process/stage")]
    [RoleOnly("系主任", "系统管理员")]
    public async Task<IActionResult> SaveNode(int id, [FromBody] NodeIn i)
    {
        var stage = await db.StageSet.FindAsync(id);
        if (stage is null) return NotFound(new { error = "阶段不存在" });
        if (!DateTime.TryParse(i.StartTime, out var st) || !DateTime.TryParse(i.Deadline, out var dl))
            return BadRequest(new { error = "时间格式不正确" });
        if (dl <= st) return BadRequest(new { error = "截止时间必须晚于开始时间" });

        var node = await db.StageNodeSet.FirstOrDefaultAsync(n => n.StageId == stage.StageId);
        if (node is null)
        {
            db.StageNodeSet.Add(new StageNode
            {
                StageId = stage.StageId, StartTime = st, Deadline = dl,
                AllowFormat = i.AllowFormat.Blank() ? "pdf,doc,docx,zip" : i.AllowFormat,
                MaxSize = (ushort)i.MaxSize, AllowLate = i.AllowLate
            });
        }
        else
        {
            node.StartTime = st; node.Deadline = dl;
            node.AllowFormat = i.AllowFormat.Blank() ? node.AllowFormat : i.AllowFormat;
            node.MaxSize = (ushort)i.MaxSize; node.AllowLate = i.AllowLate;
        }
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "毕业设计过程管理", $"设置阶段节点：{stage.StageName}（{stage.Cohort} 届）");
        return Ok(new { ok = true });
    }

    // ---------------- 任务书 ----------------
    [HttpGet("taskbooks")]
    public async Task<IActionResult> GetTaskBooks([FromQuery] string? projectNo, [FromQuery] string? kw)
    {
        var allowed = await scope.ProjectScopeAsync(User);
        var q = db.TaskBookSet.AsQueryable();
        if (allowed is not null) q = q.Where(t => allowed.Contains(t.ProjectNo));
        if (!projectNo.Blank()) q = q.Where(t => t.ProjectNo == projectNo);

        var rows = await (from t in q
                          join p in db.ProjectSet on t.ProjectNo equals p.ProjectNo
                          join s in db.StudentSet on p.StudentNo equals s.StudentNo
                          join tp in db.TopicSet on p.TopicNo equals tp.TopicNo
                          join te in db.TeacherSet on p.TeacherNo equals te.TeacherNo
                          orderby t.IssueTime descending
                          select new
                          {
                              taskId = t.TaskId,
                              projectNo = t.ProjectNo,
                              studentNo = s.StudentNo,
                              studentName = s.Name,
                              topicName = tp.TopicName,
                              teacherName = te.Name,
                              designTask = t.DesignTask,
                              techRequirement = t.TechRequirement,
                              schedule = t.Schedule,
                              issueTime = t.IssueTime,
                              confirmStatus = t.ConfirmStatus,
                          }).ToListAsync();

        if (!kw.Blank())
            rows = rows.Where(r => r.studentName.Contains(kw!) || r.topicName.Contains(kw!)).ToList();
        return Ok(rows);
    }

    /// <summary>教师下达任务书（一个课题一份，报告 3.4 节 1:1 联系）。</summary>
    [HttpPost("taskbooks")]
    [Perm("/process/task")]
    public async Task<IActionResult> SaveTaskBook([FromBody] TaskIn i)
    {
        if (i.DesignTask.Blank()) return BadRequest(new { error = "设计任务不能为空" });
        var p = await db.ProjectSet.FirstOrDefaultAsync(x => x.ProjectNo == i.ProjectNo);
        if (p is null) return BadRequest(new { error = "课题不存在" });
        if (!User.IsAdmin() && p.TeacherNo != User.TeacherNo())
            return StatusCode(403, new { error = "只能为本人指导的课题下达任务书" });

        var tb = await db.TaskBookSet.FirstOrDefaultAsync(t => t.ProjectNo == i.ProjectNo);
        if (tb is null)
        {
            db.TaskBookSet.Add(new TaskBook
            {
                ProjectNo = i.ProjectNo, DesignTask = i.DesignTask,
                TechRequirement = i.TechRequirement, Schedule = i.Schedule,
                IssueTime = DateTime.Now, ConfirmStatus = "未确认"
            });
        }
        else
        {
            if (tb.ConfirmStatus == "已确认")
                return BadRequest(new { error = "学生已确认，任务书不能再修改；如需变更请联系教学秘书" });
            tb.DesignTask = i.DesignTask; tb.TechRequirement = i.TechRequirement;
            tb.Schedule = i.Schedule; tb.IssueTime = DateTime.Now;
        }
        await db.SaveChangesAsync();

        // 推送消息给学生
        var stuUser = await db.StudentSet.Where(s => s.StudentNo == p.StudentNo)
            .Select(s => s.UserId).FirstOrDefaultAsync();
        if (stuUser is not null)
        {
            db.MessageSet.Add(new Message
            {
                ReceiverId = stuUser.Value,
                Content = "指导教师已下达毕业设计任务书，请登录系统查看并确认接收。",
                MessageType = "系统通知", IsRead = false, SendTime = DateTime.Now
            });
            await db.SaveChangesAsync();
        }
        await log.WriteAsync("修改", "毕业设计过程管理", $"下达任务书：{i.ProjectNo}");
        return Ok(new { ok = true });
    }

    /// <summary>学生确认接收任务书。</summary>
    [HttpPost("taskbooks/{id:long}/confirm")]
    [Perm("/process/task")]
    public async Task<IActionResult> ConfirmTask(long id)
    {
        var tb = await db.TaskBookSet.FindAsync(id);
        if (tb is null) return NotFound(new { error = "任务书不存在" });
        var p = await db.ProjectSet.FirstOrDefaultAsync(x => x.ProjectNo == tb.ProjectNo);
        if (!User.IsAdmin() && p?.StudentNo != User.StudentNo())
            return StatusCode(403, new { error = "只有本人可以确认任务书" });
        if (tb.ConfirmStatus == "已确认") return BadRequest(new { error = "任务书已确认" });

        tb.ConfirmStatus = "已确认";
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "毕业设计过程管理", $"确认任务书：{tb.ProjectNo}");
        return Ok(new { ok = true });
    }

    // ---------------- 材料提交 ----------------
    [HttpGet("submissions")]
    public async Task<IActionResult> GetSubmissions([FromQuery] string? projectNo, [FromQuery] string? stageId, [FromQuery] string? kw)
    {
        var allowed = await scope.ProjectScopeAsync(User);
        var q = db.SubmissionSet.AsQueryable();
        if (allowed is not null) q = q.Where(s => allowed.Contains(s.ProjectNo));
        if (!projectNo.Blank()) q = q.Where(s => s.ProjectNo == projectNo);
        if (!stageId.Blank() && int.TryParse(stageId, out var sid)) q = q.Where(s => s.StageId == sid);

        var rows = await (from s in q
                          join p in db.ProjectSet on s.ProjectNo equals p.ProjectNo
                          join st in db.StudentSet on p.StudentNo equals st.StudentNo
                          join g in db.StageSet on s.StageId equals g.StageId
                          join te in db.TeacherSet on p.TeacherNo equals te.TeacherNo
                          orderby s.SubmitTime descending
                          select new
                          {
                              submissionId = s.SubmissionId,
                              projectNo = s.ProjectNo,
                              studentNo = st.StudentNo,
                              studentName = st.Name,
                              teacherName = te.Name,
                              stageId = (int)s.StageId,
                              stageName = g.StageName,
                              version = (int)s.Version,
                              filePath = s.FilePath,
                              submitTime = s.SubmitTime,
                              auditStatus = s.AuditStatus,
                              conclusion = db.ReviewSet.Where(r => r.SubmissionId == s.SubmissionId)
                                             .Select(r => r.Conclusion).FirstOrDefault(),
                              opinion = db.ReviewSet.Where(r => r.SubmissionId == s.SubmissionId)
                                             .Select(r => r.ReviewOpinion).FirstOrDefault(),
                          }).ToListAsync();

        if (!kw.Blank())
            rows = rows.Where(r => r.studentName.Contains(kw!) || r.projectNo.Contains(kw!)).ToList();
        return Ok(rows);
    }

    /// <summary>学生提交阶段材料；时间与格式由数据库触发器 trg_submission_bi 二次校验。</summary>
    [HttpPost("submissions")]
    [Perm("/process/submit")]
    public async Task<IActionResult> Submit([FromBody] SubmitIn i)
    {
        var p = await db.ProjectSet.FirstOrDefaultAsync(x => x.ProjectNo == i.ProjectNo);
        if (p is null) return BadRequest(new { error = "课题不存在" });
        if (!User.IsAdmin() && p.StudentNo != User.StudentNo())
            return StatusCode(403, new { error = "只能提交本人课题的材料" });
        if (i.FilePath.Blank()) return BadRequest(new { error = "请先上传材料文件" });

        var maxVer = await db.SubmissionSet
            .Where(s => s.ProjectNo == i.ProjectNo && s.StageId == (ushort)i.StageId)
            .MaxAsync(s => (int?)s.Version) ?? 0;

        var sub = new Submission
        {
            ProjectNo = i.ProjectNo, StageId = (ushort)i.StageId,
            Version = (short)(maxVer + 1), FilePath = i.FilePath,
            SubmitTime = DateTime.Now, AuditStatus = "待评阅"
        };
        db.SubmissionSet.Add(sub);
        await db.SaveChangesAsync();
        await log.WriteAsync("新增", "毕业设计过程管理", $"提交材料：{i.ProjectNo} 第 {sub.Version} 版");
        return Ok(new { ok = true, submissionId = sub.SubmissionId, version = sub.Version });
    }

    /// <summary>阶段评阅：给出"通过/修改后通过/不通过"结论并回写材料审核状态。</summary>
    [HttpPost("submissions/{id:long}/review")]
    [Perm("/process/review")]
    public async Task<IActionResult> Review(long id, [FromBody] ReviewIn i)
    {
        var tno = User.TeacherNo();
        if (tno is null) return BadRequest(new { error = "只有教师可以进行评阅" });
        if (i.Conclusion is not ("通过" or "修改后通过" or "不通过"))
            return BadRequest(new { error = "评阅结论只能是：通过、修改后通过、不通过" });

        var sub = await db.SubmissionSet.FindAsync(id);
        if (sub is null) return NotFound(new { error = "材料不存在" });

        var exists = await db.ReviewSet.FirstOrDefaultAsync(r => r.SubmissionId == id && r.ReviewerNo == tno);
        if (exists is null)
        {
            db.ReviewSet.Add(new Review
            {
                SubmissionId = id, ReviewerNo = tno, Conclusion = i.Conclusion,
                ReviewOpinion = i.Opinion, ReviewTime = DateTime.Now
            });
        }
        else
        {
            exists.Conclusion = i.Conclusion; exists.ReviewOpinion = i.Opinion;
            exists.ReviewTime = DateTime.Now;
        }
        sub.AuditStatus = i.Conclusion;

        var p = await db.ProjectSet.FirstOrDefaultAsync(x => x.ProjectNo == sub.ProjectNo);
        if (p is not null)
        {
            var stuUser = await db.StudentSet.Where(s => s.StudentNo == p.StudentNo)
                .Select(s => s.UserId).FirstOrDefaultAsync();
            if (stuUser is not null)
                db.MessageSet.Add(new Message
                {
                    ReceiverId = stuUser.Value,
                    Content = $"您的材料已评阅，结论：{i.Conclusion}。{i.Opinion}",
                    MessageType = "评阅反馈", IsRead = false, SendTime = DateTime.Now
                });
        }
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "毕业设计过程管理", $"评阅材料 {id}，结论：{i.Conclusion}");
        return Ok(new { ok = true });
    }

    // ---------------- 延期申请 ----------------
    [HttpGet("extensions")]
    public async Task<IActionResult> GetExtensions([FromQuery] string? kw)
    {
        var allowed = await scope.ProjectScopeAsync(User);
        var q = db.ExtensionRequestSet.AsQueryable();
        if (allowed is not null) q = q.Where(e => allowed.Contains(e.ProjectNo));

        var rows = await (from e in q
                          join p in db.ProjectSet on e.ProjectNo equals p.ProjectNo
                          join s in db.StudentSet on p.StudentNo equals s.StudentNo
                          join g in db.StageSet on e.StageId equals g.StageId
                          join te in db.TeacherSet on p.TeacherNo equals te.TeacherNo
                          join ap in db.TeacherSet on e.ApproverNo equals ap.TeacherNo into aj
                          from ap in aj.DefaultIfEmpty()
                          orderby e.ApplyTime descending
                          select new
                          {
                              requestId = e.RequestId,
                              projectNo = e.ProjectNo,
                              studentNo = s.StudentNo,
                              studentName = s.Name,
                              teacherName = te.Name,
                              stageName = g.StageName,
                              reason = e.Reason,
                              applyTime = e.ApplyTime,
                              approverNo = e.ApproverNo,
                              approverName = ap == null ? null : ap.Name,
                              result = e.Result,
                              delayDays = e.DelayDays,
                          }).ToListAsync();

        if (!kw.Blank())
            rows = rows.Where(r => r.studentName.Contains(kw!) || r.reason.Contains(kw!)).ToList();
        return Ok(rows);
    }

    /// <summary>学生提交延期申请。</summary>
    [HttpPost("extensions")]
    [Perm("/process/extend")]
    public async Task<IActionResult> ApplyExtension([FromBody] ExtIn i)
    {
        var p = await db.ProjectSet.FirstOrDefaultAsync(x => x.ProjectNo == i.ProjectNo);
        if (p is null) return BadRequest(new { error = "课题不存在" });
        if (!User.IsAdmin() && p.StudentNo != User.StudentNo())
            return StatusCode(403, new { error = "只能为本人课题申请延期" });
        if (i.Reason.Blank()) return BadRequest(new { error = "请填写申请理由" });
        if (i.DelayDays is < 1 or > 30) return BadRequest(new { error = "延期天数应在 1～30 天之间" });

        db.ExtensionRequestSet.Add(new ExtensionRequest
        {
            ProjectNo = i.ProjectNo, StageId = (ushort)i.StageId, Reason = i.Reason,
            ApplyTime = DateTime.Now, Result = "待审批", DelayDays = (ushort)i.DelayDays
        });
        await db.SaveChangesAsync();
        await log.WriteAsync("新增", "毕业设计过程管理", $"提交延期申请：{i.ProjectNo}，{i.DelayDays} 天");
        return Ok(new { ok = true });
    }

    /// <summary>延期审批：指导教师或系主任处理。</summary>
    [HttpPost("extensions/{id:long}/approve")]
    [Perm("/process/extend")]
    public async Task<IActionResult> Approve(long id, [FromBody] ApproveIn i)
    {
        var tno = User.TeacherNo();
        if (tno is null) return BadRequest(new { error = "只有教师可以审批延期申请" });
        if (i.Result is not ("同意" or "不同意")) return BadRequest(new { error = "审批结果只能是同意或不同意" });

        var e = await db.ExtensionRequestSet.FindAsync(id);
        if (e is null) return NotFound(new { error = "延期申请不存在" });
        if (e.Result != "待审批") return BadRequest(new { error = "该申请已处理，不能重复审批" });

        e.Result = i.Result;
        e.ApproverNo = tno;
        if (i.Result == "同意") e.DelayDays = (ushort)(i.DelayDays ?? e.DelayDays ?? 1);

        var p = await db.ProjectSet.FirstOrDefaultAsync(x => x.ProjectNo == e.ProjectNo);
        if (p is not null)
        {
            var stuUser = await db.StudentSet.Where(s => s.StudentNo == p.StudentNo)
                .Select(s => s.UserId).FirstOrDefaultAsync();
            if (stuUser is not null)
                db.MessageSet.Add(new Message
                {
                    ReceiverId = stuUser.Value,
                    Content = i.Result == "同意"
                        ? $"您的延期申请已获批准，延期 {e.DelayDays} 天。"
                        : "您的延期申请未获批准，请按原定时间完成。",
                    MessageType = "审核结果", IsRead = false, SendTime = DateTime.Now
                });
        }
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "毕业设计过程管理", $"审批延期申请 {id}，结果：{i.Result}");
        return Ok(new { ok = true });
    }

    // ---------------- 进度跟踪 ----------------
    /// <summary>课题各阶段完成情况（视图 v_stage_progress）。</summary>
    [HttpGet("progress")]
    public async Task<IActionResult> GetProgress([FromQuery] string? projectNo, [FromQuery] string? cohort)
    {
        var allowed = await scope.ProjectScopeAsync(User);
        var q = db.VstageProgressSet.AsQueryable();
        if (allowed is not null) q = q.Where(x => allowed.Contains(x.ProjectNo!));
        if (!projectNo.Blank()) q = q.Where(x => x.ProjectNo == projectNo);

        var rows = await q.OrderBy(x => x.ProjectNo).ThenBy(x => x.StageId).ToListAsync();
        if (!cohort.Blank())
        {
            var projects = await db.ProjectSet.Select(p => p.ProjectNo).ToListAsync();
            var inCohort = await (from p in db.ProjectSet
                                  join t in db.TopicSet on p.TopicNo equals t.TopicNo
                                  where t.Cohort == cohort
                                  select p.ProjectNo).ToListAsync();
            rows = rows.Where(r => inCohort.Contains(r.ProjectNo!)).ToList();
        }
        return Ok(rows);
    }

    /// <summary>逾期名单（视图 v_overdue_list）。</summary>
    [HttpGet("overdue")]
    [Perm("/service/stat")]
    public async Task<IActionResult> GetOverdue()
    {
        var rows = await db.VoverdueListSet.OrderByDescending(x => x.OverdueDays).ToListAsync();
        return Ok(rows);
    }
}
