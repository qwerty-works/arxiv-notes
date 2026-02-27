---
arxivId: "2602.23271"
catchyTitle: "Make your research agent repeatable"
funnySubtitle: "Stop shipping a slot machine with citations."
blurb: "If the same ‘deep research’ query gives different conclusions across runs, treat it as a reliability bug. This paper shows how to measure variance over answers/findings/citations and how to reduce it: stabilize early queries and constrain inference with structured outputs. Combined mitigations cut average stochasticity by ~22% while improving accuracy in DeepSearchQA."
tldr: "Run k≥10 repeats; score disagreement on answers, findings, and citations. If variance is high, spend effort on (1) early query stability and (2) structured belief updates. Don’t assume temperature=0 over APIs is deterministic—measure it."
paperTitle: "Evaluating Stochasticity in Deep Research Agents"
prompts:
  - title: "k-run stochasticity harness"
    prompt: "Design a harness to run the same research-agent query k>=10 times. Log: final answer; atomic findings; citation URLs; step-1 queries. Then define a simple disagreement score for each (answers/findings/citations) after canonicalization (URL normalization + clustering paraphrases). Output thresholds for: ‘safe to ship’ vs ‘needs stabilization’."
  - title: "Structured belief update JSON"
    prompt: "When integrating evidence, output ONLY JSON:
{\"claims\":[{\"claim\":...,\"urls\":[...],\"status\":\"supported|uncertain\"}],\"next_queries\":[...]}
Rule: no supporting URL => status=uncertain + add next_queries."
tags:
  - "agents"
  - "evaluation"
  - "reliability"
  - "rag"
sourceUrl: "https://arxiv.org/abs/2602.23271"
publishedAt: "2026-02-27T07:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)
### Move 1: Measure stochasticity explicitly (don’t argue from vibes)
Operator move: run the *same* query k≥10 times and log (a) final answer, (b) extracted atomic findings, (c) citation URLs.
Metric: compute a variance/disagreement score per level; if citations are stable but findings aren’t, your inference step is the noisy module.
Guardrail: normalize URLs + cluster paraphrased findings before scoring, or you’ll mistake style for variance.
Receipt: Figure 1 lays out a pipeline: multi-run outputs → canonicalize → compute normalized ‘total variance’.
### Move 2: Stabilize early steps first (they’re variance multipliers)
Decision rule: if you can only fix one thing, reduce randomness in step 1 (querying). Early variance propagates and dominates end variance.
Operator move: make step-1 query generation templated/deterministic and cache retrieval where possible.
Check: re-run k times; end-to-end variance should drop even before you touch the final writer.
Receipt: Figure 2 caption: early-stage injections dominate propagation.
### Move 3: Clamp inference with structured outputs (schema > free-form notes)
Operator move: force summarization + belief update to emit a fixed schema (JSON/Markdown table) like claim→supporting URL(s)→status.
Pitfall + guardrail: free-form ‘notes’ drift; require ‘no URL support → uncertain’ to prevent confident divergence.
Metric: track both content variance and count variance (how many findings/citations). Don’t ‘improve stability’ by saying less.
Receipt: Figure 2 caption: the Update (inference) module contributes the largest variance. Table 4 reports structured outputs reducing average variance while improving accuracy.
### Move 4: Use an early query ensemble intersection (then anneal)
Operator move: generate N query sets at step 1, keep the intersection/majority queries to proceed, then reduce N→1 after the first step.
Decision rule: spend your ensemble budget early; later steps have diminishing returns once the evidence set is set.
Guardrail: if intersection is empty, fall back to the best single set to avoid deadlocks.
Receipt: Section 6.2 describes intersection-based query filtering with N→1 annealing.
### Move 5: Assume APIs are non-deterministic until proven otherwise
Pitfall: temperature=0 is not a guarantee for hosted inference; treat ‘repeatability’ as a property you must test.
Operator move: measure variance on your real deployment path (API + tools + caching), not on a local, idealized setup.
Check: if you can’t drive variance down with temperature, switch to algorithmic mitigations (structured outputs + early query stabilization).
Receipt: The PDF appendix includes API-setting results (Table 5) motivating mitigation beyond temperature tuning.
## Do this now (checklist)
- Add a k-run harness (k≥10) and score variance on answers/findings/citations.
- If findings variance > citations variance, stabilize inference first with structured belief updates.
- Stabilize step 1: deterministic query templates + (optional) early query intersection ensemble.
- Track count variance so you don’t ‘cheat’ by outputting fewer findings.
- Gate releases on: lower variance at non-worse accuracy on a small suite (5–20 queries).

## Where this breaks
Non-stationary domains (fresh news) will have real citation drift; use caching + timestamps as the guardrail, not identical outputs.
Over-tight schemas can make the agent brittle; allow ‘uncertain’ claims instead of forcing a claim.
## Skeptic check (before you copy this)
- Are you scoring user-visible disagreement (conclusions), not token-level changes?
- Did you separate ‘different evidence’ (citations) from ‘different interpretation’ (findings/answer)?
- Did you test more than one demo query?

## Receipts
- Figure 1: evaluation pipeline for answers/findings/citations + normalized total variance.
- Figure 2: early variance propagates; update module dominates; higher temperature increases variance.
- Table 3: findings are more stochastic than citations (reported averages: findings TV ~0.76 vs citations ~0.44).
- Table 4: combined mitigations reduce average stochasticity from ~0.69 to ~0.47 (~22%) and raise accuracy (0.24 → 0.36).
