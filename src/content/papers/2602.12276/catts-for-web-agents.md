---
arxivId: "2602.12276"
catchyTitle: "Stop Paying Your Agent to Overthink"
funnySubtitle: "If the votes are 9–1, don’t bring in a second judge to ‘get creative.’"
blurb: "CATTS is a simple rule for tool-using agents: sample multiple next-actions, look at how much they agree, and only spend extra ‘arbiter’ compute when the step is genuinely contentious. Better success, fewer tokens, fewer self-inflicted detours."
tldr: "Sample N candidate actions, cluster them, and treat the vote distribution as your agent’s ‘uncertainty meter.’ If entropy is high (or top-1 vs top-2 margin is low), call a stronger selector (arbiter). If the step is high-consensus, just take the majority action—because arbiters can override correct consensus and tank the run."
prompts:
  - title: "Add CATTS-style gating to my agent loop"
    prompt: |-
      You are helping me add confidence-aware test-time scaling to a multi-step, tool-using LLM agent.

      Context:
      - At each step, I can sample N candidate actions from the same base model.
      - I can optionally call an additional ‘arbiter’ model to choose among candidates (extra cost).

      Task:
      1) Propose a concrete per-step algorithm that:
         - clusters semantically equivalent actions,
         - computes uncertainty from the vote distribution,
         - gates whether to call an arbiter,
         - logs the decision so we can debug failures.
      2) Give default thresholds for BOTH entropy-gating and margin-gating.
      3) List 5 failure modes (including “arbiter overrides high-consensus”) and how to detect each from logs.

      My agent details:
      - Action format:
        <paste your action schema>
      - Environment/tooling:
        <paste tools + constraints>

  - title: "Turn vote-disagreement into a ‘step budget’"
    prompt: |-
      You are an optimization engineer.

      I have an agent that runs for T steps. For each step t, I can compute:
      - H_t = entropy of votes over candidate actions
      - Δ_t = top-1 minus top-2 vote margin

      Task:
      - Propose a policy that allocates extra compute (more samples N_t and/or an arbiter call) to at most 40% of steps.
      - Use only H_t and Δ_t (no token logprobs).
      - Include pseudocode.
      - Explain how to tune thresholds on a small validation set without overfitting.

      Constraints:
      - Latency matters.
      - I prefer interpretable rules.

  - title: "Debug an agent ‘pivot-step’ failure"
    prompt: |-
      You are a postmortem debugger for a long-horizon agent.

      I will paste a trajectory. For each step, you will extract:
      - the top 3 clustered actions and their vote counts (n_t)
      - H_t (entropy) and Δ_t (top-1/top-2 margin)
      - whether an arbiter was invoked
      - whether the arbiter overrode the majority

      Then:
      1) Identify the most likely pivot step(s) where the run went off the rails.
      2) Recommend a CATTS threshold change OR a “never arbitrate when Δ_t > X” rule.
      3) Recommend one extra log line that would have made this diagnosis obvious.

      Trajectory:
      <paste trace with candidates + chosen action>

tags: ["agents", "tool-use", "reliability", "inference", "efficiency"]
sourceUrl: "https://arxiv.org/abs/2602.12276"
publishedAt: "2026-02-13T08:00:00-05:00"
author: "Good bot"
---

## What the paper claims (in one mental image)

Imagine your web agent as a little committee trapped in a browser tab.

- You ask the committee, “What should we do next?”
- Ten members shout answers.
- Sometimes it’s a boring landslide: **9 people yell “scroll”**.
- Sometimes it’s chaos: **2 say click, 2 say type, 3 say search, 3 say go back**.

The paper’s point is brutally practical:

- When it’s a landslide, **don’t waste money on a fancy judge**. Just do the obvious thing.
- When it’s chaos, **that’s when extra compute can actually change the outcome**.

They call this Confidence-Aware Test-Time Scaling (**CATTS**):

1) sample N candidate actions
2) cluster duplicates (so “N/A” vs “Not found” doesn’t split votes)
3) compute uncertainty from the vote distribution
4) **only invoke an arbiter when uncertainty is high**

## The key mechanism (what to steal)

At step *t* you sample N actions, cluster them, and get a vote distribution:

- p_t(a) = n_t(a) / N

Then compute a cheap uncertainty signal:

- entropy: H_t = −Σ_a p_t(a) log p_t(a)
- margin: Δ_t = p_t(top1) − p_t(top2)

CATTS gating rule (their core idea):

- if uncertainty is low → **majority vote**
- if uncertainty is high → **call arbiter** (an extra LLM call that reasons over candidates)

This avoids a nasty failure mode they observe:

- **arbiter override on a high-consensus step** can derail the whole trajectory

## Figure/table captions worth knowing (from the PDF)

A few captions basically summarize the whole story:

- **Figure 1.** “Comparing agentic inference-time scaling methods… CATTS conditionally invokes the arbiter only when vote-derived uncertainty… exceeds threshold τ.”
- **Table 1.** “Static inference-time scaling with majority vote… yields diminishing returns… motivates stronger selection mechanisms…”
- **Table 4.** “CATTS results… gains over majority vote… while using fewer tokens… margin-gated CATTS… 56% reduction vs. majority vote.”
- **Figure 5.** “Accuracy–compute frontier… CATTS achieves Pareto improvements…”

(Translation: you can get **more success per dollar** if you stop treating every step like it deserves a debate.)

## The 80% you should steal (reader tips)

### Tip 1 — Treat “agreement” as a first-class signal
If you can sample multiple candidates, you can measure whether the model *agrees with itself*.

Practical rule of thumb:
- **high agreement** ⇒ don’t over-engineer selection
- **low agreement** ⇒ selection quality matters; spend compute here

### Tip 2 — Never arbitrate a landslide
If Δ_t is big (clear winner), arbitration is mostly a chance to do something stupid.

A simple guardrail:
- **If Δ_t ≥ 0.7, skip arbiter.**

This is exactly the “arbiter overrode 9/10 ‘scroll down’ and face-planted” class of failure.

### Tip 3 — Separate three things: sampling, clustering, selecting
A lot of “voting doesn’t work” is actually “we counted wrong.”

Steal their pipeline shape:
1) **generate** candidates
2) **semantic dedupe/cluster** candidates
3) **aggregate** votes OR ask a selector

If you skip (2), your vote distribution is garbage.

### Tip 4 — Use entropy/margin when you don’t have logprobs
Many “confidence” methods require token logprobs you don’t get from API models.

CATTS uses what you *do* have:
- the sampled action set
- the counts

That makes it deployable.

### Tip 5 — Think in “pivot steps”
In long-horizon tasks, most steps are filler. A few steps decide the run.

Your job is to:
- detect pivots (high entropy / low margin)
- concentrate compute and scrutiny there

### Tip 6 — Log override events like they’re production incidents
If you do use an arbiter, log:
- (H_t, Δ_t)
- top-1 action and count
- arbiter pick
- did arbiter override majority?

Then you can actually fix things instead of vibe-debugging.

## A concrete CATTS-ish recipe you can implement today

At each step:

1) sample N candidate actions from base model
2) cluster equivalent actions
3) compute H_t and Δ_t
4) if (H_t > τ_ent) OR (Δ_t < τ_mrg): call arbiter
5) else: execute majority action

Defaults that usually won’t embarrass you:
- τ_ent ≈ 0.5 (more entropy → more arbitration)
- τ_mrg ≈ 0.3 (smaller margin → more arbitration)
- hard rule: never arbitrate if Δ_t ≥ 0.7

## Why this matters for “humans using AI better”

If you’re building assistants for real users (workflows, tools, agents), you don’t just want higher benchmark scores.
You want:

- fewer expensive calls
- fewer surprise detours
- more predictable behavior under a budget

CATTS is a clean, interpretable knob that turns “let’s sample more” into “let’s sample *where it counts*.”
