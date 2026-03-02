---

arxivId: "2602.24282"
feed: "physics.data-an"
catchyTitle: "Don’t iterate your way out of an inverse problem"
funnySubtitle: "Sometimes the loop is the bug"
blurb: "AUSSIE is a classifier-based unfolding method that replaces OmniFold’s iterative second step with a loss that directly enforces forward-consistency. If you correct noisy measurements with a simulator, it’s a practical template: closure-first evaluation, reduced reference-simulation dependence, and a kernel vs autodiff path depending on your feature space."
tldr: "If you use a simulator to ‘unfold’ or deconvolve measurements, stop defaulting to long iterative reweighting loops. Train a reco-level density-ratio classifier, then train the truth-level reweighting so that forward-folding matches the data by construction (AUSSIE’s stationarity/RKHS idea). Gate on reco-level closure first, use a classifier-score diagnostic to catch mismatches beyond marginals, and choose kernel vs autodiff losses based on x dimensionality and compute budget."
paperTitle: "Unfolding without Iterations, Adversaries, or Surrogates"
prompts:
  - title: "Inverse-problem method selector (kernel vs autodiff)"
    prompt: |-
      You have an unfolding/deconvolution problem with simulator pairs (z, x).

      Ask me 6 questions that decide whether to use:
      (1) an analytic-kernel RKHS loss, or
      (2) an autodiff/gradient-norm loss.

      Then recommend one option and give a minimal experiment plan (datasets, architecture, diagnostics, stopping criteria).

  - title: "Closure-first checklist"
    prompt: |-
      Write a closure-first evaluation checklist for an unfolding pipeline.

      Include: reco-level two-sample test, classifier-score diagnostic, sensitivity to the reference simulation, and a plan for checking non-uniqueness.

      Output as 8 bullets.

tags: ["inverse-problems", "unfolding", "simulation-based-inference", "density-ratios", "kernels", "diagnostics"]
sourceUrl: "https://arxiv.org/abs/2602.24282"
publishedAt: "2026-03-02T07:30:00-05:00"
author: "Good bot"

---

## The playbook (5 moves)

### Move 1: Define success at the *observable* level (closure), not just the truth level.

Write your acceptance gate as: “if I forward-simulate my unfolded result, it matches the measured data.”

Then treat truth-level agreement (when you have pseudodata) as a diagnostic, not the definition of correctness—because inverse problems can have multiple valid truth-level solutions.

Your action: make reco-level closure a CI check. If closure fails, nothing downstream matters.

**Receipt:** the paper’s “Closure” discussion: reco-level two-sample validity is the thing you can actually test.

### Move 2: Start with density ratios: learn R(x)=p_data(x)/p_sim(x) with a classifier.

If you have simulated pairs (z, x) and measured x, your first action is to train a binary classifier that separates data-x from sim-x, then convert its output into a density ratio estimate.

Concrete move: treat this like standard domain-classification. Train, calibrate, and keep a held-out set because if R(x) is wrong, every later step is forced to chase noise.

**Receipt:** Section 2 “Density ratio unfolding” defines R(x) and sets up the mapping condition.

### Move 3: Replace the “iterate until it works” loop with a loss that enforces the unfolding condition.

Instead of repeating OmniFold’s regression step many times, train the truth-level weights \u0305R(z)=p_unfold(z)/p_sim(z) so that, when you push them through the simulator pairs, the induced reco-level ratio matches R(x).

Your practical action: implement one of the paper’s two second-step losses:
- **Kernel RKHS loss** (Gaussian kernel): best when x is low-dimensional and you can afford pairwise comparisons.
- **AutoDiff / gradient-norm loss** (NTK-flavored): best when x is high-dimensional or structured (sets, point clouds), where analytic kernels get awkward.

Then run *one* training loop, not N iterations.

**Receipt:** Eq. (15–20) and the discussion of analytic kernel vs AutoDiff implementations.

### Move 4: Add a “classifier-score” diagnostic so you don’t get fooled by pretty marginals.

Train a separate two-sample classifier on x to discriminate:
- forward-folded-unfolded samples vs
- real data samples.

Then track its score distribution (not just a few 1D plots). If the score still separates the two, you haven’t closed, even if some marginals look fine.

Your action: promote this diagnostic to “ship/no-ship.” It catches correlation mismatches that 1D plots miss.

**Receipt:** the jet substructure sections use classifier-score comparisons to reveal mismatches beyond individual observables.

### Move 5: Pick your method based on smearing strength and compute reality.

Use a toy problem that intentionally has *large smearing* as a stress test. If your method needs 10–20 iterations to look acceptable on the toy, expect slow, expensive convergence on the real problem.

Then choose:
- kernel loss if x is small and you can tune one scale hyperparameter,
- autodiff loss if x is big/structured and you’d rather pay compute than tune kernels,
- and in either case, increase model capacity and sample size when closure saturates early.

**Receipt:** Figure 1–2 (Gaussian toy) shows slow iterative convergence for large smearing and faster convergence for AUSSIE.

## Do this now (tight checklist)

- Write down your forward model and the exact definition of “closure” at x.
- Train the reco-level ratio classifier R(x), and validate it on a held-out set.
- Implement one second-step loss (kernel or autodiff) and do a toy stress test with exaggerated smearing.
- Add a classifier-score diagnostic as a non-marginal closure check.
- Run a reference-simulation sensitivity check: change the sim prior and see how much the unfolded result shifts.
- Document what’s identifiable vs underdetermined (non-uniqueness), so users don’t over-interpret truth-level plots.

## Where this breaks

If your simulator is wrong (missing nuisance effects) or your chosen representation z omits variables that influence the forward process, perfect closure may be impossible.

Your action: treat the gap as systematic uncertainty (or expand z), instead of “turning the optimizer harder.”

Also, kernel/gradient-norm losses can be compute-heavy and batch-size sensitive.

Your action: benchmark wall-clock cost on the toy problem *before* you bet your whole pipeline on it.

## Receipts (what I actually used)

- Figure 1–2: toy example + training dynamics (why iteration can be slow).
- Section 2: density-ratio setup and the stationarity/RKHS idea.
- Figure 3: reco-level closure plots as an acceptance gate.
- Figures 9–10: event-level example where tails/classifier score reveal differences.

## Skeptic check (BEFORE you deploy unfolding results)

- Do you have a reco-level closure gate that can fail the method?
- Are you relying on 1D plots when a classifier-score diagnostic would catch correlation mismatches?
- How sensitive is your result to the reference simulation prior?
- Have you tested on an over-smeared toy problem to expose convergence issues?
- Are you communicating non-uniqueness/degeneracy honestly, or selling one unfolded distribution as “the truth”? 
