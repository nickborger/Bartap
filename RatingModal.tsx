import React, { useEffect, useState } from 'react';
import {
  Building2,
  Crown,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { BarLocation, BusinessOwnerProfile, UserProfile } from '../types.ts';
import {
  friendlyAuthError,
  requestOwnerAccess,
  resetPassword,
  saveOwnerDisplayInfo,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../services/authService.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  currentBusinessOwner: BusinessOwnerProfile | null;
  /** False until Firebase has told us whether someone is signed in. */
  authReady: boolean;
  /** Called after a successful sign-in / sign-up from the given tab. */
  onSignedIn: (tab: 'user' | 'business') => void;
  onSignOutUser: () => void;
  onSignOutOwner: () => void;
  onOpenPremiumModal: () => void;
  onOpenBusinessPlatform: () => void;
  initialTab?: 'user' | 'business';
  bars: BarLocation[];
}

type AuthMode = 'signin' | 'signup' | 'reset';

const inputClass =
  'w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 text-xs focus:outline-none focus:border-copper';
const plainInputClass =
  'w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 text-xs focus:outline-none focus:border-copper';
const primaryButtonClass =
  'w-full py-2.5 bg-copper hover:bg-tan text-ink font-black text-xs rounded-xl transition shadow-lg shadow-black/30 active:scale-[0.98] cursor-pointer mt-1 flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-wait';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentBusinessOwner,
  authReady,
  onSignedIn,
  onSignOutUser,
  onSignOutOwner,
  onOpenPremiumModal,
  onOpenBusinessPlatform,
  initialTab = 'user',
  bars,
}) => {
  const [activeTab, setActiveTab] = useState<'user' | 'business'>(initialTab);

  // Sync active tab whenever the modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Shared sign-in form state
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  // Venue access request state (signed in, but not linked to a venue yet)
  const [ownerNameInput, setOwnerNameInput] = useState('');
  const [ownerEmailInput, setOwnerEmailInput] = useState('');
  const [ownerBarIdInput, setOwnerBarIdInput] = useState(bars[0]?.id || 'hub-at-feather-oaks');
  const [ownerRoleInput, setOwnerRoleInput] = useState<BusinessOwnerProfile['role']>('General Manager');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Clear messages when the modal opens or the mode changes
  useEffect(() => {
    setAuthError(null);
    setAuthInfo(null);
  }, [isOpen, authMode, activeTab]);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      onSignedIn(activeTab);
    } catch (err) {
      setAuthError(friendlyAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setAuthBusy(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      if (authMode === 'reset') {
        await resetPassword(emailInput);
        setAuthInfo(`Password reset link sent to ${emailInput.trim()}. Check your inbox.`);
        setAuthMode('signin');
        return;
      }
      if (authMode === 'signup') {
        await signUpWithEmail(nameInput, emailInput, passwordInput);
      } else {
        await signInWithEmail(emailInput, passwordInput);
      }
      setPasswordInput('');
      onSignedIn(activeTab);
    } catch (err) {
      setAuthError(friendlyAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRequestVenueAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setRequestBusy(true);
    setRequestError(null);
    try {
      const targetBar = bars.find((b) => b.id === ownerBarIdInput) || bars[0];
      await requestOwnerAccess(currentUser.id, {
        barId: targetBar.id,
        name: ownerNameInput.trim() || currentUser.name,
        title: ownerRoleInput,
        workEmail: ownerEmailInput.trim() || currentUser.email,
        accountEmail: currentUser.email,
      });
      await saveOwnerDisplayInfo(currentUser.id, {
        ownerTitle: ownerRoleInput,
        businessName: `${targetBar.name} Management`,
        primaryBarId: targetBar.id,
      });
      setRequestSent(true);
    } catch (err) {
      console.error('Venue access request failed:', err);
      setRequestError('Could not send the request. Please try again.');
    } finally {
      setRequestBusy(false);
    }
  };

  // Google + email/password form, used on both tabs
  const renderAuthForm = () => {
    if (!authReady) {
      return (
        <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 text-center">
          Checking your sign-in…
        </div>
      );
    }
    return (
      <div className="space-y-3.5">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={authBusy}
          className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
        >
          <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="flex-1 border-t border-neutral-800" />
          <span>
            {authMode === 'signup'
              ? 'or create an account with email'
              : authMode === 'reset'
                ? 'reset your password'
                : 'or sign in with email'}
          </span>
          <span className="flex-1 border-t border-neutral-800" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {authMode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs text-neutral-300 font-medium">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Alex Rivers"
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-neutral-300 font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                className={inputClass}
              />
            </div>
          </div>

          {authMode !== 'reset' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-neutral-300 font-medium">Password</label>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setAuthMode('reset')}
                    className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={authMode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {authError && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl px-3 py-2">
              {authError}
            </div>
          )}
          {authInfo && (
            <div className="text-xs text-neutral-200 bg-neutral-800/60 border border-neutral-700 rounded-xl px-3 py-2">
              {authInfo}
            </div>
          )}

          <button type="submit" disabled={authBusy} className={primaryButtonClass}>
            {authMode === 'reset' ? (
              <KeyRound className="w-4 h-4" />
            ) : activeTab === 'business' ? (
              <Building2 className="w-4 h-4" />
            ) : null}
            <span>
              {authBusy
                ? 'Please wait…'
                : authMode === 'signup'
                  ? 'Create Account'
                  : authMode === 'reset'
                    ? 'Send Reset Link'
                    : activeTab === 'business'
                      ? 'Log In to Venue Command Suite'
                      : 'Sign In as Patron'}
            </span>
          </button>
        </form>

        <div className="text-center text-xs text-neutral-400">
          {authMode === 'signin' ? (
            <>
              New to Bar Tap?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className="text-white font-semibold hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              {authMode === 'signup' ? 'Already have an account?' : 'Remembered it?'}{' '}
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="text-white font-semibold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    );
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full max-h-[92dvh] flex flex-col relative shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pinned Header & Role Selection Tabs */}
        <div className="p-5 sm:p-6 pb-4 border-b border-neutral-800/80 shrink-0 relative bg-neutral-900">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-300 font-bold mb-2 pr-10">
            Secure Authentication Portal
          </div>
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 rounded-2xl border border-neutral-800">
            <button
              onClick={() => setActiveTab('user')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'user'
                  ? 'bg-copper text-ink shadow-md font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Patron Login</span>
            </button>

            <button
              onClick={() => setActiveTab('business')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'business'
                  ? 'bg-copper text-ink shadow-md font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Business Owner</span>
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 pt-5">
          {/* ========================================================= */}
          {/* TAB 1: PATRON / APP USER AUTHENTICATION */}
          {/* ========================================================= */}
          {activeTab === 'user' && (
          <div>
            {currentUser ? (
              /* Already Logged In as Patron */
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-copper text-ink font-black text-xl flex items-center justify-center shadow-lg shadow-black/30">
                    {currentUser.avatar}
                  </div>
                  <div>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      <span>{currentUser.name}</span>
                      <span className="text-[10px] text-neutral-200 font-mono bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700">
                        Active Patron
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 font-mono">{currentUser.email}</div>
                  </div>
                </div>

                {/* Membership Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-950 to-neutral-900 border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        className={`w-4 h-4 ${
                          currentUser.isPremium ? 'text-neutral-100' : 'text-neutral-400'
                        }`}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                        {currentUser.isPremium
                          ? 'Bar Tap VIP Member (Free Tier)'
                          : 'Basic Account'}
                      </span>
                    </div>
                    {currentUser.isPremium && (
                      <span className="text-[11px] text-neutral-200 font-mono font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                    {currentUser.isPremium
                      ? 'Unlimited 24/7 real-time live feeds, multi-angle CCTV, and exclusive vendor/venue deals unlocked at no cost.'
                      : 'Basic tier displays 5-minute photo stills. Activate the Free VIP Tier ($0/mo) for continuous 24/7 video feeds and exclusive discounts.'}
                  </p>
                  {!currentUser.isPremium && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPremiumModal();
                      }}
                      className="mt-3 w-full py-2 bg-copper hover:bg-tan text-ink font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Activate Free VIP Account ($0/mo)</span>
                    </button>
                  )}
                </div>

                {/* Quick Patron Stats */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 text-center">
                    <div className="text-neutral-400 font-medium">Saved to My Bars</div>
                    <div className="text-xl font-bold text-white mt-1 tabular-nums">
                      {currentUser.savedBarIds.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 text-center">
                    <div className="text-neutral-400 font-medium">Currently Tapped In</div>
                    <div className="text-xl font-bold text-neutral-200 mt-1 tabular-nums">
                      {currentUser.tappedBarIds.length}
                    </div>
                  </div>
                </div>

                {/* Sign Out Button */}
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      onSignOutUser();
                      onClose();
                    }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 font-medium transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out of Patron Account</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Patron Sign In (Firebase Auth) */
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Sign In as App Patron
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Save favorite venues to your personal feed, unlock live video streams, and tap in to claim VIP perks.
                  </p>
                </div>

                {renderAuthForm()}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: BUSINESS OWNER / VENUE OPERATOR AUTHENTICATION */}
        {/* ========================================================= */}
        {activeTab === 'business' && (
          <div>
            {currentBusinessOwner ? (
              /* Already Logged In as Business Owner */
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 text-neutral-100 font-bold text-lg flex items-center justify-center shadow-lg">
                    {currentBusinessOwner.avatar}
                  </div>
                  <div>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      <span>{currentBusinessOwner.name}</span>
                      <span className="text-[10px] text-neutral-200 font-mono bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700">
                        {currentBusinessOwner.role}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 font-mono">
                      {currentBusinessOwner.email} • {currentBusinessOwner.businessName}
                    </div>
                  </div>
                </div>

                {/* Status Box */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-neutral-300" />
                      <span>Primary Managed Venue:</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {bars.find((b) => b.id === currentBusinessOwner.primaryBarId)?.name || 'Venue'}
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-400 leading-relaxed">
                    You have full verified operational authority to toggle live CCTV feeds, adjust tonight's operating hours, set door cover, and publish flash drink specials.
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenBusinessPlatform();
                    }}
                    className="w-full py-2.5 bg-copper hover:bg-tan text-ink font-black text-xs rounded-xl shadow-lg shadow-black/30 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Open Business Owner Platform</span>
                  </button>
                </div>

                {/* Sign Out Button */}
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                  <button
                    onClick={() => {
                      onSignOutOwner();
                      onClose();
                    }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 font-medium transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out of Business Account</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Business Owner Sign In / Venue Access Request */
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-neutral-300" />
                    <span>Business & Venue Owner Portal</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    {currentUser
                      ? 'Your account is not linked to a venue yet. Request access and Bar Tap will verify you and link your venue.'
                      : 'Sign in with the account linked to your venue to manage cameras, cover charges, and flash specials.'}
                  </p>
                </div>

                {!currentUser ? (
                  renderAuthForm()
                ) : requestSent ? (
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <div className="text-sm font-bold text-white">Request sent</div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      We'll verify your role and link the venue to {currentUser.email}. Once it's
                      linked, the Business Owner Platform opens automatically when you sign in.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleRequestVenueAccess} className="space-y-3.5">
                    <div className="text-[11px] text-neutral-400">
                      Signed in as <span className="text-neutral-200 font-mono">{currentUser.email}</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">Select Your Venue</label>
                      <select
                        value={ownerBarIdInput}
                        onChange={(e) => setOwnerBarIdInput(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-copper cursor-pointer"
                      >
                        {bars.map((bar) => (
                          <option key={bar.id} value={bar.id}>
                            {bar.name} ({bar.neighborhood})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-neutral-300 font-medium">Manager Name</label>
                        <input
                          type="text"
                          value={ownerNameInput}
                          onChange={(e) => setOwnerNameInput(e.target.value)}
                          placeholder={currentUser.name}
                          className={plainInputClass}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-neutral-300 font-medium">Your Role</label>
                        <select
                          value={ownerRoleInput}
                          onChange={(e) =>
                            setOwnerRoleInput(e.target.value as BusinessOwnerProfile['role'])
                          }
                          className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-copper cursor-pointer"
                        >
                          <option value="General Manager">General Manager</option>
                          <option value="Owner">Owner</option>
                          <option value="Operating Partner">Operating Partner</option>
                          <option value="Beverage Director">Beverage Director</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">Work Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="email"
                          value={ownerEmailInput}
                          onChange={(e) => setOwnerEmailInput(e.target.value)}
                          placeholder="manager@venue.com"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {requestError && (
                      <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl px-3 py-2">
                        {requestError}
                      </div>
                    )}

                    <button type="submit" disabled={requestBusy} className={primaryButtonClass}>
                      <Building2 className="w-4 h-4" />
                      <span>{requestBusy ? 'Sending…' : 'Request Venue Access'}</span>
                    </button>

                    <div className="text-[10px] text-neutral-500 font-mono break-all">
                      Account ID: {currentUser.id}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSignOutUser();
                      }}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 font-medium transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out and use a different account</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
