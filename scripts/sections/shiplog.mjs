// SHIP LOG — `tail -f` of the latest releases, pushes and sites going live, on a CRT terminal.
export const id = 'shiplog';

function log(ctx) {
  const { C, MONO, now } = ctx;
  const { svg, typed, crtDefs, crtOverlay, esc, ago } = ctx.lib;
  const light = C.name === 'light';
  const ev = ctx.data.github?.events ?? [];
  const W = 1200, H = 110 + ev.length * 28, id = 's';
  const icon = { release: ['▲', C.green], push: ['◆', C.blue], online: ['●', C.warn] };
  const start = 1.3;
  const lines = ev.map((e, k) => {
    const [g, col] = icon[e.kind] ?? ['·', C.muted];
    const y = 104 + k * 28;
    const date = e.when ? e.when.slice(0, 10) : '──────────';
    // Light: a faint zebra band keeps the rows readable without the dark screen's contrast.
    const zebra = light && k % 2 === 0 ? `<rect x="36" y="${y - 19}" width="${W - 72}" height="28" rx="6" fill="${C.line}" opacity=".35"/>` : '';
    return `<g class="fade" style="animation-delay:${(start + k * 0.18).toFixed(2)}s">${zebra}
      <text x="48" y="${y}" font-family="${MONO}" font-size="14" fill="${C.muted}">${date}</text>
      <text x="170" y="${y}" font-family="${MONO}" font-size="14" fill="${col}"${light ? ' font-weight="600"' : ''}>${g} ${e.kind.padEnd(8, ' ')}</text>
      <text x="300" y="${y}" font-family="${MONO}" font-size="14" fill="${C.text}">${esc(e.label)}</text>
      <text x="${W - 48}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="13" fill="${C.dim}">${e.when ? ago(e.when, now) : ''}</text></g>`;
  }).join('');
  const body = `
  <defs>${crtDefs(C, id, W, H)}</defs>
  <style>
    .fade{opacity:0;animation:fade .3s ease-out forwards}
    @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  </style>
  <g clip-path="url(#screen${id})">
    <rect width="${W}" height="${H}" fill="${light ? C.panel : C.bg}"/>
    ${light ? `<rect width="${W}" height="66" fill="${C.bg}"/>` : ''}
    <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" fill="none" stroke="${C.line}"/>
    <text x="48" y="48" font-family="${MONO}" font-size="15" fill="${C.muted}">$</text>
    ${typed(C, 'log', 'tail -f ~/.shiplog   # auto-updated every 3h by GitHub Actions', 66, 48, { size: 15, fill: C.green, begin: 0.2, cursor: false })}
    <line x1="${light ? 0 : 48}" y1="66" x2="${light ? W : W - 48}" y2="66" stroke="${C.line}"/>
    ${lines}
    ${crtOverlay(C, id, W, H)}
  </g>
  ${light ? `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" fill="none" stroke="${C.line}"/>` : ''}`;
  return svg(W, H, body, 'Ship log — latest releases and pushes');
}

export function render(ctx) {
  return {
    'h-shiplog.svg': ctx.lib.header(ctx.C, ctx.no('shiplog'), 'SHIP LOG', ctx.C.blue),
    'shiplog.svg': log(ctx),
  };
}

export function readme(ctx) {
  return `${ctx.pic('h-shiplog.svg', `width="100%" alt="${ctx.no('shiplog')} // Ship log"`)}

${ctx.pic('shiplog.svg', 'width="100%" alt="Ship log — latest releases and pushes"')}`;
}
