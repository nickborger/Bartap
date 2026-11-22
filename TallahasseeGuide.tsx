import React from 'react';
import { Radio, Zap } from 'lucide-react';

interface TapInButtonProps {
  onTapIn: () => void;
  isTappedIn?: boolean;
  tappedInCount?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'card' | 'outline';
  className?: string;
  showCount?: boolean;
}

export const TapInButton: React.FC<TapInButtonProps> = ({
  onTapIn,
  isTappedIn = false,
  tappedInCount,
  size = 'md',
  variant = 'primary',
  className = '',
  showCount = true,
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[36px]',
    md: 'px-4 py-2 text-sm gap-2 min-h-[44px]',
    lg: 'px-6 py-3 text-base gap-2.5 min-h-[48px]',
  };

  const variantClasses = {
    primary:
      'bg-copper hover:bg-tan text-ink font-bold shadow-lg shadow-black/30 active:scale-[0.98]',
    card:
      'bg-neutral-900 hover:bg-neutral-800 text-neutral-100 border border-neutral-700 hover:border-neutral-500 font-semibold shadow-md active:scale-[0.98]',
    outline:
      'bg-transparent hover:bg-neutral-800 text-neutral-200 border border-neutral-600 font-semibold active:scale-[0.98]',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onTapIn();
      }}
      className={`inline-flex items-center justify-center rounded-xl cursor-pointer transition-all duration-150 select-none whitespace-nowrap shrink-0 group ${
        sizeClasses[size]
      } ${
        isTappedIn
          ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-500 font-bold shadow-lg shadow-black/30'
          : variantClasses[variant]
      } ${className}`}
      title={isTappedIn ? 'You are Tapped In! Click to view live feed' : 'Tap In to view live video feed'}
      aria-label="Tap In"
    >
      {/* Tap In Icon */}
      <span className="relative flex items-center justify-center">
        <Radio className={`transition-transform group-hover:scale-110 ${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
        {!isTappedIn && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
        )}
      </span>

      <span className="tracking-tight">
        {isTappedIn ? 'Tapped In' : 'Tap In'}
      </span>

      {showCount && typeof tappedInCount === 'number' && (
        <span
          className={`ml-1 px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums ${
            isTappedIn ? 'bg-neutral-700 text-neutral-100 font-semibold' : 'bg-neutral-950/15 text-neutral-950 font-semibold'
          }`}
        >
          {tappedInCount}
        </span>
      )}
    </button>
  );
};
