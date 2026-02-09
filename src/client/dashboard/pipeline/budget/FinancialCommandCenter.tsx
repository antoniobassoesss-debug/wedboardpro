import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  fetchBudgetOverview,
  calculateAlerts,
  calculateTotals,
  formatCurrency,
  parseCurrencyToCents,
  updateCategory,
  markPaymentPaid,
  createCategory,
  deleteCategory,
  type BudgetOverview,
  type BudgetCategory,
  type WeddingBudget,
  type Currency,
  type CategoryName,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CURRENCY_SYMBOLS,
  type PaymentScheduleItem,
} from '../../../api/weddingBudgetApi';
import './budget.css';

interface FinancialCommandCenterProps {
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
  alerts: {
    overdue_payments: Array<{ category_id: string; category_name: string; payment: any }>;
    upcoming_payments: Array<{ category_id: string; category_name: string; payment: any; days_until: number }>;
    over_budget_categories: Array<{ category_id: string; category_name: string; overage: number }>;
  };
  loading: boolean;
  error: string | null;
}

type ViewMode = 'table' | 'calendar' | 'scenarios';

interface Scenario {
  id: string;
  name: string;
  description: string;
  created_at: string;
  categories: BudgetCategory[];
  totals: {
    total_budgeted: number;
    total_contracted: number;
  };
}

function getCategoryLabel(name: CategoryName | string): string {
  return CATEGORY_LABELS[name as CategoryName] || name;
}

const FinancialCommandCenter: React.FC<FinancialCommandCenterProps> = ({ eventId }) => {
  const [state, setState] = useState<BudgetState>({
    budget: null,
    categories: [],
    totals: { total_budgeted: 0, total_contracted: 0, total_paid: 0, total_remaining: 0 },
    alerts: { overdue_payments: [], upcoming_payments: [], over_budget_categories: [] },
    loading: true,
    error: null,
  });

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [clientMode, setClientMode] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ id: string; field: string; value: string } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [showScenarioSave, setShowScenarioSave] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [saving, setSaving] = useState(false);

  const currency: Currency = state.budget?.currency || 'EUR';
  const symbol = CURRENCY_SYMBOLS[currency];

  const loadBudgetData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await fetchBudgetOverview(eventId);
    if (error) {
      setState(prev => ({ ...prev, loading: false, error }));
      return;
    }
    if (data) {
      const totals = calculateTotals(data.categories);
      setState({
        budget: data.budget,
        categories: data.categories.filter((c: BudgetCategory) => !c.deleted_at),
        totals,
        alerts: calculateAlerts(data.categories),
        loading: false,
        error: null,
      });
    }
  }, [eventId]);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  const totalVariance = state.totals.total_budgeted - state.totals.total_contracted;
  const variancePercent = state.totals.total_budgeted > 0 
    ? (totalVariance / state.totals.total_budgeted) * 100 
    : 0;
  const isOverBudget = totalVariance < 0;

  const utilizationPercent = state.totals.total_budgeted > 0
    ? (state.totals.total_contracted / state.totals.total_budgeted) * 100
    : 0;

  const overdueCount = state.alerts.overdue_payments.length;
  const upcomingCount = state.alerts.upcoming_payments.length;

  const aiRiskLevel = useMemo(() => {
    if (overdueCount > 2 || (isOverBudget && variancePercent < -10)) return 'critical';
    if (overdueCount > 0 || isOverBudget || upcomingCount > 5) return 'warning';
    return 'healthy';
  }, [overdueCount, isOverBudget, variancePercent, upcomingCount]);

  // Inline editing handlers
  const handleCellDoubleClick = (category: BudgetCategory, field: string) => {
    if (clientMode) return;
    let value = '';
    switch (field) {
      case 'budgeted_amount':
        value = (category.budgeted_amount / 100).toString();
        break;
      case 'contracted_amount':
        value = ((category.contracted_amount || 0) / 100).toString();
        break;
      case 'paid_amount':
        value = (category.paid_amount / 100).toString();
        break;
    }
    setEditingCell({ id: category.id, field, value });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    setSaving(true);
    
    const cents = parseCurrencyToCents(editingCell.value);
    const update: Partial<BudgetCategory> = {};
    
    switch (editingCell.field) {
      case 'budgeted_amount':
        update.budgeted_amount = cents;
        break;
      case 'contracted_amount':
        update.contracted_amount = cents;
        break;
      case 'paid_amount':
        update.paid_amount = cents;
        break;
    }

    await updateCategory(eventId, editingCell.id, update);
    setEditingCell(null);
    await loadBudgetData();
    setSaving(false);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const handleCellChange = (value: string) => {
    if (editingCell) {
      setEditingCell({ ...editingCell, value });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  // Payment toggle
  const handlePaymentToggle = async (category: BudgetCategory, payment: PaymentScheduleItem) => {
    if (clientMode) return;
    await markPaymentPaid(eventId, category.id, payment.id, !payment.paid);
    await loadBudgetData();
  };

  // Category selection for bulk actions
  const toggleCategorySelection = (id: string) => {
    const next = new Set(selectedCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCategories(next);
  };

  const selectAllCategories = () => {
    if (selectedCategories.size === state.categories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(state.categories.map(c => c.id)));
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      await deleteCategory(eventId, categoryId);
      await loadBudgetData();
    }
  };

  // Scenario management
  const saveScenario = () => {
    if (!newScenarioName.trim()) return;
    
    const scenario: Scenario = {
      id: `scenario_${Date.now()}`,
      name: newScenarioName,
      description: '',
      created_at: new Date().toISOString(),
      categories: JSON.parse(JSON.stringify(state.categories)),
      totals: { ...state.totals },
    };
    
    setScenarios([...scenarios, scenario]);
    setNewScenarioName('');
    setShowScenarioSave(false);
  };

  const loadScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
  };

  const deleteScenario = (scenarioId: string) => {
    setScenarios(scenarios.filter(s => s.id !== scenarioId));
    if (activeScenario?.id === scenarioId) {
      setActiveScenario(null);
    }
  };

  // Export handlers
  const exportToCSV = () => {
    const headers = ['Category', 'Target', 'Contracted', 'Paid', 'Variance', 'Status'];
    const rows = state.categories.map(c => [
      getCategoryLabel(c.category_name),
      (c.budgeted_amount / 100).toFixed(2),
      ((c.contracted_amount || 0) / 100).toFixed(2),
      (c.paid_amount / 100).toFixed(2),
      ((c.budgeted_amount - (c.contracted_amount || 0)) / 100).toFixed(2),
      c.payment_schedule?.every(p => p.paid) ? 'Paid' : 'Pending',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_${eventId}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    // For now, just show alert - full PDF would require library
    alert('PDF export requires jsPDF or similar library. CSV export is available.');
  };

  if (state.loading) {
    return (
      <div className="fcc-loading">
        <div className="fcc-loading-spinner" />
        <span>Loading Financial Command Center...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="fcc-error">
        <div className="fcc-error-icon">!</div>
        <div className="fcc-error-message">
          <strong>Failed to load budget</strong>
          <p>{state.error}</p>
        </div>
        <button onClick={loadBudgetData} className="fcc-retry-btn">Try Again</button>
      </div>
    );
  }

  return (
    <div className="fcc-container">
      {/* Command Bar */}
      <div className="fcc-command-bar">
        <div className="fcc-title-section">
          <h1 className="fcc-title">Financial Command Center</h1>
          <div className="fcc-subtitle">
            {state.budget?.currency || 'EUR'} Budget Overview
            {activeScenario && (
              <span className="fcc-scenario-badge">
                Scenario: {activeScenario.name}
              </span>
            )}
          </div>
        </div>

        <div className="fcc-actions">
          <button
            className={`fcc-mode-btn ${clientMode ? 'fcc-mode-active' : ''}`}
            onClick={() => setClientMode(!clientMode)}
            title="Toggle between internal and client view"
          >
            {clientMode ? 'Client Mode Active' : 'Show Client View'}
          </button>

          <div className="fcc-view-toggle">
            <button
              className={`fcc-view-btn ${viewMode === 'table' ? 'fcc-view-active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
            <button
              className={`fcc-view-btn ${viewMode === 'calendar' ? 'fcc-view-active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              Calendar
            </button>
            <button
              className={`fcc-view-btn ${viewMode === 'scenarios' ? 'fcc-view-active' : ''}`}
              onClick={() => setViewMode('scenarios')}
            >
              Scenarios
            </button>
          </div>

          <div className="fcc-export-dropdown">
            <button className="fcc-export-btn">Export</button>
            <div className="fcc-export-menu">
              <button onClick={exportToCSV}>Export as CSV</button>
              <button onClick={exportToPDF}>Export as PDF</button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Risk Banner */}
      {aiRiskLevel !== 'healthy' && (
        <div className={`fcc-risk-banner fcc-risk-${aiRiskLevel}`}>
          <div className="fcc-risk-icon">{aiRiskLevel === 'critical' ? '!' : 'i'}</div>
          <div className="fcc-risk-content">
            <div className="fcc-risk-title">
              {aiRiskLevel === 'critical' ? 'Critical Budget Alerts' : 'Budget Warnings'}
            </div>
            <div className="fcc-risk-message">
              {aiRiskLevel === 'critical' ? (
                <>
                  {overdueCount} overdue payments totaling {symbol}{formatCurrency(
                    state.alerts.overdue_payments.reduce((sum, p) => sum + p.payment.amount, 0) / 100
                  )}. Immediate action required.
                </>
              ) : (
                <>
                  {upcomingCount} payments due this week. Consider reviewing payment sequencing.
                </>
              )}
            </div>
          </div>
          <button className="fcc-risk-action">Review</button>
        </div>
      )}

      {/* Summary Metrics Bar */}
      <div className="fcc-summary-bar">
        <div className="fcc-metric-card">
          <div className="fcc-metric-label">Total Budget</div>
          <div className="fcc-metric-value">{symbol}{formatCurrency(state.totals.total_budgeted / 100)}</div>
          <div className="fcc-metric-change positive">
            {symbol}{formatCurrency(state.totals.total_budgeted / 100)} allocated
          </div>
        </div>

        <div className="fcc-metric-card">
          <div className="fcc-metric-label">Committed</div>
          <div className="fcc-metric-value">{symbol}{formatCurrency(state.totals.total_contracted / 100)}</div>
          <div className="fcc-metric-bar">
            <div className="fcc-metric-bar-fill" style={{ width: `${Math.min(utilizationPercent, 100)}%` }} />
          </div>
          <div className="fcc-metric-sublabel">{utilizationPercent.toFixed(1)}% utilized</div>
        </div>

        <div className="fcc-metric-card">
          <div className="fcc-metric-label">Paid to Date</div>
          <div className="fcc-metric-value">{symbol}{formatCurrency(state.totals.total_paid / 100)}</div>
          <div className="fcc-metric-change">
            {((state.totals.total_paid / (state.totals.total_contracted || 1)) * 100).toFixed(0)}% of committed
          </div>
        </div>

        <div className="fcc-metric-card">
          <div className="fcc-metric-label">Remaining</div>
          <div className={`fcc-metric-value ${isOverBudget ? 'fcc-negative' : 'fcc-positive'}`}>
            {symbol}{formatCurrency(state.totals.total_remaining / 100)}
          </div>
          <div className={`fcc-metric-change ${isOverBudget ? 'fcc-negative' : 'fcc-positive'}`}>
            {isOverBudget ? 'Over budget by ' : 'Under budget by '}
            {symbol}{formatCurrency(Math.abs(totalVariance) / 100)} ({variancePercent.toFixed(1)}%)
          </div>
        </div>

        <div className="fcc-metric-card">
          <div className="fcc-metric-label">Pending Payments</div>
          <div className="fcc-metric-value">{symbol}{formatCurrency(
            state.categories.reduce((sum, c) => sum + ((c.contracted_amount || 0) - c.paid_amount), 0) / 100
          )}</div>
          <div className="fcc-metric-badge warning">
            {overdueCount > 0 ? `${overdueCount} overdue` : `${upcomingCount} upcoming`}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCategories.size > 0 && !clientMode && (
        <div className="fcc-bulk-bar">
          <span>{selectedCategories.size} selected</span>
          <button className="fcc-bulk-btn">Update Selected</button>
          <button className="fcc-bulk-btn">Delete Selected</button>
          <button className="fcc-bulk-btn" onClick={() => setSelectedCategories(new Set())}>Clear Selection</button>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'table' && (
        <div className="fcc-main-content">
          <div className="fcc-table-panel">
            <div className="fcc-table-header">
              <h2>Budget Breakdown</h2>
              <div className="fcc-header-actions">
                <button className="fcc-add-btn" onClick={() => setShowAddModal(true)}>
                  + Add Category
                </button>
              </div>
            </div>

            <div className="fcc-tree-table">
              <div className="fcc-table-head">
                <div className="fcc-col-checkbox">
                  <input 
                    type="checkbox" 
                    checked={selectedCategories.size === state.categories.length}
                    onChange={selectAllCategories}
                  />
                </div>
                <div className="fcc-col-category">Category</div>
                <div className="fcc-col-budget">Target</div>
                <div className="fcc-col-contracted">Contracted</div>
                <div className="fcc-col-variance">Variance</div>
                <div className="fcc-col-paid">Paid</div>
                <div className="fcc-col-balance">Balance</div>
                {!clientMode && <div className="fcc-col-status">Status</div>}
                <div className="fcc-col-actions"></div>
              </div>

              <div className="fcc-table-body">
                {state.categories.map(category => {
                  const color = CATEGORY_COLORS[category.category_name as CategoryName] || '#6b7280';
                  const contracted = category.contracted_amount || 0;
                  const variance = category.budgeted_amount - contracted;
                  const isOverCategoryBudget = contracted > category.budgeted_amount;
                  const balance = contracted - category.paid_amount;
                  const expanded = expandedCategories.has(category.id);
                  const selected = selectedCategories.has(category.id);

                  return (
                    <React.Fragment key={category.id}>
                      <div 
                        className={`fcc-table-row ${selected ? 'fcc-row-selected' : ''} ${isOverCategoryBudget ? 'fcc-row-over' : ''}`}
                      >
                        <div className="fcc-col-checkbox" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selected}
                            onChange={() => toggleCategorySelection(category.id)}
                          />
                        </div>
                        <div 
                          className="fcc-col-category"
                          onClick={() => {
                            const next = new Set(expandedCategories);
                            if (next.has(category.id)) next.delete(category.id);
                            else next.add(category.id);
                            setExpandedCategories(next);
                          }}
                        >
                          <div className="fcc-category-icon" style={{ backgroundColor: color }}>
                            {getCategoryLabel(category.category_name)[0]}
                          </div>
                          <div className="fcc-category-info">
                            <div className="fcc-category-name">{getCategoryLabel(category.category_name)}</div>
                            {category.custom_name && (
                              <div className="fcc-category-note">{category.custom_name}</div>
                            )}
                          </div>
                          <div className={`fcc-expand-icon ${expanded ? 'fcc-expanded' : ''}`}>
                            {expanded ? '−' : '+'}
                          </div>
                        </div>

                        {/* Inline Editable: Target */}
                        <div 
                          className="fcc-col-budget"
                          onDoubleClick={() => handleCellDoubleClick(category, 'budgeted_amount')}
                        >
                          {editingCell?.id === category.id && editingCell?.field === 'budgeted_amount' ? (
                            <input
                              type="text"
                              className="fcc-edit-input"
                              value={editingCell.value}
                              onChange={(e) => handleCellChange(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={handleKeyDown}
                              autoFocus
                            />
                          ) : (
                            <>{symbol}{formatCurrency(category.budgeted_amount / 100)}</>
                          )}
                        </div>

                        {/* Inline Editable: Contracted */}
                        <div 
                          className="fcc-col-contracted"
                          onDoubleClick={() => handleCellDoubleClick(category, 'contracted_amount')}
                        >
                          {editingCell?.id === category.id && editingCell?.field === 'contracted_amount' ? (
                            <input
                              type="text"
                              className="fcc-edit-input"
                              value={editingCell.value}
                              onChange={(e) => handleCellChange(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={handleKeyDown}
                              autoFocus
                            />
                          ) : (
                            <>
                              {symbol}{formatCurrency(contracted / 100)}
                              {isOverCategoryBudget && (
                                <span className="fcc-over-badge">
                                  +{symbol}{formatCurrency((contracted - category.budgeted_amount) / 100)}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Variance (Read-only) */}
                        <div className={`fcc-col-variance ${isOverCategoryBudget ? 'fcc-negative' : 'fcc-positive'}`}>
                          {variance >= 0 ? '' : '+'}
                          {symbol}{formatCurrency(Math.abs(variance) / 100)}
                          <span className="fcc-variance-percent">
                            ({((variance / (category.budgeted_amount || 1)) * 100).toFixed(0)}%)
                          </span>
                        </div>

                        {/* Inline Editable: Paid */}
                        <div 
                          className="fcc-col-paid"
                          onDoubleClick={() => handleCellDoubleClick(category, 'paid_amount')}
                        >
                          {editingCell?.id === category.id && editingCell?.field === 'paid_amount' ? (
                            <input
                              type="text"
                              className="fcc-edit-input"
                              value={editingCell.value}
                              onChange={(e) => handleCellChange(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={handleKeyDown}
                              autoFocus
                            />
                          ) : (
                            <>{symbol}{formatCurrency(category.paid_amount / 100)}</>
                          )}
                        </div>

                        <div className={`fcc-col-balance ${balance > 0 ? 'fcc-pending' : ''}`}>
                          {symbol}{formatCurrency(balance / 100)}
                        </div>

                        {!clientMode && (
                          <div className="fcc-col-status">
                            <StatusBadge category={category} />
                          </div>
                        )}

                        <div className="fcc-col-actions" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="fcc-action-btn" 
                            onClick={() => setEditingCategory(category)}
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button 
                            className="fcc-action-btn fcc-action-delete" 
                            onClick={() => handleDeleteCategory(category.id)}
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="fcc-expanded-row">
                          <div className="fcc-expanded-content">
                            <div className="fcc-expanded-section">
                              <h4>Payment Schedule</h4>
                              {category.payment_schedule?.length > 0 ? (
                                <div className="fcc-payment-list">
                                  {category.payment_schedule.map(payment => (
                                    <div key={payment.id} className="fcc-payment-item">
                                      <div 
                                        className={`fcc-payment-check ${payment.paid ? 'fcc-paid' : ''}`}
                                        onClick={() => handlePaymentToggle(category, payment)}
                                      >
                                        {payment.paid && '✓'}
                                      </div>
                                      <div className="fcc-payment-info">
                                        <span className="fcc-payment-desc">{payment.description}</span>
                                        <span className="fcc-payment-date">{payment.due_date}</span>
                                      </div>
                                      <div className="fcc-payment-amount">
                                        {symbol}{formatCurrency(payment.amount / 100)}
                                      </div>
                                      <div className={`fcc-payment-status ${payment.paid ? 'fcc-paid' : ''}`}>
                                        {payment.paid ? 'Paid' : 'Pending'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="fcc-empty-payments">
                                  No payments scheduled
                                  <button 
                                    className="fcc-add-payment-btn"
                                    onClick={() => setEditingCategory(category)}
                                  >
                                    + Add Payment
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="fcc-expanded-section">
                              <h4>Details</h4>
                              {category.notes && (
                                <div className="fcc-notes-section">
                                  <strong>Notes:</strong> {category.notes}
                                </div>
                              )}
                              {category.vendor_id && (
                                <div className="fcc-notes-section">
                                  <strong>Vendor:</strong> Linked
                                </div>
                              )}
                              <div className="fcc-notes-section">
                                <strong>Created:</strong> {new Date(category.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          {!clientMode && (
            <div className="fcc-side-panel">
              <div className="fcc-side-section">
                <h3>Upcoming Payments</h3>
                {state.alerts.upcoming_payments.length > 0 ? (
                  <div className="fcc-upcoming-list">
                    {state.alerts.upcoming_payments.slice(0, 5).map(({ category_name, payment, days_until }) => (
                      <div key={`${category_name}-${payment.id}`} className="fcc-upcoming-item">
                        <div className="fcc-upcoming-info">
                          <div className="fcc-upcoming-category">{getCategoryLabel(category_name)}</div>
                          <div className="fcc-upcoming-desc">{payment.description}</div>
                        </div>
                        <div className="fcc-upcoming-amount">
                          {symbol}{formatCurrency(payment.amount / 100)}
                          <span className="fcc-upcoming-due">
                            {days_until === 0 ? 'Today' : `In ${days_until}d`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="fcc-empty-state">No upcoming payments</div>
                )}
              </div>

              {state.alerts.overdue_payments.length > 0 && (
                <div className="fcc-side-section fcc-section-alert">
                  <h3>Overdue Payments</h3>
                  <div className="fcc-overdue-list">
                    {state.alerts.overdue_payments.map(({ category_name, payment }) => (
                      <div key={`${category_name}-${payment.id}`} className="fcc-overdue-item">
                        <div className="fcc-overdue-warning">!</div>
                        <div className="fcc-overdue-info">
                          <div className="fcc-overdue-category">{getCategoryLabel(category_name)}</div>
                          <div className="fcc-overdue-desc">{payment.description}</div>
                        </div>
                        <div className="fcc-overdue-amount">
                          {symbol}{formatCurrency(payment.amount / 100)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="fcc-side-section">
                <h3>Budget Health</h3>
                <div className="fcc-health-metrics">
                  <div className="fcc-health-item">
                    <div className="fcc-health-label">Overall Status</div>
                    <div className={`fcc-health-value ${aiRiskLevel}`}>
                      {aiRiskLevel === 'healthy' ? 'On Track' : aiRiskLevel === 'warning' ? 'At Risk' : 'Critical'}
                    </div>
                  </div>
                  <div className="fcc-health-item">
                    <div className="fcc-health-label">Categories Over Budget</div>
                    <div className="fcc-health-value warning">
                      {state.alerts.over_budget_categories.length}
                    </div>
                  </div>
                  <div className="fcc-health-item">
                    <div className="fcc-health-label">Payment Risk</div>
                    <div className="fcc-health-value">
                      {overdueCount > 0 ? 'High' : upcomingCount > 3 ? 'Medium' : 'Low'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <CalendarView 
          categories={state.categories} 
          currency={currency}
          symbol={symbol}
          onPaymentToggle={handlePaymentToggle}
        />
      )}

      {/* Scenarios View */}
      {viewMode === 'scenarios' && (
        <ScenarioView
          scenarios={scenarios}
          activeScenario={activeScenario}
          state={state}
          symbol={symbol}
          onSaveScenario={() => setShowScenarioSave(true)}
          onLoadScenario={loadScenario}
          onDeleteScenario={deleteScenario}
          onExportScenario={(s) => console.log('Export scenario', s)}
        />
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <AddCategoryModal
          eventId={eventId}
          currency={currency}
          onClose={() => setShowAddModal(false)}
          onSuccess={async () => {
            setShowAddModal(false);
            await loadBudgetData();
          }}
        />
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <EditCategoryModal
          eventId={eventId}
          category={editingCategory}
          currency={currency}
          onClose={() => setEditingCategory(null)}
          onSuccess={async () => {
            setEditingCategory(null);
            await loadBudgetData();
          }}
        />
      )}

      {/* Save Scenario Modal */}
      {showScenarioSave && (
        <div className="fcc-modal-backdrop" onClick={() => setShowScenarioSave(false)}>
          <div className="fcc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fcc-modal-header">
              <h3>Save Scenario</h3>
              <button className="fcc-modal-close" onClick={() => setShowScenarioSave(false)}>×</button>
            </div>
            <div className="fcc-modal-body">
              <div className="fcc-form-group">
                <label>Scenario Name</label>
                <input
                  type="text"
                  className="fcc-input"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="e.g., Conservative Budget"
                />
              </div>
            </div>
            <div className="fcc-modal-footer">
              <button className="fcc-btn-secondary" onClick={() => setShowScenarioSave(false)}>Cancel</button>
              <button className="fcc-btn-primary" onClick={saveScenario}>Save Scenario</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Status Badge Component
function StatusBadge({ category }: { category: BudgetCategory }) {
  const getStatusConfig = () => {
    const hasOverdue = category.payment_schedule?.some(p => !p.paid && new Date(p.due_date) < new Date());
    if (hasOverdue) return { label: 'Overdue', color: '#dc2626', bg: '#fef2f2' };
    if (category.contracted_amount && category.paid_amount >= category.contracted_amount) {
      return { label: 'Paid', color: '#16a34a', bg: '#ecfdf5' };
    }
    if (category.paid_amount > 0) return { label: 'Partial', color: '#f97316', bg: '#fff7ed' };
    if (category.is_contracted) return { label: 'Contracted', color: '#3b82f6', bg: '#eff6ff' };
    return { label: 'Planned', color: '#6b7280', bg: '#f3f4f6' };
  };

  const config = getStatusConfig();
  return (
    <span className="fcc-status-badge" style={{ color: config.color, backgroundColor: config.bg }}>
      {config.label}
    </span>
  );
}

// Calendar View Component
function CalendarView({ 
  categories, 
  currency, 
  symbol,
  onPaymentToggle 
}: { 
  categories: BudgetCategory[];
  currency: Currency;
  symbol: string;
  onPaymentToggle: (cat: BudgetCategory, payment: PaymentScheduleItem) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'list'>('month');

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const allPayments = categories.flatMap(cat => 
    (cat.payment_schedule || []).map(p => ({
      ...p,
      category: cat,
    }))
  ).filter(p => {
    const due = new Date(p.due_date);
    return due.getMonth() === currentMonth.getMonth() && 
           due.getFullYear() === currentMonth.getFullYear();
  }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const navigateMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
  };

  return (
    <div className="fcc-calendar-container">
      <div className="fcc-calendar-header">
        <div className="fcc-calendar-nav">
          <button className="fcc-cal-nav-btn" onClick={() => navigateMonth(-1)}>←</button>
          <h2>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <button className="fcc-cal-nav-btn" onClick={() => navigateMonth(1)}>→</button>
        </div>
        <div className="fcc-calendar-view-toggle">
          <button className={`fcc-cal-view-btn ${view === 'month' ? 'fcc-active' : ''}`} onClick={() => setView('month')}>Month</button>
          <button className={`fcc-cal-view-btn ${view === 'list' ? 'fcc-active' : ''}`} onClick={() => setView('list')}>List</button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="fcc-calendar-grid">
          <div className="fcc-calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="fcc-weekday">{d}</div>
            ))}
          </div>
          <div className="fcc-calendar-days">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="fcc-cal-day fcc-empty" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayPayments = allPayments.filter(p => p.due_date === dateStr);
              const today = new Date();
              const isToday = today.getDate() === day && 
                              today.getMonth() === currentMonth.getMonth() &&
                              today.getFullYear() === currentMonth.getFullYear();
              const hasOverdue = dayPayments.some(p => !p.paid && new Date(p.due_date) < today);

              return (
                <div key={day} className={`fcc-cal-day ${isToday ? 'fcc-today' : ''} ${hasOverdue ? 'fcc-overdue-day' : ''}`}>
                  <span className="fcc-day-number">{day}</span>
                  <div className="fcc-day-payments">
                    {dayPayments.slice(0, 2).map(p => (
                      <div 
                        key={p.id} 
                        className={`fcc-day-payment ${p.paid ? 'fcc-paid' : ''}`}
                        title={`${p.description}: ${symbol}${(p.amount / 100).toFixed(2)}`}
                      >
                        {symbol}{(p.amount / 100).toFixed(0)}
                      </div>
                    ))}
                    {dayPayments.length > 2 && (
                      <span className="fcc-more-payments">+{dayPayments.length - 2}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="fcc-calendar-list">
          {allPayments.length > 0 ? allPayments.map(p => (
            <div key={p.id} className={`fcc-list-item ${p.paid ? 'fcc-paid' : ''}`}>
              <div 
                className={`fcc-list-check ${p.paid ? 'fcc-paid' : ''}`}
                onClick={() => onPaymentToggle(p.category, p)}
              >
                {p.paid && '✓'}
              </div>
              <div className="fcc-list-date">
                <div className="fcc-list-day">{new Date(p.due_date).getDate()}</div>
                <div className="fcc-list-month">{new Date(p.due_date).toLocaleDateString('en-US', { month: 'short' })}</div>
              </div>
              <div className="fcc-list-info">
                <div className="fcc-list-desc">{p.description}</div>
                <div className="fcc-list-category">{getCategoryLabel(p.category.category_name)}</div>
              </div>
              <div className="fcc-list-amount">{symbol}{formatCurrency(p.amount / 100)}</div>
              <div className={`fcc-list-status ${p.paid ? 'fcc-paid' : ''}`}>
                {p.paid ? 'Paid' : 'Pending'}
              </div>
            </div>
          )) : (
            <div className="fcc-calendar-empty">No payments this month</div>
          )}
        </div>
      )}
    </div>
  );
}

// Scenario View Component
function ScenarioView({
  scenarios,
  activeScenario,
  state,
  symbol,
  onSaveScenario,
  onLoadScenario,
  onDeleteScenario,
  onExportScenario,
}: {
  scenarios: Scenario[];
  activeScenario: Scenario | null;
  state: BudgetState;
  symbol: string;
  onSaveScenario: () => void;
  onLoadScenario: (s: Scenario) => void;
  onDeleteScenario: (id: string) => void;
  onExportScenario: (s: Scenario) => void;
}) {
  return (
    <div className="fcc-scenarios-container">
      <div className="fcc-scenarios-header">
        <h2>Budget Scenarios</h2>
        <button className="fcc-btn-primary" onClick={onSaveScenario}>+ Save Current as Scenario</button>
      </div>

      <div className="fcc-scenarios-content">
        <div className="fcc-scenarios-list">
          <h3>Saved Scenarios</h3>
          {scenarios.length > 0 ? (
            <div className="fcc-scenario-items">
              {scenarios.map(scenario => (
                <div 
                  key={scenario.id} 
                  className={`fcc-scenario-item ${activeScenario?.id === scenario.id ? 'fcc-active' : ''}`}
                >
                  <div className="fcc-scenario-info">
                    <div className="fcc-scenario-name">{scenario.name}</div>
                    <div className="fcc-scenario-date">
                      {new Date(scenario.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="fcc-scenario-stats">
                    <div className="fcc-scenario-stat">
                      <span className="fcc-stat-label">Budget</span>
                      <span className="fcc-stat-value">{symbol}{formatCurrency(scenario.totals.total_budgeted / 100)}</span>
                    </div>
                    <div className="fcc-scenario-stat">
                      <span className="fcc-stat-label">Committed</span>
                      <span className="fcc-stat-value">{symbol}{formatCurrency(scenario.totals.total_contracted / 100)}</span>
                    </div>
                  </div>
                  <div className="fcc-scenario-actions">
                    <button className="fcc-scenario-btn" onClick={() => onLoadScenario(scenario)}>Load</button>
                    <button className="fcc-scenario-btn" onClick={() => onExportScenario(scenario)}>Export</button>
                    <button className="fcc-scenario-btn fcc-delete" onClick={() => onDeleteScenario(scenario.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="fcc-scenarios-empty">
              <p>No saved scenarios yet.</p>
              <p>Save your current budget state to compare different planning options.</p>
            </div>
          )}
        </div>

        <div className="fcc-scenario-comparison">
          <h3>{activeScenario ? activeScenario.name : 'Current Budget'}</h3>
          <div className="fcc-comparison-stats">
            <div className="fcc-comp-stat">
              <span className="fcc-comp-label">Total Budget</span>
              <span className="fcc-comp-value">
                {symbol}{formatCurrency((activeScenario?.totals.total_budgeted || state.totals.total_budgeted) / 100)}
              </span>
            </div>
            <div className="fcc-comp-stat">
              <span className="fcc-comp-label">Committed</span>
              <span className="fcc-comp-value">
                {symbol}{formatCurrency((activeScenario?.totals.total_contracted || state.totals.total_contracted) / 100)}
              </span>
            </div>
            <div className="fcc-comp-stat">
              <span className="fcc-comp-label">Variance</span>
              <span className={`fcc-comp-value ${
                ((activeScenario?.totals.total_budgeted || state.totals.total_budgeted) - 
                 (activeScenario?.totals.total_contracted || state.totals.total_contracted)) >= 0 
                  ? 'fcc-positive' : 'fcc-negative'
              }`}>
                {symbol}{formatCurrency(
                  Math.abs(
                    ((activeScenario?.totals.total_budgeted || state.totals.total_budgeted) - 
                     (activeScenario?.totals.total_contracted || state.totals.total_contracted))
                  ) / 100
                )}
              </span>
            </div>
          </div>
          
          {activeScenario && (
            <div className="fcc-comparison-note">
              Showing data from scenario: {activeScenario.name}
              <button className="fcc-clear-scenario" onClick={() => onLoadScenario(null as any)}>
                Back to Current
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add Category Modal
function AddCategoryModal({
  eventId,
  currency,
  onClose,
  onSuccess,
}: {
  eventId: string;
  currency: Currency;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState<CategoryName>('venue');
  const [customName, setCustomName] = useState('');
  const [budgeted, setBudgeted] = useState('');
  const [contracted, setContracted] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const result = await createCategory(eventId, {
      category_name: name,
      custom_name: customName || null,
      budgeted_amount: parseCurrencyToCents(budgeted),
      contracted_amount: contracted ? parseCurrencyToCents(contracted) : null,
      notes: notes || null,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fcc-modal-backdrop" onClick={onClose}>
      <div className="fcc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fcc-modal-header">
          <h3>Add Budget Category</h3>
          <button className="fcc-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="fcc-modal-body">
            {error && <div className="fcc-modal-error">{error}</div>}
            
            <div className="fcc-form-group">
              <label>Category</label>
              <select className="fcc-select" value={name} onChange={(e) => setName(e.target.value as CategoryName)}>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="fcc-form-group">
              <label>Custom Name (optional)</label>
              <input
                type="text"
                className="fcc-input"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Premium Photography Package"
              />
            </div>

            <div className="fcc-form-row">
              <div className="fcc-form-group">
                <label>Target Budget</label>
                <div className="fcc-currency-input">
                  <span className="fcc-currency-symbol">{CURRENCY_SYMBOLS[currency]}</span>
                  <input
                    type="text"
                    className="fcc-input fcc-input-currency"
                    value={budgeted}
                    onChange={(e) => setBudgeted(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="fcc-form-group">
                <label>Contracted Amount (optional)</label>
                <div className="fcc-currency-input">
                  <span className="fcc-currency-symbol">{CURRENCY_SYMBOLS[currency]}</span>
                  <input
                    type="text"
                    className="fcc-input fcc-input-currency"
                    value={contracted}
                    onChange={(e) => setContracted(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="fcc-form-group">
              <label>Notes (optional)</label>
              <textarea
                className="fcc-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={3}
              />
            </div>
          </div>
          <div className="fcc-modal-footer">
            <button type="button" className="fcc-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="fcc-btn-primary" disabled={saving}>
              {saving ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Category Modal
function EditCategoryModal({
  eventId,
  category,
  currency,
  onClose,
  onSuccess,
}: {
  eventId: string;
  category: BudgetCategory;
  currency: Currency;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState<CategoryName>(category.category_name);
  const [customName, setCustomName] = useState(category.custom_name || '');
  const [budgeted, setBudgeted] = useState((category.budgeted_amount / 100).toString());
  const [contracted, setContracted] = useState(((category.contracted_amount || 0) / 100).toString());
  const [paid, setPaid] = useState((category.paid_amount / 100).toString());
  const [notes, setNotes] = useState(category.notes || '');
  const [isContracted, setIsContracted] = useState(category.is_contracted);
  const [payments, setPayments] = useState(category.payment_schedule || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const result = await updateCategory(eventId, category.id, {
      category_name: name,
      custom_name: customName || null,
      budgeted_amount: parseCurrencyToCents(budgeted),
      contracted_amount: contracted ? parseCurrencyToCents(contracted) : null,
      paid_amount: parseCurrencyToCents(paid),
      notes: notes || null,
      is_contracted: isContracted,
      payment_schedule: payments,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fcc-modal-backdrop" onClick={onClose}>
      <div className="fcc-modal fcc-modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="fcc-modal-header">
          <h3>Edit Category</h3>
          <button className="fcc-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="fcc-modal-body">
            {error && <div className="fcc-modal-error">{error}</div>}
            
            <div className="fcc-edit-grid">
              <div className="fcc-edit-left">
                <div className="fcc-form-group">
                  <label>Category</label>
                  <select className="fcc-select" value={name} onChange={(e) => setName(e.target.value as CategoryName)}>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="fcc-form-group">
                  <label>Custom Name</label>
                  <input
                    type="text"
                    className="fcc-input"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>

                <div className="fcc-form-row">
                  <div className="fcc-form-group">
                    <label>Target Budget</label>
                    <div className="fcc-currency-input">
                      <span className="fcc-currency-symbol">{CURRENCY_SYMBOLS[currency]}</span>
                      <input
                        type="text"
                        className="fcc-input fcc-input-currency"
                        value={budgeted}
                        onChange={(e) => setBudgeted(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="fcc-form-group">
                    <label>Contracted</label>
                    <div className="fcc-currency-input">
                      <span className="fcc-currency-symbol">{CURRENCY_SYMBOLS[currency]}</span>
                      <input
                        type="text"
                        className="fcc-input fcc-input-currency"
                        value={contracted}
                        onChange={(e) => setContracted(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="fcc-form-row">
                  <div className="fcc-form-group">
                    <label>Paid to Date</label>
                    <div className="fcc-currency-input">
                      <span className="fcc-currency-symbol">{CURRENCY_SYMBOLS[currency]}</span>
                      <input
                        type="text"
                        className="fcc-input fcc-input-currency"
                        value={paid}
                        onChange={(e) => setPaid(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="fcc-form-group">
                    <label className="fcc-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isContracted}
                        onChange={(e) => setIsContracted(e.target.checked)}
                      />
                      Contract Signed
                    </label>
                  </div>
                </div>

                <div className="fcc-form-group">
                  <label>Notes</label>
                  <textarea
                    className="fcc-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="fcc-edit-right">
                <div className="fcc-payments-header">
                  <h4>Payment Schedule</h4>
                  <div className="fcc-payments-summary">
                    Total: {CURRENCY_SYMBOLS[currency]}{formatCurrency(
                      payments.reduce((sum, p) => sum + p.amount, 0) / 100
                    )}
                  </div>
                </div>

                <div className="fcc-payments-list">
                  {payments.length > 0 ? payments.map((payment, idx) => (
                    <div key={payment.id} className={`fcc-payment-edit-item ${payment.paid ? 'fcc-paid' : ''}`}>
                      <div 
                        className={`fcc-payment-check ${payment.paid ? 'fcc-paid' : ''}`}
                        onClick={() => {
                          const updated = [...payments];
                          updated[idx] = { ...payment, paid: !payment.paid };
                          setPayments(updated);
                        }}
                      >
                        {payment.paid && '✓'}
                      </div>
                      <div className="fcc-payment-edit-info">
                        <input
                          type="text"
                          className="fcc-payment-edit-input"
                          value={payment.description}
                          onChange={(e) => {
                            const updated = [...payments];
                            updated[idx] = { ...payment, description: e.target.value };
                            setPayments(updated);
                          }}
                        />
                        <input
                          type="date"
                          className="fcc-payment-edit-date"
                          value={payment.due_date || ''}
                          onChange={(e) => {
                            const updated = [...payments];
                            const newDueDate = e.target.value || payment.due_date || new Date().toISOString().split('T')[0];
                            updated[idx] = { ...payment, due_date: newDueDate } as PaymentScheduleItem;
                            setPayments(updated);
                          }}
                        />
                      </div>
                      <input
                        type="text"
                        className="fcc-payment-edit-amount"
                        value={(payment.amount / 100).toFixed(2)}
                        onChange={(e) => {
                          const updated = [...payments];
                          updated[idx] = { ...payment, amount: parseCurrencyToCents(e.target.value) };
                          setPayments(updated);
                        }}
                      />
                      <button
                        type="button"
                        className="fcc-payment-remove"
                        onClick={() => {
                          setPayments(payments.filter((_, i) => i !== idx));
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )) : (
                    <div className="fcc-payments-empty">No payments yet</div>
                  )}
                </div>

                <button
                  type="button"
                  className="fcc-add-payment-btn"
                  onClick={() => {
                    setPayments([
                      ...payments,
                      {
                        id: `pay_${Date.now()}`,
                        amount: 0,
                        due_date: new Date().toISOString().split('T')[0] as string,
                        paid: false,
                        paid_date: null,
                        description: 'New payment',
                      } as PaymentScheduleItem,
                    ]);
                  }}
                >
                  + Add Payment
                </button>
              </div>
            </div>
          </div>
          <div className="fcc-modal-footer">
            <button type="button" className="fcc-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="fcc-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FinancialCommandCenter;
