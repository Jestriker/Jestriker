// SECURITY: a friendly IDS console — radar sweep with blips, and a scrolling feed of habits & principles.
// Deliberately playful: no real targets, no vulnerabilities, no claimed certifications.
import { windowChrome, border, txt, px, pxW } from './_small.mjs';

export const id = 'security';

const W = 1200, H = 330;

const FEED = [
  ['PASS', 'least privilege — every token scoped to one job'],
  ['PASS', 'secrets out of repos — .env stays in .gitignore'],
  ['INFO', '2FA everywhere, hardware key where possible'],
  ['BLOCK', 'zombie at :8080 — shambling, no auth header'],
  ['PASS', 'firewall: default deny, open only what ships'],
  ['PASS', 'input validated, output escaped'],
  ['INFO', 'passwords: long, unique, in a manager'],
  ['PASS', 'dependencies pinned & patched'],
  ['BLOCK', 'zombie horde at :25565 — back to the spawn'],
  ['INFO', 'backups: tested, not just taken'],
  ['PASS', 'logs on, alerts routed, noise tuned'],
  ['INFO', 'break your own stuff before someone else does'],
];

export function render(ctx) {
  const { C, MONO, lib } = ctx;
  const u = 'sc';
  const tag = { PASS: C.green, INFO: C.blue, BLOCK: C.red };

  // ── radar ──
  const RX = 178, RY = 180, R = 112, P = 4;
  const rings = [1, 0.66, 0.33].map((f) => `<circle cx="${RX}" cy="${RY}" r="${(R * f).toFixed(1)}" fill="none" stroke="${C.green}" stroke-opacity="${f === 1 ? 0.5 : 0.22}" stroke-width="${f === 1 ? 2 : 1}"/>`).join('');
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const a = (i * 10 * Math.PI) / 180, r0 = R - (i % 3 ? 4 : 9);
    return `<line x1="${(RX + Math.cos(a) * r0).toFixed(1)}" y1="${(RY + Math.sin(a) * r0).toFixed(1)}" x2="${(RX + Math.cos(a) * R).toFixed(1)}" y2="${(RY + Math.sin(a) * R).toFixed(1)}" stroke="${C.green}" stroke-opacity=".4"/>`;
  }).join('');
  // Sweep: a 50° wedge trailing behind a bright leading edge, rotating clockwise from 3 o'clock.
  const wedge = (deg) => {
    const a = (-deg * Math.PI) / 180;
    return `M${RX} ${RY}L${RX + R} ${RY}A${R} ${R} 0 0 0 ${(RX + Math.cos(a) * R).toFixed(1)} ${(RY + Math.sin(a) * R).toFixed(1)}Z`;
  };
  // Blips: [angleDeg (clockwise from 3 o'clock), radius fraction, kind]
  const blips = [[38, 0.55, 'ok'], [112, 0.8, 'ok'], [165, 0.35, 'ok'], [212, 0.72, 'z'], [287, 0.5, 'ok'], [330, 0.85, 'z']];
  const blipSvg = blips.map(([deg, f, k], i) => {
    const a = (deg * Math.PI) / 180;
    const x = Math.round(RX + Math.cos(a) * R * f), y = Math.round(RY + Math.sin(a) * R * f);
    const delay = ((deg / 360) * P).toFixed(2);
    const col = k === 'z' ? C.red : C.green;
    const x_ = k === 'z'
      ? `<path d="M${x - 9} ${y - 9}l18 18M${x + 9} ${y - 9}l-18 18" stroke="${C.red}" stroke-width="2" class="bl${u}" style="animation-delay:${delay}s"/>`
      : '';
    return `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="${col}" class="bl${u}" style="animation-delay:${delay}s"/>` +
      `<rect x="${x - 10}" y="${y - 10}" width="20" height="20" fill="none" stroke="${col}" class="ping${u}" style="animation-delay:${delay}s"/>${x_}`;
  }).join('');

  // ── log feed ──
  const LX = 348, LY = 62, LW = 600, LH = H - LY - 58, LS = 28;
  const N = FEED.length, STEP = 1.3;
  const row = ([k, msg], i, off) => {
    const y = LY + 24 + (i + off) * LS;
    const ts = `t+${String(Math.floor((i * 7) / 60)).padStart(2, '0')}:${String((i * 7 + 3) % 60).padStart(2, '0')}`;
    return `<g>
      ${txt(MONO, LX + 16, y, ts, { size: 13, fill: C.muted })}
      <rect x="${LX + 88}" y="${y - 14}" width="68" height="19" fill="${tag[k]}" fill-opacity="${C.name === 'dark' ? 0.14 : 0.1}"/>
      ${txt(MONO, LX + 122, y, k, { size: 13, fill: tag[k], weight: 700, anchor: 'middle' })}
      ${txt(MONO, LX + 172, y, msg, { size: 15, fill: k === 'BLOCK' ? C.ink : C.text })}
    </g>`;
  };
  const rows = [...FEED.map((f, i) => row(f, i, 0)), ...FEED.map((f, i) => row(f, i, N))].join('');

  const stats = `SHIELDS UP`;
  // ── arena: a zombie shambles at the firewall, bounces off, respawns ──
  const AX0 = LX + LW + 18, AX1 = W - 30, FLOOR = LY + LH;
  const ZS = 4, ZW = 12 * ZS, ZH = 15 * ZS, WALLX = AX0 + 16;
  const zx = AX1 - ZW - 10, zy = FLOOR - ZH - 6, dist = zx - (WALLX + 18);
  const bricks = [];
  for (let r = 0; r * 12 < LH - 8; r++) for (let c = 0; c < 2; c++)
    bricks.push(`<rect x="${WALLX + c * 10 - (r % 2 ? 5 : 0) + (r % 2 && c === 0 ? 5 : 0)}" y="${LY + 6 + r * 12}" width="${r % 2 && c === 0 ? 4 : 9}" height="10" fill="${C.green}" fill-opacity="${0.35 + ((r * 7 + c * 3) % 5) * 0.1}"/>`);
  const arena = `
    <rect x="${AX0}" y="${LY}" width="${AX1 - AX0}" height="${LH}" fill="${C.panel}" stroke="${C.line}"/>
    <line x1="${AX0 + 1}" y1="${FLOOR - 6}" x2="${AX1 - 1}" y2="${FLOOR - 6}" stroke="${C.line}" stroke-width="2" stroke-dasharray="6 4"/>
    <g>${bricks.join('')}</g>
    <rect x="${WALLX - 4}" y="${LY + 2}" width="28" height="${LH - 10}" fill="${C.green}" class="hit${u}"/>
    <g class="zw${u}">
      <g class="fa${u}">${lib.sprite(lib.SPRITES.zombieA, zx, zy, ZS)}</g>
      <g class="fb${u}">${lib.sprite(lib.SPRITES.zombieB, zx, zy, ZS)}</g>
    </g>
    <g class="bk${u}">${px('BLOCKED', WALLX + 34, LY + 26, 2, { fill: C.red })}</g>
    ${txt(MONO, AX1 - 10, LY + LH - 14, ':8080', { size: 12, fill: C.muted, anchor: 'end' })}`;
  const body = `
  <defs>${lib.crtDefs(C, u, W, H)}
    <clipPath id="lc${u}"><rect x="${LX}" y="${LY}" width="${LW}" height="${LH}"/></clipPath>
    <linearGradient id="ft${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg}"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
    <linearGradient id="fb${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg}" stop-opacity="0"/><stop offset="1" stop-color="${C.bg}"/></linearGradient>
    <radialGradient id="rg${u}"><stop offset="0" stop-color="${C.green}" stop-opacity=".10"/><stop offset="1" stop-color="${C.green}" stop-opacity=".02"/></radialGradient>
  </defs>
  <style>
    .bl${u}{opacity:.08;animation:bl${u} ${P}s linear infinite}
    @keyframes bl${u}{0%{opacity:1}55%{opacity:.25}100%{opacity:.08}}
    .ping${u}{opacity:0;animation:ping${u} ${P}s ease-out infinite;transform-box:fill-box;transform-origin:center}
    @keyframes ping${u}{0%{opacity:.9;transform:scale(.4)}25%{opacity:0;transform:scale(1.6)}100%{opacity:0}}
    .feed${u}{animation:feed${u} ${(N * STEP).toFixed(1)}s steps(${N}) infinite}
    @keyframes feed${u}{to{transform:translateY(-${N * LS}px)}}
    .zw${u}{animation:zw${u} 6s linear infinite}
    @keyframes zw${u}{0%{transform:translateX(0);opacity:0}4%{opacity:1}55%{transform:translateX(-${dist}px);animation-timing-function:ease-out}66%{transform:translateX(-${dist - 46}px);opacity:1}80%{transform:translateX(-${dist - 46}px);opacity:0}100%{transform:translateX(0);opacity:0}}
    .fa${u}{animation:fa${u} .5s steps(1) infinite}.fb${u}{animation:fa${u} .5s steps(1) -.25s infinite}
    @keyframes fa${u}{50%{opacity:0}}
    .hit${u}{opacity:0;animation:hit${u} 6s steps(1) infinite}
    @keyframes hit${u}{0%,54%{opacity:0}55%{opacity:.5}57%{opacity:0}59%{opacity:.35}61%,100%{opacity:0}}
    .bk${u}{opacity:0;animation:bk${u} 6s steps(1) infinite}
    @keyframes bk${u}{0%,54%{opacity:0}55%,78%{opacity:1}79%,100%{opacity:0}}
    .led${u}{animation:led${u} 1.2s steps(1) infinite}
    @keyframes led${u}{50%{opacity:.25}}
  </style>
  <g clip-path="url(#screen${u})">
    ${windowChrome(C, MONO, W, H, 'ids@liam — watch --policy=paranoid --mode=friendly')}
    <circle cx="${RX}" cy="${RY}" r="${R}" fill="url(#rg${u})"/>
    ${rings}${ticks}
    <line x1="${RX - R}" y1="${RY}" x2="${RX + R}" y2="${RY}" stroke="${C.green}" stroke-opacity=".18"/>
    <line x1="${RX}" y1="${RY - R}" x2="${RX}" y2="${RY + R}" stroke="${C.green}" stroke-opacity=".18"/>
    <g>
      ${[8, 16, 26, 38, 54].map((d, i) => `<path d="${wedge(d)}" fill="${C.green}" fill-opacity="${C.name === 'dark' ? 0.09 : 0.07}"/>`).join('')}
      <line x1="${RX}" y1="${RY}" x2="${RX + R}" y2="${RY}" stroke="${C.green}" stroke-width="2"/>
      <animateTransform attributeName="transform" type="rotate" from="0 ${RX} ${RY}" to="360 ${RX} ${RY}" dur="${P}s" repeatCount="indefinite"/>
    </g>
    ${blipSvg}
    <rect x="${RX - 3}" y="${RY - 3}" width="6" height="6" fill="${C.green}"/>
    <rect x="${RX - pxW(stats, 2) / 2 - 20}" y="${H - 20}" width="10" height="10" fill="${C.green}" class="led${u}"/>
    ${px(stats, RX - pxW(stats, 2) / 2, H - 22, 2, { fill: C.green })}

    <rect x="${LX}" y="${LY}" width="${LW}" height="${LH}" fill="${C.panel}" stroke="${C.line}"/>
    <g clip-path="url(#lc${u})"><g class="feed${u}">${rows}</g></g>
    <rect x="${LX + 1}" y="${LY + 1}" width="${LW - 2}" height="22" fill="url(#ft${u})"/>
    <rect x="${LX + 1}" y="${LY + LH - 30}" width="${LW - 2}" height="29" fill="url(#fb${u})"/>
    ${arena}
    ${txt(MONO, LX, H - 16, 'policy: paranoid · threats handled: zombies only · no real targets were harmed', { size: 12, fill: C.muted })}
    <g>${['PASS', 'INFO', 'BLOCK'].map((k, i) => `<rect x="${W - 250 + i * 76}" y="${H - 26}" width="10" height="10" fill="${tag[k]}"/>${txt(MONO, W - 236 + i * 76, H - 17, k.toLowerCase(), { size: 12, fill: C.muted })}`).join('')}</g>
    ${lib.crtOverlay(C, u, W, H)}
  </g>
  ${border(C, W, H)}`;
  return {
    'security.svg': lib.svg(W, H, body, 'Security console: least privilege, secrets out of repos, 2FA everywhere, default-deny firewall — zombies blocked'),
    'h-security.svg': lib.header(C, ctx.no('security'), 'SECURITY'),
  };
}

export function readme(ctx) {
  return `<p align="center">${ctx.pic('h-security.svg', 'width="100%" alt="SECURITY"')}</p>
<p align="center">${ctx.pic('security.svg', 'width="100%" alt="A friendly intrusion-detection console: radar sweep plus a feed of habits — least privilege, secrets out of repos, 2FA everywhere, default-deny firewall, tested backups. Only zombies get blocked."')}</p>`;
}
