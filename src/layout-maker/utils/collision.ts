/**
 * Collision Detection Utilities
 *
 * AABB (Axis-Aligned Bounding Box) collision detection for layout elements.
 * - Check if two elements collide
 * - Find all elements colliding with a given element
 * - Find all elements within a bounding box
 */

import type { BaseElement } from '../types/elements';

interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get the bounding box of an element
 * Handles rotation by calculating the AABB of the rotated element
 *
 * @param element - The element to get bounds for
 * @returns The bounding box (AABB) of the element
 */
export function getElementBounds(element: BaseElement): ElementBounds {
  const { x, y, width, height, rotation = 0 } = element;

  if (rotation === 0) {
    return { x, y, width, height };
  }

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const newWidth = width * cos + height * sin;
  const newHeight = width * sin + height * cos;

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return {
    x: centerX - newWidth / 2,
    y: centerY - newHeight / 2,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Check if two elements collide using AABB collision detection
 *
 * Rules:
 * - Don't check element against itself
 * - Don't check element against its children (table and chairs)
 * - Don't check elements in the same group
 * - Zones can overlap anything (they don't trigger collisions)
 *
 * @param a - First element
 * @param b - Second element
 * @param buffer - Optional buffer distance (default: 0.05m)
 * @returns true if elements collide
 */
export function elementsCollide(
  a: BaseElement,
  b: BaseElement,
  buffer: number = 0.05
): boolean {
  if (!a || !b) return false;

  // Skip self
  if (a.id === b.id) return false;

  // Skip parent-child relationships
  if (a.parentId === b.id || b.parentId === a.id) return false;

  // Skip same group
  if (a.groupId !== null && a.groupId === b.groupId) return false;

  // Skip zones (they don't trigger collisions)
  const isZoneA = a.type.startsWith('zone-');
  const isZoneB = b.type.startsWith('zone-');
  if (isZoneA || isZoneB) return false;

  // Get bounding boxes with buffer
  const boundsA = getElementBounds(a);
  const boundsB = getElementBounds(b);

  const aLeft = boundsA.x - buffer;
  const aRight = boundsA.x + boundsA.width + buffer;
  const aTop = boundsA.y - buffer;
  const aBottom = boundsA.y + boundsA.height + buffer;

  const bLeft = boundsB.x - buffer;
  const bRight = boundsB.x + boundsB.width + buffer;
  const bTop = boundsB.y - buffer;
  const bBottom = boundsB.y + boundsB.height + buffer;

  // Check for intersection (AABB collision)
  const noOverlap = (
    aRight < bLeft ||
    aLeft > bRight ||
    aBottom < bTop ||
    aTop > bBottom
  );

  return !noOverlap;
}

/**
 * Find all elements that collide with the given element
 *
 * @param elementId - ID of the element to check
 * @param elements - All elements in the layout
 * @param buffer - Optional buffer distance (default: 0.05m)
 * @returns Array of element IDs that collide with the given element
 */
export function findCollisions(
  elementId: string,
  elements: Record<string, BaseElement>,
  buffer: number = 0.05
): string[] {
  const targetElement = elements[elementId];
  if (!targetElement) return [];

  const collisions: string[] = [];

  Object.entries(elements).forEach(([id, element]) => {
    if (elementsCollide(targetElement, element, buffer)) {
      collisions.push(id);
    }
  });

  return collisions;
}

/**
 * Find all collision pairs in the layout
 *
 * @param elements - All elements in the layout
 * @param buffer - Optional buffer distance (default: 0.05m)
 * @returns Array of [id1, id2] pairs that collide
 */
export function findAllCollisions(
  elements: Record<string, BaseElement>,
  buffer: number = 0.05
): Array<[string, string]> {
  const elementIds = Object.keys(elements);
  const collisions: Array<[string, string]> = [];
  const checkedPairs = new Set<string>();

  for (let i = 0; i < elementIds.length; i++) {
    const idA = elementIds[i]!;
    const elementA = elements[idA];
    if (!elementA) continue;

    for (let j = i + 1; j < elementIds.length; j++) {
      const idB = elementIds[j]!;
      const elementB = elements[idB];
      if (!elementB) continue;

      const pairKey = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      if (elementsCollide(elementA, elementB, buffer)) {
        collisions.push([idA, idB]);
      }
    }
  }

  return collisions;
}

/**
 * Find all elements within a bounding box
 *
 * @param bounds - The bounding box to search within
 * @param elements - All elements in the layout
 * @param buffer - Optional buffer to expand the search area (default: 0)
 * @returns Array of element IDs within the bounds
 */
export function findElementsInBounds(
  bounds: ViewportBounds,
  elements: Record<string, BaseElement>,
  buffer: number = 0
): string[] {
  const searchBounds = {
    x: bounds.x - buffer,
    y: bounds.y - buffer,
    width: bounds.width + buffer * 2,
    height: bounds.height + buffer * 2,
  };

  const found: string[] = [];

  Object.entries(elements).forEach(([id, element]) => {
    // Zones can be partially outside bounds, check center point
    if (element.type.startsWith('zone-')) {
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      const centerInBounds = (
        centerX >= searchBounds.x &&
        centerX <= searchBounds.x + searchBounds.width &&
        centerY >= searchBounds.y &&
        centerY <= searchBounds.y + searchBounds.height
      );
      if (centerInBounds) {
        found.push(id);
      }
    } else {
      // For non-zones, check if element is within bounds
      const elementLeft = element.x;
      const elementRight = element.x + element.width;
      const elementTop = element.y;
      const elementBottom = element.y + element.height;

      const inBounds = !(
        elementRight < searchBounds.x ||
        elementLeft > searchBounds.x + searchBounds.width ||
        elementBottom < searchBounds.y ||
        elementTop > searchBounds.y + searchBounds.height
      );

      if (inBounds) {
        found.push(id);
      }
    }
  });

  return found;
}

/**
 * Check if an element is completely within bounds
 *
 * @param element - The element to check
 * @param bounds - The bounding box
 * @returns true if element is completely within bounds
 */
export function isElementInBounds(
  element: BaseElement,
  bounds: ViewportBounds
): boolean {
  return (
    element.x >= bounds.x &&
    element.y >= bounds.y &&
    element.x + element.width <= bounds.x + bounds.width &&
    element.y + element.height <= bounds.y + bounds.height
  );
}

/**
 * Get the bounding box that contains all given elements
 *
 * @param elementIds - Array of element IDs
 * @param elements - All elements in the layout
 * @returns The bounding box containing all elements, or null if empty
 */
export function getElementsBoundingBox(
  elementIds: string[],
  elements: Record<string, BaseElement>
): ViewportBounds | null {
  if (elementIds.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elementIds.forEach(id => {
    const element = elements[id];
    if (!element) return;

    minX = Math.min(minX, element.x);
    minY = Math.min(minY, element.y);
    maxX = Math.max(maxX, element.x + element.width);
    maxY = Math.max(maxY, element.y + element.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate the overlap area between two elements
 *
 * @param a - First element
 * @param b - Second element
 * @returns The overlap area in square units, or 0 if no overlap
 */
export function getOverlapArea(
  a: BaseElement,
  b: BaseElement
): number {
  const aLeft = a.x;
  const aRight = a.x + a.width;
  const aTop = a.y;
  const aBottom = a.y + a.height;

  const bLeft = b.x;
  const bRight = b.x + b.width;
  const bTop = b.y;
  const bBottom = b.y + b.height;

  // Calculate overlap
  const overlapLeft = Math.max(aLeft, bLeft);
  const overlapRight = Math.min(aRight, bRight);
  const overlapTop = Math.max(aTop, bTop);
  const overlapBottom = Math.min(aBottom, bBottom);

  // Check if there's actually overlap
  if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) {
    return 0;
  }

  // Calculate area
  const overlapWidth = overlapRight - overlapLeft;
  const overlapHeight = overlapBottom - overlapTop;

  return overlapWidth * overlapHeight;
}

/**
 * Check if one element is completely inside another
 *
 * @param inner - The potentially inner element
 * @param outer - The potentially outer element
 * @returns true if inner is completely inside outer
 */
export function isElementInsideElement(
  inner: BaseElement,
  outer: BaseElement
): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/**
 * Find the nearest element (by distance between centers)
 *
 * @param elementId - ID of the element to find nearest to
 * @param elements - All elements in the layout
 * @param filter - Optional filter function
 * @returns The nearest element ID, or null if not found
 */
export function findNearestElement(
  elementId: string,
  elements: Record<string, BaseElement>,
  filter?: (element: BaseElement) => boolean
): string | null {
  const target = elements[elementId];
  if (!target) return null;

  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;

  let nearestId: string | null = null;
  let nearestDistance = Infinity;

  Object.entries(elements).forEach(([id, element]) => {
    if (id === elementId) return;
    if (filter && !filter(element)) return;

    const elementCenterX = element.x + element.width / 2;
    const elementCenterY = element.y + element.height / 2;

    const distance = Math.sqrt(
      Math.pow(elementCenterX - targetCenterX, 2) +
      Math.pow(elementCenterY - targetCenterY, 2)
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestId = id;
    }
  });

  return nearestId;
};

export type { ViewportBounds };
