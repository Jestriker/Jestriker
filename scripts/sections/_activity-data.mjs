// Daily commit counts for the activity chart, from the commit search API.
// GitHub's contribution calendar reports 0 for this account, so we count commits ourselves.
// Only { 'YYYY-MM-DD': count } is ever stored — no repo names, no messages (some repos are private).

const USER = 'Jestriker';
const TZ = 'Asia/Jerusalem';
const KEY = 'activity';
const PACE_MS = 2200;        // search API: ~30 requests/min
const RECENT_DAYS = 40;      // re-queried on every build once the cache exists
const BACKFILL_DAYS = 380;   // 53 weeks + slack
const KEEP_DAYS = 400;       // older entries are pruned from the cache

const DAY = 864e5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const utcDay = (d) => new Date(d).toISOString().slice(0, 10);
export const ilDay = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));

// Query one date window (inclusive), paging through results. Splits the window when it exceeds
// the 1000-result search cap. Adds commits (deduped by sha) into `seen`. Returns false on failure.
async function fetchWindow(gh, from, to, seen, state) {
  const q = `author:${USER}+author-date:${utcDay(from)}..${utcDay(to)}`;
  let total = Infinity;
  for (let page = 1; page <= 10 && (page - 1) * 100 < total; page++) {
    if (state.calls++) await sleep(PACE_MS);
    const res = await gh(`search/commits?q=${q}&per_page=100&page=${page}&sort=author-date&order=desc`);
    if (!res || !Array.isArray(res.items)) return false;
    total = res.total_count ?? 0;
    if (page === 1 && total > 1000 && to - from >= DAY) {
      const mid = from + Math.floor((to - from) / DAY / 2) * DAY;
      const a = await fetchWindow(gh, from, mid, seen, state);
      const b = await fetchWindow(gh, mid + DAY, to, seen, state);
      return a && b;
    }
    for (const it of res.items) {
      const when = it?.commit?.author?.date;
      if (it?.sha && when) seen.set(it.sha, ilDay(when));
    }
    if (res.items.length < 100) break;
  }
  return true;
}

export async function loadActivity(env) {
  const now = +(env.now ?? new Date());
  let cached = null;
  try { cached = env.cache?.get(KEY); } catch { cached = null; }
  const hasCache = cached && typeof cached === 'object' && Object.keys(cached).length > 0;
  const days = {};
  if (hasCache) for (const [k, v] of Object.entries(cached)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(+v)) days[k] = +v;

  try {
    const span = hasCache ? RECENT_DAYS : BACKFILL_DAYS;
    const end = Date.parse(utcDay(now + DAY));            // tomorrow (UTC) covers IL-evening commits
    const start = Date.parse(utcDay(now - span * DAY));
    const seen = new Map();
    const state = { calls: 0 };
    let ok = true;
    for (let from = start; from <= end; from += 31 * DAY) {
      const to = Math.min(end, from + 30 * DAY);
      ok = (await fetchWindow(env.gh, from, to, seen, state)) && ok;
    }
    const fresh = {};
    for (const d of seen.values()) fresh[d] = (fresh[d] ?? 0) + 1;
    // Max per day: counts computed locally (which can see private repos) survive builds whose token sees less.
    for (const [d, n] of Object.entries(fresh)) days[d] = Math.max(days[d] ?? 0, n);
    if (!ok) console.warn('  ! activity: some search windows failed, kept cached counts');

    const cutoff = ilDay(now - KEEP_DAYS * DAY);
    const store = Object.fromEntries(Object.entries(days).filter(([d, n]) => d >= cutoff && n > 0).sort(([a], [b]) => (a < b ? -1 : 1)));
    if (Object.keys(store).length || !hasCache) env.cache?.set(KEY, store);
    return { days: store, today: ilDay(now) };
  } catch (e) {
    console.warn(`  ! activity: ${e.message}`);
    return { days, today: ilDay(now) };
  }
}
