import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Product', href: '#product' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '#resources' },
];

export const SiteHeader: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const handleAnchorClick = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith('#') || location.pathname !== '/') return;
    e.preventDefault();
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setOpen(false);
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isHome = location.pathname === '/';
    const isAnchor = item.href.startsWith('#');
    const href = isHome && isAnchor ? item.href : `/${item.href.replace(/^#/, '')}`;
    const isPricing = item.label === 'Pricing';

    return (
      <a
        key={item.label}
        href={href}
        onClick={handleAnchorClick(item.href)}
        className={`relative text-sm font-medium text-slate-800 hover:text-slate-950 transition
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50
          ${isPricing ? 'after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:rounded-full after:bg-emerald-400 after:opacity-0 hover:after:opacity-100' : ''}`}
      >
        {item.label}
      </a>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-500" />
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            WedBoardPro
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {NAV_ITEMS.map(renderNavItem)}
          <Link
            to="/login"
            className="text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
          >
            Log in
          </Link>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-slate-500 lg:block">
              14‑day free trial · No credit card
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            >
              Start free trial
            </Link>
          </div>
        </nav>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="h-0.5 w-4 rounded-full bg-current relative before:absolute before:-top-1.5 before:h-0.5 before:w-4 before:rounded-full before:bg-current after:absolute after:top-1.5 after:h-0.5 after:w-4 after:rounded-full after:bg-current" />
        </button>
      </div>

      <nav
        id="mobile-nav"
        className={`md:hidden border-t border-slate-200 bg-white/95 transition-[max-height] duration-200 ${
          open ? 'max-h-72' : 'max-h-0 overflow-hidden'
        }`}
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-4 pt-3">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={handleAnchorClick(item.href)}
              className="py-1.5 text-sm font-medium text-slate-800"
            >
              {item.label}
            </a>
          ))}
          <Link to="/login" className="py-1.5 text-sm text-slate-600">
            Log in
          </Link>
          <Link
            to="/signup"
            className="mt-2 inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400"
          >
            Start free trial
          </Link>
        </div>
      </nav>
    </header>
  );
};


