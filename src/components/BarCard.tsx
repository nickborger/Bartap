import React, { useState } from 'react';
import {
  Camera,
  Clock,
  Crown,
  ExternalLink,
  Eye,
  Flame,
  Globe,
  Heart,
  MapPin,
  Radio,
  RefreshCw,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { BarLocation } from '../types.ts';
import { TapInButton } from './TapInButton.tsx';

interface BarCardProps {
  bar: BarLocation;
  isTappedIn: boolean;
  isSaved: boolean;
  onTapIn: () => void;
  onToggleSave: () => void;
  onOpenProfile: () => void;
  onOpenLiveStream: () => void;
  hasExclusiveDeal?: boolean;
  isPremium?: boolean;
}

export const BarCard: React.FC<BarCardProps> = ({
  bar,
  isTappedIn,
  isSaved,
  onTapIn,
  onToggleSave,
  onOpenProfile,
  onOpenLiveStream,
  hasExclusiveDeal,
  isPremium = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const featuredSpecial = bar.drinkSpecials.find((s) => s.featured) || bar.drinkSpecials[0];

  const getCrowdColor = (density: number) => {
    if (density >= 85) return 'text-red-400 bg-red-500/15 border-red-500/30';
    if (density >= 65) return 'text-neutral-100 bg-neutral-900/90 border-neutral-600';
    return 'text-neutral-300 bg-neutral-900/80 border-neutral-700';
  };

  return (
    <div
      onClick={onOpenProfile}
      className="group relative bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/40 cursor-pointer flex flex-col"
    >
      {/* Visual Header / Live Video Cam Preview vs Still Photo */}
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
        {!imageError ? (
          <img
            src={bar.image}
            alt={`${bar.name} Tallahassee`}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-800/40 to-neutral-950 flex items-center justify-center p-4">
            <Radio className="w-12 h-12 text-neutral-500 animate-pulse" />
          </div>
        )}

        {/* Gradient Contrast Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-black/20 to-transparent pointer-events-none" />

        {/* Live Cam or Still Photo Indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          {isPremium ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600/90 text-white rounded-md text-[11px] font-bold tracking-wider uppercase backdrop-blur-sm shadow-sm animate-pulse">
              <Radio className="w-3 h-3" />
              LIVE FEED
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-neutral-950/90 text-neutral-200 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase backdrop-blur-sm border border-neutral-700">
              <Camera className="w-3 h-3 text-neutral-300" />
              PHOTO · UPDATES 5M
            </span>
          )}

          <span className="px-2 py-0.5 bg-black/70 text-neutral-200 rounded text-[11px] font-mono backdrop-blur-sm border border-white/10">
            {bar.cameras.length} Cam{bar.cameras.length > 1 ? 's' : ''}
          </span>

          <span
            className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/70 text-neutral-200 rounded text-[10px] font-mono backdrop-blur-sm border border-white/10"
            title={`Hardware cloud relayed via ${bar.cameras[0]?.cloudRelay?.edgeNode || 'TLH-Edge'}`}
          >
            <span className="w-1 h-1 rounded-full bg-neutral-300 animate-pulse" />
            <span>RELAY</span>
          </span>
        </div>

        {/* Top Right: Bookmark to My Bars & Crowd Density */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {/* Add to Personalized List Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            className={`p-2 rounded-lg backdrop-blur-md border transition cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center ${
              isSaved
                ? 'bg-neutral-100 text-neutral-950 border-white shadow-md'
                : 'bg-black/60 text-neutral-300 hover:text-white border-white/10 hover:bg-black/80'
            }`}
            title={isSaved ? 'Remove from My Bars' : 'Save to My Bars'}
            aria-label="Save to My Bars"
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-neutral-950' : ''}`} />
          </button>

          <span
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold backdrop-blur-md border ${getCrowdColor(
              bar.crowdDensity
            )}`}
          >
            {bar.crowdDensity}%
          </span>
        </div>

        {/* Quick Launch Overlay Button on Hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenLiveStream();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] cursor-pointer z-10"
          aria-label={isPremium ? `Watch live feed for ${bar.name}` : `View 5-min snapshot for ${bar.name}`}
        >
          <span className="px-4 py-2 bg-neutral-100 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
            {isPremium ? <Radio className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            {isPremium ? 'Tap In To Stream Live' : 'Tap In (5-Min Snapshot)'}
          </span>
        </button>

        {/* Bottom Image Sub-info */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 text-xs text-white z-10">
          <div className="flex items-center gap-1.5 drop-shadow font-semibold min-w-0">
            <span className="truncate">{bar.neighborhood}</span>
            <span className="text-neutral-400 shrink-0">·</span>
            <span className="text-neutral-300 font-normal shrink-0">{bar.city}</span>
          </div>
          <span className="text-[11px] text-neutral-300 font-mono drop-shadow shrink-0">
            {bar.estimatedWaitMinutes === 0 ? 'No door wait' : `${bar.estimatedWaitMinutes}m wait`}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4 min-w-0">
        <div className="min-w-0">
          {/* Partner Tier & Subscription Ribbon */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase border ${
                bar.partnerTier === 'Diamond Partner'
                  ? 'bg-neutral-800 text-white border-neutral-600'
                  : bar.partnerTier === 'Gold Partner'
                  ? 'bg-neutral-800/80 text-neutral-200 border-neutral-700'
                  : 'bg-neutral-950 text-neutral-300 border-neutral-800'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{bar.partnerTier || 'Subscribed Partner'}</span>
            </span>

            {/* Distance from User GPS */}
            {bar.distanceMiles !== undefined && bar.distanceMiles !== null && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium ${
                  bar.distanceMiles <= 2
                    ? 'text-neutral-100'
                    : bar.distanceMiles <= 15
                    ? 'text-neutral-300'
                    : 'text-neutral-400'
                }`}
                title={`Calculated real-time distance: ${bar.distanceMiles} miles from your position`}
              >
                <MapPin className="w-3 h-3 shrink-0" />
                <span>
                  {bar.distanceMiles < 0.1
                    ? 'Nearby (<0.1 mi)'
                    : `${bar.distanceMiles.toFixed(1)} mi`}
                </span>
              </span>
            )}
          </div>

          {/* Metadata Row */}
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-400 mb-1.5">
            <span className="text-neutral-300 font-medium">{bar.category}</span>
            <div className="flex items-center gap-1 text-neutral-200">
              <Star className="w-3.5 h-3.5 fill-neutral-200 text-neutral-200" />
              <span className="font-bold tabular-nums text-white">{bar.rating.toFixed(1)}</span>
              <span className="text-neutral-400">({bar.totalReviews})</span>
            </div>
          </div>

          {/* Bar Title & VIP Deal Tag */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <h3 className="text-lg font-bold text-white group-hover:text-neutral-200 transition-colors tracking-tight truncate">
              {bar.name}
            </h3>
            {hasExclusiveDeal && (
              <span className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 text-[10px] font-bold font-mono flex items-center gap-1 shrink-0">
                <Crown className="w-2.5 h-2.5 fill-neutral-200" />
                VIP DEAL
              </span>
            )}
          </div>

          <p className="text-xs text-neutral-400 line-clamp-1 mt-1">{bar.tagline}</p>

          {/* Featured Drink Special Highlight */}
          {featuredSpecial && (
            <div className="mt-3 p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 text-xs min-w-0">
              <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-200 font-semibold mb-0.5 min-w-0">
                <span className="flex items-center gap-1 min-w-0 truncate">
                  <Sparkles className="w-3 h-3 text-neutral-300 shrink-0" />
                  <span className="truncate">Special: {featuredSpecial.title}</span>
                </span>
                {featuredSpecial.price && (
                  <span className="font-mono text-white tabular-nums shrink-0">{featuredSpecial.price}</span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-1">
                {featuredSpecial.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions: Tap In Button & Direct Website Link */}
        <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
          {/* Official "Tap In" Button */}
          <TapInButton
            onTapIn={onTapIn}
            isTappedIn={isTappedIn}
            tappedInCount={bar.tappedInCount + (isTappedIn ? 1 : 0)}
            size="sm"
            variant="primary"
          />

          {/* Direct Link to Official Bar Website */}
          <a
            href={bar.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium border border-neutral-700/80 transition min-h-[36px]"
            title={`Visit ${bar.name} official website`}
          >
            <Globe className="w-3.5 h-3.5 text-neutral-300" />
            <span className="hidden xs:inline">Website</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
