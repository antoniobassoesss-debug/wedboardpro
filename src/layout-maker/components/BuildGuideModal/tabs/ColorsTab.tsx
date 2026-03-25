/**
 * Colors Tab
 *
 * Assigns a color to each element category.
 * Colors are applied in the exported PDF and reflected in the legend.
 */

import React, { useRef } from 'react';
import type { ElementCategoryKey } from '../../../types/buildGuide';
import { ELEMENT_CATEGORIES, DEFAULT_CATEGORY_COLORS } from '../../../types/buildGuide';

interface ColorsTabProps {
  categoryColors: Record<ElementCategoryKey, string>;
  onChange: (colors: Record<ElementCategoryKey, string>) => void;
}

const CATEGORY_ICONS: Record<ElementCategoryKey, string> = {
  tables:        'M3 10h18M3 14h18M10 3v18M14 3v18',
  seating:       'M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z',
  ceremony:      'M12 3l2.5 7.5H21l-6 4.5 2.5 7.5L12 18l-5.5 4.5 2.5-7.5-6-4.5h6.5L12 3z',
  entertainment: 'M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z',
  service:       'M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z',
  decor:         'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  lighting:      'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  custom:        'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

export const ColorsTab: React.FC<ColorsTabProps> = ({ categoryColors, onChange }) => {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleColorChange = (key: ElementCategoryKey, value: string) => {
    onChange({ ...categoryColors, [key]: value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            Element Category Colors
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
            Colors are applied to elements in the exported PDF and legend.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_CATEGORY_COLORS })}
          style={{
            flexShrink: 0,
            marginLeft: '16px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Reset to defaults
        </button>
      </div>

      {/* Color rows */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}>
        {ELEMENT_CATEGORIES.map((cat, i) => {
          const color = categoryColors[cat.key] ?? DEFAULT_CATEGORY_COLORS[cat.key];
          const isLast = i === ELEMENT_CATEGORIES.length - 1;

          return (
            <div
              key={cat.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                backgroundColor: '#ffffff',
              }}
            >
              {/* Left: color dot + icon + label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    flexShrink: 0,
                    boxShadow: `0 0 0 3px ${color}22`,
                  }}
                />
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d={CATEGORY_ICONS[cat.key]} />
                </svg>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                  {cat.label}
                </span>
              </div>

              {/* Right: hex + swatch button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontSize: '12px',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  color: '#9ca3af',
                  letterSpacing: '0.04em',
                }}>
                  {color.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => inputRefs.current[cat.key]?.click()}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: color,
                    border: '2px solid rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  title={`Change color for ${cat.label}`}
                >
                  <input
                    ref={(el) => { inputRefs.current[cat.key] = el; }}
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(cat.key, e.target.value)}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                      border: 'none',
                      padding: 0,
                    }}
                    aria-label={`Color for ${cat.label}`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
        Click any swatch to open the color picker. Changes apply on the next Preview generation.
      </p>
    </div>
  );
};
