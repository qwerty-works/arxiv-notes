# arxiv-notes

A tiny newspaper for arXiv papers: **5-minute briefs** that teach humans how to use AI better.

Live:
- https://qwerty-works.github.io/arxiv-notes/

## What this repo is

- **Astro** static site
- Content lives in **Astro Content Collections** (`src/content/papers/**`)
- Deployed to **GitHub Pages** via GitHub Actions

Design goals:
- Mobile-first
- System light/dark
- Punchy + imaginative writing (help readers visualize concepts)
- Posts are **tip-heavy**: aim for **≥75% actionable takeaways**

## Writing / publishing workflow (required)

Before publishing a post:
1) Read the arXiv **HTML** version end-to-end (structure + sections)
2) Also read the **PDF** and extract key text + **figure captions/tables**
3) If figures matter: render/inspect them visually (don’t guess)

## Post template requirements (enforced)

Every paper entry must include:
- **TL;DR** (frontmatter `tldr`)
- **Copy/paste prompts** (frontmatter `prompts`, 1+), rendered with JS **copy-to-clipboard** buttons
- Tags (1–6)

### Frontmatter schema

See `src/content/config.ts`.

Example:

```yaml
---
arxivId: "2602.12345"
catchyTitle: "Your punchy title"
funnySubtitle: "Short, memorable, slightly unhinged"
blurb: "Homepage blurb (1–2 sentences)."
tldr: "TL;DR shown before the body. Keep it tight."
prompts:
  - title: "Prompt title"
    prompt: |-
      <copy/paste prompt text>

tags: ["tag-one", "tag-two"]
sourceUrl: "https://arxiv.org/abs/2602.12345"
publishedAt: "2026-02-12"
---

## Body
Write the post here.
```

## Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Deployment

- Pushing to `main` triggers the **Deploy to GitHub Pages** workflow.
- The site is published at: https://qwerty-works.github.io/arxiv-notes/

## Notes

- Copy buttons are implemented with a tiny vanilla JS handler in `src/layouts/BaseLayout.astro`.
- Prompt blocks are styled to be **mobile-friendly** (wrap long lines; scroll only as a fallback).
