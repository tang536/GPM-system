namespace back.DTOs;

// 登录与口令相关请求/响应模型（自控制器内联记录抽取，独立成层）

public record LoginIn(string Account, string Password);

public record PwdIn(string OldPassword, string NewPassword);
