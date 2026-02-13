/**
 * Pipeline Database Module
 * Handles pipeline stages, tasks, clients, venues, and vendors
 */

import { browserSupabaseClient } from '../../client/browserSupabaseClient';
import type { PipelineStage, StageTask, Client, Venue, Vendor } from './types';

export const pipelineDb = {
  // ===== STAGES =====

  /**
   * Get all stages for an event
   */
  async getEventStages(eventId: string): Promise<PipelineStage[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('pipeline_stages')
      .select('*')
      .eq('event_id', eventId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data as PipelineStage[];
  },

  /**
   * Get a single stage
   */
  async getStage(stageId: string): Promise<PipelineStage> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('pipeline_stages')
      .select('*')
      .eq('id', stageId)
      .single();

    if (error) throw error;
    return data as PipelineStage;
  },

  /**
   * Update a stage
   */
  async updateStage(
    stageId: string,
    updates: Partial<PipelineStage>
  ): Promise<PipelineStage> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('pipeline_stages')
      .update(updates)
      .eq('id', stageId)
      .select()
      .single();

    if (error) throw error;
    return data as PipelineStage;
  },

  /**
   * Create default stages for an event
   */
  async createDefaultStages(eventId: string): Promise<PipelineStage[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const defaultStages = [
      { key: 'vision_style', title: 'Vision & Style', order_index: 0 },
      { key: 'venue_date', title: 'Venue & Date', order_index: 1 },
      { key: 'guest_list', title: 'Guest List', order_index: 2 },
      { key: 'budget', title: 'Budget', order_index: 3 },
      { key: 'vendors', title: 'Vendors', order_index: 4 },
      { key: 'design_layout', title: 'Design & Layout', order_index: 5 },
      { key: 'logistics', title: 'Logistics', order_index: 6 },
      { key: 'wedding_day', title: 'Wedding Day', order_index: 7 },
      { key: 'post_event', title: 'Post-Event', order_index: 8 },
    ];

    const stages = defaultStages.map(stage => ({
      event_id: eventId,
      ...stage,
      description: null,
      progress_percent: 0,
      due_date: null,
      is_blocking: false,
    }));

    const { data, error } = await browserSupabaseClient
      .from('pipeline_stages')
      .insert(stages)
      .select();

    if (error) throw error;
    return data as PipelineStage[];
  },

  // ===== STAGE TASKS =====

  /**
   * Get all tasks for a stage
   */
  async getStageTasks(stageId: string): Promise<StageTask[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('stage_tasks')
      .select('*')
      .eq('stage_id', stageId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as StageTask[];
  },

  /**
   * Get all tasks for an event
   */
  async getEventTasks(eventId: string): Promise<StageTask[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('stage_tasks')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as StageTask[];
  },

  /**
   * Create a task in a stage
   */
  async createStageTask(
    stageId: string,
    eventId: string,
    input: Partial<StageTask>
  ): Promise<StageTask> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('stage_tasks')
      .insert({
        stage_id: stageId,
        event_id: eventId,
        title: input.title || 'New Task',
        description: input.description || null,
        assigned_to: input.assigned_to || null,
        status: input.status || 'todo',
        priority: input.priority || 'medium',
        due_date: input.due_date || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as StageTask;
  },

  /**
   * Update a stage task
   */
  async updateStageTask(taskId: string, updates: Partial<StageTask>): Promise<StageTask> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('stage_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data as StageTask;
  },

  /**
   * Delete a stage task
   */
  async deleteStageTask(taskId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('stage_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  },

  // ===== CLIENTS =====

  /**
   * Get client details for an event
   * Uses RPC to bypass PostgREST bug with clients table
   */
  async getEventClient(eventId: string): Promise<Client | null> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: clientData, error } = await browserSupabaseClient
      .rpc('get_event_client', { p_event_id: eventId });

    if (error) throw error;
    return (clientData?.[0] as Client) || null;
  },

  /**
   * Create or update client details for an event
   */
  async upsertEventClient(eventId: string, input: Partial<Client>): Promise<Client> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    // Check if client exists
    const existing = await this.getEventClient(eventId);

    if (existing) {
      // Update
      const { data, error } = await browserSupabaseClient
        .from('clients')
        .update(input)
        .eq('event_id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data as Client;
    } else {
      // Insert
      const { data, error } = await browserSupabaseClient
        .from('clients')
        .insert({
          event_id: eventId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Client;
    }
  },

  // ===== VENUES =====

  /**
   * Get venue details for an event
   * Uses RPC to get venue (table is actually wedding_venues, not event_venues)
   */
  async getEventVenue(eventId: string): Promise<Venue | null> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: venueData, error } = await browserSupabaseClient
      .rpc('get_event_venue', { p_event_id: eventId });

    if (error) throw error;
    return (venueData?.[0] as Venue) || null;
  },

  /**
   * Create or update venue details for an event
   */
  async upsertEventVenue(eventId: string, input: Partial<Venue>): Promise<Venue> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const existing = await this.getEventVenue(eventId);

    if (existing) {
      const { data, error } = await browserSupabaseClient
        .from('wedding_venues')
        .update(input)
        .eq('event_id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data as Venue;
    } else {
      const { data, error } = await browserSupabaseClient
        .from('wedding_venues')
        .insert({
          event_id: eventId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Venue;
    }
  },

  // ===== VENDORS =====

  /**
   * Get all vendors for an event
   */
  async getEventVendors(eventId: string): Promise<Vendor[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('vendors')
      .select('*')
      .eq('event_id', eventId)
      .order('category', { ascending: true });

    if (error) throw error;
    return data as Vendor[];
  },

  /**
   * Create a vendor for an event
   */
  async createVendor(eventId: string, input: Partial<Vendor>): Promise<Vendor> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('vendors')
      .insert({
        event_id: eventId,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Vendor;
  },

  /**
   * Update a vendor
   */
  async updateVendor(vendorId: string, updates: Partial<Vendor>): Promise<Vendor> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('vendors')
      .update(updates)
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return data as Vendor;
  },

  /**
   * Delete a vendor
   */
  async deleteVendor(vendorId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('vendors')
      .delete()
      .eq('id', vendorId);

    if (error) throw error;
  },
};
