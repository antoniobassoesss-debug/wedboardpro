/**
 * Workflow View Component
 *
 * Main view for managing layouts:
 * - Grid of LayoutCard components
 * - "New Layout" button to open CreateLayoutModal
 * - Empty state when no layouts exist
 */

import React, { useState, useCallback } from 'react';
import { LayoutCard } from './LayoutCard';
import { CreateLayoutModal } from './CreateLayoutModal';
import type { Layout, LayoutStatus } from '../../types/layout';

interface WorkflowViewProps {
  layouts: Layout[];
  selectedLayoutId: string | null;
  onSelectLayout: (layoutId: string) => void;
  onEditLayout: (layoutId: string) => void;
  onCreateLayout: (data: { name: string; type: 'blank' | 'duplicate' | 'template'; sourceLayoutId?: string }) => void;
  onDuplicateLayout: (layoutId: string) => void;
  onDeleteLayout: (layoutId: string) => void;
  onRenameLayout: (layoutId: string, newName: string) => void;
}

export const WorkflowView: React.FC<WorkflowViewProps> = ({
  layouts,
  selectedLayoutId,
  onSelectLayout,
  onEditLayout,
  onCreateLayout,
  onDuplicateLayout,
  onDeleteLayout,
  onRenameLayout,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LayoutStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'created'>('updated');

  const filteredLayouts = React.useMemo(() => {
    let result = [...layouts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((layout) =>
        layout.name.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((layout) => layout.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [layouts, searchQuery, statusFilter, sortBy]);

  const handleCreate = useCallback(
    (data: { name: string; type: 'blank' | 'duplicate' | 'template'; sourceLayoutId?: string }) => {
      onCreateLayout(data);
    },
    [onCreateLayout]
  );

  const handleDuplicate = useCallback(
    (layoutId: string) => {
      const layout = layouts.find((l) => l.id === layoutId);
      if (layout) {
        onDuplicateLayout(layoutId);
      }
    },
    [layouts, onDuplicateLayout]
  );

  const handleDelete = useCallback(
    (layoutId: string) => {
      if (window.confirm('Are you sure you want to delete this layout? This action cannot be undone.')) {
        onDeleteLayout(layoutId);
      }
    },
    [onDeleteLayout]
  );

  const statusCounts = React.useMemo(() => {
    const counts: Record<LayoutStatus | 'all', number> = {
      all: layouts.length,
      draft: 0,
      in_progress: 0,
      ready: 0,
      approved: 0,
    };
    layouts.forEach((layout) => {
      counts[layout.status]++;
    });
    return counts;
  }, [layouts]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Layouts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {layouts.length} layout{layouts.length !== 1 ? 's' : ''} • {statusCounts.approved} approved
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Layout
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search layouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'draft', 'in_progress', 'ready', 'approved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  statusFilter === status
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                <span className="ml-1.5 text-xs text-gray-400">
                  ({statusCounts[status]})
                </span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredLayouts.length === 0 ? (
          <EmptyState onCreate={() => setShowCreateModal(true)} />
        ) : (
          <div className="flex flex-wrap gap-5">
            {filteredLayouts.map((layout) => (
              <LayoutCard
                key={layout.id}
                layout={layout}
                isSelected={selectedLayoutId === layout.id}
                onSelect={() => onSelectLayout(layout.id)}
                onEdit={onEditLayout}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onRename={onRenameLayout}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateLayoutModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        existingLayouts={layouts}
      />
    </div>
  );
};

interface EmptyStateProps {
  onCreate: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreate }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No layouts yet</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-sm">
        Create your first layout to start designing your floor plan. You can start from a blank canvas, duplicate an existing layout, or use a template.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create Your First Layout
      </button>
    </div>
  );
};

export default WorkflowView;
