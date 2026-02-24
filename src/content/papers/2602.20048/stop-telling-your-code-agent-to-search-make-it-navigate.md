---
arxivId: "2602.20048"
catchyTitle: "Stop telling your code agent to ‘search’—make it navigate"
funnySubtitle: "A 1M-token context still won’t find the file it never thinks to open."
blurb: "CodeCompass shows a simple rule for repo-scale agents: retrieval (BM25/grep) wins when the task text overlaps the code, but dependency-graph navigation wins when the needed files are architecturally connected and semantically distant. The operational lesson: add graph hops *and* enforce tool adoption, or you get baseline performance."
tldr: "If your coding agent misses key files, don’t just increase context or tune RAG. First classify the task: **G1 semantic** (keyword-findable) → use BM25/grep; **G3 hidden dependency** (no lexical overlap) → use dependency-graph hops from the primary file. In a 30-task benchmark (258 trials), BM25 hits **100%** coverage on semantic tasks, but graph navigation hits **99.4%** on hidden-dependency tasks (vs **76.2%** Vanilla). The biggest pitfall is adoption: **58%** of runs ignored the graph tool and fell back to baseline—so enforce ‘graph call first’ with a checklist-at-end or tool forcing."
paperTitle: "CodeCompass: Navigating the Navigation Paradox in Agentic Code Intelligence"
prompts:
  - title: "Prompt #1 — Force dependency navigation before editing"
    prompt: |-
      You are a repo-scale coding agent.

      RULE: Before editing ANY file, you must run structural navigation from the primary file and read the neighbors.

      1) Identify the primary file you plan to change first.
      2) Call get_architectural_context(<primary_file>).
      3) Read every returned neighbor file (inbound + outbound) that is in src/ or app/ (skip tests unless the change touches test utilities).
      4) Only then propose edits.

      FAIL-FAST: If step (2) is skipped, stop and ask to rerun with the graph tool enabled.

      At the end, output a checklist with: [primary_file], [graph_called?], [neighbors_read_count], [files_edited].

  - title: "Prompt #2 — Decide ‘BM25 vs graph hops’ from the task statement"
    prompt: |-
      You are routing a coding task to a localization strategy.

      Given TASK_DESCRIPTION, return JSON: {"task_type": "G1_semantic"|"G2_structural"|"G3_hidden", "strategy": [..], "first_step": string, "stop_conditions": [..]}

      Decision rules:
      - If TASK_DESCRIPTION contains a literal string/identifier that should appear in code (error message, route path, function/class name): task_type=G1_semantic; strategy=["BM25/grep for identifier", "edit", "run tests"]; stop if grep finds 0 hits → reconsider.
      - Else if TASK_DESCRIPTION mentions moving/extracting components across modules, changing base classes, changing config/DI wiring, or repository/service patterns: task_type=G2_structural; strategy=["start from the named file", "graph-hop neighbors 1–2", "edit"]; stop if edits touch a base class → require another graph hop from instantiation sites.
      - Else if TASK_DESCRIPTION is about behavior that likely lives ‘elsewhere’ than the named file (e.g., dependency injection provider, factory, settings object) and lexical overlap is unlikely: task_type=G3_hidden; strategy=["graph-hop immediately", "read neighbors", "edit"]; stop if you have not found instantiation sites after 2 hops → ask for architecture guidance.

      Return only the JSON.

tags: ["agents", "software-engineering", "retrieval", "tooling", "reliability", "evaluation"]
sourceUrl: "https://arxiv.org/abs/2602.20048"
publishedAt: "2026-02-24T07:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Route the task *before* you debug the agent

Start every repo-scale request by labeling it **semantic vs structural vs hidden** (the paper’s G1/G2/G3), because the right localization move depends on it.

- **Decision rule:** If the task includes a *literal identifier* you expect to exist in code (a string, route, function/class name), treat it as **G1** and begin with BM25/grep. If it’s an architectural change (base class, DI wiring, repository pattern), treat it as **G2/G3** and start from a file, not a query.
- **Metric / check:** Keep a tiny spreadsheet: for each incident, record “task type” and “did we touch all required files?”. If your misses cluster in G3, stop tuning retrieval—add navigation.

### Move 2: When lexical search stalls, switch to “file → neighbors” navigation

When your agent can’t find the next file by searching words, make it **expand the dependency neighborhood** from the file it’s already touching.

- **Operator move:** Do a 1-hop (then 2-hop if needed) expansion over edges like **IMPORTS / INHERITS / INSTANTIATES**, then read those neighbors before editing.
- **Pitfall + guardrail:** Pitfall: the agent keeps “searching harder” and never discovers semantically-distant glue code. Guardrail: any time you edit a **base class/config/auth/db** module, require at least one dependency expansion from that file.
- **Receipt:** The paper’s Figure 1 shows the exact behavior you want: a single 1-hop query surfaces cross-layer files without keyword matching.

### Move 3: Use the right baseline: BM25 is a great fast path (when it applies)

Keep BM25/grep as the cheap default for obvious (G1) edits.

- **Operator move:** Prepend top-k BM25 file suggestions when the task is G1 (identifier present), so the agent reaches the first relevant file quickly.
- **Metric / check:** In the paper, BM25 hits **100% ACS** on semantic tasks (G1), and it’s fastest to the first required file (FCTC) (Figure 5). If your “smart” system can’t beat that on G1, you’re paying for complexity without wins.

### Move 4: Treat tool adoption as a hard requirement (or you just have a demo)

Don’t celebrate a navigation tool’s performance until you’ve proven the agent actually uses it—because “available” and “adopted” are different products.

- **Decision rule:** If “% runs with 0 navigation calls” is above ~20% on the tasks the tool is meant to solve, you need enforcement, not more prompting.
- **Metric / check:** The paper’s key warning: in the graph condition, **58%** of runs made **zero** tool invocations. When the tool was used, mean ACS was **99.5%**; when ignored, it fell to **80.2%** (baseline-like) (Figure 4).

### Move 5: Fix “forgot to use the tool” with prompt *structure*, then escalate to enforcement

If your agent forgets a mandatory step, treat it like an attention/UX bug: change the structure first, and then add a system-level backstop.

- **Operator move:** Put the “must call tool” checklist at the **end** of the prompt and require explicit confirmation (checklist-at-end).
- **Pitfall + guardrail:** Pitfall: you bury the tool rule near the top, and it gets lost in long instructions (Lost-in-the-Middle behavior). Guardrail: shorten preamble, move must-do steps to the end, and make “no tool usage” a fail-fast.
- **Receipt:** The paper reports adoption improving to **100% on G3** after switching to checklist-at-end formatting (Figure 3). If that still doesn’t hold, force the first tool step via tool-choice / a two-phase “mapper → editor” pipeline.

## Do this now (tight checklist)

- Take 10 recent “agent missed a file” failures and label each G1/G2/G3.
- Add a standard step: “after choosing a primary file, expand dependency neighbors (1–2 hops) and read them” for any architectural refactor.
- Instrument runs with three numbers: **tool adoption %**, **time-to-first-relevant-file**, and an ACS-like “required files touched” proxy.
- Keep BM25/grep as your fast path for G1 tasks; don’t over-engineer what’s already solved.

## Where this breaks

If your repo uses **runtime wiring** (plugins, reflection, DI containers), a static import graph will miss edges; add runtime traces or a manual “architectural edges” layer.

If your dependency graph is **stale**, it can confidently route you wrong; rebuild it regularly.

If you only measure “files touched” (ACS), you can still ship broken patches; pair navigation metrics with executable checks (tests, typecheck, smoke run) to confirm correctness.

## Receipts (what I actually used)

- Task taxonomy: **G1 semantic / G2 structural / G3 hidden** (Section 4.1).
- Figure 2/7 takeaway: graph navigation is the big lever on **hidden dependencies** (G3 **99.4%** vs Vanilla **76.2%**, BM25 **78.2%**).
- Figure 4 takeaway: the real bottleneck is **adoption**, not graph quality (tool used → **99.5%**; skipped → **80.2%**).
- Figure 5 takeaway: BM25 is a strong baseline for G1 (fast first-file + perfect coverage).

## Skeptic check (BEFORE you bet on a navigation tool)

- Can you show, on your own repos, at least one “veto” case where grep/BM25 finds nothing but a graph hop finds the dependency you needed?
- Do you have an adoption metric (“0 tool invocations” rate) and a policy for what happens when it’s violated (rerun, fail, or human review)?
- Does your workflow decide *when* to use BM25 vs graph hops (routing), instead of always doing both and paying the latency tax?
- After edits to base classes/config/DI, do you have a rule that forces checking instantiation sites (neighbor expansion from constructors/factories)?

<!-- Prompts render from frontmatter -->
