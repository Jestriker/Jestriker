// Badge row under the hero. The shields.io badges are downloaded at build time and served from
// assets/badges/, so the profile never depends on shields.io being up (last good copy is kept).
export const id = 'badges';

const BADGES = [
  { name: 'liam-plus', url: 'https://img.shields.io/badge/liam.plus-enter_LiamOS-22ff88?style=for-the-badge&labelColor=050807', alt: 'liam.plus', href: 'https://liam.plus' },
  { name: 'cyber-security', url: 'https://img.shields.io/badge/cyber_security-networking-a78bfa?style=for-the-badge&labelColor=050807', alt: 'Cyber Security & Networking' },
  { name: 'israel', url: 'https://img.shields.io/badge/based_in-Israel-38bdf8?style=for-the-badge&labelColor=050807', alt: 'Israel' },
];

export async function data(env) {
  const out = {};
  for (const b of BADGES) {
    try {
      const res = await fetch(b.url, { headers: { 'User-Agent': 'profile-builder' } });
      if (!res.ok) throw new Error(String(res.status));
      out[b.name] = await res.text();
    } catch (e) {
      console.warn(`  ! badge ${b.name}: ${e.message}`);
    }
  }
  const complete = BADGES.every((b) => out[b.name]);
  if (complete) env.cache.set('badges', out);
  return complete ? out : { ...(env.cache.get('badges') ?? {}), ...out };
}

export function render(ctx) {
  if (ctx.theme !== 'dark') return {}; // badges look the same in both themes
  const files = {};
  for (const b of BADGES) if (ctx.data.badges?.[b.name]) files[`badges/${b.name}.svg`] = ctx.data.badges[b.name];
  return files;
}

export function readme(ctx) {
  const imgs = BADGES.filter((b) => ctx.data.badges?.[b.name]).map((b) => {
    const img = ctx.pic(`badges/${b.name}.svg`, `alt="${b.alt}"`);
    return b.href ? `<a href="${b.href}">${img}</a>` : img;
  });
  return imgs.length ? `<p align="center">\n  ${imgs.join('\n  ')}\n</p>` : '';
}
