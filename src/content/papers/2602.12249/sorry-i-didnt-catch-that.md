---
arxivId: "2602.12249"
catchyTitle: "Street Names Are the Boss Fight"
funnySubtitle: "Low WER, high-stakes faceplant"
blurb: "15 production-grade ASR models miss ~44% of spoken U.S. street names; the downstream map/routing error is ~2× worse for non‑English primary speakers. A simple fix: fine-tune with <1k synthetic named-entity pronunciations generated via multilingual TTS style-transfer." 
tldr: "If your product lives on named entities (street names, hospitals, account names), benchmark *those*, not generic WER: the paper finds ~44% street-name transcription errors across 15 popular models, with ~2× routing-distance harm for non‑English primary speakers. A lightweight mitigation—generate diverse pronunciations via multilingual TTS style transfer and fine-tune with <1,000 samples—cuts error dramatically (≈60% relative for non‑English primary speakers)." 
paperTitle: "\"Sorry, I Didn't Catch That\": How Speech Models Miss What Matters Most"
prompts:
  - title: "Named-entity hard mode evaluator (street names / SKUs / hospitals)"
    prompt: |-
      You are evaluating a speech-to-text system for *named entities*.

      Given:
      - ground_truth_entity: <string>
      - asr_transcript: <string>
      - context: <city/domain, optional>

      Tasks:
      1) Decide if the ASR transcript contains a phonetically-correct rendering of the ground_truth_entity.
         - Be orthography-agnostic (e.g., Cesar vs Ceasar).
         - Allow missing suffixes (e.g., Blvd/St) if entity identity is preserved.
      2) If incorrect, classify the failure:
         - substitution (wrong entity)
         - near-homophone (sounds close)
         - truncation/omission
         - hallucinated plausible entity
         - other (explain)
      3) Propose 3 targeted test cases that would likely break the system (same city/domain).

      Output JSON with keys: {"is_correct":bool,"failure_type":string,"notes":string,"next_tests":[...]}

      ground_truth_entity: <paste>
      asr_transcript: <paste>
      context: <paste>

  - title: "Synthetic pronunciation generator plan (TTS style-transfer)"
    prompt: |-
      I want to fine-tune an ASR model to improve transcription of a closed list of named entities.

      Constraints:
      - I can generate TTS locally.
      - I have no labeled real audio for these entities.
      - I want <1000 synthetic training clips.

      Make me a step-by-step recipe that:
      1) selects speaker audio from a multilingual corpus (e.g., Common Voice)
      2) uses multilingual voice cloning to synthesize NON-ENGLISH sentences with injected ENGLISH entity tokens
      3) automatically extracts the audio span containing just the entity token
      4) adds quality gates (what to manually spot-check)
      5) fine-tunes ASR (hyperparameters + early stopping)
      6) evaluates on a real-world test set (how to design it)

      Include concrete examples of injection prompts in 3 languages and a data schema for {audio_path, transcript, entity_id, language, speaker_id}.

  - title: "Downstream harm audit (maps / dispatch / routing)"
    prompt: |-
      You're auditing downstream harm from ASR errors in a location workflow.

      Input:
      - intended_entity: <street/hospital/etc>
      - asr_output: <transcript>
      - resolver: <describe geocoder / database lookup behavior>

      Do:
      1) Define a metric that reflects *operational* harm (not just WER).
      2) List 5 ways the resolver can hide ASR errors ("leniency"), and how to account for them.
      3) Propose a stratified analysis plan by user groups (e.g., primary language), including confidence intervals.
      4) Give a one-page template report I can run monthly.

      Keep it practical and geared toward engineering leadership.

tags: ["speech-recognition", "evaluation", "named-entities", "fairness", "synthetic-data", "deployment"]
sourceUrl: "https://arxiv.org/abs/2602.12249"
publishedAt: "2026-02-13T12:00:00-05:00"
author: "Good bot"
---

## What the paper is really saying

We’ve gotten *really* good at transcribing the easy stuff.

But if your app’s critical path is **a short named entity** (street name, medication, account name, SKU), today’s speech models can still whiff—*a lot*—even when benchmark Word Error Rate looks great.

This paper stress-tests that gap with a deceptively small task: **U.S. street names spoken by U.S. participants**.

## The setup (so you can reproduce the vibe)

- Task: transcribe the street name in utterances like: **“I’m on [STREET NAME]”**.
- Data:
  - **SF Streets**: 2,262 utterances, 78 participants, 29 SF boulevard names.
  - **US Streets** (appendix): 3,600 recordings of 360 street names across 12 cities; 97 participants; all non‑English primary speakers.
- Models: 15 popular systems across OpenAI (Whisper sizes), Deepgram (Nova variants), Google (Chirp), Microsoft (phi‑4‑multimodal).
- Metric: **Transcription error rate for the street name**, *phonetic/alias tolerant* (orthography-agnostic), because WER can be misleading for named entities.

## Key results (numbers you can quote)

- Across 15 models, **average street-name transcription error rate ≈ 44%**.
- Disparity: non‑English primary speakers see **~18% lower accuracy** than English-only primary speakers (46% vs 64%).
- Downstream impact (map lookup + routing): even after adding resolver “leniency,” **distance errors are ~2× worse** for non‑English primary speakers (≈2.4 miles vs ≈1.26 miles in SF).
- Mitigation: fine-tuning with **<1,000 purely synthetic clips** can improve accuracy **nearly 60% (relative)** for non‑English primary speakers.

## Figures & tables worth stealing (captions)

Use these captions as slide headings when you brief your team:

- **Figure 1.** Overview of Transcription Evaluation Pipeline
- **Figure 2.** Limited English Proficiency Speakers in San Francisco. Original data from (City and County of San Francisco, 2026).
- **Figure 3.** Overall Transcription Accuracy on SF Streets for Models That Accept a Prompt
- **Figure 4.** Transcription Accuracy by Language Groups Across All Model Families. 95% confidence intervals calculated via bootstrap resampling of 10,000 samples
- **Figure 5.** Visualization of the Five Worst Mistakes (by distance) of a Non-English Speaker
- **Figure 6.** (1) Select a sample of speech from Common Voice… (2) generate speech in a non‑English language (3) inject English street names (4) extract the street name audio; repeat to build fine-tuning data.
- **Figure 7.** Improvement in accuracy from the finetuned model across language groups… (bootstrap 10,000).
- **Figure 8.** Training only on synthetic out-of-distribution street names

- **Table 1.** Participant demographics for SF streets dataset (n=78)… 13 unique primary languages.
- **Table 2.** Participant demographics for U.S. Streets Dataset (n=97)… 29 unique primary languages.
- (Appendix) **Table 5.** Phonetically equivalent spellings (aliases) used for scoring.

## The 80% you should steal (actionable, not aspirational)

### 1) Stop treating WER as a safety certificate
WER can be low while your app still fails on the one token that matters.

**Do this next week:**
- Create an **Entity Error Rate (EER)** for your domain.
  - Example: For each utterance, score only whether the **named entity** is correct (phonetic/alias tolerant).
- Track both:
  - **EER** (entity correctness)
  - **Resolver success** (does the downstream system still resolve to the intended record?)

### 2) Benchmark the thing that routes money, time, or ambulances
The paper’s trick is simple: pick a high-stakes, short utterance that collapses context.

**Do this now:** build a “boss-fight set” of 200–1,000 clips where:
- the entity is rare or non-English-origin
- there are near-neighbors ("Arguello" vs plausible but wrong street)
- you include realistic noise + phone bandwidth if relevant

### 3) Measure harm in the units your product cares about
They translate transcription errors into **driving-distance errors** and then into **minutes and dollars**.

**Copy the pattern:**
- Define a resolver (geocoder, CRM lookup, catalog search).
- For each ASR output, compute **operational distance**:
  - meters / minutes / cost / misdispatch rate / “wrong account” count
- Report **p50/p90** and “catastrophic tail” rate (e.g., >5 miles, wrong patient).

### 4) Don’t assume fairness; slice it
Even among U.S. participants who all spoke/read English, non‑English primary speakers were hit harder.

**Make it routine:**
- Collect a minimal, privacy-safe attribute: **primary language(s)** (or “English-only vs not”).
- Report EER by group with bootstrap CIs.
- Add a release gate: “No deploy if any group regresses >X% absolute.”

### 5) Try context prompts—but expect limited gains
They tried adding situational context (“user will give address”) and saw **almost no improvement**.

**Practical takeaway:**
- Prompts can help *guessing* a plausible entity; they don’t reliably fix *hearing*.
- If you need correctness, plan for model adaptation, not prompt vibes.

### 6) Build a closed-list rescue path (even if you love end-to-end)
They tested a “perfect context” condition by listing all 29 street names; accuracy still wasn’t perfect.

**Engineering pattern:**
- If you have a known list (streets in a city, hospital names, store locations):
  - run ASR → then run **entity linker** against the closed list
  - use phonetic matching + locale priors
- Treat “no confident match” as a first-class state (ask follow-up).

### 7) Use synthetic accents as data augmentation (the clever bit)
Their recipe exploits a quirk of multilingual TTS cloning: generating in a non‑English language induces a non‑English speaking style.

**Steal the exact move:**
- Generate *mostly non-English* sentences.
- Inject the English entity token(s).
- Extract just the entity audio span.
- Fine-tune ASR on these entity-only clips.

Why it’s actionable: you don’t need real labeled audio for every street/hospital/SKU.

### 8) Add quality gates because synthetic audio lies
They had to manually verify extracted clips.

**Minimum viable QC:**
- Manually check ~5–10% of clips (random + worst cases).
- Auto-filter on:
  - too-short / too-long durations
  - low RMS / clipping
  - TTS alignment confidence (if available)
- Keep a “rejects” folder; don’t silently keep junk.

### 9) Fine-tune for your deployment constraints, not leaderboard dreams
They note larger Whisper improves accuracy but costs memory/speed.

**Action:**
- Fine-tune the *smallest* model that meets latency/compute needs.
- Report accuracy vs. latency as a curve; choose the point you can actually ship.

### 10) Design fallbacks for the tail (where harm lives)
The worst errors are not “slightly misspelled”—they are **wrong-location** mistakes.

**Implement:**
- If entity confidence low, switch to:
  - confirm step (“Did you say *Alemany*?”)
  - spelling mode
  - two-candidate disambiguation
- Log these events separately; that’s your real reliability dashboard.

## A concrete playbook: deployable checklist

1) **Define entities** (street names / venues / items) and build a closed list.
2) Collect 200–1,000 real test clips with diverse speakers.
3) Score **Entity Error Rate**, not WER.
4) Add a downstream resolver and compute harm in product units.
5) If EER is bad:
   - run the synthetic TTS style-transfer pipeline
   - fine-tune with <1,000 clips
   - re-evaluate by group + tail risk
6) Ship with a low-confidence fallback UX.

## Skeptic check (what not to overclaim)

- Synthetic data helps, but it’s not magic: OOD street-name generalization was limited in their experiments (Figure 8).
- The big lesson isn’t “fine-tune Whisper.” It’s:
  **benchmark named entities explicitly, quantify downstream harm, and iterate with targeted data.**
