/**
 * Dance Floor Visual Component
 *
 * Renders a dance floor with grid pattern.
 */

import { useMemo } from 'react';
import type { LayoutElement, ElementRenderData, ConfigurableDimensions } from '../../../../types/layout-scale';

export interface ElementVisualProps {
  element: LayoutElement;
  renderData: ElementRenderData;
  isSelected?: boolean;
}

export function DanceFloorVisual({
  element,
  renderData,
  isSelected,
}: ElementVisualProps): JSX.Element {
  // Calculate grid cells for visual effect
  const gridCells = useMemo(() => {
    if (element.dimensions.type !== 'configurable') {
      return { cols: 4, rows: 4 };
    }
    const dims = element.dimensions as ConfigurableDimensions;
    return {
      cols: dims.unitsWide,
      rows: dims.unitsDeep,
    };
  }, [element.dimensions]);

  return (
    <div
      className="w-full h-full bg-purple-900 rounded-md overflow-hidden"
      style={{
        boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : undefined,
      }}
    >
      {/* Grid pattern */}
      <div
        className="w-full h-full grid"
        style={{
          gridTemplateColumns: `repeat(${gridCells.cols}, 1fr)`,
          gridTemplateRows: `repeat(${gridCells.rows}, 1fr)`,
        }}
      >
        {Array.from({ length: gridCells.cols * gridCells.rows }).map((_, i) => (
          <div
            key={i}
            className="border border-purple-700"
            style={{
              backgroundColor: i % 2 === (Math.floor(i / gridCells.cols) % 2)
                ? 'rgb(88, 28, 135)' // purple-900
                : 'rgb(107, 33, 168)', // purple-800
            }}
          />
        ))}
      </div>

      {/* Label overlay */}
      {element.label && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-white font-bold text-center bg-black/30 px-2 py-1 rounded"
            style={{
              fontSize: Math.max(10, Math.min(16, renderData.width / 10)),
            }}
          >
            {element.label}
          </span>
        </div>
      )}
    </div>
  );
}

export default DanceFloorVisual;
