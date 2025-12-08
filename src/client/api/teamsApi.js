// Teams module API client for WedBoardPro
// Provides typed access to team members, assignments, tasks and workload views.
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
export async function listTeamMembers() {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch('/api/team', {
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
        return { data: (body.members || []), error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to load team members' };
    }
}
export async function fetchTeamMember(memberId) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/team/${memberId}`, {
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
        return { data: body.member, error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to load team member' };
    }
}
export async function listMemberTasks(memberId) {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch(`/api/team/${memberId}/tasks`, {
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
        return { data: (body.tasks || []), error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to load member tasks' };
    }
}
export async function fetchTeamWorkload() {
    try {
        const token = getAccessToken();
        if (!token)
            return { data: null, error: 'Not authenticated' };
        const res = await fetch('/api/team/calendar', {
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
        return { data: (body.workload || []), error: null };
    }
    catch (err) {
        return { data: null, error: err?.message || 'Failed to load team workload' };
    }
}
//# sourceMappingURL=teamsApi.js.map