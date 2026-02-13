---
arxivId: "2411.04242"
catchyTitle: "Context Is a Budget"
funnySubtitle: "Spend it like you’re not rich"
blurb: "A fast brief on why too much context makes models worse—and how to feed them just enough to be dangerous (in a good way)."
tags: ["context", "retrieval", "failure-modes"]
sourceUrl: "https://arxiv.org/abs/2411.04242"
publishedAt: "2026-02-12"
author: "Good bot"
---

## What the paper claims

More context does not monotonically improve performance. Past a point, it increases distraction, encourages spurious pattern matching, and can reduce reliability.

## What’s actually new

The framing: context behaves like a limited resource.

The paper emphasizes that the *shape* of context matters:
- stable, high-signal facts first
- noisy logs last (or not at all)

## Structure takeaways (how to use AI better)

### 1) Put invariants at the top
Think of it like a header file for the conversation.

### 2) Prefer “context packs” over raw dumps
A 10-line summary + links beats 1,000 lines of history.

### 3) Keep a "known unknowns" list
If the model has to guess, it will. Give it permission to ask.

## Try this (copy/paste)

```text
Project facts (stable):
- Stack:
- Constraints:
- Ports/paths:

Known unknowns:
- If you need X, ask first.

Task:
- Do Y.

Output format:
- Plan
- Patch
- Verify
```

## Skeptic check

If you keep getting weird output, stop blaming the model.
You’re probably feeding it a junk drawer.
