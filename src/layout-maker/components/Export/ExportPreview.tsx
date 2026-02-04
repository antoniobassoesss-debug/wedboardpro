/**
 * Export Preview Component
 *
 * Live preview of the export output showing how the layout will look
 * with the current export options.
 */

import React, { useMemo } from 'react';
import { useLayoutStore } from '../../stores';
import type { ExportOptions, ExportFormat, PageSize, PageOrientation } from './exportTypes';
import { PAGE_SIZES } from './exportTypes';

interface ExportPreviewProps {
  options: ExportOptions;
  format: ExportFormat;
  pageSize: PageSize;
  orientation: PageOrientation;
  footerText?: string;
  className?: string;
}

const ICON_SVG_PATHS = {
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  utensils: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
};

const PresetButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
      active
        ? 'border-blue-500 bg-blue-50 text-blue-700'
        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
    }`}
    style={{ minWidth: '80px' }}
  >
    <div className="w-5 h-5 mb-1 text-gray-600">{icon}</div>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const Checkbox: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, disabled }) => (
  <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
    />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

const Radio: React.FC<{
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
}> = ({ value, checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="radio"
      checked={checked}
      onChange={() => onChange(value)}
      className="w-4 h-4 border-gray-300 text-blue-500 focus:ring-blue-500"
    />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

const RadioGroup: React.FC<{
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ value, onChange, children, className }) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<any>, {
          checked: (child.props as any).value === value,
          onChange: () => onChange((child.props as any).value),
        });
      })}
    </div>
  );
};

export const ExportPreview: React.FC<ExportPreviewProps> = ({
  options,
  format,
  pageSize,
  orientation,
  footerText = 'WedBoardPro Layout',
  className = '',
}) => {
  const layoutStore = useLayoutStore();
  const layout = layoutStore.layout;

  const pageDimensions = useMemo(() => {
    const baseSize = PAGE_SIZES[pageSize];
    const isLandscape = orientation === 'landscape';
    return {
      width: isLandscape ? baseSize.height : baseSize.width,
      height: isLandscape ? baseSize.width : baseSize.height,
    };
  }, [pageSize, orientation]);

  const previewScale = 0.4;
  const previewWidth = pageDimensions.width * previewScale;
  const previewHeight = pageDimensions.height * previewScale;

  const tables = useMemo(() => {
    if (!layout) return [];
    const elementOrder = layout.elementOrder || [];
    return elementOrder
      .map((id) => layout.elements[id])
      .filter((el) => el?.type.startsWith('table-'));
  }, [layout]);

  const chairs = useMemo(() => {
    if (!layout) return [];
    const elementOrder = layout.elementOrder || [];
    return elementOrder
      .map((id) => layout.elements[id])
      .filter((el) => el?.type === 'chair');
  }, [layout]);

  return (
    <div className={`relative bg-white shadow-lg ${className}`}>
      {/* Page representation */}
      <div
        className="absolute top-4 left-4 bg-white shadow-lg"
        style={{
          width: previewWidth,
          height: previewHeight,
          transform: `scale(${previewScale})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Page header */}
        <div className="border-b p-2 flex justify-between items-center bg-gray-50">
          <span className="text-xs text-gray-500 uppercase">
            {layout?.name || 'Untitled Layout'}
          </span>
          <div className="flex gap-2">
            {options.includeLogo && (
              <div className="w-4 h-4 bg-gray-300 rounded" />
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="relative" style={{ height: 'calc(100% - 32px)' }}>
          {/* Grid */}
          {options.grid && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #ccc 1px, transparent 1px),
                  linear-gradient(to bottom, #ccc 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
              }}
            />
          )}

          {/* Tables */}
          {tables.map((table) => {
            if (!table) return null;
            const tableNumber = (table as any).tableNumber || table.label || '';
            const capacity = (table as any).capacity || 0;
            const tableChairs = chairs.filter(
              (c) => c && (c as any).parentTableId === table.id
            );
            const assignedChairs = tableChairs.filter(
              (c) => c && (c as any).assignedGuestId
            );

            return (
              <div
                key={table.id}
                className="absolute border-2 border-gray-400 rounded-lg bg-gray-100"
                style={{
                  left: table.x * 10,
                  top: table.y * 10,
                  width: table.width * 10,
                  height: table.height * 10,
                }}
              >
                {/* Table label */}
                {(options.tableNumbers || options.tableShapes) && (
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600 bg-white px-1 rounded border">
                    {options.tableNumbers && tableNumber}
                    {options.tableNumbers && options.dimensions && ' '}
                    {options.dimensions && `${table.width.toFixed(1)}m`}
                  </div>
                )}

                {/* Table content preview */}
                <div className="flex items-center justify-center h-full text-xs text-gray-500">
                  {options.tableShapes && (
                    <span className="text-center">
                      <div className="font-medium">{tableNumber}</div>
                      <div>{capacity} seats</div>
                    </span>
                  )}
                </div>

                {/* Guest names preview */}
                {options.guestNames && assignedChairs.length > 0 && (
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[8px] text-gray-500 whitespace-nowrap">
                    {assignedChairs.length} assigned
                  </div>
                )}

                {/* Dietary icons */}
                {options.dietaryIcons && assignedChairs.length > 0 && (
                  <div className="absolute top-1 right-1 flex gap-0.5">
                    {assignedChairs.slice(0, 3).map((chair) => {
                      if (!chair) return null;
                      const dietaryType = (chair as any).dietaryType;
                      if (!dietaryType || dietaryType === 'regular') return null;
                      const colors: Record<string, string> = {
                        vegetarian: '#228B22',
                        vegan: '#32CD32',
                        halal: '#4169E1',
                        kosher: '#9370DB',
                        other: '#808080',
                      };
                      return (
                        <div
                          key={chair.id}
                          className="w-3 h-3 rounded-full text-[6px] flex items-center justify-center text-white"
                          style={{ backgroundColor: colors[dietaryType] || '#808080' }}
                        >
                          {dietaryType[0]?.toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Meal summary */}
                {options.mealSummary && assignedChairs.length > 0 && (
                  <div className="absolute -bottom-4 right-0 text-[8px] text-gray-400">
                    {assignedChairs.length}/{capacity}
                  </div>
                )}
              </div>
            );
          })}

          {/* Dimensions */}
          {options.dimensions && (
            <>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-[8px] text-gray-400">
                W: {(layout?.space?.dimensions?.width || 0).toFixed(1)}m
              </div>
              <div className="absolute top-1/2 left-0 transform -translate-y-1/2 text-[8px] text-gray-400">
                H: {(layout?.space?.dimensions?.height || 0).toFixed(1)}m
              </div>
            </>
          )}

          {/* Measurements */}
          {options.measurements && (
            <div className="absolute bottom-1 left-1 text-[8px] text-gray-400">
              Scale: 1:100 | Grid: 0.5m
            </div>
          )}
        </div>

        {/* Footer */}
        {(options.includeFooter || options.notes) && (
          <div className="border-t p-2 text-[8px] text-gray-500 bg-gray-50">
            {options.includeFooter && (
              <span>{footerText || 'WedBoardPro Layout'}</span>
            )}
            {options.includeFooter && options.notes && ' | '}
            {options.notes && <span>Setup notes on reverse</span>}
          </div>
        )}
      </div>

      {/* Page info overlay */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
        {pageSize.toUpperCase()} {orientation.charAt(0).toUpperCase() + orientation.slice(1)} |
        {format.toUpperCase()}
      </div>
    </div>
  );
};

export default ExportPreview;
