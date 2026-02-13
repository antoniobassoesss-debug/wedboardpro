/**
 * CRM Database Module
 * Handles deals, contacts, and activities for sales pipeline
 */

import { browserSupabaseClient } from '../../client/browserSupabaseClient';
import type { CrmDeal, CrmActivity, Contact } from './types';

export const crmDb = {
  // ===== CONTACTS =====

  /**
   * List all contacts for the current user's team
   * Note: RLS policies automatically filter contacts by user's team
   */
  async listContacts(filters?: { search?: string }): Promise<Contact[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // RLS policies automatically filter by user's team - no need for manual team_id filter
    let query = browserSupabaseClient
      .from('contacts')
      .select('*');

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data as Contact[];
  },

  /**
   * Get a single contact
   */
  async getContact(contactId: string): Promise<Contact> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error) throw error;
    return data as Contact;
  },

  /**
   * Create a contact
   */
  async createContact(input: Partial<Contact>): Promise<Contact> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's team via RPC
    const { data: membership, error: memberError } = await browserSupabaseClient
      .rpc('get_my_team_membership');

    if (memberError) throw memberError;
    if (!membership) throw new Error('No team found');

    const { data, error } = await browserSupabaseClient
      .from('contacts')
      .insert({
        team_id: membership.team_id,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Contact;
  },

  /**
   * Update a contact
   */
  async updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;
    return data as Contact;
  },

  /**
   * Delete a contact
   */
  async deleteContact(contactId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) throw error;
  },

  // ===== DEALS =====

  /**
   * List all deals for the current user's team
   * Note: RLS policies automatically filter deals by user's team
   */
  async listDeals(filters?: { stage_id?: string; pipeline_id?: string }): Promise<CrmDeal[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // RLS policies automatically filter by user's team - no need for manual team_id filter
    let query = browserSupabaseClient
      .from('crm_deals')
      .select('*');

    if (filters?.stage_id) {
      query = query.eq('stage_id', filters.stage_id);
    }

    if (filters?.pipeline_id) {
      query = query.eq('pipeline_id', filters.pipeline_id);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data as CrmDeal[];
  },

  /**
   * Get a single deal
   */
  async getDeal(dealId: string): Promise<CrmDeal> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('crm_deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (error) throw error;
    return data as CrmDeal;
  },

  /**
   * Create a deal
   */
  async createDeal(input: Partial<CrmDeal>): Promise<CrmDeal> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's team via RPC
    const { data: membership, error: memberError } = await browserSupabaseClient
      .rpc('get_my_team_membership');

    if (memberError) throw memberError;
    if (!membership) throw new Error('No team found');

    const { data, error } = await browserSupabaseClient
      .from('crm_deals')
      .insert({
        team_id: membership.team_id,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CrmDeal;
  },

  /**
   * Update a deal
   */
  async updateDeal(dealId: string, updates: Partial<CrmDeal>): Promise<CrmDeal> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('crm_deals')
      .update(updates)
      .eq('id', dealId)
      .select()
      .single();

    if (error) throw error;
    return data as CrmDeal;
  },

  /**
   * Delete a deal
   */
  async deleteDeal(dealId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('crm_deals')
      .delete()
      .eq('id', dealId);

    if (error) throw error;
  },

  // ===== ACTIVITIES =====

  /**
   * List activities for a deal
   */
  async listDealActivities(dealId: string): Promise<CrmActivity[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('crm_activities')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CrmActivity[];
  },

  /**
   * Create an activity
   */
  async createActivity(input: Partial<CrmActivity>): Promise<CrmActivity> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('crm_activities')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as CrmActivity;
  },

  /**
   * Mark activity as completed
   */
  async completeActivity(activityId: string): Promise<CrmActivity> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('crm_activities')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', activityId)
      .select()
      .single();

    if (error) throw error;
    return data as CrmActivity;
  },
};
