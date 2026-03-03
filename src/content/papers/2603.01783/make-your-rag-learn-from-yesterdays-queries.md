---

arxivId: "2603.01783"
feed: "cs.AI"
catchyTitle: "Make your RAG learn from yesterday’s queries"
funnySubtitle: "Stop paying for the same multi-hop twice"
blurb: "GAM-RAG is a training-free way to make retrieval evolve: it writes sentence-level feedback into a lightweight hierarchical index and uses a Kalman-style gain rule so memories update fast when uncertain and slow when stable — improving average QA performance while cutting inference cost."
tldr: "If your RAG answers lots of ‘same shape’ questions, a static index wastes tokens and time. Add persistent sentence-level memory, update it with an uncertainty-aware (Kalman-style) gain so you don’t overfit noisy feedback, and use that memory to bias future propagation/ranking — you should see the biggest win on repeated/similar queries and in latency/token cost."
paperTitle: "GAM-RAG: Gain-Adaptive Memory for Evolving Retrieval in Retrieval-Augmented Generation"
prompts:
  - title: "Sentence-level evidence judge (for writing memory)"
    prompt: |-
      You are judging whether a candidate sentence is actually useful evidence for answering the query.

      Return JSON with fields: {support: true|false, reason: string}.

      Rules:
      - Judge SUPPORT only if the sentence contains a fact or linkage that is necessary or directly helpful for the answer.
      - If the sentence is merely topical, return support=false.
      - Ignore stylistic quality; focus on evidential value.

      Query: <QUERY>
      Candidate sentence: <SENTENCE>
      Answer (optional): <ANSWER>

  - title: "Memory update sanity-check (don’t reinforce garbage)"
    prompt: |-
      You are reviewing a proposed memory update in a RAG system.

      Task: decide whether reinforcing this sentence is safe.

      Output: APPROVE or REJECT, plus 2 bullet reasons.

      Reject if:
      - The sentence is ambiguous, speculative, or could mislead future queries.
      - The sentence is only relevant due to one-off context.

      Context:
      - Query family summary: <FAMILY>
      - Sentence: <SENTENCE>
      - Proposed boost amount: <DELTA>

tags: ["rag", "retrieval", "memory", "latency", "kalman", "evaluation"]
sourceUrl: "https://arxiv.org/abs/2603.01783"
publishedAt: "2026-03-03T07:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Treat “recurring queries” as a product metric, not a coincidence.

Cluster your incoming questions into **query families** (embedding + threshold) and measure cost per family: latency, tokens, and “how many hops did we take.”

Do this because the whole point of the paper is to stop re-running the same expensive retrieval+reasoning pattern for the same family.

**Receipt:** Figure 1 frames the problem as static/stateless graph-RAG repeatedly traversing similar paths for related queries.

### Move 2: Add sentence-level memory (not just a better vector index).

Implement a persistent per-sentence state that can be reinforced after a successful answer: a task memory vector, an optional time memory vector, and an uncertainty scalar.

Do this so your system can make *specific evidence* easier to activate next time, instead of re-discovering it from scratch.

**Receipt:** the method summary stores sentence memories (task + time) plus perplexity/uncertainty and uses them during propagation.

### Move 3: Only “learn” when you can point to evidence — and store the feedback at the sentence level.

After each episode, judge whether each candidate sentence was actually supportive evidence.

Do this so your memory writes are grounded in “this sentence helped answer,” not “this passage was nearby.” Use the “Sentence-level evidence judge” prompt above as the simplest starting point.

**Receipt:** the framework uses sentence-level feedback from an LLM judge as the observation that drives memory updates.

### Move 4: Use a Kalman-style gain so memory updates don’t overfit noisy feedback.

Replace naive boosts with an uncertainty-aware update: update fast when a memory is uncertain, and slow when it’s already stable.

Do this because your feedback is noisy; if you update aggressively forever, you’ll reinforce spurious correlations.

**Receipt:** Figure 3 (gain dynamics) + the Kalman-inspired update rule are explicitly about balancing stability vs adaptability under noisy feedback.

### Move 5: Set acceptance criteria that match where the wins should appear.

Evaluate improvements separately for **Same Query / Similar Query / Different Query** buckets, and track latency/token reductions alongside accuracy.

Do this because if your “memory RAG” isn’t noticeably better on same/similar queries, you’re paying memory complexity without getting the intended benefit.

**Receipt:** Table 2 reports an efficiency + robustness breakdown across same/similar/different query scenarios and multi-turn memorization effects.

## Do this now (tight checklist)

- Instrument query-family repeats (log per-family latency + token cost + top evidence sentences).
- Add a sentence-level cache: “helpful for family X” priors.
- Swap naive boosting for a gain-scaled update (uncertainty controls step size; treat negative feedback as higher-noise).
- Add a rollback/safety valve: if a family regresses on a holdout eval, revert that family’s memory and increase observation-noise (be more conservative).

## Where this breaks

- If your query distribution is mostly one-off, you’ll pay memory overhead for little gain.
- If you can’t safely scope memory (privacy / multi-tenant), you’ll need per-tenant memory + retention rules.
- If your judge signal is unreliable, you can reinforce wrong sentences and bake in bad shortcuts.

## Receipts (what I actually used)

- Figure 1: static/stateless graph-RAG repeats traversal; “memory-plastic RAG” evolves retrieval from feedback.
- Figure 3: gain dynamics (fast warm-up, damped refinement) motivating uncertainty-aware updates.
- Figure 4: long-term memorization trends (rollout expectation: early learning can wobble; stability improves).
- Table 2: efficiency/robustness evaluation split (same/similar/different queries; latency/token outcomes).

## Skeptic check (BEFORE prompts)

- Are you measuring cost and correctness *per query family*, or only global averages?
- Can you name the exact unit you’re reinforcing (sentence vs passage vs doc), and do you have a way to reverse a bad write?
- Are you treating “not supportive” feedback as high-noise (conservative), or are you deleting/downranking aggressively?
- Do you have a holdout eval that specifically contains repeats/similar paraphrases (the cases this is supposed to win on)?
- Are you storing memory with the right scope (tenant/project), so yesterday’s users don’t poison today’s?
