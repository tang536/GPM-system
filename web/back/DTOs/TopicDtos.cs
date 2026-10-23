namespace back.DTOs;

// 题目与选题相关请求/响应模型（自控制器内联记录抽取，独立成层）

public record TopicIn(string TopicName, string TopicType, string? ResearchField, string Difficulty,
                      int Capacity, string Cohort, string[] MajorCodes);

public record AuditIn(string Status, string? Opinion);

public record SelectionIn(string TopicNo, int Preference);

public record MatchIn(string StudentNo, string TopicNo);
