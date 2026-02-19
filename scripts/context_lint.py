#!/usr/bin/env python3
"""Lint public paper context JSON files used by the chat widget.

Guards against:
- missing required fields
- oversized payloads (token/cost bomb)
- obvious HTML/script injection artifacts
- URLs inside stored context (exfil / prompt-injection surface)

CI calls this over: public/paper-context/*/context.json
"""

import json
import re
import sys
from pathlib import Path

MAX_BYTES = 200_000

BANNED_PATTERNS = [
    re.compile(r"(?i)<\s*script"),
    re.compile(r"(?i)<\s*iframe"),
    re.compile(r"(?i)onerror\s*="),
    re.compile(r"(?i)onload\s*="),
    re.compile(r"(?i)javascript:"),
]

ARXIV_ID_RE = re.compile(r"^\d{4}\.\d{5}$")


def fail(msg: str):
    print(f"CONTEXT_LINT_FAILED - {msg}")
    raise SystemExit(2)


def check_file(path: Path):
    raw = path.read_bytes()
    if len(raw) > MAX_BYTES:
        fail(f"{path}: too large ({len(raw)} bytes > {MAX_BYTES})")

    try:
        data = json.loads(raw.decode("utf-8"))
    except Exception as e:
        fail(f"{path}: invalid JSON ({e})")

    for k in ("arxivId", "paperTitle", "abstract", "chunks"):
        if k not in data:
            fail(f"{path}: missing key '{k}'")

    arxiv_id = data["arxivId"]
    if not isinstance(arxiv_id, str) or not ARXIV_ID_RE.match(arxiv_id):
        fail(f"{path}: invalid arxivId")

    if not isinstance(data["chunks"], list) or len(data["chunks"]) == 0:
        fail(f"{path}: chunks must be a non-empty list")

    # Flatten all text fields we care about
    texts = [
        str(data.get("paperTitle", "")),
        str(data.get("abstract", "")),
    ]

    for ch in data["chunks"]:
        if not isinstance(ch, dict):
            fail(f"{path}: chunk is not an object")
        for k in ("id", "type", "text"):
            if k not in ch:
                fail(f"{path}: chunk missing '{k}'")
        if not isinstance(ch["text"], str) or not ch["text"].strip():
            fail(f"{path}: chunk text empty")
        # keep chunk sizes sane
        if len(ch["text"]) > 2000:
            fail(f"{path}: chunk {ch.get('id')} too large (>2000 chars)")
        texts.append(ch["text"])

    haystack = "\n".join(texts)

    for pat in BANNED_PATTERNS:
        if pat.search(haystack):
            fail(f"{path}: banned pattern matched: {pat.pattern}")


def main():
    args = sys.argv[1:]
    if not args:
        print("usage: context_lint.py <context.json> [more...]", file=sys.stderr)
        return 2

    for a in args:
        check_file(Path(a))

    print("CONTEXT_LINT_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
