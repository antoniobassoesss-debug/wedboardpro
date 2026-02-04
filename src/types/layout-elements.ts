export type LengthUnit = 'cm' | 'm';

export type TableType = 'table-rectangular' | 'table-round' | 'table-oval';

export type SeatArrangement = 'standard' | 'u-shape' | 'l-shape' | 'custom';

export interface SeatPosition {
  id: string;
  localX: number;
  localY: number;
  angle: number;
  guestId?: string;
  guestName?: string;
  dietaryType?: DietaryType;
  allergyFlags?: string[];
}

export type DietaryType = 
  | 'regular' 
  | 'vegetarian' 
  | 'vegan' 
  | 'halal' 
  | 'kosher' 
  | 'gluten-free' 
  | 'other';

export interface TableDimensions {
  width: number;
  height: number;
  diameter: number | undefined;
  unit: LengthUnit;
}

export interface ChairConfig {
  count: number;
  arrangement: SeatArrangement;
  spacing: number;
  offset: number;
  autoGenerate: boolean;
}

export interface TableElement {
  id: string;
  type: TableType;
  x: number;
  y: number;
  dimensions: TableDimensions;
  rotation: number;
  locked: boolean;
  tableNumber: string;
  capacity: number;
  seats: SeatPosition[];
  chairConfig: ChairConfig;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  color?: string;
}

export interface ChairElement {
  id: string;
  type: 'chair';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  parentTableId: string | null;
  seatIndex: number;
  assignedGuestId: string | null;
  assignedGuestName: string | null;
  dietaryType: DietaryType;
  allergyFlags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ElectricalElement {
  id: string;
  type: 'electrical-outlet' | 'electrical-cable' | 'power-point';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  powerRating: number;
  voltage: number;
  phases: number;
  connectedElements: string[];
  cableLength?: number;
  cablePath?: { x: number; y: number }[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface DecorElement {
  id: string;
  type: 'flower-arrangement' | 'arch' | 'candelabra' | 'lantern' | 'garland' | 'custom-decor';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  decorCategory: string;
  color?: string;
  heightFromFloor?: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface StageElement {
  id: string;
  type: 'stage';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  stageHeight: number;
  stageHeightUnit: LengthUnit;
  hasStairs: boolean;
  stairPosition: 'left' | 'right' | 'center' | 'both';
  hasRamp: boolean;
  rampPosition?: string;
  surfaceMaterial: string;
  loadCapacity: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface DanceFloorElement {
  id: string;
  type: 'dance-floor';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  surfaceType: 'wood' | 'vinyl' | 'led' | 'custom';
  finish: 'matte' | 'glossy' | 'textured';
  edgeStyle: 'straight' | 'rounded' | 'border';
  borderColor?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export type LayoutElement = 
  | TableElement 
  | ChairElement 
  | ElectricalElement 
  | DecorElement 
  | StageElement 
  | DanceFloorElement;

export interface LayoutSettings {
  unit: LengthUnit;
  gridSize: number;
  gridEnabled: boolean;
  snapToGrid: boolean;
  snapThreshold: number;
  showDimensions: boolean;
  showSeatLabels: boolean;
  defaultChairOffset: number;
  defaultChairSpacing: number;
  canvasBackground: string;
}

export interface SelectionState {
  selectedIds: Set<string>;
  selectionBox: { x: number; y: number; width: number; height: number } | null;
  lastSelectedId: string | null;
}

export interface ClipboardState {
  elements: LayoutElement[];
  operation: 'copy' | 'cut' | null;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: 'add' | 'update' | 'delete' | 'move' | 'rotate' | 'resize';
  elementIds: string[];
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  currentIndex: number;
  maxHistorySize: number;
}

export interface LayoutState {
  elements: Map<string, LayoutElement>;
  selection: SelectionState;
  clipboard: ClipboardState;
  history: HistoryState;
  settings: LayoutSettings;
  canvas: {
    width: number;
    height: number;
    scale: number;
    offsetX: number;
    offsetY: number;
  };
}

export const DEFAULT_TABLE_DIMENSIONS: Record<TableType, TableDimensions> = {
  'table-rectangular': { width: 180, height: 90, diameter: undefined, unit: 'cm' },
  'table-round': { width: 150, height: 150, diameter: 150, unit: 'cm' },
  'table-oval': { width: 200, height: 100, diameter: undefined, unit: 'cm' },
};

export const DEFAULT_CHAIR_CONFIG: ChairConfig = {
  count: 8,
  arrangement: 'standard',
  spacing: 0.4,
  offset: 0.1,
  autoGenerate: true,
};

export const DEFAULT_STAGE_HEIGHT: { standard: number; podium: number; runway: number } = {
  standard: 0.6,
  podium: 1.0,
  runway: 0.3,
};

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  unit: 'cm',
  gridSize: 10,
  gridEnabled: true,
  snapToGrid: true,
  snapThreshold: 5,
  showDimensions: true,
  showSeatLabels: true,
  defaultChairOffset: 0.1,
  defaultChairSpacing: 0.4,
  canvasBackground: '#f5f5f5',
};

export function createDefaultTableElement(
  id: string,
  type: TableType,
  x: number,
  y: number
): TableElement {
  const dimensions = DEFAULT_TABLE_DIMENSIONS[type];
  const capacity = type === 'table-round' ? 8 : type === 'table-oval' ? 10 : 8;
  
  return {
    id,
    type,
    x,
    y,
    dimensions,
    rotation: 0,
    locked: false,
    tableNumber: '',
    capacity,
    seats: [],
    chairConfig: { ...DEFAULT_CHAIR_CONFIG },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultChairElement(
  id: string,
  x: number,
  y: number,
  parentTableId: string | null = null,
  seatIndex: number = 0
): ChairElement {
  return {
    id,
    type: 'chair',
    x,
    y,
    width: 0.45,
    height: 0.45,
    rotation: 0,
    locked: false,
    parentTableId,
    seatIndex,
    assignedGuestId: null,
    assignedGuestName: null,
    dietaryType: 'regular',
    allergyFlags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultElectricalElement(
  id: string,
  type: 'electrical-outlet' | 'electrical-cable' | 'power-point',
  x: number,
  y: number
): ElectricalElement {
  return {
    id,
    type,
    x,
    y,
    width: 0.1,
    height: 0.1,
    rotation: 0,
    locked: false,
    powerRating: 16,
    voltage: 230,
    phases: 1,
    connectedElements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultDecorElement(
  id: string,
  decorType: DecorElement['type'],
  x: number,
  y: number
): DecorElement {
  return {
    id,
    type: decorType,
    x,
    y,
    width: 0.3,
    height: 0.3,
    rotation: 0,
    locked: false,
    decorCategory: decorType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultStageElement(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): StageElement {
  return {
    id,
    type: 'stage',
    x,
    y,
    width,
    height,
    rotation: 0,
    locked: false,
    stageHeight: DEFAULT_STAGE_HEIGHT.standard,
    stageHeightUnit: 'm',
    hasStairs: true,
    stairPosition: 'right',
    hasRamp: false,
    surfaceMaterial: 'wood',
    loadCapacity: 500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultDanceFloorElement(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): DanceFloorElement {
  return {
    id,
    type: 'dance-floor',
    x,
    y,
    width,
    height,
    rotation: 0,
    locked: false,
    surfaceType: 'wood',
    finish: 'matte',
    edgeStyle: 'straight',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultLayoutState(): LayoutState {
  return {
    elements: new Map(),
    selection: {
      selectedIds: new Set(),
      selectionBox: null,
      lastSelectedId: null,
    },
    clipboard: {
      elements: [],
      operation: null,
    },
    history: {
      past: [],
      future: [],
      currentIndex: -1,
      maxHistorySize: 50,
    },
    settings: { ...DEFAULT_LAYOUT_SETTINGS },
    canvas: {
      width: 2000,
      height: 1500,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    },
  };
}
