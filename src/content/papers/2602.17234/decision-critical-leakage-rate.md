---
arxivId: "2602.17234"
catchyTitle: "Your backtest is lying to you"
funnySubtitle: "If the model ‘remembers’ the future, accuracy is fake."
blurb: "A practical leakage audit for LLM backtesting: extract atomic claims from rationales, label them with a temporal taxonomy, and compute Shapley-DCLR (decision-critical leakage) so you can tell when high performance is just hindsight." 
tldr: "When you backtest LLMs on past events, accuracy alone is meaningless unless you also measure temporal leakage. This paper shows how to (1) decompose a rationale into atomic claims, (2) label claims with a taxonomy where some are always leaked (outcomes, post-event consequences) and some are never leaked (background/definitions), (3) verify the remaining claims’ earliest public dates, and (4) compute Shapley-DCLR = the fraction of decision-driving evidence that’s post-cutoff. Then use a TimeSPEC-style loop (search → supervise → regenerate → closed-world aggregate) to push leakage toward ~0—even if that makes ‘performance’ drop on tasks that truly require future info."
paperTitle: "All Leaks Count, Some Count More: Interpretable Temporal Contamination Detection in LLM Backtesting"
prompts:
  - title: "Prompt #1 — Claim extraction + taxonomy labeling (A1–A5/B1–B2)"
    prompt: |-
      You are extracting factual claims from an LLM rationale for temporal leakage auditing.

      Input:
      - rationale_text
      - target_event (what is being predicted)
      - reference_date (cutoff)

      Rules:
      - Output atomic, self-contained, factual claims only (exclude opinions, predictions, and speculation).
      - For each claim, assign ONE category: A1 Discrete Event, A2 State/Measurement, A3 Publication, A4 Outcome (always leaked), A5 Consequential (always leaked), B1 Background (never leaked), B2 Definitional/Logical (never leaked).

      Output JSON: {claims:[{id, text, category}]}

  - title: "Prompt #2 — Shapley-DCLR calculator (from claim importance + leakage flags)"
    prompt: |-
      You are computing leakage metrics for a backtest instance.

      Input JSON:
      - claims: [{id, text}]
      - shapley_abs: {id: number}  # |ϕ_i| per claim
      - leaked: {id: true|false}

      Tasks:
      1) Compute OLR = (# leaked claims) / (total claims).
      2) Compute Shapley-DCLR = Σ |ϕ_i| * 1[leaked] / Σ |ϕ_i|.
      3) List the top 3 claims by |ϕ_i| with their leaked flag.

      Output JSON: {olr, shapley_dclr, top3:[{id, leaked, shapley_abs}]}

  - title: "Prompt #3 — Closed-world aggregator (final answer from validated claims only)"
    prompt: |-
      You are producing a backtest prediction under a strict closed-world constraint.

      Input:
      - task_input
      - validated_claims: an array of factual claims verified to be pre-cutoff

      Rules:
      - You may use ONLY the task_input and validated_claims.
      - Do NOT add any new facts, even if you ‘know’ them.
      - If validated_claims are insufficient, say so and output the least-committal prediction allowed by the task.

      Return: {prediction, short_rationale_citing_claim_ids}

tags: ["evaluation", "forecasting", "leakage", "shapley", "backtesting", "verification"]
sourceUrl: "https://arxiv.org/abs/2602.17234"
publishedAt: "2026-02-20T07:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Pair every backtest score with a leakage score

**Claim:** Accuracy without leakage auditing can be a “looks great, is cheating” mirage.

- **How to use it:** For each instance, compute both **Overall Leakage Rate (OLR)** and **Shapley-weighted Decision-Critical Leakage Rate (Shapley-DCLR)** so you can tell whether leaked info is *peripheral* or *doing the work*.
- **Decision rule:** If Shapley-DCLR is meaningfully above ~0, treat the backtest result as invalid even if performance is high.
- **Pitfall + guardrail:** Pitfall: publishing a leaderboard that’s just “who remembered the outcome best”; guardrail: require the “good” quadrant (high performance, low Shapley-DCLR) before you trust a run.
- **Receipt:** Table 4 reports stock-ranking baseline Shapley-DCLR = **0.171** vs TimeSPEC **0.001**; Figure 3 plots performance vs Shapley-DCLR.

### Move 2: Taxonomize claims so you only verify what’s worth verifying

**Claim:** You can slash verification work by labeling claim types with deterministic leakage status.

- **How to use it:** Extract atomic claims (use prompt #1) and label them with the taxonomy: **A4 (outcome)** + **A5 (post-event consequence)** are always leaked; **B1 (background)** + **B2 (definitions/logical truths)** are never leaked; only **A1–A3** need date verification.
- **Decision rule:** Spend search/verification budget only on A1–A3; skip the rest.
- **Pitfall + guardrail:** Pitfall: wasting cycles verifying obvious outcomes (“the court ruled…”) or timeless facts (“the court has nine justices”); guardrail: enforce the taxonomy gate before any retrieval.
- **Receipt:** Table 1 lists A1–A5/B1–B2 with whether search is needed; Section 4.3 defines the category-aware leakage rule.

### Move 3: Weight leakage by importance (Shapley), not by claim count

**Claim:** A single leaked claim can dominate the decision; counting claims (OLR) can miss that.

- **How to use it:** Estimate each claim’s contribution with **Shapley values**: ask the model to predict with only subsets of claims (Monte Carlo permutations), then compute **Shapley-DCLR = Σ|ϕᵢ|·ℓ(cᵢ) / Σ|ϕᵢ|**.
- **Decision rule:** If OLR is low but Shapley-DCLR is higher, assume your “few” leaked claims are the anchors—treat it as high risk.
- **Pitfall + guardrail:** Pitfall: celebrating a low OLR while the top-weighted claim is leaked; guardrail: always review the top-|ϕ| claims (and optionally Top-K leakage).
- **Receipt:** Shapley-DCLR is defined in Eq. (4)/(10); Appendix B.2 defines Top-K leakage among the most influential claims.

### Move 4: Replace “temporal hint” prompting with verification + regeneration (TimeSPEC)

**Claim:** Prompting “only use info before the cutoff” still leaks; you need enforced constraints.

- **How to use it:** Implement the TimeSPEC pattern: **(1) temporally-filtered search** (only pre-cutoff docs), **(2) supervisor** extracts + verifies claims, **(3) regenerate** if any violations exist, **(4) resupervise**, **(5) aggregate** the final prediction using only validated claims in a **closed-world** setting.
- **Decision rule:** Trigger regeneration whenever **any** violation is found (|C_violated| > 0); in aggregation, forbid introducing new facts beyond validated claims + task input.
- **Pitfall + guardrail:** Pitfall: assuming date-filtered search alone fixes leakage (it doesn’t; parametric memory still leaks); guardrail: claim-level verification + closed-world aggregation.
- **Receipt:** Figure 2 diagrams the multi-phase architecture; Table 4 shows Temporal Hint still leaks (e.g., stock DCLR **0.034**) vs TimeSPEC **0.001**.

### Move 5: Use “performance drops” as a correctness signal on future-dependent tasks

**Claim:** If a task genuinely needs post-cutoff information, honest leakage control should reduce apparent performance.

- **How to use it:** Include at least one leakage-sensitive backtest where outcomes depend on post-cutoff events (the paper’s stock-ranking setup uses a Dec 1, 2019 cutoff over a COVID-period window). Use it as a canary: if you still score high with low leakage, something’s off.
- **Decision rule:** If leakage goes to ~0 and performance drops on these tasks, interpret that as *removing hindsight*, not “breaking the model.”
- **Pitfall + guardrail:** Pitfall: optimizing to keep the old performance number; guardrail: optimize for the joint objective (low Shapley-DCLR + best-possible performance under the information constraint).
- **Receipt:** Table 3 shows stock Spearman ρ falling from **0.543/0.523** (baselines) to **0.167** (TimeSPEC) while Table 4 shows leakage falling to **0.001**.

## Do this now (tight checklist)

- Define the cutoff date(s) for your backtest (per instance if needed).
- Require rationales that contain factual, checkable claims (no vibes).
- Extract claims + taxonomy labels (use prompt #1).
- Auto-mark A4/A5 as leaked and B1/B2 as not leaked; only verify A1–A3.
- For A1–A3, verify the earliest public date τ(c) via search and use strict date interpretation (e.g., “2023” → 2023-12-31).
- Compute OLR + Shapley-DCLR (use prompt #2) and gate runs on Shapley-DCLR.
- If leakage is high, implement TimeSPEC-style enforcement: search (pre-cutoff) → supervise → regenerate on violations → resupervise → closed-world aggregate (use prompt #3).

## Where this breaks

This pipeline can be compute-expensive because claim extraction, Monte Carlo Shapley estimation, and search-based date verification require many API calls per instance.

## Receipts (what I actually used)

- Table 1: Claim taxonomy with deterministic shortcuts (A4/A5 always leaked; B1/B2 never leaked).
- Table 3: Performance results across tasks (Legal BS, Salary RE, Stock Spearman ρ).
- Table 4: Leakage results (OLR + Shapley-DCLR; TimeSPEC drives stock DCLR to 0.001).
- Figure 2: TimeSPEC phases + closed-world aggregation.

## Skeptic check (BEFORE prompts)

- Are your cutoff dates correct, and do they match what a real forecaster would have known?
- Does the task admit legitimate pre-cutoff reasoning (legal precedent) or is it inherently future-dependent (black-swan markets)?
- Are you gating on *decision-critical* leakage (Shapley-DCLR), not just claim count (OLR)?
- Have you decided what Shapley-DCLR level fails a run—*before* you look at accuracy?
