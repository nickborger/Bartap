import React, { useState } from 'react';
import { Star, X, Check, ThumbsUp, Sparkles } from 'lucide-react';
import { Review } from '../types.ts';

interface RatingModalProps {
  barName: string;
  barId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReview: (review: Review) => void;
}

const AVAILABLE_TAGS = [
  'Great Patio',
  'Packed Dance Floor',
  'Quick Bartenders',
  'Strong Pours',
  'Best Happy Hour',
  'College Vibe',
  'Upscale & Clean',
  'Live Band',
  'No Cover',
  'Cheap Pitchers',
];

export const RatingModal: React.FC<RatingModalProps> = ({
  barName,
  barId,
  isOpen,
  onClose,
  onSubmitReview,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [vibeScore, setVibeScore] = useState<number>(5);
  const [valueScore, setValueScore] = useState<number>(5);
  const [musicScore, setMusicScore] = useState<number>(5);
  const [authorName, setAuthorName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Great Patio']);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      author: authorName.trim() || 'Tallahassee Night Owl',
      rating,
      vibeScore,
      valueScore,
      musicScore,
      date: 'Just now',
      comment: comment.trim(),
      tags: selectedTags,
      helpfulCount: 1,
    };

    onSubmitReview(newReview);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-neutral-100 max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Close Rating Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-neutral-800 text-white rounded-full flex items-center justify-center mx-auto border border-neutral-700">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white">Review Submitted!</h3>
            <p className="text-sm text-neutral-400">
              Thank you for helping fellow Tallahassee nightlifers know the vibe at {barName}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-300 font-semibold mb-1">
                Rate & Review Vibe
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{barName}</h2>
              <p className="text-sm text-neutral-400 mt-1">
                Share your real-time crowd, drink specials, and music rating.
              </p>
            </div>

            {/* Overall 5 Star Rating */}
            <div className="space-y-2 bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800/80">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-200">Overall Bar Rating</span>
                <span className="text-sm font-mono text-white font-bold tabular-nums">
                  {hoverRating || rating} / 5.0
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 rounded-lg hover:scale-110 active:scale-95 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        (hoverRating !== null ? star <= hoverRating : star <= rating)
                          ? 'fill-neutral-100 text-neutral-100'
                          : 'text-neutral-700 hover:text-neutral-500'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Category Ratings (Vibe, Drink Value, Music) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-neutral-950/40 p-3 rounded-xl border border-neutral-800/60">
                <div className="text-xs text-neutral-400 font-medium">Crowd & Vibe</div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-mono text-neutral-200 font-semibold">{vibeScore}★</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={vibeScore}
                    onChange={(e) => setVibeScore(Number(e.target.value))}
                    className="w-20 accent-neutral-200 cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-neutral-950/40 p-3 rounded-xl border border-neutral-800/60">
                <div className="text-xs text-neutral-400 font-medium">Drink Value</div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-mono text-neutral-200 font-semibold">{valueScore}★</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={valueScore}
                    onChange={(e) => setValueScore(Number(e.target.value))}
                    className="w-20 accent-neutral-200 cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-neutral-950/40 p-3 rounded-xl border border-neutral-800/60">
                <div className="text-xs text-neutral-400 font-medium">DJ / Music</div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-mono text-neutral-200 font-semibold">{musicScore}★</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={musicScore}
                    onChange={(e) => setMusicScore(Number(e.target.value))}
                    className="w-20 accent-neutral-200 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Quick Vibe Tags */}
            <div className="space-y-2">
              <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
                Highlight Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        active
                          ? 'bg-neutral-100 text-neutral-950 font-semibold shadow-sm'
                          : 'bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reviewer Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
                Your Name or Handle
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. FSU Senior, Tyler M."
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-400 text-sm"
              />
            </div>

            {/* Review Comment */}
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
                Your Review & Live Tip
              </label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the line? Drink specials worth it? Any tips for someone heading over right now?"
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-400 text-sm resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-neutral-400 hover:text-white rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!comment.trim()}
                className="px-6 py-2.5 bg-neutral-100 hover:bg-white disabled:opacity-50 text-neutral-950 font-bold text-sm rounded-xl transition shadow-lg shadow-black/30 active:scale-[0.98] cursor-pointer"
              >
                Post Review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
