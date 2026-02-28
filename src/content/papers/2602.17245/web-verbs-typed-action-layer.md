---
arxivId: "2602.17245"
catchyTitle: "Stop letting agents click the internet"
funnySubtitle: "If it needs 40 clicks, it needs a function"
blurb: "Package the web’s messy workflows as typed ‘verbs’ with contracts (pre/postconditions + logs), then force your agent to write short code over those verbs instead of driving the GUI. Use Prompt #1 to spec verbs, Prompt #2 to compile tasks into runnable workflows, and Prompt #3 to harden locators and failure detectors."
paperTitle: "Web Verbs: Typed Abstractions for Reliable Task Composition on the Agentic Web"
tldr: "Wrap brittle web workflows into typed ‘verbs’ (functions with structured I/O + contracts), then make your agent write short programs over those verbs instead of clicking UIs. The paper reports 100/100 task success for a verb-based prototype, while GUI-agent baselines fail common tasks and run 2.7×–8.3× slower on the tasks they do complete."
prompts:
  - title: "Prompt #1 — Verb spec writer (typed signature + contract)"
    prompt: |-
      You are helping me design a ‘web verb’ (a typed function) that wraps a multi-step web workflow.

      Input:
      - workflow_name: <name>
      - user_goal: <1 sentence>
      - inputs_available: <list of fields I can provide>
      - outputs_needed: <list of fields downstream code needs>
      - side_effects: <what it changes on the website/account>
      - constraints: <budget/time/policy constraints>

      Task:
      1) Propose a function signature in a typed style (choose TypeScript or Java).
      2) Define input types and an output record type (structured fields; no free-form text blobs).
      3) Write a DocString that states semantics and edge cases.
      4) Write PRECONDITIONS (auth/session/cookies/permissions) and POSTCONDITIONS (checks that prove success).
      5) Define logging fields to record at call boundaries (inputs, outputs, timing, URL/domain touched).

      Output: a single code block containing signature + types + DocString + Preconditions + Postconditions + Logging schema.

  - title: "Prompt #2 — Workflow compiler (compose verbs into runnable code)"
    prompt: |-
      You are a coding agent. Use ONLY the provided verb catalog. Do not invent new verbs.

      Input:
      - task: <natural language goal>
      - verb_catalog: <list of verbs with typed signatures + docs>

      Rules:
      - Produce code (not a plan).
      - Prefer fewer verb calls over many small ones.
      - Use explicit loops/conditionals for aggregation, ranking, and constraints.
      - After each verb call, check the verb’s POSTCONDITIONS; if a postcondition fails, stop and output a minimal debug report.

      Output:
      1) Runnable code in the catalog’s language.
      2) A short ‘expected logs’ list (what I should see per verb call).

  - title: "Prompt #3 — Verb hardening checklist (stability + locator strategy)"
    prompt: |-
      You are reviewing a proposed web verb implementation that wraps a browser workflow (e.g., Playwright).

      Input:
      - verb_spec: <signature, doc, pre/postconditions>
      - locator_plan: <how elements are selected>
      - run_log_sample: <one successful run log>

      Task:
      Give a hardening checklist with:
      - 5 stability tests (cross-session, cross-locale, slow network, logged-out state, UI variant).
      - 5 failure detectors (wrong page, empty results, partial completion, consent dialogs, rate limits).
      - A ‘locator quality score’ rubric (what to replace first).

      Output: bullets only.

tags: ["agents", "tool-use", "web", "reliability", "evaluation", "automation"]
sourceUrl: "https://arxiv.org/abs/2602.17245"
publishedAt: "2026-02-22T08:30:00-05:00"
author: "Good bot"
---

If your “web agent” is mostly **click/scroll/type**, you’re operating at the wrong abstraction level. Your next operator move: **wrap the messy, multi-step site flows into typed functions (“verbs”) with structured inputs/outputs and contracts**, then make the model **write short code over those verbs** instead of driving the GUI.

## The playbook (5 moves)

### Move 1: Promote repeated UI flows into *typed verbs* (stop paying the click tax)

**Operator move:** pick your top 5 brittle workflows (anything that takes ≥10 GUI steps or crosses sites) and package each as a function with **typed parameters + a structured return object**. Then change your agent policy so the LLM can call *only* verbs (no raw browser control) for production tasks.

Decision rule: if a task is “one intent but many steps” (search + filter + pick + extract), it’s a verb.

Pitfall + guardrail: don’t ship “verbs” that are just scripts with magic selectors; require a reproducibility check (same input → same outputs across runs) before you bless it as stable.

(Use prompt #1 to write the verb spec + contract.)

### Move 2: Put contracts on the boundary (preconditions/postconditions + logging)

**Operator move:** for every verb, write **preconditions** (auth/session/permissions) and at least one **postcondition** you can check immediately (non-empty results, item appears in cart, route distance exists). Log inputs/outputs/timing so you can replay failures.

Decision rule: if the verb can spend money, submit forms, or mutate account state, it must be “fail-closed”: if postconditions don’t hold, stop and surface the debug report.

Pitfall + guardrail: the common failure isn’t a crash — it’s **silent partial success**. Guardrail: postconditions + structured outputs (no “it looks done” free-text).

### Move 3: Force explicit computation as code (loops/conditionals, not vibes)

**Operator move:** when the user asks for ranking, budgeting, or optimization, require the model to output runnable code that composes verbs and computes the result (nested loops, combination search, filters). Don’t accept a narrated plan.

Decision rule: if the task includes words like *rank*, *maximize*, *under budget*, *aggregate*, *compare*, demand a program.

Pitfall + guardrail: models “shortcut” (greedy picks, waypoint hacks, skipping constraints). Guardrail: unit-test the computation on a tiny synthetic case (2 hotels × 2 museums; 2 categories × 2 items) and compare to a reference.

(Use prompt #2 to compile a task into code over your verb catalog, with postcondition checks after each call.)

### Move 4: Benchmark like an operator (success rate + wall-clock)

**Operator move:** build a 10-task smoke suite and track two metrics: **pass/fail** and **runtime**. Promote verbs to “stable” only after repeated passes; prioritize new verbs where your baseline fails or is slow.

Decision rule: if your GUI-agent baseline is >2× slower or fails tasks that include real decision logic, stop prompt-tuning and add verbs.

Pitfall + guardrail: don’t cherry-pick lookups. Guardrail: include at least one multi-step decision task (budgeting/ranking) and one longer trace task to stress memory.

### Move 5: If you must automate UIs, build verbs like a product (record → generate → harden)

**Operator move:** record the workflow once, generate Playwright (or equivalent), then refactor: parameterize the variable inputs, structure the outputs, and add stability tests.

Decision rule: if no API exists for the capability, wrap the client flow as a verb instead of handing the LLM raw click control.

Pitfall + guardrail: locator rot. Guardrail: use stable identifiers where possible, and in your own apps introduce stable “public locators” so automation isn’t hostage to CSS churn.

(Use prompt #3 to harden the implementation and score locator quality.)

## Do this now (tight checklist)

- Pick one workflow your agent currently fails at (≥10 GUI steps).
- Write a verb spec with typed I/O + pre/postconditions (prompt #1).
- Implement the verb and add boundary logging (inputs/outputs/timing).
- Switch the agent to synthesize code over verbs for that workflow (prompt #2).
- Add it to a 10-task smoke suite and track success rate + runtime.

## Where this breaks

If you don’t control (or can’t stabilize) the underlying UI/API surface, your verbs can rot quickly and you’ll be back to brittle automation.

## Receipts (what I actually used)

- Table 1: 10 representative tasks where baselines fail and the prototype succeeds.
- Figure 9: baseline runtime is 2.7×–8.3× slower on tasks they complete.
- Section 4.3: 100-task benchmark reported as 100% success (manual verification; subset rerun consistency).
- Section 4.1 / Figure 3: recorded browser actions → Playwright function → parameterized inputs + structured outputs.

## Skeptic check (BEFORE prompts)

- Are your “verbs” actually stable interfaces, or just UI scripts with fragile selectors?
- Do your verbs return structured outputs you can compute on (not blobs you have to re-parse)?
- Do you have postconditions that detect silent failures (wrong page, empty results, partial completion)?
- Are you benchmarking on tasks that include real decision logic (ranking/budgeting), not only lookups?
- Can you replay a failure from logs without re-running the whole session interactively?

(Use the prompts rendered below: define verbs → compile workflows → harden implementations.)
