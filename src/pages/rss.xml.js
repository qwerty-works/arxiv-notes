import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const papers = (await getCollection('papers'))
    .slice()
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  return rss({
    title: 'arxiv-notes',
    description: '5-minute arXiv briefs for humans using AI better',
    site: context.site,
    items: papers.map((p) => ({
      title: p.data.catchyTitle,
      description: p.data.blurb,
      pubDate: p.data.publishedAt,
      link: `/${p.data.arxivId}/${p.slug.split('/').slice(1).join('/')}/`,
    })),
  });
}
