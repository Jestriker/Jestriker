// NOW: what's on the bench right now — two animated "build in progress" panels (TeGriAi, Lumelyy).
import { border, txt, toolSprite, px, pxW, wrap, findTool } from './_small.mjs';

export const id = 'now';

const W = 580, H = 220;
const PICKS = ['TeGriAi', 'Lumelyy'];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function panel(ctx, tool, k) {
  const { C, MONO, lib } = ctx;
  const A = tool.accent ?? C.green;
  const u = `nw${k}`;
  const S = 6, IX = 26, IY = 44, IW = 16 * S;
  const name = tool.name.toUpperCase();
  const lines = wrap(tool.tagline ?? '', 50).slice(0, 3);
  const host = String(tool.url ?? '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const TX = IX + IW + 28;
  // Indeterminate progress bar made of pixel cells, a lit "comet" sweeping through them.
  const BX = TX, BY = 168, CELLS = 25, CW = 12, BW = CELLS * CW;
  const cells = Array.from({ length: CELLS }, (_, i) =>
    `<rect x="${BX + i * CW + 1}" y="${BY + 1}" width="${CW - 2}" height="12" fill="${A}" class="cell${u}" style="animation-delay:${(i * 0.08 - 2.4 + k * 0.9).toFixed(2)}s"/>`).join('');
  const d = (i) => (0.15 + i * 0.012);

  const body = `
  <defs>${lib.crtDefs(C, u, W, H)}
    <linearGradient id="bg${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${A}" stop-opacity=".13"/><stop offset=".65" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
    <clipPath id="ic${u}"><rect x="${IX}" y="${IY}" width="${IW}" height="${IW}"/></clipPath>
  </defs>
  <style>
    .ip${u}{opacity:0;animation:ip${u} .25s steps(2) forwards}
    @keyframes ip${u}{to{opacity:1}}
    .cell${u}{opacity:.12;animation:cell${u} 2.4s linear infinite}
    @keyframes cell${u}{0%{opacity:1}35%{opacity:.12}100%{opacity:.12}}
    .led${u}{animation:led${u} 1.1s steps(1) infinite}
    @keyframes led${u}{50%{opacity:.2}}
    .scan${u}{animation:scan${u} 3.2s linear infinite}
    @keyframes scan${u}{0%{transform:translateY(0)}100%{transform:translateY(${IW}px)}}
    .fd${u}{opacity:0;animation:ip${u} .3s ease-out forwards}
  </style>
  <g clip-path="url(#screen${u})">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#bg${u})"/>
    ${txt(MONO, 26, 28, `~/now/${slug(tool.name)}`, { size: 12, fill: C.muted })}
    <rect x="${W - 26 - pxW('IN PROGRESS', 2) - 22}" y="16" width="12" height="12" fill="${C.warn}" class="led${u}"/>
    ${px('IN PROGRESS', W - 26 - pxW('IN PROGRESS', 2), 15, 2, { fill: C.warn })}
    <rect x="${IX - 6}" y="${IY - 6}" width="${IW + 12}" height="${IW + 12}" fill="${C.shade}" fill-opacity="${C.name === 'dark' ? 0.5 : 0.06}" stroke="${A}" stroke-opacity=".45"/>
    <g clip-path="url(#ic${u})">
      ${toolSprite(tool.sprite, IX, IY, S, `ip${u}`, (x, y) => d(x + y))}
      <rect x="${IX}" y="${IY - 6}" width="${IW}" height="3" fill="${A}" opacity=".55" class="scan${u}"/>
    </g>
    ${px(name, TX, 46, 4, { fill: A })}
    ${lines.map((l, i) => txt(MONO, TX, 94 + i * 20, l, { size: 13, fill: C.text, cls: `fd${u}`, style: `animation-delay:${(0.5 + i * 0.12).toFixed(2)}s` })).join('\n    ')}
    ${txt(MONO, IX, IY + IW + 30, host, { size: 12, fill: A })}
    <rect x="${BX - 3}" y="${BY - 3}" width="${BW + 6}" height="20" fill="none" stroke="${C.line}" stroke-width="2"/>
    ${cells}
    <text x="${BX + BW + 14}" y="${BY + 12}" font-family="${MONO}" font-size="12" fill="${C.muted}">building<tspan>.</tspan><tspan opacity="0">.<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.33;.99;1" dur="1.5s" repeatCount="indefinite" calcMode="discrete"/></tspan><tspan opacity="0">.<animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.66;.99;1" dur="1.5s" repeatCount="indefinite" calcMode="discrete"/></tspan></text>
    ${lib.crtOverlay(C, u, W, H)}
  </g>
  ${border(C, W, H, A, 0.35)}`;
  return lib.svg(W, H, body, `Now building: ${tool.name} — ${tool.tagline ?? ''}`);
}

export function render(ctx) {
  const out = { 'h-now.svg': ctx.lib.header(ctx.C, ctx.no('now'), 'NOW') };
  PICKS.forEach((n, k) => {
    const t = findTool(ctx.tools ?? [], n);
    if (t) out[`now/${slug(t.name)}.svg`] = panel(ctx, t, k);
  });
  return out;
}

export function readme(ctx) {
  const items = PICKS.map((n) => findTool(ctx.tools ?? [], n)).filter(Boolean);
  if (!items.length) return '';
  const cards = items.map((t) =>
    `<a href="${t.url}">${ctx.pic(`now/${slug(t.name)}.svg`, `width="49%" alt="${t.name} (in progress): ${String(t.tagline ?? '').replace(/"/g, '&quot;')}"`)}</a>`).join('\n');
  return `<p align="center">${ctx.pic('h-now.svg', 'width="100%" alt="NOW"')}</p>
<p align="center">
${cards}
</p>`;
}
