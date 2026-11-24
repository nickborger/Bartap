import React, { useState } from 'react';
import { Eye, Maximize2, Minimize2, Radio, Server, VideoOff, VolumeX } from 'lucide-react';
import { CameraAngle } from '../types.ts';
import { relayPath, useRelayStatus } from '../services/relayService.ts';
import { RelayVideo, RelayVideoState } from './RelayVideo.tsx';

interface LiveCameraCanvasProps {
  /** Needed to find the camera's stream on the relay. */
  barId: string;
  barName: string;
  camera: CameraAngle;
  baseImage: string;
  isCompact?: boolean;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
  onOpenRelayModal?: () => void;
}

/**
 * The live camera player. Plays the real stream from the Bar Tap camera relay
 * when the bar's camera is sending one, and shows a calm "offline" card when it
 * isn't. (The name is kept from the old simulated canvas so nothing else changes.)
 */
export const LiveCameraCanvas: React.FC<LiveCameraCanvasProps> = ({
  barId,
  barName,
  camera,
  baseImage,
  isCompact = false,
  onFullscreenToggle,
  isFullscreen = false,
  onOpenRelayModal,
}) => {
  const status = useRelayStatus(barId);
  const [videoState, setVideoState] = useState<RelayVideoState>('connecting');

  const turnedOff = camera?.status === 'STANDBY';
  const relayLive = !!camera && !turnedOff && !!status.cameras[camera.id]?.live;
  const showVideo = relayLive && videoState !== 'failed';
  const viewers = camera ? status.cameras[camera.id]?.viewers : undefined;

  let offlineTitle = 'Camera offline';
  let offlineText = 'This camera isn’t streaming right now. Check back soon.';
  if (!camera) {
    offlineTitle = 'No cameras yet';
    offlineText = `${barName} hasn’t connected a camera yet.`;
  } else if (turnedOff) {
    offlineTitle = 'Camera turned off';
    offlineText = `${barName} has this camera turned off right now.`;
  } else if (!status.loaded) {
    offlineTitle = 'Checking camera…';
    offlineText = '';
  } else if (!status.reachable) {
    offlineText = 'Live video is taking a break. Try again in a minute.';
  } else if (relayLive && videoState === 'failed') {
    offlineTitle = 'Can’t load the video';
    offlineText = 'The camera is on, but the video couldn’t load on this network. Retrying…';
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-black select-none ${
        isFullscreen ? 'h-[70vh] sm:h-[78vh]' : isCompact ? 'aspect-video' : 'aspect-video'
      }`}
      data-testid="live-camera"
      data-live={showVideo ? 'yes' : 'no'}
    >
      {relayLive && (
        <RelayVideo
          key={`${barId}/${camera.id}`}
          path={relayPath(barId, camera.id)}
          onState={setVideoState}
        />
      )}

      {!showVideo && (
        <div className="absolute inset-0">
          {baseImage && (
            <img src={baseImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 blur-sm scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/90" />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-full border border-copper/50 bg-black/60 flex items-center justify-center mb-3">
              <VideoOff className="w-5 h-5 text-copper" />
            </div>
            <div className={`font-black text-neutral-100 ${isCompact ? 'text-sm' : 'text-base'}`} data-testid="camera-offline">
              {offlineTitle}
            </div>
            {offlineText && !isCompact && <p className="text-xs text-neutral-400 mt-1 max-w-xs">{offlineText}</p>}
          </div>
        </div>
      )}

      {/* Top overlay: live badge + camera name */}
      <div className="absolute top-0 inset-x-0 p-3 flex items-start justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 min-w-0">
          {showVideo && videoState === 'playing' ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-copper text-ink text-[10px] font-black uppercase tracking-wider">
              <Radio className="w-3 h-3 animate-pulse" /> Live
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-neutral-800/90 text-neutral-300 text-[10px] font-bold uppercase tracking-wider">
              {showVideo ? 'Connecting' : 'Offline'}
            </span>
          )}
          {camera && (
            <span className="text-xs font-bold text-white truncate drop-shadow">
              {camera.name}
              {!isCompact && camera.locationLabel ? <span className="text-neutral-300 font-normal"> · {camera.locationLabel}</span> : null}
            </span>
          )}
        </div>
        {showVideo && typeof viewers === 'number' && viewers > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-neutral-200 font-mono drop-shadow">
            <Eye className="w-3.5 h-3.5" /> {viewers}
          </span>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent">
        <div className="text-[10px] text-neutral-400 truncate">{barName}</div>
        <div className="flex items-center gap-1.5">
          {showVideo && (
            <span className="p-1.5 rounded-lg bg-black/60 border border-neutral-800 text-neutral-500" title="Video only. Bar Tap cameras never carry sound.">
              <VolumeX className="w-4 h-4" />
            </span>
          )}
          {onOpenRelayModal && !isCompact && (
            <button
              onClick={onOpenRelayModal}
              className="p-1.5 rounded-lg bg-black/60 border border-neutral-700 text-neutral-200 hover:text-white cursor-pointer"
              title="About Bar Tap live cameras"
            >
              <Server className="w-4 h-4" />
            </button>
          )}
          {onFullscreenToggle && (
            <button
              onClick={onFullscreenToggle}
              className="p-1.5 rounded-lg bg-black/60 border border-neutral-700 text-neutral-200 hover:text-white cursor-pointer"
              title={isFullscreen ? 'Smaller' : 'Bigger'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
