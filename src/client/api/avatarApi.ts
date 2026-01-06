import { browserSupabaseClient } from '../browserSupabaseClient';

const BUCKET = 'avatars';

export interface UploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Gets stored session from localStorage
 */
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

/**
 * Ensures Supabase auth session is set
 * @returns true if authentication succeeded
 */
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

/**
 * Uploads avatar to Supabase Storage and updates profile
 * @param file - Processed image file ready for upload
 * @returns Upload result with avatar URL or error message
 */
export async function uploadAvatar(file: File): Promise<UploadResult> {
  if (!browserSupabaseClient) {
    return { success: false, error: 'Supabase not initialized' };
  }

  const session = getStoredSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const hasAuth = await ensureAuth();
  if (!hasAuth) {
    return { success: false, error: 'Authentication failed' };
  }

  try {
    // Delete old avatars from storage
    const { data: existing } = await browserSupabaseClient.storage
      .from(BUCKET)
      .list(userId);

    if (existing && existing.length > 0) {
      const paths = existing.map(f => `${userId}/${f.name}`);
      await browserSupabaseClient.storage.from(BUCKET).remove(paths);
    }

    // Upload new avatar
    const storagePath = `${userId}/${file.name}`;
    const { error: uploadError } = await browserSupabaseClient.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = browserSupabaseClient.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const avatarUrl = urlData.publicUrl;

    // Update profiles table with new avatar URL
    const { error: dbError } = await browserSupabaseClient
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    return { success: true, avatarUrl };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Upload failed' };
  }
}

/**
 * Removes avatar from storage and sets profile avatar_url to null
 * @returns Result indicating success or failure
 */
export async function removeAvatar(): Promise<UploadResult> {
  if (!browserSupabaseClient) {
    return { success: false, error: 'Supabase not initialized' };
  }

  const session = getStoredSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  await ensureAuth();

  try {
    // Delete all files from user's avatar folder
    const { data: existing } = await browserSupabaseClient.storage
      .from(BUCKET)
      .list(userId);

    if (existing && existing.length > 0) {
      const paths = existing.map(f => `${userId}/${f.name}`);
      await browserSupabaseClient.storage.from(BUCKET).remove(paths);
    }

    // Set avatar_url to null in profiles table
    const { error: dbError } = await browserSupabaseClient
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId);

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Remove failed' };
  }
}
