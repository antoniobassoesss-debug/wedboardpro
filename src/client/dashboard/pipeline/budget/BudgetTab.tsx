import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchBudgetOverview,
  calculateAlerts,
  type BudgetOverview,
  type BudgetCategory,
  type WeddingBudget,
} from '../../../api/weddingBudgetApi';
import BudgetSummary from './BudgetSummary';
import BudgetDonutChart from './BudgetOverview';
import CategoryTable from './CategoryTable';
import PaymentTimeline from './PaymentTimeline';
import BudgetAlerts from './BudgetAlerts';
import AddCategoryModal from './AddCategoryModal';
import EditCategoryModal from './EditCategoryModal';
import './budget.css';

interface BudgetTabProps {
  eventId: string;
}

interface BudgetState {
  budget: WeddingBudget | null;
  categories: BudgetCategory[];
  totals: {
    total_budgeted: number;
    total_contracted: number;
    total_paid: number;
    total_remaining: number;
  };
  alerts: ReturnType<typeof calculateAlerts>;
  loading: boolean;
  error: string | null;
}

const BudgetTab: React.FC<BudgetTabProps> = ({ eventId }) => {
  const [state, setState] = useState<BudgetState>({
    budget: null,
    categories: [],
    totals: { total_budgeted: 0, total_contracted: 0, total_paid: 0, total_remaining: 0 },
    alerts: { overdue_payments: [], upcoming_payments: [], over_budget_categories: [] },
    loading: true,
    error: null,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const loadBudgetData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await fetchBudgetOverview(eventId);

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error }));
      return;
    }

    if (data) {
      const alerts = calculateAlerts(data.categories);
      setState({
        budget: data.budget,
        categories: data.categories.filter((c: BudgetCategory) => !c.deleted_at),
        totals: data.totals,
        alerts,
        loading: false,
        error: null,
      });
    }
  }, [eventId]);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const handleCategoryCreated = () => {
    setShowAddModal(false);
    loadBudgetData();
  };

  const handleCategoryUpdated = () => {
    setEditingCategory(null);
    loadBudgetData();
  };

  const handleCategoryDeleted = () => {
    loadBudgetData();
  };

  if (state.loading) {
    return (
      <div className="budget-loading">
        <div className="budget-loading-spinner" />
        <span>Loading budget...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="budget-error">
        <div className="budget-error-icon">!</div>
        <div className="budget-error-message">
          <strong>Failed to load budget</strong>
          <p>{state.error}</p>
        </div>
        <button onClick={loadBudgetData} className="budget-retry-btn">
          Try Again
        </button>
      </div>
    );
  }

  const hasCategories = state.categories.length > 0;
  const currency = state.budget?.currency || 'EUR';

  return (
    <div className="budget-container">
      <BudgetAlerts
        alerts={state.alerts}
        dismissedAlerts={dismissedAlerts}
        onDismiss={handleDismissAlert}
        currency={currency}
      />

      <div className="budget-top-section">
        <BudgetSummary
          budget={state.budget}
          totals={state.totals}
          onRefresh={loadBudgetData}
        />
        {hasCategories && (
          <BudgetDonutChart categories={state.categories} currency={currency} />
        )}
      </div>

      <div className="budget-main-section">
        <div className="budget-categories-section">
          <div className="budget-section-header">
            <h3>Budget Categories</h3>
            <button onClick={() => setShowAddModal(true)} className="budget-add-btn">
              + Add Category
            </button>
          </div>
          {hasCategories ? (
            <CategoryTable
              categories={state.categories}
              currency={currency}
              onEdit={setEditingCategory}
              onDelete={handleCategoryDeleted}
              eventId={eventId}
            />
          ) : (
            <div className="budget-empty-state">
              <div className="budget-empty-icon">💰</div>
              <h4>No budget categories yet</h4>
              <p>Start tracking your wedding budget by adding your first category.</p>
              <button onClick={() => setShowAddModal(true)} className="budget-add-btn-large">
                + Add First Category
              </button>
            </div>
          )}
        </div>

        {hasCategories && (
          <div className="budget-timeline-section">
            <PaymentTimeline
              categories={state.categories}
              currency={currency}
              onPaymentToggle={loadBudgetData}
              eventId={eventId}
            />
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCategoryModal
          eventId={eventId}
          currency={currency}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCategoryCreated}
        />
      )}

      {editingCategory && (
        <EditCategoryModal
          eventId={eventId}
          category={editingCategory}
          currency={currency}
          onClose={() => setEditingCategory(null)}
          onSuccess={handleCategoryUpdated}
        />
      )}
    </div>
  );
};

export default BudgetTab;
