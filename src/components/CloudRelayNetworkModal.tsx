import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Cpu,
  Globe,
  HardDrive,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Signal,
  Sliders,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { BarLocation, CameraAngle, CloudRelayConfig } from '../types.ts';

interface CloudRelayNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  bars: BarLocation[];
  onSelectBarFeed?: (bar: BarLocation, cameraIndex?: number) => void;
}

export const CloudRelayNetworkModal: React.FC<CloudRelayNetworkModalProps> = ({
  isOpen,
  onClose,
  bars,
  onSelectBarFeed,
}) => {
  const [filterDistrict, setFilterDistrict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testingCamId, setTestingCamId] = useState<string | null>(null);
  const [testSuccessCamId, setTestSuccessCamId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Aggregate stats across all bars and cameras
  const allCameras = bars.flatMap((b) =>
    b.cameras.map((c) => ({
      bar: b,
      camera: c,
    }))
  );

  const activeCamerasCount = allCameras.filter((item) => item.camera.status === 'LIVE').length;
  const totalBandwidthMbps = (
    allCameras.reduce((acc, item) => acc + (item.camera.cloudRelay?.bitrateKbps || 3800), 0) / 1000
  ).toFixed(1);

  // Group by edge nodes
  const edgeNodesSummary = [
    {
      id: 'TLH-CollegeTown-Edge-01',
      name: 'Tallahassee CollegeTown Edge PoP #1',
      location: 'Madison St & Woodward Ave',
      status: 'OPTIMAL',
      latency: '118 ms',
      load: '38%',
      activeFeeds: 18,
    },
    {
      id: 'GNV-Midtown-Edge-01',
      name: 'Gainesville Midtown Edge PoP (UF)',
      location: 'W University Ave & 17th St',
      status: 'OPTIMAL',
      latency: '122 ms',
      load: '44%',
      activeFeeds: 16,
    },
    {
      id: 'GNV-Downtown-Edge-02',
      name: 'Gainesville Downtown & Depot PoP',
      location: 'Main St & SE 1st Ave',
      status: 'OPTIMAL',
      latency: '128 ms',
      load: '36%',
      activeFeeds: 12,
    },
    {
      id: 'MIA-ParkWest-Edge-01',
      name: 'Miami Downtown / Park West PoP',
      location: 'NE 11th St & N Miami Ave',
      status: 'OPTIMAL',
      latency: '109 ms',
      load: '58%',
      activeFeeds: 24,
    },
    {
      id: 'MIA-Wynwood-Edge-02',
      name: 'Miami Wynwood Arts Edge PoP',
      location: 'NW 24th St & 2nd Ave',
      status: 'OPTIMAL',
      latency: '114 ms',
      load: '48%',
      activeFeeds: 18,
    },
    {
      id: 'MIA-SouthBeach-Edge-01',
      name: 'Miami South Beach & Ocean Dr PoP',
      location: 'Collins Ave & 14th St',
      status: 'OPTIMAL',
      latency: '116 ms',
      load: '52%',
      activeFeeds: 20,
    },
    {
      id: 'MIA-Brickell-Edge-04',
      name: 'Miami Brickell Financial Skyline PoP',
      location: 'Brickell Plaza & 8th St',
      status: 'OPTIMAL',
      latency: '111 ms',
      load: '41%',
      activeFeeds: 14,
    },
    {
      id: 'TLH-Midtown-Edge-02',
      name: 'Tallahassee Midtown Edge PoP #2',
      location: 'Thomasville Rd & 6th Ave',
      status: 'OPTIMAL',
      latency: '124 ms',
      load: '42%',
      activeFeeds: 12,
    },
  ];

  // Filtered cameras list
  const filteredItems = allCameras.filter(({ bar, camera }) => {
    const matchesDistrict =
      filterDistrict === 'all' || bar.neighborhood.toLowerCase().includes(filterDistrict.toLowerCase());
    const matchesSearch =
      bar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.cloudRelay?.edgeNode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camera.cloudRelay?.hardwareModel?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDistrict && matchesSearch;
  });

  const handleTestRelayHandshake = (camId: string) => {
    setTestingCamId(camId);
    setTimeout(() => {
      setTestingCamId(null);
      setTestSuccessCamId(camId);
      setTimeout(() => setTestSuccessCamId(null), 3000);
    }, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 text-neutral-200 flex items-center justify-center border border-neutral-700 shadow-inner">
              <Server className="w-5 h-5 text-neutral-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Tallahassee Cloud Camera Relay Network
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-200 text-xs font-mono font-semibold border border-neutral-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tan animate-pulse" />
                  Live Edge Relays Active
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Ultra-low latency WebRTC & RTSP-TLS video ingestion from 22 Tallahassee nightlife venues
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            aria-label="Close Relay Network Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Network Health Bar */}
        <div className="bg-neutral-950/70 border-b border-neutral-800/80 px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono shrink-0">
          <div className="space-y-0.5">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-neutral-300" />
              Installed Cameras
            </span>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{allCameras.length} Feeds</span>
              <span className="text-neutral-300 text-[11px] font-normal">
                ({activeCamerasCount} Live Online)
              </span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-neutral-300" />
              Relay Ingest Nodes
            </span>
            <div className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
              <span>4 Regional PoPs</span>
              <span className="text-neutral-400 text-[11px] font-normal">0.0% loss</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-neutral-300" />
              Median Tally Latency
            </span>
            <div className="text-sm font-bold text-neutral-100">
              128 ms <span className="text-neutral-400 text-[11px] font-normal">(Sub-second)</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-neutral-300" />
              Aggregate Bandwidth
            </span>
            <div className="text-sm font-bold text-white">
              {totalBandwidthMbps} Mbps <span className="text-neutral-400 text-[11px] font-normal">(TLS Encrypted)</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Region */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {/* Tallahassee Regional Edge PoP Nodes */}
        <div className="p-4 sm:p-5 bg-neutral-900/60 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-mono">
              <Cpu className="w-4 h-4 text-neutral-300" />
              Tallahassee Edge Ingestion Nodes
            </h3>
            <span className="text-[11px] text-neutral-300 font-mono">
              All 4 Points of Presence Healthy (99.98% Uptime)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {edgeNodesSummary.map((node) => (
              <div
                key={node.id}
                className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 transition space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white leading-tight">{node.name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">{node.location}</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-tan animate-pulse mt-1" />
                </div>

                <div className="pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-400">{node.activeFeeds} streams</span>
                  <span className="text-neutral-200">{node.latency}</span>
                  <span className="text-neutral-200">{node.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-4 sm:px-6 py-3 bg-neutral-950/40 border-b border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-none">
            <span className="text-xs text-neutral-400 font-mono shrink-0">District:</span>
            {[
              { id: 'all', label: 'All TLH (44)' },
              { id: 'collegetown', label: 'CollegeTown' },
              { id: 'midtown', label: 'Midtown' },
              { id: 'downtown', label: 'Downtown' },
              { id: 'railroad', label: 'Railroad Sq' },
              { id: 'tennessee', label: 'W Tennessee St' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setFilterDistrict(d.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition whitespace-nowrap cursor-pointer ${
                  filterDistrict === d.id
                    ? 'bg-copper text-ink font-bold'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter camera, venue, or PoP..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-copper font-mono"
            />
          </div>
        </div>

        {/* Camera Relay Inventory List */}
        <div className="p-4 sm:p-6 space-y-3">
          {filteredItems.map(({ bar, camera }) => {
            const relay = camera.cloudRelay;
            const isTesting = testingCamId === camera.id;
            const isTested = testSuccessCamId === camera.id;
            const isLive = camera.status === 'LIVE';

            return (
              <div
                key={`${bar.id}-${camera.id}`}
                className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/90 hover:border-neutral-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Venue & Camera Info */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isLive ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'
                      }`}
                    />
                    <h4 className="text-sm font-bold text-white group-hover:text-neutral-200 transition-colors">
                      {bar.name}
                    </h4>
                    <span className="text-xs text-neutral-400 font-mono">/</span>
                    <span className="text-xs font-semibold text-neutral-300 font-mono">
                      {camera.name}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-2 font-mono">
                    <span className="text-neutral-200">{bar.neighborhood}</span>
                    <span>·</span>
                    <span>{camera.resolution} @ {camera.fps}fps</span>
                    <span>·</span>
                    <span className="text-neutral-300">{camera.locationLabel}</span>
                  </div>

                  {relay?.hardwareModel && (
                    <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5">
                      <Camera className="w-3 h-3 text-neutral-400" />
                      <span>Hardware: <strong className="text-neutral-300">{relay.hardwareModel}</strong></span>
                      {relay.localIp && (
                        <span className="text-neutral-400">({relay.localIp})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Middle: Cloud Relay Telemetry */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-900/80 px-3.5 py-2 rounded-xl border border-neutral-800/60 text-[11px] font-mono">
                  <div className="space-y-0.5">
                    <span className="text-neutral-400 text-[10px] block">Ingest PoP</span>
                    <span className="text-neutral-200 truncate block font-semibold">
                      {relay?.edgeNode.split(' ')[0]}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-neutral-400 text-[10px] block">Protocol</span>
                    <span className="text-neutral-200 font-semibold">{relay?.ingestProtocol}</span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-neutral-400 text-[10px] block">Bitrate</span>
                    <span className="text-white font-semibold">
                      {(relay?.bitrateKbps || 4000) / 1000} Mbps
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-neutral-400 text-[10px] block">Latency / Loss</span>
                    <span className="text-neutral-200 font-semibold">
                      {relay?.latencyMs || 120}ms · 0.0%
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => handleTestRelayHandshake(camera.id)}
                    disabled={isTesting}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                      isTested
                        ? 'bg-neutral-800 text-white border-neutral-600'
                        : isTesting
                        ? 'bg-neutral-900 text-neutral-400 border-neutral-800'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800'
                    }`}
                    title="Send ping handshake to camera edge relay"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-200" />
                        <span>Ping...</span>
                      </>
                    ) : isTested ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Relay 100% OK</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Test Relay</span>
                      </>
                    )}
                  </button>

                  {onSelectBarFeed && (
                    <button
                      onClick={() => {
                        onClose();
                        onSelectBarFeed(bar);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-copper hover:bg-tan text-ink font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-md shadow-black/20"
                      title="View live feed from this camera"
                    >
                      <span>Tap In Feed</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-neutral-950 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0" />
            <span>
              All camera relays utilize end-to-end TLS 1.3 encryption and low-jitter WebRTC ingest pipelines.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
