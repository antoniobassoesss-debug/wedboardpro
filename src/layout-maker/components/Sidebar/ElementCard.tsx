/**
 * Element Card Component (Grid Layout)
 *
 * Line-only SVG thumbnail with element name.
 * Used in ElementCategory grid layout.
 */

import React from 'react';
import type { ElementType } from '../../types/elements';
import { ELEMENT_DEFAULTS } from '../../constants';

interface ElementCardProps {
  type: ElementType;
  onClick: () => void;
  onDoubleClick?: () => void;
}

export const ElementCard: React.FC<ElementCardProps> = ({
  type,
  onClick,
  onDoubleClick,
}) => {
  const defaults = ELEMENT_DEFAULTS[type as keyof typeof ELEMENT_DEFAULTS];
  const label = defaults?.label || type;
  const iconSize = 40;

  const renderIcon = () => {
    switch (type) {
      case 'table-round':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="24" y1="8" x2="24" y2="40" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="8" y1="24" x2="40" y2="24" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'table-rectangular':
      case 'table-square':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="6" y="12" width="36" height="24" rx="3" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="6" y1="24" x2="42" y2="24" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'table-oval':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <ellipse cx="24" cy="24" rx="20" ry="12" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="4" y1="24" x2="44" y2="24" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'chair':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="10" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="24" y1="14" x2="24" y2="34" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'bench':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="4" y="20" width="40" height="12" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="14" y1="20" x2="14" y2="32" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="34" y1="20" x2="34" y2="32" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'lounge':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="4" y="16" width="40" height="20" rx="4" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M4 20 Q4 16 8 16H40 Q44 16 44 20" stroke="#1a1a1a" strokeWidth="2" />
          </svg>
        );
      case 'dance-floor':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="4" y="4" width="40" height="40" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="4" y1="24" x2="44" y2="24" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4,2" />
          </svg>
        );
      case 'stage':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="4" y="8" width="40" height="32" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="4" y1="16" x2="44" y2="16" stroke="#1a1a1a" strokeWidth="1" />
            <path d="M18 8 L18 4 L24 8 L30 4 L30 8" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'cocktail-area':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#1a1a1a" strokeWidth="2" />
            <circle cx="16" cy="20" r="4" stroke="#1a1a1a" strokeWidth="1.5" />
            <circle cx="32" cy="20" r="4" stroke="#1a1a1a" strokeWidth="1.5" />
            <circle cx="24" cy="32" r="4" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'ceremony-area':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="8" y="12" width="32" height="24" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M16 12 L24 4 L32 12" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="14" y1="30" x2="34" y2="30" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'bar':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="4" y="16" width="40" height="24" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="4" y1="24" x2="44" y2="24" stroke="#1a1a1a" strokeWidth="1.5" />
            <line x1="20" y1="16" x2="20" y2="40" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'buffet':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="4" y="12" width="40" height="24" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="24" y1="12" x2="24" y2="36" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="4" y1="20" x2="44" y2="20" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'cake-table':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="12" y="18" width="24" height="20" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M16 18 L24 10 L32 18" stroke="#1a1a1a" strokeWidth="2" fill="none" />
          </svg>
        );
      case 'gift-table':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="12" y="16" width="24" height="22" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M24 6 L24 42" stroke="#1a1a1a" strokeWidth="1.5" />
            <path d="M12 16 L36 32" stroke="#1a1a1a" strokeWidth="1" />
            <path d="M36 16 L12 32" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'dj-booth':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="10" y="8" width="28" height="32" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <circle cx="24" cy="28" r="6" stroke="#1a1a1a" strokeWidth="1.5" />
            <circle cx="24" cy="28" r="2" fill="#1a1a1a" />
          </svg>
        );
      case 'flower-arrangement':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <ellipse cx="24" cy="30" rx="8" ry="4" stroke="#1a1a1a" strokeWidth="1.5" />
            <path d="M24 30 Q20 20 24 12 Q28 20 24 30" stroke="#1a1a1a" strokeWidth="1.5" />
            <path d="M24 30 Q16 22 14 14" stroke="#1a1a1a" strokeWidth="1" />
            <path d="M24 30 Q32 22 34 14" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'arch':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <path d="M12 44 L12 20 Q12 8 24 8 Q36 8 36 20 L36 44" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="8" y1="44" x2="40" y2="44" stroke="#1a1a1a" strokeWidth="2" />
          </svg>
        );
      case 'photo-booth':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="8" y="12" width="32" height="28" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <rect x="12" y="16" width="10" height="10" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="26" y="16" width="10" height="10" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="12" y="30" width="24" height="6" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'custom':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="8" y="10" width="32" height="28" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="8" y1="10" x2="40" y2="38" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4,2" />
            <line x1="40" y1="10" x2="8" y2="38" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4,2" />
          </svg>
        );
      default:
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="12" y="12" width="24" height="24" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="12" y1="24" x2="36" y2="24" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        width: '100%',
        aspectRatio: '1',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#3b82f6';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = 'none';
      }}
      title={`Add ${label}`}
    >
      {renderIcon()}
      <span style={{
        fontSize: '11px',
        fontWeight: 500,
        color: '#475569',
        marginTop: '4px',
        textAlign: 'center',
        lineHeight: 1.2,
      }}>
        {label}
      </span>
    </button>
  );
};

export default ElementCard;
