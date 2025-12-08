import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Wall, WallMakerConfig, Door } from '../types/wall.js';
import { snapToGrid, snapLineToAngle, calculateDistance, calculateAngle, type Point } from '../utils/gridSnap.js';

// Helper function to calculate distance between two points
const calculateDistanceBetweenPoints = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

interface WallMakerProps {
  width: number;
  height: number;
  config: WallMakerConfig;
  walls: Wall[];
  onWallsChange: (walls: Wall[]) => void;
  onClose?: () => void;
  onAddToCanvas?: (walls: Wall[]) => void;
  onSavePreset?: (walls: Wall[], name: string) => void;
  activeTool?: 'wall' | 'pan' | 'door';
  doors?: Door[];
  onDoorsChange?: (doors: Door[]) => void;
}

const WallMaker: React.FC<WallMakerProps> = ({
  width,
  height,
  config,
  walls,
  onWallsChange,
  onClose,
  onAddToCanvas,
  onSavePreset,
  activeTool = 'wall',
  doors = [],
  onDoorsChange,
}) => {
  // Scale factor: 1 meter = 100 pixels
  const PIXELS_PER_METER = 100;
  
  // Ensure width and height are valid
  const canvasWidth = Math.max(800, width || 800);
  const canvasHeight = Math.max(600, height || 600);
  
  // Convert pixels to meters
  const pixelsToMeters = (pixels: number): number => {
    return pixels / PIXELS_PER_METER;
  };
  
  // Convert meters to pixels
  const metersToPixels = (meters: number): number => {
    return meters * PIXELS_PER_METER;
  };
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState<'idle' | 'start-set' | 'preview'>('idle');
  const [currentStart, setCurrentStart] = useState<Point | null>(null);
  const [currentEnd, setCurrentEnd] = useState<Point | null>(null);
  const [snapHighlight, setSnapHighlight] = useState<Point | null>(null);
  const [angleSnapInfo, setAngleSnapInfo] = useState<{ angle: number; snapped: boolean } | null>(null);
  const [selectedWall, setSelectedWall] = useState<Wall | null>(null);
  const [history, setHistory] = useState<Wall[][]>([walls || []]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [doorDrawingMode, setDoorDrawingMode] = useState<'idle' | 'hinge-set' | 'preview'>('idle');
  const [doorHinge, setDoorHinge] = useState<{ wallId: string; position: number; x: number; y: number; angle: number } | null>(null);
  const [doorEnd, setDoorEnd] = useState<{ position: number; x: number; y: number } | null>(null);
  const [doorSelection, setDoorSelection] = useState<{
    wallId: string;
    hingeX: number;
    hingeY: number;
    endX: number;
    endY: number;
    angle: number;
    width: number;
    endSide: 'left' | 'right';
    hingeSide: 'start' | 'end';
  } | null>(null);
  const [hoveredDirection, setHoveredDirection] = useState<'left' | 'right' | null>(null);
  
  // Default door width (in pixels, equivalent to ~0.9 meters)
  const DOOR_WIDTH = 90;
  
  // Pan and zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Save state to history
  const saveToHistory = useCallback((newWalls: Wall[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...(newWalls || [])]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && history[historyIndex - 1]) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onWallsChange([...(history[newIndex] || [])]);
    }
  }, [history, historyIndex, onWallsChange]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onWallsChange([...(history[newIndex] || [])]);
    }
  }, [history, historyIndex, onWallsChange]);

  // Update history when walls change externally (but not from undo/redo)
  useEffect(() => {
    // Only update history if the current walls don't match the history at current index
    // This prevents infinite loops when undo/redo updates walls
    const currentHistoryWalls = history[historyIndex];
    if (currentHistoryWalls && JSON.stringify(currentHistoryWalls) !== JSON.stringify(walls)) {
      // Only save if it's a real change, not from undo/redo
      const isFromHistory = history.some(h => JSON.stringify(h) === JSON.stringify(walls));
      if (!isFromHistory) {
        saveToHistory(walls);
      }
    }
  }, [walls, history, historyIndex, saveToHistory]);

  const screenToSvg = useCallback((clientX: number, clientY: number): Point | null => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    // Account for pan and zoom
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }, [pan, zoom]);

  // Find nearest endpoint from existing walls
  const findNearestEndpoint = useCallback((point: Point, threshold: number = 10): Point | null => {
    let nearestPoint: Point | null = null;
    let minDistance = threshold;

    walls.forEach(wall => {
      const startDist = Math.sqrt(Math.pow(point.x - wall.startX, 2) + Math.pow(point.y - wall.startY, 2));
      const endDist = Math.sqrt(Math.pow(point.x - wall.endX, 2) + Math.pow(point.y - wall.endY, 2));

      if (startDist < minDistance) {
        minDistance = startDist;
        nearestPoint = { x: wall.startX, y: wall.startY };
      }
      if (endDist < minDistance) {
        minDistance = endDist;
        nearestPoint = { x: wall.endX, y: wall.endY };
      }
    });

    return nearestPoint;
  }, [walls]);

  // Find which wall a point is on
  const findWallAtPoint = useCallback((point: Point, threshold: number = 10): { wall: Wall; position: number; distance: number } | null => {
    let closest: { wall: Wall; position: number; distance: number } | null = null;
    
    walls.forEach(wall => {
      const dx = wall.endX - wall.startX;
      const dy = wall.endY - wall.startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length === 0) return;
      
      // Vector from wall start to point
      const px = point.x - wall.startX;
      const py = point.y - wall.startY;
      
      // Project point onto wall line
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (length * length)));
      
      // Closest point on wall
      const closestX = wall.startX + t * dx;
      const closestY = wall.startY + t * dy;
      
      // Distance from point to wall
      const dist = Math.sqrt(Math.pow(point.x - closestX, 2) + Math.pow(point.y - closestY, 2));
      
      if (dist < threshold && (!closest || dist < closest.distance)) {
        closest = { wall, position: t, distance: dist };
      }
    });
    
    return closest;
  }, [walls]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    // Prevent default to avoid any interference
    e.preventDefault();
    e.stopPropagation();
    
    // Handle pan tool
    if (activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Handle door tool
    if (activeTool === 'door') {
      const point = screenToSvg(e.clientX, e.clientY);
      if (!point) return;
      
      // Check if clicking on a direction option (after door size is set)
      if (doorSelection) {
        // Check directly if clicking on a quarter circle (don't rely on hoveredDirection state)
        const wall = walls.find(w => w.id === doorSelection.wallId);
        if (!wall) {
          setDoorSelection(null);
          setHoveredDirection(null);
          setDoorDrawingMode('idle');
          setDoorHinge(null);
          setDoorEnd(null);
          return;
        }
        
        const hingeX = doorSelection.hingeX;
        const hingeY = doorSelection.hingeY;
        const arcRadius = doorSelection.width;
        
        const dx = point.x - hingeX;
        const dy = point.y - hingeY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check if clicking within arc radius
        if (dist <= arcRadius + 30) {
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          const baseAngle = Math.atan2(doorSelection.endY - hingeY, doorSelection.endX - hingeX) * 180 / Math.PI;
          let normalizedAngle = angle - baseAngle;
          while (normalizedAngle > 180) normalizedAngle -= 360;
          while (normalizedAngle < -180) normalizedAngle += 360;
          
          // Determine which quarter circle is being clicked
          let clickedDirection: 'left' | 'right' | null = null;
          if (normalizedAngle >= -90 && normalizedAngle <= 0) {
            // Right quarter circle
            clickedDirection = 'right';
          } else if (normalizedAngle >= 0 && normalizedAngle <= 90) {
            // Left quarter circle
            clickedDirection = 'left';
          }
          
          if (clickedDirection) {
            // Place door with selected direction
            const wallLength = Math.sqrt(
              Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endY - wall.startY, 2)
            );
            
            // Calculate door center position along wall
            const wallAngleRad = (doorSelection.angle * Math.PI) / 180;
            const endX = doorSelection.endX;
            const endY = doorSelection.endY;
            
            // Calculate position along wall for hinge and end
            const wallVecX = wall.endX - wall.startX;
            const wallVecY = wall.endY - wall.startY;
            const toHingeX = hingeX - wall.startX;
            const toHingeY = hingeY - wall.startY;
            const toEndX = endX - wall.startX;
            const toEndY = endY - wall.startY;
            
            const hingeDot = (toHingeX * wallVecX + toHingeY * wallVecY) / (wallLength * wallLength);
            const endDot = (toEndX * wallVecX + toEndY * wallVecY) / (wallLength * wallLength);
            
            const doorCenterPosition = (hingeDot + endDot) / 2;
            const doorWidth = doorSelection.width;
            
            const newDoor: Door = {
              id: `door-${Date.now()}-${Math.random()}`,
              wallId: doorSelection.wallId,
              position: doorCenterPosition,
              width: doorWidth,
              openingDirection: clickedDirection,
              hingeSide: doorSelection.hingeSide,
            };
            
            if (onDoorsChange) {
              onDoorsChange([...doors, newDoor]);
            }
            
            // Clear selection
            setDoorSelection(null);
            setHoveredDirection(null);
            setDoorDrawingMode('idle');
            setDoorHinge(null);
            setDoorEnd(null);
            return;
          }
        }
        
        // If clicking outside direction options, clear selection
        setDoorSelection(null);
        setHoveredDirection(null);
        setDoorDrawingMode('idle');
        setDoorHinge(null);
        setDoorEnd(null);
        return;
      }
      
      // Door drawing logic
      if (doorDrawingMode === 'idle') {
        // First click: set door hinge point on a wall
        const wallAtPoint = findWallAtPoint(point, 15);
        if (wallAtPoint) {
          const wall = wallAtPoint.wall;
          const wallAngle = calculateAngle(wall.startX, wall.startY, wall.endX, wall.endY);
          const hingeX = wall.startX + wallAtPoint.position * (wall.endX - wall.startX);
          const hingeY = wall.startY + wallAtPoint.position * (wall.endY - wall.startY);
          
          setDoorHinge({
            wallId: wall.id,
            position: wallAtPoint.position,
            x: hingeX,
            y: hingeY,
            angle: wallAngle,
          });
          setDoorEnd({
            position: wallAtPoint.position,
            x: hingeX,
            y: hingeY,
          });
          setDoorDrawingMode('hinge-set');
        }
      } else if (doorDrawingMode === 'hinge-set' || doorDrawingMode === 'preview') {
        // Second click: finalize door size and show direction options
        if (!doorHinge) {
          setDoorDrawingMode('idle');
          setDoorHinge(null);
          setDoorEnd(null);
          return;
        }
        
        const wall = walls.find(w => w.id === doorHinge.wallId);
        if (!wall) {
          setDoorDrawingMode('idle');
          setDoorHinge(null);
          setDoorEnd(null);
          return;
        }
        
        // Store the original click point BEFORE projection to determine side
        const originalClickPoint = { x: point.x, y: point.y };
        
        const wallAtPoint = findWallAtPoint(point, 25);
        
        let finalEndX: number, finalEndY: number, finalEndPos: number;
        
        if (wallAtPoint && wallAtPoint.wall.id === doorHinge.wallId) {
          // End point is on the same wall
          finalEndPos = wallAtPoint.position;
          finalEndX = wall.startX + wallAtPoint.position * (wall.endX - wall.startX);
          finalEndY = wall.startY + wallAtPoint.position * (wall.endY - wall.startY);
        } else if (doorEnd) {
          // Use doorEnd from mouse move
          finalEndPos = doorEnd.position;
          finalEndX = doorEnd.x;
          finalEndY = doorEnd.y;
        } else {
          // Project point onto wall
          const wallLength = Math.sqrt(
            Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endY - wall.startY, 2)
          );
          const wallVecX = wall.endX - wall.startX;
          const wallVecY = wall.endY - wall.startY;
          const toPointX = point.x - wall.startX;
          const toPointY = point.y - wall.startY;
          const dot = (toPointX * wallVecX + toPointY * wallVecY) / (wallLength * wallLength);
          const clampedDot = Math.max(0, Math.min(1, dot));
          finalEndPos = clampedDot;
          finalEndX = wall.startX + clampedDot * wallVecX;
          finalEndY = wall.startY + clampedDot * wallVecY;
        }
        
        // Calculate door width
        const doorWidth = Math.sqrt(
          Math.pow(finalEndX - doorHinge.x, 2) + Math.pow(finalEndY - doorHinge.y, 2)
        );
        
        // Minimum door width check
        if (doorWidth >= 20) {
          // Determine which side of the wall the door opening should be on
          // The door frame extends from hinge to end along the wall
          // The half circle should appear on the side where the END point is (where door opens)
          // Use the ORIGINAL click point to determine side (before projection onto wall)
          
          // Calculate wall direction vector
          const wallVecX = wall.endX - wall.startX;
          const wallVecY = wall.endY - wall.startY;
          const wallLength = Math.sqrt(wallVecX * wallVecX + wallVecY * wallVecY);
          
          // Calculate vector from wall start to the ORIGINAL click point (not projected)
          const wallToClickX = originalClickPoint.x - wall.startX;
          const wallToClickY = originalClickPoint.y - wall.startY;
          
          // Calculate perpendicular vector to wall (pointing to the right side)
          // Perpendicular right = rotate wall vector 90 degrees clockwise: (wallY, -wallX)
          const perpRightX = wallVecY;
          const perpRightY = -wallVecX;
          
          // Dot product: determines which side of the wall the click point is on
          // Positive = click is on right side, negative = click is on left side
          const dotProduct = wallToClickX * perpRightX + wallToClickY * perpRightY;
          
          // Show half circle on the side where the click/end point is
          // This is where the door opening will be
          const endSide: 'left' | 'right' = dotProduct >= 0 ? 'right' : 'left';
          
          // Determine which end of the door opening is the hinge (start or end along the frame)
          const hingeSide: 'start' | 'end' = doorHinge.position <= finalEndPos ? 'start' : 'end';

          // Finalize door size - stop preview and show direction options
          setDoorSelection({
            wallId: wall.id,
            hingeX: doorHinge.x,
            hingeY: doorHinge.y,
            endX: finalEndX,
            endY: finalEndY,
            angle: doorHinge.angle,
            width: doorWidth,
            endSide: endSide,
            hingeSide,
          });
          setDoorDrawingMode('idle');
          // Keep doorHinge and doorEnd for reference, but stop preview
        } else {
          // Door too small, reset
          setDoorDrawingMode('idle');
          setDoorHinge(null);
          setDoorEnd(null);
        }
      }
      return;
    }
    
    // Handle wall tool
    if (activeTool !== 'wall') return;
    
    const point = screenToSvg(e.clientX, e.clientY);
    if (!point) return;

    if (drawingMode === 'idle') {
      // First click: set start point
      let snappedPoint = point;
      
      // Try to snap to existing endpoint first
      const endpointSnap = findNearestEndpoint(point, 15);
      if (endpointSnap) {
        snappedPoint = endpointSnap;
        setSnapHighlight(endpointSnap);
      } else if (config.snapToGrid) {
        const snapResult = snapToGrid(point.x, point.y, config.gridSize);
        snappedPoint = { x: snapResult.x, y: snapResult.y };
        setSnapHighlight(snapResult.snapped ? snappedPoint : null);
      } else {
        setSnapHighlight(null);
      }

      setCurrentStart(snappedPoint);
      setCurrentEnd(snappedPoint);
      setDrawingMode('start-set');
    } else if (drawingMode === 'start-set' || drawingMode === 'preview') {
      // Second click: set end point and create wall
      let snappedPoint = point;
      
      // Try to snap to existing endpoint first
      const endpointSnap = findNearestEndpoint(point, 15);
      if (endpointSnap) {
        snappedPoint = endpointSnap;
        setSnapHighlight(endpointSnap);
      } else if (config.snapToGrid) {
        const snapResult = snapToGrid(point.x, point.y, config.gridSize);
        snappedPoint = { x: snapResult.x, y: snapResult.y };
        setSnapHighlight(snapResult.snapped ? snappedPoint : null);
      } else {
        setSnapHighlight(null);
      }

      if (currentStart) {
        const length = calculateDistanceBetweenPoints(currentStart, snappedPoint);
        
        // Don't create walls that are too short
        if (length >= 5) {
          const angle = calculateAngle(currentStart.x, currentStart.y, snappedPoint.x, snappedPoint.y);
          const snappedAngle = angleSnapInfo?.snapped ? angleSnapInfo.angle : undefined;

          const newWall: Wall = {
            id: `wall-${Date.now()}`,
            startX: currentStart.x,
            startY: currentStart.y,
            endX: snappedPoint.x,
            endY: snappedPoint.y,
            thickness: config.defaultThickness,
            length,
            angle,
            snapToGrid: config.snapToGrid,
            ...(snappedAngle !== undefined && { snapAngle: snappedAngle }),
          };

          const newWalls = [...walls, newWall];
          saveToHistory(newWalls);
          onWallsChange(newWalls);
        }
      }

      // Reset for next line
      setDrawingMode('idle');
      setCurrentStart(null);
      setCurrentEnd(null);
      setSnapHighlight(null);
      setAngleSnapInfo(null);
    }
  }, [screenToSvg, config, drawingMode, currentStart, walls, angleSnapInfo, findNearestEndpoint, saveToHistory, onWallsChange, activeTool, doorDrawingMode, doorHinge, doorEnd, doorSelection, hoveredDirection, doors, onDoorsChange, findWallAtPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Handle panning
    if (activeTool === 'pan' && isPanning && panStart) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Handle door tool
    if (activeTool === 'door') {
      const point = screenToSvg(e.clientX, e.clientY);
      if (!point) return;
      
      // Door drawing preview (update end point as mouse moves - only before second click)
      if (doorDrawingMode === 'hinge-set' || doorDrawingMode === 'preview') {
        // Only show preview if doorSelection is not set (i.e., before second click finalizes)
        if (doorHinge && !doorSelection) {
          const wall = walls.find(w => w.id === doorHinge.wallId);
          if (!wall) return;
          
          const wallAtPoint = findWallAtPoint(point, 20);
          
          if (wallAtPoint && wallAtPoint.wall.id === doorHinge.wallId) {
            // End point is on the same wall
            const doorX = wall.startX + wallAtPoint.position * (wall.endX - wall.startX);
            const doorY = wall.startY + wallAtPoint.position * (wall.endY - wall.startY);
            
            setDoorEnd({
              position: wallAtPoint.position,
              x: doorX,
              y: doorY,
            });
            setDoorDrawingMode('preview');
          } else {
            // Project point onto wall
            const wallLength = Math.sqrt(
              Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endY - wall.startY, 2)
            );
            const wallVecX = wall.endX - wall.startX;
            const wallVecY = wall.endY - wall.startY;
            const toPointX = point.x - wall.startX;
            const toPointY = point.y - wall.startY;
            const dot = (toPointX * wallVecX + toPointY * wallVecY) / (wallLength * wallLength);
            const clampedDot = Math.max(0, Math.min(1, dot));
            
            const closestX = wall.startX + clampedDot * wallVecX;
            const closestY = wall.startY + clampedDot * wallVecY;
            
            setDoorEnd({
              position: clampedDot,
              x: closestX,
              y: closestY,
            });
            setDoorDrawingMode('preview');
          }
        }
        return;
      }
      
      // If doorSelection is set, check which quarter circle is being hovered
      if (doorSelection) {
        const hingeX = doorSelection.hingeX;
        const hingeY = doorSelection.hingeY;
        const arcRadius = doorSelection.width;
        
        const dx = point.x - hingeX;
        const dy = point.y - hingeY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= arcRadius + 30) {
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          const baseAngle = Math.atan2(doorSelection.endY - hingeY, doorSelection.endX - hingeX) * 180 / Math.PI;
          let normalizedAngle = angle - baseAngle;
          while (normalizedAngle > 180) normalizedAngle -= 360;
          while (normalizedAngle < -180) normalizedAngle += 360;
          
          if (normalizedAngle >= -90 && normalizedAngle <= 0) {
            setHoveredDirection('right');
          } else if (normalizedAngle >= 0 && normalizedAngle <= 90) {
            setHoveredDirection('left');
          } else {
            setHoveredDirection(null);
          }
        } else {
          setHoveredDirection(null);
        }
        return;
      }
      
      return;
    }
    
    // Handle wall drawing
    if (activeTool !== 'wall' || (drawingMode !== 'start-set' && drawingMode !== 'preview')) return;
    if (!currentStart) return;

    const point = screenToSvg(e.clientX, e.clientY);
    if (!point) return;

    let endPoint = point;

    // Try to snap to existing endpoint first
    const endpointSnap = findNearestEndpoint(point, 15);
    if (endpointSnap) {
      endPoint = endpointSnap;
      setSnapHighlight(endpointSnap);
    } else {
      // Apply grid snapping
      if (config.snapToGrid) {
        const snapResult = snapToGrid(point.x, point.y, config.gridSize);
        endPoint = { x: snapResult.x, y: snapResult.y };
        setSnapHighlight(snapResult.snapped ? endPoint : null);
      } else {
        setSnapHighlight(null);
      }
    }

    // Apply angle snapping
    if (config.snapAngles.length > 0) {
      const angleSnap = snapLineToAngle(
        currentStart.x,
        currentStart.y,
        endPoint.x,
        endPoint.y,
        config.snapAngles
      );
      endPoint = { x: angleSnap.x, y: angleSnap.y };
      setAngleSnapInfo({
        angle: angleSnap.angle || 0,
        snapped: angleSnap.snapped || false,
      });
    } else {
      setAngleSnapInfo({
        angle: calculateAngle(currentStart.x, currentStart.y, endPoint.x, endPoint.y),
        snapped: false,
      });
    }

    setCurrentEnd(endPoint);
    setDrawingMode('preview');
    setHoveredPoint(endPoint);
  }, [drawingMode, currentStart, screenToSvg, config, findNearestEndpoint, activeTool, isPanning, panStart, doorHinge, findWallAtPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Handle pan tool
    if (activeTool === 'pan' && isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }
    // Mouse up is handled in mouseDown for click-click mode (wall tool and door tool)
  }, [activeTool, isPanning]);
  

  const handleMouseLeave = useCallback(() => {
    // Don't reset on mouse leave - keep the preview visible
    setHoveredPoint(null);
  }, []);

  const handleWallRightClick = useCallback((e: React.MouseEvent, wall: Wall) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedWall(wall);
  }, []);

  const handleDeleteWall = useCallback((wallId: string) => {
    const newWalls = walls.filter(w => w.id !== wallId);
    saveToHistory(newWalls);
    onWallsChange(newWalls);
    setSelectedWall(null);
  }, [walls, saveToHistory, onWallsChange]);

  const handleUpdateWall = useCallback((updatedWall: Wall) => {
    const newWalls = walls.map(w => w.id === updatedWall.id ? updatedWall : w);
    saveToHistory(newWalls);
    onWallsChange(newWalls);
    setSelectedWall(updatedWall);
  }, [walls, saveToHistory, onWallsChange]);

  // Render infinite grid using SVG pattern
  const renderGrid = () => {
    if (!config.showGrid) return null;

    // Convert grid size from pixels to the actual grid size
    const gridSizePx = config.gridSize;
    const majorGridSizePx = gridSizePx * 5; // Major grid every 5 units

    return (
      <defs>
        <pattern
          id="wall-maker-grid-pattern"
          x="0"
          y="0"
          width={gridSizePx}
          height={gridSizePx}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${gridSizePx} 0 L 0 0 0 ${gridSizePx}`}
            fill="none"
            stroke="#d0d0d0"
            strokeWidth="0.5"
            opacity="0.5"
          />
        </pattern>
        <pattern
          id="wall-maker-major-grid-pattern"
          x="0"
          y="0"
          width={majorGridSizePx}
          height={majorGridSizePx}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${majorGridSizePx} 0 L 0 0 0 ${majorGridSizePx}`}
            fill="none"
            stroke="#b0b0b0"
            strokeWidth="1"
            opacity="0.6"
          />
        </pattern>
      </defs>
    );
  };

  // Handle wheel events: pinch zoom (Ctrl+wheel) or pan (two-finger scroll)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Pinch zoom (Ctrl+wheel or trackpad pinch gesture)
    if (e.ctrlKey || e.metaKey) {
      // Calculate zoom factor
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
      const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
      
      // Zoom towards mouse position
      const zoomChange = newZoom / zoom;
      const newPanX = mouseX - (mouseX - pan.x) * zoomChange;
      const newPanY = mouseY - (mouseY - pan.y) * zoomChange;
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      // Two-finger pan (scroll)
      setPan({
        x: pan.x - e.deltaX,
        y: pan.y - e.deltaY,
      });
    }
  }, [zoom, pan]);

  // Render walls (with door gaps)
  const renderWalls = () => {
    return walls.map(wall => {
      const isSelected = selectedWall?.id === wall.id;
      const wallDoors = doors.filter(d => d.wallId === wall.id);
      
      // If wall has doors, render wall segments around doors
      if (wallDoors.length > 0) {
        const wallLength = Math.sqrt(
          Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endY - wall.startY, 2)
        );
        
        // Sort doors by position along wall
        const sortedDoors = [...wallDoors].sort((a, b) => a.position - b.position);
        
        const segments: Array<{ start: number; end: number }> = [];
        let currentPos = 0;
        
        sortedDoors.forEach(door => {
          const doorHalfWidth = door.width / 2 / wallLength;
          const doorStart = Math.max(0, door.position - doorHalfWidth);
          const doorEnd = Math.min(1, door.position + doorHalfWidth);
          
          if (doorStart > currentPos) {
            segments.push({ start: currentPos, end: doorStart });
          }
          currentPos = doorEnd;
        });
        
        // Add final segment if needed
        if (currentPos < 1) {
          segments.push({ start: currentPos, end: 1 });
        }
        
        return (
          <g key={wall.id}>
            {segments.map((seg, idx) => {
              const segStartX = wall.startX + seg.start * (wall.endX - wall.startX);
              const segStartY = wall.startY + seg.start * (wall.endY - wall.startY);
              const segEndX = wall.startX + seg.end * (wall.endX - wall.startX);
              const segEndY = wall.startY + seg.end * (wall.endY - wall.startY);
              
              return (
                <line
                  key={`segment-${idx}`}
                  x1={segStartX}
                  y1={segStartY}
                  x2={segEndX}
                  y2={segEndY}
                  stroke={isSelected ? '#3498db' : '#2c3e50'}
                  strokeWidth={wall.thickness}
                  strokeLinecap="round"
                  cursor="pointer"
                  onContextMenu={(e) => handleWallRightClick(e, wall)}
                  style={{ filter: isSelected ? 'drop-shadow(0 0 4px rgba(52, 152, 219, 0.5))' : 'none' }}
                />
              );
            })}
            {config.showMeasurements && (
              <text
                x={(wall.startX + wall.endX) / 2}
                y={(wall.startY + wall.endY) / 2 - 10}
                fontSize="12"
                fill="#666666"
                textAnchor="middle"
                pointerEvents="none"
              >
                {wall.length ? pixelsToMeters(wall.length).toFixed(2) : '0'}m
              </text>
            )}
            {config.showAngles && wall.angle !== undefined && (
              <text
                x={wall.endX + 10}
                y={wall.endY}
                fontSize="10"
                fill="#999999"
                pointerEvents="none"
              >
                {wall.angle.toFixed(0)}°
              </text>
            )}
          </g>
        );
      }
      
      // Wall without doors - render normally
      return (
        <g key={wall.id}>
          <line
            x1={wall.startX}
            y1={wall.startY}
            x2={wall.endX}
            y2={wall.endY}
            stroke={isSelected ? '#3498db' : '#2c3e50'}
            strokeWidth={wall.thickness}
            strokeLinecap="round"
            cursor="pointer"
            onContextMenu={(e) => handleWallRightClick(e, wall)}
            style={{ filter: isSelected ? 'drop-shadow(0 0 4px rgba(52, 152, 219, 0.5))' : 'none' }}
          />
          {config.showMeasurements && (
            <text
              x={(wall.startX + wall.endX) / 2}
              y={(wall.startY + wall.endY) / 2 - 10}
              fontSize="12"
              fill="#666666"
              textAnchor="middle"
              pointerEvents="none"
            >
              {wall.length ? pixelsToMeters(wall.length).toFixed(2) : '0'}m
            </text>
          )}
          {config.showAngles && wall.angle !== undefined && (
            <text
              x={wall.endX + 10}
              y={wall.endY}
              fontSize="10"
              fill="#999999"
              pointerEvents="none"
            >
              {wall.angle.toFixed(0)}°
            </text>
          )}
        </g>
      );
    });
  };

  // Render current drawing line (preview)
  const renderCurrentLine = () => {
    if (drawingMode !== 'preview' || !currentStart || !currentEnd) return null;

    const length = calculateDistanceBetweenPoints(currentStart, currentEnd);
    const angle = angleSnapInfo?.angle || calculateAngle(currentStart.x, currentStart.y, currentEnd.x, currentEnd.y);
    const isSnapped = snapHighlight !== null || angleSnapInfo?.snapped;

    return (
      <g>
        <line
          x1={currentStart.x}
          y1={currentStart.y}
          x2={currentEnd.x}
          y2={currentEnd.y}
          stroke={isSnapped ? '#27ae60' : '#3498db'}
          strokeWidth={config.defaultThickness}
          strokeLinecap="round"
          strokeDasharray="5,5"
          opacity={0.5}
        />
        {config.showMeasurements && (
          <text
            x={(currentStart.x + currentEnd.x) / 2}
            y={(currentStart.y + currentEnd.y) / 2 - 10}
            fontSize="12"
            fill={isSnapped ? '#27ae60' : '#3498db'}
            textAnchor="middle"
            fontWeight="bold"
            pointerEvents="none"
            opacity={0.8}
          >
            {pixelsToMeters(length).toFixed(2)}m
          </text>
        )}
        {config.showAngles && (
          <text
            x={currentEnd.x + 10}
            y={currentEnd.y}
            fontSize="10"
            fill={isSnapped ? '#27ae60' : '#3498db'}
            fontWeight="bold"
            pointerEvents="none"
            opacity={0.8}
          >
            {angle.toFixed(0)}° {angleSnapInfo?.snapped ? '✓' : ''}
          </text>
        )}
      </g>
    );
  };

  // Render doors on walls
  const renderDoors = () => {
    return doors.map(door => {
      const wall = walls.find(w => w.id === door.wallId);
      if (!wall) return null;
      
      const wallLength = Math.sqrt(
        Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endY - wall.startY, 2)
      );
      const wallAngle = calculateAngle(wall.startX, wall.startY, wall.endX, wall.endY);
      
      // Calculate door position along wall (center of door opening)
      const doorX = wall.startX + door.position * (wall.endX - wall.startX);
      const doorY = wall.startY + door.position * (wall.endY - wall.startY);
      
      // Door width in wall coordinates
      const doorWidth = door.width;
      const halfWidth = doorWidth / 2;
      const wallAngleRad = (wallAngle * Math.PI) / 180;
      
      // Calculate door opening edges
      const doorStartX = doorX - halfWidth * Math.cos(wallAngleRad);
      const doorStartY = doorY - halfWidth * Math.sin(wallAngleRad);
      const doorEndX = doorX + halfWidth * Math.cos(wallAngleRad);
      const doorEndY = doorY + halfWidth * Math.sin(wallAngleRad);
      
      const hingeSide = door.hingeSide || 'start';
      const hingePoint = hingeSide === 'start'
        ? { x: doorStartX, y: doorStartY }
        : { x: doorEndX, y: doorEndY };
      const frameEndPoint = hingeSide === 'start'
        ? { x: doorEndX, y: doorEndY }
        : { x: doorStartX, y: doorStartY };
      
      const baseAngle = Math.atan2(
        frameEndPoint.y - hingePoint.y,
        frameEndPoint.x - hingePoint.x
      ) * 180 / Math.PI;
      
      const radius = Math.sqrt(
        Math.pow(frameEndPoint.x - hingePoint.x, 2) + Math.pow(frameEndPoint.y - hingePoint.y, 2)
      );
      
      const openingDir = door.openingDirection === 'left' ? 'left' : 'right';
      const sweep = openingDir === 'right' ? -90 : 90;
      const sweepFlag = openingDir === 'right' ? 0 : 1;
      const startAngle = baseAngle;
      const endAngle = baseAngle + sweep;
      const arcStartRad = (startAngle * Math.PI) / 180;
      const arcEndRad = (endAngle * Math.PI) / 180;
      const arcStartX = hingePoint.x + Math.cos(arcStartRad) * radius;
      const arcStartY = hingePoint.y + Math.sin(arcStartRad) * radius;
      const arcEndX = hingePoint.x + Math.cos(arcEndRad) * radius;
      const arcEndY = hingePoint.y + Math.sin(arcEndRad) * radius;
      const largeArcFlag = 0;
      
      const swingPath = `M ${hingePoint.x} ${hingePoint.y} L ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${arcEndX} ${arcEndY} Z`;
      
      return (
        <g key={door.id}>
          {/* Door swing area (low opacity background) */}
          <path
            d={swingPath}
            fill="#000000"
            opacity="0.15"
          />
          {/* Door opening in wall (gap - white line to erase wall) */}
          <line
            x1={doorStartX}
            y1={doorStartY}
            x2={doorEndX}
            y2={doorEndY}
            stroke="#ffffff"
            strokeWidth={wall.thickness + 4}
            strokeLinecap="round"
            opacity="1"
          />
          {/* Door opening arc (swing path) - quarter circle from door point */}
          <path
            d={`M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${arcEndX} ${arcEndY}`}
            fill="none"
            stroke="#000000"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.6"
          />
          {/* Door frame (sides) */}
          <line
            x1={doorStartX}
            y1={doorStartY}
            x2={doorEndX}
            y2={doorEndY}
            stroke="#000000"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Hinge point indicator */}
          <circle
            cx={hingePoint.x}
            cy={hingePoint.y}
            r="3"
            fill="#000000"
            stroke="#ffffff"
            strokeWidth="1.5"
            opacity="0.8"
          />
        </g>
      );
    }).filter(Boolean);
  };
  
  // Render door drawing preview (hinge to end point - only before second click)
  const renderDoorPreview = () => {
    // Only show preview if doorSelection is not set (i.e., before second click finalizes)
    if (!doorHinge || !doorEnd || doorDrawingMode === 'idle' || doorSelection) return null;
    
    const wall = walls.find(w => w.id === doorHinge.wallId);
    if (!wall) return null;
    
    const startX = doorHinge.x;
    const startY = doorHinge.y;
    const endX = doorEnd.x;
    const endY = doorEnd.y;
    const doorWidth = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    
    return (
      <g>
        {/* Preview door opening (gap in wall) */}
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#ffffff"
          strokeWidth={wall.thickness + 4}
          strokeLinecap="round"
          strokeDasharray="5,5"
          opacity="0.7"
        />
        {/* Preview door frame */}
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#000000"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="5,5"
          opacity="0.5"
        />
        {/* Preview hinge point */}
        <circle
          cx={startX}
          cy={startY}
          r="5"
          fill="#000000"
          stroke="#ffffff"
          strokeWidth="2"
          opacity="0.8"
        />
        {/* Preview end point */}
        <circle
          cx={endX}
          cy={endY}
          r="5"
          fill="#000000"
          stroke="#ffffff"
          strokeWidth="2"
          opacity="0.8"
        />
        {/* Preview width indicator */}
        {doorWidth > 0 && (
          <text
            x={(startX + endX) / 2}
            y={(startY + endY) / 2 - 10}
            fontSize="11"
            fill="#000000"
            textAnchor="middle"
            opacity="0.6"
            fontWeight="500"
          >
            {pixelsToMeters(doorWidth).toFixed(2)}m
          </text>
        )}
      </g>
    );
  };
  
  // Render half circle (two quarter-circle options) originating at the hinge
  // The hinge (first click) is the vertex for both quarter circles
  const renderDoorDirectionOptions = () => {
    if (!doorSelection) return null;
    
    const wall = walls.find(w => w.id === doorSelection.wallId);
    if (!wall) return null;
    
    const hingeX = doorSelection.hingeX;
    const hingeY = doorSelection.hingeY;
    const endX = doorSelection.endX;
    const endY = doorSelection.endY;
    
    const radius = Math.sqrt(Math.pow(endX - hingeX, 2) + Math.pow(endY - hingeY, 2));
    if (radius === 0) return null;
    
    const baseAngle = Math.atan2(endY - hingeY, endX - hingeX) * 180 / Math.PI;
    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    
    const directions: Array<{ dir: 'left' | 'right'; sweep: number; label: string }> = [
      { dir: 'right', sweep: -90, label: 'R' },
      { dir: 'left', sweep: 90, label: 'L' },
    ];
    
    return (
      <g>
        {directions.map(({ dir, sweep, label }) => {
          const startAngle = baseAngle;
          const endAngle = baseAngle + sweep;
          
          const startRad = toRadians(startAngle);
          const endRad = toRadians(endAngle);
          
          const arcStartX = hingeX + Math.cos(startRad) * radius;
          const arcStartY = hingeY + Math.sin(startRad) * radius;
          const arcEndX = hingeX + Math.cos(endRad) * radius;
          const arcEndY = hingeY + Math.sin(endRad) * radius;
          
          const sweepFlag = dir === 'left' ? 1 : 0;
          const largeArcFlag = 0;
          
          const labelAngle = baseAngle + sweep / 2;
          const labelRad = toRadians(labelAngle);
          const labelX = hingeX + Math.cos(labelRad) * (radius * 0.65);
          const labelY = hingeY + Math.sin(labelRad) * (radius * 0.65);
          
          const isHovered = hoveredDirection === dir;
          
          return (
            <g
              key={dir}
              onMouseEnter={() => setHoveredDirection(dir)}
              onMouseLeave={() => setHoveredDirection(null)}
            >
              <path
                d={`M ${hingeX} ${hingeY} L ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${arcEndX} ${arcEndY} Z`}
                fill="#000000"
                opacity={isHovered ? '0.25' : '0.15'}
                style={{ cursor: 'pointer' }}
              />
              <path
                d={`M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${arcEndX} ${arcEndY}`}
                fill="none"
                stroke="#000000"
                strokeWidth={isHovered ? '5' : '4'}
                strokeLinecap="round"
                opacity={isHovered ? '0.8' : '0.6'}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={labelX}
                y={labelY}
                fontSize="14"
                fill="#000000"
                textAnchor="middle"
                dominantBaseline="middle"
                opacity={isHovered ? '0.9' : '0.6'}
                fontWeight={isHovered ? 'bold' : 'normal'}
                pointerEvents="none"
              >
                {label}
              </text>
            </g>
          );
        })}
        <circle
          cx={hingeX}
          cy={hingeY}
          r="4"
          fill="#000000"
          stroke="#ffffff"
          strokeWidth="1.5"
          opacity="0.9"
        />
      </g>
    );
  };

  // Render snap highlight and endpoint indicators
  const renderSnapHighlight = () => {
    const highlights = [];

    // Show snap highlight for current point
    if (snapHighlight) {
      highlights.push(
        <circle
          key="snap-highlight"
          cx={snapHighlight.x}
          cy={snapHighlight.y}
          r={6}
          fill="#27ae60"
          stroke="#ffffff"
          strokeWidth={2}
          opacity={0.9}
          pointerEvents="none"
        />
      );
    }

    // Show all wall endpoints as small circles
    walls.forEach(wall => {
      const isStartSelected = selectedWall?.id === wall.id;
      highlights.push(
        <circle
          key={`endpoint-start-${wall.id}`}
          cx={wall.startX}
          cy={wall.startY}
          r={4}
          fill={isStartSelected ? '#3498db' : '#2c3e50'}
          stroke="#ffffff"
          strokeWidth={1.5}
          opacity={0.8}
          pointerEvents="none"
        />
      );
      highlights.push(
        <circle
          key={`endpoint-end-${wall.id}`}
          cx={wall.endX}
          cy={wall.endY}
          r={4}
          fill={isStartSelected ? '#3498db' : '#2c3e50'}
          stroke="#ffffff"
          strokeWidth={1.5}
          opacity={0.8}
          pointerEvents="none"
        />
      );
    });

    // Show start point circle when drawing
    if (currentStart && (drawingMode === 'start-set' || drawingMode === 'preview')) {
      highlights.push(
        <circle
          key="current-start"
          cx={currentStart.x}
          cy={currentStart.y}
          r={5}
          fill="#3498db"
          stroke="#ffffff"
          strokeWidth={2}
          opacity={1}
          pointerEvents="none"
        />
      );
    }

    // Show end point preview circle
    if (currentEnd && drawingMode === 'preview') {
      const isSnapped = snapHighlight !== null;
      highlights.push(
        <circle
          key="current-end"
          cx={currentEnd.x}
          cy={currentEnd.y}
          r={isSnapped ? 6 : 5}
          fill={isSnapped ? '#27ae60' : '#3498db'}
          stroke="#ffffff"
          strokeWidth={2}
          opacity={0.7}
          pointerEvents="none"
        />
      );
    }

    return <g>{highlights}</g>;
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom with Cmd+Plus or Cmd+Equal
      if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        e.stopPropagation();
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const newZoom = Math.max(0.1, Math.min(5, zoom * 1.1));
        const zoomChange = newZoom / zoom;
        const newPanX = centerX - (centerX - pan.x) * zoomChange;
        const newPanY = centerY - (centerY - pan.y) * zoomChange;
        
        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
        return;
      }

      // Zoom out with Cmd+Minus
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        e.stopPropagation();
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const newZoom = Math.max(0.1, Math.min(5, zoom * 0.9));
        const zoomChange = newZoom / zoom;
        const newPanX = centerX - (centerX - pan.x) * zoomChange;
        const newPanY = centerY - (centerY - pan.y) * zoomChange;
        
        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
        return;
      }

      // Cancel drawing with Escape
      if (e.key === 'Escape' && (drawingMode === 'start-set' || drawingMode === 'preview')) {
        e.preventDefault();
        e.stopPropagation();
        setDrawingMode('idle');
        setCurrentStart(null);
        setCurrentEnd(null);
        setSnapHighlight(null);
        setAngleSnapInfo(null);
        return;
      }

      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Delete selected wall with Delete or Backspace key
      // Only handle if not typing in an input field and a wall is selected
      if (!isInputField && selectedWall && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        e.stopPropagation();
        handleDeleteWall(selectedWall.id);
        return;
      }

      // Undo with Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      // Only handle if not typing in an input field
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey && !isInputField) {
        e.preventDefault();
        e.stopPropagation();
        if (historyIndex > 0) {
          handleUndo();
        }
        return;
      }

      // Redo with Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux) or Ctrl+Y
      // Only handle if not typing in an input field
      if (
        !isInputField && (
          ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) ||
          ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y'))
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (historyIndex < history.length - 1) {
          handleRedo();
        }
        return;
      }
    };

    // Use capture phase to catch events before they bubble
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [drawingMode, historyIndex, history.length, handleUndo, handleRedo, zoom, pan, selectedWall, handleDeleteWall]);

  // Debug: Log dimensions
  console.log('WallMaker component rendering:', { canvasWidth, canvasHeight, width, height, config, wallsCount: walls.length });

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      background: 'transparent',
      minHeight: '600px'
    }}>
      {/* Canvas Container */}
      <div 
        ref={containerRef}
        style={{ 
          flex: 1, 
          position: 'relative', 
          overflow: 'hidden', 
          background: '#f5f5f5',
          minHeight: '500px',
          cursor: activeTool === 'pan' 
            ? (isPanning ? 'grabbing' : 'grab')
            : activeTool === 'door'
            ? 'crosshair'
            : (drawingMode === 'start-set' || drawingMode === 'preview') ? 'crosshair' : 'default'
        }}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ 
            display: 'block',
            background: '#ffffff',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {renderGrid()}
          
          {/* Transform group for pan and zoom */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Infinite grid background using pattern */}
            {config.showGrid && (
              <rect
                x="-10000"
                y="-10000"
                width="20000"
                height="20000"
                fill="url(#wall-maker-grid-pattern)"
              />
            )}
            {config.showGrid && (
              <rect
                x="-10000"
                y="-10000"
                width="20000"
                height="20000"
                fill="url(#wall-maker-major-grid-pattern)"
              />
            )}
            
            {/* Canvas bounds indicator (optional) */}
            <rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="transparent"
              stroke="#cccccc"
              strokeWidth="1"
              strokeDasharray="5,5"
              opacity="0.5"
            />
            
            {renderWalls()}
            {renderDoors()}
            {renderCurrentLine()}
            {renderDoorPreview()}
            {renderDoorDirectionOptions()}
            {renderSnapHighlight()}
          </g>
        </svg>
      </div>

      {/* Properties Panel */}
      {selectedWall && (
        <div style={{ padding: '12px', borderTop: '1px solid #e0e0e0', background: '#f9f9f9' }}>
          <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Wall Properties</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{ fontSize: '12px', width: '80px' }}>Length (m):</label>
              <input
                type="number"
                value={selectedWall.length ? pixelsToMeters(selectedWall.length).toFixed(2) : ''}
                onChange={(e) => {
                  const newLengthMeters = parseFloat(e.target.value);
                  if (!isNaN(newLengthMeters) && newLengthMeters > 0) {
                    const newLengthPixels = metersToPixels(newLengthMeters);
                    const ratio = newLengthPixels / (selectedWall.length || 1);
                    const dx = selectedWall.endX - selectedWall.startX;
                    const dy = selectedWall.endY - selectedWall.startY;
                    handleUpdateWall({
                      ...selectedWall,
                      endX: selectedWall.startX + dx * ratio,
                      endY: selectedWall.startY + dy * ratio,
                      length: newLengthPixels,
                    });
                  }
                }}
                style={{ flex: 1, padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{ fontSize: '12px', width: '80px' }}>Angle:</label>
              <input
                type="number"
                value={selectedWall.angle?.toFixed(0) || ''}
                onChange={(e) => {
                  const newAngle = parseFloat(e.target.value);
                  if (!isNaN(newAngle)) {
                    const length = selectedWall.length || calculateDistanceBetweenPoints({ x: selectedWall.startX, y: selectedWall.startY }, { x: selectedWall.endX, y: selectedWall.endY });
                    const angleRad = (newAngle * Math.PI) / 180;
                    handleUpdateWall({
                      ...selectedWall,
                      endX: selectedWall.startX + length * Math.cos(angleRad),
                      endY: selectedWall.startY + length * Math.sin(angleRad),
                      angle: newAngle,
                    });
                  }
                }}
                style={{ flex: 1, padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <label style={{ fontSize: '12px', width: '80px' }}>Thickness (m):</label>
              <input
                type="number"
                value={pixelsToMeters(selectedWall.thickness).toFixed(3)}
                onChange={(e) => {
                  const newThicknessMeters = parseFloat(e.target.value);
                  if (!isNaN(newThicknessMeters) && newThicknessMeters > 0) {
                    handleUpdateWall({ ...selectedWall, thickness: metersToPixels(newThicknessMeters) });
                  }
                }}
                style={{ flex: 1, padding: '4px 8px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '12px' }}
              />
            </div>
            <button
              onClick={() => handleDeleteWall(selectedWall.id)}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                background: '#e74c3c',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Delete Wall
            </button>
          </div>
        </div>
      )}

      {/* Door Direction Selection Panel */}
    </div>
  );
};

export default WallMaker;

