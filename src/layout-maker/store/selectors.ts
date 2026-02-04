/**
 * Canvas Store Selectors
 *
 * Memoized selectors for derived state.
 * Use these in components to minimize re-renders.
 */

import { useCanvasStore, type CanvasState, type Shape, type Wall, type Door, type PowerPoint, type DrawingPath, type TextElement } from './canvasStore';
import { useShallow } from 'zustand/react/shallow';
import { useCallback, useMemo } from 'react';

// ========== Basic Selectors ==========

export const useActiveProjectId = () =>
  useCanvasStore((s) => s.activeProjectId);

export const useSupabaseLayoutId = () =>
  useCanvasStore((s) => s.supabaseLayoutId);

export const useA4Bounds = () =>
  useCanvasStore((s) => s.a4Bounds);

export const useViewBox = () =>
  useCanvasStore((s) => s.viewBox);

export const useSyncStatus = () =>
  useCanvasStore((s) => s.syncStatus);

export const usePendingChanges = () =>
  useCanvasStore((s) => s.pendingChanges);

export const useSyncError = () =>
  useCanvasStore((s) => s.syncError);

export const useLastSyncedAt = () =>
  useCanvasStore((s) => s.lastSyncedAt);

// ========== Element Selectors ==========

export const useElementIds = () =>
  useCanvasStore(useShallow((s) => s.elementOrder));

export const useElement = (id: string) =>
  useCanvasStore(useCallback((s) => s.elements[id], [id]));

export const useElements = () =>
  useCanvasStore(useShallow((s) => {
    return s.elementOrder.map((id) => s.elements[id]).filter((el): el is Shape => !!el);
  }));

export const useSelectedElementIds = () =>
  useCanvasStore(useShallow((s) => s.selectedElementIds));

export const useSelectedElements = () =>
  useCanvasStore(useShallow((s) => {
    return s.selectedElementIds.map((id) => s.elements[id]).filter((el): el is Shape => !!el);
  }));

export const useIsElementSelected = (id: string) =>
  useCanvasStore(useCallback((s) => s.selectedElementIds.includes(id), [id]));

// ========== Wall Selectors ==========

export const useWallIds = () =>
  useCanvasStore(useShallow((s) => s.wallOrder));

export const useWall = (id: string) =>
  useCanvasStore(useCallback((s) => s.walls[id], [id]));

export const useWalls = () =>
  useCanvasStore(useShallow((s) => {
    return s.wallOrder.map((id) => s.walls[id]).filter((w): w is Wall => !!w);
  }));

// ========== Door Selectors ==========

export const useDoorIds = () =>
  useCanvasStore(useShallow((s) => s.doorOrder));

export const useDoor = (id: string) =>
  useCanvasStore(useCallback((s) => s.doors[id], [id]));

export const useDoors = () =>
  useCanvasStore(useShallow((s) => {
    return s.doorOrder.map((id) => s.doors[id]).filter((d): d is Door => !!d);
  }));

export const useDoorsForWall = (wallId: string) =>
  useCanvasStore(useShallow(
    (s) =>
      s.doorOrder
        .map((id) => s.doors[id])
        .filter((d): d is Door => !!d && d.wallId === wallId)
  ));

// ========== Power Point Selectors ==========

export const usePowerPointIds = () =>
  useCanvasStore(useShallow((s) => s.powerPointOrder));

export const usePowerPoint = (id: string) =>
  useCanvasStore(useCallback((s) => s.powerPoints[id], [id]));

export const usePowerPoints = () =>
  useCanvasStore(useShallow((s) => {
    return s.powerPointOrder.map((id) => s.powerPoints[id]).filter((pp): pp is PowerPoint => !!pp);
  }));

// ========== Drawing Selectors ==========

export const useDrawingIds = () =>
  useCanvasStore(useShallow((s) => s.drawingOrder));

export const useDrawing = (id: string) =>
  useCanvasStore(useCallback((s) => s.drawings[id], [id]));

export const useDrawings = () =>
  useCanvasStore(useShallow((s) => {
    return s.drawingOrder.map((id) => s.drawings[id]).filter((d): d is DrawingPath => !!d);
  }));

// ========== Text Selectors ==========

export const useTextIds = () =>
  useCanvasStore(useShallow((s) => s.textOrder));

export const useText = (id: string) =>
  useCanvasStore(useCallback((s) => s.textElements[id], [id]));

export const useTextElements = () =>
  useCanvasStore(useShallow((s) => {
    return s.textOrder.map((id) => s.textElements[id]).filter((t): t is TextElement => !!t);
  }));

// ========== Computed Selectors ==========

/**
 * Get total count of all canvas elements
 */
export const useTotalElementCount = () =>
  useCanvasStore(
    (s) =>
      s.elementOrder.length +
      s.wallOrder.length +
      s.doorOrder.length +
      s.powerPointOrder.length +
      s.drawingOrder.length +
      s.textOrder.length
  );

/**
 * Get elements that are "spaces" (rectangles with meter dimensions)
 */
export const useSpaceElements = () =>
  useCanvasStore(useShallow((s) => {
    return s.elementOrder
      .map((id) => s.elements[id])
      .filter(
        (el): el is Shape =>
          !!el &&
          el.type === 'rectangle' &&
          typeof el.spaceMetersWidth === 'number' &&
          el.spaceMetersWidth > 0 &&
          typeof el.spaceMetersHeight === 'number' &&
          el.spaceMetersHeight > 0
      );
  }));

/**
 * Get elements that are tables (have tableData)
 */
export const useTableElements = () =>
  useCanvasStore(useShallow((s) => {
    return s.elementOrder
      .map((id) => s.elements[id])
      .filter((el): el is Shape => !!el && !!el.tableData);
  }));

/**
 * Get total seating capacity from all tables
 */
export const useTotalSeatingCapacity = () =>
  useCanvasStore((s) => {
    return s.elementOrder
      .map((id) => s.elements[id])
      .filter((el) => el?.tableData)
      .reduce((sum, el) => sum + (el?.tableData?.seats || 0), 0);
  });

/**
 * Get wall bounds (bounding box of all walls)
 */
export const useWallBounds = () =>
  useCanvasStore((s) => {
    const walls = s.wallOrder.map((id) => s.walls[id]).filter((w): w is Wall => !!w);
    if (walls.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const wall of walls) {
      minX = Math.min(minX, wall.startX, wall.endX);
      minY = Math.min(minY, wall.startY, wall.endY);
      maxX = Math.max(maxX, wall.startX, wall.endX);
      maxY = Math.max(maxY, wall.startY, wall.endY);
    }

    if (!isFinite(minX)) return null;

    return { minX, minY, maxX, maxY };
  });

// ========== Action Hooks ==========

/**
 * Get all element-related actions
 */
export const useElementActions = () =>
  useCanvasStore(useShallow(
    (s) => ({
      addElement: s.addElement,
      updateElement: s.updateElement,
      moveElement: s.moveElement,
      resizeElement: s.resizeElement,
      deleteElement: s.deleteElement,
      selectElement: s.selectElement,
      selectElements: s.selectElements,
      setElements: s.setElements,
    })
  ));

/**
 * Get all wall-related actions
 */
export const useWallActions = () =>
  useCanvasStore(useShallow(
    (s) => ({
      addWall: s.addWall,
      updateWall: s.updateWall,
      deleteWall: s.deleteWall,
      setWalls: s.setWalls,
    })
  ));

/**
 * Get all door-related actions
 */
export const useDoorActions = () =>
  useCanvasStore(useShallow(
    (s) => ({
      addDoor: s.addDoor,
      updateDoor: s.updateDoor,
      deleteDoor: s.deleteDoor,
    })
  ));

/**
 * Get all power point actions
 */
export const usePowerPointActions = () =>
  useCanvasStore(useShallow(
    (s) => ({
      addPowerPoint: s.addPowerPoint,
      updatePowerPoint: s.updatePowerPoint,
      deletePowerPoint: s.deletePowerPoint,
      setPowerPoints: s.setPowerPoints,
    })
  ));

/**
 * Get all drawing actions
 */
export const useDrawingActions = () =>
  useCanvasStore(useShallow(
    (s) => ({
      addDrawing: s.addDrawing,
      updateDrawing: s.updateDrawing,
      deleteDrawing: s.deleteDrawing,
      setDrawings: s.setDrawings,
    })
  ));

/**
 * Get all text actions
 */
export const useTextActions = () =>
  useCanvasStore(useShallow(
    (s) => ({
      addText: s.addText,
      updateText: s.updateText,
      deleteText: s.deleteText,
      setTextElements: s.setTextElements,
    })
  ));

/**
 * Get sync-related actions
 */
export const useSyncActions = () =>
  useCanvasStore(useShallow(
    (s) => ({
      markDirty: s.markDirty,
      markSynced: s.markSynced,
      setSyncStatus: s.setSyncStatus,
      setSyncError: s.setSyncError,
    })
  ));

/**
 * Get project lifecycle actions
 */
export const useProjectActions = () =>
  useCanvasStore(useShallow(
    (s) => ({
      initializeProject: s.initializeProject,
      switchProject: s.switchProject,
      clearProject: s.clearProject,
      setSupabaseLayoutId: s.setSupabaseLayoutId,
    })
  ));

/**
 * Get canvas data serialization function
 */
export const useGetCanvasData = () =>
  useCanvasStore((s) => s.getCanvasData);
