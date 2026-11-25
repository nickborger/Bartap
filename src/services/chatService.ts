/**
 * Live chat that runs next to a bar's live video.
 *
 * Firestore layout (one chat room per bar):
 *
 *   bars/{barId}/chat/{messageId}
 *     uid, name, text, role ('user' | 'owner' | 'admin'), createdAt, expiresAt
 *     - anyone can read; must be signed in to post
 *     - role 'owner' / 'admin' is checked by the rules, so the copper badge can't be faked
 *     - expiresAt = the bar's closing time tonight (src/utils/chatNight.ts).
 *       The app hides a message after that, and Firestore's TTL policy deletes it.
 *
 *   bars/{barId}/chatUsers/{uid}
 *     lastPostAt, lastMsgId  - slow mode: one message every SLOW_MODE_SECONDS per person
 *     mutedUntil, mutedBy    - set by the bar's owner or an admin ("mute for the night")
 *     expiresAt              - also cleared by TTL after closing
 *
 *   chatReports/{reportId}
 *     barId, barName, messageId, reportedUid, reportedName, text, reason,
 *     reporterUid, createdAt, status ('open')
 *     - anyone signed in can report; admins (and the bar's owner) read and resolve them
 *
 *   users/{uid}.blockedUids  - people this user has blocked (their messages are hidden)
 */
import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { trackEvent } from './analyticsService.ts';

/** Slow mode gap. Keep in sync with firestore.rules (duration.value(5, 's')). */
export const SLOW_MODE_SECONDS = 5;
/** How many recent messages the chat loads. */
export const CHAT_HISTORY = 60;

export type ChatRole = 'user' | 'owner' | 'admin';

export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  text: string;
  role: ChatRole;
  createdAt: Date | null; // null for a moment while the server stamps it
  expiresAt: Date | null;
  pending: boolean;
}

export type ReportReason = 'harassment' | 'hate' | 'sexual' | 'spam' | 'personal_info' | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate or slurs' },
  { value: 'sexual', label: 'Sexual content' },
  { value: 'spam', label: 'Spam or ads' },
  { value: 'personal_info', label: "Shares someone's personal info" },
  { value: 'other', label: 'Something else' },
];

export interface ChatReport {
  id: string;
  barId: string;
  barName: string;
  messageId: string;
  reportedUid: string;
  reportedName: string;
  text: string;
  reason: ReportReason;
  reporterUid: string;
  createdAt: Date | null;
}

export interface ChatUserState {
  lastPostAt: Date | null;
  mutedUntil: Date | null;
}

const chatCol = (barId: string) => collection(db, 'bars', barId, 'chat');
const chatUserRef = (barId: string, uid: string) => doc(db, 'bars', barId, 'chatUsers', uid);

const toDate = (v: unknown): Date | null => (v instanceof Timestamp ? v.toDate() : null);

/** Chat display name: first name + last initial ("Nick B."), so full names aren't shown. */
export function chatDisplayName(fullName: string | undefined): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Bar Tap Patron';
  const first = parts[0].slice(0, 24);
  const last = parts.length > 1 ? ` ${parts[parts.length - 1].charAt(0).toUpperCase()}.` : '';
  return (first + last).slice(0, 40);
}

/** Live list of a bar's recent messages, oldest first. */
export function subscribeToChat(
  barId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError: (err: Error) => void
): () => void {
  const q = query(chatCol(barId), orderBy('createdAt', 'desc'), limit(CHAT_HISTORY));
  return onSnapshot(
    q,
    { includeMetadataChanges: false },
    (snap) => {
      const list: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data({ serverTimestamps: 'estimate' });
        return {
          id: d.id,
          uid: String(data.uid ?? ''),
          name: String(data.name ?? 'Patron'),
          text: String(data.text ?? ''),
          role: data.role === 'owner' || data.role === 'admin' ? data.role : 'user',
          createdAt: toDate(data.createdAt),
          expiresAt: toDate(data.expiresAt),
          pending: d.metadata.hasPendingWrites,
        };
      });
      onChange(list.reverse());
    },
    (err) => onError(err)
  );
}

/** Watches your own slow-mode / mute state in one bar's chat. */
export function subscribeToMyChatState(
  barId: string,
  uid: string,
  onChange: (state: ChatUserState) => void
): () => void {
  return onSnapshot(
    chatUserRef(barId, uid),
    (snap) => {
      const d = snap.data();
      onChange({ lastPostAt: toDate(d?.lastPostAt), mutedUntil: toDate(d?.mutedUntil) });
    },
    () => onChange({ lastPostAt: null, mutedUntil: null })
  );
}

/**
 * Posts a message. The message and your slow-mode record are written together;
 * the rules refuse it if you posted less than SLOW_MODE_SECONDS ago or are muted.
 */
export async function sendChatMessage(params: {
  barId: string;
  uid: string;
  name: string;
  text: string;
  role: ChatRole;
  expiresAt: Date;
}): Promise<void> {
  const msgRef = doc(chatCol(params.barId));
  const expiresAt = Timestamp.fromDate(params.expiresAt);
  const batch = writeBatch(db);
  batch.set(msgRef, {
    uid: params.uid,
    name: params.name,
    text: params.text,
    role: params.role,
    createdAt: serverTimestamp(),
    expiresAt,
  });
  batch.set(
    chatUserRef(params.barId, params.uid),
    { lastPostAt: serverTimestamp(), lastMsgId: msgRef.id, expiresAt },
    { merge: true }
  );
  await batch.commit();
  trackEvent(params.barId, 'chat'); // venue analytics: a count only, never the message or the sender
}

/** Your own message, or (owner/admin) anyone's message in that bar. */
export function deleteChatMessage(barId: string, messageId: string) {
  return deleteDoc(doc(chatCol(barId), messageId));
}

/** Owner/admin: mute someone in this bar's chat until `until` (closing time). */
export function muteChatUser(barId: string, uid: string, byUid: string, until: Date) {
  const ts = Timestamp.fromDate(until);
  return setDoc(chatUserRef(barId, uid), { mutedUntil: ts, mutedBy: byUid, expiresAt: ts }, { merge: true });
}

/** Owner/admin: lift a mute right away. */
export function unmuteChatUser(barId: string, uid: string, byUid: string) {
  return updateDoc(chatUserRef(barId, uid), { mutedUntil: serverTimestamp(), mutedBy: byUid });
}

/** Owner/admin: clear every message in the room now (up to 450 at a time). */
export async function clearChat(barId: string): Promise<number> {
  const snap = await getDocs(query(chatCol(barId), limit(450)));
  if (snap.empty) return 0;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

export function reportChatMessage(params: {
  barId: string;
  barName: string;
  message: ChatMessage;
  reason: ReportReason;
  reporterUid: string;
}) {
  return addDoc(collection(db, 'chatReports'), {
    barId: params.barId,
    barName: params.barName.slice(0, 120),
    messageId: params.message.id,
    reportedUid: params.message.uid,
    reportedName: params.message.name.slice(0, 40),
    text: params.message.text.slice(0, 300),
    reason: params.reason,
    reporterUid: params.reporterUid,
    status: 'open',
    createdAt: serverTimestamp(),
  });
}

/** Block / unblock someone everywhere in chat (saved on your account). */
export function setUserBlocked(myUid: string, otherUid: string, blocked: boolean) {
  return updateDoc(doc(db, 'users', myUid), {
    blockedUids: blocked ? arrayUnion(otherUid) : arrayRemove(otherUid),
  });
}

// ---------------------------------------------------------------------------
// Admin: chat reports
// ---------------------------------------------------------------------------

export function subscribeToChatReports(
  onChange: (reports: ChatReport[]) => void,
  onError: (err: Error) => void
): () => void {
  const q = query(collection(db, 'chatReports'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) =>
      onChange(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            barId: String(data.barId ?? ''),
            barName: String(data.barName ?? ''),
            messageId: String(data.messageId ?? ''),
            reportedUid: String(data.reportedUid ?? ''),
            reportedName: String(data.reportedName ?? ''),
            text: String(data.text ?? ''),
            reason: (data.reason as ReportReason) ?? 'other',
            reporterUid: String(data.reporterUid ?? ''),
            createdAt: toDate(data.createdAt),
          };
        })
      ),
    (err) => onError(err)
  );
}

/** Done with a report (after acting on it, or if it was fine): removes it. */
export function dismissChatReport(reportId: string) {
  return deleteDoc(doc(db, 'chatReports', reportId));
}

export function reasonLabel(r: ReportReason): string {
  return REPORT_REASONS.find((x) => x.value === r)?.label ?? 'Something else';
}
