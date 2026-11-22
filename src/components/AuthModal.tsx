import React, { useEffect, useState } from 'react';
import {
  Building2,
  Check,
  Crown,
  Heart,
  Key,
  Lock,
  LogOut,
  Mail,
  Radio,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Video,
  X,
} from 'lucide-react';
import { BarLocation, BusinessOwnerProfile, UserProfile } from '../types.ts';
import { VERIFIED_BUSINESS_OWNERS } from '../data/businessOwners.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  currentBusinessOwner: BusinessOwnerProfile | null;
  onSignInUser: (user: UserProfile) => void;
  onSignInOwner: (owner: BusinessOwnerProfile) => void;
  onSignOutUser: () => void;
  onSignOutOwner: () => void;
  onOpenPremiumModal: () => void;
  onOpenBusinessPlatform: () => void;
  initialTab?: 'user' | 'business';
  bars: BarLocation[];
}

const DEMO_USERS: Omit<UserProfile, 'savedBarIds' | 'tappedBarIds'>[] = [
  {
    id: 'usr-fsu-1',
    name: 'Alex Rivers',
    email: 'alex.rivers@fsu.edu',
    avatar: 'A',
    isPremium: true,
    premiumUntil: 'Free Forever',
    joinedDate: 'Aug 2025',
  },
  {
    id: 'usr-midtown-2',
    name: 'Taylor Vance',
    email: 'taylor.vance@tlhlocal.com',
    avatar: 'T',
    isPremium: false,
    joinedDate: 'Oct 2025',
  },
  {
    id: 'usr-capitol-3',
    name: 'Jordan Miller',
    email: 'jmiller@floridacapitol.org',
    avatar: 'J',
    isPremium: true,
    premiumUntil: 'Free Forever',
    joinedDate: 'Jul 2025',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentBusinessOwner,
  onSignInUser,
  onSignInOwner,
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

  // User input state
  const [userNameInput, setUserNameInput] = useState('');
  const [userEmailInput, setUserEmailInput] = useState('');

  // Business owner input state
  const [ownerNameInput, setOwnerNameInput] = useState('');
  const [ownerEmailInput, setOwnerEmailInput] = useState('');
  const [ownerBarIdInput, setOwnerBarIdInput] = useState(bars[0]?.id || 'madison-social');
  const [ownerRoleInput, setOwnerRoleInput] = useState<BusinessOwnerProfile['role']>('General Manager');

  if (!isOpen) return null;

  // Handle Patron Demo Selection
  const handleSelectUserDemo = (demo: (typeof DEMO_USERS)[0]) => {
    const fullUser: UserProfile = {
      ...demo,
      savedBarIds: ['madison-social', 'proof-brewing-co'],
      tappedBarIds: ['madison-social'],
    };
    onSignInUser(fullUser);
    onClose();
  };

  // Handle Patron Custom Form
  const handleUserCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmailInput.trim()) return;

    const name = userNameInput.trim() || userEmailInput.split('@')[0];
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name,
      email: userEmailInput.trim(),
      avatar: name.charAt(0).toUpperCase(),
      isPremium: false,
      savedBarIds: ['madison-social', 'charlie-park'],
      tappedBarIds: [],
      joinedDate: 'Just now',
    };

    onSignInUser(newUser);
    onClose();
  };

  // Handle Business Owner Demo Selection
  const handleSelectOwnerDemo = (owner: BusinessOwnerProfile) => {
    onSignInOwner(owner);
    onClose();
    onOpenBusinessPlatform();
  };

  // Handle Business Owner Custom Form
  const handleOwnerCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerEmailInput.trim()) return;

    const targetBar = bars.find((b) => b.id === ownerBarIdInput) || bars[0];
    const name = ownerNameInput.trim() || ownerEmailInput.split('@')[0];

    const newOwner: BusinessOwnerProfile = {
      id: `owner-${Date.now()}`,
      name,
      email: ownerEmailInput.trim(),
      role: ownerRoleInput,
      managedBarIds: [targetBar.id],
      primaryBarId: targetBar.id,
      avatar: name.slice(0, 2).toUpperCase(),
      verified: true,
      businessName: `${targetBar.name} Management`,
      joinedDate: 'Today',
    };

    onSignInOwner(newOwner);
    onClose();
    onOpenBusinessPlatform();
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
                  ? 'bg-neutral-100 text-neutral-950 shadow-md font-black'
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
                  ? 'bg-neutral-100 text-neutral-950 shadow-md font-black'
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
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-950 font-black text-xl flex items-center justify-center shadow-lg shadow-black/30">
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
                      className="mt-3 w-full py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
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
              /* Patron Sign In Form & Demo Profiles */
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Sign In as App Patron
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Save favorite venues to your personal feed, unlock live video streams, and tap in to claim VIP perks.
                  </p>
                </div>

                {/* 1-Click Patron Demos */}
                <div className="space-y-2 bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800">
                  <span className="text-[11px] font-mono uppercase text-neutral-400 font-semibold block">
                    ⚡ Instant 1-Click Patron Profiles
                  </span>
                  <div className="space-y-1.5">
                    {DEMO_USERS.map((demo) => (
                      <button
                        key={demo.id}
                        onClick={() => handleSelectUserDemo(demo)}
                        className="w-full p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-600 transition flex items-center justify-between text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-200 font-bold text-xs flex items-center justify-center border border-neutral-700">
                            {demo.avatar}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white group-hover:text-neutral-200 transition-colors">
                              {demo.name}
                            </div>
                            <div className="text-[10px] text-neutral-400">{demo.email}</div>
                          </div>
                        </div>
                        {demo.isPremium ? (
                          <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-950 text-[10px] font-bold font-mono">
                            VIP (Free)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px] font-mono">
                            Basic
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Patron Sign In Form */}
                <form onSubmit={handleUserCustomSubmit} className="space-y-3.5">
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span className="flex-1 border-t border-neutral-800" />
                    <span>or continue with email</span>
                    <span className="flex-1 border-t border-neutral-800" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-300 font-medium">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={userNameInput}
                        onChange={(e) => setUserNameInput(e.target.value)}
                        placeholder="e.g. Jordan Miller"
                        className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 text-xs focus:outline-none focus:border-neutral-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-300 font-medium">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="email"
                        required
                        value={userEmailInput}
                        onChange={(e) => setUserEmailInput(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 text-xs focus:outline-none focus:border-neutral-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-black text-xs rounded-xl transition shadow-lg shadow-black/30 active:scale-[0.98] cursor-pointer mt-1"
                  >
                    Sign In as Patron
                  </button>
                </form>
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
                    className="w-full py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-black text-xs rounded-xl shadow-lg shadow-black/30 transition cursor-pointer flex items-center justify-center gap-2"
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
              /* Business Owner Sign In Form & Demo Profiles */
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-neutral-300" />
                    <span>Business & Venue Owner Portal</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Access your venue's hardware cameras, control cloud edge relays, manage cover charges, and broadcast flash specials.
                  </p>
                </div>

                {/* Instant 1-Click Verified Venue Owner Profiles */}
                <div className="space-y-2 bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono uppercase text-neutral-400 font-semibold block">
                      ⚡ 1-Click Verified Operator Accounts ({VERIFIED_BUSINESS_OWNERS.length})
                    </span>
                    <span className="text-[10px] text-neutral-300 font-mono shrink-0">Scroll for all</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5">
                    {VERIFIED_BUSINESS_OWNERS.map((owner) => {
                      const managedBar = bars.find((b) => b.id === owner.primaryBarId);
                      return (
                        <button
                          key={owner.id}
                          type="button"
                          onClick={() => handleSelectOwnerDemo(owner)}
                          className="w-full p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-600 transition flex items-center justify-between gap-2 text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-200 font-bold text-xs flex items-center justify-center border border-neutral-700 shrink-0">
                              {owner.avatar}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white group-hover:text-neutral-200 transition-colors flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{owner.name}</span>
                                <span className="text-[10px] text-neutral-400 font-normal">
                                  ({owner.role})
                                </span>
                              </div>
                              <div className="text-[10px] text-neutral-300 font-mono truncate">
                                🏢 {managedBar?.name || owner.businessName}
                                {managedBar?.city ? ` · ${managedBar.city}` : ''}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 text-[10px] font-mono border border-neutral-700 shrink-0">
                            Manage
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Business Owner Login Form */}
                <form onSubmit={handleOwnerCustomSubmit} className="space-y-3.5">
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span className="flex-1 border-t border-neutral-800" />
                    <span>or sign in with business credentials</span>
                    <span className="flex-1 border-t border-neutral-800" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-300 font-medium">Select Your Venue</label>
                    <select
                      value={ownerBarIdInput}
                      onChange={(e) => setOwnerBarIdInput(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-neutral-400 cursor-pointer"
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
                        placeholder="e.g. Jordan Cole"
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 text-xs focus:outline-none focus:border-neutral-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300 font-medium">Your Role</label>
                      <select
                        value={ownerRoleInput}
                        onChange={(e) =>
                          setOwnerRoleInput(e.target.value as BusinessOwnerProfile['role'])
                        }
                        className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-neutral-400 cursor-pointer"
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
                        required
                        value={ownerEmailInput}
                        onChange={(e) => setOwnerEmailInput(e.target.value)}
                        placeholder="manager@venue.com"
                        className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 text-xs focus:outline-none focus:border-neutral-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-black text-xs rounded-xl transition shadow-lg shadow-black/30 active:scale-[0.98] cursor-pointer mt-1 flex items-center justify-center gap-1.5"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Log In to Venue Command Suite</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
