/**
 * Element Type Definitions
 *
 * All element types for the Layout Maker canvas.
 * Dimensions are stored in METERS, not pixels.
 */

export interface Point {
  x: number;
  y: number;
}

// Element type union
export type ElementType =
  // Tables
  | 'table-round'
  | 'table-rectangular'
  | 'table-oval'
  | 'table-square'
  // Seating — individual (internal 'chair' type kept for table auto-fill)
  | 'chair'
  | 'seat-standard'
  | 'seat-armchair'
  | 'seat-chaise'
  | 'seat-sofa'    // sidebar entry — places seat-sofa-2 or seat-sofa-3
  | 'seat-sofa-2'
  | 'seat-sofa-3'
  | 'seat-bench'
  | 'seat-barstool'
  | 'seat-throne'
  // Seating — ceremony block
  | 'ceremony-block'
  // Ceremony elements
  | 'altar'
  | 'pathway'
  // Zones
  | 'dance-floor'
  | 'stage'
  | 'cocktail-area'
  | 'ceremony-area'
  // Service
  | 'bar'
  | 'cocktail'
  | 'buffet'
  | 'cake-table'
  | 'gift-table'
  | 'dj-booth'
  // Decoration
  | 'flower-arrangement'
  | 'photo-booth'
  | 'arch'
  | 'custom'
  // Audio Visual equipment
  | 'av-mixing-desk'
  | 'av-speaker'
  | 'av-subwoofer'
  | 'av-truss'
  | 'av-moving-head'
  | 'av-led-wall'
  | 'av-screen'
  | 'av-projector'
  | 'av-light-console'
  | 'av-preset-full-stage'
  // Lighting — anchor-based string decorations
  | 'string-lights'
  | 'bunting'
  // Custom template reference (format: custom-{uuid})
  | `custom-${string}`;

// Table types subset
export type TableType = 'table-round' | 'table-rectangular' | 'table-oval' | 'table-square';

// Zone types subset
export type ZoneType = 'dance-floor' | 'stage' | 'cocktail-area' | 'ceremony-area';

// Dietary type for chair assignments
export type DietaryType = 'regular' | 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'other' | null;

// Border style for zones
export type BorderStyle = 'solid' | 'dashed' | 'dotted';

/**
 * Base Element Interface
 *
 * All elements extend this interface.
 * Position (x, y) and dimensions (width, height) are in METERS.
 */
export interface BaseElement {
  // Identity
  id: string;
  type: ElementType;

  // Position (in METERS, relative to canvas origin)
  x: number;
  y: number;

  // Dimensions (in METERS)
  width: number;
  height: number;
  rotation: number; // Degrees (0-360)

  // Hierarchy
  zIndex: number;
  groupId: string | null;
  parentId: string | null;

  // State
  locked: boolean;
  visible: boolean;

  // Metadata
  label: string;
  notes: string;
  color: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Chair Configuration for Tables
 */
export interface ChairConfig {
  autoGenerate: boolean;
  chairSpacing: number; // Space between chairs (meters)
  chairOffset: number; // Distance from table edge (meters)
}

/**
 * Table Element
 *
 * Extends BaseElement with table-specific properties.
 */
export interface TableElement extends BaseElement {
  type: TableType;

  // Table-specific
  capacity: number;
  tableNumber: string;

  // Chair configuration
  chairConfig: ChairConfig;

  // Generated chairs (IDs of associated ChairElements)
  chairIds: string[];
}

/**
 * Chair Element
 *
 * Extends BaseElement with chair-specific properties.
 */
export interface ChairElement extends BaseElement {
  type: 'chair';

  // Chair-specific
  parentTableId: string | null;
  seatIndex: number;

  // Guest assignment
  assignedGuestId: string | null;
  assignedGuestName: string | null;

  // Dietary info (denormalized from guest)
  dietaryType: DietaryType;
  allergyFlags: string[];
}

/**
 * Zone Element
 *
 * Extends BaseElement with zone-specific properties.
 */
export interface ZoneElement extends BaseElement {
  type: ZoneType;

  // Zone-specific
  fillColor: string;
  borderStyle: BorderStyle;
  borderColor: string;

  // Capacity (optional, informational)
  estimatedCapacity: number | null;
}

// Seat type subset
export type SeatType =
  | 'seat-standard'
  | 'seat-armchair'
  | 'seat-chaise'
  | 'seat-sofa-2'
  | 'seat-sofa-3'
  | 'seat-bench'
  | 'seat-barstool'
  | 'seat-throne';

/**
 * Seat Element (individual seating — sidebar placed)
 * Uses BaseElement.label for throne/named seat labels (always set, defaults to type label).
 */
export interface SeatElement extends BaseElement {
  type: SeatType;
}

/**
 * Ceremony Seating Data
 */
export interface CeremonyData {
  mode: 'full-block' | 'row-by-row';
  seatsPerRow: number;    // per section (each side of the aisle)
  rowCount: number;
  seatWidthPx: number;    // SVG pixels
  seatHeightPx: number;   // SVG pixels
  rowGapPx: number;       // SVG pixels between rows
  seatGapPx: number;      // SVG pixels between seats in a row
  aisleWidthPx: number;   // SVG pixels (0 = no aisle)
  showLabels: boolean;
}

/**
 * Ceremony Block Element (full ceremony seating arrangement)
 */
export interface CeremonyElement extends BaseElement {
  type: 'ceremony-block';
  ceremonyData: CeremonyData;
}

/**
 * String Lights Element
 *
 * Anchor-based element defined by start anchor (x, y) and endAnchorOffset.
 * Rendered as a catenary wire with Edison/festoon bulbs.
 *
 * x, y          = start anchor (absolute meters)
 * endAnchorOffset = offset from start to end anchor (meters, can be negative)
 * width, height = |endAnchorOffset.x|, |endAnchorOffset.y| (bounding box)
 */
export interface StringLightsElement extends BaseElement {
  type: 'string-lights';
  endAnchorOffset: Point;
  bulbColor: 'warm-white' | 'cool-white' | 'multicolor' | string;
  bulbSize: 'small' | 'medium' | 'large';
  spacing: 'dense' | 'normal' | 'sparse';
  wireColor: string;
}

/**
 * Bunting / Arraial Flags Element
 *
 * Anchor-based element defined by start anchor (x, y) and endAnchorOffset.
 * Rendered as a catenary string with hanging triangular pennant flags.
 *
 * x, y          = start anchor (absolute meters)
 * endAnchorOffset = offset from start to end anchor (meters, can be negative)
 * width, height = |endAnchorOffset.x|, |endAnchorOffset.y| (bounding box)
 */
export interface BuntingElement extends BaseElement {
  type: 'bunting';
  endAnchorOffset: Point;
  colorScheme: 'arraial-classic' | 'rainbow' | 'solid' | 'custom';
  customColors: string[];
  flagSize: 'small' | 'medium' | 'large';
  flagShape: 'triangle' | 'rectangle';
  spacing: 'dense' | 'normal' | 'sparse';
  stringColor: string;
}

/**
 * Service Element (bar, buffet, etc.)
 */
export interface ServiceElement extends BaseElement {
  type: 'bar' | 'buffet' | 'cake-table' | 'gift-table' | 'dj-booth';
}

/**
 * Decoration Element
 */
export interface DecorationElement extends BaseElement {
  type: 'flower-arrangement' | 'photo-booth' | 'arch' | 'custom';
  customShape?: string; // SVG path for custom elements
}

/**
 * Curve control for custom element edges
 */
export type CurveControl =
  | null // Straight line
  | { type: 'bezier'; point: Point } // Custom bezier curve
  | { type: 'arc'; direction: 1 | -1 } // Perfect semicircle (1 = left, -1 = right)
  | Point; // Legacy format (bezier control point)

/**
 * Custom Element Template (saved in database)
 */
export interface CustomElementTemplate {
  id: string;
  plannerId: string;
  name: string;
  svgPath: string;
  width: number;
  height: number;
  vertices: Point[];
  curves?: CurveControl[]; // Curve data for each edge
  createdAt: string;
  updatedAt: string;
}

/**
 * Custom Element Instance (placed on canvas)
 */
export interface CustomElementInstance extends BaseElement {
  type: `custom-${string}`;
  templateId: string;
  customShape: string;
}

/**
 * Union type of all element types
 */
export type CanvasElement =
  | TableElement
  | ChairElement
  | ZoneElement
  | SeatElement
  | CeremonyElement
  | ServiceElement
  | DecorationElement
  | StringLightsElement
  | BuntingElement
  | CustomElementInstance;

/**
 * Type guard functions
 */
export function isTableElement(element: BaseElement): element is TableElement {
  return (
    element.type === 'table-round' ||
    element.type === 'table-rectangular' ||
    element.type === 'table-oval' ||
    element.type === 'table-square'
  );
}

export function isChairElement(element: BaseElement): element is ChairElement {
  return element.type === 'chair';
}

export function isZoneElement(element: BaseElement): element is ZoneElement {
  return (
    element.type === 'dance-floor' ||
    element.type === 'stage' ||
    element.type === 'cocktail-area' ||
    element.type === 'ceremony-area'
  );
}

export function isServiceElement(element: BaseElement): element is ServiceElement {
  return (
    element.type === 'bar' ||
    element.type === 'buffet' ||
    element.type === 'cake-table' ||
    element.type === 'gift-table' ||
    element.type === 'dj-booth'
  );
}

export function isDecorationElement(element: BaseElement): element is DecorationElement {
  return (
    element.type === 'flower-arrangement' ||
    element.type === 'photo-booth' ||
    element.type === 'arch' ||
    element.type === 'custom' ||
    (typeof element.type === 'string' && element.type.startsWith('custom-'))
  );
}

export function isStringLightsElement(element: BaseElement): element is StringLightsElement {
  return element.type === 'string-lights';
}

export function isBuntingElement(element: BaseElement): element is BuntingElement {
  return element.type === 'bunting';
}

export function isAnchorElement(element: BaseElement): element is StringLightsElement | BuntingElement {
  return element.type === 'string-lights' || element.type === 'bunting';
}

export function isCustomTemplate(element: BaseElement): element is CustomElementInstance {
  return typeof element.type === 'string' && element.type.startsWith('custom-');
}

export function isSeatElement(element: BaseElement): element is SeatElement {
  return (
    element.type === 'seat-standard' ||
    element.type === 'seat-armchair' ||
    element.type === 'seat-chaise' ||
    element.type === 'seat-sofa-2' ||
    element.type === 'seat-sofa-3' ||
    element.type === 'seat-bench' ||
    element.type === 'seat-barstool' ||
    element.type === 'seat-throne'
  );
}

export function isCeremonyElement(element: BaseElement): element is CeremonyElement {
  return element.type === 'ceremony-block';
}
