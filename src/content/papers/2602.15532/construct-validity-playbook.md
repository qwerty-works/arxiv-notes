---
arxivId: "2602.15532"
catchyTitle: "Benchmarks Aren’t Capabilities"
funnySubtitle: "Stop grading the ruler"
blurb: "A measurement-theory take on LLM evals: control for scale, model measurement error, and only call something a ‘capability’ if it predicts held-out benchmarks better than a size-only baseline."
tldr: "Don’t treat benchmark scores as capabilities. Control for scale, model measurement error, and prove your ‘capability’ claims by predicting held-out benchmarks—otherwise you’re just renaming model size."
paperTitle: "Quantifying construct validity in large language model evaluations"
prompts:
  - title: "Construct validity audit (for an eval suite)"
    prompt: |-
      You are my evaluation engineer. I will paste a table of model results across benchmarks (rows=models, cols=benchmarks) and metadata including log-parameter size.

      Task:
      1) List 3–6 candidate capabilities suggested by the benchmarks.
      2) Identify likely confounds (at minimum: model size/scale, contamination, measurement error).
      3) Propose a construct-validity test plan with:
         - convergent checks (which benchmarks should agree, and how to quantify)
         - discriminant checks (which should NOT move together)
         - a size-control procedure
         - a leave-one-benchmark-out prediction protocol
      4) Output a reporting template that separates: raw score vs size-controlled evidence vs what is NOT supported.

      Constraints:
      - Be concrete: name exact computations, plots, and pass/fail thresholds.
      - If data is missing (e.g., size), ask for it explicitly.

      Input table:
      <paste>

  - title: "Scale confound check (quick triage)"
    prompt: |-
      I’m about to make a capability claim from benchmark deltas. Stop me if it’s BS.

      Given:
      - Benchmark: <name>
      - Metric: <metric>
      - Model A: <score>, params=<nA>
      - Model B: <score>, params=<nB>
      - Any other models (optional): <list>

      Do:
      1) Decide whether the observed delta could plausibly be explained by scale alone.
      2) Tell me what additional evidence I need *before* I claim ‘capability’ (e.g., another benchmark, residual analysis, held-out prediction).
      3) Provide a one-sentence safer claim I can publish today.

      Output format:
      - Verdict: (Scale-likely / Scale-unclear / Not-scale)
      - Required next evidence: (bullets)
      - Safe publishable sentence: (one line)

tags: ["evaluation", "benchmarks", "measurement", "scaling", "methodology"]
sourceUrl: "https://arxiv.org/abs/2602.15532"
publishedAt: "2026-02-18T15:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1 — Separate “score” from “capability” on paper before you touch code

**Operator move:** write down the capability you *think* the benchmark measures, then treat the benchmark score as a noisy indicator—not the capability itself.

**Decision rule:** if a single “general” factor/component explains most variance across your benchmark suite, assume you’re measuring a confound (often scale) until proven otherwise.

**Pitfall + guardrail:** pitfall: declaring “Model X is better at reasoning” from one score. Guardrail: require convergent + discriminant evidence across multiple tasks before naming a capability.

**Receipt:** pure latent factor model fit a dominant factor explaining **72%** communal variance and correlating with log-parameter size (Fig. 8).

### Move 2 — Run a scale confound check by size-controlling each benchmark

**Operator move:** fit a simple size→score curve per task (e.g., logistic against log-parameters), then recompute correlations and conclusions on residuals.

**Decision rule:** if controlling for size materially changes inter-task correlations (direction/strength), you must report “size-controlled” results alongside raw scores.

**Pitfall + guardrail:** pitfall: treating positive correlation manifolds as “general intelligence.” Guardrail: recompute the manifold after size-control and see what remains.

**Receipt:** average inter-item Spearman correlation dropped from **0.64 → 0.48** after controlling for parameter size via logistic fits (Sec. 4.1; Figs. 4 & 6).

### Move 3 — Don’t PCA your way into a capability story

**Operator move:** when you build a “capability space,” include size as an upstream variable and allow per-benchmark error terms so quirks don’t get baked into “capabilities.”

**Decision rule:** if your method assumes zero benchmark-specific error (effectively “E=0”), only use it for rough visualization—not for claims or policy-facing reporting.

**Pitfall + guardrail:** pitfall: PCA components that look clean but don’t generalize. Guardrail: require that your capability estimates predict held-out benchmarks better than a size-only baseline.

**Receipt:** structured capabilities model improved parsimony (AIC/BIC) vs pure EFA (Table 2) and avoided a single overwhelmingly dominant dimension (Figs. 9 & 12).

### Move 4 — Prove construct validity by predicting held-out benchmarks

**Operator move:** for each benchmark, hold it out, fit your capability model on the rest, then predict the held-out scores and track error (and don’t hide the hard region).

**Decision rule:** if your capability model doesn’t beat a size-only baseline on held-out benchmarks, you don’t have a capability model—you have a rebranding exercise.

**Pitfall + guardrail:** pitfall: overfitting to your benchmark suite. Guardrail: commit to an out-of-fold protocol and publish the error distribution, not just averages.

**Receipt:** out-of-fold prediction: structured capabilities had lower average test MSE (**1.156**) than observational scaling laws/PCA (**1.473**) and far better than size-only (**3.561**) (Table 3).

### Move 5 — Write skeptic-proof capability claims (and pre-commit promotion bars)

**Operator move:** add a “construct validity note” to every eval report: (a) confounds checked (scale, measurement error), (b) which tasks converged, (c) which tasks discriminated.

**Decision rule:** if you can’t describe a failure mode that would make your benchmark misleading (contamination, labeling noise, prompt sensitivity), you’re not ready to operationalize the score.

**Pitfall + guardrail:** pitfall: shipping based on a leaderboard delta. Guardrail: require a pre-registered promotion bar that includes size-controlled gains and a held-out task win.

**Receipt:** paper frames construct validity as requiring convergent + discriminant validity and argues benchmarks can distort inference via contamination/annotator error/prompt sensitivity (Intro; Sec. 2.2).

## Do this now (tight checklist)

- Pick **5–15** benchmarks you actually care about (not just popular ones).
- For each benchmark, fit **score ~ logistic(log-params)** and keep the **residuals**.
- Recompute (a) the **correlation matrix** and (b) any “capability” factor/PCA on residuals.
- Run **leave-one-benchmark-out** prediction and compare against a **size-only** baseline.
- Update your reporting template to separate: **raw score**, **size-controlled evidence**, and **what this score does NOT mean**.

## Where this breaks

If you don’t have reliable model size metadata (or your “models” differ in more than scale), size-control and capability modeling can be misleading.

## Receipts (what I actually used)

- Fig. 8: pure latent factor model had a dominant factor (**72%** communal variance) correlated with log-parameter size (**R²=0.474**).
- Sec. 4.1 / Figs. 4 & 6: inter-item Spearman correlation dropped **0.64 → 0.48** after size-control via logistic fits.
- Table 2: structured models improved parsimony (**AIC/BIC**) vs pure measurement models.
- Table 3: out-of-fold prediction errors (structured capabilities avg test MSE **1.156** vs OSL/PCA **1.473** vs size-only **3.561**).

## Skeptic check (BEFORE prompts)

- Am I about to rename “model size” as a “capability” because it explains most variance?
- Did I control for size *and* show what changes (correlations, factor structure, rankings)?
- Did I test out-of-distribution prediction (held-out benchmark) rather than in-suite fit?
- Do I have a measurement-error story (format quirks, prompt sensitivity, label noise) instead of assuming benchmarks are perfect?
- Can I state what observation would falsify my “capability” interpretation?

<!-- prompts render from frontmatter -->
