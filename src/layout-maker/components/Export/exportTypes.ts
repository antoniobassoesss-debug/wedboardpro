/**
 * Export Types and Options
 *
 * Types for export configuration, presets, and options.
 */

export type ExportFormat = 'pdf' | 'png' | 'svg';
export type PageSize = 'a4' | 'a3' | 'letter' | 'custom';
export type PageOrientation = 'portrait' | 'landscape';
export type ExportPreset = 'client' | 'catering' | 'setup' | 'full';

/**
 * Export Options
 */
export interface ExportOptions {
  // Layout Elements
  tableNumbers: boolean;
  tableShapes: boolean;
  dimensions: boolean;
  grid: boolean;

  // Guest Information
  guestNames: boolean;
  dietaryIcons: boolean;
  mealSummary: boolean;

  // Technical Details
  measurements: boolean;
  notes: boolean;

  // Branding
  includeLogo: boolean;
  logoUrl?: string;
  includeFooter: boolean;
  footerText?: string;
}

/**
 * Page Settings
 */
export interface PageSettings {
  size: PageSize;
  orientation: PageOrientation;
  customWidth?: number;  // in mm
  customHeight?: number; // in mm
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Export Configuration
 */
export interface ExportConfig {
  format: ExportFormat;
  page: PageSettings;
  options: ExportOptions;
  scale: number; // 1 = 100%
  quality: number; // 1-100 for images
}

/**
 * Export Presets
 */
export interface ExportPresetDefinition {
  id: ExportPreset;
  name: string;
  description: string;
  options: Partial<ExportOptions>;
  format: ExportFormat;
  pageSize: PageSize;
  orientation: PageOrientation;
}

/**
 * Page Size Definitions (in mm)
 */
export const PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a3: { width: 297, height: 420 },
  letter: { width: 215.9, height: 279.4 },
  custom: { width: 210, height: 297 },
};

/**
 * Default Margins (in mm)
 */
export const DEFAULT_MARGINS = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
};

/**
 * Export Presets
 */
export const EXPORT_PRESETS: ExportPresetDefinition[] = [
  {
    id: 'client',
    name: 'Client',
    description: 'Clean layout for client approval',
    options: {
      tableNumbers: true,
      tableShapes: true,
      dietaryIcons: true,
      guestNames: true,
      grid: false,
      dimensions: false,
      measurements: false,
      notes: false,
      mealSummary: false,
      includeLogo: true,
      includeFooter: true,
    },
    format: 'pdf',
    pageSize: 'a4',
    orientation: 'landscape',
  },
  {
    id: 'catering',
    name: 'Catering',
    description: 'Dietary info and meal counts for kitchen',
    options: {
      tableNumbers: true,
      tableShapes: true,
      dietaryIcons: true,
      guestNames: false,
      mealSummary: true,
      grid: false,
      dimensions: false,
      measurements: false,
      notes: true,
      includeLogo: false,
      includeFooter: true,
    },
    format: 'pdf',
    pageSize: 'a3',
    orientation: 'landscape',
  },
  {
    id: 'setup',
    name: 'Setup Team',
    description: 'Detailed dimensions and notes for setup crew',
    options: {
      tableNumbers: true,
      tableShapes: true,
      dimensions: true,
      measurements: true,
      notes: true,
      grid: true,
      guestNames: false,
      dietaryIcons: false,
      mealSummary: false,
      includeLogo: false,
      includeFooter: false,
    },
    format: 'pdf',
    pageSize: 'a3',
    orientation: 'landscape',
  },
  {
    id: 'full',
    name: 'Full',
    description: 'Complete layout with all details',
    options: {
      tableNumbers: true,
      tableShapes: true,
      dimensions: true,
      grid: true,
      guestNames: true,
      dietaryIcons: true,
      mealSummary: true,
      measurements: true,
      notes: true,
      includeLogo: true,
      includeFooter: true,
    },
    format: 'pdf',
    pageSize: 'a3',
    orientation: 'landscape',
  },
];

/**
 * Default Export Options
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  tableNumbers: true,
  tableShapes: true,
  dimensions: false,
  grid: false,
  guestNames: true,
  dietaryIcons: true,
  mealSummary: false,
  measurements: false,
  notes: false,
  includeLogo: false,
  includeFooter: false,
};

/**
 * Default Export Configuration
 */
export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: 'pdf',
  page: {
    size: 'a4',
    orientation: 'landscape',
    margins: { ...DEFAULT_MARGINS },
  },
  options: { ...DEFAULT_EXPORT_OPTIONS },
  scale: 1,
  quality: 90,
};

/**
 * Get preset by ID
 */
export function getPresetById(presetId: ExportPreset): ExportPresetDefinition | undefined {
  return EXPORT_PRESETS.find(p => p.id === presetId);
}
