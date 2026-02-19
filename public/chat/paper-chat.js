// Paper chat (BYO OpenAI key) — client-only

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

const LS_KEY = 'paperChat.encKey.v1';

let sessionKey = null; // decrypted API key for this tab
let sessionPass = null;

function toast(text){
  // reuse existing site styles? keep minimal
  console.log(text);
}

function open(){
  elRoot.dataset.state = 'open';
  drawer.style.display = 'block';
  renderGate();
  setTimeout(() => {
    const focusEl = drawer.querySelector('input,textarea,button');
    focusEl?.focus?.();
  }, 0);
}

function close(){
  elRoot.dataset.state = 'closed';
  drawer.style.display = 'none';
}

fab?.addEventListener('click', () => {
  if (elRoot.dataset.state === 'open') close();
  else open();
});
closeBtn?.addEventListener('click', close);

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

async function loadContext(arxivId){
  const url = `/arxiv-notes/paper-context/${arxivId}/context.json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('context_missing');
  return r.json();
}

function tokenize(s){
  return (s||'')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g,' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreChunk(qTokens, chunk){
  const t = tokenize(chunk.text);
  const set = new Set(t);
  let score = 0;
  for (const w of qTokens){
    if (set.has(w)) score += 1;
  }
  if (chunk.type === 'abstract') score *= 1.3;
  if (chunk.type === 'caption') score *= 1.2;
  return score;
}

function pickChunks(question, ctx, maxChunks=6, maxChars=900){
  const qTokens = tokenize(question).slice(0, 60);
  const scored = (ctx.chunks||[])
    .map((c)=>({ c, s: scoreChunk(qTokens,c) }))
    .sort((a,b)=>b.s-a.s)
    .filter((x)=>x.s>0);

  const out=[];
  for (const x of scored){
    if (out.length>=maxChunks) break;
    out.push({
      id: x.c.id,
      type: x.c.type,
      text: (x.c.text||'').slice(0, maxChars)
    });
  }
  return out;
}

// --- chat
function addMsg(role, text){
  const d = document.createElement('div');
  d.className = `paperChat__msg paperChat__msg--${role}`;
  d.textContent = text;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

async function askOpenAI({ apiKey, model, question, ctxChunks }){
  const sys = [
    'You are a helpful assistant. Answer conversationally.',
    'Use ONLY the provided context chunks. If the answer is not in the context, say you do not know.',
    'After your answer, include a short "Receipts" section listing the chunk ids you used (max 4).',
    'Keep the answer concise.'
  ].join('\n');

  const ctxText = ctxChunks.map((c)=>`[${c.id} | ${c.type}]\n${c.text}`).join('\n\n');

  const body = {
    model,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: sys }] },
      { role: 'user', content: [{ type: 'input_text', text: `Context:\n${ctxText}\n\nQuestion: ${question}` }] }
    ],
    max_output_tokens: 350,
    temperature: 0.2,
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
  const data = await r.json();
  const out = (data.output_text || '').trim();
  return out;
}

function extractReceipts(answer){
  // naive: parse chunk ids like [c12] not guaranteed. We'll instead show chunks we provided.
  return null;
}

sendBtn?.addEventListener('click', async () => {
  const question = q.value.trim();
  if (!question) return;
  const arxivId = currentArxivId();
  if (!arxivId) return alert('Open a paper page first');

  addMsg('user', question);
  q.value='';
  sendBtn.disabled = true;

  try{
    const ctx = await loadContext(arxivId);
    const chunks = pickChunks(question, ctx);
    if (!chunks.length) {
      addMsg('assistant', "I couldn’t find anything relevant in the stored context for this question.");
      sendBtn.disabled = false;
      return;
    }

    const answer = await askOpenAI({
      apiKey: sessionKey,
      model: 'gpt-4.1-mini',
      question,
      ctxChunks: chunks
    });
    addMsg('assistant', answer);

    // receipts UI: show the chunks we sent
    receiptsWrap.hidden = false;
    receiptsBody.innerHTML = '';
    for (const c of chunks.slice(0,4)){
      const div = document.createElement('div');
      div.className = 'paperChat__receipt';
      div.innerHTML = `<div class="paperChat__receiptId">${c.id}</div><div class="paperChat__receiptText"></div>`;
      div.querySelector('.paperChat__receiptText').textContent = c.text.slice(0, 220) + (c.text.length>220?'…':'');
      receiptsBody.appendChild(div);
    }
  } catch (e){
    addMsg('assistant', 'Error: ' + (e?.message || String(e)));
  } finally {
    sendBtn.disabled = false;
  }
});

// init
close();
