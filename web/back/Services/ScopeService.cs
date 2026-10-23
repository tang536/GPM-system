using System.Security.Claims;
using back.Data;
using Microsoft.EntityFrameworkCore;

namespace back.Services;

/// <summary>
/// 数据范围：按"关系"而不是"角色"收敛可见数据（报告 3.2 节数据权限）。
/// 毕业生只看本人课题；指导教师看本人指导 + 被分派评阅 + 担任答辩组长的课题；
/// 系主任与系统管理员不受限。
/// </summary>
public sealed class ScopeService(GradDb db)
{
    /// <summary>当前身份可见的课题编号集合；返回 null 表示不限制。</summary>
    public async Task<HashSet<string>?> ProjectScopeAsync(ClaimsPrincipal u)
    {
        if (u.IsAdmin() || u.InRole("系主任")) return null;

        if (u.StudentNo() is { } sno)
        {
            var mine = await db.ProjectSet.Where(p => p.StudentNo == sno)
                .Select(p => p.ProjectNo).ToListAsync();
            return mine.ToHashSet();
        }

        if (u.TeacherNo() is { } tno)
        {
            var supervised = await db.ProjectSet.Where(p => p.TeacherNo == tno)
                .Select(p => p.ProjectNo).ToListAsync();

            var reviewed = await (from sub in db.SubmissionSet
                                  join rv in db.ReviewSet on sub.SubmissionId equals rv.SubmissionId
                                  where rv.ReviewerNo == tno
                                  select sub.ProjectNo).Distinct().ToListAsync();

            var led = await (from g in db.DefenseGroupSet
                             join a in db.DefenseArrangeSet on g.GroupId equals a.GroupId
                             where g.LeaderNo == tno
                             select a.ProjectNo).Distinct().ToListAsync();

            return supervised.Concat(reviewed).Concat(led).ToHashSet();
        }

        return new HashSet<string>();
    }

    /// <summary>
    /// 是否允许对某课题做成绩分项评定：
    /// 指导教师录过程分、评阅教师录评阅分、答辩组长录答辩分，三者互不越权。
    /// </summary>
    public async Task<(bool process, bool review, bool defense)> ScoreRightsAsync(
        ClaimsPrincipal u, string projectNo)
    {
        if (u.IsAdmin()) return (false, false, false);

        var p = await db.ProjectSet.FirstOrDefaultAsync(x => x.ProjectNo == projectNo);
        if (p is null) return (false, false, false);

        var tno = u.TeacherNo();
        var isSupervisor = tno is not null && p.TeacherNo == tno;
        var isReviewer = tno is not null && await (from sub in db.SubmissionSet
                                                   join rv in db.ReviewSet on sub.SubmissionId equals rv.SubmissionId
                                                   where sub.ProjectNo == projectNo && rv.ReviewerNo == tno
                                                   select rv.ReviewId).AnyAsync();
        var ledProject = tno is not null && await (from g in db.DefenseGroupSet
                                                   join a in db.DefenseArrangeSet on g.GroupId equals a.GroupId
                                                   where a.ProjectNo == projectNo && g.LeaderNo == tno
                                                   select a.ArrangeId).AnyAsync();
        var isDefenseLeader = ledProject || (u.InRole("系主任") && tno is not null);

        return (isSupervisor, isReviewer, isDefenseLeader);
    }
}
