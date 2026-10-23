# -*- coding: utf-8 -*-
"""为 seed.sql 中的 102 条 /uploads/... 路径生成占位 PDF 文件。
输出位置：web/back/uploads/（后端静态映射 /uploads 到此目录）。
PDF 为手工构造的最小合法文件：Helvetica 字体 + 正确 xref 偏移表。
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent          # web/database
SEED = ROOT / "seed.sql"
OUT = ROOT.parent / "back" / "uploads"

# 中文材料名 → 英文标签（PDF 正文字体仅支持 ASCII）
KIND_MAP = {
    "任务书确认单": "Task Book Confirmation",
    "开题报告": "Opening Report",
    "中期检查表": "Mid-term Inspection Form",
    "毕业论文终稿": "Final Thesis",
    "查重报告": "Plagiarism Check Report",
    "答辩申请表": "Defense Application Form",
}


def make_pdf(lines, w=595, h=842):
    content = ""
    y = h - 90
    for ln in lines:
        esc = ln.replace("(", r"\(").replace(")", r"\)").replace("\\", r"\\")
        content += f"BT /F1 11 Tf 60 {y} Td ({esc}) Tj ET\n"
        y -= 20
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {w} {h}] "
        f"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>".encode(),
        f"<< /Length {len(content.encode('latin-1'))} >>\nstream\n".encode()
        + content.encode("latin-1") + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = []
    for i, body in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_pos = len(out)
    n = len(objs) + 1
    out += f"xref\n0 {n}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {n} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF".encode()
    return bytes(out)


def main():
    sql = SEED.read_text(encoding="utf-8")
    paths = sorted(set(re.findall(r"'(/uploads/[^']+)'", sql)))
    made, skipped = 0, 0
    for p in paths:
        rel = p.lstrip("/")                     # uploads/2025.../xxx.pdf
        disk = ROOT.parent / "back" / rel
        if disk.exists():
            skipped += 1
            continue
        disk.parent.mkdir(parents=True, exist_ok=True)
        stem = disk.stem
        proj = disk.parent.name
        # PDF 正文用 Helvetica，仅支持 ASCII；中文材料名映射为英文标签
        kind = next((v for k, v in KIND_MAP.items() if k in stem), None)
        if kind is None:
            ascii_stem = "".join(c if ord(c) < 128 else "" for c in stem).strip(" _-")
            kind = ascii_stem or "material"
        ver = ""
        for token in ("v1", "v2", "v3", "v4"):
            if token in stem:
                ver = f" ({token})"
        lines = [
            "Graduation Project Management System - Demo Material",
            "",
            "This is a placeholder file generated for demo seed data.",
            f"Project No : {proj}",
            f"Material   : {kind}{ver}",
            "",
            "The original submission was never created in the demo",
            "environment; the database record references this path so",
            "that download / preview links stay functional.",
        ]
        disk.write_bytes(make_pdf(lines))
        made += 1
    print(f"路径总数 {len(paths)}：新生成 {made}，已存在跳过 {skipped}")
    print(f"输出目录：{OUT}")


if __name__ == "__main__":
    main()
