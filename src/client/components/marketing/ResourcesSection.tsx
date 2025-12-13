import React from 'react';
import { Link } from 'react-router-dom';

type Resource = {
  type: 'ARTICLE' | 'GUIDE' | 'TEMPLATE' | 'REPORT';
  title: string;
  description: string;
  href: string;
};

const RESOURCES: Resource[] = [
  {
    type: 'REPORT',
    title: 'Wedding planning trends for 2025',
    description:
      'See what couples are asking for, how budgets are shifting and where leading planners are investing their time.',
    href: '/resources/trends-2025',
  },
  {
    type: 'GUIDE',
    title: 'Ultimate wedding planning checklist',
    description:
      'A ready‑to‑use checklist from first enquiry to post‑event follow‑up you can adapt to your own studio.',
    href: '/resources/ultimate-checklist',
  },
  {
    type: 'TEMPLATE',
    title: 'Shareable wedding day timeline template',
    description:
      'A clean, client‑ready day‑of timeline you can share with couples, suppliers and your on‑site team.',
    href: '/resources/day-of-timeline',
  },
  {
    type: 'ARTICLE',
    title: 'How to streamline supplier communication',
    description:
      'Reduce back‑and‑forth emails and keep all vendor details in one organized place.',
    href: '/resources/streamline-suppliers',
  },
];

export const ResourcesSection: React.FC = () => {
  return (
    <section id="resources" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-500">
            Resources
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Resources for growing your planning business.
          </h2>
          <p className="text-sm text-slate-600">
            Learn how other studios streamline their workflow, communicate with suppliers and
            deliver unforgettable wedding days.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {RESOURCES.map((resource) => (
            <article
              key={resource.title}
              className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-200 hover:shadow-md transition"
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-500">
                {resource.type}
              </p>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                {resource.title}
              </h3>
              <p className="flex-1 text-xs text-slate-600">
                {resource.description}
              </p>
              <div className="mt-3">
                <Link
                  to={resource.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500"
                >
                  Read more
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};


