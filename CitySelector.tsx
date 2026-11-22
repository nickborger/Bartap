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
    bestFor: string;
  }[];
}> = {
  tallahassee: {
    tagline: 'Tallahassee Nightlife Guide',
    description:
      'Tap In to a neighborhood below to filter the live video streams to the venues there.',
    districts: [
      {
        name: 'East / North Tally',
        vibe: 'Beer Garden, Live Music & Farm Taproom',
        description:
          'Out on Miccosukee Road, The Hub at Feather Oaks turned a historic farm\u2019s one-time horse barn into an indoor-outdoor taproom with a beer garden, food and live music.',
        bestFor: 'Craft beer, wine and frozen drinks, live music, family- and dog-friendly afternoons',
      },
    ],
  },
};

export const TallahasseeGuide: React.FC<TallahasseeGuideProps> = ({
  onSelectNeighborhood,
  bars,
  currentCity = 'Tallahassee',
}) => {
  const cityKey = 'tallahassee';

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
        {guide.districts.map((d) => {
          const districtBars = bars.filter((b) => b.neighborhood === d.name);
          return (
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
                  {districtBars.length} {districtBars.length === 1 ? 'venue' : 'venues'}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">{d.vibe}</h3>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{d.description}</p>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-2">
                <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Partner Venues with Bar Tap Hardware
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {districtBars.map((b) => b.name).map((h) => (
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
          );
        })}
      </div>
    </div>
  );
};
