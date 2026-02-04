/**
 * Canvas Store - Central state management for Layout Maker
 *
 * Uses Zustand with Immer for immutable updates.
 * All element mutations go through boundary enforcement.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  clampElementToA4,
  clampWallToA4,
  clampPointToA4,
  clampPositionToA4,
  clampSizeToA4,
  type A4Bounds,
} from './boundaries';
import { useHistoryStore } from '../state/historyStore';

// Re-export types from client for compatibility
export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawingPath {
  id: string;
  d: string;
  stroke: string;
  strokeWidth: number;
}

export interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  imageUrl?: string;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  tableData?: {
    type: string;
    size: string;
    seats: number;
    actualSizeMeters: number;
    chairIds?: string[];
  };
  chairData?: {
    parentTableId: string;
    seatIndex: number;
    assignedGuestId?: string | null;
    assignedGuestName?: string | null;
    dietaryType?: string | null;
  };
  text?: string;
  spaceMetersWidth?: number;
  spaceMetersHeight?: number;
  pixelsPerMeter?: number;
  attachedSpaceId?: string;
}

export interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fill: string;
}

export interface Wall {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  length?: number;
  angle?: number;
  color?: string;
  snapToGrid?: boolean;
  snapAngle?: number;
}

export interface Door {
  id: string;
  wallId: string;
  position: number;
  width: number;
  openingDirection: 'left' | 'right' | 'both' | 'inward';
  hingeSide?: 'start' | 'end';
}

export interface PowerPoint {
  id: string;
  x: number;
  y: number;
  electrical: boolean;
  standard: string;
  breaker_amps: number;
  voltage: number;
  label?: string;
  electricalProjectId?: string;
  circuitId?: string;
}

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'saved' | 'error';

export interface CanvasSnapshot {
  elements: Record<string, Shape>;
  elementOrder: string[];
  walls: Record<string, Wall>;
  wallOrder: string[];
  doors: Record<string, Door>;
  powerPoints: Record<string, PowerPoint>;
  drawings: Record<string, DrawingPath>;
  drawingOrder: string[];
  textElements: Record<string, TextElement>;
  textOrder: string[];
}

// Wall scale info for proportional element sizing
export interface WallScaleInfo {
  pxPerMeter: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

export interface CanvasState {
  // Project identification
  activeProjectId: string | null;
  supabaseLayoutId: string | null;

  // A4 bounds (set once on init)
  a4Bounds: A4Bounds;

  // Wall scale (computed from walls, used for proportional element sizing)
  wallScale: WallScaleInfo | null;

  // Canvas data (normalized for O(1) lookups)
  elements: Record<string, Shape>;
  elementOrder: string[];
  walls: Record<string, Wall>;
  wallOrder: string[];
  doors: Record<string, Door>;
  doorOrder: string[];
  powerPoints: Record<string, PowerPoint>;
  powerPointOrder: string[];
  drawings: Record<string, DrawingPath>;
  drawingOrder: string[];
  textElements: Record<string, TextElement>;
  textOrder: string[];

  // View state (not persisted to Supabase)
  viewBox: ViewBox;
  selectedElementIds: string[];

  // Sync state
  syncStatus: SyncStatus;
  pendingChanges: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
}

export interface CanvasActions {
  // Project lifecycle
  initializeProject: (
    projectId: string,
    a4Bounds: A4Bounds,
    data?: Partial<CanvasSnapshot> & { supabaseLayoutId?: string; viewBox?: ViewBox }
  ) => void;
  switchProject: (
    projectId: string,
    a4Bounds: A4Bounds,
    data?: Partial<CanvasSnapshot> & { supabaseLayoutId?: string; viewBox?: ViewBox }
  ) => void;
  clearProject: () => void;
  setSupabaseLayoutId: (id: string) => void;

  // Element operations (with boundary enforcement)
  addElement: (element: Omit<Shape, 'id'>) => string;
  updateElement: (id: string, updates: Partial<Shape>) => void;
  moveElement: (id: string, x: number, y: number) => void;
  resizeElement: (id: string, width: number, height: number) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  selectElements: (ids: string[]) => void;

  // Wall operations
  addWall: (wall: Omit<Wall, 'id'>) => string;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;

  // Door operations
  addDoor: (door: Omit<Door, 'id'>) => string;
  updateDoor: (id: string, updates: Partial<Door>) => void;
  deleteDoor: (id: string) => void;

  // Power point operations
  addPowerPoint: (point: Omit<PowerPoint, 'id'>) => string;
  updatePowerPoint: (id: string, updates: Partial<PowerPoint>) => void;
  deletePowerPoint: (id: string) => void;

  // Drawing operations
  addDrawing: (drawing: Omit<DrawingPath, 'id'>) => string;
  updateDrawing: (id: string, updates: Partial<DrawingPath>) => void;
  deleteDrawing: (id: string) => void;

  // Text operations
  addText: (text: Omit<TextElement, 'id'>) => string;
  updateText: (id: string, updates: Partial<TextElement>) => void;
  deleteText: (id: string) => void;

  // Batch operations
  setElements: (elements: Shape[]) => void;
  setWalls: (walls: Wall[], doors?: Door[]) => void;
  setDrawings: (drawings: DrawingPath[]) => void;
  setPowerPoints: (powerPoints: PowerPoint[]) => void;
  setTextElements: (texts: TextElement[]) => void;

  // Wall scale operations
  setWallScale: (scale: WallScaleInfo | null) => void;

  // View operations
  setViewBox: (viewBox: ViewBox) => void;

  // Sync operations
  markDirty: () => void;
  markSynced: (timestamp: number) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSyncError: (error: string | null) => void;

  // History (delegates to historyStore)
  recordSnapshot: (label: string) => void;

  // Serialization
  getCanvasData: () => {
    drawings: DrawingPath[];
    shapes: Shape[];
    textElements: TextElement[];
    walls: Wall[];
    doors: Door[];
    powerPoints: PowerPoint[];
    viewBox: ViewBox;
    wallScale: WallScaleInfo | null;
  };
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const initialState: CanvasState = {
  activeProjectId: null,
  supabaseLayoutId: null,
  a4Bounds: { x: 0, y: 0, width: 800, height: 1132 },
  wallScale: null,
  elements: {},
  elementOrder: [],
  walls: {},
  wallOrder: [],
  doors: {},
  doorOrder: [],
  powerPoints: {},
  powerPointOrder: [],
  drawings: {},
  drawingOrder: [],
  textElements: {},
  textOrder: [],
  viewBox: { x: -400, y: -566, width: 1066, height: 1509 },
  selectedElementIds: [],
  syncStatus: 'idle',
  pendingChanges: false,
  lastSyncedAt: null,
  syncError: null,
};

export const useCanvasStore = create<CanvasState & CanvasActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // ========== Project Lifecycle ==========

      initializeProject: (projectId, a4Bounds, data) => {
        set((state) => {
          state.activeProjectId = projectId;
          state.a4Bounds = a4Bounds;
          state.supabaseLayoutId = data?.supabaseLayoutId || null;
          state.viewBox = data?.viewBox || {
            x: a4Bounds.x - a4Bounds.width * 0.125,
            y: a4Bounds.y - a4Bounds.height * 0.125,
            width: a4Bounds.width * 1.25,
            height: a4Bounds.height * 1.25,
          };

          // ALWAYS clear all canvas data first to ensure project isolation
          state.elements = {};
          state.elementOrder = [];
          state.walls = {};
          state.wallOrder = [];
          state.doors = {};
          state.doorOrder = [];
          state.powerPoints = {};
          state.powerPointOrder = [];
          state.drawings = {};
          state.drawingOrder = [];
          state.textElements = {};
          state.textOrder = [];

          // Load and clamp elements if provided
          if (data?.elements) {
            for (const [id, el] of Object.entries(data.elements)) {
              state.elements[id] = clampElementToA4(el, a4Bounds);
              state.elementOrder.push(id);
            }
          }
          if (data?.elementOrder) {
            state.elementOrder = data.elementOrder.filter((id) => state.elements[id]);
          }

          // Load and clamp walls if provided
          if (data?.walls) {
            for (const [id, wall] of Object.entries(data.walls)) {
              state.walls[id] = clampWallToA4(wall, a4Bounds);
              state.wallOrder.push(id);
            }
          }
          if (data?.wallOrder) {
            state.wallOrder = data.wallOrder.filter((id) => state.walls[id]);
          }

          // Load doors if provided (no clamping needed, they reference walls)
          if (data?.doors) {
            state.doors = { ...data.doors };
            state.doorOrder = Object.keys(data.doors);
          }

          // Load and clamp power points if provided
          if (data?.powerPoints) {
            for (const [id, pp] of Object.entries(data.powerPoints)) {
              state.powerPoints[id] = clampPointToA4(pp, a4Bounds);
              state.powerPointOrder.push(id);
            }
          }

          // Load drawings if provided (paths can extend outside, but we store as-is)
          if (data?.drawings) {
            state.drawings = { ...data.drawings };
            state.drawingOrder = data.drawingOrder || Object.keys(data.drawings);
          }

          // Load text elements if provided
          if (data?.textElements) {
            state.textElements = { ...data.textElements };
            state.textOrder = data.textOrder || Object.keys(data.textElements);
          }

          // Restore wall scale if provided (for proper element sizing)
          if ((data as any)?.wallScale) {
            state.wallScale = (data as any).wallScale;
          } else {
            state.wallScale = null;
          }

          state.selectedElementIds = [];
          state.syncStatus = 'idle';
          state.pendingChanges = false;
          state.syncError = null;
        });

        useHistoryStore.getState().clear();
      },

      switchProject: (projectId, a4Bounds, data) => {
        get().clearProject();
        get().initializeProject(projectId, a4Bounds, data);
      },

      clearProject: () => {
        set((state) => {
          state.activeProjectId = null;
          state.supabaseLayoutId = null;
          state.wallScale = null;
          state.elements = {};
          state.elementOrder = [];
          state.walls = {};
          state.wallOrder = [];
          state.doors = {};
          state.doorOrder = [];
          state.powerPoints = {};
          state.powerPointOrder = [];
          state.drawings = {};
          state.drawingOrder = [];
          state.textElements = {};
          state.textOrder = [];
          state.selectedElementIds = [];
          state.pendingChanges = false;
          state.syncError = null;
        });
        useHistoryStore.getState().clear();
      },

      setSupabaseLayoutId: (id) => {
        set((state) => {
          state.supabaseLayoutId = id;
        });
      },

      // ========== Element Operations ==========

      addElement: (elementData) => {
        const id = generateId('shape');
        const a4 = get().a4Bounds;
        const element: Shape = { id, ...elementData };
        const clamped = clampElementToA4(element, a4);

        set((state) => {
          state.elements[id] = clamped;
          state.elementOrder.push(id);
          state.pendingChanges = true;
        });

        return id;
      },

      updateElement: (id, updates) => {
        const a4 = get().a4Bounds;
        const current = get().elements[id];
        if (!current) return;

        set((state) => {
          const el = state.elements[id];
          if (!el) return;
          const updated = { ...el, ...updates };
          const clamped = clampElementToA4(updated, a4);
          state.elements[id] = { ...updated, x: clamped.x, y: clamped.y, width: clamped.width, height: clamped.height };
          state.pendingChanges = true;
        });
      },

      moveElement: (id, x, y) => {
        const a4 = get().a4Bounds;
        const element = get().elements[id];
        if (!element) return;

        const clamped = clampPositionToA4(x, y, element.width, element.height, a4);
        const deltaX = clamped.x - element.x;
        const deltaY = clamped.y - element.y;

        set((state) => {
          const el = state.elements[id];
          if (!el) return;
          el.x = clamped.x;
          el.y = clamped.y;
          state.pendingChanges = true;

          // If this is a table with chairs, move the chairs too
          if (el.tableData?.chairIds && el.tableData.chairIds.length > 0) {
            for (const chairId of el.tableData.chairIds) {
              const chair = state.elements[chairId];
              if (chair) {
                const chairClamped = clampPositionToA4(
                  chair.x + deltaX,
                  chair.y + deltaY,
                  chair.width,
                  chair.height,
                  a4
                );
                chair.x = chairClamped.x;
                chair.y = chairClamped.y;
              }
            }
          }
        });
      },

      resizeElement: (id, width, height) => {
        const a4 = get().a4Bounds;
        const element = get().elements[id];
        if (!element) return;

        const clamped = clampSizeToA4(element.x, element.y, width, height, a4);

        set((state) => {
          const el = state.elements[id];
          if (!el) return;
          el.width = clamped.width;
          el.height = clamped.height;
          state.pendingChanges = true;
        });
      },

      deleteElement: (id) => {
        set((state) => {
          delete state.elements[id];
          state.elementOrder = state.elementOrder.filter((eid) => eid !== id);
          state.selectedElementIds = state.selectedElementIds.filter((eid) => eid !== id);
          state.pendingChanges = true;
        });
      },

      selectElement: (id) => {
        set((state) => {
          state.selectedElementIds = id ? [id] : [];
        });
      },

      selectElements: (ids) => {
        set((state) => {
          state.selectedElementIds = ids;
        });
      },

      // ========== Wall Operations ==========

      addWall: (wallData) => {
        const id = generateId('wall');
        const a4 = get().a4Bounds;
        const wall: Wall = { id, ...wallData };
        const clamped = clampWallToA4(wall, a4);

        set((state) => {
          state.walls[id] = clamped;
          state.wallOrder.push(id);
          state.pendingChanges = true;
        });

        return id;
      },

      updateWall: (id, updates) => {
        const a4 = get().a4Bounds;
        const current = get().walls[id];
        if (!current) return;

        set((state) => {
          const existing = state.walls[id];
          if (!existing) return;
          const updated: Wall = { ...existing, ...updates };
          const clamped = clampWallToA4(updated, a4);
          state.walls[id] = { ...updated, startX: clamped.startX, startY: clamped.startY, endX: clamped.endX, endY: clamped.endY };
          state.pendingChanges = true;
        });
      },

      deleteWall: (id) => {
        set((state) => {
          delete state.walls[id];
          state.wallOrder = state.wallOrder.filter((wid) => wid !== id);
          // Also delete doors attached to this wall
          const doorsToDelete = Object.values(state.doors).filter((d) => d.wallId === id);
          for (const door of doorsToDelete) {
            delete state.doors[door.id];
            state.doorOrder = state.doorOrder.filter((did) => did !== door.id);
          }
          state.pendingChanges = true;
        });
      },

      // ========== Door Operations ==========

      addDoor: (doorData) => {
        const id = generateId('door');
        const door: Door = { id, ...doorData };

        set((state) => {
          state.doors[id] = door;
          state.doorOrder.push(id);
          state.pendingChanges = true;
        });

        return id;
      },

      updateDoor: (id, updates) => {
        const current = get().doors[id];
        if (!current) return;

        set((state) => {
          const existing = state.doors[id];
          if (!existing) return;
          state.doors[id] = { ...existing, ...updates } as Door;
          state.pendingChanges = true;
        });
      },

      deleteDoor: (id) => {
        set((state) => {
          delete state.doors[id];
          state.doorOrder = state.doorOrder.filter((did) => did !== id);
          state.pendingChanges = true;
        });
      },

      // ========== Power Point Operations ==========

      addPowerPoint: (pointData) => {
        const id = generateId('pp');
        const a4 = get().a4Bounds;
        const point: PowerPoint = { id, ...pointData };
        const clamped = clampPointToA4(point, a4);

        set((state) => {
          state.powerPoints[id] = clamped;
          state.powerPointOrder.push(id);
          state.pendingChanges = true;
        });

        return id;
      },

      updatePowerPoint: (id, updates) => {
        const a4 = get().a4Bounds;
        const current = get().powerPoints[id];
        if (!current) return;

        set((state) => {
          const existing = state.powerPoints[id];
          if (!existing) return;
          const updated: PowerPoint = { ...existing, ...updates };
          if (updates.x !== undefined || updates.y !== undefined) {
            const clamped = clampPointToA4(updated, a4);
            state.powerPoints[id] = { ...updated, x: clamped.x, y: clamped.y };
          } else {
            state.powerPoints[id] = updated;
          }
          state.pendingChanges = true;
        });
      },

      deletePowerPoint: (id) => {
        set((state) => {
          delete state.powerPoints[id];
          state.powerPointOrder = state.powerPointOrder.filter((pid) => pid !== id);
          state.pendingChanges = true;
        });
      },

      // ========== Drawing Operations ==========

      addDrawing: (drawingData) => {
        const id = generateId('path');
        const drawing: DrawingPath = { id, ...drawingData };

        set((state) => {
          state.drawings[id] = drawing;
          state.drawingOrder.push(id);
          state.pendingChanges = true;
        });

        return id;
      },

      updateDrawing: (id, updates) => {
        const current = get().drawings[id];
        if (!current) return;

        set((state) => {
          const existing = state.drawings[id];
          if (!existing) return;
          state.drawings[id] = { ...existing, ...updates } as DrawingPath;
          state.pendingChanges = true;
        });
      },

      deleteDrawing: (id) => {
        set((state) => {
          delete state.drawings[id];
          state.drawingOrder = state.drawingOrder.filter((did) => did !== id);
          state.pendingChanges = true;
        });
      },

      // ========== Text Operations ==========

      addText: (textData) => {
        const id = generateId('text');
        const text: TextElement = { id, ...textData };

        set((state) => {
          state.textElements[id] = text;
          state.textOrder.push(id);
          state.pendingChanges = true;
        });

        return id;
      },

      updateText: (id, updates) => {
        const current = get().textElements[id];
        if (!current) return;

        set((state) => {
          const existing = state.textElements[id];
          if (!existing) return;
          state.textElements[id] = { ...existing, ...updates } as TextElement;
          state.pendingChanges = true;
        });
      },

      deleteText: (id) => {
        set((state) => {
          delete state.textElements[id];
          state.textOrder = state.textOrder.filter((tid) => tid !== id);
          state.pendingChanges = true;
        });
      },

      // ========== Batch Operations ==========

      setElements: (elements) => {
        const a4 = get().a4Bounds;

        set((state) => {
          state.elements = {};
          state.elementOrder = [];
          for (const el of elements) {
            const clamped = clampElementToA4(el, a4);
            state.elements[el.id] = clamped;
            state.elementOrder.push(el.id);
          }
          state.pendingChanges = true;
        });
      },

      setWalls: (walls, doors) => {
        const a4 = get().a4Bounds;

        set((state) => {
          state.walls = {};
          state.wallOrder = [];
          for (const wall of walls) {
            const clamped = clampWallToA4(wall, a4);
            state.walls[wall.id] = clamped;
            state.wallOrder.push(wall.id);
          }

          if (doors) {
            state.doors = {};
            state.doorOrder = [];
            for (const door of doors) {
              state.doors[door.id] = door;
              state.doorOrder.push(door.id);
            }
          }
          state.pendingChanges = true;
        });
      },

      setDrawings: (drawings) => {
        set((state) => {
          state.drawings = {};
          state.drawingOrder = [];
          for (const drawing of drawings) {
            state.drawings[drawing.id] = drawing;
            state.drawingOrder.push(drawing.id);
          }
          state.pendingChanges = true;
        });
      },

      setPowerPoints: (powerPoints) => {
        const a4 = get().a4Bounds;

        set((state) => {
          state.powerPoints = {};
          state.powerPointOrder = [];
          for (const pp of powerPoints) {
            const clamped = clampPointToA4(pp, a4);
            state.powerPoints[pp.id] = clamped;
            state.powerPointOrder.push(pp.id);
          }
          state.pendingChanges = true;
        });
      },

      setTextElements: (texts) => {
        set((state) => {
          state.textElements = {};
          state.textOrder = [];
          for (const text of texts) {
            state.textElements[text.id] = text;
            state.textOrder.push(text.id);
          }
          state.pendingChanges = true;
        });
      },

      // ========== Wall Scale Operations ==========

      setWallScale: (scale) => {
        set((state) => {
          state.wallScale = scale;
        });
      },

      // ========== View Operations ==========

      setViewBox: (viewBox) => {
        set((state) => {
          state.viewBox = viewBox;
        });
      },

      // ========== Sync Operations ==========

      markDirty: () => {
        set((state) => {
          state.pendingChanges = true;
          state.syncStatus = 'pending';
        });
      },

      markSynced: (timestamp) => {
        set((state) => {
          state.pendingChanges = false;
          state.lastSyncedAt = timestamp;
          state.syncStatus = 'saved';
          state.syncError = null;
        });
      },

      setSyncStatus: (status) => {
        set((state) => {
          state.syncStatus = status;
        });
      },

      setSyncError: (error) => {
        set((state) => {
          state.syncError = error;
          state.syncStatus = error ? 'error' : state.syncStatus;
        });
      },

      // ========== History ==========

      recordSnapshot: (label) => {
        const state = get();
        const snapshot: CanvasSnapshot = {
          elements: { ...state.elements },
          elementOrder: [...state.elementOrder],
          walls: { ...state.walls },
          wallOrder: [...state.wallOrder],
          doors: { ...state.doors },
          powerPoints: { ...state.powerPoints },
          drawings: { ...state.drawings },
          drawingOrder: [...state.drawingOrder],
          textElements: { ...state.textElements },
          textOrder: [...state.textOrder],
        };

        useHistoryStore.getState().record({
          actionType: 'BATCH',
          actionLabel: label,
          previousState: snapshot as unknown as Record<string, unknown>,
          nextState: snapshot as unknown as Record<string, unknown>,
        });
      },

      // ========== Serialization ==========

      getCanvasData: () => {
        const state = get();
        return {
          drawings: state.drawingOrder.map((id) => state.drawings[id]).filter((d): d is DrawingPath => !!d),
          shapes: state.elementOrder.map((id) => state.elements[id]).filter((s): s is Shape => !!s),
          textElements: state.textOrder.map((id) => state.textElements[id]).filter((t): t is TextElement => !!t),
          walls: state.wallOrder.map((id) => state.walls[id]).filter((w): w is Wall => !!w),
          doors: state.doorOrder.map((id) => state.doors[id]).filter((d): d is Door => !!d),
          powerPoints: state.powerPointOrder.map((id) => state.powerPoints[id]).filter((pp): pp is PowerPoint => !!pp),
          viewBox: state.viewBox,
          wallScale: state.wallScale,
        };
      },
    }))
  )
);

// Convenience selectors
export const selectElementsInOrder = (state: CanvasState): Shape[] =>
  state.elementOrder.map((id) => state.elements[id]).filter((el): el is Shape => !!el);

export const selectWallsInOrder = (state: CanvasState): Wall[] =>
  state.wallOrder.map((id) => state.walls[id]).filter((w): w is Wall => !!w);

export const selectDoorsInOrder = (state: CanvasState): Door[] =>
  state.doorOrder.map((id) => state.doors[id]).filter((d): d is Door => !!d);

export const selectPowerPointsInOrder = (state: CanvasState): PowerPoint[] =>
  state.powerPointOrder.map((id) => state.powerPoints[id]).filter((pp): pp is PowerPoint => !!pp);

export const selectDrawingsInOrder = (state: CanvasState): DrawingPath[] =>
  state.drawingOrder.map((id) => state.drawings[id]).filter((d): d is DrawingPath => !!d);

export const selectTextElementsInOrder = (state: CanvasState): TextElement[] =>
  state.textOrder.map((id) => state.textElements[id]).filter((t): t is TextElement => !!t);
