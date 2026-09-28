// AVATAR — the Liam+ lightning block, alive: glow pulse, shine sweep, crawling arcs and two pixel
// lightning strikes with a screen flash. The 24x24 pixels (scripts/avatar.json) are artwork and
// identical in both themes; only the frame and flash strength adapt to the page behind it.
import { readFileSync } from 'node:fs';

export const id = 'avatar';

const A = JSON.parse(readFileSync(new URL('../avatar.json', import.meta.url), 'utf8'));

function block(ctx) {
  const { C } = ctx;
  const { svg, rng } = ctx.lib;
  const light = C.name === 'light';
  const N = A.size, P = 14, W = N * P, SUB = P / 4, R = P * 2;
  const cells = (want) => {
    const out = [];
    A.kinds.forEach((row, y) => [...row].forEach((k, x) => want(k) && out.push([x, y])));
    return out;
  };
  const rect = ([x, y], fill) => `<rect x="${x * P}" y="${y * P}" width="${P}" height="${P}" fill="${fill ?? A.palette[A.pixels[y][x]]}"/>`;
  const bolt = cells((k) => k === 'B');
  const top = bolt.reduce((a, b) => (b[1] < a[1] ? b : a));

  // Pixel lightning on a 4x finer grid: midpoint displacement, then rasterised to squares.
  const jag = (r, a, b, rough = 0.5, depth = 5) => {
    let pts = [a, b];
    for (let d = 0; d < depth; d++) {
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [p, q] = [pts[i], pts[i + 1]];
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
        const off = (r() - 0.5) * L * rough;
        out.push([(p[0] + q[0]) / 2 - ((q[1] - p[1]) / L) * off, (p[1] + q[1]) / 2 + ((q[0] - p[0]) / L) * off], q);
      }
      pts = out;
    }
    const set = new Set();
    for (let i = 0; i < pts.length - 1; i++) {
      const [[x0, y0], [x1, y1]] = [pts[i], pts[i + 1]];
      const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
      for (let s = 0; s <= n; s++) set.add(`${Math.round(x0 + ((x1 - x0) * s) / n)},${Math.round(y0 + ((y1 - y0) * s) / n)}`);
    }
    return [...set].map((k) => k.split(',').map(Number));
  };
  const strike = (seed, from, to) => {
    const r = rng(seed);
    let pts = jag(r, from, to);
    for (let b = 0; b < 3; b++) {
      const o = pts[Math.floor(pts.length * (0.25 + r() * 0.5))];
      pts = pts.concat(jag(r, o, [o[0] + (r() - 0.5) * 30, o[1] + 8 + r() * 16], 0.7, 3));
    }
    return pts.filter(([x, y]) => x >= 0 && y >= 0 && x < N * 4 && y < N * 4)
      .map(([x, y]) => `<rect x="${x * SUB - SUB / 4}" y="${y * SUB - SUB / 4}" width="${SUB * 1.5}" height="${SUB * 1.5}"/>`).join('');
  };
  const tx = top[0] * 4 + 2, ty = top[1] * 4;
  const hits = [
    { d: strike('a', [tx + 34, -30], [tx, ty]), at: 0.30 },
    { d: strike('b', [-30, N * 0.8], [bolt[20][0] * 4, bolt[20][1] * 4]), at: 0.72 },
  ];
  const T = 6; // seconds per loop
  // Discrete visibility window for a 2-frame strike + 1 afterimage at loop fraction `at`.
  const blink = (at, len = 0.025) => {
    const k = [0, at, at + len, at + len * 1.6, at + len * 2.2, 1].map((v) => Math.min(1, v).toFixed(3));
    return `<animate attributeName="opacity" values="0;1;0;.6;0;0" keyTimes="${k.join(';')}" dur="${T}s" repeatCount="indefinite" calcMode="discrete"/>`;
  };
  const arcs = [0, 1, 2, 3].map((k) => {
    const r = rng(`arc${k}`);
    const outl = cells((c) => c === 'K');
    let [x, y] = outl[Math.floor(r() * outl.length)].map((v) => v * 4 + 2);
    const pts = [];
    let [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][k];
    for (let i = 0; i < 9; i++) {
      pts.push(`<rect x="${x * SUB}" y="${y * SUB}" width="${SUB}" height="${SUB}"/>`);
      if (r() < 0.5) [dx, dy] = r() < 0.5 ? [dy, dx] : [-dy, -dx];
      x += dx || (r() < 0.5 ? 1 : -1); y += dy || (r() < 0.5 ? 1 : -1);
    }
    return `<g opacity="0">${pts.join('')}<animate attributeName="opacity" values="0;1;0;1;0" keyTimes="0;.2;.4;.6;1" dur="${(0.5 + k * 0.17).toFixed(2)}s" begin="${(k * 0.4).toFixed(1)}s" repeatCount="indefinite" calcMode="discrete"/></g>`;
  }).join('');

  // On a white page a full-strength white-out reads as the image blinking off, so it is softened.
  const flashK = light ? 0.7 : 1;
  const flashAt = (at, a0) => {
    const a = +(a0 * flashK).toFixed(3);
    const k = [0, at, at + 0.02, at + 0.05, 1].map((v) => v.toFixed(3));
    return `<rect width="${W}" height="${W}" fill="#fff8e0" opacity="0"><animate attributeName="opacity" values="0;${a};${(a / 3).toFixed(3)};0;0" keyTimes="${k.join(';')}" dur="${T}s" repeatCount="indefinite"/></rect>`;
  };

  // Frame: dark keeps the faint gold rim; light gets a solid amber rim (C.warn) so the block has an
  // edge against white, plus a thin inner gold highlight.
  const frame = light
    ? `<rect x="1.5" y="1.5" width="${W - 3}" height="${W - 3}" rx="${R - 1}" fill="none" stroke="${C.warn}" stroke-opacity=".9" stroke-width="3"/>
  <rect x="4.5" y="4.5" width="${W - 9}" height="${W - 9}" rx="${R - 4}" fill="none" stroke="#ffc43c" stroke-opacity=".3" stroke-width="1.5"/>`
    : `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" rx="${R}" fill="none" stroke="#ffc43c" stroke-opacity=".35" stroke-width="2"/>`;

  const body = `
  <defs>
    <clipPath id="av"><rect width="${W}" height="${W}" rx="${R}"/></clipPath>
    <clipPath id="bc">${bolt.map((c) => rect(c, '#000')).join('')}</clipPath>
    <filter id="g1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${P * 1.3}"/></filter>
    <filter id="g2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${P * 0.5}"/></filter>
    <linearGradient id="sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <style>
    .glow{animation:glow 2.4s ease-in-out infinite}
    @keyframes glow{0%,100%{opacity:.35}50%{opacity:.95}}
    .sh{animation:sh 6s ease-in-out infinite}
    @keyframes sh{0%,55%{transform:translateX(-${W}px)}75%,100%{transform:translateX(${W}px)}}
  </style>
  <g clip-path="url(#av)">
    ${cells((k) => k === '.').map((c) => rect(c)).join('')}
    <rect width="${W}" height="${W}" fill="#000" opacity=".15"/>
    <g class="glow" filter="url(#g1)" fill="#ffc43c">${bolt.map((c) => rect(c, '#ffc43c')).join('')}</g>
    ${cells((k) => k !== '.').map((c) => rect(c)).join('')}
    <g clip-path="url(#bc)"><rect x="0" y="0" width="${W * 0.35}" height="${W}" fill="url(#sh)" transform="skewX(-20)" class="sh"/></g>
    <g fill="#fff6d0" filter="url(#g2)" opacity=".9">${arcs}</g>
    <g fill="#fffbe8">${arcs}</g>
    ${hits.map((h) => flashAt(h.at, h.at < 0.5 ? 0.5 : 0.22)).join('')}
    ${hits.map((h) => `<g opacity="0">${blink(h.at)}<g fill="#ffd45a" filter="url(#g2)">${h.d}</g><g fill="#fffff0">${h.d}</g></g>`).join('')}
    <g opacity="0">${blink(hits[0].at, 0.06)}<g fill="#fff3b0" filter="url(#g1)">${bolt.map((c) => rect(c, '#fff3b0')).join('')}</g></g>
  </g>
  ${frame}`;
  return svg(W, W, body, 'Liam+ — the lightning block');
}

export function render(ctx) {
  return { 'avatar.svg': block(ctx) };
}

export function readme(ctx) {
  return `<p align="center"><a href="https://liam.plus">${ctx.pic('avatar.svg', 'width="150" alt="Liam+ — animated lightning block"')}</a></p>`;
}
