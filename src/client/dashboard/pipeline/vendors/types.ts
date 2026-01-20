// Shared types and constants for Vendors Management Tab

import type { EventSupplierStatus } from '../../../api/suppliersApi';

export type { EventSupplier, EventSupplierStatus } from '../../../api/suppliersApi';

// 9 preset vendor categories
export const VENDOR_CATEGORIES = [
  { id: 'flowers', label: 'Flowers' },
  { id: 'decor', label: 'Decor' },
  { id: 'catering', label: 'Catering' },
  { id: 'music', label: 'Music' },
  { id: 'photo', label: 'Photography' },
  { id: 'video', label: 'Video' },
  { id: 'venue', label: 'Venue' },
  { id: 'cake', label: 'Cake' },
  { id: 'transport', label: 'Transport' },
] as const;

export type VendorCategory = typeof VENDOR_CATEGORIES[number]['id'];

// Status display mapping for badges
export const STATUS_DISPLAY: Record<EventSupplierStatus, { label: string; color: 'teal' | 'coral' | 'gray' }> = {
  potential: { label: 'Potential', color: 'gray' },
  contacted: { label: 'Contacted', color: 'gray' },
  quote_requested: { label: 'Quote Requested', color: 'gray' },
  quote_received: { label: 'Quote Received', color: 'gray' },
  negotiating: { label: 'Negotiating', color: 'gray' },
  confirmed: { label: 'Confirmed', color: 'teal' },
  paid_completed: { label: 'Paid', color: 'teal' },
  declined_lost: { label: 'Declined', color: 'coral' },
};

export interface VendorsSummaryMetrics {
  total: number;
  confirmed: number;
  pending: number;
  overdue: number;
  totalQuoted: number;
  totalConfirmed: number;
}
