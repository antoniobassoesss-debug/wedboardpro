import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import type { Wall, Door } from './types/wall.js';
import type { PowerPoint } from './types/powerPoint.js';
import type { ElectricalStandard } from './types/electrical.js';
import { createPowerPoint } from './types/powerPoint.js';
import ElectricalIcon from './components/ElectricalIcon.js';
import ElectricalDrawer from './components/ElectricalDrawer.js';

const WALLMAKER_PIXELS_PER_METER = 100;

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DrawingPath {
  id: string;
  d: string;
  stroke: string;
  strokeWidth: number;
}

interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  imageUrl?: string;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  tableData?: {
    type: string;
    size: string;
    seats: number;
    actualSizeMeters: number;
  };
  text?: string;
  spaceMetersWidth?: number;
  spaceMetersHeight?: number;
  pixelsPerMeter?: number;
  attachedSpaceId?: string | undefined;
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
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  wallsList.forEach(wall => {
    minX = Math.min(minX, wall.startX, wall.endX);
    minY = Math.min(minY, wall.startY, wall.endY);
    maxX = Math.max(maxX, wall.startX, wall.endX);
    maxY = Math.max(maxY, wall.startY, wall.endY);
  });

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
};

const derivePxPerMeterFromWalls = (wallsList: Wall[]): number | null => {
  // Try to find a wall with pxPerMeter or length info to derive scale
  for (const wall of wallsList) {
    // First check if pxPerMeter is directly stored on the wall
    if ((wall as any).pxPerMeter && (wall as any).pxPerMeter > 0) {
      return (wall as any).pxPerMeter;
    }
    // Fall back to calculating from original length
    const originalLengthPx = (wall as any).originalLengthPx || wall.length;
    if (originalLengthPx && originalLengthPx > 0) {
      const originalMeters = originalLengthPx / WALLMAKER_PIXELS_PER_METER;
      if (originalMeters > 0) {
        const actualLengthPx = Math.sqrt(
          Math.pow(wall.endX - wall.startX, 2) +
          Math.pow(wall.endY - wall.startY, 2)
        );
        if (actualLengthPx > 0) {
          const ppm = actualLengthPx / originalMeters;
          console.log('[derivePxPerMeterFromWalls] computed from wall.length:', {
            originalLengthPx,
            originalMeters,
            actualLengthPx,
            ppm
          });
          return ppm;
        }
      }
    }
  }

  // No wall.length property - cannot reliably compute scale
  // Return null to indicate we should use wallScaleRef if available
  console.log('[derivePxPerMeterFromWalls] no wall.length found, returning null');
  return null;
};

const computeWallScaleFromWalls = (wallsList: Wall[]): { pxPerMeter: number; bounds: WallBounds } | null => {
  const bounds = getWallsBoundingBox(wallsList);
  if (!bounds) return null;
  const pxPerMeter = derivePxPerMeterFromWalls(wallsList);
  if (!pxPerMeter) return null;
  return { pxPerMeter, bounds };
};

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fill: string;
}

interface A4Dimensions {
  a4X: number;
  a4Y: number;
  a4WidthPx: number;
  a4HeightPx: number;
}

interface GridCanvasProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  projectId: string;
  projectData: {
    drawings: DrawingPath[];
    shapes: Shape[];
    textElements: TextElement[];
    walls: Wall[];
    doors: Door[];
    powerPoints: PowerPoint[];
    viewBox: ViewBox;
  };
  a4Dimensions: A4Dimensions;
  onDataChange: (data: GridCanvasProps['projectData'], projectId: string) => void;
  brushSize?: number;
  brushColor?: string;
}

// Zoom constants
const MIN_ZOOM = 10; // 10%
const MAX_ZOOM = 400; // 400%
const ZOOM_STEP = 1.2; // 20% per step
const DEFAULT_ZOOM = 100; // 100%

const GridCanvas = forwardRef<{
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
  projectData,
  a4Dimensions: propA4Dimensions,
  onDataChange,
  brushSize = 2,
  brushColor = '#000000'
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [a4Dimensions] = useState<A4Dimensions>(propA4Dimensions || {
    a4X: 0,
    a4Y: 0,
    a4WidthPx: 800,
    a4HeightPx: 600,
  });
  
  const [drawings, setDrawings] = useState<DrawingPath[]>(projectData.drawings || []);
  const [shapes, setShapes] = useState<Shape[]>(projectData.shapes || []);
  const [textElements, setTextElements] = useState<TextElement[]>(projectData.textElements || []);
  const [walls, setWalls] = useState<Wall[]>(projectData.walls || []);
  const [doors, setDoors] = useState<Door[]>(projectData.doors || []);
  const [powerPoints, setPowerPoints] = useState<PowerPoint[]>(projectData.powerPoints || []);
  const [viewBox, setViewBox] = useState<ViewBox>(projectData.viewBox || { x: 0, y: 0, width: 1000, height: 1000 });
  
  const [selectedPowerPointId, setSelectedPowerPointId] = useState<string | null>(null);
  const [isElectricalDrawerOpen, setIsElectricalDrawerOpen] = useState(false);
  const selectedPowerPoint = powerPoints.find(p => p.id === selectedPowerPointId) || null;
  
  const [viewBoxState, setViewBoxState] = useState<ViewBox>(() => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const a4AspectRatio = 297 / 210;
    const targetWidth = screenWidth * 0.75;
    const targetHeight = screenHeight * 0.75;
    let a4WidthPx: number;
    let a4HeightPx: number;
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
  
  const [undoStack, setUndoStack] = useState<{drawings: DrawingPath[], shapes: Shape[], textElements: TextElement[], walls: Wall[], doors: Door[]}[]>([]);
  const [redoStack, setRedoStack] = useState<{drawings: DrawingPath[], shapes: Shape[], textElements: TextElement[], walls: Wall[], doors: Door[]}[]>([]);
  
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<string>('');
  const currentPathIdRef = useRef<string>('');
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<SVGElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const gridSize = 20;
  const majorGridSize = 100;

  const currentSpaceRef = useRef<SpaceShape | null>(null);
  const wallScaleRef = useRef<{ pxPerMeter: number; bounds: WallBounds | null } | null>(null);
  const movingShapeIdRef = useRef<string | null>(null);
  const moveOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const movingPositionRef = useRef<{ x: number; y: number } | null>(null);
  const originalPositionRef = useRef<{ x: number; y: number } | null>(null);
  const saveStateRef = useRef<(() => void) | null>(null);
  const selectedShapeIdRef = useRef<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shapeId: string | null } | null>(null);
  const clipboardRef = useRef<Shape | null>(null);
  const viewBoxRef = useRef(viewBox);
  const initialViewBoxWidthRef = useRef<number>(viewBoxState.width);
  
  useEffect(() => {
    const spaces = shapes.filter(isSpaceShape);
    currentSpaceRef.current = spaces.length > 0 ? spaces[spaces.length - 1]! : null;
  }, [shapes]);
  
  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);

  useEffect(() => {
    const scaleInfo = computeWallScaleFromWalls(walls);
    // Only update if we computed a valid scale, don't overwrite with null
    // addWalls sets the ref directly with the correct computed scale
    if (scaleInfo) {
      console.log('[useEffect walls] updating wallScaleRef:', scaleInfo);
      wallScaleRef.current = scaleInfo;
    } else if (walls.length === 0) {
      // Only clear if there are no walls
      console.log('[useEffect walls] clearing wallScaleRef (no walls)');
      wallScaleRef.current = null;
    } else {
      console.log('[useEffect walls] keeping existing wallScaleRef:', wallScaleRef.current);
    }
  }, [walls]);

  const currentData = useMemo(() => ({
    drawings,
    shapes,
    textElements,
    walls,
    doors,
    powerPoints,
    viewBox,
  }), [drawings, shapes, textElements, walls, doors, powerPoints, viewBox]);

  useEffect(() => {
    onDataChange(currentData, projectId);
  }, [currentData, projectId, onDataChange]);

  useEffect(() => {
    if (activeTool !== 'hand') {
      setSelectedShapeId(null);
      selectedShapeIdRef.current = null;
    }
  }, [activeTool]);
  useEffect(() => { selectedShapeIdRef.current = selectedShapeId; }, [selectedShapeId]);

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
          setShapes(prev => prev.filter(s => s.id !== selId));
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
        const shape = shapes.find(s => s.id === selId);
        if (!shape) return;
        const copy: Shape = JSON.parse(JSON.stringify(shape));
        copy.id = '';
        clipboardRef.current = copy;
      } else if (key === 'v') {
        const clip = clipboardRef.current;
        if (!clip) return;
        e.preventDefault();
        const newId = `shape-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        const newShape: Shape = {
          ...JSON.parse(JSON.stringify(clip)),
          id: newId,
          x: (clip.x || 0) + 20,
          y: (clip.y || 0) + 20,
        };
        setShapes(prev => [...prev, newShape]);
        setSelectedShapeId(newId);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shapes]);

  useEffect(() => {
    movingShapeIdRef.current = null;
    moveOffsetRef.current = null;
  }, []);

  const saveState = useCallback(() => {
    const currentState = { drawings: [...drawings], shapes: [...shapes], textElements: [...textElements], walls: [...walls], doors: [...doors] };
    setUndoStack(prev => [...prev, currentState]);
    setRedoStack([]);
  }, [drawings, shapes, textElements, walls, doors]);
  useEffect(() => { saveStateRef.current = saveState; }, [saveState]);

  const getViewBoxString = () => `${viewBoxState.x} ${viewBoxState.y} ${viewBoxState.width} ${viewBoxState.height}`;

  const isPointOnCanvas = useCallback((x: number, y: number) => {
    const a4Left = a4Dimensions.a4X;
    const a4Right = a4Dimensions.a4X + a4Dimensions.a4WidthPx;
    const a4Top = a4Dimensions.a4Y;
    const a4Bottom = a4Dimensions.a4Y + a4Dimensions.a4HeightPx;
    return x >= a4Left && x <= a4Right && y >= a4Top && y <= a4Bottom;
  }, [a4Dimensions]);

  const drawCanvas = useCallback(() => {
    if (!svgRef.current) return;
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, viewBoxState, walls, doors, shapes, drawings, textElements, powerPoints]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (contextMenu) {
        closeContextMenu();
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [contextMenu, closeContextMenu]);

  const handleContextMenuDelete = useCallback(() => {
    if (contextMenu?.shapeId) {
      setShapes(prev => prev.filter(s => s.id !== contextMenu.shapeId));
      setContextMenu(null);
      setSelectedShapeId(null);
    }
  }, [contextMenu]);

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

    const a4Width = a4Dimensions.a4WidthPx;
    const a4Height = a4Dimensions.a4HeightPx;
    const a4CenterX = a4Dimensions.a4X + a4Width / 2;
    const a4CenterY = a4Dimensions.a4Y + a4Height / 2;

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
  }, [a4Dimensions]);

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

    if (activeTool === 'pen') {
      isDrawingRef.current = true;
      const pathId = `path-${Date.now()}`;
      currentPathIdRef.current = pathId;
      currentPathRef.current = `M ${x} ${y}`;
      setDrawings(prev => [...prev, { id: pathId, d: currentPathRef.current, stroke: brushColor, strokeWidth: brushSize }]);
      return;
    }

    if (activeTool === 'eraser') {
      setDrawings(prev => prev.filter(p => {
        const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tempPath.setAttribute('d', p.d);
        const bbox = tempPath.getBBox();
        return !(x >= bbox.x && x <= bbox.x + bbox.width && y >= bbox.y && y <= bbox.y + bbox.height);
      }));
      return;
    }

    if (activeTool === 'shape-rectangle' || activeTool === 'shape-circle') {
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
      setPowerPoints(prev => [...prev, newPoint]);
      setSelectedPowerPointId(newPoint.id);
      setIsElectricalDrawerOpen(true);
      return;
    }
    
    if (activeTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        setTextElements(prev => [...prev, { id: `text-${Date.now()}`, x, y, text, fontSize: 16, fill: brushColor }]);
      }
      return;
    }

    if (activeTool === 'select') {
      closeContextMenu();
      const clickedShape = [...shapes].reverse().find(shape => {
        return x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height;
      });
      if (clickedShape) {
        setSelectedShapeId(clickedShape.id);
      } else {
        setSelectedShapeId(null);
      }
    }
  }, [activeTool, brushColor, brushSize, viewBoxState, shapes, isPointOnCanvas, closeContextMenu]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const rect = e.currentTarget.getBoundingClientRect();

      setViewBoxState(prev => {
        // Calculate scale using prev state to avoid stale closure values
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

    if (!isDrawingRef.current) {
      if (selectedShapeIdRef.current && moveOffsetRef.current) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
        const y = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;
        const newX = x - moveOffsetRef.current.x;
        const newY = y - moveOffsetRef.current.y;
        setShapes(prev => prev.map(s => s.id === selectedShapeIdRef.current ? { ...s, x: newX, y: newY } : s));
        movingPositionRef.current = { x: newX, y: newY };
        return;
      }
      return;
    }

    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
    const y = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;

    if (activeTool === 'pen') {
      currentPathRef.current += ` L ${x} ${y}`;
      setDrawings(prev => prev.map(p => p.id === currentPathIdRef.current ? { ...p, d: currentPathRef.current } : p));
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
  }, [activeTool, viewBoxState]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (activeTool === 'pen') {
        saveState();
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
            const newId = `shape-${Date.now()}`;
            setShapes(prev => [...prev, {
              id: newId,
              type: activeTool === 'shape-rectangle' ? 'rectangle' : 'circle',
              x: startX,
              y: startY,
              width,
              height,
              fill: 'transparent',
              stroke: brushColor,
              strokeWidth: brushSize,
            }]);
            saveState();
          }
        }
        currentShapeRef.current = null;
        shapeStartRef.current = null;
      }
      return;
    }

    if (selectedShapeIdRef.current) {
      const svg = svgRef.current;
      if (svg && movingPositionRef.current && originalPositionRef.current) {
        if (movingPositionRef.current.x !== originalPositionRef.current.x || movingPositionRef.current.y !== originalPositionRef.current.y) {
          saveState();
        }
      }
      moveOffsetRef.current = null;
      movingPositionRef.current = null;
      originalPositionRef.current = null;
    }
  }, [activeTool, brushColor, brushSize, viewBoxState, saveState]);

  const handleMouseLeave = useCallback(() => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
    }
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'select') return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
    const y = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;
    const clickedShape = [...shapes].reverse().find(shape => {
      return x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height;
    });
    if (clickedShape) {
      if (clickedShape.type === 'text') {
        const newText = prompt('Edit text:', clickedShape.text || '');
        if (newText !== null) {
          setShapes(prev => prev.map(s => s.id === clickedShape.id ? { ...s, text: newText } : s));
          saveState();
        }
      } else {
        const newText = prompt('Enter text:');
        if (newText !== null) {
          setShapes(prev => prev.map(s => s.id === clickedShape.id ? { ...s, type: 'text' as const, text: newText, fill: '#000000', stroke: 'transparent' } : s));
          saveState();
        }
      }
    }
  }, [activeTool, viewBoxState, shapes, saveState]);

  const handleShapeMouseDown = useCallback((e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    if (activeTool !== 'select') return;
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
    const mouseY = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;
    setSelectedShapeId(shapeId);
    moveOffsetRef.current = { x: mouseX - shape.x, y: mouseY - shape.y };
    originalPositionRef.current = { x: shape.x, y: shape.y };
    movingShapeIdRef.current = shapeId;
  }, [activeTool, shapes, viewBoxState]);

  const handleShapeContextMenu = useCallback((e: React.MouseEvent, shapeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedShapeId(shapeId);
    setContextMenu({ x: e.clientX, y: e.clientY, shapeId });
  }, []);

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

  const addSpace = useCallback((widthMeters: number, heightMeters: number) => {
    const spaceAspectRatio = widthMeters / heightMeters;
    const padding = 40;
    const availableWidth = a4Dimensions.a4WidthPx - padding * 2;
    const availableHeight = a4Dimensions.a4HeightPx - padding * 2;
    const canvasAspectRatio = availableWidth / availableHeight;
    let widthPx: number;
    let heightPx: number;
    if (spaceAspectRatio > canvasAspectRatio) {
      widthPx = availableWidth;
      heightPx = widthPx / spaceAspectRatio;
    } else {
      heightPx = availableHeight;
      widthPx = heightPx * spaceAspectRatio;
    }
    const centerX = a4Dimensions.a4X + a4Dimensions.a4WidthPx / 2;
    const centerY = a4Dimensions.a4Y + a4Dimensions.a4HeightPx / 2;
    const spaceX = centerX - widthPx / 2;
    const spaceY = centerY - heightPx / 2;
    const newSpace: SpaceShape = {
      id: `space-${Date.now()}`,
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
    currentSpaceRef.current = newSpace;
    setShapes((prev: Shape[]) => {
      const existingSpaceIds = prev.filter(isSpaceShape).map(space => space.id);
      const filtered = prev.filter(shape => {
        if (isSpaceShape(shape)) return false;
        if (shape.type === 'image' && shape.attachedSpaceId && existingSpaceIds.includes(shape.attachedSpaceId)) {
          return false;
        }
        return true;
      });
      return [...filtered, newSpace];
    });
    saveState();
  }, [a4Dimensions, saveState]);

  const addTable = useCallback((type: string, size: string, seats: number, imageUrl: string, targetSpaceId?: string) => {
    const centerX = a4Dimensions.a4X + a4Dimensions.a4WidthPx / 2;
    const centerY = a4Dimensions.a4Y + a4Dimensions.a4HeightPx / 2;
    const img = new Image();
    img.onload = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      let tableWidth: number;
      let tableHeight: number;
      if (naturalWidth >= naturalHeight) {
        tableWidth = 200;
        tableHeight = (naturalHeight / naturalWidth) * 200;
      } else {
        tableHeight = 200;
        tableWidth = (naturalWidth / naturalHeight) * 200;
      }
      let chosenSpace: SpaceShape | null = null;
      if (targetSpaceId) {
        const directMatch = shapes.find(s => s.id === targetSpaceId);
        if (isSpaceShape(directMatch)) {
          chosenSpace = directMatch;
        }
      }
      if (!chosenSpace && currentSpaceRef.current) {
        chosenSpace = currentSpaceRef.current;
      }
      if (!chosenSpace) {
        for (let i = shapes.length - 1; i >= 0; i--) {
          const s = shapes[i];
          if (isSpaceShape(s)) {
            chosenSpace = s;
            break;
          }
        }
      }
      const parseSizeString = (s: string): { widthMeters: number; heightMeters: number } => {
        if (!s || typeof s !== 'string') return { widthMeters: 0, heightMeters: 0 };
        let normalized = s.toLowerCase().replace(/\s+/g, '').replace('×', 'x').replace(',', '.').replace(/m/g, '');
        const parts = normalized.split('x').map(p => parseFloat(p)).filter(n => !isNaN(n));
        if (parts.length === 2) {
          return { widthMeters: parts[0] ?? 0, heightMeters: parts[1] ?? 0 };
        } else if (parts.length === 1) {
          return { widthMeters: parts[0] ?? 0, heightMeters: 0 };
        }
        return { widthMeters: 0, heightMeters: 0 };
      };
      const { widthMeters: parsedWidthMeters, heightMeters: parsedHeightMeters } = parseSizeString(String(size));
      const presetToMeters: Record<string, number> = { small: 0.6, medium: 1.2, large: 1.8 };
      let presetMeters = 0;
      if (typeof size === 'string') {
        const lower = size.toLowerCase();
        if (presetToMeters[lower] !== undefined) {
          presetMeters = presetToMeters[lower];
        }
      }
      const widthMeters = parsedWidthMeters > 0 ? parsedWidthMeters : (presetMeters > 0 ? presetMeters : 0);
      const heightMeters = parsedHeightMeters > 0 ? parsedHeightMeters : 0;

      // Compute wall scale fresh from current walls if needed
      let currentWallScale = wallScaleRef.current;
      if (!currentWallScale && walls.length > 0) {
        currentWallScale = computeWallScaleFromWalls(walls);
      }

      // Debug logging
      console.log('[addTable] size:', size, 'parsed:', { widthMeters, heightMeters });
      console.log('[addTable] chosenSpace:', chosenSpace ? { id: chosenSpace.id, ppm: chosenSpace.pixelsPerMeter } : null);
      console.log('[addTable] wallScale:', currentWallScale);

      if ((chosenSpace || currentWallScale) && (widthMeters > 0 || heightMeters > 0)) {
        const ppm = chosenSpace
          ? (chosenSpace.pixelsPerMeter || Math.min(chosenSpace.width / Math.max(0.0001, chosenSpace.spaceMetersWidth), chosenSpace.height / Math.max(0.0001, chosenSpace.spaceMetersHeight)))
          : currentWallScale!.pxPerMeter;
        console.log('[addTable] ppm:', ppm);
        if (ppm && ppm > 0) {
          const resolvedWidthMeters = widthMeters > 0 ? widthMeters : (heightMeters > 0 ? heightMeters : 0);
          const resolvedHeightMeters = heightMeters > 0 ? heightMeters : (widthMeters > 0 ? widthMeters : 0);
          let finalWidthPx = resolvedWidthMeters * ppm;
          let finalHeightPx = resolvedHeightMeters * ppm;
          if (type === 'round' && parsedHeightMeters === 0) {
            finalHeightPx = finalWidthPx;
          }
          console.log('[addTable] final size:', { finalWidthPx, finalHeightPx, resolvedWidthMeters, resolvedHeightMeters });
          let tableX: number;
          let tableY: number;
          if (chosenSpace) {
            tableX = chosenSpace.x + (chosenSpace.width / 2) - finalWidthPx / 2;
            tableY = chosenSpace.y + (chosenSpace.height / 2) - finalHeightPx / 2;
          } else if (currentWallScale?.bounds) {
            const { minX, maxX, minY, maxY } = currentWallScale.bounds;
            tableX = (minX + maxX) / 2 - finalWidthPx / 2;
            tableY = (minY + maxY) / 2 - finalHeightPx / 2;
          } else {
            tableX = centerX - finalWidthPx / 2;
            tableY = centerY - finalHeightPx / 2;
          }
          const newTable: Shape = {
            id: `table-${Date.now()}`,
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
          };
          setShapes(prev => [...prev, newTable]);
          saveState();
          return;
        }
      }
      // FALLBACK: No valid scale found - using default 200px size
      console.warn('[addTable] FALLBACK: No valid scale available! Using default 200px size');
      console.log('[addTable] Debug info:', {
        chosenSpace: chosenSpace ? { id: chosenSpace.id, ppm: chosenSpace.pixelsPerMeter, width: chosenSpace.width, spaceMetersWidth: chosenSpace.spaceMetersWidth } : null,
        currentWallScale,
        widthMeters,
        heightMeters,
        wallsCount: walls.length
      });
      const tableX = centerX - tableWidth / 2;
      const tableY = centerY - tableHeight / 2;
      const newTable: Shape = {
        id: `table-${Date.now()}`,
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
        attachedSpaceId: chosenSpace?.id,
        tableData: { type, size, seats, actualSizeMeters: 0 },
      };
      setShapes(prev => [...prev, newTable]);
      saveState();
    };
    img.onerror = () => console.error('Failed to load image:', imageUrl);
    img.src = imageUrl;
  }, [a4Dimensions, shapes, saveState]);

  const zoomToPoints = useCallback((points: { x: number; y: number }[]) => {
    if (points.length === 0) return;
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    const padding = Math.max(a4Dimensions.a4WidthPx * 0.3, a4Dimensions.a4HeightPx * 0.3, 400);
    const boxWidth = Math.max(maxX - minX + padding * 2, a4Dimensions.a4WidthPx);
    const boxHeight = Math.max(maxY - minY + padding * 2, a4Dimensions.a4HeightPx);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setViewBoxState({
      x: centerX - boxWidth / 2,
      y: centerY - boxHeight / 2,
      width: boxWidth,
      height: boxHeight,
    });
  }, [a4Dimensions]);

  const addWalls = useCallback((newWalls: Wall[], newDoors: Door[] = []) => {
    if (newWalls.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
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
    const availableWidth = a4Dimensions.a4WidthPx - padding * 2;
    const availableHeight = a4Dimensions.a4HeightPx - padding * 2;
    const canvasAspectRatio = availableWidth / availableHeight;
    let uniformScale: number;
    if (wallAspectRatio > canvasAspectRatio) {
      uniformScale = availableWidth / effectiveWidth;
    } else {
      uniformScale = availableHeight / effectiveHeight;
    }
    const layoutCenterX = (minX + maxX) / 2;
    const layoutCenterY = (minY + maxY) / 2;
    const canvasCenterX = a4Dimensions.a4X + a4Dimensions.a4WidthPx / 2;
    const canvasCenterY = a4Dimensions.a4Y + a4Dimensions.a4HeightPx / 2;
    const computedPpm = uniformScale * WALLMAKER_PIXELS_PER_METER;
    const scaledWalls: Wall[] = newWalls.map(wall => {
      const translatedStartX = wall.startX - layoutCenterX;
      const translatedStartY = wall.startY - layoutCenterY;
      const translatedEndX = wall.endX - layoutCenterX;
      const translatedEndY = wall.endY - layoutCenterY;
      const scaledStartX = translatedStartX * uniformScale;
      const scaledStartY = translatedStartY * uniformScale;
      const scaledEndX = translatedEndX * uniformScale;
      const scaledEndY = translatedEndY * uniformScale;
      // Calculate original length if not set
      const origLength = wall.length || Math.sqrt(
        Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endY - wall.startY, 2)
      );
      return {
        ...wall,
        startX: scaledStartX + canvasCenterX,
        startY: scaledStartY + canvasCenterY,
        endX: scaledEndX + canvasCenterX,
        endY: scaledEndY + canvasCenterY,
        thickness: wall.thickness * uniformScale,
        originalLengthPx: origLength, // Store original length for derivation
        pxPerMeter: computedPpm, // Store computed scale on each wall
      } as Wall;
    });
    const scaledBounds = getWallsBoundingBox(scaledWalls);
    console.log('[addWalls] scaling info:', {
      wallLayoutSize: { width: wallLayoutWidth, height: wallLayoutHeight },
      uniformScale,
      computedPpm,
      scaledBounds
    });
    wallScaleRef.current = { pxPerMeter: computedPpm, bounds: scaledBounds };
    const scaledDoors: Door[] = newDoors.map(door => ({ ...door, id: `door-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, width: door.width * uniformScale }));
    setWalls(prev => [...prev, ...scaledWalls]);
    if (scaledDoors.length > 0) {
      setDoors(prev => [...prev, ...scaledDoors]);
    }
    saveState();
    zoomToPoints(scaledWalls.map(w => ({ x: w.startX, y: w.startY })).concat(scaledWalls.map(w => ({ x: w.endX, y: w.endY }))));
  }, [a4Dimensions, saveState, zoomToPoints]);

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

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    if (!previousState) return;
    setDrawings(previousState.drawings);
    setShapes(previousState.shapes);
    setTextElements(previousState.textElements);
    setWalls(previousState.walls || []);
    setDoors(previousState.doors || []);
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, { drawings, shapes, textElements, walls, doors }]);
  }, [undoStack, drawings, shapes, textElements, walls, doors]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    if (!nextState) return;
    setDrawings(nextState.drawings);
    setShapes(nextState.shapes);
    setTextElements(nextState.textElements);
    setWalls(nextState.walls || []);
    setDoors(nextState.doors || []);
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, { drawings, shapes, textElements, walls, doors }]);
  }, [redoStack, drawings, shapes, textElements, walls, doors]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Zoom shortcuts
      // Cmd/Ctrl + = or + to zoom in
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
        return;
      }

      // Cmd/Ctrl + - to zoom out
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }

      // Cmd/Ctrl + 0 to reset zoom
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        resetZoom();
        return;
      }

      // Cmd/Ctrl + 1 to fit to canvas
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        fitToCanvas();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, zoomIn, zoomOut, resetZoom, fitToCanvas]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', background: 'transparent', zIndex: 0 }}>
      <svg
        ref={svgRef}
        viewBox={getViewBoxString()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ width: '100%', height: '100%', touchAction: 'none', cursor: activeTool === 'hand' ? 'grab' : (activeTool === 'select' ? 'default' : 'crosshair') }}
        >
          <defs>
            <pattern id="grid" x="0" y="0" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#f0f0f0" strokeWidth={0.5} />
            </pattern>
            <pattern id="grid-major" x="0" y="0" width={majorGridSize} height={majorGridSize} patternUnits="userSpaceOnUse">
              <rect width={majorGridSize} height={majorGridSize} fill="url(#grid)" />
              <path d={`M ${majorGridSize} 0 L 0 0 0 ${majorGridSize}`} fill="none" stroke="#e0e0e0" strokeWidth={1} />
            </pattern>
          </defs>

          {/* Layer 1: Infinite grid background - large enough to cover any pan position */}
          <rect x={-10000} y={-10000} width={20000} height={20000} fill="url(#grid-major)" />

          {/* Layer 2: White A4 canvas area */}
          <rect
            x={a4Dimensions.a4X}
            y={a4Dimensions.a4Y}
            width={a4Dimensions.a4WidthPx}
            height={a4Dimensions.a4HeightPx}
            fill="white"
            stroke="#cccccc"
            strokeWidth={1}
          />

          {/* Layer 3: Content - visible within A4 bounds */}
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
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const doorCenterX = wall.startX + dx * door.position;
            const doorCenterY = wall.startY + dy * door.position;
            return (
              <g key={door.id}>
                <rect x={doorCenterX - door.width / 2} y={doorCenterY - 3} width={door.width} height={6} fill="#8b5a2b" transform={`rotate(${angle}, ${doorCenterX}, ${doorCenterY})`} style={{ transformOrigin: `${doorCenterX}px ${doorCenterY}px`, transition: 'transform 0.3s' }} />
              </g>
            );
          })}
          {drawings.map((path) => (
            <path key={path.id} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} fill="none" />
          ))}
          {shapes.map((shape) => {
            if (shape.type === 'image' && shape.imageUrl) {
              return (
                <image
                  key={shape.id}
                  href={shape.imageUrl}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  preserveAspectRatio="none"
                  style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  onContextMenu={(e) => handleShapeContextMenu(e, shape.id)}
                />
              );
            }
            if (shape.type === 'circle') {
              return (
                <circle
                  key={shape.id}
                  cx={shape.x + shape.width / 2}
                  cy={shape.y + shape.height / 2}
                  r={shape.width / 2}
                  fill={shape.fill}
                  stroke={selectedShapeId === shape.id ? '#3b82f6' : shape.stroke}
                  strokeWidth={selectedShapeId === shape.id ? 2 : shape.strokeWidth}
                  style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  onContextMenu={(e) => handleShapeContextMenu(e, shape.id)}
                />
              );
            }
            if (shape.tableData?.type === 'table-oval') {
              return (
                <ellipse
                  key={shape.id}
                  cx={shape.x + shape.width / 2}
                  cy={shape.y + shape.height / 2}
                  rx={shape.width / 2}
                  ry={shape.height / 2}
                  fill={shape.fill}
                  stroke={selectedShapeId === shape.id ? '#3b82f6' : shape.stroke}
                  strokeWidth={selectedShapeId === shape.id ? 2 : shape.strokeWidth}
                  style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  onContextMenu={(e) => handleShapeContextMenu(e, shape.id)}
                />
              );
            }
            return (
              <rect
                key={shape.id}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={shape.fill}
                stroke={selectedShapeId === shape.id ? '#3b82f6' : shape.stroke}
                strokeWidth={selectedShapeId === shape.id ? 2 : shape.strokeWidth}
                style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                onContextMenu={(e) => handleShapeContextMenu(e, shape.id)}
              />
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
      </svg>
      <ElectricalDrawer
        isOpen={isElectricalDrawerOpen}
        onClose={() => {
          setIsElectricalDrawerOpen(false);
          setTimeout(() => setSelectedPowerPointId(null), 300);
        }}
        powerPoint={selectedPowerPoint}
        onUpdate={(updated: PowerPoint) => {
          setPowerPoints(prev => prev.map(p => p.id === updated.id ? updated : p));
        }}
        onDelete={(id: string) => {
          setPowerPoints(prev => prev.filter(p => p.id !== id));
          setIsElectricalDrawerOpen(false);
          setTimeout(() => setSelectedPowerPointId(null), 300);
        }}
      />
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '4px 0',
            zIndex: 10000,
            minWidth: '120px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleContextMenuDelete}
            style={{
              width: '100%',
              padding: '8px 16px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#dc2626',
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
});

GridCanvas.displayName = 'GridCanvas';

export default GridCanvas;
