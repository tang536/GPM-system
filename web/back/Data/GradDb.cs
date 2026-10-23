using back.Models;
using Microsoft.EntityFrameworkCore;

namespace back.Data;

/// <summary>系统数据库上下文，对应报告第 4 章的 28 个关系模式与 14 个视图。</summary>
public class GradDb : DbContext
{
    public GradDb(DbContextOptions<GradDb> options) : base(options) { }

    public DbSet<ClassInfo> ClassInfoSet => Set<ClassInfo>();
    public DbSet<DefenseArrange> DefenseArrangeSet => Set<DefenseArrange>();
    public DbSet<DefenseGroup> DefenseGroupSet => Set<DefenseGroup>();
    public DbSet<DefenseScore> DefenseScoreSet => Set<DefenseScore>();
    public DbSet<Department> DepartmentSet => Set<Department>();
    public DbSet<ExtensionRequest> ExtensionRequestSet => Set<ExtensionRequest>();
    public DbSet<Major> MajorSet => Set<Major>();
    public DbSet<Message> MessageSet => Set<Message>();
    public DbSet<Notice> NoticeSet => Set<Notice>();
    public DbSet<OperationLog> OperationLogSet => Set<OperationLog>();
    public DbSet<Project> ProjectSet => Set<Project>();
    public DbSet<Review> ReviewSet => Set<Review>();
    public DbSet<Score> ScoreSet => Set<Score>();
    public DbSet<Stage> StageSet => Set<Stage>();
    public DbSet<StageNode> StageNodeSet => Set<StageNode>();
    public DbSet<Student> StudentSet => Set<Student>();
    public DbSet<Submission> SubmissionSet => Set<Submission>();
    public DbSet<SysParam> SysParamSet => Set<SysParam>();
    public DbSet<SysPermission> SysPermissionSet => Set<SysPermission>();
    public DbSet<SysRole> SysRoleSet => Set<SysRole>();
    public DbSet<SysRolePermission> SysRolePermissionSet => Set<SysRolePermission>();
    public DbSet<SysUser> SysUserSet => Set<SysUser>();
    public DbSet<SysUserRole> SysUserRoleSet => Set<SysUserRole>();
    public DbSet<TaskBook> TaskBookSet => Set<TaskBook>();
    public DbSet<Teacher> TeacherSet => Set<Teacher>();
    public DbSet<Topic> TopicSet => Set<Topic>();
    public DbSet<TopicMajor> TopicMajorSet => Set<TopicMajor>();
    public DbSet<TopicSelection> TopicSelectionSet => Set<TopicSelection>();

    public DbSet<VblindReview> VblindReviewSet => Set<VblindReview>();
    public DbSet<VdefenseSchedule> VdefenseScheduleSet => Set<VdefenseSchedule>();
    public DbSet<VmaterialReview> VmaterialReviewSet => Set<VmaterialReview>();
    public DbSet<Vnotice> VnoticeSet => Set<Vnotice>();
    public DbSet<VoverdueList> VoverdueListSet => Set<VoverdueList>();
    public DbSet<VscoreReport> VscoreReportSet => Set<VscoreReport>();
    public DbSet<VscoreStat> VscoreStatSet => Set<VscoreStat>();
    public DbSet<VstageProgress> VstageProgressSet => Set<VstageProgress>();
    public DbSet<VstudentInfo> VstudentInfoSet => Set<VstudentInfo>();
    public DbSet<VtaskBook> VtaskBookSet => Set<VtaskBook>();
    public DbSet<VteacherWorkload> VteacherWorkloadSet => Set<VteacherWorkload>();
    public DbSet<VtopicPool> VtopicPoolSet => Set<VtopicPool>();
    public DbSet<VtopicSelectionStat> VtopicSelectionStatSet => Set<VtopicSelectionStat>();
    public DbSet<VuserAccount> VuserAccountSet => Set<VuserAccount>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // 视图为只读对象，显式声明以视图方式映射
        mb.Entity<VblindReview>().ToView("v_blind_review").HasNoKey();
        mb.Entity<VdefenseSchedule>().ToView("v_defense_schedule").HasNoKey();
        mb.Entity<VmaterialReview>().ToView("v_material_review").HasNoKey();
        mb.Entity<Vnotice>().ToView("v_notice").HasNoKey();
        mb.Entity<VoverdueList>().ToView("v_overdue_list").HasNoKey();
        mb.Entity<VscoreReport>().ToView("v_score_report").HasNoKey();
        mb.Entity<VscoreStat>().ToView("v_score_stat").HasNoKey();
        mb.Entity<VstageProgress>().ToView("v_stage_progress").HasNoKey();
        mb.Entity<VstudentInfo>().ToView("v_student_info").HasNoKey();
        mb.Entity<VtaskBook>().ToView("v_task_book").HasNoKey();
        mb.Entity<VteacherWorkload>().ToView("v_teacher_workload").HasNoKey();
        mb.Entity<VtopicPool>().ToView("v_topic_pool").HasNoKey();
        mb.Entity<VtopicSelectionStat>().ToView("v_topic_selection_stat").HasNoKey();
        mb.Entity<VuserAccount>().ToView("v_user_account").HasNoKey();

        // 复合主键（多对多联系转换而来的 3 个关联关系）
        mb.Entity<SysUserRole>().HasKey(e => new { e.UserId, e.RoleId });
        mb.Entity<SysRolePermission>().HasKey(e => new { e.RoleId, e.PermId });
        mb.Entity<TopicMajor>().HasKey(e => new { e.TopicNo, e.MajorCode });
    }
}