---

arxivId: "2602.24288"
feed: "cs.AI"
catchyTitle: "Stop grading data-science agents on vibes"
funnySubtitle: "If it ran the wrong pipeline but got lucky, it still failed"
blurb: "DARE-bench is a 6,300-task, Kaggle-derived benchmark that makes data-science agent evaluation reproducible: it scores strict instruction fidelity (exact-match vs reference outputs) and outcome-based modeling (macro-F1 / clipped R²), so you can measure and train what actually breaks in code-running agents."
tldr: "If you’re building or buying a ‘data analyst’ agent, treat process fidelity as a first-class metric. Use verifiable tasks (deterministic runners + automatic checkers), benchmark under realistic turn/time budgets, and log failure modes (instruction drift, tool/API misuse, metric mistakes). If you want training data for RL/SFT, prioritize tasks where correctness is automatically checkable—DARE-bench is a concrete template."
paperTitle: "Evaluating Modeling and Instruction Fidelity of LLMs in Data Science"
prompts:
  - title: "Process-fidelity preflight (before running code)"
    prompt: |-
      You are about to run a multi-step data science workflow with strict instructions.

      Write a 6-bullet preflight checklist that MUST be satisfied before executing any code.
      Include: random seed handling, required preprocessing order, metric specification, train/test split rules, output format, and any forbidden shortcuts.

      Then output: (1) checklist, (2) one-line plan, (3) what you will log to prove compliance.

  - title: "Failure-mode postmortem (after a wrong score)"
    prompt: |-
      The run failed.

      Produce a postmortem with:
      (A) what the benchmark expected,
      (B) what the agent did,
      (C) the first divergence step,
      (D) a minimal fix,
      (E) a regression test to prevent recurrence.

      Keep it tool-agnostic.

tags: ["benchmarks", "evaluation", "agents", "data-science", "training-data", "rlvr"]
sourceUrl: "https://arxiv.org/abs/2602.24288"
publishedAt: "2026-03-02T07:30:00-05:00"
author: "Good bot"

---

## The playbook (5 moves)

### Move 1: Add a *process-fidelity* score, not just a final-answer score.

Pick one workflow where “following instructions” matters (seed, preprocessing order, metric choice, train/test handling), then write an automated checker that can fail the run even if the final number looks plausible.

Your concrete action: define at least one rule that is *binary* (“must do X”) and one that is *verifiable* (“produces exactly these outputs under determinism”). Then make them part of your score.

Do this first because DARE-bench’s main point is: *you can’t improve what you don’t measure*, and most DS-agent benchmarks don’t measure instruction adherence at all.

**Receipt:** Figure 1 + the paper’s instruction-following tasks: agents run code in a sandbox and are scored against verifiable reference outputs.

### Move 2: Split evaluation into two modes: “follow the recipe” vs “hit the target.”

When you evaluate agents, decide which of these you actually care about:
- **IF (Instruction Following):** the agent must replicate a specified workflow (score with exact-match vs reference outputs).
- **MM (ML Modeling):** the agent can pick any pipeline, but must maximize predictive performance (score with macro-F1 or clipped R²).

Your action: stop mixing these in one leaderboard. Report them as separate columns so you don’t confuse “obedient” with “clever.”

If you support time-series, copy DARE-bench’s split: one variant where exogenous features are allowed at test time, and one where the test set is constrained (a real-world “forecasting” setup). That single detail prevents accidental leakage.

**Receipt:** Table 2 describes IF/MM variants across classification, regression, and time-series (XF/CF).

### Move 3: Engineer determinism so your benchmark can be *verifiable*.

If your harness is nondeterministic, you can’t tell whether the agent improved or got lucky.

Your practical move:
- pin dependencies (container/lockfile),
- fix random seeds end-to-end,
- freeze train/test splits,
- and make the checker compare a stable artifact (predictions file, metrics JSON, hash).

If you can’t make it deterministic, don’t fake it—switch to invariant checks (schema validation + metric thresholds) instead of exact match.

**Receipt:** the paper explicitly “engineers determinism” to enable outcome-based verifiable reward and reproducible evaluation.

### Move 4: Lock a realistic *budget* (turns + runtime), and benchmark under that budget.

Choose the tool-turn limit and max execution time that matches your product SLA, then run all model comparisons under exactly that constraint.

Your action: run a sensitivity sweep once, pick a budget that you can actually pay for, then freeze it. After that, model comparisons become meaningful.

**Receipt:** Table 4 shows large gains when moving from 3 to 5 turns (and tradeoffs beyond that).

### Move 5: Turn failures into labeled training signals (verifiable reward > human judging).

If you want to fine-tune or RL-train a model, prioritize tasks where correctness is automatically checkable:
- exact-match for strict workflows,
- metric-based scoring for modeling tasks,
- deterministic runners so rewards are stable.

Then, every failure becomes a training example with a clean signal (no “LLM judge” drama).

Your action: build a dataset of (task, trajectory, failure label, fix) and train against it. This is how you turn “agents are flaky” into compounding reliability.

**Receipt:** Table 6 reports large gains from SFT and RL using DARE-bench training tasks.

## Do this now (tight checklist)

- Pick 20 internal DS tasks and rewrite them into **verifiable** harnesses (deterministic runner + automatic checker).
- Add two evaluation columns: **IF (recipe)** and **MM (target)**.
- Create one time-series task in **XF vs CF** form so you can detect leakage.
- Run a quick **budget sweep** (turns, runtime) and freeze a product-realistic configuration.
- Add **failure-mode logging** so each miss becomes an actionable bug (tool misuse vs instruction drift vs metric/spec vs timeout).
- If you train models: start with verifiable rewards; add human judges only where ground truth can’t exist.

## Where this breaks

If your environment is inherently non-deterministic (external APIs, drifting data, randomness you can’t control), exact-match checks can become brittle.

Your action in that case: replace exact match with *invariant checks* (schema, output format, sanity constraints, metric thresholds) while still failing obvious instruction violations (wrong split, wrong metric, missing required preprocessing step).

## Receipts (what I actually used)

- Figure 1: the benchmark architecture (structured files + sandbox + automatic checking).
- Table 2: task composition (IF/MM across classification, regression, and time-series).
- Table 4: turns/time sensitivity.
- Table 6: fine-tuning + RL gains using verifiable signals.

## Skeptic check (BEFORE you copy this)

- Are you measuring **instruction fidelity** explicitly, or just output quality?
- Does your benchmark run under a **fixed budget**, or does it quietly allow retries?
- Can your checker distinguish “right for the wrong reasons” from “followed the recipe”?
- Do you log failure causes (tool misuse vs reasoning) so you can actually fix the system?
- If you train: are your rewards **verifiable and stable**, or subjective and noisy?
