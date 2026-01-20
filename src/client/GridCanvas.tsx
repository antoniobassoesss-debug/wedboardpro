import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import Toolbar from './Toolbar.js';
import Header from './Header.js';
import ProjectTabs from './ProjectTabs.js';
import type { Wall, Door } from './types/wall.js';
import type { PowerPoint } from './types/powerPoint.js';
import type { ElectricalStandard } from './types/electrical.js';
import { createPowerPoint } from './types/powerPoint.js';
import ElectricalIcon from './components/ElectricalIcon.js';
import ElectricalDrawer from './components/ElectricalDrawer.js';

// Set to true for verbose debugging output
const DEBUG_CANVAS = false;

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
  type: 'rectangle' | 'circle' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  imageUrl?: string; // For table images
  imageNaturalWidth?: number; // Store natural image dimensions to maintain aspect ratio
  imageNaturalHeight?: number;
  tableData?: {
    type: string;
    size: string;
    seats: number;
    actualSizeMeters: number; // Actual size in meters for scaling
  };
  // For spaces only: real-world dimensions and pixels-per-meter to keep proportions
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
  for (const wall of wallsList) {
    const originalLengthPx = wall.length;
    if (originalLengthPx && originalLengthPx > 0) {
      const originalMeters = originalLengthPx / WALLMAKER_PIXELS_PER_METER;
      if (originalMeters > 0) {
        const actualLengthPx = Math.sqrt(
          Math.pow(wall.endX - wall.startX, 2) +
          Math.pow(wall.endY - wall.startY, 2)
        );
        if (actualLengthPx > 0) {
          return actualLengthPx / originalMeters;
        }
      }
    }
  }
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

interface CanvasState {
  drawings: DrawingPath[];
  shapes: Shape[];
  textElements: TextElement[];
  walls: Wall[];
  doors: Door[];
}

interface GridCanvasProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  projectId?: string; // Add projectId to track which project we're working on
  projectData?: {
    drawings: DrawingPath[];
    shapes: Shape[];
    textElements: TextElement[];
    walls?: Wall[];
    doors?: Door[];
    powerPoints?: PowerPoint[];
    viewBox?: ViewBox;
  };
  onDataChange?: (data: {
    drawings: DrawingPath[];
    shapes: Shape[];
    textElements: TextElement[];
    walls: Wall[];
    doors: Door[];
    powerPoints: PowerPoint[];
    viewBox: ViewBox;
  }, projectId: string) => void; // Pass projectId to ensure correct project
  brushSize?: number;
  brushColor?: string;
}

const GridCanvas = forwardRef<{ 
  addSpace: (width: number, height: number) => void;
  addTable: (type: string, size: string, seats: number, imageUrl: string, targetSpaceId?: string) => void;
  addWalls: (walls: Wall[], doors?: Door[]) => void;
  zoomToPoints: (points: { x: number; y: number }[]) => void;
  getPowerPoints: () => PowerPoint[];
}, GridCanvasProps>(({ 
  activeTool, 
  onToolChange,
  projectId,
  projectData,
  onDataChange,
  brushSize = 2,
  brushColor = '#000000'
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // A4 landscape dimensions ratio (width:height)
  const a4AspectRatio = 297 / 210; // Landscape A4 ratio
  
  // Calculate A4 canvas size to be 70% of screen
  const calculateA4CanvasSize = useCallback(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Calculate 70% of screen dimensions
    const targetWidth = screenWidth * 0.7;
    const targetHeight = screenHeight * 0.7;
    
    // Calculate actual A4 canvas size maintaining aspect ratio
    let a4WidthPx: number;
    let a4HeightPx: number;
    
    if (targetWidth / targetHeight > a4AspectRatio) {
      // Screen is wider than A4 ratio, fit to height
      a4HeightPx = targetHeight;
      a4WidthPx = a4HeightPx * a4AspectRatio;
    } else {
      // Screen is taller than A4 ratio, fit to width
      a4WidthPx = targetWidth;
      a4HeightPx = a4WidthPx / a4AspectRatio;
    }
    
    return { a4WidthPx, a4HeightPx };
  }, [a4AspectRatio]);
  
  // Calculate initial A4 canvas position (centered at origin)
  const getInitialA4Position = useCallback(() => {
    const { a4WidthPx, a4HeightPx } = calculateA4CanvasSize();
    return {
      a4X: -a4WidthPx / 2,
      a4Y: -a4HeightPx / 2,
      a4WidthPx,
      a4HeightPx,
    };
  }, [calculateA4CanvasSize]);
  
  // Initialize A4 canvas dimensions
  const initialA4 = getInitialA4Position();
  const [a4Dimensions, setA4Dimensions] = useState(initialA4);
  
  // Initialize from projectData if provided
  const [drawings, setDrawings] = useState<DrawingPath[]>(projectData?.drawings || []);
  const [shapes, setShapes] = useState<Shape[]>(projectData?.shapes || []);
  const [textElements, setTextElements] = useState<TextElement[]>(projectData?.textElements || []);
  const [walls, setWalls] = useState<Wall[]>(projectData?.walls || []);
  const [doors, setDoors] = useState<Door[]>(projectData?.doors || []);
  const [powerPoints, setPowerPoints] = useState<PowerPoint[]>(projectData?.powerPoints || []);
  
  // Electrical drawer state
  const [selectedPowerPointId, setSelectedPowerPointId] = useState<string | null>(null);
  const [isElectricalDrawerOpen, setIsElectricalDrawerOpen] = useState(false);
  const selectedPowerPoint = powerPoints.find(p => p.id === selectedPowerPointId) || null;
  
  // Calculate initial viewBox to show A4 canvas at 70% of screen
  const getInitialViewBox = useCallback(() => {
    const { a4X, a4Y, a4WidthPx, a4HeightPx } = getInitialA4Position();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Calculate viewBox so that A4 canvas occupies 70% of screen
    // The viewBox defines what portion of SVG space is visible
    // To make A4 appear at 70% of screen, we need: a4WidthPx / viewBoxWidth = 0.7
    // So: viewBoxWidth = a4WidthPx / 0.7
    const viewBoxWidth = a4WidthPx / 0.7;
    const viewBoxHeight = a4HeightPx / 0.7;
    
    // Center the viewBox around the A4 canvas
    const centerX = a4X + a4WidthPx / 2;
    const centerY = a4Y + a4HeightPx / 2;
    
    return {
      x: centerX - viewBoxWidth / 2,
      y: centerY - viewBoxHeight / 2,
      width: viewBoxWidth,
      height: viewBoxHeight,
    };
  }, [getInitialA4Position]);
  
  // Track if this is the initial mount (page refresh)
  const isInitialMountRef = useRef(true);
  
  const [viewBox, setViewBox] = useState<ViewBox>(() => {
    // On initial mount (page refresh), always center the canvas
    // Don't use saved viewBox on first load
    return getInitialViewBox();
  });
  
  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<CanvasState[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasState[]>([]);
  
  // Drawing state
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<string>('');
  const currentPathIdRef = useRef<string>('');
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<SVGElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const gridSize = 20;
  const majorGridSize = 100;

  // Track if we're initializing to prevent unnecessary updates
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const isUserInteractingRef = useRef(false);
  const previousProjectIdRef = useRef<string | undefined>(undefined);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to track current projectId to ensure we always save to the correct project
  const currentProjectIdRef = useRef<string | undefined>(projectId);
  
  // Use refs to always have the latest state values for saving
  const drawingsRef = useRef(drawings);
  const shapesRef = useRef(shapes);
  const currentSpaceRef = useRef<SpaceShape | null>(null);
  const wallScaleRef = useRef<{ pxPerMeter: number; bounds: WallBounds | null } | null>(null);
  const movingShapeIdRef = useRef<string | null>(null);
  const moveOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const movingPositionRef = useRef<{ x: number; y: number } | null>(null);
  const originalPositionRef = useRef<{ x: number; y: number } | null>(null);
  const textElementsRef = useRef(textElements);
  const saveStateRef = useRef<(() => void) | null>(null);
  const selectedShapeIdRef = useRef<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const clipboardRef = useRef<Shape | null>(null);
  const wallsRef = useRef(walls);
  const doorsRef = useRef(doors);
  const powerPointsRef = useRef(powerPoints);
  const viewBoxRef = useRef(viewBox);
  
  // Keep refs in sync with state
  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);
  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);
  useEffect(() => {
    const spaces = shapes.filter(isSpaceShape);
    currentSpaceRef.current = spaces.length > 0 ? spaces[spaces.length - 1]! : null;
  }, [shapes]);
  // Force save on unmount to prevent data loss
  useEffect(() => {
    return () => {
      // Component is unmounting - force immediate save of current state
      if (onDataChange && currentProjectIdRef.current && hasInitializedRef.current) {
        try {
          onDataChange({
            drawings: JSON.parse(JSON.stringify(drawingsRef.current)),
            shapes: JSON.parse(JSON.stringify(shapesRef.current)),
            textElements: JSON.parse(JSON.stringify(textElementsRef.current)),
            walls: JSON.parse(JSON.stringify(wallsRef.current)),
            doors: JSON.parse(JSON.stringify(doorsRef.current)),
            powerPoints: JSON.parse(JSON.stringify(powerPointsRef.current)),
            viewBox: { ...viewBoxRef.current },
          }, currentProjectIdRef.current);
          console.log('GridCanvas unmounting - emergency save completed');
        } catch (err) {
          console.error('Failed to save on unmount:', err);
        }
      }
    };
  }, [onDataChange]);
  // Clear selection when switching away from hand tool so highlight doesn't persist while drawing
  useEffect(() => {
    if (activeTool !== 'hand') {
      setSelectedShapeId(null);
      selectedShapeIdRef.current = null;
    }
  }, [activeTool]);
  // keep selectedShapeIdRef in sync with state
  useEffect(() => { selectedShapeIdRef.current = selectedShapeId; }, [selectedShapeId]);
  useEffect(() => {
    // keyboard handlers for copy/paste/delete (use saveStateRef)
    const onKeyDown = (e: KeyboardEvent) => {
      // If focused on an input or editable element, ignore global shortcuts except cmd/ctrl+c/v
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputField = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      // Handle delete/backspace for deleting selected shape (no modifier)
      if (!isInputField && (e.key === 'Delete' || e.key === 'Backspace')) {
        const selId = selectedShapeIdRef.current;
        if (selId) {
          e.preventDefault();
          setShapes(prev => {
            const updated = prev.filter(s => s.id !== selId);
            shapesRef.current = updated;
            return updated;
          });
          selectedShapeIdRef.current = null;
          setSelectedShapeId(null);
          if (saveStateRef.current) saveStateRef.current();
          console.log('Deleted shape via keyboard:', selId);
        }
        return;
      }

      const isCmd = e.metaKey || e.ctrlKey;
      if (!isCmd) return;
      const key = e.key.toLowerCase();
      if (key === 'c') {
        // copy
        const selId = selectedShapeIdRef.current;
        if (!selId) return;
        const shape = shapesRef.current.find(s => s.id === selId);
        if (!shape) return;
        // deep copy minimal
        const copy: Shape = JSON.parse(JSON.stringify(shape));
        // clear id so paste will create new id
        copy.id = '';
        clipboardRef.current = copy;
        console.log('Copied shape to clipboard:', copy);
      } else if (key === 'v') {
        // paste
        const clip = clipboardRef.current;
        if (!clip) return;
        e.preventDefault();
        const newId = `shape-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        const offsetX = 20;
        const offsetY = 20;
        const newShape: Shape = {
          ...JSON.parse(JSON.stringify(clip)),
          id: newId,
          x: (clip.x || 0) + offsetX,
          y: (clip.y || 0) + offsetY,
        };
        setShapes(prev => {
          const updated = [...prev, newShape];
          shapesRef.current = updated;
          return updated;
        });
        // select newly pasted
        setSelectedShapeId(newId);
        if (saveStateRef.current) saveStateRef.current();
        console.log('Pasted shape from clipboard:', newShape);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
  // Ensure refs in move logic kept up-to-date
  useEffect(() => {
    movingShapeIdRef.current = null;
    moveOffsetRef.current = null;
  }, []);
  useEffect(() => {
    textElementsRef.current = textElements;
  }, [textElements]);
  useEffect(() => {
    wallsRef.current = walls;
  }, [walls]);
  useEffect(() => {
    const scaleInfo = computeWallScaleFromWalls(walls);
    wallScaleRef.current = scaleInfo;
  }, [walls]);
  useEffect(() => {
    doorsRef.current = doors;
  }, [doors]);
  useEffect(() => {
    powerPointsRef.current = powerPoints;
  }, [powerPoints]);
  useEffect(() => {
    viewBoxRef.current = viewBox;
  }, [viewBox]);

  // Function to save current state immediately (no debounce)
  const saveCurrentStateImmediately = useCallback(() => {
    if (onDataChange && hasInitializedRef.current && currentProjectIdRef.current) {
      // Use refs to get the absolute latest state and pass the project ID
      onDataChange({
        drawings: JSON.parse(JSON.stringify(drawingsRef.current)),
        shapes: JSON.parse(JSON.stringify(shapesRef.current)),
        textElements: JSON.parse(JSON.stringify(textElementsRef.current)),
        walls: JSON.parse(JSON.stringify(wallsRef.current)),
        doors: JSON.parse(JSON.stringify(doorsRef.current)),
        powerPoints: JSON.parse(JSON.stringify(powerPointsRef.current)),
        viewBox: { ...viewBoxRef.current },
      }, currentProjectIdRef.current);
    }
  }, [onDataChange]);

  // Update when project changes (switching projects) - use projectId as the key
  useEffect(() => {
    // Update the current project ID ref immediately
    if (projectId) {
      currentProjectIdRef.current = projectId;
    }
    
    // Only update if we're switching to a different project
    if (projectId !== previousProjectIdRef.current && previousProjectIdRef.current !== undefined) {
      // Save current project's state immediately before switching (using refs for latest state)
      // Use deep copies and pass the PREVIOUS project ID to ensure we save to the correct project
      if (onDataChange && hasInitializedRef.current && previousProjectIdRef.current) {
        onDataChange({
          drawings: JSON.parse(JSON.stringify(drawingsRef.current)),
          shapes: JSON.parse(JSON.stringify(shapesRef.current)),
          textElements: JSON.parse(JSON.stringify(textElementsRef.current)),
          walls: JSON.parse(JSON.stringify(wallsRef.current)),
          doors: JSON.parse(JSON.stringify(doorsRef.current)),
          powerPoints: JSON.parse(JSON.stringify(powerPointsRef.current)),
          viewBox: { ...viewBoxRef.current },
        }, previousProjectIdRef.current); // CRITICAL: Save to the PREVIOUS project, not the new one
      }
      // Clear any pending debounced saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    }
    
    if (projectId !== previousProjectIdRef.current) {
      previousProjectIdRef.current = projectId;
      isInitializingRef.current = true;
      
      // Always load the project's saved data when switching
      // Create deep copies to ensure isolation
    if (projectData) {
        setDrawings(JSON.parse(JSON.stringify(projectData.drawings || [])));
        setShapes(JSON.parse(JSON.stringify(projectData.shapes || [])));
        setTextElements(JSON.parse(JSON.stringify(projectData.textElements || [])));
        setWalls(JSON.parse(JSON.stringify(projectData.walls || [])));
        setDoors(JSON.parse(JSON.stringify(projectData.doors || [])));
        setPowerPoints(JSON.parse(JSON.stringify(projectData.powerPoints || [])));
        
        // On initial mount (page refresh), always center the canvas
        // Otherwise, use saved viewBox when switching projects
        if (isInitialMountRef.current) {
          // First load after page refresh - always center
          const newA4 = getInitialA4Position();
          setA4Dimensions(newA4);
          const newViewBox = getInitialViewBox();
          setViewBox(newViewBox);
          hasInitializedRef.current = true;
          isInitialMountRef.current = false;
        } else if (projectData.viewBox && projectData.viewBox.width > 0 && projectData.viewBox.height > 0) {
          // Switching projects - use saved viewBox
        setViewBox(projectData.viewBox);
          hasInitializedRef.current = true;
        } else {
          // New project or invalid viewBox - center it
          const newA4 = getInitialA4Position();
          setA4Dimensions(newA4);
          const newViewBox = getInitialViewBox();
          setViewBox(newViewBox);
          hasInitializedRef.current = true;
        }
      } else {
        // No project data, initialize empty
        setDrawings([]);
        setShapes([]);
        setTextElements([]);
        setWalls([]);
        setDoors([]);
        const newA4 = getInitialA4Position();
        setA4Dimensions(newA4);
        const newViewBox = getInitialViewBox();
        setViewBox(newViewBox);
        hasInitializedRef.current = true;
        isInitialMountRef.current = false;
      }
      
      // Clear undo/redo stacks when switching projects
      setUndoStack([]);
      setRedoStack([]);
      
      // Use setTimeout to reset flag after state updates
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 100);
    }
  }, [projectId, projectData, getInitialA4Position, getInitialViewBox]);

  // Save data changes back to parent (debounced to prevent excessive updates)
  // Only save when not initializing and not during user interactions
  useEffect(() => {
    if (onDataChange && !isInitializingRef.current && hasInitializedRef.current && !isUserInteractingRef.current) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Always update the refs immediately so parent has latest data
      // Create deep copies to ensure complete isolation between projects
      const currentData = {
        drawings: JSON.parse(JSON.stringify(drawingsRef.current)),
        shapes: JSON.parse(JSON.stringify(shapesRef.current)),
        textElements: JSON.parse(JSON.stringify(textElementsRef.current)),
        walls: JSON.parse(JSON.stringify(wallsRef.current)),
        doors: JSON.parse(JSON.stringify(doorsRef.current)),
        powerPoints: JSON.parse(JSON.stringify(powerPointsRef.current)),
        viewBox: { ...viewBoxRef.current },
      };
      
      // Save immediately with the current project ID to ensure correct project
      if (currentProjectIdRef.current) {
        onDataChange(currentData, currentProjectIdRef.current);
      }
      
      // Also do debounced save for state updates (but refs are already updated)
      saveTimeoutRef.current = setTimeout(() => {
        if (!isUserInteractingRef.current && !isInitializingRef.current && currentProjectIdRef.current) {
          // This is redundant but ensures state is saved with deep copies to the correct project
      onDataChange({
            drawings: JSON.parse(JSON.stringify(drawingsRef.current)),
            shapes: JSON.parse(JSON.stringify(shapesRef.current)),
            textElements: JSON.parse(JSON.stringify(textElementsRef.current)),
            walls: JSON.parse(JSON.stringify(wallsRef.current)),
            doors: JSON.parse(JSON.stringify(doorsRef.current)),
            powerPoints: JSON.parse(JSON.stringify(powerPointsRef.current)),
            viewBox: { ...viewBoxRef.current },
          }, currentProjectIdRef.current);
        }
        saveTimeoutRef.current = null;
      }, 100); // Shorter debounce since we already saved to refs
      
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
      };
    }
  }, [drawings, shapes, textElements, viewBox, onDataChange]);

  // Save current state to undo stack
  const saveState = useCallback(() => {
    const currentState: CanvasState = {
      drawings: [...drawings],
      shapes: [...shapes],
      textElements: [...textElements],
      walls: [...walls],
      doors: [...doors],
    };
    setUndoStack(prev => [...prev, currentState]);
    setRedoStack([]); // Clear redo stack when new action is performed
  }, [drawings, shapes, textElements, walls, doors]);
  // expose in ref for effects defined earlier that need to call saveState
  useEffect(() => { saveStateRef.current = saveState; }, [saveState]);

  // Function to add a space (room) to the canvas
  const addSpace = useCallback((widthMeters: number, heightMeters: number) => {
    // Calculate the aspect ratio of the input space
    const spaceAspectRatio = widthMeters / heightMeters;
    
    // Get available space in the A4 canvas (with some padding)
    const padding = 40; // Padding from edges in pixels
    const availableWidth = a4Dimensions.a4WidthPx - (padding * 2);
    const availableHeight = a4Dimensions.a4HeightPx - (padding * 2);
    const canvasAspectRatio = availableWidth / availableHeight;

    // Calculate scaled dimensions to fit within canvas while maintaining proportions
    let widthPx: number;
    let heightPx: number;

    if (spaceAspectRatio > canvasAspectRatio) {
      // Space is wider than canvas ratio, fit to width
      widthPx = availableWidth;
      heightPx = widthPx / spaceAspectRatio;
    } else {
      // Space is taller than canvas ratio, fit to height
      heightPx = availableHeight;
      widthPx = heightPx * spaceAspectRatio;
    }

    // Center the space on the A4 canvas
    const centerX = a4Dimensions.a4X + a4Dimensions.a4WidthPx / 2;
    const centerY = a4Dimensions.a4Y + a4Dimensions.a4HeightPx / 2;

    // Position the space centered
    const spaceX = centerX - widthPx / 2;
    const spaceY = centerY - heightPx / 2;

      // Create a space shape (floor plan style)
    const newSpace: SpaceShape = {
      id: `space-${Date.now()}`,
      type: 'rectangle',
      x: spaceX,
      y: spaceY,
      width: widthPx,
      height: heightPx,
      fill: 'rgba(255, 255, 255, 0.9)', // Light floor color
      stroke: '#2c3e50', // Dark wall color
      strokeWidth: 4, // Thicker walls for floor plan look
      // store real-world sizing so objects can be scaled to real dimensions
      spaceMetersWidth: widthMeters,
      spaceMetersHeight: heightMeters,
      // compute pixels-per-meter conservatively using both axes (min to avoid oversized objects)
      pixelsPerMeter: Math.min(widthPx / Math.max(0.0001, widthMeters), heightPx / Math.max(0.0001, heightMeters)),
    };
    currentSpaceRef.current = newSpace;

    // Add the space shape (only one space per project - remove previous spaces/tables tied to them)
    setShapes((prev: Shape[]) => {
      const existingSpaceIds = prev.filter(isSpaceShape).map(space => space.id);
      const filtered = prev.filter(shape => {
        if (isSpaceShape(shape)) return false;
        if (shape.type === 'image' && shape.attachedSpaceId && existingSpaceIds.includes(shape.attachedSpaceId)) {
          return false;
        }
        return true;
      });
      const updated = [...filtered, newSpace];
      shapesRef.current = updated;
      return updated;
    });

    // Save state
    saveState();
  }, [a4Dimensions, saveState]);

  // Function to add a table to the canvas
  const addTable = useCallback((type: string, size: string, seats: number, imageUrl: string, targetSpaceId?: string) => {
    console.log('addTable called with:', { type, size, seats, imageUrl, targetSpaceId });
    
    // Load image to get its natural dimensions and maintain aspect ratio
    const centerX = a4Dimensions.a4X + a4Dimensions.a4WidthPx / 2;
    const centerY = a4Dimensions.a4Y + a4Dimensions.a4HeightPx / 2;

    const img = new Image();
    img.onload = () => {
      // Get natural dimensions
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const aspectRatio = naturalWidth / naturalHeight;
      
      console.log('Image loaded:', { naturalWidth, naturalHeight, aspectRatio });
      
      // Use a fixed base size (200px for the larger dimension)
      // Calculate dimensions using EXACT proportions from natural dimensions
      let tableWidth: number;
      let tableHeight: number;
      
      // Use direct proportion calculation to avoid any rounding errors
      if (naturalWidth >= naturalHeight) {
        // Width is larger or equal - set width to 200px
        tableWidth = 200;
        // Calculate height using exact proportion: newHeight = (naturalHeight / naturalWidth) * newWidth
        tableHeight = (naturalHeight / naturalWidth) * 200;
      } else {
        // Height is larger - set height to 200px
        tableHeight = 200;
        // Calculate width using exact proportion: newWidth = (naturalWidth / naturalHeight) * newHeight
        tableWidth = (naturalWidth / naturalHeight) * 200;
      }
      
      // Double-check: the ratio should be EXACTLY the same as the image
      const resultRatio = tableWidth / tableHeight;
      const imageRatio = naturalWidth / naturalHeight;
      const isExact = Math.abs(resultRatio - imageRatio) < 0.0000001;
      
      console.log('Aspect ratio calculation (exact proportions):', { 
        naturalWidth, 
        naturalHeight, 
        imageRatio: imageRatio,
        tableWidth, 
        tableHeight,
        resultRatio,
        isExact: isExact ? '✓ EXACT MATCH' : `✗ MISMATCH (diff: ${Math.abs(resultRatio - imageRatio)})`
      });
      
      if (!isExact) {
        console.error('WARNING: Aspect ratio mismatch detected! Image will be stretched!');
      }

      // Attempt to scale table according to the most relevant space on the canvas.
      let chosenSpace: SpaceShape | null = null;
      if (targetSpaceId) {
        const directMatch = shapesRef.current.find(space => space.id === targetSpaceId);
        if (isSpaceShape(directMatch)) {
          chosenSpace = directMatch;
        }
      }

      if (!chosenSpace && currentSpaceRef.current) {
        chosenSpace = currentSpaceRef.current;
      }

      if (!chosenSpace) {
        for (let i = shapesRef.current.length - 1; i >= 0; i--) {
          const s = shapesRef.current[i];
          if (isSpaceShape(s)) {
            chosenSpace = s;
            break;
          }
        }
        if (!chosenSpace) {
          console.warn('addTable: No space found in shapesRef; tables will be centered on A4 without space scaling.');
        } else {
          console.warn('addTable: using fallback found space', { id: chosenSpace.id });
        }
      }

      // Parse `size` argument which can be:
      // - a single value like "2" or "2m" (meters) => interpreted as diameter/primary size
      // - a WxH string like "1.5x0.8" or "1.5×0.8" => interpreted as width x height in meters
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

      // If the table size was provided as presets like 'small'/'medium'/'large', map them
      const presetToMeters: Record<string, number> = {
        small: 0.6,
        medium: 1.2,
        large: 1.8,
      };
      let presetMeters = 0;
      if (typeof size === 'string') {
        const lower = (size as string).toLowerCase();
        if (presetToMeters[lower] !== undefined) {
          presetMeters = presetToMeters[lower];
        }
      }

      // Prefer explicit parsed dimensions; if none, fall back to preset mapping
      const widthMeters = parsedWidthMeters > 0 ? parsedWidthMeters : (presetMeters > 0 ? presetMeters : 0);
      const heightMeters = parsedHeightMeters > 0 ? parsedHeightMeters : 0;

      const wallLayoutContext = !chosenSpace && wallScaleRef.current && wallScaleRef.current.pxPerMeter
        ? wallScaleRef.current
        : null;

      if ((chosenSpace || wallLayoutContext) && (widthMeters > 0 || heightMeters > 0)) {
        // Scale using the pixelsPerMeter value of the chosen space to preserve proportions.
        // If pixelsPerMeter is missing, compute conservatively using both axes.
        const ppm = chosenSpace
          ? (
            chosenSpace.pixelsPerMeter
              || Math.min(
                chosenSpace.width / Math.max(0.0001, (chosenSpace.spaceMetersWidth || 1)),
                chosenSpace.height / Math.max(0.0001, (chosenSpace.spaceMetersHeight || 1))
              )
          )
          : wallLayoutContext!.pxPerMeter;

        if (!ppm || ppm <= 0) {
          console.warn('addTable: invalid ppm computed, falling back to default placement');
        } else {
          if (chosenSpace) {
            console.log('addTable: chosenSpace', { id: chosenSpace.id, ppm });
          } else {
            console.log('addTable: using wall layout context', wallLayoutContext);
          }

          const resolvedWidthMeters = widthMeters > 0 ? widthMeters : (heightMeters > 0 ? heightMeters : 0);
          const resolvedHeightMeters = heightMeters > 0 ? heightMeters : (widthMeters > 0 ? widthMeters : 0);

          let finalWidthPx = resolvedWidthMeters * ppm;
          let finalHeightPx = resolvedHeightMeters * ppm;

          // For round tables (single dimension) ensure a perfect square
          if (type === 'round' && parsedHeightMeters === 0) {
            finalHeightPx = finalWidthPx;
          }

          // Place the table centered inside the chosen space or wall layout bounds
          let tableX: number;
          let tableY: number;
          if (chosenSpace) {
            tableX = chosenSpace.x + (chosenSpace.width / 2) - finalWidthPx / 2;
            tableY = chosenSpace.y + (chosenSpace.height / 2) - finalHeightPx / 2;
          } else if (wallLayoutContext?.bounds) {
            const { minX, maxX, minY, maxY } = wallLayoutContext.bounds;
            const centerBoundsX = (minX + maxX) / 2;
            const centerBoundsY = (minY + maxY) / 2;
            tableX = centerBoundsX - finalWidthPx / 2;
            tableY = centerBoundsY - finalHeightPx / 2;
          } else {
            tableX = centerX - finalWidthPx / 2;
            tableY = centerY - finalHeightPx / 2;
          }

          // Create a table shape with image - store natural dimensions for aspect ratio preservation and real size
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
            imageNaturalWidth: naturalWidth, // Store natural dimensions
            imageNaturalHeight: naturalHeight,
            attachedSpaceId: chosenSpace ? chosenSpace.id : '__wall_layout__',
            tableData: {
              type,
              size,
              seats,
              actualSizeMeters: resolvedWidthMeters || presetMeters,
            },
          };

          // Flash a temporary outline at the placement location so the user sees where the table will go
          if (svgRef.current) {
            try {
              const svg = svgRef.current;
              const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              outline.setAttribute('x', String(tableX));
              outline.setAttribute('y', String(tableY));
              outline.setAttribute('width', String(finalWidthPx));
              outline.setAttribute('height', String(finalHeightPx));
              outline.setAttribute('fill', 'none');
              outline.setAttribute('stroke', '#e74c3c');
              outline.setAttribute('stroke-width', '2');
              outline.style.pointerEvents = 'none';
              svg.appendChild(outline);
              setTimeout(() => { try { outline.remove(); } catch { /* ignore */ } }, 1400);
            } catch (err) {
              console.warn('Failed to draw temporary outline:', err);
            }
          }

          setShapes(prev => {
            const updated = [...prev, newTable];
            shapesRef.current = updated;
            return updated;
          });

          saveState();
          console.log('Table placed on canvas:', newTable);
          return;
        }
      }

      // Fallback: center the table on the A4 canvas (in SVG coordinates)
      const tableX = centerX - tableWidth / 2;
      const tableY = centerY - tableHeight / 2;

      console.log('Table positioning (with aspect ratio):', {
        centerX, centerY, tableWidth, tableHeight, tableX, tableY
      });

      // Create a table shape with image - store natural dimensions for aspect ratio preservation
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
        imageNaturalWidth: naturalWidth, // Store natural dimensions
        imageNaturalHeight: naturalHeight,
        attachedSpaceId: chosenSpace?.id,
        tableData: {
          type,
          size,
          seats,
          actualSizeMeters: 0,
        },
      };

      console.log('Adding table to canvas:', newTable);
      // Flash a temporary outline at the placement location so the user sees where the table will go
      if (svgRef.current) {
        try {
          const svg = svgRef.current;
          const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          outline.setAttribute('x', String(tableX));
          outline.setAttribute('y', String(tableY));
          outline.setAttribute('width', String(tableWidth));
          outline.setAttribute('height', String(tableHeight));
          outline.setAttribute('fill', 'none');
          outline.setAttribute('stroke', '#e74c3c');
          outline.setAttribute('stroke-width', '2');
          outline.style.pointerEvents = 'none';
          svg.appendChild(outline);
          setTimeout(() => { try { outline.remove(); } catch { /* ignore */ } }, 1400);
        } catch (err) {
          console.warn('Failed to draw temporary outline:', err);
        }
      }

      // Add the table shape
      setShapes(prev => {
        const updated = [...prev, newTable];
        shapesRef.current = updated;
        console.log('Updated shapes array length:', updated.length);
        return updated;
      });
      // Force-adjust the last placed table to the active space ppm to ensure exact meter correlation.
      // Parse requested size and recompute px using currentSpaceRef (most reliable).
      try {
        const parseSizeStringLocal = (s: string): { widthMeters: number; heightMeters: number } => {
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

        const requested = parseSizeStringLocal(size);
        let spaceToUse = chosenSpace || currentSpaceRef.current || (shapesRef.current.find(isSpaceShape) as SpaceShape | undefined);
        if (!spaceToUse && wallScaleRef.current && wallScaleRef.current.pxPerMeter && wallScaleRef.current.bounds) {
          const { bounds, pxPerMeter } = wallScaleRef.current;
          const widthPx = bounds.maxX - bounds.minX;
          const heightPx = bounds.maxY - bounds.minY;
          spaceToUse = {
            id: '__wall_layout__',
            type: 'rectangle',
            x: bounds.minX,
            y: bounds.minY,
            width: widthPx,
            height: heightPx,
            fill: 'transparent',
            stroke: 'transparent',
            strokeWidth: 0,
            spaceMetersWidth: widthPx / pxPerMeter,
            spaceMetersHeight: heightPx / pxPerMeter,
            pixelsPerMeter: pxPerMeter,
          };
        }
        if (spaceToUse) {
          console.log('Force-adjust: spaceToUse', { id: spaceToUse.id, pixelsPerMeter: spaceToUse.pixelsPerMeter, spaceWidth: spaceToUse.spaceMetersWidth, spaceHeight: spaceToUse.spaceMetersHeight });
          console.log('Force-adjust: requested meters', requested);
          const ppm = spaceToUse.pixelsPerMeter || Math.min(spaceToUse.width / Math.max(0.0001, spaceToUse.spaceMetersWidth), spaceToUse.height / Math.max(0.0001, spaceToUse.spaceMetersHeight));
          const finalW = (requested.widthMeters > 0 ? requested.widthMeters : (requested.heightMeters > 0 ? requested.heightMeters : 0)) * ppm;
          const finalH = (requested.heightMeters > 0 ? requested.heightMeters : (requested.widthMeters > 0 ? requested.widthMeters : 0)) * ppm;
          // update last shape
          setShapes(prev => {
            const updated = prev.map(sh => {
              if (sh.id === newTable.id) {
                return {
                  ...sh,
                  width: finalW || sh.width,
                  height: finalH || sh.height,
                  attachedSpaceId: spaceToUse.id,
                };
              }
              return sh;
            });
            shapesRef.current = updated;
            console.log('Adjusted placed table to space ppm:', { id: newTable.id, width: finalW, height: finalH, ppm });
            return updated;
          });
          saveState();
          // Ensure canvas redraw picks up the adjusted values
          setTimeout(() => {
            try {
              drawCanvas();
            } catch (err) {
              console.warn('drawCanvas call after adjust failed', err);
            }
          }, 40);
        } else {
          console.warn('No space available to force-adjust placed table.');
        }
      } catch (err) {
        console.error('Error adjusting placed table size to space:', err);
      }

      // Save state
      saveState();
    };
    
    img.onerror = () => {
      console.error('Failed to load image:', imageUrl);
    };
    
    // Start loading the image
    img.src = imageUrl;
  }, [a4Dimensions, saveState]);

  // Function to add walls (and associated doors) to the canvas
  const addWalls = useCallback((newWalls: Wall[], newDoors: Door[] = []) => {
    console.log('addWalls called with:', newWalls);
    
    if (newWalls.length === 0) return;
    
    // Calculate bounding box of all walls
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
    
    // Calculate the dimensions of the wall layout
    const wallLayoutWidth = maxX - minX;
    const wallLayoutHeight = maxY - minY;
    
    // If walls have zero dimensions, use a default size
    const effectiveWidth = wallLayoutWidth > 0 ? wallLayoutWidth : 100;
    const effectiveHeight = wallLayoutHeight > 0 ? wallLayoutHeight : 100;
    
    // Calculate aspect ratio of the wall layout
    const wallAspectRatio = effectiveWidth / effectiveHeight;
    
    // Get available space in the A4 canvas (with padding)
    const padding = 40;
    const availableWidth = a4Dimensions.a4WidthPx - (padding * 2);
    const availableHeight = a4Dimensions.a4HeightPx - (padding * 2);
    const canvasAspectRatio = availableWidth / availableHeight;
    
    // Calculate uniform scale factor to fit within canvas while maintaining EXACT proportions
    // This ensures both X and Y scale by the same factor, preserving aspect ratio perfectly
    let uniformScale: number;
    
    if (wallAspectRatio > canvasAspectRatio) {
      // Wall layout is wider than canvas ratio, fit to width
      // Scale based on width constraint
      uniformScale = availableWidth / effectiveWidth;
    } else {
      // Wall layout is taller than canvas ratio, fit to height
      // Scale based on height constraint
      uniformScale = availableHeight / effectiveHeight;
    }
    
    // Calculate the center of the wall layout using actual extents
    const layoutCenterX = (minX + maxX) / 2;
    const layoutCenterY = (minY + maxY) / 2;
    
    // Calculate the center of the A4 canvas
    const canvasCenterX = a4Dimensions.a4X + a4Dimensions.a4WidthPx / 2;
    const canvasCenterY = a4Dimensions.a4Y + a4Dimensions.a4HeightPx / 2;
    
    // Scale and translate all walls to fit on canvas with PERFECT proportions
    const scaledWalls: Wall[] = newWalls.map(wall => {
      // Translate to origin (subtract layout center)
      const translatedStartX = wall.startX - layoutCenterX;
      const translatedStartY = wall.startY - layoutCenterY;
      const translatedEndX = wall.endX - layoutCenterX;
      const translatedEndY = wall.endY - layoutCenterY;
      
      // Scale with UNIFORM scale factor (same for X and Y to maintain proportions)
      const scaledStartX = translatedStartX * uniformScale;
      const scaledStartY = translatedStartY * uniformScale;
      const scaledEndX = translatedEndX * uniformScale;
      const scaledEndY = translatedEndY * uniformScale;
      
      // Translate to canvas center
      const finalStartX = scaledStartX + canvasCenterX;
      const finalStartY = scaledStartY + canvasCenterY;
      const finalEndX = scaledEndX + canvasCenterX;
      const finalEndY = scaledEndY + canvasCenterY;
      
      // Scale thickness proportionally
      const scaledThickness = wall.thickness * uniformScale;
      
      return {
        ...wall,
        startX: finalStartX,
        startY: finalStartY,
        endX: finalEndX,
        endY: finalEndY,
        thickness: scaledThickness,
      };
    });
    
    const scaledBounds = getWallsBoundingBox(scaledWalls);
    wallScaleRef.current = {
      pxPerMeter: uniformScale * WALLMAKER_PIXELS_PER_METER,
      bounds: scaledBounds,
    };

    const scaledDoors: Door[] = newDoors.map(door => ({
      ...door,
      id: `door-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      width: door.width * uniformScale,
    }));
    
    // Add the scaled walls to the state
    setWalls(prev => {
      const updated = [...prev, ...scaledWalls];
      return updated;
    });

    if (scaledDoors.length > 0) {
      setDoors(prev => {
        const updated = [...prev, ...scaledDoors];
        doorsRef.current = updated;
        return updated;
      });
    }

    // Save state
    saveState();
  }, [a4Dimensions, saveState]);

  // Expose addSpace, addTable, and addWalls methods via ref
  // Zoom to a set of points (for electrical dashboard)
  const zoomToPoints = useCallback((points: { x: number; y: number }[]) => {
    if (points.length === 0) return;
    
    // Calculate bounding box
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    // Add padding
    const padding = 200;
    const boxWidth = Math.max(maxX - minX + padding * 2, 400);
    const boxHeight = Math.max(maxY - minY + padding * 2, 300);
    
    // Center the view on the bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    setViewBox({
      x: centerX - boxWidth / 2,
      y: centerY - boxHeight / 2,
      width: boxWidth,
      height: boxHeight,
    });
  }, []);

  // Get current power points
  const getPowerPoints = useCallback(() => {
    return [...powerPoints];
  }, [powerPoints]);

  useImperativeHandle(ref, () => ({
    addSpace,
    addTable,
    addWalls,
    zoomToPoints,
    getPowerPoints,
  }), [addSpace, addTable, addWalls, zoomToPoints, getPowerPoints]);
  
  // Expose programmatic addPowerPoint
  const addPowerPointImperative = useCallback((x: number, y: number, standard: ElectricalStandard = 'EU_PT') => {
    if (!isPointOnCanvas(x, y)) return null;
    const newPoint = createPowerPoint(x, y, standard);
    setPowerPoints(prev => [...prev, newPoint]);
    return newPoint;
  }, [setPowerPoints]);
  
  // extend existing handle to include addPowerPointImperative
  useImperativeHandle(ref, () => ({
    addSpace,
    addTable,
    addWalls,
    zoomToPoints,
    getPowerPoints,
    addPowerPoint: addPowerPointImperative,
  }), [addSpace, addTable, addWalls, zoomToPoints, getPowerPoints, addPowerPointImperative]);

  // Undo function
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const currentState: CanvasState = {
      drawings: [...drawings],
      shapes: [...shapes],
      textElements: [...textElements],
      walls: [...walls],
      doors: [...doors],
    };
    
    const previousState = undoStack[undoStack.length - 1];
    if (!previousState) return;
    
    setDrawings(previousState.drawings);
    setShapes(previousState.shapes);
    setTextElements(previousState.textElements);
    setWalls(previousState.walls || []);
    setDoors(previousState.doors || []);
    
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentState]);
  }, [undoStack, drawings, shapes, textElements, walls]);

  // Redo function
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const currentState: CanvasState = {
      drawings: [...drawings],
      shapes: [...shapes],
      textElements: [...textElements],
      walls: [...walls],
      doors: [...doors],
    };
    
    const nextState = redoStack[redoStack.length - 1];
    if (!nextState) return;
    
    setDrawings(nextState.drawings);
    setShapes(nextState.shapes);
    setTextElements(nextState.textElements);
    setWalls(nextState.walls || []);
    setDoors(nextState.doors || []);
    
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentState]);
  }, [redoStack, drawings, shapes, textElements]);

  // Add global wheel event listener to prevent browser zoom
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      // ALWAYS prevent browser zoom when ctrl/meta is pressed (pinch gesture)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Use capture phase to catch events BEFORE they reach anything
    window.addEventListener('wheel', handleGlobalWheel, { 
      passive: false, 
      capture: true
    });
    
    // Prevent Safari gesture zoom
    const handleGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    window.addEventListener('gesturestart', handleGesture, { passive: false, capture: true });
    window.addEventListener('gesturechange', handleGesture, { passive: false, capture: true });
    window.addEventListener('gestureend', handleGesture, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel, { capture: true });
      window.removeEventListener('gesturestart', handleGesture, { capture: true });
      window.removeEventListener('gesturechange', handleGesture, { capture: true });
      window.removeEventListener('gestureend', handleGesture, { capture: true });
    };
  }, []);

  // Check if point is on A4 canvas
  const isPointOnCanvas = useCallback((x: number, y: number): boolean => {
    const { a4X, a4Y, a4WidthPx, a4HeightPx } = a4Dimensions;
    return x >= a4X && x <= a4X + a4WidthPx &&
           y >= a4Y && y <= a4Y + a4HeightPx;
  }, [a4Dimensions]);

  // eraser size from toolbar (px)
  const eraserSizeRef = useRef<number>(10);
  useEffect(() => {
    const onEraserSize = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail;
        if (!detail || typeof detail.size !== 'number') return;
        eraserSizeRef.current = Math.min(40, detail.size);
        console.log('Toolbar eraser size updated to', eraserSizeRef.current);
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('toolbar:eraser-size', onEraserSize as EventListener);
    return () => window.removeEventListener('toolbar:eraser-size', onEraserSize as EventListener);
  }, []);

  // Convert screen coordinates to SVG coordinates
  const screenToSvg = useCallback((screenX: number, screenY: number): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    
    const svg = svgRef.current;
    const svgRect = svg.getBoundingClientRect();
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = screenX - svgRect.left;
    svgPoint.y = screenY - svgRect.top;
    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) return null;
    const svgCoords = svgPoint.matrixTransform(matrix);
    return { x: svgCoords.x, y: svgCoords.y };
  }, []);

  const startMove = useCallback((shapeId: string, clientX: number, clientY: number) => {
    const svgPt = screenToSvg(clientX, clientY);
    if (!svgPt) return;
    const shape = shapesRef.current.find(s => s.id === shapeId);
    if (!shape) return;
    setSelectedShapeId(shapeId);
    selectedShapeIdRef.current = shapeId;
    movingShapeIdRef.current = shapeId;
    // store original position to allow reverting if dropped outside canvas
    originalPositionRef.current = { x: shape.x, y: shape.y };
    moveOffsetRef.current = { x: svgPt.x - shape.x, y: svgPt.y - shape.y };
    if (svgRef.current) svgRef.current.style.cursor = 'grabbing';
    isUserInteractingRef.current = true;
    console.log('startMove shape:', shapeId, 'offset:', moveOffsetRef.current);
    // notify toolbar to disable hover/highlight while moving
    try { window.dispatchEvent(new CustomEvent('canvas:move-start')); } catch {}
  }, [screenToSvg]);

  // Removed viewBox aspect ratio update - it was causing twitching
  // The viewBox should maintain its aspect ratio based on the 70% requirement
  // We keep the SVG in xMidYMid/meet mode so the entire A4 stays proportional

  const drawCanvas = useCallback(() => {
    if (!svgRef.current) {
      DEBUG_CANVAS && console.log('drawCanvas: svgRef.current is null');
      return;
    }

    const svg = svgRef.current;
    DEBUG_CANVAS && console.log('drawCanvas called. Current shapes count:', shapes.length);
    DEBUG_CANVAS && console.log('drawCanvas: Clearing SVG innerHTML');
    svg.innerHTML = '';

    const vb = viewBox;
    const { a4X, a4Y, a4WidthPx, a4HeightPx } = a4Dimensions;

    // Remove grid drawing - it's now handled by InfiniteGridBackground
    // Grid is now a fixed background, not part of the canvas SVG

    // Draw A4 white rectangle
    const a4Rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    a4Rect.setAttribute('x', a4X.toString());
    a4Rect.setAttribute('y', a4Y.toString());
    a4Rect.setAttribute('width', a4WidthPx.toString());
    a4Rect.setAttribute('height', a4HeightPx.toString());
    a4Rect.setAttribute('fill', '#ffffff');
    a4Rect.setAttribute('stroke', '#cccccc');
    a4Rect.setAttribute('stroke-width', '2');
    a4Rect.setAttribute('rx', '4');
    a4Rect.classList.add('a4-canvas');
    svg.appendChild(a4Rect);

    // Draw all shapes - spaces first (under everything), then other shapes, then drawings, then images (tables on top)
    // Separate shapes into spaces, regular shapes, and images
    const spaceShapes = shapes.filter(s => s.type === 'rectangle' && !s.imageUrl);
    const imageShapes = shapes.filter(s => s.type === 'image' && s.imageUrl);
    const regularShapes = shapes.filter(s => s.type !== 'image' && !(s.type === 'rectangle' && !s.imageUrl));
    
    DEBUG_CANVAS && console.log('Shape filtering - Total:', shapes.length, 'Spaces:', spaceShapes.length, 'Regular:', regularShapes.length, 'Images:', imageShapes.length);

    // Draw spaces first (background layer)
    spaceShapes.forEach(shape => {
      const element = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      element.setAttribute('x', shape.x.toString());
      element.setAttribute('y', shape.y.toString());
      element.setAttribute('width', shape.width.toString());
      element.setAttribute('height', shape.height.toString());
      element.setAttribute('fill', shape.fill);
      element.setAttribute('stroke', shape.stroke);
      element.setAttribute('stroke-width', shape.strokeWidth.toString());
      element.setAttribute('data-shape-id', shape.id);
      element.addEventListener('mousedown', (ev: MouseEvent) => {
        if (activeTool !== 'hand') return;
        ev.stopPropagation();
        ev.preventDefault();
        startMove(shape.id, ev.clientX, ev.clientY);
      });
      svg.appendChild(element);
    });

    // Draw regular shapes (middle layer)
    regularShapes.forEach(shape => {
      let element: SVGElement;
      if (shape.type === 'rectangle') {
        element = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        element.setAttribute('x', shape.x.toString());
        element.setAttribute('y', shape.y.toString());
        element.setAttribute('width', shape.width.toString());
        element.setAttribute('height', shape.height.toString());
      } else {
        element = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const radius = Math.min(Math.abs(shape.width), Math.abs(shape.height)) / 2;
        element.setAttribute('cx', (shape.x + shape.width / 2).toString());
        element.setAttribute('cy', (shape.y + shape.height / 2).toString());
        element.setAttribute('r', radius.toString());
      }
      element.setAttribute('fill', shape.fill);
      element.setAttribute('stroke', shape.stroke);
      element.setAttribute('stroke-width', shape.strokeWidth.toString());
      element.setAttribute('data-shape-id', shape.id);
      element.addEventListener('mousedown', (ev: MouseEvent) => {
        if (activeTool !== 'hand') return;
        ev.stopPropagation();
        ev.preventDefault();
        startMove(shape.id, ev.clientX, ev.clientY);
      });
      svg.appendChild(element);
    });

    // Draw walls (on top of spaces, below drawings)
    walls.forEach(wall => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute('x1', wall.startX.toString());
      line.setAttribute('y1', wall.startY.toString());
      line.setAttribute('x2', wall.endX.toString());
      line.setAttribute('y2', wall.endY.toString());
      line.setAttribute('stroke', wall.color || '#2c3e50');
      line.setAttribute('stroke-width', wall.thickness.toString());
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('data-wall-id', wall.id);
      svg.appendChild(line);
    });

    // Draw doors (on top of walls, below drawings)
    doors.forEach(door => {
      const wall = walls.find(w => w.id === door.wallId);
      if (!wall) return;

      const wallVecX = wall.endX - wall.startX;
      const wallVecY = wall.endY - wall.startY;
      const wallLength = Math.sqrt(wallVecX * wallVecX + wallVecY * wallVecY);
      if (wallLength === 0) return;

      const wallAngle = Math.atan2(wallVecY, wallVecX);
      const doorCenterX = wall.startX + door.position * wallVecX;
      const doorCenterY = wall.startY + door.position * wallVecY;
      const halfWidth = (door.width / 2);

      const doorStartX = doorCenterX - halfWidth * Math.cos(wallAngle);
      const doorStartY = doorCenterY - halfWidth * Math.sin(wallAngle);
      const doorEndX = doorCenterX + halfWidth * Math.cos(wallAngle);
      const doorEndY = doorCenterY + halfWidth * Math.sin(wallAngle);

      const hingeSide = door.hingeSide || 'start';
      const hingePoint = hingeSide === 'start'
        ? { x: doorStartX, y: doorStartY }
        : { x: doorEndX, y: doorEndY };
      const frameEndPoint = hingeSide === 'start'
        ? { x: doorEndX, y: doorEndY }
        : { x: doorStartX, y: doorStartY };

      const radius = Math.sqrt(
        Math.pow(frameEndPoint.x - hingePoint.x, 2) +
        Math.pow(frameEndPoint.y - hingePoint.y, 2)
      );
      if (radius === 0) return;

      const toRadians = (deg: number) => (deg * Math.PI) / 180;
      const baseAngle = Math.atan2(
        frameEndPoint.y - hingePoint.y,
        frameEndPoint.x - hingePoint.x
      ) * 180 / Math.PI;

      const directions: Array<'left' | 'right'> =
        door.openingDirection === 'both'
          ? ['left', 'right']
          : [door.openingDirection === 'left' ? 'left' : 'right'];

      directions.forEach(dir => {
        const sweep = dir === 'right' ? -90 : 90;
        const sweepFlag = dir === 'right' ? 0 : 1;
        const startAngle = baseAngle;
        const endAngle = baseAngle + sweep;

        const startRad = toRadians(startAngle);
        const endRad = toRadians(endAngle);

        const arcStartX = hingePoint.x + Math.cos(startRad) * radius;
        const arcStartY = hingePoint.y + Math.sin(startRad) * radius;
        const arcEndX = hingePoint.x + Math.cos(endRad) * radius;
        const arcEndY = hingePoint.y + Math.sin(endRad) * radius;

        const wedge = document.createElementNS("http://www.w3.org/2000/svg", "path");
        wedge.setAttribute(
          'd',
          `M ${hingePoint.x} ${hingePoint.y} L ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY} Z`
        );
        wedge.setAttribute('fill', '#000000');
        wedge.setAttribute('opacity', '0.15');
        svg.appendChild(wedge);

        const arc = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arc.setAttribute(
          'd',
          `M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`
        );
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', '#000000');
        arc.setAttribute('stroke-width', '4');
        arc.setAttribute('stroke-linecap', 'round');
        arc.setAttribute('opacity', '0.6');
        svg.appendChild(arc);
      });

      const gap = document.createElementNS("http://www.w3.org/2000/svg", "line");
      gap.setAttribute('x1', doorStartX.toString());
      gap.setAttribute('y1', doorStartY.toString());
      gap.setAttribute('x2', doorEndX.toString());
      gap.setAttribute('y2', doorEndY.toString());
      gap.setAttribute('stroke', '#ffffff');
      gap.setAttribute('stroke-width', (wall.thickness + 4).toString());
      gap.setAttribute('stroke-linecap', 'round');
      svg.appendChild(gap);

      const frame = document.createElementNS("http://www.w3.org/2000/svg", "line");
      frame.setAttribute('x1', doorStartX.toString());
      frame.setAttribute('y1', doorStartY.toString());
      frame.setAttribute('x2', doorEndX.toString());
      frame.setAttribute('y2', doorEndY.toString());
      frame.setAttribute('stroke', '#000000');
      frame.setAttribute('stroke-width', '3');
      frame.setAttribute('stroke-linecap', 'round');
      svg.appendChild(frame);

      const hingeCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hingeCircle.setAttribute('cx', hingePoint.x.toString());
      hingeCircle.setAttribute('cy', hingePoint.y.toString());
      hingeCircle.setAttribute('r', '3');
      hingeCircle.setAttribute('fill', '#000000');
      hingeCircle.setAttribute('stroke', '#ffffff');
      hingeCircle.setAttribute('stroke-width', '1.5');
      hingeCircle.setAttribute('opacity', '0.8');
      svg.appendChild(hingeCircle);
    });

    // Draw all drawings (brush strokes) - always on top of spaces and walls
    drawings.forEach(drawing => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute('d', drawing.d);
      path.setAttribute('stroke', drawing.stroke);
      path.setAttribute('stroke-width', drawing.strokeWidth.toString());
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('data-drawing-id', drawing.id);
      svg.appendChild(path);
    });

    // Draw images last (top layer - tables)
    DEBUG_CANVAS && console.log('Drawing image shapes:', imageShapes.length, imageShapes);
    imageShapes.forEach((shape, index) => {
        if (shape.imageUrl) {
        DEBUG_CANVAS && console.log(`[${index}] Creating image element for:`, shape.imageUrl);
        DEBUG_CANVAS && console.log(`[${index}] Shape data:`, { x: shape.x, y: shape.y, width: shape.width, height: shape.height });
        DEBUG_CANVAS && console.log(`[${index}] ViewBox:`, viewBox);
        DEBUG_CANVAS && console.log(`[${index}] A4 Dimensions:`, a4Dimensions);
        
        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        
        // Set both xlink:href and href for maximum compatibility
        image.setAttributeNS("http://www.w3.org/1999/xlink", "href", shape.imageUrl);
        image.setAttribute('href', shape.imageUrl);
        
        // Calculate the actual aspect ratio from the shape dimensions
        const shapeAspectRatio = shape.width / shape.height;
        
        // Get the image's natural aspect ratio by loading it
        const checkImg = new Image();
        checkImg.onload = () => {
          const imgAspectRatio = checkImg.naturalWidth / checkImg.naturalHeight;
          DEBUG_CANVAS && console.log(`[${index}] Image aspect ratio check:`, {
            shapeWidth: shape.width,
            shapeHeight: shape.height,
            shapeAspectRatio: shapeAspectRatio,
            imageNaturalWidth: checkImg.naturalWidth,
            imageNaturalHeight: checkImg.naturalHeight,
            imageAspectRatio: imgAspectRatio,
            match: Math.abs(shapeAspectRatio - imgAspectRatio) < 0.01
          });
        };
        checkImg.src = shape.imageUrl;
        
        // Recalculate dimensions using stored natural dimensions to ensure perfect aspect ratio
        // For objects with real-world sizing (tableData) we force exact px sizing: meter -> px correlation must be exact.
        let renderWidth = shape.width;
        let renderHeight = shape.height;
        let forceExact = false;

        if (shape.tableData && typeof shape.tableData.actualSizeMeters === 'number' && shape.attachedSpaceId) {
          // Furniture placed with real-world size: respect shape.width/height exactly (already set by placement logic).
          forceExact = true;
        } else if (shape.imageNaturalWidth && shape.imageNaturalHeight) {
          const naturalAspectRatio = shape.imageNaturalWidth / shape.imageNaturalHeight;
          const shapeAspectRatio = shape.width / shape.height;
          
          // If the shape dimensions don't match the natural aspect ratio, recalculate (only when not forcing exact)
          if (Math.abs(naturalAspectRatio - shapeAspectRatio) > 0.001) {
            DEBUG_CANVAS && console.log(`[${index}] Aspect ratio mismatch detected, recalculating:`, {
              naturalAspectRatio,
              shapeAspectRatio,
              naturalWidth: shape.imageNaturalWidth,
              naturalHeight: shape.imageNaturalHeight
            });

            // Recalculate to match natural aspect ratio exactly
            if (shape.width >= shape.height) {
              renderWidth = shape.width;
              renderHeight = shape.width / naturalAspectRatio;
            } else {
              renderHeight = shape.height;
              renderWidth = shape.height * naturalAspectRatio;
            }

            DEBUG_CANVAS && console.log(`[${index}] Corrected dimensions:`, {
              original: { width: shape.width, height: shape.height },
              corrected: { width: renderWidth, height: renderHeight }
            });
          }
        }
        
                // Use integer pixel values to avoid subpixel interpolation and reduce blurring.
                const imgX = Math.round(shape.x);
                const imgY = Math.round(shape.y);
                const imgWidth = Math.round(forceExact ? shape.width : renderWidth);
                const imgHeight = Math.round(forceExact ? shape.height : renderHeight);
                image.setAttribute('x', String(imgX));
                image.setAttribute('y', String(imgY));
                // If forcing exact, use the exact px values (meter -> px mapping must already have been applied to shape.width/height)
                image.setAttribute('width', String(imgWidth));
                image.setAttribute('height', String(imgHeight));
                // Prefer crisp rendering for scaled raster previews to reduce blurring.
                image.setAttribute('style', 'image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; image-rendering: pixelated;');
        image.setAttribute('data-shape-id', shape.id);
        // For forced exact sizing we must allow the image to stretch to the specified px dimensions
        image.setAttribute('preserveAspectRatio', forceExact ? 'none' : 'xMidYMid meet');
        // If this shape is selected and we're not in hand mode, draw a subtle highlight rectangle behind it
        if (activeTool !== 'hand' && (selectedShapeIdRef.current === shape.id || selectedShapeId === shape.id)) {
          const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          highlight.setAttribute('x', String(shape.x - 4));
          highlight.setAttribute('y', String(shape.y - 4));
          highlight.setAttribute('width', String(shape.width + 8));
          highlight.setAttribute('height', String(shape.height + 8));
          highlight.setAttribute('fill', 'rgba(0,0,0,0.02)');
          highlight.setAttribute('stroke', '#ff9f0a'); // distinct orange highlight
          highlight.setAttribute('stroke-width', '2');
          highlight.setAttribute('stroke-dasharray', '6,4');
          highlight.setAttribute('rx', '6');
          highlight.setAttribute('pointer-events', 'none');
          svg.appendChild(highlight);
        }
        // Drag-move with the hand tool
        image.addEventListener('mousedown', (ev: MouseEvent) => {
          if (activeTool !== 'hand') return;
          ev.stopPropagation();
          ev.preventDefault();
          startMove(shape.id, ev.clientX, ev.clientY);
        });
        // single click selects
        image.addEventListener('click', (ev: MouseEvent) => {
          try {
            ev.stopPropagation();
            setSelectedShapeId(shape.id);
            try { window.dispatchEvent(new CustomEvent('canvas:selection-change', { detail: { selectedId: shape.id } })); } catch {}
          } catch (err) {
            console.warn('select click failed', err);
          }
        });
        
        DEBUG_CANVAS && console.log(`[${index}] Image rendered:`, {
          width: renderWidth,
          height: renderHeight,
          naturalWidth: shape.imageNaturalWidth,
          naturalHeight: shape.imageNaturalHeight
        });

        // Add error handler (keep this one for debugging failed loads)
        image.onerror = () => {
          console.error(`[${index}] Image failed to load:`, shape.imageUrl);
        };

        image.onload = () => {
          DEBUG_CANVAS && console.log(`[${index}] Image loaded successfully:`, shape.imageUrl);
        };

        DEBUG_CANVAS && console.log(`[${index}] Appending image to SVG at:`, shape.x, shape.y, 'size:', shape.width, shape.height);
        svg.appendChild(image);
        DEBUG_CANVAS && console.log(`[${index}] Image appended. SVG children:`, svg.children.length);
      } else {
        DEBUG_CANVAS && console.log(`[${index}] Shape has no imageUrl:`, shape);
      }
    });

    // Draw all text elements
    textElements.forEach(textEl => {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute('x', textEl.x.toString());
      text.setAttribute('y', textEl.y.toString());
      text.setAttribute('font-size', textEl.fontSize.toString());
      text.setAttribute('fill', textEl.fill);
      text.setAttribute('data-text-id', textEl.id);
      text.textContent = textEl.text;
      svg.appendChild(text);
    });
  }, [viewBox, a4Dimensions, drawings, shapes, textElements, walls, doors, activeTool, startMove]);

  // Force redraw when shapes change (especially for images)
  useEffect(() => {
    DEBUG_CANVAS && console.log('Shapes changed, redrawing canvas. Total shapes:', shapes.length);
    drawCanvas();
  }, [shapes, drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Get cursor style based on tool
  const getCursor = (): string => {
    switch (activeTool) {
      case 'hand': return movingShapeIdRef.current ? 'grabbing' : 'grab';
      case 'brush': return 'crosshair';
      case 'eraser': return 'cell';
      case 'shapes': return 'crosshair';
      case 'text': return 'text';
      case 'power-point': return 'crosshair';
      default: return 'default';
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    
    const svgCoords = screenToSvg(e.clientX, e.clientY);
    if (!svgCoords || !isPointOnCanvas(svgCoords.x, svgCoords.y)) {
      if (activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'shapes' || activeTool === 'text' || activeTool === 'power-point') {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        return;
      }
    }

    if (activeTool === 'brush') {
      if (svgCoords && isPointOnCanvas(svgCoords.x, svgCoords.y)) {
        isUserInteractingRef.current = true;
        saveState(); // Save state before starting to draw
        isDrawingRef.current = true;
        const id = `drawing-${Date.now()}`;
        currentPathIdRef.current = id;
        currentPathRef.current = `M ${svgCoords.x} ${svgCoords.y}`;

        // Create initial drawing in state so it's managed by React and persisted
        const newDrawing: DrawingPath = {
          id,
          d: currentPathRef.current,
          stroke: brushColor,
          strokeWidth: brushSize,
        };
        setDrawings(prev => {
          const updated = [...prev, newDrawing];
          drawingsRef.current = updated;
          return updated;
        });
        e.preventDefault();
      }
    } else if (activeTool === 'eraser') {
      if (svgCoords && isPointOnCanvas(svgCoords.x, svgCoords.y)) {
        isUserInteractingRef.current = true;
        const hadDrawings = drawings.length > 0;
        isDrawingRef.current = true;
        scheduleErase(svgCoords.x, svgCoords.y);
        if (hadDrawings) {
          saveState(); // Save state before erasing
        }
        e.preventDefault();
      }
    } else if (activeTool === 'shapes') {
      if (svgCoords && isPointOnCanvas(svgCoords.x, svgCoords.y)) {
        isUserInteractingRef.current = true;
        saveState(); // Save state before creating shape
        shapeStartRef.current = { x: svgCoords.x, y: svgCoords.y };
        e.preventDefault();
      }
    } else if (activeTool === 'text') {
      if (svgCoords && isPointOnCanvas(svgCoords.x, svgCoords.y)) {
        isUserInteractingRef.current = true;
        const text = prompt('Enter text:');
        if (text && text.trim()) {
          saveState(); // Save state before adding text
          setTextElements(prev => [...prev, {
            id: `text-${Date.now()}`,
            x: svgCoords.x,
            y: svgCoords.y,
            text: text.trim(),
            fontSize: 16,
            fill: '#000000'
          }]);
        }
        setTimeout(() => {
          isUserInteractingRef.current = false;
        }, 100);
        e.preventDefault();
      }
    } else if (activeTool === 'power-point') {
      if (svgCoords && isPointOnCanvas(svgCoords.x, svgCoords.y)) {
        isUserInteractingRef.current = true;
        saveState(); // Save state before adding power point
        const newPoint = createPowerPoint(svgCoords.x, svgCoords.y, 'EU_PT');
        setPowerPoints(prev => [...prev, newPoint]);
        // Open the drawer for the new point
        setSelectedPowerPointId(newPoint.id);
        setIsElectricalDrawerOpen(true);
        setTimeout(() => {
          isUserInteractingRef.current = false;
        }, 100);
        e.preventDefault();
      }
    }
  }, [activeTool, screenToSvg, isPointOnCanvas, saveState, drawings, brushSize, brushColor]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (movingShapeIdRef.current) return;
    // If click is on an element that has a data-shape-id (or inside one), do not clear selection
    const targetEl = e.target as Element;
    if (targetEl && (targetEl.closest('[data-shape-id]') || targetEl.closest('[data-wall-id]') || targetEl.closest('[data-drawing-id]'))) {
      return;
    }
    setSelectedShapeId(null);
    selectedShapeIdRef.current = null;
    try { window.dispatchEvent(new CustomEvent('canvas:selection-change', { detail: { selectedId: null } })); } catch {}
  }, []);

  const eraseAtPoint = useCallback((x: number, y: number) => {
    const threshold = eraserSizeRef.current || 10;
    setDrawings(prev => prev.filter(drawing => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute('d', drawing.d);
      const pathLength = path.getTotalLength();
      
      for (let i = 0; i < pathLength; i += 5) {
        const point = path.getPointAtLength(i);
        const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
        if (distance < threshold) {
          return false;
        }
      }
      return true;
    }));
  }, []);

  // Smooth eraser scheduling using requestAnimationFrame to avoid excessive work on mousemove
  const eraserPendingRef = useRef<{ x: number; y: number } | null>(null);
  const eraserRafRef = useRef<number | null>(null);
  const scheduleErase = useCallback((x: number, y: number) => {
    eraserPendingRef.current = { x, y };
    if (eraserRafRef.current == null) {
      eraserRafRef.current = requestAnimationFrame(() => {
        const p = eraserPendingRef.current;
        if (p) {
          eraseAtPoint(p.x, p.y);
        }
        eraserPendingRef.current = null;
        if (eraserRafRef.current != null) {
          cancelAnimationFrame(eraserRafRef.current);
          eraserRafRef.current = null;
        }
      });
    }
  }, [eraseAtPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Move in-progress for a shape via double-click drag
    if (movingShapeIdRef.current) {
      const pt = screenToSvg(e.clientX, e.clientY);
      if (!pt) return;
      const offset = moveOffsetRef.current || { x: 0, y: 0 };

      // Proposed new position before snapping
      let newX = pt.x - offset.x;
      let newY = pt.y - offset.y;

      // Snap (magnet) logic: align to nearby shapes' edges/centers and A4 edges
      try {
        const SNAP_THRESHOLD = 8; // px
        const movingId = movingShapeIdRef.current;
        const movingShape = shapesRef.current.find(s => s.id === movingId);
        if (movingShape) {
          const mw = movingShape.width || 0;
          const mh = movingShape.height || 0;

          const xCandidates: number[] = [];
          const yCandidates: number[] = [];

          shapesRef.current.forEach(s => {
            if (s.id === movingId) return;
            const w = s.width || 0;
            const h = s.height || 0;
            xCandidates.push(s.x); // left
            xCandidates.push(s.x + w / 2); // center
            xCandidates.push(s.x + w); // right
            yCandidates.push(s.y); // top
            yCandidates.push(s.y + h / 2); // middle
            yCandidates.push(s.y + h); // bottom
          });

          // include A4 edges/centers
          const { a4X, a4Y, a4WidthPx, a4HeightPx } = a4Dimensions;
          xCandidates.push(a4X, a4X + a4WidthPx / 2, a4X + a4WidthPx);
          yCandidates.push(a4Y, a4Y + a4HeightPx / 2, a4Y + a4HeightPx);

          // moving positions to test
          const movingXPositions = [
            { type: 'left', value: newX },
            { type: 'center', value: newX + mw / 2 },
            { type: 'right', value: newX + mw },
          ];
          const movingYPositions = [
            { type: 'top', value: newY },
            { type: 'middle', value: newY + mh / 2 },
            { type: 'bottom', value: newY + mh },
          ];

          // find best snap for X
          let bestSnapX = { delta: 0, abs: Infinity };
          movingXPositions.forEach(mp => {
            xCandidates.forEach(candidate => {
              const delta = candidate - mp.value;
              const abs = Math.abs(delta);
              if (abs < bestSnapX.abs && abs <= SNAP_THRESHOLD) {
                bestSnapX = { delta, abs };
              }
            });
          });

          // find best snap for Y
          let bestSnapY = { delta: 0, abs: Infinity };
          movingYPositions.forEach(mp => {
            yCandidates.forEach(candidate => {
              const delta = candidate - mp.value;
              const abs = Math.abs(delta);
              if (abs < bestSnapY.abs && abs <= SNAP_THRESHOLD) {
                bestSnapY = { delta, abs };
              }
            });
          });

          if (bestSnapX.abs !== Infinity) {
            newX += bestSnapX.delta;
          }
          if (bestSnapY.abs !== Infinity) {
            newY += bestSnapY.delta;
          }
        }
      } catch (err) {
        console.error('snap error', err);
      }

      // Update DOM directly during move to avoid expensive re-renders/draws
      try {
        const svg = svgRef.current;
        const movingId = movingShapeIdRef.current!;
        if (svg) {
          const el = svg.querySelector(`[data-shape-id="${movingId}"]`) as SVGElement | null;
          if (el) {
            const tag = el.tagName.toLowerCase();
            if (tag === 'rect' || tag === 'image') {
              el.setAttribute('x', String(newX));
              el.setAttribute('y', String(newY));
            } else if (tag === 'circle') {
              const cx = newX + (shapesRef.current.find(s => s.id === movingId)?.width || 0) / 2;
              const cy = newY + (shapesRef.current.find(s => s.id === movingId)?.height || 0) / 2;
              el.setAttribute('cx', String(cx));
              el.setAttribute('cy', String(cy));
            }
          }
        }
      } catch (err) {
        // fallback to state update if DOM update fails
        const updated = shapesRef.current.map(s => s.id === movingShapeIdRef.current ? { ...s, x: newX, y: newY } : s);
        shapesRef.current = updated;
      }
      // store last moved position to commit on mouseup
      movingPositionRef.current = { x: newX, y: newY };
      // notify toolbar about current drag position (for trash hover)
      try {
        const shapeId = movingShapeIdRef.current!;
        window.dispatchEvent(new CustomEvent('canvas:drag', { detail: { clientX: e.clientX, clientY: e.clientY, shapeId } }));
      } catch {}
      return;
    }

    if (isPanningRef.current) {
      isUserInteractingRef.current = true;
      const deltaX = e.clientX - panStartRef.current.x;
      const deltaY = e.clientY - panStartRef.current.y;
      
      if (!svgRef.current) return;
      const svgRect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBox.width / svgRect.width;
      const scaleY = viewBox.height / svgRect.height;
      
      setViewBox(prev => ({
        ...prev,
        x: prev.x - deltaX * scaleX,
        y: prev.y - deltaY * scaleY,
      }));
      
      panStartRef.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }

    if (isDrawingRef.current && activeTool === 'brush') {
      const svgCoords = screenToSvg(e.clientX, e.clientY);
      if (svgCoords && isPointOnCanvas(svgCoords.x, svgCoords.y)) {
        currentPathRef.current += ` L ${svgCoords.x} ${svgCoords.y}`;
        const id = currentPathIdRef.current;
        if (!id) return;
        // Update the current drawing in state so redraws always include it
        setDrawings(prev => {
          const updated = prev.map(d =>
            d.id === id ? { ...d, d: currentPathRef.current } : d
          );
          drawingsRef.current = updated;
          return updated;
        });
      }
    } else if (isDrawingRef.current && activeTool === 'eraser') {
      const svgCoords = screenToSvg(e.clientX, e.clientY);
      if (svgCoords && isPointOnCanvas(svgCoords.x, svgCoords.y)) {
        scheduleErase(svgCoords.x, svgCoords.y);
      }
    } else if (shapeStartRef.current && activeTool === 'shapes') {
      const svgCoords = screenToSvg(e.clientX, e.clientY);
      if (svgCoords && isPointOnCanvas(svgCoords.x, svgCoords.y)) {
        const start = shapeStartRef.current;
        const width = svgCoords.x - start.x;
        const height = svgCoords.y - start.y;
        
        if (currentShapeRef.current && svgRef.current) {
          svgRef.current.removeChild(currentShapeRef.current);
        }
        
        const shapeType = shapes.length % 2 === 0 ? 'rectangle' : 'circle';
        const tempShape = shapeType === 'rectangle' 
          ? document.createElementNS("http://www.w3.org/2000/svg", "rect")
          : document.createElementNS("http://www.w3.org/2000/svg", "circle");
        
        if (shapeType === 'rectangle') {
          tempShape.setAttribute('x', Math.min(start.x, svgCoords.x).toString());
          tempShape.setAttribute('y', Math.min(start.y, svgCoords.y).toString());
          tempShape.setAttribute('width', Math.abs(width).toString());
          tempShape.setAttribute('height', Math.abs(height).toString());
        } else {
          const radius = Math.sqrt(width * width + height * height) / 2;
          tempShape.setAttribute('cx', (start.x + width / 2).toString());
          tempShape.setAttribute('cy', (start.y + height / 2).toString());
          tempShape.setAttribute('r', radius.toString());
        }
        
        tempShape.setAttribute('fill', shapeType === 'rectangle' ? 'rgba(52, 152, 219, 0.2)' : 'rgba(231, 76, 60, 0.2)');
        tempShape.setAttribute('stroke', shapeType === 'rectangle' ? '#3498db' : '#e74c3c');
        tempShape.setAttribute('stroke-width', '2');
        
        if (svgRef.current) {
          svgRef.current.appendChild(tempShape);
          currentShapeRef.current = tempShape;
        }
      }
    }
  }, [activeTool, screenToSvg, isPointOnCanvas, shapes.length, eraseAtPoint, brushSize, brushColor]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Finish shape move if active
    if (movingShapeIdRef.current) {
      const movedId = movingShapeIdRef.current;
      // notify listeners about drag end (e.g., trash drop detection)
      try {
        window.dispatchEvent(new CustomEvent('canvas:drag-end', { detail: { clientX: e.clientX, clientY: e.clientY, shapeId: movedId } }));
      } catch {}

      // If the shape was deleted by a trash drop listener, bail out
      const stillExists = shapesRef.current.some(s => s.id === movedId);
      if (!stillExists) {
        movingPositionRef.current = null;
        movingShapeIdRef.current = null;
        moveOffsetRef.current = null;
        if (svgRef.current) svgRef.current.style.cursor = '';
        isUserInteractingRef.current = false;
        try { window.dispatchEvent(new CustomEvent('canvas:move-end')); } catch {}
        return;
      }

      // If there is a pending moving position, decide whether to commit or revert
      if (movingPositionRef.current) {
        const { x: finalX, y: finalY } = movingPositionRef.current;
        // check full containment inside A4
        const { a4X, a4Y, a4WidthPx, a4HeightPx } = a4Dimensions;
        const shape = shapesRef.current.find(s => s.id === movedId);
        if (shape) {
          const within =
            finalX >= a4X &&
            finalY >= a4Y &&
            finalX + (shape.width || 0) <= a4X + a4WidthPx &&
            finalY + (shape.height || 0) <= a4Y + a4HeightPx;
          if (within) {
            // commit final position
            setShapes(prev => {
              const updated = prev.map(s => s.id === movedId ? { ...s, x: finalX, y: finalY } : s);
              shapesRef.current = updated;
              return updated;
            });
          } else {
            // revert to original position (unless trash handled deletion)
            const orig = originalPositionRef.current;
            if (orig) {
              setShapes(prev => {
                const updated = prev.map(s => s.id === movedId ? { ...s, x: orig.x, y: orig.y } : s);
                shapesRef.current = updated;
                return updated;
              });
            }
          }
        }
        movingPositionRef.current = null;
      }

      // cleanup
      movingShapeIdRef.current = null;
      originalPositionRef.current = null;
      moveOffsetRef.current = null;
      if (svgRef.current) svgRef.current.style.cursor = '';
      // Save final position/state
      saveState();
      isUserInteractingRef.current = false;
      try { window.dispatchEvent(new CustomEvent('canvas:move-end')); } catch {}
      return;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      // Reset user interaction flag after a delay
      setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 100);
      return;
    }

    if (isDrawingRef.current && activeTool === 'brush') {
      isDrawingRef.current = false;

      // Clear current path refs (the final path is already in state)
      currentPathRef.current = '';
      currentPathIdRef.current = '';

      // Save state immediately after drawing ends to persist the brush stroke
      saveState();
      // Force save to parent immediately
      saveCurrentStateImmediately();
      // Reset user interaction flag after drawing ends
      setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 50);
    } else if (isDrawingRef.current && activeTool === 'eraser') {
      isDrawingRef.current = false;
      // Reset user interaction flag after erasing ends
      // flush any pending scheduled erase and cancel RAF
      if (eraserPendingRef.current) {
        const p = eraserPendingRef.current;
        eraserPendingRef.current = null;
        eraseAtPoint(p.x, p.y);
      }
      if (eraserRafRef.current != null) {
        cancelAnimationFrame(eraserRafRef.current);
        eraserRafRef.current = null;
      }
      // Save state after erasing
      saveCurrentStateImmediately();
      setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 50);
    } else if (shapeStartRef.current && activeTool === 'shapes') {
      const svgCoords = screenToSvg(e.clientX, e.clientY);
      if (svgCoords && isPointOnCanvas(svgCoords.x, svgCoords.y)) {
        const start = shapeStartRef.current;
        const width = svgCoords.x - start.x;
        const height = svgCoords.y - start.y;
        const shapeType = shapes.length % 2 === 0 ? 'rectangle' : 'circle';
        
        setShapes(prev => [...prev, {
          id: `shape-${Date.now()}`,
          type: shapeType,
          x: Math.min(start.x, svgCoords.x),
          y: Math.min(start.y, svgCoords.y),
          width: Math.abs(width),
          height: Math.abs(height),
          fill: shapeType === 'rectangle' ? 'rgba(52, 152, 219, 0.2)' : 'rgba(231, 76, 60, 0.2)',
          stroke: shapeType === 'rectangle' ? '#3498db' : '#e74c3c',
          strokeWidth: 2
        }]);
      }
      
      if (currentShapeRef.current && svgRef.current) {
        svgRef.current.removeChild(currentShapeRef.current);
        currentShapeRef.current = null;
      }
      shapeStartRef.current = null;
      // Reset user interaction flag after shape creation ends
      setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 100);
    }
  }, [activeTool, screenToSvg, isPointOnCanvas, shapes.length]);

  // Listen for trash drop events from the toolbar and delete the matching shape
  useEffect(() => {
    const onTrashDrop = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)?.detail;
        if (!detail || !detail.shapeId) return;
        const shapeId = detail.shapeId;
        setShapes(prev => {
          const updated = prev.filter(s => s.id !== shapeId);
          shapesRef.current = updated;
          return updated;
        });
        // clear selection if it was the deleted shape
        setSelectedShapeId(prev => prev === shapeId ? null : prev);
        try { window.dispatchEvent(new CustomEvent('canvas:selection-change', { detail: { selectedId: null } })); } catch {}
        saveState();
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('trash:drop', onTrashDrop as EventListener);
    return () => {
      window.removeEventListener('trash:drop', onTrashDrop as EventListener);
    };
  }, [saveState]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    // Always prevent default to stop browser zoom
    e.preventDefault();
    e.stopPropagation();
    
    if (!svgRef.current || !containerRef.current) return;

    isUserInteractingRef.current = true;

    // Only zoom when ctrl/meta key is pressed (pinch gesture on trackpad)
    // All other wheel events are panning (two-finger scroll)
    if (e.ctrlKey || e.metaKey) {
      // Pinch gesture = zoom canvas only (via viewBox, not browser zoom)
      const svgRect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - svgRect.left;
      const mouseY = e.clientY - svgRect.top;

      const svgX = viewBox.x + (mouseX / svgRect.width) * viewBox.width;
      const svgY = viewBox.y + (mouseY / svgRect.height) * viewBox.height;

      // Pinch out (opening fingers, negative deltaY) = zoom in (smaller viewBox, factor > 1)
      // Pinch in (closing fingers, positive deltaY) = zoom out (larger viewBox, factor < 1)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      
      const container = containerRef.current;
      const containerAspect = container.clientWidth / container.clientHeight;
      
      let newWidth = viewBox.width * zoomFactor;
      let newHeight = viewBox.height * zoomFactor;
      
      if (containerAspect > newWidth / newHeight) {
        newWidth = newHeight * containerAspect;
      } else {
        newHeight = newWidth / containerAspect;
      }

      setViewBox({
        x: svgX - (mouseX / svgRect.width) * newWidth,
        y: svgY - (mouseY / svgRect.height) * newHeight,
        width: newWidth,
        height: newHeight,
      });
    } else {
      // Two-finger scroll = pan canvas (move around)
      const svgRect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBox.width / svgRect.width;
      const scaleY = viewBox.height / svgRect.height;

      setViewBox(prev => ({
        ...prev,
        x: prev.x + e.deltaX * scaleX,
        y: prev.y + e.deltaY * scaleY,
      }));
    }
    
    // Reset user interaction flag after a delay
    setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 200);
  }, [viewBox]);

  // Keyboard event handler for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'transparent',
        margin: 0,
        padding: 0,
        border: 0,
        zIndex: 1,
        touchAction: 'none',
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
          display: 'block', 
          cursor: getCursor(),
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0,
          border: 0,
          background: 'transparent',
          zIndex: 1,
        }}
      >
        {/* Power Points */}
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
      
      {/* Electrical Drawer */}
      <ElectricalDrawer
        isOpen={isElectricalDrawerOpen}
        onClose={() => {
          setIsElectricalDrawerOpen(false);
          setTimeout(() => setSelectedPowerPointId(null), 300);
        }}
        powerPoint={selectedPowerPoint}
        onUpdate={(updated: PowerPoint) => {
          setPowerPoints(prev => prev.map(p => p.id === updated.id ? updated : p));
          saveState();
        }}
        onDelete={(id: string) => {
          setPowerPoints(prev => prev.filter(p => p.id !== id));
          setIsElectricalDrawerOpen(false);
          setTimeout(() => setSelectedPowerPointId(null), 300);
          saveState();
        }}
      />
    </div>
  );
});

GridCanvas.displayName = 'GridCanvas';

export default GridCanvas;