// FOOTER — Liam vs. Zombies. A side-scrolling city under a sky that follows the Israel hour at build time
// (dawn/day/dusk/night, sun or moon on an arc, stars and lit windows at night). If a release shipped in the
// last 7 days, the chase turns into a boss fight against that release, HP bar and all.
//
// Preview overrides (read in data()):
//   FORCE_HOUR=0..23      FORCE_BOSS=1 (latest release) | 0 (never) | "Some Tool v2.0" (custom label)

import { ilClock, phaseOf } from './_clock.mjs';
import { runs } from './_pixels.mjs';

export const id = 'footer';

export async function data(env) {
  const b = process.env.FORCE_BOSS;
  return { clock: ilClock(env.now), forceBoss: b === undefined || b === '' ? null : b };
}

const WEEK = 7 * 864e5;

export function bossOf(events = [], now = new Date(), force = null) {
  const rel = events.filter((e) => e.kind === 'release' && e.when).sort((a, b) => new Date(b.when) - new Date(a.when));
  if (force === '0') return null;
  if (force && force !== '1') return force;
  if (force === '1') return rel[0]?.label ?? 'JustMic v1.5.0';
  const hot = rel.find((e) => now - new Date(e.when) <= WEEK);
  return hot ? hot.label : null;
}

// Scene palettes: [phase][theme]. Sky art, not UI chrome — but tuned so each looks at home on its README theme.
const SCENES = {
  dark: {
    night: { sky: ['#02050a', '#07140f'], far: '#08110d', bld: '#0c1511', lit: ['#1f6b43', '#b8923a', '#2f8f5a'], litP: 0.42, glass: null, top: ['#14532d', '#166534'], dirt: ['#0a120d', '#0c1611'], title: '#22ff88', sub: '#6b8577', hud: '#1a7a4a', shadow: '#000000' },
    dawn: { sky: ['#140f2a', '#5b2c4d', '#c9724e'], far: '#2a1a2e', bld: '#150f1c', lit: ['#c9924a', '#1f6b43'], litP: 0.16, glass: null, top: ['#14532d', '#166534'], dirt: ['#0b100d', '#0d1510'], title: '#22ff88', sub: '#d7b9a8', hud: '#3f9c6a', shadow: '#000000' },
    day: { sky: ['#0a2638', '#1f5f73', '#3b8a8c'], far: '#184856', bld: '#0e2c34', lit: [], litP: 0, glass: '#1c4a55', top: ['#16a34a', '#15803d'], dirt: ['#0b1a12', '#0d1f15'], title: '#22ff88', sub: '#b9d8d4', hud: '#4fbf85', shadow: '#000000' },
    dusk: { sky: ['#0d0820', '#40193f', '#b04a36'], far: '#261329', bld: '#120b18', lit: ['#d09a44', '#2f8f5a'], litP: 0.24, glass: null, top: ['#14532d', '#166534'], dirt: ['#0b100d', '#0d1510'], title: '#22ff88', sub: '#d9b2a2', hud: '#3f9c6a', shadow: '#000000' },
  },
  light: {
    night: { sky: ['#1d2644', '#3c4d73'], far: '#2b3858', bld: '#172035', lit: ['#ffd970', '#7ee2a8'], litP: 0.42, glass: null, top: ['#2c7a50', '#338a5a'], dirt: ['#232b40', '#262f45'], title: '#5cf0a0', sub: '#c3cde6', hud: '#8fb7a2', shadow: '#0b1020' },
    dawn: { sky: ['#8ea6d6', '#e9b8b0', '#fbdcbf'], far: '#b9a9c4', bld: '#6f6d92', lit: ['#ffd970'], litP: 0.16, glass: null, top: ['#2f9e5c', '#38b26a'], dirt: ['#e4d9c1', '#ddd1b7'], title: '#0b7a43', sub: '#3e3a58', hud: '#5f7368', shadow: '#ffffff' },
    day: { sky: ['#7cc6ea', '#bfe6f3', '#e6f6f2'], far: '#b5d6d8', bld: '#8fb3aa', lit: [], litP: 0, glass: '#b7d6d2', top: ['#2f9e5c', '#38b26a'], dirt: ['#e4dcc6', '#ddd4bb'], title: '#0b7a43', sub: '#2f4a3c', hud: '#5f7368', shadow: '#ffffff' },
    dusk: { sky: ['#5d5b9a', '#d98c86', '#f6c995'], far: '#9a7fa0', bld: '#4f4670', lit: ['#ffd970'], litP: 0.24, glass: null, top: ['#2f9e5c', '#38b26a'], dirt: ['#e0d2b8', '#d8caae'], title: '#0b7a43', sub: '#2e2944', hud: '#5f5872', shadow: '#ffffff' },
  },
};

const SUN = ['..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..'];
const MOON = ['..MMMM..', '.MMMMMM.', 'MMMMMmMM', 'MMmMMMMM', 'MMMMMMMM', 'MMMMmMMM', '.MMMMMM.', '..MMMM..'];

// The boss: a crowned mega-zombie reaching left toward Liam.
const BOSS = [
  '.....Y..Y..Y......',
  '.....YYYYYYY......',
  '....KKKKKKKKK.....',
  '...KZZZZZZZZZK....',
  '..KZZZZZZZZZZZK...',
  '..KZRRZZZZRRZZK...',
  '..KZRRZZZZRRZZK...',
  '..KZZZZZZZZZZZK...',
  '..KZZKWKWKWKZZK...',
  '..KZZKKKKKKKZZK...',
  '...KKZZZZZZZKK....',
  'ZZZZKTTTTTTTTKZZ..',
  'ZZZZKTTTKTTTTKZZ..',
  'Z..KTTTTTTTTTTK...',
  '...KTTKTTTTTTTK...',
  '...KTTTTTTTTKTK...',
  '....KPPPPPPPPK....',
  '....KPPK..KPPK....',
  '...KPPPK..KPPPK...',
  '...KKKKK..KKKKK...',
];
const BOSS_PAL = { K: '#0b0f0c', Z: '#7fae6a', R: '#ff3355', W: '#f4f4e8', T: '#5b4a3a', P: '#334155', Y: '#fbbf24' };

export function render(ctx) {
  const { C, MONO, tools, lib } = ctx;
  const { pixelText, textWidth, sprite, SPRITES, rng, svg, esc } = lib;
  const mine = ctx.data.footer ?? {};
  const clock = mine.clock ?? ilClock(ctx.now);
  const phase = phaseOf(clock.hour);
  const S = SCENES[C.name === 'light' ? 'light' : 'dark'][phase];
  const boss = bossOf(ctx.data.github?.events, ctx.now, mine.forceBoss);
  const W = 1200, H = 220, GY = 160;

  // ── sky ──
  const stops = S.sky.map((c, i) => `<stop offset="${(i / (S.sky.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('');
  const r = rng('skyline');
  const stars = phase === 'night'
    ? Array.from({ length: 46 }, () => `<rect x="${(r() * W) | 0}" y="${(r() * 110) | 0}" width="2" height="2" fill="${C.name === 'dark' ? C.star : '#e8eefc'}" class="tw" style="animation-delay:${(r() * 3).toFixed(2)}s"/>`).join('')
    : '';

  // Sun by day (05:30→18:30), moon by night, riding an arc from the left horizon to the right.
  const h = clock.hour + clock.minute / 60;
  const isSun = h >= 5.5 && h < 18.5;
  const p = isSun ? (h - 5.5) / 13 : (((h - 18.5) % 24) + 24) % 24 / 11;
  // The arc stays in the open sky: left of the title normally, between title and HP bar in a boss fight.
  const [ax, bx2] = boss ? [420, 640] : [40, 540];
  const bx = Math.round(ax + p * (bx2 - ax));
  const by = Math.round(GY - 85 - Math.sin(Math.PI * Math.min(1, p)) * 68);
  const orb = isSun
    ? `<circle cx="${bx + 20}" cy="${by + 20}" r="42" fill="#ffd36b" opacity="${phase === 'day' ? 0.16 : 0.24}" class="glow"/>
       ${runs(SUN, bx, by, 5, { X: phase === 'day' ? '#ffd24a' : '#ffb35c' })}${runs(['.XX', 'X..'], bx + 10, by + 10, 5, { X: '#fff1b8' })}`
    : runs(MOON, bx, by, 5, { M: '#e7f7c8', m: '#b9cc98' });

  // ── skyline: exactly W wide, drawn twice, so the scroll loops seamlessly ──
  const city = [], far = [];
  for (let sx = 0; sx < W;) {
    let bw = 30 + ((r() * 60) | 0);
    if (W - sx - bw < 34) bw = W - sx;
    const bh = 60 + ((r() * 60) | 0);
    far.push(`<rect x="${sx}" y="${GY - bh}" width="${bw}" height="${bh}" fill="${S.far}"/>`);
    sx += bw;
  }
  for (let sx = 0; sx < W;) {
    let bw = 40 + ((r() * 60) | 0);
    if (W - sx - bw < 48) bw = W - sx;
    const bh = 30 + ((r() * 70) | 0);
    city.push(`<rect x="${sx}" y="${GY - bh}" width="${bw}" height="${bh}" fill="${S.bld}"/>`);
    if (r() > 0.6) city.push(`<rect x="${sx + (bw >> 1) - 1}" y="${GY - bh - 10}" width="2" height="10" fill="${S.bld}"/>`);
    for (let wy = GY - bh + 8; wy < GY - 10; wy += 12)
      for (let wx = sx + 6; wx < sx + bw - 6; wx += 10) {
        const q = r(), pick = r();
        if (S.glass && q < 0.22) city.push(`<rect x="${wx}" y="${wy}" width="4" height="4" fill="${S.glass}"/>`);
        else if (q < S.litP * 0.55) city.push(`<rect x="${wx}" y="${wy}" width="4" height="4" fill="${S.lit[(pick * S.lit.length) | 0]}"/>`);
      }
    sx += bw + 4;
  }
  const loop = (items, dur, dist = W) => `<g><animateTransform attributeName="transform" type="translate" values="0 0;-${dist} 0" dur="${dur}s" repeatCount="indefinite"/>
      <g>${items}</g><g transform="translate(${dist} 0)">${items}</g></g>`;
  const ground = Array.from({ length: Math.ceil((W + 480) / 16) }, (_, k) =>
    `<rect x="${k * 16}" y="${GY}" width="16" height="6" fill="${S.top[k % 2]}"/><rect x="${k * 16}" y="${GY + 6}" width="16" height="${H - GY - 6}" fill="${S.dirt[k % 3 ? 0 : 1]}"/>`).join('');
  const groundStatic = `<rect x="0" y="${GY}" width="${W}" height="6" fill="${S.top[0]}"/><rect x="0" y="${GY + 6}" width="${W}" height="${H - GY - 6}" fill="${S.dirt[0]}"/>`
    + Array.from({ length: W / 32 }, (_, k) => `<rect x="${k * 32}" y="${GY}" width="16" height="6" fill="${S.top[1]}"/>`).join('');

  const walker = (a, b, x, y, s, speed) => `<g transform="translate(${x} ${y})">
      <g>${sprite(a, 0, 0, s)}<animate attributeName="opacity" values="1;0" dur="${speed}s" calcMode="discrete" repeatCount="indefinite"/></g>
      <g opacity="0">${sprite(b, 0, 0, s)}<animate attributeName="opacity" values="0;1" dur="${speed}s" calcMode="discrete" repeatCount="indefinite"/></g></g>`;

  const msg = 'THANKS FOR VISITING';
  const lvl = `LIAM vs. ZOMBIES — LVL ${tools.length}`;
  const shadowText = (t, x, y, s, fill) => pixelText(t, x + s, y + s, s, { fill: S.shadow }).replace(/<rect /g, '<rect opacity=".45" ') + pixelText(t, x, y, s, { fill });
  const css = [];
  let actors, titleBlock;

  if (!boss) {
    // ── classic chase ──
    const zombies = [0, 1, 2].map((k) => `<g><animateTransform attributeName="transform" type="translate" values="0 0;${18 + k * 6} 0;0 0" dur="${3 + k * 0.7}s" repeatCount="indefinite"/>
      ${walker(SPRITES.zombieA, SPRITES.zombieB, 330 + k * 110, 94, 4.4, 0.5 + k * 0.08)}</g>`).join('');
    actors = `${zombies}
    <g><animateTransform attributeName="transform" type="translate" values="0 0;-6 -3;0 0" dur=".36s" repeatCount="indefinite"/>
      ${walker(SPRITES.liamA, SPRITES.liamB, 760, 94, 4.4, 0.36)}</g>`;
    titleBlock = `${shadowText(msg, W / 2 - textWidth(msg, 3) / 2 + 180, 28, 3, S.title)}
    <text x="${W / 2 + 180}" y="76" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${S.sub}">liam.plus · press <tspan fill="${S.title}">★</tspan> to continue</text>`;
  } else {
    // ── boss fight: 12 s loop — 9 hits, KO, "SHIPPED!", respawn ──
    const T = 12, hits = 9, hitAt = (k) => k + 0.45;
    const pct = (t) => ((t / T) * 100).toFixed(2);
    const hp = ['0%{transform:scaleX(1)}'];
    for (let k = 0; k < hits; k++) {
      hp.push(`${pct(hitAt(k) - 0.01)}%{transform:scaleX(${(1 - k / hits).toFixed(3)})}`);
      hp.push(`${pct(hitAt(k))}%{transform:scaleX(${(1 - (k + 1) / hits).toFixed(3)})}`);
    }
    hp.push(`${pct(11.9)}%{transform:scaleX(0)}`, '100%{transform:scaleX(1)}');
    const ghost = ['0%{transform:scaleX(1)}'];
    for (let k = 0; k < hits; k++) {
      ghost.push(`${pct(hitAt(k) + 0.1)}%{transform:scaleX(${(1 - k / hits).toFixed(3)})}`);
      ghost.push(`${pct(hitAt(k) + 0.45)}%{transform:scaleX(${(1 - (k + 1) / hits).toFixed(3)})}`);
    }
    ghost.push(`${pct(11.9)}%{transform:scaleX(0)}`, '100%{transform:scaleX(1)}');
    const ko = hitAt(hits - 1); // 8.45 s
    css.push(`
    .hp{animation:hp ${T}s linear infinite}@keyframes hp{${hp.join('')}}
    .hpg{animation:hpg ${T}s linear infinite}@keyframes hpg{${ghost.join('')}}
    .fight{animation:fight ${T}s steps(1) infinite}@keyframes fight{0%{opacity:1}${pct(ko + 0.2)}%{opacity:0}100%{opacity:0}}
    .shot{animation:shot 1s linear infinite}@keyframes shot{0%,5%{opacity:0;transform:translate(0,0)}6%{opacity:1;transform:translate(0,0)}44%{opacity:1;transform:translate(196px,-10px)}45%,100%{opacity:0;transform:translate(196px,-10px)}}
    .shot2{animation-delay:.05s}
    .hitfx{animation:hitfx 1s steps(1) infinite}@keyframes hitfx{0%,44%{opacity:0}45%{opacity:.9}52%{opacity:0}57%{opacity:.6}62%,100%{opacity:0}}
    .shake{animation:shake 1s linear infinite}@keyframes shake{0%,44%,70%,100%{transform:translate(0,0)}47%{transform:translate(8px,-2px)}52%{transform:translate(-3px,0)}58%{transform:translate(4px,0)}}
    .dmg{animation:dmg 1s ease-out infinite}@keyframes dmg{0%,44%{opacity:0;transform:translate(0,0)}46%{opacity:1;transform:translate(0,-4px)}85%{opacity:1;transform:translate(6px,-30px)}100%{opacity:0;transform:translate(6px,-34px)}}
    .recoil{animation:recoil 1s linear infinite}@keyframes recoil{0%,3%,20%,100%{transform:translate(0,0)}6%{transform:translate(-5px,0)}12%{transform:translate(-2px,0)}}
    .bossb{animation:bossb ${T}s steps(1) infinite}@keyframes bossb{0%{opacity:1}${pct(ko + 0.3)}%{opacity:0}${pct(ko + 0.45)}%{opacity:1}${pct(ko + 0.6)}%{opacity:0}${pct(ko + 0.75)}%{opacity:1}${pct(ko + 0.9)}%{opacity:0}100%{opacity:0}}
    .rise{animation:rise ${T}s linear infinite}@keyframes rise{0%{transform:translate(0,0)}${pct(ko + 0.9)}%{transform:translate(0,0)}${pct(11.4)}%{transform:translate(0,40px)}100%{transform:translate(0,0)}}
    .win{opacity:0;animation:win ${T}s steps(1) infinite}@keyframes win{0%{opacity:0}${pct(ko + 1)}%{opacity:1}${pct(11.7)}%{opacity:0}}
    .taunt{animation:taunt 1.4s steps(2) infinite}@keyframes taunt{50%{transform:translate(0,-3px)}}`);

    const bs = 5, bw = BOSS[0].length * bs, bh = BOSS.length * bs;
    const bxp = 880, byp = GY - bh;
    const white = Object.fromEntries(Object.keys(BOSS_PAL).map((k) => [k, '#ffffff']));
    const label = `BOSS: ${boss.toUpperCase()}`.replace(/[^A-Z0-9 .:+\-!?/&_']/g, '');
    const lblW = textWidth(label, 2);
    const barX = 700, barW = 460, barY = 44;
    const liamX = 620, liamY = 94;
    const muzzleX = liamX + 50, muzzleY = liamY + 36;
    const dmgTxt = `-${Math.round(9999 / hits)}`;
    actors = `
    <g class="recoil">${walker(SPRITES.liamA, SPRITES.liamB, liamX, liamY, 4.4, 0.5)}</g>
    <g class="fight">
      <g class="shot">${runs(['.XX.', 'XXXX', 'XXXX', '.XX.'], muzzleX, muzzleY, 2, { X: '#22ff88' })}<rect x="${muzzleX - 16}" y="${muzzleY + 3}" width="14" height="2" fill="#22ff88" opacity=".5"/></g>
      <g class="shot shot2">${pixelText('1', muzzleX - 12, muzzleY - 10, 1, { fill: '#b6ffd6' })}${pixelText('0', muzzleX - 20, muzzleY + 12, 1, { fill: '#b6ffd6' })}</g>
    </g>
    <g class="rise"><g class="bossb"><g class="taunt"><g class="shake">
      ${runs(BOSS, bxp, byp, bs, BOSS_PAL)}
      <g class="hitfx">${runs(BOSS, bxp, byp, bs, white)}</g>
    </g></g></g></g>
    <g class="fight"><g class="dmg">${shadowText(dmgTxt, bxp + 20, byp + 10, 2, '#ff3355')}</g></g>
    <g class="win">${shadowText('SHIPPED!', bxp + bw / 2 - textWidth('SHIPPED!', 3) / 2, byp + 34, 3, '#fbbf24')}</g>`;
    titleBlock = `${shadowText(msg, 40, 28, 3, S.title)}
    <text x="40" y="76" font-family="${MONO}" font-size="13" fill="${S.sub}">liam.plus · press <tspan fill="${S.title}">★</tspan> to continue</text>
    ${shadowText(label, barX + barW - lblW, 22, 2, S.title)}
    <rect x="${barX - 3}" y="${barY - 3}" width="${barW + 6}" height="18" fill="${S.shadow}" opacity=".55"/>
    <rect x="${barX}" y="${barY}" width="${barW}" height="12" fill="#3a0d17"/>
    <g transform="translate(${barX} ${barY})">
      <rect class="hpg" width="${barW}" height="12" fill="#fbbf24"/>
      <rect class="hp" width="${barW}" height="12" fill="#ff3355"/>
      <rect class="hp" width="${barW}" height="3" fill="#ff8aa0"/>
    </g>
    ${pixelText('HP', barX - 30, barY - 1, 2, { fill: S.title })}`;
  }

  const body = `
  <defs>
    <clipPath id="fc"><rect width="${W}" height="${H}" rx="16"/></clipPath>
    <linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>
  </defs>
  <style>
    .blink{animation:blink 1.1s steps(1) infinite}
    @keyframes blink{50%{opacity:0}}
    .tw{animation:tw 3s ease-in-out infinite}
    @keyframes tw{0%,100%{opacity:.15}50%{opacity:1}}
    .glow{animation:glow 4s ease-in-out infinite}
    @keyframes glow{50%{opacity:.08}}
    ${css.join('\n')}
  </style>
  <g clip-path="url(#fc)">
    <rect width="${W}" height="${H}" fill="url(#fsky)"/>
    ${stars}
    ${boss ? `<g>${far.join('')}</g>` : loop(far.join(''), 90)}
    <g>${orb}</g>
    ${boss ? `<g>${city.join('')}</g>` : loop(city.join(''), 40)}
    ${boss ? groundStatic : `<g><animateTransform attributeName="transform" type="translate" values="0 0;-480 0" dur="3.2s" repeatCount="indefinite"/>${ground}</g>`}
    ${actors}
    ${titleBlock}
    <text x="${W - 40}" y="206" text-anchor="end" font-family="${MONO}" font-size="12" fill="${S.hud}" class="blink">INSERT COIN</text>
    <text x="40" y="206" font-family="${MONO}" font-size="12" fill="${S.hud}">${esc(lvl)}</text>
  </g>`;
  const title = boss ? `Liam vs. Zombies — boss fight: ${boss}` : 'Liam vs. Zombies — thanks for visiting';
  return { 'footer.svg': svg(W, H, body, title) };
}

export function readme(ctx) {
  const boss = bossOf(ctx.data.github?.events, ctx.now, ctx.data.footer?.forceBoss);
  const alt = boss ? `Liam vs. Zombies — boss fight against ${boss}. Thanks for visiting` : 'Liam vs. Zombies — thanks for visiting';
  return `<a href="https://liam.plus">${ctx.pic('footer.svg', `width="100%" alt="${alt}"`)}</a>`;
}
