export interface CityMeta {
  id: string; // e.g. 'tallahassee'
  name: string; // e.g. 'Tallahassee'
  state: string; // e.g. 'FL'
  displayName: string; // 'Tallahassee, FL'
  lat: number;
  lng: number;
  neighborhoods: string[];
  tagline: string;
  description: string;
  relayPoP: string;
  defaultRadiusMiles: number;
  popularDistricts: string[];
  aliases?: string[];
  zipCodes?: string[];
}

export const SUPPORTED_CITIES: CityMeta[] = [
  {
    id: 'tallahassee',
    name: 'Tallahassee',
    state: 'FL',
    displayName: 'Tallahassee, FL',
    lat: 30.4383,
    lng: -84.2807,
    neighborhoods: ['East / North Tally'],
    tagline: 'State Capitol & Collegiate Nightlife Epiphany',
    description: 'Vibrant college bar circuits, high-energy rooftop lounges, craft breweries, and live concert venues around FSU, FAMU, and the Florida Capitol.',
    relayPoP: 'TLH-Primary-PoP (4 Edge Relays)',
    defaultRadiusMiles: 15,
    popularDistricts: ['Miccosukee Rd, East Tallahassee'],
    aliases: ['tally', 'tlh', 'miccosukee', 'feather oaks', 'fsu', 'famu', 'seminoles', 'woodward', 'collegetown', 'florida state', 'capitol'],
    zipCodes: ['32301', '32303', '32304', '32308', '32309', '32310', '32311', '32312'],
  },
];

export interface ExpansionCityMeta {
  name: string;
  state: string;
  displayName: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export const POPULAR_EXPANSION_CITIES: ExpansionCityMeta[] = [
  { name: 'Atlanta', state: 'GA', displayName: 'Atlanta, GA', lat: 33.749, lng: -84.388, aliases: ['atl', 'buckhead', 'midtown atlanta', 'inman park', 'georgia tech'] },
  { name: 'Charlotte', state: 'NC', displayName: 'Charlotte, NC', lat: 35.2271, lng: -80.8431, aliases: ['clt', 'uptown', 'south end', 'queen city'] },
  { name: 'Jacksonville', state: 'FL', displayName: 'Jacksonville, FL', lat: 30.3322, lng: -81.6557, aliases: ['jax', 'duval', 'jax beach', 'riverside'] },
  { name: 'Fort Lauderdale', state: 'FL', displayName: 'Fort Lauderdale, FL', lat: 26.1224, lng: -80.1373, aliases: ['ftl', 'las olas', 'broward'] },
  { name: 'St. Petersburg', state: 'FL', displayName: 'St. Petersburg, FL', lat: 27.7676, lng: -82.6403, aliases: ['st pete', 'central ave', 'tampa bay st pete'] },
  { name: 'Panama City Beach', state: 'FL', displayName: 'Panama City Beach, FL', lat: 30.1766, lng: -85.8055, aliases: ['pcb', 'panama city', 'club la vela'] },
  { name: 'Pensacola', state: 'FL', displayName: 'Pensacola, FL', lat: 30.4213, lng: -87.2169, aliases: ['pcola', 'palafox', 'uwf'] },
  { name: 'Key West', state: 'FL', displayName: 'Key West, FL', lat: 24.5551, lng: -81.7799, aliases: ['duval st', 'conch republic', 'the keys'] },
  { name: 'New Orleans', state: 'LA', displayName: 'New Orleans, LA', lat: 29.9511, lng: -90.0715, aliases: ['nola', 'bourbon st', 'french quarter', 'marigny'] },
  { name: 'Dallas', state: 'TX', displayName: 'Dallas, TX', lat: 32.7767, lng: -96.797, aliases: ['dfw', 'deep ellum', 'uptown dallas'] },
  { name: 'Houston', state: 'TX', displayName: 'Houston, TX', lat: 29.7604, lng: -95.3698, aliases: ['htx', 'montrose', 'midtown houston', 'washington corridor'] },
  { name: 'Chicago', state: 'IL', displayName: 'Chicago, IL', lat: 41.8781, lng: -87.6298, aliases: ['chi', 'wrigleyville', 'river north', 'wicker park', 'windy city'] },
  { name: 'New York', state: 'NY', displayName: 'New York, NY', lat: 40.7128, lng: -74.006, aliases: ['nyc', 'manhattan', 'brooklyn', 'east village', 'williamsburg'] },
  { name: 'Denver', state: 'CO', displayName: 'Denver, CO', lat: 39.7392, lng: -104.9903, aliases: ['lodo', 'rino', 'mile high'] },
  { name: 'Los Angeles', state: 'CA', displayName: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437, aliases: ['la', 'hollywood', 'west hollywood', 'downtown la', 'santa monica'] },
  { name: 'Las Vegas', state: 'NV', displayName: 'Las Vegas, NV', lat: 36.1699, lng: -115.1398, aliases: ['vegas', 'the strip', 'fremont'] },
  { name: 'Charleston', state: 'SC', displayName: 'Charleston, SC', lat: 32.7765, lng: -79.9311, aliases: ['king st', 'holy city'] },
  { name: 'Savannah', state: 'GA', displayName: 'Savannah, GA', lat: 32.0809, lng: -81.0912, aliases: ['river street', 'historic savannah'] },
];

/**
 * Searches supported partner cities matching a user query string.
 * Supports partial matching across city name, state, aliases, zip codes, and districts.
 */
export function searchSupportedCities(query: string): CityMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return SUPPORTED_CITIES;

  return SUPPORTED_CITIES.filter((city) => {
    if (city.name.toLowerCase().includes(q)) return true;
    if (city.id.toLowerCase().includes(q)) return true;
    if (city.displayName.toLowerCase().includes(q)) return true;
    if (city.state.toLowerCase() === q) return true;
    if (city.tagline.toLowerCase().includes(q)) return true;
    if (city.neighborhoods.some((n) => n.toLowerCase().includes(q))) return true;
    if (city.popularDistricts.some((d) => d.toLowerCase().includes(q))) return true;
    if (city.aliases && city.aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))) return true;
    if (city.zipCodes && city.zipCodes.some((z) => z.startsWith(q))) return true;
    return false;
  });
}

/**
 * Search expansion cities not yet partnered
 */
export function searchExpansionCities(query: string): ExpansionCityMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return POPULAR_EXPANSION_CITIES.filter((city) => {
    if (city.name.toLowerCase().includes(q)) return true;
    if (city.displayName.toLowerCase().includes(q)) return true;
    if (city.aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))) return true;
    return false;
  });
}

/**
 * Match query to the single best partner city (or null if none)
 */
export function matchBestPartnerCity(query: string): CityMeta | null {
  const results = searchSupportedCities(query);
  return results.length > 0 ? results[0] : null;
}

/**
 * Calculate distance between two GPS coordinates using Haversine Formula
 * @returns Distance in miles rounded to 1 decimal place
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Number(d.toFixed(1));
}

/**
 * Find the closest supported Bar Tap city to the provided coordinates
 */
export function findNearestCity(
  userLat: number,
  userLng: number
): { city: CityMeta; distanceMiles: number } {
  let nearestCity = SUPPORTED_CITIES[0];
  let minDistance = calculateDistanceMiles(userLat, userLng, nearestCity.lat, nearestCity.lng);

  for (let i = 1; i < SUPPORTED_CITIES.length; i++) {
    const candidate = SUPPORTED_CITIES[i];
    const dist = calculateDistanceMiles(userLat, userLng, candidate.lat, candidate.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = candidate;
    }
  }

  return {
    city: nearestCity,
    distanceMiles: minDistance,
  };
}

/**
 * Helper to format distance nicely for UI pills
 */
export function formatDistancePill(distanceMiles?: number): string {
  if (distanceMiles === undefined || distanceMiles === null) return '';
  if (distanceMiles < 0.1) return 'Here now (<0.1 mi)';
  if (distanceMiles < 1) return `${distanceMiles.toFixed(1)} mi away`;
  if (distanceMiles < 10) return `${distanceMiles.toFixed(1)} mi`;
  return `${Math.round(distanceMiles)} mi away`;
}

/**
 * Request user's real browser geolocation
 */
export function requestBrowserLocation(): Promise<{
  lat: number;
  lng: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message = 'Unable to retrieve your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access was denied. Please allow location access or choose a city manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is currently unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}
