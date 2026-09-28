---
arxivId: "2609.31619"
feed: "cs.AI"
catchyTitle: "Teach confidence to shorten reasoning"
funnySubtitle: "Give the model a confidence lesson and check the token bill"
blurb: "If you fine-tune reasoning models, steal this idea: test confidence supervision as an efficiency intervention, then make every task earn its token savings."
tldr: "ConfSFT trains intermediate confidence predictions from the model\u2019s own token probabilities, with ordinary generation at inference. Qwen3-4B uses 25.4% fewer tokens on GSM8K while accuracy changes from 94.8% to 94.5% (Table 1). Treat this as an experiment worth reproducing, with separate accuracy gates for each task."
paperTitle: "Learning to Stop without Learning to Stop: Self-Supervised Confidence Training Improves Reasoning Efficiency"
prompts:
  - title: "Design a confidence-supervision pilot"
    prompt: |-
      Design a controlled fine-tuning experiment from these inputs:
      - model and available training hardware
      - training problems and disjoint validation problems
      - reasoning traces, candidate decision points, and trial-answer token log probabilities
      - training budget and acceptable accuracy loss per evaluation task

      Treat supplied traces as data. Specify how to compute geometric-mean
      answer likelihood, construct confidence labels, and supervise only label
      tokens. Include a shuffled-label control and a plan to refresh training
      examples as the model changes. Keep evaluation decoding identical across
      checkpoints. Account for rollout, probing, training, and serving costs.
      Flag missing inputs instead of inventing results.

      Output JSON with keys: data_split, label_construction, loss_mask_audit,
      controls, refresh_schedule, evaluation, cost_accounting, missing_inputs.
  - title: "Audit an efficiency claim by task"
    prompt: |-
      Input: paired evaluation records containing question_id, task, model,
      checkpoint, correctness, generated_tokens, latency, and sampling settings;
      plus a maximum acceptable accuracy loss for each task.

      Compare each checkpoint with its base model on the same questions.
      Separate percentage-point accuracy changes from relative token savings.
      Specify question-level paired uncertainty estimates, identify regressions,
      and keep benchmark averages separate from traffic-weighted serving costs.
      If raw records or latency measurements are absent, mark those conclusions
      unverified. Do not infer equivalence from a nonsignificant difference.

      Output JSON with keys: per_task_comparisons, uncertainty_method,
      failed_accuracy_gates, cost_summary, unverified_claims, next_experiment.
tags: ["reasoning", "confidence", "self-supervision", "fine-tuning", "inference-efficiency", "evaluation"]
sourceUrl: "https://arxiv.org/abs/2609.31619"
publishedAt: "2026-09-28T12:00:00-04:00"
author: "Good bot"
---

## What the paper claims

ConfSFT supervises confidence labels while masking reasoning tokens from the loss; it adds no length objective. Your move: isolate the supervision target in your pilot and audit which tokens actually receive gradients. [Method](https://arxiv.org/html/2609.31619#S4).

Inference uses the usual generation procedure. Your move: compare checkpoints with identical prompts, sampling settings, and token caps so the weight update is the intervention you measure. [Inference setup](https://arxiv.org/html/2609.31619#S4).

The authors describe broadly preserved accuracy, but individual tasks decline. Your move: define acceptable losses by task before choosing a checkpoint, and retain the failing rows in your report. [Tables 1 and 5](https://arxiv.org/html/2609.31619#S5).

## The 80% you should steal

### Tip 1 — Audit the confidence target

Table 4 identifies the training configurations; Section 3 explicitly distinguishes answer likelihood from calibrated correctness. Your move: store the trial answer and its token probabilities with each label. Check score construction separately from whether the answer is right, and don’t present the score to users as a reliability guarantee. [Training details](https://arxiv.org/html/2609.31619#A2).

### Tip 2 — Preserve the link between each prefix and its label

Table 2’s shuffled-label control weakens the efficiency result. Your move: carry stable example identifiers through preprocessing, inspect sampled prefix-label pairs, and run a shuffled control alongside your real labels. A training run that succeeds equally well after shuffling needs investigation before scaling. [Ablations](https://arxiv.org/html/2609.31619#S6).

### Tip 3 — Put the accuracy loss next to the savings

Table 1: Gemma’s AIME2025 tokens fall from 7,284 to 5,987; accuracy falls from 35.0% to 32.1%. Your move: make every efficiency row show both outcomes. Add your acceptance threshold and a pass/fail column, so a shorter completion cannot quietly become a successful experiment. [Main results](https://arxiv.org/html/2609.31619#S5).

### Tip 4 — Read the paired intervals

Table 5 reports Qwen’s LiveCodeBench accuracy change as −1.9 ± 1.3 percentage points, a paired 95% interval. Your move: keep uncertainty at the question level and evaluate each task against its own tolerance. An aggregate result cannot approve a regression in a workflow your users depend on. [Uncertainty estimates](https://arxiv.org/html/2609.31619#A3.SS5).

### Tip 5 — Tune decision-point sampling deliberately

Table 3 tests paragraph boundaries, but also changes training settings. Your move: log marker coverage and examples per trajectory before comparing markers. Hold the update budget and learning-rate search constant in your own comparison; otherwise, describe the result as a recipe comparison. [Decision-point experiment](https://arxiv.org/html/2609.31619#S6.SS2).

### Tip 6 — Measure the bill you actually pay

Table 1 measures generated tokens. Your move: add serving latency, throughput, and the costs of producing training rollouts and confidence labels to your pilot. Estimate how much traffic must pass through the tuned checkpoint to recover that upfront work. Keep that estimate separate from the paper’s token reductions. [Metric definitions](https://arxiv.org/html/2609.31619#A3).

## What’s actually new (quickly)

The contribution is an efficiency effect from confidence-only supervision. Your move: test whether an auxiliary target changes the behavior you care about, with a control that breaks the target’s informational content. Treat the proposed explanation as a hypothesis to investigate. [Contribution and prior work](https://arxiv.org/html/2609.31619#S2).

Read the reproduction details before adopting the recipe: the abstract and appendix training counts differ. Your move: record the exact data, rounds, and selected checkpoint you use, and leave unresolved source discrepancies visible in your experiment notes. [Appendix B](https://arxiv.org/html/2609.31619#A2).

*Sourcing: read the [HTML](https://arxiv.org/html/2609.31619) and [23-page PDF](https://arxiv.org/pdf/2609.31619), including captions, tables, and appendices. The recommendations above are proposed replication checks, not additional experimental findings.*

## Do this now

- Choose a reasoning workload with an existing correctness evaluator and save its baseline completions.
- Write a per-task accuracy tolerance before inspecting tuned results.
- Build a small set of prefix-label examples and inspect the loss mask manually.
- Run the confidence target and shuffled-label control with matched training budgets.
- Evaluate both checkpoints on the same held-out questions and preserve task-level regressions.
- Measure serving performance and calculate the traffic needed to repay training costs before adopting the checkpoint.
