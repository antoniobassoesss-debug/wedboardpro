/**
 * useCollision Hook
 *
 * Collision detection system for layout elements:
 * - Real-time collision checking during drag
 * - Support for bounding box queries
 * - Visual feedback for collisions
 * - Collision rules (ignore children, zones, etc.)
 */

import { useCallback, useMemo } from 'react';
import { useLayoutStore } from '../stores';
import {
  elementsCollide,
  findCollisions,
  findAllCollisions,
  findElementsInBounds,
} from '../utils';
import type { BaseElement } from '../types/elements';

interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseCollisionReturn {
  // State
  collidingIds: Set<string>;
  isOverlapping: boolean;

  // Collision checking
  checkCollision: (elementId: string) => string[];
  checkCollisionWithBounds: (bounds: ViewportBounds) => string[];
  checkPotentialCollision: (bounds: { x: number; y: number; width: number; height: number }, excludeId?: string) => string[];

  // Element state
  isColliding: (elementId: string) => boolean;

  // Update during drag
  updateCollisions: (elementIds: string[]) => void;
  clearCollisions: () => void;

  // Visual feedback helpers
  getCollisionStyle: (elementId: string) => React.CSSProperties | null;
}

const COLLISION_BUFFER = 0.05; // 5cm buffer

export function useCollision(): UseCollisionReturn {
  const layoutStore = useLayoutStore();

  // Memoized all elements from store
  const allElements = useMemo((): Record<string, BaseElement> => {
    return layoutStore.layout?.elements || {};
  }, [layoutStore.layout]);

  // Memoized set of all colliding IDs from all collisions
  const collidingIds = useMemo((): Set<string> => {
    const collisions = findAllCollisions(allElements, COLLISION_BUFFER);
    const ids = new Set<string>();
    collisions.forEach(([idA, idB]) => {
      ids.add(idA);
      ids.add(idB);
    });
    return ids;
  }, [allElements]);

  // Memoized check if element is a zone
  const isZone = useCallback((elementId: string): boolean => {
    const element = allElements[elementId];
    if (!element) return false;
    return element.type.startsWith('zone-');
  }, [allElements]);

  // Check collision for a single element
  const checkCollision = useCallback((elementId: string): string[] => {
    return findCollisions(elementId, allElements, COLLISION_BUFFER);
  }, [allElements]);

  // Check collision with bounding box
  const checkCollisionWithBounds = useCallback((bounds: ViewportBounds): string[] => {
    return findElementsInBounds(bounds, allElements, COLLISION_BUFFER);
  }, [allElements]);

  // Check potential collision with proposed bounds
  const checkPotentialCollision = useCallback((
    bounds: { x: number; y: number; width: number; height: number },
    excludeId?: string
  ): string[] => {
    const collisions: string[] = [];

    Object.entries(allElements).forEach(([id, element]) => {
      if (id === excludeId) return;
      if (isZone(id)) return;

      if (elementsCollide({ ...element, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } as BaseElement, element, COLLISION_BUFFER)) {
        collisions.push(id);
      }
    });

    return collisions;
  }, [allElements, isZone]);

  // Check if specific element is colliding
  const isColliding = useCallback((elementId: string): boolean => {
    return collidingIds.has(elementId);
  }, [collidingIds]);

  // Update collisions during drag (for real-time feedback)
  const updateCollisions = useCallback((elementIds: string[]) => {
    const newCollidingIds = new Set<string>(collidingIds);

    elementIds.forEach(id => {
      const collisions = checkCollision(id);
      collisions.forEach(collisionId => {
        newCollidingIds.add(collisionId);
      });
    });

    return newCollidingIds;
  }, [checkCollision, collidingIds]);

  // Clear all collisions
  const clearCollisions = useCallback(() => {
    // Collisions are recalculated automatically from elements, no state to clear
  }, []);

  // Get CSS styles for collision visual feedback
  const getCollisionStyle = useCallback((elementId: string): React.CSSProperties | null => {
    if (!isColliding(elementId)) return null;

    return {
      outline: '2px solid #EF4444',
      outlineOffset: '2px',
      animation: 'collision-pulse 0.5s ease-in-out infinite',
    };
  }, [isColliding]);

  return {
    collidingIds,
    isOverlapping: collidingIds.size > 0,
    checkCollision,
    checkCollisionWithBounds,
    checkPotentialCollision,
    isColliding,
    updateCollisions,
    clearCollisions,
    getCollisionStyle,
  };
}

// CSS for collision animation (to be added globally or via styled-components)
export const COLLISION_CSS = `
@keyframes collision-pulse {
  0%, 100% {
    outline-color: #EF4444;
    outline-width: 2px;
  }
  50% {
    outline-color: #FCA5A5;
    outline-width: 3px;
  }
}
`;

export default useCollision;
