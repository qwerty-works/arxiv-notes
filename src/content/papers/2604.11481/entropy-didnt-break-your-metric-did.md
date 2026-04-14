---

arxivId: "2604.11481"
feed: "physics.data-an"
catchyTitle: "Entropy didn't break, your metric did"
funnySubtitle: "Coarse-grain first, panic later"
blurb: "When a system self-organizes, it can look 'more ordered' in a coarse spatial field while the underlying dynamics get more complex. This paper offers a transport-based framework (Lagrangian–Eulerian maps, deformation tensors, nonlocal displacement fields) and a Landau–Ginzburg coarse-grained view to make that trade-off explicit, with diagnostics on cosmological structure formation."
tldr: "If you're analyzing or generating complex structure, separate local distribution-matching from nonlocal transport effects. Measure order/entropy at multiple description levels, and use transport-aware diagnostics to tell whether you're actually creating connectivity or just reshaping histograms."
paperTitle: "Emergence of Complex Structures"
prompts:
  - title: "Two-level complexity audit"
    prompt: |-
      You are diagnosing whether a generative model is creating REAL structure or just matching local statistics.

      Input:
      - Dataset samples (real vs generated)
      - A coarse observable (e.g., spatial field, graph, image)
      - A richer state representation (latents, flows, velocities, features)

      Task:
      1) Propose one metric for coarse-level 'order' and one for rich-state 'complexity'.
      2) Propose one diagnostic for nonlocal connectivity (e.g., transport/flow, long-range correlation, scale coupling).
      3) Provide an experiment plan with 3 plots that would falsify 'it's just histogram matching'.

      Output as a checklist with metric definitions and expected failure signatures.

tags: ["data-analysis", "nonlocality", "transport", "entropy", "coarse-graining", "non-gaussianity"]
sourceUrl: "https://arxiv.org/abs/2604.11481"
publishedAt: "2026-04-14T12:00:00-04:00"
author: "Good bot"
---

## What the paper claims

When a system forms visible structure, **“entropy increased” and “it got more ordered” can both be true**, because those statements can refer to different description levels.

**Your move:** whenever you say “my model got simpler/more complex”, write down (a) *what representation* you measured and (b) *what you’re holding fixed* (coarse field vs full state).

## The 80% you should steal

### Tip 1 — Track two entropies (or you will lie to yourself)
They make the distinction explicit: projected spatial fields can look more ordered while the underlying phase-space state becomes more intricate (the paper illustrates this split with shell crossing and multistreaming).

**Your move:** pick one metric for your coarse observable (field, image, graph) and one for your richer state (latents, flows, velocities, features), then plot them together as training or dynamics progress.

### Tip 2 — Separate “local remapping” from “nonlocal structure creation”
They contrast local nonlinear transformations (which can match one-point statistics) with nonlocal transport effects that create filamentary connectivity and scale coupling.

**Your move:** benchmark your generator against two baselines: (1) a pointwise transform that matches histograms, and (2) a transport-aware model. If your method only beats (1), you are not generating structure, you are re-coloring noise.

### Tip 3 — Diagnose nonlocality through transport features
The framework encodes long-range interaction or information flow in the displacement/transport field, which is the mechanism that couples scales and produces non-Gaussianity.

**Your move:** compute a transport proxy (learned flow, displacement, attention-based influence, or a fitted map between “initial” and “final” representations) and test whether it predicts long-range correlations better than local features.

### Tip 4 — Use a thresholded “activation” model for structure
Their Landau–Ginzburg interpretation treats anisotropy growth like switching to a lower effective free-energy branch, with clear density thresholds for when anisotropy becomes relevant.

**Your move:** fit a simple activation curve for your structure metric (nearly flat below a threshold, rising above it). Use it as a diagnostic: does your model trigger structure too early (hallucinated connectivity) or too late (over-smoothed)?

### Tip 5 — Prefer early-warning nonlocal indicators
They argue the nonlocal tidal level becomes relevant already at moderate overdensity, earlier than more local curvature-sensitive measures.

**Your move:** add at least one explicitly nonlocal indicator to your monitoring stack, and treat it as an early-warning signal for “real structure is forming”.

## What’s actually new (quickly)

The new contribution is a **unified mesoscopic language** that ties together transport geometry, information-theoretic baselines, and a coarse-grained effective model, so you can talk precisely about “order” without mixing levels of description.

**Your move:** turn the paper into a checklist for your own domain: what is your transport map, what is your coarse projection, and what are your nonlocal diagnostics?

## Do this now

- Write down your two representation levels (coarse observable, richer state) and choose one metric for each.
- Build a “histogram-matching” local baseline and prove to yourself whether your method creates connectivity beyond that.
- Add one transport/nonlocal diagnostic (flow, displacement proxy, long-range correlation, scale coupling) and track it over time.
- Fit a thresholded activation curve for your structure metric, and use it to compare models at a glance.
