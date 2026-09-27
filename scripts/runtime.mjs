// Loads section modules, runs their data() once, and renders them for both themes.
// Shared by build.mjs and dev/preview.mjs so a preview is exactly what ships.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as pixel from './pixel.mjs';
import * as lib from './lib.mjs';

export const libFor = () => ({ ...pixel, ...lib });

export function makeCache(ROOT) {
  const dir = join(ROOT, 'data');
  return {
    get(key) {
      const f = join(dir, `${key}.json`);
      try { return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; } catch { return null; }
    },
    set(key, value) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${key}.json`), JSON.stringify(value, null, 1) + '\n');
    },
  };
}

export async function loadSections(ROOT, only) {
  const dir = join(ROOT, 'scripts', 'sections');
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && !f.startsWith('_') && (!only || f === `${only}.mjs`)).sort();
  const mods = [];
  for (const f of files) {
    const m = await import(pathToFileURL(join(dir, f)).href);
    if (!m.id || !m.render) { console.warn(`  ! section ${f}: missing id/render`); continue; }
    mods.push(m);
  }
  return mods;
}

export async function runData(mods, env) {
  const out = {};
  for (const m of mods) {
    try { out[m.id] = m.data ? await m.data(env) : null; }
    catch (e) { console.warn(`  ! section ${m.id} data: ${e.message}`); out[m.id] = null; }
  }
  return out;
}

// "03" for the third id in config.layout that is currently shown. Unlisted ids get "--".
export const sectionNo = (config) => (id) => {
  const i = (config.layout ?? []).indexOf(id);
  return i < 0 ? '--' : String(i + 1).padStart(2, '0');
};

export const lightName = (name) => name.replace(/\.svg$/, '-light.svg');

// Render every section in both themes. Returns { 'assets-relative path': svgString }.
export function renderAll(mods, base) {
  const files = {};
  for (const theme of ['dark', 'light']) {
    const ctx = { ...base, theme, C: lib.THEMES[theme], MONO: lib.MONO, lib: libFor(), no: sectionNo(base.config) };
    for (const m of mods) {
      try {
        for (const [name, s] of Object.entries(m.render(ctx) ?? {})) files[theme === 'dark' ? name : lightName(name)] = s;
      } catch (e) {
        console.warn(`  ! section ${m.id} render(${theme}): ${e.stack}`);
      }
    }
  }
  return files;
}

// <picture> that swaps to the light variant, with content-hash cache busting on both.
export function picFactory(ASSETS) {
  const v = (name) => {
    const f = join(ASSETS, name);
    return existsSync(f) ? `?v=${createHash('sha1').update(readFileSync(f)).digest('hex').slice(0, 8)}` : '';
  };
  return (name, attrs = '') => {
    const light = lightName(name);
    const hasLight = existsSync(join(ASSETS, light));
    return hasLight
      ? `<picture><source media="(prefers-color-scheme: light)" srcset="assets/${light}${v(light)}"/><img src="assets/${name}${v(name)}" ${attrs}/></picture>`
      : `<img src="assets/${name}${v(name)}" ${attrs}/>`;
  };
}
