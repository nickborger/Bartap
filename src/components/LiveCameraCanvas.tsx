import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Eye,
  Maximize2,
  Minimize2,
  Radio,
  Server,
  Signal,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { CameraAngle } from '../types.ts';
import { nightlifeAudio } from '../utils/audioSynth.ts';

interface LiveCameraCanvasProps {
  barName: string;
  camera: CameraAngle;
  baseImage: string;
  isCompact?: boolean;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
  onOpenRelayModal?: () => void;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  y: number;
  opacity: number;
  scale: number;
}

export const LiveCameraCanvas: React.FC<LiveCameraCanvasProps> = ({
  barName,
  camera,
  baseImage,
  isCompact = false,
  onFullscreenToggle,
  isFullscreen = false,
  onOpenRelayModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [showRelayTelemetry, setShowRelayTelemetry] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [liveTimestamp, setLiveTimestamp] = useState<string>('');
  const [viewerCount, setViewerCount] = useState<number>(() => Math.floor(Math.random() * 45) + 38);

  // Timecode generator for the live stream
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const ms = Math.floor(now.getMilliseconds() / 10)
        .toString()
        .padStart(2, '0');
      setLiveTimestamp(`${timeStr}:${ms}`);
    };
    const timer = setInterval(updateTime, 40);
    return () => clearInterval(timer);
  }, []);

  // Viewer fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => Math.max(12, prev + (Math.random() > 0.45 ? 1 : -1)));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Floating emojis animation tick
  useEffect(() => {
    if (floatingEmojis.length === 0) return;
    const interval = setInterval(() => {
      setFloatingEmojis((prev) =>
        prev
          .map((e) => ({
            ...e,
            y: e.y - 3,
            opacity: e.opacity - 0.025,
            scale: Math.min(1.4, e.scale + 0.01),
          }))
          .filter((e) => e.opacity > 0)
      );
    }, 30);
    return () => clearInterval(interval);
  }, [floatingEmojis.length]);

  const triggerReaction = (emoji: string) => {
    const id = Math.random().toString(36).substring(7);
    const newEmoji: FloatingEmoji = {
      id,
      emoji,
      x: 35 + Math.random() * 30,
      y: 75,
      opacity: 1,
      scale: 0.9,
    };
    setFloatingEmojis((prev) => [...prev, newEmoji]);
  };

  const toggleAudio = () => {
    if (isAudioMuted) {
      nightlifeAudio.start(0.35);
      setIsAudioMuted(false);
    } else {
      nightlifeAudio.stop();
      setIsAudioMuted(true);
    }
  };

  useEffect(() => {
    return () => {
      nightlifeAudio.stop();
    };
  }, []);

  // Dynamic Canvas Rendering Loop for CCTV / Nightlife Camera realism
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = baseImage;
    let imgLoaded = false;
    img.onload = () => {
      imgLoaded = true;
    };

    // Full animated live video simulation
    let animId: number;
    let t = 0;

    const crowdNodes = Array.from({ length: 18 }, () => ({
      x: Math.random(),
      y: 0.55 + Math.random() * 0.4,
      radius: 14 + Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
      heat: Math.random() * 0.8 + 0.2,
    }));

    const render = () => {
      t += 0.035;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (imgLoaded) {
        ctx.drawImage(img, 0, 0, width, height);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#1a1a1a');
        grad.addColorStop(0.5, '#36302c');
        grad.addColorStop(1, '#121110');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // 1. Moving ambient nightlife lighting effects
      const lightGrad1 = ctx.createRadialGradient(
        width * (0.3 + Math.sin(t * 0.4) * 0.15),
        height * 0.35,
        10,
        width * 0.35,
        height * 0.4,
        width * 0.6
      );
      lightGrad1.addColorStop(0, 'rgba(242, 232, 221, 0.10)');
      lightGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lightGrad1;
      ctx.fillRect(0, 0, width, height);

      const lightGrad2 = ctx.createRadialGradient(
        width * (0.7 + Math.cos(t * 0.3) * 0.12),
        height * 0.25,
        15,
        width * 0.7,
        height * 0.3,
        width * 0.5
      );
      lightGrad2.addColorStop(0, 'rgba(201, 155, 114, 0.08)');
      lightGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lightGrad2;
      ctx.fillRect(0, 0, width, height);

      // 2. Natural crowd motion silhouettes (no artificial thermal heat lamp overlay)
      ctx.save();
      ctx.fillStyle = 'rgba(54, 48, 44, 0.16)';
      crowdNodes.slice(0, 8).forEach((node) => {
        const nx = (node.x + Math.sin(t * 0.8 + node.phase) * 0.015) * width;
        const ny = (node.y + Math.cos(t * 0.8 + node.phase) * 0.01) * height;
        ctx.beginPath();
        ctx.ellipse(nx, ny, node.radius * 0.7, node.radius * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // 3. Subtle CCTV sensor vignette & scanline
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.35,
        width / 2,
        height / 2,
        width * 0.72
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      const scanY = (t * 40) % height;
      ctx.fillStyle = 'rgba(242, 232, 221, 0.015)';
      ctx.fillRect(0, scanY, width, 2);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [baseImage]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-neutral-950 select-none group ${
        isFullscreen
          ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95'
          : 'w-full rounded-2xl'
      }`}
    >
      <div
        className={`relative w-full ${
          isFullscreen
            ? 'max-w-6xl max-h-[90dvh] aspect-video rounded-2xl overflow-hidden'
            : 'aspect-video'
        }`}
      >
        {/* Real-time Canvas Feed */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-cover block"
        />

        {/* Floating Reaction Emojis Layer */}
        {floatingEmojis.map((e) => (
            <div
              key={e.id}
              style={{
                left: `${e.x}%`,
                top: `${e.y}%`,
                opacity: e.opacity,
                transform: `scale(${e.scale}) translate(-50%, -50%)`,
              }}
              className="absolute pointer-events-none text-3xl transition-transform"
            >
              {e.emoji}
            </div>
          ))}

        {/* Camera Header Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600/90 text-white rounded-md text-xs font-bold tracking-wider uppercase backdrop-blur-sm shadow-sm animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              LIVE STREAM
            </span>

            <span className="px-2.5 py-1 bg-black/70 text-neutral-200 rounded-md text-xs font-mono font-medium backdrop-blur-sm border border-white/10">
              {camera.name}
            </span>

            {/* Cloud Relay Status Pill */}
            <button
              type="button"
              onClick={() => setShowRelayTelemetry((prev) => !prev)}
              className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 hover:bg-neutral-900 text-neutral-200 hover:text-white text-xs font-mono border border-neutral-700 transition cursor-pointer"
              title="Click for Real-time Cloud Relay Telemetry"
            >
              <span className="w-2 h-2 rounded-full bg-tan animate-pulse" />
              <Server className="w-3 h-3 text-neutral-300" />
              <span className="hidden sm:inline">RELAY:</span>
              <span className="text-neutral-100 font-semibold truncate max-w-[120px]">
                {camera.cloudRelay?.edgeNode.split(' ')[0] || 'TLH-Edge-01'}
              </span>
              <span className="text-neutral-400 text-[11px]">
                {camera.cloudRelay?.latencyMs || 128}ms
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex px-2 py-0.5 bg-black/60 text-neutral-300 rounded text-[11px] font-mono backdrop-blur-sm">
              {camera.resolution} · {camera.fps} FPS
            </span>

            <span className="flex items-center gap-1 px-2 py-0.5 bg-black/60 text-neutral-200 rounded text-xs font-medium backdrop-blur-sm">
              <Eye className="w-3.5 h-3.5 text-neutral-300" />
              {viewerCount}
            </span>
          </div>
        </div>

        {/* Live Cloud Relay Telemetry Popover HUD */}
        {showRelayTelemetry && (
          <div className="absolute top-14 left-3 z-30 w-80 bg-neutral-950/95 border border-neutral-700 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs font-mono animate-fade-in pointer-events-auto">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-white font-bold">
                <Server className="w-4 h-4 text-neutral-300" />
                <span>Cloud Relay Telemetry</span>
              </div>
              <button
                onClick={() => setShowRelayTelemetry(false)}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2 text-neutral-300">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Ingest Node:</span>
                <span className="text-neutral-100 font-bold truncate max-w-[150px]">
                  {camera.cloudRelay?.edgeNode || 'TLH-CollegeTown-Edge-01'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Relay Protocol:</span>
                <span className="text-neutral-200 font-semibold">
                  {camera.cloudRelay?.ingestProtocol || 'WebRTC-Edge'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Live Bitrate:</span>
                <span className="text-white font-semibold">
                  {((camera.cloudRelay?.bitrateKbps || 4200) / 1000).toFixed(1)} Mbps
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Median Latency:</span>
                <span className="text-neutral-200 font-semibold">
                  {camera.cloudRelay?.latencyMs || 128} ms (Ultra-Low)
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Packet Loss:</span>
                <span className="text-neutral-200 font-semibold">
                  {camera.cloudRelay?.packetLossPercent ?? 0.0}% (Stable)
                </span>
              </div>

              {camera.cloudRelay?.hardwareModel && (
                <div className="flex justify-between items-center pt-1 border-t border-neutral-800/80">
                  <span className="text-neutral-400">Camera Model:</span>
                  <span className="text-neutral-200 truncate max-w-[150px]">
                    {camera.cloudRelay.hardwareModel}
                  </span>
                </div>
              )}

              {camera.cloudRelay?.localIp && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">RTSP Ingest IP:</span>
                  <span className="text-neutral-400 text-[11px] font-mono">
                    {camera.cloudRelay.localIp}
                  </span>
                </div>
              )}
            </div>

            {onOpenRelayModal && (
              <button
                onClick={() => {
                  setShowRelayTelemetry(false);
                  onOpenRelayModal();
                }}
                className="mt-3.5 w-full py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>View All 22 TLH Bar Relays</span>
              </button>
            )}
          </div>
        )}

        {/* Camera Technical Overlay Info (Bottom Left) */}
        <div className="absolute bottom-3 left-3 pointer-events-none z-10">
          <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white font-mono text-xs space-y-0.5">
            <div className="flex items-center gap-2 text-neutral-200 font-semibold tracking-wide">
              <span>{barName}</span>
              <span className="text-neutral-400">/</span>
              <span className="text-neutral-100">{camera.locationLabel}</span>
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-2">
              <span>TLH, FL</span>
              <span>·</span>
              <span className="text-neutral-200 tabular-nums">{liveTimestamp}</span>
              <span>·</span>
              <span>CROWD: {camera.crowdLevel}%</span>
            </div>
          </div>
        </div>

        {/* Camera Controls & Quick Reaction Toolbar (Bottom Right) */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
          {!isCompact && (
            <div className="hidden sm:flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
              <button
                onClick={() => triggerReaction('🔥')}
                className="w-8 h-8 rounded hover:bg-white/20 active:scale-90 transition flex items-center justify-center text-lg cursor-pointer"
                title="Send Fire"
                aria-label="Send Fire reaction"
              >
                🔥
              </button>
              <button
                onClick={() => triggerReaction('🍻')}
                className="w-8 h-8 rounded hover:bg-white/20 active:scale-90 transition flex items-center justify-center text-lg cursor-pointer"
                title="Send Cheers"
                aria-label="Send Cheers reaction"
              >
                🍻
              </button>
              <button
                onClick={() => triggerReaction('🎉')}
                className="w-8 h-8 rounded hover:bg-white/20 active:scale-90 transition flex items-center justify-center text-lg cursor-pointer"
                title="Send Party"
                aria-label="Send Party reaction"
              >
                🎉
              </button>
            </div>
          )}

          {/* Ambient Bar Sound Toggle */}
          <button
            onClick={toggleAudio}
            className={`min-h-[38px] min-w-[38px] rounded-lg text-xs font-medium flex items-center justify-center transition cursor-pointer border ${
              !isAudioMuted
                ? 'bg-copper text-ink font-bold border-white shadow-md'
                : 'bg-black/75 text-neutral-300 hover:text-white border-white/10 hover:bg-black/90'
            }`}
            title={isAudioMuted ? 'Unmute Live Bar Atmosphere' : 'Mute Atmosphere'}
            aria-label={isAudioMuted ? 'Unmute Live Bar Atmosphere' : 'Mute Atmosphere'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          {onFullscreenToggle && (
            <button
              onClick={onFullscreenToggle}
              className="min-h-[38px] min-w-[38px] rounded-lg bg-black/75 text-neutral-300 hover:text-white border border-white/10 flex items-center justify-center transition cursor-pointer hover:bg-black/90"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Stream'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Expand Stream'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
