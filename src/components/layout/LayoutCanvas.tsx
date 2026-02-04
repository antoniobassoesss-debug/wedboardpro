/**
 * Layout Canvas
 *
 * Main canvas component that assembles all layers:
 * - Grid for alignment
 * - Walls defining the space
 * - Elements (tables, chairs, etc.)
 */

import { useLayoutScale } from '../../contexts/LayoutScaleContext';
import { GridLayer } from './GridLayer';
import { WallsLayer, type WallData } from './WallsLayer';
import { ElementsLayer } from './ElementsLayer';
import { ScaleDebugInfo } from './ScaleDebugInfo';
import type { LayoutElement } from '../../types/layout-scale';

/**
 * Props for LayoutCanvas
 */
export interface LayoutCanvasProps {
  elements: LayoutElement[];
  walls?: WallData[];
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onDoubleClickElement?: (id: string) => void;
  showDebugInfo?: boolean;
  className?: string;
}

/**
 * Layout Canvas Component
 *
 * The main rendering surface for the layout maker.
 * Uses the scale system to render all elements proportionally.
 */
export function LayoutCanvas({
  elements,
  walls = [],
  selectedElementId,
  onSelectElement,
  onDoubleClickElement,
  showDebugInfo = true,
  className = '',
}: LayoutCanvasProps): JSX.Element {
  const { canvasRef, scale } = useLayoutScale();

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Deselect when clicking on empty canvas
    if (e.target === e.currentTarget) {
      onSelectElement?.(null);
    }
  };

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full bg-white overflow-hidden ${className}`}
      onClick={handleCanvasClick}
    >
      {scale ? (
        <>
          <GridLayer />
          <WallsLayer walls={walls} />
          <ElementsLayer
            elements={elements}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
            onDoubleClickElement={onDoubleClickElement}
          />
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <p className="text-lg">Draw walls to define the space</p>
            <p className="text-sm mt-1">
              or set space bounds to start placing elements
            </p>
          </div>
        </div>
      )}

      {showDebugInfo && <ScaleDebugInfo position="top-left" />}
    </div>
  );
}

export default LayoutCanvas;
