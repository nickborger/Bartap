import React, { useState, useEffect } from 'react';
import { Beer, Clock, Flame, GlassWater, Sparkles, Tag, Wine } from 'lucide-react';
import { DrinkSpecial } from '../types.ts';

interface DrinkSpecialsSectionProps {
  specials: DrinkSpecial[];
  barName?: string;
  isCompact?: boolean;
}

export const DrinkSpecialsSection: React.FC<DrinkSpecialsSectionProps> = ({
  specials,
  barName,
  isCompact = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'happy_hour' | 'beer' | 'cocktail' | 'shots'>('all');
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Calculate happy hour countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMin = currentHours * 60 + currentMinutes;

      // Default happy hour 4:00 PM (16:00) to 7:00 PM (19:00)
      const hhStart = 16 * 60;
      const hhEnd = 19 * 60;

      if (currentTotalMin >= hhStart && currentTotalMin < hhEnd) {
        const remaining = hhEnd - currentTotalMin;
        const h = Math.floor(remaining / 60);
        const m = remaining % 60;
        setTimeLeft(`Active now · ${h > 0 ? `${h}h ` : ''}${m}m left`);
      } else if (currentTotalMin < hhStart) {
        const until = hhStart - currentTotalMin;
        const h = Math.floor(until / 60);
        const m = until % 60;
        setTimeLeft(`Starts in ${h > 0 ? `${h}h ` : ''}${m}m (4 PM)`);
      } else {
        setTimeLeft('Tonight’s Late Night Specials Active');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredSpecials = specials.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'happy_hour') return s.isHappyHour || s.category === 'happy_hour';
    return s.category === filter;
  });

  const getCategoryIcon = (cat: DrinkSpecial['category']) => {
    switch (cat) {
      case 'beer':
        return <Beer className="w-4 h-4 text-neutral-300" />;
      case 'cocktail':
        return <GlassWater className="w-4 h-4 text-neutral-300" />;
      case 'happy_hour':
        return <Clock className="w-4 h-4 text-neutral-300" />;
      case 'shots':
        return <Flame className="w-4 h-4 text-neutral-300" />;
      default:
        return <Wine className="w-4 h-4 text-neutral-300" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Happy Hour Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neutral-300" />
            Drink Specials & Pours
          </h3>
          {barName && <p className="text-xs text-neutral-400 mt-0.5">Today at {barName}</p>}
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200">
          <Clock className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
          <span className="tabular-nums">{timeLeft}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      {!isCompact && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { key: 'all', label: 'All Specials' },
              { key: 'happy_hour', label: 'Happy Hour' },
              { key: 'cocktail', label: 'Cocktails' },
              { key: 'beer', label: 'Draft Beer' },
              { key: 'shots', label: 'Shots & Wells' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
                filter === tab.key
                  ? 'bg-neutral-100 text-neutral-950 font-semibold shadow-sm'
                  : 'bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Specials Grid */}
      <div className={`grid gap-3 ${isCompact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {filteredSpecials.map((spec) => (
          <div
            key={spec.id}
            className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800">
                    {getCategoryIcon(spec.category)}
                  </div>
                  <span className="text-xs font-medium text-neutral-400">{spec.day}</span>
                </div>
                {spec.price && (
                  <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-100 text-xs font-mono font-bold tabular-nums">
                    {spec.price}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-white group-hover:text-neutral-200 transition-colors">
                {spec.title}
              </h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                {spec.description}
              </p>
            </div>

            {spec.isHappyHour && (
              <div className="mt-3 pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-300 font-mono">
                <span>HAPPY HOUR SPECIAL</span>
                <span>{spec.happyHourStart} - {spec.happyHourEnd}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
