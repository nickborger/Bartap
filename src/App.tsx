import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Calendar,
  Camera,
  Compass,
  Crown,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  Radio,
  Search,
  Server,
  Shield,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { BarLocation, BusinessOwnerProfile, Review, UserProfile } from './types.ts';
import { ALL_PARTNER_BARS } from './data/bars.ts';
import { ALL_EXCLUSIVE_DEALS } from './data/exclusiveDeals.ts';
import {
  SUPPORTED_CITIES,
  calculateDistanceMiles,
  findNearestCity,
  searchSupportedCities,
  searchExpansionCities,
} from './utils/geolocation.ts';
import { Header } from './components/Header.tsx';
import { BarCard } from './components/BarCard.tsx';
import { BarProfileModal } from './components/BarProfileModal.tsx';
import { LiveFeedViewerModal } from './components/LiveFeedViewerModal.tsx';
import { NeighborhoodFilter } from './components/NeighborhoodFilter.tsx';
import { LiveMultiCamBar } from './components/LiveMultiCamBar.tsx';
import { DrinkSpecialsExplorer } from './components/DrinkSpecialsExplorer.tsx';
import { TallahasseeGuide } from './components/TallahasseeGuide.tsx';
import { MyBarsView } from './components/MyBarsView.tsx';
import { ExclusiveDealsExplorer } from './components/ExclusiveDealsExplorer.tsx';
import { BarOwnerPortalModal } from './components/BarOwnerPortalModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { PremiumModal } from './components/PremiumModal.tsx';
import { CloudRelayNetworkModal } from './components/CloudRelayNetworkModal.tsx';
import { BusinessOwnerPlatform } from './components/BusinessOwnerPlatform.tsx';

const STORAGE_KEY_REVIEWS = 'bartap_user_reviews';
const STORAGE_KEY_TAPPED = 'bartap_tapped_bars';
const STORAGE_KEY_SAVED = 'bartap_saved_bars';
const STORAGE_KEY_USER = 'bartap_current_user';
const STORAGE_KEY_OWNER = 'bartap_current_business_owner';
const STORAGE_KEY_MANAGED_BARS = 'bartap_managed_bars_overrides';
const STORAGE_KEY_CITY = 'bartap_selected_city';
const STORAGE_KEY_USER_COORDS = 'bartap_user_coords';

export default function App() {
  // Load Bars with saved reviews and owner updates
  const [bars, setBars] = useState<BarLocation[]>(() => {
    let baseBars = ALL_PARTNER_BARS;

    // Apply owner overrides from localStorage
    try {
      const savedOverrides = localStorage.getItem(STORAGE_KEY_MANAGED_BARS);
      if (savedOverrides) {
        const overridesMap = JSON.parse(savedOverrides) as Record<string, Partial<BarLocation>>;
        baseBars = baseBars.map((bar) => {
          if (overridesMap[bar.id]) {
            return { ...bar, ...overridesMap[bar.id] };
          }
          return bar;
        });
      }
    } catch {
      // Ignore fallback
    }

    // Apply user reviews
    try {
      const savedReviews = localStorage.getItem(STORAGE_KEY_REVIEWS);
      if (savedReviews) {
        const parsed = JSON.parse(savedReviews) as Record<string, Review[]>;
        return baseBars.map((bar) => {
          if (parsed[bar.id]) {
            const extraReviews = parsed[bar.id];
            const allReviews = [...extraReviews, ...bar.reviews];
            const avgRating =
              allReviews.reduce((sum, r) => sum + r.rating, 0) / (allReviews.length || 1);
            return {
              ...bar,
              reviews: allReviews,
              rating: Number(avgRating.toFixed(1)),
              totalReviews: bar.totalReviews + extraReviews.length,
            };
          }
          return bar;
        });
      }
    } catch {
      // Fallback
    }

    return baseBars;
  });

  // User Profile (Patron)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    // Starts as Basic Account to demonstrate the 5-minute still photo feature & Free VIP upgrade CTA
    return {
      id: 'usr-guest-tlh',
      name: 'Alex Rivers',
      email: 'alex.rivers@fsu.edu',
      avatar: 'A',
      isPremium: false,
      isTrial: false,
      savedBarIds: ['madison-social', 'proof-brewing-co'],
      tappedBarIds: ['madison-social'],
      joinedDate: 'Oct 2026',
    };
  });

  // Business Owner Profile
  const [currentBusinessOwner, setCurrentBusinessOwner] = useState<BusinessOwnerProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OWNER);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return null;
  });

  // Active Global View Mode: 'patron' or 'business_platform'
  const [viewMode, setViewMode] = useState<'patron' | 'business_platform'>('patron');
  const [authModalTab, setAuthModalTab] = useState<'user' | 'business'>('user');

  // Saved Bars (Personalized List)
  const [savedBarIds, setSavedBarIds] = useState<string[]>(() => {
    if (currentUser?.savedBarIds) return currentUser.savedBarIds;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVED);
      return saved ? JSON.parse(saved) : ['madison-social', 'proof-brewing-co'];
    } catch {
      return ['madison-social', 'proof-brewing-co'];
    }
  });

  // Tapped in status
  const [tappedInBars, setTappedInBars] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAPPED);
      return saved ? JSON.parse(saved) : { 'madison-social': true };
    } catch {
      return { 'madison-social': true };
    }
  });

  // Selected Geographical City & User GPS Coordinates
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CITY);
      if (saved) return saved;
    } catch {
      // Fallback
    }
    return 'Tallahassee';
  });

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER_COORDS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return null;
  });

  // Navigation & Filters (Patron Mode)
  const [activeView, setActiveView] = useState<
    'cams' | 'my_bars' | 'deals' | 'specials' | 'neighborhoods' | 'top_rated'
  >('cams');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(() => `All Tallahassee`);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'crowd' | 'wait' | 'distance'>('popular');
  const [filterHappyHourOnly, setFilterHappyHourOnly] = useState<boolean>(false);
  const [filterNoCoverOnly, setFilterNoCoverOnly] = useState<boolean>(false);

  // Modals
  const [profileBar, setProfileBar] = useState<BarLocation | null>(null);
  const [liveStreamBar, setLiveStreamBar] = useState<BarLocation | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isOwnerPortalOpen, setIsOwnerPortalOpen] = useState(false);
  const [ownerPortalTargetBarId, setOwnerPortalTargetBarId] = useState<string | undefined>();
  const [isRelayNetworkOpen, setIsRelayNetworkOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  // Sync user and saved bars to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(savedBarIds));
      if (currentUser) {
        const updatedUser = { ...currentUser, savedBarIds };
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch {
      // Storage unavailable
    }
  }, [savedBarIds, currentUser]);

  // Sync business owner to localStorage
  useEffect(() => {
    try {
      if (currentBusinessOwner) {
        localStorage.setItem(STORAGE_KEY_OWNER, JSON.stringify(currentBusinessOwner));
      } else {
        localStorage.removeItem(STORAGE_KEY_OWNER);
      }
    } catch {
      // Storage unavailable
    }
  }, [currentBusinessOwner]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAPPED, JSON.stringify(tappedInBars));
    } catch {
      // Storage unavailable
    }
  }, [tappedInBars]);

  const handleToggleTapIn = (barId: string) => {
    setTappedInBars((prev) => ({
      ...prev,
      [barId]: !prev[barId],
    }));
  };

  const handleToggleSave = (barId: string) => {
    setSavedBarIds((prev) => {
      const exists = prev.includes(barId);
      const updated = exists ? prev.filter((id) => id !== barId) : [...prev, barId];
      return updated;
    });
  };

  // Bar Owner update handler
  const handleUpdateManagedBar = (updatedBar: BarLocation) => {
    setBars((prevBars) => {
      const nextBars = prevBars.map((b) => (b.id === updatedBar.id ? updatedBar : b));
      try {
        const existingOverrides = localStorage.getItem(STORAGE_KEY_MANAGED_BARS);
        const parsed = existingOverrides ? JSON.parse(existingOverrides) : {};
        parsed[updatedBar.id] = updatedBar;
        localStorage.setItem(STORAGE_KEY_MANAGED_BARS, JSON.stringify(parsed));
      } catch {
        // Storage fail
      }
      return nextBars;
    });

    if (profileBar && profileBar.id === updatedBar.id) {
      setProfileBar(updatedBar);
    }
    if (liveStreamBar && liveStreamBar.id === updatedBar.id) {
      setLiveStreamBar(updatedBar);
    }
  };

  // Activate Free VIP Tier handler
  const handleActivateFreeVip = () => {
    if (currentUser) {
      const updated: UserProfile = {
        ...currentUser,
        isPremium: true,
        isTrial: false,
        trialEndsAt: undefined,
        premiumUntil: 'Free Forever',
      };
      setCurrentUser(updated);
    } else {
      const newUser: UserProfile = {
        id: `usr-vip-${Date.now()}`,
        name: 'Nightlife VIP Member',
        email: 'vip@bartap.app',
        avatar: 'V',
        isPremium: true,
        isTrial: false,
        premiumUntil: 'Free Forever',
        savedBarIds,
        tappedBarIds: ['madison-social'],
        joinedDate: 'Just now',
      };
      setCurrentUser(newUser);
    }
  };

  // Sign In / Sign Out Handlers
  const handleSignInUser = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.savedBarIds && user.savedBarIds.length > 0) {
      setSavedBarIds(Array.from(new Set([...savedBarIds, ...user.savedBarIds])));
    }
  };

  const handleSignOutUser = () => {
    setCurrentUser(null);
  };

  const handleSignInOwner = (owner: BusinessOwnerProfile) => {
    setCurrentBusinessOwner(owner);
    setViewMode('business_platform');
  };

  const handleSignOutOwner = () => {
    setCurrentBusinessOwner(null);
    setViewMode('patron');
  };

  const handleOpenAuth = (tab: 'user' | 'business' = 'user') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleOpenBusinessPlatform = () => {
    if (currentBusinessOwner) {
      setViewMode('business_platform');
    } else {
      handleOpenAuth('business');
    }
  };

  const handlePreviewAsPatron = (barId: string) => {
    setViewMode('patron');
    const target = bars.find((b) => b.id === barId);
    if (target) {
      setProfileBar(target);
    }
  };

  const handleAddReview = (barId: string, review: Review) => {
    setBars((prevBars) => {
      const updated = prevBars.map((b) => {
        if (b.id === barId) {
          const newReviews = [review, ...b.reviews];
          const newAvg =
            newReviews.reduce((sum, r) => sum + r.rating, 0) / (newReviews.length || 1);
          return {
            ...b,
            reviews: newReviews,
            rating: Number(newAvg.toFixed(1)),
            totalReviews: b.totalReviews + 1,
          };
        }
        return b;
      });

      try {
        const stored = localStorage.getItem(STORAGE_KEY_REVIEWS);
        const parsed = stored ? JSON.parse(stored) : {};
        parsed[barId] = [review, ...(parsed[barId] || [])];
        localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(parsed));
      } catch {
        // Storage fail
      }
      return updated;
    });

    if (profileBar && profileBar.id === barId) {
      setProfileBar((prev) => {
        if (!prev) return null;
        const newReviews = [review, ...prev.reviews];
        const newAvg =
          newReviews.reduce((sum, r) => sum + r.rating, 0) / (newReviews.length || 1);
        return {
          ...prev,
          reviews: newReviews,
          rating: Number(newAvg.toFixed(1)),
          totalReviews: prev.totalReviews + 1,
        };
      });
    }
  };

  // Calculate distance for all bars based on userCoords
  const barsWithDistance = useMemo(() => {
    return bars.map((b) => {
      if (!userCoords) return b;
      const coords = b.coordinates || { lat: 30.4383, lng: -84.2807 };
      const dist = calculateDistanceMiles(userCoords.lat, userCoords.lng, coords.lat, coords.lng);
      return {
        ...b,
        distanceMiles: dist,
      };
    });
  }, [bars, userCoords]);

  const activeCityMeta = useMemo(() => {
    return (
      SUPPORTED_CITIES.find(
        (c) =>
          c.name.toLowerCase() === selectedCity.toLowerCase() ||
          c.id === selectedCity.toLowerCase()
      ) || SUPPORTED_CITIES[0]
    );
  }, [selectedCity]);

  // Partner venues in active city
  const cityBars = useMemo(() => {
    const norm = selectedCity.toLowerCase().trim();
    return barsWithDistance.filter(
      (b) =>
        b.city.toLowerCase() === norm ||
        norm.startsWith(b.city.toLowerCase()) ||
        b.city.toLowerCase().startsWith(norm)
    );
  }, [barsWithDistance, selectedCity]);

  const neighborhoodCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cityBars.length };
    cityBars.forEach((b) => {
      counts[b.neighborhood] = (counts[b.neighborhood] || 0) + 1;
    });
    return counts;
  }, [cityBars]);

  const dealsBarIds = useMemo(() => {
    return new Set(ALL_EXCLUSIVE_DEALS.map((d) => d.barId));
  }, []);

  const handleSelectCity = (cityName: string) => {
    setSelectedCity(cityName);
    setSelectedNeighborhood(`All ${cityName}`);
    try {
      localStorage.setItem(STORAGE_KEY_CITY, cityName);
    } catch {
      // Storage fallback
    }
  };

  const handleUserCoordsChange = (coords: { lat: number; lng: number } | null) => {
    setUserCoords(coords);
    if (coords) {
      try {
        localStorage.setItem(STORAGE_KEY_USER_COORDS, JSON.stringify(coords));
      } catch {
        // Storage fallback
      }
      setSortBy('distance');
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY_USER_COORDS);
      } catch {
        // Storage fallback
      }
    }
  };

  const filteredBars = useMemo(() => {
    let result = [...barsWithDistance];

    if (activeView === 'my_bars') {
      result = result.filter((b) => savedBarIds.includes(b.id));
      return result;
    }

    // Filter to selected city partner venues
    const normCity = selectedCity.toLowerCase().trim();
    result = result.filter(
      (b) =>
        b.city.toLowerCase() === normCity ||
        normCity.startsWith(b.city.toLowerCase()) ||
        b.city.toLowerCase().startsWith(normCity)
    );

    if (activeView === 'deals') {
      result = result.filter((b) => dealsBarIds.has(b.id));
      return result;
    }

    const allLabel = `All ${selectedCity}`;
    if (
      selectedNeighborhood &&
      selectedNeighborhood !== allLabel &&
      !selectedNeighborhood.toLowerCase().startsWith('all ') &&
      selectedNeighborhood !== ''
    ) {
      result = result.filter((b) => b.neighborhood === selectedNeighborhood);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.neighborhood.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.tagline.toLowerCase().includes(q) ||
          b.drinkSpecials.some(
            (s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
          ) ||
          b.features.some((f) => f.toLowerCase().includes(q))
      );
    }

    if (filterHappyHourOnly) {
      result = result.filter((b) => b.drinkSpecials.some((s) => s.isHappyHour));
    }

    if (filterNoCoverOnly) {
      result = result.filter((b) => b.coverCharge.toLowerCase().includes('no cover'));
    }

    if (sortBy === 'distance') {
      result.sort((a, b) => (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999));
      return result;
    }

    if (activeView === 'top_rated') {
      result.sort((a, b) => b.rating - a.rating);
      return result;
    }

    result.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'crowd') return b.crowdDensity - a.crowdDensity;
      if (sortBy === 'wait') return a.estimatedWaitMinutes - b.estimatedWaitMinutes;
      const aTaps = a.tappedInCount + (tappedInBars[a.id] ? 1 : 0);
      const bTaps = b.tappedInCount + (tappedInBars[b.id] ? 1 : 0);
      return bTaps - aTaps;
    });

    return result;
  }, [
    barsWithDistance,
    selectedCity,
    selectedNeighborhood,
    searchQuery,
    filterHappyHourOnly,
    filterNoCoverOnly,
    sortBy,
    activeView,
    savedBarIds,
    dealsBarIds,
    tappedInBars,
  ]);

  const isPremiumActive = !!currentUser?.isPremium;

  // =========================================================================
  // VIEW MODE: DEDICATED BUSINESS OWNER PLATFORM
  // =========================================================================
  if (viewMode === 'business_platform' && currentBusinessOwner) {
    return (
      <div className="min-h-[100dvh] w-full bg-neutral-950 text-neutral-100 flex flex-col font-sans">
        <BusinessOwnerPlatform
          owner={currentBusinessOwner}
          bars={bars}
          onUpdateBar={handleUpdateManagedBar}
          onSignOut={handleSignOutOwner}
          onPreviewAsPatron={handlePreviewAsPatron}
        />

        {/* Global Modals for Business Platform */}
        {profileBar && (
          <BarProfileModal
            bar={profileBar}
            isOpen={!!profileBar}
            onClose={() => setProfileBar(null)}
            isTappedIn={!!tappedInBars[profileBar.id]}
            isSaved={savedBarIds.includes(profileBar.id)}
            onToggleTapIn={() => handleToggleTapIn(profileBar.id)}
            onToggleSave={() => handleToggleSave(profileBar.id)}
            onAddReview={handleAddReview}
            isPremium={true}
            onOpenPremium={() => setIsPremiumModalOpen(true)}
            onOpenRelayModal={() => setIsRelayNetworkOpen(true)}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: PUBLIC PATRON APP
  // =========================================================================
  return (
    <div className="min-h-[100dvh] w-full bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-neutral-200 selection:text-neutral-950">
      {/* Top Banner if logged in as Business Owner viewing Patron mode */}
      {currentBusinessOwner && (
        <div className="bg-neutral-200 text-neutral-950 border-b border-neutral-300 px-3 sm:px-6 py-1.5 text-xs font-bold shadow-md">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-neutral-950 shrink-0" />
              <span className="truncate">
                Operator:{' '}
                <strong className="underline">{currentBusinessOwner.name}</strong> (
                {currentBusinessOwner.role} ·{' '}
                {bars.find((b) => b.id === currentBusinessOwner.primaryBarId)?.name || 'Venue'}) — Patron preview
              </span>
            </div>
            <button
              onClick={() => setViewMode('business_platform')}
              className="px-3 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-100 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap shrink-0"
            >
              Return to Business Suite →
            </button>
          </div>
        </div>
      )}

      {/* Top Bar Navigation */}
      <Header
        activeView={activeView}
        onNavigate={(v) => {
          setActiveView(v);
          if (v === 'cams') {
            setSelectedNeighborhood(`All ${selectedCity}`);
          }
        }}
        currentUser={currentUser}
        currentBusinessOwner={currentBusinessOwner}
        onOpenAuth={handleOpenAuth}
        onOpenPremium={() => setIsPremiumModalOpen(true)}
        onOpenBusinessPlatform={handleOpenBusinessPlatform}
        isBusinessPlatformActive={false}
        onToggleViewMode={() => setViewMode('business_platform')}
        onOpenRelayNetwork={() => setIsRelayNetworkOpen(true)}
        savedBarsCount={savedBarIds.length}
        currentCity={selectedCity}
        onSelectCity={handleSelectCity}
        userCoords={userCoords}
        onUserCoordsChange={handleUserCoordsChange}
        allBars={barsWithDistance}
        isCityModalOpen={isCityModalOpen}
        onSetCityModalOpen={setIsCityModalOpen}
      />

      {/* Free VIP Tier Notification Bar (for Basic Users) */}
      {!isPremiumActive && (
        <div className="bg-neutral-900 border-b border-neutral-800 text-neutral-200 px-3 sm:px-6 py-1.5 text-xs font-semibold">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2 min-w-0">
              <Camera className="w-3.5 h-3.5 shrink-0 text-neutral-300" />
              <span className="truncate">
                Basic Mode: 5-minute still snapshots of {selectedCity} partner bars.
              </span>
            </div>
            <button
              onClick={() => setIsPremiumModalOpen(true)}
              className="px-3 py-1 bg-neutral-100 hover:bg-white text-neutral-950 rounded-lg text-[11px] font-black shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
            >
              Unlock Free VIP Tier (24/7 Live Video) →
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-5 lg:px-8 py-3 sm:py-5 space-y-4 sm:space-y-5">
        {/* VIEW 1 & TOP RATED: LIVE CAMS */}
        {(activeView === 'cams' || activeView === 'top_rated') && (
          <div className="space-y-4 sm:space-y-5">
            {/* Compact Hero Banner Section */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800/60 border border-neutral-800 p-4 sm:p-6 shadow-xl">
              <div className="max-w-4xl space-y-2.5 sm:space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs font-semibold tracking-wider text-neutral-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPremiumActive ? 'bg-red-500 animate-pulse' : 'bg-neutral-300'
                    }`}
                  />
                  <span>
                    {isPremiumActive
                      ? `${activeCityMeta.displayName} · VIP 24/7 Live Video Feeds Active`
                      : `${activeCityMeta.displayName} · Basic Tier (5-Minute Still Snapshots)`}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[10px]">
                    ✦ Subscribed Partner Network
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                  Watch Live Feeds of {selectedCity} Bars.{' '}
                  <span className="text-neutral-300">Tap In to Tonight’s Action.</span>
                </h1>

                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-3xl">
                  {isPremiumActive
                    ? `Streaming continuous real-time video feeds across ${selectedCity} (${activeCityMeta.popularDistricts?.slice(0, 3).join(', ')}). Check door lines, crowd density, and exclusive VIP deals.`
                    : `Basic tier shows camera still photos updated every 5 minutes. Activate Free Bar Tap VIP ($0/mo) for 24/7 live video streaming!`}
                </p>

                {/* Quick stats row */}
                <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-red-500" />
                    <span>
                      {cityBars.length} {selectedCity} Partner Bars ·{' '}
                      {cityBars.reduce((sum, b) => sum + b.cameras.length, 0)} Camera Feeds
                    </span>
                  </div>
                  <span className="text-neutral-600 hidden sm:inline">·</span>
                  <button
                    onClick={() => setIsRelayNetworkOpen(true)}
                    className="flex items-center gap-1.5 text-neutral-200 hover:underline cursor-pointer font-mono"
                    title={`View ${selectedCity} Edge Cloud Relays`}
                  >
                    <Server className="w-3.5 h-3.5 text-neutral-300" />
                    <span>{activeCityMeta.relayPoP}</span>
                  </button>
                  <span className="text-neutral-600 hidden sm:inline">·</span>
                  <div className="flex items-center gap-1.5 text-neutral-300">
                    <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span>{cityBars.length} Partners Online</span>
                  </div>
                  <span className="text-neutral-600 hidden sm:inline">·</span>
                  <button
                    onClick={handleOpenBusinessPlatform}
                    className="flex items-center gap-1.5 text-neutral-200 hover:underline cursor-pointer font-semibold"
                  >
                    <Building2 className="w-3.5 h-3.5 text-neutral-300" />
                    <span>Business Owner Suite</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick City Switcher & Search Bar */}
            <div className="p-3 sm:p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5 shrink-0 mr-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Partner Markets:</span>
                </span>
                {SUPPORTED_CITIES.map((city) => {
                  const isCurrent = city.name.toLowerCase() === selectedCity.toLowerCase();
                  const count = bars.filter((b) => b.city.toLowerCase() === city.name.toLowerCase()).length;
                  return (
                    <button
                      key={city.id}
                      onClick={() => handleSelectCity(city.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                        isCurrent
                          ? 'bg-neutral-100 text-neutral-950 border-neutral-200 shadow-sm'
                          : 'bg-neutral-950/70 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <span>{city.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          isCurrent ? 'bg-neutral-950/15 text-neutral-950 font-black' : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setIsCityModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-bold border border-neutral-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap w-full md:w-auto shrink-0"
              >
                <Search className="w-3.5 h-3.5 text-neutral-300" />
                <span>Search Any City...</span>
              </button>
            </div>

            {/* Quick Multi-Cam Scroller Bar */}
            <LiveMultiCamBar
              bars={cityBars}
              onSelectBarStream={(bar) => setLiveStreamBar(bar)}
              activeStreamBarId={liveStreamBar?.id}
              isPremium={isPremiumActive}
              onOpenRelayModal={() => setIsRelayNetworkOpen(true)}
              currentCity={selectedCity}
            />

            {/* Neighborhood Filter & Search Area */}
            <NeighborhoodFilter
              cityName={selectedCity}
              selectedNeighborhood={selectedNeighborhood}
              onSelectNeighborhood={setSelectedNeighborhood}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              filterHappyHourOnly={filterHappyHourOnly}
              onToggleHappyHour={() => setFilterHappyHourOnly(!filterHappyHourOnly)}
              filterNoCoverOnly={filterNoCoverOnly}
              onToggleNoCover={() => setFilterNoCoverOnly(!filterNoCoverOnly)}
              neighborhoodCounts={neighborhoodCounts}
              availableNeighborhoods={activeCityMeta.neighborhoods}
              hasUserLocation={!!userCoords}
              onSelectCity={handleSelectCity}
              onOpenCityModal={() => setIsCityModalOpen(true)}
            />

            {/* Grid of Partner Bars */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                <span>
                  Showing {filteredBars.length} of {cityBars.length} partner venues in {selectedCity}
                </span>
                <span>
                  {filterHappyHourOnly ? '• Happy Hours Filtered' : ''}{' '}
                  {filterNoCoverOnly ? '• Free Cover Filtered' : ''}
                </span>
              </div>

              {filteredBars.length === 0 ? (
                (() => {
                  const matchedOtherCity = searchQuery.trim()
                    ? searchSupportedCities(searchQuery).find(
                        (c) => c.name.toLowerCase() !== selectedCity.toLowerCase()
                      )
                    : null;
                  const matchedExpansion = searchQuery.trim()
                    ? searchExpansionCities(searchQuery)[0]
                    : null;

                  if (matchedOtherCity) {
                    const otherCityBars = bars.filter(
                      (b) => b.city.toLowerCase() === matchedOtherCity.name.toLowerCase()
                    );
                    return (
                      <div className="p-8 sm:p-12 text-center rounded-3xl bg-neutral-900 border border-neutral-700 space-y-4 shadow-xl">
                        <div className="w-14 h-14 rounded-2xl bg-neutral-800 text-neutral-200 flex items-center justify-center mx-auto text-2xl border border-neutral-700">
                          <Globe className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          Looking for Bars in {matchedOtherCity.displayName}?
                        </h3>
                        <p className="text-xs text-neutral-300 max-w-md mx-auto">
                          You are currently viewing <strong className="text-white">{selectedCity}</strong>.
                          Bar Tap has <strong>{otherCityBars.length} partner bars and clubs</strong> with live camera streams active in {matchedOtherCity.name}!
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                          <button
                            onClick={() => {
                              handleSelectCity(matchedOtherCity.name);
                              setSearchQuery('');
                            }}
                            className="px-5 py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 rounded-xl text-xs font-black shadow-md cursor-pointer"
                          >
                            Switch to {matchedOtherCity.name} Partner Bars ({otherCityBars.length}) →
                          </button>
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedNeighborhood(`All ${selectedCity}`);
                            }}
                            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            Stay in {selectedCity}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (matchedExpansion) {
                    const nearest = findNearestCity(matchedExpansion.lat, matchedExpansion.lng);
                    return (
                      <div className="p-8 sm:p-12 text-center rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-neutral-800 text-neutral-200 flex items-center justify-center mx-auto text-2xl border border-neutral-700">
                          <MapPin className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-white">
                          No Subscribed Bars in {matchedExpansion.displayName} Yet
                        </h3>
                        <p className="text-xs text-neutral-400 max-w-md mx-auto">
                          {matchedExpansion.name} is in our partner expansion pipeline! Our nearest active Bar Tap hub is{' '}
                          <strong className="text-neutral-200">{nearest.city.displayName}</strong> ({Math.round(nearest.distanceMiles)} mi away).
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                          <button
                            onClick={() => {
                              handleSelectCity(nearest.city.name);
                              setSearchQuery('');
                            }}
                            className="px-4 py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            View Nearest: {nearest.city.name} Bars →
                          </button>
                          <button
                            onClick={() => setIsCityModalOpen(true)}
                            className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            Search All Supported Cities
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-12 text-center rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
                      <div className="text-4xl">🍸</div>
                      <h3 className="text-base font-bold text-white">No {selectedCity} bars match your search</h3>
                      <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                        Try clearing your search query, searching another city, or switching to &lsquo;All {selectedCity}&rsquo; to see all {cityBars.length} partner venues.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedNeighborhood(`All ${selectedCity}`);
                            setFilterHappyHourOnly(false);
                            setFilterNoCoverOnly(false);
                          }}
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Reset All Filters
                        </button>
                        <button
                          onClick={() => setIsCityModalOpen(true)}
                          className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Search Other Cities
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                  {filteredBars.map((bar) => (
                    <BarCard
                      key={bar.id}
                      bar={bar}
                      isTappedIn={!!tappedInBars[bar.id]}
                      isSaved={savedBarIds.includes(bar.id)}
                      onTapIn={() => handleToggleTapIn(bar.id)}
                      onToggleSave={() => handleToggleSave(bar.id)}
                      onOpenLiveStream={() => setLiveStreamBar(bar)}
                      onOpenProfile={() => setProfileBar(bar)}
                      hasExclusiveDeal={dealsBarIds.has(bar.id)}
                      isPremium={isPremiumActive}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: MY BARS (PERSONALIZED SAVED FEED) */}
        {activeView === 'my_bars' && (
          <MyBarsView
            bars={barsWithDistance}
            savedBarIds={savedBarIds}
            tappedInBars={tappedInBars}
            onToggleSave={handleToggleSave}
            onToggleTapIn={handleToggleTapIn}
            onOpenProfile={(b) => setProfileBar(b)}
            onOpenLiveStream={(b) => setLiveStreamBar(b)}
            currentUser={currentUser}
            onOpenAuth={() => handleOpenAuth('user')}
            isPremium={isPremiumActive}
          />
        )}

        {/* VIEW 3: VIP DEALS EXPLORER */}
        {activeView === 'deals' && (
          <ExclusiveDealsExplorer
            bars={barsWithDistance}
            isPremium={isPremiumActive}
            onOpenPremiumModal={() => setIsPremiumModalOpen(true)}
            onOpenBarProfile={(bar) => setProfileBar(bar)}
            onOpenLiveStream={(bar) => setLiveStreamBar(bar)}
            currentCity={selectedCity}
          />
        )}

        {/* VIEW 4: DRINK SPECIALS EXPLORER */}
        {activeView === 'specials' && (
          <DrinkSpecialsExplorer
            bars={cityBars}
            onOpenBarProfile={(b) => setProfileBar(b)}
            onOpenLiveStream={(b) => setLiveStreamBar(b)}
            tappedInBars={tappedInBars}
            onToggleTapIn={handleToggleTapIn}
            currentCity={selectedCity}
          />
        )}

        {/* VIEW 5: CITY GUIDE */}
        {activeView === 'neighborhoods' && (
          <TallahasseeGuide
            bars={cityBars}
            onSelectNeighborhood={(n) => {
              setSelectedNeighborhood(n);
              setActiveView('cams');
            }}
            currentCity={selectedCity}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 mt-8 py-5 text-xs text-neutral-500">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-neutral-100 text-neutral-950 font-black text-[10px] flex items-center justify-center">
              BT
            </span>
            <span className="font-semibold text-neutral-300">Bar Tap {selectedCity}</span>
            <span>· Real-time nightlife video intelligence & verified crowd telemetry</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-neutral-400">
            <button
              onClick={() => handleOpenAuth('business')}
              className="hover:text-white cursor-pointer flex items-center gap-1 font-semibold"
            >
              <Building2 className="w-3.5 h-3.5 text-neutral-300" />
              <span>Business Owner Login</span>
            </button>
            <button
              onClick={() => setIsRelayNetworkOpen(true)}
              className="hover:text-white cursor-pointer flex items-center gap-1 font-mono"
            >
              <Server className="w-3 h-3 text-neutral-300" />
              <span>Edge Relay Network</span>
            </button>
            <button
              onClick={() => {
                setActiveView('neighborhoods');
              }}
              className="hover:text-white cursor-pointer flex items-center gap-1"
            >
              <Compass className="w-3.5 h-3.5 text-neutral-300" />
              <span>{selectedCity} Guide</span>
            </button>
            <button
              onClick={() => {
                setIsPremiumModalOpen(true);
              }}
              className="hover:text-white cursor-pointer flex items-center gap-1 text-neutral-200"
            >
              <Crown className="w-3 h-3" />
              <span>{isPremiumActive ? 'VIP Tier Active (Free)' : 'Unlock Free VIP Tier'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Bar Profile Modal */}
      {profileBar && (
        <BarProfileModal
          bar={profileBar}
          isOpen={!!profileBar}
          onClose={() => setProfileBar(null)}
          isTappedIn={!!tappedInBars[profileBar.id]}
          isSaved={savedBarIds.includes(profileBar.id)}
          onToggleTapIn={() => handleToggleTapIn(profileBar.id)}
          onToggleSave={() => handleToggleSave(profileBar.id)}
          onAddReview={handleAddReview}
          isPremium={isPremiumActive}
          onOpenPremium={() => setIsPremiumModalOpen(true)}
          onOpenRelayModal={() => setIsRelayNetworkOpen(true)}
          onOpenOwnerPortalForBar={(barId) => {
            setProfileBar(null);
            if (currentBusinessOwner) {
              setViewMode('business_platform');
            } else {
              setOwnerPortalTargetBarId(barId);
              handleOpenAuth('business');
            }
          }}
        />
      )}

      {/* Live Feed Theater Modal */}
      {liveStreamBar && (
        <LiveFeedViewerModal
          bar={liveStreamBar}
          isOpen={!!liveStreamBar}
          onClose={() => setLiveStreamBar(null)}
          isTappedIn={!!tappedInBars[liveStreamBar.id]}
          onToggleTapIn={() => handleToggleTapIn(liveStreamBar.id)}
          onOpenProfile={() => {
            const bar = liveStreamBar;
            setLiveStreamBar(null);
            setProfileBar(bar);
          }}
          isPremium={isPremiumActive}
          onOpenPremium={() => setIsPremiumModalOpen(true)}
          onOpenRelayModal={() => setIsRelayNetworkOpen(true)}
        />
      )}

      {/* Bar Owner Management Portal Modal (Fallback/Quick Trigger) */}
      <BarOwnerPortalModal
        isOpen={isOwnerPortalOpen}
        onClose={() => setIsOwnerPortalOpen(false)}
        bars={bars}
        onUpdateBar={handleUpdateManagedBar}
        defaultBarId={ownerPortalTargetBarId}
        onOpenBusinessPlatform={() => {
          setIsOwnerPortalOpen(false);
          handleOpenBusinessPlatform();
        }}
      />

      {/* Tallahassee Cloud Camera Relay Network Diagnostics Modal */}
      <CloudRelayNetworkModal
        isOpen={isRelayNetworkOpen}
        onClose={() => setIsRelayNetworkOpen(false)}
        bars={bars}
        onSelectBarFeed={(b) => setLiveStreamBar(b)}
      />

      {/* Sign In & User Profile Modal with 2 Distinct Roles */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        currentBusinessOwner={currentBusinessOwner}
        onSignInUser={handleSignInUser}
        onSignInOwner={handleSignInOwner}
        onSignOutUser={handleSignOutUser}
        onSignOutOwner={handleSignOutOwner}
        onOpenPremiumModal={() => setIsPremiumModalOpen(true)}
        onOpenBusinessPlatform={() => setViewMode('business_platform')}
        initialTab={authModalTab}
        bars={bars}
      />

      {/* Free VIP Account Tier Modal */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        currentUser={currentUser}
        onActivateVip={handleActivateFreeVip}
        onOpenAuth={() => handleOpenAuth('user')}
      />
    </div>
  );
}
