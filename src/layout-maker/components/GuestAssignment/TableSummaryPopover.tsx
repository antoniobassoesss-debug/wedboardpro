/**
 * Table Summary Popover Component
 *
 * Popover that appears when hovering over a table, showing:
 * - Table number and assignment progress
 * - List of all seats with guest names
 * - Meal/dietary summary
 * - Quick action buttons
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Guest, GuestAssignment, NonNullDietaryType } from '../../types/guests';
import type { TableElement, ChairElement, DietaryType } from '../../types/elements';
import { DIETARY_ICONS } from '../../types/guests';

interface SeatInfo {
  index: number;
  guest: Guest | null;
  assignment: GuestAssignment | null;
  chairId: string;
}

interface TableSummaryPopoverProps {
  table: TableElement;
  seats: SeatInfo[];
  tablePosition: { x: number; y: number; width: number; height: number };
  onEditTable: () => void;
  onAssignRemaining: () => void;
  onClose: () => void;
}

function DietaryIcon({ type, size = 'md' }: { type: DietaryType | null; size?: 'sm' | 'md' }): React.ReactElement | null {
  if (!type || type === 'regular') return null;

  const emoji = DIETARY_ICONS[type as NonNullDietaryType] || '';
  if (!emoji) return null;

  const fontSize = size === 'sm' ? '10px' : '12px';

  return (
    <span
      title={type.charAt(0).toUpperCase() + type.slice(1)}
      style={{ fontSize }}
    >
      {emoji}
    </span>
  );
}

export const TableSummaryPopover: React.FC<TableSummaryPopoverProps> = ({
  table,
  seats,
  tablePosition,
  onEditTable,
  onAssignRemaining,
  onClose,
}) => {
  const [isHovered, setIsHovered] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assignedCount = seats.filter(s => s.guest !== null).length;
  const capacity = table.capacity || seats.length;

  const mealCounts = seats.reduce<Record<NonNullDietaryType, number>>((acc, seat) => {
    if (seat.guest?.dietaryType && seat.guest.dietaryType !== 'regular') {
      const type = seat.guest.dietaryType as NonNullDietaryType;
      acc[type] = (acc[type] || 0) + 1;
    }
    return acc;
  }, {} as Record<NonNullDietaryType, number>);

  useEffect(() => {
    const calculatePosition = () => {
      const popoverWidth = 280;
      const popoverHeight = Math.min(320, 80 + seats.length * 28 + 80);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = tablePosition.x + tablePosition.width + 16;
      let y = tablePosition.y;

      if (x + popoverWidth > viewportWidth - 20) {
        x = tablePosition.x - popoverWidth - 16;
      }

      if (y + popoverHeight > viewportHeight - 20) {
        y = Math.max(20, viewportHeight - popoverHeight - 20);
      }

      if (y < 20) {
        y = 20;
      }

      setPosition({ x, y });
    };

    calculatePosition();
  }, [tablePosition, seats.length]);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setTimeout(() => {
        if (!isHovered) {
          onClose();
        }
      }, 200);
    }, 200);
  }, [isHovered, onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const popoverContent = (
    <div
      ref={popoverRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="absolute bg-white rounded-lg shadow-2xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: '280px',
        maxHeight: '320px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9998,
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        opacity: isHovered ? 1 : 0,
        transform: isHovered ? 'scale(1)' : 'scale(0.95)',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        pointerEvents: isHovered ? 'auto' : 'none',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center justify-between">
          <div className="font-medium" style={{ color: '#1F2937' }}>
            Table {table.tableNumber || table.label || 'Unknown'} · {assignedCount}/{capacity}
          </div>
          <span
            className="text-xs px-2 py-1 rounded-full"
            style={{
              backgroundColor: assignedCount === capacity ? '#D1FAE5' : '#FEF3C7',
              color: assignedCount === capacity ? '#065F46' : '#92400E',
            }}
          >
            {assignedCount === capacity ? 'Full' : `${capacity - assignedCount} left`}
          </span>
        </div>
      </div>

      {/* Guest list */}
      <div
        className="overflow-y-auto flex-1"
        style={{ maxHeight: '180px' }}
      >
        {seats.map((seat) => (
          <div
            key={seat.chairId}
            className="flex items-center px-4 py-2 text-sm border-b"
            style={{
              borderColor: '#F3F4F6',
              minHeight: '32px',
              backgroundColor: seat.guest ? 'transparent' : '#FAFAFA',
            }}
          >
            <span
              className="w-5 text-xs"
              style={{ color: '#9CA3AF' }}
            >
              {seat.index + 1}.
            </span>
            {seat.guest ? (
              <>
                <span
                  className="flex-1 truncate"
                  style={{ color: '#1F2937' }}
                >
                  {seat.guest.firstName} {seat.guest.lastName}
                </span>
                <DietaryIcon type={seat.guest.dietaryType} size="sm" />
              </>
            ) : (
              <span className="flex-1" style={{ color: '#D1D5DB' }}>
                ○ Empty
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Meal summary */}
      {Object.keys(mealCounts).length > 0 && (
        <div
          className="px-4 py-2 border-t text-xs"
          style={{
            backgroundColor: '#F9FAFB',
            color: '#6B7280',
          }}
        >
          <span className="font-medium mr-2">Meals:</span>
          {Object.entries(mealCounts).map(([type, count]) => {
            const dietaryType = type as NonNullDietaryType;
            const emoji = DIETARY_ICONS[dietaryType] || '🍽️';
            return (
              <span key={type} className="mr-3">
                {count}{emoji}
              </span>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div
        className="px-4 py-3 border-t flex gap-4"
        style={{ borderColor: '#E5E7EB' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditTable();
          }}
          className="text-sm hover:underline transition-colors"
          style={{
            color: '#3B82F6',
            padding: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#2563EB'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#3B82F6'}
        >
          Edit Table
        </button>
        {assignedCount < capacity && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssignRemaining();
            }}
            className="text-sm hover:underline transition-colors"
            style={{
              color: '#3B82F6',
              padding: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#2563EB'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#3B82F6'}
          >
            Assign Remaining
          </button>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(popoverContent, document.body);
};

interface TableSummaryHoverTargetProps {
  table: TableElement;
  children: React.ReactNode;
  onHover: (isHovering: boolean) => void;
}

export const TableSummaryHoverTarget: React.FC<TableSummaryHoverTargetProps> = ({
  table,
  children,
  onHover,
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const [popoverData, setPopoverData] = useState<{
    table: TableElement;
    seats: SeatInfo[];
    position: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      const tableElement = document.getElementById(`table-${table.id}`);
      if (tableElement) {
        const rect = tableElement.getBoundingClientRect();
        setPopoverData({
          table,
          seats: [],
          position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
        setShowPopover(true);
        onHover(true);
      }
    }, 500);
  }, [table, onHover]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      setShowPopover(false);
      onHover(false);
    }, 300);
  }, [onHover]);

  const handleClose = useCallback(() => {
    setShowPopover(false);
    setPopoverData(null);
    onHover(false);
  }, [onHover]);

  const handleEditTable = useCallback(() => {
    console.log('Edit table:', table.id);
    handleClose();
  }, [table.id, handleClose]);

  const handleAssignRemaining = useCallback(() => {
    console.log('Assign remaining to table:', table.id);
    handleClose();
  }, [table.id, handleClose]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        id={`table-${table.id}`}
      >
        {children}
      </div>
      {showPopover && popoverData && (
        <TableSummaryPopover
          table={popoverData.table}
          seats={popoverData.seats}
          tablePosition={popoverData.position}
          onEditTable={handleEditTable}
          onAssignRemaining={handleAssignRemaining}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default TableSummaryPopover;
