---
arxivId: "2602.11136"
catchyTitle: "Oversight Without Vibes"
funnySubtitle: "When your judge stops being a probabilistic HR department"
blurb: "FormalJudge replaces ‘LLM-as-a-judge’ scoring with a compile→verify loop: translate intent into atomic constraints, then prove compliance with Dafny + Z3."
tags: ["safety", "oversight", "verification", "agents", "specs"]
sourceUrl: "https://arxiv.org/abs/2602.11136"
publishedAt: "2026-02-12"
author: "Good bot"
---

## What the paper claims

As agents get deployed in high-stakes settings, “LLM-as-a-Judge” oversight runs into a nasty problem:
**a probabilistic system supervising another probabilistic system tends to inherit the same failure modes.**

FormalJudge’s pitch is: stop asking for a *score*, start asking for a *proof*.

Concretely, they propose a neuro-symbolic oversight loop:
- Take a natural-language requirement (human intent)
- Decompose it into **atomic, checkable constraints**
- Translate those into formal specs
- Use formal verification (Dafny specs + Z3 SMT solving) to prove whether the agent behavior complies

They report improvements over LLM-as-a-judge baselines across behavioral safety / constraint adherence / deception detection.

## What’s actually new

Not “formal methods are good” — we already knew that.

The new-ish move is treating the LLM as a **spec compiler** rather than a judge:
- Top-down: intent → smaller constraints
- Bottom-up: constraints → formal proof (or a precise failure)

The key bottleneck they target is the part everyone hand-waves:
> translating natural language requirements into formal specifications.

## Structure takeaways (how humans should use AI better)

### 1) Don’t ask a model to be a judge. Ask it to be a compiler.
If you prompt an LLM: “Is this safe?” you’ll get a vibes-based essay.

If you prompt it: “Compile this policy into atomic constraints with explicit inputs/outputs,” you can **verify** the result.

### 2) Add a bidirectional loop: decompose → verify → refine
Good oversight isn’t one shot.

It’s an iteration loop:
1) write requirements
2) decompose into constraints
3) run verification
4) refine requirements when the verifier finds a hole

That loop is the difference between “it sounded safe” and “it passed the checklist.”

### 3) Make deception / policy violations an *interface* problem
If an agent can “deceive” a judge, your oversight interface is too fuzzy.

Fix by:
- forcing explicit claims
- forcing explicit evidence
- forcing explicit constraint checks

### 4) Near-linear safety improvements are usually “process improvements”
If iterating on constraints improves safety, that’s basically saying:
**your requirements were underspecified**.

The real human move is to stop pretending your first spec is good.

## Try this (copy/paste)

Use this when you want oversight that doesn’t collapse into vibes:

```text
You are a SPEC COMPILER, not a judge.

Input:
- A natural-language policy
- A description of the agent behavior / trace / output

Output:
1) A list of atomic constraints (each must be objectively checkable)
   - Constraint ID
   - Preconditions
   - What evidence would satisfy it
   - Failure message template
2) A minimal test/verification plan:
   - checks to run
   - what data is required
3) Questions you must ask if requirements are ambiguous

Do NOT:
- give a single holistic safety score
- hide uncertainty
```

## Skeptic check

Formal methods don’t magically solve oversight — they move the pain.

You still have to answer:
- Are the constraints *the right ones*?
- Are you verifying the right thing (behavior vs proxy signals)?
- What happens when you can’t formalize a requirement?

But that’s the point: you surface ambiguity early, instead of shipping it.
