// LiamOS diorama: a pixel-art desk with a monitor running liam.plus ("LiamOS"), a keyboard whose keys press
// themselves in sync with commands typed into the LiamOS Shell, dock apps glowing in turn, and a few props.
// One shared SMIL clock (T seconds) drives everything, so the whole scene loops seamlessly.

import { readFileSync } from 'node:fs';

export const id = 'liamos';

const W = 1200, H = 480, T = 19;

// ───────────── small helpers ─────────────
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
const f4 = (t) => (Math.min(Math.max(t, 0), T) / T).toFixed(4);

// Discrete track: value `init` at t=0, then each [t, v] event holds until the next. Loops every T.
function steps(attr, events, init, extra = '') {
  const ts = [0], vs = [init];
  for (const [t, v] of [...events].sort((a, b) => a[0] - b[0])) {
    if (t <= 0) { vs[0] = v; continue; }
    if (t >= T) continue;
    if (f4(t) === f4(ts[ts.length - 1])) { vs[vs.length - 1] = v; continue; }
    ts.push(t); vs.push(v);
  }
  return `<animate attributeName="${attr}" values="${vs.join(';')}" keyTimes="${ts.map(f4).join(';')}" dur="${T}s" repeatCount="indefinite" calcMode="discrete"${extra}/>`;
}
// Linear track through [t, v] keys (first at 0, last at T are added if missing).
function lin(attr, keys, { transform = false } = {}) {
  const k = [...keys].sort((a, b) => a[0] - b[0]);
  if (k[0][0] > 0) k.unshift([0, k[0][1]]);
  if (k[k.length - 1][0] < T) k.push([T, k[k.length - 1][1]]);
  const tag = transform ? 'animateTransform' : 'animate';
  const type = transform ? ' type="translate"' : '';
  return `<${tag} attributeName="${attr}"${type} values="${k.map((e) => e[1]).join(';')}" keyTimes="${k.map((e) => f4(e[0])).join(';')}" dur="${T}s" repeatCount="indefinite"/>`;
}
const stepsT = (events, init) =>
  steps('transform', events, init).replace('<animate ', '<animateTransform type="translate" ');

// Pixel art with horizontal run merging (keeps files small). rows: strings; pal: char → colour.
function px(rows, x0, y0, s, pal, { flip = false } = {}) {
  const by = new Map();
  rows.forEach((row0, y) => {
    const row = flip ? [...row0].reverse().join('') : row0;
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let e = x + 1;
      while (e < row.length && row[e] === c) e++;
      if (c !== '.' && pal[c]) {
        const col = pal[c];
        if (!by.has(col)) by.set(col, []);
        by.get(col).push(`M${x0 + x * s} ${y0 + y * s}h${(e - x) * s}v${s}h-${(e - x) * s}z`);
      }
      x = e;
    }
  });
  return [...by].map(([col, d]) => `<path fill="${col}" d="${d.join('')}"/>`).join('');
}

// 5x7 glyphs: the shared font plus a few keycap symbols it doesn't have.
const EXTRA = {
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  '\\': ['10000', '01000', '01000', '00100', '00010', '00010', '00001'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '`': ['01000', '00100', '00010', '00000', '00000', '00000', '00000'],
};
function ptext(lib, text, x0, y0, s, fill) {
  const out = [];
  [...text].forEach((ch, i) => {
    const g = EXTRA[ch] ?? lib.glyph(ch);
    const gx = x0 + i * 6 * s;
    g.forEach((row, ry) => {
      let x = 0;
      while (x < 5) {
        if (row[x] !== '1') { x++; continue; }
        let e = x + 1;
        while (e < 5 && row[e] === '1') e++;
        out.push(`M${gx + x * s} ${y0 + ry * s}h${(e - x) * s}v${s}h-${(e - x) * s}z`);
        x = e;
      }
    });
  });
  return `<path fill="${fill}" d="${out.join('')}"/>`;
}
const pw = (text, s) => [...text].length * 6 * s - s;

// ───────────── the script: what gets typed and when ─────────────
const CPS_GAP = 0.115;
function plan() {
  const r = mulberry(7);
  const cmds = [
    { text: 'open liam.plus', at: 3.0 },
    { text: 'ls apps/', at: 6.1 },
    { text: './zombies --hard', at: 11.7 },
    { text: 'reboot', at: 16.5 },
  ];
  for (const c of cmds) {
    let t = c.at;
    c.times = [...c.text].map((ch, i) => {
      const at = t;
      t += CPS_GAP + (r() - 0.5) * 0.06 + (ch === ' ' ? 0.05 : 0);
      return at;
    });
    c.enter = t + 0.2;
  }
  return cmds;
}
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────── sprites drawn for this scene ─────────────
const LOCK = [
  '...kkkkkk...',
  '..kSSSSSSk..',
  '.kSkkkkkkSk.',
  '.kSk....kSk.',
  '.kSk....kSk.',
  'kkkkkkkkkkkk',
  'kLLLLLLLLLLk',
  'kLHHHHHHHHLk',
  'kLLLLddLLLLk',
  'kLLLLddLLLLk',
  'kLLLLLdLLLLk',
  'kLLLLLLLLLLk',
  'kDDDDDDDDDDk',
  'kkkkkkkkkkkk',
];
const LOCK_PAL = { k: '#15181b', S: '#9aa0a6', L: '#7d848b', H: '#b9bec3', D: '#5a6066', d: '#23272b' };

const POINTER = [
  'k.......',
  'kk......',
  'kwk.....',
  'kwwk....',
  'kwwwk...',
  'kwwwwk..',
  'kwwwwwk.',
  'kwwwwwwk',
  'kwwwkkkk',
  'kwkwk...',
  'kk.kwk..',
  'k...kwk.',
  '.....kk.',
];

const MUG = [
  '.kkkkkkkkk...',
  '.kGGGGGGGk...',
  '.kgggggggkkk.',
  '.kgggggggk.k.',
  '.kgGGgggGk.k.',
  '.kgGgGgGgk.k.',
  '.kgGggGggkkk.',
  '.kgggggggk...',
  '.kgggggggk...',
  '..kkkkkkk....',
];

const PLANT = [
  '....ll..l...',
  '.l..lL.lL...',
  '.lL.lLlL..l.',
  '..lLlLL..lL.',
  '...lLlL.lL..',
  '.l..lLlLL...',
  '.lLLlLL.....',
  '..kkkkkkkk..',
  '..kppppppk..',
  '..kPPPPPPk..',
  '...kppppk...',
  '...kppppk...',
  '....kkkk....',
];

// ───────────── render ─────────────
export function render(ctx) {
  const { C, lib } = ctx;
  const dark = C.name === 'dark';
  const S = lib.THEMES.dark; // the on-screen OS is always dark, like the real site
  const MONO = ctx.MONO;
  const P = 'lo'; // id prefix

  // Scene palette, derived from theme tokens.
  const wall = C.bg;
  const deskTop = dark ? mix(C.bg, C.dim, 0.16) : mix(C.bg, C.dim, 0.14);
  const deskHi = dark ? mix(C.bg, C.dim, 0.28) : mix(C.bg, C.panel, 0.9);
  const deskFront = dark ? mix(C.bg, C.dim, 0.08) : mix(C.bg, C.dim, 0.3);
  const bezel = dark ? mix(C.panel, C.text, 0.1) : mix(C.panel, C.text, 0.12);
  const bezelHi = dark ? mix(C.panel, C.text, 0.18) : mix(C.panel, C.text, 0.04);
  const bezelLo = dark ? mix(C.panel, C.text, 0.05) : mix(C.panel, C.text, 0.24);
  const outline = dark ? '#000000' : mix(C.text, C.bg, 0.25);
  const caseTop = dark ? mix(C.panel, C.text, 0.08) : mix(C.panel, C.text, 0.1);
  const caseFront = dark ? mix(C.panel, C.text, 0.03) : mix(C.panel, C.text, 0.22);
  const keyTop = dark ? mix(C.panel, C.text, 0.15) : C.panel;
  const keyFront = dark ? mix(C.panel, C.text, 0.05) : mix(C.panel, C.text, 0.2);
  const keyLabel = dark ? C.muted : C.muted;
  const lit = dark ? C.green : C.green;

  const cmds = plan();
  const all = [];

  // ── background: wall grid, stars through a window, neon sign ──
  const rr = lib.rng('liamos-wall');
  const winX = 70, winY = 44, winW = 170, winH = 128;
  const stars = Array.from({ length: 16 }, () => {
    const x = winX + 8 + ((rr() * (winW - 16)) | 0), y = winY + 8 + ((rr() * (winH - 40)) | 0);
    const d = (rr() * 3).toFixed(2);
    return `<rect x="${x}" y="${y}" width="2" height="2" fill="${S.star}" class="${P}tw" style="animation-delay:${d}s"/>`;
  }).join('');
  const moon = px([
    '..mmmm..', '.mmmmMm.', 'mmmMmmmm', 'mmmmmmMm', 'mMmmmmmm', 'mmmmMmmm', '.mmmmmm.', '..mmmm..',
  ], winX + winW - 52, winY + 16, 3, { m: '#e8f5d0', M: '#b9cfa2' });
  const skyline = (() => {
    const r2 = lib.rng('liamos-city');
    let x = winX + 4, out = '';
    while (x < winX + winW - 4) {
      const w = 10 + ((r2() * 16) | 0), h = 14 + ((r2() * 30) | 0);
      const ww = Math.min(w, winX + winW - 4 - x);
      out += `<rect x="${x}" y="${winY + winH - 4 - h}" width="${ww}" height="${h}" fill="#0a1a12"/>`;
      for (let yy = winY + winH - h; yy < winY + winH - 8; yy += 6)
        for (let xx = x + 3; xx < x + ww - 3; xx += 5) if (r2() > 0.72) out += `<rect x="${xx}" y="${yy}" width="2" height="2" fill="#22ff88" opacity=".55"/>`;
      x += ww + 2;
    }
    return out;
  })();
  const windowArt = `
    <rect x="${winX - 8}" y="${winY - 8}" width="${winW + 16}" height="${winH + 16}" fill="${bezelLo}"/>
    <rect x="${winX - 4}" y="${winY - 4}" width="${winW + 8}" height="${winH + 8}" fill="${bezel}"/>
    <rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" fill="#04100b"/>
    <rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" fill="url(#${P}sky)"/>
    ${stars}${moon}${skyline}
    <rect x="${winX + winW / 2 - 2}" y="${winY}" width="4" height="${winH}" fill="${bezel}"/>
    <rect x="${winX}" y="${winY + winH / 2 - 2}" width="${winW}" height="4" fill="${bezel}"/>
    <rect x="${winX - 12}" y="${winY + winH + 8}" width="${winW + 24}" height="6" fill="${bezelLo}"/>`;

  const neonText = 'LIAM+';
  const neonS = 6, neonX = 1180 - pw(neonText, neonS) - 22, neonY = 58;
  const neon = `
    <rect x="${neonX - 18}" y="${neonY - 16}" width="${pw(neonText, neonS) + 36}" height="${7 * neonS + 32}" fill="none" stroke="${C.green}" stroke-opacity=".25" stroke-width="2" stroke-dasharray="6 6"/>
    <g class="${P}neon">
      <g filter="url(#${P}glowBig)" opacity="${dark ? 0.9 : 0.5}">${ptext(lib, neonText, neonX, neonY, neonS, C.green)}</g>
      ${ptext(lib, neonText, neonX, neonY, neonS, C.green)}
    </g>
    <text x="${neonX + pw(neonText, neonS) / 2}" y="${neonY + 7 * neonS + 30}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${C.muted}">open 24/7 · liam.plus</text>`;

  // ── desk ──
  const deskY = 296;
  const planks = Array.from({ length: 6 }, (_, i) => {
    const y = deskY + 26 + i * 26;
    return `<rect x="0" y="${y}" width="${W}" height="2" fill="${deskFront}" opacity=".45"/>`;
  }).join('');
  const desk = `
    <rect x="0" y="${deskY}" width="${W}" height="${H - deskY}" fill="${deskTop}"/>
    <rect x="0" y="${deskY}" width="${W}" height="4" fill="${deskHi}"/>
    ${planks}
    <rect x="0" y="${H - 10}" width="${W}" height="10" fill="${deskFront}"/>
    <ellipse cx="600" cy="${deskY + 70}" rx="430" ry="90" fill="url(#${P}spill)"/>`;

  // ── monitor ──
  const MX = 280, MY = 12, MW = 640, MH = 276; // bezel box
  const SX = MX + 16, SY = MY + 16, SW = MW - 32, SH = MH - 40; // screen
  const monitorBack = `
    <rect x="${MX + 60}" y="${MY + 6}" width="${MW - 120}" height="${MH - 6}" fill="${bezelLo}"/>`;
  const stand = `
    <rect x="${600 - 34}" y="${MY + MH - 4}" width="68" height="22" fill="${bezelLo}"/>
    <rect x="${600 - 34}" y="${MY + MH - 4}" width="6" height="22" fill="${bezel}"/>
    <rect x="${600 - 110}" y="${MY + MH + 16}" width="220" height="10" fill="${bezel}"/>
    <rect x="${600 - 110}" y="${MY + MH + 16}" width="220" height="3" fill="${bezelHi}"/>
    <rect x="${600 - 116}" y="${MY + MH + 26}" width="232" height="4" fill="${outline}" opacity=".35"/>`;
  const frame = `
    <rect x="${MX - 4}" y="${MY - 4}" width="${MW + 8}" height="${MH + 8}" fill="${outline}"/>
    <rect x="${MX}" y="${MY}" width="${MW}" height="${MH}" fill="${bezel}"/>
    <rect x="${MX}" y="${MY}" width="${MW}" height="4" fill="${bezelHi}"/>
    <rect x="${MX}" y="${MY}" width="4" height="${MH}" fill="${bezelHi}"/>
    <rect x="${MX}" y="${MY + MH - 6}" width="${MW}" height="6" fill="${bezelLo}"/>
    <rect x="${SX - 4}" y="${SY - 4}" width="${SW + 8}" height="${SH + 8}" fill="${outline}"/>
    ${ptext(lib, 'LIAMOS', 600 - pw('LIAMOS', 1) / 2, MY + MH - 18, 1, bezelHi)}
    <rect x="${MX + MW - 40}" y="${MY + MH - 17}" width="8" height="4" fill="${C.green}" class="${P}led"/>`;

  // ── screen contents ──
  const scr = [];
  scr.push(`<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="#060a08"/>`);
  scr.push(`<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="url(#${P}wall)"/>`);
  scr.push(`<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="url(#${P}grid)"/>`);
  // menubar
  scr.push(`<rect x="${SX}" y="${SY}" width="${SW}" height="16" fill="#0b120e"/><rect x="${SX}" y="${SY + 16}" width="${SW}" height="1" fill="${S.line}"/>`);
  scr.push(ptext(lib, 'LIAM+', SX + 8, SY + 5, 1, S.green));
  scr.push(`<text x="${SX + 46}" y="${SY + 12}" font-family="${MONO}" font-size="10" fill="${S.muted}">LiamOS</text>`);
  scr.push(`<text x="${SX + SW - 8}" y="${SY + 12}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${S.dim}">liam.plus  ●</text>`);

  const chrome = (x, y, w, h, title) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0a0f0c" stroke="${S.line}"/>
    <rect x="${x}" y="${y}" width="${w}" height="18" fill="#0f1712"/>
    <rect x="${x}" y="${y + 18}" width="${w}" height="1" fill="${S.line}"/>
    <rect x="${x + 7}" y="${y + 6}" width="6" height="6" fill="#ff5f57"/><rect x="${x + 17}" y="${y + 6}" width="6" height="6" fill="#febc2e"/><rect x="${x + 27}" y="${y + 6}" width="6" height="6" fill="#28c840"/>
    <text x="${x + w / 2}" y="${y + 13}" text-anchor="middle" font-family="${MONO}" font-size="10" fill="${S.muted}">${title}</text>`;

  // Apps window (dock)
  const AX = SX + 10, AY = SY + 22, TILE = 50, GAP = 6;
  const AW = TILE * 3 + GAP * 2 + 24, AH = SH - 28;
  scr.push(chrome(AX, AY, AW, AH, 'LiamOS Apps'));
  const byName = (n) => (ctx.config.tools ?? []).find((t) => t.name === n);
  const DOCK = [
    { tool: 'JustPlugin', label: 'JustPlugin', glow: '#ff6b00' },
    { locked: true },
    { tool: 'Liam vs. Zombies', label: 'Liam vs. Zombies', glow: '#84cc16' },
    { tool: 'Paint', label: 'Paint', glow: '#e8b06a' },
    { tool: "Liam's Tools", label: 'Tools', glow: '#38bdf8' },
    { locked: true },
    { locked: true },
    { tool: 'TeGriAi', label: 'TeGriAi', glow: '#2f34ff' },
    { tool: 'Lumelyy', label: 'Lumelyy', glow: '#c7a878' },
  ];
  const gx0 = AX + 12, gy0 = AY + 26;
  const tileXY = (i) => [gx0 + (i % 3) * (TILE + GAP), gy0 + Math.floor(i / 3) * (TILE + GAP)];

  // Timeline for dock: pop in after boot, hover sweep during `ls`, zombies spotlight.
  const bootEnd = 2.0;
  const ls = cmds[1], zc = cmds[2];
  const sweep0 = ls.enter + 0.3, sweepStep = 0.46;
  const zStart = zc.enter + 0.15, zEnd = cmds[3].at - 0.2;
  const hoverAt = (i) => [sweep0 + i * sweepStep, sweep0 + (i + 1) * sweepStep];

  DOCK.forEach((d, i) => {
    const [x, y] = tileXY(i);
    const glow = d.locked ? '#9aa0a6' : d.glow;
    const tool = d.tool && byName(d.tool);
    let icon;
    if (d.locked) icon = px(LOCK, x + (TILE - 36) / 2, y + (TILE - 42) / 2, 3, LOCK_PAL);
    else if (tool?.sprite) icon = px(tool.sprite.rows, x + 1, y + 1, 3, tool.sprite.palette);
    else icon = px(lib.identicon(d.tool).map((r) => r.replace(/1/g, 'a').replace(/2/g, 'b')), x + 1, y + 1, 6, { a: glow, b: mix(glow, '#ffffff', 0.4) });

    const [h0, h1] = hoverAt(i);
    const popAt = bootEnd + 0.12 + i * 0.09;
    const isZ = d.tool === 'Liam vs. Zombies';
    // glow opacity track
    const gEv = [[h0, 0.95], [h1, 0.2]];
    const welcome = cmds[0].enter + 0.55;
    gEv.push([welcome + i * 0.04, 0.8], [welcome + 0.25 + i * 0.04, 0.2]);
    if (isZ) for (let t = zStart, k = 0; t < zEnd; t += 0.35, k++) gEv.push([t, k % 2 ? 0.55 : 1]);
    if (isZ) gEv.push([zEnd, 0.2]);
    gEv.push([cmds[3].enter + 0.2, 0]);
    // lift track (hover): translate up 3px
    const lift = [[h0, '0 -3'], [h1, '0 0']];
    if (isZ) lift.push([zStart, '0 -3'], [zEnd, '0 0']);
    // locked tiles give a little "nope" shake when hovered
    const shake = d.locked
      ? stepsT([[h0 + 0.05, '-2 0'], [h0 + 0.11, '2 0'], [h0 + 0.17, '-2 0'], [h0 + 0.23, '1 0'], [h0 + 0.29, '0 0']], '0 0')
      : '';
    scr.push(`<g opacity="0">${steps('opacity', [[popAt, 1], [cmds[3].enter + 0.25, 1]], 0)}
      <g>${stepsT(lift, '0 0')}
        <rect x="${x - 3}" y="${y - 3}" width="${TILE + 6}" height="${TILE + 6}" fill="${glow}" filter="url(#${P}glow)" opacity="0">${steps('opacity', gEv, 0)}</rect>
        <rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" fill="#101512" stroke="${mix(glow, '#0a0f0c', 0.55)}"/>
        <g>${shake}${icon}</g>
        <rect x="${x + 0.5}" y="${y + 0.5}" width="${TILE - 1}" height="${TILE - 1}" fill="none" stroke="${glow}" stroke-width="2" opacity="0">${steps('opacity', gEv.map(([t, v]) => [t, v > 0.5 ? 1 : 0]), 0)}</rect>
      </g></g>`);
  });
  // footer: name of the hovered app
  const fy = AY + AH - 7;
  const footer = [];
  const fDefault = `9 apps · 3 locked`;
  const fEv = [[sweep0, 0], [sweep0 + 9 * sweepStep, 1], [zStart, 0], [zEnd, 1]];
  footer.push(`<text x="${AX + AW / 2}" y="${fy}" text-anchor="middle" font-family="${MONO}" font-size="10" fill="${S.muted}" opacity="1">${steps('opacity', fEv, 1)}${fDefault}</text>`);
  DOCK.forEach((d, i) => {
    const [h0, h1] = hoverAt(i);
    const label = d.locked ? '🔒 locked' : `▸ ${d.label}`;
    const ev = [[h0, 1], [h1, 0]];
    if (d.tool === 'Liam vs. Zombies') ev.push([zStart, 1], [zEnd, 0]);
    footer.push(`<text x="${AX + AW / 2}" y="${fy}" text-anchor="middle" font-family="${MONO}" font-size="10" font-weight="700" fill="${d.locked ? '#9aa0a6' : mix(d.glow, '#ffffff', 0.25)}" opacity="0">${steps('opacity', ev, 0)}${label.replace('🔒 ', '')}</text>`);
  });
  scr.push(footer.join(''));

  // Shell window
  const KX = AX + AW + 10, KY = AY, KW = SX + SW - 10 - KX, KH = AH;
  scr.push(chrome(KX, KY, KW, KH, 'LiamOS Shell'));
  const FS = 12, CW = FS * 0.6, LH = 17.5;
  const tx0 = KX + 12, ty0 = KY + 35;
  const lineY = (n) => ty0 + n * LH;
  const shell = [];
  let lineNo = 0;
  const cursorX = [], cursorY = [];
  const ok = (s) => `<tspan fill="${S.green}">${s}</tspan>`;
  // prompt line with typed command
  const promptLine = (c, n, appear) => {
    const y = lineY(n);
    const full = `$ ${c.text}`;
    const widths = [[appear, 2 * CW], ...c.times.map((t, i) => [t, (i + 3) * CW])];
    shell.push(`<clipPath id="${P}c${n}"><rect x="${tx0 - 1}" y="${y - FS}" width="0" height="${FS + 6}">${steps('width', [...widths, [cmds[3].enter + 0.3, 0]], 0)}</rect></clipPath>
      <text x="${tx0}" y="${y}" font-family="${MONO}" font-size="${FS}" fill="${S.text}" clip-path="url(#${P}c${n})" xml:space="preserve" textLength="${(full.length * CW).toFixed(1)}" lengthAdjust="spacing"><tspan fill="${S.green}" font-weight="700">$</tspan> ${lib.esc(c.text)}</text>`);
    cursorY.push([appear, y - FS + 2]);
    cursorX.push([appear, tx0 + 2 * CW]);
    c.times.forEach((t, i) => cursorX.push([t, tx0 + (i + 3) * CW]));
  };
  const outLine = (html, n, at, fill = S.muted) => {
    shell.push(`<text x="${tx0}" y="${lineY(n)}" font-family="${MONO}" font-size="${FS}" fill="${fill}" xml:space="preserve" opacity="0">${steps('opacity', [[at, 1], [cmds[3].enter + 0.3, 0]], 0)}${html}</text>`);
  };
  const moveCursorBelow = (n, t) => { cursorY.push([t, lineY(n) - FS + 2]); cursorX.push([t, tx0]); };

  // cmd 1: open liam.plus
  const c0 = cmds[0];
  promptLine(c0, lineNo++, bootEnd + 0.4);
  moveCursorBelow(lineNo, c0.enter);
  outLine(`opening <tspan fill="${S.blue}">https://liam.plus</tspan> …`, lineNo++, c0.enter + 0.12);
  outLine(`[${ok(' ok ')}] welcome to <tspan fill="${S.ink}" font-weight="700">LiamOS</tspan>`, lineNo++, c0.enter + 0.55, S.muted);
  // progress bar on line 1 (fills between the two outputs)
  {
    const y = lineY(1) - 8, bx = tx0 + 30 * CW, bw = KW - 24 - 30 * CW;
    shell.push(`<g opacity="0">${steps('opacity', [[c0.enter + 0.12, 1], [cmds[3].enter + 0.3, 0]], 0)}
      <rect x="${bx}" y="${y}" width="${bw}" height="7" fill="none" stroke="${S.dim}"/>
      <rect x="${bx + 2}" y="${y + 2}" width="0" height="3" fill="${S.green}">${lin('width', [[c0.enter + 0.12, 0], [c0.enter + 0.5, bw - 4], [cmds[3].enter + 0.3, bw - 4], [cmds[3].enter + 0.31, 0]])}</rect></g>`);
  }
  moveCursorBelow(lineNo, c0.enter + 0.55);
  // cmd 2: ls apps/
  promptLine(ls, lineNo++, ls.at - 0.35);
  moveCursorBelow(lineNo, ls.enter);
  const app = (n, col) => `<tspan fill="${col}">${n}/</tspan>`;
  outLine(`${app('justplugin', '#ff8a33')}  ${app('zombies', '#9bdc2a')}  ${app('paint', '#e8b06a')}  ${app('tools', '#38bdf8')}`, lineNo++, ls.enter + 0.15, S.text);
  outLine(`${app('tegriai', '#8a8dff')}  ${app('lumelyy', '#c7a878')}  <tspan fill="#9aa0a6">+3 locked</tspan>`, lineNo++, ls.enter + 0.2, S.text);
  moveCursorBelow(lineNo, ls.enter + 0.2);
  // cmd 3: ./zombies --hard
  promptLine(zc, lineNo++, zc.at - 0.35);
  moveCursorBelow(lineNo, zc.enter);
  outLine(`[<tspan fill="${S.warn}">warn</tspan>] horde incoming: <tspan fill="${S.red}">wave 1</tspan>`, lineNo++, zc.enter + 0.15, S.muted);
  outLine(`WASD to move · SPACE to fight`, lineNo++, zc.enter + 0.6, S.dim);
  moveCursorBelow(lineNo, zc.enter + 0.6);
  // cmd 4: reboot
  const rb = cmds[3];
  promptLine(rb, lineNo++, rb.at - 0.35);

  const cursor = `<rect x="${tx0}" y="${lineY(0) - FS + 2}" width="${CW}" height="${FS}" fill="${S.green}" opacity="0">
      ${steps('x', cursorX, tx0)}${steps('y', cursorY, lineY(0) - FS + 2)}
      <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.5;.5;1" dur="0.8s" repeatCount="indefinite" calcMode="discrete"/></rect>`;
  scr.push(`<g opacity="0">${steps('opacity', [[bootEnd, 1]], 0)}${shell.join('')}${cursor}</g>`);

  // on-screen pointer that "hovers" the dock during `ls`
  const ptrRest = [KX + KW - 60, KY + KH - 40];
  const tileC = (i) => { const [x, y] = tileXY(i); return [x + TILE / 2 + 4, y + TILE / 2 + 6]; };
  const pk = [[0, ptrRest], [sweep0 - 0.4, ptrRest]];
  DOCK.forEach((_, i) => { const [h0, h1] = hoverAt(i); pk.push([h0 - 0.08, tileC(i)], [h1 - 0.14, tileC(i)]); });
  pk.push([sweep0 + 9 * sweepStep + 0.5, ptrRest], [zStart - 0.3, ptrRest], [zStart + 0.1, tileC(2)], [zEnd, tileC(2)], [zEnd + 0.5, ptrRest]);
  const ptrKeys = pk.map(([t, [x, y]]) => [t, `${x} ${y}`]);
  scr.push(`<g opacity="0">${steps('opacity', [[bootEnd + 0.3, 1]], 0)}<g>${lin('transform', ptrKeys, { transform: true })}${px(POINTER, 0, 0, 2, { k: '#000000', w: '#ffffff' })}</g></g>`);

  // splash ("Loading LiamOS...") and power effects
  const logo = 'LIAM+', ls4 = 5;
  const lwid = pw(logo, ls4);
  const bw = 220, bx = SX + SW / 2 - bw / 2, by = SY + SH / 2 + 34;
  scr.push(`<g opacity="0">${steps('opacity', [[0.25, 1], [bootEnd, 0]], 0)}
    <rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="#050807"/>
    <g filter="url(#${P}glow)" opacity=".6">${ptext(lib, logo, SX + SW / 2 - lwid / 2, SY + SH / 2 - 44, ls4, S.green)}</g>
    ${ptext(lib, logo, SX + SW / 2 - lwid / 2, SY + SH / 2 - 44, ls4, S.green)}
    <text x="${SX + SW / 2}" y="${SY + SH / 2 + 22}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${S.text}">Loading LiamOS...</text>
    <rect x="${bx}" y="${by}" width="${bw}" height="10" fill="none" stroke="${S.dim}"/>
    <rect x="${bx + 2}" y="${by + 2}" width="0" height="6" fill="${S.green}">${lin('width', [[0.35, 0], [0.9, 70], [1.2, 96], [1.8, bw - 4], [bootEnd, bw - 4], [bootEnd + 0.01, 0]])}</rect>
  </g>`);
  // power off at reboot, on at loop start
  const offAt = rb.enter + 0.35;
  scr.push(`<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="#000" opacity="1">${steps('opacity', [[0.22, 0], [offAt, 1]], 1)}</rect>`);
  // CRT collapse line + power-on line
  const cy = SY + SH / 2;
  scr.push(`<rect x="${SX}" y="${cy - 2}" width="${SW}" height="4" fill="#e9fff2" opacity="0">${steps('opacity', [[0.06, 1], [0.22, 0], [offAt - 0.02, 1], [offAt + 0.12, 0]], 0)}</rect>`);
  scr.push(`<rect x="${SX}" y="${cy - 30}" width="${SW}" height="60" fill="#e9fff2" opacity="0">${steps('opacity', [[offAt - 0.14, 0.5], [offAt - 0.02, 0]], 0)}</rect>`);
  // scanlines + glass
  scr.push(`<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="url(#${P}scan)"/>`);
  scr.push(`<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" fill="url(#${P}vig)"/>`);
  scr.push(`<rect x="${SX}" y="-80" width="${SW}" height="80" fill="url(#${P}band)"><animate attributeName="y" values="${SY - 80};${SY + SH}" dur="6s" repeatCount="indefinite"/></rect>`);
  scr.push(`<path d="M${SX + 8} ${SY + 8}h60l-60 40z" fill="#ffffff" opacity=".035"/>`);

  // ── keyboard ──
  const U = 36, KEYH = 18, DEPTH = 4, ROWP = KEYH + DEPTH + 2;
  const ROWS = [
    [['`', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['BKSP', 2]],
    [['TAB', 1.5], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['[', 1], [']', 1], ['\\', 1.5]],
    [['CAPS', 1.75], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1], ['K', 1], ['L', 1], [';', 1], ["'", 1], ['ENTER', 2.25]],
    [['SHIFT', 2.25], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1], [',', 1], ['.', 1], ['/', 1], ['SHIFT ', 2.75]],
    [['CTRL', 1.25], ['FN', 1.25], ['ALT', 1.25], ['SPACE', 6.25], ['ALT ', 1.25], ['FN ', 1.25], ['CTRL ', 1.5]],
  ];
  const KBW = 15 * U, KBX = 600 - KBW / 2, KBY = 336;
  // presses per key
  const presses = {};
  const press = (k, t, d = 0.1) => (presses[k] ??= []).push([t, t + d]);
  for (const c of cmds) {
    [...c.text].forEach((ch, i) => {
      const k = ch === ' ' ? 'SPACE' : ch.toUpperCase();
      press(k, c.times[i]);
    });
    press('ENTER', c.enter, 0.14);
  }
  const keys = [];
  const backlight = [];
  ROWS.forEach((row, ri) => {
    let x = KBX;
    const y = KBY + ri * ROWP;
    row.forEach(([k, u]) => {
      const w = u * U - 4;
      const pr = presses[k] ?? [];
      const lbl = k.trim() === 'SPACE' ? '' : k.trim();
      const lx = x + Math.round((w - pw(lbl, 1)) / 2);
      const face = `<rect x="${x}" y="${y}" width="${w}" height="${KEYH}" fill="${keyTop}"/>
        <rect x="${x}" y="${y}" width="${w}" height="2" fill="${mix(keyTop, '#ffffff', dark ? 0.08 : 0.6)}"/>
        ${lbl ? ptext(lib, lbl, lx, y + 6, 1, keyLabel) : `<rect x="${x + w / 2 - 20}" y="${y + 8}" width="40" height="2" fill="${keyLabel}" opacity=".5"/>`}`;
      const front = `<rect x="${x}" y="${y + KEYH}" width="${w}" height="${DEPTH}" fill="${keyFront}"/>`;
      if (!pr.length) {
        keys.push(front + face);
      } else {
        const ev = [], lev = [];
        pr.forEach(([a, b]) => { ev.push([a, '0 3'], [b, '0 0']); lev.push([a, 0.9], [b, 0.45], [b + 0.12, 0.18], [b + 0.24, 0]); });
        keys.push(`${front}<g>${stepsT(ev, '0 0')}${face}
          <rect x="${x}" y="${y}" width="${w}" height="${KEYH}" fill="${lit}" opacity="0">${steps('opacity', lev, 0)}</rect>
          ${lbl ? `<g opacity="0">${steps('opacity', lev.map(([t, v]) => [t, v > 0.4 ? 1 : 0]), 0)}${ptext(lib, lbl, lx, y + 6, 1, dark ? '#03140b' : '#ffffff')}</g>` : ''}</g>`);
        backlight.push(`<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${KEYH + 12}" fill="${lit}" opacity="0" filter="url(#${P}glow)">${steps('opacity', lev.map(([t, v]) => [t, (v * 0.8).toFixed(2)]), 0)}</rect>`);
      }
      x += u * U;
    });
  });
  const kbCase = `
    <rect x="${KBX - 18}" y="${KBY - 14}" width="${KBW + 30}" height="${5 * ROWP + 22}" fill="${outline}" opacity=".35" transform="translate(4 6)"/>
    <rect x="${KBX - 18}" y="${KBY - 14}" width="${KBW + 30}" height="${5 * ROWP + 16}" fill="${caseTop}" stroke="${outline}" stroke-opacity=".6"/>
    <rect x="${KBX - 18}" y="${KBY - 14}" width="${KBW + 30}" height="3" fill="${mix(caseTop, '#ffffff', dark ? 0.08 : 0.5)}"/>
    <rect x="${KBX - 18}" y="${KBY + 5 * ROWP + 2}" width="${KBW + 30}" height="8" fill="${caseFront}"/>
    <rect x="${KBX - 22 + KBW + 30 - 34}" y="${KBY - 10}" width="4" height="3" fill="${C.green}" class="${P}led"/>
    <rect x="${KBX - 22 + KBW + 30 - 26}" y="${KBY - 10}" width="4" height="3" fill="${C.green}" opacity=".35"/>`;
  const cable = `<path d="M600 ${KBY - 14} V ${MY + MH + 40}" stroke="${bezelLo}" stroke-width="4" fill="none"/>`;

  // ── desk props ──
  // Lightning block figurine (Liam's avatar) on a pedestal, left of the monitor.
  let figurine = '';
  try {
    const A = JSON.parse(readFileSync(new URL('../avatar.json', import.meta.url), 'utf8'));
    const s = 3, n = A.size, fx = 148 - (n * s) / 2, fy = deskY - 22 - n * s;
    const chars = [];
    const pal = {};
    const key = (i) => String.fromCharCode(0x100 + i);
    A.palette.forEach((c, i) => (pal[key(i)] = c));
    for (const row of A.pixels) chars.push(row.map((v) => key(v)).join(''));
    let boltD = '';
    A.kinds.forEach((row, y) => [...row].forEach((k, x) => { if (k === 'B') boltD += `M${fx + x * s} ${fy + y * s}h${s}v${s}h-${s}z`; }));
    const bolt = [`<path d="${boltD}"/>`];
    figurine = `
      <g class="${P}float">
        <g filter="url(#${P}glowBig)" fill="#ffc43c" class="${P}pulse">${bolt.join('')}</g>
        <rect x="${fx - 2}" y="${fy - 2}" width="${n * s + 4}" height="${n * s + 4}" fill="${outline}"/>
        ${px(chars, fx, fy, s, pal)}
        <g fill="#fff6d0" opacity="0">${bolt.join('')}${steps('opacity', [[5.3, 0.9], [5.38, 0], [5.46, 0.6], [5.52, 0], [14.1, 0.9], [14.18, 0], [14.26, 0.6], [14.32, 0]], 0)}</g>
      </g>
      <ellipse cx="148" cy="${deskY - 4}" rx="30" ry="4" fill="#ffc43c" opacity="${dark ? 0.18 : 0.25}" class="${P}pulse"/>
      <rect x="${148 - 46}" y="${deskY - 12}" width="92" height="16" fill="${bezel}" stroke="${outline}" stroke-opacity=".5"/>
      <rect x="${148 - 46}" y="${deskY - 12}" width="92" height="3" fill="${bezelHi}"/>
      <rect x="${148 - 52}" y="${deskY + 4}" width="104" height="8" fill="${bezelLo}"/>
      ${ptext(lib, 'LIAM+', 148 - pw('LIAM+', 1) / 2, deskY - 6, 1, '#ffc43c')}`;
  } catch { figurine = ''; }

  // Mug with steam
  const mugX = 222, mugY = deskY + 6;
  const mug = `${px(MUG, mugX, mugY, 4, { k: outline, g: dark ? '#1f3a2b' : '#ffffff', G: C.green })}
    ${[0, 1, 2].map((k) => `<rect x="${mugX + 12 + k * 8}" y="${mugY - 8}" width="3" height="6" fill="${C.muted}" class="${P}steam" style="animation-delay:${(k * 0.6).toFixed(1)}s"/>`).join('')}`;

  // Plant
  const plant = px(PLANT, 40, deskY - 18, 5, { l: dark ? '#1a7a4a' : '#2f9e5f', L: dark ? '#22c46e' : '#4cc27e', k: outline, p: '#8a5a3b', P: '#6d4630' });

  // Network switch with blinking port LEDs (right side)
  const swX = 962, swY = deskY + 34, swW = 196;
  const ports = Array.from({ length: 8 }, (_, i) => {
    const x = swX + 14 + i * 22;
    const d = lib.rng('port' + i)();
    return `<rect x="${x}" y="${swY + 12}" width="16" height="12" fill="${outline}"/>
      <rect x="${x + 2}" y="${swY + 6}" width="4" height="3" fill="${C.green}" class="${P}blink" style="animation-duration:${(0.35 + d * 0.9).toFixed(2)}s;animation-delay:${(d * 2).toFixed(2)}s"/>
      <rect x="${x + 10}" y="${swY + 6}" width="4" height="3" fill="${C.warn}" opacity="${i % 3 ? 0.9 : 0.25}"/>`;
  }).join('');
  const cables = [0, 2, 3, 6].map((i, k) => {
    const x = swX + 22 + i * 22;
    return `<path d="M${x} ${swY + 30} v ${6 + k * 4} H ${W + 4}" fill="none" stroke="${['#38bdf8', '#22ff88', '#fbbf24', '#a78bfa'][k]}" stroke-width="3" opacity=".7"/>`;
  }).join('');
  const netSwitch = `${cables}
    <rect x="${swX}" y="${swY}" width="${swW}" height="30" fill="${bezel}" stroke="${outline}" stroke-opacity=".6"/>
    <rect x="${swX}" y="${swY}" width="${swW}" height="3" fill="${bezelHi}"/>
    ${ports}
    <text x="${swX + swW}" y="${swY - 6}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${C.muted}">eth0..7 · up</text>`;

  // Mouse that follows the on-screen pointer (scaled down)
  const mX = 1060, mY = deskY + 108;
  const mk = pk.map(([t, [x, y]]) => [t, `${((x - ptrRest[0]) * 0.08).toFixed(1)} ${((y - ptrRest[1]) * 0.08).toFixed(1)}`]);
  const mouse = `
    <rect x="${mX - 62}" y="${mY - 26}" width="112" height="72" fill="${deskFront}" stroke="${C.green}" stroke-opacity=".35" stroke-width="2"/>
    ${ptext(lib, 'LIAM+', mX - 56, mY + 36, 1, C.green)}
    <g>${lin('transform', mk, { transform: true })}
      ${px(['.kkkkk.', 'kbbkbbk', 'kbbkbbk', 'kbbgbbk', 'kbbbbbk', 'kbbbbbk', 'kbbbbbk', '.kbbbk.', '..kkk..'], mX, mY, 4, { k: outline, b: keyTop, g: C.green })}</g>`;

  // Liam (right, on desk) and the zombie peeking from behind the monitor
  const liamX = 1060, liamY = deskY - 60;
  const alertA = zc.enter + 0.6, alertB = zEnd - 0.2;
  const liam = `
    <g class="${P}bob">${lib.sprite(lib.SPRITES.liamA, liamX, liamY, 4)}</g>
    <g opacity="0">${steps('opacity', [[alertA, 1], [alertB, 0]], 0)}
      <rect x="${liamX + 10}" y="${liamY - 34}" width="28" height="24" fill="#ffffff"/><rect x="${liamX + 20}" y="${liamY - 10}" width="6" height="6" fill="#ffffff"/>
      ${ptext(lib, '!', liamX + 16, liamY - 29, 2, C.red)}
    </g>
    <g opacity="0">${steps('opacity', [[bootEnd + 0.2, 1], [bootEnd + 1.8, 0]], 0)}
      <rect x="${liamX - 14}" y="${liamY - 34}" width="72" height="24" fill="#ffffff"/><rect x="${liamX + 20}" y="${liamY - 10}" width="6" height="6" fill="#ffffff"/>
      <text x="${liamX + 22}" y="${liamY - 17}" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" fill="#000">boot!</text>
    </g>`;
  const zomX = MX + MW - 56, zomY = deskY - 60;
  const zIn = zc.enter + 0.35, zOut = zEnd - 0.1;
  const zk = [[0, '0 0'], [zIn, '0 0'], [zIn + 0.35, '62 0'], [zIn + 0.7, '58 0'], [zIn + 1.05, '62 0'], [zIn + 1.4, '58 0'], [zIn + 1.75, '62 0'], [zOut - 0.3, '60 0'], [zOut, '0 0']];
  const zombieFlip = lib.SPRITES.zombieA;
  const zombie = `<g opacity="0">${steps('opacity', [[zIn, 1], [zOut + 0.05, 0]], 0)}<g>${lin('transform', zk, { transform: true })}${px(zombieFlip, zomX, zomY, 4, lib.SPRITE_PALETTE, { flip: true })}</g></g>`;

  // ── defs + styles ──
  const defs = `<defs>
    <filter id="${P}glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="${P}glowBig" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
    <pattern id="${P}grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="#22ff88" stroke-opacity=".05"/></pattern>
    <pattern id="${P}wgrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${C.green}" stroke-opacity="${dark ? 0.05 : 0.07}"/></pattern>
    <pattern id="${P}scan" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="#000" opacity=".3"/></pattern>
    <radialGradient id="${P}vig" cx="50%" cy="50%" r="70%"><stop offset="65%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".6"/></radialGradient>
    <radialGradient id="${P}wall" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="#0d2a1b"/><stop offset="1" stop-color="#050807"/></radialGradient>
    <linearGradient id="${P}band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22ff88" stop-opacity="0"/><stop offset=".5" stop-color="#22ff88" stop-opacity=".05"/><stop offset="1" stop-color="#22ff88" stop-opacity="0"/></linearGradient>
    <linearGradient id="${P}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06140d"/><stop offset="1" stop-color="#0c2a1a"/></linearGradient>
    <radialGradient id="${P}spill" cx="50%" cy="30%" r="60%"><stop offset="0" stop-color="${C.green}" stop-opacity="${dark ? 0.12 : 0.08}"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${P}halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${C.green}" stop-opacity="${dark ? 0.16 : 0.1}"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></radialGradient>
    <clipPath id="${P}scr"><rect x="${SX}" y="${SY}" width="${SW}" height="${SH}"/></clipPath>
  </defs>
  <style>
    .${P}tw{animation:${P}tw 3s ease-in-out infinite}
    @keyframes ${P}tw{0%,100%{opacity:.2}50%{opacity:1}}
    .${P}neon{animation:${P}neon 7s steps(1) infinite}
    @keyframes ${P}neon{0%,100%{opacity:1}61%{opacity:.35}62%{opacity:1}63%{opacity:.5}64%{opacity:1}88%{opacity:.7}89%{opacity:1}}
    .${P}led{animation:${P}led 2s steps(1) infinite}
    @keyframes ${P}led{50%{opacity:.35}}
    .${P}blink{animation:${P}blink .6s steps(1) infinite}
    @keyframes ${P}blink{50%{opacity:.15}}
    .${P}steam{opacity:0;animation:${P}steam 1.8s linear infinite}
    @keyframes ${P}steam{0%{opacity:0;transform:translate(0,0)}20%{opacity:.7}60%{opacity:.4;transform:translate(3px,-14px)}100%{opacity:0;transform:translate(-2px,-26px)}}
    .${P}float{animation:${P}float 3s steps(4) infinite}
    @keyframes ${P}float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    .${P}pulse{animation:${P}pulse 2.4s ease-in-out infinite}
    @keyframes ${P}pulse{0%,100%{opacity:.35}50%{opacity:.95}}
    .${P}bob{animation:${P}bob 1.6s steps(2) infinite}
    @keyframes ${P}bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  </style>`;

  const body = `${defs}
  <rect width="${W}" height="${H}" fill="${wall}"/>
  <rect width="${W}" height="${deskY}" fill="url(#${P}wgrid)"/>
  <ellipse cx="600" cy="150" rx="480" ry="190" fill="url(#${P}halo)"/>
  ${windowArt}
  ${neon}
  ${desk}
  ${plant}
  ${figurine}
  ${mug}
  ${zombie}
  ${monitorBack}
  ${stand}
  ${frame}
  <g clip-path="url(#${P}scr)">${scr.join('')}</g>
  ${liam}
  ${netSwitch}
  ${cable}
  ${kbCase}
  <g>${backlight.join('')}</g>
  ${keys.join('')}
  ${mouse}`;

  return {
    'h-liamos.svg': lib.header(C, ctx.no('liamos'), 'LIAMOS', C.green),
    'liamos.svg': lib.svg(W, H, body, 'LiamOS diorama — liam.plus running on a pixel desk'),
  };
}

export function readme(ctx) {
  return `<p align="center">${ctx.pic('h-liamos.svg', `width="100%" alt="${ctx.no('liamos')} // LIAMOS"`)}</p>
<p align="center"><a href="https://liam.plus">${ctx.pic('liamos.svg', 'width="100%" alt="LiamOS: a pixel-art desk where the keyboard types commands into the LiamOS Shell on liam.plus while the app dock lights up. Click to open liam.plus"')}</a></p>`;
}
