import { listFavorites } from './local-store.js';

function el(tag, attrs={}, text=''){
  const n = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)){
    if (k === 'class') n.className = v;
    else n.setAttribute(k, v);
  }
  if (text) n.textContent = text;
  return n;
}

function paperUrl(f){
  if (f.slug) return `/arxiv-notes/${f.arxivId}/${f.slug}/`;
  return `/arxiv-notes/${f.arxivId}/`;
}

async function main(){
  const root = document.getElementById('favoritesList');
  if (!root) return;

  let favs = [];
  try{
    favs = await listFavorites();
  }catch(e){
    root.innerHTML = '';
    root.appendChild(el('div', { style: 'color:var(--muted)' }, 'Failed to load favorites.'));
    return;
  }

  root.innerHTML = '';
  if (!favs.length){
    root.appendChild(el('div', { style: 'color:var(--muted)' }, 'No favorites yet. Open a paper and hit ⭐.'));
    return;
  }

  for (const f of favs){
    const wrap = el('div', { class: 'cardLink', style: 'padding:0; margin-bottom:12px' });
    const a = el('a', { href: paperUrl(f), style: 'display:block; padding:14px 16px; text-decoration:none' });
    a.appendChild(el('div', { class: 'cardTitle' }, f.title || `arXiv ${f.arxivId}`));
    a.appendChild(el('div', { style: 'color:var(--muted); font-size:12px; margin-top:4px' }, `arXiv: ${f.arxivId}`));
    wrap.appendChild(a);
    root.appendChild(wrap);
  }
}

main();
