"""把 Models/Tables.cs 与 Models/Views.cs 按业务域拆成子目录、每实体一个文件，
同时依据 information_schema 为每个 string / decimal 属性补上 [MaxLength] / [Precision]，
消除"字符串长度不受限可能出现性能问题"的隐患。

用法：python split_models.py
"""
import pathlib
import re
import subprocess

ROOT = pathlib.Path(r"C:\Users\32854\Desktop\university\毕业设计管理系统\web\back\Models")
MYSQL = r"C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe"

DOMAIN_TITLE = {
    "Organization": "组织与人员",
    "Security": "用户与权限",
    "Topic": "课题与选题",
    "Process": "过程管理",
    "Score": "成绩与答辩",
    "Service": "通知与服务",
}

TABLE_DOMAIN = {
    "department": "Organization", "major": "Organization", "class_info": "Organization",
    "student": "Organization", "teacher": "Organization",
    "sys_user": "Security", "sys_role": "Security", "sys_permission": "Security",
    "sys_user_role": "Security", "sys_role_permission": "Security", "operation_log": "Security",
    "topic": "Topic", "topic_major": "Topic", "topic_selection": "Topic", "project": "Topic",
    "stage": "Process", "stage_node": "Process", "task_book": "Process", "submission": "Process",
    "review": "Process", "extension_request": "Process",
    "score": "Score", "defense_group": "Score", "defense_arrange": "Score", "defense_score": "Score",
    "notice": "Service", "message": "Service", "sys_param": "Service",
}

VIEW_DOMAIN = {
    "VstudentInfo": "Organization", "VuserAccount": "Security",
    "VtopicPool": "Topic", "VtopicSelectionStat": "Topic",
    "VstageProgress": "Process", "VoverdueList": "Process", "VmaterialReview": "Process",
    "VblindReview": "Process", "VtaskBook": "Process",
    "VscoreReport": "Score", "VscoreStat": "Score", "VdefenseSchedule": "Score",
    "Vnotice": "Service", "VteacherWorkload": "Service",
}


# ---------------------------------------------------------------- 读库元数据
def load_columns():
    sql = (
        "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, "
        "IFNULL(CHARACTER_MAXIMUM_LENGTH,0), IFNULL(NUMERIC_PRECISION,0), IFNULL(NUMERIC_SCALE,0) "
        "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='graddb'"
    )
    out = subprocess.run(
        [MYSQL, "-uroot", "-p12345", "--batch", "--raw",
         "--default-character-set=utf8mb4", "-e", sql],
        capture_output=True, text=True, encoding="utf-8",
    )
    if out.returncode != 0:
        raise SystemExit("读取 information_schema 失败：" + out.stderr)
    meta = {}
    for line in out.stdout.strip().splitlines()[1:]:
        t, c, dt, clen, prec, scale = line.split("\t")
        meta[(t, c)] = (dt, int(clen), int(prec), int(scale))
    return meta


META = load_columns()

PROP_RE = re.compile(r"^\s*public (string\??|decimal\??) (\w+) \{ get; set; \}")
COL_RE = re.compile(r'^\s*\[Column\("([^"]+)"\)\]$')
TXT = ("text", "tinytext", "mediumtext", "longtext")


def split_blocks(text):
    parts = re.split(r"(?m)^(?=/// <summary>)", text)
    return [p for p in parts[1:] if p.strip()]


def annotate(block: str, entity: str) -> str:
    """为块内字符串/小数属性补 MaxLength / Precision / TypeName（就地插入，不重复添加）"""
    lines = block.splitlines()
    i = 0
    while i < len(lines):
        m = PROP_RE.match(lines[i])
        if not m:
            i += 1
            continue
        prop = m.group(2)
        col_idx = None
        for j in range(i - 1, max(-1, i - 5), -1):
            if COL_RE.match(lines[j]):
                col_idx = j
                break
        if col_idx is None:
            print(f"  ! {entity}.{prop} 未找到 [Column]，跳过")
            i += 1
            continue
        col = COL_RE.match(lines[col_idx]).group(1)
        info = META.get((entity, col))
        if info is None:
            print(f"  ! {entity}.{col} 不在 information_schema，跳过")
            i += 1
            continue

        # 紧随 [Column] 之后已经注解过就跳过
        nxt = lines[col_idx + 1] if col_idx + 1 < len(lines) else ""
        if re.match(r"^\s*\[(MaxLength|Precision)\(", nxt) or "TypeName" in lines[col_idx]:
            i += 1
            continue

        data_type, clen, prec, scale = info
        indent = re.match(r"^(\s*)", lines[col_idx]).group(1)
        if data_type in TXT:
            # TEXT 族没有长度上限，把存储类型并入既有的 [Column] 特性（ColumnAttribute 不允许重复）
            lines[col_idx] = f'{indent}[Column("{col}", TypeName = "{data_type}")]'
            i = col_idx + 2
            continue
        if data_type == "decimal" and prec:
            # 小数精确类型直接写进 [Column]，避免 decimal 精度被静默截断
            lines[col_idx] = f'{indent}[Column("{col}", TypeName = "decimal({prec},{scale})")]'
            i = col_idx + 2
            continue
        if data_type in ("varchar", "char") and clen:
            attr = f"[MaxLength({clen})]"
        else:
            i += 1
            continue
        lines.insert(col_idx + 1, indent + attr)
        i = col_idx + 3
    return "\n".join(lines) + "\n"


HEADER = """// 业务域：{title}（{domain}）
// 对应{kind}：{entity}　·　字段与报告第 5.2 节关系模式一一对应
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;{extra}

namespace back.Models;

"""


def write(domain: str, cls: str, entity: str, block: str, kind: str):
    d = ROOT / domain
    d.mkdir(parents=True, exist_ok=True)
    extra = "\nusing Microsoft.EntityFrameworkCore;" if kind == "视图" else ""
    body = annotate(block.rstrip() + "\n", entity)
    head = HEADER.format(title=DOMAIN_TITLE[domain], domain=domain,
                         kind=kind, entity=entity, extra=extra)
    (d / f"{cls}.cs").write_text(head + body, encoding="utf-8")


# ---------------------------------------------------------------- 主流程
def handle(filename: str, kind: str, domain_map: dict):
    path = ROOT / filename
    if not path.exists():
        return 0
    count = 0
    for blk in split_blocks(path.read_text(encoding="utf-8")):
        m_cls = re.search(r"public class (\w+)", blk)
        m_tab = re.search(r'\[Table\("([^"]+)"\)\]', blk)
        if not m_cls or not m_tab:
            print("  跳过块：", blk[:50].replace("\n", " "))
            continue
        cls, entity = m_cls.group(1), m_tab.group(1)
        domain = domain_map.get(entity) or domain_map.get(cls)
        if not domain:
            print("  未分域：", cls)
            continue
        write(domain, cls, entity, blk, kind)
        count += 1
    path.unlink()
    return count


n_t = handle("Tables.cs", "表", TABLE_DOMAIN)
n_v = handle("Views.cs", "视图", VIEW_DOMAIN)
print(f"拆分完成：表 {n_t} 个，视图 {n_v} 个，输出目录 {ROOT}")
