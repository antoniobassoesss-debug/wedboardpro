import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  updateCategory,
  formatCurrency,
  parseCurrencyToCents,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type BudgetCategory,
  type CategoryName,
  type Currency,
} from '../../../api/weddingBudgetApi';
import { listSuppliers, type Supplier, type EventSupplierStatus } from '../../../api/suppliersApi';

interface EditCategoryModalProps {
  eventId: string;
  category: BudgetCategory;
  currency: Currency;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value: value as CategoryName,
  label,
  icon: CATEGORY_ICONS[value as CategoryName],
}));

const SUPPLIER_STATUS_OPTIONS: { value: EventSupplierStatus; label: string; color: string; bg: string }[] = [
  { value: 'potential', label: 'Potential', color: '#6b7280', bg: '#f3f4f6' },
  { value: 'contacted', label: 'Contacted', color: '#8b5cf6', bg: '#f5f3ff' },
  { value: 'quote_requested', label: 'Quote Requested', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'quote_received', label: 'Quote Received', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'negotiating', label: 'Negotiating', color: '#ec4899', bg: '#fdf2f8' },
  { value: 'confirmed', label: 'Confirmed', color: '#16a34a', bg: '#ecfdf5' },
  { value: 'paid_completed', label: 'Paid', color: '#059669', bg: '#d1fae5' },
  { value: 'declined_lost', label: 'Declined', color: '#dc2626', bg: '#fef2f2' },
];

const INVOICE_STATUS_OPTIONS = [
  { value: 'no_invoice', label: 'No Invoice' },
  { value: 'invoice_pending', label: 'Pending' },
  { value: 'invoice_sent', label: 'Sent' },
  { value: 'invoice_approved', label: 'Approved' },
  { value: 'invoice_paid', label: 'Paid' },
];

const CATEGORY_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', color: '#6b7280', bg: '#f3f4f6' },
  { value: 'in_progress', label: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'awaiting_invoice', label: 'Awaiting Invoice', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'invoice_received', label: 'Invoice Received', color: '#8b5cf6', bg: '#f5f3ff' },
  { value: 'paid', label: 'Paid', color: '#16a34a', bg: '#ecfdf5' },
  { value: 'completed', label: 'Completed', color: '#059669', bg: '#d1fae5' },
];

interface CategorySupplier {
  supplier_id: string;
  supplier_name: string;
  supplier_company: string | null;
  supplier_category: string;
  status: EventSupplierStatus;
  quoted_price: number | null;
  invoice_status: string;
  invoice_amount: number | null;
}

const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  eventId,
  category,
  currency,
  onClose,
  onSuccess,
}) => {
  const [categoryName, setCategoryName] = useState<CategoryName>(category.category_name);
  const [customName, setCustomName] = useState(category.custom_name || '');
  const [budgetedAmount, setBudgetedAmount] = useState(String(category.budgeted_amount / 100));
  const [contractedAmount, setContractedAmount] = useState(
    category.contracted_amount ? String(category.contracted_amount / 100) : ''
  );
  const [isContracted, setIsContracted] = useState(category.is_contracted);
  const [categoryStatus, setCategoryStatus] = useState(category.category_status || 'planned');
  const [notes, setNotes] = useState(category.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categorySuppliers, setCategorySuppliers] = useState<CategorySupplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const [pendingSupplier, setPendingSupplier] = useState<Supplier | null>(null);
  const [supplierQuote, setSupplierQuote] = useState('');
  const [supplierStatus, setSupplierStatus] = useState<EventSupplierStatus>('potential');
  const [supplierInvoiceStatus, setSupplierInvoiceStatus] = useState('no_invoice');
const [supplierInvoiceAmount, setSupplierInvoiceAmount] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<CategorySupplier | null>(null);
  const [editStatus, setEditStatus] = useState<EventSupplierStatus>('potential');
  const [editQuote, setEditQuote] = useState('');
  const [editInvoiceStatus, setEditInvoiceStatus] = useState('no_invoice');
  const [editInvoiceAmount, setEditInvoiceAmount] = useState('');

  useEffect(() => {
    const loadSuppliers = async () => {
      const { data } = await listSuppliers({ category: 'all' });
      if (data) {
        setSuppliers(data);
      }
    };
    loadSuppliers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.company_name && s.company_name.toLowerCase().includes(supplierSearch.toLowerCase()))
  );

  const handleSelectSupplier = (supplier: Supplier) => {
    setPendingSupplier(supplier);
    setSupplierSearch('');
    setShowSupplierDropdown(false);
    setSupplierQuote('');
    setSupplierStatus('potential');
    setSupplierInvoiceStatus('no_invoice');
    setSupplierInvoiceAmount('');
  };

  const handleCancelPending = () => {
    setPendingSupplier(null);
  };

  const handleAddSupplier = () => {
    if (!pendingSupplier) return;

    const newSupplier: CategorySupplier = {
      supplier_id: pendingSupplier.id,
      supplier_name: pendingSupplier.name,
      supplier_company: pendingSupplier.company_name,
      supplier_category: pendingSupplier.category,
      status: supplierStatus,
      quoted_price: supplierQuote ? parseCurrencyToCents(supplierQuote) : null,
      invoice_status: supplierInvoiceStatus,
      invoice_amount: supplierInvoiceAmount ? parseCurrencyToCents(supplierInvoiceAmount) : null,
    };

    setCategorySuppliers([...categorySuppliers, newSupplier]);
    setPendingSupplier(null);
  };

  const handleRemoveSupplier = (supplierId: string) => {
    setCategorySuppliers(categorySuppliers.filter((cs) => cs.supplier_id !== supplierId));
    if (editingSupplier?.supplier_id === supplierId) {
      setEditingSupplier(null);
    }
  };

  const handleOpenEditSupplier = (cs: CategorySupplier) => {
    setEditingSupplier(cs);
    setEditStatus(cs.status);
    setEditQuote(cs.quoted_price ? String(cs.quoted_price / 100) : '');
    setEditInvoiceStatus(cs.invoice_status);
    setEditInvoiceAmount(cs.invoice_amount ? String(cs.invoice_amount / 100) : '');
  };

  const handleSaveEditSupplier = () => {
    if (!editingSupplier) return;
    setCategorySuppliers(
      categorySuppliers.map((cs) =>
        cs.supplier_id === editingSupplier.supplier_id
          ? {
              ...cs,
              status: editStatus,
              quoted_price: editQuote ? parseCurrencyToCents(editQuote) : null,
              invoice_status: editInvoiceStatus,
              invoice_amount: editInvoiceAmount ? parseCurrencyToCents(editInvoiceAmount) : null,
            }
          : cs
      )
    );
    setEditingSupplier(null);
  };

  const handleCancelEditSupplier = () => {
    setEditingSupplier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const budgeted = parseCurrencyToCents(budgetedAmount);
    if (budgeted <= 0) {
      setError('Please enter a valid budget amount');
      return;
    }

    const contracted = contractedAmount ? parseCurrencyToCents(contractedAmount) : null;

    setSaving(true);

    const { error: apiError } = await updateCategory(eventId, category.id, {
      category_name: categoryName,
      custom_name: customName.trim() || null,
      budgeted_amount: budgeted,
      contracted_amount: contracted,
      is_contracted: isContracted,
      category_status: categoryStatus,
      paid_amount: category.paid_amount,
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
      <div className="budget-modal budget-modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="budget-modal-header">
          <h3>Edit Category</h3>
          <button className="budget-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="budget-modal-body">
            {error && <div className="budget-modal-error">{error}</div>}

            <div className="budget-edit-grid">
              <div className="budget-edit-left">
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

                <div className="budget-form-row">
                  <div className="budget-form-group">
                    <label>Budgeted</label>
                    <div className="budget-currency-input">
                      <span className="budget-currency-symbol">{currencySymbol}</span>
                      <input
                        type="text"
                        value={budgetedAmount}
                        onChange={(e) => setBudgetedAmount(e.target.value)}
                        placeholder="0"
                        className="budget-input budget-input-currency"
                      />
                    </div>
                  </div>

                  <div className="budget-form-group">
                    <label>Status</label>
                    <select
                      value={categoryStatus}
                      onChange={(e) => setCategoryStatus(e.target.value)}
                      className="budget-select"
                    >
                      {CATEGORY_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="budget-form-group">
                  <label>Contracted</label>
                  <div className="budget-currency-input">
                    <span className="budget-currency-symbol">{currencySymbol}</span>
                    <input
                      type="text"
                      value={contractedAmount}
                      onChange={(e) => setContractedAmount(e.target.value)}
                      placeholder="0"
                      className="budget-input budget-input-currency"
                    />
                  </div>
                </div>

                <div className="budget-form-group">
                  <label className="budget-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isContracted}
                      onChange={(e) => setIsContracted(e.target.checked)}
                    />
                    Contract signed
                  </label>
                </div>

                <div className="budget-form-group">
                  <label>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes..."
                    className="budget-textarea"
                    rows={3}
                  />
                </div>
              </div>

              <div className="budget-edit-right">
                <div className="budget-payments-header">
                  <h4>Suppliers</h4>
                  <div className="budget-payments-summary">
                    {categorySuppliers.length} added
                  </div>
                </div>

                {!pendingSupplier ? (
                  <div className="budget-supplier-dropdown" ref={supplierDropdownRef}>
                    <input
                      type="text"
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      placeholder="Search suppliers..."
                      className="budget-input"
                    />
                    {showSupplierDropdown && supplierSearch && (
                      <div className="budget-supplier-results">
                        {filteredSuppliers
                          .filter((s) => !categorySuppliers.find((cs) => cs.supplier_id === s.id))
                          .slice(0, 8)
                          .map((supplier) => (
                            <button
                              key={supplier.id}
                              type="button"
                              className="budget-supplier-result"
                              onClick={() => handleSelectSupplier(supplier)}
                            >
                              <div className="budget-supplier-result-info">
                                <div className="budget-supplier-result-name">{supplier.name}</div>
                                <div className="budget-supplier-result-company">{supplier.company_name || supplier.category}</div>
                              </div>
                              <svg className="budget-supplier-result-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          ))}
                        {filteredSuppliers.filter((s) => !categorySuppliers.find((cs) => cs.supplier_id === s.id)).length === 0 && (
                          <div className="budget-supplier-empty">No suppliers found</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="budget-pending-card">
                    <div className="budget-pending-card-header">
                      <div className="budget-pending-card-info">
                        <div className="budget-pending-card-name">{pendingSupplier.name}</div>
                        <div className="budget-pending-card-company">{pendingSupplier.company_name || pendingSupplier.category}</div>
                      </div>
                      <button type="button" className="budget-pending-card-cancel" onClick={handleCancelPending}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="budget-pending-card-body">
                      <div className="budget-pending-card-field">
                        <label>Status</label>
                        <select
                          value={supplierStatus}
                          onChange={(e) => setSupplierStatus(e.target.value as EventSupplierStatus)}
                          className="budget-select"
                        >
                          {SUPPLIER_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="budget-pending-card-field">
                        <label>Quote</label>
                        <div className="budget-currency-input">
                          <span className="budget-currency-symbol">{currencySymbol}</span>
                          <input
                            type="text"
                            value={supplierQuote}
                            onChange={(e) => setSupplierQuote(e.target.value)}
                            placeholder="0"
                            className="budget-input"
                          />
                        </div>
                      </div>
                      <div className="budget-pending-card-field">
                        <label>Invoice</label>
                        <select
                          value={supplierInvoiceStatus}
                          onChange={(e) => setSupplierInvoiceStatus(e.target.value)}
                          className="budget-select"
                        >
                          {INVOICE_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="budget-pending-card-field">
                        <label>Amount</label>
                        <div className="budget-currency-input">
                          <span className="budget-currency-symbol">{currencySymbol}</span>
                          <input
                            type="text"
                            value={supplierInvoiceAmount}
                            onChange={(e) => setSupplierInvoiceAmount(e.target.value)}
                            placeholder="0"
                            className="budget-input"
                          />
                        </div>
                      </div>
                    </div>
                    <button type="button" className="budget-btn-add-supplier" onClick={handleAddSupplier}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add to Category
                    </button>
                  </div>
                )}

                <div className="budget-suppliers-list">
                  {categorySuppliers.length === 0 ? (
                    <div className="budget-payments-empty">No suppliers added yet</div>
                  ) : (
                    categorySuppliers.map((cs) => (
                      <div key={cs.supplier_id}>
                        {editingSupplier?.supplier_id === cs.supplier_id ? (
                          <div className="budget-pending-card">
                            <div className="budget-pending-card-header">
                              <div className="budget-pending-card-info">
                                <div className="budget-pending-card-name">{cs.supplier_name}</div>
                                <div className="budget-pending-card-company">{cs.supplier_company || cs.supplier_category}</div>
                              </div>
                              <button type="button" className="budget-pending-card-cancel" onClick={handleCancelEditSupplier}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="budget-pending-card-body">
                              <div className="budget-pending-card-field">
                                <label>Status</label>
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value as EventSupplierStatus)}
                                  className="budget-select"
                                >
                                  {SUPPLIER_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="budget-pending-card-field">
                                <label>Quote</label>
                                <div className="budget-currency-input">
                                  <span className="budget-currency-symbol">{currencySymbol}</span>
                                  <input
                                    type="text"
                                    value={editQuote}
                                    onChange={(e) => setEditQuote(e.target.value)}
                                    placeholder="0"
                                    className="budget-input"
                                  />
                                </div>
                              </div>
                              <div className="budget-pending-card-field">
                                <label>Invoice</label>
                                <select
                                  value={editInvoiceStatus}
                                  onChange={(e) => setEditInvoiceStatus(e.target.value)}
                                  className="budget-select"
                                >
                                  {INVOICE_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="budget-pending-card-field">
                                <label>Amount</label>
                                <div className="budget-currency-input">
                                  <span className="budget-currency-symbol">{currencySymbol}</span>
                                  <input
                                    type="text"
                                    value={editInvoiceAmount}
                                    onChange={(e) => setEditInvoiceAmount(e.target.value)}
                                    placeholder="0"
                                    className="budget-input"
                                  />
                                </div>
                              </div>
                            </div>
                            <button type="button" className="budget-btn-add-supplier" onClick={handleSaveEditSupplier}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Save Changes
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="budget-supplier-card"
                            onClick={() => handleOpenEditSupplier(cs)}
                          >
                            <div className="budget-supplier-card-left">
                              <div className="budget-supplier-avatar">
                                {cs.supplier_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="budget-supplier-card-info">
                                <div className="budget-supplier-card-name">{cs.supplier_name}</div>
                                <div className="budget-supplier-card-badges">
                                  <span className="budget-supplier-card-badge" style={{ color: SUPPLIER_STATUS_OPTIONS.find(o => o.value === cs.status)?.color, backgroundColor: SUPPLIER_STATUS_OPTIONS.find(o => o.value === cs.status)?.bg }}>
                                    {SUPPLIER_STATUS_OPTIONS.find(o => o.value === cs.status)?.label}
                                  </span>
                                  <span className="budget-supplier-card-invoice" style={{ color: cs.invoice_status === 'invoice_paid' ? '#16a34a' : cs.invoice_status === 'no_invoice' ? '#9ca3af' : '#f59e0b' }}>
                                    {cs.invoice_status === 'no_invoice' ? 'No Invoice' : cs.invoice_status.replace('invoice_', '').replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="budget-supplier-card-right">
                              <div className="budget-supplier-card-amount">
                                {cs.quoted_price ? formatCurrency(cs.quoted_price, currency) : '-'}
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="budget-modal-footer">
            <button type="button" onClick={onClose} className="budget-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="budget-btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
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

export default EditCategoryModal;
