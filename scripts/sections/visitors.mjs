// Arcade "PLAYERS" view counter.
// A static SVG can't count views, so the number comes from komarev.com's GitHub Profile Views Counter
// (https://github.com/antonkomarev/github-profile-views-counter): free, open source, no cookies/JS, stores
// only a per-username counter. GitHub proxies README images through camo, so visitor IPs never reach it.
// We draw our own pixel "PLAYERS" marquee (both themes) and style the badge to sit flush next to it.

export const id = 'visitors';

const USER = 'Jestriker';
const H = 28; // == komarev "for-the-badge" height, so the two images line up

// Badge colours can't follow prefers-color-scheme (GitHub serves one image), so pick a green that reads
// with the badge's white text on both page backgrounds.
export const counterUrl = (color = '1a7a4a') =>
  `https://komarev.com/ghpvc/?username=${USER}&style=for-the-badge&color=${color}&label=P1`;

// 7x7 coin, two frames for a flip.
const COIN = ['..###..', '.#@@@#.', '#@@#@@#', '#@@#@@#', '#@@#@@#', '.#@@@#.', '..###..'];
const COIN_EDGE = ['...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...'];

function px(lib, text, x0, y0, s, fill) {
  const out = [];
  [...text].forEach((ch, ci) => {
    const gx = x0 + ci * 6 * s;
    lib.glyph(ch).forEach((row, ry) => {
      for (const m of row.matchAll(/1+/g)) out.push(`<rect x="${gx + m.index * s}" y="${y0 + ry * s}" width="${m[0].length * s}" height="${s}"/>`);
    });
  });
  return `<g fill="${fill}">${out.join('')}</g>`;
}

const grid = (rows, x0, y0, s, map) => rows.flatMap((r, y) => [...r].map((c, x) =>
  map[c] ? `<rect x="${x0 + x * s}" y="${y0 + y * s}" width="${s}" height="${s}" fill="${map[c]}"/>` : '')).join('');

export function render(ctx) {
  const { C, lib } = ctx;
  const s = 3, label = 'PLAYERS';
  const coinX = 8, textX = coinX + 21 + 10, tw = lib.textWidth(label, s);
  const arrowX = textX + tw + 10;
  const W = arrowX + 15 + 8;
  const y0 = (H - 7 * s) / 2 | 0; // 3
  const coinMap = { '#': C.warn, '@': C.name === 'dark' ? '#ffe08a' : '#e0b040' };
  const body = `
  <style>
    .vcA{animation:vcf 1.2s steps(1) infinite}
    @keyframes vcf{80%{opacity:0}}
    .vcB{opacity:0;animation:vcg 1.2s steps(1) infinite}
    @keyframes vcg{80%{opacity:1}}
    .vcar{animation:vcn .8s steps(2) infinite}
    @keyframes vcn{to{transform:translateX(6px)}}
  </style>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="${C.bg}" stroke="${C.line}"/>
  <g class="vcA">${grid(COIN, coinX, y0, s, coinMap)}</g>
  <g class="vcB">${grid(COIN_EDGE, coinX, y0, s, coinMap)}</g>
  ${px(lib, label, textX, y0, s, C.green)}
  <g class="vcar">${px(lib, '>', arrowX - 3, y0, s, C.red)}</g>`;
  return { 'visitors.svg': lib.svg(W, H, body, 'Players') };
}

export function readme(ctx) {
  return `<p align="center">${ctx.pic('visitors.svg', `height="${H}" alt="PLAYERS"`)}<img src="${counterUrl()}" height="${H}" alt="profile views"/></p>`;
}
