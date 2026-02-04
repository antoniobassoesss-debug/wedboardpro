/**
 * Recently Used Component (Grid Layout Redesign)
 *
 * Horizontal row of recently used elements with line-only icons.
 * - Compact chips/buttons
 * - Line-only icon + short name
 * - Click to open config, drag to position
 */

import React, { useEffect, useState } from 'react';
import type { ElementType } from '../../types/elements';
import { ELEMENT_DEFAULTS } from '../../constants';

interface RecentlyUsedProps {
  elements: string[];
  onSelect: (elementType: ElementType) => void;
  onOpenConfig?: (elementType: ElementType) => void;
  maxItems?: number;
}

interface RecentlyUsedItem {
  type: ElementType;
  lastUsed: string;
}

export const RecentlyUsed: React.FC<RecentlyUsedProps> = ({
  elements,
  onSelect,
  onOpenConfig,
  maxItems = 6,
}) => {
  const [recentItems, setRecentItems] = useState<RecentlyUsedItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('layout-maker-recent-elements');
    if (stored) {
      try {
        const parsed: RecentlyUsedItem[] = JSON.parse(stored);
        setRecentItems(parsed.slice(0, maxItems));
      } catch {
        setRecentItems([]);
      }
    }
  }, [maxItems]);

  const handleClick = (type: ElementType) => {
    onSelect(type);
  };

  const handleDoubleClick = (type: ElementType) => {
    if (onOpenConfig) {
      onOpenConfig(type);
    }
  };

  const getElementInfo = (type: ElementType) => {
    const defaults = ELEMENT_DEFAULTS[type as keyof typeof ELEMENT_DEFAULTS];
    if (!defaults) return { label: type, shortLabel: type };

    const label = defaults.label || type;
    const shortLabel = label.replace(' Table', '').replace(' Area', '');

    return { label, shortLabel };
  };

  const getElementIcon = (type: ElementType): React.ReactNode => {
    const iconSize = 16;

    switch (type) {
      case 'table-round':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'table-rectangular':
      case 'table-square':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="4" y="6" width="16" height="12" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'table-oval':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="12" rx="10" ry="6" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'chair':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'dance-floor':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="16" rx="1" stroke="#1a1a1a" strokeWidth="1.5" strokeDasharray="3,2" />
          </svg>
        );
      case 'stage':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="4" y="8" width="16" height="12" rx="1" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'bar':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="4" y="8" width="16" height="10" rx="1" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'buffet':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="4" y="6" width="16" height="12" rx="1" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'cake-table':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="7" y="9" width="10" height="8" rx="1" stroke="#1a1a1a" strokeWidth="1.5" />
            <path d="M9 9 L12 5 L15 9" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'gift-table':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="7" y="8" width="10" height="10" rx="1" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'dj-booth':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="6" y="6" width="12" height="12" rx="1" stroke="#1a1a1a" strokeWidth="1.5" />
            <circle cx="12" cy="15" r="2" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'bench':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="10" width="18" height="6" rx="1" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'lounge':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="8" width="18" height="10" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'cocktail-area':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'ceremony-area':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="5" y="8" width="14" height="10" rx="1" stroke="#1a1a1a" strokeWidth="1.5" />
            <path d="M8 8 L12 4 L16 8" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'flower-arrangement':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="14" r="3" stroke="#1a1a1a" strokeWidth="1" />
            <path d="M12 14 Q10 10 12 6 Q14 10 12 14" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'arch':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <path d="M6 20 L6 12 Q6 6 12 6 Q18 6 18 12 L18 20" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'photo-booth':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="5" y="6" width="14" height="12" rx="1" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      default:
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="6" y="6" width="12" height="12" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
    }
  };

  if (recentItems.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: '12px 16px 14px', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: '#94a3b8',
        marginBottom: '10px',
        paddingLeft: '2px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Recent
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {recentItems.map((item) => {
          const info = getElementInfo(item.type);
          return (
            <button
              key={`${item.type}-${item.lastUsed}`}
              onClick={() => handleClick(item.type)}
              onDoubleClick={() => handleDoubleClick(item.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px 6px 6px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
              title={onOpenConfig ? `Click to add, double-click to configure ${info.label}` : `Add ${info.label}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
              }}
            >
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                background: '#f8fafc',
                borderRadius: '6px',
              }}>
                {getElementIcon(item.type)}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>
                {info.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export type { RecentlyUsedProps };
export default RecentlyUsed;
