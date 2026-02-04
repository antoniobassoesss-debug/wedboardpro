/**
 * ID Generation Utilities
 *
 * Functions for generating unique identifiers and table numbers.
 */

import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

/**
 * Generate a UUID v4 string.
 *
 * @returns A randomly generated UUID v4 string
 *
 * @example
 * ```typescript
 * generateId() // Returns "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Validate if a string is a valid UUID.
 *
 * @param id - The string to validate
 * @returns True if the string is a valid UUID
 *
 * @example
 * ```typescript
 * isValidId("550e8400-e29b-41d4-a716-446655440000") // Returns true
 * isValidId("not-a-uuid") // Returns false
 * ```
 */
export function isValidId(id: string): boolean {
  return uuidValidate(id);
}

/**
 * Generate the next available table number.
 *
 * @param existingNumbers - Array of existing table numbers
 * @param prefix - Optional prefix for table numbers (e.g., "A" for "A1", "A2")
 * @returns The next available table number string
 *
 * @example
 * ```typescript
 * generateTableNumber(["1", "2", "3"]) // Returns "4"
 * generateTableNumber(["1", "2", "3"], "A") // Returns "A1" (if not taken)
 * generateTableNumber(["A1", "A2"], "A") // Returns "A3"
 * ```
 */
export function generateTableNumber(
  existingNumbers: string[],
  prefix?: string
): string {
  const existingSet = new Set(existingNumbers);

  if (prefix) {
    const numberedWithPrefix = existingNumbers
      .filter((n) => n.startsWith(prefix))
      .map((n) => n.slice(prefix.length))
      .filter((n) => n.length > 0 && !isNaN(parseInt(n, 10)))
      .map((n) => parseInt(n, 10))
      .sort((a, b) => a - b);

    let num = 1;
    for (const existingNum of numberedWithPrefix) {
      if (existingNum === num) {
        num++;
      } else if (existingNum > num) {
        break;
      }
    }

    return `${prefix}${num}`;
  }

  const numbered = existingNumbers
    .filter((n) => !isNaN(parseInt(n, 10)))
    .map((n) => parseInt(n, 10))
    .sort((a, b) => a - b);

  let num = 1;
  for (const existingNum of numbered) {
    if (existingNum === num) {
      num++;
    } else if (existingNum > num) {
      break;
    }
  }

  return String(num);
}

/**
 * Generate a unique element label.
 *
 * @param baseLabel - Base label (e.g., "Table", "Chair")
 * @param existingLabels - Set of existing labels to avoid duplicates
 * @returns A unique label
 *
 * @example
 * ```typescript
 * generateUniqueLabel("Table", new Set(["Table 1", "Table 2"]))
 * // Returns "Table 3"
 * ```
 */
export function generateUniqueLabel(
  baseLabel: string,
  existingLabels: Set<string>
): string {
  let counter = 1;
  let label = `${baseLabel} ${counter}`;

  while (existingLabels.has(label)) {
    counter++;
    label = `${baseLabel} ${counter}`;
  }

  return label;
}

/**
 * Generate a short alphanumeric ID for compact representation.
 *
 * @param length - Length of the ID (default: 8)
 * @returns A short alphanumeric ID
 *
 * @example
 * ```typescript
 * generateShortId() // Returns "a1b2c3d4"
 * generateShortId(4) // Returns "ab12"
 * ```
 */
export function generateShortId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a timestamp-based ID for sorting purposes.
 *
 * @returns A string combining timestamp and random suffix
 */
export function generateTimestampId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Parse a table number into its prefix and numeric parts.
 *
 * @param tableNumber - Table number string (e.g., "A1", "12", "Table 3")
 * @returns Object with prefix and number
 *
 * @example
 * ```typescript
 * parseTableNumber("A1") // Returns { prefix: "A", number: 1 }
 * parseTableNumber("12") // Returns { prefix: "", number: 12 }
 * ```
 */
export function parseTableNumber(tableNumber: string): {
  prefix: string;
  number: number;
} {
  const match = tableNumber.match(/^([A-Za-z]*)(\d+)$/);
  if (match && match[2]) {
    return {
      prefix: match[1] ?? '',
      number: parseInt(match[2], 10),
    };
  }
  return {
    prefix: '',
    number: parseInt(tableNumber, 10) || 0,
  };
}

/**
 * Format a table number with optional prefix.
 *
 * @param number - The numeric part
 * @param prefix - Optional prefix
 * @returns Formatted table number
 *
 * @example
 * ```typescript
 * formatTableNumber(1) // Returns "1"
 * formatTableNumber(1, "A") // Returns "A1"
 * ```
 */
export function formatTableNumber(number: number, prefix?: string): string {
  return prefix ? `${prefix}${number}` : String(number);
}
