/**
 * Elements Layer
 *
 * Renders all layout elements on the canvas.
 */

import type { LayoutElement } from '../../types/layout-scale';
import { LayoutElementRenderer } from './elements/LayoutElementRenderer';

/**
 * Props for ElementsLayer
 */
export interface ElementsLayerProps {
  elements: LayoutElement[];
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onDoubleClickElement?: (id: string) => void;
}

/**
 * Elements Layer Component
 *
 * Renders all elements at their correct proportional positions.
 */
export function ElementsLayer({
  elements,
  selectedElementId,
  onSelectElement,
  onDoubleClickElement,
}: ElementsLayerProps): JSX.Element {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {elements.map((element) => (
        <div key={element.id} className="pointer-events-auto">
          <LayoutElementRenderer
            element={element}
            isSelected={element.id === selectedElementId}
            onSelect={onSelectElement}
            onDoubleClick={onDoubleClickElement}
          />
        </div>
      ))}
    </div>
  );
}

export default ElementsLayer;
