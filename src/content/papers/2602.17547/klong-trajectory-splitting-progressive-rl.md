---

arxivId: "2602.17547"
feed: "cs.AI"
catchyTitle: "Stop training agents like the job ends in 200 turns"
funnySubtitle: "If it overflows context and runs for hours, you’re in a different sport."
blurb: "KLong is an open-source LLM agent trained for *extremely* long-horizon tasks (context overflow + multi-hour runs) using three operator-relevant ideas: a data factory with rubrics + blacklists, trajectory-splitting SFT (pin the early spec, overlap windows, truncate the tail), and progressive RL with staged timeouts."
tldr: "If your agent workloads exceed the context window and run for hours, don’t just ‘prompt harder.’ Treat it as an **extremely long-horizon** regime: (1) build task scaffolds with **rubrics + blacklists** (to prevent contamination), (2) SFT on ultra-long demos via **overlapped trajectory-splitting** that pins the early grounding segment, and (3) if you do RL, use **progressive timeouts** (short→long) to keep training stable. The paper reports assistant turns improving **114.90→732.70** with trajectory-splitting SFT, a **+6.67%** boost from progressive RL, and **KLong (106B)** outperforming **Kimi K2 Thinking (1T)** by **11.28%** on PaperBench."
paperTitle: "KLong: Training LLM Agent for Extremely Long-horizon Tasks"
prompts:
  - title: "Prompt #1 — Build a rubric + blacklist for an ‘extremely long-horizon’ task"
    prompt: |-
      You are designing an evaluation scaffold for an extremely long-horizon agent task.

      Input: TASK_DESCRIPTION and (optional) a list of known solution sources (official repos, blog posts).

      Output:
      1) A RUBRIC TREE (3 levels deep) that decomposes the task into 5–12 checkable leaves. Each leaf must include: (a) what to produce, (b) how to verify quickly, (c) a failure mode.
      2) An ADDENDUM section listing: what is out-of-scope, key implementation constraints, and any dataset access constraints.
      3) A BLACKLIST of URLs/domains the agent must not access (official solutions).

      Rules:
      - Prefer checks that are objective (tests pass, file exists, metric computed).
      - Include at least one check for ‘reads the spec / constraints’ and one for ‘does not access blacklist’.

      TASK_DESCRIPTION:
      {{task_description}}

      KNOWN_SOLUTION_SOURCES (optional):
      {{solution_sources}}

  - title: "Prompt #2 — Convert a long trajectory into overlapped SFT chunks"
    prompt: |-
      You are preparing supervised fine-tuning (SFT) data from an extremely long agent trajectory that exceeds the context window.

      Input: FULL_TRAJECTORY (messages + tool actions) and CONTEXT_LIMIT_TOKENS.

      Goal: Produce a chunking plan: a list of SUB_TRAJECTORIES.

      Rules (must follow):
      - Identify the EARLY_GROUNDING segment (task spec + mandatory reading/constraints). Pin it at the start of every sub-trajectory.
      - Create overlapped windows for the later part so each chunk fits CONTEXT_LIMIT_TOKENS.
      - Progressively truncate later context (the tail) rather than dropping the head.
      - For each sub-trajectory, output: start/end boundaries, overlap with neighbors, and what the model is expected to learn in that chunk.

      FULL_TRAJECTORY:
      {{trajectory}}

      CONTEXT_LIMIT_TOKENS:
      {{context_limit_tokens}}

  - title: "Prompt #3 — Design a progressive-timeout RL schedule"
    prompt: |-
      You are designing a progressive reinforcement learning (RL) schedule for an agent where full tasks can take hours.

      Input: TASKS (1–3 representative tasks) and a BASELINE_AGENT (current policy).

      Output: A multi-stage RL plan with 3–6 stages. For each stage, specify:
      - timeout per rollout
      - number of rollouts
      - success criteria to advance to next stage
      - what to log (metrics, failure categories)

      Rules:
      - Early stages must be short enough to iterate quickly.
      - Later stages must extend timeouts progressively toward real task horizons.
      - Include at least one guardrail against ‘rewarding premature stopping’.

      TASKS:
      {{tasks}}

      BASELINE_AGENT:
      {{baseline_agent}}

tags: ["agents", "long-horizon", "training", "sft", "reinforcement-learning", "evaluation"]
sourceUrl: "https://arxiv.org/abs/2602.17547"
publishedAt: "2026-02-21T15:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Separate “long-horizon” from “extremely long-horizon” (and instrument it)

**Claim:** If a task would overflow context without context management *and* includes long-running experiments, you’re in a different regime.

- **How to use it:** Track two numbers for each task: **assistant turns** and **wall-clock runtime**; use them to decide whether your current training setup is even pointed at the right target.
- **Decision rule:** If it overflows context **and** runs long, classify it as **extremely long-horizon** and plan for context overflow in training.
- **Pitfall + guardrail:** Pitfall: optimizing on short episodes and assuming it transfers; guardrail: gate “ready for production” on the actual turns/time distribution.
- **Receipt:** Figure 2 contrasts extremely long-horizon tasks (MLE-bench, PaperBench) vs long-horizon tasks (SWE-bench Verified, Terminal-Bench 2.0) as ~10× harder in time/turns.

### Move 2: Scale your training set with a “rubric factory,” not vibes

**Claim:** You can’t train for multi-hour reliability without a pipeline that emits *structured* tasks + evaluation.

- **How to use it:** Build a factory that outputs: **paper/task material → addendum/constraints → rubric tree** (use prompt #1), so every run produces checkable signals instead of narrative judging.
- **Decision rule:** If the task has public solution sources, treat **decontamination** as part of the dataset: ship a blacklist with the task.
- **Pitfall + guardrail:** Pitfall: training/evaluating on contaminated tasks and “measuring” memorization; guardrail: enforce a blacklist (official repos) at runtime.
- **Receipt:** Figure 3 describes Research-Factory: collect papers, filter, PDF→Markdown, add official GitHub to blacklist.txt, and generate rubrics/addendum.

### Move 3: Don’t throw away ultra-long demos — split them into overlapped SFT chunks

**Claim:** If your best demonstrations are too long, the fix is *not* to truncate the head; it’s to chunk intelligently.

- **How to use it:** Convert one huge trajectory into multiple training examples: **pin the early grounding segment**, then create **overlapped windows** later that fit your context limit (use prompt #2).
- **Decision rule:** If the demonstration doesn’t fit in context, split into sub-trajectories with overlap and keep the spec/reading segment at the start of every chunk.
- **Pitfall + guardrail:** Pitfall: naive truncation causing “agent amnesia” (losing constraints); guardrail: always pin the early spec/reading segment.
- **Receipt:** Figure 4 caption describes pinning + progressive truncation + overlap; the paper reports assistant turns improving **114.90 → 732.70** with trajectory-splitting SFT.

### Move 4: For RL, stage timeouts (progressive RL) so you can iterate before you wait 12 hours

**Claim:** If you train only at full horizon, you’ll move too slowly and too noisily.

- **How to use it:** Use **multi-stage RL**: start with shorter timeouts, then progressively extend them as the policy stabilizes (use prompt #3).
- **Decision rule:** If full-task completion takes hours, don’t start there — start with a shorter timeout and only extend once you can show consistent improvement.
- **Pitfall + guardrail:** Pitfall: one giant timeout that kills throughput and destabilizes learning; guardrail: progressively extended timeouts across stages.
- **Receipt:** The paper introduces progressive RL with progressively extended timeouts and reports a **+6.67%** performance improvement from it.

### Move 5: Treat scaffolding + infra as first-class training “params”

**Claim:** For extremely long-horizon runs, environment friction becomes a core failure mode.

- **How to use it:** Enforce mandatory reading/tracking, handle context-length errors, make progress parsing robust, and block premature “finish” actions; pre-install common packages so rollouts don’t die on setup.
- **Decision rule:** If you’re paying for long interactive rollouts, optimize for “time spent solving,” not “time spent recovering.”
- **Pitfall + guardrail:** Pitfall: misattributing setup failures to model capability; guardrail: log failure categories (deps, context errors) and fix the top offenders.
- **Receipt:** The paper’s infrastructure optimization lists scaffold changes (mandatory reading, context-length error handling, progress parsing robustness, prompt caching, banning end_task early) and sandbox improvements (pre-install 80+ research packages).

## Do this now (tight checklist)

- Pick 1–2 tasks that already take hours (or routinely overflow context).
- Start logging **assistant turns** and **wall-clock runtime** per task.
- Write a minimal **rubric + blacklist** scaffold per task (use prompt #1).
- Turn your longest demonstrations into **overlapped sub-trajectories**; pin the early spec/reading segment (use prompt #2).
- If you add RL, schedule **timeouts in stages** (short → longer), not one massive horizon (use prompt #3).

## Where this breaks

If your tasks don’t actually require multi-hour, context-overflow behavior, the extra scaffolding/training complexity can be wasted and slow you down.

## Receipts (what I actually used)

- Figure 2: extremely long-horizon vs long-horizon tasks (time/turns regime).
- Figure 3: Research-Factory pipeline (PDF→Markdown, blacklist official repo, rubric/addendum generation).
- Figure 4: trajectory-splitting SFT (pin early segment, progressive truncation, overlap).
- Reported deltas: assistant turns **114.90→732.70** (trajectory-splitting SFT); **+6.67%** (progressive RL); **+11.28%** vs Kimi K2 Thinking (1T) on PaperBench (KLong 106B).

## Skeptic check (BEFORE prompts)

- Are you measuring the right thing (task success) or just “makes progress early”? Decide what your rubric rewards.
- Can your sandbox run the task without spending most time on dependency install / environment drift?
- Do you have decontamination/blacklist rules for any tasks with public “answer keys” (official repos, solution writeups)?
- Are your long demonstrations being truncated in a way that drops the original constraints/spec?
- If you add RL, did you stage timeouts so you can iterate fast early, instead of waiting hours per rollout?

<!-- Prompts render from frontmatter -->
