"""打印各只读接口的响应字段结构，供前端 types 定义使用。"""
import json
import urllib.request

BASE = "http://127.0.0.1:5132"


def call(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


tok = call("POST", "/api/auth/login", body={"account": "admin", "password": "123456"})["token"]

PATHS = [
    "/api/auth/me", "/api/departments", "/api/majors", "/api/classes", "/api/cohorts",
    "/api/users", "/api/students", "/api/teachers", "/api/roles", "/api/permissions",
    "/api/logs?take=1", "/api/topics", "/api/topics/pool", "/api/topics/stat",
    "/api/selections", "/api/projects", "/api/stages", "/api/taskbooks", "/api/submissions",
    "/api/extensions", "/api/progress", "/api/overdue", "/api/scores", "/api/score-stat",
    "/api/defense-groups", "/api/defense-arranges", "/api/defense-dims",
    "/api/notices", "/api/messages", "/api/messages/unread", "/api/stats/overview",
    "/api/stats/progress", "/api/stats/dept", "/api/stats/workload", "/api/params",
    "/api/backups",
]

for p in PATHS:
    try:
        d = call("GET", p, tok)
    except Exception as e:  # noqa: BLE001
        print(f"{p} -> 失败 {e}")
        continue
    if isinstance(d, list):
        sample = d[0] if d else {}
        keys = list(sample.keys()) if isinstance(sample, dict) else type(sample).__name__
        print(f"{p}  [list n={len(d)}]\n    {keys}")
        if d:
            print(f"    示例: {json.dumps(sample, ensure_ascii=False)[:260]}")
    elif isinstance(d, dict):
        print(f"{p}  [obj]\n    {list(d.keys())}")
        print(f"    示例: {json.dumps(d, ensure_ascii=False)[:400]}")
    else:
        print(f"{p} -> {d}")
