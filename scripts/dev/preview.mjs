#!/usr/bin/env node
// Preview one section in both themes, frozen at chosen animation times.
//   node scripts/dev/preview.mjs <sectionId> [seconds…]      (default 0.5 2 6 30)
// Output: .preview/<id>/{*.svg, *-light.svg, preview.html, t<seconds>.png}
// Uses cached data (data/*.json) so it's fast; run the section's data() first by passing --fresh.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadSections, runData, renderAll, makeCache } from '../runtime.mjs';
import * as lib from '../lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [id, ...rest] = process.argv.slice(2);
if (!id) { console.error('usage: preview.mjs <sectionId> [seconds…] [--fresh]'); process.exit(1); }
const fresh = rest.includes('--fresh');
const times = rest.filter((a) => !a.startsWith('--')).map(Number);
if (!times.length) times.push(0.5, 2, 6, 30);

const config = JSON.parse(readFileSync(join(ROOT, 'tools.json'), 'utf8'));
const tools = config.tools.filter((t) => !t.draft);
const now = new Date();
const cache = makeCache(ROOT);
const mods = await loadSections(ROOT, id);
if (!mods.length) { console.error(`no section "${id}" in scripts/sections`); process.exit(1); }

const cacheKey = `preview-${id}`;
let data = !fresh && cache.get(cacheKey);
if (!data) {
  data = await runData(mods, { gh: lib.gh, getJSON: lib.getJSON, config, tools, now, ROOT, cache });
  cache.set(cacheKey, data);
}
data.github = cache.get('github') ?? {};

const files = renderAll(mods, { config, tools, now, data });
const out = join(ROOT, '.preview', id);
mkdirSync(out, { recursive: true });
for (const [name, s] of Object.entries(files)) {
  mkdirSync(dirname(join(out, name)), { recursive: true });
  writeFileSync(join(out, name), s);
  console.log(`  ${name}  ${(s.length / 1024).toFixed(1)} KB`);
}

// One page per time: every file for both themes on matching backgrounds, animations frozen at t.
const names = Object.keys(files).sort();
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium']
  .find((p) => existsSync(p));
for (const t of times) {
  const html = `<!doctype html><html><body style="margin:0;background:#888;font:12px monospace">
${names.map((n) => `<div style="padding:12px;background:${n.includes('-light') ? '#ffffff' : '#0d1117'}">
  <div style="color:#888">${n} @ ${t}s</div>
  <object data="${pathToFileURL(join(out, n)).href}" type="image/svg+xml" style="max-width:1200px;width:100%"></object></div>`).join('\n')}
<script>setTimeout(()=>{for(const o of document.querySelectorAll('object')){const d=o.contentDocument;if(!d)continue;
  const s=d.documentElement; if(s.pauseAnimations){s.pauseAnimations();s.setCurrentTime(${t});}
  d.getAnimations().forEach(a=>{a.pause();a.currentTime=${t * 1000};});}},600);</script></body></html>`;
  const page = join(out, `preview-${t}.html`);
  writeFileSync(page, html);
  if (chrome) {
    const png = join(out, `t${t}.png`);
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--hide-scrollbars',
      '--window-size=1240,2400', '--virtual-time-budget=2500', `--screenshot=${png}`, pathToFileURL(page).href], { stdio: 'ignore' });
    console.log(`  screenshot ${png}`);
  }
}
