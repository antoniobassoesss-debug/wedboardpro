/**
 * Element Category Component (Grid Layout Redesign)
 *
 * Collapsible category with:
 * - Header with icon, name, count badge, expand/collapse chevron
 * - Grid of ElementCard components when expanded (2-3 columns)
 * - Smooth expand/collapse animation
 */

import React from 'react';
import type { ElementType } from '../../types/elements';
import ElementCard from './ElementCard';

interface ElementCategoryProps {
  name: string;
  icon: React.ReactNode;
  elements: ElementType[];
  expanded: boolean;
  onToggle: () => void;
  onSelect: (type: ElementType) => void;
  onOpenConfig?: (type: ElementType) => void;
}

export const ElementCategory: React.FC<ElementCategoryProps> = ({
  name,
  icon,
  elements,
  expanded,
  onToggle,
  onSelect,
  onOpenConfig,
}) => {
  const handleElementClick = (type: ElementType) => {
    onSelect(type);
  };

  const handleElementDoubleClick = (type: ElementType) => {
    if (onOpenConfig) {
      onOpenConfig(type);
    }
  };

  return (
    <div style={{ marginBottom: '6px' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          background: expanded ? '#f8fafc' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
        }}
        onMouseEnter={(e) => {
          if (!expanded) {
            e.currentTarget.style.background = '#f8fafc';
          }
        }}
        onMouseLeave={(e) => {
          if (!expanded) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: expanded ? '#e0e7ff' : '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.18s ease',
        }}>
          <span style={{ color: expanded ? '#4f46e5' : '#64748b', display: 'flex', transform: 'scale(0.85)' }}>{icon}</span>
        </div>
        <span style={{
          flex: 1,
          fontSize: '13px',
          fontWeight: 500,
          color: expanded ? '#1e293b' : '#475569',
          textAlign: 'left',
          transition: 'color 0.18s ease',
        }}>{name}</span>
        <span style={{
          fontSize: '11px',
          padding: '3px 8px',
          background: expanded ? '#e0e7ff' : '#f1f5f9',
          color: expanded ? '#4f46e5' : '#64748b',
          borderRadius: '8px',
          fontWeight: 500,
          transition: 'all 0.18s ease',
        }}>
          {elements.length}
        </span>
        <svg
          style={{
            width: '14px',
            height: '14px',
            color: expanded ? '#4f46e5' : '#94a3b8',
            transition: 'all 0.2s ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <div style={{
          padding: '8px 4px 4px',
          overflow: 'hidden',
          animation: 'slideDown 0.2s ease',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
          }}>
            {elements.map((type) => (
              <ElementCard
                key={type}
                type={type}
                onClick={() => handleElementClick(type)}
                onDoubleClick={() => handleElementDoubleClick(type)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export type { ElementCategoryProps };
export default ElementCategory;
