import React from 'react';

/** Shared black & copper form styles for the Admin screens. */
export const inputCls =
  'w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-neutral-100 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-copper focus:ring-1 focus:ring-copper';

export const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1';

export const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-copper hover:bg-tan text-ink text-sm font-black transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const secondaryBtn =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-sm font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const dangerBtn =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-950 hover:bg-red-950/60 text-red-300 border border-red-900/70 text-sm font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({
  title,
  hint,
  children,
}) => (
  <section className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
    <div>
      <h3 className="text-sm font-black text-neutral-100 tracking-tight">{title}</h3>
      {hint && <p className="text-xs text-neutral-400 mt-0.5">{hint}</p>}
    </div>
    {children}
  </section>
);

export const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <label className={`block ${className || ''}`}>
    <span className={labelCls}>{label}</span>
    {children}
  </label>
);

export const errorMessage = (err: unknown) => {
  const code = (err as { code?: string })?.code || '';
  if (code === 'permission-denied') {
    return 'Permission denied. Make sure your account has role "admin" and the latest firestore.rules are published.';
  }
  return (err as { message?: string })?.message || 'Something went wrong.';
};
