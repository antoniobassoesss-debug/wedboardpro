import React, { useState } from 'react';
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
  const [payments, setPayments] = useState<PaymentScheduleItem[]>(category.payment_schedule);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPayment, setNewPayment] = useState({
    amount: '',
    due_date: '',
    description: '',
  });

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
          ? { ...p, paid: !p.paid, paid_date: !p.paid ? new Date().toISOString().split('T')[0] : null }
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
                  <h4>Payment Schedule</h4>
                  <div className="budget-payments-summary">
                    {formatCurrency(totalPaid, currency)} paid of{' '}
                    {formatCurrency(totalScheduled, currency)} scheduled
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
