import { BarLocation } from '../types.ts';
import { bundledImageRef } from './bundledImages.ts';

/*
 * BUILT-IN SEED DATA
 * Bars now live in the Firestore `bars` collection and are managed from the in-app Admin screen.
 * This file is only used (1) to fill an empty `bars` collection the first time an admin signs in,
 * and (2) as a fallback so the app is never empty before that happens.
 */

// Weekly hours from thehubatfeatheroaks.com (closed Monday and Tuesday).
// Index matches Date.getDay(): 0 = Sunday ... 6 = Saturday.
const HUB_WEEKLY_HOURS: (string | null)[] = [
  '11:00 AM – 8:00 PM', // Sunday
  null, // Monday
  null, // Tuesday
  '3:00 PM – 9:00 PM', // Wednesday
  '3:00 PM – 9:00 PM', // Thursday
  '11:00 AM – 10:00 PM', // Friday
  '11:00 AM – 10:00 PM', // Saturday
];

function hoursForToday(weekly: (string | null)[]): string {
  const today = weekly[new Date().getDay()];
  return today ?? 'Closed today';
}

const HUB_SLUG = 'hub-at-feather-oaks';

const HUB_CAMERAS = [
  {
    id: 'hub-cam-1',
    name: 'Tasting Bar(n) Taproom',
    locationLabel: 'Indoor Tasting Bar(n) – 18 Draft Taps',
    viewType: 'main_bar' as const,
  },
  {
    id: 'hub-cam-2',
    name: 'Outside Beer Garden Bar',
    locationLabel: 'Beer Garden – 14 Draft Taps',
    viewType: 'patio' as const,
  },
  {
    id: 'hub-cam-3',
    name: 'Outdoor Stage',
    locationLabel: 'Live Music Stage & Lawn',
    viewType: 'stage' as const,
  },
];

export const INITIAL_TALLAHASSEE_BARS: BarLocation[] = [
  {
    id: 'hub-at-feather-oaks',
    name: 'The Hub at Feather Oaks',
    slug: HUB_SLUG,
    tagline: 'Tallahassee’s favorite gathering spot for good food, beer, music and company',
    neighborhood: 'East / North Tally',
    address: '6500 Miccosukee Rd',
    city: 'Tallahassee',
    state: 'FL',
    zip: '32309',
    websiteUrl: 'https://www.thehubatfeatheroaks.com',
    phone: '(850) 559-0424',
    hoursToday: hoursForToday(HUB_WEEKLY_HOURS),
    coverCharge: 'Varies by event',
    // Live metrics start at zero until real tap-ins / owner updates come in
    crowdDensity: 0,
    estimatedWaitMinutes: 0,
    currentVibe: 'Craft & Relaxed',
    // Ratings come from Bar Tap users' own reviews (stored in Firestore)
    rating: 0,
    totalReviews: 0,
    category: 'Beer Garden',
    image: bundledImageRef('hub_feather_oaks_taproom'),
    weeklyHours: HUB_WEEKLY_HOURS.map((h) => h ?? ''),
    priceLevel: '',
    isActive: true,
    market: 'Tallahassee',
    tappedInCount: 0,
    features: [
      'Tasting Bar(n) with 18 Draft Taps',
      'Outside Beer Garden Bar with 14 Draft Taps',
      'Local & Regional Craft Beer',
      'Wine & Frozen Drinks',
      'Rustic Grub Kitchen On Site',
      'Live Music',
      'Football on All TVs',
      'Family Friendly',
      'Dogs Welcome (6 ft Leash)',
      'Non-Smoking Venue',
      'Historic Farm Setting (14 Acres)',
    ],
    drinkSpecials: [
      {
        id: 'hub-sp-1',
        title: '$1 Off House Wines',
        description: 'Wednesday dinner nights with Rustic Grub in the kitchen and $1 off house wines.',
        price: '$1 Off',
        category: 'happy_hour',
        day: 'Wednesdays',
        featured: true,
      },
    ],
    reviews: [],
    coordinates: { lat: 30.4981592, lng: -84.1685526 },
    partnerTier: 'Verified Partner',
    partnerStatus: 'Subscribed',
    hardwareInstalled: [`${HUB_CAMERAS.length}x Cloud Relay Feeds`],
    cameras: HUB_CAMERAS.map((cam, idx) => ({
      ...cam,
      fps: 30,
      crowdLevel: 0,
      status: 'LIVE' as const,
      resolution: '1080p HD',
      cloudRelay: {
        streamUrl: `wss://relay.bartap.live/tlh-stream/${HUB_SLUG}/${cam.id}`,
        ingestProtocol: 'WebRTC-Edge' as const,
        edgeNode: 'TLH-Metro-Cloud-01',
        relayStatus: 'ACTIVE' as const,
        bitrateKbps: 4200,
        latencyMs: 175 + ((idx * 17) % 35),
        packetLossPercent: 0.0,
      },
    })),
  },
];

export const ALL_PARTNER_BARS: BarLocation[] = [...INITIAL_TALLAHASSEE_BARS];
