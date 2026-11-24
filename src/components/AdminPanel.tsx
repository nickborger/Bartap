import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { BarOverride, StoredBar } from '../services/barDataService.ts';
import {
  AppUserSummary,
  OwnerRequest,
  approveOwnerRequest,
  declineOwnerRequest,
  deleteBar,
  findUsersByEmail,
  linkOwner,
  seedBuiltInBars,
  setBarActive,
  subscribeToLinkedOwners,
  subscribeToOwnerRequests,
  unlinkOwner,
} from '../services/adminService.ts';
import { resolveBarImage } from '../data/bundledImages.ts';
import { AdminBarForm } from './AdminBarForm.tsx';
import { Field, Section, dangerBtn, errorMessage, inputCls, primaryBtn, secondaryBtn } from './AdminUi.tsx';

interface AdminPanelProps {
  adminUid: string;
  /** Every bar doc in Firestore, including deactivated ones */
  bars: StoredBar[];
  /** true while the app is still showing the built-in bars (bars collection not seeded yet) */
  usingBuiltIn: boolean;
  legacyOverrides: Record<string, BarOverride>;
}

type View = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; barId: string };
type Tab = 'bars' | 'owners';

export const AdminPanel: React.FC<AdminPanelProps> = ({ adminUid, bars, usingBuiltIn, legacyOverrides }) => {
  const [tab, setTab] = useState<Tab>('bars');
  const [view, setView] = useState<View>({ kind: 'list' });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [owners, setOwners] = useState<AppUserSummary[]>([]);
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [ownersError, setOwnersError] = useState<string | null>(null);

  useEffect(() => {
    const u1 = subscribeToLinkedOwners(setOwners, (e) => setOwnersError(errorMessage(e)));
    const u2 = subscribeToOwnerRequests(setRequests, (e) => setOwnersError(errorMessage(e)));
    return () => {
      u1();
      u2();
    };
  }, []);

  const flash = (msg: string) => {
    setError(null);
    setNotice(msg);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 6000);
  };

  const knownNeighborhoods = useMemo(
    () => Array.from(new Set(bars.map((b) => b.neighborhood).filter(Boolean))),
    [bars]
  );
  const ownersByBar = useMemo(() => {
    const map: Record<string, AppUserSummary[]> = {};
    owners.forEach((o) => o.ownedBarIds.forEach((id) => (map[id] = [...(map[id] || []), o])));
    return map;
  }, [owners]);

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      const full = usingBuiltIn ? [] : bars.map((b) => b.id);
      const n = await seedBuiltInBars(adminUid, full, legacyOverrides);
      flash(`Copied ${n} built-in bar${n === 1 ? '' : 's'} into Firestore. You can edit ${n === 1 ? 'it' : 'them'} now.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSeeding(false);
    }
  };

  const toggleActive = async (bar: StoredBar) => {
    setBusyId(bar.id);
    setError(null);
    try {
      const next = bar.isActive === false;
      await setBarActive(adminUid, bar.id, next);
      flash(next ? `${bar.name} is live again.` : `${bar.name} is hidden from the app.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (bar: StoredBar) => {
    setBusyId(bar.id);
    setError(null);
    try {
      await deleteBar(bar.id);
      setConfirmDelete(null);
      flash(`${bar.name} was deleted.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  // ------------------------------------------------------------------ form views
  if (view.kind !== 'list') {
    const existing = view.kind === 'edit' ? bars.find((b) => b.id === view.barId) : undefined;
    return (
      <AdminBarForm
        key={view.kind === 'edit' ? view.barId : 'new'}
        adminUid={adminUid}
        existing={existing}
        existingIds={bars.map((b) => b.id)}
        knownNeighborhoods={knownNeighborhoods}
        onCancel={() => setView({ kind: 'list' })}
        onSaved={(id, isNew) => {
          setView({ kind: 'list' });
          flash(isNew ? `Added. It's live in the app now (bar ID: ${id}).` : 'Saved. Changes are live.');
        }}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto" data-testid="admin-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-copper" />
          <div>
            <h2 className="text-xl font-black text-neutral-100 tracking-tight">Admin</h2>
            <p className="text-xs text-neutral-400">Add and manage bars and owners. Changes go live for everyone right away.</p>
          </div>
        </div>
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1">
          {(['bars', 'owners'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition cursor-pointer ${
                tab === t ? 'bg-copper text-ink' : 'text-neutral-300 hover:text-neutral-100'
              }`}
            >
              {t === 'bars' ? `Bars (${usingBuiltIn ? 0 : bars.length})` : `Owners${requests.length ? ` · ${requests.length} new` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-neutral-900 border border-copper/60 text-sm text-neutral-100" role="status">
          <CheckCircle2 className="w-4 h-4 text-tan mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="cursor-pointer text-neutral-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/70 text-sm text-red-200" role="alert">
          {error}
        </div>
      )}

      {tab === 'bars' ? (
        <>
          {usingBuiltIn && (
            <Section
              title="Move the built-in bars into Firestore"
              hint="The app is still showing the bars that ship with the code. Copy them into Firestore once, then manage everything from here."
            >
              <button onClick={handleSeed} className={primaryBtn} disabled={seeding} data-testid="seed-bars">
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Copy built-in bars to Firestore
              </button>
            </Section>
          )}

          <div className="flex justify-end">
            <button onClick={() => setView({ kind: 'add' })} className={primaryBtn} data-testid="add-bar">
              <Plus className="w-4 h-4" /> Add a bar
            </button>
          </div>

          {!usingBuiltIn && bars.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-8">No bars yet. Tap “Add a bar” to list the first one.</p>
          )}

          {!usingBuiltIn && (
            <div className="space-y-2">
              {bars.map((bar) => {
                const inactive = bar.isActive === false;
                const linked = ownersByBar[bar.id] || [];
                return (
                  <div
                    key={bar.id}
                    className={`flex flex-col sm:flex-row gap-3 p-3 rounded-2xl bg-neutral-900 border ${
                      inactive ? 'border-neutral-800 opacity-70' : 'border-neutral-800'
                    }`}
                  >
                    <img src={resolveBarImage(bar.image)} alt="" className="w-full sm:w-28 h-24 sm:h-20 object-cover rounded-xl bg-neutral-950" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-neutral-100 truncate">{bar.name}</h3>
                        {inactive ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">Hidden</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-copper text-ink">Live</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 truncate">
                        {bar.address}
                        {bar.city ? `, ${bar.city}` : ''} · {bar.category} · {bar.neighborhood}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        ID: <span className="font-mono text-neutral-400">{bar.id}</span>
                        {' · '}
                        {linked.length ? `Owner: ${linked.map((o) => o.email || o.name).join(', ')}` : 'No owner linked'}
                        {!bar.coordinates && ' · no map position'}
                      </p>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <button onClick={() => setView({ kind: 'edit', barId: bar.id })} className={secondaryBtn} aria-label={`Edit ${bar.name}`}>
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                      <button onClick={() => toggleActive(bar)} className={secondaryBtn} disabled={busyId === bar.id}>
                        {inactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {inactive ? 'Show' : 'Hide'}
                      </button>
                      {confirmDelete === bar.id ? (
                        <>
                          <button onClick={() => handleDelete(bar)} className={dangerBtn} disabled={busyId === bar.id}>
                            {busyId === bar.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete for good
                          </button>
                          <button onClick={() => setConfirmDelete(null)} className={secondaryBtn}>
                            Keep
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(bar.id)} className={dangerBtn} aria-label={`Delete ${bar.name}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <OwnersTab
          adminUid={adminUid}
          bars={usingBuiltIn ? [] : bars}
          owners={owners}
          requests={requests}
          loadError={ownersError}
          onNotice={flash}
          onError={setError}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Owners tab
// ---------------------------------------------------------------------------

interface OwnersTabProps {
  adminUid: string;
  bars: StoredBar[];
  owners: AppUserSummary[];
  requests: OwnerRequest[];
  loadError: string | null;
  onNotice: (msg: string) => void;
  onError: (msg: string | null) => void;
}

const OwnersTab: React.FC<OwnersTabProps> = ({ adminUid, bars, owners, requests, loadError, onNotice, onError }) => {
  const [email, setEmail] = useState('');
  const [barId, setBarId] = useState('');
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<AppUserSummary[] | null>(null);
  const [requestBar, setRequestBar] = useState<Record<string, string>>({});

  const barName = (id: string) => bars.find((b) => b.id === id)?.name || id;

  useEffect(() => {
    if (!barId && bars.length) setBarId(bars[0].id);
  }, [bars, barId]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);
    if (!barId) return onError('Add a bar first, then link its owner.');
    setBusy(true);
    setMatches(null);
    try {
      const found = await findUsersByEmail(email);
      if (found.length === 0) {
        onError(`No Bar Tap account uses ${email.trim()}. Ask them to sign in to the app once with that email, then try again.`);
      } else if (found.length > 1) {
        setMatches(found);
      } else {
        await linkOwner(found[0], barId);
        setEmail('');
        onNotice(`${found[0].email} now owns ${barName(barId)}. They'll see the Owner dashboard next time the app loads.`);
      }
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const pickMatch = async (u: AppUserSummary) => {
    setBusy(true);
    try {
      await linkOwner(u, barId);
      setMatches(null);
      setEmail('');
      onNotice(`${u.email} now owns ${barName(barId)}.`);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async (u: AppUserSummary, id: string) => {
    onError(null);
    try {
      await unlinkOwner(u, id);
      onNotice(`${u.email || u.name} no longer owns ${barName(id)}.`);
    } catch (err) {
      onError(errorMessage(err));
    }
  };

  const handleApprove = async (r: OwnerRequest) => {
    const target = requestBar[r.uid] || r.barId;
    if (!bars.some((b) => b.id === target)) return onError('Pick which bar this person should own.');
    onError(null);
    try {
      await approveOwnerRequest(adminUid, r, target);
      onNotice(`Approved: ${r.accountEmail || r.name} now owns ${barName(target)}.`);
    } catch (err) {
      onError(errorMessage(err));
    }
  };

  const handleDecline = async (r: OwnerRequest) => {
    onError(null);
    try {
      await declineOwnerRequest(adminUid, r);
      onNotice(`Declined the request from ${r.accountEmail || r.name}.`);
    } catch (err) {
      onError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      {loadError && <p className="text-xs text-red-300">{loadError}</p>}

      <Section title="Link an owner to a bar" hint="They need to have signed in to Bar Tap once with this email.">
        <form onSubmit={handleLink} className="grid grid-cols-1 sm:grid-cols-12 gap-2" data-testid="link-owner-form">
          <Field label="Owner's sign-in email" className="sm:col-span-5">
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" required />
          </Field>
          <Field label="Bar" className="sm:col-span-4">
            <select className={inputCls} value={barId} onChange={(e) => setBarId(e.target.value)}>
              {bars.length === 0 && <option value="">No bars yet</option>}
              {bars.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-3 flex items-end">
            <button type="submit" className={`${primaryBtn} w-full`} disabled={busy || !email.trim()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Make owner
            </button>
          </div>
        </form>
        {matches && (
          <div className="space-y-1">
            <p className="text-xs text-neutral-300">More than one account uses that email. Pick one:</p>
            {matches.map((m) => (
              <button key={m.uid} onClick={() => pickMatch(m)} className={`${secondaryBtn} w-full justify-start`}>
                {m.name || 'No name'} · {m.email} · {m.uid.slice(0, 8)}…
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Venue access requests" hint="Sent from the Business Owner tab by people who say they run a bar.">
        {requests.length === 0 ? (
          <p className="text-xs text-neutral-400">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.uid} className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                <p className="text-sm text-neutral-100 font-bold">
                  {r.name || 'No name'} <span className="font-normal text-neutral-400">({r.title || 'no title'})</span>
                </p>
                <p className="text-xs text-neutral-400">
                  Account: {r.accountEmail || 'unknown'} · Work email: {r.workEmail || 'none'} · Asked for: {barName(r.barId) || 'not given'}
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    className={`${inputCls} w-auto`}
                    value={requestBar[r.uid] || (bars.some((b) => b.id === r.barId) ? r.barId : '')}
                    onChange={(e) => setRequestBar((p) => ({ ...p, [r.uid]: e.target.value }))}
                  >
                    <option value="">Pick a bar…</option>
                    {bars.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => handleApprove(r)} className={primaryBtn}>
                    Approve
                  </button>
                  <button onClick={() => handleDecline(r)} className={secondaryBtn}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Current owners">
        {owners.length === 0 ? (
          <p className="text-xs text-neutral-400">No owners linked yet.</p>
        ) : (
          <div className="space-y-2">
            {owners.map((o) => (
              <div key={o.uid} className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                <Users className="w-4 h-4 text-tan" />
                <span className="text-sm text-neutral-100 font-bold">{o.email || o.name}</span>
                {o.role === 'admin' && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-copper text-ink">Admin</span>}
                <div className="flex flex-wrap gap-1.5 ml-auto">
                  {o.ownedBarIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-neutral-800 text-neutral-200">
                      {barName(id)}
                      <button onClick={() => handleUnlink(o, id)} aria-label={`Unlink from ${barName(id)}`} className="cursor-pointer text-neutral-400 hover:text-red-300">
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <p className="text-[11px] text-neutral-500 flex items-center gap-1">
        <Search className="w-3 h-3" /> Making someone an admin is only possible in the Firebase console (see FIREBASE_SETUP.md).
      </p>
    </div>
  );
};
