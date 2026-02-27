// Paper chat (BYO OpenAI key) — client-only
// Goals:
// - token efficient: retrieval + short context + small turn memory
// - conversational, with receipts
// - no HTML rendering (textContent only)

const $ = (id) => document.getElementById(id);

const elRoot = $('paperChat');
const fab = $('paperChatFab');
const drawer = $('paperChatDrawer');
const closeBtn = $('paperChatClose');

const gate = $('paperChatGate');
const apiKeyInput = $('paperChatApiKey');
const passInput = $('paperChatPass');
const saveKeyBtn = $('paperChatSaveKey');
const useOnceBtn = $('paperChatUseOnce');

const unlock = $('paperChatUnlock');
const passUnlock = $('paperChatPassUnlock');
const unlockBtn = $('paperChatUnlockBtn');
const forgetBtn = $('paperChatForget');

const main = $('paperChatMain');
const msgs = $('paperChatMsgs');
const q = $('paperChatQ');
const sendBtn = $('paperChatSend');

const receiptsWrap = $('paperChatReceipts');
const receiptsBody = $('paperChatReceiptsBody');

const modal = $('paperChatModal');
const modalTitle = $('paperChatModalTitle');
const modalBody = $('paperChatModalBody');
const modalClose = $('paperChatModalClose');

const clearBtn = $('paperChatClear');

const LS_KEY = 'paperChat.encKey.v1';

let lastChunksSent = [];
let sessionKey = null; // decrypted API key for this tab
let sessionPass = null;

// Lightweight turn memory (kept small intentionally)
const turnMemory = []; // [{q, a}]
const MAX_TURNS = 3;

// Local persistence (IndexedDB)
let store = null;
async function getStore(){
  if (store) return store;
  store = await import('/local-store.js');
  return store;
}

// Client-side cooldown to avoid accidental spam
let nextAllowedAt = 0;
const COOLDOWN_MS = 1500;

function nowMs(){ return Date.now(); }

async function open(){
  elRoot.dataset.state = 'open';
  drawer.style.display = 'block';
  renderGate();

  // Load persisted chat history (if available)
  const arxivId = currentArxivId();
  if (arxivId){
    try{
      const s = await getStore();
      const history = await s.getMessages(arxivId, 50);
      if (history && history.length){
        msgs.innerHTML = '';
        for (const m of history){
          addMsg(m.role, m.text);
        }
      }
    }catch{ /* ignore */ }
  }

  setTimeout(() => {
    const focusEl = drawer.querySelector('input,textarea,button');
    focusEl?.focus?.();
  }, 0);
}

function close(){
  elRoot.dataset.state = 'closed';
  drawer.style.display = 'none';
}

function hasStored(){
  return !!localStorage.getItem(LS_KEY);
}

function showGate(which){
  gate.hidden = which !== 'gate';
  unlock.hidden = which !== 'unlock';
  main.hidden = which !== 'main';
}

function renderGate(){
  if (sessionKey){
    showGate('main');
    return;
  }
  if (hasStored()) showGate('unlock');
  else showGate('gate');
}

fab?.addEventListener('click', () => {
  if (elRoot.dataset.state === 'open') close();
  else open();
});

clearBtn?.addEventListener('click', async () => {
  const arxivId = currentArxivId();
  if (!arxivId) return;
  if (!confirm('Clear saved chat history for this paper? (local only)')) return;
  try{
    const s = await getStore();
    await s.clearThread(arxivId);
    msgs.innerHTML = '';
    receiptsWrap.hidden = true;
    receiptsBody.innerHTML = '';
  }catch{
    alert('Could not clear history.');
  }
});
closeBtn?.addEventListener('click', close);

// Escape closes the drawer
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && elRoot.dataset.state === 'open') close();
});

// Composer: Enter sends, Shift+Enter newline
q?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendBtn?.click?.();
  }
});

// --- crypto helpers (passphrase-based encryption)
async function deriveKey(passphrase, saltBytes){
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 120000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
}

function b64(bytes){
  let s='';
  bytes.forEach((b)=>s+=String.fromCharCode(b));
  return btoa(s);
}
function unb64(s){
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}

async function encryptWithPass(passphrase, plaintext){
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, enc.encode(plaintext));
  return {
    v: 1,
    salt: b64(salt),
    iv: b64(iv),
    ct: b64(new Uint8Array(ct))
  };
}

async function decryptWithPass(passphrase, blob){
  const dec = new TextDecoder();
  const salt = unb64(blob.salt);
  const iv = unb64(blob.iv);
  const ct = unb64(blob.ct);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct);
  return dec.decode(pt);
}

saveKeyBtn?.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  const pass = passInput.value;
  if (!key || !pass) return alert('API key + passphrase required');
  const blob = await encryptWithPass(pass, key);
  localStorage.setItem(LS_KEY, JSON.stringify(blob));
  sessionKey = key;
  sessionPass = pass;
  apiKeyInput.value='';
  passInput.value='';
  renderGate();
});

useOnceBtn?.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) return alert('API key required');
  sessionKey = key;
  apiKeyInput.value='';
  passInput.value='';
  renderGate();
});

unlockBtn?.addEventListener('click', async () => {
  const pass = passUnlock.value;
  if (!pass) return alert('Passphrase required');
  try{
    const blob = JSON.parse(localStorage.getItem(LS_KEY));
    const key = await decryptWithPass(pass, blob);
    sessionKey = key;
    sessionPass = pass;
    passUnlock.value='';
    renderGate();
  }catch(e){
    alert('Wrong passphrase');
  }
});

forgetBtn?.addEventListener('click', () => {
  localStorage.removeItem(LS_KEY);
  sessionKey = null;
  sessionPass = null;
  passUnlock.value='';
  renderGate();
});

// --- context retrieval
function currentArxivId(){
  // post pages: /arxiv-notes/<arxivId>/<slug>/
  const parts = location.pathname.split('/').filter(Boolean);
  const idx = parts.indexOf('arxiv-notes');
  if (idx === -1) return null;
  return parts[idx+1] || null;
}

const _ctxCache = new Map();

async function loadContext(arxivId){
  if (_ctxCache.has(arxivId)) return _ctxCache.get(arxivId);
  const url = `/arxiv-notes/paper-context/${arxivId}/context.json`;
  const r = await fetch(url, { cache: 'force-cache' });
  if (!r.ok) throw new Error('context_missing');
  const j = await r.json();
  _ctxCache.set(arxivId, j);
  return j;
}

// --- retrieval
const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','else','when','what','why','how','to','of','in','on','for','with','as','at','by','from',
  'is','are','was','were','be','been','being','it','this','that','these','those','we','they','you','i','me','my','your','our','their',
  'can','could','should','would','may','might','will','do','does','did'
]);

function tokenize(s){
  return (s||'')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g,' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w)=>w.length>2 && !STOPWORDS.has(w));
}

function scoreChunk(qTokens, chunk){
  const t = tokenize(chunk.text);
  if (!t.length) return 0;
  const tf = new Map();
  for (const w of t) tf.set(w, (tf.get(w)||0)+1);
  let score = 0;
  for (const w of qTokens){
    const c = tf.get(w);
    if (c) score += 1 + Math.min(0.5, 0.15*(c-1));
  }
  // Small boosts
  if (chunk.type === 'abstract') score *= 1.35;
  if (chunk.type === 'caption') score *= 1.20;
  // Penalize very short chunks
  if ((chunk.text||'').length < 120) score *= 0.8;
  return score;
}

function pickChunks(question, ctx, maxChunks=6, maxChars=900){
  const qTokens = tokenize(question).slice(0, 70);
  const chunks = (ctx.chunks||[]);

  // Always consider abstract for broad questions
  const abs = chunks.find((c)=>c.type==='abstract');

  const scored = chunks
    .map((c)=>({ c, s: scoreChunk(qTokens,c) }))
    .sort((a,b)=>b.s-a.s);

  const out=[];
  const seen = new Set();

  if (abs) {
    out.push({ id: abs.id, type: abs.type, text: (abs.text||'').slice(0, maxChars) });
    seen.add(abs.id);
  }

  for (const x of scored){
    if (out.length>=maxChunks) break;
    if (!x.s || x.s <= 0) continue;
    if (seen.has(x.c.id)) continue;
    out.push({
      id: x.c.id,
      type: x.c.type,
      text: (x.c.text||'').slice(0, maxChars)
    });
    seen.add(x.c.id);
  }

  // If we only got abstract and nothing else matched, return empty to avoid hallucinations.
  if (out.length === 1 && abs) {
    const absOnly = out[0].text;
    // If question tokens don't intersect abstract tokens, treat as no match.
    const absT = new Set(tokenize(absOnly));
    const hit = qTokens.some((w)=>absT.has(w));
    if (!hit) return [];
  }

  return out.slice(0, maxChunks);
}

// --- UI helpers
function addMsg(role, text){
  const d = document.createElement('div');
  d.className = `paperChat__msg paperChat__msg--${role}`;
  d.textContent = text;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}

async function persistMsg(role, text){
  const arxivId = currentArxivId();
  if (!arxivId) return;
  try{
    const s = await getStore();
    await s.addMessage({ arxivId, role, text, ts: Date.now() });
  }catch{ /* ignore */ }
}

function openModal(chunkId){
  const c = (lastChunksSent || []).find((x)=>x.id===chunkId);
  if (!c) return;
  if (!modal || !modalTitle || !modalBody) return;
  modalTitle.textContent = `${c.id} (${c.type})`;
  modalBody.textContent = c.text;
  modal.hidden = false;
}
function closeModal(){
  if (!modal) return;
  modal.hidden = true;
}
modalClose?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e)=>{
  const t = e.target;
  if (t && t.dataset && t.dataset.close === '1') closeModal();
});

receiptsBody?.addEventListener('click', (e)=>{
  const el = e.target && e.target.closest ? e.target.closest('.paperChat__receipt') : null;
  if (!el) return;
  const id = el.getAttribute('data-id');
  if (!id) return;
  openModal(id);
});

function parseReceiptIds(answer){
  // Expect a line like: Receipts: b-1, cap-0, abs-0
  const m = answer.match(/\n?Receipts\s*:\s*([^\n]+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,\s]+/g)
    .map((s)=>s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function renderReceipts(chunks, usedIds){
  lastChunksSent = chunks;
  const map = new Map(chunks.map((c)=>[c.id, c]));

  const ids = (usedIds && usedIds.length)
    ? usedIds.filter((id)=>map.has(id)).slice(0,4)
    : chunks.slice(0,4).map((c)=>c.id);

  receiptsWrap.hidden = ids.length === 0;
  receiptsBody.innerHTML = '';

  for (const id of ids){
    const c = map.get(id);
    if (!c) continue;
    const div = document.createElement('div');
    div.className = 'paperChat__receipt';
    div.setAttribute('data-id', c.id);
    div.innerHTML = `<div class="paperChat__receiptId">${c.id}</div><div class="paperChat__receiptText"></div>`;
    div.querySelector('.paperChat__receiptText').textContent = c.text.slice(0, 240) + (c.text.length>240?'…':'');
    receiptsBody.appendChild(div);
  }
}

function memoryBlock(){
  if (!turnMemory.length) return '';
  // keep tiny
  return turnMemory.map((t,i)=>`Turn ${i+1}: Q=${t.q} | A=${t.a}`).join('\n');
}

async function askOpenAIStream({ apiKey, model, question, ctxChunks }){
  const sys = [
    'You are a helpful assistant. Answer conversationally.',
    'Use ONLY the provided context chunks. If the answer is not in the context, say you do not know.',
    'At the end, include a single line: Receipts: <chunk-id-1>, <chunk-id-2> (max 4 ids).',
    'Keep the answer concise.'
  ].join('\n');

  const ctxText = ctxChunks.map((c)=>`[${c.id} | ${c.type}]\n${c.text}`).join('\n\n');
  const mem = memoryBlock();

  const userText = [
    mem ? `Recent chat (compressed):\n${mem}` : null,
    `Context:\n${ctxText}`,
    `Question: ${question}`
  ].filter(Boolean).join('\n\n');

  const body = {
    model,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: sys }] },
      { role: 'user', content: [{ type: 'input_text', text: userText }] }
    ],
    max_output_tokens: 350,
    temperature: 0.2,
    stream: true,
  };

  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(txt || 'openai_failed');
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  let out = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE-like: split on newlines
    const lines = buf.split('\n');
    buf = lines.pop() || '';

    for (const line of lines) {
      const ln = line.trim();
      if (!ln.startsWith('data:')) continue;
      const data = ln.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const evt = JSON.parse(data);
        // Responses API: incremental text can appear in output_text_delta
        const delta = evt?.type === 'response.output_text.delta'
          ? (evt.delta || '')
          : (evt?.delta || '');
        if (delta) {
          out += delta;
        }
      } catch {
        // ignore partial json
      }
    }
  }

  return out.trim();
}

function normalizeApiError(e){
  const msg = (e?.message || String(e) || '').slice(0, 900);
  if (/401|invalid_api_key|Incorrect API key/i.test(msg)) return 'Auth error: your API key was rejected.';
  if (/429|rate limit/i.test(msg)) return 'Rate limited by OpenAI. Try again in a bit.';
  if (/context_missing/i.test(msg)) return 'Missing paper context.json for this post.';
  return `Error: ${msg}`;
}

sendBtn?.addEventListener('click', async () => {
  if (!sessionKey) {
    renderGate();
    return;
  }

  const question = q.value.trim();
  if (!question) return;

  if (nowMs() < nextAllowedAt) return;
  nextAllowedAt = nowMs() + COOLDOWN_MS;

  const arxivId = currentArxivId();
  if (!arxivId) return alert('Open a paper page first');

  addMsg('user', question);
  persistMsg('user', question);
  q.value='';
  sendBtn.disabled = true;

  const assistantEl = addMsg('assistant', '');

  try{
    const ctx = await loadContext(arxivId);
    const chunks = pickChunks(question, ctx);
    if (!chunks.length) {
      assistantEl.textContent = "I couldn’t find relevant context for that question in the stored paper text.";
      sendBtn.disabled = false;
      return;
    }

    const answer = await askOpenAIStream({
      apiKey: sessionKey,
      model: 'gpt-4.1-mini',
      question,
      ctxChunks: chunks
    });

    assistantEl.textContent = answer;
    persistMsg('assistant', answer);

    const ids = parseReceiptIds(answer);
    renderReceipts(chunks, ids);

    // store tiny memory
    const memQ = question.slice(0, 220);
    const memA = answer.replace(/\s+/g,' ').slice(0, 240);
    turnMemory.push({ q: memQ, a: memA });
    while (turnMemory.length > MAX_TURNS) turnMemory.shift();

  } catch (e){
    assistantEl.textContent = normalizeApiError(e);
  } finally {
    sendBtn.disabled = false;
  }
});

// init
close();
