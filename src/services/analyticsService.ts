/**
 * Bar Tap viewer + engagement analytics (Firebase Realtime Database).
 *
 * What is stored, and nothing more:
 *   live/{barId}/{sessionId}            = start time   (who is watching right now; removed when they leave)
 *   views/{barId}/{night}/{sessionId}   = { s: start, e: end }   (one row per watch, no names or user ids)
 *   counts/{barId}/{night}/{metric}     = a running number (page views, directions taps, chat messages...)
 *   sessionOwners/{sessionId}           = the viewer's uid, only while they watch, so the rules can check
 *                                         that people only write their own rows. Nobody can read it.
 *   admins/{uid} and barOwners/{barId}/{uid} decide who may read a venue's numbers (see database.rules.json).
 *
 * A "night" runs from 5 AM to 5 AM, so a 1 AM visit counts toward the night before.
 * Every write is fire-and-forget: if the Realtime Database is not set up yet, the app keeps working
 * and simply shows no counts.
 */
import { useEffect, useState } from 'react';
import {
  ref,
  set,
  remove,
  push,
  get,
  onValue,
  onDisconnect,
  serverTimestamp,
  increment,
  query,
  orderByKey,
  startAt,
} from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, rtdb } from '../firebase.ts';

// ---------------------------------------------------------------------------
// Settings you may want to change
// ---------------------------------------------------------------------------

/**
 * The public "X watching" number only shows once at least this many people are watching.
 * Below it, viewers just see the normal "Live" badge, so a quiet early evening never looks dead.
 * Owners and the admin always see the exact number. Set it to 1 to always show the number.
 */
export const PUBLIC_VIEWER_THRESHOLD = 3;

/** A watch shorter than this (someone scrolling past) is left out of the watch numbers. */
export const MIN_WATCH_MS = 5_000;

/** If the app is in the background this long, the watch ends (it starts again when they come back). */
const HIDDEN_GRACE_MS = 30_000;

/** The same person reopening the same bar's page within this time counts as one page view. */
const PAGE_VIEW_DEDUPE_MS = 10 * 60_000;

const NIGHT_START_HOUR = 5;
const MAX_SESSION_MS = 12 * 3600_000;

export type MetricKey = 'pageViews' | 'directions' | 'chat' | 'social' | 'website' | 'calls';

// ---------------------------------------------------------------------------
// Nights
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-11-24" for anything between 5 AM Nov 24 and 4:59 AM Nov 25 (device time). */
export function nightKey(date: Date = new Date()): string {
  const d = new Date(date.getTime() - NIGHT_START_HOUR * 3600_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The night key `daysBack` nights before tonight. */
export function nightKeyDaysAgo(daysBack: number, now: Date = new Date()): string {
  const d = new Date(now.getTime() - NIGHT_START_HOUR * 3600_000);
  d.setDate(d.getDate() - daysBack);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const validBarId = (id: string | undefined): id is string => !!id && /^[A-Za-z0-9_-]{1,100}$/.test(id);

// ---------------------------------------------------------------------------
// Who is staff (owners/admin): their own visits are left out of the numbers
// ---------------------------------------------------------------------------

const staffCache = new Map<string, Promise<boolean>>();

function isStaffFor(uid: string, barId: string): Promise<boolean> {
  const key = `${uid}|${barId}`;
  let p = staffCache.get(key);
  if (!p) {
    p = Promise.all([
      get(ref(rtdb, `admins/${uid}`)).then((s) => s.val() === true).catch(() => false),
      get(ref(rtdb, `barOwners/${barId}/${uid}`)).then((s) => s.val() === true).catch(() => false),
    ]).then(([a, o]) => a || o);
    staffCache.set(key, p);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Counting taps and views
// ---------------------------------------------------------------------------

const lastPageView = new Map<string, number>();

/** Adds 1 to a venue's metric for tonight. Owners and the admin are not counted. */
export function trackEvent(barId: string | undefined, metric: MetricKey): void {
  const uid = auth.currentUser?.uid;
  if (!uid || !validBarId(barId)) return;
  if (metric === 'pageViews') {
    const last = lastPageView.get(barId) ?? 0;
    if (Date.now() - last < PAGE_VIEW_DEDUPE_MS) return;
    lastPageView.set(barId, Date.now());
  }
  const night = nightKey();
  isStaffFor(uid, barId)
    .then((staff) => {
      if (staff) return;
      return set(ref(rtdb, `counts/${barId}/${night}/${metric}`), increment(1));
    })
    .catch(() => {
      /* analytics never break the app */
    });
}

// ---------------------------------------------------------------------------
// Watching (presence)
// ---------------------------------------------------------------------------

interface WatchSession {
  barId: string;
  sid: string;
  night: string;
  record: boolean; // false for owners/admin: they are not counted at all
  ready: Promise<boolean>;
  ended: boolean;
}

const holders = new Map<string, number>(); // barId -> how many players on this page show it
const sessions = new Map<string, WatchSession>(); // barId -> the session for this tab
let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
let pausedForHidden = false;
let listenersReady = false;
let everConnected = false;
let droppedAfterConnect = false;

function startSession(barId: string): void {
  const uid = auth.currentUser?.uid;
  if (!uid || sessions.has(barId)) return;
  const sid = push(ref(rtdb, 'sessionOwners')).key as string;
  const night = nightKey();
  const session: WatchSession = { barId, sid, night, record: true, ended: false, ready: Promise.resolve(false) };
  sessions.set(barId, session);
  session.ready = (async () => {
    try {
      session.record = !(await isStaffFor(uid, barId));
      // Owners and the Bar Tap team aren't counted: not in "watching", not in the stats.
      if (session.ended || !session.record) return false;
      const ownerRef = ref(rtdb, `sessionOwners/${sid}`);
      const liveRef = ref(rtdb, `live/${barId}/${sid}`);
      await set(ownerRef, uid);
      await onDisconnect(ownerRef).remove();
      await onDisconnect(liveRef).remove();
      if (session.record) {
        await set(ref(rtdb, `views/${barId}/${night}/${sid}`), { s: serverTimestamp() });
        await onDisconnect(ref(rtdb, `views/${barId}/${night}/${sid}/e`)).set(serverTimestamp());
      }
      await set(liveRef, serverTimestamp());
      return true;
    } catch {
      return false;
    }
  })();
  session.ready.then((ok) => {
    if (ok && session.ended) void finishSession(session);
  });
}

async function finishSession(session: WatchSession): Promise<void> {
  const { barId, sid, night } = session;
  const ownerRef = ref(rtdb, `sessionOwners/${sid}`);
  const liveRef = ref(rtdb, `live/${barId}/${sid}`);
  const endRef = ref(rtdb, `views/${barId}/${night}/${sid}/e`);
  try {
    if (session.record) {
      await onDisconnect(endRef).cancel();
      await set(endRef, serverTimestamp());
    }
    await onDisconnect(liveRef).cancel();
    await remove(liveRef);
    await onDisconnect(ownerRef).cancel();
    await remove(ownerRef);
  } catch {
    /* if this fails, the server's disconnect clean-up still closes the session */
  }
}

function endSession(barId: string): void {
  const session = sessions.get(barId);
  if (!session) return;
  sessions.delete(barId);
  session.ended = true;
  session.ready.then((ok) => {
    if (ok) void finishSession(session);
  });
}

function setupListeners(): void {
  if (listenersReady || typeof document === 'undefined') return;
  listenersReady = true;

  // Watching in a background tab or with the phone locked doesn't count.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (hiddenTimer) clearTimeout(hiddenTimer);
      hiddenTimer = setTimeout(() => {
        pausedForHidden = true;
        [...sessions.keys()].forEach(endSession);
      }, HIDDEN_GRACE_MS);
    } else {
      if (hiddenTimer) clearTimeout(hiddenTimer);
      hiddenTimer = null;
      if (pausedForHidden) {
        pausedForHidden = false;
        holders.forEach((n, barId) => n > 0 && startSession(barId));
      }
    }
  });

  // If the connection drops, the server already closed our sessions: start fresh ones when it's back.
  onValue(ref(rtdb, '.info/connected'), (snap) => {
    const connected = snap.val() === true;
    if (!connected) {
      if (everConnected) droppedAfterConnect = true;
      return;
    }
    if (droppedAfterConnect && sessions.size > 0) {
      const open = [...sessions.values()];
      open.forEach((s) => {
        s.ended = true;
        sessions.delete(s.barId);
      });
      if (!document.hidden) open.forEach((s) => (holders.get(s.barId) ?? 0) > 0 && startSession(s.barId));
    }
    droppedAfterConnect = false;
    everConnected = true;
  });
}

/**
 * Call while a live video of this bar is on screen; call the returned function when it isn't.
 * Several players showing the same bar in one tab count as one viewer.
 */
export function startWatching(barId: string): () => void {
  if (!validBarId(barId)) return () => {};
  setupListeners();
  holders.set(barId, (holders.get(barId) ?? 0) + 1);
  if (!document.hidden && !pausedForHidden) startSession(barId);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const n = (holders.get(barId) ?? 1) - 1;
    if (n <= 0) {
      holders.delete(barId);
      endSession(barId);
    } else holders.set(barId, n);
  };
}

/** React helper: counts this tab as watching `barId` while `active` is true. */
export function useWatchPresence(barId: string | undefined, active: boolean): void {
  useEffect(() => {
    if (!active || !barId) return;
    return startWatching(barId);
  }, [barId, active]);
}

// ---------------------------------------------------------------------------
// Reading: live count + access
// ---------------------------------------------------------------------------

function useAuthUid(): string | null {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);
  return uid;
}

/** How many people are watching this bar right now (null = unknown / not available). */
export function useLiveViewerCount(barId: string | undefined, enabled = true): number | null {
  const uid = useAuthUid();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    setCount(null);
    if (!enabled || !uid || !validBarId(barId)) return;
    return onValue(
      ref(rtdb, `live/${barId}`),
      (snap) => setCount(snap.size),
      () => setCount(null)
    );
  }, [barId, enabled, uid]);
  return count;
}

export interface AnalyticsAccess {
  loaded: boolean;
  uid: string | null;
  isAdmin: boolean;
  /** True when this person may see this bar's numbers (its owner, or the admin). */
  canSee: boolean;
}

/** Whether the signed-in person may read a venue's analytics (as the database rules see it). */
export function useAnalyticsAccess(barId: string | undefined, enabled = true): AnalyticsAccess {
  const uid = useAuthUid();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  useEffect(() => {
    setIsAdmin(null);
    if (!enabled || !uid) return;
    return onValue(
      ref(rtdb, `admins/${uid}`),
      (s) => setIsAdmin(s.val() === true),
      () => setIsAdmin(false)
    );
  }, [uid, enabled]);
  useEffect(() => {
    setIsOwner(null);
    if (!enabled || !uid || !validBarId(barId)) return;
    return onValue(
      ref(rtdb, `barOwners/${barId}/${uid}`),
      (s) => setIsOwner(s.val() === true),
      () => setIsOwner(false)
    );
  }, [uid, barId, enabled]);
  const loaded = !uid || !enabled || (isAdmin !== null && (isOwner !== null || !validBarId(barId)));
  return { loaded, uid, isAdmin: !!isAdmin, canSee: !!isAdmin || !!isOwner };
}

/** The words shown on the video for a live count, or null to show nothing. */
export function viewerCountLabel(count: number | null, exact: boolean): string | null {
  if (count === null || count <= 0) return null;
  if (exact) return `${count} watching`;
  return count >= PUBLIC_VIEWER_THRESHOLD ? `${count} watching` : null;
}

// ---------------------------------------------------------------------------
// Admin: keep the owner list the database rules use in step with Firestore
// ---------------------------------------------------------------------------

/**
 * Writes barOwners/{barId}/{uid} = true for every linked owner (admin only). Firestore stays the
 * source of truth; this copy only lets the Realtime Database rules know who owns which bar.
 */
export async function syncBarOwners(owners: { uid: string; role: string; ownedBarIds: string[] }[]): Promise<void> {
  const map: Record<string, Record<string, true>> = {};
  owners
    .filter((o) => o.role === 'owner')
    .forEach((o) =>
      o.ownedBarIds.filter(validBarId).forEach((barId) => {
        (map[barId] ||= {})[o.uid] = true;
      })
    );
  await set(ref(rtdb, 'barOwners'), map);
}

// ---------------------------------------------------------------------------
// Reading: the venue dashboard
// ---------------------------------------------------------------------------

export interface NightStats {
  night: string;
  watches: number;
  totalWatchMs: number;
  peak: number;
  peakAt: number | null;
  counts: Record<MetricKey, number>;
}

export interface VenueAnalytics {
  loaded: boolean;
  error: string | null;
  watchingNow: number;
  nights: NightStats[]; // newest first, only nights inside the range
}

const emptyCounts = (): Record<MetricKey, number> => ({
  pageViews: 0,
  directions: 0,
  chat: 0,
  social: 0,
  website: 0,
  calls: 0,
});

type RawViews = Record<string, Record<string, { s?: number; e?: number }>>;
type RawCounts = Record<string, Partial<Record<MetricKey, number>>>;

/** Pure maths, exported for tests: turns raw rows into per-night numbers. */
export function computeNights(views: RawViews, counts: RawCounts, liveSids: Set<string>, now: number): NightStats[] {
  const nights = new Set([...Object.keys(views || {}), ...Object.keys(counts || {})]);
  const out: NightStats[] = [];
  nights.forEach((night) => {
    const intervals: [number, number][] = [];
    Object.entries(views?.[night] || {}).forEach(([sid, row]) => {
      const s = typeof row?.s === 'number' ? row.s : null;
      if (s === null) return;
      let e = typeof row?.e === 'number' ? row.e : null;
      if (e === null) {
        if (!liveSids.has(sid) || now - s > MAX_SESSION_MS) return; // never closed properly: leave out
        e = now;
      }
      e = Math.min(e, s + MAX_SESSION_MS);
      if (e - s >= MIN_WATCH_MS) intervals.push([s, e]);
    });
    // Peak = most watches overlapping at the same moment.
    const points: [number, number][] = [];
    intervals.forEach(([s, e]) => points.push([s, 1], [e, -1]));
    points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let cur = 0;
    let peak = 0;
    let peakAt: number | null = null;
    points.forEach(([t, d]) => {
      cur += d;
      if (cur > peak) {
        peak = cur;
        peakAt = t;
      }
    });
    const c = emptyCounts();
    Object.entries(counts?.[night] || {}).forEach(([k, v]) => {
      if (k in c && typeof v === 'number') c[k as MetricKey] = v;
    });
    out.push({
      night,
      watches: intervals.length,
      totalWatchMs: intervals.reduce((sum, [s, e]) => sum + (e - s), 0),
      peak,
      peakAt,
      counts: c,
    });
  });
  return out.sort((a, b) => (a.night < b.night ? 1 : -1));
}

/** Live dashboard data for one bar, for the last `nightsBack` nights (0 = tonight only). */
export function useVenueAnalytics(barId: string | undefined, nightsBack: number, enabled = true): VenueAnalytics {
  const uid = useAuthUid();
  const [views, setViews] = useState<RawViews | null>(null);
  const [counts, setCounts] = useState<RawCounts | null>(null);
  const [live, setLive] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const from = nightKeyDaysAgo(nightsBack);

  useEffect(() => {
    setViews(null);
    setCounts(null);
    setError(null);
    if (!enabled || !uid || !validBarId(barId)) return;
    const fail = (e: Error) =>
      setError(/permission/i.test(e.message) ? 'permission' : e.message || 'Could not load analytics.');
    const u1 = onValue(
      query(ref(rtdb, `views/${barId}`), orderByKey(), startAt(from)),
      (s) => setViews((s.val() as RawViews) || {}),
      fail
    );
    const u2 = onValue(
      query(ref(rtdb, `counts/${barId}`), orderByKey(), startAt(from)),
      (s) => setCounts((s.val() as RawCounts) || {}),
      fail
    );
    const u3 = onValue(
      ref(rtdb, `live/${barId}`),
      (s) => setLive(new Set(Object.keys((s.val() as Record<string, unknown>) || {}))),
      () => setLive(new Set())
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, [barId, from, enabled, uid]);

  // Watches still going on keep growing: refresh the maths every 30 seconds.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const loaded = views !== null && counts !== null;
  const nights = loaded ? computeNights(views!, counts!, live, Date.now()).filter((n) => n.night >= from) : [];
  void tick;
  return { loaded, error, watchingNow: live.size, nights };
}

/** Adds up a list of nights. */
export function totalNights(nights: NightStats[]) {
  const counts = emptyCounts();
  let watches = 0;
  let totalWatchMs = 0;
  let best: NightStats | null = null;
  nights.forEach((n) => {
    watches += n.watches;
    totalWatchMs += n.totalWatchMs;
    (Object.keys(counts) as MetricKey[]).forEach((k) => (counts[k] += n.counts[k]));
    if (n.peak > 0 && (!best || n.peak > best.peak)) best = n;
  });
  const b = best as NightStats | null;
  return {
    watches,
    totalWatchMs,
    avgWatchMs: watches ? totalWatchMs / watches : 0,
    peak: b ? b.peak : 0,
    peakNight: b ? b.night : null,
    peakAt: b ? b.peakAt : null,
    counts,
  };
}

/** "4m 05s", "1h 12m", "38s". */
export function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${pad(sec % 60)}s`;
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}

// ---------------------------------------------------------------------------
// Links that get counted
// ---------------------------------------------------------------------------

/** A Google Maps directions link to the bar (works on iPhone, Android and computers). */
export function directionsUrl(bar: { address?: string; city?: string; state?: string; zip?: string }): string | null {
  const dest = [bar.address, bar.city, [bar.state, bar.zip].filter(Boolean).join(' ')]
    .map((x) => (x || '').trim())
    .filter(Boolean)
    .join(', ');
  return dest ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}` : null;
}

/** "tel:+18505551234" from a phone number as typed, or null if it has too few digits. */
export function telHref(phone: string | undefined): string | null {
  const digits = (phone || '').replace(/[^0-9+]/g, '');
  return digits.replace(/\+/g, '').length >= 7 ? `tel:${digits}` : null;
}
