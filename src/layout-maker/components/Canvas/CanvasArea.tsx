/**
 * CanvasArea Component
 *
 * Main SVG canvas container for the layout editor.
 * Handles viewport rendering, mouse events, and layer organization.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useViewportStore, useUIStore, useLayoutStore, useSelectionStore } from '../../stores';
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
import { isChairElement } from '../../types/elements';
import { ELEMENT_DEFAULTS } from '../../constants';

export interface CanvasAreaProps {
  className?: string;
  eventId?: string;
  onCanvasClick?: (event: React.MouseEvent) => void;
  onElementClick?: (elementId: string, event: React.MouseEvent) => void;
  onElementDoubleClick?: (elementId: string, event: React.MouseEvent) => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  className = '',
  eventId,
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
  const [guestDropdownChairId, setGuestDropdownChairId] = useState<string | null>(null);
  const [guestDropdownPosition, setGuestDropdownPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const {
    viewport,
    pixelsPerMeter,
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
    [selectionStore, layoutStore, onElementClick, worldToScreen, pixelsPerMeter, viewport.zoom]
  );

  const handleElementHover = useCallback(
    (elementId: string | null) => {
      selectionStore.setHovered(elementId);
    },
    [selectionStore]
  );

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      selectionStore.deselectAll();
      // Close guest dropdown when clicking on canvas
      setGuestDropdownChairId(null);
      setGuestDropdownPosition(null);
      onCanvasClick?.(event);
    },
    [selectionStore, onCanvasClick]
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


  const startElementDrag = useCallback(
    (elementId: string, clientX: number, clientY: number) => {
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
    [layoutStore, screenToWorld]
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

  const handleElementMouseDown = useCallback(
    (elementId: string, event: React.MouseEvent) => {
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
    [selectionStore, startElementDrag, onElementClick]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

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
    [uiStore.activeTool, handlePanStart, handleCanvasClick]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
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
    [isDragging, isPanning, viewport, viewportStore, handlePanMove, updateElementDrag]
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
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
        uiStore.setActiveTool('select');
      }
    },
    [zoomIn, zoomOut, viewportStore, uiStore]
  );

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent) => {
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
            width={uiStore.showGrid ? 2.5 * pixelsPerMeter * viewport.zoom : 0}
            height={uiStore.showGrid ? 2.5 * pixelsPerMeter * viewport.zoom : 0}
            patternUnits="userSpaceOnUse"
          >
            <rect
              width={2.5 * pixelsPerMeter * viewport.zoom}
              height={2.5 * pixelsPerMeter * viewport.zoom}
              fill="url(#grid-pattern)"
            />
            <path
              d={`M ${2.5 * pixelsPerMeter * viewport.zoom} 0 L 0 0 0 ${2.5 * pixelsPerMeter * viewport.zoom}`}
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
              onElementClick={handleElementClick}
              onElementHover={handleElementHover}
              onElementMouseDown={handleElementMouseDown}
              onElementRotate={handleElementRotate}
              {...(onElementDoubleClick && { onElementDoubleClick })}
            />
          )}
        </g>

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
    </div>
  );
};

export default CanvasArea;
