/**
 * Elements Layer Component
 *
 * Main component that renders all layout elements from the store.
 * - Gets elements from layoutStore
 * - Sorts by zIndex (elementOrder array)
 * - Renders appropriate component based on element type
 * - Passes selection/hover state to each element
 */

import React, { useMemo, useCallback } from 'react';
import type { Layout } from '../../types/layout';
import type { BaseElement, CanvasElement } from '../../types/elements';
import {
  isTableElement,
  isChairElement,
  isZoneElement,
  isServiceElement,
  isDecorationElement,
} from '../../types/elements';
import { useSelectionStore } from '../../stores';
import { SELECTION_COLOR, HOVER_COLOR } from '../../constants';
import { TableRender } from './TableElement';
import { ChairRender } from './ChairElement';
import { ZoneRender } from './ZoneElement';
import { FurnitureRender } from './FurnitureElement';
import type { TableElement, ChairElement, ZoneElement, ServiceElement, DecorationElement } from '../../types/elements';

interface ElementsLayerProps {
  layout: Layout;
  pixelsPerMeter: number;
  onElementClick?: (elementId: string, event: React.MouseEvent) => void;
  onElementDoubleClick?: (elementId: string, event: React.MouseEvent) => void;
  onElementHover?: (elementId: string | null) => void;
  onElementMouseDown?: (elementId: string, event: React.MouseEvent) => void;
}

export const ElementsLayer: React.FC<ElementsLayerProps> = ({
  layout,
  pixelsPerMeter,
  onElementClick,
  onElementDoubleClick,
  onElementHover,
  onElementMouseDown,
}) => {
  const selectionStore = useSelectionStore();
  const selectedIds = selectionStore.selectedIds;
  const hoveredId = selectionStore.hoveredId;

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  );

  const isHovered = useCallback(
    (id: string) => hoveredId === id,
    [hoveredId]
  );

  const handleClick = useCallback(
    (id: string, event: React.MouseEvent) => {
      event.stopPropagation();
      onElementClick?.(id, event);
    },
    [onElementClick]
  );

  const handleDoubleClick = useCallback(
    (id: string, event: React.MouseEvent) => {
      event.stopPropagation();
      onElementDoubleClick?.(id, event);
    },
    [onElementDoubleClick]
  );

  const handleMouseEnter = useCallback(
    (id: string) => {
      onElementHover?.(id);
    },
    [onElementHover]
  );

  const handleMouseLeave = useCallback(
    (id: string) => {
      onElementHover?.(null);
    },
    [onElementHover]
  );

  const handleMouseDown = useCallback(
    (id: string, event: React.MouseEvent) => {
      event.stopPropagation();
      onElementMouseDown?.(id, event);
    },
    [onElementMouseDown]
  );

  const { tables, chairs, zones, services, decorations } = useMemo(() => {
    const tables: TableElement[] = [];
    const chairs: ChairElement[] = [];
    const zones: ZoneElement[] = [];
    const services: ServiceElement[] = [];
    const decorations: DecorationElement[] = [];

    for (const id of layout.elementOrder) {
      const element = layout.elements[id];
      if (!element || !element.visible) continue;

      if (isTableElement(element)) {
        tables.push(element);
      } else if (isChairElement(element)) {
        chairs.push(element);
      } else if (isZoneElement(element)) {
        zones.push(element);
      } else if (isServiceElement(element)) {
        services.push(element);
      } else if (isDecorationElement(element)) {
        decorations.push(element);
      }
    }

    return { tables, chairs, zones, services, decorations };
  }, [layout.elements, layout.elementOrder]);

  const getChairsForTable = useCallback(
    (tableId: string): ChairElement[] => {
      return chairs.filter((chair) => chair.parentTableId === tableId);
    },
    [chairs]
  );

  const renderElement = (element: CanvasElement) => {
    const elementId = element.id;
    const selected = isSelected(elementId);
    const hovered = isHovered(elementId);

    const clickHandlers = {
      onClick: (e: React.MouseEvent) => handleClick(elementId, e),
      onDoubleClick: (e: React.MouseEvent) => handleDoubleClick(elementId, e),
      onMouseEnter: () => handleMouseEnter(elementId),
      onMouseLeave: () => handleMouseLeave(elementId),
      onMouseDown: (e: React.MouseEvent) => handleMouseDown(elementId, e),
    };

    if (isTableElement(element)) {
      const tableChairs = getChairsForTable(element.id);
      return (
        <TableRender
          key={element.id}
          element={element}
          pixelsPerMeter={pixelsPerMeter}
          chairs={tableChairs}
          isSelected={selected}
          isHovered={hovered}
          {...clickHandlers}
        />
      );
    }

    if (isChairElement(element)) {
      return (
        <ChairRender
          key={element.id}
          element={element}
          pixelsPerMeter={pixelsPerMeter}
          isSelected={selected}
          isHovered={hovered}
          {...clickHandlers}
        />
      );
    }

    if (isZoneElement(element)) {
      return (
        <ZoneRender
          key={element.id}
          element={element}
          pixelsPerMeter={pixelsPerMeter}
          isSelected={selected}
          isHovered={hovered}
          {...clickHandlers}
        />
      );
    }

    if (isServiceElement(element)) {
      return (
        <FurnitureRender
          key={element.id}
          element={element}
          pixelsPerMeter={pixelsPerMeter}
          isSelected={selected}
          isHovered={hovered}
          {...clickHandlers}
        />
      );
    }

    if (isDecorationElement(element)) {
      return (
        <DecorationRender
          key={element.id}
          element={element}
          pixelsPerMeter={pixelsPerMeter}
          isSelected={selected}
          isHovered={hovered}
          {...clickHandlers}
        />
      );
    }

    return null;
  };

  const allElements: CanvasElement[] = [
    ...tables,
    ...chairs,
    ...zones,
    ...services,
    ...decorations,
  ];

  return (
    <g id="elements-layer">
      {allElements.map(renderElement)}
    </g>
  );
};

interface DecorationRenderProps {
  element: DecorationElement;
  pixelsPerMeter: number;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
}

const DecorationRender: React.FC<DecorationRenderProps> = ({
  element,
  pixelsPerMeter,
  isSelected = false,
  isHovered = false,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
}) => {
  const x = element.x * pixelsPerMeter;
  const y = element.y * pixelsPerMeter;
  const width = element.width * pixelsPerMeter;
  const height = element.height * pixelsPerMeter;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const colors = element.color
    ? { fill: element.color, stroke: '#999999' }
    : { fill: '#CCCCCC', stroke: '#999999' };

  const renderOutline = () => {
    if (!isSelected && !isHovered) return null;
    const strokeColor = isSelected ? SELECTION_COLOR : HOVER_COLOR;
    const dashArray = isSelected ? '4,4' : '8,4';
    return (
      <rect
        x={x - 2}
        y={y - 2}
        width={width + 4}
        height={height + 4}
        rx={6}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray={dashArray}
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  return (
    <g
      transform={`rotate(${element.rotation}, ${centerX}, ${centerY})`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      style={{ cursor: 'pointer' }}
    >
      {renderOutline()}

      {element.type === 'arch' && element.customShape ? (
        <path
          d={element.customShape}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
        />
      ) : (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={element.type === 'flower-arrangement' ? 50 : 4}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={1}
        />
      )}

      {element.label && (
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={colors.stroke}
          fontSize={Math.min(width, height) * 0.3}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {element.label}
        </text>
      )}
    </g>
  );
};

export type { ElementsLayerProps };
