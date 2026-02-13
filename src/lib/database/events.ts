/**
 * Events Database Module
 * Handles all event/project-related database operations
 */

import { browserSupabaseClient } from '../../client/browserSupabaseClient';
import type { Event, CreateEventInput, UpdateEventInput } from './types';

export const eventsDb = {
  /**
   * List all events for the current user's team
   * Note: RLS policies automatically filter events by user's team
   */
  async listEvents(): Promise<Event[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // RLS policies automatically filter by user's team - no need for manual team_id filter
    const { data, error } = await browserSupabaseClient
      .from('events')
      .select('*')
      .order('wedding_date', { ascending: true });

    if (error) throw error;
    return data as Event[];
  },

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<Event> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data as Event;
  },

  /**
   * Create a new event
   */
  async createEvent(input: CreateEventInput): Promise<Event> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's team_id via RPC
    const { data: membership, error: memberError } = await browserSupabaseClient
      .rpc('get_my_team_membership');

    if (memberError) throw new Error(`Failed to get team: ${memberError.message}`);
    if (!membership) throw new Error('You must be in a team to create events');

    // Handle both array and object response formats
    let teamId;
    if (Array.isArray(membership)) {
      if (membership.length === 0) {
        throw new Error('You must be in a team to create events');
      }
      teamId = membership[0]?.team_id;
    } else {
      teamId = membership.team_id;
    }

    if (!teamId) {
      throw new Error('No team_id found in membership. Please create or join a team first.');
    }

    const { data, error } = await browserSupabaseClient
      .from('events')
      .insert({
        ...input,
        team_id: teamId,  // ✅ Explicitly set team_id
        created_by: user.id,
        planner_id: user.id,  // Set planner_id to current user
        status: 'on_track',
        guest_count_expected: input.guest_count_expected || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Event;
  },

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, updates: UpdateEventInput): Promise<Event> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data as Event;
  },

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  },

  /**
   * Archive an event (soft delete - update status)
   */
  async archiveEvent(eventId: string): Promise<Event> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('events')
      .update({ status: 'completed' })
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data as Event;
  },

  /**
   * Get events count for a team
   */
  async getEventsCount(teamId: string): Promise<number> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { count, error } = await browserSupabaseClient
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Get upcoming events (sorted by wedding date)
   * Note: RLS policies automatically filter events by user's team
   */
  async getUpcomingEvents(limit: number = 10): Promise<Event[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const today = new Date().toISOString().split('T')[0];

    // RLS policies automatically filter by user's team - no need for manual team_id filter
    const { data, error } = await browserSupabaseClient
      .from('events')
      .select('*')
      .gte('wedding_date', today)
      .order('wedding_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data as Event[];
  },

  /**
   * Search events by title
   * Note: RLS policies automatically filter events by user's team
   */
  async searchEvents(query: string): Promise<Event[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // RLS policies automatically filter by user's team - no need for manual team_id filter
    const { data, error } = await browserSupabaseClient
      .from('events')
      .select('*')
      .ilike('title', `%${query}%`)
      .order('wedding_date', { ascending: true });

    if (error) throw error;
    return data as Event[];
  },
};
