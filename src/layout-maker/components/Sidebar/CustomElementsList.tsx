/**
 * Custom Elements List
 *
 * Grid display of saved custom element templates.
 * Matches the simple, clean style of ElementCard.
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

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px',
    }}>
      {templates.map((template) => {
        const svgPath = verticesToSvgPath(template.vertices, true, template.curves);
        const maxDim = Math.max(template.width, template.height, 0.1);
        const scale = 36 / maxDim;
        const viewBoxWidth = template.width * scale;
        const viewBoxHeight = template.height * scale;

        return (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              width: '100%',
              aspectRatio: '1',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title={template.name}
          >
            <svg
              width="40"
              height="40"
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ marginBottom: '4px' }}
            >
              <path
                d={svgPath}
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#475569',
              textAlign: 'center',
              lineHeight: 1.2,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {template.name}
            </span>

            {/* Edit/Delete buttons on hover */}
            <div
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                display: 'flex',
                gap: '2px',
                opacity: 0,
                transition: 'opacity 0.15s ease',
              }}
              className="custom-element-actions"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(template);
                }}
                style={{
                  padding: '4px',
                  background: '#f8fafc',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Edit"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(template);
                }}
                style={{
                  padding: '4px',
                  background: '#f8fafc',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Delete"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </button>
        );
      })}

      {/* Create New Button */}
      <button
        onClick={onCreateNew}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          width: '100%',
          aspectRatio: '1',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.background = '#eff6ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.background = '#f8fafc';
        }}
        title="Create new custom element"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          color: '#64748b',
          marginTop: '4px',
          textAlign: 'center',
        }}>
          New
        </span>
      </button>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.4)',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '320px',
            margin: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fef2f2',
                borderRadius: '8px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  Delete "{deleteConfirm.name}"?
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  This cannot be undone.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#ffffff',
                  cursor: 'pointer',
                  opacity: deleteLoading ? 0.5 : 1,
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for hover effects */}
      <style>{`
        button:hover .custom-element-actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default CustomElementsList;
