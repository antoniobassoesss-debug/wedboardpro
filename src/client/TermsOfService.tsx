import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => {
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
              Terms of Service
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
            {/* Intro */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <p style={{ marginBottom: '12px' }}>
                These Terms constitute a legally binding agreement between you and António Basso, trabalhador independente, Avenida Conselheiro Ferreira Lobo 26, Lisboa, Portugal ("WedBoardPro"), regarding your access to and use of our platform and services.
              </p>
              <p style={{ margin: 0 }}>
                By accessing or using the Service, you agree to these Terms.
              </p>
            </section>

            {/* Section 1 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                1. Definitions
              </h2>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#111827' }}>"Customer Data"</strong>: Data, content, documents you upload.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#111827' }}>"Subscription Term"</strong>: Monthly, annual, or selected period.
                </li>
                <li>
                  <strong style={{ color: '#111827' }}>"Fees"</strong>: Charges for the Service.
                </li>
              </ul>
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
                2. License Grant
              </h2>
              <p style={{ margin: 0 }}>
                Subject to payment of Fees, we grant you a limited, non-exclusive, non-transferable license to access and use the Service for internal business purposes during your Subscription Term.
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
                3. Subscription and Payment
              </h2>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Auto-Renewal:</strong> 30-day notice required for cancellation.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Fees:</strong> Non-refundable except as required by law.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Processing:</strong> Via Stripe. You authorize recurring charges.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Late Payments:</strong> 1.5% interest/month, service suspension after 10 days.
                </li>
                <li>
                  <strong>Taxes:</strong> Your responsibility.
                </li>
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
                4. Acceptable Use
              </h2>
              <p style={{ marginBottom: '12px' }}>
                You agree not to:
              </p>
              <ol style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>Use for illegal purposes, spam, malware, infringement.</li>
                <li style={{ marginBottom: '8px' }}>Reverse engineer or derive source code.</li>
                <li style={{ marginBottom: '8px' }}>Overload, disrupt, or interfere with the Service.</li>
                <li>Upload content violating laws or third-party rights.</li>
              </ol>
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                fontSize: isMobile ? '13px' : '14px',
                color: '#92400e',
                margin: 0
              }}>
                We may suspend or terminate access immediately for violations.
              </div>
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
                5. Intellectual Property
              </h2>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Our Rights:</strong> We own all rights in the Service, software, designs, trademarks.
                </li>
                <li>
                  <strong>Your Rights:</strong> You retain all rights in your Customer Data. You grant us a limited license to host and display it.
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                6. Data Protection
              </h2>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Privacy:</strong> See our <Link to="/privacy" style={{ color: '#2563eb', textDecoration: 'none' }}>Privacy Policy</Link>.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>GDPR Role:</strong> You are Data Controller for Customer Data; we are Data Processor.
                </li>
                <li>
                  <strong>Data Portability:</strong> Export in CSV/JSON within 30 days of termination.
                </li>
              </ul>
            </section>

            {/* Section 7 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                7. Warranties and Disclaimers
              </h2>
              <p style={{
                padding: isMobile ? '16px' : '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                margin: 0
              }}>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND. WE DO NOT WARRANT UNINTERRUPTED, ERROR-FREE, OR SECURE OPERATION.
              </p>
            </section>

            {/* Section 8 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                8. Limitation of Liability
              </h2>
              <ol style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  NO INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
                </li>
                <li>
                  TOTAL LIABILITY capped at FEES PAID IN 12 MONTHS preceding the claim.
                </li>
              </ol>
              <p style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                fontSize: isMobile ? '13px' : '14px',
                color: '#166534',
                margin: 0
              }}>
                Mandatory consumer protections under applicable law are not excluded.
              </p>
            </section>

            {/* Section 9 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                9. Indemnification
              </h2>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  You indemnify us for claims arising from your violation of these Terms.
                </li>
                <li>
                  We indemnify you for Service infringement claims (excluding your modifications).
                </li>
              </ul>
            </section>

            {/* Sections 10-14 */}
            <section style={{ marginBottom: isMobile ? '28px' : '40px' }}>
              <h2 style={{
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '12px',
                marginTop: 0
              }}>
                10. Termination
              </h2>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Convenience:</strong> Either party with 30 days' notice.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <strong>Cause:</strong> Immediate for material breach, illegal use, insolvency.
                </li>
                <li>
                  <strong>Effect:</strong> 30 days to export data. No refunds for partial terms.
                </li>
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
                11. Force Majeure
              </h2>
              <p style={{ margin: 0 }}>
                Neither party liable for delays due to events beyond reasonable control (natural disasters, cyberattacks, government actions).
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
                12. Changes to Terms
              </h2>
              <p style={{ margin: 0 }}>
                Continued use after changes constitutes acceptance. Material changes notified 30 days in advance.
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
                13. Governing Law
              </h2>
              <p style={{ margin: 0 }}>
                Laws of Portugal. Disputes resolved exclusively in the courts of Lisboa, Portugal.
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
                14. Miscellaneous
              </h2>
              <ul style={{ paddingLeft: '16px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}>Entire agreement.</li>
                <li style={{ marginBottom: '6px' }}>Invalid provisions don't affect remainder.</li>
                <li style={{ marginBottom: '6px' }}>
                  Notices: <a href="mailto:legal@wedboardpro.com" style={{ color: '#2563eb', textDecoration: 'none' }}>legal@wedboardpro.com</a>
                </li>
                <li>No waiver unless in writing.</li>
              </ul>
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

export default TermsOfService;
