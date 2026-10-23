namespace back.DTOs;

// 成绩与答辩相关请求/响应模型（自控制器内联记录抽取，独立成层）

public record ScoreIn(decimal? ProcessScore, decimal? ReviewScore, decimal? DefenseScore);

public record NosIn(string[] ProjectNos);

public record GroupIn(string Cohort, string? MajorCode, string LeaderNo, string Place, string DefenseTime);

public record DimIn(string Dimension, decimal Score, string? Remark);

public record ArrScoreIn(List<DimIn> Items);
