import React, { useState } from 'react';
import {
  Camera,
  Crown,
  ExternalLink,
  Flame,
  Globe,
  Heart,
  MapPin,
  Music,
  Navigation,
  Phone,
  Radio,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  Users,
  X,
} from 'lucide-react';
import { BarLocation, CameraAngle, Review } from '../types.ts';
import { LiveCameraCanvas } from './LiveCameraCanvas.tsx';
import { TapInButton } from './TapInButton.tsx';
import { DrinkSpecialsSection } from './DrinkSpecialsSection.tsx';
import { RatingModal } from './RatingModal.tsx';
import { ALL_EXCLUSIVE_DEALS } from '../data/exclusiveDeals.ts';

interface BarProfileModalProps {
  bar: BarLocation;
  isOpen: boolean;
  onClose: () => void;
  isTappedIn: boolean;
  isSaved: boolean;
  onToggleTapIn: () => void;
  onToggleSave: () => void;
  onAddReview: (barId: string, review: Review) => void;
  isPremium: boolean;
  onOpenPremium: () => void;
  onOpenOwnerPortalForBar?: (barId: string) => void;
  onOpenRelayModal?: () => void;
}

export const BarProfileModal: React.FC<BarProfileModalProps> = ({
  bar,
  isOpen,
  onClose,
  isTappedIn,
  isSaved,
  onToggleTapIn,
  onToggleSave,
  onAddReview,
  isPremium,
  onOpenPremium,
  onOpenOwnerPortalForBar,
  onOpenRelayModal,
}) => {
  const [selectedCamera, setSelectedCamera] = useState<CameraAngle>(bar.cameras[0]);
  const [activeTab, setActiveTab] = useState<'stream' | 'specials' | 'reviews' | 'about'>('stream');
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isFullscreenStream, setIsFullscreenStream] = useState(false);
  const [helpfulReviews, setHelpfulReviews] = useState<Record<string, number>>({});

  const exclusiveDeal = ALL_EXCLUSIVE_DEALS.find((d) => d.barId === bar.id);

  if (!isOpen) return null;

  const handleHelpful = (reviewId: string) => {
    setHelpfulReviews((prev) => ({
      ...prev,
      [reviewId]: (prev[reviewId] || 0) + 1,
    }));
  };

  const getCleanDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] text-neutral-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 p-2 rounded-full bg-neutral-950/75 hover:bg-neutral-800 text-neutral-300 hover:text-white transition backdrop-blur-md border border-white/10 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            aria-label="Close Profile"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Single Smooth Scrollable Profile Wrapper */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
          {/* Top Live Camera Feed / Visual Header */}
          <div className="relative w-full bg-neutral-950">
            <LiveCameraCanvas
              barName={bar.name}
              camera={selectedCamera}
              baseImage={bar.image}
              isFullscreen={isFullscreenStream}
              onFullscreenToggle={() => setIsFullscreenStream(!isFullscreenStream)}
              isPremium={isPremium}
              onOpenTrial={onOpenPremium}
              onOpenRelayModal={onOpenRelayModal}
            />

            {/* Camera Angle Switcher Bar */}
            {bar.cameras.length > 1 && (
              <div className="px-4 py-2 bg-neutral-950 border-t border-neutral-800/80 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase text-neutral-400 shrink-0 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-neutral-300" />
                    Angles:
                  </span>
                  {bar.cameras.map((cam) => {
                    const isSelected = selectedCamera.id === cam.id;
                    return (
                      <button
                        key={cam.id}
                        onClick={() => setSelectedCamera(cam)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? 'bg-neutral-100 text-neutral-950 font-bold shadow-sm'
                            : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-neutral-950' : 'bg-red-500 animate-pulse'
                          }`}
                        />
                        {cam.name}
                      </button>
                    );
                  })}
                </div>

                {isPremium ? (
                  <span className="text-[11px] font-mono text-neutral-200 font-semibold px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 flex items-center gap-1 shrink-0">
                    <Crown className="w-3 h-3 fill-neutral-200" />
                    Unlimited 24/7 Live Feed
                  </span>
                ) : (
                  <button
                    onClick={onOpenPremium}
                    className="text-[11px] font-mono text-neutral-200 hover:text-white hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Free VIP Tier ($0/mo)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Profile Core Header */}
          <div className="p-5 sm:p-6 bg-neutral-900 border-b border-neutral-800/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono font-bold text-[10px] uppercase">
                    ✦ {bar.partnerTier || 'Subscribed Partner'}
                  </span>
                  <span className="text-neutral-200 font-semibold">{bar.neighborhood}</span>
                  <span>·</span>
                  <span>{bar.category}</span>
                  <span>·</span>
                  <span className="text-neutral-300 font-medium">
                    {bar.city}, {bar.state}
                  </span>
                  {bar.distanceMiles !== undefined && bar.distanceMiles !== null && (
                    <>
                      <span>·</span>
                      <span className="text-neutral-200 font-mono font-bold">
                        📍 {bar.distanceMiles < 0.1 ? 'Here now (<0.1 mi)' : `${bar.distanceMiles.toFixed(1)} mi from you`}
                      </span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {bar.name}
                </h1>
                <p className="text-sm text-neutral-400 mt-1">{bar.tagline}</p>
              </div>

              {/* Action Buttons: Tap In, Save to My Bars, & Direct Website Link */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Official Tap In Button */}
                <TapInButton
                  onTapIn={onToggleTapIn}
                  isTappedIn={isTappedIn}
                  tappedInCount={bar.tappedInCount + (isTappedIn ? 1 : 0)}
                  size="md"
                />

                {/* Add to Personalized List (My Bars) */}
                <button
                  onClick={onToggleSave}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border min-h-[44px] cursor-pointer ${
                    isSaved
                      ? 'bg-neutral-100 text-neutral-950 border-white shadow-md shadow-black/20 font-bold'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700'
                  }`}
                  title={isSaved ? 'In your personalized list' : 'Add to your personalized list'}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-neutral-950' : ''}`} />
                  <span>{isSaved ? 'Saved to My Bars' : 'Save Bar'}</span>
                </button>

                {/* Direct Link to Bar's Website */}
                <a
                  href={bar.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 hover:text-white border border-neutral-700/80 text-sm font-semibold transition shadow-sm min-h-[44px] cursor-pointer"
                  title={`Open official website: ${bar.websiteUrl}`}
                >
                  <Globe className="w-4 h-4 text-neutral-300" />
                  <span>Visit Bar Website</span>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                </a>

                {/* Bar Owner Management Suite Trigger */}
                {onOpenOwnerPortalForBar && (
                  <button
                    onClick={() => onOpenOwnerPortalForBar(bar.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition min-h-[44px] cursor-pointer"
                    title="Manage this venue's cameras, specials & hours"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Owner Controls</span>
                  </button>
                )}
              </div>
            </div>

            {/* VIP Deal Callout Banner if available */}
            {exclusiveDeal && (
              <div className="mt-4 p-3 rounded-2xl bg-neutral-800/70 border border-neutral-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Crown className="w-4 h-4 text-neutral-200 shrink-0" />
                  <div>
                    <span className="font-bold text-white">VIP Exclusive Offer: </span>
                    <span className="text-neutral-200">{exclusiveDeal.title}</span>
                    <span className="text-neutral-400"> ({exclusiveDeal.savingsValue})</span>
                  </div>
                </div>

                {!isPremium ? (
                  <button
                    onClick={onOpenPremium}
                    className="px-3 py-1 bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs rounded-lg transition shrink-0 cursor-pointer"
                  >
                    Unlock Free VIP
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-600 text-neutral-200 text-xs font-mono font-bold shrink-0">
                    VIP Voucher Active
                  </span>
                )}
              </div>
            )}

            {/* Quick Live Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-800/60">
              <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/60">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                  Crowd Density
                </div>
                <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <span className="tabular-nums text-neutral-100">{bar.crowdDensity}%</span>
                  <span className="text-xs font-normal text-neutral-400">({bar.currentVibe})</span>
                </div>
              </div>

              <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/60">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                  Estimated Door Wait
                </div>
                <div className="text-lg font-bold text-white mt-0.5 tabular-nums">
                  {bar.estimatedWaitMinutes === 0 ? (
                    <span className="text-neutral-200">No Wait</span>
                  ) : (
                    <span>{bar.estimatedWaitMinutes} mins</span>
                  )}
                </div>
              </div>

              <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/60">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                  Rating
                </div>
                <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-neutral-200 text-neutral-200" />
                  <span className="tabular-nums">{bar.rating.toFixed(1)}</span>
                  <span className="text-xs font-normal text-neutral-400">({bar.totalReviews})</span>
                </div>
              </div>

              <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/60">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                  Cover Charge
                </div>
                <div className="text-lg font-bold text-white mt-0.5 text-sm sm:text-base">
                  {bar.coverCharge}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="px-5 sm:px-6 border-b border-neutral-800 flex items-center gap-2 overflow-x-auto scrollbar-none bg-neutral-900/60">
            {[
              { id: 'stream', label: 'Live Stream Info' },
              { id: 'specials', label: 'Drink Specials' },
              { id: 'reviews', label: `Reviews (${bar.reviews.length})` },
              { id: 'about', label: 'Venue & Directions' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-white text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Modal Tab Body */}
          <div className="p-4 sm:p-6 space-y-5">
            {/* TAB: STREAM INFO */}
            {activeTab === 'stream' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-neutral-300 font-semibold">
                      Live Entertainment
                    </div>
                    <div className="text-base font-bold text-white mt-1 flex items-center gap-2">
                      <Music className="w-4 h-4 text-neutral-300" />
                      {bar.currentDJsBand || 'Resident DJ & Curated Sound'}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Tonight in Tallahassee · Stream audio enabled
                    </div>
                  </div>

                  <button
                    onClick={() => setIsRatingModalOpen(true)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold rounded-xl text-xs border border-neutral-700 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                  >
                    <Star className="w-3.5 h-3.5 fill-neutral-200 text-neutral-200" />
                    Rate Live Vibe
                  </button>
                </div>

                {/* Drink Specials Preview */}
                <DrinkSpecialsSection specials={bar.drinkSpecials} isCompact={true} />
              </div>
            )}

            {/* TAB: DRINK SPECIALS */}
            {activeTab === 'specials' && (
              <DrinkSpecialsSection specials={bar.drinkSpecials} barName={bar.name} />
            )}

            {/* TAB: REVIEWS & RATINGS */}
            {activeTab === 'reviews' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Star className="w-5 h-5 fill-neutral-200 text-neutral-200" />
                      {bar.rating.toFixed(1)} Out of 5.0 Rating
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Based on {bar.totalReviews} verified Tallahassee patron check-ins & reviews
                    </p>
                  </div>

                  <button
                    onClick={() => setIsRatingModalOpen(true)}
                    className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs rounded-xl transition shadow-md shadow-black/20 active:scale-[0.98] cursor-pointer"
                  >
                    Write a Review
                  </button>
                </div>

                {/* Reviews List */}
                <div className="space-y-3">
                  {bar.reviews.map((rev) => {
                    const extraHelpful = helpfulReviews[rev.id] || 0;
                    return (
                      <div
                        key={rev.id}
                        className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-200 font-bold text-xs flex items-center justify-center border border-neutral-700">
                              {rev.author.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">{rev.author}</div>
                              <div className="text-[11px] text-neutral-400">{rev.date}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-neutral-200 font-mono text-sm font-bold">
                            <Star className="w-4 h-4 fill-neutral-200 text-neutral-200" />
                            <span>{rev.rating}.0</span>
                          </div>
                        </div>

                        {rev.tags && rev.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {rev.tags.map((t) => (
                              <span
                                key={t}
                                className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-900 text-neutral-300 border border-neutral-800"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-sm text-neutral-300 leading-relaxed">{rev.comment}</p>

                        <div className="flex items-center justify-between pt-1 text-xs text-neutral-400">
                          <div className="flex items-center gap-3 text-[11px] font-mono">
                            <span>Vibe: {rev.vibeScore}★</span>
                            <span>Drinks: {rev.valueScore}★</span>
                            <span>Music: {rev.musicScore}★</span>
                          </div>

                          <button
                            onClick={() => handleHelpful(rev.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition cursor-pointer"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Helpful ({rev.helpfulCount + extraHelpful})</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: ABOUT & LOCATION */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                    <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                      Location & Contact
                    </div>
                    <div className="flex items-start gap-2.5 text-sm text-neutral-200">
                      <MapPin className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                      <div>
                        <div>{bar.address}</div>
                        <div className="text-neutral-400">
                          {bar.city}, {bar.state} {bar.zip} ({bar.neighborhood})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-neutral-200 pt-1">
                      <Phone className="w-4 h-4 text-neutral-300 shrink-0" />
                      <span>{bar.phone}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                    <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                      Today's Operating Hours
                    </div>
                    <div className="text-sm font-semibold text-white">{bar.hoursToday}</div>
                    <div className="text-xs text-neutral-400">
                      Peak hours: 10:30 PM – 1:30 AM
                    </div>
                    <div className="pt-1">
                      <a
                        href={bar.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-neutral-200 hover:text-white hover:underline font-medium"
                      >
                        Visit {getCleanDomain(bar.websiteUrl)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Features & Highlights */}
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-2.5">
                  <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                    Venue Highlights
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bar.features.map((feat) => (
                      <span
                        key={feat}
                        className="px-3 py-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-medium flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" />
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Review & Rating Modal */}
      <RatingModal
        barId={bar.id}
        barName={bar.name}
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        onSubmitReview={(rev) => onAddReview(bar.id, rev)}
      />
    </>
  );
};
