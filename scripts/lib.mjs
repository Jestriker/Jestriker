// Shared building blocks for every section: themes, SVG helpers, GitHub access.
// Sections must take colours from ctx.C (never hard-code UI colours) so the light theme works.

import { execFileSync } from 'node:child_process';
import * as PIXEL from './pixel.mjs';
const { esc } = PIXEL;

export const MONO = `ui-monospace,SFMono-Regular,'JetBrains Mono',Menlo,Consolas,monospace`;

export const THEMES = {
  dark: {
    name: 'dark',
    bg: '#050807', panel: '#0a0f0c', line: '#16241c', green: '#22ff88', dim: '#1a7a4a',
    text: '#d7e4dc', muted: '#6b8577', warn: '#fbbf24', red: '#ff3355', blue: '#38bdf8', purple: '#a78bfa',
    ink: '#ffffff',      // strongest foreground (titles)
    shade: '#000000',    // overlays / shadows
    star: '#cceeee',
  },
  light: {
    name: 'light',
    bg: '#f6f8f7', panel: '#ffffff', line: '#d3ddd7', green: '#0f9d58', dim: '#5a9e7a',
    text: '#1f2a24', muted: '#5f7368', warn: '#b7791f', red: '#d6204b', blue: '#0b7cc0', purple: '#7c5ccf',
    ink: '#0b1510',
    shade: '#ffffff',
    star: '#9fb8ad',
  },
};

export const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">` +
  `<title>${esc(title)}</title>${body}</svg>`;

// CRT look: scanlines, vignette and a slow scan band. Use crtDefs inside <defs>, crtOverlay last.
export const crtDefs = (C, id, w, h) => `
  <pattern id="scan${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="${C.shade}" opacity="${C.name === 'dark' ? 0.35 : 0.12}"/></pattern>
  <radialGradient id="vig${id}" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="${C.shade}" stop-opacity="0"/><stop offset="100%" stop-color="${C.shade}" stop-opacity="${C.name === 'dark' ? 0.75 : 0.4}"/></radialGradient>
  <linearGradient id="band${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.green}" stop-opacity="0"/><stop offset=".5" stop-color="${C.green}" stop-opacity=".06"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></linearGradient>
  <filter id="glow${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="screen${id}"><rect width="${w}" height="${h}" rx="16"/></clipPath>`;

export const crtOverlay = (C, id, w, h) => `
  <rect width="${w}" height="${h}" fill="url(#scan${id})" pointer-events="none"/>
  <rect y="-120" width="${w}" height="120" fill="url(#band${id})"><animate attributeName="y" values="-120;${h}" dur="7s" repeatCount="indefinite"/></rect>
  <rect width="${w}" height="${h}" fill="url(#vig${id})"/>`;

// Typing effect: text revealed one character at a time through a growing clip rect (SMIL, works in <img>).
export function typed(C, id, text, x, y, { size = 16, fill = C.text, begin = 0, cps = 28, weight = 400, cursor = true } = {}) {
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

// GitHub REST/GraphQL. In Actions: PROFILE_TOKEN (optional PAT, sees private activity) or GITHUB_TOKEN.
// Locally: falls back to the gh CLI, which handles its own auth. Never throws — returns null on failure.
export async function gh(path, { graphql } = {}) {
  const token = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN;
  try {
    if (token) {
      const res = await fetch(`https://api.github.com/${graphql ? 'graphql' : path}`, {
        method: graphql ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'profile-builder', Accept: 'application/vnd.github+json' },
        body: graphql ? JSON.stringify({ query: graphql }) : undefined,
      });
      if (!res.ok) throw new Error(`${res.status} ${path ?? 'graphql'}`);
      return await res.json();
    }
    const args = graphql ? ['api', 'graphql', '-f', `query=${graphql}`] : ['api', path];
    return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }));
  } catch (e) {
    console.warn(`  ! github ${path ?? 'graphql'}: ${String(e.message).split('\n')[0]}`);
    return null;
  }
}

// Plain JSON fetch for public, keyless APIs (weather etc.). Never throws.
export async function getJSON(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'profile-builder' } });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch (e) {
    console.warn(`  ! fetch ${url}: ${e.message}`);
    return null;
  }
}

export const ago = (iso, now = new Date()) => {
  const d = Math.max(0, Math.floor((now - new Date(iso)) / 864e5));
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

// Hour/minute/weekday in Israel regardless of where the build runs.
export function israelTime(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { hour: +parts.hour % 24, minute: +parts.minute, weekday: parts.weekday, hhmm: `${parts.hour}:${parts.minute}` };
}

// Section header: "NN // TITLE" in the pixel font, blinking block cursor, marching dashes.
// `no` comes from ctx.no(sectionId) so numbering follows config.layout.
export function header(C, no, title, accent = C.green) {
  const { pixelText, textWidth } = PIXEL;
  const W = 1200, H = 64;
  const label = `${no} // ${title}`;
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
  return svg(W, H, body, `${no} // ${title}`);
}
