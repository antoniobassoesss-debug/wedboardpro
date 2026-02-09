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
import type { TableElement as TableElementType, ChairElement as ChairElementType } from '../../../types/layout-elements';
import { isTableElement, isChairElement, isZoneElement, isServiceElement, isDecorationElement } from '../../types/elements';
import { RotateButton } from '../Elements/RotateButton';
import { useSelectionStore } from '../../stores';

interface ElementsLayerProps {
  layout: Layout;
  onElementClick?: (elementId: string, event: React.MouseEvent) => void;
  onElementDoubleClick?: (elementId: string, event: React.MouseEvent) => void;
  onElementHover?: (elementId: string | null) => void;
  onElementMouseDown?: (elementId: string, event: React.MouseEvent) => void;
  onElementRotate?: (elementId: string, newRotation: number) => void;
}

export const ElementsLayer: React.FC<ElementsLayerProps> = ({
  layout,
  onElementClick,
  onElementDoubleClick,
  onElementHover,
  onElementMouseDown,
  onElementRotate,
}) => {
  const selectionStore = useSelectionStore();
  const selectedIds = selectionStore.selectedIds;
  console.log('[ElementsLayer] Selected IDs:', selectedIds);

  const handleRotate = useCallback((elementId: string, newRotation: number) => {
    console.log('[ElementsLayer] Rotating element:', elementId, 'to:', newRotation);
    onElementRotate?.(elementId, newRotation);
  }, [onElementRotate]);

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
    const pixelsPerMeter = 100;
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

    return null;
  };

  return (
    <g id="elements-layer">
      {layout.elementOrder.map((id) => {
        const element = layout.elements[id];
        if (!element || !element.visible) return null;
        return renderElement(element);
      })}
    </g>
  );
};

export default ElementsLayer;
