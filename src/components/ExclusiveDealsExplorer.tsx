import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Crown,
  ExternalLink,
  Lock,
  QrCode,
  Radio,
  Sparkles,
  Tag,
} from 'lucide-react';
import { BarLocation, ExclusiveDeal } from '../types.ts';
import { ALL_EXCLUSIVE_DEALS } from '../data/exclusiveDeals.ts';

interface ExclusiveDealsExplorerProps {
  isPremium: boolean;
  onOpenPremiumModal: () => void;
  onOpenBarProfile: (bar: BarLocation) => void;
  onOpenLiveStream: (bar: BarLocation) => void;
  bars: BarLocation[];
  currentCity?: string;
}

export const ExclusiveDealsExplorer: React.FC<ExclusiveDealsExplorerProps> = ({
  isPremium,
  onOpenPremiumModal,
  onOpenBarProfile,
  onOpenLiveStream,
  bars,
  currentCity,
}) => {
  const [activeVoucher, setActiveVoucher] = useState<ExclusiveDeal | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const cityScopedDeals = currentCity
    ? ALL_EXCLUSIVE_DEALS.filter(
        (d) => !d.city || d.city.toLowerCase() === currentCity.toLowerCase()
      )
    : ALL_EXCLUSIVE_DEALS;

  const dealsList = cityScopedDeals.length > 0 ? cityScopedDeals : ALL_EXCLUSIVE_DEALS;

  const filteredDeals = dealsList.filter((d) => {
    if (selectedCategory === 'all') return true;
    return d.category === selectedCategory;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getBarForDeal = (barId: string) => {
    return bars.find((b) => b.id === barId);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800/80 border border-neutral-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="max-w-2xl min-w-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-200 mb-2">
            <Crown className="w-4 h-4 fill-neutral-200" />
            VIP Member Exclusives · Free ($0/mo) Tier
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            App-Exclusive Vendor & Venue Deals
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed">
            Partnered with {currentCity || 'local'}'s top breweries, rooftop cocktail bars, and nightlife staples to offer VIP subscribers line skips, BOGO craft draughts, free perks, and food specials.
          </p>
        </div>

        {!isPremium ? (
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-700 shrink-0 text-center space-y-2">
            <div className="text-xs font-mono text-neutral-300 font-semibold">
              FREE VIP TIER
            </div>
            <div className="text-2xl font-black text-white">$0.00/mo</div>
            <button
              onClick={onOpenPremiumModal}
              className="w-full px-5 py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs rounded-xl transition shadow-lg shadow-black/30 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 fill-neutral-950" />
              <span>Activate Free VIP</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-neutral-800/80 border border-neutral-700 shrink-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-700 text-white flex items-center justify-center border border-neutral-600">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 fill-neutral-200 text-neutral-200" />
                VIP Member Active
              </div>
              <div className="text-[11px] text-neutral-400">All vouchers ready for redemption</div>
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Deals' },
          { id: 'drink', label: 'BOGO & Drink Deals' },
          { id: 'entry', label: 'Line Skips & Cover Credits' },
          { id: 'food', label: 'Complimentary Food & Appetizers' },
          { id: 'perk', label: 'Bowling & Activities' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-neutral-100 text-neutral-950 shadow-md font-bold'
                : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
        {filteredDeals.map((deal) => {
          const associatedBar = getBarForDeal(deal.barId);
          return (
            <div
              key={deal.id}
              className="bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-2xl p-5 flex flex-col justify-between space-y-4 group transition"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block">
                      {deal.sponsorType} · {deal.neighborhood}
                    </span>
                    <h4
                      onClick={() => associatedBar && onOpenBarProfile(associatedBar)}
                      className="text-xs font-bold text-neutral-300 hover:text-white cursor-pointer mt-0.5"
                    >
                      {deal.barName}
                    </h4>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-100 font-mono text-xs font-bold shrink-0">
                    {deal.savingsValue}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-neutral-200 transition-colors">
                  {deal.title}
                </h3>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  {deal.offerDetails}
                </p>

                <div className="mt-3 text-[11px] text-neutral-500 leading-snug">
                  <strong>Terms: </strong>
                  {deal.terms}
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                {isPremium ? (
                  <button
                    onClick={() => setActiveVoucher(deal)}
                    className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs rounded-xl transition shadow-md shadow-black/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Redeem Voucher</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenPremiumModal}
                    className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock with Free VIP</span>
                  </button>
                )}

                {associatedBar && (
                  <button
                    onClick={() => onOpenLiveStream(associatedBar)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition cursor-pointer text-xs flex items-center gap-1"
                    title={`Watch ${associatedBar.name} live cam`}
                  >
                    <Radio className="w-3.5 h-3.5 text-red-500" />
                    <span className="hidden sm:inline">Live</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Voucher Redemption Modal */}
      {activeVoucher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveVoucher(null)}
        >
          <div
            className="relative w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl p-6 text-center text-neutral-100 space-y-4 max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-950 flex items-center justify-center mx-auto font-black shadow-lg shadow-black/30">
              <Crown className="w-6 h-6 fill-neutral-950" />
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-neutral-300 font-mono font-semibold">
                Official Bar Tap VIP Pass Voucher
              </div>
              <h3 className="text-xl font-bold text-white mt-1">{activeVoucher.barName}</h3>
              <p className="text-xs text-neutral-300 mt-1">{activeVoucher.title}</p>
            </div>

            {/* Voucher Code Box */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
                Present this code to your bartender or server
              </span>
              <div className="text-xl font-mono font-black text-white tracking-wider">
                {activeVoucher.voucherCode}
              </div>
              <button
                onClick={() => handleCopyCode(activeVoucher.voucherCode)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs transition cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 leading-snug">
              Single-use per VIP member. Show screen at {activeVoucher.barName} before tab checkout.
            </p>

            <button
              onClick={() => setActiveVoucher(null)}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
