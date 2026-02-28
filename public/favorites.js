import { listFavorites, removeFavorite } from './local-store.js';

export async function renderFavorites(root){
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

    const top = el('div', { style: 'display:flex; justify-content:space-between; gap:10px; align-items:flex-start' });

    const a = el('a', { href: paperUrl(f), style: 'display:block; padding:14px 16px; text-decoration:none; flex:1' });
    a.appendChild(el('div', { class: 'cardTitle' }, f.title || `arXiv ${f.arxivId}`));
    a.appendChild(el('div', { style: 'color:var(--muted); font-size:12px; margin-top:4px' }, `arXiv: ${f.arxivId}`));

    const btn = el('button', {
      type: 'button',
      'data-arxiv': f.arxivId,
      style: 'margin:10px 10px 0 0; border:1px solid var(--border); background:transparent; color:var(--muted); padding:6px 10px; border-radius:999px; cursor:pointer; font-size:12px;'
    }, 'Remove');

    btn.addEventListener('click', async () => {
      try{
        await removeFavorite(f.arxivId);
        await renderFavorites(root);
      }catch{
        alert('Could not remove favorite.');
      }
    });

    top.appendChild(a);
    top.appendChild(btn);

    wrap.appendChild(top);
    root.appendChild(wrap);
  }
}

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

export async function main(){
  const root = document.getElementById('favoritesList');
  if (!root) return;
  await renderFavorites(root);
}

// Run when loaded in browser
if (typeof window !== 'undefined') {
  main();
}
