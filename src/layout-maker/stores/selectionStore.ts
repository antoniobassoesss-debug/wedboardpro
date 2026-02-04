/**
 * Selection Store
 *
 * State store for element selection, hover state, and box selection.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface SelectionStore {
  selectedIds: string[];
  hoveredId: string | null;
  isSelecting: boolean;
  selectionBox: { startX: number; startY: number; endX: number; endY: number } | null;

  select: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  toggleSelection: (id: string) => void;
  selectAll: (allIds: string[]) => void;
  deselectAll: () => void;
  setHovered: (id: string | null) => void;

  startBoxSelection: (x: number, y: number) => void;
  updateBoxSelection: (x: number, y: number) => void;
  endBoxSelection: () => void;

  isSelected: (id: string) => boolean;
  getSelectedElements: <T extends { id: string }>(elements: T[]) => T[];
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      selectedIds: [],
      hoveredId: null,
      isSelecting: false,
      selectionBox: null,

      select: (id) =>
        set((state) => {
          state.selectedIds = [id];
        }),

      selectMultiple: (ids) =>
        set((state) => {
          state.selectedIds = [...ids];
        }),

      addToSelection: (id) =>
        set((state) => {
          if (!state.selectedIds.includes(id)) {
            state.selectedIds.push(id);
          }
        }),

      removeFromSelection: (id) =>
        set((state) => {
          state.selectedIds = state.selectedIds.filter((i) => i !== id);
        }),

      toggleSelection: (id) =>
        set((state) => {
          if (state.selectedIds.includes(id)) {
            state.selectedIds = state.selectedIds.filter((i) => i !== id);
          } else {
            state.selectedIds.push(id);
          }
        }),

      selectAll: (allIds) =>
        set((state) => {
          state.selectedIds = [...allIds];
        }),

      deselectAll: () =>
        set((state) => {
          state.selectedIds = [];
          state.selectionBox = null;
          state.isSelecting = false;
        }),

      setHovered: (id) =>
        set((state) => {
          state.hoveredId = id;
        }),

      startBoxSelection: (x, y) =>
        set((state) => {
          state.isSelecting = true;
          state.selectionBox = { startX: x, startY: y, endX: x, endY: y };
        }),

      updateBoxSelection: (x, y) =>
        set((state) => {
          if (state.selectionBox) {
            state.selectionBox.endX = x;
            state.selectionBox.endY = y;
          }
        }),

      endBoxSelection: () =>
        set((state) => {
          state.isSelecting = false;
          state.selectionBox = null;
        }),

      isSelected: (id) => {
        const state = get();
        return state.selectedIds.includes(id);
      },

      getSelectedElements: <T extends { id: string }>(elements: T[]) => {
        const state = get();
        return elements.filter((el) => state.selectedIds.includes(el.id));
      },

      clearSelection: () =>
        set((state) => {
          state.selectedIds = [];
        }),
    }))
  )
);
