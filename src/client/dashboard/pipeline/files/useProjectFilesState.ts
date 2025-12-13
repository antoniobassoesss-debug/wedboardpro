import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ProjectFile,
  ProjectFileFolder,
  UploadProgress,
} from '../../../api/projectFilesApi';
import {
  createFolder,
  deleteFile,
  deleteFolder,
  getSignedUrlForPreview,
  listFoldersAndFiles,
  moveFile,
  renameFile,
  renameFolder,
  uploadFiles,
} from '../../../api/projectFilesApi';

export type ViewMode = 'grid' | 'list';

export interface UseProjectFilesStateOptions {
  projectId: string;
}

export interface UseProjectFilesStateResult {
  loading: boolean;
  error: string | null;
  currentFolderId: string | null;
  folders: ProjectFileFolder[];
  files: ProjectFile[];
  allFolders: ProjectFileFolder[];
  viewMode: ViewMode;
  uploads: UploadProgress[];
  previewFile: ProjectFile | null;
  previewUrl: string | null;
  isPreviewLoading: boolean;

  breadcrumbs: { id: string | null; label: string }[];

  setViewMode: (mode: ViewMode) => void;
  openFolder: (folderId: string | null) => void;
  refresh: () => Promise<void>;
  createNewFolder: (name: string) => Promise<void>;
  uploadNewFiles: (files: File[]) => Promise<void>;
  requestDeleteFile: (fileId: string) => Promise<void>;
  requestRenameFile: (fileId: string, name: string) => Promise<void>;
  requestMoveFile: (fileId: string, targetFolderId: string | null) => Promise<void>;
  requestRenameFolder: (folderId: string, name: string) => Promise<void>;
  requestDeleteFolder: (folderId: string) => Promise<void>;

  openPreview: (file: ProjectFile) => Promise<void>;
  closePreview: () => void;
}

export function useProjectFilesState(options: UseProjectFilesStateOptions): UseProjectFilesStateResult {
  const { projectId } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<ProjectFileFolder[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [allFolders, setAllFolders] = useState<ProjectFileFolder[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const load = useCallback(
    async (folderId: string | null = currentFolderId) => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await listFoldersAndFiles({
        projectId,
        parentFolderId: folderId,
      });
      if (err) {
        setError(err);
        setFolders([]);
        setFiles([]);
        setAllFolders([]);
      } else if (data) {
        setFolders(data.folders);
        setFiles(data.files);
        setAllFolders(data.allFolders);
        setCurrentFolderId(folderId);
      }
      setLoading(false);
    },
    [currentFolderId, projectId],
  );

  useEffect(() => {
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const refresh = useCallback(async () => {
    await load(currentFolderId);
  }, [currentFolderId, load]);

  const openFolder = useCallback(
    async (folderId: string | null) => {
      await load(folderId);
    },
    [load],
  );

  const createNewFolder = useCallback(
    async (name: string) => {
      if (!name.trim()) return;
      const { error: err } = await createFolder({
        projectId,
        parentFolderId: currentFolderId,
        name,
      });
      if (err) {
        // eslint-disable-next-line no-alert
        alert(`Failed to create folder: ${err}`);
      } else {
        await refresh();
      }
    },
    [currentFolderId, projectId, refresh],
  );

  const uploadNewFiles = useCallback(
    async (filesToUpload: File[]) => {
      if (!filesToUpload.length) return;

      setUploads((prev) => [
        ...prev,
        ...filesToUpload.map((file) => ({
          file,
          progress: 0,
          status: 'uploading' as const,
        })),
      ]);

      const { error: err } = await uploadFiles({
        projectId,
        folderId: currentFolderId,
        files: filesToUpload,
        onProgress: (update) => {
          setUploads((prev) => {
            const next = prev.slice();
            const idx = next.findIndex((u) => u.file === update.file);
            if (idx >= 0) {
              next[idx] = { ...next[idx], ...update };
            } else {
              next.push(update);
            }
            return next;
          });
        },
      });

      if (err) {
        // eslint-disable-next-line no-alert
        alert(`Some files failed to upload: ${err}`);
      }

      setUploads((prev) => prev.filter((u) => u.status === 'uploading'));
      await refresh();
    },
    [currentFolderId, projectId, refresh],
  );

  const requestDeleteFile = useCallback(
    async (fileId: string) => {
      const { error: err } = await deleteFile(fileId);
      if (err) {
        // eslint-disable-next-line no-alert
        alert(`Failed to delete file: ${err}`);
      } else {
        await refresh();
      }
    },
    [refresh],
  );

  const requestRenameFile = useCallback(
    async (fileId: string, name: string) => {
      const { error: err } = await renameFile({ fileId, fileName: name });
      if (err) {
        // eslint-disable-next-line no-alert
        alert(`Failed to rename file: ${err}`);
      } else {
        await refresh();
      }
    },
    [refresh],
  );

  const requestMoveFile = useCallback(
    async (fileId: string, targetFolderId: string | null) => {
      const { error: err } = await moveFile({ fileId, targetFolderId });
      if (err) {
        // eslint-disable-next-line no-alert
        alert(`Failed to move file: ${err}`);
      } else {
        await refresh();
      }
    },
    [refresh],
  );

  const requestRenameFolder = useCallback(
    async (folderId: string, name: string) => {
      const { error: err } = await renameFolder({ folderId, name });
      if (err) {
        // eslint-disable-next-line no-alert
        alert(`Failed to rename folder: ${err}`);
      } else {
        await refresh();
      }
    },
    [refresh],
  );

  const requestDeleteFolder = useCallback(
    async (folderId: string) => {
      const { error: err } = await deleteFolder(folderId);
      if (err) {
        // eslint-disable-next-line no-alert
        alert(`Failed to delete folder: ${err}`);
      } else {
        if (currentFolderId === folderId) {
          await openFolder(null);
        } else {
          await refresh();
        }
      }
    },
    [currentFolderId, openFolder, refresh],
  );

  const openPreview = useCallback(
    async (file: ProjectFile) => {
      setPreviewFile(file);
      setIsPreviewLoading(true);
      setPreviewUrl(null);
      const { data, error: err } = await getSignedUrlForPreview(file.id);
      if (err) {
        // eslint-disable-next-line no-alert
        alert(`Failed to load preview: ${err}`);
      } else {
        setPreviewUrl(data);
      }
      setIsPreviewLoading(false);
    },
    [],
  );

  const closePreview = useCallback(() => {
    setPreviewFile(null);
    setPreviewUrl(null);
  }, []);

  const breadcrumbs = useMemo(() => {
    if (!currentFolderId) {
      return [{ id: null, label: 'All files' }];
    }

    const map = new Map(allFolders.map((f) => [f.id, f]));
    const chain: ProjectFileFolder[] = [];
    let cursor: ProjectFileFolder | undefined = map.get(currentFolderId);
    while (cursor) {
      chain.unshift(cursor);
      cursor = cursor.parent_folder_id ? map.get(cursor.parent_folder_id) : undefined;
    }

    return [{ id: null, label: 'All files' }].concat(
      chain.map((folder) => ({ id: folder.id, label: folder.name })),
    );
  }, [allFolders, currentFolderId]);

  return {
    loading,
    error,
    currentFolderId,
    folders,
    files,
    allFolders,
    viewMode,
    uploads,
    previewFile,
    previewUrl,
    isPreviewLoading,
    breadcrumbs,
    setViewMode,
    openFolder,
    refresh,
    createNewFolder,
    uploadNewFiles,
    requestDeleteFile,
    requestRenameFile,
    requestMoveFile,
    requestRenameFolder,
    requestDeleteFolder,
    openPreview,
    closePreview,
  };
}


