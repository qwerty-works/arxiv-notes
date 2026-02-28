import { defineCollection, z } from 'astro:content';

// Which arXiv listing feed this post came from.
// Examples: "cs.AI", "physics.data-an"
const feedSchema = z.string().min(1);

const papers = defineCollection({
  type: 'content',
  schema: z.object({
    arxivId: z.string(),
    feed: feedSchema.default('cs.AI'),

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

