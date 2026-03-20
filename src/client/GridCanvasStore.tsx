/**
 * GridCanvas - Store-based Version
 *
 * Uses Zustand canvas store for state management.
 * Boundary enforcement happens at the store level.
 */

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { SatelliteInfoChip } from './components/SatelliteInfoChip';
import { SatellitePickerModal } from './components/SatellitePickerModal';
import { NotesPanel } from './components/NotesPanel';
import { clampPositionToA4 } from '../layout-maker/store/boundaries';
import { StringLightsElementComponent } from '../layout-maker/components/Canvas/StringLightsElement';
import { BuntingElementComponent } from '../layout-maker/components/Canvas/BuntingElement';
import type { StringLightsElement as StringLightsElementType, BuntingElement as BuntingElementType } from '../layout-maker/types/elements';
import { computeShapePath, BASE_SHAPE_DATA } from './components/VertexShapeEditor';
import { useShallow } from 'zustand/shallow';
import GuestSearchDropdown from '../layout-maker/components/GuestAssignment/GuestSearchDropdown';
import { useGuestAssignment } from '../layout-maker/hooks/useGuestAssignment';
import { browserSupabaseClient } from './browserSupabaseClient';
import type { ElectricalStandard } from './types/electrical';

const WALLMAKER_PIXELS_PER_METER = 100;

// Zoom constants
const MIN_ZOOM = 10; // 10%
const MAX_ZOOM = 400; // 400%
const ZOOM_STEP = 1.2; // 20% per step
const DEFAULT_ZOOM = 100; // 100%

// Helper to create a circuit in Supabase for a power point
const createCircuitForPowerPoint = async (powerPointId: string, eventId?: string) => {
  console.log('[PowerPoint] createCircuitForPowerPoint called', { powerPointId, eventId });
  
  if (!browserSupabaseClient) {
    console.log('[PowerPoint] No Supabase client, running in demo mode');
    return null;
  }

  try {
    // Ensure session is set before making requests
    const storedSession = localStorage.getItem('wedboarpro_session');
    if (storedSession) {
      const session = JSON.parse(storedSession);
      if (session?.access_token && session?.refresh_token) {
        await browserSupabaseClient.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        console.log('[PowerPoint] Session set successfully');
      }
    }

    // First, try to get or create an electrical project for this event
    let projectId: string | null = null;

    if (eventId) {
      console.log('[PowerPoint] Checking for existing electrical project for event:', eventId);
      // Check if electrical project exists for this event
      const { data: existingProject } = await browserSupabaseClient
        .from('electrical_projects')
        .select('id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (existingProject) {
        projectId = existingProject.id;
        console.log('[PowerPoint] Found existing project:', projectId);
      } else {
        console.log('[PowerPoint] Creating new electrical project for event');
        // Create a new electrical project for this event
        const { data: newProject, error: projectError } = await browserSupabaseClient
          .from('electrical_projects')
          .insert({
            name: `Event ${eventId.slice(0, 8)} Electrical`,
            event_id: eventId,
            standard: 'EU_PT',
          })
          .select('id')
          .single();

        if (projectError) {
          console.error('[PowerPoint] Failed to create electrical project:', projectError);
        } else {
          projectId = newProject?.id || null;
          console.log('[PowerPoint] Created new project:', projectId);
        }
      }
    } else {
      console.log('[PowerPoint] No eventId provided');
    }

    if (!projectId) {
      console.log('[PowerPoint] No projectId, cannot create circuit');
      return null;
    }

    console.log('[PowerPoint] Creating circuit for project:', projectId);
    // Create a circuit for this power point
    const { data: circuit, error: circuitError } = await browserSupabaseClient
      .from('electrical_circuits')
      .insert({
        project_id: projectId,
        name: `Power Point ${powerPointId.slice(0, 8)}`,
        standard: 'EU_PT',
        breaker_amps: 16,
        voltage: 230,
        status: 'ok',
      })
      .select('id')
      .single();

    if (circuitError) {
      console.error('[PowerPoint] Failed to create circuit:', circuitError);
      return null;
    }

    console.log('[PowerPoint] Created circuit:', circuit?.id);
    return circuit?.id || null;
  } catch (error) {
    console.error('[PowerPoint] Error creating circuit:', error);
    return null;
  }
};

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
  isViewMode?: boolean;
  hiddenCategories?: string[];
  onShapeDoubleClick?: (shapeId: string) => void;
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
  getSvgElement: () => SVGSVGElement | null;
  openSatelliteModal: () => void;
}, GridCanvasProps>(({
  activeTool,
  onToolChange,
  projectId,
  a4Dimensions: propA4Dimensions,
  brushSize = 2,
  brushColor = '#000000',
  eventId,
  isViewMode = false,
  hiddenCategories = [],
  onShapeDoubleClick,
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
  const satelliteBackground = useCanvasStore((s) => s.satelliteBackground);
  const clearSatelliteBackground = useCanvasStore((s) => s.clearSatelliteBackground);
  const customBackground = useCanvasStore((s) => s.customBackground);
  const notes = useCanvasStore((s) => s.notes);
  const updateNote = useCanvasStore((s) => s.updateNote);
  const removeNote = useCanvasStore((s) => s.removeNote);

  // Satellite modal state
  const [satelliteModalOpen, setSatelliteModalOpen] = useState(false);

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
  const updateText = useCanvasStore((s) => s.updateText);
  const deleteText = useCanvasStore((s) => s.deleteText);
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
  
  // Text tool state
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [textSettings, setTextSettings] = useState({
    fontSize: 24,
    color: '#000000',
    bold: false,
    italic: false,
    alignment: 'left' as 'left' | 'center' | 'right',
  });
  const [textEditPosition, setTextEditPosition] = useState<{ x: number; y: number } | null>(null);

  // Guest assignment state
  const [guestDropdownChairId, setGuestDropdownChairId] = useState<string | null>(null);
  const [guestDropdownPosition, setGuestDropdownPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [ceremonySeatDropdown, setCeremonySeatDropdown] = useState<{
    shapeId: string;
    seatKey: string; // "rowIndex-globalSeatIndex"
    position: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const guestAssignment = useGuestAssignment(eventId);

  // Map of guestId → { shapeId, seatKey } for all ceremony seat assignments
  const ceremonySeatAssignmentMap = useMemo((): Record<string, { shapeId: string; seatKey: string }> => {
    const map: Record<string, { shapeId: string; seatKey: string }> = {};
    for (const el of elements) {
      if (el.elementType === 'ceremony-block' && el.ceremonyData?.seatAssignments) {
        for (const [seatKey, assign] of Object.entries(el.ceremonyData.seatAssignments)) {
          map[assign.guestId] = { shapeId: el.id, seatKey };
        }
      }
    }
    return map;
  }, [elements]);

  // Combined assigned/unassigned lists that include both chair AND ceremony seat assignments
  const allAssignedGuestIds = useMemo(() => {
    const ids = new Set<string>(guestAssignment.assignedGuests.map(g => g.id));
    for (const guestId of Object.keys(ceremonySeatAssignmentMap)) ids.add(guestId);
    return ids;
  }, [guestAssignment.assignedGuests, ceremonySeatAssignmentMap]);

  const combinedAssignedGuests = useMemo(
    () => guestAssignment.guests.filter(g => allAssignedGuestIds.has(g.id)),
    [guestAssignment.guests, allAssignedGuestIds],
  );
  const combinedUnassignedGuests = useMemo(
    () => guestAssignment.guests.filter(g => g.rsvpStatus !== 'declined' && !allAssignedGuestIds.has(g.id)),
    [guestAssignment.guests, allAssignedGuestIds],
  );

  // Refs for drag operations
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<string>('');
  const currentPathIdRef = useRef<string>('');
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<SVGElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const currentSpaceRef = useRef<SpaceShape | null>(null);
  
  // Refs for power point dragging
  const isDraggingPowerPointRef = useRef(false);
  const draggedPowerPointIdRef = useRef<string | null>(null);
  const powerPointDragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const wallScaleRef = useRef<{ pxPerMeter: number; bounds: WallBounds | null } | null>(null);
  const moveOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const movingPositionRef = useRef<{ x: number; y: number } | null>(null);
  const originalPositionRef = useRef<{ x: number; y: number } | null>(null);
  const selectedShapeIdRef = useRef<string | null>(null);
  const clipboardRef = useRef<Shape | null>(null);
  const initialViewBoxWidthRef = useRef<number>(viewBoxState.width);

  // Anchor-based element placement state (string-lights, bunting two-click placement)
  const [anchorPlacement, setAnchorPlacement] = useState<{
    firstAnchor: { x: number; y: number } | null;
    livePoint: { x: number; y: number } | null;
  }>({ firstAnchor: null, livePoint: null });

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

      if (!isInputField && e.key === 'Escape') {
        if (anchorPlacement.firstAnchor) {
          setAnchorPlacement({ firstAnchor: null, livePoint: null });
          onToolChange('select');
        }
        return;
      }

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
  }, [elements, addElement, deleteElement, anchorPlacement, onToolChange]);

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

  // Mouse handlers — trackpad pinch-to-zoom + two-finger pan
  // Uses native non-passive listener so preventDefault() works (prevents browser back/forward)
  const viewBoxRef = useRef(viewBoxState);
  viewBoxRef.current = viewBoxState;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const svg = svgRef.current;
      if (!svg) return;

      // Only ctrlKey/metaKey = pinch-to-zoom (browser sets ctrlKey for trackpad pinch)
      if ((e.ctrlKey || e.metaKey) && e.deltaY !== 0) {
        const rect = svg.getBoundingClientRect();
        const vb = viewBoxRef.current;

        const mouseX = (e.clientX - rect.left) * (vb.width / rect.width) + vb.x;
        const mouseY = (e.clientY - rect.top) * (vb.height / rect.height) + vb.y;

        // Pinch open (fingers apart) → deltaY negative → zoom in (shrink viewBox)
        // Pinch close (fingers together) → deltaY positive → zoom out (grow viewBox)
        const zoomIntensity = 0.005;
        const scaleFactor = 1 + e.deltaY * zoomIntensity;

        setViewBoxState(prev => {
          const newWidth = prev.width * scaleFactor;
          const newHeight = prev.height * scaleFactor;

          const currentZoom = initialViewBoxWidthRef.current / prev.width * 100;
          const newZoom = initialViewBoxWidthRef.current / newWidth * 100;
          if (newZoom < MIN_ZOOM || newZoom > MAX_ZOOM) {
            return prev;
          }

          // Zoom centered on cursor position
          const newX = mouseX - (mouseX - prev.x) * scaleFactor;
          const newY = mouseY - (mouseY - prev.y) * scaleFactor;

          return { x: newX, y: newY, width: newWidth, height: newHeight };
        });
      } else {
        // Two-finger drag → pan (deltaX/deltaY map directly to viewBox movement)
        setViewBoxState(prev => ({
          ...prev,
          x: prev.x + e.deltaX,
          y: prev.y + e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    console.log('[HANDLE MOUSE DOWN] activeTool:', activeTool, 'e.button:', e.button);
    if (isViewMode) {
      if (activeTool === 'hand' || e.button === 1) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }

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
      // If clicking on an existing power point, open it instead of creating a new one
      const existingPoint = powerPoints.find(pp => {
        const distance = Math.sqrt(Math.pow(x - pp.x, 2) + Math.pow(y - pp.y, 2));
        return distance < 15;
      });
      if (existingPoint) {
        setSelectedPowerPointId(existingPoint.id);
        setTimeout(() => setIsElectricalDrawerOpen(true), 100);
        return;
      }

      if (!isPointOnCanvas(x, y)) return;
      const newPoint = createPowerPoint(x, y, 'EU_PT');
      const storedId = addPowerPoint(newPoint);
      setSelectedPowerPointId(storedId);

      // Create a circuit in Supabase for this power point and link it
      createCircuitForPowerPoint(storedId, eventId).then((circuitId) => {
        if (circuitId) {
          updatePowerPoint(storedId, { circuitId } as any);
        }
      });

      // Delay drawer opening to prevent canvas from disappearing
      setTimeout(() => {
        setIsElectricalDrawerOpen(true);
      }, 100);
      return;
    }

    if (activeTool === 'text') {
      console.log('[TEXT TOOL] Creating text at:', x, y, 'textSettings:', textSettings);
      // Create new text element with inline editing
      const newTextId = addText({ 
        x, 
        y, 
        text: '', 
        fontSize: textSettings.fontSize, 
        fill: textSettings.color,
        fontWeight: textSettings.bold ? 'bold' : 'normal',
        fontStyle: textSettings.italic ? 'italic' : 'normal',
        textAnchor: textSettings.alignment === 'center' ? 'middle' : textSettings.alignment === 'right' ? 'end' : 'start',
      });
      console.log('[TEXT TOOL] newTextId:', newTextId);
      if (newTextId) {
        setEditingTextId(newTextId);
        setSelectedTextId(newTextId);
        setTextInputValue('');
        // Store click position for in-place editor
        const svg = svgRef.current;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          const screenX = e.clientX - rect.left;
          const screenY = e.clientY - rect.top;
          setTextEditPosition({ x: screenX, y: screenY });
          console.log('[TEXT TOOL] Position set:', screenX, screenY);
        }
      }
      return;
    }

    // Two-click anchor placement for string lights and bunting
    if (activeTool === 'string-lights' || activeTool === 'bunting') {
      if (!anchorPlacement.firstAnchor) {
        setAnchorPlacement({ firstAnchor: { x, y }, livePoint: { x, y } });
      } else {
        const sx = anchorPlacement.firstAnchor.x;
        const sy = anchorPlacement.firstAnchor.y;
        const ex = x;
        const ey = y;
        // Bounding box top-left: min of both anchors.
        // Storing relative offsets from bbox origin means clampElementToA4 can
        // move x/y freely without breaking the anchor geometry.
        const bboxX = Math.min(sx, ex);
        const bboxY = Math.min(sy, ey);
        const bboxW = Math.max(Math.abs(ex - sx), 1);
        const bboxH = Math.max(Math.abs(ey - sy), 1);
        const isStringLights = activeTool === 'string-lights';
        addElement({
          type: 'rectangle',
          x: bboxX,
          y: bboxY,
          width: bboxW,
          height: bboxH,
          fill: 'none',
          stroke: 'none',
          strokeWidth: 0,
          elementType: activeTool,
          lightingData: {
            startOffX: sx - bboxX,
            startOffY: sy - bboxY,
            endOffX: ex - bboxX,
            endOffY: ey - bboxY,
            ...(isStringLights
              ? { bulbColor: 'warm-white', bulbSize: 'medium', spacing: 'normal', wireColor: '#3d2b1f' }
              : { colorScheme: 'arraial-classic', flagSize: 'medium', flagShape: 'triangle', spacing: 'normal', stringColor: '#c8b9a2' }),
          },
        });
        setAnchorPlacement({ firstAnchor: null, livePoint: null });
        onToolChange('select');
      }
      return;
    }

    if (isViewMode) {
      return;
    }

    // Check if clicking on a power point first (for any tool)
    // x/y and pp.x/pp.y are both in viewBox coordinate space — compare directly
    const clickedPowerPoint = powerPoints.find(pp => {
      const distance = Math.sqrt(Math.pow(x - pp.x, 2) + Math.pow(y - pp.y, 2));
      return distance < 15;
    });

    if (clickedPowerPoint && activeTool === 'select') {
      setSelectedPowerPointId(clickedPowerPoint.id);
      // Start dragging power point
      isDraggingPowerPointRef.current = true;
      draggedPowerPointIdRef.current = clickedPowerPoint.id;
      powerPointDragOffsetRef.current = { x: x - clickedPowerPoint.x, y: y - clickedPowerPoint.y };
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
        // If clicking on empty canvas, deselect power point too
        if (!clickedPowerPoint) {
          setSelectedPowerPointId(null);
        }
      }
    }
  }, [activeTool, brushColor, brushSize, viewBoxState, elements, drawings, isPointOnCanvas, addDrawing, setDrawings, addPowerPoint, addText, isViewMode, powerPoints, anchorPlacement, addElement, onToolChange, textSettings]);

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

    // Track live point for anchor element placement preview
    if (activeTool === 'string-lights' || activeTool === 'bunting') {
      const svg = svgRef.current;
      if (svg) {
        const rect = svg.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
        const my = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;
        setAnchorPlacement((prev) => ({ ...prev, livePoint: { x: mx, y: my } }));
      }
    }

    // Handle power point dragging
    if (isDraggingPowerPointRef.current && draggedPowerPointIdRef.current && powerPointDragOffsetRef.current) {
      const svg = svgRef.current;
      if (!svg) return;
      
      const rect = svg.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * (viewBoxState.width / rect.width) + viewBoxState.x;
      const mouseY = (e.clientY - rect.top) * (viewBoxState.height / rect.height) + viewBoxState.y;
      
      const newX = mouseX - powerPointDragOffsetRef.current.x;
      const newY = mouseY - powerPointDragOffsetRef.current.y;
      
      updatePowerPoint(draggedPowerPointIdRef.current, { x: newX, y: newY });
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

    // End power point dragging
    if (isDraggingPowerPointRef.current) {
      isDraggingPowerPointRef.current = false;
      draggedPowerPointIdRef.current = null;
      powerPointDragOffsetRef.current = null;
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

  const handleSaveText = useCallback(() => {
    if (editingTextId && textInputValue.trim()) {
      updateText(editingTextId, {
        text: textInputValue,
        fontSize: textSettings.fontSize,
        fill: textSettings.color,
        fontWeight: textSettings.bold ? 'bold' : 'normal',
        fontStyle: textSettings.italic ? 'italic' : 'normal',
        textAnchor: textSettings.alignment === 'center' ? 'middle' : textSettings.alignment === 'right' ? 'end' : 'start',
      });
      recordSnapshot('Update text');
    } else if (editingTextId && !textInputValue.trim()) {
      // Delete empty text
      deleteText(editingTextId);
      recordSnapshot('Delete empty text');
    }
    setEditingTextId(null);
    setSelectedTextId(null);
    setTextEditPosition(null);
  }, [editingTextId, textInputValue, textSettings, updateText, deleteText, recordSnapshot]);

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
      // Fall back to satellite/custom background's calibrated scale when no walls exist
      const backgroundPpm = storeState.satelliteBackground?.pixelsPerMeter ?? storeState.customBackground?.pixelsPerMeter ?? null;
      const wallPpm = wallScaleRef.current?.pxPerMeter || derivedFromWalls || backgroundPpm;

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
      const origLength = wall.length || Math.sqrt(
        Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endY - wall.startY, 2)
      );
      const scaled: Wall = {
        ...wall,
        startX: translatedStartX * uniformScale + canvasCenterX,
        startY: translatedStartY * uniformScale + canvasCenterY,
        endX: translatedEndX * uniformScale + canvasCenterX,
        endY: translatedEndY * uniformScale + canvasCenterY,
        thickness: wall.thickness * uniformScale,
        originalLengthPx: origLength,
        pxPerMeter: computedPpm,
      };
      // Transform bezier control point to match the new coordinate space
      if (wall.curve && wall.curve.type === 'bezier') {
        const translatedCpX = wall.curve.point.x - layoutCenterX;
        const translatedCpY = wall.curve.point.y - layoutCenterY;
        scaled.curve = {
          type: 'bezier',
          point: {
            x: translatedCpX * uniformScale + canvasCenterX,
            y: translatedCpY * uniformScale + canvasCenterY,
          },
        };
      }
      return scaled;
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
    getSvgElement: () => svgRef.current,
    openSatelliteModal: () => setSatelliteModalOpen(true),
  }), [addSpace, addTable, addWalls, zoomToPoints, getPowerPoints, getZoomLevel, zoomIn, zoomOut, resetZoom, fitToCanvas]);

  // Note: global ctrl+wheel prevention is handled by the container's native wheel listener above

  // Guest assignment handlers
  const handleCloseGuestDropdown = useCallback(() => {
    setGuestDropdownChairId(null);
    setGuestDropdownPosition(null);
  }, []);

  const handleCeremonySeatMouseDown = useCallback((
    e: React.MouseEvent,
    shapeId: string,
    seatKey: string,
    svgCX: number,
    svgCY: number,
    svgSW: number,
    svgSH: number,
  ) => {
    e.stopPropagation();
    if (activeTool !== 'select') return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const screenCX = rect.left + ((svgCX - viewBoxState.x) / viewBoxState.width) * rect.width;
    const screenCY = rect.top + ((svgCY - viewBoxState.y) / viewBoxState.height) * rect.height;
    const screenHW = (svgSW / viewBoxState.width) * rect.width / 2;
    const screenHH = (svgSH / viewBoxState.height) * rect.height / 2;
    setCeremonySeatDropdown({
      shapeId,
      seatKey,
      position: { x: screenCX - screenHW, y: screenCY - screenHH, width: screenHW * 2, height: screenHH * 2 },
    });
    setGuestDropdownChairId(null);
    setGuestDropdownPosition(null);
  }, [activeTool, viewBoxState]);

  const handleAssignCeremonySeat = useCallback((guestId: string) => {
    if (!ceremonySeatDropdown) return;
    const { shapeId, seatKey } = ceremonySeatDropdown;
    const guest = guestAssignment.guests.find(g => g.id === guestId);
    if (!guest) return;

    // Clear from any table chair
    const existingChairId = guestAssignment.getChairForGuest(guestId);
    if (existingChairId) {
      const existingChair = elements.find(e => e.id === existingChairId);
      if (existingChair?.chairData) {
        updateElement(existingChairId, {
          fill: '#fff', stroke: '#888',
          chairData: { ...existingChair.chairData, assignedGuestId: null, assignedGuestName: null, dietaryType: null },
        });
      }
    }

    // Clear from any other ceremony seat
    const existingCeremony = ceremonySeatAssignmentMap[guestId];
    if (existingCeremony && !(existingCeremony.shapeId === shapeId && existingCeremony.seatKey === seatKey)) {
      const existingShape = elements.find(e => e.id === existingCeremony.shapeId);
      if (existingShape?.ceremonyData) {
        const cleaned = { ...(existingShape.ceremonyData.seatAssignments ?? {}) };
        delete cleaned[existingCeremony.seatKey];
        updateElement(existingCeremony.shapeId, { ceremonyData: { ...existingShape.ceremonyData, seatAssignments: cleaned } } as any);
      }
    }

    // Assign to this ceremony seat
    const shape = elements.find(e => e.id === shapeId);
    if (!shape?.ceremonyData) return;
    const newAssignments = {
      ...(shape.ceremonyData.seatAssignments ?? {}),
      [seatKey]: { guestId: guest.id, guestName: `${guest.firstName} ${guest.lastName}`, dietaryType: guest.dietaryType ?? null },
    };
    updateElement(shapeId, { ceremonyData: { ...shape.ceremonyData, seatAssignments: newAssignments } } as any);
    setCeremonySeatDropdown(null);
  }, [ceremonySeatDropdown, guestAssignment, elements, updateElement, ceremonySeatAssignmentMap]);

  const handleUnassignCeremonySeat = useCallback(() => {
    if (!ceremonySeatDropdown) return;
    const { shapeId, seatKey } = ceremonySeatDropdown;
    const shape = elements.find(e => e.id === shapeId);
    if (!shape?.ceremonyData) return;
    const cleaned = { ...(shape.ceremonyData.seatAssignments ?? {}) };
    delete cleaned[seatKey];
    updateElement(shapeId, { ceremonyData: { ...shape.ceremonyData, seatAssignments: cleaned } } as any);
    setCeremonySeatDropdown(null);
  }, [ceremonySeatDropdown, elements, updateElement]);

  const handleAssignGuest = useCallback((guestId: string) => {
    if (guestDropdownChairId) {
      const guest = guestAssignment.guests.find(g => g.id === guestId);
      if (!guest) return;

      // If guest is already assigned to a table chair, clear it first
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

      // If guest is already assigned to a ceremony seat, clear it first
      const existingCeremony = ceremonySeatAssignmentMap[guestId];
      if (existingCeremony) {
        const existingShape = elements.find(e => e.id === existingCeremony.shapeId);
        if (existingShape?.ceremonyData) {
          const cleaned = { ...(existingShape.ceremonyData.seatAssignments ?? {}) };
          delete cleaned[existingCeremony.seatKey];
          updateElement(existingCeremony.shapeId, { ceremonyData: { ...existingShape.ceremonyData, seatAssignments: cleaned } } as any);
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
  }, [guestDropdownChairId, guestAssignment, updateElement, elements, handleCloseGuestDropdown, ceremonySeatAssignmentMap]);

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
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', background: 'transparent', zIndex: 5, overscrollBehavior: 'none' }}>
      <svg
        ref={svgRef}
        data-layout-canvas="true"
        viewBox={getViewBoxString()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ width: '100%', height: '100%', touchAction: 'none', cursor: (activeTool === 'string-lights' || activeTool === 'bunting') ? 'none' : activeTool === 'hand' ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair' }}
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

        {/* Satellite background image — always fills A4 horizontally, no rotation on canvas */}
        {satelliteBackground && (
          <image
            href={satelliteBackground.imageBase64}
            x={propA4Dimensions.a4X}
            y={propA4Dimensions.a4Y}
            width={propA4Dimensions.a4WidthPx}
            height={propA4Dimensions.a4HeightPx}
            preserveAspectRatio="xMidYMid slice"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          />
        )}

        {/* Custom uploaded background image — locked at A4 bounds, below all elements */}
        {customBackground && (
          <image
            href={customBackground.imageBase64}
            x={propA4Dimensions.a4X}
            y={propA4Dimensions.a4Y}
            width={propA4Dimensions.a4WidthPx}
            height={propA4Dimensions.a4HeightPx}
            preserveAspectRatio="none"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          />
        )}

        <g clipPath="url(#a4-clip)">
          {walls.map((wall) => {
            if (wall.curve) {
              let pathD: string;
              if (wall.curve.type === 'bezier') {
                pathD = `M ${wall.startX} ${wall.startY} Q ${wall.curve.point.x} ${wall.curve.point.y} ${wall.endX} ${wall.endY}`;
              } else {
                const dx = wall.endX - wall.startX;
                const dy = wall.endY - wall.startY;
                const radius = Math.sqrt(dx * dx + dy * dy) / 2;
                const sweepFlag = wall.curve.direction === 1 ? 0 : 1;
                pathD = `M ${wall.startX} ${wall.startY} A ${radius} ${radius} 0 0 ${sweepFlag} ${wall.endX} ${wall.endY}`;
              }
              return (
                <g key={wall.id}>
                  <path d={pathD} fill="none" stroke="#2c3e50" strokeWidth={wall.thickness} strokeLinecap="round" />
                </g>
              );
            }
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
            // Category visibility filter
            const shapeCategory = shape.tableData
              ? 'tables'
              : shape.chairData
              ? (shape.chairData.parentTableId ? 'tables' : 'seating')
              : shape.elementType
              ? (['table-round','table-rectangular','table-square','table-oval'].includes(shape.elementType) ? 'tables'
                : ['chair','seat-standard','seat-armchair','seat-chaise','seat-sofa-2','seat-sofa-3','seat-bench','seat-barstool','seat-throne','ceremony-block'].includes(shape.elementType) ? 'seating'
                : ['dance-floor','stage','cocktail-area','ceremony-area'].includes(shape.elementType) ? 'entertainment'
                : ['bar','buffet','cake-table','gift-table','dj-booth'].includes(shape.elementType) ? 'service'
                : ['flower-arrangement','arch','photo-booth'].includes(shape.elementType) ? 'decor'
                : (shape.elementType === 'string-lights' || shape.elementType === 'bunting') ? 'lighting'
                : null)
              : null;
            if (shapeCategory && hiddenCategories.includes(shapeCategory)) return null;

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

            // String lights — render using premium component with pixelsPerMeter=1 (coords already in SVG pixels)
            if (shape.elementType === 'string-lights' && shape.lightingData) {
              const ld = shape.lightingData;
              // Recompute absolute anchor positions from bounding-box origin + offsets
              const startX = shape.x + (ld.startOffX ?? 0);
              const startY = shape.y + (ld.startOffY ?? 0);
              const endX   = shape.x + (ld.endOffX ?? shape.width);
              const endY   = shape.y + (ld.endOffY ?? 0);
              const slEl = {
                id: shape.id, type: 'string-lights' as const,
                x: startX, y: startY,
                width: shape.width, height: shape.height,
                rotation: 0,
                endAnchorOffset: { x: endX - startX, y: endY - startY },
                bulbColor: ld.bulbColor || 'warm-white',
                bulbSize: (ld.bulbSize || 'medium') as 'small' | 'medium' | 'large',
                spacing: (ld.spacing || 'normal') as 'dense' | 'normal' | 'sparse',
                wireColor: ld.wireColor || '#3d2b1f',
                zIndex: 0, groupId: null, parentId: null, locked: false,
                label: '', notes: '', createdAt: '', updatedAt: '',
              } as StringLightsElementType;
              return (
                <StringLightsElementComponent
                  key={shape.id}
                  element={slEl}
                  pixelsPerMeter={1}
                  isSelected={selectedShapeId === shape.id}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                />
              );
            }

            // Bunting — render using premium component with pixelsPerMeter=1
            if (shape.elementType === 'bunting' && shape.lightingData) {
              const ld = shape.lightingData;
              const startX = shape.x + (ld.startOffX ?? 0);
              const startY = shape.y + (ld.startOffY ?? 0);
              const endX   = shape.x + (ld.endOffX ?? shape.width);
              const endY   = shape.y + (ld.endOffY ?? 0);
              const bEl = {
                id: shape.id, type: 'bunting' as const,
                x: startX, y: startY,
                width: shape.width, height: shape.height,
                rotation: 0,
                endAnchorOffset: { x: endX - startX, y: endY - startY },
                colorScheme: (ld.colorScheme || 'arraial-classic') as BuntingElementType['colorScheme'],
                customColors: ld.customColors || [],
                flagSize: (ld.flagSize || 'medium') as 'small' | 'medium' | 'large',
                flagShape: (ld.flagShape || 'triangle') as 'triangle' | 'rectangle',
                spacing: (ld.spacing || 'normal') as 'dense' | 'normal' | 'sparse',
                stringColor: ld.stringColor || '#c8b9a2',
                zIndex: 0, groupId: null, parentId: null, locked: false,
                label: '', notes: '', createdAt: '', updatedAt: '',
              } as BuntingElementType;
              return (
                <BuntingElementComponent
                  key={shape.id}
                  element={bEl}
                  pixelsPerMeter={1}
                  isSelected={selectedShapeId === shape.id}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                />
              );
            }

            // ── Individual seat elements ──────────────────────────────────────
            if (shape.elementType && shape.elementType.startsWith('seat-')) {
              const isSelected = selectedShapeId === shape.id;
              const x = shape.x, y = shape.y, w = shape.width, h = shape.height;
              const fill = shape.fill || '#f5f0eb';
              const stroke = isSelected ? '#3b82f6' : (shape.stroke || '#a08060');
              const sw = isSelected ? 2 : (shape.strokeWidth || 1.5);
              const et = shape.elementType;
              return (
                <g key={shape.id} transform={rotationTransform}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  onDoubleClick={(e) => { e.stopPropagation(); if (activeTool === 'select') onShapeDoubleClick?.(shape.id); }}
                  style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}>
                  {et === 'seat-standard' ? (
                    <>
                      {/* Seat */}
                      <rect x={x} y={y + h * 0.42} width={w} height={h * 0.58} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Back */}
                      <rect x={x} y={y} width={w} height={h * 0.44} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                    </>
                  ) : et === 'seat-armchair' ? (
                    <>
                      <rect x={x + w * 0.18} y={y + h * 0.4} width={w * 0.64} height={h * 0.6} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
                      <rect x={x + w * 0.18} y={y} width={w * 0.64} height={h * 0.42} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Armrests */}
                      <rect x={x} y={y + h * 0.36} width={w * 0.2} height={h * 0.64} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
                      <rect x={x + w * 0.8} y={y + h * 0.36} width={w * 0.2} height={h * 0.64} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
                    </>
                  ) : et === 'seat-chaise' ? (
                    <>
                      {/* Long body */}
                      <rect x={x} y={y + h * 0.3} width={w * 0.78} height={h * 0.7} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Head end */}
                      <rect x={x + w * 0.76} y={y} width={w * 0.24} height={h} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
                    </>
                  ) : et === 'seat-sofa-2' ? (
                    <>
                      {/* Backrest */}
                      <rect x={x} y={y} width={w} height={h * 0.35} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Left armrest */}
                      <rect x={x} y={y + h * 0.33} width={w * 0.11} height={h * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Right armrest */}
                      <rect x={x + w * 0.89} y={y + h * 0.33} width={w * 0.11} height={h * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Seat area */}
                      <rect x={x + w * 0.11} y={y + h * 0.33} width={w * 0.78} height={h * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Division */}
                      <line x1={x + w * 0.5} y1={y + h * 0.33} x2={x + w * 0.5} y2={y + h} stroke={stroke} strokeWidth={0.8} opacity={0.5} />
                    </>
                  ) : et === 'seat-sofa-3' ? (
                    <>
                      {/* Backrest */}
                      <rect x={x} y={y} width={w} height={h * 0.35} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Left armrest */}
                      <rect x={x} y={y + h * 0.33} width={w * 0.08} height={h * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Right armrest */}
                      <rect x={x + w * 0.92} y={y + h * 0.33} width={w * 0.08} height={h * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Seat area */}
                      <rect x={x + w * 0.08} y={y + h * 0.33} width={w * 0.84} height={h * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Divisions */}
                      <line x1={x + w * 0.08 + w * 0.84 / 3} y1={y + h * 0.33} x2={x + w * 0.08 + w * 0.84 / 3} y2={y + h} stroke={stroke} strokeWidth={0.8} opacity={0.5} />
                      <line x1={x + w * 0.08 + w * 0.84 * 2 / 3} y1={y + h * 0.33} x2={x + w * 0.08 + w * 0.84 * 2 / 3} y2={y + h} stroke={stroke} strokeWidth={0.8} opacity={0.5} />
                    </>
                  ) : et === 'seat-bench' ? (
                    // Top-down view: simple seat surface, no legs
                    <rect x={x} y={y + h * 0.2} width={w} height={h * 0.6} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
                  ) : et === 'seat-barstool' ? (
                    <>
                      {/* Round seat */}
                      <ellipse cx={x + w / 2} cy={y + h * 0.32} rx={w * 0.46} ry={h * 0.28} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Post */}
                      <line x1={x + w / 2} y1={y + h * 0.6} x2={x + w / 2} y2={y + h} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
                      {/* Footrest */}
                      <line x1={x + w * 0.25} y1={y + h * 0.8} x2={x + w * 0.75} y2={y + h * 0.8} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
                    </>
                  ) : et === 'seat-throne' ? (
                    <>
                      {/* Seat */}
                      <rect x={x + w * 0.1} y={y + h * 0.52} width={w * 0.8} height={h * 0.48} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* High back */}
                      <rect x={x + w * 0.1} y={y + h * 0.1} width={w * 0.8} height={h * 0.44} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
                      {/* Crown tops */}
                      <path d={`M${x+w*0.14} ${y+h*0.1} L${x+w*0.14} ${y} L${x+w*0.28} ${y+h*0.07} L${x+w*0.5} ${y} L${x+w*0.72} ${y+h*0.07} L${x+w*0.86} ${y} L${x+w*0.86} ${y+h*0.1}`} fill="none" stroke={stroke} strokeWidth={sw * 0.8} strokeLinejoin="round" />
                      {/* Armrests */}
                      <rect x={x} y={y + h * 0.46} width={w * 0.12} height={h * 0.54} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                      <rect x={x + w * 0.88} y={y + h * 0.46} width={w * 0.12} height={h * 0.54} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
                    </>
                  ) : (
                    <rect x={x} y={y} width={w} height={h} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
                  )}
                  {/* Label under throne */}
                  {et === 'seat-throne' && shape.label && shape.label !== 'Throne Chair' && (
                    <text x={x + w / 2} y={y + h + 12} textAnchor="middle" fontSize={9} fill="#64748b" fontStyle="italic">
                      {shape.label}
                    </text>
                  )}
                </g>
              );
            }

            // ── Ceremony seating block ─────────────────────────────────────────
            if (shape.elementType === 'ceremony-block' && shape.ceremonyData) {
              const isSelected = selectedShapeId === shape.id;
              const cd = shape.ceremonyData;
              const bx = shape.x, by = shape.y, bw = shape.width, bh = shape.height;

              // Resolve new fields — all optional for backward compatibility
              const aisleType  = cd.aisleType  ?? 'center';
              const curvature  = cd.curvature  ?? 0;
              const cStyle     = cd.chairStyle ?? 'chiavari';
              const removed    = new Set(cd.removedSeats ?? []);
              const reserved   = new Set(cd.reservedRows ?? []);
              const secLabels  = cd.sectionLabels ?? { enabled: false, left: "Bride's Side", right: "Groom's Side" };

              // Natural dimensions in stored 100px/m units
              const natSW = cd.seatsPerRow * cd.seatWidthPx + Math.max(0, cd.seatsPerRow - 1) * cd.seatGapPx;
              const natW  = aisleType === 'none'   ? natSW
                          : aisleType === 'center' ? 2 * natSW + cd.aisleWidthPx
                          : aisleType === 'sides'  ? natSW + 2 * cd.aisleWidthPx
                          : aisleType === 'double' ? 3 * natSW + 2 * cd.aisleWidthPx
                          :                         2 * natSW + cd.aisleWidthPx; // legacy fallback
              const natH  = cd.rowCount * cd.seatHeightPx + Math.max(0, cd.rowCount - 1) * cd.rowGapPx;

              // Scale to actual canvas shape bounding box
              const scX = natW > 0 ? bw / natW : 1;
              const scY = natH > 0 ? bh / natH : 1;
              const sw  = cd.seatWidthPx  * scX;
              const sh  = cd.seatHeightPx * scY;
              const sg  = cd.seatGapPx    * scX;
              const aw  = cd.aisleWidthPx * scX;
              const rg  = cd.rowGapPx     * scY;
              const secW = cd.seatsPerRow * sw + Math.max(0, cd.seatsPerRow - 1) * sg;

              // Section x-offsets (relative to bx)
              const secs: { startX: number; count: number; sectionIdx: number }[] =
                aisleType === 'none'   ? [{ startX: 0, count: cd.seatsPerRow, sectionIdx: 0 }]
                : aisleType === 'center' ? [{ startX: 0, count: cd.seatsPerRow, sectionIdx: 0 }, { startX: secW + aw, count: cd.seatsPerRow, sectionIdx: 1 }]
                : aisleType === 'sides'  ? [{ startX: aw, count: cd.seatsPerRow, sectionIdx: 0 }]
                : aisleType === 'double' ? [{ startX: 0, count: cd.seatsPerRow, sectionIdx: 0 }, { startX: secW + aw, count: cd.seatsPerRow, sectionIdx: 1 }, { startX: 2 * (secW + aw), count: cd.seatsPerRow, sectionIdx: 2 }]
                :                         [{ startX: 0, count: cd.seatsPerRow, sectionIdx: 0 }, { startX: secW + aw, count: cd.seatsPerRow, sectionIdx: 1 }];

              // Chair style
              const seatRx      = cStyle === 'ghost' ? 4 : cStyle === 'folding' ? 0 : cStyle === 'banquet' ? 1 : 2;
              const seatRenderW = cStyle === 'banquet' ? sw * 1.1 : sw;
              const fillOpacity = cStyle === 'ghost' ? 0.65 : 1;

              // Curvature arc (mirrors modal math exactly)
              const hasCurve = curvature > 0.5 && bw > 0;
              const curveRad = curvature * Math.PI / 180;
              const arcR     = hasCurve ? (bw / 2) / Math.sin(curveRad / 2) : 0;
              const focalX   = bx + bw / 2;
              const focalY   = by - arcR;

              // Build elements imperatively to keep JSX clean
              const seats: React.ReactElement[]     = [];
              const rowLabels: React.ReactElement[] = [];
              const secLabelEls: React.ReactElement[] = [];

              for (let r = 0; r < cd.rowCount; r++) {
                const flatRowCY  = by + r * (sh + rg) + sh / 2;
                const rowRadius  = hasCurve ? arcR + r * (sh + rg) + sh / 2 : 0;
                const isReserved = reserved.has(r);
                let globalIdx    = 0;

                for (const sec of secs) {
                  for (let s = 0; s < sec.count; s++) {
                    const flatCX = bx + sec.startX + s * (sw + sg) + sw / 2;
                    const seatKey = `${r}-${globalIdx}`;

                    if (!removed.has(seatKey)) {
                      let cx: number, cy: number, rot: number;
                      if (hasCurve) {
                        const t   = (flatCX - bx) / bw;
                        const ang = -curveRad / 2 + t * curveRad;
                        cx  = focalX + rowRadius * Math.sin(ang);
                        cy  = focalY + rowRadius * Math.cos(ang);
                        rot = -(ang * 180) / Math.PI;
                      } else {
                        cx = flatCX; cy = flatRowCY; rot = 0;
                      }
                      const hw         = seatRenderW / 2;
                      const hh         = sh / 2;
                      const isAssigned = !!(cd.seatAssignments?.[seatKey]);
                      const fill       = isAssigned ? '#4A90D9' : (isReserved ? '#FEF3C7' : '#f5f0eb');
                      const stroke     = isAssigned ? '#2563EB' : (isSelected ? '#3b82f6' : (isReserved ? '#D97706' : '#a08060'));

                      seats.push(
                        <g
                          key={seatKey}
                          transform={`translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${rot.toFixed(2)})`}
                          onMouseDown={(e) => handleCeremonySeatMouseDown(e, shape.id, seatKey, cx, cy, seatRenderW, sh)}
                          style={{ cursor: activeTool === 'select' ? 'pointer' : 'default' }}
                        >
                          <rect
                            x={-hw} y={-hh}
                            width={seatRenderW} height={sh}
                            rx={seatRx}
                            fill={fill} fillOpacity={fillOpacity}
                            stroke={stroke} strokeWidth={0.8}
                          />
                          {cStyle === 'chiavari' && hw > 2 && hh > 3 && (
                            <>
                              <line x1={-hw / 2.5} y1={-hh + 1} x2={-hw / 2.5} y2={hh - 1} stroke={stroke} strokeWidth="0.4" opacity="0.5" />
                              <line x1={ hw / 2.5} y1={-hh + 1} x2={ hw / 2.5} y2={hh - 1} stroke={stroke} strokeWidth="0.4" opacity="0.5" />
                            </>
                          )}
                        </g>
                      );
                    }
                    globalIdx++;
                  }
                }

                // Row labels intentionally omitted from canvas — preview only
              }

              if (secLabels.enabled && (aisleType === 'center' || aisleType === 'double')) {
                for (const sec of secs.slice(0, 2)) {
                  const sLx = bx + sec.startX;
                  const sW  = sec.count * sw + Math.max(0, sec.count - 1) * sg;
                  secLabelEls.push(
                    <text key={`sl-${sec.sectionIdx}`}
                      x={sLx + sW / 2} y={by - 6}
                      textAnchor="middle" dominantBaseline="baseline"
                      fontSize={Math.max(7, sh * 0.5)} fill="#6B7280" fontStyle="italic">
                      {sec.sectionIdx === 0 ? secLabels.left : secLabels.right}
                    </text>
                  );
                }
              }

              return (
                <g key={shape.id} transform={rotationTransform}>
                  {/* Invisible hit rect for selecting/dragging the whole block (under the seats) */}
                  <rect
                    x={bx} y={by} width={bw} height={bh}
                    fill="transparent" stroke="none"
                    onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                    style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                  />
                  {secLabelEls}
                  {rowLabels}
                  {seats}
                  {isSelected && (
                    <rect x={bx} y={by} width={bw} height={bh}
                      fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" />
                  )}
                </g>
              );
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
            // ── Dance Floor ──────────────────────────────────────────────────
            if (shape.elementType === 'dance-floor' && (shape as any).danceFloorData) {
              const df = (shape as any).danceFloorData;
              const isSelected = selectedShapeId === shape.id;
              const bx = shape.x, by = shape.y, bw = shape.width, bh = shape.height;
              const cx = bx + bw / 2, cy = by + bh / 2;
              const rw = bw / 2, rh = bh / 2;
              const dfShape: string = df.shape || 'square';
              const isCircleLike = dfShape === 'circle' || dfShape === 'oval';

              // Surface fill
              const surfaceFillMap: Record<string, string> = {
                'hardwood': '#c8a074', 'black-gloss': '#111111', 'white-gloss': '#f4f4f4',
                'checkered': '#ffffff', 'led-panels': '#0a0a1a', 'acrylic': 'rgba(200,230,255,0.25)',
                'marble': '#e8e4e0', 'custom': df.customColor || '#cccccc',
              };
              const surfaceFill = surfaceFillMap[df.surface] || 'rgba(255,228,181,0.5)';

              // Border
              const bThickMap: Record<string, number> = { thin: 1.5, medium: 2.5, thick: 5 };
              const bThick = bThickMap[df.borderThickness] || 2.5;
              const bDash = df.borderStyle === 'decorative' ? '8,4' : undefined;
              const bColor = df.borderColor || '#DEB887';

              // Polygon path helper
              const polyPath = (sides: number, startDeg: number): string => {
                const pts = Array.from({ length: sides }, (_, i) => {
                  const a = ((i / sides) * 360 + startDeg) * Math.PI / 180;
                  return `${(cx + rw * Math.cos(a)).toFixed(1)},${(cy + rh * Math.sin(a)).toFixed(1)}`;
                });
                return `M${pts.join('L')}Z`;
              };

              const hexPath = polyPath(6, -90);
              const octPath = polyPath(8, -22.5);
              const rectPath = `M${bx},${by}h${bw}v${bh}h${-bw}Z`;

              // Unique pattern IDs per shape
              const pid = `dfcs-${shape.id.slice(0, 8)}`;
              const clipId = `dfcl-${shape.id.slice(0, 8)}`;

              // Clip shape element
              const clipShape = isCircleLike
                ? <ellipse cx={cx} cy={cy} rx={rw} ry={rh} />
                : dfShape === 'hexagon' ? <path d={hexPath} />
                : dfShape === 'octagon' ? <path d={octPath} />
                : <rect x={bx} y={by} width={bw} height={bh} />;

              // Main shape fill element (surface)
              const surfacePatternId = df.surface === 'hardwood' ? `${pid}-hw`
                : df.surface === 'checkered' ? `${pid}-chk`
                : df.surface === 'led-panels' ? `${pid}-led`
                : df.surface === 'marble' ? `${pid}-mbl`
                : null;

              const shapeProps = {
                fill: surfacePatternId ? `url(#${surfacePatternId})` : surfaceFill,
                stroke: isSelected ? '#3b82f6' : (df.borderEnabled && df.borderStyle !== 'none' ? bColor : 'transparent'),
                strokeWidth: isSelected ? 3 : (df.borderEnabled && df.borderStyle !== 'none' ? bThick : 0),
                strokeDasharray: !isSelected && bDash ? bDash : undefined,
                style: { cursor: activeTool === 'select' ? 'move' as const : 'default' as const },
                onMouseDown: (e: React.MouseEvent) => handleShapeMouseDown(e, shape.id),
              };

              return (
                <g key={shape.id} transform={rotationTransform}>
                  <defs>
                    {/* Hardwood planks */}
                    <pattern id={`${pid}-hw`} x={bx} y={by} width="20" height="9" patternUnits="userSpaceOnUse">
                      <rect width="20" height="9" fill="#c8a074" />
                      <rect width="20" height="9" fill="none" stroke="#a07850" strokeWidth="0.7" opacity="0.5" />
                      <line x1="10" y1="0" x2="10" y2="9" stroke="#a07850" strokeWidth="0.4" opacity="0.3" />
                    </pattern>
                    {/* Checkered */}
                    <pattern id={`${pid}-chk`} x={bx} y={by} width="20" height="20" patternUnits="userSpaceOnUse">
                      <rect width="20" height="20" fill="#fff" />
                      <rect width="10" height="10" fill="#111" />
                      <rect x="10" y="10" width="10" height="10" fill="#111" />
                    </pattern>
                    {/* LED panels */}
                    <pattern id={`${pid}-led`} x={bx} y={by} width="16" height="16" patternUnits="userSpaceOnUse">
                      <rect width="16" height="16" fill="#0a0a1a" />
                      <rect x="3" y="3" width="10" height="10" fill={df.ledColor || '#7c3aed'} opacity="0.4" rx="2" />
                    </pattern>
                    {/* Marble */}
                    <pattern id={`${pid}-mbl`} x={bx} y={by} width="80" height="80" patternUnits="userSpaceOnUse">
                      <rect width="80" height="80" fill="#e8e4e0" />
                      <path d="M5 20 Q30 28 55 22 Q72 18 78 35" fill="none" stroke="rgba(150,130,120,0.4)" strokeWidth="1.8" />
                      <path d="M0 52 Q25 56 45 48 Q65 40 80 55" fill="none" stroke="rgba(150,130,120,0.3)" strokeWidth="1.2" />
                    </pattern>
                    {/* Clip */}
                    <clipPath id={clipId}>{clipShape}</clipPath>
                  </defs>

                  {/* ── Ambient glow ─────────────────── */}
                  {df.ambientGlow && (
                    <ellipse
                      cx={cx} cy={cy}
                      rx={rw + 18} ry={rh + 18}
                      fill={df.overheadLighting && !df.multicolorLight ? (df.lightColor || '#fbbf24') : '#fbbf24'}
                      opacity={0.14}
                      style={{ pointerEvents: 'none' }}
                    />
                  )}

                  {/* ── Main surface ─────────────────── */}
                  {isCircleLike ? (
                    <ellipse cx={cx} cy={cy} rx={rw} ry={rh} {...shapeProps} />
                  ) : dfShape === 'hexagon' ? (
                    <path d={hexPath} {...shapeProps} />
                  ) : dfShape === 'octagon' ? (
                    <path d={octPath} {...shapeProps} />
                  ) : (
                    <rect x={bx} y={by} width={bw} height={bh} {...shapeProps} />
                  )}

                  {/* ── Double border inner line ──────── */}
                  {!isSelected && df.borderEnabled && df.borderStyle === 'double' && (() => {
                    const inset = bThick * 2 + 3;
                    const innerProps = {
                      fill: 'none', stroke: bColor,
                      strokeWidth: bThick * 0.6, opacity: 0.65,
                      style: { pointerEvents: 'none' as const },
                    };
                    return isCircleLike
                      ? <ellipse cx={cx} cy={cy} rx={Math.max(1, rw - inset)} ry={Math.max(1, rh - inset)} {...innerProps} />
                      : dfShape === 'hexagon'
                        ? <path d={polyPath(6, -90)} transform={`scale(${(rw - inset) / rw})`} transformOrigin={`${cx} ${cy}`} {...innerProps} />
                        : dfShape === 'octagon'
                          ? <path d={polyPath(8, -22.5)} transform={`scale(${(rw - inset) / rw})`} transformOrigin={`${cx} ${cy}`} {...innerProps} />
                          : <rect x={bx + inset} y={by + inset} width={Math.max(1, bw - inset * 2)} height={Math.max(1, bh - inset * 2)} {...innerProps} />;
                  })()}

                  {/* ── Overhead lighting marks ───────── */}
                  {df.overheadLighting && (() => {
                    const lColor = df.multicolorLight ? null : (df.lightColor || '#fbbf24');
                    const palette = ['#ff3a3a', '#fbbf24', '#3aff3a', '#3a3aff', '#ff3aff', '#3affff'];
                    const count = df.lightingType === 'disco-ball' ? 1 : df.lightingType === 'spotlights' ? 4 : df.lightingType === 'uplights' ? 0 : 3;
                    const dots = [];
                    if (df.lightingType === 'uplights') {
                      // Uplights around perimeter — small glows clipped to shape
                      for (let i = 0; i < 8; i++) {
                        const a = (i / 8) * Math.PI * 2;
                        dots.push({ x: cx + rw * 0.85 * Math.cos(a), y: cy + rh * 0.85 * Math.sin(a), r: 6, c: lColor || palette[i % 6] });
                      }
                    } else if (df.lightingType === 'disco-ball') {
                      dots.push({ x: cx, y: cy, r: 12, c: lColor || '#fff' });
                    } else {
                      const r2 = Math.min(rw, rh) * 0.45;
                      for (let i = 0; i < count; i++) {
                        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
                        dots.push({ x: cx + r2 * Math.cos(a), y: cy + r2 * Math.sin(a), r: 7, c: lColor || palette[i % 6] });
                      }
                    }
                    return (
                      <g clipPath={`url(#${clipId})`} style={{ pointerEvents: 'none' }}>
                        {dots.map((d, i) => (
                          <g key={i}>
                            <circle cx={d.x} cy={d.y} r={d.r * 2} fill={d.c} opacity={0.18} />
                            <circle cx={d.x} cy={d.y} r={d.r * 0.6} fill={d.c} opacity={0.7} />
                          </g>
                        ))}
                        {df.lightingType === 'disco-ball' && (
                          <circle cx={cx} cy={cy} r={6} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={1} />
                        )}
                      </g>
                    );
                  })()}

                  {/* ── Surrounding chairs ────────────── */}
                  {df.surroundingChairs && (() => {
                    const count = Math.min(df.chairCount || 20, 80);
                    const offset = 10;
                    const chairs = [];
                    for (let i = 0; i < count; i++) {
                      const t = i / count;
                      let cx2: number, cy2: number, rot: number;
                      if (isCircleLike) {
                        const a = t * Math.PI * 2;
                        cx2 = cx + (rw + offset) * Math.cos(a);
                        cy2 = cy + (rh + offset) * Math.sin(a);
                        rot = a * 180 / Math.PI + 90;
                      } else {
                        const perim = 2 * (rw * 2 + rh * 2);
                        const dist = t * perim;
                        const top = rw * 2, right = top + rh * 2, bottom = right + rw * 2;
                        if (dist <= top) { cx2 = bx + dist; cy2 = by - offset; rot = 0; }
                        else if (dist <= right) { cx2 = bx + bw + offset; cy2 = by + (dist - top); rot = 90; }
                        else if (dist <= bottom) { cx2 = bx + bw - (dist - right); cy2 = by + bh + offset; rot = 180; }
                        else { cx2 = bx - offset; cy2 = by + bh - (dist - bottom); rot = 270; }
                      }
                      const cw = 8, ch = 7;
                      chairs.push(
                        <g key={i} transform={`translate(${cx2.toFixed(1)},${cy2.toFixed(1)}) rotate(${rot.toFixed(1)})`}
                          style={{ pointerEvents: 'none' }}>
                          <rect x={-cw/2} y={-ch/2} width={cw} height={ch} rx={1.5}
                            fill="#e8e4df" stroke="#a08060" strokeWidth={0.8}
                            fillOpacity={df.chairStyle === 'ghost' ? 0.4 : 1} />
                        </g>
                      );
                    }
                    return <>{chairs}</>;
                  })()}

                  {/* ── Entrance marker ───────────────── */}
                  {df.entranceEnabled && (() => {
                    const entW = df.entranceWidthM || 1.5;
                    const totalDim = df.entranceSide === 'top' || df.entranceSide === 'bottom' ? df.widthM : df.heightM;
                    const fracW = entW / Math.max(totalDim, 0.01);
                    const sidePx = df.entranceSide === 'top' || df.entranceSide === 'bottom' ? bw : bh;
                    const entPx = fracW * sidePx;
                    const hw = entPx / 2;
                    const arrLen = 14;
                    let x1: number, y1: number, x2: number, y2: number;
                    let ax: number, ay: number, adx: number, ady: number;
                    switch (df.entranceSide) {
                      case 'top':    x1=cx-hw; y1=by;    x2=cx+hw; y2=by;    ax=cx; ay=by-arrLen; adx=0;  ady=arrLen; break;
                      case 'bottom': x1=cx-hw; y1=by+bh; x2=cx+hw; y2=by+bh; ax=cx; ay=by+bh+arrLen; adx=0; ady=-arrLen; break;
                      case 'left':   x1=bx;    y1=cy-hw; x2=bx;    y2=cy+hw; ax=bx-arrLen; ay=cy; adx=arrLen; ady=0; break;
                      case 'right':  x1=bx+bw; y1=cy-hw; x2=bx+bw; y2=cy+hw; ax=bx+bw+arrLen; ay=cy; adx=-arrLen; ady=0; break;
                      default: x1=cx-hw; y1=by+bh; x2=cx+hw; y2=by+bh; ax=cx; ay=by+bh+arrLen; adx=0; ady=-arrLen;
                    }
                    const norm = Math.sqrt(adx*adx + ady*ady) || 1;
                    const perpX = (-ady / norm) * 7, perpY = (adx / norm) * 7;
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={bThick + 4} />
                        <line x1={ax} y1={ay} x2={ax+adx} y2={ay+ady} stroke="#3b82f6" strokeWidth={2} />
                        <polygon
                          points={`${ax+adx},${ay+ady} ${ax+adx-adx/norm*9+perpX},${ay+ady-ady/norm*9+perpY} ${ax+adx-adx/norm*9-perpX},${ay+ady-ady/norm*9-perpY}`}
                          fill="#3b82f6" />
                      </g>
                    );
                  })()}

                  {/* ── Label ─────────────────────────── */}
                  {df.labelVisible && df.label && (
                    <text
                      x={cx} y={cy}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(10, Math.min(18, bw / 8))}
                      fill={df.surface === 'black-gloss' || df.surface === 'led-panels' ? '#f8fafc' : '#374151'}
                      fontWeight="600"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {df.label}
                    </text>
                  )}

                  {/* ── Selection ring ────────────────── */}
                  {isSelected && (
                    isCircleLike
                      ? <ellipse cx={cx} cy={cy} rx={rw} ry={rh} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" style={{ pointerEvents: 'none' }} />
                      : <rect x={bx - 1} y={by - 1} width={bw + 2} height={bh + 2} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" style={{ pointerEvents: 'none' }} />
                  )}
                </g>
              );
            }

            // ── Stage ────────────────────────────────────────────────────────
            if (shape.elementType === 'stage' && (shape as any).stageData) {
              const sd = (shape as any).stageData;
              const isSelected = selectedShapeId === shape.id;
              const bx = shape.x, by = shape.y, bw = shape.width, bh = shape.height;
              const cx = bx + bw / 2, cy = by + bh / 2;

              // Apron depth in canvas pixels
              const isHorizFront = sd.frontEdge === 'top' || sd.frontEdge === 'bottom';
              const frontDimPx = isHorizFront ? bh : bw;
              const apronD = sd.variant === 'apron' ? (sd.apronDepthPct || 0.18) * frontDimPx : 0;

              // Stage shape path
              const getStagePath = (): string => {
                if (sd.variant === 'rectangular' || !sd.variant) {
                  return `M${bx},${by}H${bx + bw}V${by + bh}H${bx}Z`;
                }
                switch (sd.frontEdge) {
                  case 'bottom':
                    return `M${bx},${by}L${bx + bw},${by}L${bx + bw},${by + bh}C${bx + bw},${by + bh + apronD} ${bx},${by + bh + apronD} ${bx},${by + bh}Z`;
                  case 'top':
                    return `M${bx},${by}C${bx},${by - apronD} ${bx + bw},${by - apronD} ${bx + bw},${by}L${bx + bw},${by + bh}L${bx},${by + bh}Z`;
                  case 'left':
                    return `M${bx},${by}C${bx - apronD},${by} ${bx - apronD},${by + bh} ${bx},${by + bh}L${bx + bw},${by + bh}L${bx + bw},${by}Z`;
                  case 'right':
                    return `M${bx},${by}L${bx},${by + bh}L${bx + bw},${by + bh}C${bx + bw + apronD},${by + bh} ${bx + bw + apronD},${by} ${bx + bw},${by}Z`;
                  default:
                    return `M${bx},${by}H${bx + bw}V${by + bh}H${bx}Z`;
                }
              };

              const stagePath = getStagePath();

              // Border
              const bThickMap: Record<string, number> = { thin: 1.5, medium: 2.5, thick: 5 };
              const bThick = bThickMap[sd.borderThickness] || 2.5;
              const bDash = sd.borderStyle === 'decorative' ? '8,4' : undefined;
              const bColor = sd.borderColor || '#8B6914';

              // Stairs
              const renderStairs = () => {
                if (!sd.stairsEnabled) return null;
                const count: number = sd.stairsCount || 3;
                const stepD = Math.max(10, Math.min(22, frontDimPx * 0.07));
                const totalPx = count * stepD;
                const stairsWPx = (sd.stairsWidthM / Math.max(sd.widthM, 0.01)) * (isHorizFront ? bw : bh);
                const hw = stairsWPx / 2;
                const treadLines = Array.from({ length: count - 1 }, (_, i) => i + 1);
                const fc = sd.fillColor || '#e8dcc8';
                const sc = sd.borderEnabled ? bColor : '#888';

                switch (sd.frontEdge) {
                  case 'bottom': {
                    const baseY = by + bh + apronD;
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect x={cx - hw} y={baseY} width={stairsWPx} height={totalPx} fill={fc} fillOpacity={0.7} />
                        {treadLines.map((i) => (
                          <line key={i} x1={cx - hw} y1={baseY + i * stepD} x2={cx + hw} y2={baseY + i * stepD} stroke={sc} strokeWidth={1.2} />
                        ))}
                        <rect x={cx - hw} y={baseY} width={stairsWPx} height={totalPx} fill="none" stroke={sc} strokeWidth={1.2} />
                      </g>
                    );
                  }
                  case 'top': {
                    const baseY = by - apronD - totalPx;
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect x={cx - hw} y={baseY} width={stairsWPx} height={totalPx} fill={fc} fillOpacity={0.7} />
                        {treadLines.map((i) => (
                          <line key={i} x1={cx - hw} y1={baseY + i * stepD} x2={cx + hw} y2={baseY + i * stepD} stroke={sc} strokeWidth={1.2} />
                        ))}
                        <rect x={cx - hw} y={baseY} width={stairsWPx} height={totalPx} fill="none" stroke={sc} strokeWidth={1.2} />
                      </g>
                    );
                  }
                  case 'left': {
                    const baseX = bx - apronD - totalPx;
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect x={baseX} y={cy - hw} width={totalPx} height={stairsWPx} fill={fc} fillOpacity={0.7} />
                        {treadLines.map((i) => (
                          <line key={i} x1={baseX + i * stepD} y1={cy - hw} x2={baseX + i * stepD} y2={cy + hw} stroke={sc} strokeWidth={1.2} />
                        ))}
                        <rect x={baseX} y={cy - hw} width={totalPx} height={stairsWPx} fill="none" stroke={sc} strokeWidth={1.2} />
                      </g>
                    );
                  }
                  case 'right': {
                    const baseX = bx + bw + apronD;
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect x={baseX} y={cy - hw} width={totalPx} height={stairsWPx} fill={fc} fillOpacity={0.7} />
                        {treadLines.map((i) => (
                          <line key={i} x1={baseX + i * stepD} y1={cy - hw} x2={baseX + i * stepD} y2={cy + hw} stroke={sc} strokeWidth={1.2} />
                        ))}
                        <rect x={baseX} y={cy - hw} width={totalPx} height={stairsWPx} fill="none" stroke={sc} strokeWidth={1.2} />
                      </g>
                    );
                  }
                  default: return null;
                }
              };

              return (
                <g
                  key={shape.id}
                  transform={rotationTransform}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'select') onShapeDoubleClick?.(shape.id);
                  }}
                >
                  {/* Stairs render behind stage surface */}
                  {renderStairs()}

                  {/* Stage fill + outline */}
                  <path
                    d={stagePath}
                    fill={sd.fillColor || 'rgba(221,160,221,0.5)'}
                    stroke={isSelected ? '#3b82f6' : (sd.borderEnabled ? bColor : 'transparent')}
                    strokeWidth={isSelected ? 3 : (sd.borderEnabled ? bThick : 0)}
                    strokeDasharray={!isSelected && bDash ? bDash : undefined}
                    style={{ cursor: activeTool === 'select' ? 'move' as const : 'default' as const }}
                    onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  />

                  {/* Double border inner line (rectangular only) */}
                  {!isSelected && sd.borderEnabled && sd.borderStyle === 'double' && sd.variant !== 'apron' && (() => {
                    const inset = bThick * 2 + 3;
                    return (
                      <rect
                        x={bx + inset} y={by + inset}
                        width={Math.max(1, bw - inset * 2)} height={Math.max(1, bh - inset * 2)}
                        fill="none" stroke={bColor} strokeWidth={bThick * 0.6} opacity={0.65}
                        style={{ pointerEvents: 'none' }}
                      />
                    );
                  })()}

                  {/* Label */}
                  {sd.labelVisible && sd.label && (
                    <text
                      x={cx} y={cy}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(10, Math.min(20, bw / 7))}
                      fill={['#111111', '#333333', '#4a2e1a', '#2d5a3d', '#1e3a5f'].some((c) => c === sd.fillColor) ? '#f8fafc' : '#374151'}
                      fontWeight="600"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {sd.label}
                    </text>
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <rect x={bx - 2} y={by - 2} width={bw + 4} height={bh + 4}
                      fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
                      style={{ pointerEvents: 'none' }} />
                  )}
                </g>
              );
            }

            // ── Altar ────────────────────────────────────────────────────────
            if (shape.elementType === 'altar' && (shape as any).altarData) {
              const ad = (shape as any).altarData;
              const isSelected = selectedShapeId === shape.id;
              const bx = shape.x, by = shape.y, bw = shape.width, bh = shape.height;
              const cx = bx + bw / 2, cy = by + bh / 2;

              // Use custom vertex data if present, otherwise fall back to base shape for variant
              const shapeKey = (ad.variant as string) === 't-shape' ? 't-shape' : (ad.variant || 'rectangular');
              const shapeData = ad.customShapeData ?? BASE_SHAPE_DATA[shapeKey] ?? BASE_SHAPE_DATA['rectangular'];
              const altarPath = computeShapePath(shapeData, bx, by, bw, bh);

              const strokeColor = isSelected ? '#3b82f6' : (ad.borderEnabled ? (ad.borderColor || '#b8a080') : 'transparent');
              const strokeW = isSelected ? 3 : (ad.borderEnabled ? 2 : 0);

              // Arch geometry (above altar top edge)
              const archEnabled = ad.archEnabled ?? false;
              const archStyle: string = ad.archStyle ?? 'round';
              const archWidthM: number = ad.archWidthM ?? ad.widthM ?? 2;
              const archHeightM: number = ad.archHeightM ?? 2.5;
              const archScale = bw / Math.max(ad.widthM ?? 2, 0.01);
              const archHW = (archWidthM / Math.max(ad.widthM ?? 2, 0.01)) * bw * 0.5 * 1.05;
              const archH = archHeightM * archScale * 0.55;
              const archBaseY = by;
              const archTopY = archBaseY - archH;

              let archPath = '';
              if (archEnabled && archH > 0) {
                const lx = cx - archHW, rx = cx + archHW;
                switch (archStyle) {
                  case 'gothic':
                    archPath = `M${lx},${archBaseY} L${lx},${archTopY + archH * 0.15} Q${lx},${archTopY - 4} ${cx},${archTopY} Q${rx},${archTopY - 4} ${rx},${archTopY + archH * 0.15} L${rx},${archBaseY}`;
                    break;
                  case 'geometric':
                    archPath = `M${lx},${archBaseY} L${lx},${archTopY} L${rx},${archTopY} L${rx},${archBaseY}`;
                    break;
                  case 'organic':
                    archPath = `M${lx},${archBaseY} C${lx},${archTopY + archH * 0.5} ${cx - archHW * 0.6},${archTopY} ${cx},${archTopY} C${cx + archHW * 0.6},${archTopY} ${rx},${archTopY + archH * 0.5} ${rx},${archBaseY}`;
                    break;
                  default: // round
                    archPath = `M${lx},${archBaseY} L${lx},${archTopY + archH * 0.35} Q${lx},${archTopY} ${cx},${archTopY} Q${rx},${archTopY} ${rx},${archTopY + archH * 0.35} L${rx},${archBaseY}`;
                }
              }

              const archMatColors: Record<string, string> = {
                'floral': '#f9a8c9', 'greenery': '#4ade80', 'wood-metal': '#c8a074', 'fabric': '#e2e8f0',
              };
              const archColor = archMatColors[ad.archMaterial ?? 'floral'] ?? '#f9a8c9';

              // Draping
              const drapingEnabled = ad.drapingEnabled ?? false;
              const drapingColor: string = ad.drapingColor ?? '#ffffff';
              const drapingStyle: string = ad.drapingStyle ?? 'full-cover';

              return (
                <g
                  key={shape.id}
                  transform={rotationTransform}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'select') onShapeDoubleClick?.(shape.id);
                  }}
                >
                  {/* Arch behind altar */}
                  {archEnabled && archPath && (
                    <path d={archPath}
                      fill={`${archColor}30`}
                      stroke={archColor}
                      strokeWidth={archStyle === 'geometric' ? Math.max(3, bw * 0.025) : Math.max(4, bw * 0.03)}
                      strokeLinecap="round"
                      style={{ pointerEvents: 'none' }} />
                  )}

                  {/* Altar body */}
                  <path
                    d={altarPath}
                    fill={ad.fillColor || '#f5f0e8'}
                    stroke={strokeColor} strokeWidth={strokeW}
                    style={{ cursor: activeTool === 'select' ? 'move' as const : 'default' as const }}
                    onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  />

                  {/* Draping overlay */}
                  {drapingEnabled && drapingStyle !== 'side-swags' && (
                    <path
                      d={drapingStyle === 'front-panel'
                        ? `M${bx},${by + bh * 0.6} H${bx + bw} V${by + bh} H${bx} Z`
                        : altarPath}
                      fill={drapingColor} fillOpacity={0.45}
                      stroke={drapingColor} strokeWidth={0.5} strokeOpacity={0.5}
                      style={{ pointerEvents: 'none' }} />
                  )}
                  {drapingEnabled && drapingStyle === 'side-swags' && (
                    <>
                      <path d={`M${bx},${by} Q${bx - bw * 0.12},${by + bh * 0.5} ${bx},${by + bh}`}
                        fill="none" stroke={drapingColor} strokeWidth={Math.max(3, bw * 0.025)} strokeLinecap="round" opacity={0.65}
                        style={{ pointerEvents: 'none' }} />
                      <path d={`M${bx + bw},${by} Q${bx + bw + bw * 0.12},${by + bh * 0.5} ${bx + bw},${by + bh}`}
                        fill="none" stroke={drapingColor} strokeWidth={Math.max(3, bw * 0.025)} strokeLinecap="round" opacity={0.65}
                        style={{ pointerEvents: 'none' }} />
                    </>
                  )}

                  {ad.labelVisible && ad.label && (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(9, Math.min(16, bw / 6))}
                      fill={['#111111', '#333333', '#4a2e1a'].includes(ad.fillColor) ? '#f8fafc' : '#374151'}
                      fontWeight="600" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {ad.label}
                    </text>
                  )}
                  {isSelected && (
                    <rect x={bx - 2} y={by - 2} width={bw + 4} height={bh + 4}
                      fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
                      style={{ pointerEvents: 'none' }} />
                  )}
                </g>
              );
            }

            // ── Pathway ──────────────────────────────────────────────────────
            if (shape.elementType === 'pathway' && (shape as any).pathwayData) {
              const pd = (shape as any).pathwayData;
              const isSelected = selectedShapeId === shape.id;
              const bx = shape.x, by = shape.y, bw = shape.width, bh = shape.height;
              const cx = bx + bw / 2, cy = by + bh / 2;

              // Deterministic petal positions (same formula as modal preview)
              const petalCount = Math.max(4, Math.min(40, Math.round((pd.lengthM || 10) * 2)));
              const petals = pd.style === 'petal'
                ? Array.from({ length: petalCount }, (_, i) => {
                    const t = (i + 0.5) / petalCount;
                    const sideOffset = ((i * 47) % 100) / 100 - 0.5;
                    return {
                      x: bx + bw * 0.5 + sideOffset * bw * 0.55,
                      y: by + t * bh,
                      rot: (i * 67) % 180,
                    };
                  })
                : [];

              return (
                <g
                  key={shape.id}
                  transform={rotationTransform}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'select') onShapeDoubleClick?.(shape.id);
                  }}
                >
                  {/* Base fill */}
                  <rect
                    x={bx} y={by} width={bw} height={bh}
                    fill={pd.fillColor || '#f9f7f4'}
                    stroke={isSelected ? '#3b82f6' : '#d0c8b8'}
                    strokeWidth={isSelected ? 3 : 1}
                    style={{ cursor: activeTool === 'select' ? 'move' as const : 'default' as const }}
                    onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  />

                  {/* Dashed center line */}
                  {pd.style === 'dashed' && (
                    <line x1={cx} y1={by + 4} x2={cx} y2={by + bh - 4}
                      stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} strokeDasharray="10,8"
                      style={{ pointerEvents: 'none' }} />
                  )}

                  {/* Petal scatter */}
                  {pd.style === 'petal' && petals.map((p, i) => (
                    <ellipse key={i}
                      cx={p.x} cy={p.y}
                      rx={Math.max(2, bw * 0.14)} ry={Math.max(1.2, bw * 0.07)}
                      fill="rgba(210,120,150,0.5)"
                      transform={`rotate(${p.rot},${p.x},${p.y})`}
                      style={{ pointerEvents: 'none' }} />
                  ))}

                  {/* Label */}
                  {pd.labelVisible && pd.label && (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(9, Math.min(14, bw / 3))}
                      fill={['#111111', '#333333'].includes(pd.fillColor) ? '#f8fafc' : '#374151'}
                      fontWeight="600" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {pd.label}
                    </text>
                  )}

                  {isSelected && (
                    <rect x={bx - 2} y={by - 2} width={bw + 4} height={bh + 4}
                      fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
                      style={{ pointerEvents: 'none' }} />
                  )}
                </g>
              );
            }

            // ── Audio Visual Elements ─────────────────────────────────────────
            const AV_TYPES = [
              'av-mixing-desk', 'av-speaker', 'av-subwoofer', 'av-truss',
              'av-moving-head', 'av-led-wall', 'av-screen', 'av-projector', 'av-light-console',
            ];
            if (shape.elementType && AV_TYPES.includes(shape.elementType)) {
              const avType = shape.elementType;
              const avd = (shape as any).avData || {};
              const isSelected = selectedShapeId === shape.id;
              const bx = shape.x, by = shape.y, bw = shape.width, bh = shape.height;
              const cx = bx + bw / 2, cy = by + bh / 2;
              const accentColor = avd.color || '#3b82f6';

              // All AV renderers are strict top-down / bird's eye view
              const renderAVShape = () => {
                const labelEl = avd.label ? (
                  <text x={cx} y={by + bh + Math.max(10, bh * 0.18)} textAnchor="middle"
                    fontSize={Math.max(7, Math.min(bh * 0.25, 11))} fill="#64748b"
                    style={{ pointerEvents: 'none' }}>
                    {avd.label}
                  </text>
                ) : null;

                switch (avType) {
                  case 'av-mixing-desk': {
                    // Rectangle footprint with concave arc on operator-facing (bottom) edge
                    const d = `M${bx},${by} H${bx + bw} V${by + bh} Q${cx},${by + bh * 0.45} ${bx},${by + bh} Z`;
                    return (
                      <g>
                        <path d={d} fill="#2a2a2a" stroke="#6b7280" strokeWidth="1.5" />
                        {/* Rear edge detail line */}
                        <line x1={bx + bw * 0.08} y1={by + bh * 0.14} x2={bx + bw * 0.92} y2={by + bh * 0.14}
                          stroke="#4b5563" strokeWidth="0.8" />
                        {labelEl}
                      </g>
                    );
                  }
                  case 'av-speaker': {
                    const qty = avd.quantity || 1;
                    const cellW = bw / qty;
                    return (
                      <g>
                        {Array.from({ length: qty }, (_, i) => {
                          const sx = bx + cellW * i + cellW * 0.08;
                          const sw = cellW * 0.84;
                          const cabH = bh * 0.6;
                          const spread = sw * 0.6;
                          return (
                            <g key={i}>
                              {/* Cabinet footprint */}
                              <rect x={sx} y={by} width={sw} height={cabH} rx="2"
                                fill="#1a1a1a" stroke="#6b7280" strokeWidth="1.2" />
                              {/* Directional throw wedge */}
                              <path d={`M${sx + sw * 0.2},${by + cabH} L${sx + sw * 0.8},${by + cabH} L${sx + sw / 2 + spread},${by + bh} L${sx + sw / 2 - spread},${by + bh} Z`}
                                fill="#1a1a1a" fillOpacity={0.28} stroke="#6b7280" strokeWidth="0.8" strokeDasharray="3 2" />
                            </g>
                          );
                        })}
                        {labelEl}
                      </g>
                    );
                  }
                  case 'av-subwoofer': {
                    const qty = avd.quantity || 1;
                    const cellW = bw / qty;
                    return (
                      <g>
                        {Array.from({ length: qty }, (_, i) => {
                          const sx = bx + cellW * i + cellW * 0.04;
                          const sw = cellW * 0.92;
                          return (
                            <g key={i}>
                              {/* Heavier border + darker fill to distinguish from speaker */}
                              <rect x={sx} y={by + bh * 0.08} width={sw} height={bh * 0.84} rx="2"
                                fill="#0a0a0a" stroke="#9ca3af" strokeWidth="2.5" />
                              {/* Centre divider line — extra visual mass */}
                              <line x1={sx + sw * 0.5} y1={by + bh * 0.14} x2={sx + sw * 0.5} y2={by + bh * 0.86}
                                stroke="#374151" strokeWidth="1.5" />
                            </g>
                          );
                        })}
                        {labelEl}
                      </g>
                    );
                  }
                  case 'av-truss': {
                    const qty = avd.quantity || 1;
                    const rowH = bh / qty;
                    return (
                      <g>
                        {Array.from({ length: qty }, (_, i) => {
                          const ty = by + rowH * i + rowH * 0.12;
                          const th = rowH * 0.76;
                          const step = Math.max(12, bw / 20);
                          const count = Math.ceil(bw / step) + 2;
                          return (
                            <g key={i}>
                              <rect x={bx} y={ty} width={bw} height={th}
                                fill="#2d2d2d" stroke="#9ca3af" strokeWidth="1.5" />
                              {/* Diagonal crosshatch clipped inside */}
                              <clipPath id={`truss-c-${shape.id}-${i}`}>
                                <rect x={bx} y={ty} width={bw} height={th} />
                              </clipPath>
                              <g clipPath={`url(#truss-c-${shape.id}-${i})`}>
                                {Array.from({ length: count }, (_, ci) => (
                                  <g key={ci}>
                                    <line x1={bx + step * ci - th} y1={ty}
                                      x2={bx + step * ci} y2={ty + th}
                                      stroke="#555" strokeWidth="0.7" />
                                    <line x1={bx + step * ci} y1={ty}
                                      x2={bx + step * ci - th} y2={ty + th}
                                      stroke="#555" strokeWidth="0.7" />
                                  </g>
                                ))}
                              </g>
                            </g>
                          );
                        })}
                        {labelEl}
                      </g>
                    );
                  }
                  case 'av-moving-head': {
                    const qty = avd.quantity || 1;
                    const cellW = bw / qty;
                    return (
                      <g>
                        {Array.from({ length: qty }, (_, i) => {
                          const ucx = bx + cellW * i + cellW / 2;
                          const ucy = by + bh * 0.42;
                          const r = Math.min(cellW * 0.34, bh * 0.34);
                          const beamSpread = r * 1.6;
                          return (
                            <g key={i}>
                              {/* Unit square footprint */}
                              <rect x={ucx - r} y={ucy - r} width={r * 2} height={r * 2} rx="2"
                                fill="#1a1a1a" stroke="#6b7280" strokeWidth="1.2" />
                              {/* Head circle (rotating unit seen from above) */}
                              <circle cx={ucx} cy={ucy} r={r * 0.62}
                                fill="#111" stroke={accentColor} strokeWidth="1" />
                              {/* Beam cone extending downward */}
                              <path d={`M${ucx - r * 0.42},${ucy + r} L${ucx + r * 0.42},${ucy + r} L${ucx + beamSpread},${by + bh} L${ucx - beamSpread},${by + bh} Z`}
                                fill={accentColor} fillOpacity={0.12}
                                stroke={accentColor} strokeWidth="0.8" strokeDasharray="3 2" />
                            </g>
                          );
                        })}
                        {labelEl}
                      </g>
                    );
                  }
                  case 'av-led-wall': {
                    // Top-down: thin horizontal strip (panel standing upright seen from above)
                    // bw = width of wall, bh = shallow depth of the panel
                    const panelCount = Math.max(3, Math.round(bw / 40));
                    const panelW = bw / panelCount;
                    return (
                      <g>
                        <rect x={bx} y={by} width={bw} height={bh}
                          fill="#1a1a1a" stroke="#4b5563" strokeWidth="1.5" />
                        {/* Vertical module joints */}
                        {Array.from({ length: panelCount - 1 }, (_, i) => (
                          <line key={i}
                            x1={bx + panelW * (i + 1)} y1={by}
                            x2={bx + panelW * (i + 1)} y2={by + bh}
                            stroke="#6b7280" strokeWidth="0.8" />
                        ))}
                        {/* Shadow depth indicator */}
                        <rect x={bx + bw * 0.02} y={by + bh} width={bw * 0.96} height={Math.max(2, bh * 0.4)}
                          fill="#0a0a0a" fillOpacity={0.35} />
                        {labelEl}
                      </g>
                    );
                  }
                  case 'av-screen': {
                    // Top-down: thin strip (screen standing upright seen from above) + foot markers
                    return (
                      <g>
                        <rect x={bx} y={by} width={bw} height={bh}
                          fill="#d1d5db" stroke="#6b7280" strokeWidth="1.5" />
                        {/* Foot/stand protrusions at each bottom corner */}
                        <rect x={bx - 3} y={by + bh} width={Math.max(6, bw * 0.06)} height={Math.max(3, bh * 0.7)} rx="1"
                          fill="#9ca3af" stroke="#6b7280" strokeWidth="0.8" />
                        <rect x={bx + bw - Math.max(3, bw * 0.03)} y={by + bh} width={Math.max(6, bw * 0.06)} height={Math.max(3, bh * 0.7)} rx="1"
                          fill="#9ca3af" stroke="#6b7280" strokeWidth="0.8" />
                        {labelEl}
                      </g>
                    );
                  }
                  case 'av-projector': {
                    // Top-down: rectangle body + triangular light cone extending forward
                    const bodyW = bw * 0.72;
                    const bx2 = cx - bodyW / 2;
                    const by2 = by + bh * 0.12;
                    const bodyH = bh * 0.55;
                    const coneL = bx;
                    const coneR = bx + bw;
                    return (
                      <g>
                        {/* Throw cone */}
                        <path d={`M${bx2 + bodyW * 0.2},${by2 + bodyH} L${bx2 + bodyW * 0.8},${by2 + bodyH} L${coneR},${by + bh} L${coneL},${by + bh} Z`}
                          fill={accentColor} fillOpacity={0.1}
                          stroke={accentColor} strokeWidth="0.8" strokeDasharray="4 3" />
                        {/* Body */}
                        <rect x={bx2} y={by2} width={bodyW} height={bodyH} rx="3"
                          fill="#1a1a1a" stroke="#6b7280" strokeWidth="1.5" />
                        {/* Lens dot on front edge */}
                        <circle cx={cx} cy={by2 + bodyH} r={Math.min(bodyW, bodyH) * 0.1}
                          fill={accentColor} fillOpacity={0.9} />
                        {labelEl}
                      </g>
                    );
                  }
                  case 'av-light-console': {
                    // Top-down: trapezoid — narrower at back, wider at operator (bottom) edge
                    const narrowW = bw * 0.68;
                    const d = `M${cx - narrowW / 2},${by} H${cx + narrowW / 2} L${bx + bw},${by + bh} H${bx} Z`;
                    return (
                      <g>
                        <path d={d} fill="#0f172a" stroke="#4b5563" strokeWidth="1.5" />
                        {/* Centre ridge line */}
                        <line x1={cx} y1={by + bh * 0.12} x2={cx} y2={by + bh * 0.88}
                          stroke="#374151" strokeWidth="0.8" />
                        {labelEl}
                      </g>
                    );
                  }
                  default:
                    return (
                      <rect x={bx} y={by} width={bw} height={bh} rx="3"
                        fill="#1a1a2e" stroke={accentColor} strokeWidth="1.5" />
                    );
                }
              };

              return (
                <g
                  key={shape.id}
                  transform={rotationTransform}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'select') onShapeDoubleClick?.(shape.id);
                  }}
                  style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                >
                  {renderAVShape()}
                  {isSelected && (
                    <rect x={bx - 2} y={by - 2} width={bw + 4} height={bh + 4}
                      fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
                      style={{ pointerEvents: 'none' }} />
                  )}
                </g>
              );
            }

            // ── Bar ───────────────────────────────────────────────────────────
            if (shape.elementType === 'bar' && (shape as any).barData) {
              const bd = (shape as any).barData;
              const isSelected = selectedShapeId === shape.id;
              const bx = shape.x, by = shape.y, bw = shape.width, bh = shape.height;
              const cx = bx + bw / 2, cy = by + bh / 2;

              const SE = { curved: false, cpx: 0.5, cpy: 0.5 };
              const BAR_SHAPE_DATA_CANVAS: Record<string, any> = {
                straight: BASE_SHAPE_DATA['rectangular'],
                corner: {
                  corners: [{x:0,y:0},{x:1,y:0},{x:1,y:0.5},{x:0.5,y:0.5},{x:0.5,y:1},{x:0,y:1}],
                  edges: Array(6).fill(SE),
                },
                'l-shape': {
                  corners: [{x:0,y:0},{x:1,y:0},{x:1,y:0.35},{x:0.45,y:0.35},{x:0.45,y:1},{x:0,y:1}],
                  edges: Array(6).fill(SE),
                },
                'u-shape': {
                  corners: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0.72,y:1},{x:0.72,y:0.32},{x:0.28,y:0.32},{x:0.28,y:1},{x:0,y:1}],
                  edges: Array(8).fill(SE),
                },
                arc: {
                  corners: [{x:0,y:0},{x:1,y:0},{x:1,y:0.4},{x:0,y:0.4}],
                  edges: [SE, SE, { curved: true, cpx: 0.5, cpy: 1.5 }, SE],
                },
              };

              const shapeData = bd.customShapeData ?? BAR_SHAPE_DATA_CANVAS[bd.variant] ?? BASE_SHAPE_DATA['rectangular'];
              const barPath = computeShapePath(shapeData, bx, by, bw, bh);
              const strokeColor = isSelected ? '#3b82f6' : (bd.borderEnabled ? (bd.borderColor || '#8b6340') : 'transparent');
              const strokeW = isSelected ? 3 : (bd.borderEnabled ? 2 : 0);

              // Back bar rect (placed above the main bar)
              const bbH = bd.backBarEnabled ? (bd.backBarDepthM || 0.5) * (bh / (bd.depthM || 0.6)) : 0;
              const bbGap = bd.backBarEnabled ? (bd.backBarGapM || 1.0) * (bh / (bd.depthM || 0.6)) : 0;
              const bbY = by - bbGap - bbH;

              // Service side line
              const serviceLinePath = (() => {
                switch (bd.serviceSide) {
                  case 'top':    return `M${bx},${by} H${bx + bw}`;
                  case 'bottom': return `M${bx},${by + bh} H${bx + bw}`;
                  case 'left':   return `M${bx},${by} V${by + bh}`;
                  case 'right':  return `M${bx + bw},${by} V${by + bh}`;
                  default:       return `M${bx},${by + bh} H${bx + bw}`;
                }
              })();

              return (
                <g
                  key={shape.id}
                  transform={rotationTransform}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'select') onShapeDoubleClick?.(shape.id);
                  }}
                  style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                >
                  {/* Back bar */}
                  {bd.backBarEnabled && bbH > 0 && (
                    <rect x={bx} y={bbY} width={bw} height={bbH}
                      fill={bd.fillColor || '#c8a074'} fillOpacity={0.5}
                      stroke={bd.borderEnabled ? bd.borderColor : '#8b6340'}
                      strokeWidth={1.5} strokeDasharray="4,3" rx="2" />
                  )}
                  {/* Main bar body */}
                  <path d={barPath}
                    fill={bd.fillColor || '#c8a074'}
                    stroke={strokeColor} strokeWidth={strokeW}
                  />
                  {/* Service side indicator */}
                  <path d={serviceLinePath} fill="none" stroke="#e11d48" strokeWidth={2} strokeDasharray="5,3" />
                  {/* Label */}
                  {bd.labelVisible && bd.label && (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(8, Math.min(14, bw / 8))}
                      fill={['#111111','#333333','#4a4a4a','#1c3d5a','#2d5a3d'].includes(bd.fillColor) ? '#f8fafc' : '#374151'}
                      fontWeight="600" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {bd.label}
                    </text>
                  )}
                  {isSelected && (
                    <rect x={bx - 2} y={by - 2} width={bw + 4} height={bh + 4}
                      fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
                      style={{ pointerEvents: 'none' }} />
                  )}
                </g>
              );
            }

            // ── Cocktail Table ─────────────────────────────────────────────────
            if (shape.elementType === 'cocktail' && (shape as any).cocktailData) {
              const cd = (shape as any).cocktailData;
              const isSelected = selectedShapeId === shape.id;
              const bx = shape.x, by = shape.y, bw = shape.width, bh = shape.height;
              const cx = bx + bw / 2, cy = by + bh / 2;
              const isRoundish = cd.variant === 'round' || cd.variant === 'oval';
              const strokeColor = isSelected ? '#3b82f6' : (cd.borderEnabled ? (cd.borderColor || '#c8a074') : 'transparent');
              const strokeW = isSelected ? 3 : (cd.borderEnabled ? 2 : 0);
              const seatCount = cd.seatsEnabled ? (cd.seatCount || 4) : 0;

              return (
                <g
                  key={shape.id}
                  transform={rotationTransform}
                  onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (activeTool === 'select') onShapeDoubleClick?.(shape.id);
                  }}
                  style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
                >
                  {/* Linen */}
                  {cd.linenEnabled && (
                    <ellipse cx={cx} cy={cy}
                      rx={bw / 2 + Math.min(bw, bh) * 0.2}
                      ry={bh / 2 + Math.min(bw, bh) * 0.2}
                      fill={cd.linenColor || '#ffffff'} fillOpacity={0.55}
                      stroke={cd.linenColor || '#ffffff'} strokeWidth={1} strokeOpacity={0.4} />
                  )}
                  {/* Seats */}
                  {seatCount > 0 && Array.from({ length: seatCount }, (_, i) => {
                    const angle = (2 * Math.PI * i) / seatCount - Math.PI / 2;
                    const r = Math.max(bw, bh) / 2 + Math.min(bw, bh) * 0.25;
                    const sx = cx + r * Math.cos(angle);
                    const sy = cy + r * Math.sin(angle);
                    const sr = Math.min(bw, bh) * 0.1;
                    return (
                      <circle key={i} cx={sx} cy={sy} r={Math.max(4, sr)}
                        fill="none" stroke="#475569" strokeWidth={1.5} />
                    );
                  })}
                  {/* Table body */}
                  {isRoundish ? (
                    <ellipse cx={cx} cy={cy} rx={bw / 2} ry={bh / 2}
                      fill={cd.fillColor || '#f5f0e8'}
                      stroke={strokeColor} strokeWidth={strokeW} />
                  ) : (
                    <rect x={bx} y={by} width={bw} height={bh} rx="3"
                      fill={cd.fillColor || '#f5f0e8'}
                      stroke={strokeColor} strokeWidth={strokeW} />
                  )}
                  {/* Sheen ring */}
                  {isRoundish ? (
                    <ellipse cx={cx} cy={cy} rx={Math.max(2, bw / 2 - 3)} ry={Math.max(2, bh / 2 - 3)}
                      fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
                  ) : (
                    <rect x={bx + 4} y={by + 4} width={Math.max(0, bw - 8)} height={Math.max(0, bh - 8)}
                      rx="1" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
                  )}
                  {/* Label */}
                  {cd.labelVisible && cd.label && (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(7, Math.min(12, bw / 4))}
                      fill={['#111111','#333333','#4a4a4a'].includes(cd.fillColor) ? '#f8fafc' : '#374151'}
                      fontWeight="600" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {cd.label}
                    </text>
                  )}
                  {isSelected && (
                    <rect x={bx - 2} y={by - 2} width={bw + 4} height={bh + 4}
                      fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
                      style={{ pointerEvents: 'none' }} />
                  )}
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
            <text 
              key={el.id} 
              x={el.x} 
              y={el.y} 
              fontSize={el.fontSize} 
              fill={el.fill}
              fontWeight={el.fontWeight || 'normal'}
              fontStyle={el.fontStyle || 'normal'}
              textAnchor={el.textAnchor || 'start'}
              style={{ 
                cursor: activeTool === 'select' ? 'pointer' : 'text',
                userSelect: 'none',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (activeTool === 'select') {
                  setSelectedTextId(el.id);
                  setEditingTextId(el.id);
                  setTextInputValue(el.text);
                  setTextSettings({
                    fontSize: el.fontSize,
                    color: el.fill,
                    bold: el.fontWeight === 'bold',
                    italic: el.fontStyle === 'italic',
                    alignment: el.textAnchor === 'middle' ? 'center' : el.textAnchor === 'end' ? 'right' : 'left',
                  });
                  // Store click position for in-place editor
                  const svg = svgRef.current;
                  if (svg) {
                    const rect = svg.getBoundingClientRect();
                    const screenX = e.clientX - rect.left;
                    const screenY = e.clientY - rect.top;
                    setTextEditPosition({ x: screenX, y: screenY });
                  }
                }
              }}
            >
              {el.text}
            </text>
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

          {/* Anchor placement preview for string-lights / bunting */}
          {(activeTool === 'string-lights' || activeTool === 'bunting') && (
            <g style={{ pointerEvents: 'none' }}>
              {/* Crosshair ring following cursor before first click */}
              {!anchorPlacement.firstAnchor && anchorPlacement.livePoint && (
                <>
                  <circle
                    cx={anchorPlacement.livePoint.x}
                    cy={anchorPlacement.livePoint.y}
                    r={8}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    opacity={0.8}
                  />
                  <circle
                    cx={anchorPlacement.livePoint.x}
                    cy={anchorPlacement.livePoint.y}
                    r={2}
                    fill="#3b82f6"
                    opacity={0.8}
                  />
                </>
              )}
              {/* First anchor dot */}
              {anchorPlacement.firstAnchor && (
                <circle
                  cx={anchorPlacement.firstAnchor.x}
                  cy={anchorPlacement.firstAnchor.y}
                  r={8}
                  fill="#3b82f6"
                  opacity={0.9}
                />
              )}
              {/* Live wire preview from first anchor to cursor */}
              {anchorPlacement.firstAnchor && anchorPlacement.livePoint && (() => {
                const sx = anchorPlacement.firstAnchor.x;
                const sy = anchorPlacement.firstAnchor.y;
                const ex = anchorPlacement.livePoint.x;
                const ey = anchorPlacement.livePoint.y;
                const span = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
                const sag = Math.max(2, 0.05 * span);
                const cqx = (sx + ex) / 2;
                const cqy = (sy + ey) / 2 + sag;
                return (
                  <>
                    <path
                      d={`M ${sx} ${sy} Q ${cqx} ${cqy} ${ex} ${ey}`}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="8 5"
                      fill="none"
                      opacity={0.8}
                    />
                    <circle cx={ex} cy={ey} r={6} fill="none" stroke="#3b82f6" strokeWidth={2} opacity={0.7} />
                  </>
                );
              })()}
            </g>
          )}
        </g>

        {/* A4 border */}
        {satelliteBackground && (
          <rect
            x={propA4Dimensions.a4X}
            y={propA4Dimensions.a4Y}
            width={propA4Dimensions.a4WidthPx}
            height={propA4Dimensions.a4HeightPx}
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>
      
      {/* Text Toolbar - appears when text tool is active */}
      {activeTool === 'text' && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            backgroundColor: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            zIndex: 1000,
          }}
        >
          {/* Font Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Size</span>
            <input
              type="number"
              value={textSettings.fontSize}
              onChange={(e) => setTextSettings(s => ({ ...s, fontSize: parseInt(e.target.value) || 16 }))}
              min={8}
              max={72}
              style={{
                width: 50,
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                fontSize: 12,
              }}
            />
          </div>
          
          <div style={{ width: 1, height: 24, backgroundColor: '#e5e7eb' }} />
          
          {/* Bold */}
          <button
            onClick={() => setTextSettings(s => ({ ...s, bold: !s.bold }))}
            style={{
              padding: '6px 8px',
              border: 'none',
              backgroundColor: textSettings.bold ? '#3b82f6' : 'transparent',
              color: textSettings.bold ? '#ffffff' : '#374151',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 14,
            }}
            title="Bold"
          >
            B
          </button>
          
          {/* Italic */}
          <button
            onClick={() => setTextSettings(s => ({ ...s, italic: !s.italic }))}
            style={{
              padding: '6px 8px',
              border: 'none',
              backgroundColor: textSettings.italic ? '#3b82f6' : 'transparent',
              color: textSettings.italic ? '#ffffff' : '#374151',
              borderRadius: 6,
              cursor: 'pointer',
              fontStyle: 'italic',
              fontSize: 14,
            }}
            title="Italic"
          >
            I
          </button>
          
          <div style={{ width: 1, height: 24, backgroundColor: '#e5e7eb' }} />
          
          {/* Alignment */}
          <button
            onClick={() => setTextSettings(s => ({ 
              ...s, 
              alignment: s.alignment === 'left' ? 'center' : s.alignment === 'center' ? 'right' : 'left' 
            }))}
            style={{
              padding: '6px 8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#374151',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
            }}
            title="Alignment"
          >
            {textSettings.alignment === 'left' && '⇤'}
            {textSettings.alignment === 'center' && '⇥⇤'}
            {textSettings.alignment === 'right' && '⇥'}
          </button>
          
          <div style={{ width: 1, height: 24, backgroundColor: '#e5e7eb' }} />
          
          {/* Color */}
          <input
            type="color"
            value={textSettings.color}
            onChange={(e) => setTextSettings(s => ({ ...s, color: e.target.value }))}
            style={{
              width: 28,
              height: 28,
              padding: 0,
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              cursor: 'pointer',
            }}
            title="Text Color"
          />
        </div>
      )}
      
      {/* Inline Text Input - appears when editing a text element, positioned at click location */}
      {editingTextId && textEditPosition && (
        <div
          style={{
            position: 'absolute',
            top: textEditPosition.y,
            left: textEditPosition.x,
            zIndex: 1000001,
            backgroundColor: 'rgba(255,0,0,0.5)',
            padding: 10,
          }}
          onClick={(e) => {
            console.log('[TEXT EDITOR DIV] clicked, editingTextId:', editingTextId, 'textEditPosition:', textEditPosition);
            e.stopPropagation();
          }}
        >
          <textarea
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={(e) => {
              console.log('[TEXT EDITOR] keydown:', e.key);
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveText();
              }
              if (e.key === 'Escape') {
                setEditingTextId(null);
                setSelectedTextId(null);
                setTextEditPosition(null);
              }
            }}
            onBlur={() => {
              // Save when clicking outside
              if (textInputValue.trim()) {
                handleSaveText();
              } else {
                // Delete empty text
                deleteText(editingTextId);
                setEditingTextId(null);
                setSelectedTextId(null);
                setTextEditPosition(null);
              }
            }}
            autoFocus
            style={{
              minWidth: 150,
              minHeight: 40,
              padding: 8,
              fontSize: textSettings.fontSize,
              fontWeight: textSettings.bold ? 'bold' : 'normal',
              fontStyle: textSettings.italic ? 'italic' : 'normal',
              color: textSettings.color,
              textAlign: textSettings.alignment === 'center' ? 'center' : textSettings.alignment === 'right' ? 'right' : 'left',
              backgroundColor: '#ffffff',
              border: '2px solid #3b82f6',
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              resize: 'none',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              outline: 'none',
              lineHeight: 1.2,
            }}
            placeholder="Type here..."
          />
          <div
            style={{
              display: 'flex',
              gap: 4,
              marginTop: 4,
              alignItems: 'center',
            }}
          >
            <input
              type="number"
              value={textSettings.fontSize}
              onChange={(e) => setTextSettings(s => ({ ...s, fontSize: parseInt(e.target.value) || 16 }))}
              min={8}
              max={200}
              style={{
                width: 45,
                padding: '4px 4px',
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                fontSize: 11,
                textAlign: 'center',
              }}
              title="Font size"
            />
            <button
              onClick={() => {
                // Quick format: bold
                setTextSettings(s => ({ ...s, bold: !s.bold }));
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                backgroundColor: textSettings.bold ? '#3b82f6' : '#fff',
                color: textSettings.bold ? '#fff' : '#374151',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: 12,
              }}
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => {
                // Quick format: italic
                setTextSettings(s => ({ ...s, italic: !s.italic }));
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #e5e7eb',
                backgroundColor: textSettings.italic ? '#3b82f6' : '#fff',
                color: textSettings.italic ? '#fff' : '#374151',
                borderRadius: 4,
                cursor: 'pointer',
                fontStyle: 'italic',
                fontSize: 12,
              }}
              title="Italic"
            >
              I
            </button>
            <input
              type="color"
              value={textSettings.color}
              onChange={(e) => setTextSettings(s => ({ ...s, color: e.target.value }))}
              style={{
                width: 24,
                height: 24,
                padding: 0,
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              title="Color"
            />
          </div>
        </div>
      )}

      {/* Satellite info chip */}
      {satelliteBackground && (
        <SatelliteInfoChip
          satellite={satelliteBackground}
          onEdit={() => setSatelliteModalOpen(true)}
          onClear={clearSatelliteBackground}
        />
      )}

      {/* Satellite picker modal */}
      {satelliteModalOpen && (
        <SatellitePickerModal
          isOpen={satelliteModalOpen}
          onClose={() => setSatelliteModalOpen(false)}
          a4Dimensions={propA4Dimensions}
          {...(satelliteBackground ? { initialData: satelliteBackground } : {})}
        />
      )}

      {/* Notes panel - connected from workflow */}
      <NotesPanel
        notes={notes}
        onUpdateNote={updateNote}
        onRemoveNote={removeNote}
      />

      {createPortal(
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
        />,
        document.body
      )}

      {/* Guest Assignment Dropdown for chairs */}
      {guestDropdownChairId && guestDropdownPosition && (
        <GuestSearchDropdown
          chairId={guestDropdownChairId}
          chairPosition={guestDropdownPosition}
          unassignedGuests={combinedUnassignedGuests}
          assignedGuests={combinedAssignedGuests}
          currentlyAssignedGuest={guestAssignment.getGuestForChair(guestDropdownChairId)}
          isLoading={guestAssignment.isLoading}
          onAssign={handleAssignGuest}
          onUnassign={handleUnassignGuest}
          onClose={handleCloseGuestDropdown}
        />
      )}

      {/* Guest Assignment Dropdown for ceremony seats */}
      {ceremonySeatDropdown && (() => {
        const { shapeId, seatKey, position } = ceremonySeatDropdown;
        const shape = elements.find(e => e.id === shapeId);
        const assignment = shape?.ceremonyData?.seatAssignments?.[seatKey];
        const currentGuest = assignment
          ? (guestAssignment.guests.find(g => g.id === assignment.guestId) ?? null)
          : null;
        return (
          <GuestSearchDropdown
            chairId={`ceremony-${shapeId}-${seatKey}`}
            chairPosition={position}
            unassignedGuests={combinedUnassignedGuests}
            assignedGuests={combinedAssignedGuests}
            currentlyAssignedGuest={currentGuest}
            isLoading={guestAssignment.isLoading}
            onAssign={handleAssignCeremonySeat}
            onUnassign={handleUnassignCeremonySeat}
            onClose={() => setCeremonySeatDropdown(null)}
          />
        );
      })()}

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
