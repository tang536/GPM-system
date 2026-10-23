namespace back.DTOs;

// 院系/专业/班级相关请求/响应模型（自控制器内联记录抽取，独立成层）

public record DeptIn(string DeptNo, string DeptName, string? Leader, string? Office, string? Phone);

public record MajorIn(string MajorCode, string MajorName, string DeptNo, int Duration, string? Discipline);

public record ClassIn(string ClassNo, string ClassName, string MajorCode, int Grade, string? HeadTeacher);
