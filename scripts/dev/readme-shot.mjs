#!/usr/bin/env node
// Screenshot the whole README as GitHub would lay it out, in one theme, animations frozen at t.
//   node scripts/dev/readme-shot.mjs [dark|light] [seconds] → .preview/readme-<theme>-<t>.png
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const theme = process.argv[2] ?? 'dark';
const t = Number(process.argv[3] ?? 30);
let md = readFileSync(join(ROOT, 'README.md'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

// <picture> → the variant for this theme; local SVGs become <object> so their animations can be frozen.
md = md.replace(/<picture><source media="\(prefers-color-scheme: light\)" srcset="([^"]+)"\/>(<img [^>]*\/>)<\/picture>/g,
  (m, light, img) => (theme === 'light' ? img.replace(/src="[^"]+"/, `src="${light}"`) : img));
md = md.replace(/<img src="(assets\/[^"?]+)(\?[^"]*)?"([^>]*)\/>/g, (m, src, q, rest) => {
  const w = (rest.match(/width="([^"]+)"/) || [])[1] ?? '100%';
  return `<object data="${pathToFileURL(join(ROOT, src)).href}" type="image/svg+xml" style="width:${/%$/.test(w) ? w : w + 'px'};vertical-align:top"></object>`;
});
md = md.replace(/<br\/>/g, '<div style="height:16px"></div>').replace(/\n{2,}/g, '\n');

const bg = theme === 'light' ? '#ffffff' : '#0d1117';
const html = `<!doctype html><html><body style="margin:0;background:${bg};font:14px sans-serif;color:${theme === 'light' ? '#1f2328' : '#e6edf3'}">
<div style="width:1000px;padding:24px">${md}</div>
<script>setTimeout(()=>{for(const o of document.querySelectorAll('object')){const d=o.contentDocument;if(!d)continue;
const s=d.documentElement;if(s.pauseAnimations){s.pauseAnimations();s.setCurrentTime(${t});}
d.getAnimations().forEach(a=>{a.pause();a.currentTime=${t * 1000};});}},1500);</script></body></html>`;
mkdirSync(join(ROOT, '.preview'), { recursive: true });
const page = join(ROOT, '.preview', `readme-${theme}.html`);
writeFileSync(page, html);
const png = join(ROOT, '.preview', `readme-${theme}-${t}.png`);
execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files',
  '--hide-scrollbars', '--window-size=1048,7400', '--virtual-time-budget=4000', `--screenshot=${png}`, pathToFileURL(page).href], { stdio: 'ignore' });
console.log(png);
