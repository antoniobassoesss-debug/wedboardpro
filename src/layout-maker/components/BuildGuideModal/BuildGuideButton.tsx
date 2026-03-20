/**
 * Build Guide Button Component
 *
 * Toolbar button to open the Build Guide Configurator modal.
 */

import React, { useState } from 'react';
import { BuildGuideModal } from './BuildGuideModal';
import type { LayoutConfig } from '../../types/buildGuide';

interface BuildGuideButtonProps {
  eventId: string;
  eventName: string;
  layouts: LayoutConfig[];
  spaceNames: string[];
}

export const BuildGuideButton: React.FC<BuildGuideButtonProps> = ({
  eventId,
  eventName,
  layouts,
  spaceNames,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        style={{
          height: '44px',
          paddingLeft: '16px',
          paddingRight: '16px',
          borderRadius: '22px',
          border: 'none',
          background: '#ffffff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
          pointerEvents: 'auto',
        }}
        title="Build Guide"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f8fafc';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0c0c0c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0c0c0c' }}>Build Guide</span>
      </button>

      {isModalOpen && (
        <BuildGuideModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          eventId={eventId}
          eventName={eventName}
          layouts={layouts}
          spaceNames={spaceNames}
        />
      )}
    </>
  );
};
