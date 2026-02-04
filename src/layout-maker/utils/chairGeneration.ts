/**
 * Chair Generation Utilities
 *
 * Algorithms for generating chair positions around tables.
 * Handles round, rectangular, oval, and square tables with various capacities.
 */

import type { ChairElement } from '../types/elements';
import { CHAIR_CONFIG_DEFAULTS } from '../constants';

/**
 * Chair position relative to table center
 */
export interface ChairPosition {
  localX: number;
  localY: number;
  rotation: number;
  seatIndex: number;
}

/**
 * Configuration for chair generation
 */
export interface ChairGenerationConfig {
  tableType: 'round' | 'rectangular' | 'oval' | 'square';
  tableWidth: number;
  tableHeight: number;
  capacity: number;
  chairOffset?: number;
}

/**
 * Result of redistributing chairs when capacity changes
 */
export interface ChairRedistributionResult {
  toAdd: ChairPosition[];
  toRemove: string[];
  toUpdate: Array<{ id: string; position: ChairPosition }>;
}

/**
 * Generate chair positions for a round table
 * Chairs are distributed evenly around the circle
 */
function generateRoundTableChairs(config: ChairGenerationConfig): ChairPosition[] {
  const { tableWidth, capacity, chairOffset = CHAIR_CONFIG_DEFAULTS.chairOffset } = config;
  const radius = tableWidth / 2 + chairOffset;
  const chairs: ChairPosition[] = [];

  for (let i = 0; i < capacity; i++) {
    const angle = (i / capacity) * 2 * Math.PI - Math.PI / 2;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    const rotation = ((angle * 180) / Math.PI) + 180;

    chairs.push({
      localX: x,
      localY: y,
      rotation: normalizeAngle(rotation),
      seatIndex: i,
    });
  }

  return chairs;
}

/**
 * Generate chair positions for a rectangular table
 * Standard seating is on the long sides only
 * For capacity > 10, also add chairs on short sides
 */
function generateRectangularTableChairs(config: ChairGenerationConfig): ChairPosition[] {
  const { tableWidth, tableHeight, capacity, chairOffset = CHAIR_CONFIG_DEFAULTS.chairOffset } = config;
  const chairs: ChairPosition[] = [];

  const longSideChairs = Math.ceil(capacity / 2);
  const useShortSides = capacity > 10;
  const shortSideChairs = useShortSides ? capacity - longSideChairs * 2 : 0;

  const topY = -tableHeight / 2 - chairOffset;
  const bottomY = tableHeight / 2 + chairOffset;
  const leftX = -tableWidth / 2 - chairOffset;
  const rightX = tableWidth / 2 + chairOffset;

  const longSideSpacing = (tableWidth - chairOffset * 2) / (longSideChairs + 1);
  const shortSideSpacing = (tableHeight - chairOffset * 2) / (Math.max(1, shortSideChairs) + 1);

  let seatIndex = 0;

  for (let i = 0; i < longSideChairs && seatIndex < capacity; i++) {
    const x = -tableWidth / 2 + longSideSpacing * (i + 1);
    chairs.push({
      localX: x,
      localY: topY,
      rotation: 180,
      seatIndex: seatIndex++,
    });
  }

  for (let i = 0; i < longSideChairs && seatIndex < capacity; i++) {
    const x = tableWidth / 2 - longSideSpacing * (i + 1);
    chairs.push({
      localX: x,
      localY: bottomY,
      rotation: 0,
      seatIndex: seatIndex++,
    });
  }

  if (useShortSides && shortSideChairs > 0) {
    for (let i = 0; i < shortSideChairs / 2 && seatIndex < capacity; i++) {
      const y = -tableHeight / 2 + shortSideSpacing * (i + 1);
      chairs.push({
        localX: leftX,
        localY: y,
        rotation: 90,
        seatIndex: seatIndex++,
      });
    }

    for (let i = 0; i < Math.ceil(shortSideChairs / 2) && seatIndex < capacity; i++) {
      const y = tableHeight / 2 - shortSideSpacing * (i + 1);
      chairs.push({
        localX: rightX,
        localY: y,
        rotation: -90,
        seatIndex: seatIndex++,
      });
    }
  }

  return chairs;
}

/**
 * Generate chair positions for an oval table
 * Chairs are distributed along an elliptical path
 */
function generateOvalTableChairs(config: ChairGenerationConfig): ChairPosition[] {
  const { tableWidth, tableHeight, capacity, chairOffset = CHAIR_CONFIG_DEFAULTS.chairOffset } = config;
  const chairs: ChairPosition[] = [];

  const radiusX = tableWidth / 2 + chairOffset;
  const radiusY = tableHeight / 2 + chairOffset;

  for (let i = 0; i < capacity; i++) {
    const angle = (i / capacity) * 2 * Math.PI - Math.PI / 2;
    const x = radiusX * Math.cos(angle);
    const y = radiusY * Math.sin(angle);
    const tangentAngle = Math.atan2(
      -radiusY * Math.sin(angle),
      radiusX * Math.cos(angle)
    );
    const rotation = ((tangentAngle * 180) / Math.PI) + 180;

    chairs.push({
      localX: x,
      localY: y,
      rotation: normalizeAngle(rotation),
      seatIndex: i,
    });
  }

  return chairs;
}

/**
 * Generate chair positions for a square table
 * Chairs are distributed evenly on all 4 sides
 */
function generateSquareTableChairs(config: ChairGenerationConfig): ChairPosition[] {
  const { tableWidth, capacity, chairOffset = CHAIR_CONFIG_DEFAULTS.chairOffset } = config;
  const chairs: ChairPosition[] = [];

  const chairsPerSide = Math.ceil(capacity / 4);
  const sideSpacing = (tableWidth - chairOffset * 2) / (chairsPerSide + 1);
  const offset = tableWidth / 2 + chairOffset;

  let seatIndex = 0;

  for (let i = 0; i < chairsPerSide && seatIndex < capacity; i++) {
    const pos = -tableWidth / 2 + sideSpacing * (i + 1);
    chairs.push({
      localX: pos,
      localY: -offset,
      rotation: 180,
      seatIndex: seatIndex++,
    });
  }

  for (let i = 0; i < chairsPerSide && seatIndex < capacity; i++) {
    const pos = tableWidth / 2 - sideSpacing * (i + 1);
    chairs.push({
      localX: offset,
      localY: pos,
      rotation: -90,
      seatIndex: seatIndex++,
    });
  }

  for (let i = 0; i < chairsPerSide && seatIndex < capacity; i++) {
    const pos = tableWidth / 2 - sideSpacing * (i + 1);
    chairs.push({
      localX: pos,
      localY: offset,
      rotation: 0,
      seatIndex: seatIndex++,
    });
  }

  for (let i = 0; i < chairsPerSide && seatIndex < capacity; i++) {
    const pos = -tableWidth / 2 + sideSpacing * (i + 1);
    chairs.push({
      localX: -offset,
      localY: -pos,
      rotation: 90,
      seatIndex: seatIndex++,
    });
  }

  return chairs;
}

/**
 * Main function to generate chair positions for any table type
 */
export function generateChairPositions(config: ChairGenerationConfig): ChairPosition[] {
  switch (config.tableType) {
    case 'round':
      return generateRoundTableChairs(config);
    case 'rectangular':
      return generateRectangularTableChairs(config);
    case 'oval':
      return generateOvalTableChairs(config);
    case 'square':
      return generateSquareTableChairs(config);
    default:
      return generateRoundTableChairs(config);
  }
}

/**
 * Redistribute chairs when capacity changes
 * Preserves guest assignments on existing chairs
 */
export function redistributeChairs(
  existingChairs: ChairElement[],
  newCapacity: number,
  config: ChairGenerationConfig
): ChairRedistributionResult {
  const newPositions = generateChairPositions({ ...config, capacity: newCapacity });
  const toRemove: string[] = [];
  const toUpdate: Array<{ id: string; position: ChairPosition }> = [];

  const sortedExisting = [...existingChairs].sort(
    (a, b) => (a.seatIndex || 0) - (b.seatIndex || 0)
  );

  const assignedChairs = sortedExisting.filter((c) => c.assignedGuestId != null);
  const unassignedChairs = sortedExisting.filter((c) => c.assignedGuestId == null);

  if (newCapacity >= existingChairs.length) {
    for (let i = 0; i < existingChairs.length; i++) {
      const existing = sortedExisting[i];
      const newPos = newPositions[i];

      if (existing && newPos) {
        toUpdate.push({
          id: existing.id,
          position: newPos,
        });
      }
    }
  } else {
    const keepAssigned = Math.min(assignedChairs.length, newCapacity);
    const keepUnassigned = newCapacity - keepAssigned;

    const chairsToKeep = [
      ...assignedChairs.slice(0, keepAssigned),
      ...unassignedChairs.slice(0, keepUnassigned),
    ];

    const chairsToRemove = sortedExisting.filter((c) => !chairsToKeep.find((k) => k.id === c.id));
    toRemove.push(...chairsToRemove.map((c) => c.id));

    for (let i = 0; i < chairsToKeep.length; i++) {
      const existing = chairsToKeep[i];
      const newPos = newPositions[i];

      if (existing && newPos) {
        toUpdate.push({
          id: existing.id,
          position: newPos,
        });
      }
    }
  }

  const toAdd = newPositions.slice(existingChairs.length);

  return { toAdd, toRemove, toUpdate };
}

/**
 * Calculate the optimal table size for a given capacity and table type
 */
export function calculateOptimalTableSize(
  tableType: 'round' | 'rectangular' | 'oval' | 'square',
  capacity: number
): { width: number; height: number } {
  switch (tableType) {
    case 'round':
      return {
        width: 0.6 + capacity * 0.15,
        height: 0.6 + capacity * 0.15,
      };
    case 'rectangular':
      return {
        width: 0.6 + capacity * 0.3,
        height: 0.75,
      };
    case 'oval':
      return {
        width: 0.8 + capacity * 0.18,
        height: 0.6 + capacity * 0.12,
      };
    case 'square':
      return {
        width: 0.6 + capacity * 0.2,
        height: 0.6 + capacity * 0.2,
      };
    default:
      return { width: 1.5, height: 1.5 };
  }
}

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

/**
 * Create chair element objects linked to a table
 * Returns an array of chair element objects ready to be added to the layout
 */
export function createChairsForTable(
  table: { id: string; x: number; y: number; rotation: number },
  positions: ChairPosition[],
  startSeatIndex: number = 0
): Omit<ChairElement, 'id' | 'createdAt' | 'updatedAt'>[] {
  const now = new Date().toISOString();

  return positions.map((pos, index) => {
    const cos = Math.cos((table.rotation * Math.PI) / 180);
    const sin = Math.sin((table.rotation * Math.PI) / 180);

    const rotatedX = pos.localX * cos - pos.localY * sin;
    const rotatedY = pos.localX * sin + pos.localY * cos;

    return {
      type: 'chair' as const,
      x: table.x + rotatedX - 0.225,
      y: table.y + rotatedY - 0.225,
      width: 0.45,
      height: 0.45,
      rotation: normalizeAngle(pos.rotation + table.rotation),
      zIndex: 0,
      groupId: null,
      parentId: table.id,
      locked: false,
      visible: true,
      label: '',
      notes: '',
      color: null,
      parentTableId: table.id,
      seatIndex: startSeatIndex + index,
      assignedGuestId: null,
      assignedGuestName: null,
      dietaryType: null,
      allergyFlags: [],
    };
  });
}
