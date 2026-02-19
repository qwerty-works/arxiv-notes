---
arxivId: "2602.16246"
catchyTitle: "Ship agent evals without a fake perfect database"
funnySubtitle: "Grade the state you wanted, not the tool path you got."
blurb: "Proxy State-Based Evaluation replaces expensive deterministic backends with an LLM-inferred proxy state + judges, so you can run outcome-based evals, diagnose hallucinations, and generate training data for tool-calling agents."
tldr: "Stop waiting on a perfect deterministic backend: define scenarios with explicit facts + expected final state, infer a structured proxy state from the full trace, and grade outcomes (plus hallucinations) so you can rank, debug, and fine-tune tool-calling agents fast."
paperTitle: "Toward Scalable Verifiable Reward: Proxy State-Based Evaluation for Multi-turn Tool-Calling LLM Agents"
prompts:
  - title: "Prompt #1 — Scenario spec writer (turn a workflow into a graded scenario)"
    prompt: |-
      You are writing a *scenario* for proxy state-based evaluation of a tool-calling agent.

      Input workflow description:
      {{WORKFLOW}}

      Produce a JSON object with these keys:
      - user_goal: one sentence
      - user_facts: bullet list of facts the user knows/says
      - system_facts: bullet list of initial backend facts (accounts, balances, carts, etc.)
      - expected_final_state: a structured description of what must be true at the end
      - expected_agent_behavior: bullet list of behaviors the agent must demonstrate (e.g., ask for missing info, confirm irreversible actions)

      Rules:
      - Only include facts needed for simulation + grading.
      - Make every expected_final_state item verifiable from tool outputs.
      - Do not specify the exact tool-invocation trajectory.

  - title: "Prompt #2 — Proxy-state rubric (what to track; what counts as read/write)"
    prompt: |-
      You are designing a proxy state tracker for a multi-turn tool-calling task.

      Given these tools and their JSON outputs:
      {{TOOLS_AND_OUTPUTS}}

      Define:
      1) A minimal proxy state schema (fields + types)
      2) Which tools are read-only vs write
      3) For each write tool: which state fields change on success, and which must NOT change on failure
      4) Two invariants to detect drift (e.g., balances don’t change unless a write tool succeeded)

      Output as a compact checklist the engineer can implement.

tags: ["agents", "evaluation", "tool-calling", "benchmarks", "simulation", "hallucinations"]
sourceUrl: "https://arxiv.org/abs/2602.16246"
publishedAt: "2026-02-19T15:30:00-05:00"
author: "Good bot"
---

## The playbook (6 moves)

### Move 1: Grade outcomes via a *proxy final state* (don’t block on a deterministic DB)

**Claim:** You can get state-based evaluation for tool-calling agents without building a deterministic backend by judging an LLM-inferred *proxy final state*.

- **How to use it:** Define success as a check on the final proxy state + final user message (not the exact tool-invocation trajectory).
- **Decision rule:** If your benchmark/dev loop is blocked on “we don’t have a real DB / deterministic tools yet”, use proxy state-based evaluation as the stopgap that still ranks models.
- **Pitfall + guardrail:** Pitfall: you accidentally start grading *style* or *trajectory*; guardrail: only compare against expected final state + expected behavior in the scenario spec.
- **Receipt:** The core setup replaces deterministic backends with an LLM proxy state tracker + judge while keeping final state-based evaluation (Sec. 1/3/4; Fig. 1).

### Move 2: Make the scenario schema your “contract” (and blame missing facts first)

**Claim:** A tight scenario schema is your anti-hallucination “contract”: missing facts predictably raise simulator hallucinations.

- **How to use it:** Write each task as a scenario object: user goal + user facts + system facts (initial state) + expected final state + expected agent behavior.
- **Decision rule:** If tool/user hallucination rate is non-trivial, treat it as “scenario is under-specified” before blaming the agent model.
- **Pitfall + guardrail:** Pitfall: “implicit” facts living in your head; guardrail: add a scenario-completeness checklist and don’t ship scenarios that fail it.
- **Receipt:** Removing system/user facts monotonically increases tool/user hallucination rates (Fig. 4).

### Move 3: Track state from the full trace prefix (drift is the silent killer)

**Claim:** Track proxy state from the *full trace prefix* to reduce drift: make the state tracker re-derive state from history instead of only applying incremental deltas.

- **How to use it:** Have a state tracker infer the current structured proxy state from the interaction prefix (conversation + tool invocations/returns), and classify tools as read vs write.
- **Decision rule:** If your tasks are long-horizon (many turns/steps), prefer “recompute from prefix” over purely stepwise updates to limit error accumulation.
- **Pitfall + guardrail:** Pitfall: weak state tracking poisons downstream tools because tools “read from” the proxy state; guardrail: upgrade the tracker model before tuning the agent.
- **Receipt:** Weakening the state tracker (GPT-5o→GPT-4o) raises tool hallucination from 1.33%±0.53 to 3.61%±0.88 (Sec. 6.2).

### Move 4: Split the grading: (a) goal completion, (b) hallucinations, (c) blame assignment

**Claim:** Split grading into (1) goal completion and (2) hallucination detection, then measure *who* caused failure (agent vs user) so your iteration targets the right thing.

- **How to use it:** Run a goal-completion judge that labels: completed vs not completed due to user error vs agent error; separately run a hallucination judge for tool/user hallucinations.
- **Decision rule:** If you can’t say whether failures are agent-side or user-side, you don’t yet have an eval you can optimize against.
- **Pitfall + guardrail:** Pitfall: “overall success rate” hides error sources; guardrail: always report GC, ER_user, ER_agent, HR_tool, HR_user.
- **Receipt:** The benchmark reports GC, user/agent error rates, and tool/user hallucination rates; human–LLM judge agreement is high (Table 1; Sec. 4/5).

### Move 5: Use personas as a stress test (but keep leaderboards low-noise)

**Claim:** Use personas as a stress test, but default to a “power user” persona when ranking models so user noise doesn’t swamp agent differences.

- **How to use it:** Evaluate with a “power user” persona for leaderboard-style comparisons, then re-run with “ambiguous/confused” personas to locate robustness gaps.
- **Decision rule:** If you’re comparing models, keep user-induced errors low (power persona); if you’re hardening a product, include harder personas.
- **Pitfall + guardrail:** Pitfall: you optimize to the benchmark’s easiest persona and call it “done”; guardrail: require a persona-sweep report before shipping.
- **Receipt:** Power-user ER_user=3.55% and HR_user=0.67%; confused/ambiguous increase both (Sec. 6.3; Fig. 5).

### Move 6: Turn the environment into training data (success-filtered SFT is the fast win)

**Claim:** Treat the environment as a data factory: filter successful trajectories and fine-tune the agent—teacher SFT can produce big jumps.

- **How to use it:** Generate rollouts, keep only judge-approved successes (c=1), then do SFT (off-policy teacher) or RFT (on-policy rejection sampling) for the reasoning agent.
- **Decision rule:** If you need a large capability jump fast, start with SFT on filtered successful trajectories; use on-policy RFT for smaller, incremental gains.
- **Pitfall + guardrail:** Pitfall: training on unfiltered rollouts bakes in junk; guardrail: success-filter using your goal-completion judge before fine-tuning.
- **Receipt:** Base GC 65.64%; RFT 67.11%; SFT 77.34% (Sec. 6.1).

## Do this now (tight checklist)

- Pick 10–20 real workflows and rewrite them as scenarios (goal, user facts, system facts, expected final state, expected behavior). Use prompt #1.
- Implement proxy state tracking that derives state from the full trace prefix; mark each tool as read-only or write.
- Add two judges: goal completion (with agent-vs-user error labels) and hallucination detection (tool vs user).
- Add reliability reporting to every run: GC, ER_agent, ER_user, HR_tool, HR_user + bootstrap standard error.
- Run a scenario-completeness ablation (remove facts) on a sample set; if hallucinations jump, your scenario spec is too thin.
- Generate rollouts and run success-filtered SFT as the first training baseline; compare against on-policy RFT.

## Where this breaks

If your scenario schema is incomplete or your proxy state tracker is weak, the simulation can fabricate state and your scores stop being trustworthy.

## Receipts (what I actually used)

- Tool hallucination and user hallucination are near-zero under default simulator/judge setup: HR_tool=1.33%, HR_user=0.67%.
- Proxy state tracker ablation: HR_tool 1.33%±0.53 → 3.61%±0.88 when the tracker is weakened.
- Human/LLM judge three-way agreement (n=50): goal completion 82.7%, tool hallucination 94.7%, user hallucination 94.7%.
- Training result: GC 65.64% (base) → 67.11% (RFT) → 77.34% (SFT).

## Skeptic check (BEFORE prompts)

- Are you grading the *outcome state* (what changed) or accidentally grading the *path* (which tools were called)?
- Can a human read the scenario and independently predict the expected final state? If not, the scenario is underspecified.
- Do you have separate metrics for tool hallucinations vs agent errors vs user errors, or are they blended into “fail”?
- Does your judge agree with humans on a small audited set (spot-check 20–50 trajectories)?
- If you swap the state tracker for a weaker model, do your hallucination rates spike (a sign your proxy state is doing real work)?
