/**
 * Export Type Definitions
 *
 * Types for layout export functionality.
 */

/**
 * Export Format
 */
export type ExportFormat = 'pdf' | 'png' | 'svg';

/**
 * Page Size
 */
export type PageSize = 'a4' | 'a3' | 'letter' | 'custom';

/**
 * Page Orientation
 */
export type PageOrientation = 'portrait' | 'landscape';

/**
 * Export Content Options
 *
 * What to include in the export.
 */
export interface ExportContentOptions {
  // Layout elements
  tableNumbers: boolean;
  tableShapes: boolean;
  elementDimensions: boolean;
  grid: boolean;

  // Guest information
  guestNames: boolean;
  dietaryIcons: boolean;
  mealSummary: boolean;

  // Technical details
  technicalNotes: boolean;
  electricalPoints: boolean;
  measurements: boolean;
}

/**
 * Export Format Options
 */
export interface ExportFormatOptions {
  type: ExportFormat;
  pageSize: PageSize;
  orientation: PageOrientation;
  customWidth: number | null; // In mm
  customHeight: number | null; // In mm
  resolution: number; // DPI for raster formats
  transparentBackground: boolean; // For PNG
  scale: number; // 1x, 2x, 3x for PNG
}

/**
 * Export Branding Options
 */
export interface ExportBrandingOptions {
  includeLogo: boolean;
  logoUrl: string | null;
  includeFooter: boolean;
  footerText: string | null;
  includeHeader: boolean;
  headerText: string | null;
}

/**
 * Export Preset
 *
 * Saved export configuration.
 */
export interface ExportPreset {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  isBuiltIn: boolean; // System presets

  content: ExportContentOptions;
  format: ExportFormatOptions;
  branding: ExportBrandingOptions;

  createdAt: string;
  updatedAt: string;
}

/**
 * Built-in Preset Names
 */
export type BuiltInPresetName = 'client' | 'catering' | 'setup' | 'full';

/**
 * Page Sizes in mm
 */
export const PAGE_SIZES: Record<PageSize, { width: number; height: number } | null> = {
  a4: { width: 210, height: 297 },
  a3: { width: 297, height: 420 },
  letter: { width: 216, height: 279 },
  custom: null,
};

/**
 * Default Export Content Options
 */
export const DEFAULT_CONTENT_OPTIONS: ExportContentOptions = {
  tableNumbers: true,
  tableShapes: true,
  elementDimensions: false,
  grid: false,
  guestNames: true,
  dietaryIcons: false,
  mealSummary: false,
  technicalNotes: false,
  electricalPoints: false,
  measurements: false,
};

/**
 * Default Export Format Options
 */
export const DEFAULT_FORMAT_OPTIONS: ExportFormatOptions = {
  type: 'pdf',
  pageSize: 'a4',
  orientation: 'portrait',
  customWidth: null,
  customHeight: null,
  resolution: 300,
  transparentBackground: false,
  scale: 1,
};

/**
 * Default Export Branding Options
 */
export const DEFAULT_BRANDING_OPTIONS: ExportBrandingOptions = {
  includeLogo: false,
  logoUrl: null,
  includeFooter: false,
  footerText: null,
  includeHeader: false,
  headerText: null,
};

/**
 * Built-in Presets
 */
export const BUILT_IN_PRESETS: Record<BuiltInPresetName, Omit<ExportPreset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = {
  client: {
    name: 'Client Version',
    isDefault: false,
    isBuiltIn: true,
    content: {
      tableNumbers: true,
      tableShapes: true,
      elementDimensions: false,
      grid: false,
      guestNames: true,
      dietaryIcons: false,
      mealSummary: false,
      technicalNotes: false,
      electricalPoints: false,
      measurements: false,
    },
    format: {
      type: 'pdf',
      pageSize: 'a4',
      orientation: 'portrait',
      customWidth: null,
      customHeight: null,
      resolution: 300,
      transparentBackground: false,
      scale: 1,
    },
    branding: {
      includeLogo: true,
      logoUrl: null,
      includeFooter: false,
      footerText: null,
      includeHeader: false,
      headerText: null,
    },
  },
  catering: {
    name: 'Catering Version',
    isDefault: false,
    isBuiltIn: true,
    content: {
      tableNumbers: true,
      tableShapes: true,
      elementDimensions: false,
      grid: false,
      guestNames: false,
      dietaryIcons: true,
      mealSummary: true,
      technicalNotes: false,
      electricalPoints: false,
      measurements: false,
    },
    format: {
      type: 'pdf',
      pageSize: 'a4',
      orientation: 'portrait',
      customWidth: null,
      customHeight: null,
      resolution: 300,
      transparentBackground: false,
      scale: 1,
    },
    branding: {
      includeLogo: false,
      logoUrl: null,
      includeFooter: false,
      footerText: null,
      includeHeader: false,
      headerText: null,
    },
  },
  setup: {
    name: 'Setup Crew',
    isDefault: false,
    isBuiltIn: true,
    content: {
      tableNumbers: true,
      tableShapes: true,
      elementDimensions: true,
      grid: true,
      guestNames: false,
      dietaryIcons: false,
      mealSummary: false,
      technicalNotes: true,
      electricalPoints: true,
      measurements: true,
    },
    format: {
      type: 'pdf',
      pageSize: 'a3',
      orientation: 'landscape',
      customWidth: null,
      customHeight: null,
      resolution: 300,
      transparentBackground: false,
      scale: 1,
    },
    branding: {
      includeLogo: false,
      logoUrl: null,
      includeFooter: false,
      footerText: null,
      includeHeader: false,
      headerText: null,
    },
  },
  full: {
    name: 'Full Details',
    isDefault: false,
    isBuiltIn: true,
    content: {
      tableNumbers: true,
      tableShapes: true,
      elementDimensions: true,
      grid: true,
      guestNames: true,
      dietaryIcons: true,
      mealSummary: true,
      technicalNotes: true,
      electricalPoints: true,
      measurements: true,
    },
    format: {
      type: 'pdf',
      pageSize: 'a3',
      orientation: 'landscape',
      customWidth: null,
      customHeight: null,
      resolution: 300,
      transparentBackground: false,
      scale: 1,
    },
    branding: {
      includeLogo: true,
      logoUrl: null,
      includeFooter: true,
      footerText: null,
      includeHeader: true,
      headerText: null,
    },
  },
};

/**
 * Export Progress State
 */
export interface ExportProgress {
  status: 'idle' | 'preparing' | 'rendering' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  downloadUrl: string | null;
  error: string | null;
}

/**
 * Default Export Progress
 */
export const DEFAULT_EXPORT_PROGRESS: ExportProgress = {
  status: 'idle',
  progress: 0,
  message: '',
  downloadUrl: null,
  error: null,
};
