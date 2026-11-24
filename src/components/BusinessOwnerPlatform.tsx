import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  Award,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Crown,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Globe,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  MessageSquare,
  Music,
  Phone,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Save,
  Search,
  Send,
  Server,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  Video,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import {
  AuditLogItem,
  BarLocation,
  BusinessOwnerProfile,
  CameraAngle,
  CloudRelayConfig,
  DrinkSpecial,
  ExclusiveDeal,
  FlashDealState,
  Review,
  StaffMember,
  VenueEvent,
  WebsiteVerification,
} from '../types.ts';
import { LiveCameraCanvas } from './LiveCameraCanvas.tsx';
import { CameraSetupPanel } from './CameraSetupPanel.tsx';
import { ALL_EXCLUSIVE_DEALS } from '../data/exclusiveDeals.ts';

interface BusinessOwnerPlatformProps {
  owner: BusinessOwnerProfile;
  bars: BarLocation[];
  onUpdateBar: (updatedBar: BarLocation) => void;
  onSignOut: () => void;
  onPreviewAsPatron: (barId: string) => void;
}

export const BusinessOwnerPlatform: React.FC<BusinessOwnerPlatformProps> = ({
  owner,
  bars,
  onUpdateBar,
  onSignOut,
  onPreviewAsPatron,
}) => {
  // Current selected venue managed by this owner
  const [selectedBarId, setSelectedBarId] = useState<string>(() => {
    if (owner.primaryBarId && bars.some((b) => b.id === owner.primaryBarId)) {
      return owner.primaryBarId;
    }
    if (owner.managedBarIds && owner.managedBarIds.length > 0) {
      const match = bars.find((b) => owner.managedBarIds.includes(b.id));
      if (match) return match.id;
    }
    return bars[0]?.id || 'hub-at-feather-oaks';
  });

  const selectedBar = useMemo(() => {
    return bars.find((b) => b.id === selectedBarId) || bars[0];
  }, [bars, selectedBarId]);

  // Active top-level operational tab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'deals'
    | 'happy_hour'
    | 'hours_events'
    | 'telemetry'
    | 'reviews'
    | 'profile_verify'
    | 'account'
  >('overview');

  // Quick Action Modal states
  const [isQuickFlashOpen, setIsQuickFlashOpen] = useState(false);
  const [isQuickCoverOpen, setIsQuickCoverOpen] = useState(false);
  const [isQuickEventOpen, setIsQuickEventOpen] = useState(false);
  const [isQuickVerifyOpen, setIsQuickVerifyOpen] = useState(false);

  // Editable local state for the active bar
  const [hoursToday, setHoursToday] = useState(selectedBar.hoursToday);
  const [coverCharge, setCoverCharge] = useState(selectedBar.coverCharge);
  const [currentDJsBand, setCurrentDJsBand] = useState(selectedBar.currentDJsBand || '');
  const [crowdDensity, setCrowdDensity] = useState(selectedBar.crowdDensity);
  const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState(
    selectedBar.estimatedWaitMinutes
  );
  const [websiteUrl, setWebsiteUrl] = useState(selectedBar.websiteUrl);
  const [phone, setPhone] = useState(selectedBar.phone);
  const [tagline, setTagline] = useState(selectedBar.tagline);
  const [category, setCategory] = useState(selectedBar.category);
  const [cameras, setCameras] = useState<CameraAngle[]>(selectedBar.cameras);
  const [drinkSpecials, setDrinkSpecials] = useState<DrinkSpecial[]>(selectedBar.drinkSpecials);
  const [selectedCamAngleId, setSelectedCamAngleId] = useState<string>(
    selectedBar.cameras[0]?.id || ''
  );

  // Events management state
  const [eventsList, setEventsList] = useState<VenueEvent[]>(() => {
    if (selectedBar.events && selectedBar.events.length > 0) {
      return selectedBar.events;
    }
    return [
      {
        id: `event-${selectedBar.id}-1`,
        title: selectedBar.currentDJsBand || 'Tonight Live Guest Set',
        date: 'Tonight',
        time: '10:00 PM – 2:00 AM',
        performer: selectedBar.currentDJsBand || 'Resident DJ & Percussion',
        genre: 'Open Format & House',
        coverInfo: selectedBar.coverCharge || 'Free before 11 PM',
        featured: true,
        description: 'Prime weekend nightlife set with full sound and live lighting display.',
      },
      {
        id: `event-${selectedBar.id}-2`,
        title: 'College Night & Hospitality Industry Party',
        date: 'This Thursday',
        time: '9:00 PM – 2:00 AM',
        performer: 'DJ Midnight & Guests',
        genre: 'Top 40 / Hip Hop / EDM',
        coverInfo: '$5 Wristband / Free with Bar Tap',
        featured: false,
        description: 'Drink specials running all night for students and local nightlife crew.',
      },
      {
        id: `event-${selectedBar.id}-3`,
        title: 'Saturday Rooftop Sunset & Acoustic Session',
        date: 'This Saturday',
        time: '4:00 PM – 8:00 PM',
        performer: 'Tallahassee Acoustic Collective',
        genre: 'Acoustic & Chill Lounge',
        coverInfo: 'No Cover',
        featured: false,
        description: 'Relaxed golden hour vibe with half-off signature craft carafes.',
      },
    ];
  });

  // Website verification state
  const [websiteVerification, setWebsiteVerification] = useState<WebsiteVerification>(() => {
    if (selectedBar.websiteVerification) return selectedBar.websiteVerification;
    // Extract clean domain
    let domain = 'venue.com';
    try {
      domain = new URL(selectedBar.websiteUrl).hostname;
    } catch {
      domain = selectedBar.slug + '.com';
    }
    return {
      isVerified: true,
      domain,
      verifiedAt: 'Oct 14, 2026',
      method: 'instant_webhook',
      sslValid: true,
      verificationToken: `bt_verify_${selectedBar.slug.substring(0, 8)}_${Math.random()
        .toString(36)
        .substring(2, 8)}`,
    };
  });

  // Verification in-progress test
  const [isVerifyingSite, setIsVerifyingSite] = useState(false);
  const [verifySuccessMessage, setVerifySuccessMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Exclusive deals list (loaded from dataset + customizable)
  const [exclusiveDeals, setExclusiveDeals] = useState<ExclusiveDeal[]>(() => {
    const fromGlobal = ALL_EXCLUSIVE_DEALS.filter((d) => d.barId === selectedBar.id);
    if (fromGlobal.length > 0) return fromGlobal;
    return [
      {
        id: `deal-${selectedBar.id}-vip`,
        barId: selectedBar.id,
        barName: selectedBar.name,
        neighborhood: selectedBar.neighborhood,
        city: selectedBar.city,
        title: 'VIP Line Bypass & 2-for-1 Signature Cocktails',
        offerDetails: 'Show your Bar Tap voucher at the door host to skip general entrance line.',
        savingsValue: '$12.00 Value',
        voucherCode: `BT-${selectedBar.name.substring(0, 4).toUpperCase()}-VIP`,
        category: 'entry',
        terms: 'Valid once per evening. Must present the Bar Tap voucher to door captain.',
        sponsorType: 'Venue Partner',
      },
    ];
  });

  // Flash Deal State
  const [flashDeal, setFlashDeal] = useState<FlashDealState>(() => {
    if (selectedBar.activeFlashDeal) return selectedBar.activeFlashDeal;
    return {
      isActive: false,
      title: '⚡ FLASH SPECIAL: $3 Well Drinks & $4 Craft Pints',
      discountDescription: 'Flash perk for the next 45 minutes for all nearby patrons.',
      minutesLeft: 45,
      claimCount: 38,
      targetAudienceReach: 1420,
      startedAt: undefined,
    };
  });

  // Privacy Emergency Blackout mode
  const [isBlackoutActive, setIsBlackoutActive] = useState<boolean>(false);
  const [blackoutReason, setBlackoutReason] = useState<string>(
    'Private VIP Reception in Progress – Public Video Broadcast Resumes at 11:30 PM'
  );

  // Staff roster
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    if (selectedBar.staff && selectedBar.staff.length > 0) return selectedBar.staff;
    return [
      {
        id: 'st-1',
        name: owner.name,
        email: owner.email,
        role: (owner.role as StaffMember['role']) || 'General Manager',
        status: 'ACTIVE',
        lastActive: 'Active Now',
      },
      {
        id: 'st-2',
        name: 'Jordan Hayes',
        email: 'jordan@venue.com',
        role: 'Beverage Director',
        status: 'ACTIVE',
        lastActive: '2 hours ago',
      },
      {
        id: 'st-3',
        name: 'Marcus Vance',
        email: 'marcus@venue.com',
        role: 'Door Host',
        status: 'ACTIVE',
        lastActive: 'Yesterday',
      },
    ];
  });

  // Administrative Audit Log
  const [auditLog, setAuditLog] = useState<AuditLogItem[]>(() => {
    if (selectedBar.auditLog && selectedBar.auditLog.length > 0) return selectedBar.auditLog;
    return [
      {
        id: 'log-1',
        timestamp: '12 mins ago',
        actor: owner.name,
        action: 'Updated Door Cover',
        details: `Cover set to "${selectedBar.coverCharge}"`,
      },
      {
        id: 'log-2',
        timestamp: '1 hour ago',
        actor: 'Auto Edge Sensor',
        action: 'Crowd Calibrated',
        details: `Density adjusted to ${selectedBar.crowdDensity}% via CCTV frame analysis`,
      },
      {
        id: 'log-3',
        timestamp: 'Yesterday',
        actor: owner.name,
        action: 'Domain Verification Verified',
        details: 'Verified SSL/TLS connection & DNS host records',
      },
    ];
  });

  // Toast / Save feedback state
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<Record<string, string>>({});

  // Review reply state
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [reviewsList, setReviewsList] = useState<Review[]>(selectedBar.reviews || []);

  // Form states for modals
  const [newDealTitle, setNewDealTitle] = useState('');
  const [newDealDesc, setNewDealDesc] = useState('');
  const [newDealPrice, setNewDealPrice] = useState('$5.00');
  const [newDealCategory, setNewDealCategory] = useState<DrinkSpecial['category']>('happy_hour');
  const [newDealDay, setNewDealDay] = useState('Daily Happy Hour');
  const [newDealIsHH, setNewDealIsHH] = useState(true);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('This Friday');
  const [newEventTime, setNewEventTime] = useState('10:00 PM – 2:00 AM');
  const [newEventPerformer, setNewEventPerformer] = useState('');
  const [newEventGenre, setNewEventGenre] = useState('Live DJ / Club Beats');
  const [newEventCover, setNewEventCover] = useState('$5 Cover / Free Ladies');

  // New VIP Deal Form State
  const [showAddVipModal, setShowAddVipModal] = useState(false);
  const [newVipTitle, setNewVipTitle] = useState('');
  const [newVipDetails, setNewVipDetails] = useState('');
  const [newVipValue, setNewVipValue] = useState('$10.00 Value');
  const [newVipCode, setNewVipCode] = useState(`BT-${selectedBar.name.substring(0, 3).toUpperCase()}-PERK`);
  const [newVipCategory, setNewVipCategory] = useState<ExclusiveDeal['category']>('drink');

  // New Staff Invite State
  const [showInviteStaffModal, setShowInviteStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffMember['role']>('Door Host');

  // Synchronize local states when switching bars
  const handleSelectBar = (barId: string) => {
    setSelectedBarId(barId);
    const target = bars.find((b) => b.id === barId);
    if (target) {
      setHoursToday(target.hoursToday);
      setCoverCharge(target.coverCharge);
      setCurrentDJsBand(target.currentDJsBand || '');
      setCrowdDensity(target.crowdDensity);
      setEstimatedWaitMinutes(target.estimatedWaitMinutes);
      setWebsiteUrl(target.websiteUrl);
      setPhone(target.phone);
      setTagline(target.tagline);
      setCategory(target.category);
      setCameras(target.cameras);
      setDrinkSpecials(target.drinkSpecials);
      setSelectedCamAngleId(target.cameras[0]?.id || '');
      setReviewsList(target.reviews || []);

      if (target.events) {
        setEventsList(target.events);
      }
      if (target.websiteVerification) {
        setWebsiteVerification(target.websiteVerification);
      } else {
        let domain = 'venue.com';
        try {
          domain = new URL(target.websiteUrl).hostname;
        } catch {
          domain = target.slug + '.com';
        }
        setWebsiteVerification({
          isVerified: true,
          domain,
          verifiedAt: 'Oct 2026',
          method: 'instant_webhook',
          sslValid: true,
          verificationToken: `bt_verify_${target.slug.substring(0, 8)}`,
        });
      }
      if (target.activeFlashDeal) {
        setFlashDeal(target.activeFlashDeal);
      }
    }
  };

  // Publish / Save All Changes
  const handlePublishAll = (customActionDetails?: string) => {
    const updated: BarLocation = {
      ...selectedBar,
      hoursToday,
      coverCharge,
      currentDJsBand: currentDJsBand.trim() || undefined,
      crowdDensity,
      estimatedWaitMinutes,
      websiteUrl,
      phone,
      tagline,
      category,
      cameras,
      drinkSpecials,
      reviews: reviewsList,
      events: eventsList,
      websiteVerification,
      activeFlashDeal: flashDeal,
      staff: staffList,
      auditLog: [
        {
          id: `log-${Date.now()}`,
          timestamp: 'Just now',
          actor: owner.name,
          action: 'Published Live Updates',
          details: customActionDetails || 'Updated door cover, hours, and operational status.',
        },
        ...auditLog.slice(0, 15),
      ],
    };

    onUpdateBar(updated);
    setAuditLog(updated.auditLog || auditLog);
    setSaveToast('All changes successfully published to the public Bar Tap network!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Camera Power Toggles
  const handleToggleCamera = (camId: string) => {
    setCameras((prev) =>
      prev.map((c) =>
        c.id === camId ? { ...c, status: c.status === 'LIVE' ? 'STANDBY' : 'LIVE' } : c
      )
    );
  };

  const handleMasterCameraToggle = () => {
    const anyLive = cameras.some((c) => c.status === 'LIVE');
    const nextStatus = anyLive ? 'STANDBY' : 'LIVE';
    setCameras((prev) => prev.map((c) => ({ ...c, status: nextStatus })));
  };

  // Test Ping Latency
  const handlePingRelay = (camId: string) => {
    setPingStatus((prev) => ({ ...prev, [camId]: 'Pinging gateway...' }));
    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * 18) + 24;
      setPingStatus((prev) => ({
        ...prev,
        [camId]: `Edge ACK: ${simulatedLatency}ms · 0.0% loss`,
      }));
    }, 550);
  };

  // Run Website Verification Simulation
  const handleRunWebsiteVerification = () => {
    setIsVerifyingSite(true);
    setVerifySuccessMessage(null);

    setTimeout(() => {
      let cleanDomain = 'venue.com';
      try {
        cleanDomain = new URL(websiteUrl).hostname;
      } catch {
        cleanDomain = selectedBar.slug + '.com';
      }

      const updatedVerify: WebsiteVerification = {
        isVerified: true,
        domain: cleanDomain,
        verifiedAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        method: 'instant_webhook',
        sslValid: true,
        verificationToken: `bt_sec_${Date.now().toString(36)}`,
      };

      setWebsiteVerification(updatedVerify);
      setIsVerifyingSite(false);
      setVerifySuccessMessage(
        `Website "${cleanDomain}" successfully verified! SSL TLS 1.3 valid, official gold badge awarded.`
      );
      handlePublishAll(`Verified venue official domain: ${cleanDomain}`);
    }, 1200);
  };

  // Copy Verification Token
  const handleCopyToken = () => {
    if (websiteVerification?.verificationToken) {
      navigator.clipboard?.writeText(websiteVerification.verificationToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  // Review reply handler
  const handleReplyReview = (reviewId: string) => {
    const text = replyTextMap[reviewId]?.trim();
    if (!text) return;

    const nextReviews = reviewsList.map((r) =>
      r.id === reviewId
        ? {
            ...r,
            ownerReply: {
              date: 'Just now',
              text,
              author: `${owner.name} (${owner.role})`,
            },
          }
        : r
    );

    setReviewsList(nextReviews);
    setReplyTextMap((prev) => ({ ...prev, [reviewId]: '' }));
    setSaveToast('Official venue response posted!');
    setTimeout(() => setSaveToast(null), 3000);

    onUpdateBar({
      ...selectedBar,
      reviews: nextReviews,
    });
  };

  // Add Special Handler
  const handleAddSpecial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealTitle.trim()) return;

    const newSpecial: DrinkSpecial = {
      id: `special-${Date.now()}`,
      title: newDealTitle.trim(),
      description: newDealDesc.trim() || 'Available tonight during designated window.',
      price: newDealPrice.trim() || undefined,
      category: newDealCategory,
      day: newDealDay,
      isHappyHour: newDealIsHH,
      happyHourStart: newDealIsHH ? '16:00' : undefined,
      happyHourEnd: newDealIsHH ? '19:00' : undefined,
      featured: true,
    };

    const nextSpecials = [newSpecial, ...drinkSpecials];
    setDrinkSpecials(nextSpecials);
    setNewDealTitle('');
    setNewDealDesc('');
    setSaveToast('New drink special added! Click Publish Changes to broadcast.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Add Event Handler
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const newEvent: VenueEvent = {
      id: `event-${Date.now()}`,
      title: newEventTitle.trim(),
      date: newEventDate.trim() || 'Upcoming',
      time: newEventTime.trim() || '10:00 PM – 2:00 AM',
      performer: newEventPerformer.trim() || 'Featured Entertainment',
      genre: newEventGenre.trim() || 'Live Performance',
      coverInfo: newEventCover.trim() || 'Cover at Door',
      featured: true,
    };

    const nextEvents = [newEvent, ...eventsList];
    setEventsList(nextEvents);
    setIsQuickEventOpen(false);
    setNewEventTitle('');
    setNewEventPerformer('');
    setSaveToast('Live event added to your venue calendar!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Add VIP Exclusive Deal Handler
  const handleAddVipDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVipTitle.trim()) return;

    const newVip: ExclusiveDeal = {
      id: `deal-${Date.now()}`,
      barId: selectedBar.id,
      barName: selectedBar.name,
      neighborhood: selectedBar.neighborhood,
      city: selectedBar.city,
      title: newVipTitle.trim(),
      offerDetails: newVipDetails.trim() || 'Exclusive perk for Bar Tap users.',
      savingsValue: newVipValue.trim() || '$10.00 Value',
      voucherCode: newVipCode.trim().toUpperCase() || 'BT-VIP-PERK',
      category: newVipCategory,
      terms: 'Valid during standard operating hours. Must display active phone screen.',
      sponsorType: 'Venue Partner',
    };

    setExclusiveDeals([newVip, ...exclusiveDeals]);
    setShowAddVipModal(false);
    setNewVipTitle('');
    setNewVipDetails('');
    setSaveToast('VIP Exclusive Deal created for your venue!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Add Staff Member
  const handleInviteStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) return;

    const newStaff: StaffMember = {
      id: `st-${Date.now()}`,
      name: newStaffName.trim(),
      email: newStaffEmail.trim(),
      role: newStaffRole,
      status: 'INVITED',
      lastActive: 'Invitation Pending',
    };

    setStaffList([...staffList, newStaff]);
    setShowInviteStaffModal(false);
    setNewStaffName('');
    setNewStaffEmail('');
    setSaveToast(`Invitation dispatched to ${newStaff.email}!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Toggle Flash Deal
  const handleToggleFlashDeal = () => {
    const nextState = !flashDeal.isActive;
    const updated: FlashDealState = {
      ...flashDeal,
      isActive: nextState,
      minutesLeft: nextState ? 45 : 0,
      startedAt: nextState ? 'Just now' : undefined,
    };
    setFlashDeal(updated);
    handlePublishAll(
      nextState
        ? `Launched 45-minute Flash Deal: "${flashDeal.title}"`
        : 'Paused active Flash Deal.'
    );
  };

  // Quick Cover Charge Setters
  const handleQuickSetCover = (newCover: string) => {
    setCoverCharge(newCover);
    setIsQuickCoverOpen(false);
    handlePublishAll(`Updated door cover charge to "${newCover}"`);
  };

  const activeCam = cameras.find((c) => c.id === selectedCamAngleId) || cameras[0];
  const onlineCamsCount = cameras.filter((c) => c.status === 'LIVE').length;

  // Estimated Door Revenue tonight (heuristic: tappedInCount * average cover amount or $5)
  const numericCover = parseInt(coverCharge.replace(/[^0-9]/g, ''), 10) || 5;
  const estimatedDoorRevenue = (selectedBar.tappedInCount || 65) * numericCover;

  return (
    <div className="min-h-[100dvh] w-full bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-copper selection:text-ink pb-8">
      {/* =========================================================================
          1. TOP COMMAND BAR (Administrative Header & Command Center)
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 shadow-2xl">
        {/* Main Command Bar Row */}
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          {/* Brand + Venue Selector */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-copper text-ink font-black flex items-center justify-center text-base shadow-lg shadow-black/20 shrink-0">
              <Building2 className="w-5 h-5 text-neutral-950" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-200 font-extrabold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-200" />
                  Bar Tap Business Platform
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  {selectedBar.city} Hub
                </span>
              </div>

              {/* Venue Switcher Dropdown */}
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  value={selectedBarId}
                  onChange={(e) => handleSelectBar(e.target.value)}
                  className="bg-neutral-950 hover:bg-neutral-900 text-white font-extrabold text-sm sm:text-base border border-neutral-700 hover:border-neutral-500 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-copper transition cursor-pointer"
                >
                  {bars.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} · {b.neighborhood} ({b.city})
                    </option>
                  ))}
                </select>

                {/* Verification Badge */}
                {websiteVerification?.isVerified ? (
                  <button
                    onClick={() => setActiveTab('profile_verify')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-[11px] font-mono font-bold hover:bg-neutral-700 transition cursor-pointer"
                    title="Official Verified Venue & Website"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-200" />
                    <span className="hidden sm:inline">Verified</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsQuickVerifyOpen(true)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-mono font-bold hover:bg-neutral-700 transition cursor-pointer"
                    title="Verify Your Official Venue Website"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-neutral-300" />
                    <span>Verify Domain</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Top Command Action Shortcuts */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Edge Relay Status Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isBlackoutActive ? 'bg-red-400' : 'bg-tan animate-pulse'
                }`}
              />
              <span className="text-neutral-400">Stream Relay:</span>
              <span className="text-neutral-200 font-semibold">
                {isBlackoutActive ? 'BLACKOUT' : 'TLH-Edge-01'}
              </span>
              <span className="text-neutral-500">·</span>
              <span className="text-neutral-300">32ms</span>
            </div>

            {/* Quick Action: Flash Deal */}
            <button
              onClick={() => setIsQuickFlashOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                flashDeal.isActive
                  ? 'bg-copper text-ink font-black shadow-lg shadow-black/20'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
              }`}
              title="Launch instant 45-minute flash deal"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">
                {flashDeal.isActive ? 'Flash Live!' : 'Flash Deal'}
              </span>
            </button>

            {/* Quick Action: Door Cover */}
            <button
              onClick={() => setIsQuickCoverOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition cursor-pointer"
              title="Adjust door cover charge"
            >
              <DollarSign className="w-3.5 h-3.5 text-neutral-300" />
              <span className="hidden md:inline">Cover:</span>
              <span className="text-white font-mono font-bold">{coverCharge}</span>
            </button>

            {/* Quick Action: Add Event */}
            <button
              onClick={() => setIsQuickEventOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition cursor-pointer"
              title="Add tonight's DJ or upcoming live performance"
            >
              <Calendar className="w-3.5 h-3.5 text-neutral-300" />
              <span className="hidden md:inline">Add Event</span>
            </button>

            {/* Emergency Blackout Mode Switch */}
            <button
              onClick={() => setIsBlackoutActive(!isBlackoutActive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isBlackoutActive
                  ? 'bg-red-500 text-white font-extrabold shadow-lg shadow-red-500/20'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700'
              }`}
              title="Toggle emergency privacy blackout for private parties"
            >
              {isBlackoutActive ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-neutral-300" />
              )}
              <span className="hidden xl:inline">
                {isBlackoutActive ? 'Blackout ON' : 'Privacy Mode'}
              </span>
            </button>

            {/* Preview Public Patron View */}
            <button
              onClick={() => onPreviewAsPatron(selectedBar.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold border border-neutral-700 transition cursor-pointer"
              title="See your venue's live profile through a patron's phone"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-300" />
              <span className="hidden sm:inline">Patron View</span>
            </button>

            {/* Publish Live Changes */}
            <button
              onClick={() => handlePublishAll()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-copper hover:bg-tan text-ink font-black text-xs shadow-lg shadow-black/20 active:scale-95 transition cursor-pointer"
              title="Push all modified door rules, hours, and specials to public feed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Publish Live</span>
            </button>

            {/* Operator Profile & Sign Out */}
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
              <div
                className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold text-xs flex items-center justify-center shrink-0"
                title={`${owner.name} · ${owner.role}`}
              >
                {owner.avatar || owner.name.charAt(0)}
              </div>
              <button
                onClick={onSignOut}
                className="p-2 rounded-xl bg-neutral-800/80 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition cursor-pointer"
                title="Sign Out of Business Operator Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            OPERATIONAL MODULES NAVIGATION TABS
            ========================================================================= */}
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 flex items-center gap-1.5 border-t border-neutral-800/80 overflow-x-auto no-scrollbar py-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-copper text-ink font-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview & Command</span>
          </button>

          <button
            onClick={() => setActiveTab('deals')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'deals'
                ? 'bg-copper text-ink font-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Exclusive & Flash Deals ({exclusiveDeals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('happy_hour')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'happy_hour'
                ? 'bg-copper text-ink font-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Happy Hours & Specials ({drinkSpecials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('hours_events')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'hours_events'
                ? 'bg-copper text-ink font-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hours, Covers & Events ({eventsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'telemetry'
                ? 'bg-copper text-ink font-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Live Cameras ({(selectedBar.cameras || []).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-copper text-ink font-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Patron Reviews ({reviewsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile_verify')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'profile_verify'
                ? 'bg-copper text-ink font-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Venue Profile & Verification</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'account'
                ? 'bg-copper text-ink font-black shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Account & Admin Suite</span>
          </button>
        </div>
      </header>

      {/* Toast Feedback Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-copper text-ink font-bold rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 fill-neutral-950 text-white shrink-0" />
          <span className="text-xs">{saveToast}</span>
        </div>
      )}

      {/* Emergency Blackout Banner if Active */}
      {isBlackoutActive && (
        <div className="bg-red-500/20 border-b border-red-500/40 px-3 sm:px-6 py-2.5">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <EyeOff className="w-5 h-5 text-red-400 shrink-0" />
              <div className="min-w-0">
                <strong className="text-red-300 font-bold uppercase tracking-wider block">
                  Live Stream Privacy Blackout In Effect
                </strong>
                <span className="text-neutral-300">
                  Public feeds are masked with your custom announcement:{' '}
                  <span className="text-white italic">&ldquo;{blackoutReason}&rdquo;</span>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
              <input
                type="text"
                value={blackoutReason}
                onChange={(e) => setBlackoutReason(e.target.value)}
                className="bg-neutral-950 border border-red-500/40 rounded-lg px-2.5 py-1 text-xs text-white w-full sm:w-64 min-w-0 focus:outline-none focus:border-copper"
                placeholder="Reason broadcasted to patrons..."
              />
              <button
                onClick={() => setIsBlackoutActive(false)}
                className="px-3 py-1 bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg transition cursor-pointer whitespace-nowrap"
              >
                Disable Blackout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN WORKSPACE CONTENT
          ========================================================================= */}
      <main className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 mt-4 sm:mt-5 w-full space-y-5 flex-1">
        {/* =========================================================================
            2. KPI SUMMARY CARDS (Universal Real-Time Operational Bar)
            ========================================================================= */}
        <section aria-label="KPI Summary Cards">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
            {/* Card 1: Door Cover & Estimated Gate */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between hover:border-neutral-700 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Door Cover
                  </span>
                  <DollarSign className="w-4 h-4 text-neutral-300" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-1 truncate">
                  {coverCharge}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Est. Gate:</span>
                <span className="text-neutral-200 font-mono font-bold">
                  ${estimatedDoorRevenue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Card 2: Crowd Telemetry & Capacity */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between hover:border-neutral-700 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Crowd Density
                  </span>
                  <Activity className="w-4 h-4 text-neutral-300" />
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={`text-xl sm:text-2xl font-black tabular-nums ${
                      crowdDensity > 75
                        ? 'text-red-400'
                        : crowdDensity > 45
                        ? 'text-neutral-100'
                        : 'text-neutral-300'
                    }`}
                  >
                    {crowdDensity}%
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {crowdDensity > 75 ? 'Packed' : crowdDensity > 45 ? 'Lively' : 'Chill'}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Wait Time:</span>
                <span className="text-neutral-200 font-mono font-bold">
                  {estimatedWaitMinutes === 0 ? '0 mins' : `${estimatedWaitMinutes}m line`}
                </span>
              </div>
            </div>

            {/* Card 3: Live Tap-Ins */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between hover:border-neutral-700 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Tap-In Patrons
                  </span>
                  <Users className="w-4 h-4 text-neutral-300" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-1 tabular-nums">
                  {selectedBar.tappedInCount || 65}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Radius Reach:</span>
                <span className="text-neutral-200 font-mono font-bold">1,420 nearby</span>
              </div>
            </div>

            {/* Card 4: Active Flash Deals & VIP Claims */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between hover:border-neutral-700 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Flash Deals
                  </span>
                  <Zap className="w-4 h-4 text-neutral-200 fill-tan" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-1">
                  {flashDeal.isActive ? (
                    <span className="text-neutral-100 font-mono">{flashDeal.minutesLeft}m left</span>
                  ) : (
                    <span className="text-neutral-400 text-lg">Ready to Fire</span>
                  )}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">VIP Claims:</span>
                <span className="text-neutral-200 font-mono font-bold">
                  {flashDeal.claimCount} redeemed
                </span>
              </div>
            </div>

            {/* Card 5: Patron Rating & Community Sentiment */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between hover:border-neutral-700 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Patron Reviews
                  </span>
                  <Star className="w-4 h-4 text-neutral-200 fill-tan" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl sm:text-2xl font-black text-white">
                    {selectedBar.rating}
                  </span>
                  <span className="text-neutral-300 text-xs">★</span>
                  <span className="text-[11px] text-neutral-400">
                    ({reviewsList.length} verified)
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Sentiment:</span>
                <span className="text-neutral-200 font-mono font-bold">96% Positive</span>
              </div>
            </div>

            {/* Card 6: CCTV Relay Broadcast */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between hover:border-neutral-700 transition col-span-2 lg:col-span-1">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                    Live Video Feeds
                  </span>
                  <Video className="w-4 h-4 text-neutral-300" />
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                    {onlineCamsCount}/{cameras.length}
                  </span>
                  <span className="text-[11px] text-neutral-400">Online</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Viewers:</span>
                <span className="text-neutral-200 font-mono font-bold">384 live</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TAB: OVERVIEW & OPERATIONAL MODULES HUB
            ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Live Operations Snapshot & Broadcast Preview Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Quick Command Module Hub */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-neutral-300" />
                        <span>Tonight's Operations & Live Dispatch</span>
                      </h2>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Manage all real-time operational modules broadcasted to Bar Tap patrons across {selectedBar.city}.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-200 text-xs font-mono font-semibold border border-neutral-700">
                      System Synchronized
                    </span>
                  </div>

                  {/* Operational Modules Direct Access Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Module 1: Flash Deals & VIP Perks */}
                    <div
                      onClick={() => setActiveTab('deals')}
                      className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-600 transition cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-neutral-800 text-neutral-200 group-hover:scale-110 transition">
                          <Zap className="w-4 h-4 fill-tan" />
                        </span>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-neutral-200 transition">
                          Exclusive & Flash Deals
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {flashDeal.isActive
                            ? `⚡ Flash Active: ${flashDeal.minutesLeft}m left (${flashDeal.claimCount} claimed)`
                            : `${exclusiveDeals.length} VIP Exclusive perks configured`}
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-300 font-semibold pt-1">
                        Open Deal Manager →
                      </div>
                    </div>

                    {/* Module 2: Happy Hours & Specials */}
                    <div
                      onClick={() => setActiveTab('happy_hour')}
                      className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-600 transition cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-neutral-800 text-neutral-200 group-hover:scale-110 transition">
                          <Tag className="w-4 h-4" />
                        </span>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-neutral-200 transition">
                          Happy Hours & Drink Specials
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {drinkSpecials.length} active drink and food promotions listed for tonight.
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-300 font-semibold pt-1">
                        Edit Specials Schedule →
                      </div>
                    </div>

                    {/* Module 3: Hours, Cover & Entertainment */}
                    <div
                      onClick={() => setActiveTab('hours_events')}
                      className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-600 transition cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-neutral-800 text-neutral-200 group-hover:scale-110 transition">
                          <Clock className="w-4 h-4" />
                        </span>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-neutral-200 transition">
                          Hours, Door Cover & Events
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Cover: {coverCharge} · Hours: {hoursToday} · {eventsList.length} events
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-300 font-semibold pt-1">
                        Manage Door & Entertainment →
                      </div>
                    </div>

                    {/* Module 4: Crowd Telemetry & Cameras */}
                    <div
                      onClick={() => setActiveTab('telemetry')}
                      className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-600 transition cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-neutral-800 text-neutral-200 group-hover:scale-110 transition">
                          <Video className="w-4 h-4" />
                        </span>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-neutral-200 transition">
                          Crowd Telemetry & Feeds
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {onlineCamsCount} of {cameras.length} camera angles online · {crowdDensity}% capacity
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-300 font-semibold pt-1">
                        Calibrate Sensor & Angles →
                      </div>
                    </div>

                    {/* Module 5: Patron Reviews */}
                    <div
                      onClick={() => setActiveTab('reviews')}
                      className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-600 transition cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-neutral-800 text-neutral-200 group-hover:scale-110 transition">
                          <MessageSquare className="w-4 h-4" />
                        </span>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-neutral-200 transition">
                          Patron Reviews & Community
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {selectedBar.rating}★ rating ({reviewsList.length} reviews) · Official replies active
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-300 font-semibold pt-1">
                        View & Reply to Patrons →
                      </div>
                    </div>

                    {/* Module 6: Venue Profile & Website Verification */}
                    <div
                      onClick={() => setActiveTab('profile_verify')}
                      className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-600 transition cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-neutral-800 text-neutral-200 group-hover:scale-110 transition">
                          <Globe className="w-4 h-4" />
                        </span>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-neutral-200 transition">
                          Profile & Website Verification
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {websiteVerification?.isVerified
                            ? `Domain verified: ${websiteVerification.domain}`
                            : 'Verification pending: earn official badge'}
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-300 font-semibold pt-1">
                        Run Domain Validation →
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Administrative Activity Log */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-neutral-400" />
                      <span>Administrative Audit Log</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('account')}
                      className="text-xs text-neutral-300 hover:text-white hover:underline cursor-pointer"
                    >
                      Full Admin History →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {auditLog.slice(0, 4).map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-tan shrink-0" />
                          <span className="font-semibold text-white">{log.action}:</span>
                          <span className="text-neutral-300 truncate">{log.details}</span>
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400 shrink-0">
                          {log.actor} · {log.timestamp}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Stream & Crowd Telemetry Snapshot */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isBlackoutActive ? 'bg-red-400' : 'bg-tan animate-pulse'
                          }`}
                        />
                        <span className="text-xs font-bold uppercase text-white font-mono">
                          Live Monitor: {activeCam?.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-300">
                        {isBlackoutActive ? 'Blackout Active' : 'Public Feed Active'}
                      </span>
                    </div>

                    {/* Canvas Video Component */}
                    <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-inner relative">
                      <LiveCameraCanvas
                        barId={selectedBar.id}
                        barName={selectedBar.name}
                        camera={activeCam || selectedBar.cameras[0]}
                        baseImage={selectedBar.image}
                      />
                      {isBlackoutActive && (
                        <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                          <EyeOff className="w-10 h-10 text-neutral-200 mb-2" />
                          <div className="text-sm font-bold text-white">Privacy Blackout Mode</div>
                          <p className="text-xs text-neutral-400 mt-1 max-w-xs">{blackoutReason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Camera Angle Selector bar */}
                  <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {cameras.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCamAngleId(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition whitespace-nowrap cursor-pointer ${
                          selectedCamAngleId === c.id
                            ? 'bg-copper text-ink font-bold'
                            : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  {/* Telemetry Sensor Control */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-neutral-300" />
                        AI Crowd Calibration
                      </span>
                      <span className="text-white font-mono font-bold">{crowdDensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={crowdDensity}
                      onChange={(e) => setCrowdDensity(Number(e.target.value))}
                      className="w-full accent-copper cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                      <span>Low (0-30%)</span>
                      <span>Lively (30-70%)</span>
                      <span>Packed (70-100%)</span>
                    </div>
                  </div>
                </div>

                {/* Website Verification Status Callout */}
                <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-neutral-800 text-neutral-200 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-neutral-200" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{websiteVerification?.domain || 'Official Website'}</span>
                        <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-200 text-[10px] font-mono">
                          SSL 1.3
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Verified Partner Venue · Public link connects directly to your menu.
                      </p>
                    </div>
                  </div>

                  <a
                    href={selectedBar.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition cursor-pointer shrink-0"
                    title="Visit Venue Website"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: EXCLUSIVE DEALS & FLASH DEALS
            ========================================================================= */}
        {activeTab === 'deals' && (
          <div className="space-y-6">
            {/* Flash Deal Command Box */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800/80 border border-neutral-700 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-copper text-ink flex items-center justify-center shrink-0 shadow-lg shadow-black/20">
                    <Zap className="w-6 h-6 fill-neutral-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">45-Minute Flash Deal Dispatch</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          flashDeal.isActive
                            ? 'bg-copper text-ink border border-tan'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {flashDeal.isActive ? 'BROADCASTING LIVE' : 'STANDBY'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                      Send an urgent push notification and banner to nearby Bar Tap users in {selectedBar.city}. Perfect for filling the room early or driving immediate traffic.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleToggleFlashDeal}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                      flashDeal.isActive
                        ? 'bg-red-500 text-white hover:bg-red-400'
                        : 'bg-copper text-ink hover:bg-tan shadow-lg shadow-black/20'
                    }`}
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>{flashDeal.isActive ? 'Stop Flash Deal' : 'Fire Flash Deal Now'}</span>
                  </button>
                </div>
              </div>

              {/* Flash Deal Details Configuration */}
              <div className="pt-2 border-t border-neutral-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-300">Flash Promotion Headline</label>
                  <input
                    type="text"
                    value={flashDeal.title}
                    onChange={(e) => setFlashDeal({ ...flashDeal, title: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                    placeholder="e.g. $3 Drafts & Free App for next 45 minutes"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-300">Patron Offer Details</label>
                  <input
                    type="text"
                    value={flashDeal.discountDescription}
                    onChange={(e) =>
                      setFlashDeal({ ...flashDeal, discountDescription: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                    placeholder="e.g. Valid at main patio bar. Show app screen."
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/80 border border-neutral-800">
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase font-mono">
                      Target Audience
                    </span>
                    <span className="text-white font-mono font-bold">1,420 nearby patrons</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase font-mono">
                      Redemptions
                    </span>
                    <span className="text-neutral-200 font-mono font-bold">
                      {flashDeal.claimCount} claimed
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exclusive VIP Deals Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Crown className="w-4 h-4 text-neutral-200" />
                    <span>Exclusive VIP Partner Deals & Line Skip Passes</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Every Bar Tap user can claim these exclusive venue perks for free. Each redemption is tracked with a unique digital voucher code.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddVipModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-copper hover:bg-tan text-ink font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create VIP Deal</span>
                </button>
              </div>

              {/* Exclusive Deals List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exclusiveDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-200 text-[10px] font-mono font-bold uppercase">
                          {deal.category} VIP PERK
                        </span>
                        <span className="text-xs font-mono font-bold text-neutral-200">
                          {deal.savingsValue}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">{deal.title}</h4>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                        {deal.offerDetails}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-neutral-500">Voucher:</span>
                        <span className="text-neutral-200 font-bold px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                          {deal.voucherCode}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setExclusiveDeals((prev) => prev.filter((d) => d.id !== deal.id))
                        }
                        className="text-neutral-500 hover:text-red-400 transition cursor-pointer"
                        title="Remove perk"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: HAPPY HOURS & DRINK SPECIALS
            ========================================================================= */}
        {activeTab === 'happy_hour' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-neutral-300" />
                    <span>Happy Hours & Menu Drink Specials</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Keep your happy hour windows and everyday specials updated. When Happy Hour is live, an active badge appears across your venue card.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-300 font-medium">Happy Hour Status:</span>
                  <span className="px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-mono font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tan animate-pulse" />
                    Active 4:00 PM – 7:00 PM
                  </span>
                </div>
              </div>

              {/* Add New Special Quick Form */}
              <form
                onSubmit={handleAddSpecial}
                className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3"
              >
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  + Add New Drink or Food Special
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      value={newDealTitle}
                      onChange={(e) => setNewDealTitle(e.target.value)}
                      placeholder="Special Title (e.g. $4 Local Craft Pints & Ciders)"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newDealPrice}
                      onChange={(e) => setNewDealPrice(e.target.value)}
                      placeholder="Price (e.g. $4.00 or 50% Off)"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                    />
                  </div>
                  <div>
                    <select
                      value={newDealCategory}
                      onChange={(e) =>
                        setNewDealCategory(e.target.value as DrinkSpecial['category'])
                      }
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper cursor-pointer"
                    >
                      <option value="happy_hour">Happy Hour</option>
                      <option value="beer">Craft Beer</option>
                      <option value="cocktail">Cocktail</option>
                      <option value="shots">Shots</option>
                      <option value="package">Pitcher / Bucket</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      value={newDealDesc}
                      onChange={(e) => setNewDealDesc(e.target.value)}
                      placeholder="Description (e.g. All Florida taps included)"
                      className="w-full sm:w-80 px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newDealIsHH}
                        onChange={(e) => setNewDealIsHH(e.target.checked)}
                        className="rounded border-neutral-700 accent-copper"
                      />
                      <span>Flag as Happy Hour</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-copper hover:bg-tan text-ink font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Add Special
                  </button>
                </div>
              </form>

              {/* Current Specials List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                  <span>Current Active Specials ({drinkSpecials.length})</span>
                  <span>Instant public feed sync</span>
                </div>

                {drinkSpecials.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold text-xs flex items-center justify-center shrink-0">
                        {deal.price || '$'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{deal.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-neutral-800 text-neutral-300">
                            {deal.category}
                          </span>
                          {deal.isHappyHour && (
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-neutral-800 text-neutral-200 border border-neutral-700 font-bold">
                              Happy Hour
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">{deal.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-neutral-400 hidden sm:inline">
                        {deal.day}
                      </span>
                      <button
                        onClick={() =>
                          setDrinkSpecials((prev) => prev.filter((s) => s.id !== deal.id))
                        }
                        className="p-2 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                        title="Delete special"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: HOURS, DOOR COVERS & LIVE EVENTS
            ========================================================================= */}
        {activeTab === 'hours_events' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Hours & Cover Charge Editor */}
              <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-300" />
                  <span>Operating Hours & Real-Time Door Cover</span>
                </h3>

                {/* Hours Today */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-300">Today's Operating Hours</label>
                  <input
                    type="text"
                    value={hoursToday}
                    onChange={(e) => setHoursToday(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                    placeholder="e.g. 11:30 AM – 2:00 AM"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['11:30 AM – 2:00 AM', '4:00 PM – 2:00 AM', '5:00 PM – Midnight'].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setHoursToday(preset)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300 cursor-pointer"
                        >
                          {preset}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Door Cover Charge */}
                <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                    <span>Door Cover Charge</span>
                    <span className="text-neutral-200 font-mono text-[11px]">
                      Est. Take: ${estimatedDoorRevenue}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={coverCharge}
                    onChange={(e) => setCoverCharge(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                    placeholder="e.g. Free Entry, $5 after 10 PM, etc."
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      'No Cover',
                      'Free Entry before 11 PM',
                      '$5 Cover',
                      '$10 Cover',
                      'Ladies Free / Guys $10',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCoverCharge(preset)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer transition ${
                          coverCharge === preset
                            ? 'bg-copper text-ink font-bold'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Entrance Wait Time */}
                <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                  <label className="text-xs font-semibold text-neutral-300">
                    Front Entrance Line Wait Time
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'No Wait (0m)', val: 0 },
                      { label: '5-10 mins', val: 8 },
                      { label: '15-20 mins', val: 18 },
                      { label: '30m+ (Line)', val: 35 },
                    ].map((w) => (
                      <button
                        key={w.label}
                        type="button"
                        onClick={() => setEstimatedWaitMinutes(w.val)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                          estimatedWaitMinutes === w.val
                            ? 'bg-copper text-ink font-black'
                            : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Events & Entertainment Lineup */}
              <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Music className="w-4 h-4 text-neutral-300" />
                    <span>Live Events & Entertainment Calendar</span>
                  </h3>
                  <button
                    onClick={() => setIsQuickEventOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-copper hover:bg-tan text-ink font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Event</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {eventsList.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 text-[10px] font-mono font-bold">
                          {ev.date} · {ev.time}
                        </span>
                        <span className="text-xs font-mono text-neutral-200 font-bold">
                          {ev.coverInfo}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
                        <Music className="w-3.5 h-3.5 text-neutral-300" />
                        <span>{ev.performer}</span>
                        {ev.genre && <span>· {ev.genre}</span>}
                      </div>
                      {ev.description && (
                        <p className="text-xs text-neutral-400 pt-1 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: CROWD TELEMETRY & LIVE STREAM OVERSIGHT
            ========================================================================= */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5">
              <CameraSetupPanel bar={selectedBar} />
            </div>
            {(selectedBar.cameras || []).length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">What patrons see</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(selectedBar.cameras || []).map((cam) => (
                    <div key={cam.id} className="rounded-2xl overflow-hidden border border-neutral-800">
                      <LiveCameraCanvas barId={selectedBar.id} barName={selectedBar.name} camera={cam} baseImage={selectedBar.image} isCompact />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB: PATRON REVIEWS & COMMUNITY FEEDBACK
            ========================================================================= */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-neutral-300" />
                    <span>Verified Tap-In Patron Reviews & Responses</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Only patrons verified at your venue can leave public ratings. Write official replies to thank guests or address feedback.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-neutral-950 px-3.5 py-2 rounded-xl border border-neutral-800">
                  <span className="text-neutral-200 text-base">★</span>
                  <span className="text-base font-black text-white">{selectedBar.rating}</span>
                  <span className="text-xs text-neutral-400 font-mono">
                    ({reviewsList.length} reviews)
                  </span>
                </div>
              </div>

              {/* Reviews Stream */}
              <div className="space-y-3">
                {reviewsList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{rev.author}</span>
                        <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 text-[10px] font-mono border border-neutral-700">
                          Verified Tap-In
                        </span>
                        <span className="text-neutral-200 font-mono">
                          {'★'.repeat(rev.rating)}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 font-mono">{rev.date}</span>
                    </div>

                    <p className="text-neutral-300 leading-relaxed text-xs">{rev.comment}</p>

                    {/* Owner Reply Display */}
                    {rev.ownerReply ? (
                      <div className="mt-2.5 p-3 rounded-xl bg-neutral-800/80 border border-neutral-700 text-xs">
                        <div className="text-[11px] text-neutral-200 font-bold font-mono">
                          Official Reply from {rev.ownerReply.author} ({rev.ownerReply.date}):
                        </div>
                        <div className="text-neutral-200 mt-1">{rev.ownerReply.text}</div>
                      </div>
                    ) : (
                      /* Reply Input */
                      <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center gap-2">
                        <input
                          type="text"
                          value={replyTextMap[rev.id] || ''}
                          onChange={(e) =>
                            setReplyTextMap((prev) => ({ ...prev, [rev.id]: e.target.value }))
                          }
                          placeholder="Type an official response to this guest..."
                          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-copper"
                        />
                        <button
                          onClick={() => handleReplyReview(rev.id)}
                          className="px-3 py-1.5 bg-copper hover:bg-tan text-ink font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Reply</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: VENUE PROFILE & WEBSITE VERIFICATION
            ========================================================================= */}
        {activeTab === 'profile_verify' && (
          <div className="space-y-6">
            {/* Website Verification Module */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800/80 border border-neutral-700 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 text-neutral-200 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-neutral-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Official Website & Venue Verification</h3>
                      {websiteVerification?.isVerified && (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-[10px] font-mono font-bold">
                          VERIFIED VENUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                      Verify ownership of your venue's official domain to display the official Verified Checkmark on Bar Tap and guarantee traffic routes to your genuine website.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunWebsiteVerification}
                  disabled={isVerifyingSite}
                  className="px-4 py-2 bg-copper hover:bg-tan disabled:opacity-50 text-ink font-black text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-black/20 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isVerifyingSite ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingSite ? 'Validating Domain...' : 'Run Automatic Verification'}</span>
                </button>
              </div>

              {/* Feedback Alert if verified */}
              {verifySuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-neutral-800/80 border border-neutral-700 text-neutral-200 text-xs font-mono flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-neutral-200 shrink-0" />
                  <span>{verifySuccessMessage}</span>
                </div>
              )}

              {/* Verification Details & Methods */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Method 1: HTML Meta Tag */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-200 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>HTML &lt;meta&gt; Tag Method</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Paste this tag inside the &lt;head&gt; of your homepage on Squarespace, WordPress, or Webflow:
                  </p>
                  <div className="p-2 bg-neutral-900 rounded-lg text-[10px] font-mono text-neutral-200 break-all border border-neutral-800">
                    &lt;meta name=&quot;bartap-verification&quot; content=&quot;{websiteVerification?.verificationToken}&quot; /&gt;
                  </div>
                  <button
                    onClick={handleCopyToken}
                    className="text-[11px] text-neutral-300 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedToken ? 'Copied to clipboard!' : 'Copy verification tag'}</span>
                  </button>
                </div>

                {/* Method 2: DNS TXT Record */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-200 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>DNS TXT Record</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Add a TXT record to your domain DNS provider (GoDaddy, Cloudflare, Namecheap):
                  </p>
                  <div className="p-2 bg-neutral-900 rounded-lg text-[10px] font-mono text-neutral-200 break-all border border-neutral-800">
                    Host: @ · Value: bartap-site-verification={websiteVerification?.verificationToken}
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono block">
                    TTL: 3600 (Automatic propagation)
                  </span>
                </div>

                {/* Method 3: Instant Verified Webhook */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-200 flex items-center justify-center text-[10px]">
                      3
                    </span>
                    <span>Live Domain Link Check</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Target Website: <strong className="text-white font-mono">{websiteUrl}</strong>
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-mono flex items-center gap-1.5 border border-neutral-800 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Test Website</span>
                    </a>
                    <span className="text-neutral-200 text-xs font-mono flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      SSL Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Venue Profile Details Editor */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-neutral-300" />
                <span>Venue Profile & Contact Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-300">Official Website URL</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-copper font-mono"
                      placeholder="https://..."
                    />
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition cursor-pointer"
                      title="Open website"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300">Contact Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-copper font-mono"
                    placeholder="(850) 000-0000"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300">Public Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                    placeholder="Short catchy description for patrons"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                    placeholder="e.g. Rooftop Lounge, Craft Brewery, Mega Club"
                  />
                </div>

                <div className="md:col-span-2 p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-white">Physical Venue Address</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {selectedBar.address}, {selectedBar.city}, {selectedBar.state} {selectedBar.zip}
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-200">
                    District: {selectedBar.neighborhood}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: ACCOUNT & ADMINISTRATIVE SUITE
            ========================================================================= */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Subscription & Billing Details */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-mono font-bold uppercase tracking-wider">
                      Partner Tier
                    </span>
                    <span className="text-xs text-neutral-200 font-mono font-bold">● Active</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">Bar Tap Commercial Partner Suite</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    $249/mo · Includes edge gateway routing, unlimited 1080p stream bandwidth, and AI crowd density sensors.
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-neutral-400">Next Billing Cycle</div>
                  <div className="text-sm font-mono font-bold text-white">Nov 15, 2026</div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Payment Method:</span>
                  <span className="text-white font-bold">Mastercard •••• 4821</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">CCTV Leases:</span>
                  <span className="text-neutral-200 font-bold">3 Axis Units Included</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Bandwidth Tier:</span>
                  <span className="text-white font-bold">Unmetered HD</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Account ID:</span>
                  <span className="text-neutral-200 font-bold">BT-TLH-7704</span>
                </div>
              </div>
            </div>

            {/* Staff & Manager Roles Access */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-neutral-300" />
                    <span>Venue Staff & Door Host Access</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Authorize general managers, door staff, and bartenders to adjust line wait times, covers, and flash deals.
                  </p>
                </div>

                <button
                  onClick={() => setShowInviteStaffModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-copper hover:bg-tan text-ink font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Staff Member</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {staffList.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-200 font-bold flex items-center justify-center shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{member.name}</span>
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-mono">
                            {member.role}
                          </span>
                        </div>
                        <span className="text-neutral-400 font-mono text-[11px]">{member.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-neutral-500 font-mono text-[11px]">
                        {member.lastActive}
                      </span>
                      {member.email !== owner.email && (
                        <button
                          onClick={() => setStaffList((prev) => prev.filter((m) => m.id !== member.id))}
                          className="text-neutral-500 hover:text-red-400 transition cursor-pointer"
                          title="Revoke access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hardware & Relay Inventory */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-neutral-300" />
                <span>Camera Hardware & Edge Relay Inventory</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                {cameras.map((c, idx) => (
                  <div key={c.id} className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Cam #{idx + 1}: {c.name}</span>
                      <span className="text-neutral-200 text-[10px]">● Online</span>
                    </div>
                    <div className="text-neutral-400 text-[11px]">
                      Model: {c.cloudRelay.hardwareModel || 'Axis P3265-LVE'}
                    </div>
                    <div className="text-neutral-500 text-[10px]">
                      IP: {c.cloudRelay.localIp || '192.168.1.10' + idx} · Node: {c.cloudRelay.edgeNode}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODALS & QUICK ACTIONS
          ========================================================================= */}

      {/* QUICK ACTION MODAL: Flash Deal Trigger */}
      {isQuickFlashOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-neutral-200 fill-tan" />
                <h3 className="text-base font-bold text-white">45-Minute Flash Deal Launcher</h3>
              </div>
              <button
                onClick={() => setIsQuickFlashOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Dispatch an instant notification to over 1,420 nearby Bar Tap users in {selectedBar.city}.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300">Special Headline</label>
                <input
                  type="text"
                  value={flashDeal.title}
                  onChange={(e) => setFlashDeal({ ...flashDeal, title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300">Offer Terms</label>
                <input
                  type="text"
                  value={flashDeal.discountDescription}
                  onChange={(e) =>
                    setFlashDeal({ ...flashDeal, discountDescription: e.target.value })
                  }
                  className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleFlashDeal();
                    setIsQuickFlashOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-copper hover:bg-tan text-ink font-black rounded-xl text-xs transition cursor-pointer shadow-lg shadow-black/20"
                >
                  {flashDeal.isActive ? 'Update & Push Deal' : 'Fire Flash Deal Now!'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickFlashOpen(false)}
                  className="px-4 py-2.5 bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTION MODAL: Door Cover Setter */}
      {isQuickCoverOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-neutral-200" />
                <h3 className="text-base font-bold text-white">Adjust Tonight's Cover</h3>
              </div>
              <button
                onClick={() => setIsQuickCoverOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                'No Cover',
                'Free Entry before 11 PM',
                '$5 Cover',
                '$10 Cover',
                '$15 VIP Skip-Line',
                'Ladies Free / Guys $10',
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => handleQuickSetCover(c)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                    coverCharge === c
                      ? 'bg-copper text-ink font-black'
                      : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-200'
                  }`}
                >
                  <span>{c}</span>
                  {coverCharge === c && <Check className="w-4 h-4 text-neutral-950" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTION MODAL: Add Live Event */}
      {isQuickEventOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-neutral-200" />
                <h3 className="text-base font-bold text-white">Add Live Performance / Event</h3>
              </div>
              <button
                onClick={() => setIsQuickEventOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300">Event Title</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. DJ Midnight & Saxophone Live"
                  className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300">Date</label>
                  <input
                    type="text"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    placeholder="Tonight or This Friday"
                    className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300">Time</label>
                  <input
                    type="text"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    placeholder="10:00 PM – 2:00 AM"
                    className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300">Performer / DJ</label>
                  <input
                    type="text"
                    value={newEventPerformer}
                    onChange={(e) => setNewEventPerformer(e.target.value)}
                    placeholder="e.g. DJ Spin"
                    className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300">Cover / Tickets</label>
                  <input
                    type="text"
                    value={newEventCover}
                    onChange={(e) => setNewEventCover(e.target.value)}
                    placeholder="e.g. Free before 11 PM"
                    className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickEventOpen(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-copper hover:bg-tan text-ink font-bold rounded-xl text-xs cursor-pointer"
                >
                  Save & Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create VIP Exclusive Deal */}
      {showAddVipModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-neutral-200" />
                <h3 className="text-base font-bold text-white">Create Exclusive VIP Deal</h3>
              </div>
              <button
                onClick={() => setShowAddVipModal(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVipDeal} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300">Perk Headline</label>
                <input
                  type="text"
                  required
                  value={newVipTitle}
                  onChange={(e) => setNewVipTitle(e.target.value)}
                  placeholder="e.g. VIP Line Skip & Complimentary Craft Carafe"
                  className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300">Offer Details</label>
                <input
                  type="text"
                  value={newVipDetails}
                  onChange={(e) => setNewVipDetails(e.target.value)}
                  placeholder="e.g. Present active VIP screen at door captain to bypass wait."
                  className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300">Savings Value</label>
                  <input
                    type="text"
                    value={newVipValue}
                    onChange={(e) => setNewVipValue(e.target.value)}
                    placeholder="$15.00 Value"
                    className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300">Category</label>
                  <select
                    value={newVipCategory}
                    onChange={(e) =>
                      setNewVipCategory(e.target.value as ExclusiveDeal['category'])
                    }
                    className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                  >
                    <option value="entry">VIP Entry & Line Skip</option>
                    <option value="drink">Complimentary Drink</option>
                    <option value="food">Appetizer / Food</option>
                    <option value="perk">Table / Lounge Perk</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVipModal(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-copper hover:bg-tan text-ink font-bold rounded-xl text-xs cursor-pointer"
                >
                  Activate VIP Perk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Invite Staff Member */}
      {showInviteStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-neutral-200" />
                <h3 className="text-base font-bold text-white">Invite Venue Team Member</h3>
              </div>
              <button
                onClick={() => setShowInviteStaffModal(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteStaff} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Taylor Brooks"
                  className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300">Staff Email</label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="taylor@venue.com"
                  className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300">Assigned Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as StaffMember['role'])}
                  className="mt-1 w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-copper"
                >
                  <option value="General Manager">General Manager (Full Access)</option>
                  <option value="Door Host">Door Host (Cover & Wait Times)</option>
                  <option value="Beverage Director">Beverage Director (Specials & Deals)</option>
                  <option value="Bar Staff">Bar Staff (Telemetry Viewer)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteStaffModal(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-copper hover:bg-tan text-ink font-bold rounded-xl text-xs cursor-pointer"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MODAL: Website Verification */}
      {isQuickVerifyOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-neutral-200" />
                <h3 className="text-base font-bold text-white">Verify Venue Website</h3>
              </div>
              <button
                onClick={() => setIsQuickVerifyOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Domain: <strong className="text-white font-mono">{websiteUrl}</strong>.
              Run a live DNS probe and SSL certificate validation to award your venue the verified checkmark.
            </p>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-200 flex items-center justify-between">
              <span>Token: {websiteVerification?.verificationToken}</span>
              <button
                onClick={handleCopyToken}
                className="text-neutral-300 hover:text-white hover:underline cursor-pointer"
              >
                {copiedToken ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsQuickVerifyOpen(false)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRunWebsiteVerification();
                  setIsQuickVerifyOpen(false);
                }}
                className="px-4 py-2 bg-copper hover:bg-tan text-ink font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-black/20"
              >
                Run Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
