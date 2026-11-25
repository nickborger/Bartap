import React, { useState } from 'react';
import { Building2, Mail, MessageCircle, Radio, Tag } from 'lucide-react';
import { MINIMUM_AGE, OPERATOR_LOCATION, OPERATOR_NAME, PRIVACY_PATH, TERMS_PATH } from '../legal/legalConfig.ts';
import { friendlyAuthError, signInWithGoogle } from '../services/authService.ts';

/**
 * The first screen a signed-out visitor sees. The bar list stays hidden until they sign in.
 * Google sign-in uses the same signInWithGoogle() as the sign-in window; the email and
 * bar-owner buttons open that same sign-in window (AuthModal).
 */
interface WelcomePageProps {
  /** False until Firebase has said whether someone is already signed in. */
  authReady: boolean;
  /** Opens the existing sign-in window on the given tab. */
  onOpenAuth: (tab: 'user' | 'business') => void;
}

const Logo: React.FC<{ className?: string }> = ({ className = 'text-5xl sm:text-6xl' }) => (
  <h1 className={`${className} font-black tracking-tight text-neutral-100`}>
    Bar <span className="text-copper">Tap</span>
  </h1>
);

/** Shown for a moment while Firebase checks for an existing sign-in, so no screen flashes. */
export const AppLoadingScreen: React.FC = () => (
  <div className="min-h-[100dvh] w-full bg-neutral-950 flex flex-col items-center justify-center gap-4">
    <Logo className="text-4xl" />
    <div className="w-6 h-6 rounded-full border-2 border-neutral-800 border-t-copper animate-spin" aria-label="Loading" />
  </div>
);

export const WelcomePage: React.FC<WelcomePageProps> = ({ authReady, onOpenAuth }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      // When this finishes, the app notices the sign-in and shows the bars.
      await signInWithGoogle();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const features = [
    { icon: Radio, text: 'Live video from the bar' },
    { icon: Tag, text: 'Specials and deals' },
    { icon: MessageCircle, text: 'Live chat' },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-neutral-950 text-neutral-100 flex flex-col font-sans relative overflow-hidden">
      {/* Soft copper glow behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-copper/15 blur-3xl"
      />

      <main className="relative flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md text-center" data-testid="welcome-page">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-copper/40 bg-copper/10 text-[11px] font-bold uppercase tracking-wider text-tan mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-copper animate-pulse" />
            Live in {OPERATOR_LOCATION.split(',')[0]}
          </div>

          <Logo />

          <p className="mt-4 text-base sm:text-lg text-neutral-300 leading-relaxed">
            See which bars are busy right now, with live video, specials and chat.
          </p>

          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {features.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200"
              >
                <Icon className="w-3.5 h-3.5 text-copper" />
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-8 p-5 sm:p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-2xl shadow-black/40 space-y-3">
            {!authReady ? (
              <div className="text-xs text-neutral-400 py-3">Checking your sign-in…</div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={busy}
                  className="w-full py-3 bg-copper hover:bg-tan text-ink font-black text-sm rounded-2xl transition shadow-lg shadow-black/30 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
                >
                  <span className="w-6 h-6 rounded-full bg-cream flex items-center justify-center">
                    <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                    </svg>
                  </span>
                  <span>{busy ? 'Signing in…' : 'Sign in with Google'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAuth('user')}
                  className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-100 font-bold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4 text-neutral-400" />
                  Sign in with email
                </button>

                {error && (
                  <p role="alert" className="text-xs text-red-300 bg-red-950/40 border border-red-900/60 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}
              </>
            )}

            <p className="text-[11px] text-neutral-400 leading-relaxed pt-1">
              By continuing, you confirm you're {MINIMUM_AGE} or older and agree to Bar Tap's{' '}
              <a href={TERMS_PATH} target="_blank" rel="noopener" className="text-neutral-300 underline hover:text-white">
                Terms of Use
              </a>{' '}
              and{' '}
              <a href={PRIVACY_PATH} target="_blank" rel="noopener" className="text-neutral-300 underline hover:text-white">
                Privacy Policy
              </a>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenAuth('business')}
            disabled={!authReady}
            className="mt-5 inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer disabled:opacity-50"
          >
            <Building2 className="w-3.5 h-3.5" />
            Own a bar? Business sign-in
          </button>
        </div>
      </main>

      <footer className="relative border-t border-neutral-800/80 py-5 text-xs text-neutral-500">
        <div className="max-w-md mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {new Date().getFullYear()} {OPERATOR_NAME} · {OPERATOR_LOCATION}
          </span>
          <span className="flex items-center gap-4">
            <a href={PRIVACY_PATH} className="text-neutral-400 hover:text-white">
              Privacy Policy
            </a>
            <a href={TERMS_PATH} className="text-neutral-400 hover:text-white">
              Terms of Use
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
};
