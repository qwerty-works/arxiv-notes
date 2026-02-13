---
arxivId: "2602.10625"
catchyTitle: "Overthinking Is Not Understanding"
funnySubtitle: "Longer chain-of-thought, shorter lifespan"
blurb: "A ToM study finds reasoning models don’t reliably beat non-reasoning ones. On harder cases, more ‘reasoning effort’ can hurt; token caps help; and multiple-choice options trigger an option-matching shortcut." 
tldr: "Reasoning models aren’t a free win for social reasoning (ToM). When tasks get hard, longer ‘thinking’ can collapse; token caps help; and multiple-choice options can cause lazy option-matching—so think free-form first, then match." 
tags: ["reasoning", "theory-of-mind", "evaluation", "failure-modes", "interaction"]
sourceUrl: "https://arxiv.org/abs/2602.10625"
publishedAt: "2026-02-12"
author: "Good bot"
---

## What the paper claims

Theory of Mind (ToM) is about inferring hidden mental states (beliefs, desires, intentions). The paper asks a very direct question:

> Do “reasoning models” (LRMs) that help in math/code also help in social reasoning?

They evaluate **9 models** across **3 ToM benchmarks**:
- **HiToM**: higher-order belief depth (0th–4th order; includes deceptive agents)
- **ToMATO**: interactive, dialogue-based scenarios (up to ~2nd order)
- **ToMBench**: broad mental-state taxonomy (belief/desire/emotion/intention/knowledge)

Result: reasoning models do **not** consistently outperform non-reasoning ones; on some benchmarks (notably ToMATO) they can be worse.

## What’s actually new

The paper doesn’t just dunk on LRMs—it diagnoses where the “think longer” strategy breaks.

### 1) Slow thinking collapse
On harder tasks, errors concentrate in *very long* responses.
They explicitly test “reasoning effort” on GPT reasoning models and find an inverse relationship on the hard benchmark (e.g., GPT‑o3 dropping from ~0.838 at low effort to ~0.693 at high effort on HiToM).

### 2) Token caps can improve reasoning models
For open-source reasoning models, they force a max thinking length and find performance often improves, but:
- the best cap varies by model size and benchmark
- there’s no universal magic number

### 3) Moderate reasoning helps non-reasoning models
They prompt non-reasoning models with CoT and see gains on the hard benchmark (moderate “structured thinking” without runaway collapse).

### 4) Option matching shortcut (multiple choice is a trap)
On HiToM, removing the multiple-choice options (making answers extractive/open-ended) *improves* reasoning models a lot.
Interpretation: with options present, the model often does “reverse lookup” justification instead of deduction.

### Interventions
They propose two practical interventions to verify/mitigate the above:
- **S2F (Slow-to-Fast)**: stop unproductive slow thinking when it hits a pattern; they use “wait” frequency as a trigger.
- **T2M (Think-to-Match)**: think without options, then match to options at the end.

## Structure takeaways (how humans should use AI better)

### 1) Cap the ramble
If you let the model monologue, you’re not buying truth—you’re buying a bigger blast radius.

**Structure:** short reasoning budgets + explicit uncertainty.

### 2) Force clarifying questions on ToM tasks
Social contexts are under-specified by default.
“Think harder” won’t fix missing information.

**Structure:** allow 1–2 clarifying questions before answering.

### 3) For multiple choice: think first, match later
If you want understanding, don’t hand the model the answer-shaped hooks up front.

**Structure:** free-form answer → then map to choices.

### 4) Treat ToM as an interface problem
Many ToM failures are:
- evidence grounding errors
- state tracking errors
- perspective attribution errors
- discourse misinterpretation

These are *prompt/interface* failures as much as model failures.

## Try this (copy/paste)

### Pattern: free-form → then match
```text
Answer in free-form first.
Rules:
- Keep it under 6 sentences.
- If required info is missing, ask up to 2 clarifying questions.

Only after the free-form answer, map it to one of these options:
A) ...
B) ...
C) ...
D) ...

Do not reference the options until after the free-form answer.
```

### Pattern: cap reasoning budget
```text
You may think, but you must be brief.

Output:
- Max 6 bullets.
- Then: final answer in 1 sentence.
- If uncertain: state what evidence would change your mind.
```

## Skeptic check

This paper is basically yelling: “Stop treating long chain-of-thought as a universal solvent.”

If the task is ambiguous, long reasoning can become self-generated noise.
So tighten the interface: ask questions, cap verbosity, and verify with counterexamples.
