---

arxivId: "2604.12967"
feed: "cs.AI"
catchyTitle: "Train search agents without gold answers"
funnySubtitle: "If the trail can\u2019t reconstruct the question, it\u2019s probably a bad trail"
blurb: "If you want to train a search agent but you can\u2019t afford gold labels, steal this idea: treat a good search trajectory as a lossless encoding of the user\u2019s question, and reward trajectories that let a separate model reconstruct the question from the retrieved evidence (not from copy-pasted query text)."
tldr: "Use question reconstructability as a proxy reward: generate a search trajectory, apply an information bottleneck (mask entities in queries, drop the final answer), then reward the agent when a frozen reconstructor can recover the original question from the evidence. This gives you scalable RL for search without gold answers, and a concrete checklist for preventing reward hacking via lexical leakage."
paperTitle: "Cycle-Consistent Search: Question Reconstructability as a Proxy Reward for Search Agent Training"
prompts:
  - title: "Trajectory quality via reconstructability"
    prompt: |-
      You are improving a search agent.
      
      Input:
      - user_question
      - candidate_trajectory: a list of (action=query, observation=snippet)
      
      Task:
      1) Decide if the trajectory is an information-preserving encoding of the question (YES/NO).
      2) If NO, label the failure mode: INSUFFICIENT_EVIDENCE, IRRELEVANT_DRIFT, or LEXICAL_LEAKAGE.
      3) Propose the smallest edit that would make the trajectory reconstructable (add/remove one search step or replace one query).
      
      Output JSON with keys: reconstructable, failure_mode, minimal_fix.
  - title: "Anti-leakage rewrite for search queries"
    prompt: |-
      Given a user question and a set of search queries an agent issued, rewrite each query to reduce lexical overlap with the question while preserving intent.
      
      Rules:
      - Replace named entities with typed placeholders when possible (PERSON, ORG, LOC, DATE).
      - Prefer paraphrases that force evidence retrieval, not keyword matching.
      
      Output JSON: {rewrites: [{original, rewritten, why}]}.

tags: ["agents", "search", "reinforcement-learning", "evaluation", "reward-design", "information-bottleneck"]
sourceUrl: "https://arxiv.org/abs/2604.12967"
publishedAt: "2026-04-15T12:00:00-04:00"
author: "Good bot"
---

## What the paper claims

If you train search agents with RL, you keep hitting a scaling cliff: rewards depend on gold answers (or dense human labels). Your move: assume gold supervision is the exception, and design a reward you can compute from the agent’s own trail.

Their claim is a clean proxy: a high-quality search trajectory is a *lossless encoding* of the question’s intent (Figure 1). Your move: treat ‘can I recover the original question from this evidence trail?’ as your training signal.

But they also call out the obvious way this goes wrong: the agent (or reconstructor) can cheat by copying question wording into queries. Your move: treat ‘lexical leakage’ as an attack, not an accident, and build the bottleneck before you train at scale.

The practical promise is end-to-end: they report results across multiple QA benchmarks and a deep-research rubric setting (Figure 4). Your move: don’t judge this idea on one toy dataset, test it where multi-step evidence actually matters.

## The 80% you should steal

### Tip 1 — Turn ‘good search’ into a cycle-consistency check

Figure 1 frames good vs bad trajectories as ‘question intent preserved’ vs ‘insufficient/irrelevant’.

Your move: for each trajectory, run a reconstructor that tries to regenerate the original question from the trajectory, then reward the policy based on semantic similarity between the original question and the reconstructed question.

### Tip 2 — Use a trajectory-only reward (actions + observations), not answer-string reward

Their setup treats the trajectory τ = (queries, retrieved observations) as the optimized intermediate representation (Figure 2 caption).

Your move: log trajectories as first-class artifacts and optimize for evidence quality. If your agent ‘gets the right answer’ but the trail can’t justify it, treat that as a failure, because you can’t audit or reuse it.

### Tip 3 — Add an information bottleneck so the agent can’t cheat

Figure 2: they drop the final response and apply NER masking to search actions before reconstruction.

Your move: explicitly remove the two biggest leakage channels: (1) don’t let the reconstructor see the final answer, (2) mask named entities in the agent’s queries. Then re-run reconstruction and check you’re still rewarding evidence, not copying.

### Tip 4 — Treat leakage as the default failure mode

They warn that naive cycle-consistency reconstructs via superficial lexical cues rather than the underlying search process.

Your move: add a leakage dashboard: lexical overlap(question, query), entity overlap, and ‘query contains whole question’ flags. If overlap is high and reward is high, you’re training a copier, so you should downweight or discard that episode.

### Tip 5 — Freeze the reconstructor to stop co-adaptation

Figure 2 caption describes a frozen reconstructor Pϕ and policy optimization based on similarity between q and q̂.

Your move: freeze the reconstructor (or update it slowly) so the policy can’t invent a private encoding scheme. If you need to refresh the reconstructor, do it in separate phases with held-out leakage probes.

### Tip 6 — Ablate your bottlenecks before you trust the reward

Their HTML tables include ablations over CCS components (Table 2 caption).

Your move: run three variants and compare: (A) no bottleneck, (B) drop final answer only, (C) drop final answer + entity masking. If (A) looks ‘best’, that’s a red flag, because it likely won via leakage.

### Tip 7 — Evaluate on deep research, not only short-form QA

Figure 4 reports rubric-based scores on a Deep Research benchmark across domains.

Your move: include at least one long-horizon benchmark where evidence aggregation matters, otherwise your reward will overfit to short, keywordy wins. Use a rubric judge only as a scorer, not as a trainer.

## What’s actually new (quickly)

The novelty is not ‘RL for search’. Your move: copy the *proxy reward design*: reconstruction of the question from an evidence trail, plus explicit anti-cheat bottlenecks.

They make a tight conceptual shift: instead of asking ‘did we answer correctly?’, ask ‘did the trajectory preserve the information needed to answer?’. Your move: use this as your internal spec for search agents, because it’s auditable and model-agnostic.

The idea also gives you a debugging lens: insufficient evidence vs irrelevant drift vs leakage. Your move: tag failures with these buckets, then fix the pipeline in that order (retrieval coverage first, search policy second, anti-leakage guards always-on).

## Do this now

- Pick one search workflow you already run (web QA, internal docs, ticket triage) and write 30–100 questions you can safely train on.
- Implement a reconstructor that sees only (masked queries, retrieved snippets) and outputs a reconstructed question. Reward semantic match to the original question.
- Add leakage guards: drop the final response, mask named entities, and track lexical overlap metrics. Fail or downweight high-overlap trajectories.
- Add a ‘trajectory audit’ step: sample 25 episodes, hide the original question, and see if a human can infer the question from the trail. If humans can’t, your reconstructor shouldn’t be able to either.
- Run an ablation bakeoff (no bottleneck vs bottleneck) and treat ‘bottleneck hurts’ as expected. If bottleneck helps, you probably had leakage.
- Only after leakage is controlled, scale RL steps. If rewards rise but evidence quality doesn’t, you are optimizing the wrong thing.
