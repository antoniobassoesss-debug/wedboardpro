// CRM module API client for WedBoarPro
// Provides typed access to pipelines, stages, deals, contacts, and activities.

import { getValidAccessToken } from '../utils/sessionManager';

export type DealPriority = 'low' | 'medium' | 'high';
export type ActivityType = 'call' | 'email' | 'meeting' | 'note';

export interface CrmPipeline {
  id: string;
  account_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmStage {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmContact {
  id: string;
  account_id: string;
  primary_first_name: string | null;
  primary_last_name: string | null;
  partner_first_name: string | null;
  partner_last_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmDeal {
  id: string;
  account_id: string;
  pipeline_id: string;
  stage_id: string;
  primary_contact_id: string | null;
  title: string;
  wedding_date: string | null;
  value_cents: number | null;
  currency: string;
  priority: DealPriority;
  next_action: string | null;
  next_action_due_at: string | null;
  owner_id: string | null;
  is_lost: boolean;
  lost_reason: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

// Linked task from crm_deal_tasks
export interface CrmDealTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  event_id: string | null;
}

// Linked file from crm_deal_files
export interface CrmDealFile {
  id: string;
  file_name: string;
  extension: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
}

// Full deal details for drawer
export interface CrmDealDetails extends CrmDeal {
  contact: CrmContact | null;
  stage: CrmStage | null;
  activities: CrmActivity[];
  tasks: CrmDealTask[];
  files: CrmDealFile[];
  coupleNames: string;
}

export interface CrmActivity {
  id: string;
  deal_id: string;
  type: ActivityType;
  summary: string;
  happened_at: string;
  created_by: string;
  created_at: string;
}

// Extended deal with contact info for UI display
export interface CrmDealCard extends CrmDeal {
  contact?: CrmContact | null;
  stage?: CrmStage | null;
  coupleNames: string;
  isOverdue?: boolean;
}

// Stage with aggregated stats
export interface CrmStageWithStats extends CrmStage {
  dealCount: number;
  totalValue: number;
}

export type Result<T> = { data: T | null; error: string | null };

const getCurrentUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('wedboarpro_session');
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
};

// =====================
// Pipeline Functions
// =====================

export async function listPipelines(): Promise<Result<CrmPipeline[]>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch('/api/crm/pipelines', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.pipelines as CrmPipeline[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load pipelines' };
  }
}

export async function getOrCreateDefaultPipeline(): Promise<Result<CrmPipeline>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch('/api/crm/pipelines/default', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.pipeline as CrmPipeline, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to get/create pipeline' };
  }
}

// =====================
// Stage Functions
// =====================

export async function listStages(pipelineId: string): Promise<Result<CrmStage[]>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/crm/pipelines/${pipelineId}/stages`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.stages as CrmStage[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load stages' };
  }
}

// =====================
// Deal Functions
// =====================

export interface ListDealsFilters {
  searchQuery?: string;
  stageIds?: string[];
  ownerId?: string;
  minValue?: number;
  maxValue?: number;
  weddingDateFrom?: string;
  weddingDateTo?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
  dateFilterType?: 'wedding' | 'created';
}

// CRM Metrics for KPIs
export interface CrmMetrics {
  totalDeals: number;
  totalValueCents: number;
  wonDeals: number;
  lostDeals: number;
  byStage: Array<{
    stageId: string;
    stageName: string;
    stageColor: string | null;
    count: number;
    valueCents: number;
  }>;
}

// Preset view type
export type CrmViewPreset = 'all' | 'this_month' | 'high_value' | 'my_deals';

export interface CrmViewConfig {
  id: CrmViewPreset;
  label: string;
  filters: Partial<ListDealsFilters>;
}

export async function listDeals(
  pipelineId: string,
  filters?: ListDealsFilters
): Promise<Result<CrmDealCard[]>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const params = new URLSearchParams();
    if (filters?.searchQuery?.trim()) params.set('q', filters.searchQuery.trim());
    if (filters?.stageIds?.length) params.set('stageIds', filters.stageIds.join(','));
    if (filters?.ownerId) params.set('ownerId', filters.ownerId);
    if (filters?.minValue != null) params.set('minValue', String(filters.minValue));
    if (filters?.maxValue != null) params.set('maxValue', String(filters.maxValue));
    if (filters?.weddingDateFrom) params.set('weddingDateFrom', filters.weddingDateFrom);
    if (filters?.weddingDateTo) params.set('weddingDateTo', filters.weddingDateTo);
    if (filters?.createdDateFrom) params.set('createdDateFrom', filters.createdDateFrom);
    if (filters?.createdDateTo) params.set('createdDateTo', filters.createdDateTo);

    const url = `/api/crm/pipelines/${pipelineId}/deals${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.deals as CrmDealCard[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load deals' };
  }
}

export async function getCrmMetrics(
  pipelineId: string,
  filters?: ListDealsFilters
): Promise<Result<CrmMetrics>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const params = new URLSearchParams();
    if (filters?.searchQuery?.trim()) params.set('q', filters.searchQuery.trim());
    if (filters?.stageIds?.length) params.set('stageIds', filters.stageIds.join(','));
    if (filters?.ownerId) params.set('ownerId', filters.ownerId);
    if (filters?.minValue != null) params.set('minValue', String(filters.minValue));
    if (filters?.maxValue != null) params.set('maxValue', String(filters.maxValue));
    if (filters?.weddingDateFrom) params.set('weddingDateFrom', filters.weddingDateFrom);
    if (filters?.weddingDateTo) params.set('weddingDateTo', filters.weddingDateTo);
    if (filters?.createdDateFrom) params.set('createdDateFrom', filters.createdDateFrom);
    if (filters?.createdDateTo) params.set('createdDateTo', filters.createdDateTo);

    const url = `/api/crm/pipelines/${pipelineId}/metrics${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.metrics as CrmMetrics, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load metrics' };
  }
}

// View presets
export const CRM_VIEW_PRESETS: CrmViewConfig[] = [
  { id: 'all', label: 'All deals', filters: {} },
  {
    id: 'this_month',
    label: "This month's deals",
    filters: {
      weddingDateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      weddingDateTo: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    },
  },
  { id: 'high_value', label: 'High-value deals', filters: { minValue: 10000 } },
  { id: 'my_deals', label: 'My deals only', filters: {} }, // ownerId filled at runtime
];

export interface CreateDealInput {
  pipelineId: string;
  stageId: string;
  title: string;
  weddingDate?: string | null;
  valueCents?: number | null;
  currency?: string;
  priority?: DealPriority;
  nextAction?: string | null;
  ownerId?: string | null;
  // Contact info (will create a new contact if provided)
  primaryFirstName?: string;
  primaryLastName?: string;
  partnerFirstName?: string;
  partnerLastName?: string;
  email?: string;
  phone?: string;
}

export async function createDeal(input: CreateDealInput): Promise<Result<CrmDealCard>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch('/api/crm/deals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.deal as CrmDealCard, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create deal' };
  }
}

export async function updateDealStage(dealId: string, stageId: string): Promise<Result<CrmDeal>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/crm/deals/${dealId}/stage`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.deal as CrmDeal, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update deal stage' };
  }
}

export interface UpdateDealInput {
  title?: string;
  weddingDate?: string | null;
  valueCents?: number | null;
  currency?: string;
  priority?: DealPriority;
  nextAction?: string | null;
  ownerId?: string | null;
  isLost?: boolean;
  lostReason?: string | null;
}

export async function updateDeal(dealId: string, input: UpdateDealInput): Promise<Result<CrmDeal>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.deal as CrmDeal, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update deal' };
  }
}

export async function deleteDeal(dealId: string): Promise<Result<boolean>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to delete deal' };
  }
}

// =====================
// Activity Functions
// =====================

export async function listActivities(dealId: string): Promise<Result<CrmActivity[]>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/crm/deals/${dealId}/activities`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.activities as CrmActivity[], error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load activities' };
  }
}

export interface CreateActivityInput {
  dealId: string;
  type: ActivityType;
  summary: string;
  happenedAt?: string;
}

export async function createActivity(input: CreateActivityInput): Promise<Result<CrmActivity>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/crm/deals/${input.dealId}/activities`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: input.type,
        summary: input.summary,
        happenedAt: input.happenedAt,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.activity as CrmActivity, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to create activity' };
  }
}

// =====================
// Deal Details
// =====================

export async function getDealDetails(dealId: string): Promise<Result<CrmDealDetails>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/crm/deals/${dealId}/details`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.deal as CrmDealDetails, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to load deal details' };
  }
}

export async function updateNextAction(
  dealId: string,
  nextAction: string | null,
  nextActionDueAt: string | null
): Promise<Result<CrmDeal>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/crm/deals/${dealId}/next-action`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextAction, nextActionDueAt }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.deal as CrmDeal, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to update next action' };
  }
}

export async function markDealAsLost(dealId: string, reason?: string): Promise<Result<CrmDeal>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/crm/deals/${dealId}/lost`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.deal as CrmDeal, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to mark deal as lost' };
  }
}

export async function markDealAsWon(dealId: string): Promise<Result<CrmDeal>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const res = await fetch(`/api/crm/deals/${dealId}/won`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.deal as CrmDeal, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to mark deal as won' };
  }
}

// =====================
// Helper Functions
// =====================

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  return d < new Date();
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatCoupleNames(contact: CrmContact | null | undefined): string {
  if (!contact) return 'Unknown';

  const primary = [contact.primary_first_name, contact.primary_last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const partner = [contact.partner_first_name, contact.partner_last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (primary && partner) return `${primary} & ${partner}`;
  if (primary) return primary;
  if (partner) return partner;
  if (contact.email) return contact.email;
  return 'Unknown';
}

export function formatDealValue(valueCents: number | null | undefined, currency = 'EUR'): string {
  if (valueCents == null) return '—';
  const value = valueCents / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatWeddingDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== Deal Import Types =====

export interface DealCreate {
  pipelineId: string;
  stageId: string;
  title: string;
  primaryFirstName?: string;
  primaryLastName?: string;
  partnerFirstName?: string;
  partnerLastName?: string;
  email?: string;
  phone?: string;
  weddingDate?: string;
  valueCents?: number;
  priority?: DealPriority;
  nextAction?: string;
}

export interface ImportResult {
  imported: number;
  errors: Array<{ row: number; error: string }>;
}

// ===== Deal Import Functions =====

export function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

export function mapRowToDeal(
  row: string[],
  headers: string[],
  columnMapping: Record<string, number>,
  pipelineId: string,
  stageId: string
): DealCreate | null {
  const getValue = (field: string): string | undefined => {
    const idx = columnMapping[field];
    if (idx === undefined || idx < 0 || idx >= row.length) return undefined;
    return row[idx] || undefined;
  };

  const title = getValue('title');
  if (!title || title.length < 2) return null;

  const priorityValue = getValue('priority')?.toLowerCase();
  const priority: DealPriority = ['low', 'high'].includes(priorityValue || '') ? (priorityValue as DealPriority) : 'medium';

  let valueCents: number | undefined;
  const valueStr = getValue('value_cents');
  if (valueStr) {
    const cleaned = valueStr.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      valueCents = Math.round(parsed * 100);
    }
  }

  return {
    pipelineId,
    stageId,
    title: title,
    primaryFirstName: getValue('primary_first_name') || undefined,
    primaryLastName: getValue('primary_last_name') || undefined,
    partnerFirstName: getValue('partner_first_name') || undefined,
    partnerLastName: getValue('partner_last_name') || undefined,
    email: getValue('email') || undefined,
    phone: getValue('phone') || undefined,
    weddingDate: getValue('wedding_date') || undefined,
    valueCents,
    priority,
    nextAction: getValue('next_action') || undefined,
  };
}

export function generateDealsCSVTemplate(): string {
  const headers = [
    'title',
    'primary_first_name',
    'primary_last_name',
    'partner_first_name',
    'partner_last_name',
    'email',
    'phone',
    'wedding_date',
    'value_cents',
    'priority',
    'next_action',
  ];

  const exampleRow = [
    'Smith Wedding',
    'John',
    'Smith',
    'Jane',
    'Doe',
    'john.smith@email.com',
    '+39 333 1234567',
    '2025-06-15',
    '15000',
    'medium',
    'Schedule discovery call',
  ];

  return headers.join(',') + '\n' + exampleRow.join(',');
}

export async function importDeals(
  deals: DealCreate[],
  onProgress?: (progress: number) => void
): Promise<Result<ImportResult>> {
  try {
    const token = await getValidAccessToken();
    if (!token) return { data: null, error: 'Not authenticated' };

    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < deals.length; i += chunkSize) {
      chunks.push(deals.slice(i, i + chunkSize));
    }

    let totalImported = 0;
    const allErrors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const startRow = i * chunkSize;

      const res = await fetch('/api/crm/deals/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deals: chunk, start_row: startRow }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        chunk.forEach((_, idx) => {
          allErrors.push({ row: startRow + idx + 1, error: body.error || 'Import failed' });
        });
      } else {
        const data = await res.json();
        totalImported += data.imported || 0;
        if (data.errors) {
          allErrors.push(...data.errors);
        }
      }

      onProgress?.(Math.round(((i + 1) / chunks.length) * 100));
    }

    return { data: { imported: totalImported, errors: allErrors }, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to import deals' };
  }
}

