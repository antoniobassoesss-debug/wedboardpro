/**
 * Layout Type Definitions
 *
 * Types for layout structure, walls, floor plans, and settings.
 */

import type { BaseElement } from './elements';
import type { GuestAssignment } from './guests';

/**
 * Layout Status
 */
export type LayoutStatus = 'draft' | 'in_progress' | 'ready' | 'approved';

/**
 * Measurement Unit
 */
export type MeasurementUnit = 'meters' | 'feet';

/**
 * Wall Interface
 *
 * Represents a wall segment in the venue space.
 * Coordinates are in the same unit system as elements (meters).
 */
export interface Wall {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  color?: string;
}

/**
 * Calibration Points for Floor Plan Import
 */
export interface CalibrationPoints {
  point1: { x: number; y: number };
  point2: { x: number; y: number };
  distanceMeters: number;
}

/**
 * Floor Plan Background
 *
 * Imported floor plan image used as a reference layer.
 */
export interface FloorPlanBackground {
  id: string;
  imageUrl: string;
  originalFilename: string;

  // Position (in meters, relative to canvas origin)
  x: number;
  y: number;

  // Scale
  pixelsPerMeter: number;
  width: number; // Display width in meters
  height: number; // Display height in meters
  rotation: number; // Degrees

  // Display
  opacity: number; // 0-1
  locked: boolean;
  visible: boolean;

  // Calibration data (for recalibration)
  calibrationPoints: CalibrationPoints;
}

/**
 * Layout Settings
 *
 * User preferences for the layout editor.
 */
export interface LayoutSettings {
  gridVisible: boolean;
  gridSize: number; // Grid spacing in meters (default: 0.5)
  snapEnabled: boolean;
  snapThreshold: number; // In pixels
  rulersVisible: boolean;
  unit: MeasurementUnit;
}

/**
 * Element Group
 *
 * Groups multiple elements together for collective operations.
 */
export interface ElementGroup {
  id: string;
  name: string;
  elementIds: string[];
  locked: boolean;
}

/**
 * Space Dimensions
 */
export interface SpaceDimensions {
  width: number; // Total width in meters
  height: number; // Total height in meters
}

/**
 * Venue Space
 *
 * The physical venue space with walls.
 */
export interface VenueSpace {
  walls: Wall[];
  dimensions: SpaceDimensions;
  pixelsPerMeter: number;
}

/**
 * Layout Interface
 *
 * The main layout document containing all elements and settings.
 */
export interface Layout {
  // Identity
  id: string;
  projectId: string;
  eventId: string;

  // Metadata
  name: string;
  description: string;
  status: LayoutStatus;

  // Venue space
  space: VenueSpace;

  // Background
  floorPlan: FloorPlanBackground | null;

  // Elements
  elements: Record<string, BaseElement>;
  elementOrder: string[]; // Z-index ordering

  // Groups
  groups: Record<string, ElementGroup>;

  // Guest assignments (chairId -> GuestAssignment)
  assignments: Record<string, GuestAssignment>;

  // Settings
  settings: LayoutSettings;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Version
  schemaVersion: number;
}

/**
 * Layout Summary
 *
 * Lightweight layout info for workflow view cards.
 */
export interface LayoutSummary {
  id: string;
  name: string;
  status: LayoutStatus;
  tableCount: number;
  seatCount: number;
  assignedCount: number;
  thumbnailUrl: string | null;
  updatedAt: string;
}

/**
 * Default Layout Settings
 */
export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  gridVisible: true,
  gridSize: 0.5, // 0.5 meters
  snapEnabled: true,
  snapThreshold: 10, // 10 pixels
  rulersVisible: true,
  unit: 'meters',
};

/**
 * Default Pixels Per Meter
 */
export const DEFAULT_PIXELS_PER_METER = 100;

/**
 * Default Empty Assignments
 */
export const DEFAULT_ASSIGNMENTS: Record<string, GuestAssignment> = {};

/**
 * Current Schema Version
 */
export const CURRENT_SCHEMA_VERSION = 1;
