/**
 * CanvasArea Component
 *
 * Main SVG canvas container for the layout editor.
 * Handles viewport rendering, mouse events, and layer organization.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useViewportStore, useUIStore, useLayoutStore, useSelectionStore } from '../../stores';
import { useCanvasStore } from '../../store/canvasStore';
import { useViewport } from '../../hooks/useViewport';
import { useAddElement } from '../../hooks/useAddElement';
import { useGuestAssignment } from '../../hooks/useGuestAssignment';
import { GridLayer } from './GridLayer';
import { BackgroundLayer } from './BackgroundLayer';
import { WallsLayer } from './WallsLayer';
import { ElementsLayer } from './ElementsLayer';
import { SelectionLayer } from './SelectionLayer';
import { GuidesLayer } from './GuidesLayer';
import { ScaleBar } from './ScaleBar';
import { RulerX, RulerY } from './Rulers';
import GuestSearchDropdown from '../GuestAssignment/GuestSearchDropdown';
import type { ElementType } from '../../types/elements';
import { isChairElement, isStringLightsElement, isBuntingElement } from '../../types/elements';
import { ELEMENT_DEFAULTS } from '../../constants';
import type { Point } from '../../types/elements';

export interface CanvasAreaProps {
  className?: string;
  eventId?: string;
  hiddenCategories?: string[];
  onCanvasClick?: (event: React.MouseEvent) => void;
  onElementClick?: (elementId: string, event: React.MouseEvent) => void;
  onElementDoubleClick?: (elementId: string, event: React.MouseEvent) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  className = '',
  eventId,
  hiddenCategories = [],
  onCanvasClick,
  onElementClick,
  onElementDoubleClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const viewportStore = useViewportStore();
  const uiStore = useUIStore();
  const layoutStore = useLayoutStore();
  const selectionStore = useSelectionStore();
  const { addElementAtPosition, addTableWithChairs } = useAddElement();
  const guestAssignment = useGuestAssignment(eventId);

  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);

  // Anchor element placement state (two-click placement)
  const [anchorPlacement, setAnchorPlacement] = useState<{
    firstAnchor: Point | null;
    livePoint: Point | null;
  }>({ firstAnchor: null, livePoint: null });

  // Anchor handle drag state
  const [anchorDrag, setAnchorDrag] = useState<{
    elementId: string;
    anchor: 'start' | 'end';
  } | null>(null);

  const [guestDropdownChairId, setGuestDropdownChairId] = useState<string | null>(null);
  const [guestDropdownPosition, setGuestDropdownPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoverTooltipPosition, setHoverTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const {
    viewport,
    pixelsPerMeter: defaultPixelsPerMeter,
    handleWheelZoom,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    worldToScreen,
    screenToWorld,
    zoomTo,
    zoomIn,
    zoomOut,
  } = useViewport();

  // When a satellite or custom background is active, its calibrated pixelsPerMeter overrides
  // the default so that all elements (tables, chairs, etc.) render at the correct real-world scale.
  const satelliteBackground = useCanvasStore((s) => s.satelliteBackground);
  const customBackground = useCanvasStore((s) => s.customBackground);
  const activeBackgroundPpm = satelliteBackground?.pixelsPerMeter ?? customBackground?.pixelsPerMeter ?? null;
  const pixelsPerMeter = activeBackgroundPpm ?? layoutStore.layout?.space?.pixelsPerMeter ?? defaultPixelsPerMeter;

  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragElementIds, setDragElementIds] = useState<string[]>([]);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const viewBox = React.useMemo(() => {
    const x = viewport.x * viewport.zoom;
    const y = viewport.y * viewport.zoom;
    const width = viewport.width / viewport.zoom;
    const height = viewport.height / viewport.zoom;
    return `${x} ${y} ${width} ${height}`;
  }, [viewport]);

  useEffect(() => {
    if (!containerRef.current) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        viewportStore.setSize(Math.round(width), Math.round(height));
      }
    });

    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [viewportStore]);

  const handleElementClick = useCallback(
    (elementId: string, event: React.MouseEvent) => {
      if (uiStore.isViewMode) {
        return;
      }

      console.log('[CanvasArea] Element clicked:', elementId);
      event.stopPropagation();

      if (event.shiftKey) {
        selectionStore.toggleSelection(elementId);
      } else {
        selectionStore.select(elementId);
        console.log('[CanvasArea] Selected IDs:', selectionStore.selectedIds);
      }

      // Check if clicked element is a chair - open guest assignment dropdown
      const element = layoutStore.getElementById(elementId);
      if (element && isChairElement(element)) {
        const svg = svgRef.current;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          // Calculate screen position of the chair
          const screenPos = worldToScreen({ x: element.x, y: element.y });
          const screenWidth = element.width * pixelsPerMeter * viewport.zoom;
          const screenHeight = element.height * pixelsPerMeter * viewport.zoom;

          setGuestDropdownChairId(elementId);
          setGuestDropdownPosition({
            x: rect.left + screenPos.x,
            y: rect.top + screenPos.y,
            width: screenWidth,
            height: screenHeight,
          });
        }
      }

      onElementClick?.(elementId, event);
    },
    [selectionStore, layoutStore, onElementClick, worldToScreen, pixelsPerMeter, viewport.zoom, uiStore.isViewMode]
  );

  const handleElementHover = useCallback(
    (elementId: string | null) => {
      selectionStore.setHovered(elementId);
      setHoveredElementId(elementId);
      
      if (elementId && uiStore.isViewMode) {
        const element = layoutStore.getElementById(elementId);
        if (element) {
          const svg = svgRef.current;
          if (svg) {
            const rect = svg.getBoundingClientRect();
            const screenPos = worldToScreen({ x: element.x, y: element.y });
            setHoverTooltipPosition({
              x: rect.left + screenPos.x,
              y: rect.top + screenPos.y - 40,
            });
          }
        }
      } else {
        setHoverTooltipPosition(null);
      }
    },
    [selectionStore, layoutStore, uiStore.isViewMode, worldToScreen]
  );

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      if (uiStore.isViewMode) {
        return;
      }

      selectionStore.deselectAll();
      // Close guest dropdown when clicking on canvas
      setGuestDropdownChairId(null);
      setGuestDropdownPosition(null);
      onCanvasClick?.(event);
    },
    [selectionStore, onCanvasClick, uiStore.isViewMode]
  );

  const handleCloseGuestDropdown = useCallback(() => {
    setGuestDropdownChairId(null);
    setGuestDropdownPosition(null);
  }, []);

  const handleAssignGuest = useCallback(
    (guestId: string) => {
      if (guestDropdownChairId) {
        // assignGuest takes (guestId, chairId)
        guestAssignment.assignGuest(guestId, guestDropdownChairId);
        handleCloseGuestDropdown();
      }
    },
    [guestDropdownChairId, guestAssignment, handleCloseGuestDropdown]
  );

  const handleElementRotate = useCallback(
    (elementId: string, newRotation: number) => {
      layoutStore.updateElement(elementId, { rotation: newRotation });
    },
    [layoutStore]
  );

  // Commit a two-click anchor element (string lights or bunting) to the canvas
  const commitAnchorElement = useCallback(
    (start: Point, end: Point) => {
      const tool = uiStore.activeTool;
      const endOffsetX = end.x - start.x;
      const endOffsetY = end.y - start.y;
      const spanX = Math.abs(endOffsetX);
      const spanY = Math.abs(endOffsetY);

      const baseData = {
        x: start.x,
        y: start.y,
        width: Math.max(spanX, 0.01),
        height: Math.max(spanY, 0.01),
        rotation: 0,
        zIndex: layoutStore.maxZIndex + 1,
        groupId: null,
        parentId: null,
        locked: false,
        visible: true,
        notes: '',
        color: null,
        endAnchorOffset: { x: endOffsetX, y: endOffsetY },
      };

      // addElement accepts Omit<BaseElement, 'id'|'createdAt'|'updatedAt'>.
      // Anchor elements extend BaseElement with extra fields; cast via unknown to avoid
      // TypeScript excess-property complaint while retaining runtime data.
      if (tool === 'string-lights') {
        const el = {
          ...baseData,
          type: 'string-lights' as ElementType,
          label: 'String Lights',
          bulbColor: 'warm-white',
          bulbSize: 'medium',
          spacing: 'normal',
          wireColor: '#3d2b1f',
        };
        layoutStore.addElement(el as unknown as Parameters<typeof layoutStore.addElement>[0]);
      } else if (tool === 'bunting') {
        const el = {
          ...baseData,
          type: 'bunting' as ElementType,
          label: 'Bunting',
          colorScheme: 'arraial-classic',
          customColors: ['#dc2626', '#facc15', '#16a34a', '#3b82f6'],
          flagSize: 'medium',
          flagShape: 'triangle',
          spacing: 'normal',
          stringColor: '#c8b9a2',
        };
        layoutStore.addElement(el as unknown as Parameters<typeof layoutStore.addElement>[0]);
      }
    },
    [uiStore.activeTool, layoutStore]
  );

  // Handle anchor handle mouse-down to start anchor drag
  const handleAnchorMouseDown = useCallback(
    (elementId: string, anchor: 'start' | 'end', event: React.MouseEvent) => {
      event.stopPropagation();
      selectionStore.select(elementId);
      setAnchorDrag({ elementId, anchor });
    },
    [selectionStore]
  );


  const startElementDrag = useCallback(
    (elementId: string, clientX: number, clientY: number) => {
      if (uiStore.isViewMode) {
        return;
      }

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      const worldPos = screenToWorld({ x: screenX, y: screenY });

      const element = layoutStore.getElementById(elementId);
      if (!element) return;

      const offsetX = worldPos.x - element.x;
      const offsetY = worldPos.y - element.y;

      dragOffsetRef.current = { x: offsetX, y: offsetY };
      setDragElementIds([elementId]);
      setIsDragging(true);
    },
    [layoutStore, screenToWorld, uiStore.isViewMode]
  );

  const handleElementMouseDown = useCallback(
    (elementId: string, event: React.MouseEvent) => {
      if (uiStore.isViewMode) {
        return;
      }

      // Don't start element drag while in anchor placement mode
      if (uiStore.activeTool === 'string-lights' || uiStore.activeTool === 'bunting') {
        return;
      }

      event.stopPropagation();

      if (event.shiftKey) {
        selectionStore.toggleSelection(elementId);
      } else {
        selectionStore.select(elementId);
      }

      if (selectionStore.isSelected(elementId)) {
        startElementDrag(elementId, event.clientX, event.clientY);
      }

      onElementClick?.(elementId, event);
    },
    [selectionStore, startElementDrag, onElementClick, uiStore.isViewMode]
  );

  const updateElementDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || !dragOffsetRef.current) return;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      const worldPos = screenToWorld({ x: screenX, y: screenY });

      const deltaX = worldPos.x - dragOffsetRef.current.x;
      const deltaY = worldPos.y - dragOffsetRef.current.y;

      layoutStore.moveElements(dragElementIds, deltaX, deltaY);
    },
    [isDragging, dragElementIds, layoutStore, screenToWorld]
  );

  const endElementDrag = useCallback(() => {
    setIsDragging(false);
    setDragElementIds([]);
    dragOffsetRef.current = null;
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Two-click anchor placement for string lights / bunting
      if (
        event.button === 0 &&
        (uiStore.activeTool === 'string-lights' || uiStore.activeTool === 'bunting')
      ) {
        const worldPos = screenToWorld({ x, y });
        if (!anchorPlacement.firstAnchor) {
          // First click — store start anchor
          setAnchorPlacement({ firstAnchor: worldPos, livePoint: worldPos });
        } else {
          // Second click — commit element
          commitAnchorElement(anchorPlacement.firstAnchor, worldPos);
          setAnchorPlacement({ firstAnchor: null, livePoint: null });
          uiStore.setActiveTool('select');
        }
        return;
      }

      if (uiStore.activeTool === 'hand' || event.button === 1 || event.buttons === 4) {
        setIsPanning(true);
        lastPanPointRef.current = { x, y };
        return;
      }

      if (event.button === 0) {
        handlePanStart(event);
      }

      handleCanvasClick(event);
    },
    [uiStore.activeTool, handlePanStart, handleCanvasClick, anchorPlacement, screenToWorld, commitAnchorElement]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;

      // Update live preview point during anchor placement (both before and after first click)
      if (
        (uiStore.activeTool === 'string-lights' || uiStore.activeTool === 'bunting') &&
        svg
      ) {
        const rect = svg.getBoundingClientRect();
        const worldPos = screenToWorld({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        setAnchorPlacement((prev) => ({ ...prev, livePoint: worldPos }));
      }

      // Anchor handle drag
      if (anchorDrag && svg) {
        const rect = svg.getBoundingClientRect();
        const worldPos = screenToWorld({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        const element = layoutStore.getElementById(anchorDrag.elementId);
        if (element && (isStringLightsElement(element) || isBuntingElement(element))) {
          if (anchorDrag.anchor === 'end') {
            const newOffset = {
              x: worldPos.x - element.x,
              y: worldPos.y - element.y,
            };
            layoutStore.updateElement(anchorDrag.elementId, {
              endAnchorOffset: newOffset,
            } as Parameters<typeof layoutStore.updateElement>[1]);
          } else {
            // Moving start anchor: keep end anchor at same absolute position
            const endAbsX = element.x + (element as typeof element & { endAnchorOffset: { x: number; y: number } }).endAnchorOffset.x;
            const endAbsY = element.y + (element as typeof element & { endAnchorOffset: { x: number; y: number } }).endAnchorOffset.y;
            layoutStore.updateElement(anchorDrag.elementId, {
              x: worldPos.x,
              y: worldPos.y,
              endAnchorOffset: {
                x: endAbsX - worldPos.x,
                y: endAbsY - worldPos.y,
              },
            } as Parameters<typeof layoutStore.updateElement>[1]);
          }
        }
        return;
      }

      if (isDragging) {
        updateElementDrag(event.clientX, event.clientY);
        return;
      }

      if (isPanning && lastPanPointRef.current) {
        const svg = svgRef.current;
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const deltaX = x - lastPanPointRef.current.x;
        const deltaY = y - lastPanPointRef.current.y;

        viewportStore.panBy(deltaX / viewport.zoom, deltaY / viewport.zoom);
        lastPanPointRef.current = { x, y };
        return;
      }

      handlePanMove(event);
    },
    [isDragging, isPanning, viewport, viewportStore, handlePanMove, updateElementDrag,
     uiStore.activeTool, anchorPlacement.firstAnchor, anchorDrag, screenToWorld, layoutStore]
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      // Clear anchor handle drag
      if (anchorDrag) {
        setAnchorDrag(null);
        return;
      }

      if (isDragging) {
        endElementDrag();
        return;
      }

      setIsPanning(false);
      lastPanPointRef.current = null;
      handlePanEnd();

      if (uiStore.dragState.isDragging && uiStore.dragState.dragElementType) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const screenX = event.clientX - rect.left;
          const screenY = event.clientY - rect.top;
          const worldPos = screenToWorld({ x: screenX, y: screenY });

          const elementType = uiStore.dragState.dragElementType;
          const defaults = ELEMENT_DEFAULTS[elementType as keyof typeof ELEMENT_DEFAULTS];

          if (elementType.startsWith('table-')) {
            addTableWithChairs({
              type: elementType as 'table-round' | 'table-rectangular' | 'table-oval' | 'table-square',
              width: defaults?.width || 1.5,
              height: defaults?.height || 1.5,
              capacity: defaults?.capacity || 8,
            }, worldPos);
          } else {
            addElementAtPosition(elementType, worldPos, {
              width: defaults?.width || 1,
              height: defaults?.height || 1,
              label: defaults?.label || '',
            });
          }

          uiStore.endDrag();
          setGhostPosition(null);
        }
      }
    },
    [isDragging, handlePanEnd, endElementDrag, uiStore, screenToWorld, addElementAtPosition, addTableWithChairs]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<SVGSVGElement>) => {
      if (uiStore.dragState.isDragging) {
        event.preventDefault();

        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          const screenX = event.clientX - rect.left;
          const screenY = event.clientY - rect.top;
          const worldPos = screenToWorld({ x: screenX, y: screenY });

          setGhostPosition(worldPos);
          uiStore.updateDragPosition({ x: screenX, y: screenY });
        }
      }
    },
    [uiStore, screenToWorld]
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<SVGSVGElement>) => {
      if (uiStore.dragState.isDragging) {
        const relatedTarget = event.relatedTarget as HTMLElement;
        if (!relatedTarget || !svgRef.current?.contains(relatedTarget)) {
          setGhostPosition(null);
        }
      }
    },
    [uiStore]
  );

  const handleDragEnd = useCallback(() => {
    if (uiStore.dragState.isDragging) {
      uiStore.endDrag();
      setGhostPosition(null);
    }
  }, [uiStore]);

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      if (uiStore.dragState.isDragging) {
        uiStore.endDrag();
        setGhostPosition(null);
      }
    };

    window.addEventListener('dragend', handleGlobalDragEnd);
    return () => window.removeEventListener('dragend', handleGlobalDragEnd);
  }, [uiStore]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const pivot: { x: number; y: number } = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1;
      viewportStore.zoomBy(zoomDelta, pivot);
    },
    [viewportStore]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (uiStore.isViewMode) {
        return;
      }

      const isZoomKey = event.key === '=' || event.key === '+' || event.key === '-';
      const isZoomIn = (event.key === '=' || event.key === '+') && !event.shiftKey;
      const isZoomOut = event.key === '-';

      if (isZoomKey && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (isZoomIn) {
          zoomIn();
        } else if (isZoomOut) {
          zoomOut();
        }
      }

      if (event.key === '0' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        viewportStore.resetView();
      }

      if (event.key === ' ' && !event.repeat) {
        event.preventDefault();
        uiStore.setActiveTool('hand');
      }

      if (event.key === 'Escape') {
        // Cancel anchor placement if active
        if (uiStore.activeTool === 'string-lights' || uiStore.activeTool === 'bunting') {
          setAnchorPlacement({ firstAnchor: null, livePoint: null });
        }
        uiStore.setActiveTool('select');
      }
    },
    [zoomIn, zoomOut, viewportStore, uiStore]
  );

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent) => {
      if (uiStore.isViewMode) {
        return;
      }

      if (event.key === ' ' && uiStore.activeTool === 'hand') {
        event.preventDefault();
        uiStore.setActiveTool('select');
      }
    },
    [uiStore]
  );

  useEffect(() => {
    const handleGlobalWheel = (event: WheelEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('.canvas-area')) {
        return;
      }
    };

    document.addEventListener('wheel', handleGlobalWheel, { passive: true });
    return () => document.removeEventListener('wheel', handleGlobalWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden canvas-area ${className}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
        {uiStore.showRulers && (
        <>
          <RulerX
            viewport={viewport}
            pixelsPerMeter={pixelsPerMeter}
          />
          <RulerY
            viewport={viewport}
            pixelsPerMeter={pixelsPerMeter}
          />
        </>
      )}

      <svg
        ref={svgRef}
        viewBox={viewBox}
        data-layout-canvas="true"
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          cursor:
            uiStore.activeTool === 'hand'
              ? 'grab'
              : isPanning
              ? 'grabbing'
              : 'crosshair',
        }}
      >
        <defs>
          <pattern
            id="grid-pattern"
            width={uiStore.showGrid ? 0.5 * pixelsPerMeter * viewport.zoom : 0}
            height={uiStore.showGrid ? 0.5 * pixelsPerMeter * viewport.zoom : 0}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${0.5 * pixelsPerMeter * viewport.zoom} 0 L 0 0 0 ${0.5 * pixelsPerMeter * viewport.zoom}`}
              fill="none"
              stroke="var(--grid-color, #E5E5E5)"
              strokeWidth="0.5"
            />
          </pattern>
          <pattern
            id="grid-pattern-major"
            width={uiStore.showGrid ? 5 * pixelsPerMeter * viewport.zoom : 0}
            height={uiStore.showGrid ? 5 * pixelsPerMeter * viewport.zoom : 0}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={5 * pixelsPerMeter * viewport.zoom}
              height={5 * pixelsPerMeter * viewport.zoom}
              fill="url(#grid-pattern)"
            />
            <path
              d={`M ${5 * pixelsPerMeter * viewport.zoom} 0 L 0 0 0 ${5 * pixelsPerMeter * viewport.zoom}`}
              fill="none"
              stroke="var(--grid-major-color, #CCCCCC)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <g id="background-layer">
          <BackgroundLayer
            floorPlan={layoutStore.layout?.floorPlan ?? null}
            pixelsPerMeter={pixelsPerMeter}
          />
        </g>

        <g id="grid-layer">
          {uiStore.showGrid && (
            <GridLayer
              viewport={viewport}
              pixelsPerMeter={pixelsPerMeter}
              gridSize={0.5}
            />
          )}
        </g>

        <g id="walls-layer">
          {layoutStore.layout?.space.walls && (
            <WallsLayer
              walls={layoutStore.layout.space.walls}
              pixelsPerMeter={pixelsPerMeter}
            />
          )}
        </g>

        <g id="elements-layer">
          {layoutStore.layout && (
            <ElementsLayer
              layout={layoutStore.layout}
              pixelsPerMeter={pixelsPerMeter}
              hiddenCategories={hiddenCategories}
              onElementClick={handleElementClick}
              onElementHover={handleElementHover}
              onElementMouseDown={handleElementMouseDown}
              onElementRotate={handleElementRotate}
              onAnchorMouseDown={handleAnchorMouseDown}
              {...(onElementDoubleClick && { onElementDoubleClick })}
            />
          )}
        </g>

        {/* Anchor element placement preview */}
        {(uiStore.activeTool === 'string-lights' || uiStore.activeTool === 'bunting') && (
          <g id="placement-preview-layer" style={{ pointerEvents: 'none' }}>
            {/* First anchor indicator */}
            {anchorPlacement.firstAnchor && (
              <circle
                cx={anchorPlacement.firstAnchor.x * pixelsPerMeter}
                cy={anchorPlacement.firstAnchor.y * pixelsPerMeter}
                r={7}
                fill="#3b82f6"
                opacity={0.9}
              />
            )}
            {/* Live wire preview while placing */}
            {anchorPlacement.firstAnchor && anchorPlacement.livePoint && (() => {
              const sx = anchorPlacement.firstAnchor.x * pixelsPerMeter;
              const sy = anchorPlacement.firstAnchor.y * pixelsPerMeter;
              const ex = anchorPlacement.livePoint.x * pixelsPerMeter;
              const ey = anchorPlacement.livePoint.y * pixelsPerMeter;
              const spanPx = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
              const sagPx = Math.max(2, 0.05 * spanPx);
              const cqx = (sx + ex) / 2;
              const cqy = (sy + ey) / 2 + sagPx;
              const wirePath = `M ${sx} ${sy} Q ${cqx} ${cqy} ${ex} ${ey}`;
              return (
                <g opacity={0.65}>
                  <path d={wirePath} stroke="#3b82f6" strokeWidth={1.5} fill="none" strokeDasharray="6,4" />
                  <circle cx={ex} cy={ey} r={7} fill="white" stroke="#3b82f6" strokeWidth={2} />
                  <circle cx={ex} cy={ey} r={3} fill="#3b82f6" />
                </g>
              );
            })()}
            {/* Crosshair cursor indicator (no first anchor yet) */}
            {!anchorPlacement.firstAnchor && anchorPlacement.livePoint && (
              <circle
                cx={anchorPlacement.livePoint.x * pixelsPerMeter}
                cy={anchorPlacement.livePoint.y * pixelsPerMeter}
                r={6}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                opacity={0.7}
              />
            )}
          </g>
        )}

        <g id="ui-layer">
          <SelectionLayer
            selectedIds={new Set(selectionStore.selectedIds)}
            hoveredId={selectionStore.hoveredId}
            selectionBox={null}
          />
          <GuidesLayer />

          {ghostPosition && uiStore.dragState.dragElementType && (
            <g id="ghost-layer">
              <rect
                x={ghostPosition.x * pixelsPerMeter - 2}
                y={ghostPosition.y * pixelsPerMeter - 2}
                width={(ELEMENT_DEFAULTS[uiStore.dragState.dragElementType as keyof typeof ELEMENT_DEFAULTS]?.width || 1) * pixelsPerMeter + 4}
                height={(ELEMENT_DEFAULTS[uiStore.dragState.dragElementType as keyof typeof ELEMENT_DEFAULTS]?.height || 1) * pixelsPerMeter + 4}
                fill="rgba(0, 102, 255, 0.1)"
                stroke="#0066FF"
                strokeWidth={2}
                strokeDasharray="4,4"
                rx={4}
              />
            </g>
          )}
        </g>
      </svg>

      {uiStore.showGrid && <ScaleBar viewport={viewport} pixelsPerMeter={pixelsPerMeter} />}

      <div
        className="absolute bottom-4 right-4 flex items-center gap-2 bg-white rounded-lg shadow-md px-3 py-2 text-sm"
        style={{
          cursor: uiStore.activeTool === 'hand' ? 'grab' : 'default',
        }}
      >
        <button
          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          onClick={() => zoomOut()}
          disabled={viewport.zoom <= 0.1}
          title="Zoom Out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <span className="min-w-[60px] text-center font-mono">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          onClick={() => zoomIn()}
          disabled={viewport.zoom >= 5}
          title="Zoom In"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          className="p-1 hover:bg-gray-100 rounded"
          onClick={() => viewportStore.resetView()}
          title="Reset View (Cmd+0)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {isPanning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1 rounded-full shadow-lg">
          Panning
        </div>
      )}

      {/* Guest Assignment Dropdown */}
      {guestDropdownChairId && guestDropdownPosition && (
        <GuestSearchDropdown
          chairId={guestDropdownChairId}
          chairPosition={guestDropdownPosition}
          unassignedGuests={guestAssignment.unassignedGuests}
          assignedGuests={guestAssignment.assignedGuests}
          currentlyAssignedGuest={guestAssignment.getGuestForChair(guestDropdownChairId)}
          isLoading={guestAssignment.isLoading}
          onAssign={handleAssignGuest}
          onUnassign={() => guestAssignment.unassignGuest(guestDropdownChairId)}
          onClose={handleCloseGuestDropdown}
        />
      )}

      {/* View Mode Hover Tooltip */}
      {uiStore.isViewMode && hoveredElementId && hoverTooltipPosition && (() => {
        const element = layoutStore.getElementById(hoveredElementId);
        if (!element) return null;
        
        let tooltipContent: React.ReactNode = null;
        
        if (isChairElement(element) && element.assignedGuestName) {
          const dietaryInfo = element.dietaryType && element.dietaryType !== 'regular' 
            ? ` • ${element.dietaryType}`
            : '';
          const allergyInfo = element.allergyFlags?.length 
            ? ` • ${element.allergyFlags.join(', ')}`
            : '';
          
          tooltipContent = (
            <div className="flex flex-col">
              <span className="font-medium text-gray-900">{element.assignedGuestName}</span>
              {(dietaryInfo || allergyInfo) && (
                <span className="text-xs text-gray-500">
                  {element.dietaryType && element.dietaryType !== 'regular' ? element.dietaryType : ''}
                  {element.allergyFlags?.length ? ` • ${element.allergyFlags.join(', ')}` : ''}
                </span>
              )}
            </div>
          );
        } else if (element.type.startsWith('table-')) {
          const tableNumber = (element as any).tableNumber || element.label || 'Table';
          const capacity = (element as any).capacity || 0;
          tooltipContent = (
            <div className="flex flex-col">
              <span className="font-medium text-gray-900">{tableNumber}</span>
              {capacity > 0 && (
                <span className="text-xs text-gray-500">{capacity} seats</span>
              )}
            </div>
          );
        } else {
          tooltipContent = (
            <span className="font-medium text-gray-900">{element.label || element.type}</span>
          );
        }
        
        return (
          <div
            className="fixed z-50 px-3 py-2 bg-white rounded-lg shadow-xl border border-gray-200 pointer-events-none"
            style={{
              left: hoverTooltipPosition.x,
              top: hoverTooltipPosition.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {tooltipContent}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45" />
          </div>
        );
      })()}
    </div>
  );
};

export default CanvasArea;
