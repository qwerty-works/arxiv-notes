---

arxivId: "2602.14865"
feed: "cs.AI"
catchyTitle: "Stop Driving Your App Through Screenshots"
funnySubtitle: "Give the agent the app’s *real* controls (but keep it on a leash)"
blurb: "If you control the UI, don’t make your agent guess via pixels/DOM dumps. Expose a curated ARIA snapshot + URL as observations, and a page-scoped function registry as the only action surface. EmbeWebAgent reports a tiny retrofit cost (~150 LOC shim + ~200 LOC registry) while making actions more reliable via page-filtered tools, explicit navigation URLs, and mixed-granularity ‘primitives + composites’."
tldr: "When you own the web app, embed the agent: ship a ~150 LOC frontend shim that streams curated ARIA+URL observations over a WebSocket, and expose a page-scoped function registry (~200 LOC) so the model can only call actions valid on the current page. Add explicit navigation as a tool, mix low-level primitives with a few high-level composite actions, and test the whole loop with a WebSocket-driven integration harness + tracing so you can catch action drift and latency regressions."
paperTitle: "EmbeWebAgent: Embedding Web Agents into Any Customized UI"
prompts:
  - title: "Embedded-agent retrofit plan (ARIA + function registry)"
    prompt: |-
      You are helping me embed an LLM agent into an existing web app *that I control*.

      Inputs:
      - app_stack: <React|Angular|Other>
      - pages: a list of routes (URL patterns) and what each page is for
      - critical_workflows: 3–10 user journeys we must make reliable
      - current_agent_failure_modes: (e.g., misclicks, wrong page, tool hallucination, slow loops)

      Design a minimal retrofit with:
      1) Observations: a curated ARIA snapshot + current URL. Specify exactly what to label (and what to exclude).
      2) Actions: a per-page function registry. For each page, list the 5–15 functions to expose, with JSON schemas.
      3) Navigation: define a dedicated navigate(url) tool and how reachable URLs are surfaced.
      4) Guardrails: how to prevent invalid actions (page-to-function mapping, parameter validation, allowlists).
      5) Tests: 5 integration tests (WebSocket in/out) that verify correct function calls + params.
      6) Instrumentation: what to trace (latency, page transitions, function invocations) and what “good” looks like.

      Output:
      - A 7–12 step implementation checklist
      - A table: page -> (observations, functions, invariants)

  - title: "Page-scoped tool registry writer (schemas + descriptions)"
    prompt: |-
      You are writing a page-scoped function registry for an embedded web agent.

      Inputs:
      - page_url: <string>
      - page_purpose: <string>
      - ui_elements: a list of interactive elements with {aria_label, tag_type, stable_id, notes}
      - existing_frontend_functions: a list of candidate functions with {name, description, params, side_effects}

      Task:
      1) Select the smallest safe set of functions to expose for this page.
      2) Prefer composite actions when they remove fragile multi-step UI sequences.
      3) Write JSON schemas for parameters (types, enums, required fields).
      4) Add a one-line “when to use” and a one-line “don’t use when” for each function.

      Output JSON:
      {
        "page_url": "...",
        "functions": [
          {
            "name": "...",
            "description": "...",
            "schema": {"type":"object","properties":{...},"required":[...]},
            "use_when": "...",
            "avoid_when": "..."
          }
        ]
      }

tags: ["agents", "web", "tooling", "reliability", "evaluation"]
sourceUrl: "https://arxiv.org/abs/2602.14865"
publishedAt: "2026-02-17T15:30:00-05:00"
author: "Good bot"
---

If you control the web app, stop making your agent “drive” it through screenshots or raw DOM dumps. Instead, **embed** the agent: expose a curated **ARIA + URL** observation snapshot, and a **page-scoped function registry** (schemas + descriptions) so the model can only call actions that are valid *right now*.

Use prompt #1 to plan the retrofit, and prompt #2 to generate page-by-page registries.

## The playbook (5 moves)

### Move 1: Replace pixel/DOM perception with “curated ARIA + current URL”

**Operator move:** add ARIA labels only to meaningful interactive elements, and ship the agent a filtered list of `{aria_label, tag_type}` plus the **current URL** as its observation.

**Decision rule:** if the agent needs screenshots to know what to do, you’re paying a reliability tax you don’t have to pay in an app you own.

**Pitfall + guardrail:** dumping *all* ARIA/DOM is still noise. Filter out decorative elements (icons/layout wrappers) and keep labels stable (treat label changes as breaking API changes).

**Receipt:** “Observations via ARIA Labels + Page URL” (paper §3) + Fig. 1 framing: interface-level vs embedded observations.

### Move 2: Constrain the action space with a per-page function registry

**Operator move:** expose a **function registry** to the backend that includes function names, schemas, and page associations; then, at runtime, only show the agent the functions mapped to the current URL.

**Decision rule:** if the model can see tools that don’t apply to the current page, expect spurious calls and “tool hallucinations.”

**Pitfall + guardrail:** don’t ship executable code to the model. Ship **metadata only** (schemas + descriptions), validate parameters on the frontend, and reject calls not allowed for the active page.

**Receipt:** Fig. 2 (function registry + page-function mapping) + the “page-filtered function set corresponding to the current URL” described in the backend session state.

### Move 3: Mix primitives + composites (and treat navigation as an explicit tool)

**Operator move:** provide both:
- **primitives** (click/type/select/scroll) for generic manipulation
- **composites** (e.g., `add_item_to_list`, `run_analysis`) for workflows that are fragile as multi-step UI sequences

Also create a dedicated **navigate(url)** tool where reachable URLs come from ARIA-labeled links so nested navigation doesn’t degrade.

**Decision rule:** if a workflow requires 4+ UI actions and matters, wrap it as a composite; keep primitives for everything else.

**Pitfall + guardrail:** composites can hide side effects. Require a one-line purpose + parameter schema, and log every composite invocation as a single audit event.

**Receipt:** “Mixed-Granularity Actions and Explicit Navigation” (§3) + Fig. 2 pipeline notes.

### Move 4: Use an event-driven WebSocket loop (push only when state changes)

**Operator move:** connect frontend↔backend via WebSocket and only push new observations when:
- URL changes, or
- UI elements change due to user/agent action

**Decision rule:** if you’re re-sending the full observation payload every turn, you’re building your own latency problem.

**Pitfall + guardrail:** stale state causes wrong calls. Keep a session-scoped “latest observation + last actions” state on the backend, and invalidate the tool cache on URL change.

**Receipt:** “Lightweight Communication” + “Session Grounding” (§3).

### Move 5: Test like an API: WebSocket-driven integration tests + tracing

**Operator move:** build integration tests that open a WebSocket, send a fixed observation snapshot, issue a chat goal, and assert the **exact function invocation + parameters** (and/or the navigation URL) the agent emits.

**Decision rule:** if you can’t assert function-invocation correctness deterministically, you can’t safely refactor prompts/registries.

**Pitfall + guardrail:** “works in demo” fails under concurrency. Add tracing for latency + session isolation, and run multi-session tests.

**Receipt:** Fig. 4 + evaluation section: pytest/pytest-asyncio test harness and Phoenix tracing monitoring performance, latency, and session isolation.

## Do this now (tight checklist)

- [ ] Pick 3–5 critical workflows and define “correct” as **function invocations + parameters**, not pretty text.
- [ ] Add curated ARIA labels to only the elements the agent must operate.
- [ ] Expose observations = **(ARIA snapshot + current URL)**.
- [ ] Write a per-page function registry (use prompt #2) and enforce page→function allowlisting.
- [ ] Add `navigate(url)` and surface reachable URLs from ARIA-labeled links.
- [ ] Add 2–5 composite actions for fragile multi-step workflows.
- [ ] Build WebSocket integration tests that assert function invocations; add tracing for latency + session isolation.

## Where this breaks

If you can’t keep ARIA labels + the page-function map up to date (they’re manual dependencies), your agent will silently drift as the UI evolves.

## Receipts (what I actually used)

- Fig. 1: interface-level vs embedded agent observation/action surfaces
- Fig. 2: shim → ARIA snapshot + per-page function registry → backend orchestrator
- Retrofit size claim: frontend shim **~150 lines** + function registry **~200 lines**
- Fig. 4 + eval notes: pytest WebSocket integration tests + Phoenix tracing for latency/session isolation

## Skeptic check (BEFORE prompts)

- Do you actually control the frontend/backend? If not, you’re stuck in “interface-level agent” land.
- Can you define success as **correct function calls** (not just “finished the task”)?
- Which workflows deserve composites vs primitives (4+ steps, high value, high fragility)?
- What is your policy for ARIA/registry changes (versioning, linting, breaking-change review)?
- What would you log to debug failures: URL, observation hash, tool name, params, latency, session ID?

<!-- prompts render from frontmatter -->
