// 3D pixel-art activity chart: the last 53 weeks of commits as an isometric voxel city.
// Data: real per-day commit counts (see _activity-data.mjs). Heights use a log curve so light days
// still read as buildings and busy days tower; colours use 5 GitHub-style intensity levels.

import { loadActivity, ilDay } from './_activity-data.mjs';

export const id = 'activity';

export async function data(env) {
  try { return await loadActivity(env); }
  catch (e) { console.warn(`  ! activity data: ${e.message}`); return { days: {}, today: ilDay(env.now ?? new Date()) }; }
}

// ───────────────────────── stats ─────────────────────────

const DAY = 864e5;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function summarize(act, now) {
  const days = act?.days ?? {};
  const today = ilDay(now);
  const t0 = Date.parse(`${today}T00:00:00Z`);
  const dow = new Date(t0).getUTCDay();
  const start = t0 - (dow + 52 * 7) * DAY;               // Sunday, 52 weeks before this week's Sunday
  const cells = [];
  for (let w = 0; w < 53; w++)
    for (let d = 0; d < 7; d++) {
      const t = start + (w * 7 + d) * DAY;
      if (t > t0) continue;
      const date = iso(t);
      cells.push({ w, d, date, n: +days[date] || 0 });
    }
  // "last year" = the last 365 days, like GitHub's headline.
  const yearFrom = iso(t0 - 364 * DAY);
  const year = cells.filter((c) => c.date >= yearFrom);
  const total = year.reduce((s, c) => s + c.n, 0);
  const active = year.filter((c) => c.n > 0).length;
  let longest = 0, run = 0;
  for (const c of year) { run = c.n > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  const busiest = year.reduce((b, c) => (c.n > (b?.n ?? 0) ? c : b), null);
  return { cells, total, active, longest, busiest, today, empty: total === 0 };
}

// ───────────────────────── pixel helpers ─────────────────────────

// Pixel text / sprite as one <path> per colour, with horizontal runs merged — far smaller than a rect per pixel.
function textPath(glyph, text, x0, y0, s, gap = 1) {
  let d = '';
  [...text].forEach((ch, i) => {
    glyph(ch).forEach((row, ry) => {
      let rx = 0;
      while (rx < 5) {
        if (row[rx] !== '1') { rx++; continue; }
        let e = rx;
        while (e < 5 && row[e] === '1') e++;
        d += `M${x0 + (i * (5 + gap) + rx) * s} ${y0 + ry * s}h${(e - rx) * s}v${s}h${-(e - rx) * s}z`;
        rx = e;
      }
    });
  });
  return d;
}

function spritePaths(rows, x0, y0, s, pal) {
  const by = {};
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === '.' || !pal[c]) { x++; continue; }
      let e = x;
      while (e < row.length && row[e] === c) e++;
      by[c] = (by[c] ?? '') + `M${x0 + x * s} ${y0 + y * s}h${(e - x) * s}v${s}h${-(e - x) * s}z`;
      x = e;
    }
  });
  return Object.entries(by).map(([c, d]) => `<path fill="${pal[c]}" d="${d}"/>`).join('');
}

// ───────────────────────── palettes (chart content, per theme) ─────────────────────────

const SHADES = {
  // [top, front, left] for levels 0..4
  dark: [
    ['#14261c', '#0e1c15', '#0b1610'],
    ['#0f5c34', '#0b4428', '#08331e'],
    ['#14934f', '#0f713c', '#0b532c'],
    ['#1ccb6c', '#159e53', '#10763e'],
    ['#3dffa0', '#22d078', '#189a58'],
  ],
  light: [
    ['#e2e9e5', '#cfd9d3', '#bfcac3'],
    ['#9be9a8', '#79cf88', '#62b772'],
    ['#40c463', '#31a24f', '#26853f'],
    ['#30a14e', '#237f3c', '#1a652f'],
    ['#216e39', '#17542a', '#10401f'],
  ],
};

// ───────────────────────── render ─────────────────────────

export function render(ctx) {
  const { C, lib } = ctx;
  const S = summarize(ctx.data?.activity, ctx.now ?? new Date());
  const dark = C.name === 'dark';
  const P = SHADES[dark ? 'dark' : 'light'];
  const W = 1200, H = 392;
  const OX = 184, OY = 338;                 // screen position of ground corner (week 0, front row)
  const E1 = [16, -4], E2 = [-10, -5];      // one week / one day step
  const HMAX = 84, HMIN = 8;
  const pt = (u, v, z = 0) => [OX + E1[0] * u + E2[0] * v, OY + E1[1] * u + E2[1] * v - z];
  const r1 = (n) => Math.round(n * 10) / 10;

  // Levels (GitHub-style quartiles of non-zero days) and heights (log curve, even pixels).
  const nz = S.cells.filter((c) => c.n > 0).map((c) => c.n).sort((a, b) => a - b);
  const q = (p) => nz.length ? nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] : 1;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  const nmax = Math.max(2, nz[nz.length - 1] ?? 2);
  const level = (n) => (n <= 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4);
  const height = (n) => (n <= 0 ? 2 : 2 * Math.round((HMIN + (HMAX - HMIN) * Math.log(n) / Math.log(nmax)) / 2));

  // Window patterns, one per day-row and face, skewed to the face slope and phased to the building base.
  const lit = dark ? `fill="${C.ink}" fill-opacity=".5"` : `fill="${C.panel}" fill-opacity=".55"`;
  const off = `fill="${C.shade}" fill-opacity="${dark ? 0.35 : 0.18}"`;
  const win = (x, y, on) => `<rect x="${x}" y="${y}" width="2" height="2" ${on ? lit : off}/>`;
  const FRONT = [[1, 0, 1], [1, 1, 0], [0, 1, 1]];     // 3 floors × 3 windows (tile repeats)
  const LEFT = [[1, 0], [0, 1]];
  let pats = '';
  for (let vi = 0; vi < 7; vi++) {
    const fx = OX + E2[0] * vi;
    pats += `<pattern id="awf${vi}" patternUnits="userSpaceOnUse" x="${fx}" y="${r1(OY + OX / 4 - 7.5 * vi)}" width="12" height="18" patternTransform="skewY(-14.0362)">${
      FRONT.map((row, fl) => row.map((on, k) => win(1 + 4 * k, 1 + 6 * fl, on)).join('')).join('')}</pattern>`;
    pats += `<pattern id="awl${vi}" patternUnits="userSpaceOnUse" x="${fx - 8}" y="${OY - OX / 2}" width="8" height="12" patternTransform="skewY(26.5651)">${
      LEFT.map((row, fl) => row.map((on, k) => win(1 + 4 * k, 1 + 6 * fl, on)).join('')).join('')}</pattern>`;
  }

  // Buildings, painted back-to-front.
  const todayCell = S.cells[S.cells.length - 1];
  // Lower rows/weeks occlude higher ones (we see the front and left faces), so draw those last.
  const order = [...S.cells].sort((a, b) => a.d - b.d || b.w - a.w);
  let city = '';
  let todayTop = null;
  for (const c of order) {
    const vi = 6 - c.d;                       // Sunday at the back, like GitHub's top row
    const [ax, ay] = pt(c.w, vi);
    const h = height(c.n), L = level(c.n);
    const body =
      `<path class="l${L}" d="M${ax} ${ay}l-8 -4v${-h}l8 4z"/>` +
      `<path class="f${L}" d="M${ax} ${ay}l12 -3v${-h}l-12 3z"/>` +
      (h >= HMIN ? `<path fill="url(#awl${vi})" d="M${ax} ${ay}l-8 -4v${-(h - 3)}l8 4z"/><path fill="url(#awf${vi})" d="M${ax} ${ay}l12 -3v${-(h - 3)}l-12 3z"/>` : '') +
      `<path class="t${L}" d="M${ax} ${ay - h}l12 -3l-8 -4l-12 3z"/>`;
    city += `<g class="b w${c.w}">${body}</g>`;
    if (c === todayCell) todayTop = { ax, ay, h };
  }

  // Diorama base: platform with a street in front, where Liam walks.
  const U0 = -0.7, U1 = 53.5, V0 = -2.6, V1 = 7.3, TH = 8;
  const corner = (u, v) => pt(u, v).map(r1);
  const [p00, p10, p11, p01] = [corner(U0, V0), corner(U1, V0), corner(U1, V1), corner(U0, V1)];
  const poly = (pts) => `M${pts.map((p) => p.join(' ')).join('L')}z`;
  const platform =
    `<path fill="${C.panel}" stroke="${C.line}" d="${poly([p00, p10, p11, p01])}"/>` +
    `<path fill="${C.line}" d="${poly([p00, p10, [p10[0], p10[1] + TH], [p00[0], p00[1] + TH]])}"/>` +
    `<path fill="${C.line}" fill-opacity=".7" d="${poly([p00, p01, [p01[0], p01[1] + TH], [p00[0], p00[1] + TH]])}"/>` +
    `<path fill="${C.shade}" fill-opacity="${dark ? 0.35 : 0.06}" d="${poly([corner(U0 + 0.3, -2.2), corner(U1 - 0.3, -2.2), corner(U1 - 0.3, -0.35), corner(U0 + 0.3, -0.35)])}"/>` +
    `<path stroke="${C.dim}" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="6 6" class="road" d="M${corner(U0 + 0.4, -1.28).join(' ')}L${corner(U1 - 0.4, -1.28).join(' ')}"/>`;

  // Month labels along the front edge of the base.
  let months = '';
  let prev = -1;
  for (let w = 0; w < 53; w++) {
    const m = +S.cells.find((c) => c.w === w)?.date.slice(5, 7) - 1;
    if (m !== prev && w > 0 && w < 52) {
      const [x, y] = pt(w + 0.1, V0);
      months += textPath(lib.glyph, MONTHS[m], Math.round(x), Math.round(y + TH + 6), 2);
    }
    prev = m;
  }

  // Scan beam sweeping along the weeks (synced with a brightness wave on the roofs).
  const beamH = 150;
  const [b0, b1] = [pt(0, V0 + 0.3), pt(0, V1 - 0.2)].map((p) => p.map(r1));
  const sweep = pt(53, 0).map((v, i) => r1(v - [OX, OY][i]));
  const beam = `<g class="beam">
    <path fill="url(#abeam)" d="M${b0[0]} ${b0[1]}L${b1[0]} ${b1[1]}l0 ${-beamH}L${b0[0]} ${b0[1] - beamH}z"/>
    <path stroke="${C.green}" stroke-width="2" d="M${b0[0]} ${b0[1]}L${b1[0]} ${b1[1]}"/></g>`;

  // Today: pulsing roof + a Minecraft-style beacon beam rising from it, labelled TODAY.
  let today = '';
  if (todayTop) {
    const { ax, ay, h } = todayTop;
    const bx = ax + 1, by = ay - h - 4, top = 18;
    today = `<path class="pulse" fill="${C.ink}" d="M${ax} ${ay - h}l12 -3l-8 -4l-12 3z"/>
      <g class="beacon"><rect x="${bx - 3}" y="${top}" width="8" height="${by - top}" fill="url(#abeacon)" opacity=".35"/>
      <rect x="${bx}" y="${top}" width="2" height="${by - top}" fill="url(#abeacon)"/></g>
      <g class="tag"><path fill="${C.green}" d="M${bx + 10} ${top + 2}h4v4h-4z${textPath(lib.glyph, 'TODAY', bx + 20, top - 1, 2)}"/>
      <text x="${bx + 20}" y="${top + 28}" font-family="${ctx.MONO}" font-size="11" fill="${C.muted}">${todayCell.n} commit${todayCell.n === 1 ? '' : 's'}</text></g>`;
  }

  // Liam walking the street, a zombie shambling after him.
  const SP = { K: dark ? '#0b0f0c' : '#1a2420', H: '#1f2937', S: '#f1c9a5', G: C.green, B: dark ? '#16a34a' : '#15803d', P: '#334155', Z: '#7fae6a', R: '#ff3355', T: '#5b4a3a' };
  const walkFrom = pt(-1.5, -1.28).map(r1), walkTo = pt(54.5, -1.28).map(r1);
  const walker = (a, b, cls) => `<g class="${cls}"><g class="fa">${spritePaths(lib.SPRITES[a], -12, -30, 2, SP)}</g><g class="fb">${spritePaths(lib.SPRITES[b], -12, -30, 2, SP)}</g></g>`;
  const walkers = `${walker('zombieA', 'zombieB', 'walk z')}${walker('liamA', 'liamB', 'walk')}`;

  // Title + stats.
  const ink = C.ink;
  const num = String(S.total);
  const titleS = 5;
  const numW = lib.textWidth(num, titleS);
  const title = `<g class="in">
    <path fill="${C.green}"${dark ? ' filter="url(#aglow)"' : ''} d="${textPath(lib.glyph, num, 40, 36, titleS)}"/>
    <path fill="${ink}" d="${textPath(lib.glyph, 'COMMITS', 40 + numW + 20, 36, titleS)}"/>
    <path fill="${C.muted}" d="${textPath(lib.glyph, 'IN THE LAST YEAR', 42, 36 + 7 * titleS + 14, 2)}"/></g>`;

  const busy = S.busiest ? `${MONTHS[+S.busiest.date.slice(5, 7) - 1]} ${+S.busiest.date.slice(8, 10)}` : '—';
  const stats = [
    ['ACTIVE DAYS', String(S.active), ''],
    ['LONGEST STREAK', String(S.longest), S.longest === 1 ? 'DAY' : 'DAYS'],
    ['BUSIEST DAY', String(S.busiest?.n ?? 0), busy],
  ];
  const sx = 800, sy = 244, sw = 128;
  const statBlock = stats.map(([label, value, unit], k) => {
    const x = sx + k * sw;
    return `<g class="in" style="animation-delay:${(2.2 + k * 0.15).toFixed(2)}s">
      ${k ? `<path stroke="${C.line}" stroke-dasharray="2 4" d="M${x - 14} ${sy - 4}v74"/>` : ''}
      <path fill="${C.green}" d="${textPath(lib.glyph, value, x, sy + 8, 4)}"/>
      ${unit ? `<text x="${x + lib.textWidth(value, 4) + 6}" y="${sy + 36}" font-family="${ctx.MONO}" font-size="11" fill="${C.muted}">${lib.esc(unit)}</text>` : ''}
      <text x="${x}" y="${sy + 62}" font-family="${ctx.MONO}" font-size="11" letter-spacing="1.5" fill="${C.muted}">${lib.esc(label)}</text></g>`;
  }).join('');

  // Legend: less → more, as tiny voxels.
  const legend = `<g class="in" style="animation-delay:2.6s">
    <text x="${sx}" y="${H - 22}" font-family="${ctx.MONO}" font-size="11" letter-spacing="1.5" fill="${C.muted}">LESS</text>
    ${[0, 1, 2, 3, 4].map((L, k) => {
      const x = sx + 50 + k * 20, y = H - 20, h = [2, 5, 8, 11, 14][k];
      return `<path class="l${L}" d="M${x} ${y}l-8 -4v${-h}l8 4z"/><path class="f${L}" d="M${x} ${y}l12 -3v${-h}l-12 3z"/><path class="t${L}" d="M${x} ${y - h}l12 -3l-8 -4l-12 3z"/>`;
    }).join('')}
    <text x="${sx + 50 + 5 * 20 - 2}" y="${H - 22}" font-family="${ctx.MONO}" font-size="11" letter-spacing="1.5" fill="${C.muted}">MORE</text></g>`;

  // Timings.
  const riseAt = 0.3, perWeek = 0.035;
  const scanAt = riseAt + 53 * perWeek + 1.2, scanDur = 2.4, cycle = 8;
  const wk = Array.from({ length: 53 }, (_, w) =>
    `.w${w}{animation-delay:${(riseAt + w * perWeek).toFixed(3)}s,${(scanAt + (w / 53) * scanDur).toFixed(3)}s}`).join('');
  const pct = (s) => ((s / cycle) * 100).toFixed(2);
  const levelCss = P.map(([t, f, l], L) => `.t${L}{fill:${t}}.f${L}{fill:${f}}.l${L}{fill:${l}}`).join('');

  const css = `
    ${levelCss}
    .b{transform-box:fill-box;transform-origin:50% 100%;animation:rise .7s cubic-bezier(.2,1.4,.5,1) both,glint ${cycle}s linear infinite}
    @keyframes rise{from{transform:scaleY(0)}to{transform:scaleY(1)}}
    @keyframes glint{0%,100%{opacity:1}1.5%{opacity:.55}4%{opacity:1}}
    ${wk}
    .beam{opacity:0;animation:beam ${cycle}s linear ${scanAt.toFixed(2)}s infinite}
    @keyframes beam{0%{opacity:0;transform:translate(0,0)}2%{opacity:1}${pct(scanDur - 0.1)}%{opacity:1}${pct(scanDur)}%{opacity:0;transform:translate(${sweep[0]}px,${sweep[1]}px)}100%{opacity:0;transform:translate(${sweep[0]}px,${sweep[1]}px)}}
    .pulse{animation:pulse 1.4s ease-in-out ${(riseAt + 53 * perWeek + 0.6).toFixed(2)}s infinite both;opacity:0}
    @keyframes pulse{0%,100%{opacity:0}50%{opacity:${dark ? 0.75 : 0.6}}}
    .beacon{transform-box:fill-box;transform-origin:50% 100%;animation:grow .6s ease-out ${(riseAt + 53 * perWeek + 0.5).toFixed(2)}s both,beacon 1.4s ease-in-out ${(riseAt + 53 * perWeek + 1.1).toFixed(2)}s infinite}
    @keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
    @keyframes beacon{0%,100%{opacity:1}50%{opacity:.45}}
    .tag{opacity:0;animation:in .3s ease-out ${(riseAt + 53 * perWeek + 1).toFixed(2)}s forwards}
    .in{opacity:0;animation:in .5s ease-out .2s forwards}
    @keyframes in{from{opacity:0}to{opacity:1}}
    .walk{animation:walk 30s linear 2.5s infinite both}
    .walk.z{animation-delay:4.3s}
    @keyframes walk{0%{transform:translate(${walkFrom[0]}px,${walkFrom[1]}px);opacity:0}1.5%{opacity:1}97%{opacity:1}100%{transform:translate(${walkTo[0]}px,${walkTo[1]}px);opacity:0}}
    .fa{animation:fa .5s steps(1) infinite}.fb{animation:fb .5s steps(1) infinite}
    .z .fa,.z .fb{animation-duration:.8s}
    @keyframes fa{50%{opacity:0}}@keyframes fb{0%{opacity:0}50%{opacity:1}}
    .road{animation:road 1.2s linear infinite}
    @keyframes road{to{stroke-dashoffset:-12}}`;

  const id = 'a';
  const body = `
  <defs>${lib.crtDefs(C, id, W, H)}
    <filter id="aglow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="abeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C.green}" stop-opacity="${dark ? 0.32 : 0.22}"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></linearGradient>
    <linearGradient id="abeacon" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C.green}"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></linearGradient>
    <pattern id="agrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${C.green}" stroke-opacity="${dark ? 0.05 : 0.07}"/></pattern>
    ${pats}
  </defs>
  <style>${css}</style>
  <g clip-path="url(#screen${id})">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#agrid)"/>
    ${title}
    ${platform}
    <path fill="${C.muted}" fill-opacity=".8" d="${months}"/>
    <g shape-rendering="crispEdges">${city}</g>
    ${today}
    ${beam}
    ${walkers}
    ${statBlock}
    ${legend}
    ${lib.crtOverlay(C, id, W, H)}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="${C.line}"/>`;

  const label = S.empty
    ? 'Commit activity over the last year'
    : `${S.total} commits in the last year · ${S.active} active days · longest streak ${S.longest} days · busiest day ${S.busiest?.n ?? 0} commits`;
  return {
    'activity.svg': lib.svg(W, H, body, label),
    'h-activity.svg': lib.header(C, ctx.no('activity'), 'ACTIVITY', C.green),
  };
}

export function readme(ctx) {
  const S = summarize(ctx.data?.activity, ctx.now ?? new Date());
  const alt = S.empty ? 'Commit activity over the last year'
    : `${S.total} commits in the last year across ${S.active} active days, rendered as a 3D pixel-art city`;
  return `${ctx.pic('h-activity.svg', 'width="100%" alt="Activity"')}\n\n<p align="center">${ctx.pic('activity.svg', `width="100%" alt="${alt}"`)}</p>`;
}
