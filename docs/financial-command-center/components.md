# React Component Architecture - Financial Command Center

## Directory Structure

```
src/
├── components/
│   ├── budget/
│   │   ├── FinancialCommandCenter.tsx  # Main container
│   │   ├── BudgetHeader.tsx            # Top summary bar
│   │   ├── BudgetTable/
│   │   │   ├── BudgetTreeTable.tsx     # Main grid
│   │   │   ├── BudgetRow.tsx           # Individual row
│   │   │   ├── CategoryGroup.tsx       # Collapsible category
│   │   │   ├── InlineEditCell.tsx      # Editable cell
│   │   │   └── BulkActions.tsx         # Multi-select actions
│   │   ├── PaymentCalendar/
│   │   │   ├── PaymentTimeline.tsx     # Calendar view
│   │   │   ├── UpcomingPayments.tsx    # Due date list
│   │   │   └── PaymentAlerts.tsx       # Risk notifications
│   │   ├── ClientMode/
│   │   │   ├── ClientToggle.tsx        # Mode switch
│   │   │   ├── ClientPortal.tsx        # Read-only view
│   │   │   └── ApprovalWidget.tsx      # E-signature
│   │   ├── Scenarios/
│   │   │   ├── ScenarioManager.tsx     # What-if tabs
│   │   │   ├── ScenarioCompare.tsx     # Diff view
│   │   │   └── BaselineLock.tsx        # Lock controls
│   │   ├── AIInsights/
│   │   │   ├── AIRiskBanner.tsx        # Top AI warnings
│   │   │   ├── ForecastPanel.tsx       # AI predictions
│   │   │   └── SuggestionCard.tsx      # Action items
│   │   ├── Export/
│   │   │   ├── ExportModal.tsx         # PDF/Excel options
│   │   │   └── ReportGenerator.tsx     # Report builder
│   │   └── common/
│   │       ├── CurrencyDisplay.tsx     # Formatted currency
│   │       ├── StatusBadge.tsx         # Tag styling
│   │       ├── ProgressBar.tsx        # Visual progress
│   │       └── EmptyState.tsx          # No data state
│   ├── vendors/
│   │   └── VendorSelect.tsx            # Vendor dropdown
│   ├── ui/
│   │   ├── TreeTable.tsx              # Reusable table
│   │   ├── DatePicker.tsx              # Date input
│   │   └── CurrencyInput.tsx           # Number input
│   └── layout/
│       └── BudgetSidebar.tsx           # Quick actions
├── hooks/
│   ├── useBudget.ts                    # Main data hook
│   ├── useBudgetMutations.ts           # CRUD operations
│   ├── usePaymentSchedule.ts           # Calendar logic
│   ├── useClientMode.ts                # Privacy toggles
│   └── useAIInsights.ts                # AI data
├── lib/
│   ├── budget/
│   │   ├── calculations.ts             # Math helpers
│   │   ├── formatters.ts               # Display formatting
│   │   └── constants.ts                # Enums/config
│   ├── currency/
│   │   ├── exchange.ts                  # FX conversion
│   │   └── rates.ts                     # Rate caching
│   └── integrations/
│       ├── stripe.ts                    # Stripe SDK
│       ├── google-calendar.ts           # Calendar API
│       └── quickbooks.ts                # QB API
├── types/
│   └── budget.ts                       # TypeScript interfaces
├── api/
│   └── budget/
│       ├── routes.ts                   # API endpoints
│       └── validators.ts                # Zod schemas
└── app/
    └── weddings/
        └── [id]/
            └── budget/
                ├── page.tsx            # Main page
                └── layout.tsx          # Tab layout
```

---

## Core Component Specifications

### FinancialCommandCenter.tsx

```tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { BudgetHeader } from './BudgetHeader';
import { BudgetTreeTable } from './BudgetTable/BudgetTreeTable';
import { BudgetSidebar } from './layout/BudgetSidebar';
import { PaymentTimeline } from './PaymentCalendar/PaymentTimeline';
import { ClientToggle } from './ClientMode/ClientToggle';
import { AIRiskBanner } from './AIInsights/AIRiskBanner';
import { useBudget } from '@/hooks/useBudget';
import { usePaymentSchedule } from '@/hooks/usePaymentSchedule';
import { useClientMode } from '@/hooks/useClientMode';

interface FinancialCommandCenterProps {
  weddingId: UUID;
  initialBudget?: BudgetHeader;
}

export function FinancialCommandCenter({
  weddingId,
  initialBudget,
}: FinancialCommandCenterProps) {
  const { budget, isLoading, refetch } = useBudget(weddingId, initialBudget);
  const { upcomingPayments, overdueItems, alerts } = usePaymentSchedule(budget);
  const { mode, toggleMode, canToggle } = useClientMode(budget);

  const [activeView, setActiveView] = useState<'table' | 'calendar' | 'compare'>('table');
  const [selectedItems, setSelectedItems] = useState<Set<UUID>>(new Set());
  const [showSidebar, setShowSidebar] = useState(true);

  const summaryMetrics = useMemo(() => ({
    totalBudget: budget?.total_target_budget_cents ?? 0,
    committed: budget?.total_contracted_cents ?? 0,
    paid: budget?.total_paid_cents ?? 0,
    remaining: (budget?.total_target_budget_cents ?? 0) - (budget?.total_contracted_cents ?? 0),
    utilizationPercent: budget 
      ? (budget.total_contracted_cents / budget.total_target_budget_cents) * 100 
      : 0,
  }), [budget]);

  if (isLoading) return <BudgetSkeleton />;

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Financial Command Center</h1>
            <div className="flex items-center gap-3">
              <ClientToggle 
                mode={mode} 
                onToggle={toggleMode}
                disabled={!canToggle}
              />
              <ViewToggle active={activeView} onChange={setActiveView} />
              <ExportButton budget={budget} mode={mode} />
            </div>
          </div>

          {/* AI Risk Banner */}
          {alerts.length > 0 && (
            <AIRiskBanner alerts={alerts.slice(0, 3)} />
          )}

          {/* Summary Metrics */}
          <BudgetHeader metrics={summaryMetrics} currency={budget?.currency_code ?? 'EUR'} />
        </header>

        {/* Main Grid / Calendar */}
        <main className="flex-1 overflow-auto p-6">
          {activeView === 'table' && (
            <BudgetTreeTable
              budget={budget}
              mode={mode}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              onItemUpdate={refetch}
            />
          )}
          {activeView === 'calendar' && (
            <PaymentTimeline
              payments={upcomingPayments}
              overdueItems={overdueItems}
              currency={budget?.currency_code ?? 'EUR'}
            />
          )}
          {activeView === 'compare' && (
            <ScenarioCompareView weddingId={weddingId} />
          )}
        </main>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <BudgetSidebar
          budget={budget}
          selectedItems={selectedItems}
          mode={mode}
          onClose={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}
```

### BudgetTreeTable.tsx

```tsx
'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BudgetRow } from './BudgetRow';
import { CategoryGroup } from './CategoryGroup';
import { BulkActions } from './BulkActions';
import { useBudgetTree } from '@/hooks/useBudgetTree';
import { useBudgetColumns } from '@/hooks/useBudgetColumns';
import type { BudgetLineItem, VisibilityMode } from '@/types/budget';

interface BudgetTreeTableProps {
  budget: BudgetHeader;
  mode: VisibilityMode;
  selectedItems: Set<UUID>;
  onSelectionChange: (items: Set<UUID>) => void;
  onItemUpdate: () => void;
}

export function BudgetTreeTable({
  budget,
  mode,
  selectedItems,
  onSelectionChange,
  onItemUpdate,
}: BudgetTreeTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(budget?.categories?.map(c => c.type) ?? [])
  );
  
  const { treeData, flattenTree } = useBudgetTree(budget?.items ?? [], expandedCategories);
  const { columns, columnOrder } = useBudgetColumns(mode);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: flattenTree.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Table Header */}
      <div className="grid bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
        <div className="w-8 px-2">
          <input
            type="checkbox"
            checked={selectedItems.size === flattenTree.length}
            onChange={(e) => {
              onSelectionChange(
                e.target.checked 
                  ? new Set(flattenTree.map(i => i.id))
                  : new Set()
              );
            }}
          />
        </div>
        {columns.map(col => (
          <div
            key={col.key}
            className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider
              ${col.align === 'right' ? 'text-right' : 'text-left'}
            `}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Virtualized Table Body */}
      <div 
        ref={parentRef} 
        className="overflow-auto max-h-[calc(100vh-300px)]"
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const item = flattenTree[virtualRow.index];
            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {item.type === 'category' ? (
                  <CategoryGroup
                    category={item}
                    isExpanded={expandedCategories.has(item.key)}
                    onToggle={() => {
                      const next = new Set(expandedCategories);
                      if (next.has(item.key)) next.delete(item.key);
                      else next.add(item.key);
                      setExpandedCategories(next);
                    }}
                  />
                ) : (
                  <BudgetRow
                    item={item}
                    mode={mode}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={() => {
                      const next = new Set(selectedItems);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      onSelectionChange(next);
                    }}
                    onUpdate={onItemUpdate}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <BulkActions
          count={selectedItems.size}
          onAction={(action) => console.log(action)}
          onClear={() => onSelectionChange(new Set())}
        />
      )}
    </div>
  );
}
```

### BudgetRow.tsx

```tsx
'use client';

import { useState, useCallback } from 'react';
import { InlineEditCell } from './InlineEditCell';
import { StatusBadge } from '../common/StatusBadge';
import { CurrencyDisplay } from '../common/CurrencyDisplay';
import { useBudgetMutations } from '@/hooks/useBudgetMutations';
import type { BudgetLineItem, VisibilityMode } from '@/types/budget';

interface BudgetRowProps {
  item: BudgetLineItem;
  mode: VisibilityMode;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: () => void;
}

export function BudgetRow({
  item,
  mode,
  isSelected,
  onSelect,
  onUpdate,
}: BudgetRowProps) {
  const { updateItem } = useBudgetMutations();

  const handleFieldUpdate = useCallback(async (field: string, value: any) => {
    await updateItem(item.id, { [field]: value });
    onUpdate();
  }, [item.id, updateItem, onUpdate]);

  const varianceColor = item.variance >= 0 
    ? 'text-green-600' 
    : item.variance < -item.target_budget_cents * 0.1 
      ? 'text-red-600' 
      : 'text-yellow-600';

  return (
    <div 
      className={`grid border-b border-gray-100 hover:bg-gray-50 transition-colors
        ${isSelected ? 'bg-blue-50' : ''}
      `}
      style={{ gridTemplateColumns: `32px repeat(${mode === 'client' ? 6 : 10}, minmax(0, 1fr))` }}
    >
      {/* Checkbox */}
      <div className="px-2 flex items-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300"
        />
      </div>

      {/* Item Name */}
      <div className="px-4 py-3 flex items-center gap-2">
        <button className="text-gray-900 font-medium hover:text-blue-600">
          {item.item_name}
        </button>
      </div>

      {/* Category (Client Mode: Hide) */}
      {mode === 'internal' && (
        <div className="px-4 py-3 flex items-center">
          <span className="text-sm text-gray-500 capitalize">{item.category_type}</span>
        </div>
      )}

      {/* Target Budget */}
      <div className="px-4 py-3 flex items-center">
        <InlineEditCell
          value={item.target_budget_cents}
          onSave={(v) => handleFieldUpdate('target_budget_cents', v)}
          formatter={(v) => <CurrencyDisplay cents={v} />}
          disabled={mode === 'client'}
        />
      </div>

      {/* Contracted Amount */}
      <div className="px-4 py-3 flex items-center">
        <InlineEditCell
          value={item.contracted_amount_cents}
          onSave={(v) => handleFieldUpdate('contracted_amount_cents', v)}
          formatter={(v) => <CurrencyDisplay cents={v} bold />}
          disabled={mode === 'client'}
        />
      </div>

      {/* Variance */}
      <div className="px-4 py-3 flex items-center">
        <span className={`text-sm font-medium ${varianceColor}`}>
          <CurrencyDisplay cents={item.variance} showSign />
        </span>
      </div>

      {/* Paid to Date */}
      <div className="px-4 py-3 flex items-center">
        <InlineEditCell
          value={item.paid_to_date_cents}
          onSave={(v) => handleFieldUpdate('paid_to_date_cents', v)}
          formatter={(v) => <CurrencyDisplay cents={v} />}
          disabled={mode === 'client'}
        />
      </div>

      {/* Balance Due */}
      <div className="px-4 py-3 flex items-center">
        <CurrencyDisplay 
          cents={item.balance_due} 
          className={item.balance_due > 0 ? 'text-orange-600' : 'text-gray-400'}
        />
      </div>

      {/* Markup (Client Mode: Hide) */}
      {mode === 'internal' && (
        <div className="px-4 py-3 flex items-center">
          <span className="text-sm text-gray-500">
            <CurrencyDisplay cents={item.markup_amount_cents} />
            {item.markup_percentage > 0 && (
              <span className="ml-1 text-xs">({item.markup_percentage}%)</span>
            )}
          </span>
        </div>
      )}

      {/* Status */}
      <div className="px-4 py-3 flex items-center">
        <StatusBadge status={item.status} />
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-2">
        <button className="p-1 hover:bg-gray-100 rounded">
          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
```

### PaymentTimeline.tsx

```tsx
'use client';

import { useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { CurrencyDisplay } from '../common/CurrencyDisplay';

interface PaymentTimelineProps {
  payments: PaymentScheduleItem[];
  overdueItems: PaymentScheduleItem[];
  currency: string;
}

export function PaymentTimeline({
  payments,
  overdueItems,
  currency,
}: PaymentTimelineProps) {
  const weekGroups = useMemo(() => {
    const groups: Record<string, PaymentScheduleItem[]> = {};
    payments.forEach(payment => {
      const weekKey = format(new Date(payment.due_date), 'yyyy-MM-dd');
      if (!groups[weekKey]) groups[weekKey] = [];
      groups[weekKey].push(payment);
    });
    return groups;
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Overdue Alert */}
      {overdueItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-2">
            {overdueItems.length} Overdue Payment{overdueItems.length !== 1 ? 's' : ''}
          </h3>
          {overdueItems.slice(0, 5).map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-red-700">{item.item_name}</span>
              <CurrencyDisplay cents={item.balance_due} currency={currency} />
            </div>
          ))}
        </div>
      )}

      {/* Week Groups */}
      {Object.entries(weekGroups).map(([weekKey, weekPayments]) => (
        <div key={weekKey} className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between">
            <h3 className="font-medium text-gray-900">{format(new Date(weekKey), 'MMM d')}</h3>
            <span className="text-sm text-gray-500">
              {weekPayments.length} payments
            </span>
          </div>
          {weekPayments.map(payment => (
            <PaymentTimelineItem
              key={payment.id}
              payment={payment}
              currency={currency}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function PaymentTimelineItem({
  payment,
  currency,
}: {
  payment: PaymentScheduleItem;
  currency: string;
}) {
  const daysUntilDue = differenceInDays(new Date(payment.due_date), new Date());
  
  const urgencyColor = daysUntilDue < 0 
    ? 'text-red-600' 
    : daysUntilDue <= 3 
      ? 'text-orange-600' 
      : 'text-gray-600';

  return (
    <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
      <div>
        <div className="font-medium text-gray-900">{payment.item_name}</div>
        <div className="text-sm text-gray-500">{payment.vendor_name}</div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`text-sm font-medium ${urgencyColor}`}>
          {daysUntilDue < 0 
            ? `${Math.abs(daysUntilDue)} days overdue`
            : `In ${daysUntilDue} days`}
        </div>
        <CurrencyDisplay cents={payment.amount_due} currency={currency} bold />
        {payment.status !== 'paid' && (
          <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded">
            Pay Now
          </button>
        )}
      </div>
    </div>
  );
}
```

### ClientToggle.tsx

```tsx
'use client';

import { useState } from 'react';
import { ShieldIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface ClientToggleProps {
  mode: 'internal' | 'client';
  onToggle: (mode: 'internal' | 'client') => void;
  disabled?: boolean;
}

export function ClientToggle({ mode, onToggle, disabled }: ClientToggleProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (mode === 'client') {
    return (
      <button
        onClick={() => onToggle('internal')}
        className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 
          text-green-700 rounded-lg text-sm font-medium hover:bg-green-100"
      >
        <EyeIcon className="w-4 h-4" />
        Client Mode Active
      </button>
    );
  }

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
        <span className="text-amber-700">Switch to Client Mode?</span>
        <button
          onClick={() => onToggle('client')}
          className="px-2 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700"
        >
          Confirm
        </button>
        <button
          onClick={() => setIsConfirming(false)}
          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsConfirming(true)}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 
        text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
    >
      <EyeSlashIcon className="w-4 h-4" />
      Show Client View
    </button>
  );
}
```

### AIRiskBanner.tsx

```tsx
import { AlertTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface AIRiskBannerProps {
  alerts: AIInsight[];
}

export function AIRiskBanner({ alerts }: AIRiskBannerProps) {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  if (criticalAlerts.length === 0 && warningAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {criticalAlerts.map(alert => (
        <div
          key={alert.id}
          className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm"
        >
          <AlertTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium text-red-800">{alert.title}</span>
            <span className="text-red-600 ml-2">{alert.description}</span>
          </div>
        </div>
      ))}

      {warningAlerts.slice(0, 2).map(alert => (
        <div
          key={alert.id}
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm"
        >
          <SparklesIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800">
            <span className="font-medium">{alert.title}</span>
            <span className="ml-2 text-amber-600">{alert.description}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
```

## Hook Specifications

### useBudget.ts

```typescript
export function useBudget(weddingId: UUID, initialBudget?: BudgetHeader) {
  const queryKey = ['budget', weddingId];
  
  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchBudget(weddingId),
    initialData: initialBudget,
    staleTime: 30000,
  });

  const summary = useMemo(() => ({
    totalBudget: data?.total_target_budget_cents ?? 0,
    committed: data?.total_contracted_cents ?? 0,
    paid: data?.total_paid_cents ?? 0,
    remaining: (data?.total_target_budget_cents ?? 0) - (data?.total_contracted_cents ?? 0),
    utilization: data 
      ? (data.total_contracted_cents / data.total_target_budget_cents) * 100 
      : 0,
  }), [data]);

  return { budget: data, isLoading, refetch, summary };
}

async function fetchBudget(weddingId: UUID): Promise<BudgetHeader> {
  const response = await fetch(`/api/v1/budgets/${weddingId}`);
  if (!response.ok) throw new Error('Failed to fetch budget');
  return response.json();
}
```

### useBudgetMutations.ts

```typescript
export function useBudgetMutations() {
  const queryClient = useQueryClient();

  const updateItem = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: UUID; data: Partial<BudgetLineItem> }) => {
      const response = await fetch(`/api/v1/budgets/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      toast.success('Item updated');
    },
  });

  return { updateItem };
}
```

### usePaymentSchedule.ts

```typescript
export function usePaymentSchedule(budget: BudgetHeader | undefined) {
  const payments = useMemo(() => {
    if (!budget?.items) return [];
    
    return budget.items
      .filter(item => item.payment_due_date && item.status !== 'paid')
      .map(item => ({
        id: item.id,
        item_name: item.item_name,
        amount_due: item.contracted_amount_cents - item.paid_to_date_cents,
        due_date: item.payment_due_date,
        status: item.payment_status,
      }))
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [budget]);

  const overdueItems = useMemo(() => 
    payments.filter(p => new Date(p.due_date) < new Date()),
    [payments]
  );

  const alerts = useMemo(() => {
    const result: PaymentAlert[] = [];
    if (overdueItems.length > 0) {
      result.push({
        type: 'overdue',
        severity: 'critical',
        message: `${overdueItems.length} payments overdue`,
      });
    }
    return result;
  }, [overdueItems]);

  return { payments, overdueItems, alerts };
}
```

## TypeScript Types

```typescript
// types/budget.ts

export interface BudgetHeader {
  id: UUID;
  wedding_id: UUID;
  currency_code: string;
  total_target_budget_cents: number;
  total_contracted_cents: number;
  total_paid_cents: number;
  total_actual_spent_cents: number;
  approval_status: ApprovalStatus;
}

export interface BudgetLineItem {
  id: UUID;
  budget_header_id: UUID;
  vendor_id: UUID | null;
  category_type: string;
  item_name: string;
  target_budget_cents: number;
  contracted_amount_cents: number;
  actual_spent_cents: number;
  paid_to_date_cents: number;
  balance_due: number;
  variance: number;
  markup_amount_cents: number;
  markup_percentage: number;
  is_taxable: boolean;
  tax_rate: number;
  payment_due_date: string | null;
  payment_status: PaymentStatus;
  visibility: VisibilityMode;
  status: PaymentStatus;
}

export interface AIInsight {
  id: UUID;
  insight_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  generated_at: string;
}

export type PaymentStatus = 
  | 'planned' | 'quoted' | 'contracted' 
  | 'partially_paid' | 'paid' | 'cancelled' 
  | 'refunded' | 'disputed';

export type VisibilityMode = 'client_visible' | 'internal_only';
export type ApprovalStatus = 
  | 'draft' | 'pending_review' | 'pending_client_approval' 
  | 'approved' | 'rejected' | 'amended';
```
