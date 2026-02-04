/**
 * useAddElement Hook
 *
 * Provides functions to add elements to the canvas with proper positioning,
 * selection, and undo recording.
 */

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ElementType, TableType, BaseElement } from '../types/elements';
import type { WorldPoint } from '../types/viewport';
import type { PartialLayoutState } from '../types/history';
import { useLayoutStore, useSelectionStore, useHistoryStore, useViewportStore } from '../stores';
import { CHAIR_CONFIG_DEFAULTS } from '../constants';

interface UseAddElementReturn {
  addElementAtCenter: (type: ElementType, config?: Partial<BaseElement>) => string;
  addElementAtPosition: (type: ElementType, position: WorldPoint, config?: Partial<BaseElement>) => string;
  addTableWithChairs: (tableConfig: {
    type: TableType;
    width: number;
    height: number;
    capacity: number;
    tableNumber?: string;
    label?: string;
    rotation?: number;
    color?: string | null;
  }, position: WorldPoint) => { tableId: string; chairIds: string[] };
}

export function useAddElement(): UseAddElementReturn {
  const layoutStore = useLayoutStore();
  const selectionStore = useSelectionStore();
  const historyStore = useHistoryStore();
  const viewportStore = useViewportStore();

  const addElementAtPosition = useCallback(
    (type: ElementType, position: WorldPoint, config?: Partial<BaseElement>): string => {
      const now = new Date().toISOString();
      const elementId = uuidv4();

      const elementData = {
        type,
        x: position.x,
        y: position.y,
        width: config?.width ?? 1,
        height: config?.height ?? 1,
        rotation: config?.rotation ?? 0,
        zIndex: layoutStore.maxZIndex + 1,
        groupId: null,
        parentId: null,
        locked: false,
        visible: true,
        label: config?.label ?? '',
        notes: '',
        color: config?.color ?? null,
        createdAt: now,
        updatedAt: now,
      };

      const previousState: PartialLayoutState = {
        elements: {},
        elementOrder: layoutStore.layout?.elementOrder ? [...layoutStore.layout.elementOrder] : [],
      };

      const id = layoutStore.addElement(elementData);
      if (!id) return '';

      const newElement = layoutStore.getElementById(id);
      if (!newElement) return '';

      const nextState: PartialLayoutState = {
        elements: { [id]: newElement },
        elementOrder: layoutStore.layout?.elementOrder ? [...layoutStore.layout.elementOrder] : [],
      };

      selectionStore.select(id);

      historyStore.record('ADD_ELEMENT', `Add ${type}`, previousState, nextState);

      return id;
    },
    [layoutStore, selectionStore, historyStore]
  );

  const addElementAtCenter = useCallback(
    (type: ElementType, config?: Partial<BaseElement>): string => {
      const viewport = viewportStore.viewport;
      const pixelsPerMeter = viewportStore.pixelsPerMeter || 100;
      const centerX = (-viewport.x + viewport.width / viewport.zoom / 2) / pixelsPerMeter;
      const centerY = (-viewport.y + viewport.height / viewport.zoom / 2) / pixelsPerMeter;

      return addElementAtPosition(type, { x: centerX, y: centerY }, config);
    },
    [viewportStore, addElementAtPosition]
  );

  const addTableWithChairs = useCallback(
    (tableConfig: {
      type: TableType;
      width: number;
      height: number;
      capacity: number;
      tableNumber?: string;
      label?: string;
      rotation?: number;
      color?: string | null;
    }, position: WorldPoint): { tableId: string; chairIds: string[] } => {
      const previousState: PartialLayoutState = {
        elements: {},
        elementOrder: layoutStore.layout?.elementOrder ? [...layoutStore.layout.elementOrder] : [],
      };

      const result = layoutStore.addTable({
        ...tableConfig,
        x: position.x,
        y: position.y,
        rotation: tableConfig.rotation ?? 0,
      });

      const elements: Record<string, BaseElement> = {};
      const tableElement = layoutStore.getElementById(result.tableId);
      if (tableElement) {
        elements[result.tableId] = tableElement;
      }
      for (const chairId of result.chairIds) {
        const chair = layoutStore.getElementById(chairId);
        if (chair) {
          elements[chairId] = chair;
        }
      }

      const nextState: PartialLayoutState = {
        elements,
        elementOrder: layoutStore.layout?.elementOrder ? [...layoutStore.layout.elementOrder] : [],
      };

      selectionStore.select(result.tableId);

      historyStore.record('ADD_ELEMENTS', `Add table with ${tableConfig.capacity} chairs`, previousState, nextState);

      return result;
    },
    [layoutStore, selectionStore, historyStore]
  );

  return {
    addElementAtCenter,
    addElementAtPosition,
    addTableWithChairs,
  };
}

export default useAddElement;
