---

arxivId: "2603.00259"
feed: "physics.data-an"
catchyTitle: "Derive your seasons before you fit your dynamics"
funnySubtitle: "‘Just detrend it’ is how you get lied to by residuals"
blurb: "This paper lays out a practical workflow for weather-like time series where residuals stay non-Gaussian and heteroskedastic after filtering: derive regimes from annual-cycle phase, fit pseudo-stationary per-regime transition models (often Markov), and generate realistic fluctuation trajectories you can stitch across regimes."
tldr: "If your ‘detrended’ residuals still change variance/shape over the year, stop forcing one stationary model. Build data-driven regimes from baseline phase (not calendar months), fit a simple transition model per regime, and validate by simulation (ACF + tail rates + histogram match). Use it as a scenario generator for stress tests and uncertainty bands."
paperTitle: "Data-driven, non-Markovian modelling of weather in the presence of non-stationary, non-Gaussian, and heteroskedastic climate dynamics"
prompts:
  - title: "Regime-drift checklist (when residuals aren’t stationary)"
    prompt: |-
      You have a time series with seasonality removed.

      Task: list the 5 fastest checks to determine whether the residual is (a) stationary, (b) Gaussian, and (c) homoskedastic within the year.

      Output: a checklist with ‘what to plot’ and ‘what failure looks like’.

      Series description: <YOUR SERIES>

tags: ["time-series", "nonstationary", "heteroskedasticity", "markov", "weather", "simulation"]
sourceUrl: "https://arxiv.org/abs/2603.00259"
publishedAt: "2026-03-03T07:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Prove your residuals are lying to you (before you pick a model).

Slice your “detrended/filtered” residuals by time-of-year and compare both variance and *shape* (histograms, tail rates).

Do this because if winter and summer residuals have different distributions, a single stationary model is guaranteed to average away the behavior you care about.

**Receipt:** Figure 1 shows Boulder temperatures where winter spread is larger and filtered fluctuations remain asymmetric; summer vs winter behave differently.

### Move 2: Replace calendar seasons with data-driven regimes.

Build a smooth annual baseline and map each timestamp into (baseline, baseline-derivative). Discretize into microstates and then **cluster microstates into regimes** based on the residual histograms they induce.

Do this so your “season” labels reflect the system’s fluctuation behavior, not the calendar.

**Receipt:** Figure 4 shows baseline phase-space partitioning and clustering that yields three regimes (summer, winter, equinoctial) with distinct histograms.

### Move 3: Fit dynamics *inside* regimes under a pseudo-stationary assumption.

Within each regime, treat each contiguous segment as pseudo-stationary and fit a simple state-based transition model.

Do this because forcing one global model makes you carry regime changes as “mystery nonstationarity” instead of a tractable switch.

**Receipt:** the workflow constructs per-season models and treats segments as pseudo-equilibrium trajectories.

### Move 4: Prefer Markov models when the learned memory is effectively one-step.

Start from a generalized master equation view, but test whether the memory kernel is delta-like (dominant at one step). If it is, collapse to a Markov state model.

Do this because Markov models are easy to simulate, debug, and stitch across regimes.

**Receipt:** Figure 5 presents per-season Markov stochastic matrices and uses them to generate realistic fluctuations.

### Move 5: Validate by simulation, not just point-forecast error.

Generate synthetic trajectories and compare: autocorrelation structure (colored noise), tail-event frequency, and within-regime histograms.

Do this because the goal here is realistic fluctuation behavior (for scenarios/stress tests), not just a one-step MSE score.

**Receipt:** Figure 5 (generated time series) and Figure 6 (time-dependent histogram match) are evaluated as “does the synthetic data look statistically right.”

## Do this now (tight checklist)

- Run residual diagnostics by time-of-year (variance + histogram shape + tail rates).
- Build baseline phase features (baseline, baseline-derivative) and derive regimes by clustering microstates.
- Fit a per-regime Markov transition model over bins; generate synthetic trajectories.
- Compare ACF + tail probabilities + histogram match; adjust bin resolution to your data budget.
- Deploy as a scenario generator alongside your forecaster (stress tests, uncertainty bands, extreme-event checks).

## Where this breaks

- If you don’t have enough samples per regime, transition estimates get noisy; your resolution must drop.
- If you need point-forecast superiority, this alone won’t replace modern ML forecasters without extra covariates/features.
- If your clustering choices are unstable, you can end up with regimes that don’t generalize year-to-year.

## Receipts (what I actually used)

- Figure 1: filtered residuals can stay non-Gaussian and heteroskedastic; month slices differ.
- Figure 4: regime discovery via baseline phase-space + clustering on histogram features.
- Figure 5: per-regime Markov transition matrices + generated colored, non-Gaussian fluctuations.
- Figure 6: time-dependent histogram match for a stitched multi-season realization.

## Skeptic check (BEFORE prompts)

- Are you checking residual *shape* by time-of-year, or only mean/variance?
- Are your regimes defined by the data (baseline phase + histogram behavior), or by the calendar?
- Is your model being judged by simulation stats (ACF + tails + histogram), or only by point error?
- Did you choose your bin width / number of states based on data budget (enough transitions), not aesthetics?
- Do you have a plan for regime drift across years (re-cluster periodically, or fix regimes and monitor)?
