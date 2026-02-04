import type { BaseElement } from './elements';

export interface Layout {
  id: string;
  name: string;
  description?: string;
  venueId?: string;
  eventId?: string;
  
  dimensions: {
    width: number;
    height: number;
    unit: 'meters' | 'feet';
  };
  
  elements: Record<string, BaseElement>;
  elementOrder: string[];
  
  settings: LayoutSettings;
  
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface LayoutSettings {
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  backgroundColor: string;
  defaultTableCapacity: number;
}

export const CURRENT_SCHEMA_VERSION = 1;
