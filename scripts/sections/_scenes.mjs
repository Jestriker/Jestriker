// Tiny looping pixel-art scenes for the project cards (drawn on a 30×30 grid, scaled ×4 into the
// 120×120 icon box). Each scene returns { css, body }; `body` lives in grid units, `css` uses class
// names prefixed with `s` so it never collides with the card's own classes.
//
// Timing: every scene loop is 6 s (or a divisor of 6) and starts at `D`, which the card aligns with the
// moment the scene dissolves in, so viewers always see the action from its first frame.

import { SPRITES, SPRITE_PALETTE } from '../pixel.mjs';

// ── pixel helpers ──────────────────────────────────────────────────────────

// Rows of palette keys → one compact <path> per colour, merging horizontal runs.
export function art(rows, x0, y0, pal, attrs = '') {
  const runs = {};
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const c = row[x];
      if (!pal[c]) { x++; continue; }
      let e = x;
      while (row[e + 1] === c) e++;
      (runs[c] ??= []).push(`M${x0 + x} ${y0 + y}h${e - x + 1}v1h-${e - x + 1}z`);
      x = e + 1;
    }
  });
  return Object.entries(runs).map(([c, d]) => `<path d="${d.join('')}" fill="${pal[c]}"${attrs}/>`).join('');
}

// Single pixels [[x,y],…] of one colour.
const dots = (pts, fill, attrs = '') =>
  `<path d="${pts.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('')}" fill="${fill}"${attrs}/>`;

const box = (x, y, w, h, fill, attrs = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${attrs}/>`;

// 3×5 font for console / chat text.
const TINY = {
  O: ['111', '101', '101', '101', '111'], K: ['101', '101', '110', '101', '101'],
  G: ['111', '100', '101', '101', '111'], U: ['101', '101', '101', '101', '111'],
  P: ['110', '101', '110', '100', '100'], '>': ['100', '010', '001', '010', '100'],
  R: ['110', '101', '110', '101', '101'], N: ['110', '101', '101', '101', '101'], ' ': ['000', '000', '000', '000', '000'],
};
const tiny = (text, x0, y0, fill) => {
  const pts = [];
  [...text].forEach((ch, i) => (TINY[ch] ?? TINY[' ']).forEach((r, y) => [...r].forEach((b, x) => b === '1' && pts.push([x0 + i * 4 + x, y0 + y]))));
  return pts.length ? dots(pts, fill) : '';
};

const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
export const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');

// ── animation helpers ──────────────────────────────────────────────────────

const pc = (s, dur) => `${+(s / dur * 100).toFixed(2)}%`;

// Keyframes that hold `hidden` until `on`, `shown` until `off`, then `hidden` again (times in seconds).
function showKf(name, dur, on, off, { hidden = 'opacity:0', shown = 'opacity:1', inT = 0.05, outT = 0.05, mid } = {}) {
  const k = [`0%{${hidden}}`, `${pc(on, dur)}{${hidden}}`];
  if (mid) k.push(`${pc(on + inT * 0.6, dur)}{${mid}}`);
  k.push(`${pc(on + inT, dur)}{${shown}}`, `${pc(off, dur)}{${shown}}`, `${pc(off + outT, dur)}{${hidden}}`, `100%{${hidden}}`);
  return `@keyframes ${name}{${k.join('')}}`;
}

// ── scenes ─────────────────────────────────────────────────────────────────

const K = '#10141a';

function justplugin({ a, D, dark }) {
  const an = (n, dur = 6, off = 0, tf = 'linear') => `animation:${n} ${dur}s ${tf} ${(D + off).toFixed(2)}s infinite`;
  const pal = { G: '#7fcf4e', g: '#5a9e36', d: '#8b5a2b', D: '#6a4220', s: '#a8743f', k: '#4e3018' };
  const block = [
    'GGgGGGgGGGgG',
    'gGGgGgGGgGGg',
    'gdgGdgggDgdg',
    'ddDdddsddDdd',
    'dsddDddddsdd',
    'ddddsddDdddd',
    'dDddddddsddD',
    'ddsdDddddddd',
    'dddddsddDdsd',
    'kkkkkkkkkkkk',
  ];
  const bolt = [
    '.......WY.', '......WY..', '.....WY...', '....WYYYY.', '......WY..', '.....WY...', '....WY....',
    '...WY.....', '...WYYYY..', '.....WY...', '....WY....', '...WY.....', '...WYYY...', '....WY....',
    '....WY....', '...WY.....', '...WY.....', '..WY......', '..WY......', '..Y.......',
  ];
  const jpal = { L: '#7a4a1f', K: '#1b232b', W: '#d9f1f7', O: a, H: '#ffffff' };
  const jar = ['.LL.', 'KWWK', 'KOHK', 'KOOK', 'KOOK', '.KK.'];
  const big = ['..LLLL..', '.LLLLLL.', '..KKKK..', '.KWWWWK.', 'KWOOOOHK', 'KOOOOOHK', 'KOOOOOHK', 'KOOOOOOK', 'KOOOOOOK', 'KWOOOOOK', '.KKKKKK.'];
  const jx = [9, 13, 17], dx = [4, 0, -4];
  const jarKf = jx.map((_, k) => {
    const s = 0.9 + k * 0.35, P = (t) => pc(t, 6);
    return `@keyframes sj${k}{0%,${P(s - 0.01)}{opacity:0;transform:translate(0,-22px)}
      ${P(s)}{opacity:1;transform:translate(0,-22px);animation-timing-function:ease-in}
      ${P(s + 0.3)}{transform:translate(0,0)}${P(s + 0.37)}{transform:translate(0,-1px)}${P(s + 0.44)}{transform:translate(0,0)}
      ${P(2.7)}{opacity:1;transform:translate(0,0)}${P(3.0)}{opacity:0;transform:translate(${dx[k]}px,-2px)}100%{opacity:0}}`;
  }).join('');
  const sparks = [[8, 9], [21, 8], [7, 15], [22, 14]];
  const css = `
    .sbolt{opacity:0;${an('sbolt', 6, 0, 'steps(1)')}}
    @keyframes sbolt{0%{opacity:0}3.3%{opacity:1}5%{opacity:.2}6.6%{opacity:1}9%{opacity:0}100%{opacity:0}}
    .sflash{opacity:0;${an('sflash')}}
    @keyframes sflash{0%{opacity:0}3.3%{opacity:.35}10%{opacity:0}100%{opacity:0}}
    .sblk{${an('sblk', 6, 0, 'steps(1)')}}
    @keyframes sblk{0%{transform:none}4%{transform:translate(1px,0)}6%{transform:translate(-1px,0)}8%{transform:none}100%{transform:none}}
    ${jx.map((_, k) => `.sj${k}{opacity:0;${an(`sj${k}`)}}`).join('')}
    ${jarKf}
    .sbig{opacity:0;transform-box:fill-box;transform-origin:50% 100%;${an('sbig')}}
    @keyframes sbig{0%,${pc(2.85, 6)}{opacity:0;transform:scale(.2)}${pc(3.1, 6)}{opacity:1;transform:scale(1.2)}${pc(3.25, 6)}{transform:scale(1)}
      ${pc(4.4, 6)}{opacity:1;transform:scale(1)}${pc(4.75, 6)}{opacity:0;transform:scale(.3)}100%{opacity:0}}
    .sglow{opacity:0;${an('sglow')}}
    @keyframes sglow{0%,${pc(3.0, 6)}{opacity:0}${pc(3.3, 6)}{opacity:.9}${pc(3.8, 6)}{opacity:.45}${pc(4.3, 6)}{opacity:.9}${pc(4.7, 6)}{opacity:0}100%{opacity:0}}
    .sspk{opacity:0;${an('sspk', 6, 0, 'steps(1)')}}
    @keyframes sspk{0%,${pc(3.15, 6)}{opacity:0}${pc(3.2, 6)}{opacity:1}${pc(3.5, 6)}{opacity:0}${pc(3.8, 6)}{opacity:1}${pc(4.1, 6)}{opacity:0}100%{opacity:0}}`;
  const body = `
    <g class="sblk">${art(block, 9, 20, pal)}</g>
    <rect x="7" y="4" width="16" height="17" rx="4" fill="${a}" class="sglow" filter="url(#sblur)"/>
    ${jx.map((x, k) => `<g class="sj${k}">${art(jar, x, 14, jpal)}</g>`).join('')}
    <g class="sbig">${art(big, 11, 9, jpal)}</g>
    <g class="sspk">${sparks.map(([x, y]) => dots([[x, y - 1], [x - 1, y], [x, y], [x + 1, y], [x, y + 1]], '#ffe14d')).join('')}</g>
    <g class="sbolt">${art(bolt, 3, 0, { W: '#ffffff', Y: '#ffe14d' })}${dots([[4, 19], [6, 19], [7, 18], [3, 18]], '#ffe14d')}</g>
    <rect width="30" height="30" fill="${dark ? '#fff7cc' : '#fff4b0'}" class="sflash"/>`;
  return { css, body, defs: `<filter id="sblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>` };
}

function justmic({ a, D }) {
  const an = (n, dur, off = 0, tf = 'linear') => `animation:${n} ${dur}s ${tf} ${(D + off).toFixed(2)}s infinite`;
  const mic = [
    '..KKKKKK..', '.KGgGgGgK.', 'KGgGgGgGgK', 'KgGgGgGgGK', 'KGgGgGgGgK', 'KgGgGgGgGK', 'KAAAAAAAAK', 'KBBBBBBBBK',
    'MKBBBBBBKM', 'M.KBBBBK.M', '.M.KKKK.M.', '..MM..MM..', '....MM....', '....MM....', '..MMMMMM..',
  ];
  const pal = { K, G: '#dfe6ec', g: '#8e99a4', A: a, B: '#3a434d', M: '#8791a0' };
  const waves = [0, 1, 2].map((k) => {
    const x0 = 15 + 3 * k, h = 2 + 2 * k, cy = 6;
    const pts = [[x0, cy - h], [x0, cy + h]];
    for (let y = cy - h + 1; y <= cy + h - 1; y++) pts.push([x0 + 1, y]);
    return `<g class="swv" style="animation-delay:${(D + k * 0.18).toFixed(2)}s">${dots(pts, a)}</g>`;
  }).join('');
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const bars = [], kfs = [];
  for (let k = 0; k < 8; k++) {
    const x = 3 + 3 * k;
    const lv = Array.from({ length: 8 }, () => 1 + Math.floor(r() * 8));
    kfs.push(`@keyframes sv${k}{${lv.map((v, j) => `${(j * 12.5).toFixed(1)}%{transform:scaleY(${v / 8})}`).join('')}100%{transform:scaleY(${lv[0] / 8})}}`);
    bars.push(`<rect x="${x}" y="21" width="2" height="8" fill="${a}" opacity=".13"/>
      <g class="sv" style="animation-name:sv${k}">${box(x, 21, 2, 2, '#ff4d5e')}${box(x, 23, 2, 2, '#ffcc33')}${box(x, 25, 2, 4, a)}</g>`);
  }
  const css = `
    .swv{opacity:0;animation:swv 1.5s linear infinite}
    @keyframes swv{0%{opacity:0}15%{opacity:1}55%{opacity:0}100%{opacity:0}}
    .sv{transform-box:fill-box;transform-origin:50% 100%;animation:sv0 1.2s steps(1) ${D.toFixed(2)}s infinite}
    ${kfs.join('')}
    .srec{${an('srec', 1, 0, 'steps(1)')}}
    @keyframes srec{50%{opacity:.15}}`;
  const body = `${art(mic, 2, 2, pal)}${waves}${bars.join('')}<rect x="26" y="2" width="2" height="2" fill="#ff4d5e" class="srec"/>`;
  return { css, body };
}

function parpar({ a, D }) {
  const rack = [];
  rack.push(box(2, 3, 12, 26, K), box(3, 4, 10, 24, '#2a2f3b'));
  const leds = [];
  for (let u = 0; u < 4; u++) {
    const y = 5 + u * 6;
    rack.push(box(3, y, 10, 5, '#3b4252'), box(4, y + 1, 5, 1, '#232833'), box(4, y + 3, 5, 1, '#232833'));
    const cols = [['#39ff88', 0.6], [u % 2 ? '#ffb020' : a, 1.0]];
    cols.forEach(([c, dur], j) => leds.push(`<rect x="${10 + j * 2}" y="${y + 2}" width="1" height="1" fill="${c}" class="sled" style="animation-duration:${dur}s;animation-delay:${(D + u * 0.23 + j * 0.37).toFixed(2)}s"/>`));
  }
  const lines = [['>GO', '#aab4c3'], [' OK', '#39ff88'], ['>UP', '#aab4c3'], [' OK', '#39ff88'], ['>GO', '#aab4c3'], [' OK', '#39ff88']];
  const all = [...lines, ...lines.slice(0, 3)];
  const text = all.map(([s, c], k) => {
    const y = 6 + k * 6;
    return s.startsWith('>') ? tiny('>', 16, y, a) + tiny(s.slice(1).slice(0, 2), 20, y, c) : tiny(s.trim(), 20, y, c);
  }).join('');
  const css = `
    .sled{animation:sled 1s steps(1) infinite}
    @keyframes sled{50%{opacity:.12}}
    .sscr{animation:sscr 3s steps(6) ${D.toFixed(2)}s infinite}
    @keyframes sscr{to{transform:translateY(-36px)}}
    .scur{animation:scur .5s steps(1) infinite}
    @keyframes scur{50%{opacity:0}}`;
  const body = `${rack.join('')}${leds.join('')}
    ${box(15, 4, 14, 20, K)}${box(16, 5, 12, 18, '#05070a')}
    <rect x="15.5" y="4.5" width="13" height="19" fill="none" stroke="${a}" stroke-width="1" opacity=".55"/>
    <g clip-path="url(#sscreen)"><g class="sscr">${text}</g></g>
    ${box(20, 24, 4, 2, '#5b6474')}${box(18, 26, 8, 2, '#3b4252')}`;
  const defs = `<clipPath id="sscreen"><rect x="16" y="5" width="12" height="18"/></clipPath>`;
  return { css, body, defs };
}

function tools({ a, D }) {
  const an = (n, dur, off = 0, tf = 'linear') => `animation:${n} ${dur}s ${tf} ${(D + off).toFixed(2)}s infinite`;
  const tb = [
    '.....KKKKKK.....', '.....K....K.....', 'KKKKKKKKKKKKKKKK', 'KRRRRRRRRRRRRRRK', 'KrrrrrrrrrrrrrrK',
    'KKKKKKKLLKKKKKKK', 'KRRRRRRLLRRRRRRK', 'KRRRRRRRRRRRRRRK', 'KrrrrrrrrrrrrrrK', 'KKKKKKKKKKKKKKKK',
  ];
  const gear = ['...GGG...', '.G.GGG.G.', '..GGGGG..', 'GGGGDGGGG', 'GGGD.DGGG', 'GGGGDGGGG', '..GGGGG..', '.G.GGG.G.', '...GGG...'];
  const gear2 = ['.G.G.', 'GGGGG', '.GDG.', 'GGGGG', '.G.G.'];
  const shield = [
    'KKKKKKKKKK', 'KSSSSSsssK', 'KSSSSSsssK', 'KSSSSSsssK', 'KSSSSSsssK', 'KSSSSSsssK', 'KSSSSSsssK',
    '.KSSSSssK.', '.KSSSSssK.', '..KSSssK..', '...KSsK...', '....KK....',
  ];
  const sx = 18, sy = 3;
  const steps = [[[2, 5], [2, 6]], [[3, 6], [3, 7]], [[4, 7], [4, 8]], [[5, 6], [5, 7]], [[6, 5], [6, 6]], [[7, 4], [7, 5]], [[8, 3], [8, 4]]];
  const check = steps.map((pts, k) =>
    `<g class="sck" style="animation-delay:${(D + k * 0.07).toFixed(2)}s">${dots(pts.map(([x, y]) => [sx + x, sy + y]), '#3dff9a')}</g>`).join('');
  const css = `
    .sgear{transform-box:fill-box;transform-origin:center;${an('sgear', 3)}}
    @keyframes sgear{to{transform:rotate(360deg)}}
    .sgear2{transform-box:fill-box;transform-origin:center;${an('sgear2', 1.5)}}
    @keyframes sgear2{to{transform:rotate(-360deg)}}
    .sck{opacity:0;animation:sck 3s steps(1) infinite}
    @keyframes sck{0%{opacity:0}${pc(0.8, 3)}{opacity:1}${pc(2.55, 3)}{opacity:0}100%{opacity:0}}
    .shalo{opacity:0;${an('shalo', 3)}}
    @keyframes shalo{0%,${pc(1.3, 3)}{opacity:0}${pc(1.45, 3)}{opacity:.85}${pc(2.5, 3)}{opacity:0}100%{opacity:0}}
    .slid{${an('slid', 3, 0, 'steps(1)')}}
    @keyframes slid{0%,${pc(1.35, 3)}{transform:none}${pc(1.4, 3)}{transform:translateY(-1px)}${pc(1.6, 3)}{transform:none}}`;
  const body = `
    <rect x="${sx - 2}" y="${sy - 1}" width="14" height="16" rx="4" fill="${a}" class="shalo" filter="url(#sblur)"/>
    ${art(shield, sx, sy, { K, S: '#3aa0e0', s: '#1f6fa8' })}${check}
    <g class="sgear">${art(gear, 3, 5, { G: '#b8c3cf', D: '#6b7785' })}</g>
    <g class="sgear2">${art(gear2, 11, 12, { G: '#8d99a7', D: '#4d5866' })}</g>
    <g class="slid">${art(tb, 1, 19, { K, R: '#e0483e', r: '#a8302a', L: '#e8edf2' })}</g>`;
  return { css, body, defs: `<filter id="sblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>` };
}

function zombies({ a, D, dark }) {
  const an = (n, dur, off = 0, tf = 'linear') => `animation:${n} ${dur}s ${tf} ${(D + off).toFixed(2)}s infinite`;
  const sky = dark
    ? `${art(['.MM.', 'MMMm', 'MMmm', '.Mm.'], 24, 2, { M: '#f4f1d0', m: '#cfc9a0' })}${dots([[4, 3], [11, 1], [17, 5], [8, 7], [20, 9], [2, 10]], '#9fb8ad')}`
    : `${art(['.SS.', 'SSSS', 'SSSS', '.SS.'], 24, 2, { S: '#ffc93c' })}${art(['.CCC..', 'CCCCCC'], 4, 4, { C: '#ffffff' })}${art(['.CC.', 'CCCC'], 14, 7, { C: '#ffffff' })}`;
  const ground = art(['GgGGgGGGgGGgGGGgGGgGGGgGGgGGGg', 'dddDddddDdddddDddddDddddDddddd', 'dDddddDddddDdddddDddddDddddDdd'], 0, 27, { G: '#5fae3a', g: '#4a8a2c', d: '#6b4423', D: '#553519' });
  const red = Object.fromEntries(Object.keys(SPRITE_PALETTE).map((k) => [k, '#ff4d5e']));
  const css = `
    .szw{${an('szw', 2)}}
    @keyframes szw{0%{transform:translate(3px,0);animation-timing-function:steps(3,end)}45%{transform:translate(0,0);animation-timing-function:steps(1,end)}
      50%{transform:translate(0,0);animation-timing-function:steps(1,end)}53%{transform:translate(4px,-1px);animation-timing-function:steps(1,end)}
      60%{transform:translate(4px,0);animation-timing-function:steps(1,end)}100%{transform:translate(3px,0)}}
    .szA{${an('szA', 0.5, 0, 'steps(1)')}}.szB{opacity:0;${an('szB', 0.5, 0, 'steps(1)')}}
    @keyframes szA{50%{opacity:0}}@keyframes szB{50%{opacity:1}}
    .szr{opacity:0;${an('szr', 2, 0, 'steps(1)')}}
    @keyframes szr{0%,49%{opacity:0}50%{opacity:.85}55%{opacity:0}57%{opacity:.6}60%{opacity:0}100%{opacity:0}}
    .sl{${an('sl', 2, 0, 'steps(1)')}}
    @keyframes sl{0%,44%{transform:none}46%{transform:translate(1px,0)}58%{transform:none}}
    .ssA{${an('ssA', 2, 0, 'steps(1)')}}.ssB{opacity:0;${an('ssB', 2, 0, 'steps(1)')}}
    @keyframes ssA{0%,45%{opacity:1}46%{opacity:0}58%{opacity:1}}
    @keyframes ssB{0%,45%{opacity:0}46%{opacity:1}58%{opacity:0}}
    .sslash{opacity:0;${an('sslash', 2, 0, 'steps(1)')}}
    @keyframes sslash{0%,45%{opacity:0}46%{opacity:.9}51%{opacity:0}}
    .shit{opacity:0;${an('shit', 2, 0, 'steps(1)')}}
    @keyframes shit{0%,49%{opacity:0}50%{opacity:1}54%{opacity:.5}57%{opacity:0}}`;
  const bl = dark ? '#dfe6ec' : '#8d99a7', tp = dark ? '#ffffff' : '#5b6474';
  const swordA = `${dots([[10, 21]], '#7a4a1f')}${dots([[11, 20]], '#9aa3ad')}${dots([[12, 19], [13, 18], [14, 17]], bl)}${dots([[15, 16]], tp)}`;
  const swordB = `${dots([[10, 21]], '#7a4a1f')}${dots([[11, 20], [11, 21], [11, 22]], '#9aa3ad')}${dots([[12, 21], [13, 21], [14, 21]], bl)}${dots([[15, 21]], tp)}`;
  const body = `${sky}${ground}
    <g class="szw">
      <g class="szA">${art(SPRITES.zombieA, 15, 12, SPRITE_PALETTE)}</g><g class="szB">${art(SPRITES.zombieB, 15, 12, SPRITE_PALETTE)}</g>
      <g class="szr">${art(SPRITES.zombieA, 15, 12, red)}</g>
    </g>
    <g class="sl">${art(SPRITES.liamA, 1, 12, SPRITE_PALETTE)}<g class="ssA">${swordA}</g><g class="ssB">${swordB}</g>
      <g class="sslash">${dots([[13, 16], [14, 17], [15, 18]], dark ? '#ffffff' : '#ffd23f')}</g></g>
    <g class="shit">${dots([[17, 18], [16, 19], [18, 19], [17, 20], [15, 17], [19, 17], [15, 21], [19, 21]], '#ffe14d')}${dots([[17, 19]], '#ffffff')}</g>`;
  return { css, body };
}

function tegriai({ a, D, dark }) {
  const dur = 6;
  const bubble = (x, y, w, h, fill, side) => {
    const rows = [];
    for (let r = 0; r < h; r++) rows.push(r === 0 || r === h - 1 ? '.' + 'X'.repeat(w - 2) + '.' : 'X'.repeat(w));
    const tail = side === 'l' ? ['.XX'.padEnd(w, '.'), '.X'.padEnd(w, '.')] : ['XX.'.padStart(w, '.'), 'X.'.padStart(w, '.')];
    return art([...rows, ...tail], x, y, { X: fill });
  };
  const light = dark ? '#eceef6' : '#c9ccfa';
  const b1 = `${bubble(1, 1, 16, 5, a, 'l')}${box(3, 3, 7, 1, '#ffffff')}${box(11, 3, 4, 1, '#ffffff', ' opacity=".7"')}`;
  const b2 = `${bubble(12, 8, 16, 7, light, 'r')}${tiny('GG', 17, 9, '#3a3fb8')}${dots([[25, 10], [25, 11], [25, 12], [25, 14]], '#3a3fb8')}`;
  const b3 = `${bubble(1, 17, 11, 5, a, 'l')}${[0, 1, 2].map((k) => `<rect x="${3 + k * 3}" y="19" width="1" height="1" fill="#ffffff" class="sdot" style="animation-delay:${(D + k * 0.15).toFixed(2)}s"/>`).join('')}`;
  const circle = ['...XXX...', '.XXXXXXX.', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '.XXXXXXX.', '...XXX...'];
  const tri = ['W..', 'WW.', 'WWW', 'WW.', 'W..'];
  const heart = ['H.H', 'HHH', '.H.'];
  const pops = [[0.2, 'sb1'], [0.9, 'sb2'], [1.6, 'sb3']];
  const css = `
    ${pops.map(([on, n]) => `.${n}{opacity:0;transform-box:fill-box;transform-origin:${n === 'sb2' ? '100%' : '0%'} 100%;animation:${n} ${dur}s linear ${D.toFixed(2)}s infinite}
      ${showKf(n, dur, on, 4.5, { hidden: 'opacity:0;transform:scale(.2)', shown: 'opacity:1;transform:scale(1)', mid: 'opacity:1;transform:scale(1.15)', inT: 0.18, outT: 0.3 })}`).join('')}
    .sdot{animation:sdot .6s steps(1) infinite}
    @keyframes sdot{0%{transform:translateY(0)}33%{transform:translateY(-1px)}66%{transform:translateY(0)}}
    .splay{transform-box:fill-box;transform-origin:center;animation:splay 1.5s ease-in-out ${D.toFixed(2)}s infinite}
    @keyframes splay{0%,100%{transform:scale(1)}20%{transform:scale(1.12)}40%{transform:scale(1)}}
    .sht{opacity:0;animation:sht 2s ease-out infinite}
    @keyframes sht{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}80%{opacity:0;transform:translate(0,-5px)}100%{opacity:0}}`;
  const body = `<g class="sb1">${b1}</g><g class="sb2">${b2}</g><g class="sb3">${b3}</g>
    <g class="splay">${art(circle, 17, 20, { X: a })}${art(tri, 21, 22, { W: '#ffffff' })}</g>
    <g class="sht" style="animation-delay:${(D + 0.3).toFixed(2)}s">${art(heart, 26, 23, { H: '#ff5d8f' })}</g>
    <g class="sht" style="animation-delay:${(D + 1.3).toFixed(2)}s">${art(heart, 13, 25, { H: dark ? '#ffb3cb' : '#ff5d8f' })}</g>`;
  return { css, body };
}

function lumelyy({ a, D, dark }) {
  const dev = [
    '.oooooooooo.', 'oWWWWWWWWWWo', 'oGGGGGGGGGGo', 'oCCCCCCCCCso', '.oCCCCCCCso.', '..oCCCCCso..', '...oCCCso...', '...oCBCso...',
    '...oCCCso...', '...oCCCso...', '...oCCCso...', '...oGGGso...', '...oCCCso...', '...oCCCso...', '...oCCCso...', '...ooooo....',
  ];
  const pal = { o: '#6e5a3e', W: '#fff6dd', G: a, C: '#f6f1ea', s: '#d9cfc2', B: '#b08d57' };
  const x0 = 9, y0 = 12;
  const beam = (spread, base) => {
    const rows = [];
    for (let y = 2; y <= 12; y++) {
      const hw = Math.round(base + (12 - y) * spread);
      rows.push(`M${15 - hw} ${y}h${hw * 2}v1h-${hw * 2}z`);
    }
    return rows.join('');
  };
  const glow = dark ? '#fff1c7' : '#f0bf55';
  const star = (x, y, c, k) => `<g class="sst" style="animation-delay:${(D + k).toFixed(2)}s">${dots([[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]], c)}${dots([[x, y]], '#ffffff')}</g>`;
  const sc = dark ? '#f5d58a' : '#c9962e';
  const css = `
    .sbeam{opacity:0;animation:sbeam 2s ease-out ${D.toFixed(2)}s infinite}
    @keyframes sbeam{0%{opacity:0}5%{opacity:1}15%{opacity:1}55%{opacity:0}100%{opacity:0}}
    .swin{opacity:0;animation:swin 2s steps(1) ${D.toFixed(2)}s infinite}
    @keyframes swin{0%{opacity:0}4%{opacity:1}20%{opacity:0}100%{opacity:0}}
    .sst{opacity:0;transform-box:fill-box;transform-origin:center;animation:sst 2s ease-in-out infinite}
    @keyframes sst{0%{opacity:0;transform:scale(.3)}30%{opacity:1;transform:scale(1)}60%{opacity:0;transform:scale(.3)}100%{opacity:0}}`;
  const body = `
    <g opacity=".35"><path d="${beam(0.6, 5)}" fill="${glow}" class="sbeam"/></g>
    <g opacity=".75"><path d="${beam(0.3, 4)}" fill="${glow}" class="sbeam" style="animation-delay:${(D + 0.05).toFixed(2)}s"/></g>
    ${art(dev, x0, y0, pal)}
    ${box(x0 + 1, y0 + 1, 10, 1, '#ffffff', ' class="swin"')}
    ${star(4, 5, sc, 0.2)}${star(25, 7, sc, 0.7)}${star(24, 20, sc, 1.1)}${star(5, 19, sc, 1.5)}${star(26, 14, sc, 0.35)}`;
  return { css, body };
}

function paint({ a, D, dark }) {
  const dur = 6, c0 = 5, n = 20, t0 = 0.3, st = 0.14;
  const yc = (k) => 12 + Math.round(3.5 * Math.sin((k / (n - 1)) * Math.PI * 1.8));
  const hsl = (h) => {
    const f = (m) => { const k = (m + h / 30) % 12; const v = 0.62 - 0.38 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(v * 255).toString(16).padStart(2, '0'); };
    return `#${f(0)}${f(8)}${f(4)}`;
  };
  const cols = Array.from({ length: n }, (_, k) => hsl(k * 16));
  const stroke = cols.map((c, k) => box(c0 + k, yc(k) - 1, 1, 3, c)).join('');
  // Brush sprite: tip at local (0,5).
  const brush = ['.....hh', '....hh.', '...hh..', '..mm...', '.TT....', 'T......'];
  const bpos = (k) => [c0 + k - 0, yc(k) - 5];
  const kf = [];
  const P = (t) => pc(t, dur);
  const [sx, sy] = bpos(0);
  const tr = (x, y) => `transform:translate(${x - sx}px,${y - sy}px)`;
  kf.push(`0%{${tr(sx, sy - 3)}}`, `${P(t0 - 0.12)}{${tr(sx, sy)}}`);
  for (let k = 0; k < n; k++) { const [x, y] = bpos(k); kf.push(`${P(t0 + k * st)}{${tr(x, y)}}`); }
  const end = t0 + n * st;
  const [ex, ey] = bpos(n - 1);
  kf.push(`${P(end + 0.1)}{${tr(ex + 1, ey - 3)}}`, `${P(4.6)}{${tr(ex + 1, ey - 3)}}`);
  for (let j = 1; j <= 5; j++) { const t = j / 5; kf.push(`${P(4.6 + j * 0.12)}{${tr(Math.round(ex + 1 + (sx - ex - 1) * t), sy - 3)}}`); }
  kf.push(`100%{${tr(sx, sy - 3)}}`);
  // Clip reveal (SMIL, discrete).
  const vals = ['0', '0'], kt = ['0', (t0 / dur).toFixed(4)];
  for (let k = 1; k <= n; k++) { vals.push(String(k)); kt.push(((t0 + k * st) / dur).toFixed(4)); }
  vals.push('0'); kt.push((5.1 / dur).toFixed(4));
  const tipVals = ['#3a3a3a', ...cols, '#3a3a3a'], tipKt = ['0', ...cols.map((_, k) => ((t0 - 0.05 + k * st) / dur).toFixed(4)), (5.1 / dur).toFixed(4)];
  const css = `
    .sbr{animation:sbr ${dur}s steps(1) ${D.toFixed(2)}s infinite}
    @keyframes sbr{${kf.join('')}}
    .sstk{animation:sstk ${dur}s linear ${D.toFixed(2)}s infinite}
    @keyframes sstk{0%,${P(4.5)}{opacity:1}${P(4.9)}{opacity:0}100%{opacity:0}}
    .sst{opacity:0;transform-box:fill-box;transform-origin:center;animation:sst ${dur}s ease-in-out infinite}
    @keyframes sst{0%,${P(end + 0.1)}{opacity:0;transform:scale(.3)}${P(end + 0.4)}{opacity:1;transform:scale(1)}${P(end + 0.8)}{opacity:0;transform:scale(.3)}100%{opacity:0}}`;
  const star = (x, y, k) => `<g class="sst" style="animation-delay:${(D + k).toFixed(2)}s">${dots([[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]], '#ffc93c')}${dots([[x, y]], '#ffffff')}</g>`;
  const wood = '#8c5a2b', woodD = '#6b4220';
  const body = `
    ${art(['.WW......................WW.', '..WW....................WW..', '...WW..................WW...', '....WW................WW....', '.....WW..............WW.....', '......WW............WW......', '.......WW..........WW.......'], 1, 22, { W: woodD })}
    ${box(2, 2, 26, 21, wood)}${box(3, 3, 24, 19, dark ? '#fbf8f0' : '#fffdf7')}${box(3, 21, 24, 1, '#e8e1d2')}
    <g clip-path="url(#sreveal)" class="sstk">${stroke}</g>
    ${star(24, 6, 0)}${star(7, 18, 0.25)}
    <g class="sbr">${art(brush, sx, sy, { h: '#c98a4b', m: '#aab4c3', T: '#3a3a3a' })}
      <path d="M${sx} ${sy + 5}h1v1h-1zM${sx + 1} ${sy + 4}h2v1h-2z" fill="#3a3a3a"><animate attributeName="fill" values="${tipVals.join(';')}" keyTimes="${tipKt.join(';')}" dur="${dur}s" begin="${D.toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/></path></g>`;
  const defs = `<clipPath id="sreveal"><rect x="${c0}" y="0" width="0" height="30"><animate attributeName="width" values="${vals.join(';')}" keyTimes="${kt.join(';')}" dur="${dur}s" begin="${D.toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/></rect></clipPath>`;
  return { css, body, defs };
}

function generic({ a, D, dark }) {
  const fg = dark ? '#d7e4dc' : '#2a3530';
  const lines = [[4, 6, 9], [6, 9, 12], [6, 12, 7], [4, 15, 11], [6, 18, 8]];
  const css = `
    .sln{opacity:0;animation:sln 3s steps(1) infinite}
    @keyframes sln{0%{opacity:0}10%{opacity:1}85%{opacity:1}90%{opacity:0}100%{opacity:0}}
    .scur{animation:scur .8s steps(1) infinite}
    @keyframes scur{50%{opacity:0}}`;
  const body = `${box(2, 2, 26, 25, K)}${box(3, 5, 24, 21, '#0b1110')}${box(3, 3, 24, 2, a)}
    ${dots([[4, 3], [6, 3], [8, 3]], '#ffffff')}
    ${lines.map(([x, y, w], k) => `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${k % 2 ? a : fg}" class="sln" style="animation-delay:${(D + k * 0.3).toFixed(2)}s"/>`).join('')}
    <rect x="4" y="21" width="2" height="2" fill="${a}" class="scur"/>`;
  return { css, body };
}

const SCENES = {
  justplugin, justmic, 'parpar-executor': parpar, 'liam-s-tools': tools, 'liam-vs-zombies': zombies,
  tegriai, lumelyy, paint,
};

// t: tool object; slug: its file slug; opts: { a (accent), D (scene start, s), dark }
export function scene(t, slug, opts) {
  const fn = SCENES[t.scene] ?? SCENES[slug] ?? generic;
  const s = fn(opts);
  return { css: s.css, body: s.body, defs: s.defs ?? '' };
}
