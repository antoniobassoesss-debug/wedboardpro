/**
 * Snap Settings Component
 *
 * Toggle buttons for snap and grid settings.
 * Used in toolbar or settings panel.
 */

import React, { useState } from 'react';

interface SnapSettingsProps {
  snapEnabled: boolean;
  gridEnabled: boolean;
  showDistanceIndicators?: boolean;
  onSnapChange: (enabled: boolean) => void;
  onGridChange: (enabled: boolean) => void;
  onDistanceIndicatorsChange?: (enabled: boolean) => void;
  gridSize?: number;
  onGridSizeChange?: (size: number) => void;
}

export const SnapSettings: React.FC<SnapSettingsProps> = ({
  snapEnabled,
  gridEnabled,
  showDistanceIndicators = true,
  onSnapChange,
  onGridChange,
  onDistanceIndicatorsChange,
  gridSize = 0.5,
  onGridSizeChange,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        title="Snap & Grid Settings"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          background: snapEnabled || gridEnabled ? '#eff6ff' : 'transparent',
          border: '1px solid',
          borderColor: snapEnabled || gridEnabled ? '#3b82f6' : '#e5e7eb',
          borderRadius: '6px',
          cursor: 'pointer',
          color: snapEnabled || gridEnabled ? '#3b82f6' : '#64748b',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M3 3h18v18H3z" />
          <path d="M12 3v18M3 12h18" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
            }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '12px',
              width: '200px',
              zIndex: 50,
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={snapEnabled}
                  onChange={(e) => onSnapChange(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                  Snap to Elements
                </span>
              </label>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={gridEnabled}
                  onChange={(e) => onGridChange(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                  Show Grid
                </span>
              </label>
            </div>

            {onDistanceIndicatorsChange && (
              <div style={{ marginBottom: '12px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showDistanceIndicators}
                    onChange={(e) => onDistanceIndicatorsChange(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                    Distance Labels
                  </span>
                </label>
              </div>
            )}

            {onGridSizeChange && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#64748b',
                    marginBottom: '6px',
                  }}
                >
                  Grid Size
                </label>
                <select
                  value={gridSize}
                  onChange={(e) => onGridSizeChange(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <option value={0.1}>10 cm</option>
                  <option value={0.25}>25 cm</option>
                  <option value={0.5}>50 cm</option>
                  <option value={1}>1 m</option>
                </select>
              </div>
            )}

            <div
              style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
                fontSize: '10px',
                color: '#94a3b8',
              }}
            >
              Press <strong>S</strong> to toggle snap, <strong>G</strong> to toggle grid
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SnapSettings;
