/**
 * Build Guide Types
 *
 * TypeScript types for the Event Build Guide PDF export system.
 */

import type { CalibrationLine } from '../store/canvasStore';

export type ElementCategoryKey = 'tables' | 'seating' | 'ceremony' | 'entertainment' | 'service' | 'decor' | 'lighting' | 'custom';

export const ELEMENT_CATEGORIES: { key: ElementCategoryKey; label: string }[] = [
  { key: 'tables', label: 'Tables' },
  { key: 'seating', label: 'Seating' },
  { key: 'ceremony', label: 'Ceremony' },
  { key: 'entertainment', label: 'Zones' },
  { key: 'service', label: 'Service' },
  { key: 'decor', label: 'Decor' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'custom', label: 'Custom' },
];

export type PageSize = 'full' | 'half' | 'thumbnail';
export type PaperSize = 'a4' | 'letter';
export type Orientation = 'portrait' | 'landscape';
export type ColorMode = 'color' | 'grayscale';

export interface ElementVisibility {
  category: ElementCategoryKey;
  visible: boolean;
}

export interface LayoutNote {
  id: string;
  content: string;
  included: boolean;
}

export interface LayoutTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  included: boolean;
}

export interface LayoutConfig {
  layoutId: string;
  layoutName: string;
  spaceName: string;
  included: boolean;
  pageSize: PageSize;
  elementVisibility: ElementVisibility[];
  includeLegend: boolean;
  includeDimensions: boolean;
  includeNotes: boolean;
  includeTasks: boolean;
  notes: LayoutNote[];
  tasks: LayoutTask[];
  shapes?: any[];
  viewBox?: { x: number; y: number; width: number; height: number };
  satelliteBackground?: {
    imageBase64: string;
    center: { lat: number; lng: number };
    pixelsPerMeter: number;
    calibrationLines: CalibrationLine[];
  };
}

export interface TimelineRow {
  id: string;
  companyName: string;
  role: string;
  arrivalTime: string;
  departureTime: string;
  location: string;
  contactPerson: string;
  phone: string;
  notes: string;
  included: boolean;
  // Extended fields when populated from the supplier/vendor database
  supplierName?: string;
  supplierId?: string;
  email?: string;
  category?: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  notes: string;
  included: boolean;
  isFromVendor: boolean;
  vendorId?: string;
}

export interface CoverSettings {
  includeCover: boolean;
  eventName: string;
  eventDate: string;
  venueName: string;
  plannerCompanyName: string;
  coverImageUrl?: string;
  plannerLogoUrl?: string;
}

export interface FormattingSettings {
  paperSize: PaperSize;
  orientation: Orientation;
  colorMode: ColorMode;
}

export interface HeaderFooterSettings {
  showLogoInHeader: boolean;
  footerText: string;
  showPageNumbers: boolean;
  showWatermark: boolean;
}

export interface DocumentSettings {
  cover: CoverSettings;
  formatting: FormattingSettings;
  headerFooter: HeaderFooterSettings;
}

export interface BuildGuideConfig {
  id?: string;
  eventId: string;
  layoutConfigs: LayoutConfig[];
  timelineRows: TimelineRow[];
  contacts: Contact[];
  documentSettings: DocumentSettings;
  versionLabel: string;
  lastGeneratedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BuildGuideState {
  config: BuildGuideConfig;
  isDirty: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  generationProgress: string;
}

export type BuildGuideTab = 'layouts' | 'timeline' | 'contacts' | 'document' | 'preview';

export interface PagePreview {
  pageNumber: number;
  title: string;
  type: 'cover' | 'layout' | 'timeline' | 'contacts';
  layoutId?: string;
  thumbnailUrl?: string;
}
