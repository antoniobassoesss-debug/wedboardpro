/**
 * Chair Visual Component
 *
 * Renders a chair element with proportional sizing.
 */

import type { LayoutElement, ElementRenderData } from '../../../../types/layout-scale';

export interface ElementVisualProps {
  element: LayoutElement;
  renderData: ElementRenderData;
  isSelected?: boolean;
}

export function ChairVisual({
  element,
  renderData,
  isSelected,
}: ElementVisualProps): JSX.Element {
  return (
    <div
      className="w-full h-full rounded-sm bg-gray-200 border border-gray-400 flex items-center justify-center"
      style={{
        boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : undefined,
      }}
    >
      {/* Chair back indicator */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-400 rounded-t-sm"
        style={{
          width: '60%',
          height: '15%',
        }}
      />
    </div>
  );
}

export default ChairVisual;
