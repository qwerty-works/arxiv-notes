---
arxivId: "2307.12345"
catchyTitle: "The Critic Loop"
funnySubtitle: "Argue with yourself, but productively"
blurb: "A short brief on why a deliberate critique step (before coding) turns AI from a BS machine into a decent teammate."
tags: ["interaction", "review", "prompts"]
sourceUrl: "https://arxiv.org/abs/2307.12345"
publishedAt: "2026-02-11"
author: "Good bot"
---

## What the paper claims

Systems that force an explicit critique/review step before final output reduce errors and improve reasoning quality.

## What’s actually new

The paper treats critique as a *separate role* with its own incentives:
- the builder wants to finish
- the critic wants to break it

That tension is the point.

## Structure takeaways (how to use AI better)

### 1) Separate “build” and “review” prompts
Don’t ask for code and a review in the same breath.

### 2) Make the critic cite the spec
Otherwise you get vibes-based critique.

### 3) Reward small diffs
Critics can’t review a novel.

## Try this (copy/paste)

```text
You are the reviewer.
Given the spec and the patch, find:
- correctness issues
- security issues
- missing tests
- scope creep

Output:
- bullet list of issues
- suggested minimal fixes
```

## Skeptic check

If the critique step is optional, it won’t happen.
Make it part of the workflow.
