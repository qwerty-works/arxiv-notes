---

arxivId: "2602.21143"
feed: "cs.AI"
catchyTitle: "Grade research agents like pipelines, not QA bots"
funnySubtitle: "If Exact Match is zero, your agent might be ‘almost right’—and still unusable."
blurb: "DeepSynth is a 120-task benchmark for web-scale synthesis (avg 4.2 pages/task, 7.54 steps). The operator takeaway isn’t ‘models are bad’—it’s *how to evaluate them*: split navigation vs synthesis, run an oracle-planning baseline, and enforce JSON/number correctness. Even top systems hit single-digit F1 (best agent 8.97), and Africa-slice performance is 0—so your internal eval needs stage metrics + regional diversity or you’ll ship a fragile demo."
tldr: "If you’re building a ‘deep research’ agent, stop using one score. Implement a **4-stage eval** (navigate → extract → compute → format), add an **oracle-planning** condition (plan provided, answers hidden), and create a **non-US/non-English slice**. Use this acceptance rule: ship only if **(a)** stage-1 navigation succeeds reliably, **(b)** compute checks pass (recompute in code), and **(c)** output schema has ≥99% key coverage. DeepSynth shows why: best Pass@1 is only **8.97 F1**, removing **search** causes the biggest drop (OWL 5.41 → 3.60), and providing the plan can jump GPT‑4.1 to **9.36 F1**—meaning routing/planning is often your bottleneck."
paperTitle: "A Benchmark for Deep Information Synthesis"
prompts:
  - title: "Prompt #1 — Force stage-by-stage logging (so you can debug the right thing)"
    prompt: |-
      You are a research agent. You MUST output a JSON log with four stages.

      TASK: <task>

      Stage 1 — NAVIGATE:
      - List the URLs you visited (in order).
      - For each, write why it was chosen.

      Stage 2 — EXTRACT:
      - For each URL, extract ONLY the minimal fields needed (quote + table cells).
      - Include a citation pointer (URL + section/table name).

      Stage 3 — COMPUTE:
      - Recompute any aggregates/rankings/correlations using code (not prose).
      - Output intermediate computed values.

      Stage 4 — FORMAT:
      - Produce the final answer in the required schema.

      Fail-fast rules:
      - If you cannot access a needed source, stop and ask for an alternative source.
      - If a numeric value is derived, you must show the calculation inputs.

  - title: "Prompt #2 — Oracle planning baseline (plan given, answers hidden)"
    prompt: |-
      You are solving the task with a provided plan.

      You are given INTERMEDIATE_STEPS (a plan). Do NOT invent new steps.
      For each step:
      1) run the step,
      2) capture evidence (URL + quoted line or table row),
      3) store outputs as variables,
      4) only then move to the next step.

      At the end, produce ONLY the final JSON answer.

tags: ["agents", "evaluation", "benchmarks", "reliability", "tooling", "web"]
sourceUrl: "https://arxiv.org/abs/2602.21143"
publishedAt: "2026-02-25T07:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Replace “one score” with a 4-stage eval (or you’ll optimize the wrong failure)

Before you tune prompts or buy a bigger model, instrument your agent as a pipeline: **navigate → extract → compute → format**, because each stage needs a different fix.

- **Operator move:** Add a run log that records visited URLs, extracted snippets/table cells, a reproducible computation (code), and the final JSON.
- **Metric / check:** If **LLM-judge > 0** but **Exact Match ~ 0**, treat it as a *format/precision* problem (missing keys, wrong rounding, wrong schema), not “the model can’t reason.”

### Move 2: Run an oracle-planning baseline to find out if routing is your bottleneck

Don’t guess whether your agent fails because it can’t compute or because it took the wrong path—measure it with a planning-oracle condition.

- **Operator move:** For a small slice of tasks, give the agent the **intermediate steps (plan)** but hide intermediate answers, and re-run the same tool stack.
- **Decision rule:** If oracle-planning boosts performance a lot, prioritize **planning/routing/state tracking** work over extraction tweaks.
- **Receipt:** In DeepSynth’s ablation, providing intermediate steps jumps **GPT‑4.1 to 9.36 F1** and **smolagents (GPT‑4.1) to 10.50 F1**—a sign that trajectory selection is a major failure mode.

### Move 3: Treat tool coverage as a required bundle (and test it with tool ablations)

If your “research agent” can’t search, browse, parse tables, and compute, it’s not a research agent—it’s a summarizer that will hallucinate the missing joins.

- **Operator move:** Build a minimal tool contract: **search**, **interactive browsing**, **document/table extraction**, and a **code interpreter** for aggregation/correlation/ranking.
- **Metric / check:** Run tool ablations on your own benchmark; you want to see which missing tool causes the steepest drop so you know what to harden first.
- **Receipt:** DeepSynth’s OWL tool ablation shows the biggest F1 drop when **search** is removed (**5.41 → 3.60**), and removing **code execution** can zero out EM.

### Move 4: Add “UI interaction tasks” because finding the right URL is not success

Web tasks often fail at the last mile: filters, dropdowns, pagination, and embedded tables—so include at least one task where the agent must *operate* a site, not just read it.

- **Operator move:** In your eval set, include tasks that require querying a site interface (e.g., a stats portal) and extracting a specific row after applying filters.
- **Pitfall + guardrail:** Pitfall: you grade on citations (“it visited the right page”), but the agent never pulled the right cell. Guardrail: require extracted evidence to include the exact row/column values used in the computation.
- **Receipt:** DeepSynth highlights failure cases where the agent finds the right URL but fails to interact correctly with the site’s database UI (Figure 9 caption).

### Move 5: Bake regional diversity into acceptance (or your agent will collapse off the happy path)

If you only test on US/Europe/English sources, you’re measuring a narrow skill: “English web QA,” not robust synthesis.

- **Operator move:** Create a benchmark slice that includes **non-US government statistics** and under-represented regions, and track it as a first-class metric.
- **Decision rule:** If a slice is near-zero, don’t average it away—gate releases on it (label the product honestly until it improves).
- **Receipt:** In DeepSynth’s multi-regional analysis, **Africa-related tasks score 0 across models**, which is exactly the kind of cliff you want your eval to surface early.

## Do this now (tight checklist)

- Add run logging for: URL trail, extracted cells/quotes, code-based recomputation, and final schema.
- Implement a 20-task internal mini-suite with at least: one correlation, one ranking, one anomaly detection, and one UI-interaction extraction.
- Run two baselines weekly: **Pass@1** and **oracle-planning**; prioritize the bigger gap.
- Add a non-US/non-English slice and make it a release gate (not a vanity chart).

## Where this breaks

If your sources require login or are unstable, you’ll get flaky scores—so prefer official/public datasets and cache snapshots when allowed.

If you only use LLM-judging, you can hide formatting and numeric errors—so keep a strict schema/EM metric alongside a softer semantic score.

## Receipts (what I actually used)

- Benchmark shape: **120 tasks**, avg **4.2 pages/task**, avg **7.54 intermediate steps**, JSON outputs (Table 1 / Figure 1 captions).
- Headline difficulty: best agent Pass@1 **8.97 F1**; scores remain low across models (Table 2 caption).
- Tool ablation: removing **search** hurts most in OWL ablation (**5.41 → 3.60 F1**) (Table 3 caption).
- Planning oracle: providing intermediate steps yields large gains (Table 3 caption).
- Regional cliff: Africa slice at **0** (Table 5 caption).

## Skeptic check (BEFORE you claim you built a “research agent”)

- Can you point to a run log where the agent *recomputes* the final numbers in code (not just paraphrases a source)?
- Do you know whether your failures are mostly **navigation** or **synthesis** errors (and do you have different fixes queued for each)?
- Have you measured the delta between Pass@1 and oracle-planning to quantify your routing problem?
- Does your acceptance criteria include a non-US/non-English slice, or are you shipping a tool that only works on the internet you personally browse?

<!-- Prompts render from frontmatter -->
