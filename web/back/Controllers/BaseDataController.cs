using back.Authorization;
using back.Data;
using back.Models;
using back.DTOs;
using back.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace back.Controllers;

/// <summary>模块一：基础数据管理（院系、专业、班级、届别），报告 3.1 节。</summary>
[ApiController]
[Route("api")]
[Authorize]
public class BaseDataController(GradDb db, LogService log) : ControllerBase
{
    // ---------------- 院系 ----------------
    [HttpGet("departments")]
    public async Task<IActionResult> GetDepts([FromQuery] string? kw)
    {
        var q = db.DepartmentSet.AsQueryable();
        if (!kw.Blank()) q = q.Where(d => d.DeptName.Contains(kw!) || d.DeptNo.Contains(kw!));
        var rows = await q.OrderBy(d => d.DeptNo).Select(d => new
        {
            deptNo = d.DeptNo,
            deptName = d.DeptName,
            leader = d.Leader,
            office = d.Office,
            phone = d.Phone,
            majorCount = db.MajorSet.Count(m => m.DeptNo == d.DeptNo),
            teacherCount = db.TeacherSet.Count(t => t.DeptNo == d.DeptNo),
        }).ToListAsync();
        return Ok(rows);
    }

    [HttpPost("departments")]
    [Perm("/base/dept")]
    public async Task<IActionResult> AddDept([FromBody] DeptIn i)
    {
        if (i.DeptNo.Blank() || i.DeptName.Blank()) return BadRequest(new { error = "院系编号与名称不能为空" });
        db.DepartmentSet.Add(new Department
        {
            DeptNo = i.DeptNo.Trim(), DeptName = i.DeptName.Trim(),
            Leader = i.Leader, Office = i.Office, Phone = i.Phone
        });
        await db.SaveChangesAsync();
        await log.WriteAsync("新增", "基础数据管理", $"新增院系 {i.DeptNo} {i.DeptName}");
        return Ok(new { ok = true });
    }

    [HttpPut("departments/{no}")]
    [Perm("/base/dept")]
    public async Task<IActionResult> UpdateDept(string no, [FromBody] DeptIn i)
    {
        var d = await db.DepartmentSet.FindAsync(no);
        if (d is null) return NotFound(new { error = "院系不存在" });
        d.DeptName = i.DeptName.Trim(); d.Leader = i.Leader; d.Office = i.Office; d.Phone = i.Phone;
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "基础数据管理", $"修改院系 {no}");
        return Ok(new { ok = true });
    }

    [HttpDelete("departments/{no}")]
    [Perm("/base/dept")]
    public async Task<IActionResult> DeleteDept(string no)
    {
        var d = await db.DepartmentSet.FindAsync(no);
        if (d is null) return NotFound(new { error = "院系不存在" });
        db.DepartmentSet.Remove(d);
        await db.SaveChangesAsync();
        await log.WriteAsync("删除", "基础数据管理", $"删除院系 {no}");
        return Ok(new { ok = true });
    }

    // ---------------- 专业 ----------------
    [HttpGet("majors")]
    public async Task<IActionResult> GetMajors([FromQuery] string? kw, [FromQuery] string? deptNo)
    {
        var q = db.MajorSet.AsQueryable();
        if (!kw.Blank()) q = q.Where(m => m.MajorName.Contains(kw!) || m.MajorCode.Contains(kw!));
        if (!deptNo.Blank()) q = q.Where(m => m.DeptNo == deptNo);
        var rows = await (from m in q
                          join d in db.DepartmentSet on m.DeptNo equals d.DeptNo
                          orderby m.MajorCode
                          select new
                          {
                              majorCode = m.MajorCode,
                              majorName = m.MajorName,
                              deptNo = m.DeptNo,
                              deptName = d.DeptName,
                              duration = m.Duration,
                              discipline = m.Discipline,
                              classCount = db.ClassInfoSet.Count(c => c.MajorCode == m.MajorCode),
                          }).ToListAsync();
        return Ok(rows);
    }

    [HttpPost("majors")]
    [Perm("/base/major")]
    public async Task<IActionResult> AddMajor([FromBody] MajorIn i)
    {
        if (i.MajorCode.Blank() || i.MajorName.Blank()) return BadRequest(new { error = "专业代码与名称不能为空" });
        db.MajorSet.Add(new Major
        {
            MajorCode = i.MajorCode.Trim(), MajorName = i.MajorName.Trim(),
            DeptNo = i.DeptNo, Duration = (sbyte)i.Duration, Discipline = i.Discipline
        });
        await db.SaveChangesAsync();
        await log.WriteAsync("新增", "基础数据管理", $"新增专业 {i.MajorCode} {i.MajorName}");
        return Ok(new { ok = true });
    }

    [HttpPut("majors/{no}")]
    [Perm("/base/major")]
    public async Task<IActionResult> UpdateMajor(string no, [FromBody] MajorIn i)
    {
        var m = await db.MajorSet.FindAsync(no);
        if (m is null) return NotFound(new { error = "专业不存在" });
        m.MajorName = i.MajorName.Trim(); m.DeptNo = i.DeptNo;
        m.Duration = (sbyte)i.Duration; m.Discipline = i.Discipline;
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "基础数据管理", $"修改专业 {no}");
        return Ok(new { ok = true });
    }

    [HttpDelete("majors/{no}")]
    [Perm("/base/major")]
    public async Task<IActionResult> DeleteMajor(string no)
    {
        var m = await db.MajorSet.FindAsync(no);
        if (m is null) return NotFound(new { error = "专业不存在" });
        db.MajorSet.Remove(m);
        await db.SaveChangesAsync();
        await log.WriteAsync("删除", "基础数据管理", $"删除专业 {no}");
        return Ok(new { ok = true });
    }

    // ---------------- 班级 ----------------
    [HttpGet("classes")]
    public async Task<IActionResult> GetClasses([FromQuery] string? kw, [FromQuery] string? majorCode)
    {
        var q = db.ClassInfoSet.AsQueryable();
        if (!kw.Blank()) q = q.Where(c => c.ClassName.Contains(kw!) || c.ClassNo.Contains(kw!));
        if (!majorCode.Blank()) q = q.Where(c => c.MajorCode == majorCode);
        var rows = await (from c in q
                          join m in db.MajorSet on c.MajorCode equals m.MajorCode
                          join d in db.DepartmentSet on m.DeptNo equals d.DeptNo
                          orderby c.ClassNo
                          select new
                          {
                              classNo = c.ClassNo,
                              className = c.ClassName,
                              majorCode = c.MajorCode,
                              majorName = m.MajorName,
                              deptName = d.DeptName,
                              grade = c.Grade,
                              studentCount = c.StudentCount,
                              headTeacher = c.HeadTeacher,
                          }).ToListAsync();
        return Ok(rows);
    }

    [HttpPost("classes")]
    [Perm("/base/class")]
    public async Task<IActionResult> AddClass([FromBody] ClassIn i)
    {
        if (i.ClassNo.Blank() || i.ClassName.Blank()) return BadRequest(new { error = "班级编号与名称不能为空" });
        db.ClassInfoSet.Add(new ClassInfo
        {
            ClassNo = i.ClassNo.Trim(), ClassName = i.ClassName.Trim(),
            MajorCode = i.MajorCode, Grade = (short)i.Grade,
            StudentCount = 0, HeadTeacher = i.HeadTeacher
        });
        await db.SaveChangesAsync();
        await log.WriteAsync("新增", "基础数据管理", $"新增班级 {i.ClassNo} {i.ClassName}");
        return Ok(new { ok = true });
    }

    [HttpPut("classes/{no}")]
    [Perm("/base/class")]
    public async Task<IActionResult> UpdateClass(string no, [FromBody] ClassIn i)
    {
        var c = await db.ClassInfoSet.FindAsync(no);
        if (c is null) return NotFound(new { error = "班级不存在" });
        c.ClassName = i.ClassName.Trim(); c.MajorCode = i.MajorCode;
        c.Grade = (short)i.Grade; c.HeadTeacher = i.HeadTeacher;
        await db.SaveChangesAsync();
        await log.WriteAsync("修改", "基础数据管理", $"修改班级 {no}");
        return Ok(new { ok = true });
    }

    [HttpDelete("classes/{no}")]
    [Perm("/base/class")]
    public async Task<IActionResult> DeleteClass(string no)
    {
        var c = await db.ClassInfoSet.FindAsync(no);
        if (c is null) return NotFound(new { error = "班级不存在" });
        db.ClassInfoSet.Remove(c);
        await db.SaveChangesAsync();
        await log.WriteAsync("删除", "基础数据管理", $"删除班级 {no}");
        return Ok(new { ok = true });
    }

    // ---------------- 届别与字典 ----------------
    /// <summary>届别列表（stage 表按 cohort 分组）。</summary>
    [HttpGet("cohorts")]
    public async Task<IActionResult> GetCohorts()
    {
        var rows = await db.StageSet.GroupBy(s => s.Cohort)
            .Select(g => new
            {
                cohort = g.Key,
                stageCount = g.Count(),
                projectCount = db.ProjectSet.Count(p => db.TopicSet.Any(t => t.TopicNo == p.TopicNo && t.Cohort == g.Key))
            })
            .OrderByDescending(x => x.cohort).ToListAsync();
        return Ok(rows);
    }
}
