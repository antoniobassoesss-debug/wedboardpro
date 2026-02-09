import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const MarketingHome: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
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
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 32px',
          height: isMobile ? '60px' : '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', textDecoration: 'none' }}>
            <img src="/logo/iconlogo.png" alt="WedBoardPro" style={{ width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', objectFit: 'contain' }} />
            {!isMobile && <span style={{ fontSize: '20px', fontWeight: 600, color: '#111827', letterSpacing: '-0.025em' }}>WedBoardPro</span>}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '8px' }}>
            <Link
              to="/login"
              style={{
                padding: isMobile ? '8px 12px' : '10px 20px',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 500,
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '8px'
              }}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              style={{
                padding: isMobile ? '8px 14px' : '10px 20px',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 500,
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                backgroundColor: '#111827'
              }}
            >
              {isMobile ? 'Start trial' : 'Start free trial'}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section style={{ paddingTop: isMobile ? '100px' : '120px', paddingBottom: isMobile ? '60px' : '80px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 20px' : '0 48px' }}>
            {isMobile ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '5px 12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '100px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#4b5563',
                  marginBottom: '16px'
                }}>
                  Trusted by 500+ wedding professionals
                </div>
                <h1 style={{
                  fontSize: '32px',
                  fontWeight: 600,
                  letterSpacing: '-0.035em',
                  color: '#111827',
                  lineHeight: 1.15,
                  margin: 0
                }}>
                  The operating system for wedding planners
                </h1>
                <p style={{
                  marginTop: '16px',
                  fontSize: '16px',
                  color: '#6b7280',
                  lineHeight: 1.6,
                  fontWeight: 400
                }}>
                  Centralize your workflows and manage multiple weddings from one platform.
                </p>
                <div style={{
                  marginTop: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Link
                    to="/signup"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '14px 24px',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '10px',
                      backgroundColor: '#111827',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    Start free trial
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: '4px' }}>
                      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                  <Link
                    to="/demo"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '14px 24px',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#374151',
                      textDecoration: 'none',
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    Book a demo
                  </Link>
                </div>
                <p style={{ marginTop: '16px', fontSize: '12px', color: '#9ca3af' }}>
                  14-day free trial · No credit card required
                </p>
                <div style={{
                  marginTop: '32px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                }}>
                  <img
                    src="/landing_page.png"
                    alt="WedBoardPro Platform Overview"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
                <div>
                  <div style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '100px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#4b5563',
                    marginBottom: '24px'
                  }}>
                    Trusted by 500+ wedding professionals
                  </div>
                  <h1 style={{
                    fontSize: '48px',
                    fontWeight: 600,
                    letterSpacing: '-0.035em',
                    color: '#111827',
                    lineHeight: 1.1,
                    margin: 0
                  }}>
                    The operating system for<br />modern wedding planners
                  </h1>
                  <p style={{
                    marginTop: '28px',
                    fontSize: '19px',
                    color: '#6b7280',
                    lineHeight: 1.6,
                    fontWeight: 400,
                    maxWidth: '480px'
                  }}>
                    Centralize your workflows, manage multiple weddings, and deliver exceptional experiences — all from one platform.
                  </p>
                  <div style={{
                    marginTop: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <Link
                      to="/signup"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '16px 28px',
                        fontSize: '15px',
                        fontWeight: 500,
                        color: '#ffffff',
                        textDecoration: 'none',
                        borderRadius: '10px',
                        backgroundColor: '#111827',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      Start free trial
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: '4px' }}>
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                    <Link
                      to="/demo"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '16px 28px',
                        fontSize: '15px',
                        fontWeight: 500,
                        color: '#374151',
                        textDecoration: 'none',
                        borderRadius: '10px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      Book a demo
                    </Link>
                  </div>
                  <p style={{ marginTop: '20px', fontSize: '13px', color: '#9ca3af' }}>
                    14-day free trial · No credit card required
                  </p>
                </div>
                <div style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)',
                  border: '1px solid rgba(0, 0, 0, 0.06)'
                }}>
                  <img
                    src="/landing_page.png"
                    alt="WedBoardPro Platform Overview"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: isMobile ? '48px 0' : '100px 0', backgroundColor: '#fafafa' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '64px' }}>
              <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 600, color: '#111827', letterSpacing: '-0.025em', margin: 0 }}>
                Everything you need
              </h2>
              <p style={{ marginTop: isMobile ? '12px' : '16px', fontSize: isMobile ? '15px' : '17px', color: '#6b7280', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                Purpose-built tools for wedding professionals.
              </p>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '16px' : '24px'
            }}>
              <FeatureCard
                icon={<PipelineIcon />}
                title="Project Pipeline"
                description="Visualize every wedding from first inquiry to final delivery."
                isMobile={isMobile}
              />
              <FeatureCard
                icon={<LayoutIcon />}
                title="Layout Maker"
                description="Design floor plans and seating with drag-and-drop."
                isMobile={isMobile}
              />
              <FeatureCard
                icon={<CalendarIcon />}
                title="Team Calendar"
                description="Unified view of all events and team availability."
                isMobile={isMobile}
              />
            </div>
          </div>
        </section>

        {/* Social Proof - Hidden on mobile for cleaner experience */}
        {!isMobile && (
          <section style={{ padding: '80px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '48px', flexWrap: 'wrap', opacity: 0.6 }}>
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>TRUSTED BY TEAMS AT</span>
                {['Lisbon & Co.', 'Amalfi Events', 'Nordic Weddings', 'Sunset Venues'].map((name) => (
                  <span key={name} style={{ fontSize: '15px', color: '#374151', fontWeight: 500 }}>{name}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing */}
        <section style={{ padding: isMobile ? '48px 0' : '120px 0' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '64px' }}>
              <h2 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 600, color: '#111827', letterSpacing: '-0.025em', margin: 0 }}>
                Transparent pricing
              </h2>
              <p style={{ marginTop: isMobile ? '12px' : '16px', fontSize: isMobile ? '15px' : '17px', color: '#6b7280' }}>
                {isMobile ? 'Upgrade or downgrade anytime.' : 'Choose the plan that fits your business. Upgrade or downgrade anytime.'}
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '16px' : '24px',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              {/* On mobile, show Professional first (most popular) */}
              {isMobile ? (
                <>
                  <PricingCard
                    name="Professional"
                    price={59}
                    description="For growing studios"
                    features={['Unlimited projects', '5 team members', 'Advanced analytics', 'Priority support']}
                    popular
                    isMobile={isMobile}
                  />
                  <PricingCard
                    name="Starter"
                    price={29}
                    description="For independent planners"
                    features={['Up to 10 active projects', '2 team members', 'Core planning tools']}
                    isMobile={isMobile}
                  />
                  <PricingCard
                    name="Enterprise"
                    price={149}
                    description="For established agencies"
                    features={['Unlimited everything', 'Unlimited team members', 'API access', 'Dedicated manager']}
                    isMobile={isMobile}
                  />
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                  <PricingCard
                    name="Starter"
                    price={29}
                    description="For independent planners"
                    features={['Up to 10 active projects', '2 team members', 'Core planning tools', 'Email support']}
                    isMobile={isMobile}
                  />
                  <PricingCard
                    name="Professional"
                    price={59}
                    description="For growing studios"
                    features={['Unlimited projects', '5 team members', 'Advanced analytics', 'Priority support', 'Custom branding']}
                    popular
                    isMobile={isMobile}
                  />
                  <PricingCard
                    name="Enterprise"
                    price={149}
                    description="For established agencies"
                    features={['Unlimited everything', 'Unlimited team members', 'API access', 'Dedicated account manager', 'Custom integrations']}
                    isMobile={isMobile}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: isMobile ? '48px 0' : '100px 0', backgroundColor: '#111827' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: isMobile ? '24px' : '36px', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.025em', margin: 0 }}>
              Ready to streamline your business?
            </h2>
            <p style={{ marginTop: isMobile ? '12px' : '20px', fontSize: isMobile ? '15px' : '17px', color: '#9ca3af', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
              Join hundreds of wedding professionals who have made the switch.
            </p>
            <div style={{ marginTop: isMobile ? '24px' : '40px' }}>
              <Link
                to="/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: isMobile ? '100%' : 'auto',
                  padding: isMobile ? '14px 28px' : '16px 32px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: '#111827',
                  textDecoration: 'none',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff'
                }}
              >
                Get started for free
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #f3f4f6' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '24px 20px' : '40px 32px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          gap: isMobile ? '20px' : '24px',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo/iconlogo.png" alt="WedBoardPro" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>WedBoardPro</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '32px', fontSize: '14px' }}>
            <Link to="/about" style={{ color: '#111827', textDecoration: 'none', fontWeight: 500 }}>About</Link>
            <Link to="/privacy" style={{ color: '#6b7280', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/terms" style={{ color: '#6b7280', textDecoration: 'none' }}>Terms</Link>
            <Link to="/contact" style={{ color: '#6b7280', textDecoration: 'none' }}>Contact</Link>
          </div>
          <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#9ca3af', margin: 0 }}>
            © {new Date().getFullYear()} WedBoardPro
          </p>
        </div>
      </footer>
    </div>
  );
};

const PipelineIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const LayoutIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  isMobile: boolean;
}> = ({ icon, title, description, isMobile }) => (
  <div style={{
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    padding: isMobile ? '20px' : '32px',
    border: '1px solid #e5e7eb',
    display: isMobile ? 'flex' : 'block',
    alignItems: isMobile ? 'flex-start' : undefined,
    gap: isMobile ? '16px' : undefined
  }}>
    <div style={{
      width: isMobile ? '40px' : '48px',
      height: isMobile ? '40px' : '48px',
      minWidth: isMobile ? '40px' : '48px',
      borderRadius: '10px',
      backgroundColor: '#f3f4f6',
      color: '#374151',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: isMobile ? 0 : '20px'
    }}>
      {icon}
    </div>
    <div>
      <h3 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 600, color: '#111827', marginBottom: '6px', marginTop: 0 }}>{title}</h3>
      <p style={{ fontSize: isMobile ? '14px' : '15px', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>{description}</p>
    </div>
  </div>
);

const PricingCard: React.FC<{
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
  isMobile: boolean;
}> = ({ name, price, description, features, popular, isMobile }) => (
  <div style={{
    borderRadius: '12px',
    padding: isMobile ? '24px' : '32px',
    backgroundColor: popular ? '#111827' : '#ffffff',
    border: popular ? 'none' : '1px solid #e5e7eb',
    position: 'relative'
  }}>
    {popular && (
      <span style={{
        position: 'absolute',
        top: isMobile ? '20px' : '24px',
        right: isMobile ? '20px' : '24px',
        padding: '4px 10px',
        backgroundColor: '#374151',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Popular
      </span>
    )}
    <p style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: 500, color: popular ? '#9ca3af' : '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {name}
    </p>
    <div style={{ marginTop: isMobile ? '12px' : '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
      <span style={{ fontSize: isMobile ? '36px' : '48px', fontWeight: 600, color: popular ? '#ffffff' : '#111827', letterSpacing: '-0.025em' }}>
        €{price}
      </span>
      <span style={{ fontSize: isMobile ? '14px' : '15px', color: popular ? '#6b7280' : '#9ca3af' }}>/month</span>
    </div>
    <p style={{ fontSize: '14px', color: popular ? '#9ca3af' : '#6b7280', marginTop: '8px' }}>
      {description}
    </p>
    <ul style={{ marginTop: isMobile ? '20px' : '28px', padding: 0, listStyle: 'none' }}>
      {features.map((feature) => (
        <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', marginBottom: isMobile ? '10px' : '14px' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
            <path d="M15 4.5L6.75 12.75L3 9" stroke={popular ? '#9ca3af' : '#111827'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ color: popular ? '#d1d5db' : '#374151' }}>{feature}</span>
        </li>
      ))}
    </ul>
    <Link
      to="/signup"
      style={{
        marginTop: isMobile ? '20px' : '28px',
        display: 'block',
        width: '100%',
        padding: isMobile ? '12px 0' : '14px 0',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 500,
        textDecoration: 'none',
        borderRadius: '8px',
        backgroundColor: popular ? '#ffffff' : '#111827',
        color: popular ? '#111827' : '#ffffff',
        boxSizing: 'border-box'
      }}
    >
      Get started
    </Link>
  </div>
);

export default MarketingHome;
