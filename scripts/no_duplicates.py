#!/usr/bin/env python3
"""no_duplicates.py

Fail the build if we accidentally create duplicate posts.

Rules (current):
- Exactly ONE post per arXiv ID across src/content/papers/**.md

Why: Astro content collections can silently overwrite duplicates; we want CI to
catch it before deploy.

Usage:
  python3 scripts/no_duplicates.py

Exit codes:
  0 ok
  2 duplicates found
"""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAPERS = ROOT / "src" / "content" / "papers"


def main() -> int:
    if not PAPERS.exists():
        print(f"ERROR: missing papers dir: {PAPERS}", file=sys.stderr)
        return 2

    seen: dict[str, list[Path]] = {}

    for md in sorted(PAPERS.glob("**/*.md")):
        # skip internal meta docs
        if "_meta" in md.parts:
            continue

        # Expect path like src/content/papers/<arxivId>/<slug>.md
        try:
            arxiv_id = md.parts[md.parts.index("papers") + 1]
        except Exception:
            continue

        seen.setdefault(arxiv_id, []).append(md)

    dupes = {k: v for (k, v) in seen.items() if len(v) > 1}
    if dupes:
        print("DUPLICATE_POSTS_FOUND", file=sys.stderr)
        for arxiv_id, paths in sorted(dupes.items()):
            print(f"- {arxiv_id} has {len(paths)} posts:", file=sys.stderr)
            for p in paths:
                print(f"    - {p.relative_to(ROOT)}", file=sys.stderr)
        return 2

    print("NO_DUPLICATES_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
