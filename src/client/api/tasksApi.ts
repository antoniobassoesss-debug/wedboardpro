export interface TaskAssignee {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface Task {
  id: string;
  team_id: string;
  created_by: string;
  creator?: TaskAssignee | null;
  assignee_id: string | null;
  assignee: TaskAssignee | null;
  event_id: string | null;
  event?: { id: string; title: string } | null;
  title: string;
  description: string;
  is_completed: boolean;
  priority: 'low' | 'medium' | 'high';
  is_flagged: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  is_flagged?: boolean;
  due_date?: string | null;
  assignee_id?: string | null;
  event_id?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  is_completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  is_flagged?: boolean;
  due_date?: string | null;
  assignee_id?: string | null;
  event_id?: string | null;
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

export async function listTasks(options?: {
  assignee_id?: string;
  unassigned?: boolean;
  completed?: boolean;
}): Promise<{ data: Task[] | null; error: string | null }> {
  try {
    const token = getAccessToken();
    if (!token) {
      return { data: null, error: 'Not authenticated' };
    }

    const params = new URLSearchParams();
    if (options?.assignee_id) params.append('assignee_id', options.assignee_id);
    if (options?.unassigned) params.append('unassigned', 'true');
    if (options?.completed !== undefined) params.append('completed', String(options.completed));

    const res = await fetch(`/api/tasks?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const data = await res.json();
    return { data: data.tasks || [], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to fetch tasks' };
  }
}

export async function createTask(input: CreateTaskInput): Promise<{ data: Task | null; error: string | null }> {
  try {
    const token = getAccessToken();
    if (!token) {
      return { data: null, error: 'Not authenticated' };
    }

    const res = await fetch('/api/tasks', {
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
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to create task' };
  }
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<{ data: Task | null; error: string | null }> {
  try {
    const token = getAccessToken();
    if (!token) {
      return { data: null, error: 'Not authenticated' };
    }

    const res = await fetch(`/api/tasks/${id}`, {
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
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to update task' };
  }
}

export async function deleteTask(id: string): Promise<{ error: string | null }> {
  try {
    const token = getAccessToken();
    if (!token) {
      return { error: 'Not authenticated' };
    }

    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error || `Request failed (${res.status})` };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete task' };
  }
}

