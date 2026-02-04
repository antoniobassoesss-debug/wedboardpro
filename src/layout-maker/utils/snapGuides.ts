/**
 * Snap Guides Utilities
 *
 * Snap calculation for layout elements:
 * - Grid snap (round to gridSize)
 * - Element snap: center-to-center and edge-to-edge alignment
 * - Wall snap to venue boundaries
 */

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
  snapEnabled?: boolean;
  venueBounds?: WorldPoint[];
}

interface SnapResult {
  snappedPosition: WorldPoint;
  guides: SnapGuide[];
}

/**
 * Calculate snap for a dragging element
 *
 * @param draggingId - ID of the element being dragged
 * @param proposedPosition - Proposed new position (x, y)
 * @param elements - All elements in the layout
 * @param config - Snap configuration options
 * @returns Snapped position and array of active guides
 */
export function calculateSnap(
  draggingId: string,
  proposedPosition: WorldPoint,
  elements: Record<string, BaseElement>,
  config?: SnapConfig
): SnapResult {
  const element = elements[draggingId];
  if (!element) {
    return { snappedPosition: proposedPosition, guides: [] };
  }

  const gridSize = config?.gridSize ?? 0.5;
  const snapThreshold = config?.snapThreshold ?? 0.15;
  const snapEnabled = config?.snapEnabled ?? true;
  const venueBounds = config?.venueBounds ?? [];

  if (!snapEnabled) {
    return { snappedPosition: proposedPosition, guides: [] };
  }

  let snappedX = proposedPosition.x;
  let snappedY = proposedPosition.y;
  const guides: SnapGuide[] = [];

  const abs = Math.abs;

  // Priority 1: Edge snap (most precise)
  Object.entries(elements).forEach(([id, other]) => {
    if (id === draggingId) return;
    if (other.type.startsWith('zone-')) return;

    const otherLeft = other.x;
    const otherRight = other.x + other.width;
    const otherTop = other.y;
    const otherBottom = other.y + other.height;

    // Left edge
    if (abs(proposedPosition.x - otherLeft) < snapThreshold) {
      snappedX = proposedPosition.x + (otherLeft - proposedPosition.x);
      guides.push({ type: 'vertical', position: otherLeft, sourceId: draggingId, targetId: id, snapType: 'edge' });
    }
    if (abs(proposedPosition.x - otherRight) < snapThreshold) {
      snappedX = proposedPosition.x + (otherRight - proposedPosition.x);
      guides.push({ type: 'vertical', position: otherRight, sourceId: draggingId, targetId: id, snapType: 'edge' });
    }
    // Right edge
    if (abs(proposedPosition.x + element.width - otherRight) < snapThreshold) {
      snappedX = proposedPosition.x + (otherRight - (proposedPosition.x + element.width));
      guides.push({ type: 'vertical', position: otherRight, sourceId: draggingId, targetId: id, snapType: 'edge' });
    }
    if (abs(proposedPosition.x + element.width - otherLeft) < snapThreshold) {
      snappedX = proposedPosition.x + (otherLeft - (proposedPosition.x + element.width));
      guides.push({ type: 'vertical', position: otherLeft, sourceId: draggingId, targetId: id, snapType: 'edge' });
    }
    // Top edge
    if (abs(proposedPosition.y - otherTop) < snapThreshold) {
      snappedY = proposedPosition.y + (otherTop - proposedPosition.y);
      guides.push({ type: 'horizontal', position: otherTop, sourceId: draggingId, targetId: id, snapType: 'edge' });
    }
    if (abs(proposedPosition.y - otherBottom) < snapThreshold) {
      snappedY = proposedPosition.y + (otherBottom - proposedPosition.y);
      guides.push({ type: 'horizontal', position: otherBottom, sourceId: draggingId, targetId: id, snapType: 'edge' });
    }
    // Bottom edge
    if (abs(proposedPosition.y + element.height - otherBottom) < snapThreshold) {
      snappedY = proposedPosition.y + (otherBottom - (proposedPosition.y + element.height));
      guides.push({ type: 'horizontal', position: otherBottom, sourceId: draggingId, targetId: id, snapType: 'edge' });
    }
    if (abs(proposedPosition.y + element.height - otherTop) < snapThreshold) {
      snappedY = proposedPosition.y + (otherTop - (proposedPosition.y + element.height));
      guides.push({ type: 'horizontal', position: otherTop, sourceId: draggingId, targetId: id, snapType: 'edge' });
    }
  });

  // Priority 2: Center snap
  const elementCenterX = snappedX + element.width / 2;
  const elementCenterY = snappedY + element.height / 2;

  Object.entries(elements).forEach(([id, other]) => {
    if (id === draggingId) return;
    if (other.type.startsWith('zone-')) return;

    const otherCenterX = other.x + other.width / 2;
    const otherCenterY = other.y + other.height / 2;

    if (abs(elementCenterX - otherCenterX) < snapThreshold) {
      snappedX = snappedX + (otherCenterX - elementCenterX);
      guides.push({ type: 'vertical', position: otherCenterX, sourceId: draggingId, targetId: id, snapType: 'center' });
    }
    if (abs(elementCenterY - otherCenterY) < snapThreshold) {
      snappedY = snappedY + (otherCenterY - elementCenterY);
      guides.push({ type: 'horizontal', position: otherCenterY, sourceId: draggingId, targetId: id, snapType: 'center' });
    }
  });

  // Priority 3: Wall snap
  venueBounds.forEach((corner) => {
    if (abs(proposedPosition.x - corner.x) < snapThreshold) {
      snappedX = proposedPosition.x + (corner.x - proposedPosition.x);
      guides.push({ type: 'vertical', position: corner.x, sourceId: draggingId, snapType: 'wall' });
    }
    if (abs(proposedPosition.x + element.width - corner.x) < snapThreshold) {
      snappedX = proposedPosition.x + (corner.x - (proposedPosition.x + element.width));
      guides.push({ type: 'vertical', position: corner.x, sourceId: draggingId, snapType: 'wall' });
    }
    if (abs(proposedPosition.y - corner.y) < snapThreshold) {
      snappedY = proposedPosition.y + (corner.y - proposedPosition.y);
      guides.push({ type: 'horizontal', position: corner.y, sourceId: draggingId, snapType: 'wall' });
    }
    if (abs(proposedPosition.y + element.height - corner.y) < snapThreshold) {
      snappedY = proposedPosition.y + (corner.y - (proposedPosition.y + element.height));
      guides.push({ type: 'horizontal', position: corner.y, sourceId: draggingId, snapType: 'wall' });
    }
  });

  // Priority 4: Grid snap (last)
  const gridCenterX = Math.round(elementCenterX / gridSize) * gridSize;
  const gridCenterY = Math.round(elementCenterY / gridSize) * gridSize;

  if (abs(elementCenterX - gridCenterX) < snapThreshold) {
    snappedX = snappedX + (gridCenterX - elementCenterX);
    guides.push({ type: 'vertical', position: gridCenterX, sourceId: draggingId, snapType: 'grid' });
  }
  if (abs(elementCenterY - gridCenterY) < snapThreshold) {
    snappedY = snappedY + (gridCenterY - elementCenterY);
    guides.push({ type: 'horizontal', position: gridCenterY, sourceId: draggingId, snapType: 'grid' });
  }

  return { snappedPosition: { x: snappedX, y: snappedY }, guides };
}

export type { WorldPoint, SnapResult, SnapConfig };
