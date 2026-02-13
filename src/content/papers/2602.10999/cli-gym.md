---
arxivId: "2602.10999"
catchyTitle: "Break Your Container (On Purpose)"
funnySubtitle: "If your agent can’t fix a CLI, it’s not an agent. It’s autocomplete with delusions."
blurb: "CLI-Gym proposes ‘agentic environment inversion’: start from a healthy Dockerized repo, have an agent *intentionally* degrade the environment until unit tests fail, then package that broken state + errors as a scalable CLI repair task (1,655 instances)."
tldr: "To train (or just stress-test) CLI agents, don’t hand-write “broken env” tasks. Invert them: start from a known-good Docker image, let an agent corrupt dependencies/configs until tests fail, then ship the broken image + failing tests + error logs as the task. Use this idea even if you never fine-tune a model: it’s a repeatable way to create hard, realistic debugging drills for humans+AI."
prompts:
  - title: "Turn a messy terminal failure into a crisp repair ticket"
    prompt: |-
      You are a senior engineer writing a high-signal bug report for an AI coding agent.

      Input:
      - Failing command(s):
      <paste commands>
      - Error output (verbatim):
      <paste logs>
      - What I expected:
      <paste>
      - Repo + environment context:
      <paste docker/venv/os details>

      Output:
      1) A one-paragraph problem statement.
      2) A minimal reproduction checklist (5–10 steps).
      3) A “likely root causes” list (3–6 items) *without fixing it*.
      4) Exactly what evidence would confirm each root cause.

  - title: "Make a ‘CLI-Gym style’ break-and-fix drill for my team"
    prompt: |-
      Design a realistic CLI debugging drill based on this repo description.

      Constraints:
      - It must be reproducible via Docker.
      - It must fail 2–5 specific tests/commands with a clear error signature.
      - The fix should require environment reasoning (deps, PATH, shared libs, permissions, config), not only code edits.

      Repo:
      <paste README summary>

      Output:
      - Goal of the drill
      - How to “break” the environment (commands/Dockerfile lines)
      - What failure to expect (exact error text patterns)
      - The verification commands/tests
      - Hints (2 levels: gentle, explicit)

tags: ["agents", "cli", "debugging", "docker", "evaluation", "training-data"]
sourceUrl: "https://arxiv.org/abs/2602.10999"
publishedAt: "2026-02-12T20:45:00-05:00"
author: "Good bot"
---

## The paper in one line

CLI-Gym is a recipe for *manufacturing* hard terminal debugging tasks at scale: **start from a healthy Dockerized repo, then deliberately corrupt the environment until tests fail, and package the broken state as the task.**

## What they built (concrete)

- **1,655 environment-intensive tasks** derived from **29** open-source Python repos.
- Each task includes:
  - an executable (broken) environment (Docker image),
  - an issue description generated from failing tests + logs,
  - the unit tests that define “fixed.”

Key mental model (their Figure 1 / Figure 2):

> “Code tasks have git history; environment tasks don’t. So we simulate ‘environment history’ by letting an agent *invent* it.”

### A figure caption worth stealing

From the PDF (Figure 4):

> **“A simplified example Dockerfile snippet that induces failures in a gold pandas environment by corrupting system libraries.”**

They literally corrupt shared library headers (e.g., `libsqlite3`, `libz`) so you get an `ImportError` and other system-level failures that force real diagnosis.

## The 80% you should steal (actionable, human-first)

### 1) Treat “broken environment” as a first-class artifact
If you’re asking an AI agent for help, *don’t just paste the stacktrace.*

Do this instead:
- capture the **exact environment** (Dockerfile, `pip freeze`, `conda env export`, `uname -a`),
- capture the **exact failing command** and **full output**,
- include the **verification** (tests/scripts) so the agent can prove it fixed.

CLI-Gym’s pipeline is extreme, but the habit transfers: **make the environment reproducible or accept hallucinations.**

### 2) Write “repair tasks” as failing tests, not vibes
CLI-Gym builds tasks from unit test failures (fail-to-pass tests).

Your move:
- If you want an agent to fix something, give it *a check.*
  - “Run `pytest tests/foo.py::test_bar` until it passes.”
  - “Run `./verify.sh` and paste output.”

This prevents endless “try random stuff” loops.

### 3) When debugging with an AI, force a tight loop: Observe → Hypothesize → Test
CLI work is where agents get lost.

Use a strict protocol:
1. **Observe:** paste the exact command and output.
2. **Hypothesize:** list 3–5 possible causes.
3. **Test:** run *one* discriminating command per hypothesis.
4. **Change:** apply the smallest fix.
5. **Verify:** re-run the failing tests.

This mirrors CLI-Gym’s execution-feedback-guided exploration.

### 4) Create your own “mini CLI-Gym” for team training
You don’t need 1,655 tasks. You need 5 that punch.

Pick one repo and create 3 reproducible breakages:
- dependency mismatch (wrong `numpy`, wrong `glibc`, wrong CUDA),
- PATH/permissions/config corruption,
- shared library breakage.

Then run a weekly “fix it with the agent” drill.

### 5) Use Docker as your *memory* (the paper’s core analogy)
They lean on an analogy:
- Dockerfile command sequence ≈ agent action history.

Your move:
- if you can’t explain the fix as a few Dockerfile lines (or shell commands), it’s probably not reproducible.

## What to believe vs not believe

### Believe
- Environment issues are under-trained relative to code issues.
- Execution feedback is the only sane guide in terminals.
- Diversity of environments matters a lot.

(Their Figure 7 caption in the HTML is explicit: **“Effect of environment diversity under a fixed data budget…”** performance rises as you add more source repos even with the same number of trajectories.)

### Be skeptical
- “Fully automated” doesn’t mean “always realistic.” An agent can create weird breakages humans rarely cause.
- Generated issue descriptions can accidentally leak hints (they discuss hint ablations in the appendix).

## If you only copy one thing

**Stop asking AI to debug “your machine.” Give it a machine it can reproduce.**

Even if you’re not training models, CLI-Gym’s inversion idea is a practical workflow:
1) build a known-good container,
2) reproduce the bug in the container,
3) hand the container + failing tests to the agent.

That’s how you turn terminal chaos into something an AI (and a human) can actually fix.
