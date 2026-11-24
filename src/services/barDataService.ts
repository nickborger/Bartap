import {
  addDoc,
  collection,
  deleteField,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { BarLocation, Review } from '../types.ts';
import { INITIAL_TALLAHASSEE_BARS } from '../data/bars.ts';
import { resolveBarImage } from '../data/bundledImages.ts';

/**
 * Firestore layout
 *
 *   reviews/{reviewId}  - one doc per patron review, shared by everyone
 *       barId, uid, author, rating, vibeScore, valueScore, musicScore,
 *       comment, tags, helpfulCount, createdAt
 *
 *   bars/{barId}        - the full bar listing (same shape as BarLocation, minus reviews),
 *                         created/edited by admins in the app; owners edit their own bar's
 *                         live fields (hours today, cover, specials, events...) plus
 *                         ownerReplies: { [reviewId]: reply }
 *
 *   config/seed         - written once when the built-in bars (src/data/bars.ts) were copied
 *                         into `bars`. Until then the app shows the built-in bars as a fallback.
 */

export type ReviewsByBar = Record<string, Review[]>;

const formatDate = (ts?: Timestamp | null) =>
  ts
    ? ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Just now';

/** Live listener for all reviews (newest first), grouped by bar. */
export function subscribeToReviews(
  onChange: (reviews: ReviewsByBar) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(1000));
  return onSnapshot(
    q,
    { includeMetadataChanges: false },
    (snap) => {
      const grouped: ReviewsByBar = {};
      snap.forEach((d) => {
        const data = d.data({ serverTimestamps: 'estimate' });
        const review: Review = {
          id: d.id,
          author: data.author || 'Bar Tap Patron',
          avatarSeed: data.uid,
          rating: Number(data.rating) || 0,
          vibeScore: Number(data.vibeScore) || 0,
          valueScore: Number(data.valueScore) || 0,
          musicScore: Number(data.musicScore) || 0,
          date: formatDate(data.createdAt as Timestamp | null),
          comment: data.comment || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          helpfulCount: Number(data.helpfulCount) || 0,
        };
        (grouped[data.barId] ||= []).push(review);
      });
      onChange(grouped);
    },
    (err) => onError?.(err)
  );
}

const clampScore = (n: number) => Math.min(5, Math.max(1, Math.round(Number(n) || 5)));

export function addReview(uid: string, barId: string, review: Review) {
  return addDoc(collection(db, 'reviews'), {
    barId,
    uid,
    author: review.author.slice(0, 80),
    rating: clampScore(review.rating),
    vibeScore: clampScore(review.vibeScore),
    valueScore: clampScore(review.valueScore),
    musicScore: clampScore(review.musicScore),
    comment: review.comment.slice(0, 2000),
    tags: (review.tags || []).slice(0, 20),
    helpfulCount: 0,
    createdAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Bars (Firestore `bars` collection)
// ---------------------------------------------------------------------------

/** A bar as stored in Firestore (reviews come from the reviews collection). */
export type StoredBar = BarLocation & {
  ownerReplies?: Record<string, NonNullable<Review['ownerReply']>>;
};
export type BarOverride = Partial<StoredBar>;

export interface BarsState {
  /** false until the first snapshot (or an error) arrives */
  loaded: boolean;
  /** true if the listener failed (e.g. rules not published yet) */
  error: boolean;
  /** Complete bar docs, sorted by name */
  bars: StoredBar[];
  /** Old-style docs that only hold an owner's edits for a built-in bar (no name field) */
  legacyOverrides: Record<string, BarOverride>;
}

export const EMPTY_BARS_STATE: BarsState = { loaded: false, error: false, bars: [], legacyOverrides: {} };

/** Fields only an admin may change; owners can change the rest via OWNER_EDITABLE_FIELDS. */
export const OWNER_EDITABLE_FIELDS = [
  'hoursToday',
  'hoursTodaySetOn',
  'coverCharge',
  'currentDJsBand',
  'crowdDensity',
  'estimatedWaitMinutes',
  'websiteUrl',
  'phone',
  'tagline',
  'category',
  'cameras',
  'drinkSpecials',
  'events',
  'websiteVerification',
  'activeFlashDeal',
  'staff',
  'auditLog',
  'ownerReplies',
] as const;

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const asNumber = (v: unknown, d = 0) => (typeof v === 'number' && !Number.isNaN(v) ? v : d);
const asString = (v: unknown, d = '') => (typeof v === 'string' ? v : d);

/** Turns a Firestore bar doc into a StoredBar with safe defaults. */
export function docToBar(id: string, raw: Record<string, unknown>): StoredBar {
  const data = { ...raw };
  delete data.createdAt;
  delete data.updatedAt;
  delete data.updatedBy;
  delete data.createdBy;
  return {
    ...(data as Partial<StoredBar>),
    id,
    name: asString(data.name, 'Unnamed bar'),
    slug: asString(data.slug, id),
    tagline: asString(data.tagline),
    neighborhood: asString(data.neighborhood, 'Tallahassee'),
    address: asString(data.address),
    city: asString(data.city, 'Tallahassee'),
    state: asString(data.state, 'FL'),
    zip: asString(data.zip),
    websiteUrl: asString(data.websiteUrl),
    phone: asString(data.phone),
    hoursToday: asString(data.hoursToday),
    coverCharge: asString(data.coverCharge),
    crowdDensity: asNumber(data.crowdDensity),
    estimatedWaitMinutes: asNumber(data.estimatedWaitMinutes),
    currentVibe: (asString(data.currentVibe, 'Chilled Social') as BarLocation['currentVibe']),
    rating: asNumber(data.rating),
    totalReviews: asNumber(data.totalReviews),
    category: asString(data.category, 'Bar'),
    image: asString(data.image),
    cameras: asArray(data.cameras),
    drinkSpecials: asArray(data.drinkSpecials),
    reviews: [],
    features: asArray(data.features),
    tappedInCount: asNumber(data.tappedInCount),
    weeklyHours: Array.isArray(data.weeklyHours) ? (data.weeklyHours as string[]) : undefined,
    coordinates:
      data.coordinates && typeof (data.coordinates as { lat?: unknown }).lat === 'number'
        ? (data.coordinates as { lat: number; lng: number })
        : undefined,
  };
}

/** Live listener for the `bars` collection. */
export function subscribeToBars(onChange: (state: BarsState) => void) {
  return onSnapshot(
    collection(db, 'bars'),
    (snap) => {
      const bars: StoredBar[] = [];
      const legacyOverrides: Record<string, BarOverride> = {};
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        if (typeof data.name === 'string' && data.name.trim()) {
          bars.push(docToBar(d.id, data));
        } else {
          const o = { ...data } as BarOverride & Record<string, unknown>;
          delete o.updatedAt;
          delete o.updatedBy;
          legacyOverrides[d.id] = o;
        }
      });
      bars.sort((a, b) => a.name.localeCompare(b.name));
      onChange({ loaded: true, error: false, bars, legacyOverrides });
    },
    (err) => {
      console.error('Bars listener error:', err);
      onChange({ loaded: true, error: true, bars: [], legacyOverrides: {} });
    }
  );
}

/** Live listener for config/seed. Calls back with true/false, or null if it can't be read. */
export function subscribeToSeedMarker(onChange: (seeded: boolean | null) => void) {
  return onSnapshot(
    doc(db, 'config', 'seed'),
    (snap) => onChange(snap.exists()),
    () => onChange(null)
  );
}

/** The built-in bars with any old owner edits applied (used until the bars are seeded). */
export function builtInBars(legacyOverrides: Record<string, BarOverride> = {}): StoredBar[] {
  return INITIAL_TALLAHASSEE_BARS.map((b) => {
    const o = legacyOverrides[b.id] || {};
    return { ...b, ...o, id: b.id, reviews: [] } as StoredBar;
  });
}

/**
 * Which bars the app should use: the Firestore bars, or the built-in bars while the collection
 * is still empty and has never been seeded (or can't be read yet).
 */
export function resolveStoredBars(state: BarsState, seeded: boolean | null): {
  bars: StoredBar[];
  usingBuiltIn: boolean;
} {
  if (!state.loaded) return { bars: [], usingBuiltIn: false };
  if (state.error || (state.bars.length === 0 && seeded !== true)) {
    return { bars: builtInBars(state.legacyOverrides), usingBuiltIn: true };
  }
  return { bars: state.bars, usingBuiltIn: false };
}

/** Today's local date as YYYY-MM-DD. */
export function localDateKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Today's hours: an owner's override for today wins, else the weekly hours, else the stored text. */
export function computeHoursToday(bar: StoredBar, now = new Date()): string {
  if (bar.hoursToday && bar.hoursTodaySetOn === localDateKey(now)) return bar.hoursToday;
  if (bar.weeklyHours && bar.weeklyHours.length === 7) {
    const today = bar.weeklyHours[now.getDay()];
    if (today && today.trim()) return today;
    const openDays = WEEKDAY_NAMES.filter((_, i) => bar.weeklyHours![i]?.trim());
    return openDays.length ? 'Closed today' : 'Hours not posted';
  }
  return bar.hoursToday || 'Hours not posted';
}

/** Combines stored bars + shared reviews into what the app shows. */
export function mergeBars(storedBars: StoredBar[], reviewsByBar: ReviewsByBar): BarLocation[] {
  return storedBars.map((stored) => {
    const { ownerReplies, ...fields } = stored;
    const extraReviews = reviewsByBar[stored.id] || [];
    let reviews = [...extraReviews];
    if (ownerReplies) {
      reviews = reviews.map((r) =>
        ownerReplies[r.id] ? { ...r, ownerReply: ownerReplies[r.id] } : r
      );
    }
    const merged: BarLocation = {
      ...fields,
      image: resolveBarImage(fields.image),
      hoursToday: computeHoursToday(stored),
      reviews,
    };
    if (extraReviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);
      merged.rating = Number(avg.toFixed(1));
      merged.totalReviews = (stored.totalReviews || 0) + extraReviews.length;
    }
    return merged;
  });
}

const clean = (v: unknown) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/**
 * Saves an owner's edits to their bar: only the owner-editable fields that changed, plus any
 * owner replies to reviews. `current` is the bar as the app showed it before the edit.
 */
export async function saveOwnerBarEdits(uid: string, current: BarLocation, updated: BarLocation) {
  const changes: Record<string, unknown> = {};
  for (const key of OWNER_EDITABLE_FIELDS) {
    if (key === 'ownerReplies' || key === 'hoursTodaySetOn') continue;
    const before = (current as unknown as Record<string, unknown>)[key];
    const after = (updated as unknown as Record<string, unknown>)[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes[key] = after === undefined ? deleteField() : clean(after);
    }
  }
  if ('hoursToday' in changes) changes.hoursTodaySetOn = localDateKey();

  const repliesBefore: Record<string, unknown> = {};
  (current.reviews || []).forEach((r) => r.ownerReply && (repliesBefore[r.id] = r.ownerReply));
  const repliesAfter: Record<string, unknown> = {};
  (updated.reviews || []).forEach((r) => r.ownerReply && (repliesAfter[r.id] = r.ownerReply));
  if (JSON.stringify(repliesBefore) !== JSON.stringify(repliesAfter)) {
    changes.ownerReplies = clean(repliesAfter);
  }

  if (Object.keys(changes).length === 0) return;
  await updateDoc(doc(db, 'bars', current.id), {
    ...changes,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });
}
