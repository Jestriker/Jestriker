// Shared helpers for the small sections (about, now, security, contact, snake).
// Not a section itself (leading underscore → skipped by loadSections).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONT, esc } from '../pixel.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// Extra glyphs the shared 5x7 font doesn't have.
const EXTRA = {
  '@': ['01110', '10001', '10111', '10101', '10111', '10000', '01110'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  '·': ['00000', '00000', '00000', '01100', '01100', '00000', '00000'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
};
export const glyphX = (ch) => EXTRA[ch] ?? FONT[ch.toUpperCase()] ?? FONT['?'];

// Pixel text that understands the extra glyphs. perPixel(x, y, i, col, ci) → extra attributes.
export function px(text, x0, y0, s, { fill = '#fff', gap = 1, perPixel, cls = '' } = {}) {
  const out = [];
  let i = 0;
  [...text].forEach((ch, ci) => {
    const gx = x0 + ci * (5 + gap) * s;
    glyphX(ch).forEach((row, ry) => [...row].forEach((bit, rx) => {
      if (bit !== '1') return;
      const x = gx + rx * s, y = y0 + ry * s;
      out.push(`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${fill}"${cls ? ` class="${cls}"` : ''}${perPixel ? perPixel(x, y, i, ci * 5 + rx, ci) : ''}/>`);
      i++;
    }));
  });
  return out.join('');
}
export const pxW = (text, s, gap = 1) => [...text].length * (5 + gap) * s - gap * s;

// Greedy word wrap by character count (monospace).
export function wrap(text, max) {
  const lines = [];
  let cur = '';
  for (const w of String(text).split(/\s+/)) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Plain mono <text>.
export const txt = (MONO, x, y, s, { size = 14, fill, weight = 400, anchor = 'start', opacity, cls, style } = {}) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="${weight}" fill="${fill}"` +
  `${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${opacity != null ? ` opacity="${opacity}"` : ''}` +
  `${cls ? ` class="${cls}"` : ''}${style ? ` style="${style}"` : ''} xml:space="preserve">${esc(s)}</text>`;

// Terminal window chrome: panel, border, title bar with three pixel "buttons" and a centred title.
export function windowChrome(C, MONO, w, h, title, { accent = C.green, bar = 34 } = {}) {
  return `
  <rect width="${w}" height="${h}" fill="${C.bg}"/>
  <rect width="${w}" height="${bar}" fill="${C.panel}"/>
  <line x1="0" y1="${bar}" x2="${w}" y2="${bar}" stroke="${C.line}"/>
  <rect x="18" y="${bar / 2 - 5}" width="10" height="10" fill="${C.red}" opacity=".85"/>
  <rect x="36" y="${bar / 2 - 5}" width="10" height="10" fill="${C.warn}" opacity=".85"/>
  <rect x="54" y="${bar / 2 - 5}" width="10" height="10" fill="${accent}" opacity=".85"/>
  ${txt(MONO, w / 2, bar / 2 + 4, title, { size: 12, fill: C.muted, anchor: 'middle' })}`;
}

// Outer border drawn last so it sits over the CRT overlay.
export const border = (C, w, h, accent = C.line, op = 1) =>
  `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="15" fill="none" stroke="${accent}" stroke-opacity="${op}" stroke-width="2"/>`;

// Sprite from a tools.json { palette, rows } object.
export function toolSprite(sp, x0, y0, s, cls = '', delay = null) {
  if (!sp?.rows) return '';
  const out = [];
  sp.rows.forEach((row, y) => [...row].forEach((c, x) => {
    const f = sp.palette?.[c];
    if (c === '.' || !f) return;
    const st = delay ? ` style="animation-delay:${delay(x, y).toFixed(3)}s"` : '';
    out.push(`<rect x="${x0 + x * s}" y="${y0 + y * s}" width="${s}" height="${s}" fill="${f}"${cls ? ` class="${cls}"` : ''}${st}/>`);
  }));
  return out.join('');
}

// Liam's lightning block (scripts/avatar.json), rasterised at `s` px per cell.
let AV = null;
export function avatarBlock(x0, y0, s) {
  AV ??= JSON.parse(readFileSync(join(HERE, '..', 'avatar.json'), 'utf8'));
  const out = [];
  AV.pixels.forEach((row, y) => row.forEach((p, x) => {
    out.push(`<rect x="${x0 + x * s}" y="${y0 + y * s}" width="${s}" height="${s}" fill="${AV.palette[p]}"/>`);
  }));
  return out.join('');
}
// Cells of the avatar that are the bolt (kind 'B'), for glow overlays.
export function avatarBolt(x0, y0, s) {
  AV ??= JSON.parse(readFileSync(join(HERE, '..', 'avatar.json'), 'utf8'));
  const out = [];
  AV.kinds.forEach((row, y) => [...row].forEach((k, x) => {
    if (k === 'B') out.push(`<rect x="${x0 + x * s}" y="${y0 + y * s}" width="${s}" height="${s}"/>`);
  }));
  return out.join('');
}

export const findTool = (tools, name) => tools.find((t) => t.name.toLowerCase() === name.toLowerCase());
