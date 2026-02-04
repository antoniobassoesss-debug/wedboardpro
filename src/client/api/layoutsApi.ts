/**
 * Layouts API Client
 * 
 * Provides functions to save and load layouts from Supabase.
 * Layouts are stored in the `layouts` table with full canvas data as JSONB.
 */

import { browserSupabaseClient } from '../browserSupabaseClient';

// Types matching the Layout Maker project structure

// Single tab canvas data (one area/project within a layout file)
export interface TabCanvasData {
  drawings: any[];
  shapes: any[];
  textElements: any[];
  walls?: any[];
  doors?: any[];
  powerPoints?: any[];
  viewBox: { x: number; y: number; width: number; height: number };
}

// A single tab within a layout file
export interface LayoutTab {
  id: string;
  name: string;
  canvas: TabCanvasData;
  a4Dimensions?: {
    a4X: number;
    a4Y: number;
    a4WidthPx: number;
    a4HeightPx: number;
  };
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// The full layout file data (contains multiple tabs)
export interface LayoutFileData {
  tabs: LayoutTab[];
  activeTabId: string;
  workflowPositions?: Record<string, { x: number; y: number }>;
}

// Legacy single canvas data (for backwards compatibility)
export interface CanvasData {
  drawings: any[];
  shapes: any[];
  textElements: any[];
  walls?: any[];
  doors?: any[];
  viewBox: { x: number; y: number; width: number; height: number };
}

export interface LayoutRecord {
  id: string;
  account_id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  canvas_data: LayoutFileData | CanvasData; // Support both new and legacy format
  event_id?: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

// Helper to check if canvas_data is new format
export function isLayoutFileData(data: LayoutFileData | CanvasData): data is LayoutFileData {
  return 'tabs' in data && Array.isArray((data as LayoutFileData).tabs);
}

// Input for saving a layout
export interface SaveLayoutInput {
  layoutId?: string;        // If provided, update existing; otherwise create new
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  canvasData: LayoutFileData | CanvasData;
  eventId?: string | null;
  status?: 'active' | 'archived';
}

// Response wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Get the current authenticated user ID from localStorage session
 */
const getAccountId = (): string | null => {
  try {
    const sessionStr = localStorage.getItem('wedboarpro_session');
    if (!sessionStr) return null;
    const session = JSON.parse(sessionStr);
    return session?.user?.id || null;
  } catch {
    return null;
  }
};

/**
 * Get the Supabase client, throwing if not available
 */
const getSupabaseClient = () => {
  if (!browserSupabaseClient) {
    throw new Error('Supabase client not initialized');
  }
  return browserSupabaseClient;
};

/**
 * Fetch all layouts for the current user
 */
export async function listLayouts(): Promise<ApiResponse<LayoutRecord[]>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await getSupabaseClient()
      .from('layouts')
      .select('*')
      .eq('account_id', accountId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[layoutsApi] listLayouts error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as LayoutRecord[], error: null };
  } catch (err: any) {
    console.error('[layoutsApi] listLayouts exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Fetch a single layout by ID
 */
export async function getLayout(layoutId: string): Promise<ApiResponse<LayoutRecord>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await getSupabaseClient()
      .from('layouts')
      .select('*')
      .eq('id', layoutId)
      .eq('account_id', accountId)
      .single();

    if (error) {
      console.error('[layoutsApi] getLayout error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as LayoutRecord, error: null };
  } catch (err: any) {
    console.error('[layoutsApi] getLayout exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Save a single layout (create or update)
 * Returns the saved layout record including its ID
 */
export async function saveLayout(input: SaveLayoutInput): Promise<ApiResponse<LayoutRecord>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    const payload = {
      account_id: accountId,
      name: input.name,
      description: input.description || null,
      category: input.category || 'custom',
      tags: input.tags || [],
      canvas_data: input.canvasData,
      event_id: input.eventId || null,
      status: input.status || 'active',
    };

    if (input.layoutId) {
      // Update existing layout
      const { data, error } = await getSupabaseClient()
        .from('layouts')
        .update(payload)
        .eq('id', input.layoutId)
        .eq('account_id', accountId)
        .select()
        .single();

      if (error) {
        console.error('[layoutsApi] saveLayout update error:', error);
        return { data: null, error: error.message };
      }

      return { data: data as LayoutRecord, error: null };
    } else {
      // Insert new layout
      const { data, error } = await getSupabaseClient()
        .from('layouts')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[layoutsApi] saveLayout insert error:', error);
        return { data: null, error: error.message };
      }

      return { data: data as LayoutRecord, error: null };
    }
  } catch (err: any) {
    console.error('[layoutsApi] saveLayout exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Save multiple layouts at once (batch upsert)
 * Each layout in the array should have an optional `layoutId` for updates
 */
export async function saveMultipleLayouts(
  layouts: SaveLayoutInput[]
): Promise<ApiResponse<LayoutRecord[]>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    const results: LayoutRecord[] = [];
    const errors: string[] = [];

    // Process each layout sequentially to handle both inserts and updates
    for (const layout of layouts) {
      const result = await saveLayout(layout);
      if (result.error) {
        errors.push(`${layout.name}: ${result.error}`);
      } else if (result.data) {
        results.push(result.data);
      }
    }

    if (errors.length > 0) {
      console.warn('[layoutsApi] saveMultipleLayouts partial errors:', errors);
      if (results.length === 0) {
        return { data: null, error: errors.join('; ') };
      }
      // Partial success - return what we saved
      return { data: results, error: `Some layouts failed: ${errors.join('; ')}` };
    }

    return { data: results, error: null };
  } catch (err: any) {
    console.error('[layoutsApi] saveMultipleLayouts exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Delete a layout by ID
 */
export async function deleteLayout(layoutId: string): Promise<ApiResponse<boolean>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    const { error } = await getSupabaseClient()
      .from('layouts')
      .delete()
      .eq('id', layoutId)
      .eq('account_id', accountId);

    if (error) {
      console.error('[layoutsApi] deleteLayout error:', error);
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err: any) {
    console.error('[layoutsApi] deleteLayout exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Archive/unarchive a layout
 */
export async function setLayoutStatus(
  layoutId: string,
  status: 'active' | 'archived'
): Promise<ApiResponse<LayoutRecord>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await getSupabaseClient()
      .from('layouts')
      .update({ status })
      .eq('id', layoutId)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      console.error('[layoutsApi] setLayoutStatus error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as LayoutRecord, error: null };
  } catch (err: any) {
    console.error('[layoutsApi] setLayoutStatus exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Attach one or more layouts to a Work project (event)
 * Updates the event_id column for the specified layouts
 */
export async function attachLayoutsToProject(
  layoutIds: string[],
  eventId: string
): Promise<ApiResponse<LayoutRecord[]>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    if (!layoutIds.length) {
      return { data: [], error: null };
    }

    const { data, error } = await getSupabaseClient()
      .from('layouts')
      .update({ event_id: eventId })
      .in('id', layoutIds)
      .eq('account_id', accountId)
      .select();

    if (error) {
      console.error('[layoutsApi] attachLayoutsToProject error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as LayoutRecord[], error: null };
  } catch (err: any) {
    console.error('[layoutsApi] attachLayoutsToProject exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Fetch all layouts linked to a specific project (event)
 * @deprecated Use getLayoutForEvent instead - each event now has ONE layout file
 */
export async function listLayoutsForProject(eventId: string): Promise<ApiResponse<LayoutRecord[]>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await getSupabaseClient()
      .from('layouts')
      .select('*')
      .eq('account_id', accountId)
      .eq('event_id', eventId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[layoutsApi] listLayoutsForProject error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as LayoutRecord[], error: null };
  } catch (err: any) {
    console.error('[layoutsApi] listLayoutsForProject exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Create an empty layout file data structure with one default tab
 */
export function createEmptyLayoutFileData(): LayoutFileData {
  const now = new Date().toISOString();
  const defaultTabId = `tab-${Date.now()}`;
  return {
    tabs: [{
      id: defaultTabId,
      name: 'Main Layout',
      canvas: {
        drawings: [],
        shapes: [],
        textElements: [],
        walls: [],
        doors: [],
        powerPoints: [],
        viewBox: { x: 0, y: 0, width: 0, height: 0 },
      },
      createdAt: now,
      updatedAt: now,
    }],
    activeTabId: defaultTabId,
    workflowPositions: {},
  };
}

/**
 * Get THE layout file for a specific event (one-to-one relationship)
 * Returns null if no layout exists for this event
 */
export async function getLayoutForEvent(eventId: string): Promise<ApiResponse<LayoutRecord | null>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await getSupabaseClient()
      .from('layouts')
      .select('*')
      .eq('account_id', accountId)
      .eq('event_id', eventId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[layoutsApi] getLayoutForEvent error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as LayoutRecord | null, error: null };
  } catch (err: any) {
    console.error('[layoutsApi] getLayoutForEvent exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Create a new layout file for an event
 * Will fail if the event already has a layout (one-to-one relationship)
 */
export async function createLayoutForEvent(
  eventId: string,
  eventTitle: string
): Promise<ApiResponse<LayoutRecord>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    // Check if event already has a layout
    const existing = await getLayoutForEvent(eventId);
    if (existing.data) {
      return { data: null, error: 'Event already has a layout file' };
    }

    const payload = {
      account_id: accountId,
      name: `${eventTitle} - Layout`,
      description: `Layout file for ${eventTitle}`,
      category: 'custom',
      tags: [],
      canvas_data: createEmptyLayoutFileData(),
      event_id: eventId,
      status: 'active',
    };

    const { data, error } = await getSupabaseClient()
      .from('layouts')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[layoutsApi] createLayoutForEvent error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as LayoutRecord, error: null };
  } catch (err: any) {
    console.error('[layoutsApi] createLayoutForEvent exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Get or create a layout file for an event
 * Returns existing layout if found, creates new one if not
 */
export async function getOrCreateLayoutForEvent(
  eventId: string,
  eventTitle: string
): Promise<ApiResponse<LayoutRecord>> {
  try {
    // Try to get existing layout
    const existing = await getLayoutForEvent(eventId);
    if (existing.error) {
      return { data: null, error: existing.error };
    }
    if (existing.data) {
      return { data: existing.data, error: null };
    }

    // Create new layout for this event
    return await createLayoutForEvent(eventId, eventTitle);
  } catch (err: any) {
    console.error('[layoutsApi] getOrCreateLayoutForEvent exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

/**
 * List all layouts with their associated event info
 * Used for the dashboard layout tab - shows one layout file per event
 */
export async function listLayoutsWithEvents(): Promise<ApiResponse<Array<LayoutRecord & { event?: { id: string; title: string; wedding_date: string } }>>> {
  try {
    const accountId = getAccountId();
    if (!accountId) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await getSupabaseClient()
      .from('layouts')
      .select(`
        *,
        event:events!event_id (
          id,
          title,
          wedding_date
        )
      `)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[layoutsApi] listLayoutsWithEvents error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as any, error: null };
  } catch (err: any) {
    console.error('[layoutsApi] listLayoutsWithEvents exception:', err);
    return { data: null, error: err.message || 'Unknown error' };
  }
}

