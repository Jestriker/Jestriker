// Israel wall-clock at build time, shared by hero (status line) and footer (day/night cycle).
// FORCE_HOUR=0..23 overrides the hour for previews (minutes are kept).

import { israelTime } from '../lib.mjs';

export function ilClock(now = new Date()) {
  const t = israelTime(now);
  const forced = process.env.FORCE_HOUR;
  if (forced !== undefined && forced !== '' && !Number.isNaN(+forced)) {
    t.hour = ((+forced % 24) + 24) % 24;
    t.hhmm = `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
  }
  return { hour: t.hour, minute: t.minute, hhmm: t.hhmm, weekday: t.weekday };
}

// dawn 5-7, day 7-17, dusk 17-19, night 19-5
export function phaseOf(hour) {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'dusk';
  return 'night';
}

export function statusOf(hour) {
  if (hour < 5) return 'probably still coding';
  if (hour < 9) return 'coffee.exe loading';
  if (hour < 13) return 'deep in the terminal';
  if (hour < 18) return 'shipping things';
  if (hour < 22) return 'fighting zombies';
  return 'one more commit...';
}
