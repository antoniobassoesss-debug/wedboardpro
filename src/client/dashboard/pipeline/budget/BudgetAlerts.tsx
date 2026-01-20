import React from 'react';
import {
  formatCurrency,
  daysUntil,
  CATEGORY_LABELS,
  type Currency,
  type PaymentScheduleItem,
} from '../../../api/weddingBudgetApi';

interface OverduePaymentAlert {
  category_id: string;
  category_name: string;
  payment: PaymentScheduleItem;
}

interface UpcomingPaymentAlert {
  category_id: string;
  category_name: string;
  payment: PaymentScheduleItem;
  days_until: number;
}

interface OverBudgetAlert {
  category_id: string;
  category_name: string;
  overage: number;
}

interface AlertsData {
  overdue_payments: OverduePaymentAlert[];
  upcoming_payments: UpcomingPaymentAlert[];
  over_budget_categories: OverBudgetAlert[];
}

interface BudgetAlertsProps {
  alerts: AlertsData;
  dismissedAlerts: Set<string>;
  onDismiss: (alertId: string) => void;
  currency: Currency;
}

const BudgetAlerts: React.FC<BudgetAlertsProps> = ({
  alerts,
  dismissedAlerts,
  onDismiss,
  currency,
}) => {
  const { overdue_payments, upcoming_payments, over_budget_categories } = alerts;

  const allAlerts: Array<{
    id: string;
    type: 'overdue' | 'upcoming' | 'over_budget';
    severity: 'high' | 'medium' | 'low';
    title: string;
    message: string;
    amount?: number;
  }> = [];

  overdue_payments.forEach((alert) => {
    const days = Math.abs(daysUntil(alert.payment.due_date));
    allAlerts.push({
      id: `overdue-${alert.category_id}-${alert.payment.id}`,
      type: 'overdue',
      severity: 'high',
      title: 'Payment Overdue',
      message: `${CATEGORY_LABELS[alert.category_name as keyof typeof CATEGORY_LABELS] || alert.category_name} payment was due ${days} day${days > 1 ? 's' : ''} ago`,
      amount: alert.payment.amount,
    });
  });

  upcoming_payments.forEach((alert) => {
    allAlerts.push({
      id: `upcoming-${alert.category_id}-${alert.payment.id}`,
      type: 'upcoming',
      severity: alert.days_until <= 3 ? 'medium' : 'low',
      title: 'Payment Due Soon',
      message: `${CATEGORY_LABELS[alert.category_name as keyof typeof CATEGORY_LABELS] || alert.category_name} payment due in ${alert.days_until} day${alert.days_until > 1 ? 's' : ''}`,
      amount: alert.payment.amount,
    });
  });

  over_budget_categories.forEach((alert) => {
    allAlerts.push({
      id: `over-${alert.category_id}`,
      type: 'over_budget',
      severity: 'high',
      title: 'Over Budget',
      message: `${CATEGORY_LABELS[alert.category_name as keyof typeof CATEGORY_LABELS] || alert.category_name} is over budget`,
      amount: alert.overage,
    });
  });

  const visibleAlerts = allAlerts
    .filter((alert) => !dismissedAlerts.has(alert.id))
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 5);

  if (visibleAlerts.length === 0) {
    return null;
  }

  const hiddenCount = allAlerts.length - dismissedAlerts.size - visibleAlerts.length;

  return (
    <div className="budget-alerts">
      {visibleAlerts.map((alert) => (
        <div key={alert.id} className={`budget-alert budget-alert-${alert.type}`}>
          <div className="budget-alert-icon">
            {alert.type === 'overdue' && '🔴'}
            {alert.type === 'upcoming' && '🟡'}
            {alert.type === 'over_budget' && '⚠️'}
          </div>
          <div className="budget-alert-content">
            <div className="budget-alert-title">{alert.title}</div>
            <div className="budget-alert-message">
              {alert.message}
              {alert.amount && (
                <span className="budget-alert-amount">
                  {' '}({alert.type === 'over_budget' ? '+' : ''}{formatCurrency(alert.amount, currency)})
                </span>
              )}
            </div>
          </div>
          <button
            className="budget-alert-dismiss"
            onClick={() => onDismiss(alert.id)}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
      {hiddenCount > 0 && (
        <div className="budget-alerts-more">
          +{hiddenCount} more alert{hiddenCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default BudgetAlerts;
