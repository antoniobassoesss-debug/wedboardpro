# Financial Command Center - Feature Specification

## Overview

The Financial Command Center is a comprehensive budget and money management module for professional wedding planners. It addresses three core pain points:

1. **Visibility**: "Where did the money go?" - Deep variance analysis and post-event reconciliation
2. **Cash Flow**: "When do I need to pay?" - Predictive calendar with alerts
3. **Privacy**: "What do I show the client?" - Secure markup/privacy toggles with Client Mode

---

## Priority Matrix

### MUST-HAVE (Phase 1)

#### 1.1 Budget Management Core

| Feature | Description | Logic |
|---------|-------------|-------|
| **Tree Table Grid** | Collapsible hierarchical categories | React component with drag-drop, inline editing, bulk actions |
| **Inline Editing** | Click-to-edit cells | Optimistic UI updates with Supabase mutations |
| **Auto-Calculations** | Real-time totals, variances, balances | PostgreSQL generated columns + React computed values |
| **Multi-Currency** | EUR/USD/GBP with real-time FX | Cached rates, on-demand refresh, display toggle |
| **Category Management** | Hierarchical dropdowns | Parent-child relationships, custom sub-categories |
| **Status Workflow** | Planned → Quoted → Contracted → Paid | State machine with allowed transitions |

#### 1.2 Payment Scheduling

| Feature | Description | Logic |
|---------|-------------|-------|
| **Smart Calendar** | Aggregated view of all due dates | GROUP BY due_date, color-coded by status |
| **Payment Alerts** | 7-day, 3-day, 1-day reminders | Cron job query for upcoming due dates |
| **Installment Builder** | Split payments (20/40/40 template) | Auto-distribute amount across dates |
| **Balance Tracking** | Paid to Date vs. Balance Due | `Balance = Contracted - Paid` |
| **Overdue Detection** | Flag past-due items | `Due Date < NOW() AND Status != Paid` |

#### 1.3 Client Mode

| Feature | Description | Logic |
|---------|-------------|-------|
| **Privacy Toggle** | One-click internal/client view | Conditional column rendering based on mode |
| **Markup Hiding** | Remove markup columns | `visibility = 'internal_only'` filter |
| **Client Portal** | Shareable read-only link | UUID token with optional access code |
| **Export Controls** | PDF/Excel with/without markup | Export configuration based on mode |
| **Approval Flow** | Client e-signature capture | DocuSign-like embedded widget |

#### 1.4 Vendor Integration

| Feature | Description | Logic |
|---------|-------------|-------|
| **Vendor Link** | Relation to CRM vendor table | Foreign key with fallback to manual entry |
| **Commission Tracking** | Photographer 30% partnership rates | Separate field, not included in client totals |
| **Payment History** | Vendor payment audit trail | Time-series of all transactions |
| **Contract Storage** | Link to file storage | Supabase Storage bucket reference |

#### 1.5 Tax Management

| Feature | Description | Logic |
|---------|-------------|-------|
| **Tax Toggle** | Per-item taxable flag | Boolean with default from header |
| **Auto Tax Calc** | Apply rate to contracted amount | `Tax = Amount * Rate / 100` |
| **VAT Support** | Multi-jurisdiction rates | Per-planner default, overridable per item |
| **Tax Summary** | Category-level tax breakdown | Aggregate by `is_taxable` |

---

### SHOULD-HAVE (Phase 2)

#### 2.1 Variance & Reconciliation

| Feature | Description | Logic |
|---------|-------------|-------|
| **Variance Analysis** | Target vs. Contracted vs. Actual | Three-stage delta tracking |
| **Post-Event Recon** | Final spend comparison | `Actual - Contracted` delta |
| **Category Alerts** | Over-budget warnings | `Contracted > Target * 1.1` threshold |
| **Trend Charts** | Budget burn-down visualization | D3.js sparklines per category |

#### 2.2 What-If Scenarios

| Feature | Description | Logic |
|---------|-------------|-------|
| **Scenario Manager** | Save/load budget variants | Snapshot full budget state |
| **Baseline Locking** | Freeze approved version | Immutable reference point |
| **Comparison View** | Side-by-side scenario diff | Highlight changed values |
| **Quick Restore** | Revert to baseline | One-click restore action |

#### 2.3 Reporting & Export

| Feature | Description | Logic |
|---------|-------------|-------|
| **PDF Export** | Professional layouts | react-pdf with branded templates |
| **Excel Export** | Full data with formulas | xlsx library with cell formulas |
| **Category Pie Chart** | Budget allocation visual | Chart.js or Recharts |
| **Payment Schedule** | Due-date sorted list | Print-ready format |
| **Vendor Payment Report** | Per-vendor summaries | Group by vendor_id |

#### 2.4 Integration Foundation

| Feature | Description | Logic |
|---------|-------------|-------|
| **Google Calendar** | Create events for due dates | OAuth2 + Calendar API |
| **Stripe Sync** | Update paid status | Webhook + payment intent tracking |
| **Email Notifications** | Resend integration | Transactional emails for alerts |

---

### PRO (Phase 3 - Differentiators)

#### 3.1 AI Forecasting Engine

| Feature | Description | Logic |
|---------|-------------|-------|
| **Overrun Prediction** | ML model for budget risks | Historical data + current trends |
| **Contingency Suggestions** | AI-recommended buffer % | Based on category variance |
| **Risk Alerts** | "Venue may rise 12%" notifications | External data + pattern matching |
| **Cash Flow Forecast** | 30/60/90 day prediction | Installment due dates + spend rate |
| **Smart Recommendations** | "Switch to this cheaper vendor" | Vendor database + price comparison |

#### 3.2 Profitability Simulator

| Feature | Description | Logic |
|---------|-------------|-------|
| **Margin Modeling** | What-if markup changes | Real-time recalculation |
| **Guest Count Impact** | Catering cost scaling | Linear + step functions |
| **Scenario Comparison** | Profit variance by scenario | `Revenue - Costs - Markup - Fees` |
| **Break-even Analysis** | Minimum guest count | Fixed vs. variable cost calculation |

#### 3.3 Advanced Payment Features

| Feature | Description | Logic |
|---------|-------------|-------|
| **Payment Sequencing** | Auto-suggest optimal schedule | Optimization algorithm |
| **Installment Templates** | Common patterns (50/25/25, etc.) | Pre-defined + custom builder |
| **Bulk Payment Processing** | Multi-vendor batch payments | Stripe Connect integration |
| **Refund/Dispute Flow** | Credit adjustments | Transaction reversal + audit |

#### 3.4 Accounting Integration

| Feature | Description | Logic |
|---------|-------------|-------|
| **QuickBooks Export** | Journal entries, invoices | OAuth2 + QB API |
| **Xero Sync** | Invoice creation, payments | OAuth2 + Xero API |
| **Categorized Exports** | Expense categories mapping | Configurable field mapping |
| **Batch Reconciliation** | Match payments to line items | Fuzzy matching on amounts/dates |

#### 3.5 Advanced Client Features

| Feature | Description | Logic |
|---------|-------------|-------|
| **Client Dashboard** | Limited view for clients | Subset of columns, no markup |
| **Approval Workflows** | DocuSign integration | E-signature capture |
| **Version Comparison** | Show changes between versions | Diff highlighting |
| **Comment Thread** | Client questions inline | Thread per line item |

---

## Detailed Logic Specifications

### 3.1.1 Auto-Calculation Engine

```typescript
// Budget Line Item Computed Values

interface BudgetLineItem {
  // Inputs
  targetBudget: number;        // User estimated
  contractedAmount: number;   // Vendor quote/contract
  actualSpent: number;         // Post-event reconciliation
  paidToDate: number;          // Payments made
  markupPercentage: number;    // Internal markup
  taxRate: number;             // VAT/sales tax
  isTaxable: boolean;

  // Generated Columns (PostgreSQL)
  taxAmount: number = isTaxable ? contractedAmount * taxRate / 100 : 0;
  markupAmount: number = contractedAmount * markupPercentage / 100;
  finalClientPrice: number = contractedAmount + taxAmount + markupAmount;
  balanceDue: number = contractedAmount - paidToDate;
  variance: number = targetBudget - contractedAmount;
  reconciliationVariance: number = actualSpent - contractedAmount;

  // Computed in React (for display)
  budgetUtilization: number = (contractedAmount / targetBudget) * 100;
  isOverBudget: boolean = contractedAmount > targetBudget;
  varianceStatus: 'under' | 'on_track' | 'over' = 
    variance > 0 ? 'under' :
    variance < -targetBudget * 0.05 ? 'over' : 'on_track';
}
```

### 3.1.2 Payment Status State Machine

```typescript
const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  planned: ['quoted'],
  quoted: ['contracted', 'planned'],
  contracted: ['partially_paid', 'paid', 'cancelled'],
  partially_paid: ['paid', 'contracted'],
  paid: ['refunded', 'disputed'],
  cancelled: [],
  refunded: [],
  disputed: ['paid', 'refunded'],
};

function canTransition(current: PaymentStatus, next: PaymentStatus): boolean {
  return PAYMENT_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}
```

### 3.1.3 Installment Generation Algorithm

```typescript
interface InstallmentTemplate {
  name: string;
  percentages: number[];
  milestones: string[];
}

const INSTALLMENT_TEMPLATES: InstallmentTemplate[] = [
  {
    name: 'Standard 50/25/25',
    percentages: [50, 25, 25],
    milestones: ['Booking', 'Deposit', 'Final'],
  },
  {
    name: 'Venue 40/30/30',
    percentages: [40, 30, 30],
    milestones: ['Contract Signing', 'Final Headcount', 'Event Day'],
  },
  {
    name: 'Photography 30/40/30',
    percentages: [30, 40, 30],
    milestones: ['Booking', 'Preview Delivery', 'Final Gallery'],
  },
  {
    name: 'Catering Per-Guest',
    percentages: [],  // Calculated dynamically
    milestones: ['Deposit', 'Final Headcount', 'Service'],
  },
];

function generateInstallments(
  totalAmount: number,
  template: InstallmentTemplate,
  startDate: Date,
  milestoneDays: number[]
): Installment[] {
  return template.percentages.map((percentage, index) => ({
    installmentNumber: index + 1,
    percentageSplit: percentage,
    amountCents: Math.round(totalAmount * percentage / 100),
    dueDate: addDays(startDate, milestoneDays[index] ?? 0),
    status: 'scheduled' as const,
  }));
}
```

### 3.1.4 AI Forecasting Prompt Structure

```typescript
const AI_FORECASTING_PROMPT = `
Analyze this wedding budget for financial risks and optimization opportunities.

BUDGET DATA:
- Wedding: {wedding_name}
- Date: {wedding_date}
- Total Budget: {total_budget_cents} {currency}
- Committed: {total_contracted_cents} {currency}
- Paid to Date: {total_paid_cents} {currency}
- Remaining: {balance_due_cents} {currency}

CATEGORY BREAKDOWN:
{category_data_json}

HISTORICAL DATA:
{historical_variance_by_category}

PAYMENT SCHEDULE:
{upcoming_payments_json}

TASK:
1. Identify top 3 budget overrun risks (category, predicted amount, confidence)
2. Suggest optimal payment sequencing to smooth cash flow
3. Recommend contingency buffer increase (specific percentage and rationale)
4. Flag any unusual pricing vs. market averages
5. Provide specific action items with deadlines

Output JSON format:
{
  "risks": [{
    "category": string,
    "predicted_overrun_cents": number,
    "confidence": number (0-1),
    "reason": string,
    "action": string
  }],
  "cash_flow_recommendations": [{
    "description": string,
    "estimated_savings_cents": number,
    "implementation_difficulty": "low" | "medium" | "high"
  }],
  "suggested_buffer_increase_percent": number,
  "action_items": [{
    "task": string,
    "deadline": date,
    "impact": "high" | "medium" | "low"
  }]
}
`;
```

### 3.1.5 Client Mode Visibility Logic

```typescript
interface VisibilityConfig {
  showInternalMarkup: boolean;
  showVendorMarkup: boolean;
  showProfitMargins: boolean;
  showActualSpent: boolean;
  showTaxBreakdown: boolean;
  showPaymentHistory: boolean;
  showInternalNotes: boolean;
}

const CLIENT_MODE_CONFIG: VisibilityConfig = {
  showInternalMarkup: false,
  showVendorMarkup: false,
  showProfitMargins: false,
  showActualSpent: false,
  showTaxBreakdown: true,
  showPaymentHistory: false,
  showInternalNotes: false,
};

const INTERNAL_MODE_CONFIG: VisibilityConfig = {
  showInternalMarkup: true,
  showVendorMarkup: true,
  showProfitMargins: true,
  showActualSpent: true,
  showTaxBreakdown: true,
  showPaymentHistory: true,
  showInternalNotes: true,
};

function shouldShowColumn(
  column: Column,
  mode: 'client' | 'internal',
  config: VisibilityConfig
): boolean {
  const columnVisibilityMap: Record<ColumnKey, keyof VisibilityConfig> = {
    markup_amount: 'showInternalMarkup',
    vendor_commission: 'showVendorMarkup',
    profit_margin: 'showProfitMargins',
    actual_spent: 'showActualSpent',
    tax_amount: 'showTaxBreakdown',
    payment_history: 'showPaymentHistory',
    internal_notes: 'showInternalNotes',
  };
  
  const visibilityKey = columnVisibilityMap[column.key];
  return config[visibilityKey] ?? true;
}
```

---

## User Flow Specifications

### Budget Creation Flow

```
1. Planner opens Wedding → Budget Tab
   ↓
2. System checks for existing budget
   ├─ EXISTS: Load existing (skip to step 5)
   └─ NOT EXISTS: Show creation modal
   ↓
3. Planner enters:
   - Currency (default from planner profile)
   - Tax rate (default from planner profile)
   - Markup percentage (optional)
   - Event date (auto from wedding)
   ↓
4. System creates budget_header + blank line items
   ↓
5. Planner adds items:
   ├─ Quick Add: Category dropdown + amount
   └─ Full Add: All fields + vendor link
   ↓
6. System auto-calculates:
   - Header totals from line items
   - Tax/markup per item
   - Balance due = contracted - paid
   ↓
7. Planner marks as "Ready for Approval"
   ↓
8. System generates client link (if enabled)
```

### Payment Alert Flow

```
CRON Job (Daily 6:00 AM UTC):
   ↓
   SELECT * FROM budget_line_items
   WHERE payment_due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
   AND status NOT IN ('paid', 'cancelled')
   ↓
   FOR EACH overdue item:
     ├─ Send email to planner
     ├─ Create in-app notification
     ├─ Add to Google Calendar (if connected)
     └─ Log to ai_insights table
   ↓
   AI Analysis (weekly):
   ├─ Aggregate payment schedule
   ├─ Predict cash flow gaps
   ├─ Suggest installment restructuring
   └─ Generate risk alerts
```

### Client Approval Flow

```
1. Planner enables Client Mode
   ↓
2. System generates secure link:
   - UUID token
   - Optional access code
   - Expiration date (default: 30 days)
   ↓
3. Planner sends link to client
   ↓
4. Client accesses portal:
   ├─ Sees filtered view (no markup)
   └─ Can comment on items
   ↓
5. Client reviews and clicks "Approve"
   ↓
6. System captures:
   - Digital signature (typed)
   - Timestamp
   - IP address
   - User agent
   ↓
7. Budget status updates to "Approved"
   ↓
8. Planner notified + audit log entry
```

---

## Integration Touchpoints

### Stripe Integration

```typescript
interface StripeIntegration {
  // Create payment intent for installment
  async createPaymentIntent(
    installmentId: UUID,
    description: string
  ): Promise<StripePaymentIntent> {
    const installment = await getInstallment(installmentId);
    return stripe.paymentIntents.create({
      amount: installment.amount_cents,
      currency: budget.currency_code.toLowerCase(),
      metadata: {
        budget_line_item_id: installment.budget_line_item_id,
        installment_id: installment.id,
        wedding_id: budget.wedding_id,
      },
      description: `Budget payment: ${installment.description}`,
      receipt_email: planner.email,
    });
  }

  // Webhook handler for payment success
  async handlePaymentSuccess(event: StripeEvent): Promise<void> {
    const { budget_line_item_id } = event.data.object.metadata;
    await updateLineItem(budget_line_item_id, {
      paid_to_date_cents: increment,
      payment_status: 'paid',
      paid_date: now(),
    });
  }
}
```

### QuickBooks Integration

```typescript
interface QuickBooksIntegration {
  // Sync invoice to QuickBooks
  async createInvoice(
    budgetLineItem: BudgetLineItem,
    customerId: string
  ): Promise<QuickBooksInvoice> {
    const qbInvoice = await qb.createInvoice({
      CustomerRef: { value: customerId },
      Line: [{
        Amount: budgetLineItem.contracted_amount_cents / 100,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { value: getQBItemId(budgetLineItem.category_type) },
          Qty: 1,
        },
      }],
      DueDate: budgetLineItem.payment_due_date,
      PrivateNote: `Wedding Budget Item: ${budgetLineItem.item_name}`,
    });
    return qbInvoice;
  }

  // Export expense (vendor payment)
  async recordVendorPayment(
    vendor: Vendor,
    amountCents: number,
    accountId: string
  ): Promise<void> {
    await qb.createBill({
      VendorRef: { value: vendor.quickbooks_id },
      Line: [{
        Amount: amountCents / 100,
        DetailType: 'AccountBasedExpenseLineDetail',
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: accountId },
        },
      }],
    });
  }
}
```

---

## Performance Requirements

| Operation | Target Time | Implementation |
|-----------|-------------|----------------|
| Load budget (100 items) | < 500ms | Pagination + index hints |
| Inline edit (single cell) | < 100ms | Optimistic UI + debounce |
| Bulk import (CSV 500 rows) | < 5s | Server-side processing |
| AI forecast generation | < 10s | Async + loading state |
| Client portal load | < 2s | Cached view + minimal data |
| Export PDF (full budget) | < 3s | Background job + S3 |

---

## Security Matrix

| Action | Planner | Client | Guest |
|--------|---------|--------|-------|
| View own budget | Yes | Via Link | No |
| Edit budget | Yes | No | No |
| View vendor markup | Yes | No | No |
| Export data | Yes | If enabled | No |
| Approve budget | Yes | Via Link | No |
| Delete items | Yes | No | No |
| View audit log | Yes | No | No |
