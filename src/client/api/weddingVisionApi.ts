// Wedding Vision & Style API
// Handles vision board data and mood board image uploads

import { getValidAccessToken } from '../utils/sessionManager';
import { browserSupabaseClient } from '../browserSupabaseClient';
import imageCompression from 'browser-image-compression';

// ===== Types =====

export type StyleQuizResult = 'romantic' | 'modern' | 'rustic' | 'bohemian' | 'classic' | 'industrial' | null;

export interface WeddingVision {
  id: string;
  event_id: string;
  mood_board_images: string[];
  style_quiz_result: StyleQuizResult;
  color_palette: string[];
  keywords: string[];
  must_haves: string[];
  inspiration_links: string[];
  created_at: string;
  updated_at: string;
}

export interface WeddingVisionUpdate {
  mood_board_images?: string[];
  style_quiz_result?: StyleQuizResult;
  color_palette?: string[];
  keywords?: string[];
  must_haves?: string[];
  inspiration_links?: string[];
}

export type Result<T> = { data: T | null; error: string | null };

const MOOD_BOARD_BUCKET = 'wedding-mood-boards';

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
 * Fetch wedding vision data for an event.
 * Creates a new record if none exists.
 */
export async function fetchWeddingVision(eventId: string): Promise<Result<WeddingVision>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/vision`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.vision as WeddingVision, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load vision data' };
  }
}

/**
 * Update wedding vision data (partial update)
 */
export async function updateWeddingVision(
  eventId: string,
  patch: WeddingVisionUpdate
): Promise<Result<WeddingVision>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/vision`, {
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
    return { data: data.vision as WeddingVision, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update vision data' };
  }
}

// ===== Image Upload Functions =====

/**
 * Compress image before upload
 * Max 1920px width, 85% quality
 */
async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.85,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch {
    // If compression fails, return original
    return file;
  }
}

/**
 * Upload a mood board image to Supabase Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadMoodBoardImage(
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
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { data: null, error: 'Invalid file type. Use JPG, PNG, or WebP.' };
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      return { data: null, error: 'File too large. Max 5MB.' };
    }

    onProgress?.(10);

    // Compress image
    const compressedFile = await compressImage(file);
    onProgress?.(40);

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
    const storagePath = `${eventId}/${filename}`;

    // Upload to storage
    const { error: uploadError } = await browserSupabaseClient.storage
      .from(MOOD_BOARD_BUCKET)
      .upload(storagePath, compressedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { data: null, error: uploadError.message };
    }

    onProgress?.(80);

    // Get public URL
    const { data: urlData } = browserSupabaseClient.storage
      .from(MOOD_BOARD_BUCKET)
      .getPublicUrl(storagePath);

    onProgress?.(100);

    return { data: urlData.publicUrl, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Upload failed' };
  }
}

/**
 * Delete a mood board image from Supabase Storage
 */
export async function deleteMoodBoardImage(
  eventId: string,
  imageUrl: string
): Promise<Result<null>> {
  if (!browserSupabaseClient) {
    return { data: null, error: 'Supabase not initialized' };
  }

  const hasAuth = await ensureAuth();
  if (!hasAuth) {
    return { data: null, error: 'Authentication failed' };
  }

  try {
    // Extract path from URL
    // URL format: https://.../storage/v1/object/public/wedding-mood-boards/eventId/filename
    const urlObj = new URL(imageUrl);
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.indexOf(MOOD_BOARD_BUCKET);

    if (bucketIndex === -1) {
      return { data: null, error: 'Invalid image URL' };
    }

    const storagePath = pathParts.slice(bucketIndex + 1).join('/');

    const { error } = await browserSupabaseClient.storage
      .from(MOOD_BOARD_BUCKET)
      .remove([storagePath]);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Delete failed' };
  }
}

// ===== Validation Helpers =====

/**
 * Validate a URL (must be http or https)
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate a hex color code
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
