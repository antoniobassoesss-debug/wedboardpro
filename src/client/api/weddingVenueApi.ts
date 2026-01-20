// Wedding Venue & Date API
// Handles venue data and contract file uploads

import { getValidAccessToken } from '../utils/sessionManager';
import { browserSupabaseClient } from '../browserSupabaseClient';

// ===== Types =====

export type VenueType = 'indoor' | 'outdoor' | 'both' | null;
export type ContractStatus = 'not_uploaded' | 'pending' | 'signed';

export interface WeddingVenue {
  id: string;
  event_id: string;
  venue_name: string | null;
  venue_address: string | null;
  venue_latitude: number | null;
  venue_longitude: number | null;
  venue_capacity: number | null;
  venue_type: VenueType;
  wedding_date: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  site_visit_notes: string | null;
  contract_file_url: string | null;
  contract_status: ContractStatus;
  deposit_amount: number;
  deposit_due_date: string | null;
  deposit_paid_date: string | null;
  restrictions: string[];
  created_at: string;
  updated_at: string;
}

export interface WeddingVenueUpdate {
  venue_name?: string | null;
  venue_address?: string | null;
  venue_latitude?: number | null;
  venue_longitude?: number | null;
  venue_capacity?: number | null;
  venue_type?: VenueType;
  wedding_date?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  site_visit_notes?: string | null;
  contract_file_url?: string | null;
  contract_status?: ContractStatus;
  deposit_amount?: number;
  deposit_due_date?: string | null;
  deposit_paid_date?: string | null;
  restrictions?: string[];
}

export type Result<T> = { data: T | null; error: string | null };

const CONTRACT_BUCKET = 'wedding-contracts';

// ===== Helper Functions =====

function getStoredSession() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('wedboarpro_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function ensureAuth(): Promise<boolean> {
  if (!browserSupabaseClient) return false;
  const session = getStoredSession();
  if (!session?.access_token || !session?.refresh_token) return false;

  try {
    await browserSupabaseClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    return true;
  } catch {
    return false;
  }
}

// ===== API Functions =====

/**
 * Fetch wedding venue data for an event.
 * Creates a new record if none exists.
 */
export async function fetchWeddingVenue(eventId: string): Promise<Result<WeddingVenue>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/venue`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.venue as WeddingVenue, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load venue data' };
  }
}

/**
 * Update wedding venue data (partial update)
 */
export async function updateWeddingVenue(
  eventId: string,
  patch: WeddingVenueUpdate
): Promise<Result<WeddingVenue>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/venue`, {
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
    return { data: data.venue as WeddingVenue, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update venue data' };
  }
}

// ===== Contract Upload Functions =====

/**
 * Upload a venue contract PDF to Supabase Storage
 * Returns a signed URL for the uploaded file
 */
export async function uploadVenueContract(
  eventId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<Result<string>> {
  if (!browserSupabaseClient) {
    return { data: null, error: 'Supabase not initialized' };
  }

  const hasAuth = await ensureAuth();
  if (!hasAuth) {
    return { data: null, error: 'Authentication failed' };
  }

  try {
    // Validate file type
    if (file.type !== 'application/pdf') {
      return { data: null, error: 'Only PDF files are allowed' };
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { data: null, error: 'File too large. Max 10MB.' };
    }

    onProgress?.(20);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `contract-${timestamp}.pdf`;
    const storagePath = `${eventId}/${filename}`;

    // Upload to storage
    const { error: uploadError } = await browserSupabaseClient.storage
      .from(CONTRACT_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { data: null, error: uploadError.message };
    }

    onProgress?.(70);

    // Get signed URL (private bucket)
    const { data: signedUrlData, error: signedError } = await browserSupabaseClient.storage
      .from(CONTRACT_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry

    if (signedError || !signedUrlData) {
      return { data: null, error: signedError?.message || 'Failed to create signed URL' };
    }

    onProgress?.(100);

    // Return the storage path (we'll generate signed URLs on demand for downloads)
    return { data: storagePath, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Upload failed' };
  }
}

/**
 * Delete a venue contract from Supabase Storage
 */
export async function deleteVenueContract(
  eventId: string,
  contractPath: string
): Promise<Result<null>> {
  if (!browserSupabaseClient) {
    return { data: null, error: 'Supabase not initialized' };
  }

  const hasAuth = await ensureAuth();
  if (!hasAuth) {
    return { data: null, error: 'Authentication failed' };
  }

  try {
    const { error } = await browserSupabaseClient.storage
      .from(CONTRACT_BUCKET)
      .remove([contractPath]);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Delete failed' };
  }
}

/**
 * Get a signed download URL for a contract
 */
export async function getContractDownloadUrl(contractPath: string): Promise<Result<string>> {
  if (!browserSupabaseClient) {
    return { data: null, error: 'Supabase not initialized' };
  }

  const hasAuth = await ensureAuth();
  if (!hasAuth) {
    return { data: null, error: 'Authentication failed' };
  }

  try {
    const { data, error } = await browserSupabaseClient.storage
      .from(CONTRACT_BUCKET)
      .createSignedUrl(contractPath, 60 * 10); // 10 minute expiry for download

    if (error || !data) {
      return { data: null, error: error?.message || 'Failed to create download URL' };
    }

    return { data: data.signedUrl, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to get download URL' };
  }
}

// ===== Utility Functions =====

/**
 * Format cents to currency string
 */
export function formatCurrency(cents: number): string {
  const euros = cents / 100;
  return `€${euros.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Parse currency string to cents
 */
export function parseCurrencyToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.');
  const euros = parseFloat(cleaned) || 0;
  return Math.round(euros * 100);
}

/**
 * Calculate days until a date (negative if past)
 */
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format date for display
 */
export function formatDateLong(dateStr: string | null): string {
  if (!dateStr) return 'Not set';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Build Google Maps URL from coordinates or address
 */
export function buildGoogleMapsUrl(
  lat: number | null,
  lng: number | null,
  address: string | null
): string | null {
  if (lat && lng) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}
