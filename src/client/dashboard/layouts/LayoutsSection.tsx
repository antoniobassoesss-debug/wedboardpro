import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './layouts.css';

// Types for layouts (matches Layout Maker storage)
interface LayoutProject {
  id: string;
  name: string;
  canvasData: {
    drawings: any[];
    shapes: any[];
    textElements: any[];
    walls?: any[];
    doors?: any[];
    viewBox: { x: number; y: number; width: number; height: number };
  };
  // Extended metadata we'll add
  description?: string;
  category?: string;
  tags?: string[];
  linkedProjects?: string[];
  createdAt?: string;
  updatedAt?: string;
  status?: 'active' | 'archived';
}

type ViewMode = 'grid' | 'table';
type SortOption = 'updated' | 'name' | 'used';
type CategoryFilter = 'all' | 'ceremony' | 'reception' | 'full-day' | 'timeline' | 'floorplan' | 'custom';

const STORAGE_KEY = 'layout-maker-projects';

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'reception', label: 'Reception' },
  { value: 'full-day', label: 'Full Day' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'floorplan', label: 'Floorplan' },
  { value: 'custom', label: 'Custom' },
];

const loadLayoutsFromStorage = (): LayoutProject[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map((p: any) => ({
          ...p,
          description: p.description || '',
          category: p.category || 'custom',
          tags: p.tags || [],
          linkedProjects: p.linkedProjects || [],
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
          status: p.status || 'active',
        }));
      }
    }
  } catch (error) {
    console.error('[LayoutsSection] Error loading layouts:', error);
  }
  return [];
};

const saveLayoutsToStorage = (layouts: LayoutProject[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch (error) {
    console.error('[LayoutsSection] Error saving layouts:', error);
  }
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const getLayoutThumbnailClass = (layout: LayoutProject): string => {
  const hasWalls = layout.canvasData?.walls && layout.canvasData.walls.length > 0;
  const hasShapes = layout.canvasData?.shapes && layout.canvasData.shapes.length > 0;
  const hasDrawings = layout.canvasData?.drawings && layout.canvasData.drawings.length > 0;
  
  if (hasWalls) return 'floorplan';
  if (hasShapes) return 'shapes';
  if (hasDrawings) return 'drawings';
  return 'empty';
};

interface QuickViewDrawerProps {
  layout: LayoutProject | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (layoutId: string) => void;
  onDuplicate: (layoutId: string) => void;
  onArchive: (layoutId: string) => void;
  onDelete: (layoutId: string) => void;
  onUpdateLayout: (layoutId: string, updates: Partial<LayoutProject>) => void;
}

const QuickViewDrawer: React.FC<QuickViewDrawerProps> = ({
  layout,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onUpdateLayout,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (layout) {
      setEditName(layout.name);
    }
  }, [layout]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!layout || !isOpen) return null;

  const handleSaveName = () => {
    if (editName.trim() && editName !== layout.name) {
      onUpdateLayout(layout.id, { name: editName.trim() });
    }
    setIsEditingName(false);
  };

  return (
    <div className="layouts-drawer-backdrop" onClick={onClose}>
      <div className="layouts-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="layouts-drawer-header">
          <div className="layouts-drawer-title-row">
            {isEditingName ? (
              <input
                type="text"
                className="layouts-drawer-name-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') {
                    setEditName(layout.name);
                    setIsEditingName(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <h3 className="layouts-drawer-title">
                {layout.name}
                <button
                  type="button"
                  className="layouts-edit-name-btn"
                  onClick={() => setIsEditingName(true)}
                  aria-label="Edit name"
                >
                  ✏️
                </button>
              </h3>
            )}
          </div>
          <button type="button" className="layouts-drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="layouts-drawer-body">
          <button
            type="button"
            className="layouts-drawer-primary-btn"
            onClick={() => onEdit(layout.id)}
          >
            Edit in Layout Maker
          </button>

          <div className="layouts-drawer-section">
            <div className="layouts-drawer-section-title">Description</div>
            <p className="layouts-drawer-description">
              {layout.description || 'No description added yet.'}
            </p>
          </div>

          <div className="layouts-drawer-section">
            <div className="layouts-drawer-section-title">Tags</div>
            <div className="layouts-drawer-tags">
              {layout.tags && layout.tags.length > 0 ? (
                layout.tags.map((tag) => (
                  <span key={tag} className="layouts-tag">{tag}</span>
                ))
              ) : (
                <span className="layouts-drawer-empty">No tags</span>
              )}
            </div>
          </div>

          <div className="layouts-drawer-section">
            <div className="layouts-drawer-section-title">Linked Projects</div>
            {layout.linkedProjects && layout.linkedProjects.length > 0 ? (
              <ul className="layouts-drawer-projects-list">
                {layout.linkedProjects.map((proj) => (
                  <li key={proj}>{proj}</li>
                ))}
              </ul>
            ) : (
              <span className="layouts-drawer-empty">Not linked to any projects</span>
            )}
          </div>

          <div className="layouts-drawer-section">
            <div className="layouts-drawer-section-title">Details</div>
            <div className="layouts-drawer-meta">
              <div>Created: {formatDate(layout.createdAt)}</div>
              <div>Last updated: {formatDate(layout.updatedAt)}</div>
              <div>Status: <span className={`layouts-status-badge ${layout.status}`}>{layout.status}</span></div>
            </div>
          </div>
        </div>

        <div className="layouts-drawer-footer">
          <button
            type="button"
            className="layouts-drawer-action-btn"
            onClick={() => onDuplicate(layout.id)}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="layouts-drawer-action-btn"
            onClick={() => onArchive(layout.id)}
          >
            {layout.status === 'archived' ? 'Unarchive' : 'Archive'}
          </button>
          <button
            type="button"
            className="layouts-drawer-action-btn destructive"
            onClick={() => onDelete(layout.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const LayoutsSection: React.FC = () => {
  const navigate = useNavigate();
  const [layouts, setLayouts] = useState<LayoutProject[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [selectedLayout, setSelectedLayout] = useState<LayoutProject | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load layouts on mount
  useEffect(() => {
    setLayouts(loadLayoutsFromStorage());
  }, []);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter and sort layouts
  const filteredLayouts = useMemo(() => {
    let result = layouts.filter((l) => l.status !== 'archived');

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          l.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((l) => l.category === categoryFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'used':
          return (b.linkedProjects?.length || 0) - (a.linkedProjects?.length || 0);
        case 'updated':
        default:
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
    });

    return result;
  }, [layouts, searchQuery, categoryFilter, sortBy]);

  const handleNewLayout = () => {
    navigate('/layout-maker');
  };

  const handleOpenLayout = (layoutId: string) => {
    // Store the active project ID for Layout Maker
    localStorage.setItem('layout-maker-active-project-id', layoutId);
    navigate('/layout-maker');
  };

  const handleDuplicateLayout = (layoutId: string) => {
    const original = layouts.find((l) => l.id === layoutId);
    if (!original) return;

    const newId = `${Date.now()}`;
    const duplicate: LayoutProject = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedProjects: [],
    };

    const updated = [duplicate, ...layouts];
    setLayouts(updated);
    saveLayoutsToStorage(updated);
    showToast('Layout duplicated');
    setIsDrawerOpen(false);
  };

  const handleArchiveLayout = (layoutId: string) => {
    const updated = layouts.map((l) =>
      l.id === layoutId
        ? { ...l, status: l.status === 'archived' ? 'active' : 'archived' as const, updatedAt: new Date().toISOString() }
        : l
    );
    setLayouts(updated);
    saveLayoutsToStorage(updated);
    const layout = layouts.find((l) => l.id === layoutId);
    showToast(layout?.status === 'archived' ? 'Layout unarchived' : 'Layout archived');
    setIsDrawerOpen(false);
  };

  const handleDeleteLayout = (layoutId: string) => {
    if (!window.confirm('Are you sure you want to delete this layout? This cannot be undone.')) {
      return;
    }
    const updated = layouts.filter((l) => l.id !== layoutId);
    setLayouts(updated);
    saveLayoutsToStorage(updated);
    showToast('Layout deleted');
    setIsDrawerOpen(false);
  };

  const handleUpdateLayout = (layoutId: string, updates: Partial<LayoutProject>) => {
    const updated = layouts.map((l) =>
      l.id === layoutId ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
    );
    setLayouts(updated);
    saveLayoutsToStorage(updated);
    // Update selected layout if it's the one being edited
    if (selectedLayout?.id === layoutId) {
      setSelectedLayout({ ...selectedLayout, ...updates });
    }
    showToast('Layout updated');
  };

  const openQuickView = (layout: LayoutProject) => {
    setSelectedLayout(layout);
    setIsDrawerOpen(true);
  };

  const isEmpty = layouts.length === 0;
  const hasNoResults = !isEmpty && filteredLayouts.length === 0;

  return (
    <div className="layouts-container">
      {/* Header */}
      <div className="layouts-header">
        <div className="layouts-header-right">
          <button type="button" className="layouts-new-btn" onClick={handleNewLayout}>
            + New layout
          </button>
        </div>
      </div>

      {isEmpty ? (
        // Empty State
        <div className="layouts-empty-state">
          <div className="layouts-empty-illustration">
            <div className="layouts-empty-icon">📐</div>
          </div>
          <h2 className="layouts-empty-title">No layouts yet</h2>
          <p className="layouts-empty-description">
            Create your first layout to speed up your wedding planning and reuse designs across weddings.
          </p>
          <ul className="layouts-empty-benefits">
            <li>Save ceremony and reception floorplans as reusable templates</li>
            <li>Keep layouts consistent across venues and seasons</li>
            <li>Quickly tweak and duplicate for each new wedding</li>
          </ul>
          <button type="button" className="layouts-empty-cta" onClick={handleNewLayout}>
            Create your first layout
          </button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="layouts-toolbar">
            <div className="layouts-toolbar-left">
              <input
                type="text"
                className="layouts-search"
                placeholder="Search layouts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="layouts-filter-chips">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`layouts-chip ${categoryFilter === opt.value ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="layouts-toolbar-right">
              <select
                className="layouts-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="updated">Last updated</option>
                <option value="name">Name A–Z</option>
                <option value="used">Most used</option>
              </select>
              <div className="layouts-view-toggle">
                <button
                  type="button"
                  className={`layouts-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  ▦
                </button>
                <button
                  type="button"
                  className={`layouts-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  aria-label="Table view"
                >
                  ☰
                </button>
              </div>
            </div>
          </div>

          {hasNoResults ? (
            <div className="layouts-no-results">
              <p>No layouts match your search or filters.</p>
              <button
                type="button"
                className="layouts-clear-filters"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            // Grid View
            <div className="layouts-grid">
              {filteredLayouts.map((layout) => (
                <div
                  key={layout.id}
                  className="layouts-card"
                  onClick={() => openQuickView(layout)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openQuickView(layout);
                  }}
                >
                  <div className={`layouts-card-thumbnail ${getLayoutThumbnailClass(layout)}`}>
                    <div className="layouts-card-thumbnail-inner" />
                  </div>
                  <div className="layouts-card-body">
                    <div className="layouts-card-name">{layout.name}</div>
                    {layout.description && (
                      <div className="layouts-card-description">{layout.description}</div>
                    )}
                    <div className="layouts-card-tags">
                      {layout.tags?.slice(0, 3).map((tag) => (
                        <span key={tag} className="layouts-tag">{tag}</span>
                      ))}
                      {layout.category && layout.category !== 'custom' && (
                        <span className="layouts-tag category">{layout.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="layouts-card-footer">
                    <span className="layouts-card-date">Updated {formatDate(layout.updatedAt)}</span>
                    <button
                      type="button"
                      className="layouts-card-menu"
                      onClick={(e) => {
                        e.stopPropagation();
                        openQuickView(layout);
                      }}
                      aria-label="More options"
                    >
                      ⋯
                    </button>
                  </div>
                  <button
                    type="button"
                    className="layouts-card-open-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenLayout(layout.id);
                    }}
                  >
                    Open in Layout Maker
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // Table View
            <div className="layouts-table-wrapper">
              <table className="layouts-table">
                <thead>
                  <tr>
                    <th>Layout name</th>
                    <th>Category</th>
                    <th>Linked projects</th>
                    <th>Last updated</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLayouts.map((layout) => (
                    <tr
                      key={layout.id}
                      onClick={() => openQuickView(layout)}
                      className="layouts-table-row"
                    >
                      <td>
                        <div className="layouts-table-name">
                          <span className="layouts-table-icon">📐</span>
                          {layout.name}
                        </div>
                      </td>
                      <td>
                        <span className="layouts-tag category">{layout.category || 'Custom'}</span>
                      </td>
                      <td>{layout.linkedProjects?.length || 0} projects</td>
                      <td>{formatDate(layout.updatedAt)}</td>
                      <td>
                        <span className={`layouts-status-badge ${layout.status}`}>
                          {layout.status}
                        </span>
                      </td>
                      <td>
                        <div className="layouts-table-actions">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLayout(layout.id);
                            }}
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateLayout(layout.id);
                            }}
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveLayout(layout.id);
                            }}
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Quick View Drawer */}
      <QuickViewDrawer
        layout={selectedLayout}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={handleOpenLayout}
        onDuplicate={handleDuplicateLayout}
        onArchive={handleArchiveLayout}
        onDelete={handleDeleteLayout}
        onUpdateLayout={handleUpdateLayout}
      />

      {/* Toast */}
      {toast && (
        <div className={`layouts-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default LayoutsSection;

