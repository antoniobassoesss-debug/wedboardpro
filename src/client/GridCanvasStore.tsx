/**
 * GridCanvas - Store-based Version
 *
 * Uses Zustand canvas store for state management.
 * Boundary enforcement happens at the store level.
 */

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import type { Wall, Door } from './types/wall';
import type { PowerPoint } from './types/powerPoint';
import { createPowerPoint } from './types/powerPoint';
import ElectricalIcon from './components/ElectricalIcon';
import ElectricalDrawer from './components/ElectricalDrawer';
import {
  useCanvasStore,
  type Shape,
  type DrawingPath,
  type TextElement,
  type ViewBox,
} from '../layout-maker/store/canvasStore';
import { clampPositionToA4 } from '../layout-maker/store/boundaries';
import { useShallow } from 'zustand/shallow';
import GuestSearchDropdown from '../layout-maker/components/GuestAssignment/GuestSearchDropdown';
import { useGuestAssignment } from '../layout-maker/hooks/useGuestAssignment';

const WALLMAKER_PIXELS_PER_METER = 100;

// Zoom constants
const MIN_ZOOM = 10; // 10%
const MAX_ZOOM = 400; // 400%
const ZOOM_STEP = 1.2; // 20% per step
const DEFAULT_ZOOM = 100; // 100%

interface A4Dimensions {
  a4X: number;
  a4Y: number;
  a4WidthPx: number;
  a4HeightPx: number;
}

type SpaceShape = Shape & {
  spaceMetersWidth: number;
  spaceMetersHeight: number;
  pixelsPerMeter?: number;
};

type WallBounds = { minX: number; minY: number; maxX: number; maxY: number };

const isSpaceShape = (shape: Shape | undefined | null): shape is SpaceShape => {
  return !!shape &&
    shape.type === 'rectangle' &&
    typeof shape.spaceMetersWidth === 'number' &&
    shape.spaceMetersWidth > 0 &&
    typeof shape.spaceMetersHeight === 'number' &&
    shape.spaceMetersHeight > 0;
};

const getWallsBoundingBox = (wallsList: Wall[]): WallBounds | null => {
  if (!wallsList || wallsList.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  wallsList.forEach(wall => {
    minX = Math.min(minX, wall.startX, wall.endX);
    minY = Math.min(minY, wall.startY, wall.endY);
    maxX = Math.max(maxX, wall.startX, wall.endX);
    maxY = Math.max(maxY, wall.startY, wall.endY);
  });
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
};

const derivePxPerMeterFromWalls = (wallsList: Wall[]): number | null => {
  for (const wall of wallsList) {
    // First check if pxPerMeter is directly stored on the wall
    if (wall.pxPerMeter && wall.pxPerMeter > 0) {
      return wall.pxPerMeter;
    }
    // Fall back to calculating from original length
    const originalLengthPx = wall.originalLengthPx || wall.length;
    if (originalLengthPx && originalLengthPx > 0) {
      const originalMeters = originalLengthPx / WALLMAKER_PIXELS_PER_METER;
      if (originalMeters > 0) {
        const actualLengthPx = Math.sqrt(
          Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endY - wall.startY, 2)
        );
        if (actualLengthPx > 0) return actualLengthPx / originalMeters;
      }
    }
  }
  return null;
};

interface GridCanvasProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  projectId: string;
  a4Dimensions: A4Dimensions;
  brushSize?: number;
  brushColor?: string;
  eventId?: string;
}

const GridCanvasStore = forwardRef<{
  addSpace: (width: number, height: number) => void;
  addTable: (type: string, size: string, seats: number, imageUrl: string, targetSpaceId?: string) => void;
  addWalls: (walls: Wall[], doors?: Door[]) => void;
  zoomToPoints: (points: { x: number; y: number }[]) => void;
  getPowerPoints: () => PowerPoint[];
  getZoomLevel: () => number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToCanvas: () => void;
}, GridCanvasProps>(({
  activeTool,
  onToolChange,
  projectId,
  a4Dimensions: propA4Dimensions,
  brushSize = 2,
  brushColor = '#000000',
  eventId,
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store state - direct access with proper typing
  const a4Bounds = useCanvasStore((s) => s.a4Bounds);
  const viewBox = useCanvasStore((s) => s.viewBox);
  // Get elements - read directly to ensure fresh data after updates
  const storeState = useCanvasStore();
  const elements = useMemo(() => {
    return storeState.elementOrder.map((id) => storeState.elements[id]).filter(Boolean) as Shape[];
  }, [storeState.elementOrder, storeState.elements]);
  const walls = useCanvasStore(useShallow((s) => s.wallOrder.map((id) => s.walls[id]).filter(Boolean) as Wall[]));
  const doors = useCanvasStore(useShallow((s) => s.doorOrder.map((id) => s.doors[id]).filter(Boolean) as Door[]));
  const powerPoints = useCanvasStore(useShallow((s) => s.powerPointOrder.map((id) => s.powerPoints[id]).filter(Boolean) as PowerPoint[]));
  const drawings = useCanvasStore(useShallow((s) => s.drawingOrder.map((id) => s.drawings[id]).filter(Boolean) as DrawingPath[]));
  const textElements = useCanvasStore(useShallow((s) => s.textOrder.map((id) => s.textElements[id]).filter(Boolean) as TextElement[]));

  // Store actions - direct access
  const addElement = useCanvasStore((s) => s.addElement);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const moveElement = useCanvasStore((s) => s.moveElement);
  const deleteElement = useCanvasStore((s) => s.deleteElement);
  const setElements = useCanvasStore((s) => s.setElements);
  const addWall = useCanvasStore((s) => s.addWall);
  const setWalls = useCanvasStore((s) => s.setWalls);
  const addDoor = useCanvasStore((s) => s.addDoor);
  const addPowerPoint = useCanvasStore((s) => s.addPowerPoint);
  const updatePowerPoint = useCanvasStore((s) => s.updatePowerPoint);
  const deletePowerPoint = useCanvasStore((s) => s.deletePowerPoint);
  const addDrawing = useCanvasStore((s) => s.addDrawing);
  const updateDrawing = useCanvasStore((s) => s.updateDrawing);
  const setDrawings = useCanvasStore((s) => s.setDrawings);
  const addText = useCanvasStore((s) => s.addText);
  const setViewBox = useCanvasStore((s) => s.setViewBox);
  const recordSnapshot = useCanvasStore((s) => s.recordSnapshot);
  const setWallScale = useCanvasStore((s) => s.setWallScale);

  // Local UI state
  const [viewBoxState, setViewBoxState] = useState<ViewBox>(() => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const a4AspectRatio = 297 / 210;
    const targetWidth = screenWidth * 0.75;
    const targetHeight = screenHeight * 0.75;
    let a4WidthPx: number, a4HeightPx: number;
    if (targetWidth / targetHeight > a4AspectRatio) {
      a4HeightPx = targetHeight;
      a4WidthPx = a4HeightPx * a4AspectRatio;
    } else {
      a4WidthPx = targetWidth;
      a4HeightPx = a4WidthPx / a4AspectRatio;
    }
    const a4X = -a4WidthPx / 2;
    const a4Y = -a4HeightPx / 2;
    const viewBoxWidth = a4WidthPx / 0.75;
    const viewBoxHeight = a4HeightPx / 0.75;
    const centerX = a4X + a4WidthPx / 2;
    const centerY = a4Y + a4HeightPx / 2;
    return {
      x: centerX - viewBoxWidth / 2,
      y: centerY - viewBoxHeight / 2,
      width: viewBoxWidth,
      height: viewBoxHeight,
    };
  });

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedPowerPointId, setSelectedPowerPointId] = useState<string | null>(null);
  const [isElectricalDrawerOpen, setIsElectricalDrawerOpen] = useState(false);
  const [, forceUpdate] = useState(0); // Used to force re-render after rotation
  const selectedPowerPoint = powerPoints.find(p => p.id === selectedPowerPointId) || null;

  // Guest assignment state
  const [guestDropdownChairId, setGuestDropdownChairId] = useState<string | null>(null);
  const [guestDropdownPosition, setGuestDropdownPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const guestAssignment = useGuestAssignment(eventId);

  // Refs for drag operations
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<string>('');
  const currentPathIdRef = useRef<string>('');
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<SVGElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const currentSpaceRef = useRef<SpaceShape | null>(null);
  const wallScaleRef = useRef<{ pxPerMeter: number; bounds: WallBounds | null } | null>(null);
  const moveOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const movingPositionRef = useRef<{ x: number; y: number } | null>(null);
  const originalPositionRef = useRef<{ x: number; y: number } | null>(null);
  const selectedShapeIdRef = useRef<string | null>(null);
  const clipboardRef = useRef<Shape | null>(null);
  const initialViewBoxWidthRef = useRef<number>(viewBoxState.width);

  const gridSize = 20;
  const majorGridSize = 100;

  // Keep refs in sync
  useEffect(() => {
    selectedShapeIdRef.current = selectedShapeId;
  }, [selectedShapeId]);

  useEffect(() => {
    const spaces = elements.filter(isSpaceShape);
    currentSpaceRef.current = spaces.length > 0 ? spaces[spaces.length - 1]! : null;
  }, [elements]);

  useEffect(() => {
    if (walls.length > 0) {
      const derivedPpm = derivePxPerMeterFromWalls(walls);
      // Get current store value and ref value without causing re-render
      const currentStoreScale = useCanvasStore.getState().wallScale;
      const currentRefScale = wallScaleRef.current;

      // Prefer: derived > existing ref > existing store > default
      // Don't override a good ref value with the default
      const bestPpm = derivedPpm
        || (currentRefScale?.pxPerMeter && currentRefScale.pxPerMeter !== WALLMAKER_PIXELS_PER_METER ? currentRefScale.pxPerMeter : null)
        || currentStoreScale?.pxPerMeter
        || WALLMAKER_PIXELS_PER_METER;

      const scaleInfo = {
        pxPerMeter: bestPpm,
        bounds: getWallsBoundingBox(walls)
      };
      wallScaleRef.current = scaleInfo;
      // Only update store if we computed a valid scale or don't have one yet
      if (derivedPpm || !currentStoreScale) {
        setWallScale(scaleInfo);
      }
    } else {
      wallScaleRef.current = null;
      const currentStoreScale = useCanvasStore.getState().wallScale;
      if (currentStoreScale) {
        setWallScale(null);
      }
    }
  }, [walls, setWallScale]);

  useEffect(() => {
    if (activeTool !== 'hand' && activeTool !== 'select') {
      setSelectedShapeId(null);
      selectedShapeIdRef.current = null;
    }
  }, [activeTool]);

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputField = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      if (!isInputField && (e.key === 'Delete' || e.key === 'Backspace')) {
        const selId = selectedShapeIdRef.current;
        if (selId) {
          e.preventDefault();
          deleteElement(selId);
          selectedShapeIdRef.current = null;
          setSelectedShapeId(null);
        }
        return;
      }

      const isCmd = e.metaKey || e.ctrlKey;
      if (!isCmd) return;
      const key = e.key.toLowerCase();

      if (key === 'c') {
        const selId = selectedShapeIdRef.current;
        if (!selId) return;
        const shape = elements.find(s => s.id === selId);
        if (!shape) return;
        const copy: Shape = JSON.parse(JSON.stringify(shape));
        copy.id = '';
        clipboardRef.current = copy;
      } else if (key === 'v') {
        const clip = clipboardRef.current;
        if (!clip) return;
        e.preventDefault();
        const newElement: Omit<Shape, 'id'> = {
          ...JSON.parse(JSON.stringify(clip)),
          x: (clip.x || 0) + 20,
          y: (clip.y || 0) + 20,
        };
        const newId = addElement(newElement);
        setSelectedShapeId(newId);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [elements, addElement, deleteElement]);

  // Helper to check if point is on canvas
  const isPointOnCanvas = useCallback((x: number, y: number) => {
    const a4Left = propA4Dimensions.a4X;
    const a4Right = propA4Dimensions.a4X + propA4Dimensions.a4WidthPx;
    const a4Top = propA4Dimensions.a4Y;
    const a4Bottom = propA4Dimensions.a4Y + propA4Dimensions.a4HeightPx;
    return x >= a4Left && x <= a4Right && y >= a4Top && y <= a4Bottom;
  }, [propA4Dimensions]);

  const getViewBoxString = () => `${viewBoxState.x} ${viewBoxState.y} ${viewBoxState.width} ${viewBoxState.height}`;

  // Calculate current zoom level as percentage
  const getZoomLevel = useCallback(() => {
    const baseWidth = initialViewBoxWidthRef.current;
    if (baseWidth <= 0) return DEFAULT_ZOOM;
    return Math.round((baseWidth / viewBoxState.width) * 100);
  }, [viewBoxState.width]);

  // Zoom to a specific level (percentage)
  const zoomToLevel = useCallback((targetZoom: number, centerX?: number, centerY?: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
    const baseWidth = initialViewBoxWidthRef.current;
    const baseHeight = baseWidth * (viewBoxState.height / viewBoxState.width);
    const newWidth = baseWidth / (clampedZoom / 100);
    const newHeight = baseHeight / (clampedZoom / 100);

    setViewBoxState(prev => {
      const cx = centerX ?? (prev.x + prev.width / 2);
      const cy = centerY ?? (prev.y + prev.height / 2);
      return {
        x: cx - newWidth / 2,
        y: cy - newHeight / 2,
        width: newWidth,
        height: newHeight,
      };
    });
  }, [viewBoxState.width, viewBoxState.height]);

  // Zoom in by step
  const zoomIn = useCallback(() => {
    const currentZoom = getZoomLevel();
    const newZoom = Math.min(MAX_ZOOM, currentZoom * ZOOM_STEP);
    zoomToLevel(newZoom);
  }, [getZoomLevel, zoomToLevel]);

  // Zoom out by step
  const zoomOut = useCallback(() => {
    const currentZoom = getZoomLevel();
    const newZoom = Math.max(MIN_ZOOM, currentZoom / ZOOM_STEP);
    zoomToLevel(newZoom);
  }, [getZoomLevel, zoomToLevel]);

  // Reset zoom to 100%
  const resetZoom = useCallback(() => {
    zoomToLevel(DEFAULT_ZOOM);
  }, [zoomToLevel]);

  // Fit the A4 canvas in view
  const fitToCanvas = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const padding = 60;

    const a4Width = propA4Dimensions.a4WidthPx;
    const a4Height = propA4Dimensions.a4HeightPx;
    const a4CenterX = propA4Dimensions.a4X + a4Width / 2;
    const a4CenterY = propA4Dimensions.a4Y + a4Height / 2;

    const scaleX = (rect.width - padding * 2) / a4Width;
    const scaleY = (rect.height - padding * 2) / a4Height;
    const scale = Math.min(scaleX, scaleY);

    const newWidth = rect.width / scale;
    const newHeight = rect.height / scale;

    setViewBoxState({
      x: a4CenterX - newWidth / 2,
      y: a4CenterY - newHeight / 2,
      width: newWidth,
      height: newHeight,
    });
  }, [propA4Dimensions]);

  // Mouse handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Detect pinch-to-zoom (trackpad) or Ctrl+scroll
    const isPinchZoom = e.ctrlKey || e.metaKey || Math.abs(e.deltaY) < 50;

    if (isPinchZoom && e.deltaY !== 0) {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      // Get mouse position relative to SVG viewBox
      const mouseX = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
      const mouseY = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;

      // Smooth zoom factor based on delta
      const zoomIntensity = e.ctrlKey || e.metaKey ? 0.002 : 0.01;
      const scaleFactor = 1 - e.deltaY * zoomIntensity;

      setViewBoxState(prev => {
        const newWidth = prev.width / scaleFactor;
        const newHeight = prev.height / scaleFactor;

        // Check zoom limits
        const currentZoom = initialViewBoxWidthRef.current / prev.width * 100;
        const newZoom = currentZoom * scaleFactor;
        if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) {
          return prev;
        }

        // Zoom centered on mouse position
        const newX = mouseX - (mouseX - prev.x) / scaleFactor;
        const newY = mouseY - (mouseY - prev.y) / scaleFactor;

        return { x: newX, y: newY, width: newWidth, height: newHeight };
      });
    } else {
      // Pan with scroll
      const panSpeed = 1;
      setViewBoxState(prev => ({
        ...prev,
        x: prev.x + e.deltaX * panSpeed,
        y: prev.y + e.deltaY * panSpeed,
      }));
    }
  }, [viewBoxState]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
    const y = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;

    if (activeTool === 'hand' || e.button === 1) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (activeTool === 'pen' || activeTool === 'brush') {
      isDrawingRef.current = true;
      currentPathRef.current = `M ${x} ${y}`;
      const newId = addDrawing({ d: currentPathRef.current, stroke: brushColor, strokeWidth: brushSize });
      currentPathIdRef.current = newId;
      return;
    }

    if (activeTool === 'eraser') {
      const drawingsToKeep = drawings.filter(p => {
        const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tempPath.setAttribute('d', p.d);
        const bbox = tempPath.getBBox();
        return !(x >= bbox.x && x <= bbox.x + bbox.width && y >= bbox.y && y <= bbox.y + bbox.height);
      });
      setDrawings(drawingsToKeep);
      return;
    }

    if (activeTool === 'shape-rectangle' || activeTool === 'shape-circle') {
      isDrawingRef.current = true;
      shapeStartRef.current = { x, y };
      currentShapeRef.current = document.createElementNS('http://www.w3.org/2000/svg', activeTool === 'shape-rectangle' ? 'rect' : 'circle');
      if (currentShapeRef.current) {
        currentShapeRef.current.setAttribute('stroke', brushColor);
        currentShapeRef.current.setAttribute('stroke-width', String(brushSize));
        currentShapeRef.current.setAttribute('fill', 'transparent');
        svg.appendChild(currentShapeRef.current);
      }
      return;
    }

    if (activeTool === 'power-point') {
      if (!isPointOnCanvas(x, y)) return;
      const newPoint = createPowerPoint(x, y, 'EU_PT');
      addPowerPoint(newPoint);
      setSelectedPowerPointId(newPoint.id);
      setIsElectricalDrawerOpen(true);
      return;
    }

    if (activeTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        addText({ x, y, text, fontSize: 16, fill: brushColor });
      }
      return;
    }

    if (activeTool === 'select') {
      const clickedShape = [...elements].reverse().find(shape => {
        return x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height;
      });
      if (clickedShape) {
        setSelectedShapeId(clickedShape.id);
      } else {
        setSelectedShapeId(null);
      }
    }
  }, [activeTool, brushColor, brushSize, viewBoxState, elements, drawings, isPointOnCanvas, addDrawing, setDrawings, addPowerPoint, addText]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      // Capture rect BEFORE state update (React recycles synthetic events)
      const rect = e.currentTarget.getBoundingClientRect();
      setViewBoxState(prev => {
        const scaleX = prev.width / rect.width;
        const scaleY = prev.height / rect.height;
        return {
          ...prev,
          x: prev.x - dx * scaleX,
          y: prev.y - dy * scaleY,
        };
      });
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Handle element dragging with boundary enforcement
    if (!isDrawingRef.current && selectedShapeIdRef.current && moveOffsetRef.current) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
      const y = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;

      const rawX = x - moveOffsetRef.current.x;
      const rawY = y - moveOffsetRef.current.y;

      // Use store's moveElement which auto-clamps to A4 bounds
      moveElement(selectedShapeIdRef.current, rawX, rawY);
      movingPositionRef.current = { x: rawX, y: rawY };
      return;
    }

    if (!isDrawingRef.current) return;

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
    const y = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;

    if ((activeTool === 'pen' || activeTool === 'brush') && currentPathIdRef.current) {
      currentPathRef.current += ` L ${x} ${y}`;
      updateDrawing(currentPathIdRef.current, { d: currentPathRef.current });
    } else if (activeTool === 'shape-rectangle' && shapeStartRef.current && currentShapeRef.current) {
      const width = Math.abs(x - shapeStartRef.current.x);
      const height = Math.abs(y - shapeStartRef.current.y);
      const startX = Math.min(x, shapeStartRef.current.x);
      const startY = Math.min(y, shapeStartRef.current.y);
      currentShapeRef.current.setAttribute('x', String(startX));
      currentShapeRef.current.setAttribute('y', String(startY));
      currentShapeRef.current.setAttribute('width', String(width));
      currentShapeRef.current.setAttribute('height', String(height));
    } else if (activeTool === 'shape-circle' && shapeStartRef.current && currentShapeRef.current) {
      const radius = Math.sqrt(Math.pow(x - shapeStartRef.current.x, 2) + Math.pow(y - shapeStartRef.current.y, 2));
      currentShapeRef.current.setAttribute('cx', String(shapeStartRef.current.x));
      currentShapeRef.current.setAttribute('cy', String(shapeStartRef.current.y));
      currentShapeRef.current.setAttribute('r', String(radius));
    }
  }, [activeTool, viewBoxState, drawings, updateDrawing, moveElement]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (activeTool === 'pen' || activeTool === 'brush') {
        recordSnapshot('Draw path');
        currentPathIdRef.current = '';
      } else if ((activeTool === 'shape-rectangle' || activeTool === 'shape-circle') && currentShapeRef.current && shapeStartRef.current) {
        const svg = svgRef.current;
        if (svg) {
          svg.removeChild(currentShapeRef.current);
          const rect = svg.getBoundingClientRect();
          const x = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
          const y = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;
          const width = Math.abs(x - shapeStartRef.current.x);
          const height = Math.abs(y - shapeStartRef.current.y);
          if (width > 5 && height > 5) {
            const startX = Math.min(x, shapeStartRef.current.x);
            const startY = Math.min(y, shapeStartRef.current.y);
            addElement({
              type: activeTool === 'shape-rectangle' ? 'rectangle' : 'circle',
              x: startX,
              y: startY,
              width,
              height,
              fill: 'transparent',
              stroke: brushColor,
              strokeWidth: brushSize,
            });
            recordSnapshot('Add shape');
          }
        }
        currentShapeRef.current = null;
        shapeStartRef.current = null;
      }
      return;
    }

    if (selectedShapeIdRef.current) {
      if (movingPositionRef.current && originalPositionRef.current) {
        if (movingPositionRef.current.x !== originalPositionRef.current.x ||
            movingPositionRef.current.y !== originalPositionRef.current.y) {
          recordSnapshot('Move element');
        }
      }
      moveOffsetRef.current = null;
      movingPositionRef.current = null;
      originalPositionRef.current = null;
    }
  }, [activeTool, brushColor, brushSize, viewBoxState, recordSnapshot, addElement]);

  const handleMouseLeave = useCallback(() => {
    if (isDrawingRef.current) isDrawingRef.current = false;
    if (isPanningRef.current) isPanningRef.current = false;
  }, []);

  const handleShapeMouseDown = useCallback((e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    if (activeTool !== 'select') return;
    const shape = elements.find(s => s.id === shapeId);
    if (!shape) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
    const mouseY = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;

    // If this is a chair (has chairData), show guest assignment dropdown but DON'T allow dragging
    // Chairs are always attached to tables and move with them
    if (shape.chairData) {
      const shapeScreenX = ((shape.x - viewBoxState.x) / viewBoxState.width) * rect.width + rect.left;
      const shapeScreenY = ((shape.y - viewBoxState.y) / viewBoxState.height) * rect.height + rect.top;
      const shapeScreenWidth = (shape.width / viewBoxState.width) * rect.width;
      const shapeScreenHeight = (shape.height / viewBoxState.height) * rect.height;

      setGuestDropdownChairId(shapeId);
      setGuestDropdownPosition({
        x: shapeScreenX,
        y: shapeScreenY,
        width: shapeScreenWidth,
        height: shapeScreenHeight,
      });
      // Don't set up drag for chairs - they only move with their parent table
      return;
    }

    // For non-chair elements, set up normal drag behavior
    setSelectedShapeId(shapeId);
    moveOffsetRef.current = { x: mouseX - shape.x, y: mouseY - shape.y };
    originalPositionRef.current = { x: shape.x, y: shape.y };

    // Close dropdown if clicking non-chair
    setGuestDropdownChairId(null);
    setGuestDropdownPosition(null);
  }, [activeTool, elements, viewBoxState]);

  // Imperative API methods
  const addSpace = useCallback((widthMeters: number, heightMeters: number) => {
    const spaceAspectRatio = widthMeters / heightMeters;
    const padding = 40;
    const availableWidth = propA4Dimensions.a4WidthPx - padding * 2;
    const availableHeight = propA4Dimensions.a4HeightPx - padding * 2;
    const canvasAspectRatio = availableWidth / availableHeight;
    let widthPx: number, heightPx: number;
    if (spaceAspectRatio > canvasAspectRatio) {
      widthPx = availableWidth;
      heightPx = widthPx / spaceAspectRatio;
    } else {
      heightPx = availableHeight;
      widthPx = heightPx * spaceAspectRatio;
    }
    const centerX = propA4Dimensions.a4X + propA4Dimensions.a4WidthPx / 2;
    const centerY = propA4Dimensions.a4Y + propA4Dimensions.a4HeightPx / 2;
    const spaceX = centerX - widthPx / 2;
    const spaceY = centerY - heightPx / 2;

    const newSpace: Omit<Shape, 'id'> = {
      type: 'rectangle',
      x: spaceX,
      y: spaceY,
      width: widthPx,
      height: heightPx,
      fill: 'rgba(255, 255, 255, 0.9)',
      stroke: '#2c3e50',
      strokeWidth: 4,
      spaceMetersWidth: widthMeters,
      spaceMetersHeight: heightMeters,
      pixelsPerMeter: Math.min(widthPx / Math.max(0.0001, widthMeters), heightPx / Math.max(0.0001, heightMeters)),
    };

    // Remove existing spaces and their attached elements
    const existingSpaces = elements.filter(isSpaceShape);
    existingSpaces.forEach(space => {
      deleteElement(space.id);
      elements.filter(el => el.attachedSpaceId === space.id).forEach(el => {
        deleteElement(el.id);
      });
    });

    const spaceId = addElement(newSpace);
    recordSnapshot('Add space');

    // Update the ref for table placement
    const addedSpace = useCanvasStore.getState().elements[spaceId];
    if (addedSpace && isSpaceShape(addedSpace)) {
      currentSpaceRef.current = addedSpace;
    }
  }, [propA4Dimensions, elements, addElement, deleteElement, recordSnapshot]);

  const addTable = useCallback((type: string, size: string, seats: number, imageUrl: string, targetSpaceId?: string) => {
    const centerX = propA4Dimensions.a4X + propA4Dimensions.a4WidthPx / 2;
    const centerY = propA4Dimensions.a4Y + propA4Dimensions.a4HeightPx / 2;
    const img = new Image();
    img.onload = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      let tableWidth: number, tableHeight: number;
      if (naturalWidth >= naturalHeight) {
        tableWidth = 200;
        tableHeight = (naturalHeight / naturalWidth) * 200;
      } else {
        tableHeight = 200;
        tableWidth = (naturalWidth / naturalHeight) * 200;
      }

      let chosenSpace: SpaceShape | null = null;
      if (targetSpaceId) {
        const directMatch = elements.find(s => s.id === targetSpaceId);
        if (isSpaceShape(directMatch)) chosenSpace = directMatch;
      }
      if (!chosenSpace && currentSpaceRef.current) chosenSpace = currentSpaceRef.current;
      if (!chosenSpace) {
        for (let i = elements.length - 1; i >= 0; i--) {
          const s = elements[i];
          if (isSpaceShape(s)) {
            chosenSpace = s;
            break;
          }
        }
      }

      const parseSizeString = (s: string): { widthMeters: number; heightMeters: number } => {
        if (!s || typeof s !== 'string') return { widthMeters: 0, heightMeters: 0 };

        // Check if the string contains 'cm' to determine unit
        const isCentimeters = s.toLowerCase().includes('cm');

        // Normalize: lowercase, remove spaces, replace × with x, replace comma with dot
        let normalized = s.toLowerCase().replace(/\s+/g, '').replace('×', 'x').replace(',', '.');
        // Remove unit suffixes (cm, m)
        normalized = normalized.replace(/cm/g, '').replace(/m/g, '');

        const parts = normalized.split('x').map(p => parseFloat(p)).filter(n => !isNaN(n));

        // Convert to meters if input was in centimeters
        const toMeters = (val: number) => isCentimeters ? val / 100 : val;

        if (parts.length === 2) return { widthMeters: toMeters(parts[0] ?? 0), heightMeters: toMeters(parts[1] ?? 0) };
        if (parts.length === 1) return { widthMeters: toMeters(parts[0] ?? 0), heightMeters: 0 };
        return { widthMeters: 0, heightMeters: 0 };
      };

      const { widthMeters: parsedWidthMeters, heightMeters: parsedHeightMeters } = parseSizeString(String(size));
      const presetToMeters: Record<string, number> = { small: 0.6, medium: 1.2, large: 1.8 };
      let presetMeters = 0;
      if (typeof size === 'string') {
        const lower = size.toLowerCase();
        if (presetToMeters[lower] !== undefined) presetMeters = presetToMeters[lower];
      }
      const widthMeters = parsedWidthMeters > 0 ? parsedWidthMeters : (presetMeters > 0 ? presetMeters : 0);
      const heightMeters = parsedHeightMeters > 0 ? parsedHeightMeters : 0;

      // Get current walls from store to derive pxPerMeter if needed
      const storeState = useCanvasStore.getState();
      const currentWalls = storeState.wallOrder.map((id) => storeState.walls[id]).filter(Boolean) as Wall[];
      const derivedFromWalls = currentWalls.length > 0 ? derivePxPerMeterFromWalls(currentWalls) : null;
      const wallPpm = wallScaleRef.current?.pxPerMeter || derivedFromWalls;

      console.log('[addTable] scale info:', {
        wallScaleRefPpm: wallScaleRef.current?.pxPerMeter,
        derivedFromWalls,
        wallPpm,
        wallCount: currentWalls.length,
        firstWallPpm: (currentWalls[0] as any)?.pxPerMeter,
        widthMeters,
        heightMeters,
        chosenSpace: chosenSpace?.id,
      });

      if ((chosenSpace || wallPpm) && (widthMeters > 0 || heightMeters > 0)) {
        const ppm = chosenSpace
          ? (chosenSpace.pixelsPerMeter || Math.min(chosenSpace.width / Math.max(0.0001, chosenSpace.spaceMetersWidth), chosenSpace.height / Math.max(0.0001, chosenSpace.spaceMetersHeight)))
          : wallPpm!;
        console.log('[addTable] using ppm:', ppm, 'for table size:', widthMeters, 'x', heightMeters, '=', widthMeters * ppm, 'x', heightMeters * ppm, 'px');
        if (ppm && ppm > 0) {
          const resolvedWidthMeters = widthMeters > 0 ? widthMeters : (heightMeters > 0 ? heightMeters : 0);
          const resolvedHeightMeters = heightMeters > 0 ? heightMeters : (widthMeters > 0 ? widthMeters : 0);
          let finalWidthPx = resolvedWidthMeters * ppm;
          let finalHeightPx = resolvedHeightMeters * ppm;
          if (type === 'round' && parsedHeightMeters === 0) finalHeightPx = finalWidthPx;

          let tableX: number, tableY: number;
          if (chosenSpace) {
            tableX = chosenSpace.x + (chosenSpace.width / 2) - finalWidthPx / 2;
            tableY = chosenSpace.y + (chosenSpace.height / 2) - finalHeightPx / 2;
          } else if (wallScaleRef.current?.bounds) {
            const { minX, maxX, minY, maxY } = wallScaleRef.current.bounds;
            tableX = (minX + maxX) / 2 - finalWidthPx / 2;
            tableY = (minY + maxY) / 2 - finalHeightPx / 2;
          } else {
            tableX = centerX - finalWidthPx / 2;
            tableY = centerY - finalHeightPx / 2;
          }

          addElement({
            type: imageUrl ? 'image' : (type === 'round' ? 'circle' : 'rectangle'),
            x: tableX,
            y: tableY,
            width: finalWidthPx,
            height: finalHeightPx,
            fill: 'transparent',
            stroke: 'transparent',
            strokeWidth: 0,
            imageUrl: imageUrl,
            imageNaturalWidth: naturalWidth,
            imageNaturalHeight: naturalHeight,
            attachedSpaceId: chosenSpace ? chosenSpace.id : '__wall_layout__',
            tableData: { type, size, seats, actualSizeMeters: resolvedWidthMeters || presetMeters },
          });
          recordSnapshot('Add table');
          return;
        }
      }

      const tableX = centerX - tableWidth / 2;
      const tableY = centerY - tableHeight / 2;
      const newTable: Omit<Shape, 'id'> = {
        type: imageUrl ? 'image' : (type === 'round' ? 'circle' : 'rectangle'),
        x: tableX,
        y: tableY,
        width: tableWidth,
        height: tableHeight,
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        imageUrl: imageUrl,
        imageNaturalWidth: naturalWidth,
        imageNaturalHeight: naturalHeight,
        tableData: { type, size, seats, actualSizeMeters: 0 },
      };
      if (chosenSpace?.id) {
        newTable.attachedSpaceId = chosenSpace.id;
      }
      addElement(newTable);
      recordSnapshot('Add table');
    };
    img.onerror = () => console.error('Failed to load image:', imageUrl);
    img.src = imageUrl;
  }, [propA4Dimensions, elements, addElement, deleteElement, recordSnapshot]);

  const zoomToPoints = useCallback((points: { x: number; y: number }[]) => {
    if (points.length === 0) return;
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    const padding = Math.max(propA4Dimensions.a4WidthPx * 0.3, propA4Dimensions.a4HeightPx * 0.3, 400);
    const boxWidth = Math.max(maxX - minX + padding * 2, propA4Dimensions.a4WidthPx);
    const boxHeight = Math.max(maxY - minY + padding * 2, propA4Dimensions.a4HeightPx);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setViewBoxState({
      x: centerX - boxWidth / 2,
      y: centerY - boxHeight / 2,
      width: boxWidth,
      height: boxHeight,
    });
  }, [propA4Dimensions]);

  const addWalls = useCallback((newWalls: Wall[], newDoors: Door[] = []) => {
    if (newWalls.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    newWalls.forEach(wall => {
      minX = Math.min(minX, wall.startX, wall.endX);
      minY = Math.min(minY, wall.startY, wall.endY);
      maxX = Math.max(maxX, wall.startX, wall.endX);
      maxY = Math.max(maxY, wall.startY, wall.endY);
    });
    const wallLayoutWidth = maxX - minX;
    const wallLayoutHeight = maxY - minY;
    const effectiveWidth = wallLayoutWidth > 0 ? wallLayoutWidth : 100;
    const effectiveHeight = wallLayoutHeight > 0 ? wallLayoutHeight : 100;
    const wallAspectRatio = effectiveWidth / effectiveHeight;
    const padding = 40;
    const availableWidth = propA4Dimensions.a4WidthPx - padding * 2;
    const availableHeight = propA4Dimensions.a4HeightPx - padding * 2;
    const canvasAspectRatio = availableWidth / availableHeight;
    let uniformScale: number;
    if (wallAspectRatio > canvasAspectRatio) {
      uniformScale = availableWidth / effectiveWidth;
    } else {
      uniformScale = availableHeight / effectiveHeight;
    }
    const layoutCenterX = (minX + maxX) / 2;
    const layoutCenterY = (minY + maxY) / 2;
    const canvasCenterX = propA4Dimensions.a4X + propA4Dimensions.a4WidthPx / 2;
    const canvasCenterY = propA4Dimensions.a4Y + propA4Dimensions.a4HeightPx / 2;

    const computedPpm = uniformScale * WALLMAKER_PIXELS_PER_METER;
    const scaledWalls: Wall[] = newWalls.map(wall => {
      const translatedStartX = wall.startX - layoutCenterX;
      const translatedStartY = wall.startY - layoutCenterY;
      const translatedEndX = wall.endX - layoutCenterX;
      const translatedEndY = wall.endY - layoutCenterY;
      // Calculate original length if not set
      const origLength = wall.length || Math.sqrt(
        Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endY - wall.startY, 2)
      );
      return {
        ...wall,
        startX: translatedStartX * uniformScale + canvasCenterX,
        startY: translatedStartY * uniformScale + canvasCenterY,
        endX: translatedEndX * uniformScale + canvasCenterX,
        endY: translatedEndY * uniformScale + canvasCenterY,
        thickness: wall.thickness * uniformScale,
        originalLengthPx: origLength, // Store original length for derivation
        pxPerMeter: computedPpm, // Store computed scale on each wall
      };
    });

    const scaledBounds = getWallsBoundingBox(scaledWalls);
    const computedWallScale = { pxPerMeter: computedPpm, bounds: scaledBounds };
    wallScaleRef.current = computedWallScale;
    setWallScale(computedWallScale);
    console.log('[addWalls] computed scale:', {
      originalWallSize: { width: wallLayoutWidth, height: wallLayoutHeight },
      uniformScale,
      computedPpm,
      scaledBounds,
      firstWallPpm: scaledWalls[0]?.pxPerMeter,
    });

    const scaledDoors: Door[] = newDoors.map(door => ({
      ...door,
      id: `door-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      width: door.width * uniformScale
    }));

    setWalls([...walls, ...scaledWalls], [...doors, ...scaledDoors]);
    recordSnapshot('Add walls');
    zoomToPoints(scaledWalls.flatMap(w => [{ x: w.startX, y: w.startY }, { x: w.endX, y: w.endY }]));
  }, [propA4Dimensions, walls, doors, setWalls, recordSnapshot, zoomToPoints]);

  const getPowerPoints = useCallback(() => [...powerPoints], [powerPoints]);

  useImperativeHandle(ref, () => ({
    addSpace,
    addTable,
    addWalls,
    zoomToPoints,
    getPowerPoints,
    getZoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToCanvas,
  }), [addSpace, addTable, addWalls, zoomToPoints, getPowerPoints, getZoomLevel, zoomIn, zoomOut, resetZoom, fitToCanvas]);

  // Prevent default wheel zoom
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    window.addEventListener('wheel', handleGlobalWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', handleGlobalWheel, { capture: true });
  }, []);

  // Guest assignment handlers
  const handleCloseGuestDropdown = useCallback(() => {
    setGuestDropdownChairId(null);
    setGuestDropdownPosition(null);
  }, []);

  const handleAssignGuest = useCallback((guestId: string) => {
    if (guestDropdownChairId) {
      const guest = guestAssignment.guests.find(g => g.id === guestId);
      if (!guest) return;

      // If guest is already assigned elsewhere, unassign from that chair first
      const existingChairId = guestAssignment.getChairForGuest(guestId);
      if (existingChairId && existingChairId !== guestDropdownChairId) {
        const existingChair = elements.find(e => e.id === existingChairId);
        if (existingChair?.chairData) {
          updateElement(existingChairId, {
            fill: '#fff',
            stroke: '#888',
            chairData: {
              ...existingChair.chairData,
              assignedGuestId: null,
              assignedGuestName: null,
              dietaryType: null,
            },
          });
        }
      }

      // Assign guest to the new chair with visual styling
      const chair = elements.find(e => e.id === guestDropdownChairId);
      if (chair?.chairData) {
        updateElement(guestDropdownChairId, {
          fill: '#4A90D9',
          stroke: '#2563EB',
          chairData: {
            ...chair.chairData,
            assignedGuestId: guest.id,
            assignedGuestName: `${guest.firstName} ${guest.lastName}`,
            dietaryType: guest.dietaryType,
          },
        });
      }

      handleCloseGuestDropdown();
    }
  }, [guestDropdownChairId, guestAssignment, updateElement, elements, handleCloseGuestDropdown]);

  const handleUnassignGuest = useCallback(() => {
    if (guestDropdownChairId) {
      const chair = elements.find(e => e.id === guestDropdownChairId);
      if (chair?.chairData) {
        updateElement(guestDropdownChairId, {
          fill: '#fff',
          stroke: '#888',
          chairData: {
            ...chair.chairData,
            assignedGuestId: null,
            assignedGuestName: null,
            dietaryType: null,
          },
        });
      }
      handleCloseGuestDropdown();
    }
  }, [guestDropdownChairId, elements, updateElement, handleCloseGuestDropdown]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', background: 'transparent', zIndex: 5 }}>
      <svg
        ref={svgRef}
        viewBox={getViewBoxString()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ width: '100%', height: '100%', touchAction: 'none', cursor: activeTool === 'hand' ? 'grab' : (activeTool === 'select' ? 'default' : (activeTool === 'brush' || activeTool === 'pen' ? 'crosshair' : 'crosshair')) }}
      >
        <defs>
          <pattern id="grid" x="0" y="0" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#f0f0f0" strokeWidth={0.5} />
          </pattern>
          <pattern id="grid-major" x="0" y="0" width={majorGridSize} height={majorGridSize} patternUnits="userSpaceOnUse">
            <rect width={majorGridSize} height={majorGridSize} fill="url(#grid)" />
            <path d={`M ${majorGridSize} 0 L 0 0 0 ${majorGridSize}`} fill="none" stroke="#e0e0e0" strokeWidth={1} />
          </pattern>
          <clipPath id="a4-clip">
            <rect x={propA4Dimensions.a4X} y={propA4Dimensions.a4Y} width={propA4Dimensions.a4WidthPx} height={propA4Dimensions.a4HeightPx} />
          </clipPath>
        </defs>

        {/* Grid background - large enough to cover any pan position */}
        <rect x={-10000} y={-10000} width={20000} height={20000} fill="url(#grid-major)" />
        <rect
          x={propA4Dimensions.a4X}
          y={propA4Dimensions.a4Y}
          width={propA4Dimensions.a4WidthPx}
          height={propA4Dimensions.a4HeightPx}
          fill="white"
          stroke="#cccccc"
          strokeWidth={1}
        />

        <g clipPath="url(#a4-clip)">
          {walls.map((wall) => {
            const dx = wall.endX - wall.startX;
            const dy = wall.endY - wall.startY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            return (
              <g key={wall.id}>
                <rect x={wall.startX - wall.thickness / 2} y={wall.startY - wall.thickness / 2} width={length + wall.thickness} height={wall.thickness} fill="#2c3e50" transform={`rotate(${angle}, ${wall.startX}, ${wall.startY})`} />
              </g>
            );
          })}
          {doors.map((door) => {
            const wall = walls.find(w => w.id === door.wallId);
            if (!wall) return null;
            const dx = wall.endX - wall.startX;
            const dy = wall.endY - wall.startY;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const doorCenterX = wall.startX + dx * door.position;
            const doorCenterY = wall.startY + dy * door.position;
            return (
              <g key={door.id}>
                <rect x={doorCenterX - door.width / 2} y={doorCenterY - 3} width={door.width} height={6} fill="#8b5a2b" transform={`rotate(${angle}, ${doorCenterX}, ${doorCenterY})`} />
              </g>
            );
          })}
          {drawings.map((path) => (
            <path key={path.id} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {elements.map((shape) => {
            // Custom shapes with SVG path
            if (shape.customShape) {
              // The path is in meters centered at (0,0)
              // We need to: 1) translate to position, 2) scale from meters to pixels
              const scale = shape.customShapeScale || 100; // PIXELS_PER_METER
              const centerX = shape.x + shape.width / 2;
              const centerY = shape.y + shape.height / 2;

              return (
                <g
                  key={shape.id}
                  transform={`translate(${centerX}, ${centerY}) rotate(${shape.rotation || 0}) scale(${scale})`}
                  style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                >
                  <path
                    d={shape.customShape}
                    fill={shape.fill || '#ffffff'}
                    stroke={selectedShapeId === shape.id ? '#3b82f6' : (shape.stroke || '#374151')}
                    strokeWidth={(selectedShapeId === shape.id ? 2 : (shape.strokeWidth || 1.5)) / scale}
                  />
                </g>
              );
            }
            // Calculate rotation transform for all shapes
            const centerX = shape.x + shape.width / 2;
            const centerY = shape.y + shape.height / 2;
            const rotation = shape.rotation || 0;
            const rotationTransform = rotation ? `rotate(${rotation}, ${centerX}, ${centerY})` : undefined;

            // Debug: log rotation for selected shape
            if (shape.id === selectedShapeId && rotation > 0) {
              console.log('[Render] Shape rotation:', shape.id, rotation, 'transform:', rotationTransform);
            }

            if (shape.type === 'image' && shape.imageUrl) {
              return (
                <g key={shape.id} transform={rotationTransform}>
                  <image
                    href={shape.imageUrl}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    preserveAspectRatio="none"
                    style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                    onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  />
                  {/* Selection border for images */}
                  {selectedShapeId === shape.id && (
                    <rect
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                    />
                  )}
                </g>
              );
            }
            if (shape.type === 'circle') {
              return (
                <g key={shape.id} transform={rotationTransform}>
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={shape.width / 2}
                    fill={shape.fill}
                    stroke={selectedShapeId === shape.id ? '#3b82f6' : shape.stroke}
                    strokeWidth={selectedShapeId === shape.id ? 2 : shape.strokeWidth}
                    style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                    onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  />
                </g>
              );
            }
            if (shape.tableData?.type === 'table-oval') {
              return (
                <g key={shape.id} transform={rotationTransform}>
                  <ellipse
                    cx={centerX}
                    cy={centerY}
                    rx={shape.width / 2}
                    ry={shape.height / 2}
                    fill={shape.fill}
                    stroke={selectedShapeId === shape.id ? '#3b82f6' : shape.stroke}
                    strokeWidth={selectedShapeId === shape.id ? 2 : shape.strokeWidth}
                    style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                    onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  />
                </g>
              );
            }
            return (
              <g key={shape.id} transform={rotationTransform}>
                <rect
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill={shape.fill}
                  stroke={selectedShapeId === shape.id ? '#3b82f6' : shape.stroke}
                  strokeWidth={selectedShapeId === shape.id ? 2 : shape.strokeWidth}
                  style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                />
              </g>
            );
          })}
          {textElements.map((el) => (
            <text key={el.id} x={el.x} y={el.y} fontSize={el.fontSize} fill={el.fill}>{el.text}</text>
          ))}
          {powerPoints.map((point) => (
            <ElectricalIcon
              key={point.id}
              x={point.x}
              y={point.y}
              isSelected={selectedPowerPointId === point.id}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setSelectedPowerPointId(point.id);
                setIsElectricalDrawerOpen(true);
              }}
            />
          ))}
        </g>
      </svg>
      <ElectricalDrawer
        isOpen={isElectricalDrawerOpen}
        onClose={() => {
          setIsElectricalDrawerOpen(false);
          setTimeout(() => setSelectedPowerPointId(null), 300);
        }}
        powerPoint={selectedPowerPoint}
        onUpdate={(updated: PowerPoint) => {
          updatePowerPoint(updated.id, updated);
        }}
        onDelete={(id: string) => {
          deletePowerPoint(id);
          setIsElectricalDrawerOpen(false);
          setTimeout(() => setSelectedPowerPointId(null), 300);
        }}
      />

      {/* Guest Assignment Dropdown for chairs */}
      {guestDropdownChairId && guestDropdownPosition && (
        <GuestSearchDropdown
          chairId={guestDropdownChairId}
          chairPosition={guestDropdownPosition}
          unassignedGuests={guestAssignment.unassignedGuests}
          assignedGuests={guestAssignment.assignedGuests}
          currentlyAssignedGuest={guestAssignment.getGuestForChair(guestDropdownChairId)}
          isLoading={guestAssignment.isLoading}
          onAssign={handleAssignGuest}
          onUnassign={handleUnassignGuest}
          onClose={handleCloseGuestDropdown}
        />
      )}

      {/* Rotate Button - appears when element is selected */}
      {selectedShapeId && activeTool === 'select' && (() => {
        const selectedShape = elements.find(e => e.id === selectedShapeId);
        if (!selectedShape || selectedShape.chairData) return null; // Don't show for chairs

        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();

        // Convert shape center to screen coordinates
        const shapeCenterX = selectedShape.x + selectedShape.width / 2;
        const shapeCenterY = selectedShape.y + selectedShape.height / 2;
        const screenX = rect.left + ((shapeCenterX - viewBoxState.x) / viewBoxState.width) * rect.width;
        const screenY = rect.top + ((shapeCenterY - viewBoxState.y) / viewBoxState.height) * rect.height;

        // Position button above the element
        const buttonY = rect.top + ((selectedShape.y - viewBoxState.y) / viewBoxState.height) * rect.height - 50;

        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Get fresh data from store
              const store = useCanvasStore.getState();
              const storeElement = store.elements[selectedShapeId];
              if (!storeElement) return;

              const currentRotation = storeElement.rotation || 0;
              const newRotation = (currentRotation + 90) % 360;
              console.log('[RotateButton] Rotating element:', selectedShapeId, 'from', currentRotation, 'to', newRotation);

              // Update the main element's rotation
              updateElement(selectedShapeId, { rotation: newRotation });

              // If this is a table with chairs, rotate the chairs around the table center
              if (storeElement.tableData) {
                const tableCenterX = storeElement.x + storeElement.width / 2;
                const tableCenterY = storeElement.y + storeElement.height / 2;

                // Find all chairs attached to this table
                const attachedChairs = Object.values(store.elements).filter(
                  (el) => el.chairData?.parentTableId === selectedShapeId
                );

                // Rotate each chair 90 degrees around the table center
                attachedChairs.forEach((chair) => {
                  const chairCenterX = chair.x + chair.width / 2;
                  const chairCenterY = chair.y + chair.height / 2;

                  // Translate to origin (table center)
                  const relX = chairCenterX - tableCenterX;
                  const relY = chairCenterY - tableCenterY;

                  // Rotate 90 degrees clockwise: (x, y) -> (y, -x)
                  const rotatedX = relY;
                  const rotatedY = -relX;

                  // Translate back and adjust for chair size
                  const newChairX = tableCenterX + rotatedX - chair.width / 2;
                  const newChairY = tableCenterY + rotatedY - chair.height / 2;

                  // Update chair position and rotation
                  const chairRotation = (chair.rotation || 0) + 90;
                  updateElement(chair.id, {
                    x: newChairX,
                    y: newChairY,
                    rotation: chairRotation % 360,
                  });
                });

                console.log('[RotateButton] Rotated', attachedChairs.length, 'chairs with table');
              }

              // Force re-render to show updated rotation
              forceUpdate(n => n + 1);
            }}
            style={{
              position: 'fixed',
              left: screenX,
              top: Math.max(buttonY, rect.top + 10),
              transform: 'translateX(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'white',
              border: '2px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3b82f6';
              e.currentTarget.style.borderColor = '#3b82f6';
              const svg = e.currentTarget.querySelector('svg');
              if (svg) svg.style.stroke = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e5e7eb';
              const svg = e.currentTarget.querySelector('svg');
              if (svg) svg.style.stroke = '#6b7280';
            }}
            title="Rotate 90°"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'stroke 0.15s ease' }}
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        );
      })()}
    </div>
  );
});

GridCanvasStore.displayName = 'GridCanvasStore';

export default GridCanvasStore;
