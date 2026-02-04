/**
 * Validation Utilities
 *
 * Functions for validating elements, layouts, and sanitizing input values.
 */

import type { BaseElement } from '../types/elements';
import type { Layout } from '../types/layout';
import type { ElementType } from '../types/elements';
import { ZOOM_MIN, ZOOM_MAX } from '../types/viewport';
import { MIN_ZOOM, MAX_ZOOM } from '../constants';

/**
 * Check if a value is a valid BaseElement.
 *
 * @param element - The value to check
 * @returns True if the value is a valid BaseElement
 *
 * @example
 * ```typescript
 * isValidElement({ id: "123", type: "table-round", x: 0, y: 0, ... })
 * // Returns true
 * ```
 */
export function isValidElement(element: unknown): element is BaseElement {
  if (!element || typeof element !== 'object') {
    return false;
  }

  const e = element as Record<string, unknown>;

  if (typeof e.id !== 'string' || e.id.length === 0) {
    return false;
  }

  if (typeof e.type !== 'string') {
    return false;
  }

  const validTypes: ElementType[] = [
    'table-round',
    'table-rectangular',
    'table-oval',
    'table-square',
    'chair',
    'bench',
    'lounge',
    'dance-floor',
    'stage',
    'cocktail-area',
    'ceremony-area',
    'bar',
    'buffet',
    'cake-table',
    'gift-table',
    'dj-booth',
    'flower-arrangement',
    'photo-booth',
    'arch',
    'custom',
  ];

  if (!validTypes.includes(e.type as ElementType)) {
    return false;
  }

  if (typeof e.x !== 'number' || !isFinite(e.x)) {
    return false;
  }

  if (typeof e.y !== 'number' || !isFinite(e.y)) {
    return false;
  }

  if (typeof e.width !== 'number' || e.width <= 0 || !isFinite(e.width)) {
    return false;
  }

  if (typeof e.height !== 'number' || e.height <= 0 || !isFinite(e.height)) {
    return false;
  }

  if (typeof e.rotation !== 'number' || !isFinite(e.rotation)) {
    return false;
  }

  if (typeof e.zIndex !== 'number' || !isFinite(e.zIndex)) {
    return false;
  }

  if (typeof e.locked !== 'boolean') {
    return false;
  }

  if (typeof e.visible !== 'boolean') {
    return false;
  }

  if (typeof e.label !== 'string') {
    return false;
  }

  if (typeof e.notes !== 'string') {
    return false;
  }

  if (e.color !== null && typeof e.color !== 'string') {
    return false;
  }

  if (typeof e.createdAt !== 'string') {
    return false;
  }

  if (typeof e.updatedAt !== 'string') {
    return false;
  }

  return true;
}

/**
 * Check if a value is a valid Layout.
 *
 * @param layout - The value to check
 * @returns True if the value is a valid Layout
 *
 * @example
 * ```typescript
 * isValidLayout({ id: "123", elements: {}, elementOrder: [], ... })
 * // Returns true
 * ```
 */
export function isValidLayout(layout: unknown): layout is Layout {
  if (!layout || typeof layout !== 'object') {
    return false;
  }

  const l = layout as Record<string, unknown>;

  if (typeof l.id !== 'string' || l.id.length === 0) {
    return false;
  }

  if (typeof l.projectId !== 'string' || l.projectId.length === 0) {
    return false;
  }

  if (typeof l.eventId !== 'string' || l.eventId.length === 0) {
    return false;
  }

  if (typeof l.name !== 'string') {
    return false;
  }

  if (typeof l.description !== 'string') {
    return false;
  }

  const validStatuses = ['draft', 'in_progress', 'ready', 'approved'];
  if (typeof l.status !== 'string' || !validStatuses.includes(l.status)) {
    return false;
  }

  if (!l.elements || typeof l.elements !== 'object') {
    return false;
  }

  if (!Array.isArray(l.elementOrder)) {
    return false;
  }

  if (!l.groups || typeof l.groups !== 'object') {
    return false;
  }

  if (!l.settings || typeof l.settings !== 'object') {
    return false;
  }

  if (typeof l.createdAt !== 'string') {
    return false;
  }

  if (typeof l.updatedAt !== 'string') {
    return false;
  }

  if (typeof l.createdBy !== 'string' || l.createdBy.length === 0) {
    return false;
  }

  if (typeof l.schemaVersion !== 'number' || l.schemaVersion < 1) {
    return false;
  }

  return true;
}

/**
 * Sanitize an element by clamping values to valid ranges.
 *
 * @param element - The element to sanitize
 * @returns Sanitized element with clamped values
 *
 * @example
 * ```typescript
 * sanitizeElement({ x: -100, width: -5, rotation: 720, ... })
 * // Returns { x: 0, width: 0.1, rotation: 0, ... }
 * ```
 */
export function sanitizeElement(element: Partial<BaseElement>): Partial<BaseElement> {
  const sanitized: Partial<BaseElement> = { ...element };

  if (element.x !== undefined) {
    sanitized.x = clamp(element.x, -10000, 10000);
  }

  if (element.y !== undefined) {
    sanitized.y = clamp(element.y, -10000, 10000);
  }

  if (element.width !== undefined) {
    sanitized.width = clamp(element.width, 0.01, 1000);
  }

  if (element.height !== undefined) {
    sanitized.height = clamp(element.height, 0.01, 1000);
  }

  if (element.rotation !== undefined) {
    sanitized.rotation = ((element.rotation % 360) + 360) % 360;
  }

  if (element.zIndex !== undefined) {
    sanitized.zIndex = clamp(element.zIndex, 0, 10000);
  }

  if (element.label !== undefined) {
    sanitized.label = element.label.slice(0, 100);
  }

  if (element.notes !== undefined) {
    sanitized.notes = element.notes.slice(0, 1000);
  }

  if (element.color !== undefined && element.color !== null) {
    sanitized.color = element.color;
  }

  return sanitized;
}

/**
 * Sanitize a layout by removing invalid elements.
 *
 * @param layout - The layout to sanitize
 * @returns Sanitized layout
 */
export function sanitizeLayout(layout: Partial<Layout>): Partial<Layout> {
  const sanitized: Partial<Layout> = { ...layout };

  if (layout.elements) {
    const validElements: Record<string, BaseElement> = {};
    for (const [id, element] of Object.entries(layout.elements)) {
      if (isValidElement(element)) {
        validElements[id] = element;
      }
    }
    sanitized.elements = validElements;
  }

  if (layout.elementOrder && Array.isArray(layout.elementOrder)) {
    const existingIds = new Set(Object.keys(sanitized.elements || {}));
    sanitized.elementOrder = layout.elementOrder.filter((id) => existingIds.has(id));
  }

  return sanitized;
}

/**
 * Sanitize a zoom value.
 *
 * @param zoom - The zoom value to sanitize
 * @returns Sanitized zoom value
 */
export function sanitizeZoom(zoom: number): number {
  return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

/**
 * Sanitize pixels per meter value.
 *
 * @param ppm - The pixels per meter value
 * @returns Sanitized value
 */
export function sanitizePixelsPerMeter(ppm: number): number {
  return clamp(ppm, 10, 1000);
}

/**
 * Sanitize grid size.
 *
 * @param size - The grid size in meters
 * @returns Sanitized grid size
 */
export function sanitizeGridSize(size: number): number {
  return clamp(size, 0.05, 10);
}

/**
 * Check if a value is a valid color string.
 *
 * @param color - The color string to validate
 * @returns True if valid color format
 */
export function isValidColor(color: string): boolean {
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
  const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
  const namedColors = [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white',
    'gray', 'grey', 'brown', 'cyan', 'magenta', 'lime', 'navy', 'teal', 'olive',
    'maroon', 'silver', 'aqua', 'fuchsia',
  ];

  if (hexPattern.test(color) || rgbPattern.test(color) || rgbaPattern.test(color)) {
    return true;
  }

  if (namedColors.includes(color.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Check if a value is a valid URL.
 *
 * @param url - The URL to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize a string by removing potentially dangerous characters.
 *
 * @param str - The string to sanitize
 * @param maxLength - Maximum length
 * @returns Sanitized string
 */
export function sanitizeString(str: string, maxLength: number = 1000): string {
  return str
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, maxLength);
}

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate element type.
 *
 * @param type - The type to validate
 * @returns True if valid element type
 */
export function isValidElementType(type: string): type is ElementType {
  const validTypes: ElementType[] = [
    'table-round',
    'table-rectangular',
    'table-oval',
    'table-square',
    'chair',
    'bench',
    'lounge',
    'dance-floor',
    'stage',
    'cocktail-area',
    'ceremony-area',
    'bar',
    'buffet',
    'cake-table',
    'gift-table',
    'dj-booth',
    'flower-arrangement',
    'photo-booth',
    'arch',
    'custom',
  ];
  return validTypes.includes(type as ElementType);
}

/**
 * Check if element position is within reasonable bounds.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns True if position is valid
 */
export function isValidPosition(x: number, y: number): boolean {
  const MAX_COORDINATE = 10000;
  return (
    isFinite(x) &&
    isFinite(y) &&
    Math.abs(x) <= MAX_COORDINATE &&
    Math.abs(y) <= MAX_COORDINATE
  );
}

/**
 * Check if element dimensions are valid.
 *
 * @param width - Width in meters
 * @param height - Height in meters
 * @returns True if dimensions are valid
 */
export function isValidDimension(width: number, height: number): boolean {
  const MIN_SIZE = 0.01;
  const MAX_SIZE = 1000;
  return (
    width >= MIN_SIZE &&
    width <= MAX_SIZE &&
    height >= MIN_SIZE &&
    height <= MAX_SIZE
  );
}
