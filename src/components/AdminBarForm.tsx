import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, ImagePlus, Loader2, MapPin, Plus, Save, Trash2 } from 'lucide-react';
import { CameraAngle, DrinkSpecial } from '../types.ts';
import { StoredBar, WEEKDAY_NAMES } from '../services/barDataService.ts';
import {
  BarListingInput,
  CameraViewInput,
  createBar,
  geocodeAddress,
  updateBarListing,
  uploadBarPhoto,
} from '../services/adminService.ts';
import { SUPPORTED_CITIES } from '../utils/geolocation.ts';
import { isBundledImage, resolveBarImage } from '../data/bundledImages.ts';
import { Field, Section, dangerBtn, errorMessage, inputCls, primaryBtn, secondaryBtn } from './AdminUi.tsx';

const CATEGORIES = [
  'College Pub',
  'Rooftop Lounge',
  'Beer Garden',
  'Craft Brewery',
  'Dive Bar',
  'Sports Bar',
  'Cocktail Lounge',
  'Mega Club',
  'Live Music',
  'Wine Bar',
  'Restaurant & Bar',
];

const VIBES: StoredBar['currentVibe'][] = [
  'Chilled Social',
  'Craft & Relaxed',
  'High Energy',
  'Packed Party',
  'Live Music',
  'Upscale Lounge',
];

const VIEW_TYPES: { value: CameraAngle['viewType']; label: string }[] = [
  { value: 'main_bar', label: 'Main bar' },
  { value: 'patio', label: 'Patio / outdoor' },
  { value: 'stage', label: 'Stage' },
  { value: 'entrance', label: 'Entrance / door' },
  { value: 'lounge', label: 'Lounge' },
];

const SPECIAL_CATEGORIES: { value: DrinkSpecial['category']; label: string }[] = [
  { value: 'happy_hour', label: 'Happy hour' },
  { value: 'beer', label: 'Beer' },
  { value: 'cocktail', label: 'Cocktail' },
  { value: 'shots', label: 'Shots' },
  { value: 'package', label: 'Package' },
];

// ---------------------------------------------------------------------------
// Hours helpers: "3:00 PM – 9:00 PM" <-> time inputs ("15:00", "21:00")
// ---------------------------------------------------------------------------

interface DayHours {
  closed: boolean;
  open: string; // "HH:MM" 24h
  close: string;
  custom: string; // text that couldn't be parsed; shown as free text
}

const to12h = (t: string) => {
  const [hStr, m] = t.split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
};

const to24h = (t: string): string | null => {
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?$/);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'p') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2] || '00'}`;
};

function parseDay(text: string): DayHours {
  if (!text.trim()) return { closed: true, open: '16:00', close: '23:00', custom: '' };
  const parts = text.split(/\s*[–—-]\s*|\s+to\s+/i);
  if (parts.length === 2) {
    const open = to24h(parts[0]);
    const close = to24h(parts[1]);
    if (open && close) return { closed: false, open, close, custom: '' };
  }
  return { closed: false, open: '16:00', close: '23:00', custom: text };
}

const formatDay = (d: DayHours) =>
  d.closed ? '' : d.custom.trim() ? d.custom.trim() : `${to12h(d.open)} – ${to12h(d.close)}`;

const DEFAULT_WEEK = ['', '', '', '', '', '', ''].map((_, i) =>
  i === 1 ? '' : i === 0 ? '12:00 PM – 10:00 PM' : '4:00 PM – 12:00 AM'
);

const newSpecial = (): DrinkSpecial => ({
  id: `special-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  title: '',
  description: '',
  price: '',
  category: 'happy_hour',
  day: 'Every Day',
  isHappyHour: false,
  featured: false,
});

interface AdminBarFormProps {
  adminUid: string;
  existing?: StoredBar;
  existingIds: string[];
  knownNeighborhoods: string[];
  onSaved: (barId: string, isNew: boolean) => void;
  onCancel: () => void;
}

export const AdminBarForm: React.FC<AdminBarFormProps> = ({
  adminUid,
  existing,
  existingIds,
  knownNeighborhoods,
  onSaved,
  onCancel,
}) => {
  const isNew = !existing;
  const [name, setName] = useState(existing?.name || '');
  const [tagline, setTagline] = useState(existing?.tagline || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [city, setCity] = useState(existing?.city || 'Tallahassee');
  const [stateCode, setStateCode] = useState(existing?.state || 'FL');
  const [zip, setZip] = useState(existing?.zip || '');
  const [market, setMarket] = useState(existing?.market || existing?.city || SUPPORTED_CITIES[0].name);
  const [lat, setLat] = useState(existing?.coordinates ? String(existing.coordinates.lat) : '');
  const [lng, setLng] = useState(existing?.coordinates ? String(existing.coordinates.lng) : '');
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [neighborhood, setNeighborhood] = useState(existing?.neighborhood || '');
  const [category, setCategory] = useState(existing?.category || '');
  const [vibe, setVibe] = useState<StoredBar['currentVibe']>(existing?.currentVibe || 'Chilled Social');
  const [days, setDays] = useState<DayHours[]>(() => {
    const week =
      existing?.weeklyHours && existing.weeklyHours.length === 7
        ? existing.weeklyHours
        : existing
          ? ['', '', '', '', '', '', '']
          : DEFAULT_WEEK;
    return week.map(parseDay);
  });
  const [phone, setPhone] = useState(existing?.phone || '');
  const [websiteUrl, setWebsiteUrl] = useState(existing?.websiteUrl || '');
  const [cover, setCover] = useState(existing?.coverCharge || '');
  const [priceLevel, setPriceLevel] = useState(existing?.priceLevel || '');
  const [featuresText, setFeaturesText] = useState((existing?.features || []).join('\n'));
  const [specials, setSpecials] = useState<DrinkSpecial[]>(existing?.drinkSpecials || []);
  const [image, setImage] = useState(existing?.image || '');
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cameras, setCameras] = useState<CameraViewInput[]>(() =>
    existing
      ? existing.cameras.map((c) => ({ id: c.id, name: c.name, locationLabel: c.locationLabel, viewType: c.viewType }))
      : [{ name: 'Main Bar', locationLabel: 'Main Bar', viewType: 'main_bar' }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const neighborhoodOptions = useMemo(() => {
    const meta = SUPPORTED_CITIES.find((c) => c.name === market);
    return Array.from(new Set([...(meta?.neighborhoods || []), ...knownNeighborhoods])).sort();
  }, [market, knownNeighborhoods]);

  const updateDay = (i: number, patch: Partial<DayHours>) =>
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const copyToAllOpenDays = (i: number) =>
    setDays((prev) => prev.map((d) => (d.closed ? d : { ...prev[i], closed: false })));

  const updateSpecial = (i: number, patch: Partial<DrinkSpecial>) =>
    setSpecials((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const updateCamera = (i: number, patch: Partial<CameraViewInput>) =>
    setCameras((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const handleGeocode = async () => {
    if (!address.trim()) {
      setGeoStatus('Enter the street address first.');
      return;
    }
    setGeoBusy(true);
    setGeoStatus(null);
    try {
      const result = await geocodeAddress(`${address}, ${city}, ${stateCode} ${zip}`.trim());
      if (!result) {
        setGeoStatus('No match found. Check the address, or type the latitude and longitude yourself.');
      } else {
        setLat(String(result.lat));
        setLng(String(result.lng));
        if (!zip.trim() && result.zip) setZip(result.zip.slice(0, 5));
        setGeoStatus(`Found: ${result.label}`);
      }
    } catch (err) {
      setGeoStatus(`${errorMessage(err)} You can type the latitude and longitude yourself.`);
    } finally {
      setGeoBusy(false);
    }
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoStatus('Uploading photo…');
    try {
      const { url, method } = await uploadBarPhoto(existing?.id || name || 'new-bar', file);
      setImage(url);
      setPhotoStatus(
        method === 'storage'
          ? 'Photo uploaded. Save the bar to publish it.'
          : 'Photo saved as a compressed copy (Firebase Storage is not enabled). Save the bar to publish it.'
      );
    } catch (err) {
      setPhotoStatus(errorMessage(err));
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Give the bar a name.');
    if (!address.trim()) return setError('Enter the street address.');
    const latNum = lat.trim() ? Number(lat) : null;
    const lngNum = lng.trim() ? Number(lng) : null;
    if ((latNum == null) !== (lngNum == null)) return setError('Enter both latitude and longitude, or neither.');
    if (latNum != null && (Number.isNaN(latNum) || latNum < -90 || latNum > 90)) return setError('Latitude must be a number between -90 and 90.');
    if (lngNum != null && (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180)) return setError('Longitude must be a number between -180 and 180.');

    const input: BarListingInput = {
      name,
      tagline,
      address,
      city,
      state: stateCode,
      zip,
      market,
      lat: latNum,
      lng: lngNum,
      neighborhood: neighborhood || market,
      category: category || 'Bar',
      currentVibe: vibe,
      weeklyHours: days.map(formatDay),
      phone,
      websiteUrl,
      coverCharge: cover,
      priceLevel,
      features: featuresText.split('\n'),
      drinkSpecials: specials.map((s) => ({
        ...s,
        title: s.title.trim(),
        description: s.description.trim(),
        price: s.price?.trim() || undefined,
        happyHourStart: s.isHappyHour ? s.happyHourStart || '16:00' : undefined,
        happyHourEnd: s.isHappyHour ? s.happyHourEnd || '19:00' : undefined,
      })),
      image,
      cameras,
    };

    setSaving(true);
    try {
      if (existing) {
        await updateBarListing(adminUid, existing, input);
        onSaved(existing.id, false);
      } else {
        const id = await createBar(adminUid, input, existingIds);
        onSaved(id, true);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl mx-auto" data-testid="admin-bar-form">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onCancel} className={secondaryBtn}>
          <ArrowLeft className="w-4 h-4" /> Back to bars
        </button>
        <h2 className="text-lg sm:text-xl font-black text-neutral-100 truncate">
          {isNew ? 'Add a bar' : `Edit ${existing?.name}`}
        </h2>
      </div>

      <Section title="Basics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Bar name *" className="sm:col-span-2">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Madison Social" required />
          </Field>
          <Field label="Tagline" className="sm:col-span-2">
            <input className={inputCls} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line that sells the place" />
          </Field>
          <Field label="Type">
            <input className={inputCls} list="bt-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Pick or type, e.g. Sports Bar" />
            <datalist id="bt-categories">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Usual vibe">
            <select className={inputCls} value={vibe} onChange={(e) => setVibe(e.target.value as StoredBar['currentVibe'])}>
              {VIBES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Location" hint="“Look up” finds the map position from the address (free OpenStreetMap lookup). You can also type it in.">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <Field label="Street address *" className="sm:col-span-6">
            <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 705 S Woodward Ave" required />
          </Field>
          <Field label="City" className="sm:col-span-3">
            <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="State" className="sm:col-span-1">
            <input className={inputCls} value={stateCode} onChange={(e) => setStateCode(e.target.value.toUpperCase().slice(0, 2))} />
          </Field>
          <Field label="ZIP" className="sm:col-span-2">
            <input className={inputCls} value={zip} onChange={(e) => setZip(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Listed under market" className="sm:col-span-3">
            <select className={inputCls} value={market} onChange={(e) => setMarket(e.target.value)}>
              {SUPPORTED_CITIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Neighborhood" className="sm:col-span-3">
            <input className={inputCls} list="bt-hoods" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Pick or type a new one" />
            <datalist id="bt-hoods">
              {neighborhoodOptions.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field label="Latitude" className="sm:col-span-2">
            <input className={inputCls} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="30.4383" inputMode="decimal" />
          </Field>
          <Field label="Longitude" className="sm:col-span-2">
            <input className={inputCls} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-84.2807" inputMode="decimal" />
          </Field>
          <div className="sm:col-span-2 flex items-end">
            <button type="button" onClick={handleGeocode} className={`${secondaryBtn} w-full`} disabled={geoBusy}>
              {geoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-tan" />}
              Look up
            </button>
          </div>
        </div>
        {geoStatus && <p className="text-xs text-neutral-300">{geoStatus}</p>}
        {lat && lng && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng)) && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-tan hover:underline"
          >
            Check this spot on the map ↗
          </a>
        )}
      </Section>

      <Section title="Hours" hint="The app shows today’s hours automatically. Owners can still change “today” from their dashboard.">
        <div className="space-y-2">
          {days.map((d, i) => (
            <div key={WEEKDAY_NAMES[i]} className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <span className="w-24 text-sm font-bold text-neutral-200">{WEEKDAY_NAMES[i]}</span>
              <label className="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer">
                <input type="checkbox" className="accent-[#A86B45]" checked={d.closed} onChange={(e) => updateDay(i, { closed: e.target.checked })} />
                Closed
              </label>
              {!d.closed &&
                (d.custom ? (
                  <input className={`${inputCls} flex-1 min-w-[10rem]`} value={d.custom} onChange={(e) => updateDay(i, { custom: e.target.value })} />
                ) : (
                  <>
                    <input type="time" aria-label={`${WEEKDAY_NAMES[i]} opens`} className={`${inputCls} w-32`} value={d.open} onChange={(e) => updateDay(i, { open: e.target.value })} />
                    <span className="text-neutral-500">to</span>
                    <input type="time" aria-label={`${WEEKDAY_NAMES[i]} closes`} className={`${inputCls} w-32`} value={d.close} onChange={(e) => updateDay(i, { close: e.target.value })} />
                  </>
                ))}
              {!d.closed && (
                <button type="button" onClick={() => copyToAllOpenDays(i)} className="ml-auto text-[11px] text-tan hover:underline cursor-pointer">
                  Copy to all open days
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Contact, cover & price">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Phone">
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(850) 555-0123" inputMode="tel" />
          </Field>
          <Field label="Website">
            <input className={inputCls} value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" inputMode="url" />
          </Field>
          <Field label="Cover charge">
            <input className={inputCls} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="No Cover / $5 after 10 PM / Varies by event" />
          </Field>
          <Field label="Price level">
            <select className={inputCls} value={priceLevel} onChange={(e) => setPriceLevel(e.target.value)}>
              <option value="">Not set</option>
              <option value="$">$ (cheap)</option>
              <option value="$$">$$ (moderate)</option>
              <option value="$$$">$$$ (pricey)</option>
              <option value="$$$$">$$$$ (high end)</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Features" hint="One per line, e.g. “Rooftop patio” or “Dogs welcome”.">
        <textarea className={`${inputCls} min-h-[110px]`} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
      </Section>

      <Section title="Drink specials">
        <div className="space-y-3">
          {specials.length === 0 && <p className="text-xs text-neutral-400">No specials yet.</p>}
          {specials.map((s, i) => (
            <div key={s.id} className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <Field label="Title" className="sm:col-span-3">
                  <input className={inputCls} value={s.title} onChange={(e) => updateSpecial(i, { title: e.target.value })} placeholder="$3 Wells" />
                </Field>
                <Field label="Price" className="sm:col-span-1">
                  <input className={inputCls} value={s.price || ''} onChange={(e) => updateSpecial(i, { price: e.target.value })} placeholder="$3" />
                </Field>
                <Field label="Days" className="sm:col-span-2">
                  <input className={inputCls} value={s.day} onChange={(e) => updateSpecial(i, { day: e.target.value })} placeholder="Mon-Fri" />
                </Field>
                <Field label="Description" className="sm:col-span-4">
                  <input className={inputCls} value={s.description} onChange={(e) => updateSpecial(i, { description: e.target.value })} />
                </Field>
                <Field label="Kind" className="sm:col-span-2">
                  <select className={inputCls} value={s.category} onChange={(e) => updateSpecial(i, { category: e.target.value as DrinkSpecial['category'] })}>
                    {SPECIAL_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" className="accent-[#A86B45]" checked={!!s.isHappyHour} onChange={(e) => updateSpecial(i, { isHappyHour: e.target.checked })} />
                  Happy hour window
                </label>
                {s.isHappyHour && (
                  <>
                    <input type="time" className={`${inputCls} w-28`} value={s.happyHourStart || '16:00'} onChange={(e) => updateSpecial(i, { happyHourStart: e.target.value })} />
                    <span>to</span>
                    <input type="time" className={`${inputCls} w-28`} value={s.happyHourEnd || '19:00'} onChange={(e) => updateSpecial(i, { happyHourEnd: e.target.value })} />
                  </>
                )}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" className="accent-[#A86B45]" checked={!!s.featured} onChange={(e) => updateSpecial(i, { featured: e.target.checked })} />
                  Featured
                </label>
                <button type="button" onClick={() => setSpecials((p) => p.filter((_, idx) => idx !== i))} className="ml-auto text-red-300 hover:underline cursor-pointer">
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setSpecials((p) => [...p, newSpecial()])} className={secondaryBtn}>
            <Plus className="w-4 h-4" /> Add a special
          </button>
        </div>
      </Section>

      <Section title="Photo" hint="Upload a photo, or paste a link to one.">
        <div className="flex flex-col sm:flex-row gap-3">
          <img src={resolveBarImage(image)} alt="" className="w-full sm:w-48 h-32 object-cover rounded-xl border border-neutral-800 bg-neutral-950" />
          <div className="flex-1 space-y-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} className={secondaryBtn} disabled={photoBusy}>
              {photoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4 text-tan" />}
              Upload photo
            </button>
            <Field label="…or image link">
              <input
                className={inputCls}
                value={isBundledImage(image) ? '' : image.startsWith('data:') ? '' : image}
                onChange={(e) => setImage(e.target.value)}
                placeholder={isBundledImage(image) ? 'Using the built-in photo' : image.startsWith('data:') ? 'Using the uploaded photo' : 'https://…/photo.jpg'}
                inputMode="url"
              />
            </Field>
            {photoStatus && <p className="text-xs text-neutral-300">{photoStatus}</p>}
          </div>
        </div>
      </Section>

      <Section title="Camera views" hint="The names of the live views shown on the bar’s feed (for example Main Bar, Patio, Stage).">
        <div className="space-y-2">
          {cameras.map((c, i) => (
            <div key={c.id || `new-${i}`} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 rounded-xl bg-neutral-950/60 border border-neutral-800">
              <Field label="View name" className="sm:col-span-4">
                <input className={inputCls} value={c.name} onChange={(e) => updateCamera(i, { name: e.target.value })} />
              </Field>
              <Field label="Location label" className="sm:col-span-4">
                <input className={inputCls} value={c.locationLabel} onChange={(e) => updateCamera(i, { locationLabel: e.target.value })} placeholder="Optional detail" />
              </Field>
              <Field label="Area" className="sm:col-span-3">
                <select className={inputCls} value={c.viewType} onChange={(e) => updateCamera(i, { viewType: e.target.value as CameraAngle['viewType'] })}>
                  {VIEW_TYPES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-1 flex items-end">
                <button type="button" aria-label="Remove view" onClick={() => setCameras((p) => p.filter((_, idx) => idx !== i))} className={`${dangerBtn} w-full`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCameras((p) => [...p, { name: '', locationLabel: '', viewType: 'main_bar' }])}
            className={secondaryBtn}
          >
            <Camera className="w-4 h-4 text-tan" /> Add a view
          </button>
        </div>
      </Section>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/70 text-sm text-red-200" role="alert">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 py-3 bg-neutral-950/95 backdrop-blur flex gap-2 justify-end border-t border-neutral-800">
        <button type="button" onClick={onCancel} className={secondaryBtn}>
          Cancel
        </button>
        <button type="submit" className={primaryBtn} disabled={saving || photoBusy}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isNew ? 'Add bar (goes live now)' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};
