import React from 'react';
import { Link } from 'react-router-dom';

export const HeroSection: React.FC = () => {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col-reverse gap-12 px-4 pb-16 pt-10 lg:flex-row lg:items-center lg:pb-24 lg:pt-16">
        <div className="flex-1 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-500">
            Built for modern wedding planners
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Deliver beautifully organized weddings with WedBoardPro.
          </h1>
          <p className="max-w-xl text-sm text-slate-600 sm:text-base">
            WedBoardPro centralizes your workflows, timelines, suppliers, quotes and client
            communication so every event feels under control and every couple sees your best work.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            >
              Start free trial
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
                ▶
              </span>
              Book a demo
            </Link>
          </div>

          <form
            className="mt-2 flex max-w-md flex-col gap-2 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <label className="sr-only" htmlFor="hero-email">
              Work email
            </label>
            <input
              id="hero-email"
              type="email"
              placeholder="Work email"
              className="w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            >
              Get invite
            </button>
          </form>

          <div className="grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
            <HeroMicro
              title="See every wedding at a glance"
              body="One pipeline for all events, with stages, budgets and due dates."
            />
            <HeroMicro
              title="Send polished quotes in minutes"
              body="Reusable templates keep proposals consistent and on‑brand."
            />
            <HeroMicro
              title="Keep team and suppliers aligned"
              body="Share timelines, tasks and files from one shared source of truth."
            />
          </div>
        </div>

        <div className="flex-1">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/5 p-4">
            <div className="rounded-2xl bg-slate-900 text-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span>João &amp; Marta · 20/09/2026</span>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">
                  72% on track
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-[1.1fr,1fr]">
                <div className="space-y-2 text-[11px]">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Pipeline
                  </p>
                  {/* simplified pipeline rows */}
                  {['Vision & style', 'Venue & date', 'Vendors & contracts', 'Logistics'].map(
                    (label, idx) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-2 py-1.5"
                      >
                        <div>
                          <p className="text-[11px] font-medium">{label}</p>
                          <p className="text-[10px] text-slate-400">
                            {idx === 0 ? 'Completed' : 'In progress'}
                          </p>
                        </div>
                        <div className="h-4 w-16 overflow-hidden rounded-full bg-slate-900">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{ width: `${idx === 0 ? 100 : 40 + idx * 15}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
                <div className="space-y-3 text-[11px]">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2">
                    <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Calendar
                    </p>
                    <p className="text-[11px] text-slate-200">This month</p>
                    <p className="text-[10px] text-slate-400">3 weddings · 2 venue visits</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2">
                    <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      Suppliers
                    </p>
                    <p className="text-[11px] text-slate-200">Florist shortlisted · €3 700</p>
                    <p className="text-[10px] text-slate-400">Music + catering quotes pending</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const HeroMicro: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
    <p className="mb-1 text-[11px] font-semibold text-slate-900">{title}</p>
    <p className="text-[11px] text-slate-500">{body}</p>
  </div>
);


