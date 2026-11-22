import React, { useState } from 'react';
import {
  Camera,
  Check,
  Crown,
  ShieldCheck,
  X,
} from 'lucide-react';
import { UserProfile } from '../types.ts';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onActivateVip: () => void;
  onOpenAuth: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onActivateVip,
  onOpenAuth,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleActivate = () => {
    if (!currentUser) {
      onClose();
      onOpenAuth();
      return;
    }

    if (currentUser.isPremium) {
      onClose();
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
      onActivateVip();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1400);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-neutral-100 max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Close VIP Tier Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-copper text-ink rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-black/40 animate-bounce">
              <Crown className="w-9 h-9 fill-neutral-950" />
            </div>
            <h2 className="text-2xl font-black text-white">Free VIP Tier Activated!</h2>
            <p className="text-sm text-neutral-300 max-w-sm mx-auto leading-relaxed">
              Your Bar Tap VIP account tier is active for $0.00 forever. Enjoy continuous 24/7 live video feeds and exclusive venue perks!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-bold uppercase tracking-wider mb-2">
                <Crown className="w-3.5 h-3.5 fill-tan" />
                Complimentary VIP Account Tier
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Unlock 24/7 Live Video Feeds
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 leading-relaxed">
                Experience real-time live video feeds from all partner bars. The basic tier shows still photos updated every 5 minutes—activate our completely free VIP tier for live motion video and venue deals!
              </p>
            </div>

            {/* Free VIP Tier Box */}
            <div className="bg-gradient-to-r from-neutral-950 via-neutral-950 to-neutral-900 border border-neutral-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-neutral-300 font-bold uppercase tracking-wider block">
                  VIP Membership Tier
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                    $0.00
                  </span>
                  <span className="text-xs text-neutral-300 font-mono font-semibold">
                    / month · Free Forever
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" />
                  <span>No subscription fee · Instant 1-click VIP unlock</span>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="inline-block px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-mono font-bold">
                  100% Free VIP Access
                </span>
              </div>
            </div>

            {/* Comparison Matrix: Basic vs. Free VIP */}
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold block">
                Basic Tier vs. Free VIP Access
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Basic Tier */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
                  <div className="font-bold text-neutral-400 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Basic Tier</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-neutral-400">
                    <li className="flex items-center gap-1 text-neutral-300">
                      <span>• Still pictures only</span>
                    </li>
                    <li className="flex items-center gap-1 text-neutral-400">
                      <span>• Refreshed every 5 minutes</span>
                    </li>
                    <li className="flex items-center gap-1 text-neutral-400">
                      <span>• No live video streaming</span>
                    </li>
                    <li className="flex items-center gap-1 text-neutral-400">
                      <span>• Standard drink specials</span>
                    </li>
                  </ul>
                </div>

                {/* VIP Access */}
                <div className="p-3.5 rounded-xl bg-neutral-800/70 border border-neutral-600 space-y-2">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 fill-tan" />
                    <span>VIP Member (Free)</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-neutral-200">
                    <li className="flex items-center gap-1 text-neutral-100 font-semibold">
                      <Check className="w-3 h-3 shrink-0" />
                      <span>24/7 Live Video Feeds</span>
                    </li>
                    <li className="flex items-center gap-1 text-neutral-100 font-semibold">
                      <Check className="w-3 h-3 shrink-0" />
                      <span>Zero delay CCTV motion</span>
                    </li>
                    <li className="flex items-center gap-1 text-neutral-100 font-semibold">
                      <Check className="w-3 h-3 shrink-0" />
                      <span>Exclusive venue vouchers</span>
                    </li>
                    <li className="flex items-center gap-1 text-neutral-100 font-semibold">
                      <Check className="w-3 h-3 shrink-0" />
                      <span>Crowd heatmaps & audio</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-1">
              <button
                onClick={handleActivate}
                disabled={isProcessing}
                className="w-full py-3.5 bg-copper hover:bg-tan disabled:opacity-50 text-ink font-black text-sm rounded-xl shadow-xl shadow-black/30 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 fill-neutral-950" />
                <span>
                  {isProcessing
                    ? 'Activating Free VIP Tier...'
                    : currentUser?.isPremium
                    ? 'Free VIP Tier Active ($0.00/mo)'
                    : 'Activate Free VIP Tier ($0.00)'}
                </span>
              </button>

              <div className="text-[11px] text-center text-neutral-500 mt-2 flex items-center justify-center gap-3">
                <span>$0.00 / month</span>
                <span>·</span>
                <span>No credit card needed</span>
                <span>·</span>
                <span>Free forever</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
