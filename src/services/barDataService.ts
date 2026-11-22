import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { BarLocation, Review } from '../types.ts';

/**
 * Firestore layout
 *
 *   reviews/{reviewId}  - one doc per patron review, shared by everyone
 *       barId, uid, author, rating, vibeScore, valueScore, musicScore,
 *       comment, tags, helpfulCount, createdAt
 *
 *   bars/{barId}        - owner edits for a bar (only the fields that differ from the
 *                         built-in data in src/data), plus ownerReplies: { [reviewId]: reply }
 */

export type ReviewsByBar = Record<string, Review[]>;
export type BarOverride = Partial<BarLocation> & {
  ownerReplies?: Record<string, NonNullable<Review['ownerReply']>>;
};
export type BarOverrides = Record<string, BarOverride>;

// Fields that are computed by the app and never stored as owner overrides.
const NON_OVERRIDE_KEYS = new Set(['id', 'reviews', 'rating', 'totalReviews', 'distanceMiles']);

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

/** Live listener for owner edits to bars. */
export function subscribeToBarOverrides(
  onChange: (overrides: BarOverrides) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    collection(db, 'bars'),
    (snap) => {
      const map: BarOverrides = {};
      snap.forEach((d) => {
        const data = { ...d.data() } as BarOverride & Record<string, unknown>;
        delete data.updatedAt;
        delete data.updatedBy;
        map[d.id] = data;
      });
      onChange(map);
    },
    (err) => onError?.(err)
  );
}

/**
 * Saves an owner's edited bar: stores only the fields that differ from the built-in data,
 * plus any owner replies to reviews.
 */
export function saveBarOverride(uid: string, baseBar: BarLocation, updatedBar: BarLocation) {
  const diff: Record<string, unknown> = {};
  (Object.keys(updatedBar) as (keyof BarLocation)[]).forEach((key) => {
    if (NON_OVERRIDE_KEYS.has(key as string)) return;
    if (JSON.stringify(updatedBar[key]) !== JSON.stringify(baseBar[key])) {
      diff[key as string] = updatedBar[key];
    }
  });

  const ownerReplies: Record<string, NonNullable<Review['ownerReply']>> = {};
  (updatedBar.reviews || []).forEach((r) => {
    if (r.ownerReply) ownerReplies[r.id] = r.ownerReply;
  });

  // JSON round-trip strips undefined values and functions so Firestore accepts it.
  const clean = JSON.parse(JSON.stringify({ ...diff, ownerReplies }));
  return setDoc(doc(db, 'bars', baseBar.id), {
    ...clean,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });
}

/** Combines built-in bars + owner overrides + shared reviews into what the app shows. */
export function mergeBars(
  baseBars: BarLocation[],
  overrides: BarOverrides,
  reviewsByBar: ReviewsByBar
): BarLocation[] {
  return baseBars.map((base) => {
    const { ownerReplies, ...fields } = overrides[base.id] || {};
    const extraReviews = reviewsByBar[base.id] || [];
    let reviews = [...extraReviews, ...base.reviews];
    if (ownerReplies) {
      reviews = reviews.map((r) =>
        ownerReplies[r.id] ? { ...r, ownerReply: ownerReplies[r.id] } : r
      );
    }
    const merged: BarLocation = { ...base, ...fields, id: base.id, reviews };
    if (extraReviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);
      merged.rating = Number(avg.toFixed(1));
      merged.totalReviews = base.totalReviews + extraReviews.length;
    }
    return merged;
  });
}
