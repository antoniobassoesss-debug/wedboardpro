import React from 'react';
import { formatCurrency, type WeddingBudget, type Currency } from '../../../api/weddingBudgetApi';

interface BudgetSummaryProps {
  budget: WeddingBudget | null;
  totals: {
    total_budgeted: number;
    total_contracted: number;
    total_paid: number;
    total_remaining: number;
  };
  onRefresh: () => void;
}

const BudgetSummary: React.FC<BudgetSummaryProps> = ({ budget, totals, onRefresh }) => {
  const currency = (budget?.currency || 'EUR') as Currency;
  const totalBudget = budget?.total_budget || totals.total_budgeted;

  const percentSpent = totalBudget > 0 ? Math.round((totals.total_paid / totalBudget) * 100) : 0;
  const percentContracted = totalBudget > 0 ? Math.round((totals.total_contracted / totalBudget) * 100) : 0;

  const remaining = totalBudget - totals.total_paid;
  const isOverBudget = totals.total_paid > totalBudget;
  const isAtRisk = percentSpent >= 90 && !isOverBudget;

  const progressColor = isOverBudget ? '#ef4444' : isAtRisk ? '#f59e0b' : '#10b981';

  return (
    <div className="budget-summary">
      <div className="budget-summary-header">
        <h3>Budget Overview</h3>
        <button onClick={onRefresh} className="budget-refresh-btn" title="Refresh">
          ↻
        </button>
      </div>

      <div className="budget-summary-cards">
        <div className="budget-stat-card">
          <div className="budget-stat-label">Total Budget</div>
          <div className="budget-stat-value">{formatCurrency(totalBudget, currency)}</div>
          <div className="budget-stat-secondary">
            {percentContracted}% contracted
          </div>
        </div>

        <div className="budget-stat-card">
          <div className="budget-stat-label">Total Spent</div>
          <div className="budget-stat-value" style={{ color: progressColor }}>
            {formatCurrency(totals.total_paid, currency)}
          </div>
          <div className="budget-stat-secondary">
            {formatCurrency(totals.total_contracted, currency)} contracted
          </div>
        </div>

        <div className="budget-stat-card">
          <div className="budget-stat-label">Remaining</div>
          <div className="budget-stat-value" style={{ color: isOverBudget ? '#ef4444' : '#10b981' }}>
            {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(remaining), currency)}
          </div>
          <div className="budget-stat-secondary">
            {formatCurrency(totals.total_remaining, currency)} to pay
          </div>
        </div>
      </div>

      <div className="budget-progress-section">
        <div className="budget-progress-header">
          <span>Budget Progress</span>
          <span style={{ color: progressColor, fontWeight: 600 }}>
            {percentSpent}% spent
          </span>
        </div>
        <div className="budget-progress-bar">
          <div
            className="budget-progress-fill"
            style={{
              width: `${Math.min(percentSpent, 100)}%`,
              backgroundColor: progressColor,
            }}
          />
          {percentContracted > percentSpent && (
            <div
              className="budget-progress-contracted"
              style={{
                left: `${percentSpent}%`,
                width: `${Math.min(percentContracted - percentSpent, 100 - percentSpent)}%`,
              }}
            />
          )}
        </div>
        {isOverBudget && (
          <div className="budget-over-warning">
            Over budget by {formatCurrency(Math.abs(remaining), currency)}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetSummary;
