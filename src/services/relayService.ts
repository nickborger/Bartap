/**
 * Bar Tap camera relay: talks to the MediaMTX relay and its small helper on the
 * Oracle server (see relay/ and deploy/setup-relay.sh).
 *
 *   /relay/api/status   which cameras are live (public)
 *   /relay/api/keys     stream keys + connection links (bar owner / admin only)
 *   /relay/rtc/...      WebRTC (WHEP to watch, WHIP for the phone "Go live" page)
 *   /relay/hls/...      HLS backup player
 *
 * Stream keys are never stored in Firestore. The relay works them out from a
 * secret only the server knows, and hands them only to the bar's owner or an admin.
 */
import { useEffect, useState } from 'react';
import { auth } from '../firebase.ts';

/** Same website by default (Caddy forwards /relay/*). Override with VITE_RELAY_URL. */
export const RELAY_BASE: string = (
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_RELAY_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}/relay` : '/relay')
).replace(/\/$/, '');

export const relayPath = (barId: string, cameraId: string) => `bar/${barId}/${cameraId}`;

export interface RelayCameraStatus {
  live: boolean;
  since?: string;
  viewers: number;
  video?: string | null;
  audio?: boolean;
}

export type RelayStatusMap = Record<string, RelayCameraStatus>;

export interface RelayStatusResult {
  /** camera id -> status, for cameras that are live right now */
  cameras: RelayStatusMap;
  /** false when the relay server itself can't be reached */
  reachable: boolean;
  loaded: boolean;
}

export async function fetchRelayStatus(barId: string): Promise<RelayStatusMap> {
  const res = await fetch(`${RELAY_BASE}/api/status?bar=${encodeURIComponent(barId)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`relay status ${res.status}`);
  const data = (await res.json()) as { cameras?: RelayStatusMap };
  return data.cameras || {};
}

/** Polls the relay for which of a bar's cameras are live. */
export function useRelayStatus(barId: string | undefined, intervalMs = 10000): RelayStatusResult {
  const [state, setState] = useState<RelayStatusResult>({ cameras: {}, reachable: true, loaded: false });
  useEffect(() => {
    if (!barId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const cameras = await fetchRelayStatus(barId);
        if (!stopped) setState({ cameras, reachable: true, loaded: true });
      } catch {
        if (!stopped) setState({ cameras: {}, reachable: false, loaded: true });
      }
      if (!stopped) timer = setTimeout(tick, document.hidden ? intervalMs * 3 : intervalMs);
    };
    setState({ cameras: {}, reachable: true, loaded: false });
    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [barId, intervalMs]);
  return state;
}

export interface CameraConnection {
  id: string;
  name: string;
  path: string;
  key: string;
  keyVersion: number;
  on: boolean;
  rtmpsServer: string;
  rtmpServer: string;
  rtmpStreamKey: string;
  rtmpsFullUrl: string;
  rtmpFullUrl: string;
  goLiveLink: string;
  whip: string;
  /** "Straight from the recorder" address the server pulls, password hidden; null when not used. */
  direct?: string | null;
}

export interface CameraKeysResult {
  barId: string;
  host: string;
  signageConfirmed: boolean;
  cameras: CameraConnection[];
}

/** Stream keys and connection links for one bar. Only its owner or an admin gets them. */
export async function fetchCameraKeys(barId: string): Promise<CameraKeysResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in first.');
  let res: Response;
  try {
    res = await fetch(`${RELAY_BASE}/api/keys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ barId }),
    });
  } catch {
    throw new Error('The camera relay server can’t be reached. Is it set up yet? (See RELAY_SETUP.md.)');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error('The camera relay server isn’t running yet. (See RELAY_SETUP.md.)');
  }
  if (!res.ok) throw new Error((data as { error?: string }).error || `Relay error ${res.status}`);
  return data as CameraKeysResult;
}

export interface SavePullResult {
  ok: boolean;
  direct: string | null;
  /** Whether Bar Tap's server could open the port just now. */
  reachable?: boolean;
  checked?: string;
  /** Why the camera can't stream yet (turned off, signage...), or null. */
  problem?: string | null;
}

/**
 * "Straight from the recorder": give the relay server the RTSP address of a
 * camera or NVR/DVR (through a port forwarded on the bar's router). The
 * address and its password are kept on the relay server only. Pass url '' to stop.
 */
export async function saveDirectCamera(barId: string, cameraId: string, url: string): Promise<SavePullResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in first.');
  let res: Response;
  try {
    res = await fetch(`${RELAY_BASE}/api/pull`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ barId, cameraId, url }),
    });
  } catch {
    throw new Error('The camera relay server can’t be reached. Is it set up yet? (See RELAY_SETUP.md.)');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Relay error ${res.status}`);
  return data as SavePullResult;
}

/** The "Go live" link carries bar id, camera id and stream key in its #hash (never sent to servers). */
export function parseGoLiveToken(hash: string): { barId: string; cameraId: string; key: string } | null {
  const m = /[#&]t=([A-Za-z0-9_-]+)/.exec(hash);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const [barId, cameraId, key] = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)).split('|');
    if (!barId || !cameraId || !key) return null;
    return { barId, cameraId, key };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ WebRTC

function waitForIce(pc: RTCPeerConnection, ms = 1500) {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => pc.iceGatheringState === 'complete' && done();
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(done, ms);
  });
}

export interface RtcSession {
  pc: RTCPeerConnection;
  stop: () => void;
}

async function negotiate(pc: RTCPeerConnection, url: string, headers: Record<string, string> = {}): Promise<string | null> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIce(pc);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp', ...headers },
    body: pc.localDescription?.sdp || offer.sdp || '',
  });
  if (res.status !== 201 && res.status !== 200) {
    const err = new Error(`WebRTC ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const answer = await res.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });
  const loc = res.headers.get('Location');
  return loc ? new URL(loc, url).toString() : null;
}

function endSession(pc: RTCPeerConnection, sessionUrl: string | null, headers: Record<string, string> = {}) {
  try {
    pc.close();
  } catch {
    /* already closed */
  }
  if (sessionUrl) fetch(sessionUrl, { method: 'DELETE', headers }).catch(() => undefined);
}

/**
 * Watch a camera with WebRTC (WHEP). Video only, always: Bar Tap never carries
 * sound (Florida needs everyone's consent to record conversations). The relay
 * strips sound before anyone can watch; this asks for no sound track either.
 */
export async function playWebRtc(path: string, onTrack: (stream: MediaStream) => void): Promise<RtcSession> {
  const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
  pc.addTransceiver('video', { direction: 'recvonly' });
  const stream = new MediaStream();
  pc.ontrack = (ev) => {
    if (ev.track.kind !== 'video') return ev.track.stop();
    stream.addTrack(ev.track);
    onTrack(stream);
  };
  try {
    const sessionUrl = await negotiate(pc, `${RELAY_BASE}/rtc/${path}/whep`);
    return { pc, stop: () => endSession(pc, sessionUrl) };
  } catch (err) {
    pc.close();
    throw err;
  }
}

/** Send a phone/computer camera to the relay with WebRTC (WHIP). Video only: any sound track is dropped here. */
export async function publishWebRtc(path: string, key: string, media: MediaStream): Promise<RtcSession> {
  const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
  media.getAudioTracks().forEach((t) => t.stop());
  media.getVideoTracks().forEach((t) => pc.addTransceiver(t, { direction: 'sendonly', streams: [media] }));
  // Prefer H.264: every browser can play it back, and it uses less phone battery.
  pc.getTransceivers().forEach((tr) => {
    if (tr.sender.track?.kind !== 'video' || typeof RTCRtpSender.getCapabilities !== 'function') return;
    const codecs = RTCRtpSender.getCapabilities('video')?.codecs || [];
    const h264 = codecs.filter((c) => /h264/i.test(c.mimeType));
    if (h264.length && typeof tr.setCodecPreferences === 'function') {
      try {
        tr.setCodecPreferences([...h264, ...codecs.filter((c) => !/h264/i.test(c.mimeType))]);
      } catch {
        /* browser refused: keep its default */
      }
    }
  });
  const headers = { Authorization: `Basic ${btoa(`bartap:${key}`)}` };
  try {
    const sessionUrl = await negotiate(pc, `${RELAY_BASE}/rtc/${path}/whip`, headers);
    return { pc, stop: () => endSession(pc, sessionUrl, headers) };
  } catch (err) {
    pc.close();
    throw err;
  }
}
