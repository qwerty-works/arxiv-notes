#!/usr/bin/env python3
"""Build a public-safe context.json for an arXiv paper.

Usage:
  python3 scripts/build_paper_context.py 2512.14982

Outputs:
  public/paper-context/<arxivId>/context.json

Notes:
- This is intended for *server-side* / publish-time usage (cron or local dev).
- Client never fetches arXiv directly; it only loads the generated context.json.
"""

import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ARXIV_RE = re.compile(r"^\d{4}\.\d{5}$")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "arxiv-notes-context-builder/1.0"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def strip_tags(s: str) -> str:
    return re.sub(r"<.*?>", "", s, flags=re.S)


def parse_abs_html(html: str):
    title = ""
    abstract = ""

    mt = re.search(
        r'<h1 class="title mathjax">\s*<span class="descriptor">Title:</span>\s*(.*?)\s*</h1>',
        html,
        re.S,
    )
    if mt:
        title = strip_tags(mt.group(1)).strip()

    ma = re.search(
        r'<blockquote class="abstract mathjax">\s*<span class="descriptor">Abstract:</span>(.*?)</blockquote>',
        html,
        re.S,
    )
    if ma:
        abstract = strip_tags(ma.group(1)).strip()

    return title, abstract


def pdftotext(pdf_path: Path) -> str:
    # Prefer system pdftotext
    try:
        out = subprocess.check_output([
            "pdftotext",
            "-layout",
            str(pdf_path),
            "-",
        ])
        return out.decode("utf-8", errors="ignore")
    except Exception as e:
        raise RuntimeError(f"pdftotext failed: {e}")


def chunk_text(text: str, max_chars: int = 900):
    text = re.sub(r"\n{3,}", "\n\n", text)
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    acc = ""
    idx = 0
    for p in paras:
        if len(acc) + len(p) + 2 <= max_chars:
            acc = (acc + "\n\n" + p).strip()
        else:
            if acc:
                chunks.append((idx, acc))
                idx += 1
            acc = p[:max_chars]
    if acc:
        chunks.append((idx, acc))

    return chunks


def figure_caption_lines(pdf_txt: str, max_lines: int = 25):
    out = []
    for line in pdf_txt.splitlines():
        ln = line.strip()
        if re.match(r"^(Figure|Table)\s*\d+\s*:\s+", ln):
            out.append(ln)
            if len(out) >= max_lines:
                break
    return out


def main():
    if len(sys.argv) != 2:
        print("usage: build_paper_context.py <arxivId>", file=sys.stderr)
        return 2

    arxiv_id = sys.argv[1].strip()
    if not ARXIV_RE.match(arxiv_id):
        print("Invalid arXiv id (expected NNNN.NNNNN)", file=sys.stderr)
        return 2

    repo_root = Path(__file__).resolve().parents[1]
    out_dir = repo_root / "public" / "paper-context" / arxiv_id
    out_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix=f"arxiv-notes-{arxiv_id}-") as td:
        td = Path(td)
        abs_url = f"https://arxiv.org/abs/{arxiv_id}"
        pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

        abs_html = fetch(abs_url).decode("utf-8", errors="ignore")
        paper_title, abstract = parse_abs_html(abs_html)

        pdf_path = td / "paper.pdf"
        pdf_path.write_bytes(fetch(pdf_url))

        pdf_txt = pdftotext(pdf_path)

        chunks = []
        # abstract chunk
        if abstract:
            chunks.append({"id": "abs-0", "type": "abstract", "text": abstract})

        # captions
        for i, ln in enumerate(figure_caption_lines(pdf_txt)):
            chunks.append({"id": f"cap-{i}", "type": "caption", "text": ln})

        # body chunks
        for i, ch in chunk_text(pdf_txt):
            chunks.append({"id": f"b-{i}", "type": "body", "text": ch})

        payload = {
            "arxivId": arxiv_id,
            "paperTitle": paper_title,
            "abstract": abstract,
            "chunks": chunks,
        }

        # Guardrail: keep payload reasonably sized
        raw = json.dumps(payload, ensure_ascii=False, indent=2)
        if len(raw.encode("utf-8")) > 200_000:
            # Trim body chunks down to fit
            payload["chunks"] = payload["chunks"][:1 + 25 + 35]  # abs + captions + some body
            raw = json.dumps(payload, ensure_ascii=False, indent=2)

        (out_dir / "context.json").write_text(raw, encoding="utf-8")

    print(f"Wrote {out_dir/'context.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
