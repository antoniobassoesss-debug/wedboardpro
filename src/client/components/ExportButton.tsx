import React, { useState } from 'react';
import ExportModal from './ExportModal';

interface ExportButtonProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  a4Bounds: { x: number; y: number; width: number; height: number } | null;
  layoutName?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ svgRef, a4Bounds, layoutName }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          background: '#ffffff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          pointerEvents: 'auto',
        }}
        title="Export Layout"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f8fafc';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c0c0c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      <ExportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        svgRef={svgRef}
        a4Bounds={a4Bounds}
        layoutName={layoutName}
      />
    </>
  );
};

export default ExportButton;
