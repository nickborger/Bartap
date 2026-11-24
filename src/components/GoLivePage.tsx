import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, MicOff, Radio, RefreshCw, Square, VideoOff } from 'lucide-react';
import { parseGoLiveToken, publishWebRtc, RtcSession } from '../services/relayService.ts';

type Phase = 'ready' | 'starting' | 'live' | 'reconnecting' | 'error';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

/**
 * /go-live#t=...  — the simplest way to put a bar camera on Bar Tap: open the
 * link on a spare phone or tablet, point it at the room, tap Start. No app to
 * install, no account, nothing to open on the bar's router.
 *
 * Video only: the page never asks for the microphone, so no sound is sent.
 */
export const GoLivePage: React.FC = () => {
  const token = parseGoLiveToken(window.location.hash);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<RtcSession | null>(null);
  const wakeRef = useRef<WakeLockSentinelLike | null>(null);
  const wantLive = useRef(false);
  const [phase, setPhase] = useState<Phase>('ready');
  const [message, setMessage] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');

  const stopAll = () => {
    wantLive.current = false;
    sessionRef.current?.stop();
    sessionRef.current = null;
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    wakeRef.current?.release().catch(() => undefined);
    wakeRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => () => stopAll(), []);

  const connect = async (): Promise<void> => {
    if (!token || !mediaRef.current) return;
    try {
      const session = await publishWebRtc(`in/${token.barId}/${token.cameraId}`, token.key, mediaRef.current);
      sessionRef.current = session;
      setPhase('live');
      setMessage('');
      session.pc.addEventListener('connectionstatechange', () => {
        const s = session.pc.connectionState;
        if ((s === 'failed' || s === 'disconnected' || s === 'closed') && wantLive.current && sessionRef.current === session) {
          session.stop();
          sessionRef.current = null;
          setPhase('reconnecting');
          setTimeout(() => wantLive.current && connect(), 3000);
        }
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        stopAll();
        setPhase('error');
        setMessage(
          'Bar Tap said no. Ask the bar owner to check that this camera is turned ON, that the signage box is ticked, and that this is the newest link.'
        );
        return;
      }
      setPhase('reconnecting');
      setMessage('Can’t reach Bar Tap right now. Trying again…');
      setTimeout(() => wantLive.current && connect(), 5000);
    }
  };

  const start = async (useFacing = facing) => {
    if (!token) return;
    setPhase('starting');
    setMessage('');
    try {
      // audio: false — Bar Tap never sends sound.
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: useFacing }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 20, max: 30 } },
      });
      media.getAudioTracks().forEach((t) => t.stop());
      mediaRef.current = media;
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        videoRef.current.play().catch(() => undefined);
      }
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } };
        wakeRef.current = (await nav.wakeLock?.request('screen')) || null;
      } catch {
        /* keep-awake not supported: the tip on screen covers it */
      }
      wantLive.current = true;
      await connect();
    } catch {
      stopAll();
      setPhase('error');
      setMessage('The camera couldn’t start. Allow camera access for this page in the browser settings, then tap Start again.');
    }
  };

  const flip = async () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    stopAll();
    await start(next);
  };

  if (!token) {
    return (
      <Shell>
        <VideoOff className="w-10 h-10 text-copper mx-auto" />
        <h1 className="text-xl font-black mt-3">This link isn’t complete</h1>
        <p className="text-sm text-neutral-400 mt-2">
          Ask the bar owner to send the “Go live” link again from Bar Tap (Cameras, then Phone or tablet).
        </p>
      </Shell>
    );
  }

  const live = phase === 'live';
  return (
    <Shell>
      <div className="flex items-center justify-between mb-3">
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-widest text-copper font-black">Bar Tap camera</div>
          <div className="text-sm text-neutral-300 font-mono">{token.cameraId}</div>
        </div>
        <span
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider ${
            live ? 'bg-copper text-ink' : 'bg-neutral-800 text-neutral-300'
          }`}
          data-testid="golive-phase"
        >
          {live ? <Radio className="w-3.5 h-3.5 animate-pulse" /> : null}
          {live ? 'Live' : phase === 'starting' ? 'Starting' : phase === 'reconnecting' ? 'Reconnecting' : 'Not live'}
        </span>
      </div>

      <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        {phase === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
            <Camera className="w-10 h-10" />
          </div>
        )}
        {(phase === 'starting' || phase === 'reconnecting') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="w-8 h-8 animate-spin text-copper" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 mt-2">
        <MicOff className="w-3.5 h-3.5" /> Video only. No sound is ever sent.
      </div>

      {message && <p className="text-sm text-amber-300 mt-3">{message}</p>}

      <div className="flex gap-2 mt-4">
        {phase === 'ready' || phase === 'error' ? (
          <button
            onClick={() => start()}
            className="flex-1 py-3.5 rounded-xl bg-copper text-ink font-black text-base cursor-pointer"
            data-testid="golive-start"
          >
            Start
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                stopAll();
                setPhase('ready');
                setMessage('');
              }}
              className="flex-1 py-3.5 rounded-xl bg-neutral-800 text-neutral-100 font-black flex items-center justify-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4" /> Stop
            </button>
            <button
              onClick={flip}
              className="px-4 py-3.5 rounded-xl border border-neutral-700 text-neutral-200 cursor-pointer"
              title="Switch camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <ul className="text-left text-xs text-neutral-400 mt-5 space-y-1.5 list-disc pl-4">
        <li>Keep this page open and the phone plugged in. Turn off auto-lock if the screen goes dark.</li>
        <li>Use the bar’s Wi-Fi so it doesn’t use phone data.</li>
        <li>Point it at the room, not at the register, restrooms or the street.</li>
      </ul>
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-ink text-neutral-100 flex items-start sm:items-center justify-center p-4">
    <div className="w-full max-w-md text-center">{children}</div>
  </div>
);
