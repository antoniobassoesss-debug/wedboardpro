/**
 * Stage Visual Component
 *
 * Renders a stage element with depth effect.
 */

import type { LayoutElement, ElementRenderData } from '../../../../types/layout-scale';

export interface ElementVisualProps {
  element: LayoutElement;
  renderData: ElementRenderData;
  isSelected?: boolean;
}

export function StageVisual({
  element,
  renderData,
  isSelected,
}: ElementVisualProps): JSX.Element {
  return (
    <div
      className="w-full h-full bg-gray-800 rounded-sm flex items-center justify-center relative overflow-hidden"
      style={{
        boxShadow: isSelected
          ? '0 0 0 3px rgba(59, 130, 246, 0.5)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Stage floor highlight */}
      <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-gray-600 to-transparent opacity-50" />

      {/* Stage edge */}
      <div className="absolute inset-x-0 bottom-0 h-2 bg-gray-900" />

      {/* Label */}
      {element.label && (
        <span
          className="text-white font-semibold text-center z-10"
          style={{
            fontSize: Math.max(12, Math.min(18, renderData.width / 8)),
          }}
        >
          {element.label}
        </span>
      )}
    </div>
  );
}

export default StageVisual;
