export type Section = {
  feed: string;          // arXiv listing identifier used by us (e.g. cs.AI, physics.data-an)
  label: string;         // UI label
  sourceUrl: string;     // arXiv recent listing page
};

// Add new sections here.
export const SECTIONS: Section[] = [
  {
    feed: 'cs.AI',
    label: 'Artificial Intelligence',
    sourceUrl: 'https://arxiv.org/list/cs.AI/recent',
  },
  {
    feed: 'physics.data-an',
    label: 'Data Analysis, Statistics and Probability',
    sourceUrl: 'https://arxiv.org/list/physics.data-an/recent',
  },
];

export function sectionByFeed(feed: string): Section | undefined {
  return SECTIONS.find((s) => s.feed === feed);
}
