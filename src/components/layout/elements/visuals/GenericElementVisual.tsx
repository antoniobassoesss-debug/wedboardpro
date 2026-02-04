/**
 * Generic Element Visual Component
 *
 * Fallback renderer for unknown element types.
 */

import type { LayoutElement, ElementRenderData } from '../../../../types/layout-scale';

export interface ElementVisualProps {
  element: LayoutElement;
  renderData: ElementRenderData;
  isSelected?: boolean;
}

export function GenericElementVisual({
  element,
  renderData,
  isSelected,
}: ElementVisualProps): JSX.Element {
  return (
    <div
      className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-400 rounded-md flex items-center justify-center"
      style={{
        boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : undefined,
      }}
    >
      <div className="text-center px-1">
        <span
          className="text-gray-500 block"
          style={{
            fontSize: Math.max(8, Math.min(12, renderData.width / 10)),
          }}
        >
          {element.type}
        </span>
        {element.label && (
          <span
            className="text-gray-700 font-medium truncate block"
            style={{
              fontSize: Math.max(10, Math.min(14, renderData.width / 8)),
            }}
          >
            {element.label}
          </span>
        )}
      </div>
    </div>
  );
}

export default GenericElementVisual;
