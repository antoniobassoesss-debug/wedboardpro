/**
 * Files Database Module
 * Handles project file uploads and management
 */

import { browserSupabaseClient } from '../../client/browserSupabaseClient';
import type { ProjectFile } from './types';

export const filesDb = {
  /**
   * Get all files for an event
   */
  async listEventFiles(eventId: string, category?: string): Promise<ProjectFile[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    let query = browserSupabaseClient
      .from('event_files')
      .select('*')
      .eq('event_id', eventId);

    if (category) {
      query = query.eq('category', category);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data as ProjectFile[];
  },

  /**
   * Get a single file
   */
  async getFile(fileId: string): Promise<ProjectFile> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('event_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) throw error;
    return data as ProjectFile;
  },

  /**
   * Upload a file (creates database record)
   */
  async createFileRecord(input: {
    event_id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    category?: string;
  }): Promise<ProjectFile> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await browserSupabaseClient
      .from('event_files')
      .insert({
        ...input,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ProjectFile;
  },

  /**
   * Update file metadata
   */
  async updateFile(
    fileId: string,
    updates: Partial<Pick<ProjectFile, 'file_name' | 'category'>>
  ): Promise<ProjectFile> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('event_files')
      .update(updates)
      .eq('id', fileId)
      .select()
      .single();

    if (error) throw error;
    return data as ProjectFile;
  },

  /**
   * Delete a file record (actual file deletion should be done separately)
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('event_files')
      .delete()
      .eq('id', fileId);

    if (error) throw error;
  },

  /**
   * Get file storage URL (for downloading)
   */
  async getFileUrl(filePath: string): Promise<string> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data } = browserSupabaseClient.storage
      .from('event-files')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * Upload file to storage bucket
   */
  async uploadToStorage(
    eventId: string,
    file: File,
    category?: string
  ): Promise<{ path: string; url: string }> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${eventId}/${category || 'general'}/${fileName}`;

    const { error: uploadError } = await browserSupabaseClient.storage
      .from('event-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const url = await this.getFileUrl(filePath);

    return { path: filePath, url };
  },

  /**
   * Delete file from storage bucket
   */
  async deleteFromStorage(filePath: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient.storage
      .from('event-files')
      .remove([filePath]);

    if (error) throw error;
  },
};
