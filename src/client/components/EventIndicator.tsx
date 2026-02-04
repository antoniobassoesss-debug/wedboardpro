/**
 * Event Indicator Component
 *
 * Subtle indicator showing which event the current layout belongs to.
 * Displayed in the Layout Maker header.
 */

import React from 'react';

interface EventIndicatorProps {
  eventTitle: string;
  weddingDate?: string;
  onClick?: () => void;
}

const EventIndicator: React.FC<EventIndicatorProps> = ({
  eventTitle,
  weddingDate,
  onClick,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'rgba(59, 130, 246, 0.08)',
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        border: '1px solid rgba(59, 130, 246, 0.15)',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)';
          e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.15)';
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#1e40af',
          lineHeight: 1.2,
        }}>
          {eventTitle}
        </span>
        {weddingDate && (
          <span style={{
            fontSize: '10px',
            color: '#3b82f6',
            lineHeight: 1.2,
          }}>
            {formatDate(weddingDate)}
          </span>
        )}
      </div>
    </div>
  );
};

export default EventIndicator;
