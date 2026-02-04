/**
 * Interactive Layout Canvas
 *
 * Complete interactive canvas with dragging, zooming, and grid snap.
 * Wraps all layers and provides interaction handling.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutScaleProvider,
  useLayoutScale,
} from '../../contexts/LayoutScaleContext';
import { useElementDrag } from '../../hooks/useElementDrag';
import { useWheelZoom } from '../../hooks/useWheelZoom';
import { useLayoutKeyboard } from '../../hooks/useLayoutKeyboard';
import { GridLayer } from './GridLayer';
import { WallsLayer, type WallData } from './WallsLayer';
import { LayoutElementRenderer } from './elements/LayoutElementRenderer';
import { ZoomControls } from './ZoomControls';
import { GridSettingsPanel } from './GridSettingsPanel';
import { PositionTooltip } from './PositionTooltip';
import { ScaleDebugInfo } from './ScaleDebugInfo';
import type { LayoutElement, Point, SpaceBounds } from '../../types/layout-scale';

/**
 * Props for InteractiveLayoutCanvas
 */
export interface InteractiveLayoutCanvasProps {
  elements: LayoutElement[];
  walls?: WallData[];
  spaceBounds?: SpaceBounds | null;
  selectedElementId?: string | null;
  onElementsChange?: (elements: LayoutElement[]) => void;
  onSelectElement?: (id: string | null) => void;
  onDoubleClickElement?: (id: string) => void;
  onDeleteElement?: (id: string) => void;
  showDebugInfo?: boolean;
  showGridSettings?: boolean;
  showZoomControls?: boolean;
  className?: string;
}

/**
 * Canvas content component (uses context)
 */
function CanvasContent({
  elements,
  walls = [],
  spaceBounds,
  selectedElementId: externalSelectedId,
  onElementsChange,
  onSelectElement: externalOnSelect,
  onDoubleClickElement,
  onDeleteElement,
  showDebugInfo = false,
  showGridSettings = true,
  showZoomControls = true,
  className = '',
}: InteractiveLayoutCanvasProps): JSX.Element {
  const { canvasRef, scale, setSpaceBounds } = useLayoutScale();
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null
  );

  // Use external or internal selection state
  const selectedId =
    externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;
  const setSelectedId = externalOnSelect ?? setInternalSelectedId;

  // Set space bounds from props
  useEffect(() => {
    if (spaceBounds !== undefined) {
      setSpaceBounds(spaceBounds);
    }
  }, [spaceBounds, setSpaceBounds]);

  // Wheel zoom
  useWheelZoom(canvasRef);

  // Element dragging
  const { dragState, startDrag, updateDrag, endDrag, cancelDrag } =
    useElementDrag({
      onDragEnd: (elementId, finalPosition) => {
        if (!onElementsChange) return;

        // Update element position
        const updated = elements.map((el) =>
          el.id === elementId ? { ...el, position: finalPosition } : el
        );
        onElementsChange(updated);
      },
    });

  // Global mouse handlers for drag
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => updateDrag(e);
    const handleMouseUp = () => endDrag();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dragState.isDragging, updateDrag, endDrag, cancelDrag]);

  // Keyboard shortcuts
  useLayoutKeyboard({
    onDelete: () => {
      if (selectedId) {
        if (onDeleteElement) {
          onDeleteElement(selectedId);
        } else if (onElementsChange) {
          onElementsChange(elements.filter((el) => el.id !== selectedId));
        }
        setSelectedId(null);
      }
    },
    onEscape: () => {
      setSelectedId(null);
      cancelDrag();
    },
  });

  // Handle drag start
  const handleDragStart = useCallback(
    (elementId: string, e: React.MouseEvent) => {
      const element = elements.find((el) => el.id === elementId);
      const canvasRect = canvasRef.current?.getBoundingClientRect();

      if (element && canvasRect) {
        setSelectedId(elementId);
        startDrag(elementId, element, e, canvasRect);
      }
    },
    [elements, canvasRef, startDrag, setSelectedId]
  );

  // Handle canvas click (deselect)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  };

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full bg-gray-50 overflow-hidden select-none ${className}`}
      onClick={handleCanvasClick}
    >
      {scale ? (
        <>
          <GridLayer />
          <WallsLayer walls={walls} />

          {/* Elements with drag support */}
          <div className="absolute inset-0 pointer-events-none">
            {elements.map((element) => (
              <div key={element.id} className="pointer-events-auto">
                <LayoutElementRenderer
                  element={element}
                  isSelected={element.id === selectedId}
                  isDragging={
                    dragState.isDragging && dragState.elementId === element.id
                  }
                  dragPosition={
                    dragState.elementId === element.id
                      ? dragState.currentPosition
                      : null
                  }
                  onSelect={setSelectedId}
                  onDoubleClick={onDoubleClickElement}
                  onDragStart={(e) => handleDragStart(element.id, e)}
                />
              </div>
            ))}
          </div>

          {/* Position tooltip during drag */}
          {dragState.isDragging && dragState.currentPosition && (
            <PositionTooltip
              position={dragState.currentPosition}
              visible={true}
            />
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <p className="text-lg">Define space bounds to start</p>
            <p className="text-sm mt-1">
              Set spaceBounds prop or draw walls to define the space
            </p>
          </div>
        </div>
      )}

      {showZoomControls && <ZoomControls />}
      {showGridSettings && <GridSettingsPanel collapsed />}
      {showDebugInfo && <ScaleDebugInfo position="top-left" />}
    </div>
  );
}

/**
 * Interactive Layout Canvas Component
 *
 * Provides a complete interactive canvas with:
 * - Element rendering with correct proportions
 * - Dragging with grid snap
 * - Wheel zoom (Ctrl + scroll)
 * - Keyboard shortcuts
 * - Grid visibility controls
 */
export function InteractiveLayoutCanvas(
  props: InteractiveLayoutCanvasProps
): JSX.Element {
  return (
    <LayoutScaleProvider>
      <CanvasContent {...props} />
    </LayoutScaleProvider>
  );
}

export default InteractiveLayoutCanvas;
