// Suppliers / Vendors API client and types for WedBoardPro
const getAccessToken = () => {
    if (typeof window === 'undefined')
        return null;
    const raw = window.localStorage.getItem('wedboarpro_session');
    if (!raw)
        return null;
    try {
        const session = JSON.parse(raw);
        return session?.access_token ?? null;
    }
    catch {
        return null;
    }
};
export async function listSuppliers(filters = {}) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const params = new URLSearchParams();
        if (filters.search)
            params.set('search', filters.search);
        if (filters.category && filters.category !== 'all')
            params.set('category', filters.category);
        if (filters.favoritesOnly)
            params.set('favorite', 'true');
        const res = await fetch(`/api/suppliers?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { data: null, error: body.error || `Request failed (${res.status})` };
        }
        const body = await res.json();
        return { data: (body.suppliers || []), error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to load suppliers' };
    }
}
export async function createSupplier(input) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
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
        return { data: body.supplier, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to create supplier' };
    }
}
export async function updateSupplier(id, patch) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
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
        return { data: body.supplier, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to update supplier' };
    }
}
export async function deleteSupplier(id) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
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
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to delete supplier' };
    }
}
// ===== Event suppliers =====
export async function listEventSuppliers(eventId) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
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
        return { data: (body.eventSuppliers || []), error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to load event suppliers' };
    }
}
export async function addEventSupplier(eventId, input) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
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
        return { data: body.eventSupplier, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to add event supplier' };
    }
}
export async function updateEventSupplier(id, patch) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
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
        return { data: body.eventSupplier, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to update event supplier' };
    }
}
//# sourceMappingURL=suppliersApi.js.map