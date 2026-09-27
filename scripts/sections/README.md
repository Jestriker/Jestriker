# Sections

Each file here is one self-contained piece of the profile. `scripts/build.mjs` discovers them, fetches their
data once, renders them for **both themes**, and writes their README snippet between
`<!-- section:<id>:start -->` / `<!-- section:<id>:end -->` markers.

## Contract

```js
// scripts/sections/<id>.mjs
export const id = 'weather';            // must match the file name

// Optional. Fetch live data once per build. Must never throw — return a fallback instead.
// env = { gh, getJSON, config, tools, now, ROOT, cache }  (cache.get(key)/cache.set(key, value) persist
// small JSON between builds in data/<key>.json — use it for anything you'd lose otherwise)
export async function data(env) { return { ... }; }

// Required. Called once per theme. Return { '<name>.svg': '<svg …>' } — names relative to assets/.
// The build writes dark files as-is and light files with a `-light` suffix (hero.svg → hero-light.svg).
// ctx = { C, theme, MONO, config, tools, now, data, lib }
//   C      — palette from lib.THEMES[theme]; use its tokens for every UI colour
//   data   — { [sectionId]: whatever data() returned, github: {...core github data} }
//   lib    — { svg, typed, crtDefs, crtOverlay, esc, pixelText, textWidth, sprite, SPRITES, identicon, rng, glyph, israelTime, ago }
export function render(ctx) { return { 'weather.svg': ctx.lib.svg(1200, 200, '...', 'Weather') }; }

// Optional. Markdown/HTML for the README. Use ctx.pic(name, attrs) to embed an asset — it emits a
// <picture> with the light variant and a content-hash cache buster. Return '' to hide the section.
export function readme(ctx) { return `<p align="center">${ctx.pic('weather.svg', 'width="100%" alt="…"')}</p>`; }
```

## Rules for animated SVGs (GitHub renders them as <img>)

- No JavaScript, no external fonts/images, no `<foreignObject>`. CSS `@keyframes` and SMIL (`<animate>`) both work.
- Pixel art: build from `<rect>`s on an integer grid; keep `shape-rendering` crisp by using whole-pixel sizes.
- Every `id` must be unique **within that file** (prefix them).
- Keep files small: aim < 150 KB each.
- Preview with `node scripts/dev/preview.mjs <id> [seconds…]` → renders both themes to `.preview/<id>/` and
  screenshots each at the given animation times (default `0.5 2 6 30`).
