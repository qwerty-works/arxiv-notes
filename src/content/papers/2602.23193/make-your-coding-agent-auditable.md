---
arxivId: "2602.23193"
catchyTitle: "Make your coding agent auditable by construction"
funnySubtitle: "If it can free-type, it can free-break."
blurb: "If your agent edits files directly, you don’t have an ‘autonomous developer’—you have an unbounded blast radius plus a debugging nightmare. This paper proposes ESAA: treat the LLM as an intention emitter (validated JSON only), route every state change through a deterministic orchestrator, and store an append-only event log you can replay and hash-verify. Two case studies report 0 out-of-contract outputs and successful replay verification, while supporting multi-agent concurrency."
tldr: "Use event sourcing for agents: (1) require a strict JSON intention schema, (2) validate + apply effects in a deterministic orchestrator, (3) keep an append-only event log, (4) project a read-model with a reproducible hash, (5) never let the model write files directly. Gate merges on replay+hash verification."
paperTitle: "ESAA: Event Sourcing for Autonomous Agents in LLM-Based Software Engineering"
prompts:
  - title: "Intention-only agent interface (JSON schema)"
    prompt: "You are an engineering agent. Output ONLY JSON that matches this schema:\n{\"task_id\":string,\"action\":\"propose_patch\"|\"report_issue\",\"proposals\":[{\"path\":string,\"patch\":string}],\"risks\":[string],\"tests_to_run\":[string]}\nRules: (1) Do not write files directly. (2) If you can’t express it as a patch, report_issue instead. (3) Every proposal must name the file path and include a unified diff."
  - title: "Replay+hash verification gate"
    prompt: "Given an append-only event log (jsonl) and a read-model (roadmap.json), write a verification plan: canonicalize the projected state, compute SHA-256, compare to stored projection_hash_sha256. Define failure modes (mismatch/corruption) and what to do (block merge, bisect event, re-run projection). Output as a step-by-step CI job."
tags:
  - "agents"
  - "software-engineering"
  - "reliability"
  - "security"
  - "tooling"
sourceUrl: "https://arxiv.org/abs/2602.23193"
publishedAt: "2026-02-28T07:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)
### Move 1: Don’t let the model mutate state; make it emit *intentions*
Operator move: change your agent’s *action interface* so the only thing it can produce is a schema-valid JSON intention (e.g., proposed patch + metadata). Put file writes, shell, and network behind a deterministic orchestrator.
Pitfall + guardrail: if the agent can write files directly, you won’t know whether a “fix” was applied, partially applied, or silently bypassed. Guardrail: deny direct `file.write` and accept only contract-valid events.
Receipt: Figure 1 caption describes the cycle: intention → validate → append to an event log → apply effects → project a read-model.

### Move 2: Make the append-only log your source of truth (not a repo snapshot)
Operator move: record every accepted intention *and* every effect as an ordered, append-only event stream (JSONL is enough). Treat the “current state” as a projection you can rebuild.
Metric / check: you should be able to replay from event 0 on a clean checkout and reproduce the same read-model. If you can’t, you don’t have governance—you have vibes.
Receipt: the paper’s canonical artifacts include an event store (`activity.jsonl`) and a projected view (`roadmap.json`).

### Move 3: Hash the projection and gate merges on replay verification
Operator move: define a deterministic canonicalization for your projected state (stable key order, stable separators), compute SHA-256, and store it as `projection_hash_sha256`.
Decision rule: treat “hash mismatch on replay” like “tests failing”: block merge, bisect the offending event, and fix the determinism leak (tool versions, formatting, non-pinned dependencies).
Receipt: Appendix D gives the canonicalize→hash→compare recipe; Section 6.2 frames this as time-travel debugging.

### Move 4: Write boundary contracts per task type (and make “not allowed” the default)
Operator move: define explicit allowlists for what a spec task can do vs an impl task vs QA (tools, paths, patch types). Validate the intention against those contracts before applying it.
Pitfall + guardrail: a permissive schema recreates your original blast radius. Guardrail: start with a small vocabulary and expand only when you have a clear need.
Receipt: Table 1’s checklist calls out boundary contracts + blast radius containment as differentiators.

### Move 5: Use the event log as your multi-agent coordination primitive
Operator move: let agents run in parallel, but serialize acceptance into the append-only log. Detect conflicting file edits at “apply time” (or refuse + re-plan) instead of trying to coordinate via prompt text.
Metric / check: you should be able to point to the exact event that introduced a bad change *and* reconstruct the repo right before it.
Receipt: Table 2 reports multi-agent concurrency in the larger case study (including an example of 6 claims within 1 minute), while still keeping `output.rejected = 0` and `verify_status = ok`.

## Do this now (checklist)
- Replace direct action execution with an “intention-only” interface: model outputs JSON, orchestrator does everything else.
- Add an append-only event log (accepted intentions + effects). Don’t skip tool I/O if you’ll need full replay later.
- Implement replay verification with canonicalization + SHA-256; block merges on mismatch.
- Write boundary contracts per task kind (spec/impl/qa) and validate before applying.
- For multi-agent setups: parallelize *work*, serialize *commit* (event acceptance) to keep a total order.

## Where this breaks
- Non-deterministic orchestrators (unpinned tool versions, non-deterministic formatters) will make replay drift; fix it like a reproducible-build problem.
- Over-tight schemas can cause rejection spam; loosen with explicit “report_issue/uncertain” paths instead of allowing free-form output.
- If you don’t record enough context (e.g., tool outputs), you’ll get “replayable-ish” logs that fail exactly when you need forensics.

## Skeptic check (before you copy this)
- Can you replay yesterday’s run on a clean checkout and get the same projection hash?
- Do you have a real allowlist per task type (or are you hoping prompt text is a policy engine)?
- When something breaks, can you name the exact event id/seq that caused it and reconstruct state before/after?

## Receipts
- Figure 1: orchestration cycle + “purified view” idea (agent sees derived facts, not raw mutable state).
- Table 1: governance feature checklist (event log, deterministic replay, contracts, blast radius containment).
- Table 2: case-study metrics (CS1: 9 tasks / 49 events; CS2: 50 tasks / 86 events; both report `output.rejected = 0`; CS2 supports concurrency).
- Appendix D: canonicalization + hash verification pseudocode.
