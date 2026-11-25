import React, { useState } from 'react';
import {
  BarChart3,
  Clock,
  Eye,
  Globe,
  MessageCircle,
  MousePointerClick,
  Navigation,
  Phone,
  Radio,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  MIN_WATCH_MS,
  NightStats,
  PUBLIC_VIEWER_THRESHOLD,
  formatDuration,
  totalNights,
  useVenueAnalytics,
} from '../services/analyticsService.ts';

const RANGES = [
  { key: 0, label: 'Tonight' },
  { key: 6, label: 'Last 7 nights' },
  { key: 29, label: 'Last 30 nights' },
] as const;

const nightLabel = (night: string) => {
  const [y, m, d] = night.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};
const timeLabel = (ms: number | null) =>
  ms ? new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';

const Stat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  highlight?: boolean;
  testId?: string;
}> = ({ icon, label, value, sub, highlight, testId }) => (
  <div
    className={`p-3.5 rounded-2xl border ${highlight ? 'bg-copper/10 border-copper/60' : 'bg-neutral-950/60 border-neutral-800'}`}
    data-testid={testId}
  >
    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
      <span className="text-tan">{icon}</span>
      {label}
    </div>
    <div className="text-2xl font-black text-neutral-100 mt-1 tabular-nums" data-testid={testId ? `${testId}-value` : undefined}>
      {value}
    </div>
    {sub && <div className="text-[11px] text-neutral-400 mt-0.5">{sub}</div>}
  </div>
);

/**
 * The venue's viewer + engagement numbers, for the bar's owner (owner tools) and the admin.
 * All numbers are real counts from the Realtime Database; nothing here names a viewer.
 */
export const VenueAnalytics: React.FC<{
  barId: string;
  barName: string;
  /** owner: shown in owner tools; admin: shown in the Admin screen */
  audience: 'owner' | 'admin';
  adminUid?: string;
}> = ({ barId, barName, audience, adminUid }) => {
  const [range, setRange] = useState<number>(0);
  const data = useVenueAnalytics(barId, range);
  const totals = totalNights(data.nights);
  const c = totals.counts;

  return (
    <div className="space-y-4" data-testid="venue-analytics">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-copper" />
          <div>
            <h3 className="text-base font-black text-neutral-100 tracking-tight">Viewers &amp; engagement</h3>
            <p className="text-[11px] text-neutral-400">{barName} · a night runs 5 AM to 5 AM</p>
          </div>
        </div>
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              data-testid={`analytics-range-${r.key}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                range === r.key ? 'bg-copper text-ink' : 'text-neutral-300 hover:text-neutral-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {data.error ? (
        <div className="p-4 rounded-2xl bg-neutral-950/60 border border-copper/50 text-sm text-neutral-200 space-y-2" role="status" data-testid="analytics-error">
          <div className="flex items-center gap-2 font-bold text-neutral-100">
            <ShieldCheck className="w-4 h-4 text-tan" />
            {data.error === 'permission' ? 'Analytics aren’t switched on for this account yet' : 'Analytics couldn’t load'}
          </div>
          {data.error === 'permission' ? (
            audience === 'admin' ? (
              <p className="text-xs text-neutral-300">
                Add yourself as an admin in the Realtime Database (Data tab: <code className="text-tan">admins</code> →{' '}
                <code className="text-tan break-all">{adminUid || 'your user ID'}</code> → <code className="text-tan">true</code>), then reload this page.
              </p>
            ) : (
              <p className="text-xs text-neutral-300">
                Your numbers are being counted. Bar Tap just needs to open its Admin screen once to connect your account. Ask Bar Tap, then reload
                this page.
              </p>
            )
          ) : (
            <p className="text-xs text-neutral-300">{data.error}</p>
          )}
        </div>
      ) : !data.loaded ? (
        <div className="p-6 text-center text-sm text-neutral-400" data-testid="analytics-loading">
          Loading numbers…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              testId="stat-watching-now"
              highlight
              icon={<Radio className="w-3.5 h-3.5" />}
              label="Watching now"
              value={data.watchingNow}
              sub={
                data.watchingNow >= PUBLIC_VIEWER_THRESHOLD
                  ? 'Viewers see this number too'
                  : `Viewers see the number from ${PUBLIC_VIEWER_THRESHOLD} up`
              }
            />
            <Stat
              testId="stat-peak"
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              label="Peak viewers"
              value={totals.peak}
              sub={
                totals.peak > 0 && totals.peakNight
                  ? `${range === 0 ? 'Tonight' : nightLabel(totals.peakNight)} at ${timeLabel(totals.peakAt)}`
                  : 'Most watching at once'
              }
            />
            <Stat
              testId="stat-avg-watch"
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Avg watch time"
              value={totals.watches ? formatDuration(totals.avgWatchMs) : '—'}
              sub={`${totals.watches} ${totals.watches === 1 ? 'watch' : 'watches'}`}
            />
            <Stat
              testId="stat-total-watch"
              icon={<Eye className="w-3.5 h-3.5" />}
              label="Total watch time"
              value={totals.watches ? formatDuration(totals.totalWatchMs) : '—'}
              sub="All viewers added up"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat testId="stat-pageViews" icon={<Users className="w-3.5 h-3.5" />} label="Page views" value={c.pageViews} sub="Times your page was opened" />
            <Stat testId="stat-directions" icon={<Navigation className="w-3.5 h-3.5" />} label="Directions taps" value={c.directions} sub="Opened maps to you" />
            <Stat testId="stat-chat" icon={<MessageCircle className="w-3.5 h-3.5" />} label="Chat messages" value={c.chat} sub="Sent in your live chat" />
            <Stat testId="stat-social" icon={<MousePointerClick className="w-3.5 h-3.5" />} label="Social taps" value={c.social} sub="Instagram, TikTok, Facebook" />
            <Stat testId="stat-website" icon={<Globe className="w-3.5 h-3.5" />} label="Website taps" value={c.website} sub="Opened your website" />
            <Stat testId="stat-calls" icon={<Phone className="w-3.5 h-3.5" />} label="Call taps" value={c.calls} sub="Tapped your phone number" />
          </div>

          {range > 0 && <NightTable nights={data.nights} />}
        </>
      )}

      <p className="text-[11px] text-neutral-500 leading-relaxed">
        Every number is a real, anonymous count: no names, emails or accounts are kept or shown. Watches under {MIN_WATCH_MS / 1000} seconds,
        and visits by the bar’s owners and the Bar Tap team, aren’t counted. Someone watching with the app in the background stops counting after
        30 seconds.
      </p>
    </div>
  );
};

const NightTable: React.FC<{ nights: NightStats[] }> = ({ nights }) => {
  if (nights.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-sm text-neutral-400" data-testid="analytics-no-nights">
        No activity in this range yet.
      </div>
    );
  }
  const maxPeak = Math.max(1, ...nights.map((n) => n.peak));
  return (
    <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 overflow-x-auto" data-testid="analytics-nights">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
            <th className="px-3 py-2 font-bold">Night</th>
            <th className="px-3 py-2 font-bold">Peak viewers</th>
            <th className="px-3 py-2 font-bold">Avg watch</th>
            <th className="px-3 py-2 font-bold">Page views</th>
            <th className="px-3 py-2 font-bold">Directions</th>
            <th className="px-3 py-2 font-bold">Chat</th>
          </tr>
        </thead>
        <tbody>
          {nights.map((n) => (
            <tr key={n.night} className="border-b border-neutral-900 last:border-0 text-neutral-200">
              <td className="px-3 py-2 font-semibold whitespace-nowrap">{nightLabel(n.night)}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums w-5">{n.peak}</span>
                  <span className="h-1.5 rounded-full bg-copper" style={{ width: `${Math.max(4, (n.peak / maxPeak) * 80)}px` }} />
                </div>
              </td>
              <td className="px-3 py-2 tabular-nums">{n.watches ? formatDuration(n.totalWatchMs / n.watches) : '—'}</td>
              <td className="px-3 py-2 tabular-nums">{n.counts.pageViews}</td>
              <td className="px-3 py-2 tabular-nums">{n.counts.directions}</td>
              <td className="px-3 py-2 tabular-nums">{n.counts.chat}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
