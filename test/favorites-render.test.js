import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

async function freshStore(){
  vi.resetModules();
  return import('../public/local-store.js');
}

async function freshFavorites(){
  vi.resetModules();
  return import('../public/favorites.js');
}

describe('favorites page rendering', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders favorites and supports removal', async () => {
    const dom = new JSDOM(`<!doctype html><div id="favoritesList"></div>`, { url: 'https://example.com/arxiv-notes/favorites/' });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.alert = vi.fn();

    const s = await freshStore();
    await s.setFavorite({ arxivId: '2602.11111', slug: 'a/b', title: 'T1', savedAt: 1 });
    await s.setFavorite({ arxivId: '2602.22222', slug: 'c/d', title: 'T2', savedAt: 2 });

    const fav = await freshFavorites();
    const root = document.getElementById('favoritesList');
    await fav.renderFavorites(root);

    expect(root.textContent).toContain('T2');
    expect(root.textContent).toContain('T1');

    const btns = root.querySelectorAll('button');
    expect(btns.length).toBe(2);

    // Click remove on the newest (first rendered)
    btns[0].click();

    // Wait for async IndexedDB + re-render.
    const start = Date.now();
    while (Date.now() - start < 250) {
      await new Promise((r) => setTimeout(r, 10));
      if (!root.textContent.includes('T2')) break;
    }

    expect(root.textContent).not.toContain('T2');
    expect(root.textContent).toContain('T1');
  });
});
