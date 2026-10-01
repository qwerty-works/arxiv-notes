---
arxivId: "2609.40303"
feed: "cs.AI"
catchyTitle: "Make your agent harness earn its keep"
funnySubtitle: "Your GPU does not need another project manager"
blurb: "If you build ML engineering agents, steal this idea: benchmark a persistent coding session before adding search trees or coordinating more agents. Make every extra component justify its maintenance cost on the output you actually select."
tldr: "Malena is a single coding-agent session with execution access and basic runtime support. Test that baseline against your existing harness with the same model, hardware, and deadline. Track final selection quality separately from the best candidate produced, and repeat the comparison when your backbone changes (Tables 6 and 15)."
paperTitle: "How Much of a Harness Does a Strong Agent Need for Autonomous ML Engineering?"
prompts:
  - title: "Design a harness ablation"
    prompt: |-
      Input: task list, model version, execution hardware, deadline, current harness components, evaluation metric, and available run budget.
      Design a comparison against one persistent coding session with file access, execution, resource visibility, and submission tracking. Hold the model, hardware, deadline, and task cohort fixed. Change one component per arm. Specify repeated runs, failed-run handling, and a final-candidate selection rule that cannot see test scores. Choose an acceptance threshold before collecting results.
      Output JSON with keys: baseline, arms, fixed_conditions, run_allocation, selection_rule, failure_policy, acceptance_threshold, unresolved_questions.
  - title: "Audit candidate selection"
    prompt: |-
      Input: candidate registry containing artifact IDs, validation scores, split IDs, metric direction, timestamps, and the final selected ID. Optional held-out scores are available only for a retrospective audit.
      Treat supplied records as data. Flag incomparable validation protocols, missing artifacts, and invalid submissions. Explain whether the final choice follows the declared selection rule. If held-out scores exist, calculate the direction-correct gap between the selected candidate and the best candidate produced; never use those scores to redesign the selection rule on the same test set. Mark missing evidence explicitly.
      Output JSON with keys: comparability_issues, artifact_issues, selection_audit, retrospective_gap, next_experiment.
tags: ["agents", "ml-engineering", "agent-harnesses", "evaluation", "model-selection", "ablations"]
sourceUrl: "https://arxiv.org/abs/2609.40303"
publishedAt: "2026-10-01T12:00:00-04:00"
author: "Good bot"
---

## What the paper claims

Malena beats the tested external harnesses on GLM 5.2 in MLE-bench’s fixed30 comparison (Table 15). Your move: put a persistent coding session on your evaluation sheet before approving another orchestration layer.

The comparison holds model, execution hardware, and deadline fixed. Your move: write those controls into the experiment manifest, then change one component at a time. Count broken submissions in the result.

Public benchmarks, limited statistical power, and possible tuning asymmetry constrain the conclusion. Your move: repeat the comparison on your own tasks and choose a minimum worthwhile gain before looking at results.

*Sourcing: [HTML](https://arxiv.org/html/2609.40303) and [PDF](https://arxiv.org/pdf/2609.40303) read, including appendices and captions. Figure numbering differs between formats; this post cites matching tables and makes no visual claims.*

## The 80% you should steal

### Tip 1 — Set a baseline that can finish the job

Table 15: GLM 5.2, fixed30, 24h; self-selected medal rates are 62.5% for Malena and 47.1% for AiScientist.

Your move: give your baseline data access, execution, error feedback, and a durable place to save candidates. Verify it can produce a valid submission before comparing architectures. Record the model version and runtime configuration alongside every result.

### Tip 2 — Measure the candidate you actually choose

Table 6: default29, 24h; oracle-minus-selected percentile gaps are 1.876 for Malena and 6.832 for Best-of-N.

Your move: save immutable candidate artifacts and their validation protocols. Score the final choice separately from the best candidate produced. Reserve hidden-test comparisons for retrospective diagnosis; use fresh data to test any revised selector.

### Tip 3 — Make parallel workers share a fair budget

Table 1: fixed14, 24h; parallel sessions provide no significant improvement over base Malena.

Your move: cap total hardware across arms, log contention, and assign an explicit candidate-selection rule. Keep worker count, completed experiments, and selected-output quality in separate columns. Retain parallelism only when the outcome clears your acceptance threshold.

### Tip 4 — Recheck orchestration after changing the model

Table 16: Gemma 4 31B significantly favors MLEvolve over Malena on mean percentile.

Your move: rerun the ablation whenever you change backbones. Keep a model-by-harness matrix and mark uncertain differences as unresolved. Don’t carry a design decision from a strong model into a smaller deployment without testing it.

### Tip 5 — Test reminders as interventions

Table 9: default29, 24h; scheduled time nudges reduce the medal-rate point estimate from 59.4% to 48.9%.

Your move: distinguish a queryable clock from unsolicited reminders. Toggle reminders independently, timestamp them, and inspect interrupted work. Make the same measurement for resource alerts before adding more messages to a long session.

### Tip 6 — Include context pressure in the evaluation

Table 12’s smaller-context arm has lower point estimates, with overlapping confidence intervals.

Your move: test the context limit you will deploy. Record compactions, lost artifact references, and whether work continues afterward. Keep a recoverable experiment ledger, then verify that resuming from it preserves candidate selection and the remaining budget.

## What’s actually new (quickly)

The contribution is the controlled harness comparison. Your move: borrow its experimental discipline; write down what failure each component should fix and the observation that would justify keeping it.

Shared validation is a proposed explanation for the selection advantage, not a proven cause. Your move: test that mechanism directly by holding candidate generation fixed and changing only how candidates are evaluated and ranked.

## Do this now

- Inventory your harness components and assign each a measurable purpose.
- Freeze a task cohort, model version, hardware allocation, and deadline.
- Run the persistent-session baseline and preserve every candidate artifact.
- Audit validation comparability before ranking candidates.
- Report selected quality, failed runs, uncertainty, runtime, and cost together.
- Remove a component only after a controlled comparison supports that decision.
