export interface CloudRelayConfig {
  streamUrl: string;
  ingestProtocol: 'RTSP-TLS' | 'WebRTC-Edge' | 'SRT' | 'Low-Latency HLS';
  edgeNode: string; // e.g. "TLH-Edge-01 (Tallahassee PoP)"
  relayStatus: 'ACTIVE' | 'STANDBY' | 'CONNECTING' | 'MAINTENANCE';
  bitrateKbps: number;
  latencyMs: number;
  packetLossPercent: number;
  hardwareModel?: string; // e.g. "Verkada CD52 / Axis P3265"
  localIp?: string; // e.g. "192.168.1.104:554"
}

export interface CameraAngle {
  id: string;
  name: string;
  locationLabel: string;
  viewType: 'patio' | 'main_bar' | 'stage' | 'entrance' | 'lounge';
  fps: number;
  crowdLevel: number; // 0-100%
  status: 'LIVE' | 'STANDBY';
  resolution: string;
  cloudRelay: CloudRelayConfig;
}

export interface DrinkSpecial {
  id: string;
  title: string;
  description: string;
  price?: string;
  category: 'beer' | 'cocktail' | 'shots' | 'happy_hour' | 'package';
  day: string; // e.g. "Every Day", "Mon-Fri", "Thursday"
  isHappyHour?: boolean;
  happyHourStart?: string; // "16:00"
  happyHourEnd?: string; // "19:00"
  featured?: boolean;
}

export interface Review {
  id: string;
  author: string;
  avatarSeed?: string;
  rating: number; // 1-5
  vibeScore: number; // 1-5
  valueScore: number; // 1-5
  musicScore: number; // 1-5
  date: string;
  comment: string;
  tags?: string[];
  helpfulCount: number;
  ownerReply?: {
    date: string;
    text: string;
    author: string;
  };
}

export interface BarLocation {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  neighborhood: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  websiteUrl: string;
  phone: string;
  hoursToday: string;
  coverCharge: string;
  crowdDensity: number; // 0 - 100
  estimatedWaitMinutes: number;
  currentVibe:
    | 'High Energy'
    | 'Packed Party'
    | 'Chilled Social'
    | 'Live Music'
    | 'Upscale Lounge'
    | 'Craft & Relaxed';
  rating: number;
  totalReviews: number;
  category:
    | 'College Pub'
    | 'Rooftop Lounge'
    | 'Beer Garden'
    | 'Craft Brewery'
    | 'Dive Bar'
    | 'Sports Bar'
    | 'Cocktail Lounge'
    | 'Mega Club'
    | 'Live Music'
    | string;
  image: string;
  cameras: CameraAngle[];
  drinkSpecials: DrinkSpecial[];
  reviews: Review[];
  features: string[];
  currentDJsBand?: string;
  tappedInCount: number;
  // Partner & Geographical Attributes
  coordinates?: {
    lat: number;
    lng: number;
  };
  distanceMiles?: number;
  partnerTier?: 'Diamond Partner' | 'Gold Partner' | 'Verified Partner';
  partnerStatus?: 'Subscribed' | 'Partner';
  partnerSince?: string;
  hardwareInstalled?: string[];
  events?: VenueEvent[];
  websiteVerification?: WebsiteVerification;
  activeFlashDeal?: FlashDealState;
  staff?: StaffMember[];
  auditLog?: AuditLogItem[];
}

export interface VenueEvent {
  id: string;
  title: string;
  date: string; // e.g. "Tonight", "This Friday", "Saturday"
  time: string; // e.g. "9:00 PM - 2:00 AM"
  performer: string;
  genre?: string;
  coverInfo: string;
  ticketUrl?: string;
  featured?: boolean;
  description?: string;
}

export interface WebsiteVerification {
  isVerified: boolean;
  domain: string;
  verifiedAt?: string;
  method?: 'dns_txt' | 'meta_tag' | 'instant_webhook';
  sslValid?: boolean;
  verificationToken?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'General Manager' | 'Door Host' | 'Beverage Director' | 'Bar Staff';
  status: 'ACTIVE' | 'INVITED';
  lastActive?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface FlashDealState {
  isActive: boolean;
  title: string;
  discountDescription: string;
  minutesLeft: number;
  claimCount: number;
  targetAudienceReach: number;
  startedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isPremium: boolean;
  isTrial?: boolean;
  trialEndsAt?: string;
  premiumUntil?: string;
  savedBarIds: string[];
  tappedBarIds: string[];
  joinedDate: string;
}

export interface ExclusiveDeal {
  id: string;
  barId: string;
  barName: string;
  neighborhood: string;
  city?: string;
  title: string;
  offerDetails: string;
  savingsValue: string;
  voucherCode: string;
  category: 'drink' | 'entry' | 'food' | 'perk';
  terms: string;
  sponsorType: 'Venue Partner' | 'Local Craft Vendor';
}

export interface BusinessOwnerProfile {
  id: string;
  name: string;
  email: string;
  role:
    | 'Owner'
    | 'General Manager'
    | 'Operating Partner'
    | 'Beverage Director'
    | 'Venue Director';
  managedBarIds: string[];
  primaryBarId: string;
  avatar: string;
  verified: boolean;
  businessName?: string;
  phone?: string;
  joinedDate: string;
}


