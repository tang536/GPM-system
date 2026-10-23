namespace back.DTOs;

// 过程管理相关请求/响应模型（自控制器内联记录抽取，独立成层）

public record NodeIn(string StartTime, string Deadline, string AllowFormat, int MaxSize, bool AllowLate);

public record TaskIn(string ProjectNo, string DesignTask, string? TechRequirement, string? Schedule);

public record SubmitIn(string ProjectNo, int StageId, string FilePath);

public record ReviewIn(string Conclusion, string? Opinion);

public record ExtIn(string ProjectNo, int StageId, string Reason, int DelayDays);

public record ApproveIn(string Result, int? DelayDays);
