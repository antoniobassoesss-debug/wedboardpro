import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
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
              Privacy Policy
            </h1>
            <p style={{
              marginTop: '12px',
              fontSize: isMobile ? '14px' : '16px',
              color: '#6b7280'
            }}>
              Last updated: February 8, 2026
            </p>
          </div>

          {/* Content */}
          <div style={{ color: '#374151', fontSize: isMobile ? '14px' : '16px', lineHeight: 1.75 }}>
            {/* Section 1 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                1. Introduction
              </h2>
              <p style={{ marginBottom: '12px' }}>
                WedBoardPro is committed to protecting your privacy and the security of your data. This Privacy Policy explains how we collect, use, disclose, transfer, and safeguard personal data when you use our services.
              </p>
              <p style={{ marginBottom: '12px' }}>
                WedBoardPro is operated by António Basso, Avenida Conselheiro Ferreira Lobo 26, Lisboa, Portugal.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>Contact:</strong> <a href="mailto:privacy@wedboardpro.com" style={{ color: '#2563eb', textDecoration: 'none' }}>privacy@wedboardpro.com</a>
              </p>
              <div style={{
                marginTop: '16px',
                padding: isMobile ? '16px' : '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '10px',
                  marginTop: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Role Definition (GDPR)
                </h3>
                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                  <li style={{ marginBottom: '6px' }}>
                    When you upload customer content, you act as the <strong style={{ color: '#111827' }}>Data Controller</strong>, and WedBoardPro acts as the <strong style={{ color: '#111827' }}>Data Processor</strong>.
                  </li>
                  <li>
                    For data we collect directly from you, we act as the <strong style={{ color: '#111827' }}>Data Controller</strong>.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                2. Data We Collect
              </h2>
              <ul style={{ paddingLeft: '16px', marginBottom: '12px' }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#111827' }}>Account Information:</strong> Name, email, password (hashed), company, billing details.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#111827' }}>Payment Information:</strong> Handled securely by Stripe — we do not store full card details.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#111827' }}>Usage Data:</strong> IP address, browser, device, access times, logs.
                </li>
                <li>
                  <strong style={{ color: '#111827' }}>Customer Content:</strong> Documents and workflows you upload.
                </li>
              </ul>
              <p style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                fontSize: isMobile ? '13px' : '14px',
                color: '#92400e',
                margin: 0
              }}>
                Note: We do not collect sensitive personal data unless you explicitly include it in customer content.
              </p>
            </section>

            {/* Section 3 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                3. How We Collect Data
              </h2>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}><strong style={{ color: '#111827' }}>Directly from you:</strong> Signup, billing.</li>
                <li style={{ marginBottom: '8px' }}><strong style={{ color: '#111827' }}>Automatically:</strong> Cookies, logs, analytics.</li>
                <li><strong style={{ color: '#111827' }}>Third parties:</strong> Stripe, Supabase.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                4. Purposes and Legal Bases
              </h2>
              <ol style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>Providing Services → <strong style={{ color: '#111827' }}>Performance of contract</strong></li>
                <li style={{ marginBottom: '8px' }}>Processing payments → <strong style={{ color: '#111827' }}>Contract + Legal obligation</strong></li>
                <li style={{ marginBottom: '8px' }}>Security & debugging → <strong style={{ color: '#111827' }}>Legitimate interests</strong></li>
                <li style={{ marginBottom: '8px' }}>Improving platform → <strong style={{ color: '#111827' }}>Legitimate interests</strong></li>
                <li>Legal compliance → <strong style={{ color: '#111827' }}>Legal obligation</strong></li>
              </ol>
            </section>

            {/* Section 5 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                5. Data Sharing and Subprocessors
              </h2>
              <p style={{ marginBottom: '12px' }}>
                We do not sell personal information. We share data only with trusted subprocessors:
              </p>
              <div style={{
                padding: isMobile ? '16px' : '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
                  <h3 style={{
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: '6px',
                    marginTop: 0
                  }}>
                    Supabase
                  </h3>
                  <p style={{ fontSize: isMobile ? '13px' : '14px', color: '#6b7280', margin: 0 }}>
                    Database hosting, storage, authentication.
                  </p>
                  <p style={{ fontSize: '12px', color: '#059669', marginTop: '6px' }}>
                    Data location: EU region (if selected)
                  </p>
                </div>
                <div style={{ paddingTop: isMobile ? '12px' : '16px', borderTop: '1px solid #e5e7eb' }}>
                  <h3 style={{
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: '6px',
                    marginTop: 0
                  }}>
                    Stripe
                  </h3>
                  <p style={{ fontSize: isMobile ? '13px' : '14px', color: '#6b7280', margin: 0 }}>
                    Payment processing.
                  </p>
                  <p style={{ fontSize: '12px', color: '#059669', marginTop: '6px' }}>
                    Data location: US
                  </p>
                </div>
              </div>
            </section>

            {/* Sections 6-13 (condensed) */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                6. International Data Transfers
              </h2>
              <p style={{ margin: 0 }}>
                Data may be processed in EU, US, or other countries. We rely on EU-U.S. DPF, UK Extension, and Standard Contractual Clauses for transfers.
              </p>
            </section>

            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                7. Data Security
              </h2>
              <p style={{ marginBottom: '8px' }}>
                We use AES-256 encryption, TLS 1.3, ISO 27001-certified data centers, access controls, and regular audits.
              </p>
              <p style={{ margin: 0 }}>
                In case of breach, we notify you and authorities within 72 hours (GDPR).
              </p>
            </section>

            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                8. Data Retention
              </h2>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}><strong>Account data:</strong> During subscription + backup period</li>
                <li style={{ marginBottom: '6px' }}><strong>Customer content:</strong> While subscription active</li>
                <li><strong>Termination:</strong> Deleted within 30 days</li>
              </ul>
            </section>

            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                9. Your Rights
              </h2>
              <p style={{ marginBottom: '8px' }}>
                Access, rectification, erasure, restriction, portability, object to processing, withdraw consent.
              </p>
              <p style={{ marginBottom: '8px' }}>
                Contact: <a href="mailto:privacy@wedboardpro.com" style={{ color: '#2563eb', textDecoration: 'none' }}>privacy@wedboardpro.com</a>
              </p>
              <p style={{ margin: 0 }}>
                EEA/UK users may contact their local supervisory authority.
              </p>
            </section>

            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                10. Children's Privacy
              </h2>
              <p style={{ margin: 0 }}>
                Not directed at children under 16. We do not knowingly collect data from children.
              </p>
            </section>

            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                11. Automated Decision-Making
              </h2>
              <p style={{ margin: 0 }}>
                We do not engage in automated decision-making or profiling.
              </p>
            </section>

            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                12. Changes to This Policy
              </h2>
              <p style={{ margin: 0 }}>
                Changes posted with new date. Material changes notified 30 days in advance.
              </p>
            </section>

            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                13. Contact Us
              </h2>
              <div style={{
                padding: isMobile ? '16px' : '24px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ margin: 0, marginBottom: '8px' }}>
                  <a href="mailto:privacy@wedboardpro.com" style={{ color: '#2563eb', textDecoration: 'none' }}>privacy@wedboardpro.com</a>
                </p>
                <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>
                  António Basso
                </p>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  Avenida Conselheiro Ferreira Lobo 26, Lisboa, Portugal.
                </p>
              </div>
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

export default PrivacyPolicy;
