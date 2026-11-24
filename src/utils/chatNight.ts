/**
 * Live chat "night": every bar's chat room clears at the bar's closing time.
 *
 * Each chat message is saved with an `expiresAt` time worked out here. The app
 * stops showing a message once that time passes, and Firestore's TTL
 * (time-to-live) policy deletes it for good shortly after (see FIREBASE_SETUP.md).
 *
 * How the time is picked:
 *  - If the bar is open now, the chat clears when it closes tonight
 *    (late closings like 2 AM count as tonight).
 *  - If the bar is closed now, or its hours can't be read (e.g. "Closed today"
 *    or "Hours not posted"), the chat clears at 4 AM, or at tonight's closing
 *    time if that comes first.
 */

import type { BarLocation } from '../types.ts';

/** The chat clears at this hour when there's no closing time to use. */
export const CHAT_FALLBACK_HOUR = 4; // 4 AM

/** Firestore rules refuse an expiry further away than this. Keep in sync with firestore.rules. */
export const CHAT_MAX_HOURS = 30;

type HoursSource = Partial<Pick<BarLocation, 'hoursToday' | 'weeklyHours' | 'hoursTodaySetOn'>>;

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "3:00 PM", "3 pm", "15:00", "noon", "midnight" -> minutes after midnight, or null. */
export function parseClock(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\./g, '');
  if (!s) return null;
  if (s === 'noon') return 12 * 60;
  if (s === 'midnight') return 24 * 60;
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (min > 59) return null;
  const ap = m[3];
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap.startsWith('a')) h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
  } else if (h > 24) {
    return null;
  }
  return h * 60 + min;
}

/** "11:00 AM – 8:00 PM" -> { open, close } in minutes, or null if it can't be read. */
export function parseHoursRange(text: string | null | undefined): { open: number; close: number } | null {
  if (!text) return null;
  const parts = text.split(/\s*(?:–|—|-|\bto\b)\s*/i).filter(Boolean);
  if (parts.length !== 2) return null;
  // "4-10 PM": give the first time the second one's AM/PM.
  let [a, b] = parts;
  if (!/[ap]m?$/i.test(a.trim()) && /[ap]m?$/i.test(b.trim()) && /^\d/.test(a.trim())) {
    const suffix = b.trim().match(/(am|pm|a|p)$/i)?.[1] ?? '';
    a = `${a} ${suffix}`;
  }
  const open = parseClock(a);
  const close = parseClock(b);
  if (open == null || close == null) return null;
  return { open, close };
}

/** The hours text a bar has for a given calendar day (owner's same-day change wins). */
function hoursTextFor(bar: HoursSource, day: Date): string | undefined {
  if (bar.hoursTodaySetOn && bar.hoursTodaySetOn === dateKey(day) && bar.hoursToday) return bar.hoursToday;
  if (bar.weeklyHours && bar.weeklyHours.length === 7) return bar.weeklyHours[day.getDay()] || undefined;
  // Bars without weekly hours: only today's text is known.
  if (dateKey(day) === dateKey(new Date())) return bar.hoursToday;
  return undefined;
}

const atMinutes = (day: Date, minutes: number) => {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
};

/** The next CHAT_FALLBACK_HOUR (4 AM) after `now`. */
function nextFallback(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), CHAT_FALLBACK_HOUR, 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

/** When messages posted right now should disappear. */
export function chatExpiryFor(bar: HoursSource, now: Date = new Date()): Date {
  const fallback = nextFallback(now);
  let best: { open: Date; close: Date } | null = null;

  for (const offset of [-1, 0, 1]) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const range = parseHoursRange(hoursTextFor(bar, day));
    if (!range) continue;
    const open = atMinutes(day, range.open);
    let close = atMinutes(day, range.close);
    if (close.getTime() <= open.getTime()) close = new Date(close.getTime() + 24 * 3600 * 1000);
    if (close.getTime() <= now.getTime()) continue;
    if (!best || close.getTime() < best.close.getTime()) best = { open, close };
  }

  let expiry: Date;
  if (!best) expiry = fallback;
  else if (best.open.getTime() <= now.getTime()) expiry = best.close; // open right now
  else expiry = best.close.getTime() < fallback.getTime() ? best.close : fallback; // closed right now

  const max = now.getTime() + (CHAT_MAX_HOURS - 1) * 3600 * 1000;
  if (expiry.getTime() > max) expiry = new Date(max);
  return expiry;
}

/** "2 AM" / "9:30 PM" for the chat's "clears at" note. */
export function formatClearTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: d.getMinutes() ? '2-digit' : undefined });
}
