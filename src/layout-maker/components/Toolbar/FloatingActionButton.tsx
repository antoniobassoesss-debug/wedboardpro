/**
 * FloatingActionButton Component
 *
 * FAB for adding elements on mobile/tablet.
 * Fixed position bottom-right with "+" icon.
 */

import React, { useState, useCallback } from 'react';
import type { ElementType } from '../../types';

interface FloatingActionButtonProps {
  onClick: () => void;
  onAddElement?: (elementType: ElementType) => void;
  className?: string;
  showBadge?: boolean;
  badgeCount?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  onAddElement,
  className = '',
  showBadge = false,
  badgeCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = useCallback(() => {
    setIsExpanded(prev => !prev);
    onClick();
  }, [onClick]);

  const quickAddElements: { type: ElementType; icon: string; label: string }[] = [
    { type: 'table-round', icon: '⚪', label: 'Round Table' },
    { type: 'table-rectangular', icon: '⬜', label: 'Rect Table' },
    { type: 'chair', icon: '🪑', label: 'Chair' },
    { type: 'cocktail-area', icon: '🍽️', label: 'Dining Zone' },
  ];

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-3 ${className}`}
      style={{ touchAction: 'none' }}
    >
      {isExpanded && onAddElement && (
        <>
          {quickAddElements.map((element) => (
            <button
              key={element.type}
              onClick={(e) => {
                e.stopPropagation();
                onAddElement(element.type);
                setIsExpanded(false);
              }}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow active:scale-95"
              style={{ touchAction: 'manipulation' }}
            >
              <span className="text-xl">{element.icon}</span>
              <span className="text-sm font-medium text-gray-700">{element.label}</span>
            </button>
          ))}
        </>
      )}

      <button
        onClick={handleClick}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isExpanded
            ? 'bg-gray-600 rotate-45'
            : 'bg-blue-500 hover:bg-blue-600 hover:scale-110'
        }`}
        style={{ touchAction: 'manipulation' }}
        aria-label={isExpanded ? 'Close menu' : 'Add element'}
      >
        <svg
          className="w-7 h-7 text-white transition-transform duration-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ transform: isExpanded ? 'rotate(135deg)' : 'none' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 4v16m8-8H4"
          />
        </svg>

        {showBadge && badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default FloatingActionButton;
