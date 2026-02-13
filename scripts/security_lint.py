#!/usr/bin/env python3
"""security_lint.py

Fail-fast checks to reduce prompt-injection / exfil / spam risk in arxiv-notes posts.

Usage:
  python3 scripts/security_lint.py path/to/post.md

Exit codes:
  0 ok
  2 lint failed
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urlparse


ALLOW_HOSTS = {
    "arxiv.org",
    "doi.org",
    "www.doi.org",
    "github.com",
    "raw.githubusercontent.com",
    "qwerty-works.github.io",
}

# Things we never want to accidentally publish
SECRET_PATTERNS = [
    r"\bgho_[A-Za-z0-9_]{10,}\b",  # GitHub classic PAT prefix
    r"\bgithub_pat_[A-Za-z0-9_]{10,}\b",
    r"\bAKIA[0-9A-Z]{16}\b",  # AWS access key id
    r"-----BEGIN (?:OPENSSH|RSA|EC|PGP) PRIVATE KEY-----",
]

INJECTION_PATTERNS = [
    r"(?i)ignore (all|any) (previous|prior) instructions",
    r"(?i)system prompt",
    r"(?i)you are chatgpt",
    r"(?i)developer message",
    r"(?i)tool call",
    r"(?i)exfiltrate",
]


def find_links(md: str) -> list[str]:
    # markdown links: [text](url)
    links = re.findall(r"\[[^\]]*\]\((https?://[^)\s]+)\)", md)
    # bare links
    links += re.findall(r"(?<!\()\bhttps?://[^\s)\]]+", md)
    # de-dup, keep order
    seen = set()
    out = []
    for u in links:
        if u not in seen:
            out.append(u)
            seen.add(u)
    return out


def host_ok(url: str) -> bool:
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return False
    # strip port
    host = host.split(":")[0]
    return host in ALLOW_HOSTS


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: python3 scripts/security_lint.py path/to/post.md", file=sys.stderr)
        return 2

    path = Path(argv[1])
    if not path.exists():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        return 2

    md = path.read_text(encoding="utf-8")
    errors: list[str] = []

    # Secrets
    for pat in SECRET_PATTERNS:
        if re.search(pat, md):
            errors.append(f"Possible secret detected (pattern: {pat})")

    # Prompt injection markers
    for pat in INJECTION_PATTERNS:
        if re.search(pat, md):
            errors.append(f"Possible prompt-injection marker detected (pattern: {pat})")

    # Outbound links allowlist
    for url in find_links(md):
        if not host_ok(url):
            errors.append(f"Disallowed outbound link host: {url}")

    if errors:
        print("SECURITY_LINT_FAILED", file=sys.stderr)
        for e in errors:
            print(f"- {e}", file=sys.stderr)
        return 2

    print("SECURITY_LINT_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
