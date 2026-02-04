/**
 * Layout Card Component
 *
 * Displays a single layout in the workflow view with:
 * - Thumbnail preview
 * - Layout name (inline editing)
 * - Status badge
 * - Stats and progress
 * - Actions menu
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Layout, LayoutStatus } from '../../types/layout';

interface LayoutCardProps {
  layout: Layout;
  isSelected?: boolean;
  onSelect: () => void;
  onEdit: (layoutId: string) => void;
  onDuplicate: (layoutId: string) => void;
  onDelete: (layoutId: string) => void;
  onRename: (layoutId: string, newName: string) => void;
}

const STATUS_COLORS: Record<LayoutStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Progress' },
  ready: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ready' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
};

const STATUS_ICONS: Record<LayoutStatus, React.ReactNode> = {
  draft: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  in_progress: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ready: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  approved: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

export const LayoutCard: React.FC<LayoutCardProps> = ({
  layout,
  isSelected = false,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onRename,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(layout.name);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tableCount, seatCount, assignedCount, progressPercent } = React.useMemo(() => {
    let tables = 0;
    let seats = 0;
    let assigned = 0;

    Object.values(layout.elements).forEach((element) => {
      if (element.type.startsWith('table-')) {
        tables++;
        seats += (element as any).capacity || 0;
      }
      if (element.type === 'chair') {
        if ((element as any).assignedGuestId) {
          assigned++;
        }
      }
    });

    return {
      tableCount: tables,
      seatCount: seats,
      assignedCount: assigned,
      progressPercent: seats > 0 ? (assigned / seats) * 100 : 0,
    };
  }, [layout]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSubmit = useCallback(() => {
    if (editedName.trim() && editedName !== layout.name) {
      onRename(layout.id, editedName.trim());
    }
    setIsEditingName(false);
  }, [editedName, layout.id, layout.name, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleNameSubmit();
      } else if (e.key === 'Escape') {
        setEditedName(layout.name);
        setIsEditingName(false);
      }
    },
    [handleNameSubmit, layout.name]
  );

  const statusStyle = STATUS_COLORS[layout.status];

  return (
    <div
      onClick={onSelect}
      className={`relative bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      style={{ width: '280px' }}
    >
      {/* Thumbnail Preview */}
      <div
        className="relative h-40 bg-white overflow-hidden"
        style={{
          backgroundImage: layout.floorPlan?.imageUrl ? `url(${layout.floorPlan.imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay pattern when no floor plan */}
        {!layout.floorPlan && (
          <div className="absolute inset-0">
            <svg width="100%" height="100%">
              <defs>
                <pattern id={`grid-${layout.id}`} width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        )}

        {/* Mini canvas preview */}
        <div className="absolute inset-2">
          <svg width="100%" height="100%" viewBox="0 0 1132 800" preserveAspectRatio="xMidYMid meet">
            {/* Landscape canvas background */}
            <rect x="0" y="0" width="1132" height="800" fill="rgba(255,255,255,0.95)" stroke="#e2e8f0" strokeWidth="1" />

            {/* Grid pattern */}
            <defs>
              <pattern id={`grid-card-${layout.id}`} width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="1132" height="800" fill={`url(#grid-card-${layout.id})`} />

            {/* Elements */}
            {Object.values(layout.elements).map((el) => {
              const tableEl = el as any;
              if (el.type.startsWith('table-')) {
                const isRound = el.type === 'table-round';
                return (
                  <g key={el.id}>
                    {isRound ? (
                      <circle
                        cx={el.x + el.width / 2}
                        cy={el.y + el.height / 2}
                        r={el.width / 2}
                        fill="#f1f5f9"
                        stroke="#94a3b8"
                        strokeWidth="2"
                      />
                    ) : (
                      <rect
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        height={el.height}
                        rx="4"
                        fill="#f1f5f9"
                        stroke="#94a3b8"
                        strokeWidth="2"
                      />
                    )}
                    {/* Chairs around table */}
                    {isRound && tableEl.capacity && Array.from({ length: Math.min(tableEl.capacity, 8) }).map((_: any, i: number) => {
                      const angle = (i / Math.min(tableEl.capacity, 8)) * Math.PI * 2 - Math.PI / 2;
                      const chairDist = el.width / 2 + 25;
                      const cx = el.x + el.width / 2 + Math.cos(angle) * chairDist;
                      const cy = el.y + el.height / 2 + Math.sin(angle) * chairDist;
                      return (
                        <circle
                          key={i}
                          cx={cx}
                          cy={cy}
                          r="8"
                          fill="#cbd5e1"
                          stroke="#94a3b8"
                          strokeWidth="1"
                        />
                      );
                    })}
                  </g>
                );
              }
              if (el.type === 'chair') {
                return (
                  <circle
                    key={el.id}
                    cx={el.x + el.width / 2}
                    cy={el.y + el.height / 2}
                    r={el.width / 2}
                    fill={tableEl.assignedGuestId ? '#bfdbfe' : '#e2e8f0'}
                    stroke={tableEl.assignedGuestId ? '#3b82f6' : '#94a3b8'}
                    strokeWidth="1"
                  />
                );
              }
              if (['dance-floor', 'stage', 'cocktail-area', 'ceremony-area'].includes(el.type)) {
                return (
                  <rect
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    rx="4"
                    fill={tableEl.color || 'rgba(59, 130, 246, 0.1)'}
                    stroke={tableEl.color || '#3b82f6'}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                );
              }
              return null;
            })}
          </svg>
        </div>

        {/* Status badge */}
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
          {STATUS_ICONS[layout.status]}
          {statusStyle.label}
        </div>

        {/* Menu button */}
        <div className="absolute top-2 right-2" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded-lg hover:bg-gray-200/80 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(layout.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate
              </button>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(layout.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name */}
        <div className="mb-3">
          {isEditingName ? (
            <input
              ref={inputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 text-sm font-medium border border-blue-500 rounded focus:outline-none"
            />
          ) : (
            <h3
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
              className="font-medium text-gray-900 truncate cursor-text hover:text-blue-600"
              title="Click to rename"
            >
              {layout.name || 'Untitled Layout'}
            </h3>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Updated {new Date(layout.updatedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>{tableCount} tables</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{seatCount} seats</span>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Assignments</span>
            <span className="font-medium text-gray-700">
              {assignedCount}/{seatCount}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progressPercent === 100
                  ? 'bg-green-500'
                  : progressPercent > 50
                  ? 'bg-blue-500'
                  : progressPercent > 0
                  ? 'bg-yellow-500'
                  : 'bg-gray-300'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Edit button overlay */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(layout.id);
          }}
          className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export default LayoutCard;
