// Local-only storage helpers (IndexedDB)
// Used for: favorites + chat history
// Privacy: stays in the user's browser (not synced anywhere).

const DB_NAME = 'arxiv_notes_v1';
const DB_VERSION = 1;

function uuid(){
  if (crypto?.randomUUID) return crypto.randomUUID();
  // fallback
  return 'id-' + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function getProfileId(){
  const k = 'arxivNotes.profileId.v1';
  let id = localStorage.getItem(k);
  if (!id){
    id = uuid();
    localStorage.setItem(k, id);
  }
  return id;
}

function openDb(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains('favorites')){
        const s = db.createObjectStore('favorites', { keyPath: 'key' });
        s.createIndex('byProfile', 'profileId', { unique: false });
        s.createIndex('bySavedAt', 'savedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('threads')){
        const s = db.createObjectStore('threads', { keyPath: 'key' });
        s.createIndex('byProfile', 'profileId', { unique: false });
        s.createIndex('byUpdatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('messages')){
        const s = db.createObjectStore('messages', { keyPath: 'id' });
        s.createIndex('byThread', 'threadKey', { unique: false });
        s.createIndex('byThreadTs', ['threadKey','ts'], { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(storeNames, mode, fn){
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeNames, mode);
    const stores = {};
    for (const n of storeNames) stores[n] = t.objectStore(n);

    Promise.resolve(fn(stores, t))
      .then((out) => {
        t.oncomplete = () => resolve(out);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
      .catch(reject);
  });
}

// --- Favorites
export async function favoriteKey(profileId, arxivId){
  return `${profileId}:${arxivId}`;
}

export async function setFavorite({ arxivId, slug, title, savedAt }){
  const profileId = getProfileId();
  const key = await favoriteKey(profileId, arxivId);
  return tx(['favorites'], 'readwrite', ({ favorites }) => {
    favorites.put({ key, profileId, arxivId, slug, title, savedAt: savedAt ?? Date.now() });
  });
}

export async function removeFavorite(arxivId){
  const profileId = getProfileId();
  const key = await favoriteKey(profileId, arxivId);
  return tx(['favorites'], 'readwrite', ({ favorites }) => favorites.delete(key));
}

export async function isFavorite(arxivId){
  const profileId = getProfileId();
  const key = await favoriteKey(profileId, arxivId);
  return tx(['favorites'], 'readonly', ({ favorites }) => new Promise((resolve, reject) => {
    const r = favorites.get(key);
    r.onsuccess = () => resolve(!!r.result);
    r.onerror = () => reject(r.error);
  }));
}

export async function listFavorites(){
  const profileId = getProfileId();
  return tx(['favorites'], 'readonly', ({ favorites }) => new Promise((resolve, reject) => {
    const out = [];
    const idx = favorites.index('byProfile');
    const r = idx.openCursor(IDBKeyRange.only(profileId));
    r.onsuccess = () => {
      const cur = r.result;
      if (!cur) return resolve(out.sort((a,b)=>b.savedAt-a.savedAt));
      out.push(cur.value);
      cur.continue();
    };
    r.onerror = () => reject(r.error);
  }));
}

// --- Chat threads + messages
function threadKey(profileId, arxivId){
  return `${profileId}:${arxivId}`;
}

export async function touchThread(arxivId){
  const profileId = getProfileId();
  const key = threadKey(profileId, arxivId);
  const updatedAt = Date.now();
  return tx(['threads'], 'readwrite', ({ threads }) => {
    threads.put({ key, profileId, arxivId, updatedAt });
  });
}

export async function addMessage({ arxivId, role, text, ts }){
  const profileId = getProfileId();
  const tKey = threadKey(profileId, arxivId);
  const id = uuid();
  const when = ts ?? Date.now();
  await touchThread(arxivId);
  return tx(['messages'], 'readwrite', ({ messages }) => {
    messages.put({ id, threadKey: tKey, profileId, arxivId, role, text, ts: when });
  });
}

export async function getMessages(arxivId, limit=50){
  const profileId = getProfileId();
  const tKey = threadKey(profileId, arxivId);
  return tx(['messages'], 'readonly', ({ messages }) => new Promise((resolve, reject) => {
    const idx = messages.index('byThreadTs');
    const r = idx.openCursor(IDBKeyRange.bound([tKey, 0], [tKey, Number.MAX_SAFE_INTEGER]));
    const out = [];
    r.onsuccess = () => {
      const cur = r.result;
      if (!cur) {
        out.sort((a,b)=>a.ts-b.ts);
        return resolve(out.slice(-limit));
      }
      out.push(cur.value);
      cur.continue();
    };
    r.onerror = () => reject(r.error);
  }));
}

export async function clearThread(arxivId){
  const profileId = getProfileId();
  const tKey = threadKey(profileId, arxivId);
  return tx(['messages','threads'], 'readwrite', ({ messages, threads }) => new Promise((resolve, reject) => {
    const idx = messages.index('byThread');
    const r = idx.openCursor(IDBKeyRange.only(tKey));
    r.onsuccess = () => {
      const cur = r.result;
      if (!cur) {
        threads.delete(tKey);
        return resolve(true);
      }
      messages.delete(cur.primaryKey);
      cur.continue();
    };
    r.onerror = () => reject(r.error);
  }));
}
