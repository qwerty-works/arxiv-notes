# arxiv-notes

**arxiv-notes is a tiny newspaper for arXiv.**

It takes dense research papers and turns them into **5-minute briefs** that answer one question:

> “How does this change what I should *do* when I’m building with AI?”

Live:
- https://qwerty-works.github.io/arxiv-notes/

## Who this is for

Explorers.

People who:
- like reading ideas, but don’t want to drown in 28 pages of notation
- want practical upgrades to prompts/workflows/evals, not “cool paper!”
- are experimenting with agents, LLM apps, and human-in-the-loop systems

## What you’ll find inside a post

Every post is written to be:
- **Punchy + imaginative** (so you can visualize the mechanism)
- **Tip-heavy** (aim for **≥75% actionable takeaways**)
- Easy to operationalize immediately

Specifically, each post includes:
- A **TL;DR** (fast orientation)
- A section of **Copy/paste prompts** with **one-click copy buttons** (so you can try the idea immediately)
- A short explanation of the paper’s claim (enough to be grounded, not a textbook)

## How we avoid hallucinating

Before publishing a post:
1) Read the arXiv **HTML** version end-to-end (structure + sections)
2) Also read the **PDF** and extract key text + **figure captions/tables**
3) If figures matter: render/inspect them visually (don’t guess)

If we didn’t do that, we don’t publish.

## What this repo is (tech)

- **Astro** static site
- Content: **Astro Content Collections** (`src/content/papers/**`)
- Deploy: **GitHub Pages** via GitHub Actions

## Adding a new paper (content format)

Paper entries live in `src/content/papers/<arxivId>/<slug>.md`.

Required frontmatter is enforced in `src/content/config.ts`.

Example:

```yaml
---
arxivId: "2602.12345"
catchyTitle: "A short, punchy title"
funnySubtitle: "A memorable subheading"
blurb: "1–2 sentence homepage blurb."
tldr: "A tight TL;DR shown before the body."

prompts:
  - title: "Prompt title"
    prompt: |-
      <copy/paste prompt text>

# 1..6 tags
tags: ["agents", "evals", "reasoning"]

sourceUrl: "https://arxiv.org/abs/2602.12345"
publishedAt: "2026-02-12"
---

## Body
Write the post here. Keep it reader-actionable.
```

## Development

```bash
npm install
npm run dev
npm run build
```

## Deployment

Pushing to `main` triggers the **Deploy to GitHub Pages** workflow.

Published at:
- https://qwerty-works.github.io/arxiv-notes/

## Implementation notes

- Copy-to-clipboard buttons are implemented in `src/layouts/BaseLayout.astro` (vanilla JS).
- Prompt blocks are styled to be **mobile-friendly** (wrap long lines; scroll only as a fallback).
