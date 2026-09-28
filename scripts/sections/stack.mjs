// LOADOUT — skillicons.dev tiles fetched at build time and recomposed into our own animated SVG,
// so icons skillicons doesn't have (see CUSTOM) can sit in the grid in the right order.
export const id = 'stack';

const PER_LINE = 10;
const TILE = 256;
const GAP = 44; // skillicons spacing: tiles every 300 units

// Hand-drawn tiles for icons skillicons doesn't provide. Same 256×256 rounded-tile style.
const CUSTOM = {
  wireshark: (theme) => {
    const bg = theme === 'light' ? '#F4F2ED' : '#242938';
    return `<rect width="256" height="256" rx="60" fill="${bg}"/>
      <path d="M58 168 C98 160 136 118 146 52 C170 98 188 136 200 168 Z" fill="#1679A7"/>
      <path d="M146 52 C150 96 144 136 120 164" stroke="${bg}" stroke-width="8" fill="none" stroke-linecap="round" opacity=".55"/>
      <path d="M40 190 q22 -16 44 0 t44 0 t44 0 t44 0" stroke="#1679A7" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M62 214 q22 -14 44 0 t44 0 t44 0" stroke="#58A6D6" stroke-width="10" fill="none" stroke-linecap="round" opacity=".8"/>`;
  },
};

const iconsURL = (ids, theme) => `https://skillicons.dev/icons?i=${ids.join(',')}&perline=${PER_LINE}&theme=${theme}`;

export async function data(env) {
  const stack = env.config.stack ?? [];
  const fetched = stack.filter((s) => !CUSTOM[s]);
  const out = { stack, sheets: {} };
  for (const theme of ['dark', 'light']) {
    try {
      const res = await fetch(iconsURL(fetched, theme));
      if (!res.ok) throw new Error(String(res.status));
      out.sheets[theme] = await res.text();
    } catch (e) {
      console.warn(`  ! skillicons ${theme}: ${e.message}`);
    }
  }
  // Keep the last good sheets so a skillicons outage never blanks the section.
  const key = `stack-${createKey(stack)}`;
  if (out.sheets.dark && out.sheets.light) env.cache.set(key, out);
  return out.sheets.dark ? out : env.cache.get(key) ?? out;
}

const createKey = (stack) => stack.join('-').replace(/[^a-z0-9-]/g, '').slice(0, 80);

// Re-flow the fetched tiles into their final slots (leaving room for custom tiles) and add a fade-in.
function compose(sheet, stack, theme, C) {
  const inner = sheet.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const slots = stack.map((s, i) => ({ s, i })).filter(({ s }) => !CUSTOM[s]).map(({ i }) => i);
  const pos = (i) => [(i % PER_LINE) * (TILE + GAP), Math.floor(i / PER_LINE) * (TILE + GAP)];
  const delay = (i) => (0.15 + i * 0.045).toFixed(3);
  let k = 0;
  let body = inner.replace(/<g transform="translate\(\s*[\d.]+,\s*[\d.]+\s*\)">/g, () => {
    const i = slots[k++];
    const [x, y] = pos(i);
    return `<g class="ti" style="animation-delay:${delay(i)}s" transform="translate(${x}, ${y})">`;
  });
  stack.forEach((s, i) => {
    if (!CUSTOM[s]) return;
    const [x, y] = pos(i);
    body += `<g class="ti" style="animation-delay:${delay(i)}s" transform="translate(${x}, ${y})"><svg width="256" height="256" viewBox="0 0 256 256">${CUSTOM[s](theme)}</svg></g>`;
  });
  const rows = Math.ceil(stack.length / PER_LINE);
  const cols = Math.min(PER_LINE, stack.length);
  const W = cols * (TILE + GAP) - GAP;
  const H = rows * (TILE + GAP) - GAP;
  const sweep = theme === 'light' ? '#ffffff' : C.green;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${(W / 5.333).toFixed(0)}" height="${(H / 5.333).toFixed(0)}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="${stack.join(', ')}">
  <title>Loadout: ${stack.join(', ')}</title>
  <defs>
    <linearGradient id="stSweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${sweep}" stop-opacity="0"/><stop offset=".5" stop-color="${sweep}" stop-opacity="${theme === 'light' ? 0.55 : 0.16}"/><stop offset="1" stop-color="${sweep}" stop-opacity="0"/></linearGradient>
    <clipPath id="stClip">${Array.from({ length: stack.length }, (_, i) => { const [x, y] = pos(i); return `<rect x="${x}" y="${y}" width="256" height="256" rx="60"/>`; }).join('')}</clipPath>
  </defs>
  <style>
    .ti{animation:ti .45s ease-out both}
    @keyframes ti{from{opacity:0}to{opacity:1}}
    .sw{animation:sw 7s ease-in-out 3s infinite}
    @keyframes sw{0%{transform:translateX(-${W * 0.3}px)}35%,100%{transform:translateX(${W * 1.1}px)}}
  </style>
  ${body}
  <g clip-path="url(#stClip)"><rect class="sw" x="0" y="0" width="${W * 0.22}" height="${H}" fill="url(#stSweep)" transform="skewX(-18)"/></g>
</svg>`;
}

export function render(ctx) {
  const d = ctx.data.stack;
  const files = { 'h-stack.svg': ctx.lib.header(ctx.C, ctx.no('stack'), 'LOADOUT', ctx.C.warn) };
  const sheet = d?.sheets?.[ctx.theme] ?? d?.sheets?.dark;
  if (sheet && d.stack?.length) files['stack.svg'] = compose(sheet, d.stack, ctx.theme, ctx.C);
  return files;
}

export function readme(ctx) {
  const head = ctx.pic('h-stack.svg', `width="100%" alt="${ctx.no('stack')} // Loadout"`);
  const stack = ctx.data.stack?.stack ?? [];
  if (!ctx.data.stack?.sheets?.dark && !ctx.data.stack?.sheets) return head;
  return `${head}

<p align="center">${ctx.pic('stack.svg', `width="560" alt="${stack.join(', ')}"`)}</p>`;
}
