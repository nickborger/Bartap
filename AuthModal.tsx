import React, { useState } from 'react';
import {
  Beer,
  Clock,
  ExternalLink,
  Flame,
  GlassWater,
  MapPin,
  Radio,
  Sparkles,
  Wine,
} from 'lucide-react';
import { BarLocation, DrinkSpecial } from '../types.ts';
import { TapInButton } from './TapInButton.tsx';

interface DrinkSpecialsExplorerProps {
  bars: BarLocation[];
  onOpenBarProfile: (bar: BarLocation) => void;
  onOpenLiveStream: (bar: BarLocation) => void;
  tappedInBars: Record<string, boolean>;
  onToggleTapIn: (barId: string) => void;
  currentCity?: string;
}

export const DrinkSpecialsExplorer: React.FC<DrinkSpecialsExplorerProps> = ({
  bars,
  onOpenBarProfile,
  onOpenLiveStream,
  tappedInBars,
  onToggleTapIn,
  currentCity = 'Tallahassee',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');

  // Flatten all drink specials with bar association
  const allSpecials = bars.flatMap((b) =>
    b.drinkSpecials.map((s) => ({
      ...s,
      bar: b,
    }))
  );

  const filteredSpecials = allSpecials.filter((item) => {
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'happy_hour' && !item.isHappyHour && item.category !== 'happy_hour') {
        return false;
      }
      if (selectedCategory !== 'happy_hour' && item.category !== selectedCategory) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Intro Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
            <Sparkles className="w-4 h-4" />
            <span>{currentCity} Partner Drink Board</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Drink Specials & Happy Hours
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Browse current draft deals, signature cocktails, pitcher specials, and happy hours across {currentCity}’s partner bars. Tap In to verify crowd lines before heading out!
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-neutral-950/70 border border-neutral-800 rounded-2xl shrink-0">
          <Clock className="w-5 h-5 text-neutral-300" />
          <div className="text-xs">
            <div className="text-neutral-400 font-medium">{currentCity} Partners</div>
            <div className="text-white font-bold">{filteredSpecials.length} Active Specials</div>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', label: 'All Specials' },
          { id: 'happy_hour', label: 'Happy Hour Specials' },
          { id: 'cocktail', label: 'Signature Cocktails' },
          { id: 'beer', label: 'Drafts & Pitchers' },
          { id: 'shots', label: 'Shots & Wells' },
          { id: 'package', label: 'Wristbands & Free Food' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-copper text-ink shadow-md font-bold'
                : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Specials Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {filteredSpecials.map((spec) => {
          const isTapped = !!tappedInBars[spec.bar.id];
          return (
            <div
              key={`${spec.bar.id}-${spec.id}`}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 hover:border-neutral-700 transition flex flex-col justify-between space-y-4 group min-w-0"
            >
              <div className="min-w-0">
                {/* Bar Header */}
                <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                  <div
                    onClick={() => onOpenBarProfile(spec.bar)}
                    className="flex items-center gap-2 cursor-pointer group-hover:text-neutral-200 transition-colors min-w-0"
                  >
                    <span className="text-xs font-bold text-white group-hover:text-neutral-200 truncate">
                      {spec.bar.name}
                    </span>
                    <span className="text-[11px] text-neutral-500 shrink-0">·</span>
                    <span className="text-[11px] text-neutral-400 truncate">{spec.bar.neighborhood}</span>
                  </div>

                  {spec.price && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-100 font-mono text-xs font-bold tabular-nums">
                      {spec.price}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-neutral-200 transition-colors">
                  {spec.title}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{spec.description}</p>
                <div className="mt-2 text-[11px] text-neutral-400 font-medium">Valid: {spec.day}</div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                <TapInButton
                  onTapIn={() => onToggleTapIn(spec.bar.id)}
                  isTappedIn={isTapped}
                  tappedInCount={spec.bar.tappedInCount + (isTapped ? 1 : 0)}
                  size="sm"
                  variant="primary"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenLiveStream(spec.bar)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition text-xs flex items-center gap-1 cursor-pointer"
                    title="Watch live cam feed"
                  >
                    <Radio className="w-3.5 h-3.5 text-red-400" />
                    <span>Cam</span>
                  </button>

                  <a
                    href={spec.bar.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition text-xs flex items-center gap-1 cursor-pointer"
                    title={`Go to ${spec.bar.name} website`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
