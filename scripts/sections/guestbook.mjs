// Guestbook: visitors sign by opening an issue from .github/ISSUE_TEMPLATE/guestbook.yml (label "guestbook").
// Open issues are shown on an arcade HIGH SCORES board; closing an issue removes it (that's the moderation).
// Local test data: FORCE_GUESTBOOK=sample node scripts/dev/preview.mjs guestbook --fresh

export const id = 'guestbook';
export const signUrl = 'https://github.com/Jestriker/Jestriker/issues/new?template=guestbook.yml';

const REPO = 'Jestriker/Jestriker';
const MAX_ENTRIES = 6;
const MAX_MSG = 60; // visual width units (wide glyphs count double)
const TITLE_PREFIX = /^\s*(✍️|✍)?\s*guestbook\s*:\s*/i;

// ───────────────────────────── sanitizing ─────────────────────────────

// Small built-in list; matched as whole words (plus common suffixes), with basic leetspeak.
const BAD = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'asshole', 'bastard', 'slut', 'whore',
  'fag', 'faggot', 'nigger', 'nigga', 'retard', 'porn', 'wank', 'twat', 'bollocks', 'motherfucker', 'kys'];
const LEET = { a: '[a@4]', e: '[e3]', i: '[i1!]', o: '[o0]', s: '[s$5]', t: '[t7]', g: '[g9]' };
const BAD_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(${BAD.map((w) => [...w].map((c) => LEET[c] ?? c).join('+')).map((p) => `${p}+`).join('|')})` +
  `(s|es|er|ers|ed|ing|in|y|ty|head|face)?(?![\\p{L}\\p{N}])`, 'giu');
const mask = (s) => s.replace(BAD_RE, (m) => m[0] + '*'.repeat(Math.max(2, [...m].length - 1)));

const TLD = 'com|net|org|io|dev|app|xyz|me|co|ly|gg|tv|ru|cn|info|biz|site|online|link|to|sh|ai|plus|il|uk|de|fr|us|gl|gd|ws|cc|live|shop|top|club';
const wide = (ch) => /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|\p{Extended_Pictographic}/u.test(ch);

export function sanitize(raw) {
  let s = String(raw ?? '');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ')                       // html comments
    .replace(/<(script|style)\b[\s\S]*?(<\/\1\s*>|$)/gi, ' ') // script/style blocks
    .replace(/<[^>]*>/g, ' ')                                  // html tags
    .replace(/&[#a-z0-9]+;/gi, ' ')                            // html entities
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')                     // md images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')                   // md links → text
    .replace(/\b(?:https?|ftp|file|mailto|data|javascript):\S*/gi, ' ')
    .replace(/\bwww\.\S*/gi, ' ')
    .replace(new RegExp(`\\b[\\w-]+(?:\\.[\\w-]+)*\\.(?:${TLD})\\b(?:[/?#]\\S*)?`, 'gi'), ' ')
    .replace(/(^|[^\w])[@#][\w-]+(\/[\w.-]+)?/g, '$1 ')         // @mentions, #refs, org/team
    .replace(/:[a-z0-9_+-]+:/gi, ' ')                          // :shortcodes:
    .replace(/[`*~]+|(^|\s)_+|_+(?=\s|$)/g, '$1')              // emphasis markers
    .replace(/[#>|[\]{}\\^=]+/g, ' ')                          // other markdown punctuation
    .replace(/(?!‍)[\p{C}\p{Zl}\p{Zp}]/gu, ' ')          // control/format/bidi chars (keep ZWJ)
    .replace(/\s+/g, ' ')
    .trim();
  s = mask(s);
  // truncate by visual width
  let w = 0, out = '';
  for (const ch of s) {
    const cw = wide(ch) ? 2 : 1;
    if (w + cw > MAX_MSG - 1) { out = out.trimEnd() + '…'; w = -1; break; }
    out += ch; w += cw;
  }
  return out.replace(/^[\s.,;:!?-]+/, '').trim();
}

// Issue-form body: "### Label\n\nvalue\n\n### Other…". Take the first section that isn't the checkbox.
function messageFrom(issue) {
  const body = String(issue.body ?? '').replace(/\r/g, '');
  let msg = '';
  if (/^###\s/m.test(body)) {
    const parts = body.split(/^###\s+.*$/m).map((p) => p.trim()).filter(Boolean);
    msg = parts.find((p) => !/^- \[[ xX]\]/.test(p) && p !== '_No response_') ?? '';
  } else msg = body;
  if (!sanitize(msg)) msg = String(issue.title ?? '').replace(TITLE_PREFIX, '');
  return sanitize(msg);
}

const cleanLogin = (s) => String(s ?? '').replace(/\[bot\]$/i, '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 39);

const SAMPLE = [
  ['octocat', 'Love the zombie arcade vibes! Keep shipping cool stuff', 0],
  ['torvalds', 'Nice CRT effect. Very retro, much wow', 1],
  ['some-very-long-github-handle', 'Check out my site https://spam.example.com @everyone fuck yeah!!', 3],
  ['dev-from-tlv', 'שלום! אחלה פרופיל 🔥🔥', 6],
  ['pixelpusher', '**Bold** <b>html</b> [link](http://x.io) `code` — all stripped. This one is long enough to truncate for sure', 12],
  ['night-owl', 'Liam vs. Zombies when?? 🧟', 40],
  ['seventh', 'should not appear (max 6)', 50],
];

export async function data(env) {
  if (process.env.FORCE_GUESTBOOK === 'sample') {
    const now = env.now ?? new Date();
    return { entries: SAMPLE.slice(0, MAX_ENTRIES).map(([login, m, d]) => ({
      login, message: sanitize(m), date: new Date(now - d * 864e5).toISOString() })) };
  }
  if (process.env.FORCE_GUESTBOOK === 'empty') return { entries: [] };

  const res = await env.gh(`repos/${REPO}/issues?labels=guestbook&state=open&per_page=20&sort=created&direction=desc`);
  if (!Array.isArray(res)) {
    // API failure: keep the last known board instead of silently hiding the section.
    return env.cache?.get('guestbook') ?? { entries: [] };
  }
  const seen = new Set();
  const entries = res
    .filter((i) => !i.pull_request && i.user)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((i) => ({ login: cleanLogin(i.user.login), message: messageFrom(i), date: i.created_at }))
    .filter((e) => e.login && e.message && !seen.has(e.login) && seen.add(e.login)) // newest entry per person
    .slice(0, MAX_ENTRIES);
  const out = { entries };
  env.cache?.set('guestbook', out);
  return out;
}

// ───────────────────────────── render ─────────────────────────────

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const RANKS = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];
// Compact pixel text: horizontal runs merged into one rect, one fill per group (keeps the file small).
function px(lib, text, x0, y0, s, fill, gap = 1) {
  const out = [];
  [...text].forEach((ch, ci) => {
    const gx = x0 + ci * (5 + gap) * s;
    lib.glyph(ch).forEach((row, ry) => {
      for (const m of row.matchAll(/1+/g))
        out.push(`<rect x="${+(gx + m.index * s).toFixed(1)}" y="${y0 + ry * s}" width="${m[0].length * s}" height="${s}"/>`);
    });
  });
  return `<g fill="${fill}">${out.join('')}</g>`;
}
const RTL = /^[^\p{L}]*[֐-ࣿיִ-﷿ﹰ-﻿]/u;

const fmtDate = (iso, now) => {
  const d = new Date(iso);
  return d.getUTCFullYear() === now.getUTCFullYear()
    ? `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`
    : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export function render(ctx) {
  const { C, lib, MONO } = ctx;
  const { textWidth, esc, svg, crtDefs, crtOverlay } = lib;
  const pixelText = (t, x, y, sc, { fill }) => px(lib, t, x, y, sc, fill);
  const now = ctx.now ?? new Date();
  const entries = ctx.data?.guestbook?.entries ?? [];
  const accent = C.red;
  const rowColors = [C.warn, C.green, C.blue, C.purple, C.red, C.text];

  const W = 1200, ROW = 50, TOP = 124, n = Math.max(entries.length, 1);
  const H = TOP + n * ROW + 96;
  const X = { rank: 56, name: 150, msg: 430, date: W - 56 };

  const title = 'HIGH SCORES';
  const tw = textWidth(title, 5);
  const titleSvg = pixelText(title, (W - tw) / 2, 30, 5, { fill: accent });

  const colHead = [['RANK', X.rank, 'start'], ['PLAYER', X.name, 'start'], ['MESSAGE', X.msg, 'start'], ['DATE', X.date, 'end']]
    .map(([t, x, a]) => `<text x="${x}" y="${TOP - 18}" font-family="${MONO}" font-size="12" letter-spacing="3" text-anchor="${a}" fill="${C.muted}">${t}</text>`).join('');

  const rows = entries.map((e, i) => {
    const y = TOP + i * ROW;
    const col = rowColors[i % rowColors.length];
    const begin = 0.5 + i * 0.45;
    const handle = e.login.length > 13 ? e.login.slice(0, 12) + '.' : e.login;
    const date = fmtDate(e.date, now);
    const chars = [...e.message].length;
    const steps = Math.max(1, Math.min(chars, 40));
    const vals = Array.from({ length: steps + 1 }, (_, k) => ((k / steps) * 640).toFixed(0)).join(';');
    return `<g class="gbr" style="animation-delay:${begin.toFixed(2)}s">
      ${i % 2 ? '' : `<rect x="32" y="${y}" width="${W - 64}" height="${ROW - 8}" fill="${C.panel}" opacity=".7"/>`}
      ${pixelText(RANKS[i], X.rank, y + 11, 3, { fill: col })}
      ${pixelText(handle, X.name, y + 11, 3, { fill: col })}
      <clipPath id="gbm${i}"><rect x="${X.msg - 4}" y="${y}" width="0" height="${ROW - 8}">
        <animate attributeName="width" values="${vals}" dur="${(steps / 30).toFixed(2)}s" begin="${(begin + 0.15).toFixed(2)}s" calcMode="discrete" fill="freeze"/></rect></clipPath>
      <text x="${X.msg}" y="${y + 27}" font-family="${MONO}" font-size="17" fill="${C.text}"${RTL.test(e.message) ? ' direction="rtl" text-anchor="end"' : ''} clip-path="url(#gbm${i})" xml:space="preserve">${esc(e.message)}</text>
      ${pixelText(date, X.date - textWidth(date, 2), y + 14, 2, { fill: C.muted })}
    </g>`;
  }).join('');

  const empty = entries.length ? '' : (() => {
    const t = 'NO SCORES YET';
    return pixelText(t, (W - textWidth(t, 3)) / 2, TOP + 10, 3, { fill: C.muted });
  })();

  const cta = 'SIGN THE GUESTBOOK';
  const cw = textWidth(cta, 3);
  const cy = TOP + n * ROW + 30;
  const cx = (W - cw) / 2;
  // ">" on the left, a mirrored ">" on the right; both nudge toward the text.
  const arrow = (tx, flip) => `<g transform="translate(${tx} 0)${flip ? ' scale(-1 1)' : ''}"><g class="gba">${pixelText('>', 0, cy, 3, { fill: accent })}</g></g>`;
  const footer = `<g class="gbblink">${pixelText(cta, cx, cy, 3, { fill: C.warn })}</g>
    ${arrow(cx - 56, false)}
    ${arrow(cx + cw + 56, true)}
    <text x="${W / 2}" y="${cy + 46}" text-anchor="middle" font-family="${MONO}" font-size="11" letter-spacing="2" fill="${C.muted}">OPEN AN ISSUE ON JESTRIKER/JESTRIKER · ${entries.length} / ${MAX_ENTRIES} SLOTS FILLED</text>`;

  const body = `
  <defs>${crtDefs(C, 'gb', W, H)}</defs>
  <style>
    .gbr{animation:gbin .01s steps(1) both}
    @keyframes gbin{from{opacity:0}to{opacity:1}}
    .gbblink{animation:gbb 1.1s steps(1) infinite}
    @keyframes gbb{60%{opacity:0}}
    .gba{animation:gbn .8s steps(2) infinite}
    @keyframes gbn{0%{transform:translateX(0)}100%{transform:translateX(12px)}}
  </style>
  <g clip-path="url(#screengb)">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    ${titleSvg}
    <line x1="56" y1="${TOP - 40}" x2="${W - 56}" y2="${TOP - 40}" stroke="${accent}" stroke-opacity=".5" stroke-width="3" stroke-dasharray="3 6"/>
    ${colHead}
    ${rows}${empty}
    ${footer}
    ${crtOverlay(C, 'gb', W, H)}
  </g>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" fill="none" stroke="${C.line}"/>`;

  const label = entries.length
    ? `Guestbook high scores: ${entries.map((e, i) => `${i + 1}. ${e.login}: ${e.message}`).join(' · ')}`
    : 'Guestbook: no entries yet';
  return {
    'h-guestbook.svg': lib.header(C, ctx.no('guestbook'), 'GUESTBOOK', accent),
    'guestbook.svg': svg(W, H, body, label),
  };
}

export function readme(ctx) {
  const entries = ctx.data?.guestbook?.entries ?? [];
  if (!entries.length) return '';
  return `<p align="center">${ctx.pic('h-guestbook.svg', 'width="100%" alt="Guestbook"')}</p>
<p align="center">${ctx.pic('guestbook.svg', 'width="100%" alt="Guestbook: latest signatures from visitors"')}</p>
<p align="center"><a href="${signUrl}"><sub>✍️ sign the guestbook</sub></a></p>`;
}
