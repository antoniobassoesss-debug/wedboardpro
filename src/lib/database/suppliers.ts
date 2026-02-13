/**
 * Suppliers Database Module
 * Handles supplier/vendor directory and event linkages
 */

import { browserSupabaseClient } from '../../client/browserSupabaseClient';
import type { Supplier, EventSupplier } from './types';

export const suppliersDb = {
  /**
   * List all suppliers for the current user's team
   * Note: RLS policies automatically filter suppliers by user's team
   */
  async listSuppliers(filters?: {
    category?: string;
    search?: string;
  }): Promise<Supplier[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // RLS policies automatically filter by user's team - no need for manual team_id filter
    let query = browserSupabaseClient
      .from('suppliers')
      .select('*');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data as Supplier[];
  },

  /**
   * Get a single supplier
   */
  async getSupplier(supplierId: string): Promise<Supplier> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  /**
   * Create a supplier
   */
  async createSupplier(input: Partial<Supplier>): Promise<Supplier> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's team via RPC
    const { data: membership, error: memberError } = await browserSupabaseClient
      .rpc('get_my_team_membership');

    if (memberError) throw memberError;
    if (!membership) throw new Error('No team found');

    const { data, error } = await browserSupabaseClient
      .from('suppliers')
      .insert({
        team_id: membership.team_id,
        ...input,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  /**
   * Update a supplier
   */
  async updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<Supplier> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('suppliers')
      .update(updates)
      .eq('id', supplierId)
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  /**
   * Delete a supplier
   */
  async deleteSupplier(supplierId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('suppliers')
      .delete()
      .eq('id', supplierId);

    if (error) throw error;
  },

  /**
   * Get all suppliers linked to an event
   */
  async getEventSuppliers(eventId: string): Promise<Array<EventSupplier & { supplier: Supplier }>> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('event_suppliers')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;

    // Get supplier details for each
    const eventSuppliers = data as EventSupplier[];
    const suppliersWithDetails = await Promise.all(
      eventSuppliers.map(async (es) => {
        const supplier = await this.getSupplier(es.supplier_id);
        return { ...es, supplier };
      })
    );

    return suppliersWithDetails;
  },

  /**
   * Link a supplier to an event
   */
  async linkSupplierToEvent(
    eventId: string,
    supplierId: string,
    input?: Partial<EventSupplier>
  ): Promise<EventSupplier> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('event_suppliers')
      .insert({
        event_id: eventId,
        supplier_id: supplierId,
        status: input?.status || 'pending',
        contracted_amount: input?.contracted_amount || null,
        notes: input?.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as EventSupplier;
  },

  /**
   * Update event-supplier linkage
   */
  async updateEventSupplier(
    eventSupplierId: string,
    updates: Partial<EventSupplier>
  ): Promise<EventSupplier> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('event_suppliers')
      .update(updates)
      .eq('id', eventSupplierId)
      .select()
      .single();

    if (error) throw error;
    return data as EventSupplier;
  },

  /**
   * Unlink a supplier from an event
   */
  async unlinkSupplierFromEvent(eventSupplierId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('event_suppliers')
      .delete()
      .eq('id', eventSupplierId);

    if (error) throw error;
  },

  /**
   * Get supplier categories (for filtering)
   * Note: RLS policies automatically filter suppliers by user's team
   */
  async getSupplierCategories(): Promise<string[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // RLS policies automatically filter by user's team - no need for manual team_id filter
    const { data, error } = await browserSupabaseClient
      .from('suppliers')
      .select('category');

    if (error) throw error;

    // Get unique categories
    const categories = [...new Set(data.map(s => s.category).filter(Boolean))];
    return categories as string[];
  },
};
