/**
 * Wheel Zoom Hook
 *
 * Handles mouse wheel zoom with Ctrl modifier.
 */

import { useCallback, useEffect, type RefObject } from 'react';
import { useLayoutScale } from '../contexts/LayoutScaleContext';
import { SCALE_CONSTANTS } from '../lib/layout/scale-utils';

/**
 * Options for the wheel zoom hook
 */
export interface UseWheelZoomOptions {
  /** Require Ctrl key for zooming (default: true) */
  requireCtrl?: boolean;
  /** Custom zoom step (default: from SCALE_CONSTANTS) */
  zoomStep?: number;
}

/**
 * Hook for handling mouse wheel zoom.
 * Zooms centered on cursor position.
 */
export function useWheelZoom(
  canvasRef: RefObject<HTMLElement | null>,
  options: UseWheelZoomOptions = {}
) {
  const { requireCtrl = true, zoomStep = SCALE_CONSTANTS.ZOOM_STEP } = options;
  const { scale, zoom, setZoom } = useLayoutScale();

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Only zoom with Ctrl held (standard behavior) if required
      if (requireCtrl && !e.ctrlKey && !e.metaKey) {
        return;
      }

      e.preventDefault();

      if (!scale || !canvasRef.current) return;

      // Calculate zoom delta based on scroll direction
      const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
      const newZoom = Math.max(
        SCALE_CONSTANTS.MIN_ZOOM,
        Math.min(SCALE_CONSTANTS.MAX_ZOOM, zoom + delta)
      );

      setZoom(newZoom);
    },
    [scale, zoom, setZoom, canvasRef, requireCtrl, zoomStep]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel, canvasRef]);
}

export default useWheelZoom;
