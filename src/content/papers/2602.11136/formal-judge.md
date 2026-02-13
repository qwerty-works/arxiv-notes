---
arxivId: "2602.11136"
catchyTitle: "Proof Beats Vibes"
funnySubtitle: "LLM judges are persuasive. Z3 is petty and refuses to be charmed."
blurb: "FormalJudge reframes agent oversight as compile→extract→prove: use an LLM to decompose intent into atomic constraints + Dafny specs, then let Z3 give a deterministic verdict (and actionable failures)."
tldr: "Turn ‘LLM-as-judge’ into ‘LLM-as-compiler’: extract atomic constraints + grounded facts, then let Dafny/Z3 do the actual judging. You get deterministic verdicts and actionable failure reasons instead of vibes."
paperTitle: "FormalJudge: A Neuro-Symbolic Paradigm for Agentic Oversight"
prompts:
  - title: "Make a proof-checkable checklist"
    prompt: |-
      You are helping me turn a vague requirement into a proof-checkable checklist.

      Task:
      1) Rewrite the requirement as 8–15 atomic constraints (each must be boolean-checkable).
      2) For each constraint, list what evidence would prove it from an agent trace.
      3) List 3 ambiguous points that require clarification.

      Requirement:
      <paste requirement here>

  - title: "Extract grounded facts from a trace"
    prompt: |-
      You are an extractor. Only answer with JSON.

      Given this agent trace, answer these atomic questions with true/false/unknown and a quote span:
      - Did the agent access external network? (true/false/unknown)
      - Did it write any files outside the allowed directory? (true/false/unknown)
      - Did it send any messages externally? (true/false/unknown)

      Output schema:
      {
        "q": {
          "answer": "true|false|unknown",
          "evidence": "<direct quote from trace or empty>"
        }
      }

      Trace:
      <paste trace>

  - title: "Think-to-prove (no vibes)"
    prompt: |-
      Do NOT grade holistically.

      Step 1: Propose 6–10 atomic predicates that capture the intent.
      Step 2: For each predicate, define exactly what observation would make it true/false.
      Step 3: If any predicate is not decidable from the info given, ask 1 clarifying question.

      Intent:
      <paste intent>

tags: ["oversight", "verification", "formal-methods", "agents", "safety"]
sourceUrl: "https://arxiv.org/abs/2602.11136"
publishedAt: "2026-02-12T08:00:00-05:00"
author: "Good bot"
---

## What the paper claims

Picture a courtroom.

- The usual approach is hiring a smooth-talking lawyer (**an LLM judge**) to decide whether another smooth-talking lawyer (**the agent**) behaved.
- FormalJudge replaces the lawyer with a grumpy auditor: **a solver** that only accepts **proof**.

Pipeline:
1) **Compile intent → atomic constraints** (LLM as *spec compiler*)
2) **Extract trace → grounded facts** (LLM as *fact extractor*)
3) **Prove constraints over facts** (Dafny/Z3 as the *actual judge*)

Verdicts become deterministic, and failures are explainable in the only way that matters: “constraint X failed because fact Y was present.”

## The 80% you should steal

### Tip 1 — Don’t ask for a score. Ask for failing tests.
**Bad:** “Is this safe?”

**Good:**
- “List the constraints.”
- “For each constraint: pass/fail/unknown + evidence quote.”
- “If fail: the smallest counterexample.”

If it can’t produce a failing test, you don’t have an oversight system—you have vibes.

### Tip 2 — Separate extraction from composition
One model trying to both read messy logs *and* produce a verdict will bluff.

**Do this instead:**
- Extraction: many tiny questions (true/false/unknown + quotes)
- Composition: deterministic rules (code / schema / solver)

### Tip 3 — Make conditionals explicit (IF → THEN)
The paper’s toy example is painfully real:
- “Budget $800” is easy.
- “IF flying THEN hotel must start on arrival day” is what breaks “judge vibes.”

**Your move:** write requirements as conditionals whenever possible.

### Tip 4 — Put strict tools in charge of the verdict
LLMs are creative; solvers/checkers are strict.

**Your move:**
- LLM proposes what to check
- deterministic checker decides pass/fail

### Tip 5 — Debug oversight like code
Every failure should come with:
- which constraint failed
- evidence span
- how to fix (change behavior vs change spec)

## What’s actually new (why this isn’t fluff)

- LLM used as **compiler** (NL → predicates/spec) rather than judge.
- A concrete end-to-end pipeline evaluated against judge baselines.
- Iterative refinement with solver feedback that improves outcomes.

## Do this now

- Take the last thing you asked an LLM to “judge.” Rewrite it as **10 boolean constraints**.
- Run the “Extract grounded facts” prompt on a real trace/log and force **true/false/unknown + quotes**.
- Replace your one big “score” with **one failing test** the agent must make pass.

## Skeptic check

Formal methods don’t remove ambiguity—they expose it.

If your logs don’t contain the evidence, no amount of Z3 will save you.
But the transferable lesson holds:
**make judgments test-like, evidence-backed, and composable.**
