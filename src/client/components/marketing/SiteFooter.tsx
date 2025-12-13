import React from 'react';
import { Link } from 'react-router-dom';

export const SiteFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-300 text-xs">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="mb-4 text-[11px] text-emerald-300">
          How can we help?{' '}
          <Link to="/contact" className="underline decoration-emerald-400 underline-offset-2">
            Contact us
          </Link>
          .
        </p>

        <div className="grid gap-6 md:grid-cols-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-50">WedBoardPro</p>
            <p className="text-[11px] text-slate-400">
              The calm, connected workspace for professional wedding planners and studios.
            </p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Product
            </p>
            <ul className="space-y-1">
              <li><Link to="/#product" className="hover:text-slate-100">Features</Link></li>
              <li><Link to="/#pricing" className="hover:text-slate-100">Pricing</Link></li>
              <li><Link to="/#solutions" className="hover:text-slate-100">Solutions</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Resources
            </p>
            <ul className="space-y-1">
              <li><Link to="/resources" className="hover:text-slate-100">Blog</Link></li>
              <li><Link to="/resources/guides" className="hover:text-slate-100">Guides</Link></li>
              <li><Link to="/support" className="hover:text-slate-100">Support</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Company
            </p>
            <ul className="space-y-1">
              <li><Link to="/about" className="hover:text-slate-100">About</Link></li>
              <li><Link to="/contact" className="hover:text-slate-100">Contact</Link></li>
              <li><Link to="/legal" className="hover:text-slate-100">Legal</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
            <Link to="/terms" className="hover:text-slate-100">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-slate-100">
              Privacy
            </Link>
            <Link to="/cookies" className="hover:text-slate-100">
              Cookies
            </Link>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-slate-100">
              Instagram
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noreferrer" className="hover:text-slate-100">
              Pinterest
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-slate-100">
              LinkedIn
            </a>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-500">
          © {year} WedBoardPro. All rights reserved.
        </div>
      </div>
    </footer>
  );
};


