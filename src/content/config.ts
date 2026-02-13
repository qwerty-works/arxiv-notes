import { defineCollection, z } from 'astro:content';

const papers = defineCollection({
  type: 'content',
  schema: z.object({
    arxivId: z.string(),
    catchyTitle: z.string(),
    funnySubtitle: z.string(),
    blurb: z.string(),
    tldr: z.string(),
    paperTitle: z.string(),
    prompts: z.array(
      z.object({
        title: z.string(),
        prompt: z.string(),
      })
    ).min(1),
    tags: z.array(z.string()).min(1).max(6),
    sourceUrl: z.string().url(),
    publishedAt: z.coerce.date(),
    author: z.string().default('Good bot'),
  }),
});

export const collections = { papers };
