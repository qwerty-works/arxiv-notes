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

# Raw HTML in posts: ban high-risk tags/attrs (XSS / tracking / embedding)
HTML_BAN_PATTERNS = [
    r"(?i)<\s*script\b",
    r"(?i)<\s*iframe\b",
    r"(?i)<\s*object\b",
    r"(?i)<\s*embed\b",
    r"(?i)<\s*link\b",
    r"(?i)<\s*meta\b",
    r"(?i)onerror\s*=",
    r"(?i)onload\s*=",
]

# Frontmatter constraints
SOURCEURL_RE = re.compile(r"^sourceUrl:\s*\"([^\"]+)\"\s*$", re.M)
ALLOWED_SOURCE_HOSTS = {"arxiv.org"}


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


def lint_one(path: Path) -> list[str]:
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

    # Frontmatter: sourceUrl must be arxiv.org (avoid tracking/redirect schemes)
    m = SOURCEURL_RE.search(md)
    if not m:
        errors.append("Missing sourceUrl frontmatter")
    else:
        src = m.group(1)
        host = urlparse(src).netloc.lower().split(":")[0]
        if host not in ALLOWED_SOURCE_HOSTS:
            errors.append(f"Disallowed sourceUrl host: {src}")

    # Raw HTML ban
    for pat in HTML_BAN_PATTERNS:
        if re.search(pat, md):
            errors.append(f"Disallowed raw HTML / attribute detected (pattern: {pat})")

    # Duplicate TL;DR section: frontmatter already provides tldr and the template renders it.
    # We never want a second TL;DR heading in the body.
    if re.search(r"(?m)^##\s+TL;DR\b", md):
        errors.append("Duplicate TL;DR heading found in body (remove the '## TL;DR' section; frontmatter tldr is rendered by the template)")

    # Copy/paste prompts are rendered from frontmatter by the template.
    # Do not duplicate them inside the markdown body.
    if re.search(r"(?m)^##\s+Copy/paste prompts\b", md):
        errors.append("Duplicate Copy/paste prompts section found in body (remove the '## Copy/paste prompts' section; prompts render from frontmatter)")

    # Outbound links allowlist
    for url in find_links(md):
        if not host_ok(url):
            errors.append(f"Disallowed outbound link host: {url}")

    return errors


def main(argv: list[str]) -> int:
    # Modes:
    #  - single file: python3 scripts/security_lint.py path/to/post.md
    #  - all posts (default): python3 scripts/security_lint.py
    targets: list[Path] = []

    if len(argv) == 1:
        root = Path("src/content/papers")
        targets = []
        for p in root.glob("*/**/*.md"):
            # Only lint actual paper posts: src/content/papers/<arxivId>/*.md
            # (Skip _meta, templates, notes, etc.)
            if p.parts[-3] != "papers":
                continue
            arxiv_dir = p.parts[-2]
            if re.fullmatch(r"\d{4}\.\d{5}", arxiv_dir):
                targets.append(p)
        targets = sorted(targets)
        if not targets:
            print("ERROR: no posts found under src/content/papers", file=sys.stderr)
            return 2
    elif len(argv) == 2:
        targets = [Path(argv[1])]
    else:
        print("Usage: python3 scripts/security_lint.py [path/to/post.md]", file=sys.stderr)
        return 2

    all_errors: list[str] = []
    for path in targets:
        if not path.exists():
            all_errors.append(f"ERROR: file not found: {path}")
            continue
        errs = lint_one(path)
        if errs:
            all_errors.append(str(path))
            all_errors.extend([f"  - {e}" for e in errs])

    if all_errors:
        print("SECURITY_LINT_FAILED", file=sys.stderr)
        for e in all_errors:
            print(e, file=sys.stderr)
        return 2

    print("SECURITY_LINT_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
