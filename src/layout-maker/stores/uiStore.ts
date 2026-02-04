/**
 * UI Store
 *
 * State store for UI elements like sidebar, modals, tools, and toggles.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ElementType } from '../types/elements';

type SidebarTab = 'elements' | 'properties';
type ActiveModal = 'export' | 'import' | 'settings' | null;
type ActiveTool = 'select' | 'hand' | 'zoom';

interface DragState {
  isDragging: boolean;
  dragElementType: ElementType | null;
  dragPosition: { x: number; y: number } | null;
}

interface UIStore {
  sidebarOpen: boolean;
  activeSidebarTab: SidebarTab;
  activeModal: ActiveModal;

  activeTool: ActiveTool;

  showGrid: boolean;
  showRulers: boolean;
  showBackground: boolean;
  snapEnabled: boolean;

  dragState: DragState;

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  setActiveModal: (modal: ActiveModal) => void;
  closeModal: () => void;

  setActiveTool: (tool: ActiveTool) => void;

  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleBackground: () => void;
  toggleSnap: () => void;

  setShowGrid: (show: boolean) => void;
  setShowRulers: (show: boolean) => void;
  setShowBackground: (show: boolean) => void;
  setSnapEnabled: (enabled: boolean) => void;

  startDrag: (elementType: ElementType) => void;
  updateDragPosition: (position: { x: number; y: number }) => void;
  endDrag: () => void;
}

export const useUIStore = create<UIStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      sidebarOpen: true,
      activeSidebarTab: 'elements',
      activeModal: null,

      activeTool: 'select',

      showGrid: true,
      showRulers: true,
      showBackground: true,
      snapEnabled: true,

      dragState: {
        isDragging: false,
        dragElementType: null,
        dragPosition: null,
      },

      setSidebarOpen: (open) =>
        set((state) => {
          state.sidebarOpen = open;
        }),

      toggleSidebar: () =>
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        }),

      setActiveSidebarTab: (tab) =>
        set((state) => {
          state.activeSidebarTab = tab;
        }),

      setActiveModal: (modal) =>
        set((state) => {
          state.activeModal = modal;
        }),

      closeModal: () =>
        set((state) => {
          state.activeModal = null;
        }),

      setActiveTool: (tool) =>
        set((state) => {
          state.activeTool = tool;
        }),

      toggleGrid: () =>
        set((state) => {
          state.showGrid = !state.showGrid;
        }),

      toggleRulers: () =>
        set((state) => {
          state.showRulers = !state.showRulers;
        }),

      toggleBackground: () =>
        set((state) => {
          state.showBackground = !state.showBackground;
        }),

      toggleSnap: () =>
        set((state) => {
          state.snapEnabled = !state.snapEnabled;
        }),

      setShowGrid: (show) =>
        set((state) => {
          state.showGrid = show;
        }),

      setShowRulers: (show) =>
        set((state) => {
          state.showRulers = show;
        }),

      setShowBackground: (show) =>
        set((state) => {
          state.showBackground = show;
        }),

      setSnapEnabled: (enabled) =>
        set((state) => {
          state.snapEnabled = enabled;
        }),

      startDrag: (elementType) =>
        set((state) => {
          state.dragState = {
            isDragging: true,
            dragElementType: elementType,
            dragPosition: null,
          };
        }),

      updateDragPosition: (position) =>
        set((state) => {
          if (state.dragState.isDragging) {
            state.dragState.dragPosition = position;
          }
        }),

      endDrag: () =>
        set((state) => {
          state.dragState = {
            isDragging: false,
            dragElementType: null,
            dragPosition: null,
          };
        }),
    }))
  )
);
