import React from 'react';
import type { SatelliteBackground } from '../../layout-maker/store/canvasStore';

interface SatelliteInfoChipProps {
  satellite: SatelliteBackground;
  onEdit: () => void;
  onClear: () => void;
}

export const SatelliteInfoChip: React.FC<SatelliteInfoChipProps> = ({
  satellite,
  onEdit,
  onClear,
}) => {
  const a4WidthCm = 29.7;
  const metersPerCm = satellite.realWorldWidth / a4WidthCm;
  const scaleLabel = `1cm = ${metersPerCm.toFixed(1)}m`;

  const displayAddress =
    satellite.address.length > 40
      ? satellite.address.slice(0, 38) + '…'
      : satellite.address;

  const handleClear = () => {
    if (window.confirm('Remove satellite background from canvas?')) {
      onClear();
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid rgba(255, 215, 0, 0.35)',
        borderRadius: 24,
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'auto',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Pin icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,215,0,0.8)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>

      {/* Address */}
      <span style={{ color: '#e2e8f0', fontSize: 13 }}>{displayAddress}</span>

      {/* Divider */}
      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>·</span>

      {/* Scale */}
      <span style={{ color: '#94a3b8', fontSize: 12 }}>{scaleLabel}</span>

      {/* Dimensions */}
      <span style={{ color: '#64748b', fontSize: 12 }}>
        {satellite.realWorldWidth}m × {satellite.realWorldHeight}m
      </span>

      {/* Calibration indicator */}
      {(satellite.calibrationLines?.length ?? 0) > 0 && (
        <>
          <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 12 }}>·</span>
          <span style={{ color: '#4ade80', fontSize: 11 }}>
            {satellite.calibrationLines.length} cal line{satellite.calibrationLines.length !== 1 ? 's' : ''}
          </span>
        </>
      )}

      {/* Edit button */}
      <button
        onClick={onEdit}
        title="Edit satellite background"
        style={iconBtnStyle}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      {/* Clear button */}
      <button
        onClick={handleClear}
        title="Remove satellite background"
        style={{ ...iconBtnStyle, color: '#f87171' }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  );
};

const iconBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)',
  color: '#94a3b8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.15s',
  flexShrink: 0,
};

export default SatelliteInfoChip;
