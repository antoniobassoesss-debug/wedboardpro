/**
 * Budget Database Module
 * Handles budget categories and payments
 */

import { browserSupabaseClient } from '../../client/browserSupabaseClient';
import type { BudgetCategory, BudgetPayment } from './types';

export const budgetDb = {
  /**
   * Get all budget categories for an event
   */
  async getBudgetCategories(eventId: string): Promise<BudgetCategory[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('budget_categories')
      .select('*')
      .eq('event_id', eventId)
      .order('category_name', { ascending: true });

    if (error) throw error;
    return data as BudgetCategory[];
  },

  /**
   * Get a single budget category
   */
  async getBudgetCategory(categoryId: string): Promise<BudgetCategory> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('budget_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) throw error;
    return data as BudgetCategory;
  },

  /**
   * Create a budget category
   */
  async createBudgetCategory(
    eventId: string,
    input: Partial<BudgetCategory>
  ): Promise<BudgetCategory> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('budget_categories')
      .insert({
        event_id: eventId,
        category_name: input.category_name || 'New Category',
        custom_name: input.custom_name || null,
        budgeted_amount: input.budgeted_amount || 0,
        contracted_amount: input.contracted_amount || 0,
        paid_amount: input.paid_amount || 0,
        payment_schedule: input.payment_schedule || null,
        vendor_id: input.vendor_id || null,
        is_contracted: input.is_contracted || false,
        notes: input.notes || null,
        category_status: input.category_status || 'planned', // ✅ Valid status
      })
      .select()
      .single();

    if (error) throw error;
    return data as BudgetCategory;
  },

  /**
   * Update a budget category
   */
  async updateBudgetCategory(
    categoryId: string,
    updates: Partial<BudgetCategory>
  ): Promise<BudgetCategory> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('budget_categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;
    return data as BudgetCategory;
  },

  /**
   * Delete a budget category
   */
  async deleteBudgetCategory(categoryId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    // Delete associated payments first
    await browserSupabaseClient
      .from('budget_payments')
      .delete()
      .eq('category_id', categoryId);

    // Delete category
    const { error } = await browserSupabaseClient
      .from('budget_categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;
  },

  /**
   * Get all payments for a category
   */
  async getCategoryPayments(categoryId: string): Promise<BudgetPayment[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('budget_payments')
      .select('*')
      .eq('category_id', categoryId)
      .order('paid_date', { ascending: false });

    if (error) throw error;
    return data as BudgetPayment[];
  },

  /**
   * Create a payment
   */
  async createPayment(
    categoryId: string,
    input: Partial<BudgetPayment>
  ): Promise<BudgetPayment> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('budget_payments')
      .insert({
        category_id: categoryId,
        amount: input.amount || 0,
        paid_date: input.paid_date || new Date().toISOString().split('T')[0],
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update category paid_amount
    const payments = await this.getCategoryPayments(categoryId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    await browserSupabaseClient
      .from('budget_categories')
      .update({ paid_amount: totalPaid })
      .eq('id', categoryId);

    return data as BudgetPayment;
  },

  /**
   * Delete a payment
   */
  async deletePayment(paymentId: string, categoryId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('budget_payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;

    // Update category paid_amount
    const payments = await this.getCategoryPayments(categoryId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    await browserSupabaseClient
      .from('budget_categories')
      .update({ paid_amount: totalPaid })
      .eq('id', categoryId);
  },

  /**
   * Get budget summary for an event
   */
  async getBudgetSummary(eventId: string) {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const categories = await this.getBudgetCategories(eventId);

    const summary = {
      totalBudgeted: categories.reduce((sum, c) => sum + c.budgeted_amount, 0),
      totalContracted: categories.reduce((sum, c) => sum + c.contracted_amount, 0),
      totalPaid: categories.reduce((sum, c) => sum + c.paid_amount, 0),
      categoriesCount: categories.length,
      remainingBalance: 0,
    };

    summary.remainingBalance = summary.totalContracted - summary.totalPaid;

    return summary;
  },
};
