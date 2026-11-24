import React from 'react';
import { Camera, Radio, Star, Users } from 'lucide-react';
import { BarLocation } from '../types.ts';

interface LiveMultiCamBarProps {
  bars: BarLocation[];
  onSelectBarStream: (bar: BarLocation) => void;
  activeStreamBarId?: string;
  onOpenRelayModal?: () => void;
  currentCity?: string;
}

export const LiveMultiCamBar: React.FC<LiveMultiCamBarProps> = ({
  bars,
  onSelectBarStream,
  activeStreamBarId,
  onOpenRelayModal,
  currentCity = 'Tallahassee',
}) => {
  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-2.5 sm:p-3">
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 bg-red-500 animate-pulse"
          />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-200 truncate">
            {`${currentCity} Live Cam Mosaic · Tap In Quick Switch`}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onOpenRelayModal && (
            <button
              onClick={onOpenRelayModal}
              className="text-[11px] font-mono text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer hover:underline"
              title={`Inspect ${currentCity} Cloud Relay Nodes`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-tan animate-pulse" />
              <span>Edge Relays Active</span>
            </button>
          )}
          <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
            {`${bars.length} venues streaming live 24/7`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {bars.slice(0, 4).map((bar) => {
          const isActive = bar.id === activeStreamBarId;
          const primaryCam = bar.cameras[0];
          return (
            <div
              key={bar.id}
              onClick={() => onSelectBarStream(bar)}
              className={`group relative rounded-xl overflow-hidden aspect-video bg-neutral-950 border transition-all cursor-pointer ${
                isActive
                  ? 'border-copper ring-2 ring-copper/30 shadow-lg'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <img
                src={bar.image}
                alt={bar.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold font-mono tracking-wider animate-pulse">
                  LIVE
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/60 text-neutral-300 text-[9px] font-mono backdrop-blur-xs">
                  {`${primaryCam?.fps || 30}fps`}
                </span>
              </div>

              <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 text-white">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate group-hover:text-neutral-200 transition-colors">
                    {bar.name}
                  </div>
                  <div className="text-[10px] text-neutral-300 truncate font-mono">
                    {primaryCam?.name}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-neutral-200 tabular-nums shrink-0">
                  {bar.crowdDensity}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
