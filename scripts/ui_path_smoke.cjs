#!/usr/bin/env node
/*
Smoke-check that GitHub Pages base-path script URLs are correct in built HTML.
This catches regressions where /arxiv-notes/ is dropped.
*/

const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');

function fail(msg){
  console.error('UI_PATH_SMOKE_FAILED - ' + msg);
  process.exit(2);
}

if (!fs.existsSync(dist)) fail('dist/ missing. Run astro build first.');

// Find at least one paper page.
const walk = (dir) => {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })){
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
};

const files = walk(dist).filter((f) => f.endsWith('.html'));
if (!files.length) fail('no html in dist');

// Home page should be dist/index.html (Astro builds routes relative to `base` at deploy time).
// Don't accidentally grab some nested .../index.html like /about/index.html.
const homeCandidate = path.join(dist, 'index.html');
const home = fs.existsSync(homeCandidate)
  ? homeCandidate
  : files.find((f) => f.endsWith(path.join('arxiv-notes', 'index.html')));
if (!home) fail('home index.html not found');

const html = fs.readFileSync(home, 'utf8');
if (!html.includes('name="arxiv-notes-base"')) fail('missing arxiv-notes-base meta tag');

// Favorites page should reference favorites.js under base path.
const favCandidate = path.join(dist, 'favorites', 'index.html');
const fav = fs.existsSync(favCandidate)
  ? favCandidate
  : files.find((f) => f.includes(path.join('arxiv-notes', 'favorites', 'index.html')));
if (fav) {
  const favHtml = fs.readFileSync(fav, 'utf8');
  if (!favHtml.includes('favorites.js')) fail('favorites page missing favorites.js');
}

console.log('UI_PATH_SMOKE_OK');
