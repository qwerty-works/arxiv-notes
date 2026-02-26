---
arxivId: "2602.21814"
catchyTitle: "Force the goal first"
funnySubtitle: "Stop adding context. Start ordering thoughts."
blurb: "If your agent keeps missing an implicit prerequisite, don’t reach for more retrieved context first. Make the model write an explicit goal (Task) before it recommends an action. In a small variable-isolation study on the ‘car wash’ trick question, a STAR scaffold (Situation→Task→Action→Result) moved first-pass accuracy from 0% to 85%, while profile-style physical context alone only reached 30%."
tldr: "When an LLM answers a practical question with a ‘distance heuristic’ and misses the hidden prerequisite, add a goal-articulation step (e.g., STAR’s ‘Task’) before you add more facts. Then evaluate with 20+ stochastic repeats and track both first-pass accuracy and ‘recovery’ after a challenge prompt—structured reasoning can make wrong answers harder to unwind."
paperTitle: "Prompt Architecture Determines Reasoning Quality: A Variable Isolation Study on the Car Wash Problem"
prompts:
  - title: "Goal-first STAR scaffold for ‘hidden prerequisite’ questions"
    prompt: |-
      You are an assistant that answers practical questions.

      Before recommending an action, you MUST write:
      1) Situation: restate the user’s situation in 1 sentence.
      2) Task (goal): a single sentence that names the primary objective AND the key object that must reach the destination (if any).
      3) Constraints: list 1–3 implicit prerequisites you must satisfy for the Task to be achievable.
      4) Recommendation: choose ONE action and justify it in 2–4 bullets.

      Guardrail: If the Task sentence does not explicitly mention the required object (e.g., ‘the car’ for a car wash), stop and rewrite the Task until it does.

      Now answer the user question.
  - title: "Step-targeted self-correction (fix the Task, not the whole answer)"
    prompt: |-
      You previously answered this question and may have missed an implicit prerequisite.

      Do NOT rewrite the whole response.
      1) Rewrite ONLY the Task (goal) line so it includes the missing prerequisite/object.
      2) Recompute the recommendation from scratch using the corrected Task.
      3) Output only: Corrected Task + Final recommendation (one paragraph).
  - title: "Ablation harness: measure which prompt layer actually helps"
    prompt: |-
      Design an experiment to test prompt-layer contributions.

      Given:
      - a base user question
      - a role/persona prompt
      - a Goal-first scaffold
      - a profile context snippet
      - an optional RAG snippet

      Output:
      - 4–6 conditions that isolate each layer (baseline, role-only, scaffold-only, profile-only, scaffold+profile, full stack)
      - decoding settings to use (include temperature)
      - what to log (first-pass correctness, recovery after a challenge prompt, median latency)
      - how many repeats per condition (>=20)
      - an intent-based scoring approach (how to avoid ‘mentions both’ false ambiguity).
tags: ["prompting", "reasoning", "evaluation", "agents"]
sourceUrl: "https://arxiv.org/abs/2602.21814"
publishedAt: "2026-02-26T07:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Force a one-sentence goal statement before any recommendation, and audit that goal for the *missing prerequisite*.

If your assistant keeps giving “reasonable” answers that ignore a hidden prerequisite, change the generation order: **make it write the goal first**.

- Add a required **Task/Goal** line (STAR-style or your own schema).
- Add a guardrail: the Task must name the object that must be present (e.g., *the car*, *the file*, *the credential*), not just the user.
- Metric: run 20 stochastic repeats; track **% of runs where the Task names the right object** and **% correct final answers**. If those don’t move together, your scaffold isn’t binding.

Receipt: Table 1 shows Role+STAR reaching **85% (17/20)** first-pass accuracy versus **0%** baseline.

### Move 2: Treat “add more context” as a *second* move; first ask whether you’ve made the model *use* what it already has.

When you see a failure mode that looks like a shortcut (“100 meters → walk”), don’t immediately add RAG or a giant profile blob.

- Decision rule: if the model’s answer is dominated by a single salient cue (distance, price, politeness), try a **Goal → Constraints → Action** scaffold before retrieval.
- Operator move: if you do add context, attach it to the goal step (e.g., “Given: the car is parked in the driveway”) so it’s hard to skip.
- Metric: do a quick ablation table (baseline vs scaffold vs profile vs scaffold+profile) and keep only layers with measurable lift.

Receipt: Table 1 reports profile-style physical context alone at **30% (6/20)**, below STAR’s **85%**.

### Move 3: Add a “rewrite ONLY the Task” correction path, because structured wrong answers can get sticky.

Structured reasoning can increase accuracy *and* make failures harder to unwind: the model has already committed to a coherent story.

- Operator move: when a user challenges an answer, don’t ask for “reconsider”; ask the model to **rewrite only the Task**, then recompute.
- Pitfall + guardrail: if you request a full rewrite, the model may defend the earlier structure; step-targeted correction forces a new anchor.
- Metric: log **recovery rate** separately from first-pass (among failures, % that flip after a challenge).

Receipt: Table 1’s “Recovery” column + Section 5.3 describe a “recovery paradox” where structured conditions had lower recovery on failures.

### Move 4: Run prompt-layer ablations like you’d debug a production system: one change at a time, with repeats.

If you have a multi-layer stack (role + scaffold + profile + RAG), you can’t guess what’s doing the work—measure it.

- Operator moves:
  - Freeze model/version and decoding settings.
  - Use **temperature > 0** so you measure reliability, not one lucky sample.
  - Track **median latency** as a cost metric.
- Decision rule: only keep a layer if it improves pass rate *or* reduces variance *at acceptable latency*.

Receipt: Table 3 attributes marginal lift to layers (STAR +85pp; profile +10pp on top of STAR; RAG +5pp on top).

### Move 5: Build a small “implicit prerequisite” regression suite so you don’t overfit to the meme.

Don’t ship a scaffold because it fixes one viral question; prove it generalizes in your domain.

- Operator move: write 10–30 items where the correct answer requires an unspoken prerequisite (object must be present; access must be granted; artifact must exist).
- Pitfall + guardrail: if you can’t auto-score, you’ll fool yourself—start with items you can score with regex/unit tests/tool checks.
- Metric: track average pass rate + confidence intervals across the suite; require improvement before rollout.

## Do this now (checklist)

- Add a required **Task/Goal** line and a guardrail that it names the required object.
- Add a **Constraints** step that explicitly lists hidden prerequisites before the recommendation.
- Add a step-targeted correction path: **“rewrite ONLY the Task, then recompute.”**
- Run 20+ repeats per condition; log **first-pass**, **recovery**, and **median latency**.
- Build a 10–30 item “implicit prerequisite” regression suite and gate changes on it.

## Where this breaks

If your assistant must be maximally “helpful” in follow-ups, heavy scaffolds can backfire: a well-structured wrong answer can become harder to correct without a step-targeted repair prompt.

## Skeptic check (before you copy this)

- Did you confirm the failure is a *generation-order* problem (heuristic shortcut) rather than missing knowledge? If it’s missing knowledge, retrieval may be the right first move.
- Are you measuring reliability (repeats at temperature > 0) or telling yourself a story from one run?
- Does your scoring measure intent, or does it miscount answers that discuss both options? Strip markdown and score dominance, not keywords.
- If latency matters, did you track the cost of scaffolds? (The paper reports STAR adding substantial latency relative to baseline.)

## Receipts

- Table 1: baseline/role-only **0%**; Role+STAR **85%**; Role+Profile **30%**; Role+STAR+Profile **95%**; full stack **100%**.
- Table 2: median latency rises from ~**4.6s** baseline to ~**7.9s** with STAR; full stack ~**8.3s**.
- Table 3: marginal lift decomposition: **STAR +85pp**, **profile +10pp** (on top of STAR), **RAG +5pp** (on top of STAR+profile).
- Table 4: summary progression shows “profile alone” is not a substitute for a reasoning scaffold.
