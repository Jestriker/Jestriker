// WHOAMI: a terminal that types `whoami` and prints a few deliberately vague lines, next to the lightning block.
import { windowChrome, border, txt, avatarBlock, avatarBolt, px, pxW } from './_small.mjs';

export const id = 'about';

const W = 1200, H = 300;

export function render(ctx) {
  const { C, MONO, lib } = ctx;
  const role = ctx.config?.profile?.role ?? 'Cyber Security · Networking · Tool Builder';
  const since = String(ctx.config?.profile?.since ?? '2019').slice(0, 4);
  const X = 48, FS = 18, CW = FS * 0.6;

  // Script: [kind, text]; commands are typed, output lines are printed.
  const script = [
    ['cmd', 'whoami'],
    ['out', `liam abu  //  ${role.toLowerCase()}`, C.ink],
    ['gap'],
    ['cmd', 'cat ~/.about'],
    ['out', '> builds tools, ships them, then tries to break them.'],
    ['out', '> networks · security · game servers · pixels.'],
    ['out', `> online since ${since} · based in israel · home: liam.plus`],
    ['gap'],
    ['prompt'],
  ];

  let y = 80, t = 0.4;
  const parts = [];
  script.forEach(([kind, s, fill], i) => {
    if (kind === 'gap') { y += 10; return; }
    if (kind === 'cmd' || kind === 'prompt') {
      parts.push(`<text x="${X}" y="${y}" font-family="${MONO}" font-size="${FS}" textLength="${(12 * CW).toFixed(1)}" lengthAdjust="spacing" class="fd" style="animation-delay:${t.toFixed(2)}s"><tspan fill="${C.green}" font-weight="700">liam@plus</tspan><tspan fill="${C.muted}">:~$</tspan></text>`);
      if (kind === 'cmd') {
        parts.push(lib.typed(C, `ab${i}`, s, X + 13.5 * CW, y, { size: FS, fill: C.text, begin: t + 0.35, cps: 14, cursor: false }));
        t += 0.35 + s.length / 14 + 0.35;
      } else {
        parts.push(`<rect x="${X + 13.5 * CW}" y="${y - 15}" width="${CW}" height="20" fill="${C.green}" class="fd blink" style="animation-delay:${t.toFixed(2)}s,${t.toFixed(2)}s"/>`);
      }
    } else {
      parts.push(txt(MONO, X, y, s, { size: FS, fill: fill ?? C.text, cls: 'fd', style: `animation-delay:${t.toFixed(2)}s`, weight: fill ? 700 : 400 }));
      t += 0.22;
    }
    y += 29;
  });

  // Right side: the lightning block, with the bolt pulsing and an idle bob.
  const S = 7, AW = 24 * S, AX = W - AW - 72, AY = 64;
  const tag = 'LIAM+';
  const tagW = pxW(tag, 3);

  const body = `
  <defs>${lib.crtDefs(C, 'ab', W, H)}
    <pattern id="abgrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${C.green}" stroke-opacity=".045"/></pattern>
  </defs>
  <style>
    .fd{opacity:0;animation:fd .25s ease-out forwards}
    @keyframes fd{to{opacity:1}}
    .blink{animation:fd .25s ease-out forwards,bl 1s steps(1) infinite}
    @keyframes bl{50%{opacity:0}}
    .bob{animation:bob 2.4s steps(2) infinite}
    @keyframes bob{50%{transform:translateY(-4px)}}
    .zap{animation:zap 3.6s steps(1) infinite}
    @keyframes zap{0%,88%,100%{opacity:0}90%{opacity:.75}92%{opacity:0}94%{opacity:.5}96%{opacity:0}}
    .halo{animation:halo 3.6s ease-in-out infinite}
    @keyframes halo{0%,100%{opacity:${C.name === 'dark' ? '.18' : '.08'}}50%{opacity:${C.name === 'dark' ? '.4' : '.2'}}}
  </style>
  <g clip-path="url(#screenab)">
    ${windowChrome(C, MONO, W, H, 'liam@plus: ~ — whoami')}
    <rect y="34" width="${W}" height="${H - 34}" fill="url(#abgrid)"/>
    ${parts.join('\n    ')}
    <line x1="${AX - 44}" y1="58" x2="${AX - 44}" y2="${H - 24}" stroke="${C.line}" stroke-dasharray="2 6"/>
    <rect x="${AX - 14}" y="${AY - 14}" width="${AW + 28}" height="${AW + 28}" fill="${C.green}" class="halo" filter="url(#glowab)" opacity=".2"/>
    <g class="bob">
      <rect x="${AX - 6}" y="${AY - 6}" width="${AW + 12}" height="${AW + 12}" fill="${C.shade}" opacity="${C.name === 'dark' ? 0.6 : 0.9}"/>
      ${avatarBlock(AX, AY, S)}
      <g fill="#fff8c0" class="zap">${avatarBolt(AX, AY, S)}</g>
    </g>
    ${px(tag, AX + (AW - tagW) / 2, AY + AW + 22, 3, { fill: C.green })}
    ${lib.crtOverlay(C, 'ab', W, H)}
  </g>
  ${border(C, W, H)}`;
  return { 'about.svg': lib.svg(W, H, body, 'whoami — Liam Abu: builds tools, ships them, then tries to break them'), 'h-about.svg': lib.header(C, ctx.no('about'), 'HELLOWORLD') };
}

export function readme(ctx) {
  return `<p align="center">${ctx.pic('h-about.svg', 'width="100%" alt="HELLOWORLD"')}</p>
<p align="center">${ctx.pic('about.svg', 'width="100%" alt="whoami: Liam Abu. Builds tools, ships them, then tries to break them. Networks, security, game servers, pixels. Based in Israel, home at liam.plus."')}</p>`;
}
