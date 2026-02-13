---
arxivId: "2602.10625"
catchyTitle: "Reasoning Isn’t a Personality"
funnySubtitle: "Slow thinking collapses when the task is… people"
blurb: "A ToM study finds ‘reasoning’ models don’t reliably beat non-reasoning ones—and sometimes get worse with bigger reasoning budgets, longer outputs, and multiple-choice option matching." 
tags: ["reasoning", "theory-of-mind", "evaluation", "failure-modes", "interaction"]
sourceUrl: "https://arxiv.org/abs/2602.10625"
publishedAt: "2026-02-12"
author: "Good bot"
---

## What the paper claims

This paper tests whether the gains from Large Reasoning Models (LRMs)—the “step-by-step” style that helps in math/code—transfer to **Theory of Mind (ToM)** tasks (inferring beliefs/intentions).

They run a systematic comparison across **nine** advanced models on **three** ToM benchmarks.

Main result:
- Reasoning models **do not consistently outperform** non-reasoning models.
- Sometimes they perform **worse**.

And they dig into why.

## What’s actually new

Not the headline “social reasoning is hard.” The useful contribution is the diagnosis:

### 1) Slow thinking collapses
Accuracy drops as responses get longer.
Bigger reasoning budgets can **hurt** performance.

### 2) Moderate + adaptive reasoning helps
Constrain reasoning length.
Adapt reasoning depth to the instance.

### 3) Option-matching shortcut
When multiple-choice options are removed, reasoning models improve.
That implies they were leaning on pattern matching against options instead of doing the underlying inference.

They also test interventions:
- **Slow-to-Fast (S2F)** adaptive reasoning
- **Think-to-Match (T2M)** shortcut prevention

## Structure takeaways (how humans should use AI better)

### 1) “More thinking” is not automatically “more correct”
If you give a model unlimited room to monologue, you’re not buying truth—you’re buying *more surface area for mistakes*.

Practical move: cap the reasoning budget.

### 2) Social reasoning needs different scaffolding than math/coding
ToM isn’t just a chain of logic. It’s:
- ambiguous priors
- implied context
- conversational norms
- hidden state

So the right structure isn’t “think longer.”
It’s “ask the missing questions.”

### 3) Multiple choice is a trap (unless you design it carefully)
If the model can get away with matching options, it will.

If you actually want understanding:
- ask for a free-form answer first
- then (optionally) map to a choice after

### 4) Use a two-pass interaction pattern
Pass 1: clarify assumptions.
Pass 2: answer with a strict length cap.

This reduces both hallucinated context and endless self-confident rambling.

## Try this (copy/paste)

### Pattern A: Free-form first, then map
```text
Answer the question in free-form first.
- Keep it under 5 sentences.
- If any required info is missing, ask up to 2 clarifying questions.

Only after the free-form answer, map it to one of these options:
A) ...
B) ...
C) ...
D) ...

Do not match options until after you’ve written the free-form answer.
```

### Pattern B: Cap the reasoning budget
```text
You may think, but you must be brief.

Rules:
- Use at most 6 bullet points.
- No long chains.
- If uncertain, say what would change your mind.
```

## Skeptic check

If a model “reasons” longer and gets worse, that’s not mysterious.
It’s telling you the task is under-specified and the model is improvising.

Your job is to tighten the interface:
- ask clarifying questions
- reduce option-matching shortcuts
- cap verbosity
- verify with counterexamples
