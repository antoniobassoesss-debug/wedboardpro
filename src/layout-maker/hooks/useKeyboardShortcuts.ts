/**
 * useKeyboardShortcuts Hook
 *
 * Global keyboard shortcut handler for the Layout Maker.
 * Handles selection, editing, clipboard, undo/redo, and more.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLayoutStore, useSelectionStore, useViewportStore, useUIStore, useHistoryStore } from '../stores';
import { useToast } from '../components/common/Toast';
import type { BaseElement } from '../types/elements';

interface ClipboardData {
  elements: Record<string, BaseElement>;
  elementOrder: string[];
}

interface UseKeyboardShortcutsProps {
  onDeselectAll?: () => void;
  onDeleteSelected?: () => void;
  onSelectAll?: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onNudge?: (deltaX: number, deltaY: number) => void;
  onRotate?: (degrees: number) => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onToggleSnap?: () => void;
  onToggleGrid?: () => void;
  onSelectTool?: () => void;
  onHandTool?: () => void;
  onFitToContent?: () => void;
  onZoomTo100?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleLock?: () => void;
}

const CLIPBOARD_KEY = 'layout-maker-clipboard';
const NUDGE_SMALL = 1;
const NUDGE_LARGE = 10;
const DUPLICATE_OFFSET = 20;

export function useKeyboardShortcuts(props: UseKeyboardShortcutsProps = {}): void {
  const layoutStore = useLayoutStore();
  const selectionStore = useSelectionStore();
  const viewportStore = useViewportStore();
  const uiStore = useUIStore();
  const historyStore = useHistoryStore();
  const { showSuccess, showInfo } = useToast();

  const clipboardRef = useRef<ClipboardData | null>(null);
  const spacePressedRef = useRef(false);

  const getSelectedElements = useCallback((): BaseElement[] => {
    const layout = layoutStore.layout;
    if (!layout) return [];
    return selectionStore.selectedIds
      .map((id) => layout.elements[id])
      .filter((el): el is BaseElement => el !== undefined);
  }, [layoutStore, selectionStore]);

  const serializeElements = useCallback((elements: BaseElement[]): ClipboardData => {
    const elementMap: Record<string, BaseElement> = {};
    const elementOrder: string[] = [];

    for (const element of elements) {
      const newId = `${element.id}-copy`;
      elementMap[newId] = {
        ...element,
        id: newId,
        label: element.label ? `${element.label} (copy)` : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      elementOrder.push(newId);
    }

    return { elements: elementMap, elementOrder };
  }, []);

  const deserializeElements = useCallback(
    (data: ClipboardData, offsetX: number, offsetY: number): Array<Omit<BaseElement, 'id' | 'createdAt' | 'updatedAt'>> => {
      const result: Array<Omit<BaseElement, 'id' | 'createdAt' | 'updatedAt'>> = [];

      for (const id of data.elementOrder) {
        const element = data.elements[id];
        if (element) {
          result.push({
            ...element,
            x: element.x + offsetX,
            y: element.y + offsetY,
          });
        }
      }

      return result;
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, metaKey, ctrlKey, shiftKey, altKey } = event;
      const cmd = metaKey || ctrlKey;

      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (key === ' ') {
        if (!spacePressedRef.current) {
          spacePressedRef.current = true;
          uiStore.setActiveTool('hand');
        }
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        selectionStore.deselectAll();
        if (props.onDeselectAll) props.onDeselectAll();
        return;
      }

      if (key === 'Delete' || key === 'Backspace') {
        event.preventDefault();
        const count = selectionStore.selectedIds.length;
        if (count > 0) {
          if (props.onDeleteSelected) props.onDeleteSelected();
          showSuccess(`${count} element${count > 1 ? 's' : ''} deleted`);
        }
        return;
      }

      if (cmd && key === 'a') {
        event.preventDefault();
        const layout = layoutStore.layout;
        if (layout && props.onSelectAll) {
          props.onSelectAll();
          showInfo(`Selected all ${layout.elementOrder.length} elements`);
        }
        return;
      }

      if (cmd && key === 'd') {
        event.preventDefault();
        const count = selectionStore.selectedIds.length;
        if (count > 0) {
          if (props.onDuplicate) props.onDuplicate();
          showSuccess(`${count} element${count > 1 ? 's' : ''} duplicated`);
        }
        return;
      }

      if (cmd && key === 'c') {
        event.preventDefault();
        const elements = getSelectedElements();
        if (elements.length > 0) {
          const data = serializeElements(elements);
          try {
            localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(data));
            clipboardRef.current = data;
            showSuccess(`${elements.length} element${elements.length > 1 ? 's' : ''} copied`);
          } catch (e) {
            console.error('Failed to copy to clipboard:', e);
          }
        }
        if (props.onCopy) props.onCopy();
        return;
      }

      if (cmd && key === 'x') {
        event.preventDefault();
        const elements = getSelectedElements();
        if (elements.length > 0) {
          const data = serializeElements(elements);
          try {
            localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(data));
            clipboardRef.current = data;
          } catch (e) {
            console.error('Failed to cut to clipboard:', e);
          }

          const previousState = {
            elements: { ...layoutStore.layout?.elements },
            elementOrder: [...(layoutStore.layout?.elementOrder || [])],
          };

          selectionStore.selectedIds.forEach((id) => {
            layoutStore.deleteElement(id);
          });

          const nextState = {
            elements: { ...layoutStore.layout?.elements },
            elementOrder: [...(layoutStore.layout?.elementOrder || [])],
          };

          historyStore.record('DELETE_ELEMENTS', 'Cut elements', previousState, nextState);
          showSuccess(`${elements.length} element${elements.length > 1 ? 's' : ''} cut`);
        }
        if (props.onCut) props.onCut();
        return;
      }

      if (cmd && key === 'v') {
        event.preventDefault();
        try {
          const stored = localStorage.getItem(CLIPBOARD_KEY);
          if (stored) {
            const data = JSON.parse(stored) as ClipboardData;
            const offsetX = shiftKey ? DUPLICATE_OFFSET * 3 : DUPLICATE_OFFSET;
            const offsetY = shiftKey ? DUPLICATE_OFFSET * 3 : DUPLICATE_OFFSET;
            const newElements = deserializeElements(data, offsetX, offsetY);

            const previousState = {
              elements: { ...layoutStore.layout?.elements },
              elementOrder: [...(layoutStore.layout?.elementOrder || [])],
            };

            const newIds: string[] = [];
            newElements.forEach((el) => {
              const id = layoutStore.addElement(el);
              if (id) newIds.push(id);
            });

            selectionStore.selectMultiple(newIds);

            const nextState = {
              elements: { ...layoutStore.layout?.elements },
              elementOrder: [...(layoutStore.layout?.elementOrder || [])],
            };

            historyStore.record(
              'ADD_ELEMENTS',
              `Paste ${newElements.length} element${newElements.length > 1 ? 's' : ''}`,
              previousState,
              nextState
            );
            showSuccess(`${newElements.length} element${newElements.length > 1 ? 's' : ''} pasted`);
          }
        } catch (e) {
          console.error('Failed to paste from clipboard:', e);
        }
        if (props.onPaste) props.onPaste();
        return;
      }

      if (cmd && key === 'z') {
        event.preventDefault();
        if (shiftKey) {
          historyStore.redo();
          showInfo('Redo');
        } else {
          historyStore.undo();
          showInfo('Undo');
        }
        return;
      }

      if (cmd && key === 'g') {
        event.preventDefault();
        if (shiftKey) {
          if (props.onUngroup) props.onUngroup();
        } else {
          if (props.onGroup) props.onGroup();
        }
        return;
      }

      if (key === 'l' && !cmd && !shiftKey) {
        event.preventDefault();
        if (props.onToggleLock) {
          props.onToggleLock();
        } else {
          const count = selectionStore.selectedIds.length;
          if (count > 0) {
            const elements = getSelectedElements();
            const allLocked = elements.every(el => el.locked);
            selectionStore.selectedIds.forEach(id => {
              const element = layoutStore.getElementById(id);
              if (element) {
                layoutStore.updateElement(id, { locked: !allLocked });
              }
            });
            showInfo(allLocked ? 'Elements unlocked' : `${count} element${count > 1 ? 's' : ''} locked`);
          }
        }
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        event.preventDefault();
        const nudgeAmount = shiftKey ? NUDGE_LARGE : NUDGE_SMALL;
        let deltaX = 0;
        let deltaY = 0;

        switch (key) {
          case 'ArrowUp':
            deltaY = -nudgeAmount;
            break;
          case 'ArrowDown':
            deltaY = nudgeAmount;
            break;
          case 'ArrowLeft':
            deltaX = -nudgeAmount;
            break;
          case 'ArrowRight':
            deltaX = nudgeAmount;
            break;
        }

        if (props.onNudge) {
          props.onNudge(deltaX, deltaY);
        } else {
          const previousState = {
            elements: { ...layoutStore.layout?.elements },
            elementOrder: [...(layoutStore.layout?.elementOrder || [])],
          };

          selectionStore.selectedIds.forEach((id) => {
            const element = layoutStore.getElementById(id);
            if (element && !element.locked) {
              layoutStore.updateElement(id, {
                x: element.x + deltaX,
                y: element.y + deltaY,
              });
            }
          });

          const nextState = {
            elements: { ...layoutStore.layout?.elements },
            elementOrder: [...(layoutStore.layout?.elementOrder || [])],
          };

          historyStore.record(
            'MOVE_ELEMENTS',
            `Nudge ${selectionStore.selectedIds.length} element${selectionStore.selectedIds.length > 1 ? 's' : ''}`,
            previousState,
            nextState
          );
        }
        return;
      }

      if (key === 'r' && !cmd) {
        event.preventDefault();
        const degrees = shiftKey ? -15 : 15;
        const count = selectionStore.selectedIds.length;
        
        if (props.onRotate) {
          props.onRotate(degrees);
        } else {
          const previousState = {
            elements: { ...layoutStore.layout?.elements },
            elementOrder: [...(layoutStore.layout?.elementOrder || [])],
          };

          selectionStore.selectedIds.forEach((id) => {
            const element = layoutStore.getElementById(id);
            if (element && !element.locked) {
              const newRotation = (element.rotation + degrees + 360) % 360;
              layoutStore.updateElement(id, { rotation: newRotation });
            }
          });

          const nextState = {
            elements: { ...layoutStore.layout?.elements },
            elementOrder: [...(layoutStore.layout?.elementOrder || [])],
          };

          historyStore.record(
            'ROTATE_ELEMENT',
            `Rotate ${count} element${count > 1 ? 's' : ''} ${degrees}°`,
            previousState,
            nextState
          );
          showInfo(degrees > 0 ? `Rotated +${degrees}°` : `Rotated ${degrees}°`);
        }
        return;
      }

      if (key === '[') {
        event.preventDefault();
        if (cmd) {
          if (props.onSendToBack) props.onSendToBack();
        } else {
          if (props.onSendBackward) props.onSendBackward();
        }
        return;
      }

      if (key === ']') {
        event.preventDefault();
        if (cmd) {
          if (props.onBringToFront) props.onBringToFront();
        } else {
          if (props.onBringForward) props.onBringForward();
        }
        return;
      }

      if (key === 's' && !cmd && !shiftKey) {
        event.preventDefault();
        if (props.onToggleSnap) props.onToggleSnap();
        else uiStore.toggleSnap();
        showInfo(`Snap ${uiStore.snapEnabled ? 'enabled' : 'disabled'}`);
        return;
      }

      if (key === 'g' && !cmd && !shiftKey) {
        event.preventDefault();
        if (props.onToggleGrid) props.onToggleGrid();
        else uiStore.toggleGrid();
        showInfo(`Grid ${uiStore.showGrid ? 'enabled' : 'disabled'}`);
        return;
      }

      if (key === 'v' && !cmd && !shiftKey) {
        event.preventDefault();
        if (props.onSelectTool) props.onSelectTool();
        else uiStore.setActiveTool('select');
        return;
      }

      if (key === 'h' && !cmd && !shiftKey) {
        event.preventDefault();
        if (props.onHandTool) props.onHandTool();
        else uiStore.setActiveTool('hand');
        return;
      }

      if (cmd && key === '0') {
        event.preventDefault();
        if (props.onFitToContent) props.onFitToContent();
        else {
          const layout = layoutStore.layout;
          if (layout && layout.elementOrder.length > 0) {
            viewportStore.fitToElements(layout.elementOrder, (id) => {
              const el = layout.elements[id];
              return el ? { x: el.x, y: el.y, width: el.width, height: el.height } : null;
            });
          } else {
            viewportStore.resetView();
          }
        }
        return;
      }

      if (cmd && key === '1') {
        event.preventDefault();
        if (props.onZoomTo100) props.onZoomTo100();
        else viewportStore.zoomTo(1);
        return;
      }

      if ((cmd && (key === '+' || key === '=')) || (cmd && key === '=' && !shiftKey)) {
        event.preventDefault();
        if (props.onZoomIn) props.onZoomIn();
        else viewportStore.zoomIn();
        return;
      }

      if (cmd && key === '-') {
        event.preventDefault();
        if (props.onZoomOut) props.onZoomOut();
        else viewportStore.zoomOut();
        return;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        spacePressedRef.current = false;
        uiStore.setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    layoutStore,
    selectionStore,
    viewportStore,
    uiStore,
    historyStore,
    props,
    getSelectedElements,
    serializeElements,
    deserializeElements,
    showSuccess,
    showInfo,
  ]);
}

export default useKeyboardShortcuts;
