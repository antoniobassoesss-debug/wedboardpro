/**
 * useSnapGuides Hook
 *
 * Comprehensive snap system for layout elements:
 * - Grid snap (configurable grid size)
 * - Element center alignment
 * - Element edge alignment
 * - Wall snap (venue boundaries)
 * - Priority system (edge > center > grid)
 */

import { useCallback, useState, useMemo, useEffect } from 'react';
import { useLayoutStore } from '../stores';
import { calculateSnap as calculateSnapUtil } from '../utils/snapGuides';
import type { BaseElement } from '../types/elements';

interface WorldPoint {
  x: number;
  y: number;
}

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  sourceId: string;
  targetId?: string;
  snapType: 'grid' | 'edge' | 'center' | 'wall';
}

interface SnapConfig {
  gridSize?: number;
  snapThreshold?: number;
}

interface UseSnapGuidesReturn {
  guides: SnapGuide[];
  snapEnabled: boolean;
  gridSize: number;
  snapThreshold: number;

  calculateSnap: (
    draggingId: string,
    proposedPosition: WorldPoint,
    elements: Record<string, BaseElement>,
    config?: SnapConfig
  ) => { snappedPosition: WorldPoint; guides: SnapGuide[] };

  clearGuides: () => void;
  toggleSnap: () => void;
  setGridSize: (size: number) => void;
  setSnapThreshold: (threshold: number) => void;
}

// Default snap settings
const DEFAULT_GRID_SIZE = 0.5; // 0.5 meters
const DEFAULT_SNAP_THRESHOLD = 0.15; // 15cm

export function useSnapGuides(): UseSnapGuidesReturn {
  const layoutStore = useLayoutStore();

  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridSize, setGridSizeState] = useState(DEFAULT_GRID_SIZE);
  const [snapThreshold, setSnapThresholdState] = useState(DEFAULT_SNAP_THRESHOLD);
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  // Get all elements from store
  const allElements = useMemo((): Record<string, BaseElement> => {
    return layoutStore.layout?.elements || {};
  }, [layoutStore.layout]);

  // Get venue walls/bounds
  const venueBounds = useMemo((): WorldPoint[] => {
    const layout = layoutStore.layout;
    if (!layout?.space?.walls) return [];

    const walls = layout.space.walls;
    const bounds: WorldPoint[] = [];

    Object.values(walls).forEach(wall => {
      bounds.push({ x: wall.startX, y: wall.startY });
      bounds.push({ x: wall.endX, y: wall.endY });
    });

    return bounds;
  }, [layoutStore.layout]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setSnapEnabled(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        // Snap is re-enabled when Alt is released
        // The actual snap calculation checks the Alt key state
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Toggle snap
  const toggleSnap = useCallback(() => {
    setSnapEnabled(prev => !prev);
  }, []);

  // Set grid size
  const setGridSize = useCallback((size: number) => {
    setGridSizeState(Math.max(0.1, size));
  }, []);

  // Set snap threshold
  const setSnapThreshold = useCallback((threshold: number) => {
    setSnapThresholdState(Math.max(0.01, threshold));
  }, []);

  // Clear guides
  const clearGuides = useCallback(() => {
    setGuides([]);
  }, []);

  // Calculate snap using utility function
  const calculateSnap = useCallback((
    draggingId: string,
    proposedPosition: WorldPoint,
    elements: Record<string, BaseElement>,
    config?: SnapConfig
  ): { snappedPosition: WorldPoint; guides: SnapGuide[] } => {
    const effectiveGridSize = config?.gridSize ?? gridSize;
    const effectiveThreshold = config?.snapThreshold ?? snapThreshold;

    const result = calculateSnapUtil(draggingId, proposedPosition, elements, {
      gridSize: effectiveGridSize,
      snapThreshold: effectiveThreshold,
      snapEnabled,
      venueBounds,
    });

    setGuides(result.guides);
    return result;
  }, [gridSize, snapThreshold, snapEnabled, venueBounds]);

  return {
    guides,
    snapEnabled,
    gridSize,
    snapThreshold,
    calculateSnap,
    clearGuides,
    toggleSnap,
    setGridSize,
    setSnapThreshold,
  };
}
