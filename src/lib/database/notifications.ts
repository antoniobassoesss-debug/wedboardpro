/**
 * Notifications Database Module
 * Handles user notifications
 */

import { browserSupabaseClient } from '../../client/browserSupabaseClient';
import type { Notification } from './types';

export const notificationsDb = {
  /**
   * Get all notifications for the current user
   */
  async listNotifications(filters?: {
    read?: boolean;
    limit?: number;
  }): Promise<Notification[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = browserSupabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', user.id);

    if (filters?.read !== undefined) {
      query = query.eq('is_read', filters.read);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Notification[];
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { count, error } = await browserSupabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  },

  /**
   * Mark a notification as unread
   */
  async markAsUnread(notificationId: string): Promise<Notification> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('notifications')
      .update({ is_read: false })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await browserSupabaseClient
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Create a notification (typically done server-side)
   */
  async createNotification(input: {
    user_id: string;
    team_id?: string;
    type: string;
    title: string;
    message: string;
    action_url?: string;
  }): Promise<Notification> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('notifications')
      .insert({
        ...input,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  },
};
