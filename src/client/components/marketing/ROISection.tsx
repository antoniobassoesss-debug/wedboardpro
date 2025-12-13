import React from 'react';

export const ROISection: React.FC = () => {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-500">
            Results
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Maximize your time, profit and client experience.
          </h2>
          <p className="text-sm text-slate-600">
            WedBoardPro is designed to reduce admin, keep your studio organized and give couples a
            smoother experience from enquiry to sparkler exit.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-10">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500 mb-1">
              LAUNCH FASTER
            </p>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Launch new weddings faster.
            </h3>
            <p className="text-xs text-slate-600">
              Use templates and checklists to spin up a new wedding project in minutes, not hours.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500 mb-1">
              CUT ADMIN
            </p>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Reduce admin hours per event.
            </h3>
            <p className="text-xs text-slate-600">
              Centralize tasks, emails, files and quotes so you spend less time hunting for details.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500 mb-1">
              STAY IN SYNC
            </p>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Keep your team and suppliers aligned.
            </h3>
            <p className="text-xs text-slate-600">
              Give everyone the same live timeline so questions and last‑minute surprises go down.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold text-emerald-700">
              Up to <span className="text-base">30%</span> less admin time per wedding
            </p>
            <p className="mt-1 text-[11px] text-emerald-800/80">
              Planners report saving several hours per event on coordination and follow‑up.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <p className="text-xs font-semibold text-slate-900">
              <span className="text-base">2×</span> more weddings managed per year
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              With a clearer pipeline, it’s easier to safely take on more events without burning out.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <p className="text-xs font-semibold text-slate-900">
              Higher client satisfaction scores
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Couples get timely updates, polished documents and fewer last‑minute changes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


