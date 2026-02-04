import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EventIndicator from './components/EventIndicator';

interface EventInfo {
  title: string;
  weddingDate?: string;
}

interface HeaderBarProps {
  showDashboardButton?: boolean;
  showLogo?: boolean;
  onSaveCurrentLayout?: () => void;
  onSaveAllLayouts?: () => void;
  isSaving?: boolean;
  projectCount?: number;
  eventInfo?: EventInfo;
}

const HeaderBar: React.FC<HeaderBarProps> = ({
  showDashboardButton = true,
  showLogo = true,
  onSaveCurrentLayout,
  onSaveAllLayouts,
  isSaving = false,
  projectCount = 1,
  eventInfo,
}) => {
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const saveDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(e.target as Node)) {
        setShowSaveDropdown(false);
      }
    };
    if (showSaveDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSaveDropdown]);

  const handleSaveClick = () => {
    setShowSaveDropdown(!showSaveDropdown);
  };

  const handleSaveCurrentClick = () => {
    setShowSaveDropdown(false);
    onSaveCurrentLayout?.();
  };

  const handleSaveAllClick = () => {
    setShowSaveDropdown(false);
    onSaveAllLayouts?.();
  };

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
        {eventInfo && (
          <EventIndicator
            eventTitle={eventInfo.title}
            {...(eventInfo.weddingDate ? { weddingDate: eventInfo.weddingDate } : {})}
          />
        )}
      </div>

      {/* Right side - Save button and Dashboard button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Save Button with Dropdown */}
        {onSaveCurrentLayout && (
          <div ref={saveDropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={handleSaveClick}
              disabled={isSaving}
              style={{
                padding: '10px 18px',
                borderRadius: '20px',
                border: '1px solid #e0e0e0',
                background: '#fff',
                color: '#0c0c0c',
                fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isSaving ? 'wait' : 'pointer',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isSaving ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {isSaving ? (
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid #e0e0e0',
                    borderTopColor: '#0c0c0c',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              )}
              Save
            </button>

            {/* Dropdown Menu */}
            {showSaveDropdown && !isSaving && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  minWidth: 240,
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  zIndex: 10002,
                  border: '1px solid #e5e5e5',
                }}
              >
                <button
                  type="button"
                  onClick={handleSaveCurrentClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#0c0c0c',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f8f8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <div>
                    <div>Save this layout</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Only the current tab</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#0c0c0c',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f8f8')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                  <div>
                    <div>Save all layouts</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>All {projectCount} tab{projectCount !== 1 ? 's' : ''} in this project</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {showDashboardButton && <HeaderBarButton />}
      </div>

      {/* Keyframe animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
