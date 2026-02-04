/**
 * Config Popover Component
 *
 * A popover that appears when clicking an element in the sidebar.
 * Different content based on element type.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ElementType, TableType, ZoneType, BorderStyle } from '../../types/elements';
import {
  ELEMENT_DEFAULTS,
  CHAIR_CONFIG_DEFAULTS,
  TABLE_CAPACITIES,
  getRecommendedTableSize,
} from '../../constants';
import type { TableElement, ChairElement, ZoneElement, ServiceElement, DecorationElement } from '../../types/elements';

interface ConfigPopoverProps {
  elementType: ElementType;
  position: { x: number; y: number };
  onClose: () => void;
  onAddTable: (config: {
    type: TableType;
    x: number;
    y: number;
    width: number;
    height: number;
    capacity: number;
    tableNumber?: string;
    label?: string;
    rotation?: number;
    color?: string | null;
  }) => { tableId: string; chairIds: string[] };
  onAddZone: (config: {
    type: ZoneType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    fillColor?: string;
    borderStyle?: BorderStyle;
    borderColor?: string;
    label?: string;
    estimatedCapacity?: number | null;
  }) => string;
  onAddFurniture: (config: {
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    label?: string;
  }) => string;
}

interface TableConfig {
  seats: number;
  width: number;
  height: number;
  autoSize: boolean;
  tableNumber: string;
  autoNumber: boolean;
  label: string;
}

interface ZoneConfig {
  width: number;
  height: number;
  fillColor: string;
  borderStyle: BorderStyle;
  borderColor: string;
  label: string;
  estimatedCapacity: number | null;
}

interface FurnitureConfig {
  width: number;
  height: number;
  label: string;
  rotation: number;
}

export const ConfigPopover: React.FC<ConfigPopoverProps> = ({
  elementType,
  position,
  onClose,
  onAddTable,
  onAddZone,
  onAddFurniture,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isTable, setIsTable] = useState(false);
  const [isZone, setIsZone] = useState(false);
  const [isFurniture, setIsFurniture] = useState(false);
  const [tableConfig, setTableConfig] = useState<TableConfig>({
    seats: 8,
    width: 1.5,
    height: 1.5,
    autoSize: true,
    tableNumber: '',
    autoNumber: true,
    label: '',
  });
  const [zoneConfig, setZoneConfig] = useState<ZoneConfig>({
    width: 3,
    height: 3,
    fillColor: '#FFE4B5',
    borderStyle: 'dashed',
    borderColor: '#DEB887',
    label: 'Zone',
    estimatedCapacity: null,
  });
  const [furnitureConfig, setFurnitureConfig] = useState<FurnitureConfig>({
    width: 1.5,
    height: 1.0,
    label: '',
    rotation: 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const defaults = ELEMENT_DEFAULTS[elementType];
    if (!defaults) return;

    if (
      elementType === 'table-round' ||
      elementType === 'table-rectangular' ||
      elementType === 'table-oval' ||
      elementType === 'table-square'
    ) {
      setIsTable(true);
      setTableConfig((prev) => ({
        ...prev,
        seats: defaults.capacity || 8,
        width: defaults.width,
        height: defaults.height,
        label: defaults.label || elementType,
      }));
    } else if (
      elementType === 'dance-floor' ||
      elementType === 'stage' ||
      elementType === 'cocktail-area' ||
      elementType === 'ceremony-area'
    ) {
      setIsZone(true);
      setZoneConfig((prev) => ({
        ...prev,
        width: defaults.width,
        height: defaults.height,
        label: defaults.label || elementType,
      }));
    } else {
      setIsFurniture(true);
      setFurnitureConfig((prev) => ({
        ...prev,
        width: defaults.width,
        height: defaults.height,
        label: defaults.label || elementType,
      }));
    }
  }, [elementType]);

  const handleSeatsChange = useCallback((seats: number) => {
    const tableType = elementType as TableType;
    const size = getRecommendedTableSize(tableType, seats);

    setTableConfig((prev) => ({
      ...prev,
      seats,
      width: prev.autoSize ? size.width : prev.width,
      height: prev.autoSize ? size.height : prev.height,
    }));
  }, [elementType]);

  const handleAddTable = useCallback(() => {
    const config = tableConfig;
    const tableNumber = config.autoNumber
      ? '1'
      : config.tableNumber;

    onAddTable({
      type: elementType as TableType,
      x: 5,
      y: 5,
      width: config.width,
      height: config.height,
      capacity: config.seats,
      tableNumber,
      label: config.autoNumber ? `Table ${tableNumber}` : config.label,
      rotation: 0,
      color: null,
    });
    onClose();
  }, [elementType, tableConfig, onAddTable, onClose]);

  const handleAddZone = useCallback(() => {
    const config = zoneConfig;

    onAddZone({
      type: elementType as ZoneType,
      x: 5,
      y: 5,
      width: config.width,
      height: config.height,
      rotation: 0,
      fillColor: config.fillColor,
      borderStyle: config.borderStyle,
      borderColor: config.borderColor,
      label: config.label,
      estimatedCapacity: config.estimatedCapacity,
    });
    onClose();
  }, [elementType, zoneConfig, onAddZone, onClose]);

  const handleAddFurniture = useCallback(() => {
    const config = furnitureConfig;

    onAddFurniture({
      type: elementType,
      x: 5,
      y: 5,
      width: config.width,
      height: config.height,
      rotation: config.rotation,
      label: config.label,
    });
    onClose();
  }, [elementType, furnitureConfig, onAddFurniture, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320),
    top: Math.min(position.y, window.innerHeight - 450),
    zIndex: 1000,
  };

  const renderTableConfig = () => (
    <div className="w-72 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Configure Table</h3>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Seats</label>
        <div className="flex flex-wrap gap-2">
          {TABLE_CAPACITIES.map((n) => (
            <button
              key={n}
              onClick={() => handleSeatsChange(n)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                tableConfig.seats === n
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Table Size</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="autoSize"
              checked={tableConfig.autoSize}
              onChange={() =>
                setTableConfig((prev) => {
                  const size = getRecommendedTableSize(elementType as TableType, prev.seats);
                  return {
                    ...prev,
                    autoSize: true,
                    width: size.width,
                    height: size.height,
                  };
                })
              }
              className="text-blue-500"
            />
            <span>Auto ({tableConfig.width.toFixed(1)}m)</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="autoSize"
              checked={!tableConfig.autoSize}
              onChange={() => setTableConfig((prev) => ({ ...prev, autoSize: false }))}
              className="text-blue-500"
            />
            <span>Custom</span>
          </label>
        </div>
        {!tableConfig.autoSize && (
          <div className="flex gap-2 mt-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Width (m)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={tableConfig.width}
                onChange={(e) =>
                  setTableConfig((prev) => ({ ...prev, width: parseFloat(e.target.value) || 1 }))
                }
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Height (m)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={tableConfig.height}
                onChange={(e) =>
                  setTableConfig((prev) => ({ ...prev, height: parseFloat(e.target.value) || 1 }))
                }
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Table Label</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tableNumber"
              checked={tableConfig.autoNumber}
              onChange={() => setTableConfig((prev) => ({ ...prev, autoNumber: true }))}
              className="text-blue-500"
            />
            <span>Auto-number</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tableNumber"
              checked={!tableConfig.autoNumber}
              onChange={() => setTableConfig((prev) => ({ ...prev, autoNumber: false }))}
              className="text-blue-500"
            />
            <span>Custom label</span>
          </label>
        </div>
        {!tableConfig.autoNumber && (
          <input
            type="text"
            value={tableConfig.label}
            onChange={(e) => setTableConfig((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="Table name"
            className="w-full px-2 py-1 text-sm border rounded mt-2"
          />
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleCancel}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleAddTable}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add to Layout
        </button>
      </div>
    </div>
  );

  const renderZoneConfig = () => (
    <div className="w-72 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Configure Zone</h3>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Size</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Width (m)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={zoneConfig.width}
              onChange={(e) =>
                setZoneConfig((prev) => ({ ...prev, width: parseFloat(e.target.value) || 1 }))
              }
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500">Height (m)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={zoneConfig.height}
              onChange={(e) =>
                setZoneConfig((prev) => ({ ...prev, height: parseFloat(e.target.value) || 1 }))
              }
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Fill Color</label>
        <div className="flex gap-2 flex-wrap">
          {['#FFE4B5', '#DDA0DD', '#98FB98', '#E6E6FA', '#87CEEB', '#FFB6C1'].map((color) => (
            <button
              key={color}
              onClick={() => setZoneConfig((prev) => ({ ...prev, fillColor: color }))}
              className={`w-6 h-6 rounded-full border-2 ${
                zoneConfig.fillColor === color ? 'border-blue-500' : 'border-gray-200'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={zoneConfig.fillColor}
            onChange={(e) => setZoneConfig((prev) => ({ ...prev, fillColor: e.target.value }))}
            className="w-6 h-6 rounded overflow-hidden"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Border Style</label>
        <div className="flex gap-2">
          {(['solid', 'dashed', 'dotted'] as BorderStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => setZoneConfig((prev) => ({ ...prev, borderStyle: style }))}
              className={`flex-1 px-2 py-1.5 text-xs rounded border ${
                zoneConfig.borderStyle === style
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Label</label>
        <input
          type="text"
          value={zoneConfig.label}
          onChange={(e) => setZoneConfig((prev) => ({ ...prev, label: e.target.value }))}
          className="w-full px-2 py-1.5 text-sm border rounded"
          placeholder="Zone name"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Capacity (optional)</label>
        <input
          type="number"
          min="0"
          value={zoneConfig.estimatedCapacity || ''}
          onChange={(e) =>
            setZoneConfig((prev) => ({
              ...prev,
              estimatedCapacity: e.target.value ? parseInt(e.target.value) : null,
            }))
          }
          className="w-full px-2 py-1.5 text-sm border rounded"
          placeholder="Estimated guests"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleCancel}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleAddZone}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add to Layout
        </button>
      </div>
    </div>
  );

  const renderFurnitureConfig = () => (
    <div className="w-72 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Configure {furnitureConfig.label}</h3>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Size</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Width (m)</label>
            <input
              type="number"
              step="0.1"
              min="0.3"
              value={furnitureConfig.width}
              onChange={(e) =>
                setFurnitureConfig((prev) => ({ ...prev, width: parseFloat(e.target.value) || 0.3 }))
              }
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500">Height (m)</label>
            <input
              type="number"
              step="0.1"
              min="0.3"
              value={furnitureConfig.height}
              onChange={(e) =>
                setFurnitureConfig((prev) => ({ ...prev, height: parseFloat(e.target.value) || 0.3 }))
              }
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Label</label>
        <input
          type="text"
          value={furnitureConfig.label}
          onChange={(e) => setFurnitureConfig((prev) => ({ ...prev, label: e.target.value }))}
          className="w-full px-2 py-1.5 text-sm border rounded"
          placeholder="Item name"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">Rotation</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="360"
            step="45"
            value={furnitureConfig.rotation}
            onChange={(e) =>
              setFurnitureConfig((prev) => ({ ...prev, rotation: parseInt(e.target.value) }))
            }
            className="flex-1"
          />
          <span className="text-sm text-gray-600 w-12">{furnitureConfig.rotation}°</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleCancel}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleAddFurniture}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add to Layout
        </button>
      </div>
    </div>
  );

  const content = (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="pointer-events-auto bg-white rounded-xl shadow-xl border border-gray-200"
      >
        {isTable && renderTableConfig()}
        {isZone && renderZoneConfig()}
        {isFurniture && renderFurnitureConfig()}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(content, document.body);
};

export type { ConfigPopoverProps };
