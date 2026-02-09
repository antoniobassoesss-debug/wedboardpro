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

const SUPPLIER_STATUS_OPTIONS: { value: EventSupplierStatus; label: string; color: string }[] = [
  { value: 'potential', label: 'Potential', color: '#6b7280' },
  { value: 'contacted', label: 'Contacted', color: '#8b5cf6' },
  { value: 'quote_requested', label: 'Quote Requested', color: '#f59e0b' },
  { value: 'quote_received', label: 'Quote Received', color: '#3b82f6' },
  { value: 'negotiating', label: 'Negotiating', color: '#ec4899' },
  { value: 'confirmed', label: 'Confirmed', color: '#16a34a' },
  { value: 'paid_completed', label: 'Paid', color: '#059669' },
  { value: 'declined_lost', label: 'Declined', color: '#dc2626' },
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
  const [categoryStatus, setCategoryStatus] = useState('planned');
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
  const totalSupplierQuotes = categorySuppliers.reduce((sum, cs) => sum + (cs.quoted_price || 0), 0);
  const totalInvoices = categorySuppliers.reduce((sum, cs) => sum + (cs.invoice_amount || 0), 0);

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
                              <div className="budget-supplier-result-name">{supplier.name}</div>
                              <div className="budget-supplier-result-company">{supplier.company_name || supplier.category}</div>
                            </button>
                          ))}
                        {filteredSuppliers.filter((s) => !categorySuppliers.find((cs) => cs.supplier_id === s.id)).length === 0 && (
                          <div className="budget-supplier-empty">No suppliers found</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="budget-pending-supplier">
                    <div className="budget-pending-header">
                      <span className="budget-pending-label">Adding:</span>
                      <span className="budget-pending-name">{pendingSupplier.name}</span>
                      <button type="button" className="budget-pending-cancel" onClick={handleCancelPending}>×</button>
                    </div>
                    <div className="budget-pending-fields">
                      <div className="budget-pending-row">
                        <div className="budget-form-group budget-form-group-small">
                          <label>Status</label>
                          <select
                            value={supplierStatus}
                            onChange={(e) => setSupplierStatus(e.target.value as EventSupplierStatus)}
                            className="budget-select budget-select-small"
                          >
                            {SUPPLIER_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="budget-form-group budget-form-group-small">
                          <label>Quote</label>
                          <div className="budget-currency-input budget-currency-small">
                            <span className="budget-currency-symbol">{currencySymbol}</span>
                            <input
                              type="text"
                              value={supplierQuote}
                              onChange={(e) => setSupplierQuote(e.target.value)}
                              placeholder="0"
                              className="budget-input budget-input-small"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="budget-pending-row">
                        <div className="budget-form-group budget-form-group-small">
                          <label>Invoice Status</label>
                          <select
                            value={supplierInvoiceStatus}
                            onChange={(e) => setSupplierInvoiceStatus(e.target.value)}
                            className="budget-select budget-select-small"
                          >
                            {INVOICE_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="budget-form-group budget-form-group-small">
                          <label>Amount</label>
                          <div className="budget-currency-input budget-currency-small">
                            <span className="budget-currency-symbol">{currencySymbol}</span>
                            <input
                              type="text"
                              value={supplierInvoiceAmount}
                              onChange={(e) => setSupplierInvoiceAmount(e.target.value)}
                              placeholder="0"
                              className="budget-input budget-input-small"
                            />
                          </div>
                        </div>
                      </div>
                      <button type="button" className="budget-btn-add-supplier" onClick={handleAddSupplier}>
                        Add Supplier
                      </button>
                    </div>
                  </div>
                )}

                <div className="budget-suppliers-list">
                  {categorySuppliers.length === 0 ? (
                    <div className="budget-payments-empty">No suppliers added yet</div>
                  ) : (
                    categorySuppliers.map((cs) => (
                      <div key={cs.supplier_id} className="budget-supplier-item">
                        <div className="budget-supplier-main">
                          <div className="budget-supplier-name">{cs.supplier_name}</div>
                          <div className="budget-supplier-badges">
                            <span className="budget-supplier-badge" style={{ color: SUPPLIER_STATUS_OPTIONS.find(o => o.value === cs.status)?.color }}>
                              {SUPPLIER_STATUS_OPTIONS.find(o => o.value === cs.status)?.label}
                            </span>
                            {cs.quoted_price && (
                              <span className="budget-supplier-quote">{formatCurrency(cs.quoted_price, currency)}</span>
                            )}
                            <span className="budget-supplier-invoice">{cs.invoice_status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="budget-payment-remove"
                          onClick={() => handleRemoveSupplier(cs.supplier_id)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {categorySuppliers.length > 0 && (
                  <div className="budget-supplier-totals">
                    <div className="budget-supplier-total">
                      <span>Quotes:</span>
                      <span>{formatCurrency(totalSupplierQuotes, currency)}</span>
                    </div>
                    <div className="budget-supplier-total">
                      <span>Invoices:</span>
                      <span>{formatCurrency(totalInvoices, currency)}</span>
                    </div>
                  </div>
                )}
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
