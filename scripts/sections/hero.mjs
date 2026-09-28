// HERO — LiamOS boot screen: boot log, dropping LIAM+ logo, typed role, pixel Liam saying "hi!",
// plus live Tel Aviv weather painted into the CRT, an Israel-time sync stamp and a blinking PRESS START.
//
// Preview overrides (read in data()):
//   FORCE_WEATHER=clear|cloudy|fog|rain|storm|snow   FORCE_DAY=0|1   FORCE_TEMP=31   FORCE_HOUR=0..23

import { ilClock, statusOf } from './_clock.mjs';
import { runs } from './_pixels.mjs';

export const id = 'hero';

const WX_URL = 'https://api.open-meteo.com/v1/forecast?latitude=32.08&longitude=34.78'
  + '&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=Asia%2FJerusalem';

// WMO weather interpretation codes → one of six scene kinds.
export function kindOf(code) {
  if (code == null) return null;
  if (code <= 1) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return 'cloudy';
}

export async function data(env) {
  const E = process.env;
  const clock = ilClock(env.now);
  let cur = (await env.getJSON(WX_URL))?.current ?? null;
  if (cur && typeof cur.temperature_2m === 'number') env.cache?.set('hero-weather', cur);
  else cur = env.cache?.get('hero-weather') ?? null; // last good reading beats nothing

  let weather = cur
    ? { temp: Math.round(cur.temperature_2m), code: cur.weather_code, kind: kindOf(cur.weather_code), isDay: !!cur.is_day, wind: cur.wind_speed_10m ?? 0 }
    : null;
  if (E.FORCE_WEATHER) weather = { ...(weather ?? { temp: 24, code: 0, wind: 8 }), kind: E.FORCE_WEATHER };
  if (weather) {
    if (E.FORCE_HOUR) weather.isDay = clock.hour >= 6 && clock.hour < 19;
    if (E.FORCE_DAY) weather.isDay = E.FORCE_DAY === '1';
    if (E.FORCE_TEMP) weather.temp = +E.FORCE_TEMP;
    if (weather.kind === 'storm' && E.FORCE_WEATHER) weather.wind = Math.max(weather.wind, 30);
  }
  return { weather, clock };
}

const ICONS = {
  sun: ['...Y...', '.Y...Y.', '..YYY..', 'Y.YYY.Y', '..YYY..', '.Y...Y.', '...Y...'],
  moon: ['..MMM..', '.MMM...', 'MMM....', 'MMM....', 'MMM....', '.MMM...', '..MMM..'],
  cloudy: ['.......', '..CCC..', '.CCCCC.', 'CCCCCCC', 'CCCCCCC', '.......', '.......'],
  rain: ['..CCC..', '.CCCCC.', 'CCCCCCC', '.......', '.B.B.B.', 'B.B.B..', '.......'],
  storm: ['..CCC..', '.CCCCC.', 'CCCCCCC', '...Y...', '..YY...', '...Y...', '..Y....'],
  snow: ['..CCC..', '.CCCCC.', 'CCCCCCC', '.......', '.W.W.W.', '.......', 'W.W.W..'],
  fog: ['.......', 'CCCCCC.', '.......', '.CCCCCC', '.......', 'CCCCCC.', '.......'],
};

const CLOUD = [
  '......XXXX..........',
  '....XXXXXXXX..XXX...',
  '..XXXXXXXXXXXXXXXXX.',
  '.XXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
  '.XXXXXXXXXXXXXXXXXX.',
];
const CLOUD2 = [
  '....XXX.....',
  '..XXXXXXX...',
  '.XXXXXXXXXX.',
  'XXXXXXXXXXXX',
  '.XXXXXXXXXX.',
];
const BOLT = ['..XXX', '.XXX.', '.XX..', 'XXXX.', '..XX.', '.XX..', '.X...', 'X....'];
const UMBRELLA = [
  '.....RRRR.....',
  '...RRRRRRRR...',
  '.RRRRRRRRRRRR.',
  'RRRRRRRRRRRRRR',
  'R..R..RR..R..R',
];
const TRI = ['1...', '11..', '111.', '1111', '111.', '11..', '1...'];

export function render(ctx) {
  const { C, MONO, config, tools, lib } = ctx;
  const { esc, pixelText, textWidth, sprite, SPRITES, rng, typed, svg } = lib;
  const gh = ctx.data.github ?? {};
  const mine = ctx.data.hero ?? {};
  const clock = mine.clock ?? ilClock(ctx.now);
  const wx = mine.weather;
  const dark = C.name === 'dark';

  const W = 1200, H = 440, id = 'h';
  const nTools = tools.length;
  const releases = gh.releases ?? 0;
  const years = gh.years ?? Math.floor((ctx.now - new Date(config.profile.since)) / 3.15576e10);

  // Theme-specific tints. Light = a "paper-white CRT": warm paper screen, dark-green phosphor.
  const T = dark
    ? { screen: C.bg, glass: C.shade, glassOp: 0.45, shadow: '#0d3b24', hi: '#b6ffd6', bubbleBg: '#ffffff', bubbleFg: '#000000',
        scan: C.shade, scanOp: 0.35, vig: C.shade, vigOp: 0.75, glowOp: 0.35, cloud: C.muted, cloudOp: 0.18, rain: C.blue, rainOp: 0.35,
        flash: C.ink, flashOp: 0.22, star: C.star }
    : { screen: '#eef2ea', glass: '#fbfcf8', glassOp: 0.78, shadow: '#bfe0cc', hi: '#6fd79f', bubbleBg: C.ink, bubbleFg: '#f6f8f7',
        scan: '#0b3d22', scanOp: 0.05, vig: '#20402e', vigOp: 0.22, glowOp: 0.18, cloud: '#7d948a', cloudOp: 0.22, rain: C.blue, rainOp: 0.4,
        flash: C.purple, flashOp: 0.14, star: '#8fb3a1' };

  const r = rng('liamos-stars');
  const kind = wx?.kind ?? null;
  const night = wx ? !wx.isDay : clock.hour < 6 || clock.hour >= 19;
  const clearNight = kind === 'clear' && night;
  const nStars = clearNight ? 110 : kind === 'clear' || !kind ? 70 : 34; // overcast skies hide most stars
  const stars = Array.from({ length: nStars }, () => {
    const s = r() > 0.85 ? 3 : 2;
    return `<rect x="${(r() * W) | 0}" y="${(r() * H) | 0}" width="${s}" height="${s}" fill="${r() > 0.8 ? C.green : T.star}" class="tw" style="animation-delay:${(r() * 4).toFixed(2)}s;animation-duration:${(2 + r() * 3).toFixed(2)}s"/>`;
  }).join('');

  // ── weather layer (above the terminal glass, below the text) ──
  const wr = rng(`wx-${kind}`);
  const fx = [];
  const css = [];
  const sunX = 1140, sunY = 100;
  if (kind === 'clear' && !night) {
    const sunC = dark ? C.warn : '#e0a21a';
    const rays = Array.from({ length: 8 }, (_, k) =>
      `<rect x="${sunX - 2}" y="${sunY - 36}" width="4" height="${k % 2 ? 7 : 11}" fill="${sunC}" transform="rotate(${k * 45} ${sunX} ${sunY})"/>`).join('');
    fx.push(`<g>
      <circle cx="${sunX}" cy="${sunY}" r="34" fill="${sunC}" opacity=".07" class="sunglow"/>
      <g class="rays" style="transform-origin:${sunX}px ${sunY}px">${rays}</g>
      ${runs(['..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..'], sunX - 16, sunY - 16, 4, { X: sunC })}
      ${runs(['.XX', 'X..'], sunX - 8, sunY - 8, 4, { X: dark ? '#ffe7a3' : '#f7d27a' })}</g>`);
    css.push(`.rays{animation:rays 1.6s steps(2) infinite}@keyframes rays{50%{transform:rotate(22.5deg)}}
      .sunglow{animation:sg 4s ease-in-out infinite}@keyframes sg{50%{opacity:.16}}`);
  }
  if (clearNight) {
    fx.push(`<g opacity=".9">${runs(['...MMMM.', '.MMMM...', 'MMMM....', 'MMM.....', 'MMM.....', 'MMMM....', '.MMMM...', '...MMMM.'], sunX - 14, sunY - 16, 4, { M: dark ? '#e7f7c8' : '#6f8c7c' })}</g>`);
    // an occasional shooting star
    fx.push(`<g class="shoot"><rect x="0" y="0" width="34" height="2" fill="${T.star}"/><rect x="30" y="-1" width="4" height="4" fill="${dark ? C.ink : C.green}"/></g>`);
    css.push(`.shoot{opacity:0;animation:shoot 9s linear 3s infinite}
      @keyframes shoot{0%{opacity:0;transform:translate(300px,70px) rotate(14deg)}1%{opacity:1}9%{opacity:0;transform:translate(560px,135px) rotate(14deg)}100%{opacity:0;transform:translate(560px,135px) rotate(14deg)}}`);
  }
  if (kind && kind !== 'clear') {
    const heavy = kind === 'storm' || kind === 'rain';
    const tint = kind === 'storm' ? (dark ? '#51606b' : '#7a8790') : T.cloud;
    const op = kind === 'cloudy' ? T.cloudOp : T.cloudOp * 1.35;
    const clouds = [
      [CLOUD, 5, 70, 70], [CLOUD2, 5, 96, 52], [CLOUD, 4, 150, 90], [CLOUD2, 6, 64, 64], [CLOUD, 6, 250, 110],
    ].slice(0, heavy ? 5 : 4);
    clouds.forEach(([shape, s, y, dur], k) => {
      const w = shape[0].length * s;
      const start = -((k * 0.23 + wr() * 0.1) * dur).toFixed(1);
      fx.push(`<g class="drift" style="animation-duration:${dur}s;animation-delay:${start}s" opacity="${op.toFixed(2)}">${runs(shape, -w, y, s, { X: tint })}</g>`);
    });
    css.push(`.drift{animation:drift 60s linear infinite}@keyframes drift{from{transform:translateX(0)}to{transform:translateX(${W + 160}px)}}`);
  }
  if (kind === 'rain' || kind === 'storm') {
    const n = kind === 'storm' ? 120 : 80;
    const slant = Math.min(60, 12 + (wx?.wind ?? 0) * 1.2) | 0;
    for (let k = 0; k < n; k++) {
      const x = ((wr() * (W + 80)) | 0) - 20, len = wr() > 0.7 ? 14 : 10;
      fx.push(`<rect class="rn" x="${x}" y="-20" width="2" height="${len}" fill="${T.rain}" style="animation-duration:${(0.55 + wr() * 0.35).toFixed(2)}s;animation-delay:-${(wr() * 1.2).toFixed(2)}s"/>`);
    }
    css.push(`.rn{opacity:${T.rainOp};animation:rn .7s linear infinite}@keyframes rn{from{transform:translate(0,0)}to{transform:translate(-${slant}px,${H + 40}px)}}`);
  }
  if (kind === 'storm') {
    fx.push(`<g class="bolt">${runs(BOLT, 1040, 76, 7, { X: C.warn })}</g>`);
    fx.push(`<rect class="flash" width="${W}" height="${H}" fill="${T.flash}"/>`);
    css.push(`.flash{opacity:0;animation:flash 7s linear 2.5s infinite}
      @keyframes flash{0%,88%,90.5%,92%,94%,100%{opacity:0}89%{opacity:${T.flashOp}}91%{opacity:${(T.flashOp * 0.6).toFixed(2)}}93%{opacity:${(T.flashOp * 0.35).toFixed(2)}}}
      .bolt{opacity:0;animation:bolt 7s steps(1) 2.5s infinite}@keyframes bolt{0%{opacity:0}88%{opacity:1}92%{opacity:0}}`);
  }
  if (kind === 'snow') {
    for (let k = 0; k < 70; k++) {
      const x = (wr() * W) | 0, s = wr() > 0.7 ? 4 : 2;
      fx.push(`<rect class="sn" x="${x}" y="-10" width="${s}" height="${s}" fill="${dark ? C.ink : '#7d948a'}" style="animation-duration:${(5 + wr() * 5).toFixed(1)}s;animation-delay:-${(wr() * 10).toFixed(1)}s"/>`);
    }
    css.push(`.sn{opacity:.55;animation:sn 7s linear infinite}@keyframes sn{0%{transform:translate(0,0)}25%{transform:translate(10px,${H * 0.25}px)}50%{transform:translate(-6px,${H * 0.5}px)}75%{transform:translate(8px,${H * 0.75}px)}100%{transform:translate(0,${H + 20}px)}}`);
  }
  if (kind === 'fog') {
    [120, 220, 330].forEach((y, k) => {
      fx.push(`<g class="fog" style="animation-duration:${26 + k * 9}s;animation-direction:${k % 2 ? 'reverse' : 'normal'}">
        <rect x="-300" y="${y}" width="${W + 600}" height="${26 + k * 8}" rx="14" fill="${T.cloud}" opacity="${dark ? 0.1 : 0.14}"/>
        <rect x="-200" y="${y + 34}" width="${W * 0.6}" height="10" fill="${T.cloud}" opacity="${dark ? 0.08 : 0.1}"/></g>`);
    });
    css.push(`.fog{animation:fog 30s ease-in-out infinite alternate}@keyframes fog{from{transform:translateX(-120px)}to{transform:translateX(120px)}}`);
  }

  // ── boot log ──
  const boot = [
    ['OK', 'Booting LiamOS kernel 6.9-plus'],
    ['OK', 'Mounting /dev/curiosity'],
    ['OK', 'Starting cybersec.target + netstack'],
    ['OK', `Loading ${nTools} projects`],
    ['OK', `Syncing ${releases} releases from GitHub`],
    ['OK', 'Linking https://liam.plus'],
    ['WARN', 'Zombies detected near sector 7'],
    ['OK', 'System ready.'],
  ];
  const bootLines = boot.map(([s, msg], i) => {
    const y = 112 + i * 26;
    const col = s === 'OK' ? C.green : C.warn;
    return `<g class="fade" style="animation-delay:${(0.3 + i * 0.22).toFixed(2)}s">
        <text x="60" y="${y}" font-family="${MONO}" font-size="14" fill="${C.muted}">[<tspan fill="${col}">${s.padStart(s === 'OK' ? 3 : 4, ' ').padEnd(4, ' ')}</tspan>]</text>
        <text x="122" y="${y}" font-family="${MONO}" font-size="14" fill="${C.text}">${esc(msg)}</text></g>`;
  }).join('');

  // ── LIAM+ logo, dropping in column by column ──
  const logo = 'LIAM+';
  const scale = 16;
  const lw = textWidth(logo, scale);
  const lx = 600 + (540 - lw) / 2;
  const ly = 110;
  const logoStart = 0.3 + boot.length * 0.22 + 0.2;
  const drop = (x, y, i, col) => ` class="drop" style="animation-delay:${(logoStart + col * 0.035 + (y - ly) * 0.0009).toFixed(3)}s"`;
  const logoShadow = pixelText(logo, lx + 6, ly + 6, scale, { fill: T.shadow, perPixel: drop });
  const logoMain = pixelText(logo, lx, ly, scale, { fill: C.green, perPixel: drop });
  const logoHi = pixelText(logo, lx, ly, scale, { fill: T.hi, perPixel: (x, y, i, col) => (y === ly ? drop(x, y, i, col) : ' style="display:none"') });

  const tagY = ly + 7 * scale + 58;
  const tagStart = logoStart + 1.1;
  const role = config.profile.role;
  const roleX = 600 + (540 - role.length * 16 * 0.6) / 2;
  const where = `${config.profile.location} · ${config.profile.site.replace('https://', '')}`;
  const whereX = 600 + (540 - [...where].length * 13 * 0.6) / 2;

  // ── PRESS START ──
  const ps = 'PRESS START';
  const psS = 3, psW = textWidth(ps, psS) + 14 + 4 * psS;
  const psX = Math.round(870 - psW / 2), psY = 344;
  const pressStart = `<g class="ps"><g class="blink2">
      ${pixelText(ps, psX + 3, psY + 3, psS, { fill: T.shadow })}
      ${pixelText(ps, psX, psY, psS, { fill: C.green })}
      ${runs(TRI.map((row) => row.replace(/1/g, 'X')), psX + textWidth(ps, psS) + 14, psY, psS, { X: C.green })}</g></g>`;

  // ── Liam (+ umbrella when it rains) ──
  const wet = kind === 'rain' || kind === 'storm';
  const umbrella = wet
    ? `${runs(UMBRELLA, 1062, 270, 5, { R: C.red })}<rect x="1096" y="295" width="3" height="52" fill="${dark ? C.muted : '#0b0f0c'}"/>`
    : '';
  const liam = `<g class="bob"><g>${umbrella}${sprite(SPRITES.liamA, 1090, 300, 5)}</g></g>`;
  const bubble = wet
    ? `<g class="bubble"><rect x="986" y="304" width="58" height="26" fill="${T.bubbleBg}"/><rect x="1044" y="314" width="6" height="6" fill="${T.bubbleBg}"/>
      <text x="1015" y="322" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" fill="${T.bubbleFg}">hi!</text></g>`
    : `<g class="bubble"><rect x="1062" y="262" width="58" height="26" fill="${T.bubbleBg}"/><rect x="1098" y="288" width="6" height="6" fill="${T.bubbleBg}"/>
      <text x="1091" y="280" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" fill="${T.bubbleFg}">hi!</text></g>`;

  // ── title bar: path · uptime · weather + sync stamp ──
  const status = statusOf(clock.hour);
  const iconKey = !kind ? null : kind === 'clear' ? (night ? 'moon' : 'sun') : kind;
  const wxText = wx ? `${wx.temp}°C TLV` : '';
  const right = `${wxText ? `${wxText}  ·  ` : ''}synced ${clock.hhmm} IL · ${status}`;
  const rightW = [...right].length * 12 * 0.6;
  const iconX = Math.round(W - 44 - rightW - 20);
  const icon = iconKey
    ? runs(ICONS[iconKey], iconX, 33, 2, { Y: C.warn, M: dark ? '#e7f7c8' : C.muted, C: C.muted, B: C.blue, W: dark ? C.ink : C.muted })
    : '';
  const rightSvg = `<text x="${iconX + 20}" y="45" textLength="${rightW.toFixed(1)}" lengthAdjust="spacing" font-family="${MONO}" font-size="12" fill="${C.dim}" xml:space="preserve">${
    wxText ? `<tspan fill="${C.text}">${esc(wxText)}</tspan>  ·  ` : ''}synced <tspan fill="${C.green}">${esc(clock.hhmm)}</tspan> IL · <tspan fill="${C.muted}">${esc(status)}</tspan></text>`;

  const body = `
  <defs>
    <pattern id="scan${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="${T.scan}" opacity="${T.scanOp}"/></pattern>
    <radialGradient id="vig${id}" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="${T.vig}" stop-opacity="0"/><stop offset="100%" stop-color="${T.vig}" stop-opacity="${T.vigOp}"/></radialGradient>
    <linearGradient id="band${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.green}" stop-opacity="0"/><stop offset=".5" stop-color="${C.green}" stop-opacity="${dark ? 0.06 : 0.05}"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></linearGradient>
    <filter id="glow${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="screen${id}"><rect width="${W}" height="${H}" rx="16"/></clipPath>
    <pattern id="grid${id}" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${C.green}" stroke-opacity="${dark ? 0.05 : 0.07}"/></pattern>
  </defs>
  <style>
    .tw{animation:tw 3s ease-in-out infinite}
    @keyframes tw{0%,100%{opacity:.15}50%{opacity:1}}
    .fade{opacity:0;animation:fade .35s ease-out forwards}
    @keyframes fade{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
    .drop{opacity:0;animation:drop .55s cubic-bezier(.2,1.5,.45,1) forwards}
    @keyframes drop{from{opacity:0;transform:translateY(-260px)}to{opacity:1;transform:none}}
    .pulse{animation:pulse 3.2s ease-in-out ${(logoStart + 1).toFixed(2)}s infinite}
    @keyframes pulse{0%,100%{opacity:${(T.glowOp * 1).toFixed(2)}}50%{opacity:${(T.glowOp * 2.5).toFixed(2)}}}
    .bob{animation:bob 1.6s steps(2) infinite}
    @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    .bubble{opacity:0;animation:fade .3s ease-out ${(tagStart + 1.8).toFixed(2)}s forwards}
    .ps{opacity:0;animation:fade .3s ease-out ${(tagStart + 2.4).toFixed(2)}s forwards}
    .blink2{animation:blink2 1.1s steps(1) infinite}
    @keyframes blink2{60%{opacity:0}}
    .flick{animation:flick 6s infinite}
    @keyframes flick{0%,96%,100%{opacity:1}97%{opacity:.85}98%{opacity:1}99%{opacity:.9}}
    ${css.join('\n    ')}
  </style>
  <g clip-path="url(#screen${id})" class="flick">
    <rect width="${W}" height="${H}" fill="${T.screen}"/>
    <rect width="${W}" height="${H}" fill="url(#grid${id})"/>
    ${stars}
    <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="12" fill="${T.glass}" fill-opacity="${T.glassOp}" stroke="${C.line}"/>
    ${fx.join('\n    ')}
    <rect x="20" y="20" width="${W - 40}" height="40" rx="12" fill="${C.panel}"/>
    <rect x="20" y="48" width="${W - 40}" height="12" fill="${C.panel}"/>
    <line x1="20" y1="60" x2="${W - 20}" y2="60" stroke="${C.line}"/>
    <circle cx="46" cy="40" r="6" fill="#ff5f57"/><circle cx="66" cy="40" r="6" fill="#febc2e"/><circle cx="86" cy="40" r="6" fill="#28c840"/>
    <text x="108" y="45" font-family="${MONO}" font-size="13" fill="${C.muted}">liam@liamos: ~/profile</text>
    <text x="${W / 2}" y="45" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${C.dim}">uptime ${years}y · ${nTools} projects online</text>
    ${icon}${rightSvg}
    ${bootLines}
    <line x1="580" y1="84" x2="580" y2="${H - 44}" stroke="${C.line}" stroke-dasharray="2 6"/>
    <g class="pulse" filter="url(#glow${id})" opacity="${T.glowOp}">${pixelText(logo, lx, ly, scale, { fill: C.green })}</g>
    ${logoShadow}${logoMain}${logoHi}
    ${typed(C, 'role', role, roleX, tagY, { size: 16, fill: C.text, begin: tagStart, cursor: false })}
    ${typed(C, 'where', where, whereX, tagY + 30, { size: 13, fill: C.muted, begin: tagStart + 1.2, cursor: false })}
    ${pressStart}
    ${typed(C, 'prompt', './explore --projects --no-zombies', 88, H - 58, { size: 15, fill: C.green, begin: logoStart + 0.6 })}
    <text x="60" y="${H - 58}" font-family="${MONO}" font-size="15" fill="${C.muted}">$</text>
    ${liam}
    ${bubble}
    <rect width="${W}" height="${H}" fill="url(#scan${id})" pointer-events="none"/>
    <rect y="-120" width="${W}" height="120" fill="url(#band${id})"><animate attributeName="y" values="-120;${H}" dur="7s" repeatCount="indefinite"/></rect>
    <rect width="${W}" height="${H}" fill="url(#vig${id})"/>
  </g>`;
  return { 'hero.svg': svg(W, H, body, `LiamOS boot screen — ${config.profile.name}`) };
}

export function readme(ctx) {
  const p = ctx.config.profile;
  return `<a href="${p.site}">${ctx.pic('hero.svg', `width="100%" alt="LiamOS boot screen — ${p.name}, ${p.role}. Press start to visit ${p.site.replace('https://', '')}"`)}</a>`;
}
