/**
 * Guests Database Module
 * Handles guest list and RSVP management
 */

import { browserSupabaseClient } from '../../client/browserSupabaseClient';
import type { Guest } from './types';

export const guestsDb = {
  /**
   * Get all guests for an event
   */
  async listEventGuests(eventId: string): Promise<Guest[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Guest[];
  },

  /**
   * Get a single guest
   */
  async getGuest(guestId: string): Promise<Guest> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .single();

    if (error) throw error;
    return data as Guest;
  },

  /**
   * Create a guest
   */
  async createGuest(eventId: string, input: Partial<Guest>): Promise<Guest> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('guests')
      .insert({
        event_id: eventId,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Guest;
  },

  /**
   * Create multiple guests in bulk
   */
  async createGuestsBulk(eventId: string, guests: Partial<Guest>[]): Promise<Guest[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const guestsWithEventId = guests.map(g => ({
      event_id: eventId,
      ...g,
    }));

    const { data, error } = await browserSupabaseClient
      .from('guests')
      .insert(guestsWithEventId)
      .select();

    if (error) throw error;
    return data as Guest[];
  },

  /**
   * Update a guest
   */
  async updateGuest(guestId: string, updates: Partial<Guest>): Promise<Guest> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('guests')
      .update(updates)
      .eq('id', guestId)
      .select()
      .single();

    if (error) throw error;
    return data as Guest;
  },

  /**
   * Update multiple guests in bulk
   */
  async updateGuestsBulk(updates: Array<{ id: string; data: Partial<Guest> }>): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    // Supabase doesn't support bulk updates directly, so we do them sequentially
    for (const update of updates) {
      await this.updateGuest(update.id, update.data);
    }
  },

  /**
   * Delete a guest
   */
  async deleteGuest(guestId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('guests')
      .delete()
      .eq('id', guestId);

    if (error) throw error;
  },

  /**
   * Get guest count statistics
   */
  async getGuestStats(eventId: string) {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('guests')
      .select('rsvp_status, plus_one')
      .eq('event_id', eventId);

    if (error) throw error;

    const stats = {
      total: data.length,
      accepted: data.filter(g => g.rsvp_status === 'accepted').length,
      declined: data.filter(g => g.rsvp_status === 'declined').length,
      pending: data.filter(g => g.rsvp_status === 'pending' || !g.rsvp_status).length,
      withPlusOne: data.filter(g => g.plus_one).length,
    };

    return stats;
  },

  /**
   * Search guests by name or email
   */
  async searchGuests(eventId: string, query: string): Promise<Guest[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Guest[];
  },
};
