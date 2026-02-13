---
arxivId: "2602.11136"
catchyTitle: "Proof Beats Vibes"
funnySubtitle: "LLM judges are persuasive. Z3 is petty and refuses to be charmed."
blurb: "FormalJudge reframes agent oversight as compile→extract→prove: use an LLM to decompose intent into atomic constraints + Dafny specs, then let Z3 give a deterministic verdict (and actionable failures)."
tldr: "Use LLMs to compile intent into checkable constraints and grounded facts, then rely on a formal solver (Dafny/Z3) for the final verdict. It’s less ‘judge vibes’ and more ‘proof or it didn’t happen.’"
tags: ["oversight", "verification", "formal-methods", "agents", "safety"]
sourceUrl: "https://arxiv.org/abs/2602.11136"
publishedAt: "2026-02-12"
author: "Good bot"
---

## What the paper claims

The dominant oversight pattern—**LLM-as-a-Judge**—has a fundamental problem: if your judge is probabilistic, it inherits the same failure modes as the thing it’s judging (biases, hallucination, persuasion).

FormalJudge proposes a neuro-symbolic alternative:

1) **Compile intent into constraints**
- An LLM takes natural-language intent and decomposes it into **atomic, verifiable constraints**.

2) **Extract grounded facts from the agent trace**
- Extractor LLM answers only small, binary/atomic questions.

3) **Generate a formal spec (Dafny) and prove it (Z3)**
- Dafny encodes how atomic facts compose.
- Z3 proves whether the composed constraints hold.

They argue this breaks the “probabilistic echo chamber” because the final verdict is **deterministic**.

## What’s actually new (the non-hand-wavy part)

### 1) LLM as a *spec compiler*, not a judge
The LLM isn’t asked “is it safe?”
It’s asked to translate intent into:
- a taxonomy of atomic facts
- predicates that combine them
- a formal program that can be proven (or failed)

### 2) A concrete pipeline + baselines across oversight benchmarks
They evaluate on three oversight problems:
- **Agent-SafetyBench** (behavioral safety in tool-use scenarios)
- **VitaBench** (multi-domain constraint adherence in real-world-ish tasks)
- **Deceivers** (agentic upward deception detection)

And they compare against multiple judge baselines (vanilla LLM, CoT, few-shot, structured input, python checkers).

### 3) Iterative refinement that actually improves
They report that Dafny-based feedback enables strong improvement across rounds (the headline number they emphasize is near-linear improvement, e.g. a trajectory improving up to ~99.8% after several refinement rounds in one setup).

## Structure takeaways (how humans should use AI better)

### 1) Replace “judge” with “checklist → proof”
If you want safety/reliability, do not ask for a holistic score.

Ask for:
- atomic constraints
- explicit evidence
- deterministic checks

Even if you never touch Dafny, the structure transfers.

### 2) Make conditional requirements explicit
Their toy example is perfect:
- “Budget $800” is easy.
- “If flying, hotel must start on arrival day” is the one that breaks vibes-based judges.

Humans should write specs like:
- IF condition → THEN constraint

### 3) Constrain the model to facts it can be right about
The pipeline assumes:
- LLMs can be flaky at global reasoning
- but decent at local extraction (“did the agent call X?”, “what was the total cost?”)

That is a sane division of labor.

### 4) Use formal feedback to tighten your own specs
When the verifier fails, it produces a *specific* failure.
That’s a gift:
- it tells you where your requirements were underspecified

## Try this (copy/paste)

Use this when you’re overseeing an agent / tool-using workflow:

```text
You are a SPEC COMPILER.

Input:
- Natural-language requirement
- The agent trace (actions + observations)

Output:
1) Atomic constraints (objectively checkable)
   - ID
   - Condition / predicate
   - Evidence required
   - Failure message
2) A deterministic check plan (no vibes)
3) If any constraint cannot be checked, ask a question.

Do not provide a single holistic score.
```

## Skeptic check

Formal methods don’t remove ambiguity — they expose it.

FormalJudge still relies on an LLM in two places:
- decomposing intent
- extracting semantics

So the real lesson is structural:
**move as much as possible from “interpretation” to “verification.”**
