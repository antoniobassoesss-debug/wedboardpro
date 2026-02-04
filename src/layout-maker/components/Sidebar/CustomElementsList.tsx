/**
 * Custom Elements List
 *
 * Grid display of saved custom element templates.
 */

import React, { useState } from 'react';
import type { CustomElementTemplate } from '../../types/elements';
import { verticesToSvgPath } from '../../../lib/supabase/custom-elements';

interface CustomElementsListProps {
  templates: CustomElementTemplate[];
  onSelect: (template: CustomElementTemplate) => void;
  onCreateNew: () => void;
  onEdit: (template: CustomElementTemplate) => void;
  onDelete: (template: CustomElementTemplate) => void;
}

const formatMeters = (value: number): string => {
  if (value >= 1) {
    return `${value.toFixed(2)}m`;
  }
  return `${(value * 100).toFixed(0)}cm`;
};

export const CustomElementsList: React.FC<CustomElementsListProps> = ({
  templates,
  onSelect,
  onCreateNew,
  onEdit,
  onDelete,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<CustomElementTemplate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async (template: CustomElementTemplate) => {
    setDeleteLoading(true);
    try {
      await onDelete(template);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm(null);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="p-4">
        <div
          onClick={onCreateNew}
          className="flex flex-col items-center justify-center p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
        >
          <div className="w-12 h-12 mb-3 flex items-center justify-center bg-white rounded-full border border-gray-200 shadow-sm">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Create Custom Element</h4>
          <p className="text-xs text-gray-500 text-center">
            Design your own custom shapes and save them for reuse
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => {
          const svgPath = verticesToSvgPath(template.vertices, true);
          const scale = 40 / Math.max(template.width, template.height, 0.1);
          const viewBoxWidth = template.width * scale;
          const viewBoxHeight = template.height * scale;

          return (
            <div
              key={template.id}
              className="group relative bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer overflow-hidden"
              onClick={() => onSelect(template)}
            >
              <div className="aspect-square p-3 flex items-center justify-center bg-gray-50">
                <svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <path
                    d={svgPath}
                    fill="rgba(59, 130, 246, 0.15)"
                    stroke="#3b82f6"
                    strokeWidth="1"
                  />
                </svg>
              </div>

              <div className="px-3 py-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {template.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {formatMeters(template.width)} × {formatMeters(template.height)}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    {template.vertices.length} pts
                  </span>
                </div>
              </div>

              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(template);
                  }}
                  className="p-1.5 bg-white rounded-md border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(template);
                  }}
                  className="p-1.5 bg-white rounded-md border border-gray-200 shadow-sm hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

        <div
          onClick={onCreateNew}
          className="flex flex-col items-center justify-center p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
        >
          <div className="w-8 h-8 mb-2 flex items-center justify-center bg-white rounded-full border border-gray-200 shadow-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-xs font-medium text-gray-600">New Element</span>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center bg-red-100 rounded-full">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete "{deleteConfirm.name}"?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this custom element? All saved copies will be affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomElementsList;
