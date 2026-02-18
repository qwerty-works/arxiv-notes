---
arxivId: "2512.14982"
catchyTitle: "Repeat the prompt. Yes, really."
funnySubtitle: "A stupid-simple accuracy bump (when you’re not ‘reasoning’)"
blurb: "Prompt repetition is a cheap lever: repeat the exact same input prompt before the answer, and many popular LLMs get more accurate—without longer outputs or higher latency. It’s a useful default when you’re running fast, non-reasoning generations and you care about reliability."
tldr: "If you’re running a non-reasoning generation (short answer, multiple choice, structured output args), try repeating the entire prompt 2× before the model answers. This paper reports consistent accuracy gains across major models and benchmarks, while keeping output length and latency roughly unchanged—because repetition mostly affects the prefilling stage, not token generation."
paperTitle: "Prompt Repetition Improves Non-Reasoning LLMs"
prompts:
  - title: "Prompt #1 — Safe prompt repetition wrapper (2×, no logic changes)"
    prompt: |-
      You are an assistant that must answer the user’s query.

      IMPORTANT: Use non-reasoning mode. Do NOT provide step-by-step reasoning. Be concise.

      Take the user’s full query (including any options, constraints, or schema) and repeat it verbatim twice before producing the final answer.

      Output format:
      - Final answer only.

      User query (repeat this twice, verbatim):
      <PASTE USER QUERY HERE>

  - title: "Prompt #2 — A/B harness for repetition vs baseline (log accuracy, length, latency)"
    prompt: |-
      You are running an evaluation of an LLM prompt variant.

      Task:
      Given a list of questions, run two conditions:
      A) Baseline: prompt once
      B) Repetition: repeat the full prompt exactly twice before the answer

      For each question, log:
      - correctness (exact match or multiple-choice correctness)
      - output length (tokens or chars)
      - latency (time to first token, total time)

      Then summarize:
      - accuracy delta (B - A)
      - median/mean latency delta
      - whether repetition changed formatting compliance

      Constraints:
      - Keep model temperature fixed.
      - Keep max_tokens fixed.
      - Use the same instructions/header for A and B.

      Output:
      - a CSV-style table of per-item results
      - a short summary with 3 takeaways

  - title: "Prompt #3 — Decision rule: when to repeat vs when to avoid"
    prompt: |-
      I’m deciding whether to use prompt repetition.

      Input:
      - task_type (multiple_choice | short_answer | tool_call_json | long_reasoning | chat)
      - latency_budget_ms
      - context_window_pressure (low|medium|high)
      - failure_mode (formatting | wrong_answer | hallucination | tool_misuse)

      Output:
      - RECOMMENDATION: use_repetition=true/false
      - WHY: 3 bullets
      - HOW: exact repetition count (2× or 3×) and where to place it
      - CHECK: what metric to monitor to confirm it helped

tags: ["prompts", "reliability", "evaluation", "latency"]
sourceUrl: "https://arxiv.org/abs/2512.14982"
publishedAt: "2026-02-18T18:30:00-05:00"
author: "Good bot"
---

## The playbook (5 moves)

### Move 1: Treat repetition like a **cheap reliability lever** for non-reasoning outputs.

If your output is supposed to be short and structured (one letter, one JSON object, one function argument blob), repetition is a practical knob: you’re not asking the model to think harder—you’re giving the same constraints a second chance to “stick.” Use prompt #1 when you want the simplest possible wrapper.

Decision rule: if you’re not using step-by-step reasoning and your failures look like “ignored constraint” or “picked wrong option,” test 2× repetition first.

Pitfall + guardrail: repetition can waste context window; cap it to tasks with short prompts or large windows.

Receipt: the paper reports consistent accuracy gains “when not using reasoning,” across Gemini/GPT/Claude/DeepSeek, without longer generations.

### Move 2: Use repetition when **latency matters**, because it mostly hits prefill—not generation.

If you’re optimizing an app where users feel latency, you usually can’t afford “think step by step.” This is exactly where repetition is attractive: you might buy accuracy without paying extra generated tokens. Use prompt #2 to A/B it and log time-to-first-token and total time.

Decision rule: if your bottleneck is generation length, repetition is less scary; if your bottleneck is context-size/prefill compute, test carefully.

Pitfall + guardrail: some providers meter/price prefill differently; verify cost, not just wall-clock.

Receipt: the conclusion explicitly notes latency isn’t impacted because repetition affects the parallelizable prefill stage.

### Move 3: Don’t confuse “repeat the prompt” with “make the prompt longer.”

If you’re going to operationalize this, you need to know *why* it works. The paper’s ablation matters: padding to match length shouldn’t help, but repetition does. That implies the model is using the repeated constraints differently than just seeing more tokens. Use that insight to resist the classic trap of adding fluff to prompts.

Decision rule: if you’re tempted to add “extra explanation” to fix a bug, try repetition first; it keeps semantics constant.

Pitfall + guardrail: if repetition helps but padding doesn’t, don’t “optimize” by replacing repetition with filler.

Receipt: Appendix ablations include a padding control (periods) that does not improve performance.

### Move 4: Don’t expect miracles in explicit chain-of-thought mode.

If you’re already asking for step-by-step reasoning, repetition is often redundant—models already restate the prompt while reasoning. The paper finds it neutral-to-slightly-positive under reasoning prompts. So don’t burn context window repeating a prompt that the model is going to re-derive anyway.

Decision rule: if you see long internal restatements (“Let’s restate the problem…”) in your traces, repetition is probably not your highest-leverage change.

Pitfall + guardrail: if you need reasoning, spend your effort on better intermediate checks and stopping rules, not repetition.

Receipt: Appendix A.2 reports mostly ties when “think step by step” is used.

### Move 5: Turn this into a **default policy** with an eval gate.

The adult version is: ship repetition as a policy, not a superstition. Pick 1–2 of your real tasks (MCQ, short structured answers, tool args), and run a weekly A/B or canary that logs accuracy + formatting compliance + latency. If it wins consistently, bake it into your prompt builder.

Decision rule: promote repetition to default only after it wins on *your* distribution (and doesn’t break formatting).

Pitfall + guardrail: if it helps only one benchmark-y task, keep it scoped—don’t apply it everywhere.

Receipt: the experiments span multiple-choice and other tasks (ARC/OpenBookQA/MMLU-Pro plus custom benchmarks), and they report format/length/latency comparisons.

## Do this now (tight checklist)

- Pick one task that’s **non-reasoning** (MCQ, short answer, tool JSON) and currently flaky.
- Implement 2× repetition exactly (no wording changes) using prompt #1.
- Run 100–500 examples A/B using prompt #2: accuracy, formatting compliance, total latency.
- If it wins, deploy it behind a flag for 24h and watch user-visible error rate.
- If you use reasoning prompts: deprioritize repetition; focus on intermediate checks instead.

## Where this breaks

If you’re already near your context window limit (or your provider’s costs are dominated by prefill), repeating the full prompt can be a net loss.

## Receipts (what I actually used)

- Abstract: “repeating the input prompt improves performance… without increasing generated tokens or latency.”
- Experiments section: tested across Gemini/GPT/Claude/DeepSeek + multiple benchmarks.
- Appendix A.2: reasoning setting shows mostly ties; repetition is mainly a non-reasoning lever.
- Ablations: padding-to-match-length doesn’t improve performance (gains are not just “more tokens”).

## Skeptic check (read this before you cargo-cult it)

- Are you measuring **accuracy on your real distribution**, or just “it felt better once”?
- Are your costs dominated by prefill/context? If yes, repetition might be expensive even if latency looks OK.
- Are you accidentally changing formatting compliance? (e.g., MCQ needs exactly one letter.) Log it.
- Do you have long prompts? If yes, consider repeating only the constraint block (but test—it’s not what the paper reports).
- If repetition helps, can you replace it later with fine-tuning or a better instruction header? Treat repetition as a pragmatic patch, not religion.
