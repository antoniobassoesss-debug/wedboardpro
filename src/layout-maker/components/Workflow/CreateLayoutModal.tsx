/**
 * Create Layout Modal
 *
 * Modal dialog for creating new layouts:
 * - Name input
 * - Creation type: Blank / Duplicate / From template
 * - Template selection dropdown
 * - Create button
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Layout } from '../../types/layout';

interface CreateLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; type: 'blank' | 'duplicate' | 'template'; sourceLayoutId?: string }) => void;
  existingLayouts?: Layout[];
}

type CreationType = 'blank' | 'duplicate' | 'template';

export const CreateLayoutModal: React.FC<CreateLayoutModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingLayouts = [],
}) => {
  const [name, setName] = useState('');
  const [creationType, setCreationType] = useState<CreationType>('blank');
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('wedding-round');

  const templates = [
    { id: 'wedding-round', name: 'Wedding Round Tables', description: 'Classic round table arrangement' },
    { id: 'wedding-rectangular', name: 'Wedding Rectangular', description: 'Long banquet tables' },
    { id: 'cocktail', name: 'Cocktail Party', description: 'Standing tables and bar area' },
    { id: 'theater', name: 'Theater Seating', description: 'Rows of chairs facing stage' },
    { id: 'u-shape', name: 'U-Shape Conference', description: 'U-shaped table configuration' },
  ];

  const handleSubmit = useCallback(() => {
    const finalName = name.trim() || 'Untitled Layout';
    onCreate({
      name: finalName,
      type: creationType,
      ...(creationType === 'duplicate' && selectedLayoutId ? { sourceLayoutId: selectedLayoutId } : {}),
    });
    onClose();
  }, [name, creationType, selectedLayoutId, onCreate, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [handleSubmit, onClose]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl overflow-hidden"
        style={{ width: '480px', maxWidth: '90vw' }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Create New Layout</h2>
          <p className="text-sm text-gray-500 mt-1">Start with a blank canvas or use a template</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Layout Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Reception"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Creation type selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start From
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setCreationType('blank')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  creationType === 'blank'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="font-medium text-sm text-gray-900">Blank</div>
                <div className="text-xs text-gray-500 mt-0.5">Empty canvas</div>
              </button>

              <button
                onClick={() => setCreationType('duplicate')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  creationType === 'duplicate'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                disabled={existingLayouts.length === 0}
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="font-medium text-sm text-gray-900">Duplicate</div>
                <div className="text-xs text-gray-500 mt-0.5">Copy existing</div>
              </button>

              <button
                onClick={() => setCreationType('template')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  creationType === 'template'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div className="font-medium text-sm text-gray-900">Template</div>
                <div className="text-xs text-gray-500 mt-0.5">Use template</div>
              </button>
            </div>
          </div>

          {/* Selection based on creation type */}
          {creationType === 'duplicate' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Layout to Duplicate
              </label>
              <select
                value={selectedLayoutId}
                onChange={(e) => setSelectedLayoutId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Choose a layout...</option>
                {existingLayouts.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {layout.name} ({layout.elementOrder.length} elements)
                  </option>
                ))}
              </select>
            </div>
          )}

          {creationType === 'template' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Template
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">{template.name}</div>
                    <div className="text-xs text-gray-500">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={creationType === 'duplicate' && !selectedLayoutId}
            className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${
              creationType === 'duplicate' && !selectedLayoutId
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            Create Layout
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default CreateLayoutModal;
