/**
 * Element Placement Modal
 *
 * Allows placing multiple instances of an element type on the canvas.
 * - Click to place individual elements
 * - Drag to place multiple elements in a grid pattern
 * - Adjust spacing between elements
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { ElementType, BaseElement } from '../../types/elements';

interface ElementPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceElements: (elements: Array<Omit<BaseElement, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  elementType: ElementType;
  elementLabel: string;
  defaultWidth: number;
  defaultHeight: number;
}

export const ElementPlacementModal: React.FC<ElementPlacementModalProps> = ({
  isOpen,
  onClose,
  onPlaceElements,
  elementType,
  elementLabel,
  defaultWidth,
  defaultHeight,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [placementMode, setPlacementMode] = useState<'single' | 'grid'>('single');
  const [gridRows, setGridRows] = useState(1);
  const [gridCols, setGridCols] = useState(1);
  const [spacing, setSpacing] = useState(0.5);
  const [placedElements, setPlacedElements] = useState<Array<{ x: number; y: number }>>([]);
  const [previewX, setPreviewX] = useState<number | null>(null);
  const [previewY, setPreviewY] = useState<number | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  const canvasSize = 600;
  const pixelsPerMeter = 100;

  const metersToPixels = (meters: number): number => meters * pixelsPerMeter;
  const pixelsToMeters = (pixels: number): number => pixels / pixelsPerMeter;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = pixelsToMeters(e.clientX - rect.left);
    const y = pixelsToMeters(e.clientY - rect.top);

    setPreviewX(x);
    setPreviewY(y);

    if (startPoint && placementMode === 'grid') {
      const dx = x - startPoint.x;
      const dy = y - startPoint.y;
      const newCols = Math.max(1, Math.floor(Math.abs(dx) / (defaultWidth + spacing)) + 1);
      const newRows = Math.max(1, Math.floor(Math.abs(dy) / (defaultHeight + spacing)) + 1);
      setGridCols(newCols);
      setGridRows(newRows);
    }
  }, [startPoint, placementMode, defaultWidth, defaultHeight, spacing]);

  const handleMouseLeave = useCallback(() => {
    setPreviewX(null);
    setPreviewY(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || previewX === null || previewY === null) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = pixelsToMeters(e.clientX - rect.left);
    const y = pixelsToMeters(e.clientY - rect.top);

    if (placementMode === 'single') {
      setPlacedElements((prev) => [...prev, { x, y }]);
      setStartPoint({ x, y });
    } else {
      if (!startPoint) {
        setStartPoint({ x, y });
      } else {
        const elements: Array<{ x: number; y: number }> = [];
        for (let row = 0; row < gridRows; row++) {
          for (let col = 0; col < gridCols; col++) {
            const ex = Math.min(startPoint.x, x) + col * (defaultWidth + spacing);
            const ey = Math.min(startPoint.y, y) + row * (defaultHeight + spacing);
            elements.push({ x: ex, y: ey });
          }
        }
        setPlacedElements((prev) => [...prev, ...elements]);
        setStartPoint(null);
        setGridRows(1);
        setGridCols(1);
      }
    }
  }, [previewX, previewY, placementMode, startPoint, gridRows, gridCols, defaultWidth, defaultHeight, spacing]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (placedElements.length > 0) {
        setPlacedElements([]);
        setStartPoint(null);
      } else {
        onClose();
      }
    } else if (e.key === 'Enter' && placedElements.length > 0) {
      handlePlaceElements();
    } else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setPlacedElements((prev) => prev.slice(0, -1));
    }
  }, [placedElements, onClose]);

  const handlePlaceElements = useCallback(() => {
    if (placedElements.length === 0) return;

    const elements = placedElements.map((pos) => ({
      type: elementType,
      x: pos.x,
      y: pos.y,
      width: defaultWidth,
      height: defaultHeight,
      rotation: 0,
      zIndex: 0,
      groupId: null,
      parentId: null,
      locked: false,
      visible: true,
      label: elementLabel,
      notes: '',
      color: null as string | null,
    }));

    onPlaceElements(elements);
    setPlacedElements([]);
    onClose();
  }, [placedElements, elementType, defaultWidth, defaultHeight, elementLabel, onPlaceElements, onClose]);

  const handleClear = useCallback(() => {
    setPlacedElements([]);
    setStartPoint(null);
    setGridRows(1);
    setGridCols(1);
  }, []);

  const renderGrid = useMemo(() => {
    const gridSizePx = metersToPixels(0.1);
    const gridElements = [];
    const gridCount = canvasSize / gridSizePx;

    for (let i = 0; i <= gridCount; i++) {
      const pos = i * gridSizePx;
      gridElements.push(
        <line key={`v-${i}`} x1={pos} y1={0} x2={pos} y2={canvasSize} stroke="#e5e7eb" strokeWidth="0.5" />,
        <line key={`h-${i}`} x1={0} y1={pos} x2={canvasSize} y2={pos} stroke="#e5e7eb" strokeWidth="0.5" />
      );
    }

    return (
      <g>
        <rect width="100%" height="100%" fill="#fafafa" />
        {gridElements}
      </g>
    );
  }, []);

  const renderPreviewElements = useMemo(() => {
    const elements: JSX.Element[] = [];

    placedElements.forEach((pos, index) => {
      const px = metersToPixels(pos.x);
      const py = metersToPixels(pos.y);
      const width = metersToPixels(defaultWidth);
      const height = metersToPixels(defaultHeight);

      elements.push(
        <g key={`placed-${index}`}>
          <rect
            x={px - width / 2}
            y={py - height / 2}
            width={width}
            height={height}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            strokeWidth="2"
            rx={4}
          />
          <text
            x={px}
            y={py}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fill="#3b82f6"
          >
            {index + 1}
          </text>
        </g>
      );
    });

    if (previewX !== null && previewY !== null && placementMode === 'single') {
      const px = metersToPixels(previewX);
      const py = metersToPixels(previewY);
      const width = metersToPixels(defaultWidth);
      const height = metersToPixels(defaultHeight);

      elements.push(
        <g key="preview">
          <rect
            x={px - width / 2}
            y={py - height / 2}
            width={width}
            height={height}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="4,2"
            rx={4}
          />
          <circle cx={px} cy={py} r="6" fill="#3b82f6" />
        </g>
      );
    }

    if (startPoint !== null && previewX !== null && previewY !== null && placementMode === 'grid') {
      const startPx = metersToPixels(startPoint.x);
      const startPy = metersToPixels(startPoint.y);
      const currentPx = metersToPixels(previewX);
      const currentPy = metersToPixels(previewY);
      const width = metersToPixels(defaultWidth);
      const height = metersToPixels(defaultHeight);
      const spacingPx = metersToPixels(spacing);

      const minX = Math.min(startPx, currentPx);
      const minY = Math.min(startPy, currentPy);
      const maxX = Math.max(startPx, currentPx);
      const maxY = Math.max(startPy, currentPy);

      elements.push(
        <rect
          key="preview-area"
          x={minX - spacingPx / 2}
          y={minY - spacingPx / 2}
          width={maxX - minX + width + spacingPx}
          height={maxY - minY + height + spacingPx}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth="1"
          strokeDasharray="4,2"
        />
      );

      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const ex = Math.min(startPx, currentPx) + col * (width + spacingPx);
          const ey = Math.min(startPy, currentPy) + row * (height + spacingPx);

          elements.push(
            <rect
              key={`preview-grid-${row}-${col}`}
              x={ex}
              y={ey}
              width={width}
              height={height}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth="1"
              rx={4}
            />
          );
        }
      }
    }

    return elements;
  }, [placedElements, previewX, previewY, startPoint, placementMode, gridRows, gridCols, defaultWidth, defaultHeight, spacing]);

  const previewCount = useMemo(() => {
    if (placementMode === 'single') return placedElements.length;
    if (startPoint) return gridRows * gridCols;
    return 0;
  }, [placementMode, placedElements, startPoint, gridRows, gridCols]);

  console.log('[ElementPlacementModal] RENDER - isOpen:', isOpen);

  if (!isOpen) {
    console.log('[ElementPlacementModal] Not rendering - isOpen is false');
    return null;
  }

  console.log('[ElementPlacementModal] Rendering modal content');

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl overflow-hidden"
        style={{ width: '800px', maxWidth: '95vw' }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Place {elementLabel}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Click to place {elementLabel.toLowerCase()}s on the canvas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Esc</kbd> to cancel, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> to confirm
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex">
          <div className="flex-1 p-4 bg-gray-50">
            <div
              className="relative bg-white rounded-lg border border-gray-200 overflow-hidden cursor-crosshair"
              style={{ width: canvasSize, height: canvasSize, margin: '0 auto' }}
            >
              <svg
                ref={svgRef}
                width={canvasSize}
                height={canvasSize}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onMouseDown={handleMouseDown}
              >
                {renderGrid}
                {renderPreviewElements}
              </svg>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600">Mode:</span>
                <button
                  onClick={() => setPlacementMode('single')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    placementMode === 'single'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => setPlacementMode('grid')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    placementMode === 'grid'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Grid
                </button>
              </div>

              {placementMode === 'grid' && (
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600">Spacing:</span>
                  <input
                    type="number"
                    value={spacing}
                    onChange={(e) => setSpacing(Math.max(0, parseFloat(e.target.value) || 0))}
                    step="0.1"
                    min="0"
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-500">m</span>
                </div>
              )}

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <button
                  onClick={handleClear}
                  disabled={placedElements.length === 0}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                Click to place
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">⌘Z</kbd>
                Undo
              </span>
            </div>
          </div>

          <div className="w-72 border-l p-4 bg-white">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Placement Info</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Element:</span>
                    <span className="text-gray-900 font-medium">{elementLabel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Size:</span>
                    <span className="text-gray-900 font-medium">{defaultWidth}m × {defaultHeight}m</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">To place:</span>
                    <span className="text-gray-900 font-medium">{previewCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total placed:</span>
                    <span className="text-gray-900 font-medium">{placedElements.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{placementMode === 'single' ? 'Click to place individual elements' : 'Drag to create a grid of elements'}</span>
              </div>
            </div>
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
            onClick={handlePlaceElements}
            disabled={placedElements.length === 0}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Place {placedElements.length} {elementLabel.toLowerCase()}{placedElements.length !== 1 ? 's' : ''}
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

export default ElementPlacementModal;
