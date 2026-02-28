---

arxivId: "2602.12108"
feed: "cs.AI"
catchyTitle: "Give the model the wand"
funnySubtitle: "Working memory should be small on purpose"
blurb: "StateLM gives an agent a real working-memory policy: read small chunks, write durable notes, delete the raw text. Reported results show big wins under small context budgets and robustness at extreme context lengths."
tldr: "Stop stuffing the prompt. Use a stateful loop: index/search small chunks, distill durable notes, then delete raw context so the agent’s working state stays clean. The paper reports large gains under tight context budgets and strong robustness on long-context retrieval and deep research tasks."
paperTitle: "The Pensieve Paradigm: Stateful Language Models Mastering Their Own Context"
prompts:
  - title: "Pensieve loop controller (search → read → note → delete)"
    prompt: |-
      You are running a long-context agent with a fixed context window.
      
      Tools available:
      - analyzeText(text) -> {token_estimate}
      - buildIndex(text) -> {index_id, chunk_count}
      - searchEngine(index_id, query) -> {chunk_ids}
      - readChunk(index_id, chunk_id) -> {text}
      - updateNote(key, content, summary) -> ok
      - readNote(key) -> {content, summary}
      - deleteContext(msg_id) -> ok
      - checkBudget() -> {tokens_remaining, turns_remaining}
      
      Goal: Answer the user question using a stateful Pensieve workflow.
      
      Policy:
      1) analyzeText to estimate scale. If long, buildIndex.
      2) Plan 3-6 'note keys' you will build (e.g., assumptions, definitions, evidence, constraints).
      3) Iterate: searchEngine -> readChunk -> updateNote (include chunk_id in the content) -> deleteContext for the raw chunk text.
      4) Before finishing, re-read your notes (readNote) and ensure every claim in the final answer is supported by a note key.
      5) If checkBudget is low, prefer note refinement over reading new chunks.
      
      Output:
      - final answer
      - a short 'Notes used' list (note keys only, no raw text).
  - title: "Note schema that survives deletion (compact but audit-friendly)"
    prompt: |-
      Design a notebook schema for a long-context agent that deletes raw context.
      
      Constraints:
      - Notes must be compact (aim < 1,200 tokens total).
      - Every note must carry provenance so a human can recover the source chunk later.
      - We must be able to answer: 'Why did you say that?' after the raw context is deleted.
      
      Given:
      - index_id: <id>
      - chunk_id format: <int>
      
      Output JSON schema:
      {
        "note_key": {
          "summary": <1-2 sentences>,
          "facts": [
            {
              "claim": <string>,
              "support": {
                "index_id": <string>,
                "chunk_id": <int>,
                "quote_optional": <string|null>
              }
            }
          ],
          "open_questions": [<string>]
        }
      }
      
      Also propose 5 default note_keys you’d create for any long-doc QA task.
  - title: "Needle-in-a-haystack memory test generator"
    prompt: |-
      Create a needle-in-a-haystack test plan for a long-context agent.
      
      Requirements:
      - Generate 20 test instances at each context length: 64K, 128K, 256K, 512K.
      - Each instance embeds one key-value sentence ('needle') in a long filler document ('haystack').
      - Query asks for the exact value.
      - Provide a scoring script approach (exact match) and what to log (context length, notes size, deletions count).
      
      Output:
      1) The template for haystack generation (pseudocode).
      2) Example of 1 instance.
      3) A results table template (CSV headers).
tags: ["agents", "memory", "context-management", "long-context", "tool-use"]
sourceUrl: "https://arxiv.org/abs/2602.12108"
publishedAt: "2026-02-14T15:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Give the model a first-class 'forget' button so the working context stays small instead of growing forever.

Use prompt #1 at the end to turn this into a concrete controller.

- Add a deleteContext(msg_id) tool to your agent runtime.
- Define deletion semantics clearly (e.g., replace deleted messages with stubs so the transcript stays coherent).
- Make deletion part of the normal loop: after extracting what you need, delete the raw tool output and any verbose intermediate steps.
- **Receipt:** Figure 1 describes a 'sawtooth' context-use profile; Section 3.2 defines deleteContext(msg) as a context-pruning operation in the StateLM loop.

### Move 2: Separate 'durable memory' (notes) from 'working memory' (context): distill first, then prune.

- Create a persistent notebook (key → {content, summary}) outside the model context.
- Use an updateNote/note tool to write compact, query-relevant facts with short summaries.
- Teach/require the agent to rehydrate from notes (readNote) instead of keeping raw text in-context.
- **Receipt:** Figure 2 caption: the loop 'reads, takes notes, and prunes its working context'; Table 1 lists note/updateNote and readNote as memory tools.

### Move 3: For long inputs, don’t 'stuff'—index, search, read tiny chunks, then delete them.

- Add buildIndex + searchEngine + readChunk tools for long documents.
- Adopt a strict cycle: search → readChunk → updateNote → deleteContext (repeat).
- Keep a budget tool (checkBudget) so the agent can decide when to prune or stop.
- **Receipt:** Table 1 ('Spellbook') enumerates analyzeText, buildIndex, searchEngine, readChunk, checkBudget; Figure 2 describes the multi-round loop using these tools.

### Move 4: Stress-test memory with 'needle-in-a-haystack' at absurd context lengths; the delta shows whether your memory loop actually works.

- Build a synthetic benchmark that hides a single key sentence ('needle') inside a long passage ('haystack') and queries it.
- Run across increasing lengths; watch where the baseline collapses and whether your stateful agent stays flat.
- To test scanning behavior, temporarily disable search so the agent must manage reading/pruning under pressure.
- **Receipt:** Table 2: Qwen3 baselines fall from 88.33% at 128K to 3.33% at 1M and ~1.7% at 2M, while StateLM variants remain high (e.g., StateLM-14B 95.00% at 1M and 83.89% at 2M) under the 'w/o search' setting.

### Move 5: If you want models to self-manage context, train on expert tool trajectories first, then use RL to refine; the payoff can be huge on agentic 'deep research' tasks.

- Stage 1 (SFT): collect expert demonstrations of the search/read/note/delete loop on long-context QA tasks.
- Stage 2 (RL): optimize on a long-context benchmark to improve the policy beyond imitation.
- Track gains under the same tight context budget (e.g., 32K) to confirm you're buying skill, not just window size.
- **Receipt:** Section 4.1 describes two-stage training (SFT on 3.3K trajectories → 35.7K samples; RL on LongBench v2 training set). Table 3 shows large gains at 32K context (e.g., BrowseComp-Plus: Qwen3-14B 5.46% vs StateLM-14B-RL 52.67%).

## Do this now (checklist)

- Add **updateNote/readNote** (durable notebook) and **deleteContext** (working-memory pruning).
- Add long-doc tools: **buildIndex → searchEngine → readChunk** (or equivalents).
- Make the loop mandatory: **search → read → note → delete**.
- Log: note size, deletions count, and any claim → chunk_id provenance.
- Run a **needle-in-a-haystack** sweep at multiple context lengths and track accuracy.

## Where this breaks

If your task needs verbatim text (contracts, citations, quotes) or strict reproducibility, lossy note-taking + deletion can quietly drop the one detail that matters.

## Skeptic check (before you copy this)

- Are you actually allowed to delete/omit prior messages in your product’s audit/logging requirements? If not, use redacted stubs like the paper’s Figure 2 description.
- Will your tasks tolerate aggressive compression? If answers require exact quotes or precise provenance, your note schema must retain citations/chunk IDs.
- Are your gains coming from better memory policy or from extra tool power (search/index)? Compare under fixed tool availability and fixed context budgets.
- Does your evaluation rely on an LLM judge? If yes, sanity-check with a smaller set of human-verified or rule-based items (the paper uses rule-based scoring for MCQ long-doc QA).

## Receipts

- Figure 2: self-context engineering loop; deleted messages are replaced with stubs after deletion.
- Table 2: Needle-in-a-haystack accuracy across 32K→2M context lengths; StateLM remains robust beyond 128K where baselines collapse.
- Table 3: LongDoc QA / Chat Memory / BrowseComp-Plus results; StateLM uses 32K context vs Qwen3 baselines at 128K (BrowseComp-Plus shows ~5% vs ~52%).

