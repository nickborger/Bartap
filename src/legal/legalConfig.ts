/**
 * Settings for the Privacy Policy (/privacy) and Terms of Use (/terms) pages.
 *
 * BEFORE YOU SUBMIT TO GOOGLE OR THE APP STORES:
 *   Put your contact email between the quotes on the CONTACT_EMAIL line,
 *   for example: export const CONTACT_EMAIL = 'hello@bartap.app';
 *   While it is empty, the pages show a red "[contact email goes here]" note.
 *
 * These pages are a starting template written in plain language, not legal advice.
 */

/** The email people use for privacy questions, account deletion and reports. */
export const CONTACT_EMAIL = 'nickborger90@gmail.com';

/** Who runs Bar Tap. Change it if you form a business (for example 'Bar Tap LLC'). */
export const OPERATOR_NAME = 'Bar Tap';

/** Where Bar Tap is run from. Also decides the governing law in the Terms. */
export const OPERATOR_LOCATION = 'Tallahassee, Florida';

/** The web address of the app. */
export const SITE_URL = 'https://bartap.duckdns.org';

/** The date these versions take effect. Change it whenever you change either page. */
export const LEGAL_EFFECTIVE_DATE = 'November 24, 2026';

/** Minimum age to use Bar Tap (the legal drinking age in Florida and across the U.S.). */
export const MINIMUM_AGE = 21;

/** The paths of the two pages. */
export const PRIVACY_PATH = '/privacy';
export const TERMS_PATH = '/terms';

/** Which legal page, if any, a browser path points to. */
export function legalPageForPath(pathname: string): 'privacy' | 'terms' | null {
  const p = pathname.replace(/\/+$/, '').toLowerCase();
  if (p === PRIVACY_PATH || p === '/privacy-policy') return 'privacy';
  if (p === TERMS_PATH || p === '/terms-of-use' || p === '/terms-of-service') return 'terms';
  return null;
}
