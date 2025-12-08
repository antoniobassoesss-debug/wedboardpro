import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderBarProps {
  showDashboardButton?: boolean;
  showLogo?: boolean;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ showDashboardButton = true, showLogo = true }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: '1200px',
        padding: '10px 20px',
        borderRadius: '36px',
        background: '#ffffff',
        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
        border: '1px solid rgba(224,224,224,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20050,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {showLogo && (
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              height: '36px',
              width: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        )}
      </div>

      {/* Right side - back to dashboard button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {showDashboardButton && <HeaderBarButton />}
      </div>
    </div>
  );
};

const HeaderBarButton: React.FC = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/dashboard')}
      style={{
        padding: '10px 14px',
        borderRadius: '20px',
        border: 'none',
        background: '#000000',
        color: '#ffffff',
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        height: '40px',
      }}
    >
      Dashboard
    </button>
  );
};

export default HeaderBar;


