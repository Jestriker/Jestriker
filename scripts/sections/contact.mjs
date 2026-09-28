// SAY HI: one pixel contact card — Discord handle only.
import { border, txt, px, pxW } from './_small.mjs';

export const id = 'contact';

const W = 760, H = 210;
const HANDLE = '@justme.png';

// Generic pixel speech bubble (not any brand's logo). '#' = outline/fill, '.' = empty.
const BUBBLE = [
  '..##############..',
  '.################.',
  '##################',
  '##################',
  '##################',
  '##################',
  '##################',
  '##################',
  '##################',
  '.################.',
  '..#######.........',
  '..#####...........',
  '..###.............',
  '..#...............',
];

export function render(ctx) {
  const { C, MONO, lib } = ctx;
  const u = 'ct';
  const S = 7, BX = 40, BY = 48;
  const bubble = [];
  BUBBLE.forEach((r, y) => [...r].forEach((c, x) => {
    if (c === '#') bubble.push(`<rect x="${BX + x * S}" y="${BY + y * S}" width="${S}" height="${S}"/>`);
  }));
  // Three typing dots inside the bubble (2x2 cells each).
  const dots = [3, 8, 13].map((cx, i) =>
    `<rect x="${BX + cx * S}" y="${BY + 4 * S}" width="${2 * S}" height="${2 * S}" fill="${C.bg}" class="dot${u}" style="animation-delay:${(i * 0.18).toFixed(2)}s"/>`).join('');

  const TX = 232, CW = 44 * 0.6;
  const label = 'SAY HI ON DISCORD';
  const body = `
  <defs>${lib.crtDefs(C, u, W, H)}
    <linearGradient id="bg${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.green}" stop-opacity=".12"/><stop offset=".7" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
  </defs>
  <style>
    .dot${u}{animation:dot${u} 1.2s steps(1) infinite}
    @keyframes dot${u}{0%,40%{transform:translateY(0)}20%{transform:translateY(-${S}px)}}
    .bob${u}{animation:bob${u} 2.4s steps(2) infinite}
    @keyframes bob${u}{50%{transform:translateY(-4px)}}
    .run${u}{animation:run${u} 6s linear infinite}
    @keyframes run${u}{to{stroke-dashoffset:-${2 * (W + H - 4)}}}
    .blink${u}{animation:blink${u} 1s steps(1) infinite}
    @keyframes blink${u}{50%{opacity:0}}
  </style>
  <g clip-path="url(#screen${u})">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#bg${u})"/>
    <g class="bob${u}">
      <g fill="${C.green}" opacity=".25" transform="translate(6 6)">${bubble.join('')}</g>
      <g fill="${C.green}">${bubble.join('')}</g>
      ${dots}
    </g>
    ${px(label, TX, 50, 2, { fill: C.muted })}
    <clipPath id="th${u}"><rect x="${TX}" y="70" width="0" height="64">
      <animate attributeName="width" values="${Array.from({ length: HANDLE.length + 1 }, (_, i) => (i * CW).toFixed(1)).join(';')}" dur="${(HANDLE.length / 12).toFixed(2)}s" begin="0.4s" calcMode="discrete" fill="freeze"/></rect></clipPath>
    <text x="${TX}" y="118" font-family="${MONO}" font-size="44" font-weight="700" fill="${C.ink}" textLength="${(HANDLE.length * CW - 4).toFixed(1)}" lengthAdjust="spacing" clip-path="url(#th${u})">${HANDLE}</text>
    <rect x="${TX + HANDLE.length * CW + 6}" y="84" width="22" height="40" fill="${C.green}" class="blink${u}"/>
    <line x1="${TX}" y1="140" x2="${W - 40}" y2="140" stroke="${C.line}" stroke-width="2" stroke-dasharray="4 6"/>
    ${txt(MONO, TX, 168, '> open a DM and say hi — security, networks,', { size: 16, fill: C.text })}
    ${txt(MONO, TX, 192, '  game servers, or whatever you are building.', { size: 16, fill: C.text })}
    ${lib.crtOverlay(C, u, W, H)}
  </g>
  ${border(C, W, H, C.green, 0.25)}
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="15" fill="none" stroke="${C.green}" stroke-width="3" stroke-dasharray="80 ${2 * (W + H) - 80}" class="run${u}"/>`;
  return {
    'contact.svg': lib.svg(W, H, body, `Say hi on Discord: ${HANDLE}`),
    'h-contact.svg': lib.header(C, ctx.no('contact'), 'SAY HI'),
  };
}

export function readme(ctx) {
  return `<p align="center">${ctx.pic('h-contact.svg', 'width="100%" alt="SAY HI"')}</p>
<p align="center">${ctx.pic('contact.svg', `width="64%" alt="Say hi on Discord: ${HANDLE}"`)}</p>`;
}
