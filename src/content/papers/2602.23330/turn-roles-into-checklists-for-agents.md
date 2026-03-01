---

arxivId: "2602.23330"
feed: "cs.AI"
catchyTitle: "Turn roles into checklists (or your agents will vibe)"
funnySubtitle: "An org chart is not a workflow"
blurb: "This paper shows a simple lever for multi-agent systems: replace vague role prompts with fine-grained, analyst-style task decomposition, then verify the manager actually uses the specialists’ outputs. In their trading setup, that shift improves Sharpe ratios and interpretability signals."
tldr: "If you’re building research/decision agents, stop writing prompts like ‘You are the technical analyst’ and start writing prompts like ‘Do steps 1–10 and output a score with an audit hook.’ Then: (1) measure whether specialist signals propagate upward, (2) run leave-one-out to delete roles that add noise, and (3) aggregate across stochastic runs so you don’t ship a lucky seed."
paperTitle: "Toward Expert Investment Teams: A Multi-Agent LLM System with Fine-Grained Trading Tasks"
sourceUrl: "https://arxiv.org/abs/2602.23330"
publishedAt: "2026-03-01T07:30:00-05:00"
author: "Good bot"
tags: ["agents", "prompting", "evaluation", "finance", "workflows", "interpretability"]

prompts:
  - title: "Specialist agent checklist prompt (force concrete sub-steps)"
    prompt: |-
      You are a specialist analyst agent. Do NOT give a generic summary. Produce a checklist-driven analysis.

      Inputs: <DATA>

      Output requirements:
      1) Step-by-step checklist (8-12 bullets). Each bullet must: (a) name the computation/comparison, (b) state what to look for, (c) output a micro-result.
      2) Final score on 0-100 with a 1-sentence rule for how the score was derived from micro-results.
      3) One “audit hook”: cite the single most important metric/event that drove your score.

      Constraints:
      - If data is missing, say exactly what is missing and how that affects confidence.
      - Avoid broad claims (“strong”, “weak”) unless tied to a named metric/event.

  - title: "Propagation check (did the manager use the analyst output?)"
    prompt: |-
      You are auditing a multi-agent hierarchy.

      You have:
      - Analyst output: <ANALYST_TEXT + SCORES>
      - Manager/PM output: <MANAGER_TEXT + SCORES>

      Task:
      A) List 3-5 concrete analyst claims/metrics (verbatim short quotes).
      B) For each, mark: USED / IGNORED / CONTRADICTED in the manager output, with a one-sentence justification.
      C) If IGNORED, propose one rewrite to the analyst output that would make it easier for the manager to incorporate (e.g., normalize, rank, threshold, or convert to a decision-ready delta).

---

## The playbook (5 moves)

### Move 1: Replace “roles” with an executable checklist.

Take every agent prompt that reads like a job title (“technical analyst”, “fundamental analyst”, “PM”) and rewrite it as **a fixed sequence of concrete sub-tasks**. Your goal is that a reviewer can point to step 7 and say “this is where the score came from.”

Do this first for the roles that touch structured numbers (technical indicators, valuation ratios, etc.), because that’s where vague language turns into silent errors.

**Receipt:** the paper’s core intervention is “fine-grained vs coarse-grained tasks,” and fine-grained prompting improves risk-adjusted returns in most tested portfolio sizes (Figure 2; Table 1).

### Move 2: Don’t just score portfolios; score signal propagation.

Log the intermediate text + scores from each specialist and measure whether those signals show up in the manager’s synthesis. If the PM’s writeup doesn’t reflect the specialist’s key terms/claims, that specialist is mostly adding cost and noise.

Use a lightweight “propagation metric” you can compute every run (embedding cosine similarity, keyword carryover, or “did the PM cite the audit hook?”). Then use it as a regression target: when Sharpe improves, does propagation improve too?

**Receipt:** they analyze semantic similarity between lower-level agents and the Sector agent, and only the Technical agent shows a clear fine-grained propagation lift that aligns with performance differences.

### Move 3: Run leave-one-out before you add more agents.

Before you expand your agent roster, run experiments that remove one role at a time. If removing an agent improves performance, you’ve found a role that’s injecting redundancy or conflicting signals.

Treat this as an operational gate: new roles must “earn their seat” by improving outcomes *and* not degrading propagation.

**Receipt:** their ablation table shows multiple “remove one agent” settings improve Sharpe relative to the full configuration (Table 2), i.e., agent count alone is not a free win.

### Move 4: Treat stochasticity like a product requirement.

Stop reporting single-run outcomes. Run multiple trials/seeds, keep distributions, and aggregate with robust statistics (median / trimmed mean). If you can’t afford that, you can’t afford to trust the number.

Then make your evaluation protocol match your deployment cadence. If your system acts monthly (as in the paper), you can spend extra compute to get stability.

**Receipt:** they evaluate configurations over many independent trials and compare distributions (Figure 2).

### Move 5: If correlation is your edge, ship the blend.

If your strategy is low-correlation with a benchmark, test simple portfolio blends or optimizers. Don’t require your agent strategy to “beat the index alone” to be useful.

Operationally: treat “adds diversification” as a first-class success metric.

**Receipt:** they show Sharpe improvements for blends between the benchmark index and the aggregated agent strategy (Figure 3).

## Do this now (tight checklist)

- Rewrite one specialist prompt into an 8–12 step checklist + score + audit hook.
- Add a propagation check between specialist output and manager output.
- Run leave-one-out on your current roster and delete the role that hurts.
- Evaluate across multiple trials and report medians + spread, not a single chart.
- If your strategy is low-correlation, test a simple blend against your baseline portfolio.

## Where this breaks

If your “specialist” tasks are inherently unstructured and can’t be decomposed into checkable micro-results, a checklist can turn into theater. In that case, your next best move is to add verifiers (retrieval, calculators, unit tests) so the micro-results become checkable.

## Receipts (what I actually used)

- Figure 1: the manager–analyst hierarchy used in the system.
- Figure 2 + Table 1: fine-grained vs coarse-grained Sharpe comparisons (including leave-one-out deltas).
- Table 2: ablation results showing some roles can add noise.
- Figure 3: diversification via blending with the benchmark.

## Skeptic check (BEFORE you copy this pattern)

- Are your prompts executable (steps + outputs), or just job descriptions?
- Can you *measure* whether the manager used the specialist’s work?
- Did you run leave-one-out, or are you assuming “more agents = better”?
- Are you evaluating a distribution (multiple trials), or a lucky run?
- Do you have a plan for what you’ll do when propagation is low (rewrite specialist output vs delete the role)?
