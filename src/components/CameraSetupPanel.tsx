import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Cloud,
  Copy,
  Globe,
  KeyRound,
  Loader2,
  MicOff,
  Monitor,
  Power,
  Radio,
  Share2,
  ShieldCheck,
  Smartphone,
  Video,
} from 'lucide-react';
import { BarLocation, CameraAngle } from '../types.ts';
import { auth } from '../firebase.ts';
import { saveCameraSettings } from '../services/barDataService.ts';
import {
  CameraConnection,
  CameraKeysResult,
  fetchCameraKeys,
  saveDirectCamera,
  SavePullResult,
  useRelayStatus,
} from '../services/relayService.ts';

interface CameraSetupPanelProps {
  bar: BarLocation;
  /** Called after cameras change, so the screen around it stays in step. */
  onCamerasChange?: (cameras: CameraAngle[]) => void;
}

type Method = 'phone' | 'kit' | 'direct' | 'app' | 'cloud';

/** Camera brands and where their (smaller, lighter) sub stream lives. `hp` is host:port. */
const BRANDS: { id: string; label: string; url: (hp: string, ch: number, main: boolean) => string }[] = [
  { id: 'hikvision', label: 'Hikvision / Annke / LTS (and Hikvision-built Swann)', url: (hp, ch, main) => `${hp}/Streaming/Channels/${ch}0${main ? 1 : 2}` },
  {
    id: 'dahua',
    label: 'Dahua / Amcrest / Lorex',
    url: (hp, ch, main) => `${hp}/cam/realmonitor?channel=${ch}&subtype=${main ? 0 : 1}`,
  },
  { id: 'reolink', label: 'Reolink', url: (hp, ch, main) => `${hp}/h264Preview_${String(ch).padStart(2, '0')}_${main ? 'main' : 'sub'}` },
  { id: 'swann', label: 'Swann (NVR)', url: (hp, ch, main) => `${hp}/ch${String(ch).padStart(2, '0')}/${main ? 0 : 1}` },
  { id: 'uniview', label: 'Uniview', url: (hp, ch, main) => `${hp}/unicast/c${ch}/s${main ? 0 : 1}/live` },
  { id: 'axis', label: 'Axis', url: (hp, _ch, main) => `${hp}/axis-media/media.amp${main ? '' : '?resolution=1280x720'}` },
  { id: 'other', label: 'Other / ONVIF (I have the RTSP address)', url: () => '' },
];

const inputCls = 'mt-1 w-full bg-black border border-neutral-700 rounded-lg px-2 py-1.5 text-neutral-100';

/**
 * The camera form both RTSP methods share: brand, address, login, channel.
 * `remote` = the address is the bar's public address / DDNS name and port.
 */
function useRtspForm(remote: boolean) {
  const [brand, setBrand] = useState('hikvision');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(remote ? '' : '554');
  const [user, setUser] = useState('admin');
  const [pass, setPass] = useState('');
  const [channel, setChannel] = useState(1);
  const [main, setMain] = useState(false);
  const [custom, setCustom] = useState('');

  const rtsp = useMemo(() => {
    if (brand === 'other') return custom.trim();
    const b = BRANDS.find((x) => x.id === brand)!;
    let host = ip.trim().replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '').replace(/^.*@/, '');
    let p = port.trim() || '554';
    const m = host.match(/^(.*):(\d{1,5})$/);
    if (m) {
      host = m[1];
      p = m[2];
    }
    if (!host) return '';
    const cred = user ? `${encodeURIComponent(user)}${pass ? `:${encodeURIComponent(pass)}` : ''}@` : '';
    return `rtsp://${cred}${b.url(`${host}:${p}`, channel, main)}`;
  }, [brand, ip, port, user, pass, channel, main, custom]);

  const fields = (
    <div className="grid sm:grid-cols-2 gap-2">
      <label className="text-xs">
        Camera brand
        <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} data-testid="rtsp-brand">
          {BRANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      {brand === 'other' ? (
        <label className="text-xs sm:col-span-2">
          RTSP address (with username and password)
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={remote ? 'rtsp://user:pass@yourbar.ddns.net:554/...' : 'rtsp://user:pass@192.168.1.64:554/...'}
            className={inputCls}
            data-testid="rtsp-custom"
          />
        </label>
      ) : (
        <>
          <label className="text-xs">
            {remote ? 'Bar’s public address or DDNS name' : 'Camera or recorder address'}
            <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder={remote ? 'yourbar.ddns.net' : '192.168.1.64'} className={inputCls} data-testid="rtsp-host" />
          </label>
          {remote && (
            <label className="text-xs">
              Port forwarded on the router
              <input value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="554" className={inputCls} data-testid="rtsp-port" />
            </label>
          )}
          <label className="text-xs">
            Username
            <input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" className={inputCls} data-testid="rtsp-user" />
          </label>
          <label className="text-xs">
            Password
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" className={inputCls} data-testid="rtsp-pass" />
          </label>
          <label className="text-xs">
            Channel (camera number on a recorder; 1 for a single camera)
            <input type="number" min={1} max={64} value={channel} onChange={(e) => setChannel(Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
          </label>
          <label className="text-xs flex items-center gap-2 mt-5">
            <input type="checkbox" checked={main} onChange={(e) => setMain(e.target.checked)} /> Sharper picture (uses more data)
          </label>
        </>
      )}
    </div>
  );
  return { rtsp, fields };
}

const MAX_CAMERAS = 16;

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-[11px] font-bold text-neutral-100 flex items-center gap-1 cursor-pointer hover:border-copper"
    >
      {done ? <Check className="w-3.5 h-3.5 text-copper" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? 'Copied' : label}
    </button>
  );
}

function Field({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(!secret);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate px-2.5 py-1.5 rounded-lg bg-black border border-neutral-800 text-[11px] text-neutral-200">
          {show ? value : '•'.repeat(18)}
        </code>
        {secret && (
          <button type="button" onClick={() => setShow((s) => !s)} className="text-[11px] text-neutral-400 underline cursor-pointer">
            {show ? 'Hide' : 'Show'}
          </button>
        )}
        <CopyButton text={value} />
      </div>
    </div>
  );
}

function PhoneSetup({ conn }: { conn: CameraConnection }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toDataURL(conn.goLiveLink, { margin: 1, width: 220, color: { dark: '#0b0b0b', light: '#f2e8dd' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [conn.goLiveLink]);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  return (
    <div className="grid sm:grid-cols-[auto,1fr] gap-4 items-start">
      {qr ? <img src={qr} alt="Go live QR code" className="w-40 h-40 rounded-lg mx-auto" /> : <div className="w-40 h-40" />}
      <div className="space-y-2 text-sm text-neutral-300">
        <ol className="list-decimal pl-4 space-y-1">
          <li>On a spare phone or tablet, scan this code with the camera app (or open the link).</li>
          <li>Tap <b>Start</b> and allow the camera.</li>
          <li>Stand it where it sees the room, plugged in, on the bar’s Wi-Fi.</li>
        </ol>
        <div className="flex flex-wrap gap-2 pt-1">
          <CopyButton text={conn.goLiveLink} label="Copy link" />
          {canShare && (
            <button
              type="button"
              onClick={() => navigator.share({ title: `Bar Tap camera: ${conn.name}`, url: conn.goLiveLink }).catch(() => undefined)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-[11px] font-bold text-neutral-100 flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" /> Send link
            </button>
          )}
        </div>
        <p className="text-[11px] text-neutral-500">Anyone with this link can stream as this camera. Only send it to staff. “New key” stops old links.</p>
      </div>
    </div>
  );
}

function KitSetup({ conn, host }: { conn: CameraConnection; host: string }) {
  const { rtsp, fields } = useRtspForm(false);

  const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
  const base = `curl -fsSL https://${host}/kit/install.sh | sudo bash -s --`;
  const command = rtsp ? `${base} add ${conn.id} ${q(rtsp)} ${q(conn.rtmpsFullUrl)}` : '';

  return (
    <div className="space-y-3 text-sm text-neutral-300">
      <p>
        For cameras or a recorder (NVR/DVR) with RTSP. You need one always-on computer at the bar on the same network: a Raspberry Pi
        (about $60) or any spare PC with Linux. It sends the video out, so nothing is opened on the bar’s router.
      </p>
      {fields}
      <p className="text-[11px] text-neutral-500">
        The camera password stays on this screen and the bar’s computer. Bar Tap never saves it.
      </p>
      {command ? (
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-neutral-200">On the bar’s computer, open Terminal, paste this and press Enter:</div>
          <div className="flex items-start gap-2">
            <code className="flex-1 min-w-0 break-all px-2.5 py-2 rounded-lg bg-black border border-neutral-800 text-[11px] text-neutral-200" data-testid="kit-command">
              {command.replace(/:\/\/([^:@/]+):([^@]+)@/, '://$1:••••@')}
            </code>
            <CopyButton text={command} />
          </div>
          <p className="text-[11px] text-neutral-500">It installs the free Bar Tap camera kit, takes the video only (never the sound) and starts by itself after a power cut.</p>
        </div>
      ) : (
        <p className="text-xs text-neutral-500">Fill in the camera address to get the command.</p>
      )}
      <details className="text-xs text-neutral-400">
        <summary className="cursor-pointer">Don’t know the camera’s address?</summary>
        <p className="mt-1">Run this on the bar’s computer and it lists the cameras it can find:</p>
        <div className="flex items-start gap-2 mt-1">
          <code className="flex-1 break-all px-2.5 py-2 rounded-lg bg-black border border-neutral-800 text-[11px]">{`${base} find`}</code>
          <CopyButton text={`${base} find`} />
        </div>
        <p className="mt-1">Also make sure RTSP is turned on in the camera or recorder’s settings (often under Network, then Advanced or Ports).</p>
      </details>
    </div>
  );
}

function DirectSetup({ conn, barId, onSaved }: { conn: CameraConnection; barId: string; onSaved: () => void }) {
  const { rtsp, fields } = useRtspForm(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<SavePullResult | null>(null);

  const send = async (url: string) => {
    setBusy(true);
    setErr('');
    setResult(null);
    try {
      setResult(await saveDirectCamera(barId, conn.id, url));
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 text-sm text-neutral-300" data-testid="direct-setup">
      <p>
        <b>No extra box.</b> Bar Tap’s server connects to the cameras or recorder (NVR/DVR) the bar already has, over the internet, using
        RTSP. It needs one change on the bar’s router: forward one port to the recorder.
      </p>
      {conn.direct && (
        <div className="p-2.5 rounded-lg bg-black border border-neutral-800 text-xs flex flex-wrap items-center justify-between gap-2" data-testid="direct-saved">
          <span className="break-all">
            Now using: <code>{conn.direct}</code>
          </span>
          <button type="button" disabled={busy} onClick={() => send('')} className="px-2.5 py-1 rounded-lg border border-neutral-700 text-neutral-200 cursor-pointer" data-testid="direct-stop">
            Stop
          </button>
        </div>
      )}
      <ol className="list-decimal pl-5 space-y-1 text-xs text-neutral-400">
        <li>In the recorder or camera settings, turn RTSP on (often under Network, then Advanced or Ports) and make a view-only user with a strong password just for Bar Tap.</li>
        <li>
          On the bar’s router, forward one TCP port to the recorder’s local address, port 554. Using a different outside number (for example 8554 → 554) cuts down on
          junk traffic.
        </li>
        <li>Find the bar’s public address. If the internet company changes it, use a free DDNS name (many recorders have DDNS built in, or use DuckDNS).</li>
        <li>Fill in the boxes below and tap Save. The server tests the port right away.</li>
      </ol>
      {fields}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!rtsp || busy}
          onClick={() => send(rtsp)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-copper text-ink disabled:opacity-40 cursor-pointer flex items-center gap-1"
          data-testid="direct-save"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save and connect
        </button>
        {rtsp && <code className="text-[11px] text-neutral-500 break-all">{rtsp.replace(/:\/\/([^:@/]+):([^@]+)@/, '://$1:••••@')}</code>}
      </div>
      {err && <p className="text-xs text-amber-300" data-testid="direct-error">{err}</p>}
      {result?.direct && (
        <p className={`text-xs ${result.reachable ? 'text-emerald-300' : 'text-amber-300'}`} data-testid="direct-result">
          {result.reachable
            ? `Saved. Bar Tap’s server reached ${result.checked}. The picture shows up within about 30 seconds if the username, password and channel are right.`
            : `Saved, but Bar Tap’s server could not reach ${result.checked}. Check the port forward and the address. Some internet plans (shared or cellular connections) block this; if so, use the “Security cameras + small computer” option instead.`}
          {result.problem ? ` It won’t stream yet: ${result.problem}.` : ''}
        </p>
      )}
      <p className="text-[11px] text-neutral-500">
        The camera password is kept only on Bar Tap’s video server, which needs it to connect. It is never stored in the app’s database or shown again. Opening a port puts the
        recorder on the internet, so use the view-only user and keep the recorder’s software up to date. If the bar has a spare computer, the other option opens nothing.
      </p>
    </div>
  );
}

function CloudCameraHelp({ onPick }: { onPick: (m: Method) => void }) {
  return (
    <div className="space-y-3 text-sm text-neutral-300" data-testid="cloud-help">
      <p>
        Ring, newer Google Nest cameras and many Wyze cameras send video only to their own app and cloud. They don’t give an RTSP address, so Bar Tap can’t connect to them
        directly, and it never signs in to those accounts.
      </p>
      <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-400">
        <li>
          <b>Check for an RTSP setting first.</b> Some models (a few Wyze cameras, for example) can turn RTSP on. If yours shows an RTSP address, use{' '}
          <button type="button" className="underline cursor-pointer" onClick={() => onPick('kit')}>Security cameras + small computer</button> or{' '}
          <button type="button" className="underline cursor-pointer" onClick={() => onPick('direct')}>Straight from the recorder</button>.
        </li>
        <li>
          <b>Use a phone or tablet the bar already has.</b> An old phone on a stand, plugged in, works as a camera with no app to install.{' '}
          <button type="button" className="underline cursor-pointer" onClick={() => onPick('phone')}>Set up a phone</button>
        </li>
        <li>
          <b>Add one RTSP camera</b> just for Bar Tap (most Reolink, Amcrest, Hikvision, Dahua and similar cameras have RTSP) and connect it like any other security camera.
        </li>
      </ul>
    </div>
  );
}

function AppSetup({ conn }: { conn: CameraConnection }) {
  return (
    <div className="space-y-3 text-sm text-neutral-300">
      <p>
        For a recorder or camera with an <b>RTMP</b> setting, or a streaming app such as Larix Broadcaster (free) or OBS. Paste these two
        boxes into its settings. Turn the app’s sound off; Bar Tap removes any sound anyway.
      </p>
      <Field label="Server (RTMPS, encrypted)" value={conn.rtmpsServer} />
      <Field label="Stream key" value={conn.rtmpStreamKey} secret />
      <details className="text-xs text-neutral-400">
        <summary className="cursor-pointer">Device only takes one full address, or can’t do RTMPS?</summary>
        <div className="space-y-2 mt-2">
          <Field label="Full address (RTMPS)" value={conn.rtmpsFullUrl} secret />
          <Field label="Full address (plain RTMP, older recorders only)" value={conn.rtmpFullUrl} secret />
        </div>
      </details>
    </div>
  );
}

export const CameraSetupPanel: React.FC<CameraSetupPanelProps> = ({ bar, onCamerasChange }) => {
  const status = useRelayStatus(bar.id, 5000);
  const [keys, setKeys] = useState<CameraKeysResult | null>(null);
  const [keysError, setKeysError] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [openCam, setOpenCam] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>('phone');
  const [newName, setNewName] = useState('');
  const cameras = bar.cameras || [];
  const signage = bar.cameraPrivacy?.signageConfirmed === true;
  const uid = auth.currentUser?.uid || '';
  const camerasKey = cameras.map((c) => `${c.id}:${c.keyVersion || 0}`).join(',');

  const loadKeys = useCallback(async () => {
    setKeysError('');
    try {
      setKeys(await fetchCameraKeys(bar.id));
    } catch (e) {
      setKeysError((e as Error).message);
    }
  }, [bar.id]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys, camerasKey]);

  const save = async (label: string, changes: Parameters<typeof saveCameraSettings>[2]) => {
    if (!uid) return setError('Sign in first.');
    setBusy(label);
    setError('');
    try {
      await saveCameraSettings(uid, bar.id, changes);
      if (changes.cameras) onCamerasChange?.(changes.cameras);
    } catch (e) {
      const msg = (e as Error).message || '';
      setError(
        /permission/i.test(msg)
          ? 'Permission denied. If this bar was never copied to the database, tap Admin, then “Copy built-in bars to Firestore”. Also publish the newest firestore.rules.'
          : msg
      );
    } finally {
      setBusy('');
    }
  };

  const setCam = (id: string, patch: Partial<CameraAngle>) =>
    save(`cam-${id}`, { cameras: cameras.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const addCamera = () => {
    const name = newName.trim();
    if (!name || cameras.length >= MAX_CAMERAS) return;
    const id = `${bar.id.slice(0, 40)}-cam-${Date.now().toString(36)}`;
    const cam: CameraAngle = {
      id,
      name,
      locationLabel: name,
      viewType: 'main_bar',
      fps: 30,
      crowdLevel: 0,
      status: 'LIVE',
      resolution: 'HD',
      keyVersion: 0,
      cloudRelay: {
        streamUrl: `/relay/rtc/bar/${bar.id}/${id}`,
        ingestProtocol: 'RTMPS / WebRTC',
        edgeNode: 'Bar Tap relay',
        relayStatus: 'ACTIVE',
        bitrateKbps: 1500,
        latencyMs: 500,
        packetLossPercent: 0,
      },
    };
    setNewName('');
    setOpenCam(id);
    save('add', { cameras: [...cameras, cam] });
  };

  const liveCount = cameras.filter((c) => status.cameras[c.id]?.live).length;

  return (
    <div className="space-y-4" data-testid="camera-setup">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-neutral-100 flex items-center gap-2">
            <Video className="w-4 h-4 text-copper" /> Live cameras
          </h3>
          <p className="text-xs text-neutral-400">
            {liveCount} of {cameras.length} live now{!status.reachable ? ' · relay server not reachable' : ''}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <MicOff className="w-3.5 h-3.5" /> Video only, never sound. Nothing is recorded.
        </span>
      </div>

      {/* Patron privacy */}
      <label
        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
          signage ? 'border-copper/40 bg-copper/10' : 'border-amber-500/50 bg-amber-500/10'
        }`}
      >
        <input
          type="checkbox"
          className="mt-1"
          checked={signage}
          disabled={busy === 'privacy'}
          data-testid="signage-checkbox"
          onChange={(e) =>
            save('privacy', {
              cameraPrivacy: {
                signageConfirmed: e.target.checked,
                confirmedBy: auth.currentUser?.email || uid,
                confirmedAt: new Date().toISOString(),
              },
            })
          }
        />
        <span className="text-xs text-neutral-200">
          <span className="font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-copper" /> We post clear signs at the entrance saying the room is shown live on Bar Tap.
          </span>
          <span className="block text-neutral-400 mt-0.5">
            Cameras only cover public areas (never restrooms, staff rooms or card terminals). Bar Tap sends video only, with no sound. Cameras
            can’t go live until this is ticked.
          </span>
        </span>
      </label>

      {keysError && (
        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200" data-testid="keys-error">
          {keysError}
        </div>
      )}
      {error && <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-xs text-red-200">{error}</div>}

      <div className="space-y-2">
        {cameras.map((cam) => {
          const st = status.cameras[cam.id];
          const on = cam.status !== 'STANDBY';
          const conn = keys?.cameras.find((k) => k.id === cam.id);
          const open = openCam === cam.id;
          return (
            <div key={cam.id} className="rounded-xl border border-neutral-800 bg-neutral-950/70" data-testid={`camera-row-${cam.id}`}>
              <div className="flex flex-wrap items-center gap-2 p-3">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    st?.live ? 'bg-copper text-ink' : 'bg-neutral-800 text-neutral-400'
                  }`}
                  data-testid="camera-state"
                >
                  {st?.live ? <Radio className="w-3 h-3" /> : null}
                  {st?.live ? 'Live' : on ? 'Offline' : 'Turned off'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-100 truncate">{cam.name}</div>
                  <div className="text-[11px] text-neutral-500">
                    {st?.live
                      ? `${st.viewers} watching · ${st.video || 'video'}${st.video === 'H265' ? ' (set the camera to H.264 so every phone can play it)' : ''}`
                      : on
                        ? 'Waiting for video'
                        : 'Viewers see “Camera turned off”'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCam(cam.id, { status: on ? 'STANDBY' : 'LIVE' })}
                  disabled={busy === `cam-${cam.id}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    on ? 'bg-copper text-ink' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                  }`}
                  data-testid="camera-power"
                >
                  <Power className="w-3.5 h-3.5" /> {on ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenCam(open ? null : cam.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-neutral-700 text-neutral-200 cursor-pointer hover:border-copper"
                  data-testid="camera-connect"
                >
                  {open ? 'Close' : 'Connect'}
                </button>
              </div>

              {open && (
                <div className="border-t border-neutral-800 p-3 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['phone', 'Phone or tablet', Smartphone],
                        ['kit', 'Security cameras + small computer', Monitor],
                        ['direct', 'Straight from the recorder', Globe],
                        ['app', 'Streaming app or RTMP', Radio],
                        ['cloud', 'Ring / Nest / Wyze', Cloud],
                      ] as const
                    ).map(([id, label, Icon]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMethod(id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          method === id ? 'bg-copper text-ink' : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </button>
                    ))}
                  </div>
                  {!signage && <p className="text-xs text-amber-300">Tick the signage box above first, or the camera won’t be let in.</p>}
                  {!on && <p className="text-xs text-amber-300">This camera is turned off. Turn it on to stream.</p>}
                  {!conn ? (
                    <div className="text-xs text-neutral-400 flex items-center gap-2">
                      {keysError ? 'Connection details are unavailable until the relay server answers.' : <><Loader2 className="w-4 h-4 animate-spin" /> Getting connection details…</>}
                    </div>
                  ) : method === 'phone' ? (
                    <PhoneSetup conn={conn} />
                  ) : method === 'kit' ? (
                    <KitSetup conn={conn} host={keys!.host} />
                  ) : method === 'direct' ? (
                    <DirectSetup conn={conn} barId={bar.id} onSaved={loadKeys} />
                  ) : method === 'cloud' ? (
                    <CloudCameraHelp onPick={setMethod} />
                  ) : (
                    <AppSetup conn={conn} />
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Make a new key? The old link, command and stream key stop working within seconds.')) {
                          setCam(cam.id, { keyVersion: (cam.keyVersion || 0) + 1 });
                        }
                      }}
                      className="text-xs text-neutral-300 flex items-center gap-1 underline cursor-pointer"
                      data-testid="camera-newkey"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> New key
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove “${cam.name}” from Bar Tap?`)) {
                          save('remove', { cameras: cameras.filter((c) => c.id !== cam.id) });
                        }
                      }}
                      className="text-xs text-red-300 underline cursor-pointer"
                    >
                      Remove camera
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {cameras.length === 0 && <p className="text-xs text-neutral-500">No cameras yet. Add one below.</p>}
      </div>

      {cameras.length < MAX_CAMERAS && (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCamera()}
            placeholder="New camera name, like Main bar or Patio"
            className="flex-1 bg-black border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100"
            data-testid="camera-new-name"
          />
          <button
            type="button"
            onClick={addCamera}
            disabled={!newName.trim() || busy === 'add'}
            className="px-4 py-2 rounded-lg bg-copper text-ink font-black text-sm cursor-pointer disabled:opacity-50"
            data-testid="camera-add"
          >
            Add camera
          </button>
        </div>
      )}
    </div>
  );
};
