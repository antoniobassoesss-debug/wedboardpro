import React, { useState } from 'react';
import { createCustomVendorCategory } from '../../../api/suppliersApi';

interface CreateCategoryModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({ onClose, onCreated }) => {
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      setError('Category name is required');
      return;
    }

    setCreating(true);
    setError(null);

    const { error } = await createCustomVendorCategory(label.trim());

    if (error) {
      setError(error);
      setCreating(false);
    } else {
      onCreated();
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content create-category-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Custom Category</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleCreate} className="modal-body">
          <div className="form-field">
            <label htmlFor="category-name">Category Name</label>
            <input
              id="category-name"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Makeup, Entertainment, Rentals..."
              autoFocus
              disabled={creating}
            />
            <p className="field-hint">
              Create a custom category type for your vendors. This will be available across all your events.
            </p>
          </div>
        </form>

        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button className="primary-btn" onClick={handleCreate} disabled={creating || !label.trim()}>
            {creating ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCategoryModal;
