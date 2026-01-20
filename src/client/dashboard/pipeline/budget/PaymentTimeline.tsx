import React, { useMemo, useState } from 'react';
import {
  formatCurrency,
  daysUntil,
  markPaymentPaid,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type BudgetCategory,
  type Currency,
  type PaymentScheduleItem,
} from '../../../api/weddingBudgetApi';

interface PaymentTimelineProps {
  categories: BudgetCategory[];
  currency: Currency;
  onPaymentToggle: () => void;
  eventId: string;
}

interface PaymentWithCategory {
  id: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date: string | null;
  description: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
}

const PaymentTimeline: React.FC<PaymentTimelineProps> = ({
  categories,
  currency,
  onPaymentToggle,
  eventId,
}) => {
  const [showPaid, setShowPaid] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const allPayments = useMemo(() => {
    const payments: PaymentWithCategory[] = [];

    categories.forEach((category) => {
      category.payment_schedule.forEach((payment: PaymentScheduleItem) => {
        payments.push({
          ...payment,
          categoryId: category.id,
          categoryName: category.custom_name || CATEGORY_LABELS[category.category_name] || category.category_name,
          categoryIcon: CATEGORY_ICONS[category.category_name] || '📦',
        });
      });
    });

    return payments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [categories]);

  const filteredPayments = useMemo(() => {
    return showPaid ? allPayments : allPayments.filter((p) => !p.paid);
  }, [allPayments, showPaid]);

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, PaymentWithCategory[]> = {};

    filteredPayments.forEach((payment) => {
      const date = new Date(payment.due_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(payment);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPayments]);

  const handleTogglePaid = async (payment: PaymentWithCategory) => {
    setTogglingId(payment.id);
    const { error } = await markPaymentPaid(eventId, payment.categoryId, payment.id, !payment.paid);
    setTogglingId(null);

    if (error) {
      alert(`Failed to update payment: ${error}`);
      return;
    }

    onPaymentToggle();
  };

  const formatMonthHeader = (key: string) => {
    const parts = key.split('-');
    const year = parts[0] || '2025';
    const month = parts[1] || '1';
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  const overduePayments = allPayments.filter((p) => !p.paid && daysUntil(p.due_date) < 0);
  const upcomingCount = allPayments.filter((p) => !p.paid && daysUntil(p.due_date) >= 0 && daysUntil(p.due_date) <= 7).length;

  return (
    <div className="budget-timeline">
      <div className="budget-timeline-header">
        <h3>Payment Timeline</h3>
        <label className="budget-toggle-paid">
          <input
            type="checkbox"
            checked={showPaid}
            onChange={(e) => setShowPaid(e.target.checked)}
          />
          Show paid
        </label>
      </div>

      {overduePayments.length > 0 && (
        <div className="budget-timeline-alert overdue">
          {overduePayments.length} payment{overduePayments.length > 1 ? 's' : ''} overdue
        </div>
      )}
      {upcomingCount > 0 && (
        <div className="budget-timeline-alert upcoming">
          {upcomingCount} payment{upcomingCount > 1 ? 's' : ''} due within 7 days
        </div>
      )}

      {filteredPayments.length === 0 ? (
        <div className="budget-timeline-empty">
          {showPaid ? 'No payments scheduled yet.' : 'No pending payments.'}
        </div>
      ) : (
        <div className="budget-timeline-list">
          {groupedByMonth.map(([monthKey, payments]) => (
            <div key={monthKey} className="budget-timeline-month">
              <div className="budget-timeline-month-header">{formatMonthHeader(monthKey)}</div>
              {payments.map((payment) => {
                const days = daysUntil(payment.due_date);
                const isOverdue = !payment.paid && days < 0;
                const isDueSoon = !payment.paid && days >= 0 && days <= 7;

                return (
                  <div
                    key={payment.id}
                    className={`budget-timeline-item ${payment.paid ? 'paid' : ''} ${
                      isOverdue ? 'overdue' : ''
                    } ${isDueSoon ? 'due-soon' : ''}`}
                  >
                    <div className="budget-timeline-date">
                      <div className="budget-timeline-day">
                        {new Date(payment.due_date).getDate()}
                      </div>
                      <div className="budget-timeline-weekday">
                        {new Date(payment.due_date).toLocaleDateString(undefined, { weekday: 'short' })}
                      </div>
                    </div>

                    <div className="budget-timeline-content">
                      <div className="budget-timeline-category">
                        <span className="budget-timeline-icon">{payment.categoryIcon}</span>
                        {payment.categoryName}
                      </div>
                      <div className="budget-timeline-desc">{payment.description}</div>
                      {!payment.paid && (
                        <div className="budget-timeline-due">
                          {isOverdue
                            ? `${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''} overdue`
                            : days === 0
                            ? 'Due today'
                            : `${days} day${days > 1 ? 's' : ''} left`}
                        </div>
                      )}
                    </div>

                    <div className="budget-timeline-right">
                      <div className="budget-timeline-amount">
                        {formatCurrency(payment.amount, currency)}
                      </div>
                      <button
                        className={`budget-timeline-toggle ${payment.paid ? 'paid' : ''}`}
                        onClick={() => handleTogglePaid(payment)}
                        disabled={togglingId === payment.id}
                        title={payment.paid ? 'Mark as unpaid' : 'Mark as paid'}
                      >
                        {togglingId === payment.id ? '...' : payment.paid ? '✓' : '○'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentTimeline;
