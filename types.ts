import React, { useState, useMemo } from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  Compass,
  Crosshair,
  Globe,
  Loader2,
  MapPin,
  Navigation,
  Radio,
  Search,
  Send,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react';
import {
  CityMeta,
  SUPPORTED_CITIES,
  POPULAR_EXPANSION_CITIES,
  calculateDistanceMiles,
  findNearestCity,
  formatDistancePill,
  requestBrowserLocation,
  searchSupportedCities,
  searchExpansionCities,
  matchBestPartnerCity,
} from '../utils/geolocation.ts';
import { BarLocation } from '../types.ts';

interface CitySelectorProps {
  currentCity: string;
  onSelectCity: (cityName: string) => void;
  userCoords: { lat: number; lng: number } | null;
  onUserCoordsChange: (coords: { lat: number; lng: number } | null) => void;
  allBars: BarLocation[];
  onOpenRelayNetwork?: () => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({
  currentCity,
  onSelectCity,
  userCoords,
  onUserCoordsChange,
  allBars,
  onOpenRelayNetwork,
  isOpenExternal,
  onCloseExternal,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [activeRegionFilter, setActiveRegionFilter] = useState<'all' | 'fl' | 'tx_tn'>('all');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccessNote, setLocationSuccessNote] = useState<string | null>(null);
  const [requestedExpansionCities, setRequestedExpansionCities] = useState<Record<string, boolean>>({});

  const isOpen = isOpenExternal !== undefined ? isOpenExternal : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onCloseExternal && !open) {
      onCloseExternal();
    }
    setInternalIsOpen(open);
  };

  // Active city meta object
  const activeCityMeta = useMemo(() => {
    return (
      SUPPORTED_CITIES.find(
        (c) =>
          c.name.toLowerCase() === currentCity.toLowerCase() ||
          c.id === currentCity.toLowerCase()
      ) || SUPPORTED_CITIES[0]
    );
  }, [currentCity]);

  // Total partner venues in active city
  const cityBars = allBars.filter(
    (b) => b.city.toLowerCase() === activeCityMeta.name.toLowerCase()
  );

  // Calculate distance to active city if coordinates are known
  const distanceToActiveCity = userCoords
    ? calculateDistanceMiles(userCoords.lat, userCoords.lng, activeCityMeta.lat, activeCityMeta.lng)
    : null;

  const isUserNearbyActiveCity = distanceToActiveCity !== null && distanceToActiveCity <= 45;

  // Filtered partner cities based on search and region filter
  const filteredCities = useMemo(() => {
    let list = searchSupportedCities(citySearchQuery);

    if (activeRegionFilter === 'fl') {
      list = list.filter((c) => c.state === 'FL');
    } else if (activeRegionFilter === 'tx_tn') {
      list = list.filter((c) => c.state === 'TX' || c.state === 'TN');
    }

    return list;
  }, [citySearchQuery, activeRegionFilter]);

  // Expansion cities matching the search query
  const matchingExpansionCities = useMemo(() => {
    if (!citySearchQuery.trim()) return [];
    return searchExpansionCities(citySearchQuery);
  }, [citySearchQuery]);

  const handleDetectGPS = async () => {
    setIsLocating(true);
    setLocationError(null);
    setLocationSuccessNote(null);

    try {
      const coords = await requestBrowserLocation();
      onUserCoordsChange({ lat: coords.lat, lng: coords.lng });

      const nearest = findNearestCity(coords.lat, coords.lng);
      if (nearest.distanceMiles <= 60) {
        onSelectCity(nearest.city.name);
        setLocationSuccessNote(
          `GPS Verified: Located in ${nearest.city.displayName} (${nearest.distanceMiles} mi away)`
        );
      } else {
        // Outside immediate market, auto-select nearest supported city with note
        onSelectCity(nearest.city.name);
        setLocationSuccessNote(
          `GPS Detected: Closest Bar Tap partner market is ${nearest.city.displayName} (${Math.round(
            nearest.distanceMiles
          )} mi away)`
        );
      }
      setTimeout(() => {
        setIsLocating(false);
      }, 500);
    } catch (err: any) {
      setIsLocating(false);
      setLocationError(err.message || 'Could not access GPS location.');
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!citySearchQuery.trim()) return;

    const best = matchBestPartnerCity(citySearchQuery);
    if (best) {
      onSelectCity(best.name);
      setIsOpen(false);
      setCitySearchQuery('');
    }
  };

  const handleRequestExpansion = (cityName: string) => {
    setRequestedExpansionCities((prev) => ({
      ...prev,
      [cityName.toLowerCase()]: true,
    }));
  };

  return (
    <>
      {/* Compact Trigger Button in Header/Nav */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-neutral-500 transition cursor-pointer group shadow-sm min-w-0 shrink-0"
        title="Search any City or Detect GPS Location"
      >
        <div className="relative flex items-center justify-center">
          <MapPin className="w-3.5 h-3.5 text-neutral-300 group-hover:scale-110 transition-transform" />
          {isUserNearbyActiveCity && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-tan animate-pulse" />
          )}
        </div>

        <div className="flex flex-col text-left">
          <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider leading-none">
            {isUserNearbyActiveCity ? 'Your City' : 'Market'}
          </span>
          <span className="text-xs font-bold text-white group-hover:text-neutral-200 transition-colors flex items-center gap-1">
            <span>{activeCityMeta.name}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400 group-hover:text-neutral-200" />
          </span>
        </div>

        <span className="hidden xl:inline-block px-1.5 py-0.5 rounded-md bg-neutral-800 text-neutral-200 text-[10px] font-mono font-bold border border-neutral-700">
          {cityBars.length} Bars
        </span>
      </button>

      {/* Modal / Location Switcher Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 font-mono uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Geographical Partner Network</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Search & Select Your City
                </h2>
                <p className="text-xs text-neutral-400">
                  Search any city to view subscribed & partnered bars with live edge camera streams.
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                aria-label="Close City Selector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* City Live Search Bar */}
            <div className="p-4 sm:p-5 bg-neutral-950/90 border-b border-neutral-800/80 space-y-3">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={citySearchQuery}
                    onChange={(e) => setCitySearchQuery(e.target.value)}
                    placeholder="Search any city, state, or zip (e.g. Tampa, Austin, Miami, 32304)..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-white placeholder-neutral-500 focus:outline-none focus:border-copper text-sm shadow-inner"
                    autoFocus
                  />
                  {citySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCitySearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!citySearchQuery.trim()}
                  className="px-4 py-2.5 rounded-xl bg-copper hover:bg-tan text-ink text-xs font-bold transition disabled:opacity-40 cursor-pointer shrink-0 shadow-sm"
                >
                  Search
                </button>
              </form>

              {/* Quick filter pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-neutral-400 font-mono text-[11px] mr-1">Quick Filter:</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRegionFilter('all');
                    setCitySearchQuery('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeRegionFilter === 'all' && !citySearchQuery
                      ? 'bg-copper text-ink font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  All Partner Hubs ({SUPPORTED_CITIES.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRegionFilter('fl')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeRegionFilter === 'fl'
                      ? 'bg-copper text-ink font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  🌴 Florida (5)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRegionFilter('tx_tn')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeRegionFilter === 'tx_tn'
                      ? 'bg-copper text-ink font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  🎸 Texas & Tennessee (2)
                </button>
              </div>
            </div>

            {/* GPS Detection Bar */}
            <div className="px-4 py-3 bg-neutral-950/50 border-b border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200 shrink-0">
                  <Navigation className="w-4 h-4 text-neutral-200" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5 leading-none">
                    <span>GPS Auto-Locate</span>
                    {userCoords && (
                      <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-200 border border-neutral-700 text-[10px] font-mono">
                        GPS Active
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                    Connect automatically to subscribed venues near your coordinates.
                  </p>
                </div>
              </div>

              <button
                onClick={handleDetectGPS}
                disabled={isLocating}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold border border-neutral-700 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-200" />
                    <span>Detecting GPS...</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-3.5 h-3.5 text-neutral-200" />
                    <span>Use My GPS</span>
                  </>
                )}
              </button>
            </div>

            {/* Feedback Notifications */}
            {locationSuccessNote && (
              <div className="px-5 py-2.5 bg-neutral-800/70 border-b border-neutral-700 text-neutral-100 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-neutral-200 shrink-0" />
                <span>{locationSuccessNote}</span>
              </div>
            )}
            {locationError && (
              <div className="px-5 py-2.5 bg-red-950/40 border-b border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <span className="font-bold text-red-400">Notice:</span>
                <span>{locationError}</span>
              </div>
            )}

            {/* Cities List Grid */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              {filteredCities.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">
                    <span>
                      Partnered Cities ({filteredCities.length})
                    </span>
                    {citySearchQuery && (
                      <span className="text-neutral-200 font-sans normal-case">
                        Matching &ldquo;{citySearchQuery}&rdquo;
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredCities.map((city) => {
                      const isSelected = city.name.toLowerCase() === currentCity.toLowerCase();
                      const barsInCity = allBars.filter(
                        (b) => b.city.toLowerCase() === city.name.toLowerCase()
                      );
                      const totalFeeds = barsInCity.reduce((sum, b) => sum + b.cameras.length, 0);

                      // Distance from user coords
                      const dist = userCoords
                        ? calculateDistanceMiles(userCoords.lat, userCoords.lng, city.lat, city.lng)
                        : null;

                      return (
                        <div
                          key={city.id}
                          onClick={() => {
                            onSelectCity(city.name);
                            setIsOpen(false);
                            setCitySearchQuery('');
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                            isSelected
                              ? 'bg-neutral-800/80 border-neutral-400 shadow-lg'
                              : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h3 className="text-sm font-bold text-white group-hover:text-neutral-200 transition-colors flex items-center gap-1.5">
                                <span>{city.displayName}</span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-copper ring-4 ring-white/15" />
                                )}
                              </h3>

                              {dist !== null && (
                                <span
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                    dist <= 40
                                      ? 'bg-neutral-800 text-neutral-100 border border-neutral-600'
                                      : 'bg-neutral-800 text-neutral-400'
                                  }`}
                                >
                                  {formatDistancePill(dist)}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-neutral-300 font-medium line-clamp-1 mb-2">
                              {city.tagline}
                            </p>

                            <p className="text-[11px] text-neutral-400 line-clamp-2">
                              {city.description}
                            </p>
                          </div>

                          {/* Bottom Meta */}
                          <div className="pt-3 mt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                            <span className="flex items-center gap-1 text-neutral-300">
                              <Building2 className="w-3 h-3 text-neutral-300" />
                              <span>{barsInCity.length} Partner Bars</span>
                            </span>

                            <span className="flex items-center gap-1 text-neutral-200">
                              <Radio className="w-3 h-3" />
                              <span>{totalFeeds} Live Cams</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expansion Cities / Unpartnered City Search Results */}
              {citySearchQuery.trim() && (
                <div className="pt-2 border-t border-neutral-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">
                    <span>Expansion Pipeline & Partner Onboarding</span>
                    <span className="text-neutral-300 text-[11px] normal-case font-sans">
                      Request Bar Tap in new cities
                    </span>
                  </div>

                  {matchingExpansionCities.length > 0 ? (
                    <div className="space-y-2">
                      {matchingExpansionCities.map((expCity) => {
                        const nearest = userCoords
                          ? findNearestCity(expCity.lat, expCity.lng)
                          : findNearestCity(expCity.lat, expCity.lng);
                        const isRequested = requestedExpansionCities[expCity.name.toLowerCase()];

                        return (
                          <div
                            key={expCity.name}
                            className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">
                                  {expCity.displayName}
                                </h4>
                                <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 text-[10px] font-mono">
                                  Expansion Queue
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                Nearest active market:{' '}
                                <strong className="text-neutral-200">{nearest.city.displayName}</strong>{' '}
                                ({Math.round(nearest.distanceMiles)} mi away)
                              </p>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => {
                                  onSelectCity(nearest.city.name);
                                  setIsOpen(false);
                                  setCitySearchQuery('');
                                }}
                                className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                View {nearest.city.name}
                              </button>

                              <button
                                onClick={() => handleRequestExpansion(expCity.name)}
                                disabled={isRequested}
                                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                  isRequested
                                    ? 'bg-neutral-800 text-neutral-200 border border-neutral-600'
                                    : 'bg-copper hover:bg-tan text-ink shadow-sm'
                                }`}
                              >
                                {isRequested ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-neutral-200" />
                                    <span>Requested!</span>
                                  </>
                                ) : (
                                  <>
                                    <ThumbsUp className="w-3.5 h-3.5 text-neutral-950" />
                                    <span>Request Partners</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : filteredCities.length === 0 ? (
                    // Generic city requested with no direct match in expansion list either
                    <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 text-neutral-200 flex items-center justify-center mx-auto">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        No subscribed Bar Tap venues in &ldquo;{citySearchQuery}&rdquo; yet
                      </h4>
                      <p className="text-xs text-neutral-400 max-w-md mx-auto">
                        Bar Tap partners directly with nightlife venues to install cloud camera relays.
                        Would you like us to prioritize launching in {citySearchQuery}?
                      </p>

                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                        <button
                          onClick={() => handleRequestExpansion(citySearchQuery)}
                          disabled={requestedExpansionCities[citySearchQuery.toLowerCase()]}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                            requestedExpansionCities[citySearchQuery.toLowerCase()]
                              ? 'bg-neutral-800 text-neutral-200 border border-neutral-600'
                              : 'bg-copper hover:bg-tan text-ink shadow-sm'
                          }`}
                        >
                          {requestedExpansionCities[citySearchQuery.toLowerCase()] ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Request Submitted!</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Request Bar Tap Launch in &ldquo;{citySearchQuery}&rdquo;</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setCitySearchQuery('');
                            setActiveRegionFilter('all');
                          }}
                          className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer"
                        >
                          Browse Active Cities
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Footer / Partner Network Note */}
            <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tan" />
                <span>
                  Active Market: <strong className="text-neutral-200">{activeCityMeta.displayName}</strong> ({activeCityMeta.relayPoP})
                </span>
              </div>

              <div className="flex items-center gap-3">
                {onOpenRelayNetwork && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onOpenRelayNetwork();
                    }}
                    className="text-neutral-200 hover:underline cursor-pointer font-medium"
                  >
                    View Camera Network Specs →
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
