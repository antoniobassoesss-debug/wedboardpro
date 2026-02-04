/**
 * Layout Store
 *
 * Main state store for layout data and element management.
 * Uses Immer for immutable updates.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type {
  BaseElement,
  CanvasElement,
  ElementType,
  TableElement,
  ChairElement,
  TableType,
} from '../types/elements';
import type { Layout } from '../types/layout';
import {
  type LayoutSettings,
  type FloorPlanBackground,
  type VenueSpace,
  DEFAULT_LAYOUT_SETTINGS,
  DEFAULT_ASSIGNMENTS,
  CURRENT_SCHEMA_VERSION,
} from '../types/layout';
import type { ViewportState } from '../types/viewport';
import { CHAIR_CONFIG_DEFAULTS } from '../constants';
import { generateChairPositions, createChairsForTable, redistributeChairs as redistributeChairsUtil } from '../utils/chairGeneration';
import { createStateSnapshot, useHistoryStore } from '../stores/historyStore';
import type { ActionType } from '../types/history';

interface LayoutState {
  layout: Layout | null;
  isLoading: boolean;
  error: string | null;
  maxZIndex: number;

  setLayout: (layout: Layout) => void;
  createLayout: (
    projectId: string,
    eventId: string,
    createdBy: string,
    space?: Partial<VenueSpace>
  ) => Layout;

  addElement: (element: Omit<BaseElement, 'id' | 'createdAt' | 'updatedAt'>) => string | null;
  addElements: (elements: Array<Omit<BaseElement, 'id' | 'createdAt' | 'updatedAt'>>) => string[];
  addTable: (config: {
    type: TableType;
    x: number;
    y: number;
    width: number;
    height: number;
    capacity: number;
    tableNumber?: string;
    label?: string;
    rotation?: number;
    color?: string | null;
  }) => { tableId: string; chairIds: string[] };
  updateElement: (id: string, updates: Partial<BaseElement>) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;

  updateElements: (updates: Array<{ id: string; changes: Partial<BaseElement> }>) => void;
  moveElements: (ids: string[], deltaX: number, deltaY: number) => void;
  resizeElement: (id: string, width: number, height: number) => void;
  rotateElement: (id: string, rotation: number) => void;

  getElementById: (id: string) => BaseElement | undefined;
  getElementsByType: (type: ElementType) => BaseElement[];
  getChildElements: (parentId: string) => BaseElement[];
  getElementsInBounds: (
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) => BaseElement[];

  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;

  updateSettings: (settings: Partial<LayoutSettings>) => void;

  setFloorPlan: (floorPlan: FloorPlanBackground | null) => void;
  updateFloorPlan: (updates: Partial<FloorPlanBackground>) => void;

  duplicateElement: (id: string) => string | null;
  lockElement: (id: string) => void;
  unlockElement: (id: string) => void;
  toggleLock: (ids: string[]) => void;
  redistributeChairs: (tableId: string, newCapacity: number) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useLayoutStore = create<LayoutState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      layout: null,
      isLoading: false,
      error: null,
      maxZIndex: 0,

      setLayout: (layout) =>
        set((state) => {
          if (!layout) {
            state.layout = null;
            return;
          }
          state.layout = layout;
          state.error = null;
        }),

      createLayout: (projectId, eventId, createdBy, space) => {
        const now = new Date().toISOString();
        const layout: Layout = {
          id: uuidv4(),
          projectId,
          eventId,
          name: 'New Layout',
          description: '',
          status: 'draft',
          space: {
            walls: [],
            dimensions: { width: 20, height: 20 },
            pixelsPerMeter: 100,
            ...space,
          },
          floorPlan: null,
          elements: {},
          elementOrder: [],
          groups: {},
          assignments: { ...DEFAULT_ASSIGNMENTS },
          settings: { ...DEFAULT_LAYOUT_SETTINGS },
          createdAt: now,
          updatedAt: now,
          createdBy,
          schemaVersion: CURRENT_SCHEMA_VERSION,
        };
        set((state) => {
          state.layout = layout;
        });
        return layout;
      },

      addElement: (elementData) => {
        const state = get();
        const layout = state.layout;
        if (!layout) return null;

        const now = new Date().toISOString();
        const previousState = createStateSnapshot(
          layout.elements,
          layout.elementOrder,
          layout.space?.walls,
          layout.settings
        );

        const id = uuidv4();
        const newElement: BaseElement = {
          ...elementData,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set((s) => {
          if (!s.layout) return;

          s.layout.elements[id] = newElement;
          s.layout.elementOrder.push(id);
          s.maxZIndex = Math.max(s.maxZIndex, newElement.zIndex);
          s.layout.updatedAt = now;
        });

        const newLayout = get().layout!;
        const nextState = createStateSnapshot(
          newLayout.elements,
          newLayout.elementOrder,
          newLayout.space?.walls,
          newLayout.settings
        );

        useHistoryStore.getState().record('ADD_ELEMENT' as ActionType, `Add ${elementData.type}`, previousState, nextState);

        return id;
      },

      addElements: (elementsData) => {
        const ids: string[] = [];
        const now = new Date().toISOString();

        set((state) => {
          if (!state.layout) return;

          for (const elementData of elementsData) {
            const id = uuidv4();
            const element: BaseElement = {
              ...elementData,
              id,
              createdAt: now,
              updatedAt: now,
            };
            state.layout.elements[id] = element;
            state.layout.elementOrder.push(id);
            state.maxZIndex = Math.max(state.maxZIndex, element.zIndex);
            ids.push(id);
          }
          state.layout.updatedAt = now;
        });

        return ids;
      },

      addTable: (config) => {
        const { type, x, y, width, height, capacity, tableNumber, label, rotation = 0, color = null } = config;
        const now = new Date().toISOString();
        const tableId = uuidv4();
        const chairIds: string[] = [];

        const tableElement: Omit<TableElement, 'id' | 'createdAt'> = {
          type,
          x,
          y,
          width,
          height,
          rotation,
          zIndex: get().maxZIndex + 1,
          groupId: null,
          parentId: null,
          locked: false,
          visible: true,
          label: label || (tableNumber ? `Table ${tableNumber}` : ''),
          notes: '',
          color,
          capacity,
          tableNumber: tableNumber || String(
            Object.values(get().layout?.elements || {}).filter(e => e.type.includes('table')).length + 1
          ),
          chairConfig: { ...CHAIR_CONFIG_DEFAULTS },
          chairIds: [],
          updatedAt: now,
        };

        const chairPositions = generateChairPositions({
          tableType: type.replace('table-', '') as 'round' | 'rectangular' | 'oval' | 'square',
          tableWidth: width,
          tableHeight: height,
          capacity,
        });

        set((state) => {
          if (!state.layout) return;

          state.layout.elements[tableId] = tableElement as TableElement;
          state.layout.elementOrder.push(tableId);

          for (const pos of chairPositions) {
            const chairId = uuidv4();
            chairIds.push(chairId);

            const chairElement: ChairElement = {
              id: chairId,
              type: 'chair',
              x: x + pos.localX - 0.225,
              y: y + pos.localY - 0.225,
              width: 0.45,
              height: 0.45,
              rotation: pos.rotation,
              zIndex: get().maxZIndex + 2,
              groupId: null,
              parentId: tableId,
              locked: false,
              visible: true,
              label: '',
              notes: '',
              color: null,
              parentTableId: tableId,
              seatIndex: pos.seatIndex,
              assignedGuestId: null,
              assignedGuestName: null,
              dietaryType: null,
              allergyFlags: [],
              createdAt: now,
              updatedAt: now,
            };

            state.layout.elements[chairId] = chairElement;
            state.layout.elementOrder.push(chairId);
          }

          state.layout.elements[tableId] = {
            ...state.layout.elements[tableId] as TableElement,
            chairIds,
            updatedAt: now,
          } as TableElement;

          state.maxZIndex = get().maxZIndex + 2;
          state.layout.updatedAt = now;
        });

        return { tableId, chairIds };
      },

      updateElement: (id, updates) => {
        const state = get();
        const layout = state.layout;
        if (!layout) return;

        const element = layout.elements[id];
        if (!element) return;

        const previousState = createStateSnapshot(
          layout.elements,
          layout.elementOrder,
          layout.space?.walls,
          layout.settings
        );

        set((s) => {
          if (!s.layout) return;

          const el = s.layout.elements[id];
          if (!el) return;

          s.layout.elements[id] = {
            ...el,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          s.layout.updatedAt = new Date().toISOString();
        });

        const newLayout = get().layout!;
        const nextState = createStateSnapshot(
          newLayout.elements,
          newLayout.elementOrder,
          newLayout.space?.walls,
          newLayout.settings
        );

        useHistoryStore.getState().record('UPDATE_ELEMENT' as ActionType, `Update ${element.label || element.type}`, previousState, nextState);
      },

      deleteElement: (id) => {
        const state = get();
        const layout = state.layout;
        if (!layout) return;

        const element = layout.elements[id];
        if (!element) return;

        const previousState = createStateSnapshot(
          layout.elements,
          layout.elementOrder,
          layout.space?.walls,
          layout.settings
        );

        set((s) => {
          if (!s.layout) return;

          delete s.layout.elements[id];
          s.layout.elementOrder = s.layout.elementOrder.filter((eid) => eid !== id);
          s.layout.updatedAt = new Date().toISOString();
        });

        const newLayout = get().layout!;
        const nextState = createStateSnapshot(
          newLayout.elements,
          newLayout.elementOrder,
          newLayout.space?.walls,
          newLayout.settings
        );

        useHistoryStore.getState().record('DELETE_ELEMENT' as ActionType, `Delete ${element.label || element.type}`, previousState, nextState);
      },

      deleteElements: (ids) => {
        const idsSet = new Set(ids);
        set((state) => {
          if (!state.layout) return;

          for (const id of ids) {
            delete state.layout.elements[id];
          }
          state.layout.elementOrder = state.layout.elementOrder.filter(
            (eid) => !idsSet.has(eid)
          );
          state.layout.updatedAt = new Date().toISOString();
        });
      },

      updateElements: (updates) => {
        const now = new Date().toISOString();
        set((state) => {
          if (!state.layout) return;

          for (const { id, changes } of updates) {
            const element = state.layout.elements[id];
            if (element) {
              state.layout.elements[id] = {
                ...element,
                ...changes,
                updatedAt: now,
              };
            }
          }
          state.layout.updatedAt = now;
        });
      },

      moveElements: (ids, deltaX, deltaY) => {
        const state = get();
        const layout = state.layout;
        if (!layout) return;

        const previousState = createStateSnapshot(
          layout.elements,
          layout.elementOrder,
          layout.space?.walls,
          layout.settings
        );

        const now = new Date().toISOString();
        set((s) => {
          if (!s.layout) return;

          for (const id of ids) {
            const element = s.layout.elements[id];
            if (element) {
              element.x += deltaX;
              element.y += deltaY;
              element.updatedAt = now;
            }
          }
          s.layout.updatedAt = now;
        });

        const newLayout = get().layout!;
        const nextState = createStateSnapshot(
          newLayout.elements,
          newLayout.elementOrder,
          newLayout.space?.walls,
          newLayout.settings
        );

        useHistoryStore.getState().record('MOVE_ELEMENT' as ActionType, `Move ${ids.length} element${ids.length > 1 ? 's' : ''}`, previousState, nextState);
      },

      resizeElement: (id, width, height) => {
        const state = get();
        const layout = state.layout;
        if (!layout) return;

        const element = layout.elements[id];
        if (!element) return;

        const previousState = createStateSnapshot(
          layout.elements,
          layout.elementOrder,
          layout.space?.walls,
          layout.settings
        );

        set((s) => {
          if (!s.layout) return;

          const el = s.layout.elements[id];
          if (el) {
            el.width = width;
            el.height = height;
            el.updatedAt = new Date().toISOString();
            s.layout.updatedAt = new Date().toISOString();
          }
        });

        const newLayout = get().layout!;
        const nextState = createStateSnapshot(
          newLayout.elements,
          newLayout.elementOrder,
          newLayout.space?.walls,
          newLayout.settings
        );

        useHistoryStore.getState().record('RESIZE_ELEMENT' as ActionType, `Resize ${element.label || element.type}`, previousState, nextState);
      },

      rotateElement: (id, rotation) => {
        const state = get();
        const layout = state.layout;
        if (!layout) return;

        const element = layout.elements[id];
        if (!element) return;

        const previousState = createStateSnapshot(
          layout.elements,
          layout.elementOrder,
          layout.space?.walls,
          layout.settings
        );

        set((s) => {
          if (!s.layout) return;

          const el = s.layout.elements[id];
          if (el) {
            el.rotation = rotation % 360;
            el.updatedAt = new Date().toISOString();
            s.layout.updatedAt = new Date().toISOString();
          }
        });

        const newLayout = get().layout!;
        const nextState = createStateSnapshot(
          newLayout.elements,
          newLayout.elementOrder,
          newLayout.space?.walls,
          newLayout.settings
        );

        useHistoryStore.getState().record('ROTATE_ELEMENT' as ActionType, `Rotate ${element.label || element.type}`, previousState, nextState);
      },

      getElementById: (id) => {
        const state = get();
        return state.layout?.elements[id];
      },

      getElementsByType: (type) => {
        const state = get();
        if (!state.layout) return [];
        return Object.values(state.layout.elements).filter((el) => el.type === type);
      },

      getChildElements: (parentId) => {
        const state = get();
        if (!state.layout) return [];
        return Object.values(state.layout.elements).filter((el) => el.parentId === parentId);
      },

      getElementsInBounds: (minX, minY, maxX, maxY) => {
        const state = get();
        if (!state.layout) return [];
        return Object.values(state.layout.elements).filter(
          (el) =>
            el.x >= minX &&
            el.y >= minY &&
            el.x + el.width <= maxX &&
            el.y + el.height <= maxY
        );
      },

      bringToFront: (ids) => {
        set((state) => {
          if (!state.layout) return;

          const idsSet = new Set(ids);
          state.layout.elementOrder = state.layout.elementOrder.filter((id) => !idsSet.has(id));
          state.layout.elementOrder.push(...ids);
        });
      },

      sendToBack: (ids) => {
        set((state) => {
          if (!state.layout) return;

          const idsSet = new Set(ids);
          state.layout.elementOrder = state.layout.elementOrder.filter((id) => !idsSet.has(id));
          state.layout.elementOrder.unshift(...ids);
        });
      },

      bringForward: (ids) => {
        set((state) => {
          if (!state.layout) return;

          const idsSet = new Set(ids);
          const order = [...state.layout.elementOrder];

          for (let i = 1; i < order.length; i++) {
            const currentId = order[i];
            if (currentId !== undefined && idsSet.has(currentId)) {
              const prevId = order[i - 1];
              if (prevId !== undefined && !idsSet.has(prevId)) {
                order[i - 1] = currentId;
                order[i] = prevId;
                i++;
              }
            }
          }

          state.layout.elementOrder = order;
        });
      },

      sendBackward: (ids) => {
        set((state) => {
          if (!state.layout) return;

          const idsSet = new Set(ids);
          const order = [...state.layout.elementOrder];

          for (let i = 0; i < order.length - 1; i++) {
            const nextId = order[i + 1];
            if (nextId !== undefined && idsSet.has(nextId)) {
              const currentId = order[i];
              if (currentId !== undefined && !idsSet.has(currentId)) {
                order[i] = nextId;
                order[i + 1] = currentId;
                i--;
              }
            }
          }

          state.layout.elementOrder = order;
        });
      },

      updateSettings: (settings) => {
        set((state) => {
          if (!state.layout) return;
          state.layout.settings = { ...state.layout.settings, ...settings };
          state.layout.updatedAt = new Date().toISOString();
        });
      },

      setFloorPlan: (floorPlan) => {
        set((state) => {
          if (!state.layout) return;
          state.layout.floorPlan = floorPlan;
          state.layout.updatedAt = new Date().toISOString();
        });
      },

      updateFloorPlan: (updates) => {
        set((state) => {
          if (!state.layout?.floorPlan) return;
          state.layout.floorPlan = { ...state.layout.floorPlan, ...updates };
          state.layout.updatedAt = new Date().toISOString();
        });
      },

      duplicateElement: (id) => {
        const state = get();
        const element = state.layout?.elements[id];
        if (!element) return null;

        const newId = get().addElement({
          ...element,
          x: element.x + 0.5,
          y: element.y + 0.5,
          label: element.label ? `${element.label} (copy)` : '',
        });

        return newId;
      },

      lockElement: (id) => {
        get().updateElement(id, { locked: true });
      },

      unlockElement: (id) => {
        get().updateElement(id, { locked: false });
      },

      toggleLock: (ids) => {
        const elements = ids.map((id) => get().getElementById(id)).filter(Boolean) as BaseElement[];
        const allLocked = elements.length > 0 && elements.every((el) => el.locked);
        ids.forEach((id) => get().updateElement(id, { locked: !allLocked }));
      },

      redistributeChairs: (tableId, newCapacity) => {
        const state = get();
        const table = state.layout?.elements[tableId];
        
        if (!table || table.type === undefined || !table.type.includes('table')) {
          return;
        }

        const tableType = table.type.replace('table-', '') as 'round' | 'rectangular' | 'oval' | 'square';
        const existingChairs = Object.values(state.layout?.elements || {}).filter(
          (el): el is ChairElement => el.type === 'chair' && (el as ChairElement).parentTableId === tableId
        );

        const config = {
          tableType,
          tableWidth: table.width,
          tableHeight: table.height,
          capacity: newCapacity,
        };

        const result = redistributeChairsUtil(existingChairs, newCapacity, config);
        const now = new Date().toISOString();

        set((state) => {
          if (!state.layout) return;

          for (const update of result.toUpdate) {
            const chair = state.layout.elements[update.id] as ChairElement | undefined;
            if (chair) {
              const cos = Math.cos((table.rotation * Math.PI) / 180);
              const sin = Math.sin((table.rotation * Math.PI) / 180);
              const rotatedX = update.position.localX * cos - update.position.localY * sin;
              const rotatedY = update.position.localX * sin + update.position.localY * cos;

              chair.x = table.x + rotatedX - 0.225;
              chair.y = table.y + rotatedY - 0.225;
              chair.rotation = update.position.rotation + table.rotation;
              chair.seatIndex = update.position.seatIndex;
              chair.updatedAt = now;
            }
          }

          for (const chairId of result.toRemove) {
            delete state.layout.elements[chairId];
            state.layout.elementOrder = state.layout.elementOrder.filter((id) => id !== chairId);
          }

          for (const pos of result.toAdd) {
            const chairId = uuidv4();
            const cos = Math.cos((table.rotation * Math.PI) / 180);
            const sin = Math.sin((table.rotation * Math.PI) / 180);
            const rotatedX = pos.localX * cos - pos.localY * sin;
            const rotatedY = pos.localX * sin + pos.localY * cos;

            const newChair: ChairElement = {
              id: chairId,
              type: 'chair',
              x: table.x + rotatedX - 0.225,
              y: table.y + rotatedY - 0.225,
              width: 0.45,
              height: 0.45,
              rotation: pos.rotation + table.rotation,
              zIndex: get().maxZIndex + 1,
              groupId: null,
              parentId: tableId,
              locked: false,
              visible: true,
              label: '',
              notes: '',
              color: null,
              parentTableId: tableId,
              seatIndex: pos.seatIndex,
              assignedGuestId: null,
              assignedGuestName: null,
              dietaryType: null,
              allergyFlags: [],
              createdAt: now,
              updatedAt: now,
            };

            state.layout.elements[chairId] = newChair;
            state.layout.elementOrder.push(chairId);
          }

          const tableElement = state.layout.elements[tableId] as TableElement;
          if (tableElement) {
            const currentChairIds = Object.keys(state.layout.elements).filter(
              (id) => {
                const el = state.layout?.elements[id];
                return el?.type === 'chair' && (el as ChairElement).parentTableId === tableId;
              }
            );
            tableElement.chairIds = currentChairIds;
            tableElement.capacity = newCapacity;
            tableElement.updatedAt = now;
          }

          state.layout.updatedAt = now;
        });
      },

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },
    }))
  )
);
