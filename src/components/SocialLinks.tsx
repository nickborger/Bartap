import React from 'react';
import { Facebook, Globe, Instagram } from 'lucide-react';
import {
  SOCIAL_LABELS,
  SOCIAL_PLACEHOLDERS,
  SOCIAL_PLATFORMS,
  SocialDrafts,
  SocialPlatform,
  displayableSocialLinks,
  displayableWebsite,
  normalizeSocialLink,
} from '../utils/socialLinks.ts';
import { BarSocialLinks } from '../types.ts';
import { trackEvent } from '../services/analyticsService.ts';

/** TikTok's note, drawn in the same thin-line style as the other icons (lucide has no TikTok icon). */
export const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M9 12a4 4 0 1 0 4 4V2a5 5 0 0 0 5 5" />
  </svg>
);

const ICONS: Record<SocialPlatform, React.FC<{ className?: string }>> = {
  instagram: Instagram,
  tiktok: TikTokIcon,
  facebook: Facebook,
};

/**
 * Small Instagram / TikTok / Facebook / website icon links for a bar page.
 * Icons without a link are hidden; if the bar has none at all, nothing shows.
 * Links open in a new tab so Bar Tap stays open behind them.
 */
export const SocialLinksRow: React.FC<{
  /** When given, taps are counted in the bar's analytics (social / website). */
  barId?: string;
  barName: string;
  socialLinks?: BarSocialLinks;
  websiteUrl?: string;
  /** compact = icons only, for the live video footer */
  compact?: boolean;
  className?: string;
}> = ({ barId, barName, socialLinks, websiteUrl, compact = false, className = '' }) => {
  const links = displayableSocialLinks(socialLinks);
  const website = displayableWebsite(websiteUrl);
  const items: { key: string; label: string; href: string; Icon: React.FC<{ className?: string }> }[] = [];
  for (const p of SOCIAL_PLATFORMS) {
    if (links[p]) items.push({ key: p, label: SOCIAL_LABELS[p], href: links[p]!, Icon: ICONS[p] });
  }
  if (website) items.push({ key: 'website', label: 'Website', href: website, Icon: Globe });
  if (items.length === 0) return null;

  const iconRow = (
    <div className="flex items-center gap-2">
      {items.map(({ key, label, href, Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${barName} on ${label} (opens in a new tab)`}
          title={`${label} (opens in a new tab)`}
          data-testid={`social-link-${key}`}
          onClick={() => barId && trackEvent(barId, key === 'website' ? 'website' : 'social')}
          className={`inline-flex items-center justify-center rounded-full bg-neutral-950 border border-neutral-800 text-tan hover:text-ink hover:bg-copper hover:border-copper transition cursor-pointer ${
            compact ? 'w-8 h-8' : 'w-10 h-10'
          }`}
        >
          <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </a>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className={className} data-testid="social-links-compact">
        {iconRow}
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
      data-testid="social-links"
    >
      <div>
        <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Follow {barName}</div>
        <div className="text-[11px] text-neutral-500 mt-0.5">Opens in a new tab</div>
      </div>
      {iconRow}
    </div>
  );
};

/**
 * Instagram / TikTok / Facebook boxes for the owner tools and the Admin bar form.
 * People can type a handle (@thehub) or a link; when they leave a box it turns
 * into the full link, or shows what's wrong.
 */
export const SocialLinksEditor: React.FC<{
  drafts: SocialDrafts;
  onChange: (drafts: SocialDrafts) => void;
  errors: Partial<Record<SocialPlatform, string>>;
  onErrorsChange: (errors: Partial<Record<SocialPlatform, string>>) => void;
  inputClassName: string;
  labelClassName: string;
  /** grid classes for the three boxes */
  gridClassName?: string;
}> = ({ drafts, onChange, errors, onErrorsChange, inputClassName, labelClassName, gridClassName = 'grid grid-cols-1 sm:grid-cols-3 gap-3' }) => {
  const handleBlur = (p: SocialPlatform) => {
    const r = normalizeSocialLink(p, drafts[p]);
    const next = { ...errors };
    if (r.ok) {
      delete next[p];
      if (r.url !== drafts[p]) onChange({ ...drafts, [p]: r.url });
    } else {
      next[p] = r.error;
    }
    onErrorsChange(next);
  };

  return (
    <div className={gridClassName} data-testid="social-links-editor">
      {SOCIAL_PLATFORMS.map((p) => {
        const Icon = ICONS[p];
        const err = errors[p];
        return (
          <label key={p} className="block">
            <span className={`${labelClassName} flex items-center gap-1.5`}>
              <Icon className="w-3.5 h-3.5 text-tan" />
              {SOCIAL_LABELS[p]}
            </span>
            <input
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={drafts[p]}
              onChange={(e) => {
                onChange({ ...drafts, [p]: e.target.value });
                if (err) {
                  const next = { ...errors };
                  delete next[p];
                  onErrorsChange(next);
                }
              }}
              onBlur={() => handleBlur(p)}
              placeholder={SOCIAL_PLACEHOLDERS[p]}
              aria-invalid={!!err}
              data-testid={`social-input-${p}`}
              className={`${inputClassName} ${err ? '!border-red-500' : ''}`}
            />
            {err && (
              <span className="block mt-1 text-[11px] text-red-300" data-testid={`social-error-${p}`}>
                {err}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
};
