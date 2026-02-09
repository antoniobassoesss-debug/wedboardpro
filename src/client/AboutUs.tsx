import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const AboutUs: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) {
      root.style.position = 'relative';
      root.style.overflow = 'visible';
      root.style.height = 'auto';
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
      html.style.overflow = '';
      body.style.overflow = '';
      body.style.height = '';
      if (root) {
        root.style.position = '';
        root.style.overflow = '';
        root.style.height = '';
      }
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      overflowY: 'auto'
    }}>
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
          maxWidth: '1000px',
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 24px',
          height: isMobile ? '60px' : '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', textDecoration: 'none' }}>
            <img src="/logo/iconlogo.png" alt="WedBoardPro" style={{ width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', objectFit: 'contain' }} />
            <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 600, color: '#111827', letterSpacing: '-0.025em' }}>WedBoardPro</span>
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
      </header>

      {/* Hero Section */}
      <main style={{ paddingTop: isMobile ? '80px' : '120px', paddingBottom: isMobile ? '48px' : '80px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px' }}>
          
          {/* Page Title */}
          <div style={{ textAlign: 'center', marginBottom: isMobile ? '40px' : '64px' }}>
            <h1 style={{
              fontSize: isMobile ? '32px' : '48px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#111827',
              margin: 0,
              lineHeight: 1.15,
              marginBottom: '16px'
            }}>
              About WedBoardPro
            </h1>
            <p style={{
              fontSize: isMobile ? '16px' : '18px',
              color: '#6b7280',
              lineHeight: 1.6,
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Empowering wedding planners to focus on what matters most — creating unforgettable moments.
            </p>
          </div>

          {/* Our Story */}
          <section style={{ marginBottom: isMobile ? '40px' : '56px' }}>
            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: isMobile ? '12px' : '16px',
              padding: isMobile ? '24px' : '40px'
            }}>
              <h2 style={{
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '16px',
                marginTop: 0
              }}>
                Our Story
              </h2>
              <p style={{ marginBottom: '16px', lineHeight: 1.75 }}>
                WedBoardPro was born from a simple observation: wedding planners spend more time managing spreadsheets and scattered tools than they do with their couples and vendors.
              </p>
              <p style={{ marginBottom: '16px', lineHeight: 1.75 }}>
                We built WedBoardPro to be the operating system that wedding professionals deserve — a centralized platform that handles the complexity of multi-wedding management so you can focus on the art of celebration.
              </p>
              <p style={{ margin: 0, lineHeight: 1.75 }}>
                Today, we're proud to serve 50+ wedding planners across Europe and the US, helping them save hours each week and deliver exceptional experiences for their clients.
              </p>
            </div>
          </section>

          {/* Mission & Values */}
          <section style={{ marginBottom: isMobile ? '40px' : '56px' }}>
            <h2 style={{
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '24px',
              marginTop: 0,
              textAlign: 'center'
            }}>
              Our Mission
            </h2>
            <p style={{
              fontSize: isMobile ? '18px' : '20px',
              color: '#374151',
              lineHeight: 1.6,
              textAlign: 'center',
              maxWidth: '600px',
              margin: '0 auto 32px'
            }}>
              To give wedding planners their time back — so they can focus on creating magical moments, not managing paperwork.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? '16px' : '24px'
            }}>
              {[
                {
                  title: 'Simplicity',
                  desc: 'Tools that feel intuitive from day one. No steep learning curves.'
                },
                {
                  title: 'Reliability',
                  desc: 'When you need us, we\'re there. Dependable service you can trust.'
                },
                {
                  title: 'Partnership',
                  desc: 'We\'re in this together. Your success is our success.'
                }
              ].map((value, i) => (
                <div key={i} style={{
                  padding: isMobile ? '20px' : '24px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: '8px',
                    marginTop: 0
                  }}>
                    {value.title}
                  </h3>
                  <p style={{
                    fontSize: isMobile ? '14px' : '15px',
                    color: '#6b7280',
                    margin: 0,
                    lineHeight: 1.5
                  }}>
                    {value.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Founder */}
          <section style={{ marginBottom: isMobile ? '40px' : '56px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr',
              gap: isMobile ? '24px' : '40px',
              alignItems: 'center'
            }}>
              <div style={{
                width: isMobile ? '120px' : '180px',
                height: isMobile ? '120px' : '180px',
                borderRadius: '50%',
                backgroundColor: '#e5e7eb',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width={isMobile ? "48" : "72"} height={isMobile ? "48" : "72"} viewBox="0 0 72 72" fill="none">
                  <circle cx="36" cy="28" r="16" stroke="#9ca3af" strokeWidth="2"/>
                  <path d="M12 66C12 52 24 50 36 50C48 50 60 52 60 66" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h2 style={{
                  fontSize: isMobile ? '20px' : '24px',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '12px',
                  marginTop: 0
                }}>
                  Meet the Founder
                </h2>
                <p style={{
                  fontSize: isMobile ? '28px' : '32px',
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: '12px',
                  marginTop: 0
                }}>
                  António Basso
                </p>
                <p style={{
                  fontSize: isMobile ? '14px' : '15px',
                  color: '#6b7280',
                  marginBottom: '16px',
                  lineHeight: 1.6
                }}>
                  With a background focused on systems engineering and digital transformation, António Basso founded WedBoardPro to solve the critical fragmentation of B2B workflows. His approach combines strict data security protocols with intuitive design, ensuring that complex organizations can centralize operations without compromising compliance. He leads the product strategy with a single metric in mind: minimizing operational friction for enterprise clients.
                </p>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section style={{ marginBottom: isMobile ? '40px' : '56px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? '16px' : '24px'
            }}>
              {[
                { number: '50+', label: 'Active planners' },
                { number: '1K+', label: 'Events planned' },
                { number: '5K+', label: 'Hours saved' },
                { number: '2025', label: 'Founded' }
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: isMobile ? '28px' : '36px',
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: '4px'
                  }}>
                    {stat.number}
                  </div>
                  <div style={{
                    fontSize: isMobile ? '13px' : '14px',
                    color: '#6b7280'
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section style={{ textAlign: 'center' }}>
            <div style={{
              padding: isMobile ? '32px' : '48px',
              backgroundColor: '#111827',
              borderRadius: isMobile ? '12px' : '16px'
            }}>
              <h2 style={{
                fontSize: isMobile ? '22px' : '28px',
                fontWeight: 600,
                color: '#ffffff',
                marginBottom: '12px',
                marginTop: 0
              }}>
                Ready to streamline your workflow?
              </h2>
              <p style={{
                fontSize: isMobile ? '14px' : '16px',
                color: '#9ca3af',
                marginBottom: '24px',
                maxWidth: '400px',
                margin: '0 auto 24px'
              }}>
                Join hundreds of wedding professionals who've made the switch to WedBoardPro.
              </p>
              <Link
                to="/demo"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: isMobile ? '14px 24px' : '16px 32px',
                  fontSize: isMobile ? '14px' : '15px',
                  fontWeight: 500,
                  color: '#111827',
                  textDecoration: 'none',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff'
                }}
              >
                Book a Demo
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #f3f4f6' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '24px 16px' : '40px 32px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '16px' : '24px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo/iconlogo.png" alt="WedBoardPro" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>WedBoardPro</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '32px', fontSize: isMobile ? '13px' : '14px' }}>
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

export default AboutUs;
