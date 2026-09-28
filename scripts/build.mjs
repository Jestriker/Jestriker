#!/usr/bin/env node
// Builds the profile: loads GitHub data, runs every section in scripts/sections (both themes),
// writes /assets, and fills the <!-- section:<id> --> blocks in README.md. Zero dependencies.
//
//   node scripts/build.mjs            # published tools only
//   node scripts/build.mjs --drafts   # include tools marked "draft": true (local preview)

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSections, runData, renderAll, makeCache, picFactory, sectionNo } from './runtime.mjs';
import * as lib from './lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const config = JSON.parse(readFileSync(join(ROOT, 'tools.json'), 'utf8'));
const showDrafts = process.argv.includes('--drafts');
const tools = config.tools.filter((t) => showDrafts || !t.draft);
const now = new Date();
const { gh } = lib;

// Core GitHub data shared by several sections: releases, downloads, recent events.
// Also sets t.live = {version, when} on tools that publish GitHub releases.
async function loadGitHub() {
  const user = config.profile.github;
  const repos = (await gh(`users/${user}/repos?per_page=100&sort=pushed`)) ?? [];
  const events = [];
  let releases = 0;
  let downloads = 0;

  for (const t of tools) {
    if (!t.releasesRepo) continue;
    const rel = (await gh(`repos/${t.releasesRepo}/releases?per_page=30`)) ?? [];
    releases += rel.length;
    downloads += rel.flatMap((r) => r.assets ?? []).reduce((n, a) => n + (a.download_count ?? 0), 0);
    if (rel[0]) t.live = { version: rel[0].tag_name, when: rel[0].published_at };
    for (const r of rel.slice(0, 4)) {
      events.push({ when: r.published_at, kind: 'release', label: `${t.name} ${r.tag_name}` });
    }
  }
  for (const r of repos.filter((r) => !r.fork && r.name !== user && !tools.some((t) => t.releasesRepo?.endsWith(`/${r.name}`))).slice(0, 4)) {
    events.push({ when: r.pushed_at, kind: 'push', label: r.name });
  }
  for (const t of tools) if (!t.releasesRepo) events.push({ when: t.added ?? null, kind: 'online', label: `${t.name} → ${t.url.replace(/^https?:\/\//, '')}` });

  events.sort((a, b) => (b.when ? +new Date(b.when) : 0) - (a.when ? +new Date(a.when) : 0));
  const years = Math.floor((now - new Date(config.profile.since)) / 3.15576e10);
  return { events: events.slice(0, 8), releases, downloads, years };
}

function replaceBlock(md, name, content) {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  return md.replace(re, () => `<!-- ${name}:start -->\n${content}\n<!-- ${name}:end -->`);
}

// ───────────────────────────── main ─────────────────────────────

const github = await loadGitHub();
const cache = makeCache(ROOT);
cache.set('github', github);

const sections = await loadSections(ROOT);
const sectionData = await runData(sections, { gh, getJSON: lib.getJSON, config, tools, now, ROOT, cache });
const data = { ...sectionData, github };
const files = renderAll(sections, { config, tools, now, data });

// Every asset is generated, so start clean: nothing stale can survive a rename.
rmSync(ASSETS, { recursive: true, force: true });
for (const [f, s] of Object.entries(files)) {
  mkdirSync(dirname(join(ASSETS, f)), { recursive: true });
  writeFileSync(join(ASSETS, f), s);
}

const readme = join(ROOT, 'README.md');
if (existsSync(readme)) {
  let md = readFileSync(readme, 'utf8');
  const ctx = { config, tools, now, data, pic: picFactory(ASSETS), C: lib.THEMES.dark, lib, no: sectionNo(config) };
  for (const m of sections) {
    if (!m.readme) continue;
    try { md = replaceBlock(md, `section:${m.id}`, m.readme(ctx) ?? ''); }
    catch (e) { console.warn(`  ! section ${m.id} readme: ${e.message}`); }
  }
  writeFileSync(readme, md);
}
// Backup: mirror every external image the README still references (e.g. the live visitor counter)
// into backup/external/, so a copy of everything the profile shows lives in this repo.
if (existsSync(readme)) {
  const md = readFileSync(readme, 'utf8');
  const urls = [...new Set([...md.matchAll(/(?:src|srcset)="(https?:\/\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')))];
  const dir = join(ROOT, 'backup', 'external');
  mkdirSync(dir, { recursive: true });
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'profile-builder' } });
      if (!res.ok) throw new Error(String(res.status));
      const type = res.headers.get('content-type') ?? '';
      const ext = type.includes('svg') ? 'svg' : type.includes('png') ? 'png' : type.includes('gif') ? 'gif' : 'bin';
      const name = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 90);
      writeFileSync(join(dir, `${name}.${ext}`), Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      console.warn(`  ! backup ${url}: ${e.message}`);
    }
  }
}
console.log(`built ${Object.keys(files).length} svgs from ${sections.length} sections · ${tools.length} projects · ${github.releases} releases`);
