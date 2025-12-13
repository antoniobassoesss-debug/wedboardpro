import React from 'react';
import { Link } from 'react-router-dom';

type Solution = {
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

const SOLUTIONS: Solution[] = [
  {
    label: 'PROJECTS & TIMELINES',
    title: 'Plan every wedding from inquiry to “I do”.',
    description:
      'Turn each wedding into a clear project with stages, tasks, owners and due dates. See exactly what needs to happen this week across all events.',
    ctaLabel: 'Explore project management',
    ctaHref: '/signup',
  },
  {
    label: 'CLIENTS & SUPPLIERS',
    title: 'Collaborate with couples and suppliers in one place.',
    description:
      'Share timelines, layouts, menus and files with clients and vendors. Keep conversations, decisions and documents attached to the right wedding.',
    ctaLabel: 'See collaboration tools',
    ctaHref: '/signup',
  },
  {
    label: 'AUTOMATION & TEMPLATES',
    title: 'Automate your busywork, keep the magic.',
    description:
      'Use reusable checklists, email templates and reminders to handle the repetitive work, so you can focus on design and client experience.',
    ctaLabel: 'Discover automations',
    ctaHref: '/signup',
  },
];

export const SolutionsSection: React.FC = () => {
  return (
    <section id="solutions" className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-500">
            Solutions
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            The complete operating system for wedding planners.
          </h2>
          <p className="text-sm text-slate-600">
            From first enquiry to the last thank‑you email, WedBoardPro connects your projects,
            people and tools so nothing falls through the cracks.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {SOLUTIONS.map((solution) => (
            <article
              key={solution.title}
              className="flex h-full flex-col rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm hover:border-emerald-200 hover:shadow-md transition"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-lg">
                •
              </div>

              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500">
                {solution.label}
              </p>
              <h3 className="mb-2 text-base font-semibold text-slate-900">
                {solution.title}
              </h3>
              <p className="flex-1 text-sm text-slate-600">
                {solution.description}
              </p>

              <div className="mt-4">
                <Link
                  to={solution.ctaHref}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-500"
                >
                  {solution.ctaLabel}
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


