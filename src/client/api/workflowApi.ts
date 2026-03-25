/**
 * Workflow API Client
 * 
 * Provides functions to save and load workflow notes and connections from Supabase.
 * These are stored in separate tables linked to events/weddings.
 */

import { browserSupabaseClient } from '../browserSupabaseClient';

const getSupabaseClient = () => {
  if (!browserSupabaseClient) {
    throw new Error('Supabase client not initialized');
  }
  return browserSupabaseClient;
};

export interface WorkflowNote {
  id: string;
  content: string;
  color: string;
  width: number;
  height: number;
  positionX?: number;
  positionY?: number;
}

export interface WorkflowConnection {
  fromCardId: string;
  fromSide: 'left' | 'right';
  toCardId: string;
  toSide: 'left' | 'right';
}

interface DbWorkflowNote {
  id: string; // TEXT (supports both UUID and local note-xxx format)
  event_id: string;
  content: string;
  color: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}

interface DbWorkflowConnection {
  id: string;
  event_id: string;
  from_id: string;
  from_type: string;
  to_id: string;
  to_type: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

const colorMap: Record<string, string> = {
  yellow: '#fef08a',
  pink: '#fbcfe8',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  purple: '#ddd6fe',
};

/**
 * Load workflow notes for an event from Supabase
 */
export async function loadWorkflowNotes(eventId: string): Promise<ApiResponse<WorkflowNote[]>> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('workflow_notes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[WorkflowAPI] Error loading notes:', error);
      return { data: null, error: error.message };
    }

    const notes: WorkflowNote[] = (data || []).map((note: DbWorkflowNote) => ({
      id: note.id,
      content: note.content,
      color: note.color || 'yellow',
      width: note.width,
      height: note.height,
      positionX: note.position_x,
      positionY: note.position_y,
    }));

    return { data: notes, error: null };
  } catch (error: any) {
    console.error('[WorkflowAPI] Exception loading notes:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Save workflow notes for an event to Supabase
 * Uses upsert to update existing or insert new
 */
export async function saveWorkflowNotes(
  eventId: string,
  notes: WorkflowNote[]
): Promise<ApiResponse<boolean>> {
  try {
    const supabase = getSupabaseClient();

    // Delete all existing notes for this event first so removed notes don't persist
    const { error: deleteError } = await supabase
      .from('workflow_notes')
      .delete()
      .eq('event_id', eventId);

    if (deleteError) {
      console.error('[WorkflowAPI] Error deleting old notes:', deleteError);
      return { data: null, error: deleteError.message };
    }

    // Insert the current list (may be empty if user deleted all notes)
    if (notes.length > 0) {
      const dbNotes: Omit<DbWorkflowNote, 'created_at' | 'updated_at'>[] = notes.map(note => ({
        id: note.id,
        event_id: eventId,
        content: note.content,
        color: note.color,
        position_x: note.positionX || 100,
        position_y: note.positionY || 100,
        width: note.width,
        height: note.height,
      }));

      const { error } = await supabase
        .from('workflow_notes')
        .insert(dbNotes);

      if (error) {
        console.error('[WorkflowAPI] Error inserting notes:', error);
        return { data: null, error: error.message };
      }
    }

    return { data: true, error: null };
  } catch (error: any) {
    console.error('[WorkflowAPI] Exception saving notes:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Delete a workflow note from Supabase
 */
export async function deleteWorkflowNote(noteId: string): Promise<ApiResponse<boolean>> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('workflow_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('[WorkflowAPI] Error deleting note:', error);
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (error: any) {
    console.error('[WorkflowAPI] Exception deleting note:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Load workflow connections for an event from Supabase
 */
export async function loadWorkflowConnections(eventId: string): Promise<ApiResponse<WorkflowConnection[]>> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('workflow_connections')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[WorkflowAPI] Error loading connections:', error);
      return { data: null, error: error.message };
    }

    console.log('[DEBUG] raw connections from Supabase:', data);
    const connections: WorkflowConnection[] = (data || []).map((conn: DbWorkflowConnection) => {
      const fromCardId = conn.from_type === 'note' ? `note-${conn.from_id}` : conn.from_id;
      const toCardId = conn.to_type === 'note' ? `note-${conn.to_id}` : conn.to_id;
      
      return {
        fromCardId,
        fromSide: 'right',
        toCardId,
        toSide: 'left',
      };
    });

    return { data: connections, error: null };
  } catch (error: any) {
    console.error('[WorkflowAPI] Exception loading connections:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Save workflow connections for an event to Supabase
 * Deletes all existing and inserts new ones
 */
export async function saveWorkflowConnections(
  eventId: string, 
  connections: WorkflowConnection[]
): Promise<ApiResponse<boolean>> {
  try {
    const supabase = getSupabaseClient();
    
    // First delete all existing connections for this event
    const { error: deleteError } = await supabase
      .from('workflow_connections')
      .delete()
      .eq('event_id', eventId);

    if (deleteError) {
      console.error('[WorkflowAPI] Error deleting old connections:', deleteError);
      return { data: null, error: deleteError.message };
    }

    // Then insert all new connections
    const dbConnections: Omit<DbWorkflowConnection, 'created_at'>[] = connections.map(conn => ({
      id: crypto.randomUUID(),
      event_id: eventId,
      from_id: conn.fromCardId.replace('note-', ''),
      from_type: conn.fromCardId.startsWith('note-') ? 'note' : 'project',
      to_id: conn.toCardId.replace('note-', ''),
      to_type: conn.toCardId.startsWith('note-') ? 'note' : 'project',
    }));

    if (dbConnections.length > 0) {
      const { error } = await supabase
        .from('workflow_connections')
        .insert(dbConnections);

      if (error) {
        console.error('[WorkflowAPI] Error saving connections:', error);
        return { data: null, error: error.message };
      }
    }

    return { data: true, error: null };
  } catch (error: any) {
    console.error('[WorkflowAPI] Exception saving connections:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Load all workflow data (notes and connections) for an event
 */
export async function loadWorkflowData(eventId: string): Promise<{
  notes: WorkflowNote[];
  connections: WorkflowConnection[];
  error: string | null;
}> {
  const [notesResult, connectionsResult] = await Promise.all([
    loadWorkflowNotes(eventId),
    loadWorkflowConnections(eventId),
  ]);

  return {
    notes: notesResult.data || [],
    connections: connectionsResult.data || [],
    error: notesResult.error || connectionsResult.error,
  };
}

/**
 * Save all workflow data (notes and connections) for an event
 */
export async function saveWorkflowData(
  eventId: string,
  notes: WorkflowNote[],
  connections: WorkflowConnection[]
): Promise<ApiResponse<boolean>> {
  const [notesResult, connectionsResult] = await Promise.all([
    saveWorkflowNotes(eventId, notes),
    saveWorkflowConnections(eventId, connections),
  ]);

  if (notesResult.error || connectionsResult.error) {
    return { 
      data: null, 
      error: notesResult.error || connectionsResult.error 
    };
  }

  return { data: true, error: null };
}

/**
 * Upsert a single workflow note (used for create; also updates all fields)
 */
export async function upsertWorkflowNote(
  eventId: string,
  note: WorkflowNote,
): Promise<ApiResponse<boolean>> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('workflow_notes').upsert(
      {
        id: note.id,
        event_id: eventId,
        content: note.content,
        color: note.color,
        position_x: note.positionX ?? 100,
        position_y: note.positionY ?? 100,
        width: note.width,
        height: note.height,
      },
      { onConflict: 'id' },
    );
    if (error) {
      console.error('[WorkflowAPI] Error upserting note:', error);
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Update specific fields on an existing workflow note
 */
export async function updateWorkflowNoteFields(
  noteId: string,
  fields: Partial<{
    content: string;
    color: string;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
  }>,
): Promise<ApiResponse<boolean>> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('workflow_notes')
      .update(fields)
      .eq('id', noteId);
    if (error) {
      console.error('[WorkflowAPI] Error updating note fields:', error);
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Insert a single workflow connection
 */
export async function insertWorkflowConnection(
  eventId: string,
  connection: WorkflowConnection,
): Promise<ApiResponse<boolean>> {
  try {
    const supabase = getSupabaseClient();
    const fromId = connection.fromCardId.startsWith('note-')
      ? connection.fromCardId.slice(5)
      : connection.fromCardId.startsWith('task-')
      ? connection.fromCardId.slice(5)
      : connection.fromCardId;
    const toId = connection.toCardId.startsWith('note-')
      ? connection.toCardId.slice(5)
      : connection.toCardId.startsWith('task-')
      ? connection.toCardId.slice(5)
      : connection.toCardId;
    const fromType = connection.fromCardId.startsWith('note-')
      ? 'note'
      : connection.fromCardId.startsWith('task-')
      ? 'task'
      : 'project';
    const toType = connection.toCardId.startsWith('note-')
      ? 'note'
      : connection.toCardId.startsWith('task-')
      ? 'task'
      : 'project';
    const { error } = await supabase.from('workflow_connections').insert({
      id: crypto.randomUUID(),
      event_id: eventId,
      from_id: fromId,
      from_type: fromType,
      to_id: toId,
      to_type: toType,
    });
    if (error) {
      console.error('[WorkflowAPI] Error inserting connection:', error);
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Delete a single workflow connection identified by its two endpoint card IDs
 */
export async function deleteWorkflowConnectionPair(
  eventId: string,
  fromCardId: string,
  toCardId: string,
): Promise<ApiResponse<boolean>> {
  try {
    const supabase = getSupabaseClient();
    const fromId = fromCardId.startsWith('note-')
      ? fromCardId.slice(5)
      : fromCardId.startsWith('task-')
      ? fromCardId.slice(5)
      : fromCardId;
    const toId = toCardId.startsWith('note-')
      ? toCardId.slice(5)
      : toCardId.startsWith('task-')
      ? toCardId.slice(5)
      : toCardId;
    const { error } = await supabase
      .from('workflow_connections')
      .delete()
      .eq('event_id', eventId)
      .eq('from_id', fromId)
      .eq('to_id', toId);
    if (error) {
      console.error('[WorkflowAPI] Error deleting connection pair:', error);
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}
