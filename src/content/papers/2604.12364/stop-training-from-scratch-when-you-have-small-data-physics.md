---

arxivId: "2604.12364"
feed: "physics.data-an"
catchyTitle: "Stop training from scratch when you have small-data physics"
funnySubtitle: "Pretraining on jets can still help your neutrinos"
blurb: "If you\u2019re doing ML on a niche physics detector with limited labels, this paper is a practical reminder: a particle-level foundation model trained on very different collision data can transfer, improving both compute efficiency and downstream metrics at the same budget."
tldr: "Treat \u2018foundation model\u2019 as a compute strategy: pretrain once on broad particle-collision data, then transfer to your tiny domain. The paper shows pre-trained OmniLearned models reach lower validation loss at the same FLOP budget (FIG. 1) and improve classification/regression metrics across kinematic bins (FIGS. 2\u20137), which is exactly the playbook you want when labels are scarce and training is expensive."
paperTitle: "Cross-Domain Transfer with Particle Physics Foundation Models: From Jets to Neutrino Interactions"
prompts:
  - title: "Transfer-first experiment design"
    prompt: |-
      You are doing ML in a small-data domain.
      
      Input:
      - task: classification or regression
      - data_summary: size, label quality, known nuisance variables
      - available_backbones: list of pre-trained models + what they were trained on
      
      Task:
      1) Propose a transfer plan (freeze/unfreeze schedule, head choice, learning rates).
      2) Propose a baseline plan (train from scratch) with matched compute.
      3) Define 3 binning slices you will report results on (to avoid ‘average-only’ hiding failures).
      
      Output JSON with keys: transfer_plan, scratch_plan, report_slices.
  - title: "Metric slice generator (physics-style)"
    prompt: |-
      Given a dataset with continuous kinematics, propose binning schemes that make failure modes visible.
      
      Rules:
      - Include at least one slice where the problem is hardest (low energy, low multiplicity, or high noise).
      - Include at least one slice tied to known systematics.
      
      Output JSON: {slices: [{variable, bins, why_it_matters}]}

tags: ["transfer-learning", "foundation-models", "physics", "sample-efficiency", "compute-budgets", "evaluation"]
sourceUrl: "https://arxiv.org/abs/2604.12364"
publishedAt: "2026-04-15T12:00:00-04:00"
author: "Good bot"
---

## What the paper claims

If your downstream dataset is small (and your detector is unique), you should not start from random weights. Your move: treat pretraining as a reusable asset, even when the pretraining domain looks ‘different’.

They test transfer from a particle-physics foundation model trained on high-Q^2 collision data into a few-GeV fixed-target neutrino experiment (MINERvA). Your move: stop requiring ‘same detector’ for a backbone to be worth trying.

They run two task types that map cleanly to how teams actually work: (1) classification (charged-current pion final states), and (2) regression (available energy). Your move: if you’re choosing one transfer test to run first, pick the task you ship operationally, not the one that looks best in a slide.

The punchline is not only ‘better metrics’. Your move: care about compute, because the pre-trained model reaches lower validation loss at the same FLOP budget (FIG. 1), and even reaches scratch parity in fewer steps (FIG. 8).

## The 80% you should steal

### Tip 1 — Compare models at equal compute, not equal training steps

FIG. 1: validation loss vs cumulative FLOPs shows the pre-trained model reaches lower loss at the same compute budget.

Your move: report FLOPs-to-target-metric (or wall-clock-to-metric) for transfer vs scratch. If you only report ‘best final AUC’, you miss the operational win: getting there cheaper.

### Tip 2 — Use ‘time-to-parity’ as a decision metric

FIG. 8: the pretrained model reaches the scratch model’s validation loss in ~45% fewer steps (classification) and ~50% fewer steps (regression).

Your move: compute one number leadership understands: how many steps (or hours) until transfer matches the best scratch run. That’s how you justify ‘foundation-model-first’ as policy, not a hobby.

### Tip 3 — Slice metrics by kinematics to find where transfer helps

FIG. 2 caption: AUROC/AUPRC/TPR-at-fixed-FPR binned by pion energy and pion polar angle; positives are in-bin signal, negatives are fixed background.

Your move: predefine 3–5 slices (hard regime, easy regime, systematic-sensitive regime). Transfer often helps the hardest slice first, which is the only slice you should celebrate.

### Tip 4 — Use fixed-FPR operating points to make results actionable

FIG. 2 caption: TPR computed at the false positive rate of a baseline.

Your move: pick an operational FPR (or background rate) your experiment can tolerate, then optimize TPR at that point. This turns model comparisons into decisions, not pretty curves.

### Tip 5 — For regression, report both spread and bias

FIG. 5: IQR (resolution) and MPV (systematic bias) vs q3.

Your move: for any physics regression target, always report (1) a dispersion metric (IQR/RMS) and (2) a bias metric (MPV/mean shift) across slices. Better resolution with hidden bias is a trap.

### Tip 6 — Write down where the model still loses

In the text around FIGS. 2–4 they note that some regimes remain hard (for multi-pion tagging, performance can drop at high W even for pre-trained models).

Your move: when transfer wins ‘on average’, immediately identify the losing slice and decide what you’ll do (more inputs, better loss, calibration, or domain adaptation). Without this, you ship a model that fails exactly where physics is interesting.

### Tip 7 — Use compute constraints as a training design, not an excuse

They mention freezing the backbone and training only task-specific heads for a larger preset due to compute constraints.

Your move: plan a two-stage fine-tune (heads-only first, selective unfreezing second). If you can’t afford full fine-tune, make ‘what was frozen’ explicit so results are reproducible and comparable.

## What’s actually new (quickly)

The actionable novelty is the evaluation framing: equal-compute curves plus physics-motivated slices. Your move: stop relying on a single averaged score, and adopt slice reports as your default deliverable.

The other practical point is psychological: the pretraining domain can be far away in energy scale and detector tech, and transfer can still pay. Your move: expand your backbone search space beyond your subfield, then let slices tell you whether it generalizes.

This is also a template for arguing about foundation models without hype. Your move: talk in FLOPs, parity steps, and operating points, not ‘it’s a foundation model so it must be better’.

## Do this now

- Pick one downstream task you care about (tagging or energy regression) and write down your operational constraint (acceptable FPR, acceptable bias).
- Run a matched-compute bakeoff: transfer (freeze backbone then unfreeze) vs scratch. Plot validation loss vs FLOPs (FIG. 1 style), not just vs steps.
- Report results in 3–5 pre-registered kinematic slices (including the hardest slice).
- Add one operational metric: TPR at your chosen FPR, plus calibration or bias in the regression target.
- If transfer wins, write the ‘time-to-parity’ and ‘FLOPs-to-target’ numbers in your internal doc, and use them to justify a foundation-model-first workflow.
- If transfer loses, use the same slice report to diagnose why (domain shift, label noise, or missing inputs), then decide whether to add adaptation (fine-tune more layers, add domain-specific augmentation, or add systematics-aware losses).
