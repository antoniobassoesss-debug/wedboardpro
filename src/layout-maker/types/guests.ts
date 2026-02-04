/**
 * Guest Type Definitions
 *
 * Types for guest data and seating assignments.
 */

import type { DietaryType } from './elements';

export type NonNullDietaryType = Exclude<DietaryType, null>;

/**
 * Allergy Type
 */
export type AllergyType = 'nuts' | 'gluten' | 'dairy' | 'shellfish' | 'eggs' | 'soy' | 'other';

/**
 * RSVP Status
 */
export type RsvpStatus = 'pending' | 'confirmed' | 'declined';

/**
 * Guest Assignment
 *
 * Links a guest to a specific chair in a layout.
 */
export interface GuestAssignment {
  chairId: string;
  guestId: string;
  guestName: string; // Denormalized for display
  dietaryType: DietaryType | null;
  allergyFlags: AllergyType[];
  assignedAt: string; // ISO timestamp
  assignedBy: string; // User ID
}

/**
 * Guest Interface
 *
 * Full guest record from the Guest List module.
 */
export interface Guest {
  id: string;
  eventId: string;

  // Personal info
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;

  // RSVP
  rsvpStatus: RsvpStatus;
  plusOne: boolean;
  plusOneName: string | null;

  // Dietary
  dietaryType: DietaryType;
  dietaryNotes: string | null;
  allergies: AllergyType[];

  // Preferences
  tablePreferences: string[]; // Guest IDs they want to sit with
  tableAvoidances: string[]; // Guest IDs they want to avoid
  accessibilityNeeds: string | null;

  // Assignment (reference to layout)
  assignedLayoutId: string | null;
  assignedChairId: string | null;

  // Metadata
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Guest Summary
 *
 * Lightweight guest info for search/display.
 */
export interface GuestSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  dietaryType: DietaryType;
  hasAllergies: boolean;
  allergyFlags: AllergyType[];
  isAssigned: boolean;
  assignedTableNumber: string | null;
}

/**
 * Table Guest Summary
 *
 * Summary of guests at a specific table.
 */
export interface TableGuestSummary {
  tableId: string;
  tableNumber: string;
  capacity: number;
  assignedCount: number;
  guests: GuestSummary[];
  mealCounts: Record<NonNullDietaryType, number>;
}

/**
 * Dietary Icons
 */
export const DIETARY_ICONS: Record<NonNullDietaryType, string> = {
  regular: '🍖',
  vegetarian: '🥗',
  vegan: '🌱',
  halal: '🕌',
  kosher: '✡️',
  other: '🍽️',
};

/**
 * Allergy Icons
 */
export const ALLERGY_ICONS: Record<AllergyType, string> = {
  nuts: '🥜',
  gluten: '🌾',
  dairy: '🥛',
  shellfish: '🦐',
  eggs: '🥚',
  soy: '🫘',
  other: '⚠️',
};

/**
 * Helper: Get full name from guest
 */
export function getGuestFullName(guest: Guest): string {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

/**
 * Helper: Get initials from guest
 */
export function getGuestInitials(guest: Guest): string {
  const first = guest.firstName.charAt(0).toUpperCase();
  const last = guest.lastName.charAt(0).toUpperCase();
  return `${first}${last}`;
}

/**
 * Helper: Create guest summary from full guest
 */
export function createGuestSummary(guest: Guest): GuestSummary {
  return {
    id: guest.id,
    firstName: guest.firstName,
    lastName: guest.lastName,
    fullName: getGuestFullName(guest),
    initials: getGuestInitials(guest),
    dietaryType: guest.dietaryType,
    hasAllergies: guest.allergies.length > 0,
    allergyFlags: guest.allergies,
    isAssigned: guest.assignedChairId !== null,
    assignedTableNumber: null, // Would need to look up from layout
  };
}
