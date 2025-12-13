import React from 'react';
import { Link } from 'react-router-dom';

const PRIMARY_CTA_HREF = '/signup';
const DEMO_HREF = '/demo';

export const FinalCTASection: React.FC = () => {
  return (
    <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-16 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Exceed every client expectation.
        </h2>
        <p className="mt-3 text-sm text-slate-200/90">
          Give couples a calm, organized planning experience from first enquiry to their final
          thank‑you email.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to={PRIMARY_CTA_HREF}
            className="inline-flex items-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Start free trial
          </Link>
          <Link
            to={DEMO_HREF}
            className="inline-flex items-center rounded-full border border-slate-400 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-50 hover:border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Book a demo
          </Link>
        </div>
      </div>
    </section>
  );
};


