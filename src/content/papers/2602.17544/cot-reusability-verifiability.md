---

arxivId: "2602.17544"
feed: "cs.AI"
catchyTitle: "Your CoT might be useless (even when it’s right)"
funnySubtitle: "If another model can’t execute it, it’s not reasoning — it’s vibes."
blurb: "Add two process metrics to your evals: reusability (does a chain persuade other models to flip answers?) and verifiability (does the same chain lead different models to the same conclusion?). The punchline: accuracy rankings barely predict either, so accuracy-only leaderboards lie about ‘reasoning quality.’"
tldr: "If you use chain-of-thought in agents, evaluate the chain itself — not just the final answer. This paper introduces two concrete metrics you can compute with a Thinker→Executor setup: **Reusability** (how often the chain flips an Executor’s answer, including via plausible corrupted chains) and **Verifiability** (how often different Executors reach the Thinker’s answer when following the Thinker’s chain). Across five benchmarks, these metrics are weakly/negatively correlated with accuracy, so pick ‘planner/teacher’ models by **V (and R)**, not just A."
paperTitle: "Evaluating Chain-of-Thought Reasoning through Reusability and Verifiability"
prompts:
  - title: "Prompt #1 — Convert a chain-of-thought into an executable, checkable spec"
    prompt: |-
      You are an Executor. You will receive a QUESTION and a CHAIN-OF-THOUGHT written by another model.

      Task: Rewrite the CHAIN-OF-THOUGHT into an executable checklist of steps that a different model could follow *without ambiguity*.

      Rules:
      - Output a numbered list of steps.
      - Each step must include: (a) an action, and (b) a check that confirms the step is done correctly.
      - If the CHAIN-OF-THOUGHT makes an assumption, convert it into an explicit ‘Assumption: …’ line with a test (how to validate).
      - If any step is not verifiable, mark it as ‘UNVERIFIABLE’ and propose a replacement step that is verifiable.

      QUESTION:
      {{question}}

      CHAIN-OF-THOUGHT:
      {{cot}}

  - title: "Prompt #2 — Generate a plausible-but-wrong corrupted chain for reusability testing"
    prompt: |-
      You are generating a CORRUPTED chain-of-thought for evaluation.

      Input: a QUESTION and a CORRECT chain-of-thought (CoT).

      Goal: Produce a new chain-of-thought that looks plausible and has similar style/length, but contains 2–4 subtle step changes that would lead an Executor to the WRONG final answer.

      Constraints:
      - Do NOT add obvious mistakes (no nonsense, no contradictions).
      - Keep the same intermediate structure (same number of steps ±1).
      - Change only a few decision points (e.g., swap a condition, misuse a definition, drop a constraint).
      - End with a final answer that differs from the correct one.

      Output ONLY the corrupted chain-of-thought (no commentary).

      QUESTION:
      {{question}}

      CORRECT CoT:
      {{cot}}

tags: ["evaluation", "chain-of-thought", "agents", "benchmarks", "reliability"]
sourceUrl: "https://arxiv.org/abs/2602.17544"
publishedAt: "2026-02-21T07:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Add two process metrics to every “reasoning” eval

**Claim:** Accuracy can be high while the chain is non-transferable or ambiguous, so you need process metrics alongside A.

- **How to use it:** For each Thinker model, report **A/R/V** per dataset: Accuracy (A), Reusability (R), Verifiability (V).
- **Decision rule:** If the model will *emit instructions for other models*, gate on **V ≥ your floor** (pick a number you can defend and keep it fixed).
- **Pitfall + guardrail:** Pitfall: picking a “reasoning” model because it tops an accuracy leaderboard; guardrail: require decent V before it can be a planner/teacher.
- **Receipt:** Table 6 shows low/negative Kendall τ between A, R, and V (e.g., GSM8K A vs R = -0.33), so accuracy rankings don’t predict chain quality.

### Move 2: Measure reusability as “can this chain persuade other models?”

**Claim:** A reusable chain should reliably change an Executor’s answer when you attach it to the question.

- **How to use it:** Compute reusability exactly as the paper defines it: **R = (|Q_helped| + |Q_harmed|)/|Q_correct| × 100** where (a) correct CoT helps an Executor flip wrong→right, and (b) corrupted CoT helps flip right→wrong.
- **Decision rule:** If you rely on cross-agent handoffs (one agent’s chain is another agent’s input), prefer higher R because it signals portability across executors.
- **Pitfall + guardrail:** Pitfall: high R also means the chain is an attack surface (plausible wrong steps can steer); guardrail: pair R with verification (next move) before execution.
- **Receipt:** Eq. (1) + Figure 1 + Table 1 (reusability scores across datasets/committees).

### Move 3: Measure verifiability as “does this chain have one meaning?”

**Claim:** A verifiable chain yields the same conclusion across different Executors, which is what you want for multi-agent consensus.

- **How to use it:** Compute **V = 100/|Q| × Σ I(answer_executor == answer_thinker)** when the Executor is given the Thinker’s CoT.
- **Decision rule:** If you plan to **store chains** (docs, memory, playbooks) and expect future models to follow them, treat low V as “underspecified” and rewrite the chain (use prompt #1).
- **Pitfall + guardrail:** Pitfall: V varies with which executors you test against; guardrail: keep a fixed executor committee so changes in V mean “chain quality changed,” not “judge changed.”
- **Receipt:** Eq. (2) defines V; Table 2 reports V across datasets/committees.

### Move 4: Use committees so your metric isn’t “one model’s opinion”

**Claim:** A single Executor can bias your scores; committees make R/V more reliable.

- **How to use it:** Pick a small, stable committee (e.g., 5 Executors) and **average** R and V across the committee.
- **Decision rule:** If you can only afford one setup, include at least a few strong executors, because rank-order stability improves with stronger committees.
- **Pitfall + guardrail:** Pitfall: obsessing over score scale (Strong > Full > Weak) instead of stability; guardrail: track rank-order stability with Kendall τ and only trust setups that produce stable rankings.
- **Receipt:** The paper reports Kendall τ = **1.0** (Strong vs Full) for reusability ranking and **0.8** for verifiability ranking (Tables 3–4).

### Move 5: Treat A/R/V disagreement as a debugging signal, not a paradox

**Claim:** When A is high but R/V are low, your chain is probably model-specific or vague — and that’s actionable.

- **How to use it:** For any “great accuracy, bad V” Thinker, force explicit invariants and checks (prompt #1), then re-measure V to see if the rewrite made the chain executable.
- **Decision rule:** Don’t deploy a model as a “planner/teacher” if it ranks high on A but low on V, because downstream Executors will interpret it inconsistently.
- **Pitfall + guardrail:** Pitfall: assuming specialized reasoning models always produce better chains; guardrail: measure it — in Table 5, rankings swap depending on whether you sort by A vs R/V.
- **Receipt:** Table 5 shows big swaps (e.g., GSM8K: DeepSeek-R1 A=94 but R=67; Phi4-Reasoning A=81 but R=84, V=88).

## Do this now (tight checklist)

- Pick 1–2 datasets you already use for model selection.
- Choose one Thinker (the model you want to evaluate) and a fixed Executor committee (3–5 models).
- Implement **R** (Eq. 1): count helped + harmed over Q_correct.
- Implement **V** (Eq. 2): executor/thinker answer agreement under Thinker CoT.
- Add a pipeline gate: “planner/teacher must satisfy V ≥ X.”
- Re-rank your models on A/R/V and record which picks change.

## Where this breaks

If you can’t reliably generate *plausible* corrupted CoTs, reusability can be inflated and stop measuring true persuasiveness.

## Receipts (what I actually used)

- Table 1: Reusability scores across datasets + executor committees.
- Table 2: Verifiability scores across datasets + executor committees.
- Table 5: Side-by-side A/R/V numbers (rounded).
- Table 6: Kendall τ correlations between A, R, V.

## Skeptic check (BEFORE prompts)

- Is your Executor committee fixed (same models + decoding) so V is comparable over time?
- Are you comparing models on the same question set Q (no silent filtering differences)?
- Did you follow the paper’s definition of R using Q_correct (not the full dataset)?
- Can you reproduce R/V on a second run (variance check), or are you measuring sampling noise?
- Did you inspect at least one “same CoT, different answer” case to see what ambiguity looks like?

<!-- Prompts render from frontmatter -->
