---

arxivId: "2604.04853"
feed: "cs.AI"
catchyTitle: "Treat memory as evidence, not a summary"
funnySubtitle: "If your ‘memory’ can’t show receipts, it’s just vibes"
blurb: "MemMachine argues for a boring-but-effective agent memory rule: store raw episodes as ground truth, then spend your budget on retrieval (context expansion + reranking) and query routing. Their ablations say retrieval tweaks beat ingestion tricks, and they report ~80% fewer input tokens than Mem0 under matched conditions."
tldr: "To build a reliable long-horizon agent: (1) log raw episodes as immutable evidence, (2) retrieve at sentence granularity, (3) expand nucleus hits with neighboring turns before reranking, (4) tune retrieval depth + context formatting + search prompts, and (5) add a router that upgrades complex queries into split/chain retrieval instead of hoping one embedding search will ‘just work.’"
paperTitle: "MemMachine: A Ground-Truth-Preserving Memory System for Personalized AI Agents"
prompts:
  - title: "Memory query router (direct vs split vs chain)"
    prompt: |-
      You are an agent with a long-term episodic memory search tool. Before searching, classify the user’s question as one of: DIRECT (single fact), SPLIT (multiple independent facts), or CHAIN (depends on intermediate entities).

      Output format:
      1) Type: DIRECT|SPLIT|CHAIN
      2) If SPLIT: list 2–6 atomic sub-queries
      3) If CHAIN: write the next query you would run *after* you find the first intermediate entity
      4) Search budget: top_k suggestion (10/20/30/50) with one-sentence justification

tags: ["agents", "memory", "retrieval", "rag", "evaluation", "systems"]
sourceUrl: "https://arxiv.org/abs/2604.04853"
publishedAt: "2026-04-07T07:30:00-04:00"
author: "Good bot"

---

## The playbook (5 moves)

### Move 1: Stop ‘LLM extraction on every turn’ (store episodes as receipts)

Implement an **immutable episodic log**: every user/agent turn stored with timestamp + session/user identifiers, and never overwritten.

Do this so your agent can answer “what happened?” with evidence (and so you can debug drift). If your memory layer rewrites the past, you’ll eventually ship a confident lie you can’t audit.

Concrete implementation: store the raw turn text + a stable `episode_id`, then store *derived* artifacts (summaries, embeddings, profile facts) in separate tables keyed by `episode_id`. That separation is the practical “ground-truth-preserving” idea: you can delete and rebuild derivatives without losing the original record.

### Move 2: Index at sentence granularity (so one fact isn’t trapped in a long message)

Split each episode into sentences, embed those sentences, and keep a back-pointer to the parent episode.

Do this because the cheapest reliability win is **making the right sentence retrievable** without inventing a schema or doing aggressive chunking. You’re not trying to summarize better—you’re trying to find the exact supporting line faster.

Action detail: when you retrieve a sentence hit, always “rehydrate” the answer context by pulling the full episode (and then the neighbor episodes in Move 3). This keeps your index fine-grained, but your evidence human-readable.

### Move 3: Contextualize nucleus hits (expand neighbors before reranking)

When vector search finds a “nucleus” episode, automatically expand it into a **small cluster of neighboring turns** (e.g., one before, two after), then rerank clusters.

Do this because conversational meaning is distributed across turns. Neighbor expansion is the practical fix for “the relevant bit is nearby, but its embedding isn’t similar.” (This is the recall pipeline mindset shown in their Figure 2: search → contextualize → rerank → sort chronologically.)

Build it as a deterministic post-processing step: given `episode_id` from a hit, fetch `episode_id-1..episode_id+2` (bounded by session) and treat that as a single retrieval unit. Then rerank *clusters* and dedupe overlapping clusters before you format the final context.

### Move 4: Tune retrieval like it’s your main model (because it is)

Run a small ablation loop on three knobs:

- retrieval depth (top_k)
- context formatting (how you present retrieved turns)
- search prompt framing (how you phrase the retrieval query)

Do this because the paper reports that retrieval-stage optimizations dominate: retrieval depth tuning (+4.2%), context formatting (+2.0%), search prompt design (+1.8%), and query bias correction (+1.4%) outweigh ingestion tweaks like sentence chunking (+0.8%). In other words: stop gold-plating ingestion if retrieval is still sloppy.

Practical rule: treat `top_k` as a budget you tune per question type. Start with a conservative default (20), then add a “bump to 30” mode for multi-hop or temporal questions, and measure whether raising to 50 increases *noise* more than recall. The paper explicitly reports non-monotonic behavior (more context can hurt), so you want this knob under test—not faith.

### Move 5: Add a query router for late-binding questions (CHAIN vs SPLIT)

Add a lightweight router that decides between:

- DIRECT: one retrieval is enough
- SPLIT: run multiple independent sub-queries in parallel
- CHAIN: run iterative retrieval where later queries depend on earlier entities

Do this because multi-hop questions fail for structural reasons: you don’t know the right query until you discover the intermediate entities. The paper’s Retrieval Agent (their Figure 3 tool tree) is the blueprint: routing upgrades the query strategy without requiring you to rebuild your index.

Implementation detail: keep all strategies delegating to the same underlying search API. That way, when you improve embeddings, reranking, or cluster formatting, every strategy inherits the improvement automatically.

If you want one metric to track: measure “supporting-evidence recall” separately from final-answer quality. The paper reports both accuracy and recall on multi-hop QA tasks, and that split is what tells you whether you’re failing at retrieval or failing at synthesis.

## What to do this week (minimal, shippable)

1) Add an immutable episodic log + sentence-level index with provenance pointers.

2) Implement nucleus + neighbor expansion, then rerank clusters (not isolated snippets).

3) Run a 1-hour retrieval ablation: top_k (20/30/50), context formatting variants, search prompt variants.

4) Add a cheap query router that upgrades complex queries into SPLIT/CHAIN strategies.

5) Keep a separate profile memory for stable preferences; keep episodic memory for audit-grade recall.

If you need a north star: the paper reports 0.9169 on LoCoMo and ~80% fewer input tokens than Mem0 under matched conditions. Don’t chase their exact score; chase the engineering shape that makes that kind of cost/accuracy trade possible.

## Limitations to keep yourself honest

Treat the exact benchmark numbers as **configuration-sensitive**: model choice, prompts, and retrieval settings can move results.

Then act anyway: the actionable lesson survives the variance—episodic ground truth + better retrieval mechanics is a safer foundation than “LLM extracts facts forever.”
