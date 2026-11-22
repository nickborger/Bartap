import React from 'react';
import {
  Heart,
  Plus,
  Radio,
  Sparkles,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { BarLocation, UserProfile } from '../types.ts';
import { BarCard } from './BarCard.tsx';

interface MyBarsViewProps {
  bars: BarLocation[];
  savedBarIds: string[];
  tappedInBars: Record<string, boolean>;
  onToggleSave: (barId: string) => void;
  onToggleTapIn: (barId: string) => void;
  onOpenProfile: (bar: BarLocation) => void;
  onOpenLiveStream: (bar: BarLocation) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  isPremium?: boolean;
}

export const MyBarsView: React.FC<MyBarsViewProps> = ({
  bars,
  savedBarIds,
  tappedInBars,
  onToggleSave,
  onToggleTapIn,
  onOpenProfile,
  onOpenLiveStream,
  currentUser,
  onOpenAuth,
  isPremium = false,
}) => {
  const savedBars = bars.filter((b) => savedBarIds.includes(b.id));

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
            <Heart className="w-4 h-4 fill-tan text-neutral-200" />
            Personalized Nightlife Feed
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Tallahassee Bars ({savedBars.length})
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-2 max-w-2xl leading-relaxed">
            Your customized bar dashboard. Monitor live door wait times, active drink specials, and camera feeds for your favorite Tallahassee spots.
          </p>
        </div>

        {!currentUser && (
          <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl shrink-0 text-right space-y-1">
            <span className="text-[11px] text-neutral-400 block">Personal list saved locally</span>
            <button
              onClick={onOpenAuth}
              className="text-xs text-neutral-200 hover:text-white hover:underline font-semibold cursor-pointer"
            >
              Sign In to sync across devices →
            </button>
          </div>
        )}
      </div>

      {savedBars.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {savedBars.map((bar) => (
            <BarCard
              key={bar.id}
              bar={bar}
              isTappedIn={!!tappedInBars[bar.id]}
              isSaved={true}
              onTapIn={() => onToggleTapIn(bar.id)}
              onToggleSave={() => onToggleSave(bar.id)}
              onOpenProfile={() => onOpenProfile(bar)}
              onOpenLiveStream={() => onOpenLiveStream(bar)}
              isPremium={isPremium}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800 p-8 space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-neutral-800 text-neutral-200 flex items-center justify-center mx-auto border border-neutral-700">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">Your personalized list is empty</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Tap the heart icon on any Tallahassee bar card or profile to add them here for quick live camera tracking and crowd alerts.
          </p>

          <div className="pt-2">
            <span className="text-xs font-semibold text-neutral-300 block mb-2">
              Popular spots to add:
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              {bars.slice(0, 4).map((x) => x.id).map(
                (barId) => {
                  const b = bars.find((x) => x.id === barId);
                  if (!b) return null;
                  return (
                    <button
                      key={barId}
                      onClick={() => onToggleSave(barId)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 hover:text-white border border-neutral-700 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-neutral-300" />
                      <span>{b.name}</span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
