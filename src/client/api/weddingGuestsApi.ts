// Wedding Guests API
// Handles guest list management for wedding events

import { getValidAccessToken } from '../utils/sessionManager';

// ===== Types =====

export type GuestSide = 'bride' | 'groom' | 'both' | null;
export type GuestGroup = 'family' | 'friends' | 'coworkers' | 'other' | null;
export type RsvpStatus = 'pending' | 'yes' | 'no';
export type DietaryRestriction = 'vegetarian' | 'vegan' | 'gluten_free' | 'dairy_free' | 'nut_allergy' | 'kosher' | 'halal' | 'other';

export interface WeddingGuest {
  id: string;
  event_id: string;
  guest_name: string;
  email: string | null;
  phone: string | null;
  side: GuestSide;
  guest_group: GuestGroup;
  rsvp_status: RsvpStatus;
  dietary_restrictions: DietaryRestriction[];
  dietary_notes: string | null;
  plus_one_allowed: boolean;
  plus_one_name: string | null;
  is_child: boolean;
  needs_accessibility: boolean;
  accessibility_notes: string | null;
  gift_received: boolean;
  gift_notes: string | null;
  table_assignment: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestCreate {
  guest_name: string;
  email?: string | null;
  phone?: string | null;
  side?: GuestSide;
  guest_group?: GuestGroup;
  rsvp_status?: RsvpStatus;
  dietary_restrictions?: DietaryRestriction[];
  dietary_notes?: string | null;
  plus_one_allowed?: boolean;
  plus_one_name?: string | null;
  is_child?: boolean;
  needs_accessibility?: boolean;
  accessibility_notes?: string | null;
  gift_received?: boolean;
  gift_notes?: string | null;
  table_assignment?: number | null;
}

export interface GuestUpdate {
  guest_name?: string;
  email?: string | null;
  phone?: string | null;
  side?: GuestSide;
  guest_group?: GuestGroup;
  rsvp_status?: RsvpStatus;
  dietary_restrictions?: DietaryRestriction[];
  dietary_notes?: string | null;
  plus_one_allowed?: boolean;
  plus_one_name?: string | null;
  is_child?: boolean;
  needs_accessibility?: boolean;
  accessibility_notes?: string | null;
  gift_received?: boolean;
  gift_notes?: string | null;
  table_assignment?: number | null;
}

export interface GuestFilters {
  search?: string;
  side?: GuestSide;
  guest_group?: GuestGroup;
  rsvp_status?: RsvpStatus;
  dietary?: DietaryRestriction;
  needs_accessibility?: boolean;
  is_child?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface GuestStats {
  total: number;
  rsvp_yes: number;
  rsvp_no: number;
  rsvp_pending: number;
  children_count: number;
  accessibility_count: number;
  dietary_counts: Record<DietaryRestriction, number>;
}

export interface GuestListResponse {
  guests: WeddingGuest[];
  stats: GuestStats;
  total_count: number;
  page: number;
  limit: number;
}

export type Result<T> = { data: T | null; error: string | null };

// ===== API Functions =====

/**
 * Fetch guests for an event with filters and pagination
 */
export async function fetchGuests(eventId: string, filters?: GuestFilters): Promise<Result<GuestListResponse>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.side) params.set('side', filters.side);
    if (filters?.guest_group) params.set('guest_group', filters.guest_group);
    if (filters?.rsvp_status) params.set('rsvp_status', filters.rsvp_status);
    if (filters?.dietary) params.set('dietary', filters.dietary);
    if (filters?.needs_accessibility !== undefined) params.set('needs_accessibility', String(filters.needs_accessibility));
    if (filters?.is_child !== undefined) params.set('is_child', String(filters.is_child));
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.sort_by) params.set('sort_by', filters.sort_by);
    if (filters?.sort_order) params.set('sort_order', filters.sort_order);

    const queryString = params.toString();
    const url = `/api/events/${eventId}/guests${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data as GuestListResponse, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load guests' };
  }
}

/**
 * Create a new guest
 */
export async function createGuest(eventId: string, guest: GuestCreate): Promise<Result<WeddingGuest>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/guests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(guest),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.guest as WeddingGuest, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create guest' };
  }
}

/**
 * Update a guest
 */
export async function updateGuest(eventId: string, guestId: string, patch: GuestUpdate): Promise<Result<WeddingGuest>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/guests/${guestId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.guest as WeddingGuest, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update guest' };
  }
}

/**
 * Delete a guest (soft delete)
 */
export async function deleteGuest(eventId: string, guestId: string): Promise<Result<null>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/guests/${guestId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete guest' };
  }
}

/**
 * Bulk update guests (for bulk RSVP changes, etc.)
 */
export async function bulkUpdateGuests(
  eventId: string,
  guestIds: string[],
  patch: GuestUpdate
): Promise<Result<{ updated: number }>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/guests/bulk`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ guest_ids: guestIds, updates: patch }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: { updated: data.updated }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update guests' };
  }
}

/**
 * Bulk delete guests (soft delete)
 */
export async function bulkDeleteGuests(eventId: string, guestIds: string[]): Promise<Result<{ deleted: number }>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/guests/bulk`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ guest_ids: guestIds }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: { deleted: data.deleted }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete guests' };
  }
}

/**
 * Import guests from CSV data
 */
export async function importGuests(
  eventId: string,
  guests: GuestCreate[],
  onProgress?: (progress: number) => void
): Promise<Result<{ imported: number; errors: Array<{ row: number; error: string }> }>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    // Process in chunks of 100
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < guests.length; i += chunkSize) {
      chunks.push(guests.slice(i, i + chunkSize));
    }

    let totalImported = 0;
    const allErrors: Array<{ row: number; error: string }> = [];
    let processedRows = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const startRow = i * chunkSize;

      const res = await fetch(`/api/events/${eventId}/guests/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guests: chunk, start_row: startRow }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Add error for each guest in failed chunk
        chunk.forEach((_, idx) => {
          allErrors.push({ row: startRow + idx + 1, error: body.error || 'Import failed' });
        });
      } else {
        const data = await res.json();
        totalImported += data.imported || 0;
        if (data.errors) {
          allErrors.push(...data.errors);
        }
      }

      processedRows += chunk.length;
      onProgress?.(Math.round((processedRows / guests.length) * 100));
    }

    return { data: { imported: totalImported, errors: allErrors }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to import guests' };
  }
}

/**
 * Export guests to CSV format
 */
export async function exportGuestsCSV(eventId: string): Promise<Result<string>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/guests/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const csv = await res.text();
    return { data: csv, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to export guests' };
  }
}

// ===== Utility Functions =====

export const DIETARY_LABELS: Record<DietaryRestriction, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  gluten_free: 'Gluten-Free',
  dairy_free: 'Dairy-Free',
  nut_allergy: 'Nut Allergy',
  kosher: 'Kosher',
  halal: 'Halal',
  other: 'Other',
};

export const SIDE_LABELS: Record<string, string> = {
  bride: 'Bride',
  groom: 'Groom',
  both: 'Both',
};

export const GROUP_LABELS: Record<string, string> = {
  family: 'Family',
  friends: 'Friends',
  coworkers: 'Coworkers',
  other: 'Other',
};

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending: 'Pending',
  yes: 'Attending',
  no: 'Declined',
};

/**
 * Parse CSV text to guest objects
 */
export function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

/**
 * Map CSV row to guest object based on column mapping
 */
export function mapRowToGuest(
  row: string[],
  headers: string[],
  columnMapping: Record<string, number>
): GuestCreate | null {
  const getValue = (field: string): string | undefined => {
    const idx = columnMapping[field];
    if (idx === undefined || idx < 0 || idx >= row.length) return undefined;
    return row[idx] || undefined;
  };

  const name = getValue('guest_name');
  if (!name || name.length < 2) return null;

  const dietaryStr = getValue('dietary_restrictions');
  const dietary: DietaryRestriction[] = [];
  if (dietaryStr) {
    const items = dietaryStr.split(',').map((s) => s.trim().toLowerCase().replace(/-/g, '_'));
    items.forEach((item) => {
      if (Object.keys(DIETARY_LABELS).includes(item as DietaryRestriction)) {
        dietary.push(item as DietaryRestriction);
      }
    });
  }

  const sideValue = getValue('side')?.toLowerCase();
  const side = ['bride', 'groom', 'both'].includes(sideValue || '') ? (sideValue as GuestSide) : null;

  const groupValue = getValue('guest_group')?.toLowerCase();
  const guest_group = ['family', 'friends', 'coworkers', 'other'].includes(groupValue || '')
    ? (groupValue as GuestGroup)
    : null;

  const rsvpValue = getValue('rsvp_status')?.toLowerCase();
  const rsvp_status: RsvpStatus = ['yes', 'no'].includes(rsvpValue || '')
    ? (rsvpValue as RsvpStatus)
    : 'pending';

  return {
    guest_name: name,
    email: getValue('email') || null,
    phone: getValue('phone') || null,
    side,
    guest_group,
    rsvp_status,
    dietary_restrictions: dietary,
    dietary_notes: getValue('dietary_notes') || null,
    plus_one_allowed: getValue('plus_one_allowed')?.toLowerCase() === 'true' || getValue('plus_one_allowed') === '1',
    plus_one_name: getValue('plus_one_name') || null,
    is_child: getValue('is_child')?.toLowerCase() === 'true' || getValue('is_child') === '1',
    needs_accessibility: getValue('needs_accessibility')?.toLowerCase() === 'true' || getValue('needs_accessibility') === '1',
    accessibility_notes: getValue('accessibility_notes') || null,
  };
}

/**
 * Generate CSV template
 */
export function generateCSVTemplate(): string {
  const headers = [
    'guest_name',
    'email',
    'phone',
    'side',
    'guest_group',
    'rsvp_status',
    'dietary_restrictions',
    'dietary_notes',
    'plus_one_allowed',
    'plus_one_name',
    'is_child',
    'needs_accessibility',
    'accessibility_notes',
  ];

  const exampleRow = [
    'John Smith',
    'john@example.com',
    '+1 555-123-4567',
    'groom',
    'family',
    'pending',
    'vegetarian,gluten_free',
    '',
    'true',
    'Jane Smith',
    'false',
    'false',
    '',
  ];

  return headers.join(',') + '\n' + exampleRow.join(',');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Check for potential duplicate guest
 */
export function checkDuplicate(
  newGuest: GuestCreate,
  existingGuests: WeddingGuest[]
): { isDuplicate: boolean; reason: string } | null {
  for (const existing of existingGuests) {
    if (existing.deleted_at) continue;

    // Check email match
    if (newGuest.email && existing.email && newGuest.email.toLowerCase() === existing.email.toLowerCase()) {
      return { isDuplicate: true, reason: `Email matches existing guest: ${existing.guest_name}` };
    }

    // Check phone match
    if (newGuest.phone && existing.phone) {
      const newPhone = newGuest.phone.replace(/\D/g, '');
      const existingPhone = existing.phone.replace(/\D/g, '');
      if (newPhone === existingPhone && newPhone.length >= 10) {
        return { isDuplicate: true, reason: `Phone matches existing guest: ${existing.guest_name}` };
      }
    }
  }

  return null;
}
