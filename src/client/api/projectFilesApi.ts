import { browserSupabaseClient } from '../browserSupabaseClient.js';

export type ProjectFileStatus = 'uploading' | 'ready' | 'failed';

export type ProjectFileFolder = {
  id: string;
  account_id: string;
  project_id: string;
  created_by: string;
  name: string;
  parent_folder_id: string | null;
  path_cache: string;
  created_at: string;
  updated_at: string;
};

export type ProjectFile = {
  id: string;
  account_id: string;
  project_id: string;
  uploaded_by: string;
  folder_id: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  extension: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: ProjectFileStatus;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type Result<T> = { data: T | null; error: string | null };

const BUCKET = 'project_files';

const getStoredSession = (): { access_token: string; refresh_token: string; user: { id: string } } | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('wedboarpro_session');
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (session?.access_token && session?.refresh_token && session?.user?.id) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
};

const getCurrentUserId = (): string | null => {
  const session = getStoredSession();
  return session?.user?.id ?? null;
};

// Ensure the Supabase client has an active auth session for storage operations
const ensureAuthSession = async (): Promise<boolean> => {
  if (!browserSupabaseClient) return false;
  const storedSession = getStoredSession();
  if (!storedSession) return false;

  try {
    // Check if we already have a valid session
    const { data: { session: currentSession } } = await browserSupabaseClient.auth.getSession();
    if (currentSession?.access_token === storedSession.access_token) {
      return true;
    }

    // Set the session from localStorage
    const { error } = await browserSupabaseClient.auth.setSession({
      access_token: storedSession.access_token,
      refresh_token: storedSession.refresh_token,
    });

    if (error) {
      console.error('[projectFilesApi] Failed to set auth session:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[projectFilesApi] Error setting auth session:', err?.message);
    return false;
  }
};

const safeSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file';

const buildStoragePath = (accountId: string, projectId: string, folderId: string | null, file: File): string => {
  const extMatch = file.name.split('.').pop();
  const extension = extMatch && extMatch !== file.name ? extMatch.toLowerCase() : '';
  const baseName = safeSlug(extension ? file.name.slice(0, -(extension.length + 1)) : file.name);
  const fileIdPart = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const folderSegment = folderId ? `folders/${folderId}` : 'root';
  const fileNameWithExt = extension ? `${baseName}.${extension}` : baseName;
  return `${accountId}/${projectId}/${folderSegment}/${fileIdPart}-${fileNameWithExt}`;
};

export async function listFoldersAndFiles(params: {
  projectId: string;
  parentFolderId: string | null;
}): Promise<Result<{ folders: ProjectFileFolder[]; files: ProjectFile[]; allFolders: ProjectFileFolder[] }>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  const userId = getCurrentUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  try {
    const [foldersRes, filesRes] = await Promise.all([
      browserSupabaseClient
        .from('project_file_folders')
        .select('*')
        .eq('account_id', userId)
        .eq('project_id', params.projectId)
        .order('path_cache', { ascending: true }),
      browserSupabaseClient
        .from('project_files')
        .select('*')
        .eq('account_id', userId)
        .eq('project_id', params.projectId)
        .order('created_at', { ascending: false }),
    ]);

    if (foldersRes.error) {
      console.error('[projectFilesApi] listFoldersAndFiles folders error', foldersRes.error);
      return { data: null, error: foldersRes.error.message };
    }
    if (filesRes.error) {
      console.error('[projectFilesApi] listFoldersAndFiles files error', filesRes.error);
      return { data: null, error: filesRes.error.message };
    }

    const allFolders = (foldersRes.data ?? []) as ProjectFileFolder[];
    const folders =
      params.parentFolderId === null
        ? allFolders.filter((f) => f.parent_folder_id === null)
        : allFolders.filter((f) => f.parent_folder_id === params.parentFolderId);
    const files = (filesRes.data ?? []).filter(
      (f: any) => (params.parentFolderId === null && f.folder_id === null) || f.folder_id === params.parentFolderId,
    ) as ProjectFile[];

    return { data: { folders, files, allFolders }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load project files' };
  }
}

export async function createFolder(params: {
  projectId: string;
  parentFolderId: string | null;
  name: string;
}): Promise<Result<ProjectFileFolder>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  const userId = getCurrentUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  const trimmedName = params.name.trim();
  if (!trimmedName) return { data: null, error: 'Folder name is required' };

  try {
    const parentPath = params.parentFolderId
      ? (
          await browserSupabaseClient
            .from('project_file_folders')
            .select('path_cache')
            .eq('id', params.parentFolderId)
            .single()
        ).data?.path_cache ?? ''
      : '';

    const pathCache = parentPath ? `${parentPath}/${trimmedName}` : trimmedName;

    const { data, error } = await browserSupabaseClient
      .from('project_file_folders')
      .insert({
        account_id: userId,
        project_id: params.projectId,
        created_by: userId,
        name: trimmedName,
        parent_folder_id: params.parentFolderId,
        path_cache: pathCache,
      })
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as ProjectFileFolder, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create folder' };
  }
}

export type UploadProgress = {
  file: File;
  progress: number; // 0–100
  status: ProjectFileStatus;
  error?: string;
};

export async function uploadFiles(params: {
  projectId: string;
  folderId: string | null;
  files: File[];
  onProgress?: (update: UploadProgress) => void;
}): Promise<Result<ProjectFile[]>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  const userId = getCurrentUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  // Ensure we have an authenticated session for storage operations
  const hasAuth = await ensureAuthSession();
  if (!hasAuth) {
    return { data: null, error: 'Failed to authenticate with storage. Please log in again.' };
  }

  const uploaded: ProjectFile[] = [];
  const errors: string[] = [];

  for (const file of params.files) {
    const storagePath = buildStoragePath(userId, params.projectId, params.folderId, file);

    try {
      params.onProgress?.({ file, progress: 0, status: 'uploading' });

      const { error: uploadError } = await browserSupabaseClient.storage.from(BUCKET).upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) {
        console.error('[projectFilesApi] upload error', uploadError);
        // Provide more helpful error messages
        let errorMessage = uploadError.message;
        if (errorMessage.includes('Bucket not found')) {
          errorMessage = 'Storage bucket not configured. Please run the SQL migration in Supabase.';
        } else if (errorMessage.includes('row-level security') || errorMessage.includes('policy')) {
          errorMessage = 'Permission denied. Please check storage policies or re-login.';
        }
        params.onProgress?.({
          file,
          progress: 100,
          status: 'failed',
          error: errorMessage,
        });
        errors.push(errorMessage);
        continue;
      }

      const extMatch = file.name.split('.').pop();
      const extension = extMatch && extMatch !== file.name ? extMatch.toLowerCase() : null;

      const { data, error } = await browserSupabaseClient
        .from('project_files')
        .insert({
          account_id: userId,
          project_id: params.projectId,
          uploaded_by: userId,
          folder_id: params.folderId,
          storage_bucket: BUCKET,
          storage_path: storagePath,
          file_name: file.name,
          extension,
          mime_type: file.type || null,
          size_bytes: file.size,
          status: 'ready',
        })
        .select('*')
        .single();

      if (error) {
        console.error('[projectFilesApi] metadata insert error', error);
        params.onProgress?.({
          file,
          progress: 100,
          status: 'failed',
          error: error.message,
        });
        errors.push(error.message);
        continue;
      }

      const record = data as ProjectFile;
      uploaded.push(record);
      params.onProgress?.({ file, progress: 100, status: 'ready' });
    } catch (err: any) {
      const message = err?.message || 'Unexpected upload error';
      console.error('[projectFilesApi] unexpected upload error', err);
      params.onProgress?.({ file, progress: 100, status: 'failed', error: message });
      errors.push(message);
    }
  }

  if (errors.length > 0 && uploaded.length === 0) {
    return { data: null, error: errors[0] };
  }

  return { data: uploaded, error: errors.length > 0 ? errors[0] : null };
}

export async function renameFile(params: {
  fileId: string;
  fileName: string;
}): Promise<Result<ProjectFile>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  const userId = getCurrentUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  const trimmedName = params.fileName.trim();
  if (!trimmedName) return { data: null, error: 'File name is required' };

  try {
    const { data, error } = await browserSupabaseClient
      .from('project_files')
      .update({ file_name: trimmedName })
      .eq('id', params.fileId)
      .eq('account_id', userId)
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as ProjectFile, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to rename file' };
  }
}

export async function moveFile(params: {
  fileId: string;
  targetFolderId: string | null;
}): Promise<Result<ProjectFile>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  const userId = getCurrentUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  try {
    const { data, error } = await browserSupabaseClient
      .from('project_files')
      .update({ folder_id: params.targetFolderId })
      .eq('id', params.fileId)
      .eq('account_id', userId)
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as ProjectFile, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to move file' };
  }
}

export async function deleteFile(fileId: string): Promise<Result<{ id: string }>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  const userId = getCurrentUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  try {
    const { data, error } = await browserSupabaseClient
      .from('project_files')
      .select('id, storage_bucket, storage_path')
      .eq('id', fileId)
      .eq('account_id', userId)
      .single();
    if (error) return { data: null, error: error.message };

    const bucket = (data as any).storage_bucket as string;
    const path = (data as any).storage_path as string;

    // Ensure auth session for storage operations
    await ensureAuthSession();

    const { error: storageErr } = await browserSupabaseClient.storage.from(bucket).remove([path]);
    if (storageErr) {
      console.error('[projectFilesApi] storage delete error', storageErr);
    }

    const { error: deleteErr } = await browserSupabaseClient
      .from('project_files')
      .delete()
      .eq('id', fileId)
      .eq('account_id', userId);
    if (deleteErr) return { data: null, error: deleteErr.message };

    return { data: { id: fileId }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete file' };
  }
}

export async function renameFolder(params: {
  folderId: string;
  name: string;
}): Promise<Result<ProjectFileFolder>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  const userId = getCurrentUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  const trimmedName = params.name.trim();
  if (!trimmedName) return { data: null, error: 'Folder name is required' };

  try {
    const { data: folder, error: fetchErr } = await browserSupabaseClient
      .from('project_file_folders')
      .select('id, parent_folder_id, path_cache')
      .eq('id', params.folderId)
      .eq('account_id', userId)
      .single();
    if (fetchErr || !folder) {
      return { data: null, error: fetchErr?.message || 'Folder not found' };
    }

    const parentPath = (folder as any).path_cache?.split('/').slice(0, -1).join('/') ?? '';
    const pathCache = parentPath ? `${parentPath}/${trimmedName}` : trimmedName;

    const { data: updated, error } = await browserSupabaseClient
      .from('project_file_folders')
      .update({ name: trimmedName, path_cache: pathCache })
      .eq('id', params.folderId)
      .eq('account_id', userId)
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: updated as ProjectFileFolder, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to rename folder' };
  }
}

export async function deleteFolder(folderId: string): Promise<Result<{ id: string }>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  const userId = getCurrentUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  try {
    const { error } = await browserSupabaseClient
      .from('project_file_folders')
      .delete()
      .eq('id', folderId)
      .eq('account_id', userId);
    if (error) return { data: null, error: error.message };
    return { data: { id: folderId }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete folder' };
  }
}

export async function getSignedUrlForPreview(fileId: string, expiresInSeconds = 60 * 10): Promise<Result<string>> {
  if (!browserSupabaseClient) return { data: null, error: 'Supabase client not initialized' };
  const userId = getCurrentUserId();
  if (!userId) return { data: null, error: 'Not authenticated' };

  try {
    const { data, error } = await browserSupabaseClient
      .from('project_files')
      .select('storage_bucket, storage_path')
      .eq('id', fileId)
      .eq('account_id', userId)
      .single();
    if (error || !data) return { data: null, error: error?.message || 'File not found' };

    const bucket = (data as any).storage_bucket as string;
    const path = (data as any).storage_path as string;

    // Ensure auth session for storage operations
    await ensureAuthSession();

    const { data: urlData, error: urlError } = await browserSupabaseClient.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (urlError || !urlData?.signedUrl) {
      return { data: null, error: urlError?.message || 'Failed to create signed URL' };
    }

    return { data: urlData.signedUrl, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create preview URL' };
  }
}


