// Team Contacts Directory API client and types for WedBoardPro

import { getValidAccessToken } from '../utils/sessionManager';

export interface TeamContact {
  id: string;
  team_id: string | null;
  created_by: string;
  visibility: 'team' | 'private';
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type Result<T> = { data: T | null; error: string | null };

export interface ListContactsFilters {
  search?: string;
}

export async function listContacts(filters: ListContactsFilters = {}): Promise<Result<TeamContact[]>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);

    const res = await fetch(`/api/contacts?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: (body.contacts || []) as TeamContact[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load contacts' };
  }
}

export interface CreateContactInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  notes?: string | null;
  private?: boolean;
  visibility?: 'team' | 'private';
}

export async function createContact(input: CreateContactInput): Promise<Result<TeamContact>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch('/api/contacts', {
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
    return { data: body.contact as TeamContact, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create contact' };
  }
}

export type UpdateContactInput = Partial<
  Pick<TeamContact, 'name' | 'email' | 'phone' | 'company' | 'notes'>
>;

export async function updateContact(id: string, patch: UpdateContactInput): Promise<Result<TeamContact>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/contacts/${id}`, {
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
    return { data: body.contact as TeamContact, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update contact' };
  }
}

export async function deleteContact(id: string): Promise<Result<void>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/contacts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    return { data: undefined, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete contact' };
  }
}



