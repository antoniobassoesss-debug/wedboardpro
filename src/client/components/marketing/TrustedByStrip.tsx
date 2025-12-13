import React from 'react';

export const TrustedByStrip: React.FC = () => {
  return (
    <section className="bg-slate-50 pb-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-500">
        <p className="font-medium text-slate-600">
          Trusted by professional wedding planners and studios across Europe.
        </p>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Lisbon &amp; Co.
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Amalfi Events
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Nordic Weddings
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Sunset Venues
          </span>
        </div>
      </div>
    </section>
  );
};


