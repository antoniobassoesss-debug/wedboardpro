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

interface SubcategoryConfig {
  name: string;
  elements: ElementType[];
}

interface ElementCategoryProps {
  name: string;
  icon: React.ReactNode;
  elements: ElementType[];
  expanded: boolean;
  isHidden?: boolean;
  onToggle: () => void;
  onToggleVisibility?: () => void;
  onSelect: (type: ElementType) => void;
  onOpenConfig?: (type: ElementType) => void;
  subcategories?: SubcategoryConfig[];
}

export const ElementCategory: React.FC<ElementCategoryProps> = ({
  name,
  icon,
  elements,
  expanded,
  isHidden = false,
  onToggle,
  onToggleVisibility,
  onSelect,
  onOpenConfig,
  subcategories,
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: '12px',
          background: expanded ? '#f8fafc' : 'transparent',
          transition: 'all 0.18s ease',
          opacity: isHidden ? 0.55 : 1,
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
        <button
          onClick={onToggle}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 4px 10px 12px',
            background: 'transparent',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            minWidth: 0,
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            flexShrink: 0,
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
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{name}</span>
          <span style={{
            fontSize: '11px',
            padding: '3px 8px',
            background: expanded ? '#e0e7ff' : '#f1f5f9',
            color: expanded ? '#4f46e5' : '#64748b',
            borderRadius: '8px',
            fontWeight: 500,
            flexShrink: 0,
            transition: 'all 0.18s ease',
          }}>
            {subcategories
              ? subcategories.reduce((sum, s) => sum + s.elements.length, 0)
              : elements.length}
          </span>
          <svg
            style={{
              width: '14px',
              height: '14px',
              flexShrink: 0,
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
        {onToggleVisibility && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
            title={isHidden ? 'Show on canvas' : 'Hide on canvas'}
            style={{
              flexShrink: 0,
              padding: '5px 8px',
              marginRight: '6px',
              background: isHidden ? '#fef3c7' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: isHidden ? '#d97706' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isHidden) e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.background = isHidden ? '#fde68a' : '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isHidden ? '#d97706' : '#94a3b8';
              e.currentTarget.style.background = isHidden ? '#fef3c7' : 'transparent';
            }}
          >
            {isHidden ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>

      {expanded && (
        <div style={{
          padding: '8px 4px 4px',
          overflow: 'hidden',
          animation: 'slideDown 0.2s ease',
        }}>
          {subcategories && subcategories.length > 0 ? (
            // Subcategory layout
            subcategories.map((sub) => (
              <div key={sub.name} style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '0 4px',
                  marginBottom: '6px',
                }}>
                  {sub.name}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                }}>
                  {sub.elements.map((type) => (
                    <ElementCard
                      key={type}
                      type={type}
                      onClick={() => handleElementClick(type)}
                      onDoubleClick={() => handleElementDoubleClick(type)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Flat grid layout
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
          )}
        </div>
      )}
    </div>
  );
};

export type { ElementCategoryProps };
export default ElementCategory;
