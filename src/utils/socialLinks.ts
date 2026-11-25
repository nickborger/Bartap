/**
 * Social media links on bar pages (Instagram, TikTok, Facebook).
 *
 * Owners and admins can type a full link (https://www.instagram.com/thehub),
 * a link without https (instagram.com/thehub) or just a handle (@thehub).
 * We always save one tidy full link, so the bar page and the Firestore rules
 * only ever see these shapes:
 *
 *   instagram  https://www.instagram.com/<handle>
 *   tiktok     https://www.tiktok.com/@<handle>
 *   facebook   https://www.facebook.com/<page>   or   https://www.facebook.com/profile.php?id=<number>
 *
 * firestore.rules checks the same shapes (see validSocialLinks), so a bad link
 * can't be saved even from outside the app.
 */

export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook';

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

export const SOCIAL_PLATFORMS: SocialPlatform[] = ['instagram', 'tiktok', 'facebook'];

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

export const SOCIAL_PLACEHOLDERS: Record<SocialPlatform, string> = {
  instagram: '@yourbar or instagram.com/yourbar',
  tiktok: '@yourbar or tiktok.com/@yourbar',
  facebook: 'yourbar or facebook.com/yourbar',
};

const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const TIKTOK_HANDLE = /^[A-Za-z0-9._]{2,24}$/;
const FACEBOOK_SEGMENT = /^[A-Za-z0-9.\-]{1,100}$/;

/** Instagram paths that are site pages, not accounts. */
const INSTAGRAM_RESERVED = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'tv']);
/** Facebook paths that are site pages, not a bar's page. */
const FACEBOOK_RESERVED = new Set(['login', 'login.php', 'home.php', 'sharer', 'sharer.php', 'share', 'watch', 'events', 'groups', 'marketplace', 'search', 'help', 'policies', 'privacy', 'settings', 'hashtag']);

const HOSTS: Record<SocialPlatform, string[]> = {
  instagram: ['instagram.com', 'www.instagram.com', 'm.instagram.com', 'instagr.am'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'],
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'business.facebook.com', 'fb.com', 'www.fb.com'],
};

export type SocialResult = { ok: true; url: string } | { ok: false; error: string };

const looksLikeUrl = (s: string) => /^https?:\/\//i.test(s) || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(s);

/**
 * Turns what someone typed into a full link for that site.
 * Empty input = no link (ok, url ''). Anything that isn't a real handle or a
 * link to that site comes back with a plain-English error.
 */
export function normalizeSocialLink(platform: SocialPlatform, input: string | undefined | null): SocialResult {
  const raw = (input || '').trim();
  if (!raw) return { ok: true, url: '' };
  const label = SOCIAL_LABELS[platform];

  if (looksLikeUrl(raw)) {
    let u: URL;
    try {
      u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      return { ok: false, error: `That doesn't look like a ${label} link.` };
    }
    const host = u.hostname.toLowerCase();
    if (!HOSTS[platform].includes(host)) {
      return { ok: false, error: `Use ${platform === 'instagram' ? 'an' : 'a'} ${label} link (${HOSTS[platform][0]}/…) or just the handle.` };
    }
    const parts = u.pathname.split('/').filter(Boolean);

    if (platform === 'instagram') {
      const handle = (parts[0] || '').replace(/^@/, '');
      if (!handle || INSTAGRAM_RESERVED.has(handle.toLowerCase()) || !INSTAGRAM_HANDLE.test(handle)) {
        return { ok: false, error: 'Use the link to the bar\'s Instagram profile, like instagram.com/yourbar.' };
      }
      return { ok: true, url: `https://www.instagram.com/${handle}` };
    }

    if (platform === 'tiktok') {
      const first = parts[0] || '';
      if (!first.startsWith('@')) {
        return { ok: false, error: 'Use the link to the bar\'s TikTok profile, like tiktok.com/@yourbar.' };
      }
      const handle = first.slice(1);
      if (!TIKTOK_HANDLE.test(handle)) {
        return { ok: false, error: 'That TikTok handle has characters TikTok doesn\'t allow.' };
      }
      return { ok: true, url: `https://www.tiktok.com/@${handle}` };
    }

    // facebook
    if (parts[0]?.toLowerCase() === 'profile.php') {
      const id = u.searchParams.get('id') || '';
      if (!/^[0-9]{1,25}$/.test(id)) {
        return { ok: false, error: 'That Facebook link is missing the page number (profile.php?id=…).' };
      }
      return { ok: true, url: `https://www.facebook.com/profile.php?id=${id}` };
    }
    if (!parts.length || parts.length > 4 || FACEBOOK_RESERVED.has(parts[0].toLowerCase()) || !parts.every((p) => FACEBOOK_SEGMENT.test(p))) {
      return { ok: false, error: 'Use the link to the bar\'s Facebook page, like facebook.com/yourbar.' };
    }
    return { ok: true, url: `https://www.facebook.com/${parts.join('/')}` };
  }

  // A plain handle
  const handle = raw.replace(/^@/, '');
  if (platform === 'instagram') {
    if (!INSTAGRAM_HANDLE.test(handle)) {
      return { ok: false, error: 'Instagram handles use only letters, numbers, periods and underscores (30 max).' };
    }
    return { ok: true, url: `https://www.instagram.com/${handle}` };
  }
  if (platform === 'tiktok') {
    if (!TIKTOK_HANDLE.test(handle)) {
      return { ok: false, error: 'TikTok handles use only letters, numbers, periods and underscores (2 to 24).' };
    }
    return { ok: true, url: `https://www.tiktok.com/@${handle}` };
  }
  if (!FACEBOOK_SEGMENT.test(handle) || FACEBOOK_RESERVED.has(handle.toLowerCase())) {
    return { ok: false, error: 'Facebook page names use only letters, numbers, periods and dashes.' };
  }
  return { ok: true, url: `https://www.facebook.com/${handle}` };
}

export type SocialDrafts = Record<SocialPlatform, string>;

/** What the edit boxes start with. */
export function socialDraftsFrom(links: SocialLinks | undefined | null): SocialDrafts {
  return {
    instagram: links?.instagram || '',
    tiktok: links?.tiktok || '',
    facebook: links?.facebook || '',
  };
}

/**
 * Checks all three boxes. Returns the links to save (empty boxes left out) and
 * an error per box that isn't valid.
 */
export function normalizeSocialDrafts(drafts: SocialDrafts): {
  links: SocialLinks;
  errors: Partial<Record<SocialPlatform, string>>;
} {
  const links: SocialLinks = {};
  const errors: Partial<Record<SocialPlatform, string>> = {};
  for (const p of SOCIAL_PLATFORMS) {
    const r = normalizeSocialLink(p, drafts[p]);
    if (r.ok) {
      if (r.url) links[p] = r.url;
    } else {
      errors[p] = r.error;
    }
  }
  return { links, errors };
}

/** Only links in the saved shape, for showing on the bar page (ignores anything odd in the data). */
export function displayableSocialLinks(links: unknown): SocialLinks {
  const out: SocialLinks = {};
  if (!links || typeof links !== 'object') return out;
  for (const p of SOCIAL_PLATFORMS) {
    const v = (links as Record<string, unknown>)[p];
    if (typeof v !== 'string' || !v) continue;
    const r = normalizeSocialLink(p, v);
    if (r.ok && r.url) out[p] = r.url;
  }
  return out;
}

/** The bar's website as a safe http(s) link, or '' if it isn't one. */
export function displayableWebsite(url: string | undefined | null): string {
  const raw = (url || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if ((u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.')) return u.href;
  } catch {
    /* not a link */
  }
  return '';
}
