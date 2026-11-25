import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase.ts';
import { BarSocialLinks, CameraAngle, DrinkSpecial } from '../types.ts';
import { BarOverride, StoredBar, builtInBars } from './barDataService.ts';

/**
 * Admin-only operations. Every write here is also enforced by firestore.rules
 * (users/{uid}.role == "admin"), so hiding the screen is not the only protection.
 */

// ---------------------------------------------------------------------------
// Bar listing form
// ---------------------------------------------------------------------------

export interface CameraViewInput {
  id?: string;
  name: string;
  locationLabel: string;
  viewType: CameraAngle['viewType'];
}

/** The fields an admin edits on the Add / Edit bar form. */
export interface BarListingInput {
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  market: string;
  lat: number | null;
  lng: number | null;
  neighborhood: string;
  category: string;
  currentVibe: StoredBar['currentVibe'];
  weeklyHours: string[]; // 7 entries, Sunday first, '' = closed
  phone: string;
  websiteUrl: string;
  /** Full links only (the form turns handles into links first). Empty = no icon. */
  socialLinks: BarSocialLinks;
  coverCharge: string;
  priceLevel: string;
  features: string[];
  drinkSpecials: DrinkSpecial[];
  image: string;
  cameras: CameraViewInput[];
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'bar'
  );
}

/** A bar id from its name that no existing bar uses (e.g. "madison-social", "madison-social-2"). */
export function uniqueBarId(name: string, existingIds: string[]): string {
  const base = slugify(name);
  const taken = new Set(existingIds);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Builds camera objects, keeping the live settings of cameras that already exist. */
function buildCameras(barId: string, views: CameraViewInput[], existing: CameraAngle[] = []): CameraAngle[] {
  return views
    .filter((v) => v.name.trim())
    .map((v, idx) => {
      const prev = v.id ? existing.find((c) => c.id === v.id) : undefined;
      const id = prev?.id || v.id || `${barId}-cam-${Date.now().toString(36)}-${idx + 1}`;
      const base: CameraAngle = prev || {
        id,
        name: v.name,
        locationLabel: v.locationLabel,
        viewType: v.viewType,
        fps: 30,
        crowdLevel: 0,
        status: 'LIVE',
        resolution: '1080p HD',
        keyVersion: 0,
        cloudRelay: {
          // Where viewers watch it on the Bar Tap relay (see relayService.ts).
          streamUrl: `/relay/rtc/bar/${barId}/${id}`,
          ingestProtocol: 'RTMPS / WebRTC',
          edgeNode: 'Bar Tap relay',
          relayStatus: 'ACTIVE',
          bitrateKbps: 1500,
          latencyMs: 500 + ((idx * 17) % 35),
          packetLossPercent: 0,
        },
      };
      return {
        ...base,
        id,
        name: v.name.trim(),
        locationLabel: v.locationLabel.trim() || v.name.trim(),
        viewType: v.viewType,
      };
    });
}

const strip = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** The Firestore fields the form controls. */
function listingFields(barId: string, input: BarListingInput, existing?: StoredBar) {
  const cameras = buildCameras(barId, input.cameras, existing?.cameras);
  const coordinates =
    input.lat != null && input.lng != null && !Number.isNaN(input.lat) && !Number.isNaN(input.lng)
      ? { lat: input.lat, lng: input.lng }
      : null;
  return strip({
    name: input.name.trim(),
    tagline: input.tagline.trim(),
    address: input.address.trim(),
    city: input.city.trim() || 'Tallahassee',
    state: input.state.trim() || 'FL',
    zip: input.zip.trim(),
    market: input.market.trim() || 'Tallahassee',
    coordinates,
    neighborhood: input.neighborhood.trim() || 'Tallahassee',
    category: input.category.trim() || 'Bar',
    currentVibe: input.currentVibe,
    weeklyHours: input.weeklyHours.map((h) => h.trim()),
    phone: input.phone.trim(),
    websiteUrl: input.websiteUrl.trim(),
    socialLinks: input.socialLinks || {},
    coverCharge: input.coverCharge.trim(),
    priceLevel: input.priceLevel,
    features: input.features.map((f) => f.trim()).filter(Boolean),
    drinkSpecials: input.drinkSpecials.filter((s) => s.title.trim()),
    image: input.image.trim(),
    cameras,
    hardwareInstalled: cameras.length ? [`${cameras.length}x Cloud Relay Feeds`] : [],
  });
}

/** Creates a new bar. It shows in the app for everyone right away. Returns the new bar id. */
export async function createBar(adminUid: string, input: BarListingInput, existingIds: string[]) {
  const id = uniqueBarId(input.name, existingIds);
  const ref = doc(db, 'bars', id);
  if ((await getDoc(ref)).exists()) {
    throw new Error(`A bar with the id "${id}" already exists. Change the name slightly.`);
  }
  await setDoc(ref, {
    ...listingFields(id, input),
    slug: id,
    hoursToday: '',
    crowdDensity: 0,
    estimatedWaitMinutes: 0,
    rating: 0,
    totalReviews: 0,
    tappedInCount: 0,
    partnerTier: 'Verified Partner',
    partnerStatus: 'Subscribed',
    partnerSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    isActive: true,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedBy: adminUid,
    updatedAt: serverTimestamp(),
  });
  return id;
}

/** Saves the form fields of an existing bar (owner-managed extras like events are left alone). */
export function updateBarListing(adminUid: string, existing: StoredBar, input: BarListingInput) {
  return updateDoc(doc(db, 'bars', existing.id), {
    ...listingFields(existing.id, input, existing),
    updatedBy: adminUid,
    updatedAt: serverTimestamp(),
  });
}

export function setBarActive(adminUid: string, barId: string, isActive: boolean) {
  return updateDoc(doc(db, 'bars', barId), {
    isActive,
    updatedBy: adminUid,
    updatedAt: serverTimestamp(),
  });
}

/** Deletes a bar for good and unlinks it from any owners. Reviews stay in `reviews`. */
export async function deleteBar(barId: string) {
  const owners = await getDocs(query(collection(db, 'users'), where('ownedBarIds', 'array-contains', barId)));
  const batch = writeBatch(db);
  owners.forEach((u) => {
    const data = u.data() as { role?: string; ownedBarIds?: string[] };
    const remaining = (data.ownedBarIds || []).filter((id) => id !== barId);
    batch.update(u.ref, {
      ownedBarIds: remaining,
      role: data.role === 'admin' ? 'admin' : remaining.length ? 'owner' : 'user',
    });
  });
  batch.delete(doc(db, 'bars', barId));
  await batch.commit();
}

/**
 * Copies the built-in bars (src/data/bars.ts) into Firestore, including any edits an owner made
 * with the previous version, and marks config/seed so the built-in list is never used again.
 * Skips bars that already have a full doc.
 */
export async function seedBuiltInBars(
  adminUid: string,
  existingFullIds: string[],
  legacyOverrides: Record<string, BarOverride>
) {
  const batch = writeBatch(db);
  let count = 0;
  builtInBars(legacyOverrides).forEach((bar) => {
    if (existingFullIds.includes(bar.id)) return;
    const { reviews: _reviews, distanceMiles: _d, ...rest } = bar;
    batch.set(doc(db, 'bars', bar.id), {
      ...strip(rest),
      isActive: rest.isActive ?? true,
      createdBy: adminUid,
      createdAt: serverTimestamp(),
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
    count++;
  });
  batch.set(doc(db, 'config', 'seed'), {
    seededAt: serverTimestamp(),
    seededBy: adminUid,
    barCount: count,
  });
  await batch.commit();
  return count;
}

// ---------------------------------------------------------------------------
// Owners
// ---------------------------------------------------------------------------

export interface AppUserSummary {
  uid: string;
  name: string;
  email: string;
  role: 'user' | 'owner' | 'admin';
  ownedBarIds: string[];
}

const toSummary = (uid: string, d: Record<string, unknown>): AppUserSummary => ({
  uid,
  name: typeof d.name === 'string' ? d.name : '',
  email: typeof d.email === 'string' ? d.email : '',
  role: d.role === 'admin' ? 'admin' : d.role === 'owner' ? 'owner' : 'user',
  ownedBarIds: Array.isArray(d.ownedBarIds) ? (d.ownedBarIds as string[]) : [],
});

/** Finds Bar Tap accounts by sign-in email (exact match, then lowercase). */
export async function findUsersByEmail(email: string): Promise<AppUserSummary[]> {
  const trimmed = email.trim();
  if (!trimmed) return [];
  const variants = Array.from(new Set([trimmed, trimmed.toLowerCase()]));
  const found = new Map<string, AppUserSummary>();
  for (const v of variants) {
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', v)));
    snap.forEach((d) => found.set(d.id, toSummary(d.id, d.data())));
  }
  return [...found.values()];
}

/** Makes a user an owner of a bar (admins keep their admin role). */
export function linkOwner(user: AppUserSummary, barId: string) {
  return updateDoc(doc(db, 'users', user.uid), {
    role: user.role === 'admin' ? 'admin' : 'owner',
    ownedBarIds: arrayUnion(barId),
  });
}

/** Removes a bar from a user's owned bars; they go back to a regular user when none are left. */
export function unlinkOwner(user: AppUserSummary, barId: string) {
  const remaining = user.ownedBarIds.filter((id) => id !== barId);
  return updateDoc(doc(db, 'users', user.uid), {
    ownedBarIds: remaining,
    role: user.role === 'admin' ? 'admin' : remaining.length ? 'owner' : 'user',
  });
}

/** Live list of every account linked to at least one bar. */
export function subscribeToLinkedOwners(
  onChange: (owners: AppUserSummary[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    query(collection(db, 'users'), where('role', 'in', ['owner', 'admin'])),
    (snap) => onChange(snap.docs.map((d) => toSummary(d.id, d.data())).filter((u) => u.ownedBarIds.length > 0)),
    (err) => onError?.(err)
  );
}

export interface OwnerRequest {
  uid: string;
  barId: string;
  name: string;
  title: string;
  workEmail: string;
  accountEmail: string;
  status: string;
}

/** Live list of pending "Request Venue Access" submissions from the Business Owner tab. */
export function subscribeToOwnerRequests(
  onChange: (requests: OwnerRequest[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    query(collection(db, 'ownerRequests'), where('status', '==', 'pending')),
    (snap) =>
      onChange(
        snap.docs.map((d) => {
          const x = d.data() as Record<string, string>;
          return {
            uid: d.id,
            barId: x.barId || '',
            name: x.name || '',
            title: x.title || '',
            workEmail: x.workEmail || '',
            accountEmail: x.accountEmail || '',
            status: x.status || 'pending',
          };
        })
      ),
    (err) => onError?.(err)
  );
}

/** Approves a venue-access request: links the requester as owner of the bar they asked for. */
export async function approveOwnerRequest(adminUid: string, req: OwnerRequest, barId: string) {
  const userSnap = await getDoc(doc(db, 'users', req.uid));
  if (!userSnap.exists()) throw new Error('That account no longer exists.');
  await linkOwner(toSummary(req.uid, userSnap.data()), barId);
  await updateDoc(doc(db, 'ownerRequests', req.uid), {
    status: 'approved',
    approvedBarId: barId,
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  });
}

export function declineOwnerRequest(adminUid: string, req: OwnerRequest) {
  return updateDoc(doc(db, 'ownerRequests', req.uid), {
    status: 'declined',
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Photos & geocoding
// ---------------------------------------------------------------------------

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file is not an image the browser can read.'));
    };
    img.src = url;
  });
}

async function resizeToJpeg(file: File, maxSide: number, quality: number): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the photo.');
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the photo.'))), 'image/jpeg', quality)
  );
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the photo.'));
    r.readAsDataURL(blob);
  });

/**
 * Uploads a bar photo and returns the URL to store in the bar's `image` field.
 * Uses Firebase Storage when it's enabled; otherwise stores a compressed copy of the photo
 * directly in the bar doc, so it works without Storage too.
 */
export async function uploadBarPhoto(
  barKey: string,
  file: File
): Promise<{ url: string; method: 'storage' | 'inline' }> {
  try {
    const blob = await resizeToJpeg(file, 1600, 0.82);
    const path = `bars/${slugify(barKey)}/${Date.now()}.jpg`;
    const ref = storageRef(storage, path);
    const uploaded = await Promise.race([
      uploadBytes(ref, blob, { contentType: 'image/jpeg' }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('storage-timeout')), 15000)),
    ]);
    return { url: await getDownloadURL(uploaded.ref), method: 'storage' };
  } catch (err) {
    console.warn('Storage upload failed, saving a compressed copy in Firestore instead:', err);
    for (const [side, q] of [
      [1000, 0.72],
      [800, 0.65],
      [640, 0.6],
    ] as const) {
      const dataUrl = await blobToDataUrl(await resizeToJpeg(file, side, q));
      if (dataUrl.length < 600_000) return { url: dataUrl, method: 'inline' };
    }
    throw new Error('That photo is too large. Try a smaller one, or paste an image link instead.');
  }
}

/** Free address lookup via OpenStreetMap (no API key). Returns null if nothing matched. */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; label: string; zip?: string } | null> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&addressdetails=1&q=' +
    encodeURIComponent(address);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Address lookup failed (${res.status}).`);
  const results = (await res.json()) as {
    lat: string;
    lon: string;
    display_name: string;
    address?: { postcode?: string };
  }[];
  if (!results.length) return null;
  const r = results[0];
  return {
    lat: Number(Number(r.lat).toFixed(7)),
    lng: Number(Number(r.lon).toFixed(7)),
    label: r.display_name,
    zip: r.address?.postcode,
  };
}
