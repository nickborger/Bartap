import React from 'react';
import {
  Building2,
  Crown,
  Heart,
  Radio,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { BusinessOwnerProfile, UserProfile, BarLocation } from '../types.ts';
import { CitySelector } from './CitySelector.tsx';

interface HeaderProps {
  activeView: 'cams' | 'my_bars' | 'deals' | 'specials' | 'neighborhoods' | 'top_rated';
  onNavigate: (
    view: 'cams' | 'my_bars' | 'deals' | 'specials' | 'neighborhoods' | 'top_rated'
  ) => void;
  currentUser: UserProfile | null;
  currentBusinessOwner: BusinessOwnerProfile | null;
  onOpenAuth: (initialTab?: 'user' | 'business') => void;
  onOpenPremium: () => void;
  onOpenBusinessPlatform: () => void;
  isBusinessPlatformActive?: boolean;
  onToggleViewMode?: () => void;
  onOpenRelayNetwork?: () => void;
  savedBarsCount: number;
  currentCity: string;
  onSelectCity: (city: string) => void;
  userCoords: { lat: number; lng: number } | null;
  onUserCoordsChange: (coords: { lat: number; lng: number } | null) => void;
  allBars: BarLocation[];
  isCityModalOpen?: boolean;
  onSetCityModalOpen?: (open: boolean) => void;
  /** Shown only to accounts with role "admin" */
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  currentUser,
  currentBusinessOwner,
  onOpenAuth,
  onOpenPremium,
  onOpenBusinessPlatform,
  isBusinessPlatformActive = false,
  onToggleViewMode,
  onOpenRelayNetwork,
  savedBarsCount,
  currentCity,
  onSelectCity,
  userCoords,
  onUserCoordsChange,
  allBars,
  isCityModalOpen,
  onSetCityModalOpen,
  onOpenAdmin,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 h-14 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Zone 1: Brand Title & City Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (isBusinessPlatformActive && onToggleViewMode) {
                onToggleViewMode();
              }
              onNavigate('cams');
            }}
            className="text-lg sm:text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="w-8 h-8 rounded-lg bg-copper text-ink font-black flex items-center justify-center text-sm shadow-md">
              BT
            </span>
            <span className="hidden sm:inline">Bar Tap</span>
          </a>

          {/* Geographical City Selector & GPS detection */}
          {!isBusinessPlatformActive && (
            <CitySelector
              currentCity={currentCity}
              onSelectCity={onSelectCity}
              userCoords={userCoords}
              onUserCoordsChange={onUserCoordsChange}
              allBars={allBars}
              onOpenRelayNetwork={onOpenRelayNetwork}
              isOpenExternal={isCityModalOpen}
              onCloseExternal={() => onSetCityModalOpen?.(false)}
            />
          )}

          {/* Business Platform Indicator Mode Switcher */}
          {currentBusinessOwner && (
            <button
              onClick={onOpenBusinessPlatform}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border whitespace-nowrap shrink-0 ${
                isBusinessPlatformActive
                  ? 'bg-copper text-ink border-copper font-black shadow-md'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{isBusinessPlatformActive ? 'Business Suite (Active)' : 'Open Business Suite'}</span>
            </button>
          )}
        </div>

        {/* Zone 2: Navigation Links (Only in Patron View on md+) */}
        {!isBusinessPlatformActive && (
          <nav className="hidden md:flex items-center gap-3 lg:gap-5 text-xs lg:text-sm font-medium text-neutral-400 min-w-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => onNavigate('cams')}
              className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer py-1 ${
                activeView === 'cams' ? 'text-white font-semibold' : ''
              }`}
            >
              {currentUser?.isPremium ? 'Live Cams' : 'Bar Cams'}
            </button>
            <button
              onClick={() => onNavigate('my_bars')}
              className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
                activeView === 'my_bars' ? 'text-white font-semibold' : ''
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>My Bars</span>
              {savedBarsCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700">
                  {savedBarsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('deals')}
              className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
                activeView === 'deals' ? 'text-white font-semibold' : ''
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-neutral-300" />
              <span>VIP Deals</span>
            </button>
            <button
              onClick={() => onNavigate('specials')}
              className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer py-1 ${
                activeView === 'specials' ? 'text-white font-semibold' : ''
              }`}
            >
              Specials
            </button>
            <button
              onClick={() => onNavigate('neighborhoods')}
              className={`whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer py-1 ${
                activeView === 'neighborhoods' ? 'text-white font-semibold' : ''
              }`}
            >
              {currentCity}
            </button>
          </nav>
        )}

        {/* Zone 3: Actions & Distinct Auth Entry Points */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Cloud Relay diagnostics */}
          {onOpenRelayNetwork && !isBusinessPlatformActive && (
            <button
              onClick={onOpenRelayNetwork}
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-mono border border-neutral-800 transition cursor-pointer min-h-[36px]"
              title="Cloud Camera Relay Network (44 Installed Feeds)"
            >
              <span className="w-2 h-2 rounded-full bg-tan animate-pulse" />
              <Server className="w-3.5 h-3.5 text-neutral-300" />
              <span>Relays (44)</span>
            </button>
          )}

          {/* Admin screen (admins only) */}
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              data-testid="open-admin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-copper hover:bg-tan text-ink text-xs font-black transition cursor-pointer min-h-[36px] whitespace-nowrap"
              title="Admin: add and manage bars"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Admin</span>
            </button>
          )}

          {/* DISTINCT SIGN IN 1: BUSINESS OWNER PORTAL */}
          {currentBusinessOwner ? (
            <button
              onClick={onOpenBusinessPlatform}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-100 text-xs font-bold border border-neutral-700 transition cursor-pointer min-h-[36px]"
              title={`Logged in as ${currentBusinessOwner.name} (${currentBusinessOwner.role})`}
            >
              <Building2 className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
              <span className="max-w-[80px] sm:max-w-[100px] truncate">{currentBusinessOwner.name}</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenAuth('business')}
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-800 transition cursor-pointer min-h-[36px] whitespace-nowrap"
              title="Business Owner & Operator Sign In"
            >
              <Building2 className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
              <span className="hidden lg:inline">Business Login</span>
              <span className="lg:hidden">Owner</span>
            </button>
          )}

          {/* Free VIP Tier CTA (for Patrons) */}
          {!isBusinessPlatformActive &&
            (currentUser?.isPremium ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-100 text-xs font-bold font-mono whitespace-nowrap">
                <Crown className="w-3.5 h-3.5 fill-tan" />
                <span>VIP PASS</span>
              </div>
            ) : (
              <button
                onClick={onOpenPremium}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-copper hover:bg-tan text-ink text-xs font-black transition shadow-md cursor-pointer whitespace-nowrap min-h-[36px]"
              >
                <Sparkles className="w-3.5 h-3.5 fill-neutral-950" />
                <span>Free VIP</span>
              </button>
            ))}

          {/* DISTINCT SIGN IN 2: PATRON SIGN IN */}
          <button
            onClick={() => onOpenAuth('user')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-semibold transition cursor-pointer min-h-[36px] whitespace-nowrap"
            title={currentUser ? `Patron Account: ${currentUser.name}` : 'Patron Sign In'}
          >
            {currentUser ? (
              <>
                <div className="w-5 h-5 rounded-full bg-copper text-ink font-bold flex items-center justify-center text-[10px] shrink-0">
                  {currentUser.avatar}
                </div>
                <span className="hidden sm:inline max-w-[80px] truncate">
                  {currentUser.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Compact Mobile Navigation Strip (< md) */}
      {!isBusinessPlatformActive && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-neutral-800/70 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold"
        >
          <button
            onClick={() => onNavigate('cams')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeView === 'cams'
                ? 'bg-copper text-ink font-bold'
                : 'text-neutral-300 bg-neutral-900/70 border border-neutral-800'
            }`}
          >
            {currentUser?.isPremium ? 'Live Cams' : 'Bar Cams'}
          </button>
          <button
            onClick={() => onNavigate('my_bars')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer flex items-center gap-1 ${
              activeView === 'my_bars'
                ? 'bg-copper text-ink font-bold'
                : 'text-neutral-300 bg-neutral-900/70 border border-neutral-800'
            }`}
          >
            <Heart className="w-3 h-3" />
            <span>My Bars{savedBarsCount > 0 ? ` (${savedBarsCount})` : ''}</span>
          </button>
          <button
            onClick={() => onNavigate('deals')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer flex items-center gap-1 ${
              activeView === 'deals'
                ? 'bg-copper text-ink font-bold'
                : 'text-neutral-300 bg-neutral-900/70 border border-neutral-800'
            }`}
          >
            <Crown className="w-3 h-3" />
            <span>VIP Deals</span>
          </button>
          <button
            onClick={() => onNavigate('specials')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeView === 'specials'
                ? 'bg-copper text-ink font-bold'
                : 'text-neutral-300 bg-neutral-900/70 border border-neutral-800'
            }`}
          >
            Specials
          </button>
          <button
            onClick={() => onNavigate('neighborhoods')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeView === 'neighborhoods'
                ? 'bg-copper text-ink font-bold'
                : 'text-neutral-300 bg-neutral-900/70 border border-neutral-800'
            }`}
          >
            {currentCity} Guide
          </button>
        </nav>
      )}
    </header>
  );
};
