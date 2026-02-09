import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  updateCategory,
  formatCurrency,
  parseCurrencyToCents,
  generatePaymentId,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type BudgetCategory,
  type PaymentScheduleItem,
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
  { value: 'invoice_pending', label: 'Invoice Pending' },
  { value: 'invoice_sent', label: 'Invoice Sent' },
  { value: 'invoice_approved', label: 'Invoice Approved' },
  { value: 'invoice_paid', label: 'Invoice Paid' },
];

interface CategorySupplier {
  supplier_id: string;
  supplier_name: string;
  supplier_company: string | null;
  supplier_category: string;
  quoted_price: number | null;
  currency: string;
  status: EventSupplierStatus;
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
  const [notes, setNotes] = useState(category.notes || '');
  const [payments, setPayments] = useState<PaymentScheduleItem[]>(category.payment_schedule || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categorySuppliers, setCategorySuppliers] = useState<CategorySupplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  const [newPayment, setNewPayment] = useState({
    amount: '',
    due_date: '',
    description: '',
  });

  useEffect(() => {
    const loadSuppliers = async () => {
      const { data } = await listSuppliers({ category: 'all' });
      if (data) {
        setSuppliers(data);
      }
    };
    loadSuppliers();

    if (category.vendor_id) {
      setCategorySuppliers([{
        supplier_id: category.vendor_id,
        supplier_name: 'Linked Vendor',
        supplier_company: null,
        supplier_category: '',
        quoted_price: category.contracted_amount,
        currency: currency,
        status: 'confirmed' as EventSupplierStatus,
        invoice_status: category.paid_amount >= (category.contracted_amount || 0) ? 'invoice_paid' : 'invoice_pending',
        invoice_amount: category.contracted_amount,
      }]);
    }
  }, [category.vendor_id, category.contracted_amount, category.paid_amount, currency]);

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

  const handleAddSupplier = (supplier: Supplier) => {
    if (categorySuppliers.find((cs) => cs.supplier_id === supplier.id)) {
      setShowSupplierDropdown(false);
      setSupplierSearch('');
      return;
    }

    const newCatSupplier: CategorySupplier = {
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_company: supplier.company_name,
      supplier_category: supplier.category,
      quoted_price: null,
      currency: currency,
      status: 'potential',
      invoice_status: 'no_invoice',
      invoice_amount: null,
    };

    setCategorySuppliers([...categorySuppliers, newCatSupplier]);
    setShowSupplierDropdown(false);
    setSupplierSearch('');
  };

  const handleRemoveSupplier = (supplierId: string) => {
    setCategorySuppliers(categorySuppliers.filter((cs) => cs.supplier_id !== supplierId));
  };

  const handleSupplierChange = (supplierId: string, field: keyof CategorySupplier, value: string | number | null) => {
    setCategorySuppliers(
      categorySuppliers.map((cs) =>
        cs.supplier_id === supplierId ? { ...cs, [field]: value } : cs
      )
    );
  };

  const handleAddPayment = () => {
    if (!newPayment.amount || !newPayment.due_date || !newPayment.description.trim()) {
      return;
    }

    const amount = parseCurrencyToCents(newPayment.amount);
    if (amount <= 0) return;

    const payment: PaymentScheduleItem = {
      id: generatePaymentId(),
      amount,
      due_date: newPayment.due_date,
      description: newPayment.description.trim(),
      paid: false,
      paid_date: null,
    };

    setPayments([...payments, payment]);
    setNewPayment({ amount: '', due_date: '', description: '' });
  };

  const handleRemovePayment = (paymentId: string) => {
    setPayments(payments.filter((p) => p.id !== paymentId));
  };

  const handleTogglePaymentPaid = (paymentId: string) => {
    setPayments(
      payments.map((p) =>
        p.id === paymentId
          ? { ...p, paid: !p.paid, paid_date: !p.paid ? new Date().toISOString().split('T')[0] as string : null }
          : p
      )
    );
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
    const paidAmount = payments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0);

    setSaving(true);

    const { error: apiError } = await updateCategory(eventId, category.id, {
      category_name: categoryName,
      custom_name: customName.trim() || null,
      budgeted_amount: budgeted,
      contracted_amount: contracted,
      is_contracted: isContracted,
      paid_amount: paidAmount,
      payment_schedule: payments,
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
  const totalScheduled = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0);
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
                    {categorySuppliers.length} supplier{categorySuppliers.length !== 1 ? 's' : ''}
                  </div>
                </div>

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
                        .slice(0, 10)
                        .map((supplier) => (
                          <button
                            key={supplier.id}
                            type="button"
                            className="budget-supplier-result"
                            onClick={() => handleAddSupplier(supplier)}
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

                <div className="budget-suppliers-list">
                  {categorySuppliers.length === 0 ? (
                    <div className="budget-payments-empty">No suppliers added yet</div>
                  ) : (
                    categorySuppliers.map((cs) => (
                      <div key={cs.supplier_id} className="budget-supplier-item">
                        <div className="budget-supplier-info">
                          <div className="budget-supplier-name">{cs.supplier_name}</div>
                          <div className="budget-supplier-company">{cs.supplier_company || cs.supplier_category}</div>
                        </div>
                        <div className="budget-supplier-fields">
                          <div className="budget-supplier-field">
                            <label>Status</label>
                            <select
                              value={cs.status}
                              onChange={(e) => handleSupplierChange(cs.supplier_id, 'status', e.target.value)}
                              className="budget-select budget-select-small"
                            >
                              {SUPPLIER_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="budget-supplier-field">
                            <label>Quote</label>
                            <div className="budget-currency-input budget-currency-small">
                              <span className="budget-currency-symbol">{currencySymbol}</span>
                              <input
                                type="text"
                                value={cs.quoted_price ? String(cs.quoted_price / 100) : ''}
                                onChange={(e) => handleSupplierChange(cs.supplier_id, 'quoted_price', e.target.value ? parseCurrencyToCents(e.target.value) : null)}
                                placeholder="0"
                                className="budget-input budget-input-small"
                              />
                            </div>
                          </div>
                          <div className="budget-supplier-field">
                            <label>Invoice</label>
                            <select
                              value={cs.invoice_status}
                              onChange={(e) => handleSupplierChange(cs.supplier_id, 'invoice_status', e.target.value)}
                              className="budget-select budget-select-small"
                            >
                              {INVOICE_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="budget-supplier-field">
                            <label>Amount</label>
                            <div className="budget-currency-input budget-currency-small">
                              <span className="budget-currency-symbol">{currencySymbol}</span>
                              <input
                                type="text"
                                value={cs.invoice_amount ? String(cs.invoice_amount / 100) : ''}
                                onChange={(e) => handleSupplierChange(cs.supplier_id, 'invoice_amount', e.target.value ? parseCurrencyToCents(e.target.value) : null)}
                                placeholder="0"
                                className="budget-input budget-input-small"
                              />
                            </div>
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

                <div className="budget-supplier-totals">
                  <div className="budget-supplier-total">
                    <span>Total Quotes:</span>
                    <span>{formatCurrency(totalSupplierQuotes, currency)}</span>
                  </div>
                  <div className="budget-supplier-total">
                    <span>Total Invoices:</span>
                    <span>{formatCurrency(totalInvoices, currency)}</span>
                  </div>
                </div>

                <div className="budget-payments-header" style={{ marginTop: '24px' }}>
                  <h4>Payment Schedule</h4>
                  <div className="budget-payments-summary">
                    {formatCurrency(totalPaid, currency)} paid of {formatCurrency(totalScheduled, currency)}
                  </div>
                </div>

                <div className="budget-payments-list">
                  {payments.length === 0 ? (
                    <div className="budget-payments-empty">No payments scheduled</div>
                  ) : (
                    payments
                      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                      .map((payment) => (
                        <div
                          key={payment.id}
                          className={`budget-payment-edit-item ${payment.paid ? 'paid' : ''}`}
                        >
                          <button
                            type="button"
                            className={`budget-payment-check ${payment.paid ? 'checked' : ''}`}
                            onClick={() => handleTogglePaymentPaid(payment.id)}
                          >
                            {payment.paid ? '✓' : ''}
                          </button>
                          <div className="budget-payment-edit-info">
                            <div className="budget-payment-edit-desc">{payment.description}</div>
                            <div className="budget-payment-edit-date">
                              Due: {new Date(payment.due_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="budget-payment-edit-amount">
                            {formatCurrency(payment.amount, currency)}
                          </div>
                          <button
                            type="button"
                            className="budget-payment-remove"
                            onClick={() => handleRemovePayment(payment.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))
                  )}
                </div>

                <div className="budget-add-payment">
                  <div className="budget-add-payment-title">Add Payment</div>
                  <div className="budget-add-payment-form">
                    <input
                      type="text"
                      value={newPayment.description}
                      onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                      placeholder="Description"
                      className="budget-input"
                    />
                    <div className="budget-add-payment-row">
                      <div className="budget-currency-input budget-input-small">
                        <span className="budget-currency-symbol">{currencySymbol}</span>
                        <input
                          type="text"
                          value={newPayment.amount}
                          onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                          placeholder="0"
                          className="budget-input budget-input-currency"
                        />
                      </div>
                      <input
                        type="date"
                        value={newPayment.due_date}
                        onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })}
                        className="budget-input budget-input-date"
                      />
                      <button
                        type="button"
                        onClick={handleAddPayment}
                        className="budget-btn-add"
                        disabled={!newPayment.amount || !newPayment.due_date || !newPayment.description.trim()}
                      >
                        +
                      </button>
                    </div>
                  </div>
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
