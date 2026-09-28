// BY THE NUMBERS — slot-machine counters: every digit reel spins 0→9 and lands on the live value.
export const id = 'stats';

const values = (ctx) => {
  const g = ctx.data.github ?? {};
  return [
    ['PROJECTS', ctx.tools.length],
    ['RELEASES', g.releases ?? 0],
    ['DOWNLOADS', g.downloads ?? 0],
    ['YEARS', g.years ?? 0],
  ];
};

function counters(ctx) {
  const { C, MONO } = ctx;
  const { svg, pixelText } = ctx.lib;
  const light = C.name === 'light';
  const W = 1200, H = 150;
  const items = values(ctx);
  const cellW = W / items.length;
  const scale = 7, gh = 7 * scale, step = gh + 14;
  let clipN = 0;
  const cells = items.map(([label, value], k) => {
    const digits = String(value).split('');
    const dw = 6 * scale;
    const x0 = k * cellW + (cellW - (digits.length * dw - scale)) / 2;
    const y0 = 30;
    const cols = digits.map((d, j) => {
      const seq = [...'0123456789', ...'0123456789'.slice(0, +d + 1)];
      const strip = seq.map((ch, n) => pixelText(ch, x0 + j * dw, y0 + n * step, scale, { fill: C.green })).join('');
      const dist = (seq.length - 1) * step;
      const cid = `sc${clipN++}`;
      // Light: the clip is widened so the hard pixel shadow (see #sd) isn't cut off.
      const pad = light ? 4 : 0;
      return `<clipPath id="${cid}"><rect x="${x0 + j * dw - 2}" y="${y0 - 2}" width="${dw + pad}" height="${gh + 4 + pad}"/></clipPath>
        <g clip-path="url(#${cid})"><g${light ? ' filter="url(#sd)"' : ''}><animateTransform attributeName="transform" type="translate" values="0 0;0 -${dist}" keySplines=".15 .6 .3 1" calcMode="spline" dur="${(1.6 + j * 0.35 + k * 0.2).toFixed(2)}s" fill="freeze"/>${strip}</g></g>`;
    }).join('');
    return `${cols}
      <text x="${k * cellW + cellW / 2}" y="${y0 + gh + 34}" text-anchor="middle" font-family="${MONO}" font-size="13" letter-spacing="3" fill="${C.muted}">${label}</text>
      ${k ? `<line x1="${k * cellW}" y1="28" x2="${k * cellW}" y2="${H - 24}" stroke="${C.line}" stroke-dasharray="2 6"/>` : ''}`;
  }).join('');
  const defs = light
    ? `<defs><filter id="sd" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="3" dy="3" stdDeviation="0" flood-color="${C.green}" flood-opacity=".18"/></filter>
       <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.panel}"/><stop offset="1" stop-color="${C.bg}"/></linearGradient></defs>`
    : '';
  const body = `${defs}<rect width="${W}" height="${H}" rx="16" fill="${light ? 'url(#sg)' : C.bg}"/><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" fill="none" stroke="${C.line}"/>${cells}`;
  const [p, r, d, y] = items.map((i) => i[1]);
  return svg(W, H, body, `${p} projects, ${r} releases, ${d} downloads, ${y} years on GitHub`);
}

export function render(ctx) {
  return {
    'h-stats.svg': ctx.lib.header(ctx.C, ctx.no('stats'), 'BY THE NUMBERS', ctx.C.purple),
    'stats.svg': counters(ctx),
  };
}

export function readme(ctx) {
  const [p, r, d, y] = values(ctx).map((i) => i[1]);
  return `${ctx.pic('h-stats.svg', `width="100%" alt="${ctx.no('stats')} // By the numbers"`)}

${ctx.pic('stats.svg', `width="100%" alt="${p} projects · ${r} releases · ${d} downloads · ${y} years on GitHub"`)}`;
}
