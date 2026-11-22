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
import { AdminPanel } from './components/AdminPanel.tsx';
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase.ts';
import {
  UserDoc,
  activateFreeVip,
  ensureUserDoc,
  setBarSaved,
  setBarTapped,
  signOutUser,
  toBusinessOwner,
  toUserProfile,
} from './services/authService.ts';
import {
  BarsState,
  EMPTY_BARS_STATE,
  ReviewsByBar,
  addReview,
  mergeBars,
  resolveStoredBars,
  saveOwnerBarEdits,
  subscribeToBars,
  subscribeToReviews,
  subscribeToSeedMarker,
} from './services/barDataService.ts';

const STORAGE_KEY_TAPPED = 'bartap_tapped_bars'; // guest (signed-out) tap-ins only
const STORAGE_KEY_CITY = 'bartap_selected_city';
const STORAGE_KEY_USER_COORDS = 'bartap_user_coords';

export default function App() {
  // ---------------------------------------------------------------------------
  // Firebase: auth state, the signed-in user's profile doc, shared bar data
  // ---------------------------------------------------------------------------
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [reviewsByBar, setReviewsByBar] = useState<ReviewsByBar>({});
  const [barsState, setBarsState] = useState<BarsState>(EMPTY_BARS_STATE);
  const [barsSeeded, setBarsSeeded] = useState<boolean | null>(null);
  // Re-render at midnight-ish so "today's hours" roll over without a reload
  const [dayKey, setDayKey] = useState(() => new Date().toDateString());

  // Bars come from the Firestore `bars` collection (managed in the Admin screen).
  // Until an admin copies the built-in bars over, the built-in list is shown instead.
  // If Firestore can't be reached for 6 seconds, show the built-in bars so the app isn't blank.
  const [barsTimedOut, setBarsTimedOut] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setBarsTimedOut(true), 6000);
    return () => window.clearTimeout(t);
  }, []);
  const { bars: storedBars, usingBuiltIn } = useMemo(
    () =>
      resolveStoredBars(
        !barsState.loaded && barsTimedOut ? { ...barsState, loaded: true, error: true } : barsState,
        barsSeeded
      ),
    [barsState, barsSeeded, barsTimedOut]
  );

  // Every bar incl. hidden ones (Admin + owners) and the bars patrons see (active only)
  const allBars = useMemo(
    () => mergeBars(storedBars, reviewsByBar),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storedBars, reviewsByBar, dayKey]
  );
  const bars = useMemo(() => allBars.filter((b) => b.isActive !== false), [allBars]);

  // User Profile (Patron) — comes from Firestore users/{uid}
  const currentUser = useMemo<UserProfile | null>(
    () => (authUid && userDoc ? toUserProfile(authUid, userDoc) : null),
    [authUid, userDoc]
  );

  // Business Owner Profile — only when users/{uid} has role "owner" and ownedBarIds
  const currentBusinessOwner = useMemo<BusinessOwnerProfile | null>(
    () => (authUid && userDoc ? toBusinessOwner(authUid, userDoc, allBars) : null),
    [authUid, userDoc, allBars]
  );

  // Admin — only when users/{uid} has role "admin" (set once in the Firebase console)
  const isAdmin = !!authUid && userDoc?.role === 'admin';

  // Active Global View Mode: 'patron', 'business_platform' or 'admin'
  const [viewMode, setViewMode] = useState<'patron' | 'business_platform' | 'admin'>('patron');
  const [authModalTab, setAuthModalTab] = useState<'user' | 'business'>('user');
  const [pendingBusinessLogin, setPendingBusinessLogin] = useState(false);

  // Saved Bars (Personalized List) — stored on the user's Firestore doc
  const savedBarIds = useMemo(() => currentUser?.savedBarIds ?? [], [currentUser]);

  // Tapped in status: Firestore for signed-in users, localStorage for guests
  const [guestTappedInBars, setGuestTappedInBars] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAPPED);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const tappedInBars = useMemo<Record<string, boolean>>(() => {
    if (currentUser) {
      return Object.fromEntries(currentUser.tappedBarIds.map((id) => [id, true]));
    }
    return guestTappedInBars;
  }, [currentUser, guestTappedInBars]);

  // Selected Geographical City & User GPS Coordinates
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CITY);
      // Only restore a saved city that still has partner bars
      if (
        saved &&
        SUPPORTED_CITIES.some(
          (c) => c.name.toLowerCase() === saved.toLowerCase() || c.id === saved.toLowerCase()
        )
      ) {
        return saved;
      }
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

  // Auth state listener (also finishes a Google sign-in that used a redirect)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) return ensureUserDoc(result.user);
      })
      .catch((err) => console.warn('Google redirect sign-in failed:', err));

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUid(user ? user.uid : null);
      if (!user) setUserDoc(null);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Live listener on the signed-in user's profile doc (users/{uid})
  useEffect(() => {
    if (!authUid) return;
    const unsubscribe = onSnapshot(
      doc(db, 'users', authUid),
      (snap) => {
        if (snap.exists()) {
          setUserDoc(snap.data() as UserDoc);
        } else if (auth.currentUser && auth.currentUser.uid === authUid) {
          ensureUserDoc(auth.currentUser).catch((err) =>
            console.error('Could not create user profile:', err)
          );
        }
      },
      (err) => console.error('User profile listener error:', err)
    );
    return unsubscribe;
  }, [authUid]);

  // Live listeners for shared data: reviews and owner bar edits
  useEffect(() => {
    const unsubReviews = subscribeToReviews(setReviewsByBar, (err) =>
      console.error('Reviews listener error:', err)
    );
    const unsubBars = subscribeToBars(setBarsState);
    const unsubSeed = subscribeToSeedMarker(setBarsSeeded);
    const timer = window.setInterval(() => setDayKey(new Date().toDateString()), 60_000);
    return () => {
      unsubReviews();
      unsubBars();
      unsubSeed();
      window.clearInterval(timer);
    };
  }, []);

  // Keep open modals in sync when live data changes
  useEffect(() => {
    setProfileBar((prev) => {
      if (!prev) return prev;
      const fresh = bars.find((b) => b.id === prev.id);
      return fresh ? { ...fresh, distanceMiles: prev.distanceMiles } : prev;
    });
    setLiveStreamBar((prev) => {
      if (!prev) return prev;
      const fresh = bars.find((b) => b.id === prev.id);
      return fresh ? { ...fresh, distanceMiles: prev.distanceMiles } : prev;
    });
  }, [bars]);

  // After signing in from the Business tab, open the platform once the owner profile loads
  useEffect(() => {
    if (pendingBusinessLogin && currentBusinessOwner) {
      setPendingBusinessLogin(false);
      setIsAuthModalOpen(false);
      setViewMode('business_platform');
    }
  }, [pendingBusinessLogin, currentBusinessOwner]);

  // If the user signs out (or loses owner access), leave the business platform
  useEffect(() => {
    if (authReady && !currentBusinessOwner && viewMode === 'business_platform') {
      setViewMode('patron');
    }
  }, [authReady, currentBusinessOwner, viewMode]);

  // Non-admins can never stay on the Admin screen
  useEffect(() => {
    if (authReady && !isAdmin && viewMode === 'admin' && (!authUid || userDoc)) {
      setViewMode('patron');
    }
  }, [authReady, isAdmin, viewMode, authUid, userDoc]);

  // Guest tap-ins stay on this device
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TAPPED, JSON.stringify(guestTappedInBars));
    } catch {
      // Storage unavailable
    }
  }, [guestTappedInBars]);

  const reportSaveError = (what: string, err: unknown) => {
    console.error(`${what} failed:`, err);
    window.alert(`Couldn't save ${what}. Please check your connection and try again.`);
  };

  const handleToggleTapIn = (barId: string) => {
    if (currentUser) {
      const isTapped = currentUser.tappedBarIds.includes(barId);
      setBarTapped(currentUser.id, barId, !isTapped).catch((err) =>
        reportSaveError('your tap-in', err)
      );
      return;
    }
    setGuestTappedInBars((prev) => ({
      ...prev,
      [barId]: !prev[barId],
    }));
  };

  const handleToggleSave = (barId: string) => {
    if (!currentUser) {
      handleOpenAuth('user');
      return;
    }
    const exists = currentUser.savedBarIds.includes(barId);
    setBarSaved(currentUser.id, barId, !exists).catch((err) =>
      reportSaveError('your saved bars', err)
    );
  };

  // Bar Owner update handler — saved to Firestore bars/{barId}; everyone sees it live
  const handleUpdateManagedBar = (updatedBar: BarLocation) => {
    if (!currentBusinessOwner || !currentBusinessOwner.managedBarIds.includes(updatedBar.id)) {
      window.alert('You can only edit venues linked to your owner account.');
      return;
    }
    const currentBar = allBars.find((b) => b.id === updatedBar.id);
    if (!currentBar) return;
    if (usingBuiltIn && !barsState.legacyOverrides[updatedBar.id]) {
      window.alert('This venue is still being set up. Ask the Bar Tap admin to finish moving bars into the database, then try again.');
      return;
    }
    saveOwnerBarEdits(currentBusinessOwner.id, currentBar, updatedBar).catch((err) =>
      reportSaveError('your venue changes', err)
    );
  };

  // Activate Free VIP Tier handler
  const handleActivateFreeVip = () => {
    if (!currentUser) {
      handleOpenAuth('user');
      return;
    }
    activateFreeVip(currentUser.id).catch((err) => reportSaveError('your VIP upgrade', err));
  };

  // Sign Out Handlers (one Firebase account covers both patron and owner roles)
  const handleSignOutUser = () => {
    setViewMode('patron');
    signOutUser().catch((err) => console.error('Sign out failed:', err));
  };

  const handleSignOutOwner = () => {
    setViewMode('patron');
    signOutUser().catch((err) => console.error('Sign out failed:', err));
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

  // Reviews are shared: saved to Firestore reviews/, everyone sees them live
  const handleAddReview = (barId: string, review: Review) => {
    if (!currentUser) {
      handleOpenAuth('user');
      return;
    }
    const author =
      !review.author.trim() || review.author === 'Tallahassee Night Owl'
        ? currentUser.name
        : review.author;
    addReview(currentUser.id, barId, { ...review, author }).catch((err) =>
      reportSaveError('your review', err)
    );
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
    return barsWithDistance.filter((b) => {
      const market = (b.market || b.city || '').toLowerCase();
      return market === norm || norm.startsWith(market) || market.startsWith(norm);
    });
  }, [barsWithDistance, selectedCity]);

  // The market's listed neighborhoods plus any new ones admins used for bars
  const cityNeighborhoods = useMemo(
    () =>
      Array.from(
        new Set([...activeCityMeta.neighborhoods, ...cityBars.map((b) => b.neighborhood).filter(Boolean)])
      ),
    [activeCityMeta, cityBars]
  );

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
        (b.market || b.city).toLowerCase() === normCity ||
        normCity.startsWith((b.market || b.city).toLowerCase()) ||
        (b.market || b.city).toLowerCase().startsWith(normCity)
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
  // VIEW MODE: ADMIN (role "admin" only; writes are also enforced by firestore.rules)
  // =========================================================================
  if (viewMode === 'admin' && isAdmin && authUid) {
    return (
      <div className="min-h-[100dvh] w-full bg-neutral-950 text-neutral-100 flex flex-col font-sans">
        <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur border-b border-neutral-800">
          <div className="max-w-4xl mx-auto px-3 sm:px-5 py-3 flex items-center justify-between gap-2">
            <span className="text-lg font-black tracking-tight text-neutral-100">
              Bar <span className="text-copper">Tap</span> <span className="text-xs font-bold text-neutral-400 ml-1">Admin</span>
            </span>
            <button
              onClick={() => setViewMode('patron')}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-100 cursor-pointer"
            >
              Back to the app
            </button>
          </div>
        </header>
        <main className="flex-1 w-full px-3 sm:px-5 py-4 sm:py-6">
          <AdminPanel
            adminUid={authUid}
            bars={usingBuiltIn ? [] : storedBars}
            usingBuiltIn={usingBuiltIn}
            legacyOverrides={barsState.legacyOverrides}
          />
        </main>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: DEDICATED BUSINESS OWNER PLATFORM
  // =========================================================================
  if (
    viewMode === 'business_platform' &&
    currentBusinessOwner &&
    allBars.some((b) => currentBusinessOwner.managedBarIds.includes(b.id))
  ) {
    return (
      <div className="min-h-[100dvh] w-full bg-neutral-950 text-neutral-100 flex flex-col font-sans">
        <BusinessOwnerPlatform
          owner={currentBusinessOwner}
          bars={allBars.filter((b) => currentBusinessOwner.managedBarIds.includes(b.id))}
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
            canWriteReview={!!currentUser}
            reviewerName={currentUser?.name}
            onRequestSignIn={() => handleOpenAuth('user')}
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
    <div className="min-h-[100dvh] w-full bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-copper selection:text-ink">
      {/* Top Banner if logged in as Business Owner viewing Patron mode */}
      {currentBusinessOwner && (
        <div className="bg-tan text-neutral-950 border-b border-tan px-3 sm:px-6 py-1.5 text-xs font-bold shadow-md">
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
        onOpenAdmin={isAdmin ? () => setViewMode('admin') : undefined}
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
              className="px-3 py-1 bg-copper hover:bg-tan text-ink rounded-lg text-[11px] font-black shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
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
                      isPremiumActive ? 'bg-red-500 animate-pulse' : 'bg-tan'
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
                  const count = bars.filter((b) => (b.market || b.city).toLowerCase() === city.name.toLowerCase()).length;
                  return (
                    <button
                      key={city.id}
                      onClick={() => handleSelectCity(city.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                        isCurrent
                          ? 'bg-copper text-ink border-copper shadow-sm'
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
              availableNeighborhoods={cityNeighborhoods}
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
                      (b) => (b.market || b.city).toLowerCase() === matchedOtherCity.name.toLowerCase()
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
                            className="px-5 py-2.5 bg-copper hover:bg-tan text-ink rounded-xl text-xs font-black shadow-md cursor-pointer"
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
                            className="px-4 py-2.5 bg-copper hover:bg-tan text-ink rounded-xl text-xs font-bold cursor-pointer"
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
                          className="px-4 py-2 bg-copper hover:bg-tan text-ink rounded-xl text-xs font-bold cursor-pointer"
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
            <span className="w-5 h-5 rounded bg-copper text-ink font-black text-[10px] flex items-center justify-center">
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
            canWriteReview={!!currentUser}
            reviewerName={currentUser?.name}
            onRequestSignIn={() => handleOpenAuth('user')}
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
      {bars.length > 0 && (
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
      )}

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
        authReady={authReady}
        onSignedIn={(tab) => {
          if (tab === 'business') {
            setPendingBusinessLogin(true);
          } else {
            setIsAuthModalOpen(false);
          }
        }}
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
