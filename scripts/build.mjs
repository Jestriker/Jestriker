#!/usr/bin/env node
// Builds every animated SVG in /assets from tools.json + live GitHub data, then rewrites the
// generated blocks in README.md. Zero dependencies — runs on stock Node 20+.
//
//   node scripts/build.mjs            # published tools only
//   node scripts/build.mjs --drafts   # include tools marked "draft": true (local preview)

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, pixelText, textWidth, sprite, SPRITES, identicon, rng, glyph } from './pixel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const config = JSON.parse(readFileSync(join(ROOT, 'tools.json'), 'utf8'));
const showDrafts = process.argv.includes('--drafts');
const tools = config.tools.filter((t) => showDrafts || !t.draft);
const now = new Date();

const C = {
  bg: '#050807', panel: '#0a0f0c', line: '#16241c', green: '#22ff88', dim: '#1a7a4a',
  text: '#d7e4dc', muted: '#6b8577', warn: '#fbbf24', red: '#ff3355',
};
const MONO = `ui-monospace,SFMono-Regular,'JetBrains Mono',Menlo,Consolas,monospace`;

// ───────────────────────────── GitHub data ─────────────────────────────

async function gh(path) {
  try {
    if (process.env.GITHUB_TOKEN) {
      const res = await fetch(`https://api.github.com/${path}`, {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'User-Agent': 'profile-builder' },
      });
      if (!res.ok) throw new Error(`${res.status} ${path}`);
      return await res.json();
    }
    // Local fallback: let the gh CLI handle auth.
    return JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch (e) {
    console.warn(`  ! github ${path}: ${e.message.split('\n')[0]}`);
    return null;
  }
}

const ago = (iso) => {
  const d = Math.max(0, Math.floor((now - new Date(iso)) / 864e5));
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

async function loadGitHub() {
  const user = config.profile.github;
  const repos = (await gh(`users/${user}/repos?per_page=100&sort=pushed`)) ?? [];
  const events = [];
  let releases = 0;
  let downloads = 0;

  for (const t of tools) {
    if (!t.releasesRepo) continue;
    const rel = (await gh(`repos/${t.releasesRepo}/releases?per_page=30`)) ?? [];
    releases += rel.length;
    downloads += rel.flatMap((r) => r.assets ?? []).reduce((n, a) => n + (a.download_count ?? 0), 0);
    if (rel[0]) t.live = { version: rel[0].tag_name, when: rel[0].published_at };
    for (const r of rel.slice(0, 4)) {
      events.push({ when: r.published_at, kind: 'release', label: `${t.name} ${r.tag_name}` });
    }
  }
  for (const r of repos.filter((r) => !r.fork && r.name !== user && !tools.some((t) => t.releasesRepo?.endsWith(`/${r.name}`))).slice(0, 4)) {
    events.push({ when: r.pushed_at, kind: 'push', label: r.name });
  }
  for (const t of tools) if (!t.releasesRepo) events.push({ when: t.added ?? null, kind: 'online', label: `${t.name} → ${t.url.replace(/^https?:\/\//, '')}` });

  events.sort((a, b) => (b.when ? +new Date(b.when) : 0) - (a.when ? +new Date(a.when) : 0));
  const years = Math.floor((now - new Date(config.profile.since)) / 3.15576e10);
  return { events: events.slice(0, 8), releases, downloads, years };
}

// ───────────────────────────── shared SVG bits ─────────────────────────────

const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">` +
  `<title>${esc(title)}</title>${body}</svg>`;

const crtDefs = (id, w, h) => `
  <pattern id="scan${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".35"/></pattern>
  <radialGradient id="vig${id}" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".75"/></radialGradient>
  <linearGradient id="band${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.green}" stop-opacity="0"/><stop offset=".5" stop-color="${C.green}" stop-opacity=".06"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></linearGradient>
  <filter id="glow${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="screen${id}"><rect width="${w}" height="${h}" rx="16"/></clipPath>`;

const crtOverlay = (id, w, h) => `
  <rect width="${w}" height="${h}" fill="url(#scan${id})" pointer-events="none"/>
  <rect y="-120" width="${w}" height="120" fill="url(#band${id})"><animate attributeName="y" values="-120;${h}" dur="7s" repeatCount="indefinite"/></rect>
  <rect width="${w}" height="${h}" fill="url(#vig${id})"/>`;

// Typing effect: reveal text through a clip rect that grows one character at a time.
function typed(id, text, x, y, { size = 16, fill = C.text, begin = 0, cps = 28, weight = 400, cursor = true } = {}) {
  const cw = size * 0.6;
  const n = [...text].length;
  const dur = n / cps;
  const vals = Array.from({ length: n + 1 }, (_, i) => (i * cw).toFixed(1)).join(';');
  const cur = cursor
    ? `<rect x="${x + n * cw + 3}" y="${y - size * 0.8}" width="${cw}" height="${size}" fill="${fill}" opacity="0">
         <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.01;.5;.51;1" dur="1s" begin="${(begin + dur).toFixed(2)}s" repeatCount="indefinite"/></rect>`
    : '';
  return `<clipPath id="t${id}"><rect x="${x}" y="${y - size}" width="0" height="${size * 1.4}">
      <animate attributeName="width" values="${vals}" dur="${dur.toFixed(2)}s" begin="${begin}s" calcMode="discrete" fill="freeze"/></rect></clipPath>
    <text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="${weight}" fill="${fill}" clip-path="url(#t${id})" xml:space="preserve">${esc(text)}</text>${cur}`;
}

// ───────────────────────────── HERO ─────────────────────────────

function hero(gh) {
  const W = 1200, H = 440, id = 'h';
  const r = rng('liamos-stars');
  const stars = Array.from({ length: 70 }, () => {
    const s = r() > 0.85 ? 3 : 2;
    return `<rect x="${(r() * W) | 0}" y="${(r() * H) | 0}" width="${s}" height="${s}" fill="${r() > 0.8 ? C.green : '#cfe'}" class="tw" style="animation-delay:${(r() * 4).toFixed(2)}s;animation-duration:${(2 + r() * 3).toFixed(2)}s"/>`;
  }).join('');

  const boot = [
    ['OK', 'Booting LiamOS kernel 6.9-plus'],
    ['OK', 'Mounting /dev/curiosity'],
    ['OK', 'Starting cybersec.target + netstack'],
    ['OK', `Loading ${tools.length} published tools`],
    ['OK', `Syncing ${gh.releases} releases from GitHub`],
    ['OK', 'Linking https://liam.plus'],
    ['WARN', 'Zombies detected near sector 7'],
    ['OK', 'System ready.'],
  ];
  const bootLines = boot
    .map(([s, msg], i) => {
      const y = 112 + i * 26;
      const col = s === 'OK' ? C.green : C.warn;
      return `<g class="fade" style="animation-delay:${(0.3 + i * 0.22).toFixed(2)}s">
        <text x="60" y="${y}" font-family="${MONO}" font-size="14" fill="${C.muted}">[<tspan fill="${col}">${s.padStart(s === 'OK' ? 3 : 4, ' ').padEnd(4, ' ')}</tspan>]</text>
        <text x="122" y="${y}" font-family="${MONO}" font-size="14" fill="${C.text}">${esc(msg)}</text></g>`;
    })
    .join('');

  const logo = 'LIAM+';
  const scale = 16;
  const lw = textWidth(logo, scale);
  const lx = 600 + (540 - lw) / 2;
  const ly = 110;
  const logoStart = 0.3 + boot.length * 0.22 + 0.2;
  const drop = (x, y, i, col) => ` class="drop" style="animation-delay:${(logoStart + col * 0.035 + (y - ly) * 0.0009).toFixed(3)}s"`;
  const logoShadow = pixelText(logo, lx + 6, ly + 6, scale, { fill: '#0d3b24', perPixel: drop });
  const logoMain = pixelText(logo, lx, ly, scale, { fill: C.green, perPixel: drop });
  const logoHi = pixelText(logo, lx, ly, scale, { fill: '#b6ffd6', perPixel: (x, y, i, col) => (y === ly ? drop(x, y, i, col) : ' style="display:none"') });

  const tagY = ly + 7 * scale + 58;
  const tagStart = logoStart + 1.1;
  const role = config.profile.role;
  const roleX = 600 + (540 - role.length * 16 * 0.6) / 2;

  const liam = `<g class="bob"><g>${sprite(SPRITES.liamA, 1090, 300, 5)}</g></g>`;

  const body = `
  <defs>${crtDefs(id, W, H)}
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${C.green}" stroke-opacity=".05"/></pattern>
  </defs>
  <style>
    .tw{animation:tw 3s ease-in-out infinite}
    @keyframes tw{0%,100%{opacity:.15}50%{opacity:1}}
    .fade{opacity:0;animation:fade .35s ease-out forwards}
    @keyframes fade{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
    .drop{opacity:0;animation:drop .55s cubic-bezier(.2,1.5,.45,1) forwards}
    @keyframes drop{from{opacity:0;transform:translateY(-260px)}to{opacity:1;transform:none}}
    .pulse{animation:pulse 3.2s ease-in-out ${(logoStart + 1).toFixed(2)}s infinite}
    @keyframes pulse{0%,100%{opacity:.35}50%{opacity:.9}}
    .bob{animation:bob 1.6s steps(2) infinite}
    @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    .bubble{opacity:0;animation:fade .3s ease-out ${(tagStart + 1.8).toFixed(2)}s forwards}
    .flick{animation:flick 6s infinite}
    @keyframes flick{0%,96%,100%{opacity:1}97%{opacity:.85}98%{opacity:1}99%{opacity:.9}}
  </style>
  <g clip-path="url(#screen${id})" class="flick">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#grid)"/>
    ${stars}
    <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="12" fill="#000" fill-opacity=".45" stroke="${C.line}"/>
    <rect x="20" y="20" width="${W - 40}" height="40" rx="12" fill="${C.panel}"/>
    <rect x="20" y="48" width="${W - 40}" height="12" fill="${C.panel}"/>
    <circle cx="46" cy="40" r="6" fill="#ff5f57"/><circle cx="66" cy="40" r="6" fill="#febc2e"/><circle cx="86" cy="40" r="6" fill="#28c840"/>
    <text x="${W / 2}" y="45" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${C.muted}">liam@liamos: ~/profile</text>
    <text x="${W - 44}" y="45" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.dim}">uptime ${gh.years}y · ${tools.length} tools online · built ${now.toISOString().slice(0, 10)}</text>
    ${bootLines}
    <line x1="580" y1="84" x2="580" y2="${H - 44}" stroke="${C.line}" stroke-dasharray="2 6"/>
    <g class="pulse" filter="url(#glow${id})" opacity=".35">${pixelText(logo, lx, ly, scale, { fill: C.green })}</g>
    ${logoShadow}${logoMain}${logoHi}
    ${typed('role', role, roleX, tagY, { size: 16, fill: C.text, begin: tagStart, cursor: false })}
    ${typed('where', `${config.profile.location} · ${config.profile.site.replace('https://', '')}`, 600 + (540 - 30 * 13 * 0.6) / 2, tagY + 30, { size: 13, fill: C.muted, begin: tagStart + 1.2, cursor: false })}
    ${typed('prompt', './explore --tools --no-zombies', 88, H - 58, { size: 15, fill: C.green, begin: logoStart + 0.6 })}
    <text x="60" y="${H - 58}" font-family="${MONO}" font-size="15" fill="${C.muted}">$</text>
    ${liam}
    <g class="bubble"><rect x="1062" y="262" width="58" height="26" fill="#fff"/><rect x="1098" y="288" width="6" height="6" fill="#fff"/>
      <text x="1091" y="280" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" fill="#000">hi!</text></g>
    ${crtOverlay(id, W, H)}
  </g>`;
  return svg(W, H, body, `LiamOS boot screen — ${config.profile.name}`);
}

// ───────────────────────────── SECTION HEADER ─────────────────────────────

function header(index, title, accent = C.green) {
  const W = 1200, H = 64;
  const label = `${String(index).padStart(2, '0')} // ${title}`;
  const tw = textWidth(label, 4);
  const body = `
  <style>
    .px{animation:in .18s linear both}
    @keyframes in{from{opacity:0}to{opacity:1}}
    .dash{animation:dash 1.2s linear infinite}
    @keyframes dash{to{stroke-dashoffset:-24}}
    .blink{animation:blink 1s steps(1) infinite}
    @keyframes blink{50%{opacity:0}}
  </style>
  ${pixelText(label, 8, 18, 4, { fill: accent, perPixel: (x, y, i, col) => ` class="px" style="animation-delay:${(col * 0.02).toFixed(2)}s"` })}
  <rect class="blink" x="${16 + tw}" y="18" width="16" height="28" fill="${accent}"/>
  <line x1="${48 + tw}" y1="32" x2="${W - 8}" y2="32" stroke="${accent}" stroke-opacity=".5" stroke-width="4" stroke-dasharray="4 8" class="dash"/>`;
  return svg(W, H, body, title);
}

// ───────────────────────────── TOOL CARD ─────────────────────────────

function wrap(text, max) {
  const lines = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function card(t, i) {
  const W = 580, H = 220, id = `c${i}`;
  const a = t.accent ?? C.green;
  // A sprite is either {palette, rows} (converted from the tool's real icon) or a generated identicon.
  const rows = t.sprite?.rows ?? identicon(t.name);
  const pal = t.sprite?.palette ?? { 1: a, 2: '#fff' };
  const px = Math.floor(96 / rows.length);
  const ox = 24 + (120 - rows[0].length * px) / 2;
  const oy = 30 + (120 - rows.length * px) / 2;
  const icon = rows
    .flatMap((row, y) => [...row].map((c, x) => (!pal[c] ? '' :
      `<rect x="${ox + x * px}" y="${oy + y * px}" width="${px}" height="${px}" fill="${pal[c]}" class="ip" style="animation-delay:${(0.2 + (x + y) * 0.025).toFixed(3)}s"/>`)))
    .join('');

  let nameScale = 3;
  while (textWidth(t.name, nameScale) > 390 && nameScale > 2) nameScale--;
  const nameSvg = pixelText(t.name, 170, 34, nameScale, { fill: '#fff' });

  const status = t.live
    ? `${t.live.version} · shipped ${ago(t.live.when)}`
    : t.draft ? 'coming soon' : `live · ${new URL(t.url).host}`;
  const lines = wrap(t.tagline ?? '', 44).slice(0, 3);
  const desc = lines.map((l, k) => `<text x="170" y="${108 + k * 22}" font-family="${MONO}" font-size="14.5" fill="${C.text}">${esc(l)}</text>`).join('');

  let tx = 170;
  const tags = (t.tags ?? []).slice(0, 4).map((tag) => {
    const w = tag.length * 7.8 + 18;
    const s = `<rect x="${tx}" y="176" width="${w}" height="22" rx="4" fill="${a}" fill-opacity=".1" stroke="${a}" stroke-opacity=".4"/>
      <text x="${tx + w / 2}" y="191" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${a}">${esc(tag)}</text>`;
    tx += w + 8;
    return s;
  }).join('');

  const per = 2 * (W - 4 + H - 4);
  const body = `
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}" stop-opacity=".10"/><stop offset=".6" stop-color="${C.panel}" stop-opacity="1"/></linearGradient>
    <linearGradient id="shine${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="ic${id}"><rect x="24" y="30" width="120" height="120" rx="10"/></clipPath>
    <pattern id="scan${id}" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#000" opacity=".25"/></pattern>
  </defs>
  <style>
    .ip{opacity:0;animation:ip .3s ease-out forwards}
    @keyframes ip{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
    .ip{transform-box:fill-box;transform-origin:center}
    .led{animation:led 1.4s ease-in-out infinite}
    @keyframes led{50%{opacity:.25}}
    .arrow{animation:nudge 1.2s ease-in-out infinite}
    @keyframes nudge{50%{transform:translateX(5px)}}
    .run{animation:run 5s linear infinite}
    @keyframes run{to{stroke-dashoffset:-${per}}}
    .shine{animation:shine 4.5s ease-in-out ${(i * 0.6).toFixed(1)}s infinite}
    @keyframes shine{0%{transform:translateX(-160px)}40%,100%{transform:translateX(200px)}}
  </style>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="${C.bg}"/>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="url(#bg${id})" stroke="${a}" stroke-opacity=".25" stroke-width="2"/>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="none" stroke="${a}" stroke-width="3" stroke-dasharray="90 ${per - 90}" class="run" style="animation-delay:-${(i * 1.3).toFixed(1)}s"/>
  <rect x="24" y="30" width="120" height="120" rx="10" fill="#000" fill-opacity=".5" stroke="${a}" stroke-opacity=".35"/>
  <g clip-path="url(#ic${id})">${icon}<rect x="24" y="30" width="120" height="120" fill="url(#scan${id})"/>
    <rect x="-40" y="0" width="60" height="200" fill="url(#shine${id})" transform="rotate(20)" class="shine"/></g>
  <text x="84" y="178" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${C.muted}">#${String(i + 1).padStart(2, '0')}</text>
  ${nameSvg}
  <circle cx="176" cy="${34 + 7 * nameScale + 20}" r="4.5" fill="${t.draft ? C.warn : a}" class="led"/>
  <text x="188" y="${34 + 7 * nameScale + 25}" font-family="${MONO}" font-size="13" fill="${C.muted}">${esc(status)}</text>
  ${desc}
  ${tags}
  <g class="arrow"><text x="${W - 26}" y="192" text-anchor="end" font-family="${MONO}" font-size="14" font-weight="700" fill="${a}">OPEN ▸</text></g>`;
  return svg(W, H, body, `${t.name} — ${t.tagline ?? ''}`);
}

// ───────────────────────────── STATS (slot-machine counters) ─────────────────────────────

function stats(gh) {
  const W = 1200, H = 150;
  const items = [
    ['TOOLS', tools.length],
    ['RELEASES', gh.releases],
    ['DOWNLOADS', gh.downloads],
    ['YEARS', gh.years],
  ];
  const cellW = W / items.length;
  const scale = 7, gh_ = 7 * scale, step = gh_ + 14;
  let clipN = 0;
  const cells = items.map(([label, value], k) => {
    const digits = String(value).split('');
    const dw = 6 * scale;
    const x0 = k * cellW + (cellW - (digits.length * dw - scale)) / 2;
    const y0 = 30;
    const cols = digits.map((d, j) => {
      const strip = [];
      const seq = [...'0123456789', ...'0123456789'.slice(0, +d + 1)];
      seq.forEach((ch, n) => strip.push(pixelText(ch, x0 + j * dw, y0 + n * step, scale, { fill: C.green })));
      const dist = (seq.length - 1) * step;
      const cid = `sc${clipN++}`;
      return `<clipPath id="${cid}"><rect x="${x0 + j * dw - 2}" y="${y0 - 2}" width="${dw}" height="${gh_ + 4}"/></clipPath>
        <g clip-path="url(#${cid})"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -${dist}" keySplines=".15 .6 .3 1" calcMode="spline" dur="${(1.6 + j * 0.35 + k * 0.2).toFixed(2)}s" fill="freeze"/>${strip.join('')}</g></g>`;
    }).join('');
    return `${cols}
      <text x="${k * cellW + cellW / 2}" y="${y0 + gh_ + 34}" text-anchor="middle" font-family="${MONO}" font-size="13" letter-spacing="3" fill="${C.muted}">${label}</text>
      ${k ? `<line x1="${k * cellW}" y1="28" x2="${k * cellW}" y2="${H - 24}" stroke="${C.line}" stroke-dasharray="2 6"/>` : ''}`;
  }).join('');
  const body = `<rect width="${W}" height="${H}" rx="16" fill="${C.bg}"/><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" fill="none" stroke="${C.line}"/>${cells}`;
  return svg(W, H, body, `${tools.length} tools, ${gh.releases} releases, ${gh.downloads} downloads, ${gh.years} years on GitHub`);
}

// ───────────────────────────── SHIP LOG ─────────────────────────────

function shiplog(gh) {
  const ev = gh.events;
  const W = 1200, H = 110 + ev.length * 28, id = 's';
  const icon = { release: ['▲', C.green], push: ['◆', '#38bdf8'], online: ['●', C.warn] };
  const start = 1.3;
  const lines = ev.map((e, k) => {
    const [g, col] = icon[e.kind];
    const y = 104 + k * 28;
    const date = e.when ? e.when.slice(0, 10) : '──────────';
    return `<g class="fade" style="animation-delay:${(start + k * 0.18).toFixed(2)}s">
      <text x="48" y="${y}" font-family="${MONO}" font-size="14" fill="${C.muted}">${date}</text>
      <text x="170" y="${y}" font-family="${MONO}" font-size="14" fill="${col}">${g} ${e.kind.padEnd(8, ' ')}</text>
      <text x="300" y="${y}" font-family="${MONO}" font-size="14" fill="${C.text}">${esc(e.label)}</text>
      <text x="${W - 48}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="13" fill="${C.dim}">${e.when ? ago(e.when) : ''}</text></g>`;
  }).join('');
  const body = `
  <defs>${crtDefs(id, W, H)}</defs>
  <style>
    .fade{opacity:0;animation:fade .3s ease-out forwards}
    @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  </style>
  <g clip-path="url(#screen${id})">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" fill="none" stroke="${C.line}"/>
    <text x="48" y="48" font-family="${MONO}" font-size="15" fill="${C.muted}">$</text>
    ${typed('log', 'tail -f ~/.shiplog   # auto-updated daily by GitHub Actions', 66, 48, { size: 15, fill: C.green, begin: 0.2, cursor: false })}
    <line x1="48" y1="66" x2="${W - 48}" y2="66" stroke="${C.line}"/>
    ${lines}
    ${crtOverlay(id, W, H)}
  </g>`;
  return svg(W, H, body, 'Ship log — latest releases and pushes');
}

// ───────────────────────────── FOOTER: Liam vs. Zombies ─────────────────────────────

function footer() {
  const W = 1200, H = 220;
  const r = rng('skyline');
  let sx = 0;
  const skyline = [];
  while (sx < W * 2) {
    const bw = 40 + ((r() * 60) | 0), bh = 30 + ((r() * 70) | 0);
    skyline.push(`<rect x="${sx}" y="${160 - bh}" width="${bw}" height="${bh}" fill="#0c1511"/>`);
    for (let wy = 160 - bh + 8; wy < 150; wy += 12)
      for (let wx = sx + 6; wx < sx + bw - 6; wx += 10)
        if (r() > 0.78) skyline.push(`<rect x="${wx}" y="${wy}" width="4" height="4" fill="${r() > 0.5 ? '#1f6b43' : '#3a3a1a'}"/>`);
    sx += bw + 4;
  }
  const tile = Array.from({ length: Math.ceil((W * 2) / 16) }, (_, k) =>
    `<rect x="${k * 16}" y="160" width="16" height="6" fill="${k % 2 ? '#14532d' : '#166534'}"/><rect x="${k * 16}" y="166" width="16" height="54" fill="${k % 3 ? '#0a120d' : '#0c1611'}"/>`).join('');

  const walker = (a, b, x, y, s, speed) => `<g transform="translate(${x} ${y})">
      <g>${sprite(a, 0, 0, s)}<animate attributeName="opacity" values="1;0" dur="${speed}s" calcMode="discrete" repeatCount="indefinite"/></g>
      <g opacity="0">${sprite(b, 0, 0, s)}<animate attributeName="opacity" values="0;1" dur="${speed}s" calcMode="discrete" repeatCount="indefinite"/></g></g>`;

  const zombies = [0, 1, 2].map((k) => `<g><animateTransform attributeName="transform" type="translate" values="0 0;${18 + k * 6} 0;0 0" dur="${3 + k * 0.7}s" repeatCount="indefinite"/>
      ${walker(SPRITES.zombieA, SPRITES.zombieB, 330 + k * 110, 94 - (k === 1 ? 0 : 0), 4.4, 0.5 + k * 0.08)}</g>`).join('');

  const msg = 'THANKS FOR VISITING';
  const body = `
  <defs><clipPath id="fc"><rect width="${W}" height="${H}" rx="16"/></clipPath></defs>
  <style>
    .blink{animation:blink 1.1s steps(1) infinite}
    @keyframes blink{50%{opacity:0}}
    .tw{animation:tw 3s ease-in-out infinite}
    @keyframes tw{0%,100%{opacity:.15}50%{opacity:1}}
  </style>
  <g clip-path="url(#fc)">
    <rect width="${W}" height="${H}" fill="#040806"/>
    ${Array.from({ length: 40 }, () => `<rect x="${(r() * W) | 0}" y="${(r() * 100) | 0}" width="2" height="2" fill="#cfe" class="tw" style="animation-delay:${(r() * 3).toFixed(2)}s"/>`).join('')}
    <g>${sprite(['..MMMM..', '.MMMMMM.', 'MMMMMmMM', 'MMmMMMMM', 'MMMMMMMM', 'MMMMmMMM', '.MMMMMM.', '..MMMM..'], 1080, 22, 5, { M: '#e7f7c8', m: '#b9cc98' })}</g>
    <g><animateTransform attributeName="transform" type="translate" values="0 0;-${W} 0" dur="40s" repeatCount="indefinite"/>${skyline.join('')}</g>
    <g><animateTransform attributeName="transform" type="translate" values="0 0;-${W} 0" dur="8s" repeatCount="indefinite"/>${tile}</g>
    ${zombies}
    <g><animateTransform attributeName="transform" type="translate" values="0 0;-6 -3;0 0" dur=".36s" repeatCount="indefinite"/>
      ${walker(SPRITES.liamA, SPRITES.liamB, 760, 94, 4.4, 0.36)}</g>
    ${pixelText(msg, W / 2 - textWidth(msg, 3) / 2 + 180, 28, 3, { fill: C.green })}
    <text x="${W / 2 + 180}" y="76" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${C.muted}">liam.plus · press <tspan fill="${C.green}">★</tspan> to continue</text>
    <text x="${W - 40}" y="206" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.dim}" class="blink">INSERT COIN</text>
    <text x="40" y="206" font-family="${MONO}" font-size="12" fill="${C.dim}">LIAM vs. ZOMBIES — LVL ${tools.length}</text>
  </g>`;
  return svg(W, H, body, 'Liam vs. Zombies — thanks for visiting');
}

// ───────────────────────────── README ─────────────────────────────

function toolsBlock() {
  const cells = tools.map((t, i) =>
    `<a href="${esc(t.url)}"><img src="assets/tools/${slug(t.name)}.svg" width="49%" alt="${esc(t.name)} — ${esc(t.tagline)}"/></a>`);
  const rows = [];
  for (let k = 0; k < cells.length; k += 2) rows.push(`<p align="center">\n  ${cells.slice(k, k + 2).join('\n  ')}\n</p>`);
  return rows.join('\n');
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function replaceBlock(md, name, content) {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  return md.replace(re, `$1\n${content}\n$2`);
}

// ───────────────────────────── main ─────────────────────────────

const data = await loadGitHub();
mkdirSync(ASSETS, { recursive: true });
rmSync(join(ASSETS, 'tools'), { recursive: true, force: true });
mkdirSync(join(ASSETS, 'tools'), { recursive: true });

const out = {
  'hero.svg': hero(data),
  'stats.svg': stats(data),
  'shiplog.svg': shiplog(data),
  'footer.svg': footer(),
  'h-tools.svg': header(1, "PROJECTS I'VE WORKED ON"),
  'h-stats.svg': header(2, 'BY THE NUMBERS', '#a78bfa'),
  'h-log.svg': header(3, 'SHIP LOG', '#38bdf8'),
  'h-stack.svg': header(4, 'LOADOUT', '#fbbf24'),
};
tools.forEach((t, i) => (out[`tools/${slug(t.name)}.svg`] = card(t, i)));
for (const [f, s] of Object.entries(out)) writeFileSync(join(ASSETS, f), s);

const readme = join(ROOT, 'README.md');
if (existsSync(readme)) {
  let md = readFileSync(readme, 'utf8');
  md = replaceBlock(md, 'tools', toolsBlock());
  md = replaceBlock(md, 'stack', `<p align="center"><img src="https://skillicons.dev/icons?i=${config.stack.join(',')}&perline=10&theme=dark" alt="${config.stack.join(', ')}"/></p>`);
  writeFileSync(readme, md);
}
console.log(`built ${Object.keys(out).length} svgs · ${tools.length} tools · ${data.releases} releases · ${data.events.length} log lines`);
