// Suppliers / Vendors API client and types for WedBoardPro

import { getValidAccessToken } from '../utils/sessionManager';

export type SupplierCategory =
  | 'flowers'
  | 'decor'
  | 'catering'
  | 'music'
  | 'photo'
  | 'video'
  | 'venue'
  | 'cake'
  | 'transport'
  | 'others';

export type SupplierFileCategory = 'contract' | 'price_list' | 'portfolio' | 'other';

export type EventSupplierStatus =
  | 'researched'
  | 'quote_requested'
  | 'quote_received'
  | 'shortlisted'
  | 'selected'
  | 'rejected';

export interface Supplier {
  id: string;
  planner_id: string;
  name: string;
  category: SupplierCategory;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  notes: string | null;
  rating_internal: number | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  linked_events_count?: number;
}

export interface SupplierFile {
  id: string;
  supplier_id: string;
  file_name: string;
  file_url: string;
  category: SupplierFileCategory;
  uploaded_at: string;
}

export interface EventSupplier {
  id: string;
  event_id: string;
  supplier_id: string;
  category: string;
  status: EventSupplierStatus;
  quoted_price: string | null; // numeric as string
  currency: string;
  notes: string | null;
  created_at: string;
  supplier?: Supplier;
}

export interface EventSupplierQuote {
  id: string;
  event_supplier_id: string;
  version_label: string;
  amount: string;
  currency: string;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
}

export type Result<T> = { data: T | null; error: string | null };

export interface ListSuppliersFilters {
  search?: string;
  category?: SupplierCategory | 'all';
  favoritesOnly?: boolean;
}

export async function listSuppliers(filters: ListSuppliersFilters = {}): Promise<Result<Supplier[]>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.favoritesOnly) params.set('favorite', 'true');

    const res = await fetch(`/api/suppliers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: (body.suppliers || []) as Supplier[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load suppliers' };
  }
}

export interface CreateSupplierInput {
  name: string;
  category: SupplierCategory;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  location?: string | null;
  notes?: string | null;
}

export async function createSupplier(input: CreateSupplierInput): Promise<Result<Supplier>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.supplier as Supplier, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create supplier' };
  }
}

export type UpdateSupplierInput = Partial<
  Pick<
    Supplier,
    'name' | 'category' | 'company_name' | 'email' | 'phone' | 'website' | 'location' | 'notes' | 'rating_internal' | 'is_favorite'
  >
>;

export async function updateSupplier(id: string, patch: UpdateSupplierInput): Promise<Result<Supplier>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/suppliers/${id}`, {
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

    const body = await res.json();
    return { data: body.supplier as Supplier, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update supplier' };
  }
}

export async function deleteSupplier(id: string): Promise<Result<null>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/suppliers/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete supplier' };
  }
}

// ===== Event suppliers =====

export async function listEventSuppliers(eventId: string): Promise<Result<EventSupplier[]>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/suppliers`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: (body.eventSuppliers || []) as EventSupplier[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load event suppliers' };
  }
}

export interface AddEventSupplierInput {
  supplier_id: string;
  category: string;
  status?: EventSupplierStatus;
  quoted_price?: string | null;
  currency?: string;
  notes?: string | null;
}

export async function addEventSupplier(
  eventId: string,
  input: AddEventSupplierInput,
): Promise<Result<EventSupplier>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/events/${eventId}/suppliers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.eventSupplier as EventSupplier, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to add event supplier' };
  }
}

export type UpdateEventSupplierInput = Partial<
  Pick<EventSupplier, 'status' | 'quoted_price' | 'currency' | 'notes'>
>;

export async function updateEventSupplier(
  id: string,
  patch: UpdateEventSupplierInput,
): Promise<Result<EventSupplier>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/event-suppliers/${id}`, {
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

    const body = await res.json();
    return { data: body.eventSupplier as EventSupplier, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update event supplier' };
  }
}


