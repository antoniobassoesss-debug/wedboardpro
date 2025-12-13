import React, { useMemo, useState } from 'react';
import type { ProjectFileFolder, ProjectFile } from '../../../api/projectFilesApi';
import { useProjectFilesState } from './useProjectFilesState';
import './files.css';

interface ProjectFilesSectionProps {
  projectId: string;
}

type FolderTreeNode = ProjectFileFolder & { children: FolderTreeNode[] };

const buildFolderTree = (folders: ProjectFileFolder[]): FolderTreeNode[] => {
  const byId = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  folders.forEach((f) => {
    byId.set(f.id, { ...f, children: [] });
  });

  folders.forEach((f) => {
    const node = byId.get(f.id)!;
    if (f.parent_folder_id && byId.has(f.parent_folder_id)) {
      byId.get(f.parent_folder_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const prettyFileSize = (sizeBytes: number | null): string => {
  if (!sizeBytes || Number.isNaN(sizeBytes)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = sizeBytes;
  let idx = 0;
  while (size > 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(1)} ${units[idx]}`;
};

const isImageFile = (file: ProjectFile): boolean =>
  (file.mime_type && file.mime_type.startsWith('image/')) ||
  (file.extension ? ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.extension.toLowerCase()) : false);

const isPdfFile = (file: ProjectFile): boolean =>
  (file.mime_type === 'application/pdf') || file.extension?.toLowerCase() === 'pdf';

interface BasicModalProps {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}

const BasicModal: React.FC<BasicModalProps> = ({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  isOpen,
  onConfirm,
  onClose,
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="files-modal-backdrop" onClick={onClose}>
      <div
        className="files-modal"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="files-modal-header">
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {children && <div className="files-modal-body">{children}</div>}
        <div className="files-modal-footer">
          <button type="button" className="files-btn subtle" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`files-btn primary ${destructive ? 'destructive' : ''}`}
            onClick={() => {
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface FilePreviewPanelProps {
  file: ProjectFile | null;
  url: string | null;
  isLoading: boolean;
  onClose: () => void;
}

const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({ file, url, isLoading, onClose }) => {
  if (!file) return null;
  return (
    <div className="files-preview-backdrop" onClick={onClose}>
      <div
        className="files-preview-panel"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header className="files-preview-header">
          <div className="files-preview-title">
            <span>{file.file_name}</span>
            <span className="files-preview-meta">
              {file.mime_type || file.extension || 'File'} · {prettyFileSize(file.size_bytes)}
            </span>
          </div>
          <button type="button" className="files-btn subtle" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="files-preview-body">
          {isLoading && <div className="files-preview-loading">Loading preview…</div>}
          {!isLoading && url && isImageFile(file) && (
            <img src={url} alt={file.file_name} className="files-preview-image" />
          )}
          {!isLoading && url && isPdfFile(file) && (
            <iframe title={file.file_name} src={url} className="files-preview-pdf" />
          )}
          {!isLoading && url && !isImageFile(file) && !isPdfFile(file) && (
            <div className="files-preview-generic">
              <div className="files-preview-generic-icon">📄</div>
              <div className="files-preview-generic-text">
                <div>{file.file_name}</div>
                <div>{file.mime_type || file.extension || 'Downloadable file'}</div>
                <a href={url} target="_blank" rel="noreferrer" className="files-btn-link">
                  Open in new tab
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProjectFilesSection: React.FC<ProjectFilesSectionProps> = ({ projectId }) => {
  const {
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
    createNewFolder,
    uploadNewFiles,
    requestDeleteFile,
    requestRenameFile,
    requestMoveFile,
    requestRenameFolder,
    requestDeleteFolder,
    openPreview,
    closePreview,
  } = useProjectFilesState({ projectId });

  const [isDragging, setIsDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [renameFileTarget, setRenameFileTarget] = useState<ProjectFile | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<ProjectFileFolder | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [moveFileTarget, setMoveFileTarget] = useState<ProjectFile | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);

  const treeRoots = useMemo(() => buildFolderTree(allFolders), [allFolders]);

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const fileList = event.dataTransfer.files;
    if (!fileList || fileList.length === 0) return;
    const filesArr: File[] = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList.item(i);
      if (f) filesArr.push(f);
    }
    uploadNewFiles(filesArr);
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const startRenameFile = (file: ProjectFile) => {
    setRenameFileTarget(file);
    setRenameValue(file.file_name);
  };

  const startRenameFolder = (folder: ProjectFileFolder) => {
    setRenameFolderTarget(folder);
    setRenameValue(folder.name);
  };

  const confirmRename = async () => {
    const value = renameValue.trim();
    if (!value) return;
    if (renameFileTarget) {
      await requestRenameFile(renameFileTarget.id, value);
    } else if (renameFolderTarget) {
      await requestRenameFolder(renameFolderTarget.id, value);
    }
    setRenameFileTarget(null);
    setRenameFolderTarget(null);
    setRenameValue('');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'file') {
      await requestDeleteFile(deleteTarget.id);
    } else {
      await requestDeleteFolder(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const startMoveFile = (file: ProjectFile) => {
    setMoveFileTarget(file);
    setMoveTargetFolderId(file.folder_id);
  };

  const confirmMoveFile = async () => {
    if (!moveFileTarget) return;
    await requestMoveFile(moveFileTarget.id, moveTargetFolderId);
    setMoveFileTarget(null);
    setMoveTargetFolderId(null);
  };

  const currentFolderLabel =
    breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1]?.label : 'All files for this project';

  return (
    <div className="files-shell">
      <div className={`files-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="files-sidebar-header">
          <div className="files-sidebar-title">
            <span className="dot" />
            <span>Files</span>
          </div>
          <button type="button" className="files-btn subtle hide-desktop" onClick={() => setSidebarOpen(false)}>
            Close
          </button>
        </div>
        <div className="files-sidebar-section">
          <div className="files-sidebar-section-title">Library</div>
          <button
            type="button"
            className={`files-pill ${currentFolderId === null ? 'active' : ''}`}
            onClick={() => openFolder(null)}
          >
            All files
          </button>
        </div>
        <div className="files-sidebar-section">
          <div className="files-sidebar-section-title">Folders</div>
          {treeRoots.length === 0 ? (
            <div className="files-sidebar-empty">No folders yet. Create your first folder.</div>
          ) : (
            <ul className="files-tree">
              {treeRoots.map((node) => (
                <FolderNode
                  key={node.id}
                  node={node}
                  activeId={currentFolderId}
                  onOpen={(id) => {
                    openFolder(id);
                    setSidebarOpen(false);
                  }}
                  onRename={startRenameFolder}
                  onDelete={(folder) =>
                    setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })
                  }
                />
              ))}
            </ul>
          )}
        </div>
        <div className="files-sidebar-new-folder">
          <input
            type="text"
            placeholder="New folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <button
            type="button"
            className="files-btn primary"
            disabled={!newFolderName.trim()}
            onClick={async () => {
              const value = newFolderName.trim();
              if (!value) return;
              await createNewFolder(value);
              setNewFolderName('');
            }}
          >
            New folder
          </button>
        </div>
      </div>

      <div
        className={`files-main ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isDragging && <div className="files-drop-overlay">Drop files to upload to {currentFolderLabel}</div>}
        <div className="files-toolbar">
          <div className="files-breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <button
                // eslint-disable-next-line react/no-array-index-key
                key={`${crumb.id ?? 'root'}-${index}`}
                type="button"
                className={`files-breadcrumb ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                onClick={() => openFolder(crumb.id)}
                disabled={index === breadcrumbs.length - 1}
              >
                {crumb.label}
              </button>
            ))}
          </div>
          <div className="files-toolbar-actions">
            <button
              type="button"
              className="files-btn subtle show-tablet"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              Folders
            </button>
            <label className="files-upload-btn">
              <span>Upload</span>
              <input
                type="file"
                multiple
                onChange={(event) => {
                  const fileList = event.target.files;
                  if (!fileList || fileList.length === 0) return;
                  const filesArr: File[] = [];
                  // eslint-disable-next-line no-plusplus
                  for (let i = 0; i < fileList.length; i++) {
                    const f = fileList.item(i);
                    if (f) filesArr.push(f);
                  }
                  uploadNewFiles(filesArr);
                  // reset input so same file can be uploaded again
                  // eslint-disable-next-line no-param-reassign
                  event.target.value = '';
                }}
              />
            </label>
            <div className="files-view-toggle">
              <button
                type="button"
                className={`files-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                Grid
              </button>
              <button
                type="button"
                className={`files-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                List
              </button>
            </div>
          </div>
        </div>

        <div className="files-main-header">
          <div>
            <div className="files-main-title">{currentFolderLabel}</div>
          </div>
          {loading && <div className="files-badge">Syncing…</div>}
        </div>

        {error && <div className="files-error">Failed to load files: {error}</div>}

        {folders.length === 0 && files.length === 0 && !loading ? (
          <div className="files-empty-state">
            <div className="files-empty-illustration" />
            <h3>Start the story for this wedding</h3>
            <p>Create folders like “Contracts”, “Moodboards”, or “Vendors”, then drag files here from your desktop.</p>
          </div>
        ) : (
          <>
            {folders.length > 0 && (
              <div className="files-section-label">Folders</div>
            )}
            {folders.length > 0 && (
              <div className={`files-grid folders ${viewMode === 'list' ? 'list' : ''}`}>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className="files-item files-item-folder"
                    onDoubleClick={() => openFolder(folder.id)}
                    onClick={() => openFolder(folder.id)}
                  >
                    <div className="files-item-icon folder" />
                    <div className="files-item-meta">
                      <div className="files-item-name">{folder.name}</div>
                      <div className="files-item-sub">Folder</div>
                    </div>
                    <div className="files-item-actions">
                      <button
                        type="button"
                        className="files-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRenameFolder(folder);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="files-icon-btn destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name });
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <div className="files-section-label">Files</div>
            )}
            {files.length > 0 && (
              <div className={`files-grid ${viewMode === 'list' ? 'list' : ''}`}>
                {files.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    className="files-item"
                    onDoubleClick={() => openPreview(file)}
                  >
                    <div className={`files-item-icon ${isImageFile(file) ? 'image' : isPdfFile(file) ? 'pdf' : 'doc'}`} />
                    <div className="files-item-meta">
                      <div className="files-item-name">{file.file_name}</div>
                      <div className="files-item-sub">
                        {file.mime_type || file.extension || 'File'} · {prettyFileSize(file.size_bytes)}
                      </div>
                    </div>
                    <div className="files-item-actions">
                      <button
                        type="button"
                        className="files-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(file);
                        }}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className="files-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRenameFile(file);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="files-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          startMoveFile(file);
                        }}
                      >
                        Move
                      </button>
                      <button
                        type="button"
                        className="files-icon-btn destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ type: 'file', id: file.id, name: file.file_name });
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {uploads.length > 0 && (
          <div className="files-upload-tray">
            <div className="files-upload-tray-header">Uploading</div>
            <div className="files-upload-tray-list">
              {uploads.map((u) => (
                <div key={u.file.name} className="files-upload-row">
                  <div className="files-upload-name">{u.file.name}</div>
                  <div className="files-upload-bar">
                    <span style={{ width: `${u.progress}%` }} />
                  </div>
                  <div className="files-upload-status">{u.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BasicModal
        title={renameFolderTarget ? 'Rename folder' : 'Rename file'}
        description={
          renameFolderTarget
            ? 'Give this folder a clear, descriptive name so your team can find documents instantly.'
            : 'Update how this file appears in your Files library. The underlying document stays the same.'
        }
        confirmLabel="Save"
        isOpen={!!renameFileTarget || !!renameFolderTarget}
        onClose={() => {
          setRenameFileTarget(null);
          setRenameFolderTarget(null);
          setRenameValue('');
        }}
        onConfirm={confirmRename}
      >
        <input
          type="text"
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          className="files-input"
        />
      </BasicModal>

      <BasicModal
        title={deleteTarget?.type === 'folder' ? 'Delete folder' : 'Delete file'}
        description={
          deleteTarget?.type === 'folder'
            ? 'This removes the folder from the sidebar. Files inside will move to the project root.'
            : 'This removes the file from Supabase Storage and from this wedding project.'
        }
        confirmLabel="Delete"
        destructive
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      >
        {deleteTarget && (
          <p style={{ margin: 0 }}>
            <strong>{deleteTarget.name}</strong>
          </p>
        )}
      </BasicModal>

      <BasicModal
        title="Move file"
        description="Select a destination folder for this file."
        confirmLabel="Move"
        isOpen={!!moveFileTarget}
        onClose={() => {
          setMoveFileTarget(null);
          setMoveTargetFolderId(null);
        }}
        onConfirm={confirmMoveFile}
      >
        {moveFileTarget && (
          <div className="files-move-folder-list">
            <button
              type="button"
              className={`files-move-folder-option ${moveTargetFolderId === null ? 'active' : ''}`}
              onClick={() => setMoveTargetFolderId(null)}
            >
              📁 Project Root (All files)
            </button>
            {allFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={`files-move-folder-option ${moveTargetFolderId === folder.id ? 'active' : ''}`}
                onClick={() => setMoveTargetFolderId(folder.id)}
              >
                📂 {folder.path_cache || folder.name}
              </button>
            ))}
          </div>
        )}
      </BasicModal>

      <FilePreviewPanel file={previewFile} url={previewUrl} isLoading={isPreviewLoading} onClose={closePreview} />
    </div>
  );
};

interface FolderNodeProps {
  node: FolderTreeNode;
  activeId: string | null;
  onOpen: (id: string) => void;
  onRename: (folder: ProjectFileFolder) => void;
  onDelete: (folder: ProjectFileFolder) => void;
}

const FolderNode: React.FC<FolderNodeProps> = ({ node, activeId, onOpen, onRename, onDelete }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li className="files-tree-item">
      <div
        className={`files-tree-row ${activeId === node.id ? 'active' : ''}`}
        onClick={() => onOpen(node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            className="files-tree-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="files-tree-toggle placeholder" />
        )}
        <span className="files-tree-folder-icon" />
        <span className="files-tree-label">{node.name}</span>
        <div className="files-tree-actions">
          <button
            type="button"
            className="files-icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRename(node);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            className="files-icon-btn destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {hasChildren && expanded && (
        <ul className="files-tree-children">
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              activeId={activeId}
              onOpen={onOpen}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default ProjectFilesSection;


