import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

async function freshStore(){
  vi.resetModules();
  return import('../public/local-store.js');
}

describe('local-store favorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('setFavorite -> listFavorites returns saved item', async () => {
    const s = await freshStore();
    await s.setFavorite({ arxivId: '2602.99999', slug: 'x/y', title: 'Hello', savedAt: 1 });
    const favs = await s.listFavorites();
    expect(favs.length).toBe(1);
    expect(favs[0].arxivId).toBe('2602.99999');
    expect(favs[0].title).toBe('Hello');
  });

  it('removeFavorite removes item', async () => {
    const s = await freshStore();
    await s.setFavorite({ arxivId: '2602.99999', slug: 'x/y', title: 'Hello', savedAt: 1 });
    expect(await s.isFavorite('2602.99999')).toBe(true);
    await s.removeFavorite('2602.99999');
    expect(await s.isFavorite('2602.99999')).toBe(false);
    const favs = await s.listFavorites();
    expect(favs.length).toBe(0);
  });
});

describe('local-store chat history', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('addMessage + getMessages returns last messages in order', async () => {
    const s = await freshStore();
    const arxivId = '2602.12345';
    await s.addMessage({ arxivId, role: 'user', text: 'Q1', ts: 1 });
    await s.addMessage({ arxivId, role: 'assistant', text: 'A1', ts: 2 });
    await s.addMessage({ arxivId, role: 'user', text: 'Q2', ts: 3 });

    const msgs = await s.getMessages(arxivId, 50);
    expect(msgs.map((m) => m.text)).toEqual(['Q1', 'A1', 'Q2']);
  });

  it('clearThread deletes messages', async () => {
    const s = await freshStore();
    const arxivId = '2602.12345';
    await s.addMessage({ arxivId, role: 'user', text: 'Q1', ts: 1 });
    await s.clearThread(arxivId);
    const msgs = await s.getMessages(arxivId, 50);
    expect(msgs.length).toBe(0);
  });
});
