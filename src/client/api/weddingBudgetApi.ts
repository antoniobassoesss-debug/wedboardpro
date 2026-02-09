// Wedding Budget API
// Handles budget and payment tracking for wedding events

import { getValidAccessToken } from '../utils/sessionManager';

// ===== Types =====

export type Currency = 'USD' | 'EUR' | 'GBP';

export type CategoryName =
  | 'venue'
  | 'catering'
  | 'photography'
  | 'videography'
  | 'flowers'
  | 'music_dj'
  | 'dress_attire'
  | 'rings'
  | 'invitations'
  | 'favors'
  | 'transportation'
  | 'accommodation'
  | 'hair_makeup'
  | 'cake'
  | 'decor'
  | 'rentals'
  | 'officiant'
  | 'planner'
  | 'other';

export interface PaymentScheduleItem {
  id: string;
  amount: number; // cents
  due_date: string; // ISO date
  paid: boolean;
  paid_date: string | null;
  description: string;
}

export interface WeddingBudget {
  id: string;
  event_id: string;
  total_budget: number; // cents
  currency: Currency;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  event_id: string;
  category_name: CategoryName;
  custom_name: string | null;
  budgeted_amount: number; // cents
  contracted_amount: number | null; // cents
  paid_amount: number; // cents
  payment_schedule: PaymentScheduleItem[];
  vendor_id: string | null;
  is_contracted: boolean;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetOverview {
  budget: WeddingBudget;
  categories: BudgetCategory[];
  totals: {
    total_budgeted: number;
    total_contracted: number;
    total_paid: number;
    total_remaining: number;
  };
  alerts: {
    overdue_payments: Array<{ category_id: string; category_name: string; payment: PaymentScheduleItem }>;
    upcoming_payments: Array<{ category_id: string; category_name: string; payment: PaymentScheduleItem; days_until: number }>;
    over_budget_categories: Array<{ category_id: string; category_name: string; overage: number }>;
  };
}

export interface BudgetUpdate {
  total_budget?: number;
  currency?: Currency;
}

export interface CategoryCreate {
  category_name: CategoryName;
  custom_name?: string | null;
  budgeted_amount: number;
  contracted_amount?: number | null;
  paid_amount?: number;
  payment_schedule?: PaymentScheduleItem[];
  is_contracted?: boolean;
  notes?: string | null;
}

export interface CategoryUpdate {
  category_name?: CategoryName;
  custom_name?: string | null;
  budgeted_amount?: number;
  contracted_amount?: number | null;
  paid_amount?: number;
  payment_schedule?: PaymentScheduleItem[];
  is_contracted?: boolean;
  notes?: string | null;
}

export type Result<T> = { data: T | null; error: string | null };

// ===== Category Labels & Icons =====

export const CATEGORY_LABELS: Record<CategoryName, string> = {
  venue: 'Venue',
  catering: 'Catering',
  photography: 'Photography',
  videography: 'Videography',
  flowers: 'Flowers',
  music_dj: 'Music / DJ',
  dress_attire: 'Dress & Attire',
  rings: 'Rings',
  invitations: 'Invitations',
  favors: 'Favors',
  transportation: 'Transportation',
  accommodation: 'Accommodation',
  hair_makeup: 'Hair & Makeup',
  cake: 'Cake',
  decor: 'Decor',
  rentals: 'Rentals',
  officiant: 'Officiant',
  planner: 'Planner',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<CategoryName, string> = {
  venue: '🏛️',
  catering: '🍽️',
  photography: '📸',
  videography: '🎥',
  flowers: '💐',
  music_dj: '🎵',
  dress_attire: '👗',
  rings: '💍',
  invitations: '📨',
  favors: '🎁',
  transportation: '🚗',
  accommodation: '🏨',
  hair_makeup: '💄',
  cake: '🎂',
  decor: '✨',
  rentals: '🪑',
  officiant: '📖',
  planner: '📋',
  other: '📦',
};

export const CATEGORY_COLORS: Record<CategoryName, string> = {
  venue: '#3b82f6',
  catering: '#f97316',
  photography: '#8b5cf6',
  videography: '#ec4899',
  flowers: '#10b981',
  music_dj: '#6366f1',
  dress_attire: '#f43f5e',
  rings: '#eab308',
  invitations: '#14b8a6',
  favors: '#a855f7',
  transportation: '#64748b',
  accommodation: '#0ea5e9',
  hair_makeup: '#d946ef',
  cake: '#f59e0b',
  decor: '#84cc16',
  rentals: '#78716c',
  officiant: '#7c3aed',
  planner: '#0891b2',
  other: '#94a3b8',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

// ===== API Functions =====

/**
 * Fetch budget overview for an event
 */
export async function fetchBudgetOverview(eventId: string): Promise<Result<BudgetOverview>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/budget`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data as BudgetOverview, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load budget' };
  }
}

/**
 * Update wedding budget (total budget, currency)
 */
export async function updateBudget(eventId: string, patch: BudgetUpdate): Promise<Result<WeddingBudget>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/budget`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.budget as WeddingBudget, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update budget' };
  }
}

/**
 * Create a new budget category
 */
export async function createCategory(eventId: string, category: CategoryCreate): Promise<Result<BudgetCategory>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/budget/categories`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.category as BudgetCategory, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create category' };
  }
}

/**
 * Update a budget category
 */
export async function updateCategory(
  eventId: string,
  categoryId: string,
  patch: CategoryUpdate
): Promise<Result<BudgetCategory>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/budget/categories/${categoryId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.category as BudgetCategory, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update category' };
  }
}

/**
 * Delete a budget category (soft delete)
 */
export async function deleteCategory(eventId: string, categoryId: string): Promise<Result<null>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/budget/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete category' };
  }
}

/**
 * Mark a payment as paid
 */
export async function markPaymentPaid(
  eventId: string,
  categoryId: string,
  paymentId: string,
  paid: boolean
): Promise<Result<BudgetCategory>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/budget/categories/${categoryId}/payments/${paymentId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paid, paid_date: paid ? new Date().toISOString().split('T')[0] : null }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.category as BudgetCategory, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update payment' };
  }
}

// ===== Utility Functions =====

/**
 * Format cents to currency string
 */
export function formatCurrency(cents: number, currency: Currency = 'EUR'): string {
  const amount = cents / 100;
  const symbol = CURRENCY_SYMBOLS[currency];

  if (currency === 'EUR') {
    // European format: €12.000,00 (but we'll simplify to €12,000)
    return `${symbol}${amount.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  // US/UK format: $12,000
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Parse currency string to cents
 */
export function parseCurrencyToCents(value: string): number {
  const cleaned = value.replace(/[^0-9.,]/g, '');

  // Handle European format: "3.000,00" or "3.000" (period = thousands, comma = decimal)
  // Handle US format: "3,000.00" or "3,000" (comma = thousands, period = decimal)
  let normalized = cleaned;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Both present - figure out which is decimal separator
    if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
      // European: period is thousands, comma is decimal
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US: comma is thousands, period is decimal
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Only comma - could be decimal (European) or thousands (US with single comma)
    // Assume it's decimal if only one comma and comes after some digits
    normalized = cleaned.replace(',', '.');
  } else {
    // Only numbers and periods - remove any thousand separators
    normalized = cleaned.replace(/\.(?=.*\.)/g, '');
  }

  const amount = parseFloat(normalized) || 0;
  return Math.round(amount * 100);
}

/**
 * Calculate days until a date
 */
export function daysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get category status
 */
export function getCategoryStatus(category: BudgetCategory): {
  status: 'not_started' | 'pending_contract' | 'contracted' | 'partially_paid' | 'paid_in_full' | 'overdue';
  label: string;
  color: string;
} {
  // Check for overdue payments
  const hasOverdue = category.payment_schedule.some((p) => !p.paid && daysUntil(p.due_date) < 0);
  if (hasOverdue) {
    return { status: 'overdue', label: 'Overdue', color: '#dc2626' };
  }

  // Check if fully paid
  if (category.contracted_amount && category.paid_amount >= category.contracted_amount) {
    return { status: 'paid_in_full', label: 'Paid in Full', color: '#16a34a' };
  }

  // Check if partially paid
  if (category.paid_amount > 0) {
    return { status: 'partially_paid', label: 'Partially Paid', color: '#f97316' };
  }

  // Check if contracted
  if (category.is_contracted && category.contracted_amount) {
    return { status: 'contracted', label: 'Contracted', color: '#3b82f6' };
  }

  // Check if pending contract
  if (!category.is_contracted && category.budgeted_amount > 0) {
    return { status: 'pending_contract', label: 'Pending Contract', color: '#eab308' };
  }

  // Not started
  return { status: 'not_started', label: 'Not Started', color: '#94a3b8' };
}

/**
 * Generate unique ID for payment schedule items
 */
export function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate totals from categories
 */
export function calculateTotals(categories: BudgetCategory[]): {
  total_budgeted: number;
  total_contracted: number;
  total_paid: number;
  total_remaining: number;
} {
  const activeCategories = categories.filter((c) => !c.deleted_at);

  const total_budgeted = activeCategories.reduce((sum, c) => sum + c.budgeted_amount, 0);
  const total_contracted = activeCategories.reduce((sum, c) => sum + (c.contracted_amount || 0), 0);
  const total_paid = activeCategories.reduce((sum, c) => sum + c.paid_amount, 0);
  const total_remaining = total_contracted - total_paid;

  return { total_budgeted, total_contracted, total_paid, total_remaining };
}

/**
 * Get alerts from budget data
 */
export function calculateAlerts(categories: BudgetCategory[]): {
  overdue_payments: Array<{ category_id: string; category_name: string; payment: PaymentScheduleItem }>;
  upcoming_payments: Array<{ category_id: string; category_name: string; payment: PaymentScheduleItem; days_until: number }>;
  over_budget_categories: Array<{ category_id: string; category_name: string; overage: number }>;
} {
  const overdue_payments: Array<{ category_id: string; category_name: string; payment: PaymentScheduleItem }> = [];
  const upcoming_payments: Array<{ category_id: string; category_name: string; payment: PaymentScheduleItem; days_until: number }> = [];
  const over_budget_categories: Array<{ category_id: string; category_name: string; overage: number }> = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  categories
    .filter((c) => !c.deleted_at)
    .forEach((category) => {
      // Check for overdue and upcoming payments
      category.payment_schedule.forEach((payment) => {
        if (payment.paid) return;

        const days = daysUntil(payment.due_date);

        if (days < 0) {
          overdue_payments.push({
            category_id: category.id,
            category_name: category.category_name,
            payment,
          });
        } else if (days <= 7) {
          upcoming_payments.push({
            category_id: category.id,
            category_name: category.category_name,
            payment,
            days_until: days,
          });
        }
      });

      // Check for over budget
      if (category.contracted_amount && category.contracted_amount > category.budgeted_amount) {
        over_budget_categories.push({
          category_id: category.id,
          category_name: category.category_name,
          overage: category.contracted_amount - category.budgeted_amount,
        });
      }
    });

  // Sort by urgency
  overdue_payments.sort((a, b) => daysUntil(a.payment.due_date) - daysUntil(b.payment.due_date));
  upcoming_payments.sort((a, b) => a.days_until - b.days_until);

  return { overdue_payments, upcoming_payments, over_budget_categories };
}
