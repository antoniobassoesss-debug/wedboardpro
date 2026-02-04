/**
 * Layout Keyboard Hook
 *
 * Keyboard shortcuts for layout canvas interactions.
 */

import { useEffect, useCallback } from 'react';
import { useLayoutScale } from '../contexts/LayoutScaleContext';

/**
 * Options for keyboard shortcuts
 */
export interface UseLayoutKeyboardOptions {
  /** Called when Delete/Backspace is pressed */
  onDelete?: () => void;
  /** Called when Escape is pressed */
  onEscape?: () => void;
  /** Called when Ctrl+A is pressed */
  onSelectAll?: () => void;
  /** Called when Ctrl+C is pressed */
  onCopy?: () => void;
  /** Called when Ctrl+V is pressed */
  onPaste?: () => void;
  /** Called when Ctrl+Z is pressed */
  onUndo?: () => void;
  /** Called when Ctrl+Shift+Z or Ctrl+Y is pressed */
  onRedo?: () => void;
  /** Whether keyboard shortcuts are enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts in the layout canvas.
 *
 * Shortcuts:
 * - Ctrl/Cmd + : Zoom in
 * - Ctrl/Cmd - : Zoom out
 * - Ctrl/Cmd 0 : Fit to canvas
 * - G : Toggle grid visibility
 * - S : Toggle snap to grid
 * - Delete/Backspace : Delete selected
 * - Escape : Deselect / cancel drag
 * - Ctrl/Cmd A : Select all
 */
export function useLayoutKeyboard(options: UseLayoutKeyboardOptions = {}) {
  const { enabled = true } = options;
  const {
    zoomIn,
    zoomOut,
    fitToCanvas,
    toggleSnapEnabled,
    toggleGridVisible,
  } = useLayoutScale();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // Zoom controls
      if (isCtrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      } else if (isCtrl && e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (isCtrl && e.key === '0') {
        e.preventDefault();
        fitToCanvas();
      }

      // Grid controls (only when not holding Ctrl)
      else if (e.key === 'g' && !isCtrl) {
        toggleGridVisible();
      } else if (e.key === 's' && !isCtrl) {
        toggleSnapEnabled();
      }

      // Element controls
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        options.onDelete?.();
      } else if (e.key === 'Escape') {
        options.onEscape?.();
      }

      // Selection
      else if (isCtrl && e.key === 'a') {
        e.preventDefault();
        options.onSelectAll?.();
      }

      // Clipboard
      else if (isCtrl && e.key === 'c') {
        options.onCopy?.();
      } else if (isCtrl && e.key === 'v') {
        options.onPaste?.();
      }

      // Undo/Redo
      else if (isCtrl && e.key === 'z' && !isShift) {
        e.preventDefault();
        options.onUndo?.();
      } else if (isCtrl && ((e.key === 'z' && isShift) || e.key === 'y')) {
        e.preventDefault();
        options.onRedo?.();
      }
    },
    [
      enabled,
      zoomIn,
      zoomOut,
      fitToCanvas,
      toggleSnapEnabled,
      toggleGridVisible,
      options,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useLayoutKeyboard;
