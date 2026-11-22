import React from 'react';
import { Compass, Flame, MapPin, Music, Radio, Star, Users } from 'lucide-react';
import { BarLocation } from '../types.ts';

interface TallahasseeGuideProps {
  onSelectNeighborhood: (neighborhood: string) => void;
  bars: BarLocation[];
  currentCity?: string;
}

const CITY_DISTRICTS_DATA: Record<string, {
  tagline: string;
  description: string;
  districts: {
    name: string;
    vibe: string;
    description: string;
    highlights: string[];
    crowdAvg: string;
    bestFor: string;
  }[];
}> = {
  tallahassee: {
    tagline: 'Tallahassee Nightlife Guide',
    description:
      'Tallahassee’s bar scene spans from energetic collegiate patio taverns on Woodward Avenue to sophisticated 17th-floor rooftop lounges gazing over the Florida Capitol. Tap In to any neighborhood below to filter the live video streams.',
    districts: [
      {
        name: 'CollegeTown',
        vibe: 'High Energy & Campus Spirit',
        description:
          'The pulsing epicenter of Florida State student life, pregame parties, and modern patio hangouts along Woodward Ave.',
        highlights: ['Madison Social', 'Potbelly’s The Garden', 'Recess Dayclub', 'Township'],
        crowdAvg: '91% Peak',
        bestFor: 'College crowds, outdoor concerts, patio beer, game days',
      },
      {
        name: 'Railroad Square',
        vibe: 'Craft Arts, Beer Gardens & BBQ',
        description:
          'Tallahassee’s creative art district featuring sprawling brewery lawns, vintage duckpin bowling, smoked BBQ, and local craft production.',
        highlights: ['Proof Brewing Company', 'The Wilbury', 'Art District Beer Gardens'],
        crowdAvg: '80% Peak',
        bestFor: 'Craft beer lovers, lawn games, duckpin bowling, smoked BBQ',
      },
      {
        name: 'Midtown',
        vibe: 'Craft Beer & Relaxed Social',
        description:
          'Lively Thomasville Road district famous for Tallahassee microbreweries, 60+ draft tap walls, tiki gardens, speakeasy cocktails, and smoke-free dives.',
        highlights: ['The Brass Tap', 'Ology Brewing Co.', 'Waterworks Tiki', 'Liberty Bar', 'Leon Pub'],
        crowdAvg: '72% Peak',
        bestFor: 'Craft IPA enthusiasts, dog lovers, post-work happy hours',
      },
      {
        name: 'Downtown',
        vibe: 'Chic Rooftops & Skyline Vistas',
        description:
          'Upscale cocktail culture centered around luxury rooftop lounges overlooking the illuminated Florida State Capitol building and Cascades Park.',
        highlights: ['Eve on Adams (17th Fl)', 'Charlie Park (Cascades)', 'Level 8 Sky Lounge', 'Clyde’s & Costello’s'],
        crowdAvg: '75% Peak',
        bestFor: 'Cocktails, date nights, panoramic sunset photography, Monday traditions',
      },
      {
        name: 'Gaines St & Campus',
        vibe: 'Historic Sports Hubs & Mega Venues',
        description:
          'From legendary 50-year-old campus sports pubs with 32oz buckets to massive festival dance clubs and coastal craft brewpubs.',
        highlights: ['Palace Saloon', 'Bajas Beachclub', 'Oyster City Brewing'],
        crowdAvg: '88% Peak',
        bestFor: 'FSU game days, 32oz beer buckets, late-night festival dance energy',
      },
      {
        name: 'West Tennessee St',
        vibe: 'Iconic Nightlife Legends',
        description:
          'Home to Tallahassee’s oldest and most historic bars. Generations of Seminoles have celebrated here under the Florida stars.',
        highlights: ['Bullwinkle’s Saloon', 'Poor Paul’s Pourhouse (Est. 1976)'],
        crowdAvg: '86% Peak',
        bestFor: 'Free pizza nights, all-you-care-to-drink wristbands, darts',
      },
    ],
  },
  gainesville: {
    tagline: 'Gainesville Gator Nightlife Guide',
    description:
      'Gainesville combines historic college traditions along University Avenue with award-winning craft mixology in the revitalized downtown district, massive craft brewery lawns by Depot Park, and live entertainment corridors along Archer Road.',
    districts: [
      {
        name: 'Midtown & University Ave',
        vibe: 'Gator Game Day Central & College Patios',
        description:
          'Directly across from Ben Hill Griffin Stadium, Midtown is where students and alumni flock for sunny patio pitchers, shot wheels, European imports, and Beat the Clock Friday countdowns.',
        highlights: ['The Swamp Restaurant', 'The Grog House Bar & Grill', 'Salty Dog Saloon', 'Balls Bookstore & Pub', "Fat Daddy's", "Mother's Pub & Grill"],
        crowdAvg: '94% Peak',
        bestFor: 'Game day tailgates, Beat the Clock, student specials, patio pitchers',
      },
      {
        name: 'Downtown Gainesville',
        vibe: 'Underground Craft, Live Stages & Vintage Speakeasies',
        description:
          'Historic brick corridors filled with artisan amaro lounges, hidden courtyard patios, 3-story retro arcade bars, and legendary Florida punk/indie music concert stages.',
        highlights: ['The Top', 'High Dive Concert Hall', "Loosey's Downtown", 'The Arcade Bar', 'White Buffalo'],
        crowdAvg: '86% Peak',
        bestFor: 'Craft mixology, live concert tours, indie bands, retro arcade games, country dancing',
      },
      {
        name: 'Depot Park & South Main',
        vibe: 'Industrial Craft Breweries & Sprawling Lawns',
        description:
          'Railroad and park-adjacent warehouse district anchored by award-winning Florida craft breweries with vast beer gardens, food truck rallies, and sunset social vibes.',
        highlights: ['First Magnitude Brewing Company', 'Depot Park Beer Garden'],
        crowdAvg: '81% Peak',
        bestFor: 'Local Florida craft IPAs, dog-friendly lawns, food truck dinners, outdoor games',
      },
      {
        name: 'Archer Road Corridor',
        vibe: 'Destination Taprooms & Dueling Pianos',
        description:
          'Thriving modern entertainment zone featuring Gainesville’s flagship craft brewery wetlands deck and Celebration Pointe’s dueling piano cocktail lounge.',
        highlights: ['Swamp Head Brewery (The Wetlands)', 'The Keys Grill & Piano Bar'],
        crowdAvg: '79% Peak',
        bestFor: 'Wetlands sunset beers, Big Nose IPA drafts, live dueling pianos, craft cocktails',
      },
    ],
  },
  tampa: {
    tagline: 'Tampa Bay Nightlife Guide',
    description:
      'From 19th-century cigar factory brick cantinas in Ybor City to chic waterfront riverwalk lounges and high-energy SoHo patio crawls.',
    districts: [
      {
        name: 'SoHo (South Howard)',
        vibe: 'Open-Air Party Decks & Brunch Patios',
        description:
          'Tampa’s most bustling social corridor with turf beer gardens, European soccer bars, and high-energy outdoor happy hours.',
        highlights: ['MacDinton’s Irish Pub', 'Yard of Ale', 'Green Lemon'],
        crowdAvg: '92% Peak',
        bestFor: 'Friday $10 open bars, college alumni, astroturf day parties',
      },
      {
        name: 'Historic Ybor City',
        vibe: 'Brick Paved Cultural Sanctuary & Megaclubs',
        description:
          'Historic entertainment district famous for wild multi-floor music halls, live DJ venues, and brick-walled courtyards along 7th Ave.',
        highlights: ['The Castle Ybor', 'Bradley’s on 7th', 'Bad Monkey'],
        crowdAvg: '91% Peak',
        bestFor: 'Electronic dance music, historic walking crawls, craft absinthe',
      },
      {
        name: 'Downtown & Channelside',
        vibe: 'Waterfront Chic & Riverwalk Lounges',
        description:
          'Upscale indoor/outdoor gastropubs and sports amphitheaters right along Garrison Channel and the Tampa Riverwalk.',
        highlights: ['American Social Tampa', 'Park & Rec Tampa', 'Sparkman Wharf'],
        crowdAvg: '86% Peak',
        bestFor: 'Sunset bay views, Lightning hockey pregame, VIP cabanas',
      },
    ],
  },
  orlando: {
    tagline: 'Downtown Orlando Nightlife Guide',
    description:
      'Home to closed-street open-air block parties on Wall Street Plaza, hidden prohibition parlors, and neon nightlife on Orange Ave.',
    districts: [
      {
        name: 'Downtown & Wall Street Plaza',
        vibe: 'Mega Block Parties & Historic Speakeasies',
        description:
          '7 connected bars under open Florida skies alongside vintage speakeasies with hidden elevators and live jazz.',
        highlights: ['Wall Street Plaza', 'Mathers Social Gathering', 'Tier Nightclub'],
        crowdAvg: '95% Peak',
        bestFor: 'Street block parties, secret cocktail libraries, EDM stages',
      },
      {
        name: 'Mills 50 & Ivanhoe',
        vibe: 'Bohemian Craft & Artistic Patios',
        description:
          'Trendy cultural corridor filled with vinyl listening bars, natural wine gardens, and craft cocktail patios.',
        highlights: ['The Guesthouse', 'The Imperial', 'Sunroom'],
        crowdAvg: '82% Peak',
        bestFor: 'Relaxed mixology, outdoor fire pits, local creative crowd',
      },
    ],
  },
  miami: {
    tagline: 'Miami Nightlife & Arts Guide',
    description:
      'From 24-hour ultra-clubs and world-famous electronic terraces to street-mural beer gardens in Wynwood, 40th-floor skyline rooftop gardens in Brickell, iconic Ocean Drive dives, and historic Latin salsa bandshells on Calle Ocho.',
    districts: [
      {
        name: 'Wynwood Arts District',
        vibe: 'Mural Patios, Secret Lounges & Hip Hop Halls',
        description:
          'Industrial graffiti district converted into sprawling outdoor concert gardens, secret backdoor taco lounge dance clubs, and neon Asian food hall patios.',
        highlights: ['Gramps Wynwood', 'Coyo Taco Secret Lounge', 'Oasis Wynwood', '1-800-Lucky'],
        crowdAvg: '92% Peak',
        bestFor: 'Live funk & indie, outdoor concert amphitheaters, craft cocktails, street art backdrops',
      },
      {
        name: 'Downtown & Park West',
        vibe: '24/7 Global Megaclubs & Riverfront Day Parties',
        description:
          'The heartbeat of global dance culture: 24/7 theatrical ultra-clubs, sunrise electronic terraces with parachute canopies, and open-air riverfront boat parties.',
        highlights: ['E11EVEN Miami', 'Club Space', 'The Wharf Miami / Riverside'],
        crowdAvg: '98% Peak',
        bestFor: '24/7 partying, sunrise electronic sets, riverfront nautical day drinking, aerial spectacles',
      },
      {
        name: 'South Beach (SoBe)',
        vibe: 'Celebrity Megaclubs, Historic Dives & Speakeasies',
        description:
          'From the pulsating $100M production dome at LIV to Miami’s oldest neon-lit dive bar and secret speakeasies hidden behind taco shop porta-potties.',
        highlights: ['LIV Miami', "Mac's Club Deuce", 'Bodega Taqueria y Tequila', 'Sweet Liberty Drinks & Supply Co.'],
        crowdAvg: '96% Peak',
        bestFor: 'Celebrity sightings, world-touring DJs, late-night craft mixology, 2-for-1 dive beers',
      },
      {
        name: 'Brickell Financial Skyline',
        vibe: 'Sky-High Rooftop Sanctuaries & Cocktail Lounges',
        description:
          'Glitzy urban jungle featuring 40th-floor Balinese garden rooftops overlooking Biscayne Bay, vibrant DJ dance floors, and intimate craft cocktail houses.',
        highlights: ['Sugar at EAST Miami', 'Blackbird Ordinary', 'Baby Jane Cocktail House'],
        crowdAvg: '91% Peak',
        bestFor: 'Breathtaking 40th-floor skyline views, craft mixology, lively outdoor patios, upscale socializing',
      },
      {
        name: 'Coconut Grove & Coral Gables',
        vibe: 'Bayside Tiki Bars & Reggae Waterfronts',
        description:
          'Historic bohemian coastal village famous for waterfront tiki huts, live reggae calypso bands, and world-renowned PK Painkiller rums over the marina.',
        highlights: ["Monty's Raw Bar & Marina"],
        crowdAvg: '87% Peak',
        bestFor: 'Marina sunset views, tiki cocktails, fresh raw bar oysters, live reggae weekends',
      },
      {
        name: 'Little Havana & Calle Ocho',
        vibe: 'Historic 1930s Salsa & Pineapple Bandshells',
        description:
          'Vibrant Cuban cultural epicenter with authentic live 8-piece salsa orchestras, hand-rolled cigars, and handcrafted mojitos under the tropical stars.',
        highlights: ['Ball & Chain Little Havana'],
        crowdAvg: '93% Peak',
        bestFor: 'Live salsa dancing, authentic Cuban mojitos, historic live jazz, cultural energy',
      },
    ],
  },
  austin: {
    tagline: 'Austin Live Music & Patio Guide',
    description:
      'Sprawling bungalow beer gardens on Rainey Street, authentic two-stepping honky tonks in East Austin, and legendary 6th Street rock clubs.',
    districts: [
      {
        name: 'Rainey Street Historic',
        vibe: 'Craftsman Bungalow Beer Gardens',
        description:
          'Quaint historic houses transformed into open-air taverns with 200+ draft taps, food truck pods, and live brass bands.',
        highlights: ['Banger’s Sausage House', 'Clive Bar', 'Container Bar'],
        crowdAvg: '93% Peak',
        bestFor: 'Lawn games, German bratwurst, dog-friendly craft patios',
      },
      {
        name: 'East Austin & 6th',
        vibe: 'Two-Step Honky Tonks & Retro Rock',
        description:
          'Where authentic Texas country two-stepping lives alongside mezcal cantinas and indie concert backyards.',
        highlights: ['The White Horse', 'Hotel Vegas', 'Whisler’s'],
        crowdAvg: '89% Peak',
        bestFor: 'Live two-stepping, cold Lone Star, vinyl rock sets',
      },
    ],
  },
  nashville: {
    tagline: 'Nashville Music City Nightlife Guide',
    description:
      'Non-stop live music across 4-level rooftop honky tonks on Lower Broadway and relaxed songwriter lounges in Midtown.',
    districts: [
      {
        name: 'Lower Broadway Honky Tonks',
        vibe: 'The World-Famous Honky Tonk Highway',
        description:
          'Historic 3-story stages echoing with country anthems, river breezes from rooftop decks, and cold draft beer all day and night.',
        highlights: ['Tootsie’s Orchid Lounge', 'Robert’s Western World', 'Acme Feed & Seed'],
        crowdAvg: '97% Peak',
        bestFor: 'Live country guitars, rooftop views, historic Nashville lore',
      },
      {
        name: 'Midtown & Division St',
        vibe: 'Local Songwriter Hangs & Dive Patios',
        description:
          'Where touring musicians and locals relax without Broadway’s crushing sidewalk queues.',
        highlights: ['Losers Bar & Grill', 'Winners', 'Red Door Saloon'],
        crowdAvg: '85% Peak',
        bestFor: 'Local music industry crowd, relaxed dive beers, acoustic jams',
      },
    ],
  },
};

export const TallahasseeGuide: React.FC<TallahasseeGuideProps> = ({
  onSelectNeighborhood,
  bars,
  currentCity = 'Tallahassee',
}) => {
  const cityKey = currentCity.toLowerCase().includes('gainesville')
    ? 'gainesville'
    : currentCity.toLowerCase().includes('tampa')
    ? 'tampa'
    : currentCity.toLowerCase().includes('orlando')
    ? 'orlando'
    : currentCity.toLowerCase().includes('miami')
    ? 'miami'
    : currentCity.toLowerCase().includes('austin')
    ? 'austin'
    : currentCity.toLowerCase().includes('nashville')
    ? 'nashville'
    : 'tallahassee';

  const guide = CITY_DISTRICTS_DATA[cityKey] || CITY_DISTRICTS_DATA.tallahassee;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
          <Compass className="w-4 h-4" />
          <span>{guide.tagline}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Explore {currentCity}'s Nightlife Districts
        </h2>
        <p className="text-sm text-neutral-400 mt-2 max-w-3xl leading-relaxed">
          {guide.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {guide.districts.map((d) => (
          <div
            key={d.name}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-neutral-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {d.name}
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-950 text-neutral-300 font-mono text-xs border border-neutral-800">
                  {d.crowdAvg}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">{d.vibe}</h3>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{d.description}</p>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-2">
                <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Partner Venues with Bar Tap Hardware
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {d.highlights.map((h) => (
                    <span
                      key={h}
                      className="px-2.5 py-1 rounded-lg bg-neutral-950 text-xs font-medium text-neutral-200 border border-neutral-800"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3 text-xs text-neutral-400">
                <strong className="text-neutral-300">Best for: </strong>
                {d.bestFor}
              </div>
            </div>

            <button
              onClick={() => onSelectNeighborhood(d.name)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition cursor-pointer"
            >
              <Radio className="w-4 h-4 text-red-500" />
              <span>Tap In to {d.name} Live Feeds</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
