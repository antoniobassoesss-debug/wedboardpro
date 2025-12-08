export interface Notification {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'task_reassigned' | 'task_updated' | 'task_completed' | 'team_invitation' | 'other';
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('wedboarpro_session');
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    return session?.access_token ?? null;
  } catch {
    return null;
  }
};

export async function listNotifications(options?: {
  unread?: boolean;
  limit?: number;
}): Promise<{ data: Notification[] | null; error: string | null }> {
  try {
    const token = getAccessToken();
    if (!token) {
      return { data: null, error: 'Not authenticated' };
    }

    const params = new URLSearchParams();
    if (options?.unread) params.append('unread', 'true');
    if (options?.limit) params.append('limit', String(options.limit));

    const res = await fetch(`/api/notifications?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.notifications || [], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to fetch notifications' };
  }
}

export async function markNotificationRead(id: string): Promise<{ data: Notification | null; error: string | null }> {
  try {
    const token = getAccessToken();
    if (!token) {
      return { data: null, error: 'Not authenticated' };
    }

    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.notification, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to mark notification as read' };
  }
}

export async function markAllNotificationsRead(): Promise<{ error: string | null }> {
  try {
    const token = getAccessToken();
    if (!token) {
      return { error: 'Not authenticated' };
    }

    const res = await fetch('/api/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error || `Request failed (${res.status})` };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to mark all notifications as read' };
  }
}

export async function getUnreadCount(): Promise<{ count: number; error: string | null }> {
  try {
    const token = getAccessToken();
    if (!token) {
      return { count: 0, error: 'Not authenticated' };
    }

    const res = await fetch('/api/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { count: 0, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { count: data.count || 0, error: null };
  } catch (err: any) {
    return { count: 0, error: err.message || 'Failed to get unread count' };
  }
}

