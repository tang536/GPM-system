namespace back.DTOs;

// 信息服务与维护相关请求/响应模型（自控制器内联记录抽取，独立成层）

// 发布范围支持多选：Scopes 为多选值（优先），Scope 保留兼容旧单值调用
public record NoticeIn(string Title, string Content, string NoticeType, string? Scope, bool IsTop, List<string>? Scopes = null);

public record ParamIn(string ParamValue);

public record WeightsIn(decimal Process, decimal Review, decimal Defense);
