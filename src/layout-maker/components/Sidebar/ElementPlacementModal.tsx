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
        <line key={`v-${i}`} x1={pos} y1={0} x2={pos} y2={canvasSize} stroke="#e2e8f0" strokeWidth="0.5" />,
        <line key={`h-${i}`} x1={0} y1={pos} x2={canvasSize} y2={pos} stroke="#e2e8f0" strokeWidth="0.5" />
      );
    }

    return (
      <g>
        <rect width="100%" height="100%" fill="#f8fafc" />
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
            fill="rgba(15, 23, 42, 0.15)"
            stroke="#0f172a"
            strokeWidth="2"
            rx={4}
          />
          <text
            x={px}
            y={py}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fill="#0f172a"
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
            fill="rgba(15, 23, 42, 0.08)"
            stroke="#0f172a"
            strokeWidth="2"
            strokeDasharray="4,2"
            rx={4}
          />
          <circle cx={px} cy={py} r="6" fill="#0f172a" />
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
          fill="rgba(15, 23, 42, 0.08)"
          stroke="#0f172a"
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
              fill="rgba(15, 23, 42, 0.08)"
              stroke="#0f172a"
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

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 800,
          maxWidth: '95vw',
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Place {elementLabel}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Click to place {elementLabel.toLowerCase()}s on the canvas
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Press <kbd style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 4, fontSize: 11, color: '#475569' }}>Esc</kbd> to cancel, <kbd style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 4, fontSize: 11, color: '#475569' }}>Enter</kbd> to confirm
            </span>
            <button
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: '#f1f5f9',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          {/* Canvas area */}
          <div style={{ flex: 1, padding: 20, background: '#fafafa' }}>
            <div
              style={{
                position: 'relative',
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                cursor: 'crosshair',
                width: canvasSize,
                height: canvasSize,
                margin: '0 auto',
              }}
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

            {/* Controls */}
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              {/* Mode selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 13, color: '#475569' }}>Mode:</span>
                <button
                  onClick={() => setPlacementMode('single')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: placementMode === 'single' ? '#0f172a' : '#f1f5f9',
                    color: placementMode === 'single' ? '#ffffff' : '#475569',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Single
                </button>
                <button
                  onClick={() => setPlacementMode('grid')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: placementMode === 'grid' ? '#0f172a' : '#f1f5f9',
                    color: placementMode === 'grid' ? '#ffffff' : '#475569',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Grid
                </button>
              </div>

              {/* Spacing (grid mode) */}
              {placementMode === 'grid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 13, color: '#475569' }}>Spacing:</span>
                <input
                  type="number"
                  value={spacing}
                  onChange={(e) => setSpacing(Math.max(0, parseFloat(e.target.value) || 0))}
                  step="0.1"
                  min="0"
                  style={{
                    width: 64,
                    padding: '6px 8px',
                    fontSize: 13,
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: 12, color: '#64748b' }}>m</span>
                </div>
              )}

              {/* Clear button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={handleClear}
                  disabled={placedElements.length === 0}
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: 8,
                    cursor: placedElements.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: placedElements.length === 0 ? 0.5 : 1,
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Help text */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontSize: 11, color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, background: '#0f172a', borderRadius: '50%' }} />
                Click to place
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: 4, fontSize: 10, color: '#475569' }}>⌘Z</kbd>
                Undo
              </span>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width: 300, borderLeft: '1px solid #f1f5f9', padding: 20, background: '#ffffff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info card */}
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Placement Info</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>Element:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{elementLabel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>Size:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{defaultWidth}m × {defaultHeight}m</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>To place:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{previewCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>Total placed:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{placedElements.length}</span>
                  </div>
                </div>
              </div>

              {/* Help tip */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#64748b' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <span>{placementMode === 'single' ? 'Click to place individual elements' : 'Drag to create a grid of elements'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              color: '#374151',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePlaceElements}
            disabled={placedElements.length === 0}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: placedElements.length === 0 ? '#94a3b8' : '#0f172a',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: placedElements.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (placedElements.length > 0) e.currentTarget.style.background = '#1e293b'; }}
            onMouseLeave={(e) => { if (placedElements.length > 0) e.currentTarget.style.background = '#0f172a'; }}
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
