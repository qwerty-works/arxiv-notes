---

arxivId: "2602.14643"
feed: "cs.AI"
catchyTitle: "Stop Stuffing Your Workflow Into the Prompt"
funnySubtitle: "Make the model choose from 2 edges, not 980"
blurb: "If your agent must follow a strict decision tree, don’t paste the whole tree into the prompt. Convert it to an edge list, retrieve only the current node’s outgoing edges, and split the agent into a low-temp router + a separate message writer. On a 449-node triage workflow, this architecture improved turn accuracy by +29.42 points while cutting cost 14.4× and reducing latency 57.1% vs a single-prompt baseline."
tldr: "If your agent has to follow a strict workflow (triage scripts, compliance trees, onboarding flows), stop stuffing the whole tree into the prompt. Store the workflow as an edge list, retrieve only the current node’s outgoing edges, and split the agent into (1) a low-temp transition evaluator and (2) a separate message writer. In their triage setting (449 nodes / 980 edges; ~120k tokens if serialized), this architecture boosted turn accuracy by +29.42 points (58.80% → 88.23%), cut per-turn cost 14.4× ($0.166 → $0.012), and reduced latency 57.1% (33.84s → 14.51s) vs a single-prompt baseline."
paperTitle: "Arbor: A Framework for Reliable Navigation of Critical Conversation Flows"
prompts:
  - title: "Node-local transition evaluator (edge-list routing)"
    prompt: |-
      You are the ROUTER for a structured workflow.

      Inputs:
      - current_node: <string>
      - outgoing_edges: a list of edges, each with:
        {edge_id, from_node, to_node, question, answer_condition, extra_context, flags}
      - conversation_tail: the last 5–15 turns
      - external_state: structured facts that must NOT be inferred from chat (eligibility, risk flags, profile attributes)

      Task:
      1) Decide whether any edge’s condition is satisfied.
      2) If exactly one edge is satisfied with high confidence, return that edge_id and to_node.
      3) If none are satisfied OR you are unsure, return STAY and a single clarifying question we should ask next.

      Decision rules:
      - Never select an edge based on assumptions.
      - Only consider outgoing_edges (do not invent transitions).
      - Prefer asking a clarifying question over guessing.

      Output JSON:
      {
        "decision": "TRANSITION"|"STAY",
        "edge_id": <string|null>,
        "to_node": <string|null>,
        "missing_info": [<string>, ...],
        "clarifying_question": <string|null>
      }

  - title: "Two-step agent refactor plan (eval vs generation split)"
    prompt: |-
      You are refactoring a monolithic LLM prompt that both (a) follows a workflow and (b) writes user messages.

      Given:
      - workflow_shape: <nodes, edges, avg_out_degree, max_depth>
      - current_failure_modes: <list>
      - constraints: <cost, latency, safety>

      Produce:
      1) A design for a two-step loop:
         - Step A: transition evaluation (deterministic, low-temp)
         - Step B: message generation (tone + UX)
      2) The minimal state to persist between turns.
      3) The minimum logs needed for debuggability.
      4) A "stop condition" definition (what counts as terminal).

      Output as bullets with concrete implementation tasks.

tags: ["agents", "workflow", "reliability", "retrieval", "evaluation"]
sourceUrl: "https://arxiv.org/abs/2602.14643"
publishedAt: "2026-02-17T07:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Convert workflows into an edge list you can retrieve by node

**Operator move:** represent every possible transition as a document like:
- from_node, to_node, question, answer/condition, extra_context, flags (plus a unique edge_id).

**Decision rule:** if your “workflow prompt” can’t be queried by **current_node → outgoing_edges**, you’re still doing prompt-stuffing.

**Pitfall + guardrail:** workflows rot when nobody validates structure. Add ingestion checks for (a) orphan/unreachable nodes, (b) edges pointing at missing nodes, and (c) unescapable loops (e.g., SCCs with no exit).

**Receipt:** Table 1 (edge-list document fields) + the ingestion validation steps described in §3.1.

### Move 2: Narrow the action space to “only the outgoing edges”

**Operator move:** at runtime, fetch only the outgoing edges for the current node and force the router to pick from that set.

**Decision rule:** if the model can “jump” to arbitrary parts of the workflow, expect hallucinated transitions. If it can’t see them, it can’t pick them.

**Pitfall + guardrail:** don’t let the router use chat-only inference for hard facts (eligibility, risk flags, profile attributes). Pass those as structured external_state.

**Receipt:** Architecture §3.2.1 (inputs include conversation history + external context; outputs STAY when info is missing).

### Move 3: Split routing (evaluation) from writing (generation)

**Operator move:** run two separate LLM calls per user turn:
1) **Evaluate transitions** (low-temp, deterministic).
2) **Generate the user message** (tone + clarity), conditioned on the chosen node.

**Decision rule:** if your prompt asks the model to (a) follow logic, (b) track state, and (c) write empathetic prose *in one shot*, you’re paying for contradictions.

**Pitfall + guardrail:** alignment can break if the writer doesn’t know why the router stayed/transitioned. Pass a short “why we’re here / what’s missing” rationale into generation.

**Receipt:** §3.2.3 (task specialization + independent configurations; feed evaluator reasoning into generation).

### Move 4: Measure success at the right granularity: turn accuracy + variance

**Operator move:** evaluate “did we end the turn at the correct node?” (turn accuracy), not just “did the message sound good.”

**Decision rule:** if your workflow is safety- or compliance-critical, treat a wrong transition as a hard failure even if the prose is nice.

**Pitfall + guardrail:** don’t get tricked by averages only. High variance across models/settings is a reliability bug. Prefer architectures that stabilize results.

**Receipt:** Aggregate Table 2: accuracy **88.23% (±7.66%)** vs baseline **58.80% (±22.59%)**.

### Move 5: Use cost/latency math as a forcing function

**Operator move:** stop re-ingesting a massive tree every turn. Make input size roughly invariant to total tree size by retrieving node-local context.

**Decision rule:** if the full-tree prompt is tens of thousands of tokens, you should expect per-turn cost to scale with tree size. Retrieval-based routing is the “make cost scale with branching factor” move.

**Pitfall + guardrail:** multi-step calls add overhead, so validate end-to-end latency. If you’re on a tight real-time channel, consider “ack now, finish routing in the background” patterns.

**Receipt:** Table 2: cost **$0.012 vs $0.166** (14.4× cheaper) and latency **14.51s vs 33.84s** (57.1% faster) on average.

## Do this now (tight checklist)

- [ ] Export your workflow to an **edge list** with stable IDs (edge_id, from_node, to_node).
- [ ] Add ingestion validation: unreachable nodes, missing references, and unescapable loops.
- [ ] Implement a router that only sees **outgoing edges for current_node**.
- [ ] Persist minimal state: current_node + external_state (facts you refuse to infer from chat).
- [ ] Split the agent: **Step A router (low-temp)**, **Step B writer (UX)**.
- [ ] Instrument: per-turn chosen edge_id, stayed vs transitioned, and a small “missing info” list.

## Where this breaks

If your “workflow” isn’t actually a tree/graph with explicit transitions (it’s open-ended policy), edge-local routing can over-constrain the conversation and force awkward clarifying loops.

## Receipts (what I actually used)

- Table 1: edge-list document fields (transition docs)
- Table 2: aggregate deltas (+29.42 accuracy points, 14.4× cheaper, 57.1% faster)
- Decision-tree size in the eval: 449 nodes / 980 edges; ~119,990 tokens serialized
- Message quality check: 97.3% acceptance vs 100%; mean 3.67 vs 3.62 (1–4 scale)

## Skeptic check (BEFORE prompts)

- Is your baseline failing because of **prompt length** (lost-in-the-middle / context overflow) or because your tree logic is poorly specified?
- Are you measuring the right thing (node accuracy), or just “messages feel plausible”?
- Which facts must come from databases/forms (eligibility, risk flags) rather than chat inference?
- What’s your stop condition (terminal nodes), and do you have an escape hatch from loops?

<!-- prompts render from frontmatter -->
