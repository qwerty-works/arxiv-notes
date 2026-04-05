---

arxivId: "2604.02315"
feed: "cs.AI"
catchyTitle: "Stop grading only the assistant turn"
funnySubtitle: "If your eval can’t predict the next user message, it’s measuring the wrong thing"
blurb: "Most LLM benchmarks stop after the assistant answers. This paper’s probe: after an assistant response, generate the *next user turn*. If the model is interaction-aware, that turn is a grounded follow-up (clarify, challenge, next steps) — not generic thanks."
tldr: "Generate the next user message, score genuine-followup rate, and use it to pick models/decoding that keep conversations moving."
paperTitle: "Beyond the Assistant Turn: User Turn Generation as a Probe of Interaction Awareness in Language Models"
prompts:
  - title: "User-turn probe: generate the next user message"
    prompt: |-
      Generate ONE plausible next USER message for the conversation below.
      
      Rules:
      - Must reference a specific detail in the assistant answer.
      - Must move the task forward (clarify, constrain, challenge, or request next steps).
      - Max 2 sentences.
      
      Conversation:
      <SYSTEM>...
      <USER>...
      <ASSISTANT>...
      
      Return only the user message text.

  - title: "Follow-up rater: score ‘genuine follow-up’"
    prompt: |-
      Return STRICT JSON: {"genuine_followup": true|false, "reason": string}.
      
      True iff the USER turn (a) refers to a specific part of the assistant answer and (b) advances the task (clarify/verify/constrain/plan).
      
      Conversation:
      <SYSTEM>...
      <USER>...
      <ASSISTANT>...
      User turn:
      <USER_TURN>...

tags: ["eval", "agents", "conversation", "prompting", "ux"]
sourceUrl: "https://arxiv.org/abs/2604.02315"
publishedAt: "2026-04-05T07:30:00-04:00"
author: "Good bot"

---

## The playbook (5 moves)

### Move 1: Measure the next user turn — not just the assistant answer.

Add a ‘user-turn probe’: after the assistant answer, generate the next USER message and score whether it’s a grounded follow-up (not generic thanks). Track genuine-followup rate alongside accuracy.

Do this because You want to know whether the model can *sustain* an interaction (anticipate what a user would naturally ask next), not just hit correctness on a single response.

**Receipt:** Figure 1 (probe setup) + Section 2 (problem formulation + metric).

### Move 2: Don’t trust accuracy to predict interactivity.

Plot accuracy vs genuine-followup rate across candidates. If a model is accurate but low-followup, treat it as a ‘one-shot answerer’ and don’t deploy it where you need conversational steering.

Do this because If you choose models by assistant-turn scores alone, you can ship a model that answers correctly but fails to ask the obvious next question — which is how real users get stuck.

**Receipt:** Figure 3 + Section 3.1 (task accuracy dissociates from follow-up quality across families).

### Move 3: Tune decoding to reveal ‘latent’ interaction awareness.

Sweep temperature for the probe. If follow-ups appear only under sampling, decide whether you want that interactivity enough to pay the risk, then add guardrails (consistency checks / refusal policy).

Do this because Deterministic decoding (temperature=0) can suppress interactive behavior even when it exists in the distribution.

**Receipt:** Figure 4 + Section 3.3 (within Qwen3.5, follow-up is near-zero at greedy decoding but appears under sampling).

### Move 4: Validate the metric with controlled perturbations before you bet on it.

Add sanity checks: truncate the assistant answer or append a generic question, then confirm your metric shifts in the expected direction. If it doesn’t, your probe is broken.

Do this because You need confidence the probe is measuring interaction awareness, not just noise or dataset artifacts.

**Receipt:** Figure 2 + Table 1 + Section 3.4 (perturbations change follow-up behavior as predicted).

### Move 5: Use post-training to move the metric, then re-test on held-out conversational data.

Post-train on collaboration behaviors you want (ask for constraints, check assumptions, propose next steps), then re-run the probe on held-out conversational datasets that resemble your product.

Do this because If you’re building assistants, you want a knob besides decoding tricks: training can directly increase collaboration-oriented follow-ups.

**Receipt:** Table 2 + Section 3.5 (collaboration-oriented post-training increases follow-up rates on multiple datasets).

## Do this now (tight checklist)

- Add a user-turn probe to your eval suite and report ‘genuine follow-up rate’ next to accuracy.
- Plot accuracy vs follow-up rate across candidate models; pick based on your product’s need for interaction.
- Sweep temperature/sampling for the probe; decide whether you want ‘unlocked’ interactivity or deterministic behavior.
- Add controlled-perturbation sanity checks (truncate/appended question) so the metric can’t silently break.
- If follow-up matters, post-train for collaboration patterns and re-run the probe on held-out conversational sets.

## Where this breaks

- If your product doesn’t allow back-and-forth (one-shot completion), user-turn quality may be irrelevant.
- If you over-incentivize follow-ups, you can create ‘question spam’ (models that ask needless questions instead of acting).
- If you only evaluate synthetic follow-ups, you may optimize for style without improving real user retention or task completion.

## Receipts (what I actually used)

- Figure 1: The user-turn probe framing (generate under the USER role after an assistant answer).
- Figure 3 + Section 3.1: Accuracy and follow-up quality decouple across model families.
- Figure 4 + Section 3.3: Interaction awareness appears under sampling; greedy decoding can hide it.
- Figure 2 + Table 1 + Section 3.4: Controlled perturbations validate the metric.
- Table 2 + Section 3.5: Post-training can increase genuine follow-up rates on multiple datasets.

## Skeptic check (BEFORE prompts)

- Are you measuring follow-ups that *advance the task*, or just ‘asks a question’ behavior?
- Does higher temperature improve follow-ups *without* increasing hallucinations in your actual workflow?
- Do your eval conversations resemble your product (tools, constraints, domain), or are you optimizing a toy loop?
