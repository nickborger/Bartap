import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase.ts';
import { BarLocation, BusinessOwnerProfile, UserProfile } from '../types.ts';

/**
 * Firestore layout for users/{uid}
 *
 *   name, email, avatar      - shown in the app (user can edit)
 *   role                     - 'user' | 'owner' | 'admin' (LOCKED: admins set user/owner in the
 *                              app's Admin screen; 'admin' only in the Firebase console)
 *   ownedBarIds              - string[] of bar ids       (LOCKED: set from the Admin screen)
 *   ownerTitle, businessName, primaryBarId - owner display info (user can edit)
 *   savedBarIds, tappedBarIds - the user's own lists
 *   createdAt
 *
 * To make someone a bar owner: Admin screen > Owners > link by email.
 */
export interface UserDoc {
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'owner' | 'admin';
  ownedBarIds: string[];
  ownerTitle?: BusinessOwnerProfile['role'];
  businessName?: string;
  primaryBarId?: string;
  savedBarIds: string[];
  tappedBarIds: string[];
  createdAt?: Timestamp | null;
}

const userRef = (uid: string) => doc(db, 'users', uid);

const initialsOf = (name: string) => (name.trim().charAt(0) || 'U').toUpperCase();

/** Creates users/{uid} the first time someone signs in. Safe to call repeatedly. */
export async function ensureUserDoc(user: User, nameOverride?: string): Promise<void> {
  const ref = userRef(user.uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;
    const name =
      nameOverride?.trim() || user.displayName || user.email?.split('@')[0] || 'Bar Tap Patron';
    tx.set(ref, {
      name,
      email: user.email || '',
      avatar: initialsOf(name),
      role: 'user',
      ownedBarIds: [],
      savedBarIds: [],
      tappedBarIds: [],
      createdAt: serverTimestamp(),
    });
  });
}

export async function signInWithGoogle(): Promise<void> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(cred.user);
  } catch (err) {
    const code = (err as { code?: string }).code;
    // Popups can be blocked inside iframes / in-app browsers: fall back to a full-page redirect.
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    throw err;
  }
}

export async function signUpWithEmail(name: string, email: string, password: string): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  await ensureUserDoc(cred.user, name);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserDoc(cred.user);
}

export function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email.trim());
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}

// ---------------------------------------------------------------------------
// Per-user lists & settings (only fields the rules let a user change)
// ---------------------------------------------------------------------------

export function setBarSaved(uid: string, barId: string, saved: boolean) {
  return updateDoc(userRef(uid), {
    savedBarIds: saved ? arrayUnion(barId) : arrayRemove(barId),
  });
}

export function setBarTapped(uid: string, barId: string, tapped: boolean) {
  return updateDoc(userRef(uid), {
    tappedBarIds: tapped ? arrayUnion(barId) : arrayRemove(barId),
  });
}

export function saveOwnerDisplayInfo(
  uid: string,
  info: { ownerTitle?: BusinessOwnerProfile['role']; businessName?: string; primaryBarId?: string }
) {
  return setDoc(userRef(uid), info, { merge: true });
}

/** A venue-access request, reviewed by the Bar Tap admin in the Firebase console. */
export function requestOwnerAccess(
  uid: string,
  req: { barId: string; name: string; title: string; workEmail: string; accountEmail: string }
) {
  return setDoc(doc(db, 'ownerRequests', uid), {
    ...req,
    uid,
    status: 'pending',
    requestedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Mapping Firestore docs to the app's existing types
// ---------------------------------------------------------------------------

const formatMonthYear = (ts?: Timestamp | null) => {
  if (!ts) return 'Just now';
  return ts.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export function toUserProfile(uid: string, d: UserDoc): UserProfile {
  return {
    id: uid,
    name: d.name || 'Bar Tap Patron',
    email: d.email || '',
    avatar: d.avatar || initialsOf(d.name || 'U'),
    savedBarIds: d.savedBarIds || [],
    tappedBarIds: d.tappedBarIds || [],
    joinedDate: formatMonthYear(d.createdAt),
    role: d.role === 'admin' ? 'admin' : d.role === 'owner' ? 'owner' : 'user',
    ownedBarIds: d.ownedBarIds || [],
  };
}

/** Returns a BusinessOwnerProfile only if the user is an owner linked to at least one bar. */
export function toBusinessOwner(
  uid: string,
  d: UserDoc,
  bars: BarLocation[]
): BusinessOwnerProfile | null {
  const owned = (d.ownedBarIds || []).filter((id) => bars.some((b) => b.id === id));
  if ((d.role !== 'owner' && d.role !== 'admin') || owned.length === 0) return null;
  const primaryBarId =
    d.primaryBarId && owned.includes(d.primaryBarId) ? d.primaryBarId : owned[0];
  const primaryBar = bars.find((b) => b.id === primaryBarId);
  const name = d.name || 'Venue Operator';
  return {
    id: uid,
    name,
    email: d.email || '',
    role: d.ownerTitle || 'Owner',
    managedBarIds: owned,
    primaryBarId,
    avatar: name
      .split(/\s+/)
      .map((p) => p.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    verified: true,
    businessName: d.businessName || `${primaryBar?.name || 'Venue'} Management`,
    joinedDate: formatMonthYear(d.createdAt),
  };
}

/** Turns Firebase Auth error codes into short, readable messages. */
export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks wrong.';
    case 'auth/missing-password':
      return 'Enter your password.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'An account with that email already exists. Try signing in.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/unauthorized-domain':
      return 'This web address is not authorized for sign-in yet (add it in Firebase > Authentication > Settings > Authorized domains).';
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'Sign-in is not set up yet: turn on Google and Email/Password in Firebase > Authentication > Sign-in method.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return (err as { message?: string })?.message || 'Something went wrong. Please try again.';
  }
}
