import React, { useState } from 'react';
import {
  Activity,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Crown,
  DollarSign,
  Edit3,
  Eye,
  EyeOff,
  Flame,
  Music,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Save,
  Server,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  Users,
  Video,
  Wifi,
  X,
} from 'lucide-react';
import { BarLocation, CameraAngle, CloudRelayConfig, DrinkSpecial } from '../types.ts';

interface BarOwnerPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  bars: BarLocation[];
  onUpdateBar: (updatedBar: BarLocation) => void;
  defaultBarId?: string;
  onOpenBusinessPlatform?: () => void;
}

export const BarOwnerPortalModal: React.FC<BarOwnerPortalModalProps> = ({
  isOpen,
  onClose,
  bars,
  onUpdateBar,
  defaultBarId,
  onOpenBusinessPlatform,
}) => {
  const [selectedBarId, setSelectedBarId] = useState<string>(
    defaultBarId || bars[0]?.id || 'hub-at-feather-oaks'
  );

  const selectedBar = bars.find((b) => b.id === selectedBarId) || bars[0];

  // Editable fields local state
  const [activeTab, setActiveTab] = useState<'deals' | 'cameras' | 'hours_events'>('deals');
  const [hoursToday, setHoursToday] = useState(selectedBar.hoursToday);
  const [coverCharge, setCoverCharge] = useState(selectedBar.coverCharge);
  const [currentDJsBand, setCurrentDJsBand] = useState(selectedBar.currentDJsBand || '');
  const [crowdDensity, setCrowdDensity] = useState(selectedBar.crowdDensity);
  const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState(
    selectedBar.estimatedWaitMinutes
  );
  const [cameras, setCameras] = useState<CameraAngle[]>(selectedBar.cameras);
  const [drinkSpecials, setDrinkSpecials] = useState<DrinkSpecial[]>(selectedBar.drinkSpecials);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New deal form state
  const [showAddDealForm, setShowAddDealForm] = useState(false);
  const [newDealTitle, setNewDealTitle] = useState('');
  const [newDealDesc, setNewDealDesc] = useState('');
  const [newDealPrice, setNewDealPrice] = useState('$5.00');
  const [newDealCategory, setNewDealCategory] = useState<DrinkSpecial['category']>('happy_hour');
  const [newDealDay, setNewDealDay] = useState('Tonight Only');
  const [newDealIsHH, setNewDealIsHH] = useState(true);

  if (!isOpen || !selectedBar) return null;

  // Switch managed bar
  const handleSelectBar = (id: string) => {
    const b = bars.find((x) => x.id === id);
    if (!b) return;
    setSelectedBarId(id);
    setHoursToday(b.hoursToday);
    setCoverCharge(b.coverCharge);
    setCurrentDJsBand(b.currentDJsBand || '');
    setCrowdDensity(b.crowdDensity);
    setEstimatedWaitMinutes(b.estimatedWaitMinutes);
    setCameras(b.cameras);
    setDrinkSpecials(b.drinkSpecials);
    setShowAddDealForm(false);
  };

  // Camera toggle on/off
  const handleToggleCamera = (camId: string) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id === camId) {
          const nextStatus = c.status === 'LIVE' ? 'STANDBY' : 'LIVE';
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  // Camera rename
  const handleRenameCamera = (camId: string, newName: string) => {
    setCameras((prev) =>
      prev.map((c) => (c.id === camId ? { ...c, name: newName } : c))
    );
  };

  // Cloud Relay Management
  const [testingRelayCamId, setTestingRelayCamId] = useState<string | null>(null);
  const [testedSuccessCamId, setTestedSuccessCamId] = useState<string | null>(null);
  const [expandedRelayCamId, setExpandedRelayCamId] = useState<string | null>(null);

  const handleUpdateRelay = (camId: string, updates: Partial<CloudRelayConfig>) => {
    setCameras((prev) =>
      prev.map((c) => {
        if (c.id === camId) {
          return {
            ...c,
            cloudRelay: {
              ...c.cloudRelay,
              ...updates,
            },
          };
        }
        return c;
      })
    );
  };

  const handleTestRelay = (camId: string) => {
    setTestingRelayCamId(camId);
    setTimeout(() => {
      setTestingRelayCamId(null);
      setTestedSuccessCamId(camId);
      setTimeout(() => setTestedSuccessCamId(null), 3000);
    }, 850);
  };

  // Delete special
  const handleDeleteSpecial = (specialId: string) => {
    setDrinkSpecials((prev) => prev.filter((s) => s.id !== specialId));
  };

  // Add new special
  const handleAddNewSpecial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealTitle.trim()) return;

    const newSpecial: DrinkSpecial = {
      id: `sp-${Date.now()}`,
      title: newDealTitle.trim(),
      description: newDealDesc.trim(),
      price: newDealPrice.trim(),
      category: newDealCategory,
      day: newDealDay.trim(),
      isHappyHour: newDealIsHH,
      happyHourStart: '16:00',
      happyHourEnd: '19:00',
      featured: true,
    };

    setDrinkSpecials((prev) => [newSpecial, ...prev]);
    setNewDealTitle('');
    setNewDealDesc('');
    setShowAddDealForm(false);
  };

  // Commit all changes to app state
  const handleSaveAllChanges = () => {
    const updated: BarLocation = {
      ...selectedBar,
      hoursToday,
      coverCharge,
      currentDJsBand: currentDJsBand.trim() || undefined,
      crowdDensity,
      estimatedWaitMinutes,
      cameras,
      drinkSpecials,
    };

    onUpdateBar(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-7 text-neutral-100 max-h-[94dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              <Shield className="w-4 h-4 text-neutral-300" />
              Bar Tap Partner · Venue Management Suite
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Bar Owner Control Center
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Manage your live camera feeds, publish drink specials, and update tonight’s entertainment & hours.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenBusinessPlatform && (
              <button
                onClick={onOpenBusinessPlatform}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-copper hover:bg-tan text-ink font-bold text-xs transition shadow-md shadow-black/20 cursor-pointer"
              >
                <span>Full Business Suite</span>
                <span>→</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Close Owner Portal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Venue Selector Bar */}
        <div className="py-3 px-4 bg-neutral-950/80 rounded-2xl border border-neutral-800 my-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-300 whitespace-nowrap">
              Select Your Venue:
            </span>
            <select
              value={selectedBarId}
              onChange={(e) => handleSelectBar(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-copper cursor-pointer"
            >
              {bars.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.neighborhood})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[11px] font-bold">
              ✓ Verified Owner Account
            </span>
          </div>
        </div>

        {/* Sub-Tabs: Deals, Cameras, Hours & Events */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 mb-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('deals')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'deals'
                ? 'bg-copper text-ink font-bold shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Manage Deals & Specials ({drinkSpecials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cameras')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cameras'
                ? 'bg-copper text-ink font-bold shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Controls ({cameras.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('hours_events')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'hours_events'
                ? 'bg-copper text-ink font-bold shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hours, Events & Door Wait</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: DEALS & SPECIALS */}
          {activeTab === 'deals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Active Featured Deals</h3>
                  <p className="text-xs text-neutral-400">
                    Control the specials displayed to thousands of Tallahassee patrons.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddDealForm(!showAddDealForm)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-bold text-xs rounded-xl border border-neutral-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddDealForm ? 'Cancel' : 'Add New Special'}</span>
                </button>
              </div>

              {/* Add Special Form Drawer */}
              {showAddDealForm && (
                <form
                  onSubmit={handleAddNewSpecial}
                  className="p-4 rounded-2xl bg-neutral-950 border border-neutral-700 space-y-3 animate-fade-in"
                >
                  <div className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    New Venue Special / Offer
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300">Special Title</label>
                      <input
                        type="text"
                        required
                        value={newDealTitle}
                        onChange={(e) => setNewDealTitle(e.target.value)}
                        placeholder="e.g. $4 Draft Pints & Free Nachos"
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-copper"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300">Price Display</label>
                      <input
                        type="text"
                        value={newDealPrice}
                        onChange={(e) => setNewDealPrice(e.target.value)}
                        placeholder="e.g. $5.00 or Free w/ Pitcher"
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-copper"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-neutral-300">Offer Description</label>
                    <input
                      type="text"
                      value={newDealDesc}
                      onChange={(e) => setNewDealDesc(e.target.value)}
                      placeholder="Details of the special pour or food pairing"
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-copper"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300">Category</label>
                      <select
                        value={newDealCategory}
                        onChange={(e) =>
                          setNewDealCategory(e.target.value as DrinkSpecial['category'])
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                      >
                        <option value="happy_hour">Happy Hour</option>
                        <option value="beer">Draft Beer</option>
                        <option value="cocktail">Cocktail</option>
                        <option value="shots">Shots & Wells</option>
                        <option value="package">Package / Wristband</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-300">Active Day</label>
                      <input
                        type="text"
                        value={newDealDay}
                        onChange={(e) => setNewDealDay(e.target.value)}
                        placeholder="e.g. Thursdays, Mon-Fri"
                        className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="isHHCheck"
                        checked={newDealIsHH}
                        onChange={(e) => setNewDealIsHH(e.target.checked)}
                        className="accent-copper cursor-pointer"
                      />
                      <label htmlFor="isHHCheck" className="text-xs text-neutral-300 cursor-pointer">
                        Happy Hour Flag
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddDealForm(false)}
                      className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-copper hover:bg-tan text-ink font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      Publish Deal
                    </button>
                  </div>
                </form>
              )}

              {/* Current Deals List */}
              <div className="space-y-2">
                {drinkSpecials.map((spec) => (
                  <div
                    key={spec.id}
                    className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{spec.title}</span>
                        {spec.price && (
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-100 font-mono text-[11px] font-bold">
                            {spec.price}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400 font-mono">({spec.day})</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                        {spec.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteSpecial(spec.id)}
                      className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-900 transition cursor-pointer"
                      title="Remove Deal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CAMERAS & CLOUD RELAYS */}
          {activeTab === 'cameras' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-neutral-300" />
                    <span>Live Camera Angles & Cloud Relays</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Configure installed camera hardware, edge relay nodes, and stream broadcasting status.
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-200 font-mono text-[11px] border border-neutral-700 flex items-center gap-1.5 self-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-tan animate-pulse" />
                  <span>PoP Edge Active</span>
                </div>
              </div>

              <div className="space-y-3">
                {cameras.map((cam) => {
                  const isOnline = cam.status === 'LIVE';
                  const isTesting = testingRelayCamId === cam.id;
                  const isTested = testedSuccessCamId === cam.id;
                  const isExpanded = expandedRelayCamId === cam.id;
                  const relay = cam.cloudRelay;

                  return (
                    <div
                      key={cam.id}
                      className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden transition"
                    >
                      {/* Main Camera Bar */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                              isOnline
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                            }`}
                          >
                            <Camera className="w-5 h-5" />
                          </div>

                          <div className="space-y-1">
                            <input
                              type="text"
                              value={cam.name}
                              onChange={(e) => handleRenameCamera(cam.id, e.target.value)}
                              className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-neutral-700 focus:border-copper focus:outline-none"
                            />
                            <div className="text-[11px] text-neutral-400 font-mono flex flex-wrap items-center gap-2">
                              <span>{cam.locationLabel}</span>
                              <span>·</span>
                              <span>{cam.resolution}</span>
                              <span>·</span>
                              <span
                                className={`font-bold ${
                                  isOnline ? 'text-neutral-100' : 'text-neutral-500'
                                }`}
                              >
                                {isOnline ? '● BROADCASTING' : '○ STANDBY'}
                              </span>
                              <span>·</span>
                              <span className="text-neutral-300">
                                {relay?.edgeNode.split(' ')[0] || 'TLH-Edge-01'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRelayCamId(isExpanded ? null : cam.id)
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer flex items-center gap-1.5 border ${
                              isExpanded
                                ? 'bg-neutral-800 text-white border-neutral-600'
                                : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-800'
                            }`}
                          >
                            <Cpu className="w-3.5 h-3.5" />
                            <span>Relay Settings</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleCamera(cam.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                              isOnline
                                ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30'
                                : 'bg-copper hover:bg-tan text-ink border border-white'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{isOnline ? 'Turn Off Feed' : 'Broadcast Live'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable Cloud Relay Configuration Drawer */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-neutral-900 bg-neutral-950/80 space-y-3 font-mono text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-neutral-400 text-[11px] flex items-center gap-1">
                                <Server className="w-3 h-3 text-neutral-300" />
                                Regional Edge Ingest Node
                              </label>
                              <select
                                value={relay?.edgeNode}
                                onChange={(e) =>
                                  handleUpdateRelay(cam.id, { edgeNode: e.target.value })
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                              >
                                <option value="TLH-CollegeTown-Edge-01 (Madison St PoP)">
                                  TLH-CollegeTown-Edge-01 (Madison St PoP)
                                </option>
                                <option value="TLH-Midtown-Edge-02 (Thomasville Rd PoP)">
                                  TLH-Midtown-Edge-02 (Thomasville Rd PoP)
                                </option>
                                <option value="TLH-Capitol-Edge-01 (Downtown PoP)">
                                  TLH-Capitol-Edge-01 (Downtown PoP)
                                </option>
                                <option value="TLH-Metro-Cloud-01 (West Tennessee Core)">
                                  TLH-Metro-Cloud-01 (West Tennessee Core)
                                </option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-neutral-400 text-[11px] flex items-center gap-1">
                                <Activity className="w-3 h-3 text-neutral-300" />
                                Relay Ingestion Protocol
                              </label>
                              <select
                                value={relay?.ingestProtocol}
                                onChange={(e) =>
                                  handleUpdateRelay(cam.id, {
                                    ingestProtocol: e.target.value as CloudRelayConfig['ingestProtocol'],
                                  })
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                              >
                                <option value="WebRTC-Edge">WebRTC-Edge (Ultra Low Latency &lt; 200ms)</option>
                                <option value="RTSP-TLS">RTSP-TLS (Direct Hardware Stream)</option>
                                <option value="SRT">SRT (Secure Reliable Transport)</option>
                                <option value="Low-Latency HLS">Low-Latency HLS (Apple/Android standard)</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-neutral-400 text-[11px] flex items-center gap-1">
                                <Camera className="w-3 h-3 text-neutral-400" />
                                Hardware Camera Model
                              </label>
                              <input
                                type="text"
                                value={relay?.hardwareModel || ''}
                                onChange={(e) =>
                                  handleUpdateRelay(cam.id, { hardwareModel: e.target.value })
                                }
                                placeholder="e.g. Verkada CD52 4K Dome"
                                className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-neutral-400 text-[11px] flex items-center gap-1">
                                <Wifi className="w-3 h-3 text-neutral-300" />
                                Local Network Ingest IP
                              </label>
                              <input
                                type="text"
                                value={relay?.localIp || ''}
                                onChange={(e) =>
                                  handleUpdateRelay(cam.id, { localIp: e.target.value })
                                }
                                placeholder="e.g. 192.168.1.104:554/ch0"
                                className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-neutral-900">
                            <div className="text-[11px] text-neutral-400 flex items-center gap-3">
                              <span>Bitrate: <strong className="text-white">{(relay?.bitrateKbps || 4000) / 1000} Mbps</strong></span>
                              <span>Latency: <strong className="text-neutral-200">{relay?.latencyMs || 128}ms</strong></span>
                              <span>Packet Loss: <strong className="text-neutral-200">{relay?.packetLossPercent || 0.0}%</strong></span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleTestRelay(cam.id)}
                              disabled={isTesting}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                                isTested
                                  ? 'bg-neutral-800 text-white border-neutral-600'
                                  : isTesting
                                  ? 'bg-neutral-900 text-neutral-400 border-neutral-800'
                                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700'
                              }`}
                            >
                              {isTesting ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-200" />
                                  <span>Testing Handshake...</span>
                                </>
                              ) : isTested ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  <span>Relay Handshake Verified (100%)</span>
                                </>
                              ) : (
                                <>
                                  <Activity className="w-3.5 h-3.5 text-neutral-300" />
                                  <span>Test Cloud Relay Handshake</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: HOURS, EVENTS & DOOR WAIT */}
          {activeTab === 'hours_events' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Hours, Door & Entertainment</h3>
                <p className="text-xs text-neutral-400">
                  Keep Tallahassee patrons informed of changes to hours, performers, and door lines.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-300" />
                    Today’s Operating Hours
                  </label>
                  <input
                    type="text"
                    value={hoursToday}
                    onChange={(e) => setHoursToday(e.target.value)}
                    placeholder="e.g. 4:00 PM – 2:00 AM"
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-none focus:border-copper font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-neutral-300" />
                    Cover Charge Status
                  </label>
                  <input
                    type="text"
                    value={coverCharge}
                    onChange={(e) => setCoverCharge(e.target.value)}
                    placeholder="e.g. No Cover or $5 after 9 PM"
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-none focus:border-copper"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-neutral-300" />
                  Tonight’s Live DJ / Performer / Event Name
                </label>
                <input
                  type="text"
                  value={currentDJsBand}
                  onChange={(e) => setCurrentDJsBand(e.target.value)}
                  placeholder="e.g. DJ Marcus & Top 40 / Live Band: The Flip Flop Boys"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-xs text-white focus:outline-none focus:border-copper"
                />
              </div>

              {/* Crowd Density & Wait Override Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-semibold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-neutral-300" />
                      Live Crowd Density
                    </span>
                    <span className="font-mono font-bold text-white">{crowdDensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={crowdDensity}
                    onChange={(e) => setCrowdDensity(Number(e.target.value))}
                    className="w-full accent-copper cursor-pointer"
                  />
                  <div className="text-[10px] text-neutral-500">
                    Adjusts heatmap intensity and live status for patrons
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-semibold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-neutral-300" />
                      Estimated Door Wait
                    </span>
                    <span className="font-mono font-bold text-white">
                      {estimatedWaitMinutes === 0 ? 'No Wait' : `${estimatedWaitMinutes} mins`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    step="5"
                    value={estimatedWaitMinutes}
                    onChange={(e) => setEstimatedWaitMinutes(Number(e.target.value))}
                    className="w-full accent-copper cursor-pointer"
                  />
                  <div className="text-[10px] text-neutral-500">
                    Displayed directly on your venue card and live stream
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-400">
            {savedSuccess && (
              <span className="text-neutral-100 font-semibold flex items-center gap-1 animate-fade-in">
                <Check className="w-4 h-4" />
                Changes published live to Bar Tap!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAllChanges}
              className="px-5 py-2.5 bg-copper hover:bg-tan text-ink font-bold text-xs rounded-xl shadow-lg shadow-black/20 active:scale-[0.98] transition cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Publish Updates Live</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
