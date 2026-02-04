/**
 * Rectangular Table Visual Component
 *
 * Renders rectangular and imperial tables with proportional sizing.
 */

import type { LayoutElement, ElementRenderData } from '../../../../types/layout-scale';

export interface ElementVisualProps {
  element: LayoutElement;
  renderData: ElementRenderData;
  isSelected?: boolean;
}

export function RectangularTableVisual({
  element,
  renderData,
  isSelected,
}: ElementVisualProps): JSX.Element {
  const isImperial = element.type === 'table_imperial';

  return (
    <div
      className={`w-full h-full rounded-md flex items-center justify-center shadow-sm ${
        isImperial ? 'bg-orange-100 border-2 border-orange-300' : 'bg-amber-100 border-2 border-amber-300'
      }`}
      style={{
        boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : undefined,
      }}
    >
      {element.label && (
        <span
          className={`truncate px-1 text-center font-medium ${
            isImperial ? 'text-orange-800' : 'text-amber-800'
          }`}
          style={{
            fontSize: Math.max(10, Math.min(14, Math.min(renderData.width, renderData.height) / 4)),
          }}
        >
          {element.label}
        </span>
      )}
    </div>
  );
}

export default RectangularTableVisual;
