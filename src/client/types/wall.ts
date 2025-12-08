// Wall data structures and types

export interface Wall {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  length?: number; // Calculated or user-defined
  angle?: number; // In degrees
  color?: string;
  snapToGrid?: boolean;
  snapAngle?: number; // Snapped angle if applicable
}

export interface WallMakerConfig {
  gridSize: number; // Grid size in pixels (e.g., 10, 20, 50)
  snapToGrid: boolean;
  snapAngles: number[]; // Angles to snap to (e.g., [0, 45, 90, 135, 180])
  defaultThickness: number;
  showMeasurements: boolean;
  showAngles: boolean;
  showGrid: boolean;
}

export interface WallMakerState {
  walls: Wall[];
  isDrawing: boolean;
  currentWall: Partial<Wall> | null;
  history: Wall[][]; // For undo/redo
  historyIndex: number;
}

export interface Door {
  id: string;
  wallId: string;
  position: number; // Position along wall (0-1, where 0 is start, 1 is end)
  width: number; // Door width in pixels
  openingDirection: 'left' | 'right' | 'both' | 'inward'; // Which side the door opens
  hingeSide?: 'start' | 'end'; // Which end of the door opening is the hinge
}

