using System.Diagnostics;
using back.Authorization;
using back.Data;
using back.Models;
using back.DTOs;
using back.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace back.Controllers;

/// <summary>模块六：信息服务与系统维护（公告、消息、统计、参数、备份、上传），报告 3.6 节。</summary>
[ApiController]
[Route("api")]
[Authorize]
public class ServiceController(GradDb db, LogService log, ScopeService scope, IConfiguration cfg,
                               IWebHostEnvironment env) : ControllerBase
{
    // ---------------- 公告 ----------------
    [HttpGet("notices")]
    public async Task<IActionResult> GetNotices([FromQuery] string? kw, [FromQuery] string? type)
    {
        var q = db.NoticeSet.AsQueryable();
        var utype = User.UserType();
        // 按发布范围过滤：全院公告所有人可见，其余按身份投放。
        // scope 支持多范围（逗号分隔存储），任一命中即可见——先投影再内存过滤，
        // 公告表数据量小，避免为逗号拼接匹配生成复杂 SQL
        if (!kw.Blank()) q = q.Where(n => n.Title.Contains(kw!) || n.Content.Contains(kw!));
        if (!type.Blank()) q = q.Where(n => n.NoticeType == type);

        var rows = await (from n in q
                          join u in db.SysUserSet on n.PublisherId equals u.UserId
                          orderby n.IsTop descending, n.PublishTime descending
                          select new
                          {
                              noticeId = n.NoticeId,
                              title = n.Title,
                              content = n.Content,
                              noticeType = n.NoticeType,
                              scope = n.Scope,
                              publisher = u.Account,
                              publishTime = n.PublishTime,
                              isTop = n.IsTop,
                          }).ToListAsync();
        if (!User.IsAdmin() && !User.InRole("系主任"))
        {
            // 用 List 而非数组：C# 14 会把 string[].Contains 绑到 ReadOnlySpan 重载，
            // 表达式树解释器无法求值该参数（TRet 约束冲突），故统一走 List 的实例方法
            var visible = utype == "学生"
                ? new List<string> { "全院", "学生", "毕业生" }
                : new List<string> { "全院", "教师", "指导教师", "评阅教师" };
            rows = rows.Where(r => r.scope.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Any(s => visible.Contains(s))).ToList();
        }
        return Ok(rows);
    }

    /// <summary>发布公告：写入公告后按发布范围推送站内消息（报告 3.6 节）。</summary>
    [HttpPost("notices")]
    [Perm("/service/notice")]
    [RoleOnly("系主任", "系统管理员")]
    public async Task<IActionResult> AddNotice([FromBody] NoticeIn i)
    {
        if (i.Title.Blank() || i.Content.Blank()) return BadRequest(new { error = "公告标题与内容不能为空" });

        var n = new Notice
        {
            Title = i.Title.Trim(), Content = i.Content, NoticeType = i.NoticeType,
            Scope = NormalizeScope(i), PublisherId = User.Uid(),
            PublishTime = DateTime.Now, IsTop = i.IsTop
        };
        db.NoticeSet.Add(n);
        await db.SaveChangesAsync();

        var recv = await ResolveReceiversAsync(n.Scope);
        foreach (var uid in recv)
            db.MessageSet.Add(new Message
            {
                ReceiverId = uid, Content = $"【公告】{n.Title}",
                MessageType = "系统通知", IsRead = false, SendTime = DateTime.Now
            });
        await db.SaveChangesAsync();

        await log.WriteAsync("新增", "信息服务与系统维护", $"发布公告《{n.Title}》，推送 {recv.Count} 条消息");
        return Ok(new { ok = true, pushed = recv.Count });
    }

    [HttpPut("notices/{id:long}")]
    [Perm("/service/notice")]
    [RoleOnly("系主任", "系统管理员")]
    public async Task<IActionResult> UpdateNotice(long id, [FromBody] NoticeIn i)
    {
        var n = await db.NoticeSet.FindAsync(id);
        if (n is null) return NotFound(new { error = "公告不存在" });
        n.Title = i.Title.Trim(); n.Content = i.Content; n.NoticeType = i.NoticeType;
        n.Scope = NormalizeScope(i); n.IsTop = i.IsTop;
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "信息服务与系统维护", $"修改公告《{n.Title}》");
        return Ok(new { ok = true });
    }

    [HttpDelete("notices/{id:long}")]
    [Perm("/service/notice")]
    [RoleOnly("系主任", "系统管理员")]
    public async Task<IActionResult> DeleteNotice(long id)
    {
        var n = await db.NoticeSet.FindAsync(id);
        if (n is null) return NotFound(new { error = "公告不存在" });
        db.NoticeSet.Remove(n);
        await db.SaveChangesAsync();
        await log.WriteAsync("删除", "信息服务与系统维护", $"删除公告《{n.Title}》");
        return Ok(new { ok = true });
    }

    /// <summary>发布范围归一化：多选优先，逗号连接去重；均未选时默认全院</summary>
    private static string NormalizeScope(NoticeIn i)
    {
        // 显式声明为 IEnumerable<string?>：List<string> 与 string?[] 无法推断公共条件类型
        IEnumerable<string?> raw = i.Scopes is { Count: > 0 } ? i.Scopes : new[] { i.Scope };
        var parts = raw.Where(s => !s.Blank()).Select(s => s!.Trim()).Distinct().ToList();
        return parts.Count > 0 ? string.Join(",", parts) : "全院";
    }

    /// <summary>解析公告接收人：多范围（逗号分隔）取并集推送</summary>
    private async Task<List<long>> ResolveReceiversAsync(string scope)
    {
        var parts = scope.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var ids = new HashSet<long>();
        foreach (var p in parts)
            foreach (var id in await ResolveReceiversSingleAsync(p))
                ids.Add(id);
        return ids.ToList();
    }

    private async Task<List<long>> ResolveReceiversSingleAsync(string scope)
    {
        if (scope is "全院" or "全体")
            return await db.SysUserSet.Where(u => u.Status == "启用").Select(u => (long)u.UserId).ToListAsync();
        if (scope is "学生" or "毕业生")
            return await db.SysUserSet.Where(u => u.Status == "启用" && u.UserType == "学生").Select(u => (long)u.UserId).ToListAsync();
        if (scope is "教师")
            return await db.SysUserSet.Where(u => u.Status == "启用"
                    && (u.UserType == "指导教师" || u.UserType == "评阅教师" || u.UserType == "系主任"))
                .Select(u => (long)u.UserId).ToListAsync();
        if (scope is "指导教师")
            return await db.SysUserSet.Where(u => u.Status == "启用" && u.UserType == "指导教师").Select(u => (long)u.UserId).ToListAsync();
        if (scope is "评阅教师")
            return await db.SysUserSet.Where(u => u.Status == "启用" && u.UserType == "评阅教师").Select(u => (long)u.UserId).ToListAsync();
        return await db.SysUserSet.Where(u => u.Status == "启用").Select(u => (long)u.UserId).ToListAsync();
    }

    // ---------------- 消息 ----------------
    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages([FromQuery] bool unreadOnly = false)
    {
        var q = db.MessageSet.Where(m => m.ReceiverId == User.Uid());
        if (unreadOnly) q = q.Where(m => !m.IsRead);
        var rows = await q.OrderByDescending(m => m.SendTime).Take(200)
            .Select(m => new
            {
                messageId = m.MessageId, content = m.Content, messageType = m.MessageType,
                isRead = m.IsRead, sendTime = m.SendTime,
            }).ToListAsync();
        return Ok(rows);
    }

    [HttpGet("messages/unread")]
    public async Task<IActionResult> Unread()
    {
        var count = await db.MessageSet.CountAsync(m => m.ReceiverId == User.Uid() && !m.IsRead);
        return Ok(new { count });
    }

    [HttpPost("messages/{id:long}/read")]
    public async Task<IActionResult> ReadOne(long id)
    {
        var m = await db.MessageSet.FirstOrDefaultAsync(x => x.MessageId == id && x.ReceiverId == User.Uid());
        if (m is null) return NotFound(new { error = "消息不存在" });
        m.IsRead = true;
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }

    [HttpPost("messages/read-all")]
    public async Task<IActionResult> ReadAll()
    {
        var list = await db.MessageSet.Where(m => m.ReceiverId == User.Uid() && !m.IsRead).ToListAsync();
        foreach (var m in list) m.IsRead = true;
        await db.SaveChangesAsync();
        return Ok(new { ok = true, count = list.Count });
    }

    // ---------------- 统计 ----------------
    /// <summary>首页概览：按身份返回不同的指标（报告 3.6 节查询统计）。</summary>
    [HttpGet("stats/overview")]
    public async Task<IActionResult> Overview()
    {
        var utype = User.UserType();
        var allowed = await scope.ProjectScopeAsync(User);

        if (utype == "学生")
        {
            var sno = User.StudentNo();
            var proj = await db.ProjectSet.FirstOrDefaultAsync(p => p.StudentNo == sno);
            string? stageName = null; DateTime? deadline = null; string? topicName = null; string? teacherName = null;
            if (proj is not null)
            {
                topicName = await db.TopicSet.Where(t => t.TopicNo == proj.TopicNo).Select(t => t.TopicName).FirstOrDefaultAsync();
                teacherName = await db.TeacherSet.Where(t => t.TeacherNo == proj.TeacherNo).Select(t => t.Name).FirstOrDefaultAsync();
                if (proj.CurrentStage is not null)
                {
                    stageName = await db.StageSet.Where(s => s.StageId == proj.CurrentStage).Select(s => s.StageName).FirstOrDefaultAsync();
                    deadline = await db.StageNodeSet.Where(n => n.StageId == proj.CurrentStage).Select(n => (DateTime?)n.Deadline).FirstOrDefaultAsync();
                }
            }
            var score = proj is null ? null : await db.VscoreReportSet.FirstOrDefaultAsync(x => x.ProjectNo == proj.ProjectNo);
            return Ok(new
            {
                role = "学生",
                projectNo = proj?.ProjectNo, topicName, teacherName, stageName, deadline,
                submittedCount = proj is null ? 0 : await db.SubmissionSet.CountAsync(s => s.ProjectNo == proj.ProjectNo),
                totalStage = await db.StageSet.CountAsync(s => s.Cohort == "2026"),
                unread = await db.MessageSet.CountAsync(m => m.ReceiverId == User.Uid() && !m.IsRead),
                score,
                notices = await db.NoticeSet.CountAsync(),
            });
        }

        if (utype == "指导教师" || utype == "评阅教师")
        {
            var tno = User.TeacherNo();
            return Ok(new
            {
                role = utype,
                myTopics = await db.TopicSet.CountAsync(t => t.ApplicantNo == tno),
                myStudents = await db.ProjectSet.CountAsync(p => p.TeacherNo == tno),
                // 待我评阅：已分派给我（存在 review 记录）且仍处于"待评阅"的材料
                pendingReview = await (from s in db.SubmissionSet
                                       join r in db.ReviewSet on s.SubmissionId equals r.SubmissionId
                                       where r.ReviewerNo == tno && s.AuditStatus == "待评阅"
                                       select s.SubmissionId).Distinct().CountAsync(),
                pendingExtend = await (from e in db.ExtensionRequestSet
                                       join p in db.ProjectSet on e.ProjectNo equals p.ProjectNo
                                       where p.TeacherNo == tno && e.Result == "待审批"
                                       select e.RequestId).CountAsync(),
                visibleProjects = allowed?.Count ?? await db.ProjectSet.CountAsync(),
                unread = await db.MessageSet.CountAsync(m => m.ReceiverId == User.Uid() && !m.IsRead),
            });
        }

        // 管理员 / 系主任
        return Ok(new
        {
            role = utype,
            users = await db.SysUserSet.CountAsync(),
            students = await db.StudentSet.CountAsync(),
            teachers = await db.TeacherSet.CountAsync(),
            topics = await db.TopicSet.CountAsync(),
            pendingTopics = await db.TopicSet.CountAsync(t => t.Status == "待审核"),
            projects = await db.ProjectSet.CountAsync(),
            pendingExtend = await db.ExtensionRequestSet.CountAsync(e => e.Result == "待审批"),
            unpublishedScores = await db.ScoreSet.CountAsync(s => s.PublishStatus != "已发布"),
            publishedScores = await db.ScoreSet.CountAsync(s => s.PublishStatus == "已发布"),
            unread = await db.MessageSet.CountAsync(m => m.ReceiverId == User.Uid() && !m.IsRead),
            notices = await db.NoticeSet.CountAsync(),
        });
    }

    /// <summary>各阶段提交情况（统计报表：按阶段汇总已提交/未提交）。</summary>
    [HttpGet("stats/progress")]
    [Perm("/service/stat")]
    public async Task<IActionResult> ProgressStat([FromQuery] string cohort = "2026")
    {
        var rows = await db.VstageProgressSet.ToListAsync();
        var inCohort = await (from p in db.ProjectSet
                              join t in db.TopicSet on p.TopicNo equals t.TopicNo
                              where t.Cohort == cohort
                              select p.ProjectNo).ToListAsync();
        var filtered = rows.Where(r => inCohort.Contains(r.ProjectNo!)).ToList();

        var result = filtered.GroupBy(r => new { r.StageId, r.StageName })
            .OrderBy(g => g.Key.StageId)
            .Select(g => new
            {
                stageId = g.Key.StageId,
                stageName = g.Key.StageName,
                total = g.Count(),
                submitted = g.Count(x => x.SubmitStatus != "未提交"),
                onTime = g.Count(x => x.SubmitStatus == "已提交"),
                overdue = g.Count(x => x.SubmitStatus == "逾期提交"),
                missing = g.Count(x => x.SubmitStatus == "未提交"),
                deadline = g.First().Deadline,
            }).ToList();
        return Ok(result);
    }

    /// <summary>按院系统计课题与成绩（多维统计报表）。</summary>
    [HttpGet("stats/dept")]
    [Perm("/service/stat")]
    public async Task<IActionResult> DeptStat()
    {
        var projects = await (from p in db.ProjectSet
                              join s in db.StudentSet on p.StudentNo equals s.StudentNo
                              join c in db.ClassInfoSet on s.ClassNo equals c.ClassNo
                              join m in db.MajorSet on c.MajorCode equals m.MajorCode
                              join d in db.DepartmentSet on m.DeptNo equals d.DeptNo
                              join t in db.TopicSet on p.TopicNo equals t.TopicNo
                              select new { d.DeptNo, d.DeptName, t.Cohort, p.ProjectNo }).ToListAsync();

        var scores = await db.VscoreReportSet.Where(x => x.PublishStatus == "已发布").ToListAsync();

        var rows = projects.GroupBy(p => new { p.DeptNo, p.DeptName })
            .Select(g => new
            {
                deptNo = g.Key.DeptNo,
                deptName = g.Key.DeptName,
                projectCount = g.Count(),
                studentCount = g.Select(x => x.ProjectNo).Distinct().Count(),
                publishedCount = scores.Count(s => s.DeptName == g.Key.DeptName),
                avgScore = scores.Where(s => s.DeptName == g.Key.DeptName)
                                 .Select(s => s.TotalScore).DefaultIfEmpty(0).Average(),
            }).OrderBy(x => x.deptNo).ToList();
        return Ok(rows);
    }

    /// <summary>教师工作量统计（视图 v_teacher_workload）。</summary>
    [HttpGet("stats/workload")]
    [Perm("/service/stat")]
    public async Task<IActionResult> Workload()
    {
        var rows = await db.VteacherWorkloadSet.OrderByDescending(x => x.StudentCount).ToListAsync();
        return Ok(rows);
    }

    // ---------------- 系统参数 ----------------
    [HttpGet("params")]
    [Perm("/service/param")]
    public async Task<IActionResult> GetParams()
    {
        var rows = await db.SysParamSet.OrderBy(p => p.ParamId).Select(p => new
        {
            paramId = (int)p.ParamId, paramName = p.ParamName,
            paramValue = p.ParamValue, remark = p.Remark,
        }).ToListAsync();
        return Ok(rows);
    }

    [HttpPut("params/{name}")]
    [Perm("/service/param")]
    public async Task<IActionResult> SetParam(string name, [FromBody] ParamIn i)
    {
        if (name.StartsWith("score.") && name.EndsWith("_weight"))
            return BadRequest(new { error = "三个成绩权重必须一起调整，请使用「调整成绩权重」" });
        var p = await db.SysParamSet.FirstOrDefaultAsync(x => x.ParamName == name);
        if (p is null) return NotFound(new { error = "参数不存在" });
        p.ParamValue = i.ParamValue;
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "信息服务与系统维护", $"修改参数 {name} = {i.ParamValue}");
        return Ok(new { ok = true });
    }

    /// <summary>成绩权重整体调整：三项之和必须等于 1（报告 4.1 节用户定义完整性）。</summary>
    [HttpPut("params/weights")]
    [Perm("/service/param/weight")]
    public async Task<IActionResult> SetWeights([FromBody] WeightsIn i)
    {
        var sum = i.Process + i.Review + i.Defense;
        if (sum != 1m)
            return BadRequest(new { error = $"三项权重之和必须等于 1，当前为 {sum:0.##}" });
        if (i.Process < 0 || i.Review < 0 || i.Defense < 0)
            return BadRequest(new { error = "权重不能为负数" });

        var names = new[] { "score.process_weight", "score.review_weight", "score.defense_weight" };
        var values = new[] { i.Process, i.Review, i.Defense };
        for (var k = 0; k < names.Length; k++)
        {
            var p = await db.SysParamSet.FirstOrDefaultAsync(x => x.ParamName == names[k]);
            if (p is null) db.SysParamSet.Add(new SysParam { ParamName = names[k], ParamValue = values[k].ToString("0.00"), Remark = "成绩权重" });
            else p.ParamValue = values[k].ToString("0.00");
        }
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "信息服务与系统维护",
            $"调整成绩权重：过程 {i.Process:0.00} / 评阅 {i.Review:0.00} / 答辩 {i.Defense:0.00}");
        return Ok(new { ok = true });
    }

    // ---------------- 备份 ----------------
    [HttpGet("backups")]
    [Perm("/service/backup")]
    public IActionResult GetBackups()
    {
        var dir = Path.Combine(env.ContentRootPath, "backups");
        Directory.CreateDirectory(dir);
        var rows = new DirectoryInfo(dir).GetFiles("*.sql")
            .OrderByDescending(f => f.LastWriteTime)
            .Select(f => new { name = f.Name, size = f.Length / 1024, time = f.LastWriteTime })
            .ToList();
        return Ok(rows);
    }

    /// <summary>执行 mysqldump 逻辑备份（报告 5.1 节备份方案）。</summary>
    [HttpPost("backups")]
    [Perm("/service/backup")]
    [RoleOnly("系主任", "系统管理员")]
    public async Task<IActionResult> CreateBackup()
    {
        var binDir = cfg["Mysql:BinPath"] ?? "C:/Program Files/MySQL/MySQL Server 9.6/bin";
        var dump = Path.Combine(binDir, "mysqldump.exe");
        if (!System.IO.File.Exists(dump)) return BadRequest(new { error = "未找到 mysqldump，请检查 Mysql:BinPath 配置" });

        var dir = Path.Combine(env.ContentRootPath, "backups");
        Directory.CreateDirectory(dir);
        var name = $"graddb_{DateTime.Now:yyyyMMdd_HHmmss}.sql";
        var file = Path.Combine(dir, name);

        var psi = new ProcessStartInfo(dump)
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardOutputEncoding = System.Text.Encoding.UTF8,
        };
        foreach (var a in new[] { "-uroot", "-p12345", "--default-character-set=utf8mb4",
                                  "--single-transaction", "--routines", "--triggers", "graddb" })
            psi.ArgumentList.Add(a);

        using var proc = Process.Start(psi)!;
        await using (var fs = System.IO.File.Create(file))
            await proc.StandardOutput.BaseStream.CopyToAsync(fs);
        var err = await proc.StandardError.ReadToEndAsync();
        await proc.WaitForExitAsync();
        if (proc.ExitCode != 0)
            return BadRequest(new { error = "备份失败：" + err[..Math.Min(err.Length, 200)] });

        await log.WriteAsync("新增", "信息服务与系统维护", $"数据库备份：{name}");
        var size = new FileInfo(file).Length / 1024;
        return Ok(new { ok = true, name, size });
    }

    /// <summary>手动触发截止提醒（调用存储过程 sp_overdue_notice）。</summary>
    [HttpPost("tasks/overdue-notice")]
    [Perm("/service/param")]
    [RoleOnly("系主任", "系统管理员")]
    public async Task<IActionResult> TriggerOverdueNotice()
    {
        var before = await db.MessageSet.CountAsync();
        await db.Database.ExecuteSqlRawAsync("CALL sp_overdue_notice()");
        var after = await db.MessageSet.CountAsync();
        await log.WriteAsync("新增", "信息服务与系统维护", $"执行截止提醒，新增 {after - before} 条消息");
        return Ok(new { ok = true, created = after - before });
    }

    // ---------------- 文件上传 ----------------
    /// <summary>材料上传：保存到 uploads/{课题编号}/ 下，返回相对路径供 submit 接口使用。</summary>
    [HttpPost("upload")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string projectNo)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "请选择要上传的文件" });
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".pdf" or ".doc" or ".docx" or ".zip"))
            return BadRequest(new { error = "只允许上传 pdf、doc、docx、zip 格式的文件" });
        if (file.Length > 20 * 1024 * 1024)
            return BadRequest(new { error = "文件大小不能超过 20 MB" });

        var safeDir = string.Join("", (projectNo.Blank() ? "common" : projectNo)
            .Where(char.IsLetterOrDigit));
        var dir = Path.Combine(UploadPaths.Root, safeDir);
        Directory.CreateDirectory(dir);
        // 保留原始文件名（剔除路径非法字符），重名时追加序号，避免覆盖
        var stem = string.Concat(Path.GetFileNameWithoutExtension(file.FileName)
            .Where(c => !char.IsControl(c) && !Path.GetInvalidFileNameChars().Contains(c)));
        if (string.IsNullOrWhiteSpace(stem)) stem = "材料";
        if (stem.Length > 60) stem = stem[..60];
        var full = Path.Combine(dir, stem + ext);
        var n = 1;
        while (System.IO.File.Exists(full))
            full = Path.Combine(dir, $"{stem}({n++}){ext}");

        await using (var fs = System.IO.File.Create(full))
            await file.CopyToAsync(fs);

        var rel = $"/uploads/{safeDir}/{Path.GetFileName(full)}";
        return Ok(new { ok = true, path = rel, fileName = file.FileName, size = file.Length / 1024 });
    }

    /// <summary>材料下载：按库中存储的相对路径取文件，供前端以下载/预览方式打开。
    /// 允许匿名：链接会在新标签页打开，无法附带 JWT 头；文件路径本身即访问凭证。</summary>
    [HttpGet("files/download")]
    [AllowAnonymous]
    public IActionResult Download([FromQuery] string path, [FromQuery] bool dl = false)
    {
        var full = UploadPaths.ResolvePhysical(path);
        if (full is null || !System.IO.File.Exists(full))
            return NotFound(new { error = "文件不存在或已被清理" });
        var name = Path.GetFileName(full);
        var ext = Path.GetExtension(full).ToLowerInvariant();

        // PDF / 图片 / 文本在浏览器内联预览，其余作为附件下载；dl=1 时强制下载
        var (contentType, inline) = ext switch
        {
            ".pdf" => ("application/pdf", true),
            ".png" => ("image/png", true),
            ".jpg" or ".jpeg" => ("image/jpeg", true),
            ".gif" => ("image/gif", true),
            ".webp" => ("image/webp", true),
            ".svg" => ("image/svg+xml", true),
            ".txt" => ("text/plain", true),
            ".doc" => ("application/msword", false),
            ".docx" => ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", false),
            ".xls" => ("application/vnd.ms-excel", false),
            ".xlsx" => ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", false),
            ".zip" => ("application/zip", false),
            ".rar" => ("application/x-rar-compressed", false),
            _ => ("application/octet-stream", false),
        };
        // Content-Disposition 的 filename 仅允许 ASCII，非 ASCII 名用 filename* 兜底
        var ascii = new string(name.Select(c => c < 128 ? c : '_').ToArray());
        var mode = !dl && inline ? "inline" : "attachment";
        Response.Headers["Content-Disposition"] =
            $"{mode}; filename=\"{ascii}\"; filename*=UTF-8''{Uri.EscapeDataString(name)}";
        return PhysicalFile(full, contentType);
    }
}
