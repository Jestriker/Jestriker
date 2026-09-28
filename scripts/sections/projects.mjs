// PROJECTS — one animated card per tool in tools.json (assets/tools/<slug>.svg), plus the section header.
// The 120×120 icon box alternates between the tool's real pixel icon and a tiny looping pixel scene
// (see _scenes.mjs), swapping with a blocky pixel-dissolve every 6 s, staggered per card.

import { esc, pixelText, textWidth, identicon, rng } from '../pixel.mjs';
import { scene, mix } from './_scenes.mjs';

export const id = 'projects';

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Latest release per releasesRepo, so the status line works even when the build's loader didn't set t.live.
export async function data(env) {
  const live = {};
  for (const t of env.tools ?? []) {
    if (!t.releasesRepo) continue;
    try {
      const rel = await env.gh(`repos/${t.releasesRepo}/releases?per_page=1`);
      if (Array.isArray(rel) && rel[0]) live[t.name] = { version: rel[0].tag_name, when: rel[0].published_at };
    } catch { /* fall back to github events */ }
  }
  return { live };
}

// ── colour helpers: keep project accents, but readable on either theme ──
const rgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (h) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = rgb(h).map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function safe(a, bg, target) {
  const toward = lum(bg) > 0.5 ? '#000000' : '#ffffff';
  let c = a;
  for (let k = 1; k <= 20 && contrast(c, bg) < target; k++) c = mix(a, toward, k * 0.05);
  return c;
}

function wrap(text, max) {
  const lines = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function liveOf(t, ctx) {
  if (t.live) return t.live;
  if (!t.releasesRepo) return null;
  const d = ctx.data?.projects?.live?.[t.name];
  if (d) return d;
  const ev = (ctx.data?.github?.events ?? []).find((e) => e.kind === 'release' && e.label?.startsWith(`${t.name} `));
  return ev ? { version: ev.label.slice(t.name.length + 1), when: ev.when } : null;
}

function card(ctx, t, i) {
  const { C, MONO } = ctx;
  const dark = C.name === 'dark';
  const W = 580, H = 220, cid = `c${i}`;
  const raw = t.accent ?? C.green;
  const surface = dark ? C.bg : C.panel;
  const a = safe(raw, surface, 3);          // strokes, LED, runner
  const at = safe(raw, surface, 4.5);       // text on the card (tags, OPEN)
  const s = slug(t.name);

  // Real icon: {palette, rows} from tools.json, or a generated identicon.
  const rows = t.sprite?.rows ?? identicon(t.name);
  const pal = t.sprite?.palette ?? { 1: raw, 2: dark ? '#ffffff' : '#0b1510' };
  const px = Math.floor(96 / rows.length);
  const ox = 24 + (120 - rows[0].length * px) / 2;
  const oy = 30 + (120 - rows.length * px) / 2;
  const icon = rows
    .flatMap((row, y) => [...row].map((c, x) => (!pal[c] ? '' :
      `<rect x="${ox + x * px}" y="${oy + y * px}" width="${px}" height="${px}" fill="${pal[c]}" class="ip" style="animation-delay:${(0.2 + (x + y) * 0.025).toFixed(3)}s"/>`)))
    .join('');

  // Icon ⇄ scene cycle: icon for 6 s, scene for 6 s. Stagger so the cards never swap in unison.
  const CYCLE = 12, d = +((i * 0.75) % 6).toFixed(2), D = d + 6 + 0.35;
  const sceneBg = dark ? mix(C.bg, raw, 0.1) : mix('#ffffff', raw, 0.12);
  const sc = scene(t, s, { a: raw, D: D % 6, dark, C });
  // Pixel-dissolve mask: 8×8 blocks of 15 px, each flipping at its own moment within ~0.6 s.
  const r = rng(`dissolve-${t.name}`);
  const blocks = [];
  for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) {
    const on = (6 + r() * 0.6) / CYCLE, off = (11.4 + r() * 0.55) / CYCLE;
    blocks.push(`<rect x="${24 + bx * 15}" y="${30 + by * 15}" width="15" height="15" fill="#fff" opacity="0"><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;${on.toFixed(4)};${off.toFixed(4)};1" dur="${CYCLE}s" begin="${d}s" calcMode="discrete" repeatCount="indefinite"/></rect>`);
  }

  let nameScale = 3;
  while (textWidth(t.name, nameScale) > 390 && nameScale > 2) nameScale--;
  const nameSvg = pixelText(t.name, 170, 34, nameScale, { fill: C.ink });

  const live = liveOf(t, ctx);
  const status = live
    ? `${live.version} · shipped ${ctx.lib.ago(live.when, ctx.now)}`
    : t.status ?? (t.draft ? 'coming soon' : `live · ${new URL(t.url).host}`);
  let lines = wrap(t.tagline ?? '', 44);
  if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] = lines[2].replace(/[\s.,;:]*$/, '') + '…'; }
  const desc = lines.map((l, k) => `<text x="170" y="${108 + k * 22}" font-family="${MONO}" font-size="14.5" fill="${C.text}">${esc(l)}</text>`).join('');

  let tx = 170;
  const tags = (t.tags ?? []).slice(0, 4).map((tag) => {
    const w = tag.length * 7.8 + 18;
    if (tx + w > 470) return '';
    const out = `<rect x="${tx}" y="176" width="${w}" height="22" rx="4" fill="${a}" fill-opacity="${dark ? 0.1 : 0.08}" stroke="${a}" stroke-opacity=".45"/>
      <text x="${tx + w / 2}" y="191" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${at}">${esc(tag)}</text>`;
    tx += w + 8;
    return out;
  }).join('');

  const per = 2 * (W - 4 + H - 4);
  const iconBox = dark ? `fill="#000" fill-opacity=".5"` : `fill="${mix('#ffffff', raw, 0.06)}"`;
  const body = `
  <defs>
    <linearGradient id="bg${cid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${raw}" stop-opacity="${dark ? 0.1 : 0.08}"/><stop offset=".6" stop-color="${C.panel}" stop-opacity="1"/></linearGradient>
    <linearGradient id="shine${cid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${dark ? 0.35 : 0.45}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="ic${cid}"><rect x="24" y="30" width="120" height="120" rx="10"/></clipPath>
    <pattern id="scan${cid}" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#000" opacity="${dark ? 0.25 : 0.08}"/></pattern>
    <mask id="dz${cid}" maskUnits="userSpaceOnUse" x="24" y="30" width="120" height="120">${blocks.join('')}</mask>
    ${sc.defs}
  </defs>
  <style>
    .ip{opacity:0;animation:ip .3s ease-out forwards;transform-box:fill-box;transform-origin:center}
    @keyframes ip{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
    .led{animation:led 1.4s ease-in-out infinite}
    @keyframes led{50%{opacity:.25}}
    .arrow{animation:nudge 1.2s ease-in-out infinite}
    @keyframes nudge{50%{transform:translateX(5px)}}
    .run{animation:run 5s linear infinite}
    @keyframes run{to{stroke-dashoffset:-${per}}}
    .shine{animation:shine 4.5s ease-in-out ${(i * 0.6).toFixed(1)}s infinite}
    @keyframes shine{0%{transform:translateX(-160px)}40%,100%{transform:translateX(200px)}}
    ${sc.css}
  </style>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="${surface}"/>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="url(#bg${cid})" stroke="${a}" stroke-opacity="${dark ? 0.25 : 0.35}" stroke-width="2"/>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="none" stroke="${a}" stroke-width="3" stroke-dasharray="90 ${per - 90}" class="run" style="animation-delay:-${(i * 1.3).toFixed(1)}s"/>
  <rect x="24" y="30" width="120" height="120" rx="10" ${iconBox}/>
  <g clip-path="url(#ic${cid})">
    ${icon}
    <g mask="url(#dz${cid})"><rect x="24" y="30" width="120" height="120" fill="${sceneBg}"/>
      <g transform="translate(24 30) scale(4)" shape-rendering="crispEdges">${sc.body}</g></g>
    <rect x="24" y="30" width="120" height="120" fill="url(#scan${cid})"/>
    <rect x="-40" y="0" width="60" height="200" fill="url(#shine${cid})" transform="rotate(20)" class="shine"/>
  </g>
  <rect x="24" y="30" width="120" height="120" rx="10" fill="none" stroke="${a}" stroke-opacity=".4"/>
  <text x="84" y="178" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${C.muted}">#${String(i + 1).padStart(2, '0')}</text>
  ${nameSvg}
  <circle cx="176" cy="${34 + 7 * nameScale + 20}" r="4.5" fill="${t.draft ? C.warn : a}" class="led"/>
  <text x="188" y="${34 + 7 * nameScale + 25}" font-family="${MONO}" font-size="13" fill="${C.muted}">${esc(status)}</text>
  ${desc}
  ${tags}
  <g class="arrow"><text x="${W - 26}" y="192" text-anchor="end" font-family="${MONO}" font-size="14" font-weight="700" fill="${at}">OPEN ▸</text></g>`;
  return ctx.lib.svg(W, H, body, `${t.name} — ${t.tagline ?? ''}`);
}

export function render(ctx) {
  const out = { 'h-projects.svg': ctx.lib.header(ctx.C, ctx.no('projects'), "PROJECTS I'VE WORKED ON", ctx.C.green) };
  (ctx.tools ?? []).forEach((t, i) => (out[`tools/${slug(t.name)}.svg`] = card(ctx, t, i)));
  return out;
}

export function readme(ctx) {
  const tools = ctx.tools ?? [];
  if (!tools.length) return '';
  const cells = tools.map((t) =>
    `<a href="${esc(t.url)}">${ctx.pic(`tools/${slug(t.name)}.svg`, `width="49%" alt="${esc(t.name)} — ${esc(t.tagline ?? '')}"`)}</a>`);
  const rows = [];
  for (let k = 0; k < cells.length; k += 2) rows.push(`<p align="center">\n  ${cells.slice(k, k + 2).join('\n  ')}\n</p>`);
  return `<p align="center">${ctx.pic('h-projects.svg', `width="100%" alt="${ctx.no('projects')} // PROJECTS I'VE WORKED ON"`)}</p>\n${rows.join('\n')}`;
}
