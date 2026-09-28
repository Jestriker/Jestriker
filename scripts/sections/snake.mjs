// SNAKE: decorative divider — a Nokia-style pixel snake whose body spells the project names,
// crawling across on a grid and eating apples / lightning bolts on the way. Loops forever.
import { glyphX } from './_small.mjs';

export const id = 'snake';

const W = 1200, H = 56;
const CELL = 12, TOP = 18, CH = 20;          // body cell: 12x20, letters at 2x scale (10x14)
const INK = '#0b0f0c';                        // letter colour on the (always bright) accent cells

const APPLE = ['...#b..', '..#....', '.rrrrr.', 'rrhrrrr', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..r.r..'];
const BOLT = ['...yyy', '..yyy.', '.yyy..', 'yyyyyy', '...yy.', '..yy..', '.yy...', 'y.....'];

export function render(ctx) {
  const { C, lib } = ctx;
  const u = 'sn';
  const tools = (ctx.tools ?? []).filter((t) => t.name);
  // Build the cell list tail → head: [kind, char, colour]
  const cells = [['tail2'], ['tail1']];
  tools.forEach((t, i) => {
    [...t.name.toUpperCase()].forEach((ch) => cells.push(['ch', ch, t.accent ?? C.green]));
    if (i < tools.length - 1) cells.push(['sep']);
  });
  const HEADW = 18;
  const Ls = cells.length * CELL + HEADW;

  const seg = [];
  cells.forEach(([k, ch, col], i) => {
    const x = i * CELL;
    let inner;
    if (k === 'tail2') inner = `<rect x="${x + 4}" y="${TOP + 7}" width="8" height="6" fill="${C.dim}"/>`;
    else if (k === 'tail1') inner = `<rect x="${x}" y="${TOP + 4}" width="${CELL}" height="12" fill="${C.dim}"/>`;
    else if (k === 'sep') inner = `<rect x="${x}" y="${TOP + 2}" width="${CELL}" height="${CH - 4}" fill="${C.dim}"/><rect x="${x + 4}" y="${TOP + 8}" width="4" height="4" fill="${INK}"/>`;
    else {
      const bits = [];
      glyphX(ch).forEach((row, ry) => [...row].forEach((b, rx) => {
        if (b === '1') bits.push(`M${x + 1 + rx * 2} ${TOP + 3 + ry * 2}h2v2h-2z`);
      }));
      inner = `<rect x="${x}" y="${TOP}" width="${CELL}" height="${CH}" fill="${col}"/>${bits.length ? `<path d="${bits.join('')}" fill="${INK}"/>` : ''}`;
    }
    seg.push(inner);
  });
  // Head: rounded front, eye, flicking tongue.
  const hx = cells.length * CELL;
  seg.push(`<g>
    <rect x="${hx}" y="${TOP - 2}" width="${HEADW - 4}" height="${CH + 4}" fill="${C.green}"/>
    <rect x="${hx + HEADW - 4}" y="${TOP + 2}" width="4" height="${CH - 4}" fill="${C.green}"/>
    <rect x="${hx + 8}" y="${TOP + 2}" width="4" height="4" fill="${INK}"/>
    <rect x="${hx + 8}" y="${TOP + 14}" width="4" height="4" fill="${INK}"/>
    <g class="tg${u}"><rect x="${hx + HEADW}" y="${TOP + 9}" width="6" height="2" fill="${C.red}"/><rect x="${hx + HEADW + 6}" y="${TOP + 7}" width="2" height="2" fill="${C.red}"/><rect x="${hx + HEADW + 6}" y="${TOP + 11}" width="2" height="2" fill="${C.red}"/></g>
  </g>`);

  // Motion: translate from fully off-screen left to fully off-screen right on a 6px grid.
  const STEP = 6, SPS = 14;                      // 6px per step, 14 steps per second
  const dist = W + Ls + 24;
  const steps = Math.round(dist / STEP);
  const D = steps / SPS;
  const pct = (t) => ((t / D) * 100).toFixed(2);

  // Food: alternating apples and bolts; vanish when the head arrives, respawn after the tail has passed.
  const pal = { r: C.red, h: '#ffffff', b: '#7a4a1a', '#': '#3f7d2a', y: C.warn };
  const foods = [220, 520, 800, 1080].map((fx, i) => {
    const art = i % 2 ? BOLT : APPLE;
    const fy = TOP + 1;
    const rects = [];
    art.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== '.') rects.push(`<rect x="${fx + x * 3}" y="${fy + y * 3 - 3}" width="3" height="3" fill="${pal[c]}"/>`);
    }));
    const tEat = (fx - 4) / (dist / D);          // head front reaches food
    const tBack = (fx + 30 + Ls) / (dist / D);   // tail has passed
    const pe = pct(tEat), pr = pct(Math.min(tBack, D * 0.995));
    const burst = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.3], [0, 1.3]].map(([dx, dy], k) =>
      `<rect x="${fx + 8}" y="${TOP + 8}" width="4" height="4" fill="${i % 2 ? C.warn : C.red}" class="bu${u}${i}" style="--dx:${dx * 16}px;--dy:${dy * 12}px"/>`).join('');
    return `<style>
      .fd${u}${i}{animation:fd${u}${i} ${D.toFixed(2)}s steps(1) infinite}
      @keyframes fd${u}${i}{0%{opacity:1}${pe}%{opacity:0}${pr}%{opacity:1}100%{opacity:1}}
      .bu${u}${i}{opacity:0;animation:bu${u}${i} ${D.toFixed(2)}s linear infinite}
      @keyframes bu${u}${i}{0%,${pe}%{opacity:0;transform:none}${(+pe + 0.01).toFixed(2)}%{opacity:1;transform:none}${(+pe + 1.6).toFixed(2)}%{opacity:0;transform:translate(var(--dx),var(--dy))}100%{opacity:0}}
    </style><g class="fd${u}${i}"><g class="bob${u}" style="animation-delay:${(-i * 0.3).toFixed(1)}s">${rects.join('')}</g></g>${burst}`;
  }).join('');

  const body = `
  <style>
    .mv${u}{animation:mv${u} ${D.toFixed(2)}s steps(${steps}) infinite}
    @keyframes mv${u}{from{transform:translateX(-${Ls + 12}px)}to{transform:translateX(${W + 12}px)}}
    .tg${u}{animation:tg${u} .7s steps(1) infinite}
    @keyframes tg${u}{50%{opacity:0}}
    .bob${u}{animation:bob${u} 1.2s steps(1) infinite}
    @keyframes bob${u}{50%{transform:translateY(-2px)}}
  </style>
  <line x1="0" y1="${TOP + CH + 8}" x2="${W}" y2="${TOP + CH + 8}" stroke="${C.green}" stroke-opacity=".25" stroke-width="2" stroke-dasharray="2 10"/>
  ${foods}
  <g class="mv${u}">${seg.join('')}</g>`;
  return { 'snake.svg': lib.svg(W, H, body, `Divider: a pixel snake spelling ${tools.map((t) => t.name).join(', ')}`) };
}

export function readme(ctx) {
  return `<p align="center">${ctx.pic('snake.svg', 'width="100%" alt="A pixel snake spelling project names crawls across the page"')}</p>`;
}
