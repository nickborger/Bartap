import React, { useEffect, useState } from 'react';
import {
  Camera,
  ExternalLink,
  Flame,
  Globe,
  MapPin,
  MessageSquare,
  MessageSquareOff,
  Radio,
  Star,
  X,
} from 'lucide-react';
import { BarLocation, CameraAngle } from '../types.ts';
import { LiveCameraCanvas } from './LiveCameraCanvas.tsx';
import { TapInButton } from './TapInButton.tsx';
import { ChatActionSheet, ChatComposer, ChatOverlay, ChatPanel, ChatViewer, useLiveChat } from './LiveChat.tsx';
import type { ChatMessage } from '../services/chatService.ts';

interface LiveFeedViewerModalProps {
  bar: BarLocation;
  isOpen: boolean;
  onClose: () => void;
  isTappedIn: boolean;
  onToggleTapIn: () => void;
  onOpenProfile: () => void;
  onOpenRelayModal?: () => void;
  /** The signed-in person (null when signed out: they can read chat but not post). */
  chatViewer: ChatViewer | null;
  onRequestSignIn: () => void;
}

export const LiveFeedViewerModal: React.FC<LiveFeedViewerModalProps> = ({
  bar,
  isOpen,
  onClose,
  isTappedIn,
  onToggleTapIn,
  onOpenProfile,
  onOpenRelayModal,
  chatViewer,
  onRequestSignIn,
}) => {
  const [selectedCamera, setSelectedCamera] = useState<CameraAngle>(bar.cameras[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chat = useLiveChat(bar, chatViewer);
  const [openMessage, setOpenMessage] = useState<ChatMessage | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  // Close the message menu if that message disappears (deleted, cleared or closing time).
  useEffect(() => {
    if (openMessage && !chat.messages.some((m) => m.id === openMessage.id)) setOpenMessage(null);
  }, [chat.messages, openMessage]);

  if (!isOpen) return null;

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
                barId={bar.id}
                barName={bar.name}
                camera={selectedCamera}
                baseImage={bar.image}
                isFullscreen={isFullscreen}
                onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
                onOpenRelayModal={onOpenRelayModal}
              />
              {/* Phone: chat floats over the bottom of the video (Twitch-style) */}
              <div className="lg:hidden">
                {showOverlay && <ChatOverlay chat={chat} viewer={chatViewer} onOpenMessage={setOpenMessage} />}
                <button
                  type="button"
                  onClick={() => setShowOverlay((v) => !v)}
                  className="absolute right-2 top-11 z-10 p-1.5 rounded-lg bg-black/60 border border-neutral-700 text-neutral-200 cursor-pointer"
                  aria-label={showOverlay ? 'Hide chat on video' : 'Show chat on video'}
                  title={showOverlay ? 'Hide chat on video' : 'Show chat on video'}
                  data-testid="chat-overlay-toggle"
                >
                  {showOverlay ? <MessageSquareOff className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Phone: type your chat message right under the video */}
            <div className="lg:hidden" data-testid="chat-phone-composer">
              <ChatComposer chat={chat} viewer={chatViewer} onRequestSignIn={onRequestSignIn} compact />
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
                        ? 'bg-copper text-ink font-bold shadow-md'
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
                  <Star className="w-3.5 h-3.5 fill-tan text-neutral-200" />
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

          {/* Computer: chat panel next to the video */}
          <div className="hidden lg:flex bg-neutral-900 border-l border-neutral-800 flex-col min-h-0 lg:h-full overflow-hidden">
            <ChatPanel
              bar={bar}
              chat={chat}
              viewer={chatViewer}
              onRequestSignIn={onRequestSignIn}
              onOpenMessage={setOpenMessage}
            />
          </div>
        </div>
      </div>

      {openMessage && (
        <div onClick={(e) => e.stopPropagation()}>
          <ChatActionSheet
            bar={bar}
            message={openMessage}
            chat={chat}
            viewer={chatViewer}
            onRequestSignIn={onRequestSignIn}
            onClose={() => setOpenMessage(null)}
          />
        </div>
      )}
    </div>
  );
};
