// Project Pipeline / Event Management API types & client wrappers
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
export async function listEvents() {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch('/api/events', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { data: null, error: body.error || `Request failed (${res.status})` };
        }
        const data = await res.json();
        return { data: data.events, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to list events' };
    }
}
export async function createEvent(input) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch('/api/events', {
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
        const data = await res.json();
        return { data: { event: data.event, stages: data.stages }, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to create event' };
    }
}
// ===== Event workspace =====
export async function fetchEventWorkspace(eventId) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { data: null, error: body.error || `Request failed (${res.status})` };
        }
        const data = await res.json();
        return { data: data.workspace, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to load event workspace' };
    }
}
export async function updateEvent(eventId, patch) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/events/${eventId}`, {
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
        return { data: data.event, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to update event' };
    }
}
// ===== Stages =====
export async function fetchStages(eventId) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/events/${eventId}/stages`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { data: null, error: body.error || `Request failed (${res.status})` };
        }
        const data = await res.json();
        return { data: data.stages, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to fetch stages' };
    }
}
export async function updateStage(stageId, patch) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/stages/${stageId}`, {
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
        return { data: data.stage, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to update stage' };
    }
}
export async function createStageTask(stageId, input) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/stages/${stageId}/tasks`, {
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
        const data = await res.json();
        return { data: data.task, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to create task' };
    }
}
export async function updateStageTask(taskId, input) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
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
        const data = await res.json();
        return { data: data.task, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to update task' };
    }
}
// ===== Vendors =====
export async function fetchVendors(eventId) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/events/${eventId}/vendors`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return { data: null, error: body.error || `Request failed (${res.status})` };
        }
        const data = await res.json();
        return { data: data.vendors, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to fetch vendors' };
    }
}
export async function updateVendor(vendorId, patch) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/vendors/${vendorId}`, {
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
        return { data: data.vendor, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to update vendor' };
    }
}
export async function createEventFile(eventId, input) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/events/${eventId}/files`, {
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
        const data = await res.json();
        return { data: data.file, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to create file record' };
    }
}
//# sourceMappingURL=eventsPipelineApi.js.map