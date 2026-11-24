import React, { useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { Loader2 } from 'lucide-react';
import { playWebRtc, RELAY_BASE, RtcSession } from '../services/relayService.ts';

export type RelayVideoState = 'connecting' | 'playing' | 'failed';

interface RelayVideoProps {
  /** bar/<barId>/<cameraId> */
  path: string;
  className?: string;
  onState?: (s: RelayVideoState) => void;
}

/**
 * Plays one relay stream: WebRTC first (well under a second of delay), then HLS
 * (a few seconds of delay) if WebRTC can't connect, for example on a network
 * that blocks it. Retries on its own if the stream drops.
 */
export const RelayVideo: React.FC<RelayVideoProps> = ({ path, className, onState }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<RelayVideoState>('connecting');
  const [attempt, setAttempt] = useState(0);
  const onStateRef = useRef(onState);
  onStateRef.current = onState;

  useEffect(() => {
    onStateRef.current?.(state);
  }, [state]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let rtc: RtcSession | null = null;
    let hls: Hls | null = null;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    setState('connecting');

    const onPlaying = () => !cancelled && setState('playing');
    video.addEventListener('playing', onPlaying);

    const cleanup = () => {
      if (watchdog) clearTimeout(watchdog);
      rtc?.stop();
      rtc = null;
      hls?.destroy();
      hls = null;
    };

    const giveUp = () => {
      if (cancelled) return;
      cleanup();
      setState('failed');
      // Try again in a little while: the bar's internet may just have blipped.
      retry = setTimeout(() => !cancelled && setAttempt((a) => a + 1), 15000);
    };

    const startHls = async () => {
      if (cancelled) return;
      cleanup();
      video.srcObject = null;
      const url = `${RELAY_BASE}/hls/${path}/index.m3u8`;
      const { default: HlsLib } = await import('hls.js');
      if (cancelled) return;
      if (HlsLib.isSupported()) {
        hls = new HlsLib({ lowLatencyMode: true, liveSyncDurationCount: 2, manifestLoadingMaxRetry: 2 });
        // The relay sends video only; the player is muted as well.
        hls.on(HlsLib.Events.ERROR, (_e, data) => data.fatal && giveUp());
        hls.loadSource(url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url; // Safari plays HLS by itself
        video.onerror = giveUp;
      } else {
        return giveUp();
      }
      video.play().catch(() => undefined);
      watchdog = setTimeout(() => video.readyState < 2 && giveUp(), 12000);
    };

    const startRtc = async () => {
      try {
        rtc = await playWebRtc(
          path,
          (stream) => {
            if (cancelled) return;
            if (video.srcObject !== stream) video.srcObject = stream;
            video.play().catch(() => undefined);
          }
        );
        if (cancelled) return rtc.stop();
        rtc.pc.addEventListener('connectionstatechange', () => {
          const s = rtc?.pc.connectionState;
          if (s === 'failed') startHls();
          if (s === 'disconnected') {
            // Stream ended or network dropped: reconnect from the start.
            setTimeout(() => rtc?.pc.connectionState === 'disconnected' && !cancelled && setAttempt((a) => a + 1), 4000);
          }
        });
        watchdog = setTimeout(() => video.readyState < 2 && startHls(), 7000);
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        // 404 = not streaming right now, 401 = turned off: no point trying HLS.
        if (status === 404 || status === 401) return giveUp();
        startHls();
      }
    };

    if (typeof RTCPeerConnection === 'undefined') startHls();
    else startRtc();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      video.removeEventListener('playing', onPlaying);
      cleanup();
      video.removeAttribute('src');
      video.srcObject = null;
    };
  }, [path, attempt]);

  return (
    <div className={`relative w-full h-full bg-black ${className || ''}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        autoPlay
        playsInline
        muted
        data-testid="relay-video"
      />
      {state === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-300 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-copper" />
          Connecting to camera…
        </div>
      )}
    </div>
  );
};
