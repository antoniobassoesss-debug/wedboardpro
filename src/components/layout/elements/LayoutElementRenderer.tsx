/**
 * Layout Element Renderer
 *
 * Renders a single element at the correct proportional size and position
 * using the scale system. Supports dragging with grid snap.
 */

import type { LayoutElement, ElementRenderData, Point } from '../../../types/layout-scale';
import { useLayoutScale } from '../../../contexts/LayoutScaleContext';
import { getElementRenderData } from '../../../lib/layout/scale-utils';
import {
  RoundTableVisual,
  RectangularTableVisual,
  ChairVisual,
  DanceFloorVisual,
  StageVisual,
  GenericElementVisual,
  type ElementVisualProps,
} from './visuals';

/**
 * Props for LayoutElementRenderer
 */
export interface LayoutElementRendererProps {
  element: LayoutElement;
  isSelected?: boolean;
  isDragging?: boolean;
  dragPosition?: Point | null;
  onSelect?: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  onDragStart?: (e: React.MouseEvent) => void;
}

/**
 * Get the visual component for an element type
 */
function getElementVisual(
  type: string
): React.ComponentType<ElementVisualProps> {
  switch (type) {
    case 'table_round':
      return RoundTableVisual;
    case 'table_rectangular':
    case 'table_imperial':
      return RectangularTableVisual;
    case 'chair':
      return ChairVisual;
    case 'dance_floor':
      return DanceFloorVisual;
    case 'stage':
      return StageVisual;
    default:
      return GenericElementVisual;
  }
}

/**
 * Layout Element Renderer Component
 *
 * Converts element real-world dimensions to canvas pixels and renders
 * the appropriate visual component. Supports dragging with visual feedback.
 */
export function LayoutElementRenderer({
  element,
  isSelected = false,
  isDragging = false,
  dragPosition,
  onSelect,
  onDoubleClick,
  onDragStart,
}: LayoutElementRendererProps): JSX.Element | null {
  const { scale } = useLayoutScale();

  if (!scale) {
    return null;
  }

  // Use drag position if dragging, otherwise element position
  const renderElement: LayoutElement =
    isDragging && dragPosition
      ? { ...element, position: dragPosition }
      : element;

  // Calculate render data using scale
  const renderData: ElementRenderData = getElementRenderData(
    renderElement,
    scale.pixelsPerMeter,
    scale.offset
  );

  // Determine which visual component to render
  const ElementVisual = getElementVisual(element.type);

  return (
    <div
      className={`absolute cursor-move transition-shadow duration-150 ${
        isSelected ? 'z-10' : ''
      } ${isDragging ? 'opacity-80 shadow-lg z-50' : ''}`}
      style={{
        left: renderData.x,
        top: renderData.y,
        width: renderData.width,
        height: renderData.height,
        transform: renderData.rotation !== 0
          ? `rotate(${renderData.rotation}deg)`
          : undefined,
        transformOrigin: 'center center',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(element.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.(element.id);
      }}
      onMouseDown={(e) => {
        if (e.button === 0) {
          e.stopPropagation();
          onDragStart?.(e);
        }
      }}
    >
      <ElementVisual
        element={element}
        renderData={renderData}
        isSelected={isSelected}
      />
    </div>
  );
}

export default LayoutElementRenderer;
