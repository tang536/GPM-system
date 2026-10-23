namespace back.DTOs;

// 账号与角色相关请求/响应模型（自控制器内联记录抽取，独立成层）

public record UserIn(string Account, string Password, string UserType, string? StudentNo,
                     string? TeacherNo, int[] RoleIds, string? Status);

public record UserUpd(string? Status, string? NewPassword, int[]? RoleIds);

public record RoleIn(string RoleName, string? RoleDesc, int[]? PermIds);
