---

arxivId: "2602.12276"
feed: "cs.AI"
catchyTitle: "Stop Re-Rolling Every Step"
funnySubtitle: "Spend tokens where the agent is actually confused"
blurb: "Uniform ‘sample N and vote’ saturates fast in long-horizon web agents. This paper shows a simple rule: measure per-step disagreement (entropy or top-1 vs top-2 margin) and only escalate to an ‘arbiter’ model call when the step is contentious—improving success while using fewer tokens."
tldr: "If you’re running an LLM agent, don’t blindly ‘vote harder’ at every step. This paper shows that most steps are boring (high consensus), and extra arbitration can actually override the right move. Their fix (CATTS): sample candidates, compute disagreement (entropy or margin), and *only* spend extra compute on the uncertain steps. Result: up to +4.7% absolute success on WebArena-Lite (43.2% → 47.9%) while using fewer tokens, with a margin-gated variant cutting tokens by ~56% at the same top score."
paperTitle: "Agentic Test-Time Scaling for WebAgents"
prompts:
  - title: "CATTS controller (drop-in policy for any agent loop)"
    prompt: |-
      You are designing a test-time scaling controller for an LLM agent.

      Inputs each step:
      - goal: <task goal>
      - observation: <current state summary>
      - candidates: a list of proposed next-actions from the base model (N samples)

      Task:
      1) Normalize + cluster semantically equivalent candidates into action clusters.
      2) Compute vote distribution p(a) over clusters.
      3) Compute:
         - entropy H = -Σ p(a) log p(a)
         - margin Δ = p(top1) - p(top2)
      4) Decide whether to escalate to an arbiter step.

      Decision rule:
      - If H > τ_ent OR (1-Δ) > τ_mrg: escalate.
      - Else: execute the top-voted action.

      When escalating:
      - Provide the arbiter with (goal, observation, cluster representatives, and their vote counts).
      - Instruct the arbiter: "Only overrule the majority if you can cite an explicit constraint from the observation that makes the majority infeasible or clearly off-goal."

      Output JSON:
      {
        "clusters": [{"rep":...,"count":...,"members":[...]}, ...],
        "entropy": <number>,
        "margin": <number>,
        "decision": "vote"|"arbiter",
        "execute": <rep action if decision==vote else null>,
        "arbiter_prompt": <string if decision==arbiter else null>
      }

  - title: "High-consensus override postmortem (why did the arbiter break it?)"
    prompt: |-
      You are debugging an LLM-agent failure where an arbiter overruled the majority action.

      Given:
      - observation: <state>
      - candidates_with_counts: <clusters + vote counts>
      - chosen_by_vote: <action>
      - chosen_by_arbiter: <action>
      - outcome: <what went wrong>

      Do:
      1) Compute margin Δ and label the step as HIGH-CONSENSUS if Δ >= 0.7.
      2) If HIGH-CONSENSUS:
         - assume the vote winner is usually correct.
         - identify what evidence the arbiter *would have needed* to overrule safely.
         - propose a guardrail sentence to add to the arbiter prompt to prevent this class of override.
      3) If NOT high-consensus:
         - propose 3 better arbiter heuristics to break ties using the observation.

      Output:
      - diagnosis (bullet list)
      - suggested guardrail prompt text (exact string)
      - recommended τ thresholds to try next

  - title: "Action vote uncertainty dashboard (what to log in prod)"
    prompt: |-
      You are instrumenting a production agent that samples N candidate actions per step.

      Propose a minimal logging schema that lets us:
      - compute per-step entropy H and margin Δ
      - correlate disagreement with downstream success/failure
      - detect "high-consensus overrides" events
      - estimate token savings from gating

      Constraints:
      - Must not log user secrets.
      - Logs should be small.

      Output:
      1) A JSON schema with field names + types.
      2) 5 example log lines.
      3) 3 charts we should build (with axes) and what decisions each chart supports.

tags: ["agents", "test-time-scaling", "reliability", "tool-use", "evaluation"]
sourceUrl: "https://arxiv.org/abs/2602.12276"
publishedAt: "2026-02-13T19:30:00-05:00"
author: "Good bot"
---

## What the paper is really saying

If you’ve ever “fixed” an agent by cranking **N = samples per step** (or by adding a judge/reranker call every step), this paper is here to say:

- most steps don’t need it
- and sometimes it makes things worse

The core mental model is simple:

- **Most steps are chores** (click the obvious thing, keep filling the form).
- **A few steps are pivots** (one wrong click and you’re in the weeds).

Uniformly spending extra compute everywhere is like bringing a SWAT team to butter toast.

## The setup (so you know what they tested)

- Task type: long-horizon **web agents** (multi-step browser interaction)
- Base agent: ReAct-style prompting with a big model (they report using *gpt-oss-120b*)
- Benchmarks:
  - **WebArena-Lite** (165 tasks; programmatic checks)
  - **GoBrowse** (341 tasks; LLM-as-judge)

At each step, they sample **N candidate actions**, cluster semantically equivalent ones, and build a vote distribution over action clusters.

## Key results (numbers worth quoting)

From the PDF tables/captions:

- Majority vote saturates fast (WebArena-Lite):
  - **N=1:** 38.8% (96K tokens)
  - **N=10:** 43.2% (920K tokens)
  - **N=20:** 43.0% (1.8M tokens) → basically no gain for double spend

- Their best CATTS settings hit (Table 4):
  - **WebArena-Lite:** **47.9%** vs 43.2% baseline
  - **GoBrowse:** **90.4%** vs 88.0% baseline

- The spicy efficiency claim (also Table 4):
  - margin-gated CATTS matches top score (47.9%) while dropping from **920K → 405K tokens** on WebArena-Lite (≈ **56% fewer tokens**).

## The trick: measure disagreement, then gate compute

They compute disagreement directly from the sampled candidate set:

- **Entropy** of votes: higher = more disagreement
- **Margin** between top-1 and top-2 vote shares: lower = more contentious

Then they do CATTS:

- if the step looks **easy/confident** → **just vote**
- if the step looks **contentious** → **call an arbiter** (an extra LLM selection step)

The key insight is not “arbiters are good.”

It’s: **arbiters are good only when the agent is genuinely uncertain.**

### Why arbiters can hurt

They show a specific failure mode: on a high-consensus step, the arbiter can “overthink” and override a perfectly good majority decision.

Their analysis is blunt:

- tasks with **no high-consensus overrides** succeed **46.9%**
- tasks with **≥1 override** drop to **35.0%**

(That’s Figure 3’s story: overriding strong consensus is poison.)

## The 80% you should steal (actionable patterns)

### 1) Don’t scale actions uniformly — scale *decisions*

If your agent loop is:

1) sample N actions
2) vote / pick
3) execute

Change it to:

1) sample N actions
2) compute (H, Δ)
3) **if uncertain, then escalate**

This is the whole point: compute is a *resource*; use it where it can change the outcome.

### 2) Add a “don’t override consensus unless…” rule to your arbiter

This is my favorite practical takeaway.

If the vote winner is very strong (high margin), the arbiter should need an explicit reason to overrule it.

A good guardrail sentence:

> Only overrule the majority action if the observation contains explicit evidence that the majority action is infeasible or off-goal.

(Otherwise you get the classic “smart model” failure: confident + wrong.)

### 3) Log uncertainty in production (it’s a free reliability signal)

Even if you never implement CATTS, logging per-step disagreement gives you:

- a leading indicator for failures (entropy spikes)
- a way to find “pivot steps” in your trajectories
- a practical knob to tune cost/latency

Minimum metrics:

- per-step **entropy H**
- per-step **margin Δ**
- whether an arbiter was invoked
- whether the arbiter overrode the majority

### 4) Start with margin gating (it’s easy to reason about)

Entropy is nice, but margin is dead simple:

- if top1=0.9 and top2=0.1 → don’t escalate
- if top1=0.4 and top2=0.3 → escalate

It’s also easy to explain to your team when you’re justifying a cost-saving change.

### 5) Keep your clustering conservative

Voting is only meaningful if semantically-equivalent actions don’t split votes.

So:

- normalize trivial formatting
- cluster *obvious* paraphrases
- if unsure, keep clusters separate (false negatives beat false positives)

The moment your clustering merges different intents, your “uncertainty” statistic becomes fake.

## Figures & tables worth stealing (captions)

From the PDF text:

- **Figure 1.** Comparing agentic inference-time scaling methods.
- **Table 1.** Static inference-time scaling with majority vote… diminishing returns.
- **Table 2.** Arbiter scaling… improves, but can degrade at high K.
- **Figure 3.** High-consensus override analysis… success rate drops as overrides increase.
- **Figure 4.** Arbiter effectiveness varies with uncertainty… hurts at low entropy, helps at high.
- **Figure 5.** Accuracy–compute frontier… CATTS gives a better curve.
- **Table 4.** CATTS results… best success + fewer tokens.

## Skeptic check (what not to overclaim)

- Their numbers depend on their base model + benchmarks; you should treat thresholds (τ) as **tunable**, not universal.
- The approach assumes you can sample multiple actions and (optionally) run an arbiter. If you’re hard-capped at 1 call/step, you’ll need a different trick.
- Vote-derived uncertainty is useful, but it’s not magical: you still need good candidate generation and a sane action schema.

## If you build agents: the one-week implementation plan

1) Add candidate sampling (N=5 or N=10) if you don’t have it.
2) Implement conservative action clustering.
3) Log H, Δ, and “override events”.
4) Add CATTS gating with one threshold (start with margin).
5) Add the arbiter guardrail: “don’t override consensus without evidence.”
6) Run an offline replay on 50–200 tasks and plot success vs tokens.

If your agent has “pivot-step deaths,” you’ll usually see the gains quickly.
