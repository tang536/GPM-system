"""端到端接口冒烟测试：逐角色登录，访问全部只读接口，输出状态码矩阵。"""
import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:5132"


def call(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read().decode("utf-8", "replace")
            try:
                return r.status, json.loads(raw)
            except json.JSONDecodeError:
                return r.status, raw[:200]
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw[:200]
    except Exception as e:  # noqa: BLE001
        return -1, str(e)


ACCOUNTS = [
    ("admin", "系统管理员"),
    ("liangzy", "系主任"),
    ("huangmin", "指导教师"),
    ("202101010001", "毕业生"),
]

GETS = [
    ("/api/auth/me", "当前用户"),
    ("/api/departments", "院系"),
    ("/api/majors", "专业"),
    ("/api/classes", "班级"),
    ("/api/cohorts", "年级"),
    ("/api/users", "账号"),
    ("/api/students", "学生名单"),
    ("/api/teachers", "教师名单"),
    ("/api/roles", "角色"),
    ("/api/permissions", "权限"),
    ("/api/logs", "操作日志"),
    ("/api/topics", "题目"),
    ("/api/topics/pool", "题目库"),
    ("/api/topics/stat", "选题统计"),
    ("/api/selections", "选题志愿"),
    ("/api/projects", "课题"),
    ("/api/stages", "阶段节点"),
    ("/api/taskbooks", "任务书"),
    ("/api/submissions", "材料提交"),
    ("/api/extensions", "延期申请"),
    ("/api/progress", "进度跟踪"),
    ("/api/overdue", "逾期名单"),
    ("/api/scores", "成绩"),
    ("/api/score-stat", "成绩分布"),
    ("/api/defense-dims", "答辩维度"),
    ("/api/defense-groups", "答辩分组"),
    ("/api/defense-arranges", "答辩安排"),
    ("/api/notices", "公告"),
    ("/api/messages", "消息"),
    ("/api/messages/unread", "未读数"),
    ("/api/stats/overview", "总览统计"),
    ("/api/stats/progress", "进度统计"),
    ("/api/stats/dept", "院系统计"),
    ("/api/stats/workload", "工作量统计"),
    ("/api/params", "系统参数"),
    ("/api/backups", "备份列表"),
]

tokens = {}
print(f"{'接口':<14}{'路径':<28}" + "".join(f"{n:<12}" for _, n in ACCOUNTS))
rows = []
for acc, label in ACCOUNTS:
    st, res = call("POST", "/api/auth/login", body={"account": acc, "password": "123456"})
    if st != 200:
        print(f"登录失败 {acc}: {st} {res}")
        tokens[acc] = None
    else:
        tokens[acc] = res["token"]

bad = []
for path, name in GETS:
    line = f"{name:<14}{path:<28}"
    for acc, label in ACCOUNTS:
        st, res = call("GET", path, tokens[acc])
        mark = "200" if st == 200 else str(st)
        line += f"{mark:<12}"
        if st not in (200, 403):
            bad.append((path, acc, st, res))
    print(line)

print()
if bad:
    print("!! 异常响应")
    for path, acc, st, res in bad:
        print(f"  {path} [{acc}] -> {st}: {str(res)[:300]}")
else:
    print("全部接口返回 200 或预期的 403")

# 数据量抽样
st, me = call("GET", "/api/stats/overview", tokens["admin"])
print("\nadmin overview:", json.dumps(me, ensure_ascii=False)[:500])
st, sc = call("GET", "/api/scores", tokens["admin"])
print("成绩条数:", len(sc) if isinstance(sc, list) else sc)
if isinstance(sc, list) and sc:
    print("首条:", json.dumps(sc[0], ensure_ascii=False))
