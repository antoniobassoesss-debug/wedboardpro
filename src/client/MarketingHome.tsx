import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './landing-page.css';
// Top-of-page marketing header/hero use the original CSS-based components below
// New marketing components are used for the mid-page sections
import { SiteHeader } from './components/marketing/SiteHeader';
import { HeroSection as NewHeroSection } from './components/marketing/HeroSection';
import { TrustedByStrip } from './components/marketing/TrustedByStrip';
import { SolutionsSection } from './components/marketing/SolutionsSection';
import { ROISection } from './components/marketing/ROISection';
import { ResourcesSection } from './components/marketing/ResourcesSection';
import { FinalCTASection } from './components/marketing/FinalCTASection';
import { SiteFooter } from './components/marketing/SiteFooter';

const PRIMARY_CTA_HREF = '/signup';
const DEMO_HREF = '/demo';

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Product', href: '#product' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'For planners', href: '#for-planners' },
];

const MarketingHome: React.FC = () => {
  useEffect(() => {
    console.log('%c HELLO FROM WEDBOARDPRO LANDING PAGE v2 ', 'background: #222; color: #bada55; font-size: 20px');
    // Enable scrolling on landing page
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    
    const originalHtmlOverflow = html.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    const originalBodyHeight = body.style.height;
    const originalRootPosition = root?.style.position;
    const originalRootOverflow = root?.style.overflow;
    const originalRootHeight = root?.style.height;
    
    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) {
      root.style.position = 'relative';
      root.style.overflow = 'visible';
      root.style.height = 'auto';
    }
    
    return () => {
      // Restore original styles when component unmounts
      html.style.overflow = originalHtmlOverflow;
      body.style.overflow = originalBodyOverflow;
      body.style.height = originalBodyHeight;
      if (root) {
        root.style.position = originalRootPosition || '';
        root.style.overflow = originalRootOverflow || '';
        root.style.height = originalRootHeight || '';
      }
    };
  }, []);

  return (
    <div className="landing-shell">
      <main className="landing-main">
        {/* Use original header + hero + social proof which match landing-page.css styling */}
        <LandingHeader />
        <HeroSection />
        <SocialProofStrip />

        {/* Mid-page sections use the new marketing components */}
        <FeatureGrid />
        <SolutionsSection />
        <WorkflowSection />
        <ScreenshotsSection />
        <ROISection />
        <ResourcesSection />
        <TestimonialsSection />
        <PricingTeaser />
        <FAQSection />
        <FinalCTASection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default MarketingHome;

/* ----------------------------- Header / Nav ----------------------------- */

const LandingHeader: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleAnchorClick = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith('#')) return;
    event.preventDefault();
    const targetId = href.slice(1);
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link to="/" className="landing-logo">
          <img src="/logo/iconlogo.png" alt="WedBoardPro" className="landing-logo-mark" />
          <span className="landing-logo-text">WedBoardPro</span>
        </Link>

        <nav className="landing-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={handleAnchorClick(item.href)}
              className={item.label === 'Pricing' ? 'landing-nav-link landing-nav-link-pricing' : 'landing-nav-link'}
            >
              {item.label}
            </a>
          ))}
          <Link to="/login" className="landing-nav-login">
            Log in
          </Link>
        </nav>

        <div className="landing-header-right">
          <p className="landing-header-microcopy">14-day free trial · No credit card</p>
          <div className="landing-header-cta">
            <Link to={PRIMARY_CTA_HREF} className="landing-btn-primary">
              Start Free Trial
            </Link>
          </div>
          <button
            type="button"
            className="landing-menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
          >
            <span className="landing-menu-toggle-bar" />
          </button>
        </div>
      </div>

      <div
        id="landing-mobile-nav"
        className={`landing-mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}
        aria-label="Mobile navigation"
      >
        <nav className="landing-mobile-nav-inner">
          <div className="landing-mobile-nav-links">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={handleAnchorClick(item.href)}
                className="landing-mobile-link"
              >
                {item.label}
              </a>
            ))}
            <Link to="/login" className="landing-mobile-link landing-mobile-login">
              Log in
            </Link>
          </div>
          <div className="landing-mobile-cta">
            <Link to={PRIMARY_CTA_HREF} className="landing-btn-primary landing-btn-full">
              Start Free Trial
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
};

/* ------------------------------ Hero Section ---------------------------- */

const HeroSection: React.FC = () => {
  return (
    <section id="for-planners" className="landing-section">
      <div className="landing-hero">
        <div className="landing-hero-left">
          <h1 className="landing-hero-title">
            The all‑in‑one platform for modern wedding planners
          </h1>
          <p className="landing-hero-subtitle">
            WedBoardPro centralizes your timelines, tasks, quotes, vendors and team so every event
            feels calm and every client feels taken care of.
          </p>

          <div className="landing-hero-buttons">
            <Link to={PRIMARY_CTA_HREF} className="landing-btn-primary">
              Start Free Trial
            </Link>
            <Link to={DEMO_HREF} className="landing-btn-ghost">
              <span className="play">▶</span>
              <span>Watch 2‑min tour</span>
            </Link>
          </div>

          <div className="landing-hero-microgrid">
            <MicroBenefit
              title="See every event at a glance"
              description="One pipeline for all weddings with stages, budgets and due dates."
            />
            <MicroBenefit
              title="Send polished quotes in minutes"
              description="Use reusable templates instead of rebuilding proposals from scratch."
            />
            <MicroBenefit
              title="Keep team & vendors in sync"
              description="Share timelines, tasks and notes so everyone knows what’s next."
            />
          </div>
        </div>

        <div className="landing-hero-right">
          <div className="landing-mock-card">
            <div className="landing-mock-glow" />
            <div className="landing-mock-inner">
              <div className="landing-mock-header">
                <div className="landing-mock-dots">
                  <span className="landing-mock-dot" />
                  <span className="landing-mock-dot" />
                  <span className="landing-mock-dot" />
                </div>
                <span>João &amp; Marta – 20/09/2026</span>
              </div>

              <div className="landing-mock-body">
                <div className="landing-mock-sidebar">
                  <p className="landing-mock-sidebar-title">Events</p>
                  {['Lisbon rooftop', 'Country estate', 'Beach ceremony'].map((name, idx) => (
                    <div
                      key={name}
                      className={
                        'landing-mock-event' + (idx === 0 ? ' main' : '')
                      }
                    >
                      <p className="landing-mock-event-title">{name}</p>
                      <p className="landing-mock-event-sub">
                        Sept {20 + idx}, 2026 · {idx === 0 ? 'On track' : 'Planning'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="landing-mock-stages">
                  <div className="landing-mock-header" style={{ marginBottom: 4 }}>
                    <span className="landing-mock-sidebar-title">Project pipeline</span>
                    <span className="landing-mock-pill">72% on track</span>
                  </div>

                  {[
                    { label: 'Vision & style', progress: 100 },
                    { label: 'Venue & date', progress: 80 },
                    { label: 'Vendors & contracts', progress: 60 },
                    { label: 'Logistics & timeline', progress: 30 },
                  ].map((stage) => (
                    <div key={stage.label} className="landing-mock-stage">
                      <div>
                        <p className="landing-mock-stage-title">{stage.label}</p>
                        <p className="landing-mock-stage-sub">
                          {stage.progress === 100 ? 'Completed' : `${stage.progress}% in progress`}
                        </p>
                      </div>
                      <div className="landing-mock-progress">
                        <div
                          className="landing-mock-progress-bar"
                          style={{ width: `${Math.max(18, stage.progress)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const MicroBenefit: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="landing-microcard">
    <div className="landing-micro-icon">✓</div>
    <div>
      <div className="landing-micro-title">{title}</div>
      <div className="landing-micro-text">{description}</div>
    </div>
  </div>
);

/* --------------------------- Social Proof Strip ------------------------- */

const SocialProofStrip: React.FC = () => {
  return (
    <section className="landing-section">
      <div className="landing-strip">
        <div>
          <strong>Trusted by wedding planners across Europe.</strong>{' '}
          <span>★ 4.9 / 5 average satisfaction</span>
        </div>
        <div className="landing-strip-logos">
          {['Lisbon & Co.', 'Amalfi Events', 'Nordic Weddings', 'Sunset Venues'].map((name) => (
            <div key={name} className="landing-strip-logo">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------ Key Outcomes / Features ----------------------- */

const FeatureGrid: React.FC = () => {
  const items = [
    {
      title: 'Project Pipeline',
      description: 'Track each wedding from first brief to post‑event follow‑up in one timeline.',
    },
    {
      title: 'Quote Maker',
      description: 'Generate beautiful, accurate proposals in minutes using your own templates.',
    },
    {
      title: 'Smart Calendar',
      description: 'See all event dates, tasks and team workload in a single, color‑coded view.',
    },
  ];

  return (
    <section id="product" className="landing-section">
      <div className="landing-section-header">
        <div>
          <p className="landing-section-eyebrow">Designed for real planners</p>
          <h2 className="landing-section-title">
            Less chaos. More calm, profitable weddings.
          </h2>
        </div>
        <p className="landing-section-subtitle">
          WedBoardPro replaces scattered spreadsheets, WhatsApp threads and paper notebooks with a
          single workspace the whole team can rely on.
        </p>
      </div>

      <div className="landing-grid-3">
        {items.map((item) => (
          <article key={item.title} className="landing-card">
            <div className="landing-card-kicker">{item.title[0]}</div>
            <h3 className="landing-card-title">{item.title}</h3>
            <p className="landing-card-text">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

/* --------------------------- Workflow Section --------------------------- */

const WorkflowSection: React.FC = () => {
  const steps = [
    {
      title: 'Plan the event',
      description:
        'Create a project, define stages and tasks, and connect budgets, vendors and documents.',
      detail: 'Stage cards, task checklists and client details in one project.',
    },
    {
      title: 'Share the details',
      description:
        'Send quotes, timelines and checklists with a single link so clients and vendors stay aligned.',
      detail: 'Share timelines, PDFs and vendor info with branded, read‑only views.',
    },
    {
      title: 'Deliver the day',
      description:
        'Use a clear day‑of view with timings, owners and notes to run the wedding calmly.',
      detail: 'Switch to a focused, hour‑by‑hour view the team can follow on the day.',
    },
  ];

  return (
    <section className="landing-section">
      <div className="landing-section-header">
        <div>
          <p className="landing-section-eyebrow">Workflow</p>
          <h2 className="landing-section-title">
            A simple flow from enquiry to sparkler exit.
          </h2>
        </div>
        <p className="landing-section-subtitle">
          Every wedding follows the same backbone: plan, share, deliver. WedBoardPro keeps each step
          organised so nothing slips through the cracks.
        </p>
      </div>

      <ol className="landing-workflow-grid">
        {steps.map((step, index) => (
          <li key={step.title} className="landing-card">
            <div className="landing-workflow-step-number">{index + 1}</div>
            <h3 className="landing-card-title">{step.title}</h3>
            <p className="landing-card-text">{step.description}</p>
            <div className="landing-workflow-pill">{step.detail}</div>
          </li>
        ))}
      </ol>
    </section>
  );
};

/* ------------------------- Deep Product Sections ------------------------ */

const ScreenshotsSection: React.FC = () => {
  return (
    <section className="landing-section">
      <div className="landing-two-col">
        <MockPipelineCard />
        <div>
          <p className="landing-section-eyebrow">Project Pipeline</p>
          <h3 className="landing-section-title">
            See every wedding’s status in a single, live board.
          </h3>
          <p className="landing-section-subtitle">
            Each event has clear stages from “Vision & Style” to “Post‑event follow‑up”. Tasks,
            documents and budgets live inside the same view so you never wonder what’s next.
          </p>
          <ul className="landing-card-text" style={{ marginTop: 12, listStyle: 'disc', paddingLeft: 18 }}>
            <li>Spot risky events early with overdue stages and blocked tasks.</li>
            <li>Keep your team aligned with shared checklists and owners per stage.</li>
            <li>Scroll back through the activity log to see who changed what, and when.</li>
          </ul>
        </div>
      </div>

      <div className="landing-two-col" style={{ marginTop: 40 }}>
        <div>
          <p className="landing-section-eyebrow">Quote Maker & Budget</p>
          <h3 className="landing-section-title">
            Professional proposals that clients approve faster.
          </h3>
          <p className="landing-section-subtitle">
            Build line‑item quotes from your own services library, apply markups and taxes, and keep
            budget vs. actuals in sync automatically as you book vendors.
          </p>
          <ul className="landing-card-text" style={{ marginTop: 12, listStyle: 'disc', paddingLeft: 18 }}>
            <li>Reuse templates instead of rebuilding every proposal from a blank file.</li>
            <li>Keep deposits, instalments and final payments under control.</li>
            <li>Export branded PDFs or share a secure link clients can sign off on.</li>
          </ul>
        </div>
        <MockQuotesCard />
      </div>
    </section>
  );
};

const MockPipelineCard: React.FC = () => {
  return (
    <div className="landing-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="landing-card-text" style={{ fontSize: 11 }}>
          Project Pipeline
        </span>
        <span className="landing-badge" style={{ backgroundColor: 'rgba(15,23,42,0.05)', color: '#0f172a' }}>
          8 active weddings
        </span>
      </div>
      <div className="landing-grid-3" style={{ gap: 10 }}>
        {['Planning', 'In progress', 'Ready'].map((column, colIdx) => (
          <div key={column} style={{ background: '#f8fafc', borderRadius: 16, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{column}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{2 + colIdx} events</span>
            </div>
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  borderRadius: 14,
                  border: '1px solid rgba(148,163,184,0.5)',
                  padding: '6px 8px',
                  background: '#ffffff',
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 500 }}>Lisbon rooftop · {2026 + i}</div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>Stage {colIdx + 1} of 4 · 6 tasks</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const MockQuotesCard: React.FC = () => {
  return (
    <div className="landing-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="landing-card-text" style={{ fontSize: 11 }}>
          Quote Maker
        </span>
        <span className="landing-badge">Draft · €18 400</span>
      </div>
      <div className="landing-two-col" style={{ gap: 12, gridTemplateColumns: '2fr 1fr' }}>
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: 10 }}>
          {['Venue fee', 'Catering', 'Photography', 'Flowers & decor'].map((item, idx) => (
            <div
              key={item}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.5)',
                padding: '6px 8px',
                background: '#ffffff',
                marginBottom: 6,
                fontSize: 11,
              }}
            >
              <span>{item}</span>
              <span style={{ color: '#64748b', fontSize: 10 }}>
                € {idx === 0 ? '4 500' : idx === 1 ? '7 800' : idx === 2 ? '2 400' : '3 700'}
              </span>
            </div>
          ))}
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: 10, fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
            <span>Subtotal</span>
            <span>€ 18 400</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#64748b',
              marginTop: 4,
            }}
          >
            <span>Tax (23%)</span>
            <span>Included</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
              borderTop: '1px solid rgba(148,163,184,0.5)',
              paddingTop: 6,
              fontWeight: 600,
            }}
          >
            <span>Total</span>
            <span>€ 18 400</span>
          </div>
          <div
            style={{
              marginTop: 8,
              borderRadius: 12,
              border: '1px dashed rgba(16,185,129,0.8)',
              background: '#ecfdf5',
              padding: '6px 8px',
              fontSize: 10,
              color: '#166534',
            }}
          >
            Client sees this with your logo and can approve in one click.
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------- Testimonials Section ------------------------ */

const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Carolina Alves',
      role: 'Destination wedding planner, Lisbon',
      quote:
        'WedBoardPro finally gave us one place for tasks, vendors and budgets. My team knows exactly what to do every day.',
      badge: '+10 hours saved per event',
    },
    {
      name: 'Marko & Elena',
      role: 'Boutique planning studio, Croatia',
      quote:
        'Before, we were drowning in spreadsheets. Now every event has a clear pipeline and our couples feel the difference.',
      badge: 'Fewer last‑minute surprises',
    },
    {
      name: 'Sofia Mendes',
      role: 'Solo planner, Porto',
      quote:
        'I run 15+ weddings a year on my own. WedBoardPro keeps me calm, even on triple‑header weekends.',
      badge: 'Single source of truth',
    },
  ];

  return (
    <section className="landing-section">
      <div className="landing-section-header">
        <div>
          <p className="landing-section-eyebrow">Social proof</p>
          <h2 className="landing-section-title">
            Planners who live inside WedBoardPro.
          </h2>
        </div>
      </div>

      <div className="landing-testimonials-grid">
        {testimonials.map((t) => (
          <figure key={t.name} className="landing-testimonial">
            <blockquote className="landing-testimonial-quote">“{t.quote}”</blockquote>
            <figcaption className="landing-testimonial-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="landing-avatar">
                  {t.name
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <div className="landing-testimonial-name">{t.name}</div>
                  <div className="landing-testimonial-role">{t.role}</div>
                </div>
              </div>
              <span className="landing-badge">{t.badge}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

/* ---------------------------- Pricing Teaser ----------------------------- */

const PricingTeaser: React.FC = () => {
  const inclusions = [
    'Unlimited active events',
    'Project Pipeline & Smart Calendar',
    'Quote Maker & basic budgets',
    'Team collaboration for small studios',
    'Email support from real planners',
  ];

  return (
    <section id="pricing" className="landing-section">
      <div className="landing-section-header">
        <div>
          <p className="landing-section-eyebrow">Pricing</p>
          <h2 className="landing-section-title">
            Simple pricing for serious planners.
          </h2>
        </div>
        <p className="landing-section-subtitle">
          Start with a free trial. Upgrade only when you are ready to run your whole studio on
          WedBoardPro.
        </p>
      </div>

      <div className="landing-card landing-pricing-card">
        <h3 className="landing-card-title">For Professional Planners</h3>
        <p className="landing-card-text">
          For solo planners and boutique agencies running multiple weddings each season.
        </p>

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 600 }}>From €XX</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>/month</span>
        </div>

        <ul
          style={{
            marginTop: 14,
            fontSize: 12,
            color: '#475569',
            listStyle: 'none',
            paddingLeft: 0,
          }}
        >
          {inclusions.map((item) => (
            <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '999px',
                  background: '#38bdf8',
                  marginTop: 3,
                }}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link to={PRIMARY_CTA_HREF} className="landing-btn-primary" style={{ flex: 1 }}>
            Start Free Trial
          </Link>
          <Link
            to="/pricing"
            className="landing-btn-ghost"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            View full pricing
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------- FAQ Section ----------------------------- */

const FAQ_ITEMS = [
  {
    question: 'Is WedBoardPro only for agencies?',
    answer:
      'No. We designed the workspace for both solo planners and small teams. You can start alone and add team members later.',
  },
  {
    question: 'Do I need to install anything?',
    answer:
      'No installation required. WedBoardPro runs in the browser and works on desktop, tablet and mobile.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. You can cancel your subscription at any time from your account settings. No long‑term contracts.',
  },
  {
    question: 'Do you support multiple planners per account?',
    answer:
      'Yes. Invite planners to your team, assign them to events and tasks, and control access to budgets.',
  },
  {
    question: 'What happens at the end of the trial?',
    answer:
      "We'll remind you before your trial ends. You can choose a paid plan or export your data if you decide not to continue.",
  },
  {
    question: 'Is my client data secure?',
    answer:
      'We use modern cloud infrastructure, encrypted connections and regular backups to keep your data safe.',
  },
];

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="landing-section">
      <div className="landing-section-header">
        <div>
          <p className="landing-section-eyebrow">FAQ</p>
          <h2 className="landing-section-title">
            Questions planners ask before switching.
          </h2>
        </div>
      </div>

      <div className="landing-faq-grid">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={item.question} className="landing-faq-item">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="landing-faq-question-row"
              >
                <span className="landing-faq-question">{item.question}</span>
                <span className="landing-faq-toggle">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && <p className="landing-faq-answer">{item.answer}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

/* ------------------------------ Final CTA ------------------------------- */

const FinalCTA: React.FC = () => {
  return (
    <section className="landing-section">
      <div className="landing-final">
        <h2 className="landing-final-title">
          Turn your wedding chaos into a calm, repeatable workflow.
        </h2>
        <p className="landing-final-sub">
          Start a free trial today or book a demo with our team of former planners.
        </p>
        <div className="landing-final-buttons">
          <Link to={PRIMARY_CTA_HREF} className="landing-btn-primary">
            Start Free Trial
          </Link>
          <Link to={DEMO_HREF} className="landing-btn-ghost">
            Book a Demo
          </Link>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------- Footer -------------------------------- */

const LandingFooter: React.FC = () => {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <p>© {new Date().getFullYear()} WedBoardPro. All rights reserved.</p>
        <div className="landing-footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
};

