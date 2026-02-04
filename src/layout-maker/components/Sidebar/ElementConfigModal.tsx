import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { TableType, ChairConfig, TableDimensions } from '../../../types/layout-elements';

interface ElementConfigData {
  type: TableType;
  dimensions: TableDimensions;
  capacity: number;
  chairConfig: ChairConfig;
  tableNumber: string;
  label?: string;
}

interface ElementConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ElementConfigData) => void;
  elementType: TableType;
  initialData?: Partial<ElementConfigData>;
}

type ArrangementOption = 'auto' | 'long-sides' | 'all-sides' | 'custom';

const ARRANGEMENT_LABELS: Record<ArrangementOption, string> = {
  'auto': 'Auto-arrange',
  'long-sides': 'Long sides only',
  'all-sides': 'All sides',
  'custom': 'Custom',
};

const TABLE_PRESETS: Record<TableType, Array<{ label: string; seats: number; width: number; height?: number }>> = {
  'table-round': [
    { label: 'Small (4-seat)', seats: 4, width: 100 },
    { label: 'Standard (6-seat)', seats: 6, width: 120 },
    { label: 'Medium (8-seat)', seats: 8, width: 150 },
    { label: 'Large (10-seat)', seats: 10, width: 180 },
  ],
  'table-rectangular': [
    { label: '6-seat', seats: 6, width: 120, height: 80 },
    { label: '8-seat', seats: 8, width: 160, height: 80 },
    { label: '10-seat', seats: 10, width: 180, height: 90 },
    { label: '12-seat', seats: 12, width: 200, height: 100 },
  ],
  'table-oval': [
    { label: '6-seat', seats: 6, width: 140, height: 80 },
    { label: '8-seat', seats: 8, width: 180, height: 90 },
    { label: '10-seat', seats: 10, width: 220, height: 100 },
    { label: '12-seat', seats: 12, width: 260, height: 110 },
  ],
};

const MAX_RECOMMENDED_SEATS: Record<TableType, (diameter: number, width: number, height: number) => number> = {
  'table-round': (diameter: number) => Math.floor(diameter / 18),
  'table-rectangular': (_diameter: number, width: number, height: number) => Math.floor((width + height) / 20),
  'table-oval': (_diameter: number, width: number, height: number) => Math.floor((width + height) / 18),
};

const calculateMaxSeats = (type: TableType, dimensions: TableDimensions): number => {
  const calculator = MAX_RECOMMENDED_SEATS[type];
  return calculator(
    dimensions.diameter ?? dimensions.width,
    dimensions.width,
    dimensions.height
  );
};

export const ElementConfigModal: React.FC<ElementConfigModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  elementType,
  initialData,
}) => {
  const [dimensions, setDimensions] = useState<TableDimensions>(
    initialData?.dimensions ?? { width: 150, height: 150, diameter: 150, unit: 'cm' }
  );
  const [capacity, setCapacity] = useState(initialData?.capacity ?? 8);
  const [arrangement, setArrangement] = useState<ArrangementOption>(
    (initialData?.chairConfig?.arrangement as ArrangementOption) ?? 'auto'
  );
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [tableNumber, setTableNumber] = useState(initialData?.tableNumber ?? '');

  const maxRecommended = useMemo(
    () => calculateMaxSeats(elementType, dimensions),
    [elementType, dimensions]
  );

  const presets = TABLE_PRESETS[elementType];

  const handleDimensionChange = useCallback(
    (field: 'width' | 'height' | 'diameter', value: number) => {
      setDimensions((prev) => {
        const newDims = { ...prev, [field]: value };
        if (field === 'width' && maintainAspectRatio && elementType !== 'table-round') {
          const ratio = prev.width > 0 ? prev.height / prev.width : 0.5;
          newDims.height = Math.round(value * ratio * 10) / 10;
        }
        if (field === 'diameter' && elementType === 'table-round') {
          newDims.width = value;
          newDims.height = value;
        }
        return newDims;
      });
    },
    [maintainAspectRatio, elementType]
  );

  const handleUnitChange = useCallback((unit: 'cm' | 'm') => {
    setDimensions((prev) => {
      if (unit === 'm') {
        return {
          width: Math.round((prev.width / 100) * 100) / 100,
          height: Math.round((prev.height / 100) * 100) / 100,
          diameter: prev.diameter ? Math.round((prev.diameter / 100) * 100) / 100 : undefined,
          unit: 'm',
        };
      } else {
        return {
          width: Math.round(prev.width * 100),
          height: Math.round(prev.height * 100),
          diameter: prev.diameter ? Math.round(prev.diameter * 100) : undefined,
          unit: 'cm',
        };
      }
    });
  }, []);

  const handlePresetSelect = useCallback(
    (preset: (typeof presets)[0]) => {
      setCapacity(preset.seats);
      if (elementType === 'table-round') {
        setDimensions((prev) => ({ ...prev, width: preset.width, height: preset.width, diameter: preset.width }));
      } else {
        setDimensions((prev) => ({
          ...prev,
          width: preset.width,
          height: preset.height ?? prev.height,
        }));
      }
    },
    [elementType]
  );

  const handleSubmit = useCallback(() => {
    const chairConfig: ChairConfig = {
      count: capacity,
      arrangement: arrangement === 'auto' ? 'standard' : arrangement.replace('-', '_') as ChairConfig['arrangement'],
      spacing: 0.4,
      offset: 0.1,
      autoGenerate: arrangement === 'auto',
    };

    onSubmit({
      type: elementType,
      dimensions,
      capacity,
      chairConfig,
      tableNumber,
    });
    onClose();
  }, [dimensions, capacity, arrangement, tableNumber, elementType, onSubmit, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, onClose]
  );

  useEffect(() => {
    if (isOpen && initialData) {
      setDimensions(initialData.dimensions ?? { width: 150, height: 150, diameter: 150, unit: 'cm' });
      setCapacity(initialData.capacity ?? 8);
      setTableNumber(initialData.tableNumber ?? '');
    }
  }, [isOpen, initialData]);

  const getElementName = () => {
    const names: Record<TableType, string> = {
      'table-round': 'Round Table',
      'table-rectangular': 'Rectangular Table',
      'table-oval': 'Oval Table',
    };
    return names[elementType];
  };

  const renderPreview = () => {
    const scale = 0.5;
    const previewWidth = dimensions.width * scale;
    const previewHeight = dimensions.height * scale;
    const centerX = 120;
    const centerY = 80;

    return (
      <div className="element-preview-container">
        <svg width="240" height="160" className="element-preview-svg">
          <defs>
            <pattern id="previewGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="240" height="160" fill="url(#previewGrid)" />
          
          {elementType === 'table-round' ? (
            <circle
              cx={centerX}
              cy={centerY}
              r={previewWidth / 2}
              fill="transparent"
              stroke="#1a1a1a"
              strokeWidth="1.5"
            />
          ) : elementType === 'table-oval' ? (
            <ellipse
              cx={centerX}
              cy={centerY}
              rx={previewWidth / 2}
              ry={previewHeight / 2}
              fill="transparent"
              stroke="#1a1a1a"
              strokeWidth="1.5"
            />
          ) : (
            <rect
              x={centerX - previewWidth / 2}
              y={centerY - previewHeight / 2}
              width={previewWidth}
              height={previewHeight}
              rx="4"
              fill="transparent"
              stroke="#1a1a1a"
              strokeWidth="1.5"
            />
          )}
          
          {tableNumber && (
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#1a1a1a"
              fontSize="12"
              fontWeight="500"
            >
              {tableNumber}
            </text>
          )}

          {Array.from({ length: Math.min(capacity, 12) }).map((_, i) => {
            const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2;
            const radius = previewWidth / 2 + 12;
            const seatX = centerX + radius * Math.cos(angle);
            const seatY = centerY + radius * Math.sin(angle);
            return (
              <circle
                key={i}
                cx={seatX}
                cy={seatY}
                r="4"
                fill="transparent"
                stroke="#1a1a1a"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        <div className="preview-label">{dimensions.width} × {dimensions.height} {dimensions.unit}</div>
      </div>
    );
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden" style={{ width: '520px', maxWidth: '90vw' }} onKeyDown={handleKeyDown}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Configure {getElementName()}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Set up dimensions and seating</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {renderPreview()}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePresetSelect(preset)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {elementType === 'table-round' ? 'Diameter' : 'Width'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={elementType === 'table-round' ? dimensions.diameter : dimensions.width}
                  onChange={(e) => handleDimensionChange(elementType === 'table-round' ? 'diameter' : 'width', parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="10"
                  max="500"
                />
                <select
                  value={dimensions.unit}
                  onChange={(e) => handleUnitChange(e.target.value as 'cm' | 'm')}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>

            {elementType !== 'table-round' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={dimensions.height}
                    onChange={(e) => handleDimensionChange('height', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="10"
                    max="300"
                  />
                  <span className="flex items-center px-3 py-2 text-gray-500 bg-gray-100 rounded-lg">
                    {dimensions.unit}
                  </span>
                </div>
              </div>
            )}

            {elementType !== 'table-round' && (
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={maintainAspectRatio}
                    onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                    className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Maintain aspect ratio</span>
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seating</label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCapacity(Math.max(0, capacity - 1))}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 px-3 py-2 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="50"
                />
                <button
                  onClick={() => setCapacity(capacity + 1)}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <span className="text-sm text-gray-500">
                Max recommended: <span className="font-medium text-gray-700">{maxRecommended}</span> for this size
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arrangement</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ARRANGEMENT_LABELS) as ArrangementOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setArrangement(option)}
                  className={`px-4 py-2 text-sm border rounded-lg transition-colors ${
                    arrangement === option
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {ARRANGEMENT_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table Number (optional)</label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g., 1, A, VIP"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            Add to Layout
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default ElementConfigModal;
