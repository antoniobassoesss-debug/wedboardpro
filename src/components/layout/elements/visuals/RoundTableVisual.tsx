/**
 * Round Table Visual Component
 *
 * Renders a round table element with proportional sizing.
 */

import type { LayoutElement, ElementRenderData } from '../../../../types/layout-scale';

export interface ElementVisualProps {
  element: LayoutElement;
  renderData: ElementRenderData;
  isSelected?: boolean;
}

export function RoundTableVisual({
  element,
  renderData,
  isSelected,
}: ElementVisualProps): JSX.Element {
  return (
    <div
      className="w-full h-full rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center shadow-sm"
      style={{
        boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : undefined,
      }}
    >
      {element.label && (
        <span
          className="text-amber-800 truncate px-1 text-center font-medium"
          style={{
            fontSize: Math.max(10, Math.min(14, renderData.width / 8)),
          }}
        >
          {element.label}
        </span>
      )}
    </div>
  );
}

export default RoundTableVisual;
