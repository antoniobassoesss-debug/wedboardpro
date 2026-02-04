/**
 * Custom Element Modal
 *
 * Drawing canvas for creating custom elements with:
 * - Free draw mode with magnetic snapping
 * - Straight line mode with angle snapping
 * - Real-time measurements and preview
 * - Save with custom name
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { CustomElementTemplate, Point } from '../../types/elements';
import { verticesToSvgPath, calculateBoundingBox, calculatePerimeter } from '../../../lib/supabase/custom-elements';

interface CustomElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt' | 'updatedAt'>) => void;
  editTemplate?: CustomElementTemplate | null;
}

type DrawingMode = 'free' | 'straight';

interface DrawingState {
  vertices: Point[];
  isDrawing: boolean;
  currentPoint: Point | null;
  hoveredVertexIndex: number | null;
  snappedPoint: Point | null;
  snapType: 'grid' | 'vertex' | 'angle' | null;
  showCloseDialog: boolean;
}

const DEFAULT_CONFIG = {
  gridSize: 0.1, // 10cm in meters
  snapAngle: 15, // degrees
  magneticRadius: 0.15, // 15cm in meters
  canvasSize: 600, // pixels
  pixelsPerMeter: 100,
};

const formatMeters = (value: number): string => {
  if (value >= 1) {
    return `${value.toFixed(2)}m`;
  }
  return `${(value * 100).toFixed(0)}cm`;
};

export const CustomElementModal: React.FC<CustomElementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTemplate,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('free');
  const [config] = useState(DEFAULT_CONFIG);
  const [name, setName] = useState('');
  const [state, setState] = useState<DrawingState>({
    vertices: [],
    isDrawing: false,
    currentPoint: null,
    hoveredVertexIndex: null,
    snappedPoint: null,
    snapType: null,
    showCloseDialog: false,
  });

  const isEditing = !!editTemplate;

  useEffect(() => {
    if (editTemplate) {
      setName(editTemplate.name);
      setState({
        vertices: editTemplate.vertices,
        isDrawing: false,
        currentPoint: null,
        hoveredVertexIndex: null,
        snappedPoint: null,
        snapType: null,
        showCloseDialog: false,
      });
    }
  }, [editTemplate]);

  const bbox = useMemo(() => calculateBoundingBox(state.vertices), [state.vertices]);
  const perimeter = useMemo(() => calculatePerimeter(state.vertices, false), [state.vertices]);
  const svgPath = useMemo(() => verticesToSvgPath(state.vertices, false), [state.vertices]);
  const previewPath = useMemo(
    () => (state.currentPoint && state.vertices.length > 0) ? verticesToSvgPath([...state.vertices, state.currentPoint], false) : '',
    [state.vertices, state.currentPoint]
  );

  const metersToPixels = (meters: number): number => meters * config.pixelsPerMeter;
  const pixelsToMeters = (pixels: number): number => pixels / config.pixelsPerMeter;

  const findNearestVertex = useCallback((point: Point, radius: number): { point: Point; index: number } | null => {
    let nearest: { point: Point; index: number } | null = null;
    let minDist = radius;

    state.vertices.forEach((v, i) => {
      const dx = v.x - point.x;
      const dy = v.y - point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = { point: v, index: i };
      }
    });

    return nearest;
  }, [state.vertices]);

  const snapToGrid = useCallback((point: Point): Point => {
    const gridSize = config.gridSize;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  }, [config.gridSize]);

  const snapToAngle = useCallback((fromPoint: Point, toPoint: Point): Point => {
    if (state.vertices.length === 0) return toPoint;

    const lastVertex = state.vertices[state.vertices.length - 1];
    if (!lastVertex) return toPoint;

    const dx = toPoint.x - lastVertex.x;
    const dy = toPoint.y - lastVertex.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    const snapAngle = config.snapAngle;
    const snappedAngle = Math.round(angle / snapAngle) * snapAngle;
    const angleRad = (snappedAngle * Math.PI) / 180;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return {
      x: lastVertex.x + Math.cos(angleRad) * distance,
      y: lastVertex.y + Math.sin(angleRad) * distance,
    };
  }, [state.vertices, config.snapAngle]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = pixelsToMeters(e.clientX - rect.left);
    const y = pixelsToMeters(e.clientY - rect.top);

    let point: Point = { x, y };
    let snapType: 'grid' | 'vertex' | 'angle' | null = null;
    let snappedPoint: Point | null = null;

    if (state.vertices.length > 0) {
      const nearestVertex = findNearestVertex({ x, y }, config.magneticRadius);
      if (nearestVertex) {
        snapType = 'vertex';
        snappedPoint = nearestVertex.point;
        point = nearestVertex.point;
      } else if (drawingMode === 'straight') {
        const lastVertex = state.vertices[state.vertices.length - 1];
        if (lastVertex) {
          const angledPoint = snapToAngle(lastVertex, { x, y });
          const angleDx = angledPoint.x - x;
          const angleDy = angledPoint.y - y;
          const angleDist = Math.sqrt(angleDx * angleDx + angleDy * angleDy);
          if (angleDist < config.magneticRadius) {
            snapType = 'angle';
            snappedPoint = angledPoint;
            point = angledPoint;
          }
        }
      }
    }

    if (!snapType && state.vertices.length === 0) {
      const gridPoint = snapToGrid({ x, y });
      const gridDx = gridPoint.x - x;
      const gridDy = gridPoint.y - y;
      if (Math.sqrt(gridDx * gridDx + gridDy * gridDy) < config.magneticRadius) {
        snapType = 'grid';
        snappedPoint = gridPoint;
        point = gridPoint;
      }
    }

    if (!snappedPoint) {
      snappedPoint = snapToGrid(point);
    }

    setState((prev) => ({
      ...prev,
      currentPoint: point,
      snappedPoint,
      snapType,
    }));
  }, [state.vertices, drawingMode, config.magneticRadius, config.gridSize, findNearestVertex, snapToGrid, snapToAngle, pixelsToMeters]);

  const handleMouseLeave = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentPoint: null,
      snappedPoint: null,
      snapType: null,
    }));
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!state.currentPoint) return;

    setState((prev) => ({
      ...prev,
      vertices: [...prev.vertices, prev.snappedPoint || prev.currentPoint!],
      currentPoint: null,
      snappedPoint: null,
      snapType: null,
    }));
  }, [state.currentPoint, state.snappedPoint]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (state.vertices.length > 0 && !state.showCloseDialog) {
        setState((prev) => ({ ...prev, showCloseDialog: true }));
      } else {
        onClose();
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state.vertices.length > 0 && !state.showCloseDialog) {
        setState((prev) => ({ ...prev, showCloseDialog: true }));
      }
    } else if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setState((prev) => ({
        ...prev,
        vertices: prev.vertices.slice(0, -1),
      }));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      setState((prev) => ({
        ...prev,
        vertices: prev.vertices.slice(0, -1),
      }));
    } else if (e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      setDrawingMode((prev) => (prev === 'free' ? 'straight' : 'free'));
    }
  }, [state.vertices, state.showCloseDialog, onClose]);

  const handleUndo = useCallback(() => {
    setState((prev) => ({
      ...prev,
      vertices: prev.vertices.slice(0, -1),
    }));
  }, []);

  const handleClear = useCallback(() => {
    setState((prev) => ({
      ...prev,
      vertices: [],
      isDrawing: false,
      currentPoint: null,
      snappedPoint: null,
      snapType: null,
    }));
  }, []);

  const handleCloseDialog = useCallback((close: boolean) => {
    setState((prev) => ({ ...prev, showCloseDialog: false }));
    if (close) {
      handleSave();
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim() || state.vertices.length < 2) return;

    const bbox = calculateBoundingBox(state.vertices);
    const svgPathData = verticesToSvgPath(state.vertices, true);

    onSave({
      name: name.trim(),
      svgPath: svgPathData,
      width: bbox.width || 0.1,
      height: bbox.height || 0.1,
      vertices: state.vertices,
    });

    onClose();
  }, [name, state.vertices, onSave, onClose]);

  const renderGrid = useMemo(() => {
    const gridSizePx = metersToPixels(config.gridSize);
    const gridElements = [];
    const gridCount = config.canvasSize / gridSizePx;

    for (let i = 0; i <= gridCount; i++) {
      const pos = i * gridSizePx;
      gridElements.push(
        <line key={`v-${i}`} x1={pos} y1={0} x2={pos} y2={config.canvasSize} stroke="#e5e7eb" strokeWidth="0.5" />,
        <line key={`h-${i}`} x1={0} y1={pos} x2={config.canvasSize} y2={pos} stroke="#e5e7eb" strokeWidth="0.5" />
      );
    }

    return (
      <g>
        <rect width="100%" height="100%" fill="#fafafa" />
        {gridElements}
      </g>
    );
  }, [config.canvasSize, config.gridSize, metersToPixels]);

  const renderVertices = useMemo(() => {
    return state.vertices.map((v, i) => {
      const px = metersToPixels(v.x);
      const py = metersToPixels(v.y);
      return (
        <g key={i}>
          <circle cx={px} cy={py} r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
          {i === 0 && (
            <circle cx={px} cy={py} r="10" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,2" />
          )}
        </g>
      );
    });
  }, [state.vertices, metersToPixels]);

  const renderCurrentElement = useMemo(() => {
    if (state.vertices.length === 0 || !state.currentPoint) return null;

    const points = [...state.vertices, state.snappedPoint || state.currentPoint];
    const pathData = verticesToSvgPath(points, false);
    const cx = metersToPixels(state.currentPoint.x);
    const cy = metersToPixels(state.currentPoint.y);

    return (
      <g>
        <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="8,4" opacity="0.6" />
        {state.snapType && (
          <circle cx={cx} cy={cy} r="8" fill={state.snapType === 'vertex' ? '#22c55e' : '#3b82f6'} opacity="0.3">
            <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
          </circle>
        )}
      </g>
    );
  }, [state.vertices, state.currentPoint, state.snappedPoint, state.snapType, metersToPixels]);

  const renderCompletedPath = useMemo(() => {
    if (state.vertices.length < 2) return null;

    return (
      <path
        d={svgPath}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="#3b82f6"
        strokeWidth="2"
      />
    );
  }, [svgPath, state.vertices.length]);

  const renderDimensions = useMemo(() => {
    if (state.vertices.length < 2) return null;

    const bbox = calculateBoundingBox(state.vertices);
    const bboxPx = {
      x: metersToPixels(bbox.x),
      y: metersToPixels(bbox.y),
      width: metersToPixels(bbox.width),
      height: metersToPixels(bbox.height),
    };

    return (
      <g>
        <rect
          x={bboxPx.x - 5}
          y={bboxPx.y - 5}
          width={bboxPx.width + 10}
          height={bboxPx.height + 10}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="4,2"
          opacity="0.5"
        />
        <line
          x1={bboxPx.x + bboxPx.width / 2}
          y1={bboxPx.y - 10}
          x2={bboxPx.x + bboxPx.width / 2}
          y2={bboxPx.y}
          stroke="#94a3b8"
          strokeWidth="1"
        />
        <line
          x1={bboxPx.x - 10}
          y1={bboxPx.y + bboxPx.height / 2}
          x2={bboxPx.x}
          y2={bboxPx.y + bboxPx.height / 2}
          stroke="#94a3b8"
          strokeWidth="1"
        />
        <text
          x={bboxPx.x + bboxPx.width / 2}
          y={bboxPx.y - 15}
          textAnchor="middle"
          fontSize="11"
          fill="#64748b"
        >
          {formatMeters(bbox.width)}
        </text>
        <text
          x={bboxPx.x - 15}
          y={bboxPx.y + bboxPx.height / 2 + 4}
          textAnchor="middle"
          fontSize="11"
          fill="#64748b"
          transform={`rotate(-90, ${bboxPx.x - 15}, ${bboxPx.y + bboxPx.height / 2})`}
        >
          {formatMeters(bbox.height)}
        </text>
      </g>
    );
  }, [state.vertices, metersToPixels]);

  const renderAngleGuide = useMemo(() => {
    const vertices = state.vertices;
    const currentPoint = state.currentPoint;
    if (vertices.length === 0 || !currentPoint) return null;

    const lastVertex = vertices[vertices.length - 1];
    if (!lastVertex) return null;

    const lastPx = metersToPixels(lastVertex.x);
    const currentPx = metersToPixels(currentPoint.x);
    const lastPy = metersToPixels(lastVertex.y);
    const currentPy = metersToPixels(currentPoint.y);

    const dx = currentPx - lastPx;
    const dy = currentPy - lastPy;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return (
      <g opacity="0.4">
        <text x={currentPx + 10} y={currentPy - 10} fontSize="10" fill="#64748b">
          {angle.toFixed(1)}°
        </text>
      </g>
    );
  }, [state.vertices, state.currentPoint, metersToPixels]);

  if (!isOpen) return null;

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
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Custom Element' : 'Create Custom Element'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Draw your custom element shape on the canvas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> to finish, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Esc</kbd> to cancel
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
              style={{ width: config.canvasSize, height: config.canvasSize, margin: '0 auto' }}
            >
              <svg
                ref={svgRef}
                width={config.canvasSize}
                height={config.canvasSize}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
              >
                {renderGrid}
                {renderCompletedPath}
                {renderCurrentElement}
                {renderDimensions}
                {renderVertices}
                {renderAngleGuide}
              </svg>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600">Mode:</span>
                <button
                  onClick={() => setDrawingMode('free')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    drawingMode === 'free'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Free Draw
                </button>
                <button
                  onClick={() => setDrawingMode('straight')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    drawingMode === 'straight'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Straight Lines
                </button>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                <button
                  onClick={handleUndo}
                  disabled={state.vertices.length === 0}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Undo
                </button>
                <button
                  onClick={handleClear}
                  disabled={state.vertices.length === 0}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Snap to point
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                Snap to grid
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">D</kbd>
                Toggle mode
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">⌘Z</kbd>
                Undo
              </span>
            </div>
          </div>

          <div className="w-72 border-l p-4 bg-white">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Element Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., L-Shaped Table"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Element Info</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Vertices:</span>
                    <span className="text-gray-900 font-medium">{state.vertices.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Width:</span>
                    <span className="text-gray-900 font-medium">{formatMeters(bbox.width)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Height:</span>
                    <span className="text-gray-900 font-medium">{formatMeters(bbox.height)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Perimeter:</span>
                    <span className="text-gray-900 font-medium">{formatMeters(perimeter)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Click to place points. At least 2 points required.</span>
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
            onClick={handleSave}
            disabled={!name.trim() || state.vertices.length < 2}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Save Changes' : 'Save Element'}
          </button>
        </div>
      </div>

      {state.showCloseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Finish Drawing?</h3>
            <p className="text-gray-500 mb-6">
              {state.vertices.length >= 2
                ? 'Your element is ready to save.'
                : 'You need at least 2 points to create an element.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleCloseDialog(false)}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Continue Drawing
              </button>
              <button
                onClick={() => handleCloseDialog(true)}
                disabled={state.vertices.length < 2}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Element
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default CustomElementModal;
