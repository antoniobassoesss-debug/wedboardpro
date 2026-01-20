import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  createCategory,
  parseCurrencyToCents,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type CategoryName,
  type Currency,
} from '../../../api/weddingBudgetApi';

interface AddCategoryModalProps {
  eventId: string;
  currency: Currency;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value: value as CategoryName,
  label,
  icon: CATEGORY_ICONS[value as CategoryName],
}));

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  eventId,
  currency,
  onClose,
  onSuccess,
}) => {
  const [categoryName, setCategoryName] = useState<CategoryName>('venue');
  const [customName, setCustomName] = useState('');
  const [budgetedAmount, setBudgetedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseCurrencyToCents(budgetedAmount);
    if (amount <= 0) {
      setError('Please enter a valid budget amount');
      return;
    }

    setSaving(true);

    const { error: apiError } = await createCategory(eventId, {
      category_name: categoryName,
      custom_name: customName.trim() || null,
      budgeted_amount: amount,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (apiError) {
      setError(apiError);
      return;
    }

    onSuccess();
  };

  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  const content = (
    <div className="budget-modal-backdrop" onClick={onClose}>
      <div className="budget-modal" onClick={(e) => e.stopPropagation()}>
        <div className="budget-modal-header">
          <h3>Add Budget Category</h3>
          <button className="budget-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="budget-modal-body">
            {error && <div className="budget-modal-error">{error}</div>}

            <div className="budget-form-group">
              <label>Category</label>
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value as CategoryName)}
                className="budget-select"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {categoryName === 'other' && (
              <div className="budget-form-group">
                <label>Custom Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter category name"
                  className="budget-input"
                  maxLength={50}
                />
              </div>
            )}

            <div className="budget-form-group">
              <label>Budgeted Amount</label>
              <div className="budget-currency-input">
                <span className="budget-currency-symbol">{currencySymbol}</span>
                <input
                  type="text"
                  value={budgetedAmount}
                  onChange={(e) => setBudgetedAmount(e.target.value)}
                  placeholder="0"
                  className="budget-input budget-input-currency"
                  autoFocus
                />
              </div>
            </div>

            <div className="budget-form-group">
              <label>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this category..."
                className="budget-textarea"
                rows={3}
              />
            </div>
          </div>

          <div className="budget-modal-footer">
            <button type="button" onClick={onClose} className="budget-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="budget-btn-primary">
              {saving ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};

export default AddCategoryModal;
