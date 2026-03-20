/**
 * Elements Layer Component
 *
 * Renders all layout elements on the canvas.
 */

import React, { useCallback } from 'react';
import type { Layout } from '../../types/layout';
import { TableElement } from './TableElement';
import { ChairElementComponent } from './ChairElement';
import { ZoneElementComponent } from './ZoneElement';
import { ServiceElementComponent } from './ServiceElement';
import { DecorationElementComponent } from './DecorationElement';
import { StringLightsElementComponent } from './StringLightsElement';
import { BuntingElementComponent } from './BuntingElement';
import type { TableElement as TableElementType, ChairElement as ChairElementType } from '../../../types/layout-elements';
import {
  isTableElement, isChairElement, isZoneElement, isServiceElement, isDecorationElement,
  isStringLightsElement, isBuntingElement,
} from '../../types/elements';
import { RotateButton } from '../Elements/RotateButton';
import { useSelectionStore, useUIStore } from '../../stores';

interface ElementsLayerProps {
  layout: Layout;
  pixelsPerMeter?: number;
  hiddenCategories?: string[];
  onElementClick?: (elementId: string, event: React.MouseEvent) => void;
  onElementDoubleClick?: (elementId: string, event: React.MouseEvent) => void;
  onElementHover?: (elementId: string | null) => void;
  onElementMouseDown?: (elementId: string, event: React.MouseEvent) => void;
  onElementRotate?: (elementId: string, newRotation: number) => void;
  onAnchorMouseDown?: (elementId: string, anchor: 'start' | 'end', event: React.MouseEvent) => void;
}

export const ElementsLayer: React.FC<ElementsLayerProps> = ({
  layout,
  pixelsPerMeter = 100,
  hiddenCategories = [],
  onElementClick,
  onElementDoubleClick,
  onElementHover,
  onElementMouseDown,
  onElementRotate,
  onAnchorMouseDown,
}) => {
  const selectionStore = useSelectionStore();
  const uiStore = useUIStore();
  const selectedIds = selectionStore.selectedIds;

  const handleRotate = useCallback((elementId: string, newRotation: number) => {
    console.log('[ElementsLayer] Rotating element:', elementId, 'to:', newRotation);
    onElementRotate?.(elementId, newRotation);
  }, [onElementRotate]);

  const getElementCategory = (element: (typeof layout.elements)[string]): string | null => {
    if (isTableElement(element)) return 'tables';
    if (isChairElement(element)) {
      // Chairs that belong to a table hide with their table, not with standalone seating
      return element.parentTableId ? 'tables' : 'seating';
    }
    if (isZoneElement(element)) return 'entertainment';
    if (isServiceElement(element)) return 'service';
    if (isStringLightsElement(element) || isBuntingElement(element)) return 'lighting';
    if (isDecorationElement(element)) return 'decor';
    return null;
  };

  const renderElement = (element: (typeof layout.elements)[string]) => {
    const isSelected = selectedIds.includes(element.id);

    const handleElementClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      onElementClick?.(element.id, event);
    };

    const handleDoubleClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      onElementDoubleClick?.(element.id, event);
    };

    const handleMouseEnter = () => {
      onElementHover?.(element.id);
    };

    const handleMouseLeave = () => {
      onElementHover?.(null);
    };

    const handleMouseDown = (event: React.MouseEvent) => {
      event.stopPropagation();
      onElementMouseDown?.(element.id, event);
    };

    const centerX = (element.x + element.width / 2);
    const centerY = (element.y + element.height / 2);
    const rotateButtonX = centerX * pixelsPerMeter;
    const rotateButtonY = (element.y * pixelsPerMeter) - 30;

    if (isTableElement(element)) {
      const tableElement: TableElementType = {
        id: element.id,
        type: element.type.replace('table-', 'table-') as TableElementType['type'],
        x: element.x,
        y: element.y,
        dimensions: {
          width: element.width,
          height: element.height,
          diameter: element.type === 'table-round' ? element.width : undefined,
          unit: 'cm',
        },
        rotation: element.rotation || 0,
        locked: element.locked,
        tableNumber: element.tableNumber || '',
        capacity: element.capacity,
        seats: [],
        chairConfig: {
          count: element.capacity,
          arrangement: 'standard',
          spacing: 0.4,
          offset: 0.1,
          autoGenerate: true,
        },
        createdAt: element.createdAt,
        updatedAt: element.updatedAt,
      };

      return (
        <React.Fragment key={element.id}>
          <TableElement
            element={tableElement}
            pixelsPerMeter={pixelsPerMeter}
            isSelected={isSelected}
            isViewMode={uiStore.isViewMode}
            onClick={handleElementClick}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
          />
          {isSelected && onElementRotate && (
            <>
              {console.log('[ElementsLayer] TABLE RotateButton for:', element.id)}
              <RotateButton
                x={rotateButtonX}
                y={rotateButtonY}
                onRotate={() => handleRotate(element.id, ((element.rotation || 0) + 90) % 360)}
                onClose={() => {}}
                elementSize={{ width: element.width, height: element.height }}
              />
            </>
          )}
        </React.Fragment>
      );
    }

    if (isChairElement(element)) {
      const chairElement: ChairElementType = {
        id: element.id,
        type: 'chair',
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation || 0,
        locked: element.locked,
        parentTableId: element.parentTableId,
        seatIndex: element.seatIndex,
        assignedGuestId: element.assignedGuestId ?? null,
        assignedGuestName: element.assignedGuestName ?? null,
        dietaryType: element.dietaryType ?? 'regular',
        allergyFlags: element.allergyFlags ?? [],
        createdAt: element.createdAt,
        updatedAt: element.updatedAt,
      };
      return (
        <ChairElementComponent
          key={element.id}
          element={chairElement}
          pixelsPerMeter={pixelsPerMeter}
          isViewMode={uiStore.isViewMode}
          onClick={handleElementClick}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
        />
      );
    }

    if (isZoneElement(element)) {
      return (
        <React.Fragment key={element.id}>
          <ZoneElementComponent
            element={element}
            onClick={handleElementClick}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
          />
          {isSelected && onElementRotate && (
            <RotateButton
              x={rotateButtonX}
              y={rotateButtonY}
              onRotate={() => handleRotate(element.id, ((element.rotation || 0) + 90) % 360)}
              onClose={() => {}}
              elementSize={{ width: element.width, height: element.height }}
            />
          )}
        </React.Fragment>
      );
    }

    if (isServiceElement(element)) {
      return (
        <React.Fragment key={element.id}>
          <ServiceElementComponent
            element={element}
            onClick={handleElementClick}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
          />
          {isSelected && onElementRotate && (
            <RotateButton
              x={rotateButtonX}
              y={rotateButtonY}
              onRotate={() => handleRotate(element.id, ((element.rotation || 0) + 90) % 360)}
              onClose={() => {}}
              elementSize={{ width: element.width, height: element.height }}
            />
          )}
        </React.Fragment>
      );
    }

    if (isDecorationElement(element)) {
      return (
        <DecorationElementComponent
          key={element.id}
          element={element}
          onClick={handleElementClick}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
        />
      );
    }

    if (isStringLightsElement(element)) {
      return (
        <StringLightsElementComponent
          key={element.id}
          element={element}
          pixelsPerMeter={pixelsPerMeter}
          isSelected={isSelected}
          onClick={handleElementClick}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          {...(onAnchorMouseDown !== undefined && { onAnchorMouseDown })}
        />
      );
    }

    if (isBuntingElement(element)) {
      return (
        <BuntingElementComponent
          key={element.id}
          element={element}
          pixelsPerMeter={pixelsPerMeter}
          isSelected={isSelected}
          onClick={handleElementClick}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          {...(onAnchorMouseDown !== undefined && { onAnchorMouseDown })}
        />
      );
    }

    return null;
  };

  return (
    <g id="elements-layer">
      {layout.elementOrder.map((id) => {
        const element = layout.elements[id];
        if (!element || !element.visible) return null;
        const category = getElementCategory(element);
        if (category && hiddenCategories.includes(category)) return null;
        const rendered = renderElement(element);
        if (!rendered) return null;
        return (
          <g key={id} data-element-category={category ?? 'custom'}>
            {rendered}
          </g>
        );
      })}
    </g>
  );
};

export default ElementsLayer;
