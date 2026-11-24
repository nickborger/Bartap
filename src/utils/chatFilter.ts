/**
 * Basic content filter for live chat (required by Apple and Google for apps with
 * user-posted content). It runs before a message is sent:
 *
 *  - Slurs, hate words and "kill yourself"-type messages are refused.
 *  - Links, email addresses and phone numbers are refused (spam and personal info).
 *    Firestore rules also refuse links, so this can't be skipped.
 *  - Strong swear words are masked, e.g. "f***".
 *
 * It's a first line of defense, not a perfect one: people can still Report a
 * message, block someone, and owners/admins can delete posts and mute people.
 *
 * The word lists are stored in ROT13 (each letter shifted 13 places) so the
 * public code doesn't spell out slurs. To add a word, ROT13 it first
 * (e.g. at rot13.com) and add it to the right list.
 */

const rot13 = (s: string) =>
  s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));

// Whole words that block the message.
const BLOCK_WORDS = [
  'avttre', 'avttn', 'avttnf', 'avttref', 'snttbg', 'snttbgf', 'snt', 'sntf', 'xvxr', 'xvxrf', 'fcvp',
  'fcvpf', 'puvax', 'puvaxf', 'tbbx', 'tbbxf', 'jrgonpx', 'jrgonpxf', 'genaal', 'genaavrf', 'ergneq',
  'ergneqf', 'ergneqrq', 'ornare', 'ornaref', 'qlxr', 'qlxrf', 'enturnq', 'gbjryurnq', 'xlf',
];
// Long slurs also caught when spaced out or hidden inside other text ("n i g ...").
const BLOCK_SQUISHED = ['avttre', 'snttbg', 'jrgonpx', 'gbjryurnq', 'enturnq'];
// Phrases that block the message.
const BLOCK_PHRASES = ['xvyy lbhefrys', 'xvyy hefrys', 'ubcr lbh qvr', 'arpx lbhefrys'];
// Any word containing one of these is masked.
const MASK_STEMS = ['shpx', 'fuvg', 'ovgpu', 'phag', 'juber', 'fyhg', 'zbgures'];
// These exact words are masked.
const MASK_WORDS = ['qvpx', 'qvpxf', 'pbpx', 'pbpxf', 'chffl', 'nffubyr', 'nffubyrf', 'onfgneq', 'onfgneqf', 'gjng', 'cevpx'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't' };

/** Lowercase, undo l33t-speak, keep letters only, and squeeze repeated letters ("niiice" -> "nice"). */
function normalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/[0134@57$!+]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]/g, '')
    .replace(/([a-z])\1+/g, '$1');
}

const squeeze = (w: string) => w.replace(/([a-z])\1+/g, '$1');
const decode = (list: string[]) => new Set(list.map((w) => squeeze(rot13(w))));

const blockWords = decode(BLOCK_WORDS);
const blockSquished = [...decode(BLOCK_SQUISHED)];
const blockPhrases = BLOCK_PHRASES.map(rot13);
const maskStems = [...decode(MASK_STEMS)];
const maskWords = decode(MASK_WORDS);

/** Same pattern the Firestore rules use to refuse links. */
export const LINK_PATTERN = /(https?:\/\/|www\.|\.(com|net|org|io|co|app|gg|ly|me|xyz|info|biz|us)(\/|\b))/i;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE_PATTERN = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

export const CHAT_MAX_LENGTH = 300;

export type FilterResult =
  | { ok: true; text: string; masked: boolean }
  | { ok: false; reason: string };

export function filterChatMessage(input: string): FilterResult {
  const text = input.replace(/\s+/g, ' ').trim();
  if (!text) return { ok: false, reason: 'Type a message first.' };
  if (text.length > CHAT_MAX_LENGTH) return { ok: false, reason: `Keep it under ${CHAT_MAX_LENGTH} characters.` };
  if (LINK_PATTERN.test(text)) return { ok: false, reason: "Links aren't allowed in chat." };
  if (EMAIL_PATTERN.test(text)) return { ok: false, reason: "Email addresses aren't allowed in chat." };
  if (PHONE_PATTERN.test(text)) return { ok: false, reason: "Phone numbers aren't allowed in chat." };

  const words = text.split(' ');
  const normWords = words.map(normalize);
  const blocked = "That message breaks Bar Tap's chat rules (no hate or harassment).";
  if (normWords.some((w) => blockWords.has(w))) return { ok: false, reason: blocked };
  const squished = normalize(text);
  if (blockSquished.some((w) => squished.includes(w))) return { ok: false, reason: blocked };
  const spaced = ' ' + normWords.filter(Boolean).join(' ') + ' ';
  if (blockPhrases.some((p) => spaced.includes(' ' + p.split(' ').map(squeeze).join(' ') + ' '))) {
    return { ok: false, reason: blocked };
  }

  let masked = false;
  const out = words.map((w, i) => {
    const n = normWords[i];
    if (!n) return w;
    if (maskWords.has(n) || maskStems.some((s) => n.includes(s))) {
      masked = true;
      const first = w.match(/[a-z0-9]/i)?.[0] ?? '*';
      return first + '*'.repeat(Math.max(2, w.length - 1));
    }
    return w;
  });
  return { ok: true, text: out.join(' '), masked };
}
