import type { Layout, BaseElement } from './types';
import { CURRENT_SCHEMA_VERSION } from './types/layout';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function validateLayout(layout: unknown): layout is Layout {
  if (!layout || typeof layout !== 'object') return false;
  
  const l = layout as Layout;
  
  if (typeof l.id !== 'string') return false;
  if (typeof l.name !== 'string') return false;
  if (!l.dimensions || typeof l.dimensions.width !== 'number') return false;
  if (!l.dimensions || typeof l.dimensions.height !== 'number') return false;
  if (!l.elements || typeof l.elements !== 'object') return false;
  if (!Array.isArray(l.elementOrder)) return false;
  
  if (typeof l.settings !== 'object' || !l.settings) return false;
  if (typeof l.settings.gridSize !== 'number') return false;
  
  for (const element of Object.values(l.elements)) {
    if (!validateElement(element)) return false;
  }
  
  return true;
}

export function validateElement(element: unknown): element is BaseElement {
  if (!element || typeof element !== 'object') return false;
  
  const e = element as BaseElement;
  
  if (typeof e.id !== 'string') return false;
  if (typeof e.type !== 'string') return false;
  if (typeof e.x !== 'number' || isNaN(e.x)) return false;
  if (typeof e.y !== 'number' || isNaN(e.y)) return false;
  if (typeof e.width !== 'number' || e.width <= 0) return false;
  if (typeof e.height !== 'number' || e.height <= 0) return false;
  if (typeof e.rotation !== 'number') return false;
  if (typeof e.zIndex !== 'number') return false;
  if (typeof e.locked !== 'boolean') return false;
  if (typeof e.visible !== 'boolean') return false;
  
  return true;
}

export function sanitizeElement(element: Partial<BaseElement>): Partial<BaseElement> {
  return {
    ...element,
    x: clamp(element.x ?? 0, -10000, 10000),
    y: clamp(element.y ?? 0, -10000, 10000),
    width: clamp(element.width ?? 100, 10, 5000),
    height: clamp(element.height ?? 100, 10, 5000),
    rotation: ((element.rotation ?? 0) % 360 + 360) % 360,
    zIndex: Math.floor(element.zIndex ?? 0),
  };
}

export function sanitizeLayoutState(layout: Partial<Layout>): Partial<Layout> {
  const sanitized: Partial<Layout> = {};
  
  if (layout.name !== undefined) {
    sanitized.name = String(layout.name).slice(0, 200);
  }
  
  if (layout.description !== undefined) {
    sanitized.description = String(layout.description).slice(0, 1000);
  }
  
  if (layout.dimensions !== undefined) {
    sanitized.dimensions = {
      width: clamp(layout.dimensions.width, 1, 100000),
      height: clamp(layout.dimensions.height, 1, 100000),
      unit: layout.dimensions.unit === 'feet' ? 'feet' : 'meters',
    };
  }
  
  if (layout.settings !== undefined) {
    sanitized.settings = {
      gridSize: clamp(layout.settings.gridSize ?? 20, 5, 200),
      snapToGrid: Boolean(layout.settings.snapToGrid),
      showGrid: Boolean(layout.settings.showGrid),
      backgroundColor: String(layout.settings.backgroundColor ?? '#ffffff').slice(0, 20),
      defaultTableCapacity: clamp(layout.settings.defaultTableCapacity ?? 8, 1, 50),
    };
  }
  
  return sanitized;
}
