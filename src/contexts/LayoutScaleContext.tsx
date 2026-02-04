/**
 * Layout Scale Context
 *
 * React context that provides scale state to all layout components.
 * Handles canvas sizing, zoom controls, and grid configuration.
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

import type {
  SpaceBounds,
  CanvasSize,
  ScaleState,
  GridConfig,
} from '../types/layout-scale';

import { calculateScale } from '../lib/layout/scale-calculator';
import { SCALE_CONSTANTS, clampZoom } from '../lib/layout/scale-utils';

/**
 * Context value interface
 */
export interface LayoutScaleContextValue {
  // Current scale state (null if not initialized)
  scale: ScaleState | null;

  // Space bounds from walls
  spaceBounds: SpaceBounds | null;
  setSpaceBounds: (bounds: SpaceBounds | null) => void;

  // Canvas size (read-only, managed by ResizeObserver)
  canvasSize: CanvasSize;

  // Zoom controls
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToCanvas: () => void;

  // Grid configuration
  gridConfig: GridConfig;
  setGridConfig: (config: GridConfig) => void;
  toggleSnapEnabled: () => void;
  toggleGridVisible: () => void;
  setGridSize: (size: number) => void;

  // Canvas ref for ResizeObserver
  canvasRef: RefObject<HTMLDivElement>;
}

/**
 * Default grid configuration
 */
const DEFAULT_GRID_CONFIG: GridConfig = {
  size: SCALE_CONSTANTS.DEFAULT_GRID_SIZE, // 10cm
  enabled: true,
  visible: true,
};

/**
 * Context instance
 */
export const LayoutScaleContext = createContext<LayoutScaleContextValue | null>(null);

/**
 * Provider props
 */
interface LayoutScaleProviderProps {
  children: ReactNode;
  initialSpaceBounds?: SpaceBounds | null;
  initialZoom?: number;
  initialGridConfig?: Partial<GridConfig>;
}

/**
 * Layout Scale Provider
 *
 * Provides scale state and controls to all child components.
 * Uses ResizeObserver to track canvas size changes.
 */
export function LayoutScaleProvider({
  children,
  initialSpaceBounds = null,
  initialZoom = 1.0,
  initialGridConfig,
}: LayoutScaleProviderProps): JSX.Element {
  // Space bounds state
  const [spaceBounds, setSpaceBounds] = useState<SpaceBounds | null>(initialSpaceBounds);

  // Canvas size state (managed by ResizeObserver)
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });

  // Zoom state
  const [zoom, setZoomState] = useState<number>(clampZoom(initialZoom));

  // Grid configuration state
  const [gridConfig, setGridConfigState] = useState<GridConfig>({
    ...DEFAULT_GRID_CONFIG,
    ...initialGridConfig,
  });

  // Canvas ref for ResizeObserver
  const canvasRef = useRef<HTMLDivElement>(null);

  // ResizeObserver to track canvas size
  useEffect(() => {
    if (!canvasRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height });
      }
    });

    observer.observe(canvasRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Calculate scale from current state
  const scale = useMemo((): ScaleState | null => {
    if (!spaceBounds || canvasSize.width === 0 || canvasSize.height === 0) {
      return null;
    }

    try {
      return calculateScale({
        spaceBounds,
        canvasSize,
        zoom,
        padding: SCALE_CONSTANTS.DEFAULT_PADDING,
      });
    } catch (error) {
      console.error('Failed to calculate scale:', error);
      return null;
    }
  }, [spaceBounds, canvasSize, zoom]);

  // Zoom controls
  const setZoom = useCallback((newZoom: number) => {
    setZoomState(clampZoom(newZoom));
  }, []);

  const zoomIn = useCallback(() => {
    setZoomState((prev) => clampZoom(prev + SCALE_CONSTANTS.ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomState((prev) => clampZoom(prev - SCALE_CONSTANTS.ZOOM_STEP));
  }, []);

  const fitToCanvas = useCallback(() => {
    setZoomState(1.0);
  }, []);

  // Grid configuration controls
  const setGridConfig = useCallback((config: GridConfig) => {
    setGridConfigState(config);
  }, []);

  const toggleSnapEnabled = useCallback(() => {
    setGridConfigState((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  }, []);

  const toggleGridVisible = useCallback(() => {
    setGridConfigState((prev) => ({
      ...prev,
      visible: !prev.visible,
    }));
  }, []);

  const setGridSize = useCallback((size: number) => {
    if (size > 0) {
      setGridConfigState((prev) => ({
        ...prev,
        size,
      }));
    }
  }, []);

  // Context value
  const contextValue = useMemo((): LayoutScaleContextValue => ({
    scale,
    spaceBounds,
    setSpaceBounds,
    canvasSize,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    fitToCanvas,
    gridConfig,
    setGridConfig,
    toggleSnapEnabled,
    toggleGridVisible,
    setGridSize,
    canvasRef,
  }), [
    scale,
    spaceBounds,
    canvasSize,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    fitToCanvas,
    gridConfig,
    setGridConfig,
    toggleSnapEnabled,
    toggleGridVisible,
    setGridSize,
  ]);

  return (
    <LayoutScaleContext.Provider value={contextValue}>
      {children}
    </LayoutScaleContext.Provider>
  );
}

/**
 * Hook to access layout scale context
 *
 * @throws Error if used outside of LayoutScaleProvider
 */
export function useLayoutScale(): LayoutScaleContextValue {
  const context = useContext(LayoutScaleContext);

  if (!context) {
    throw new Error(
      'useLayoutScale must be used within a LayoutScaleProvider. ' +
      'Make sure your component is wrapped in <LayoutScaleProvider>.'
    );
  }

  return context;
}

/**
 * Hook to check if inside a LayoutScaleProvider (doesn't throw)
 */
export function useLayoutScaleOptional(): LayoutScaleContextValue | null {
  return useContext(LayoutScaleContext);
}
