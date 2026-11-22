import React, { useMemo } from 'react';
import {
  ArrowRight,
  Filter,
  Flame,
  Globe,
  MapPin,
  Radio,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import {
  SUPPORTED_CITIES,
  searchSupportedCities,
  searchExpansionCities,
} from '../utils/geolocation.ts';

interface NeighborhoodFilterProps {
  cityName: string;
  selectedNeighborhood: string;
  onSelectNeighborhood: (neighborhood: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'popular' | 'rating' | 'crowd' | 'wait' | 'distance';
  onSortChange: (sort: 'popular' | 'rating' | 'crowd' | 'wait' | 'distance') => void;
  filterHappyHourOnly: boolean;
  onToggleHappyHour: () => void;
  filterNoCoverOnly: boolean;
  onToggleNoCover: () => void;
  neighborhoodCounts: Record<string, number>;
  availableNeighborhoods: string[];
  hasUserLocation?: boolean;
  onSelectCity?: (cityName: string) => void;
  onOpenCityModal?: () => void;
}

export const NeighborhoodFilter: React.FC<NeighborhoodFilterProps> = ({
  cityName,
  selectedNeighborhood,
  onSelectNeighborhood,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterHappyHourOnly,
  onToggleHappyHour,
  filterNoCoverOnly,
  onToggleNoCover,
  neighborhoodCounts,
  availableNeighborhoods,
  hasUserLocation = false,
  onSelectCity,
  onOpenCityModal,
}) => {
  const allLabel = `All ${cityName}`;
  const neighborhoodsList = [allLabel, ...availableNeighborhoods];

  // Check if current search query matches another supported partner city
  const matchedOtherCities = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    const matched = searchSupportedCities(searchQuery);
    return matched.filter((c) => c.name.toLowerCase() !== cityName.toLowerCase());
  }, [searchQuery, cityName]);

  // Check if current search matches an expansion city
  const matchedExpansionCities = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    return searchExpansionCities(searchQuery);
  }, [searchQuery]);

  return (
    <div className="space-y-3">
      {/* Search and Sort Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input with City / Bar auto-detection */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search city, bar name, district, or drink specials (e.g. "${cityName}", "Austin", "Tiki", "Happy Hour")...`}
            className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-copper text-sm shadow-inner"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="text-xs text-neutral-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
              >
                Clear
              </button>
            )}

            {onOpenCityModal && (
              <button
                type="button"
                onClick={onOpenCityModal}
                className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-[11px] font-semibold flex items-center gap-1 border border-neutral-700 cursor-pointer"
                title="Search All Partner Cities"
              >
                <Globe className="w-3 h-3" />
                <span className="hidden sm:inline">Cities</span>
              </button>
            )}
          </div>
        </div>

        {/* Sort and Quick Filter Toggles */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={onToggleHappyHour}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterHappyHourOnly
                ? 'bg-copper text-ink shadow-sm font-bold'
                : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${filterHappyHourOnly ? 'text-neutral-950' : 'text-neutral-300'}`} />
            <span>Happy Hour Active</span>
          </button>

          <button
            onClick={onToggleNoCover}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              filterNoCoverOnly
                ? 'bg-copper text-ink shadow-sm font-bold'
                : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
            }`}
          >
            <span>No Cover Only</span>
          </button>

          {/* Sort selector */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as typeof sortBy)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-medium focus:outline-none focus:border-copper cursor-pointer"
            >
              {hasUserLocation && <option value="distance">📍 Nearest First (GPS)</option>}
              <option value="popular">Most Tapped In</option>
              <option value="rating">Highest Rated</option>
              <option value="crowd">Most Packed</option>
              <option value="wait">Shortest Door Wait</option>
            </select>
            <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Instant City Match Banner if user searched a different partnered city */}
      {matchedOtherCities.length > 0 && onSelectCity && (
        <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 text-neutral-200 flex items-center justify-center shrink-0 border border-neutral-700">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Looking for partner bars in {matchedOtherCities[0].displayName}?</span>
                <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-200 text-[10px] font-mono border border-neutral-700">
                  Partner City Active
                </span>
              </div>
              <p className="text-[11px] text-neutral-300">
                Bar Tap has subscribed venues streaming live camera feeds in {matchedOtherCities[0].name}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                onSelectCity(matchedOtherCities[0].name);
                onSearchChange('');
              }}
              className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-copper hover:bg-tan text-ink text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap"
            >
              <span>Switch to {matchedOtherCities[0].name} Bars</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* If searched for an expansion city (e.g. Atlanta, Chicago, Dallas) */}
      {matchedOtherCities.length === 0 && matchedExpansionCities.length > 0 && onOpenCityModal && (
        <div className="p-3 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-neutral-300 shrink-0" />
            <div className="text-xs text-neutral-300">
              <strong>{matchedExpansionCities[0].displayName}</strong> is in our Bar Tap partner expansion pipeline.
            </div>
          </div>

          <button
            onClick={onOpenCityModal}
            className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            Request Launch in {matchedExpansionCities[0].name} →
          </button>
        </div>
      )}

      {/* Dynamic City Neighborhood Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {neighborhoodsList.map((hood) => {
          const isSelected = selectedNeighborhood === hood;
          const count = hood === allLabel ? neighborhoodCounts['all'] : neighborhoodCounts[hood] || 0;
          return (
            <button
              key={hood}
              onClick={() => onSelectNeighborhood(hood)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 shrink-0 ${
                isSelected
                  ? 'bg-copper text-ink shadow-sm font-bold'
                  : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              <MapPin className={`w-3 h-3 ${isSelected ? 'text-neutral-950' : 'text-neutral-400'}`} />
              <span>{hood}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isSelected ? 'bg-tan text-neutral-900' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
