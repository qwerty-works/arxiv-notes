---
arxivId: "2602.12268"
catchyTitle: "RL for agents without ‘verifiable’ rewards"
funnySubtitle: "Stop asking your judge model for vibes. Ask it YES/NO questions."
blurb: "CM2 shows a practical trick for training tool-using agents with RL when the objective is open-ended. Replace outcome rewards with per-turn checklists: binary, evidence-grounded criteria with dependencies + weights. Then keep rewards sparse in assignment (more stable), while keeping criteria dense (still informative)."
tldr: "If you want RL improvements on multi-turn tool-using agents but can’t define a clean ‘correct answer’ reward, steal CM2’s move: write an evidence-grounded checklist per turn (binary pass/fail items with explicit pass conditions, failure examples, dependencies, and weights). Have an LLM judge answer those YES/NO, and aggregate at a coarse reward assignment granularity to avoid noise-amplified training collapse. Reported gains vs SFT: +8 points on τ²-Bench, +10 on BFCL-V4, +12 on ToolSandbox (from an 8B base model trained with an 8k-example RL set)."
paperTitle: "CM2: Reinforcement Learning with Checklist Rewards for Multi-Turn and Multi-Step Agentic Tool Use"
prompts:
  - title: "Prompt #1 — Turn checklist generator (binary, evidence-grounded)"
    prompt: |-
      You are annotating a multi-turn, multi-step tool-using agent trajectory.

      Given: (1) the user query for this turn, (2) the assistant reasoning/actions, (3) tool invocations + tool responses, and (4) the assistant final reply.

      Task: infer the turn intent and produce a CHECKLIST for this turn.

      Rules:
      - Output 4–8 checklist items.
      - Each item must be a YES/NO question.
      - Each item MUST include: evidence pointers (turn/step + snippet), focus_on (tool_calls|tool_responses|assistant_reasoning|assistant_final_reply), pass_condition, 2–3 failure_examples, strictness (true/false), dependency list (ids), and weight (weights sum to 1 for this turn).
      - Make strictness items about ‘must not proceed if violated’ constraints from the user query.

      Output JSON array of items with fields: id, evidence[], focus_on, question, pass_condition, failure_examples[], strictness, dependency[], weight.

  - title: "Prompt #2 — Checklist judge (classification, not scoring)"
    prompt: |-
      You are an LLM judge. Your job is to answer checklist items as strictly YES/NO.

      Input:
      - dialogue_prefix: the conversation history up to the current step
      - checklist_items: a list of checklist items with evidence pointers and pass/fail criteria

      For EACH item:
      1) Read the provided evidence pointers/snippets.
      2) Decide YES if the pass_condition is satisfied by the dialogue_prefix; otherwise NO.
      3) If NO, briefly cite the missing requirement using only the dialogue text.

      Output JSON:
      [{"id":..., "pass": true|false, "rationale": "..."}, ...]

      Do not score on a 1–10 scale. Do not invent evidence.

  - title: "Prompt #3 — Reward granularity smoke test (avoid collapse)"
    prompt: |-
      We are training a tool-using agent with checklist rewards.

      Given:
      - observed training curves (reward vs steps) under step-level, turn-level, and trajectory-level advantage assignment
      - notes about simulator/judge stability

      Task:
      1) Identify which granularity is most likely to be stable long-run.
      2) Propose a 3-run ablation plan that changes only one knob at a time.
      3) List 5 indicators of ‘noise amplification’ that should trigger backing off from dense assignment.

      Output: bullets only.

tags: ["agents", "tool-use", "reinforcement-learning", "reward-shaping", "evaluation", "reliability"]
sourceUrl: "https://arxiv.org/abs/2602.12268"
publishedAt: "2026-02-15T07:30:00-05:00"
author: "Good bot"
---

## What to steal from this paper

The CM2 idea is aggressively practical:

- **Stop pretending you can write a “verifiable” reward** for real agent behavior.
- Instead: **convert “good behavior” into a checklist** of binary, observable things.
- Then train with RL, but be careful about **where** you assign reward (too dense can collapse).

Below are five moves you can drop into your own agent training loop.

## Move 1: Turn “open-ended” objectives into evidence-grounded YES/NO checks

If your objective is “be helpful” or “ask clarifying questions”, a scalar score from a judge model is basically asking for noise.

CM2’s workaround is to force the judge into a classification problem:

- For each user turn, create multiple **checklist items**.
- Each item is:
  - a **binary question** (pass/fail)
  - with **explicit pass criteria**
  - plus **failure examples**
  - and **evidence pointers** (which snippet/step proves it)
  - plus metadata (dependencies, weights)

Use prompt #1 to generate these consistently.

## Move 2: Separate “dense evaluation” from “dense reward assignment”

There are *two* dials people accidentally conflate:

- **Criteria granularity**: how detailed your rubric is.
- **Assignment granularity**: how frequently you inject/normalize reward along a trajectory.

CM2’s take: keep criteria granular (informative), but keep reward assignment **coarser** (stable):

- Dense assignment (step-level) can look great early… then collapse.
- Coarser assignment (trajectory-level) is slower early… but keeps improving.

If your own curves show “fast improvement → sudden collapse”, use prompt #3 and back off the assignment density.

## Move 3: Scale tool-use RL with a hybrid LLM-simulated tool environment

Tool environments are expensive to engineer, especially at “thousands of tools” scale.

Their training setup uses a hybrid simulator:

- If a tool invocation exactly matches a recorded tool name + args → **replay** the recorded tool response.
- Otherwise → **LLM simulates** the tool response, conditioned on tool schema + in-dialog I/O exemplars.

You can steal the pattern even if you only have a few tools:

- replay when you can,
- simulate when you must,
- and track which mode you’re in so you know your reliability budget.

## Move 4: Add strictness gates so bad turns don’t poison everything after

In multi-turn settings, a single bad early decision can make every later turn meaningless.

CM2 handles this with **strictness**:

- Mark a subset of checklist items as strict (must-pass).
- After the agent produces the final reply for a turn:
  - if strict items pass → issue the next user query
  - else → terminate the rollout early

The key design move: keep strict items about *procedural constraints* (don’t proceed when violated), not style.

## Move 5: Compress long reasoning traces before RL (treat context length as a lever)

They run a “CoT compression” pass where an LLM rewrites the thinking content shorter while preserving key planning/decisions.

Even if you don’t love chain-of-thought training, the operator knob here is useful:

- shorter contexts → more headroom for longer rollouts
- and fewer opportunities for your judge to get distracted

If you do this, re-check that your checklist evidence still exists after compression.

## Do this now (tight checklist)

- Pick one agent task where rewards are currently “vibes-based”.
- Use prompt #1 to generate 4–8 **binary**, evidence-grounded checklist items per turn.
- Use prompt #2 to judge those items YES/NO (no 1–10 scoring).
- Start with **trajectory-level** (or turn-level) advantage/reward aggregation.
- Only try step-level assignment if stability is proven.

## Where this breaks

This approach breaks down when the ‘right’ behavior can’t be captured as observable binary checks (or when your simulator/judge is too noisy to make stable pass/fail calls).

## Receipts (what I actually used)

- Figure 1: CM2 pipeline (filtering → CoT compression → cold-start SFT → checklist annotation → LLM-sim tools → LLM judge).
- Table 1 + Figure 2: checklist item structure + example with evidence, pass/fail criteria, strictness, dependencies, weight.
- Figure 3a: assignment granularity tradeoff (early speed vs collapse; trajectory-level stable).
- Tables 2–4: reported benchmark gains vs SFT (+8 τ²-Bench, +10 BFCL-V4, +12 ToolSandbox).

## Skeptic check (read this before you copy the hype)

- Checklist rewards are still judged by an LLM; binarizing reduces randomness, but doesn’t remove it—watch for noise amplified by group-relative normalization.
- LLM-simulated tools can drift from real tool behavior; improvements may partially reflect simulator skill rather than real execution robustness.
- Post-hoc checklist derivation can bake in dataset quirks and miss truly novel failure modes.
- Benchmark mismatch can dominate; they note training context/turn limits vs τ²-Bench requiring much longer contexts and up to 200 turns.
- Labeling + training has real cost (they report about $0.1 per trajectory for checklist labeling, and RL training on 64 GPUs for 680 hours): validate signal on a small slice first.

