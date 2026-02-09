import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Contact: React.FC = () => {
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

      {/* Main Content */}
      <main style={{ paddingTop: isMobile ? '80px' : '120px', paddingBottom: isMobile ? '48px' : '80px' }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 24px'
        }}>
          {/* Page Title */}
          <div style={{ marginBottom: isMobile ? '32px' : '48px' }}>
            <h1 style={{
              fontSize: isMobile ? '28px' : '40px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#111827',
              margin: 0,
              lineHeight: 1.15
            }}>
              Contact Us
            </h1>
          </div>

          {/* Content */}
          <div style={{ color: '#374151', fontSize: isMobile ? '14px' : '16px', lineHeight: 1.75 }}>
            {/* Technical Support */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                Technical Support
              </h2>
              <div style={{
                padding: isMobile ? '16px' : '24px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ margin: 0, marginBottom: '8px', fontSize: isMobile ? '14px' : '15px', color: '#6b7280' }}>
                  For technical issues or questions:
                </p>
                <a
                  href="mailto:support@wedboardpro.com"
                  style={{
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: 500,
                    color: '#2563eb',
                    textDecoration: 'none'
                  }}
                >
                  support@wedboardpro.com
                </a>
              </div>
            </section>

            {/* Business Address */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                Business Address
              </h2>
              <div style={{
                padding: isMobile ? '16px' : '24px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ margin: 0, fontSize: isMobile ? '16px' : '18px', fontWeight: 500, color: '#111827' }}>
                  António Basso
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: isMobile ? '14px' : '16px', color: '#6b7280' }}>
                  Avenida Conselheiro Ferreira Lobo, 26<br />
                  Lisboa, Portugal
                </p>
              </div>
            </section>

            {/* Additional Info */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                Get in Touch
              </h2>
              <p style={{ marginBottom: '12px' }}>
                Have questions about our platform, pricing, or features? We're here to help you streamline your wedding planning business.
              </p>
              <p style={{ margin: 0 }}>
                Our team typically responds within 24-48 hours during business days.
              </p>
            </section>
          </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '32px', fontSize: isMobile ? '13px' : '14px' }}>
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

export default Contact;
