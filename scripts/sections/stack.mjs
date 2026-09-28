// LOADOUT — section header plus the skillicons.dev strip (external, so its <picture> is built by hand).
export const id = 'stack';

export function render(ctx) {
  return { 'h-stack.svg': ctx.lib.header(ctx.C, ctx.no('stack'), 'LOADOUT', ctx.C.warn) };
}

export function readme(ctx) {
  const stack = ctx.config.stack ?? [];
  const head = ctx.pic('h-stack.svg', `width="100%" alt="${ctx.no('stack')} // Loadout"`);
  if (!stack.length) return head;
  const src = (theme) => `https://skillicons.dev/icons?i=${stack.join(',')}&perline=10&theme=${theme}`;
  return `${head}

<p align="center"><picture><source media="(prefers-color-scheme: light)" srcset="${src('light')}"/><img src="${src('dark')}" alt="${stack.join(', ')}"/></picture></p>`;
}
