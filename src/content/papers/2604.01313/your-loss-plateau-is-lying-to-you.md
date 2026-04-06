---

arxivId: "2604.01313"
feed: "physics.data-an"
catchyTitle: "Your loss plateau is lying to you"
funnySubtitle: "If you stop training when the curve flattens, you may ship the wrong distribution"
blurb: "JetPrism shows that for Conditional Flow Matching (CFM) used in simulation and unfolding, the standard training loss can plateau while physics-informed fidelity keeps improving. The paper responds with a multi-metric convergence protocol (χ², W1, Dcorr, RNN) plus synthetic stress tests and a Jefferson Lab MC-POM case study."
tldr: "If you train generative surrogates for simulation or inverse problems, stop using ‘loss went flat’ as your convergence gate. Track fidelity (marginal + pairwise χ², W1), dependence structure (Dcorr), and memorization risk (RNN), and only stop when those stabilize at acceptable thresholds—especially when doing detector unfolding."
paperTitle: "JetPrism: diagnosing convergence for generative simulation and inverse problems in nuclear physics"
prompts:
  - title: "Generative convergence gate (multi-metric, not loss)"
    prompt: |-
      You are reviewing a training run for a generative model used in simulation or inverse problems.

      Task: decide if the model is converged enough to stop training.

      Rules:
      - Ignore training loss plateau unless fidelity metrics are also stable.
      - Require evidence for (1) marginal fidelity, (2) dependence structure, (3) non-memorization.

      Inputs:
      - Time series for: χ²_marginal, χ²_pairwise, W1, Dcorr, RNN
      - Plots or summary stats

      Output:
      A) Stop? YES/NO
      B) Which metric is still moving (1–3 bullets)
      C) Next action (e.g., keep training N steps, change learning rate, add regularization, change sampling)

  - title: "Synthetic stress-test spec generator (what to test before real data)"
    prompt: |-
      Design a minimal synthetic benchmark suite to stress-test a generative model before deploying it on a costly real dataset.

      Constraints:
      - Include at least: sharp cutoff, asymmetric bimodal, widely separated multimodal, exponential decay, and a high-frequency structure case.
      - For each case, specify: target distribution, sample size, evaluation metrics (χ²/W1), and a pass/fail threshold idea.

      Output as a checklist.

tags: ["generative-models", "simulation", "inverse-problems", "evaluation", "flows", "metrics"]
sourceUrl: "https://arxiv.org/abs/2604.01313"
publishedAt: "2026-04-06T07:30:00-04:00"
author: "Good bot"

---

## The playbook (5 moves)

### Move 1: Replace “loss converged” with “distribution converged.”

Stop treating a flattened training loss as permission to stop training.

JetPrism’s headline claim is operational: for Conditional Flow Matching (CFM), the standard loss can plateau while the metrics you actually care about keep improving (Figure 2 is explicitly about this mismatch). Translate that into an action: rewrite your training checklist so “loss plateau” is a weak signal, not a stop condition.

### Move 2: Track fidelity at the level you’ll be judged on.

Add explicit distributional checks for what your downstream task consumes.

JetPrism proposes a multi-metric protocol that includes **marginal and pairwise χ²** plus **W1 distance**. Treat those as your minimum viable dashboard: make them run on held-out samples during training, and plot them over time the same way you plot loss.

If your domain has sharp features, use the paper’s warning as a test: focus extra attention on “sharp cut-off regions” (Figure 3), because that’s exactly where you can be wrong even when the loss looks done.

### Move 3: Measure dependence structure, not just marginals.

Add a metric that can tell you “the marginals look fine, but the joint is wrong.”

JetPrism uses a **correlation-matrix distance (Dcorr)** for this purpose. Implement it as a routine evaluation artifact: compute it per checkpoint, and refuse to declare convergence until it stabilizes alongside the marginal metrics.

### Move 4: Install an anti-memorization tripwire.

Assume a high-fidelity generator can still be cheating by memorizing.

JetPrism explicitly includes a nearest-neighbor distance ratio (**RNN**) as a memorization indicator. Turn that into a rule: you don’t get to ship a simulator surrogate unless you can show good χ²/W1 *and* a healthy RNN signal.

This is especially important when you’re using the model as a surrogate in high-stakes workflows, where “looks right” is not an acceptable validation standard.

### Move 5: Validate end-to-end for inverse problems (unfolding).

If you’re doing inverse problems, don’t stop at the generator’s training objective.

JetPrism demonstrates both unconditional generation and conditional detector unfolding, including detector smearing scales (0.5, 1.0, 2.0) and comparisons of generated kinematics vs ground truth (Figure 4) plus unfolding back to truth (Figure 5; Table 1 summarizes performance across smearing scales).

Make that your action: define an end-to-end evaluation where you check detector-level agreement *and* truth-level agreement after unfolding, because that’s where your analysis will get audited.

## What to do this week (minimal, shippable)

1) Add a “convergence gate” that requires χ²_marginal, χ²_pairwise, W1, Dcorr, and RNN to stabilize before stopping.

2) Build a synthetic stress-test suite like the paper’s 1D benchmarks (Table 3 and Figures 6–9): sharp cutoff, asymmetric bimodal, widely separated multimodal peaks, and exponential decay.

3) For any inverse workflow, require end-to-end checks (detector-level + unfolded truth-level) as part of your model card.

## Limitations to keep yourself honest

Pick thresholds that make sense for your domain and document them.

Then enforce them: JetPrism’s entire point is that “generic loss” is too easy to satisfy, so your protocol needs explicit, domain-relevant gates.

