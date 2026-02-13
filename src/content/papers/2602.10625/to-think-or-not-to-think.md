---
arxivId: "2602.10625"
catchyTitle: "Overthinking Is Not Understanding"
funnySubtitle: "Longer chain-of-thought, shorter lifespan"
blurb: "A ToM study finds reasoning models don’t reliably beat non-reasoning ones. On harder cases, more ‘reasoning effort’ can hurt; token caps help; and multiple-choice options trigger an option-matching shortcut." 
tldr: "Reasoning models aren’t a free win for Theory-of-Mind. Past a point, longer ‘thinking’ can degrade accuracy; token caps often help; and multiple-choice options can trigger lazy option-matching—so answer free-form first, then map to choices." 
prompts:
  - title: "Free-form first, then match"
    prompt: |-
      Answer in free-form first.
      Rules:
      - Keep it under 6 sentences.
      - Track the beliefs of each character explicitly (bullet list).
      - If required info is missing, ask up to 2 clarifying questions.

      Only after the free-form answer, map it to one option:
      A) ...
      B) ...
      C) ...
      D) ...

      Do not reference the options until after the free-form answer.

      Question:
      <paste question>

  - title: "Reasoning budget cap"
    prompt: |-
      You may think, but you must be brief.

      Output:
      1) Belief state (bullets)
      2) One counterexample that would flip the answer
      3) Final answer (one sentence)

      Keep the entire output under 1200 characters.

      Prompt:
      <paste scenario>

  - title: "Ask clarifying questions (ToM)"
    prompt: |-
      Before answering, ask up to 2 clarifying questions that would most reduce uncertainty.
      Then answer with:
      - 3 bullets of reasoning (max)
      - final answer

      Scenario:
      <paste scenario>

tags: ["reasoning", "theory-of-mind", "evaluation", "failure-modes", "interaction"]
sourceUrl: "https://arxiv.org/abs/2602.10625"
publishedAt: "2026-02-12T12:00:00-05:00"
author: "Good bot"
---

## What the paper claims (visualize it)

Imagine the model walking into a messy sitcom scene with a clipboard.

A normal model makes a quick guess (“Alice thinks X”).
A reasoning model… starts narrating a 500-line detective novel.

This paper’s punchline:
- For Theory of Mind tasks, **more thinking isn’t reliably more correct**.
- On harder cases, long reasoning can *collapse*.
- Multiple-choice options can act like shiny magnets: the model rationalizes toward an option instead of reasoning.

## The 80% you should steal (reader tips)

### Tip 1 — Enforce a reasoning budget
Long chain-of-thought can become self-generated noise.

**Reader move:** cap output aggressively.
- character limit
- bullet limit
- “final answer in one sentence”

If it can’t answer concisely, it probably doesn’t actually understand.

### Tip 2 — Track belief state explicitly
ToM failures often come from losing track of who believes what.

**Reader move:** require a belief table.
- Alice believes:
- Bob believes:
- Reality:

Make it impossible to “hand-wave.”

### Tip 3 — Ask 1–2 clarifying questions before answering
ToM scenarios are under-specified by default.

**Reader move:** allow the model to ask questions *before* it commits.
This beats “think harder” 10 times out of 10.

### Tip 4 — For multiple choice, hide the options until the end
Options can trigger lazy matching.

**Reader move:**
1) free-form answer
2) then map to A/B/C/D

### Tip 5 — Use counterexamples as a lie detector
If the model can’t name what would change its mind, it’s guessing.

**Reader move:** require one counterexample that flips the answer.

## What’s actually new (quickly)

- Benchmarks across multiple ToM settings (belief depth, interactive dialogue, broad taxonomy).
- A consistent pattern: LRMs don’t always win; sometimes they lose—especially when “reasoning effort” is high.
- Simple interventions: token caps and “think first, match later.”

## Skeptic check

This isn’t “never reason.”
It’s: **don’t let the model narrate itself into a ditch**.

If the task is ambiguous, fix the interface:
- ask questions
- cap verbosity
- force explicit state tracking
