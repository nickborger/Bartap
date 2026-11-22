import React, { useState } from 'react';
import {
  Camera,
  ExternalLink,
  Flame,
  Globe,
  MapPin,
  MessageSquare,
  Radio,
  Send,
  Server,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import { BarLocation, CameraAngle } from '../types.ts';
import { LiveCameraCanvas } from './LiveCameraCanvas.tsx';
import { TapInButton } from './TapInButton.tsx';

interface LiveFeedViewerModalProps {
  bar: BarLocation;
  isOpen: boolean;
  onClose: () => void;
  isTappedIn: boolean;
  onToggleTapIn: () => void;
  onOpenProfile: () => void;
  isPremium?: boolean;
  onOpenPremium?: () => void;
  onOpenRelayModal?: () => void;
}

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  isSelf?: boolean;
}

export const LiveFeedViewerModal: React.FC<LiveFeedViewerModalProps> = ({
  bar,
  isOpen,
  onClose,
  isTappedIn,
  onToggleTapIn,
  onOpenProfile,
  isPremium = false,
  onOpenPremium,
  onOpenRelayModal,
}) => {
  const [selectedCamera, setSelectedCamera] = useState<CameraAngle>(bar.cameras[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      user: 'Jake_FSU',
      text: 'Patio is buzzing tonight! Line took about 8 mins.',
      time: '2m ago',
    },
    {
      id: 'm2',
      user: 'TaylorM',
      text: 'Drink specials are live at the front bar 🔥',
      time: '1m ago',
    },
    {
      id: 'm3',
      user: 'DJ_Marcus',
      text: 'Live set starts at 10:30 PM, come through Tallahassee!',
      time: 'Just now',
    },
  ]);

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      user: 'You',
      text: inputMessage.trim(),
      time: 'Just now',
      isSelf: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-5 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-red-600 text-white animate-pulse">
              <Radio className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {bar.name} · Live Tap Feed
                </h2>
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 font-mono text-xs border border-neutral-700">
                  {bar.neighborhood}
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Streaming live from Tallahassee, FL · {bar.cameras.length} camera angles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TapInButton
              onTapIn={onToggleTapIn}
              isTappedIn={isTappedIn}
              tappedInCount={bar.tappedInCount + (isTappedIn ? 1 : 0)}
              size="sm"
            />

            <a
              href={bar.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold border border-neutral-700 transition min-h-[36px]"
              title={`Visit ${bar.name} website`}
            >
              <Globe className="w-3.5 h-3.5 text-neutral-300" />
              <span>Website</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              aria-label="Close Live Cam Feed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Split: Stream on left, Chat & Venue info on right */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 overflow-y-auto lg:overflow-hidden">
          {/* Main Camera Video Section */}
          <div className="lg:col-span-2 bg-neutral-950 flex flex-col justify-between min-h-0">
            <div className="relative w-full aspect-video">
              <LiveCameraCanvas
                barName={bar.name}
                camera={selectedCamera}
                baseImage={bar.image}
                isFullscreen={isFullscreen}
                onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
                isPremium={isPremium}
                onOpenTrial={onOpenPremium}
                onOpenRelayModal={onOpenRelayModal}
              />
            </div>

            {/* Camera Angles Selection */}
            <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-xs font-mono uppercase text-neutral-400 shrink-0 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-neutral-300" />
                Select Camera:
              </span>
              {bar.cameras.map((cam) => {
                const active = cam.id === selectedCamera.id;
                return (
                  <button
                    key={cam.id}
                    onClick={() => setSelectedCamera(cam)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      active
                        ? 'bg-neutral-100 text-neutral-950 font-bold shadow-md'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${active ? 'bg-neutral-950' : 'bg-red-500'}`}
                    />
                    {cam.name}
                  </button>
                );
              })}
            </div>

            {/* Quick Live Bar Details Footer */}
            <div className="p-4 bg-neutral-900 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-neutral-300">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Crowd: <strong className="text-white">{bar.crowdDensity}%</strong> ({bar.currentVibe})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-neutral-200 text-neutral-200" />
                  <span>Rating: <strong className="text-white">{bar.rating.toFixed(1)}</strong></span>
                </div>
              </div>

              <button
                onClick={onOpenProfile}
                className="text-neutral-200 hover:text-white hover:underline font-semibold cursor-pointer"
              >
                View Full Profile & Drink Specials →
              </button>
            </div>
          </div>

          {/* Right Column: Live Crowd Chat & Venue Status */}
          <div className="bg-neutral-900 border-t lg:border-t-0 lg:border-l border-neutral-800 flex flex-col min-h-[240px] lg:min-h-0 lg:h-full overflow-hidden">
            <div className="p-3 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-neutral-300" />
                Live Patron Feed & Chat
              </span>
              <span className="text-[11px] font-mono text-neutral-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2.5 custom-scrollbar">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-xl text-xs ${
                    m.isSelf
                      ? 'bg-neutral-800 border border-neutral-700 text-neutral-100 ml-3'
                      : 'bg-neutral-950/70 border border-neutral-800/70 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-white">{m.user}</span>
                    <span className="text-[10px] text-neutral-500">{m.time}</span>
                  </div>
                  <p className="leading-snug">{m.text}</p>
                </div>
              ))}
            </div>

            {/* Send Chat Message Form */}
            <form onSubmit={handleSendMessage} className="p-2.5 bg-neutral-950 border-t border-neutral-800 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Share live vibe or ask..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-white disabled:opacity-40 text-neutral-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center min-h-[36px]"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
