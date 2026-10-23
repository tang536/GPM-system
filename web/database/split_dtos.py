"""把各控制器内联的 record DTO 抽取到 DTOs/ 目录，按模块分组。"""
import pathlib
import re

root = pathlib.Path(r"C:\Users\32854\Desktop\university\毕业设计管理系统\web\back")
ctrl_dir = root / "Controllers"
dto_dir = root / "DTOs"
dto_dir.mkdir(exist_ok=True)

groups = {
    "AuthController.cs": ("AuthDtos", "登录与口令"),
    "BaseDataController.cs": ("BaseDataDtos", "院系/专业/班级"),
    "UserController.cs": ("UserDtos", "账号与角色"),
    "TopicController.cs": ("TopicDtos", "题目与选题"),
    "ProcessController.cs": ("ProcessDtos", "过程管理"),
    "ScoreController.cs": ("ScoreDtos", "成绩与答辩"),
    "ServiceController.cs": ("ServiceDtos", "信息服务与维护"),
}


def extract_records(text):
    """抽取 public record 定义（支持跨行），返回 (records, 去掉记录后的文本)"""
    out, kept, i = [], [], 0
    marker = "public record "
    while True:
        j = text.find(marker, i)
        if j == -1:
            kept.append(text[i:])
            break
        # 找到该行行首，便于整行删除
        line_start = text.rfind("\n", 0, j) + 1
        # 从 j 开始扫描到括号深度归零后的分号
        k = text.find("(", j)
        depth = 0
        while k < len(text):
            if text[k] == "(":
                depth += 1
            elif text[k] == ")":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        semi = text.find(";", k)
        rec = text[j:semi + 1].strip()
        out.append(rec)
        kept.append(text[i:line_start])
        # 跳过记录后紧跟的空行
        nxt = semi + 1
        while nxt < len(text) and text[nxt] in "\r\n":
            nxt += 1
        i = nxt
    return out, "".join(kept)


for fname, (dto_name, title) in groups.items():
    p = ctrl_dir / fname
    text = p.read_text(encoding="utf-8")
    records, rest = extract_records(text)
    if not records:
        print(f"跳过 {fname}：无内联 record")
        continue
    body = "\n\n".join(r.replace("\n    ", "\n") for r in records)
    dto = (
        "namespace back.DTOs;\n\n"
        f"// {title}相关请求/响应模型（自控制器内联记录抽取，独立成层）\n\n"
        + body + "\n"
    )
    (dto_dir / f"{dto_name}.cs").write_text(dto, encoding="utf-8")

    # 清理空行
    rest = re.sub(r"\n{3,}", "\n\n", rest)
    if "using back.DTOs;" not in rest:
        rest = rest.replace("using back.Services;", "using back.DTOs;\nusing back.Services;", 1)
        if "using back.DTOs;" not in rest:
            rest = rest.replace("using back.Data;", "using back.Data;\nusing back.DTOs;", 1)
    p.write_text(rest, encoding="utf-8")
    print(f"{fname}: 抽出 {len(records)} 个 DTO -> DTOs/{dto_name}.cs")
