import React, { useCallback } from 'react';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToCanvas: () => void;
  minZoom?: number;
  maxZoom?: number;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToCanvas,
  minZoom = 10,
  maxZoom = 400,
}) => {
  const zoomPercent = Math.round(zoomLevel);
  const canZoomIn = zoomLevel < maxZoom;
  const canZoomOut = zoomLevel > minZoom;

  const buttonStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    color: '#475569',
    transition: 'all 0.15s ease',
  };

  const disabledStyle: React.CSSProperties = {
    ...buttonStyle,
    cursor: 'not-allowed',
    opacity: 0.4,
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '65px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'white',
        borderRadius: '30px',
        padding: '6px 8px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.1)',
        zIndex: 10001,
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        disabled={!canZoomOut}
        style={canZoomOut ? buttonStyle : disabledStyle}
        title="Zoom out (Ctrl + Scroll or -)"
        onMouseEnter={(e) => {
          if (canZoomOut) e.currentTarget.style.background = '#f1f5f9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Zoom Percentage */}
      <button
        onClick={onZoomReset}
        style={{
          minWidth: '56px',
          height: '32px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          color: '#1e293b',
          fontWeight: 500,
          fontSize: '13px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transition: 'all 0.15s ease',
          padding: '0 8px',
        }}
        title="Reset to 100%"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f1f5f9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {zoomPercent}%
      </button>

      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        disabled={!canZoomIn}
        style={canZoomIn ? buttonStyle : disabledStyle}
        title="Zoom in (Ctrl + Scroll or +)"
        onMouseEnter={(e) => {
          if (canZoomIn) e.currentTarget.style.background = '#f1f5f9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '20px',
          background: '#e2e8f0',
          margin: '0 4px',
        }}
      />

      {/* Fit to Canvas */}
      <button
        onClick={onFitToCanvas}
        style={buttonStyle}
        title="Fit to canvas"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f1f5f9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>
    </div>
  );
};

export default ZoomControls;
