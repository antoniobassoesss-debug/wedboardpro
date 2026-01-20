import React, { useState } from 'react';
import {
  formatCurrency,
  getCategoryStatus,
  deleteCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  type BudgetCategory,
  type Currency,
  type PaymentScheduleItem,
} from '../../../api/weddingBudgetApi';

interface CategoryTableProps {
  categories: BudgetCategory[];
  currency: Currency;
  onEdit: (category: BudgetCategory) => void;
  onDelete: () => void;
  eventId: string;
}

const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  currency,
  onEdit,
  onDelete,
  eventId,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    setDeletingId(categoryId);
    const { error } = await deleteCategory(eventId, categoryId);
    setDeletingId(null);

    if (error) {
      alert(`Failed to delete category: ${error}`);
      return;
    }

    onDelete();
  };

  const sortedCategories = [...categories].sort((a, b) => b.budgeted_amount - a.budgeted_amount);

  return (
    <div className="budget-table-container">
      <table className="budget-table">
        <thead>
          <tr>
            <th>Category</th>
            <th className="budget-table-right">Budgeted</th>
            <th className="budget-table-right">Contracted</th>
            <th className="budget-table-right">Paid</th>
            <th className="budget-table-right">Remaining</th>
            <th>Status</th>
            <th className="budget-table-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedCategories.map((category) => {
            const status = getCategoryStatus(category);
            const isExpanded = expandedId === category.id;
            const isOverBudget =
              category.contracted_amount && category.contracted_amount > category.budgeted_amount;
            const remaining = (category.contracted_amount || 0) - category.paid_amount;
            const icon = CATEGORY_ICONS[category.category_name] || '📦';
            const color = CATEGORY_COLORS[category.category_name] || '#94a3b8';
            const displayName =
              category.custom_name || CATEGORY_LABELS[category.category_name] || category.category_name;

            return (
              <React.Fragment key={category.id}>
                <tr
                  className={`budget-table-row ${isOverBudget ? 'budget-row-over' : ''} ${
                    status.status === 'overdue' ? 'budget-row-overdue' : ''
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : category.id)}
                >
                  <td>
                    <div className="budget-category-cell">
                      <div className="budget-category-icon" style={{ backgroundColor: color }}>
                        {icon}
                      </div>
                      <div className="budget-category-name">
                        {displayName}
                        {category.notes && (
                          <span className="budget-category-note" title={category.notes}>
                            📝
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="budget-table-right">
                    {formatCurrency(category.budgeted_amount, currency)}
                  </td>
                  <td className="budget-table-right">
                    {category.contracted_amount ? (
                      <span style={{ color: isOverBudget ? '#ef4444' : undefined }}>
                        {formatCurrency(category.contracted_amount, currency)}
                        {isOverBudget && (
                          <span className="budget-over-indicator">
                            +{formatCurrency(category.contracted_amount - category.budgeted_amount, currency)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="budget-empty">-</span>
                    )}
                  </td>
                  <td className="budget-table-right">
                    {category.paid_amount > 0 ? (
                      formatCurrency(category.paid_amount, currency)
                    ) : (
                      <span className="budget-empty">-</span>
                    )}
                  </td>
                  <td className="budget-table-right">
                    {remaining > 0 ? (
                      formatCurrency(remaining, currency)
                    ) : remaining < 0 ? (
                      <span style={{ color: '#10b981' }}>
                        +{formatCurrency(Math.abs(remaining), currency)}
                      </span>
                    ) : (
                      <span className="budget-empty">-</span>
                    )}
                  </td>
                  <td>
                    <span
                      className="budget-status-badge"
                      style={{ backgroundColor: `${status.color}20`, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="budget-table-center" onClick={(e) => e.stopPropagation()}>
                    <div className="budget-actions">
                      <button
                        className="budget-action-btn"
                        onClick={() => onEdit(category)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="budget-action-btn budget-action-delete"
                        onClick={() => handleDelete(category.id)}
                        disabled={deletingId === category.id}
                        title="Delete"
                      >
                        {deletingId === category.id ? '...' : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && category.payment_schedule.length > 0 && (
                  <tr className="budget-expanded-row">
                    <td colSpan={7}>
                      <div className="budget-payment-schedule">
                        <div className="budget-payment-schedule-title">Payment Schedule</div>
                        <div className="budget-payment-list">
                          {category.payment_schedule.map((payment: PaymentScheduleItem) => (
                            <div
                              key={payment.id}
                              className={`budget-payment-item ${payment.paid ? 'paid' : ''}`}
                            >
                              <div className="budget-payment-info">
                                <span className="budget-payment-desc">{payment.description}</span>
                                <span className="budget-payment-date">
                                  Due: {new Date(payment.due_date).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="budget-payment-amount">
                                {formatCurrency(payment.amount, currency)}
                              </div>
                              <span
                                className={`budget-payment-status ${payment.paid ? 'paid' : 'pending'}`}
                              >
                                {payment.paid ? '✓ Paid' : 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryTable;
