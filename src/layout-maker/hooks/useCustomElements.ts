/**
 * useCustomElements Hook
 *
 * Provides functions to manage custom element templates.
 */

import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCustomElementsStore } from '../stores/customElementsStore';
import {
  getCustomElements,
  saveCustomElement,
  updateCustomElement,
  deleteCustomElement,
  isCustomElementInUse,
  getCustomElementUsageCount,
  type CustomElementTemplate,
  type Point,
} from '../../lib/supabase/custom-elements';

interface UseCustomElementsReturn {
  templates: CustomElementTemplate[];
  loading: boolean;
  error: string | null;
  fetchTemplates: (plannerId: string) => Promise<void>;
  saveTemplate: (
    plannerId: string,
    template: Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<CustomElementTemplate | null>;
  updateTemplate: (
    id: string,
    updates: Partial<Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt'>>
  ) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<{ success: boolean; inUse: boolean; usageCount: number }>;
  getUsageCount: (id: string) => Promise<number>;
  findById: (id: string) => CustomElementTemplate | undefined;
}

export function useCustomElements(): UseCustomElementsReturn {
  const { templates, setTemplates, addTemplate, updateTemplate: updateTemplateStore, removeTemplate, setLoading, setError, findById: findByIdStore } = useCustomElementsStore();
  const [loading, setLocalLoading] = useState(false);
  const [error, setLocalError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (plannerId: string) => {
    setLoading(true);
    setLocalLoading(true);
    setLocalError(null);

    try {
      const result = await getCustomElements(plannerId);
      setTemplates(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch custom elements';
      setLocalError(message);
      setError(message);
    } finally {
      setLoading(false);
      setLocalLoading(false);
    }
  }, [setTemplates, setLoading, setError]);

  const saveTemplateFn = useCallback(
    async (
      plannerId: string,
      template: Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt' | 'updatedAt'>
    ): Promise<CustomElementTemplate | null> => {
      setLocalLoading(true);
      setLocalError(null);

      try {
        const saved = await saveCustomElement(plannerId, template);
        if (saved) {
          addTemplate(saved);
          return saved;
        }
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save custom element';
        setLocalError(message);
        return null;
      } finally {
        setLocalLoading(false);
      }
    },
    [addTemplate]
  );

  const updateTemplateFn = useCallback(
    async (
      id: string,
      updates: Partial<Omit<CustomElementTemplate, 'id' | 'plannerId' | 'createdAt'>>
    ): Promise<boolean> => {
      setLocalLoading(true);
      setLocalError(null);

      try {
        const success = await updateCustomElement(id, updates);
        if (success) {
          updateTemplateStore(id, updates);
          return true;
        }
        return false;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update custom element';
        setLocalError(message);
        return false;
      } finally {
        setLocalLoading(false);
      }
    },
    [updateTemplateStore]
  );

  const deleteTemplateFn = useCallback(
    async (id: string): Promise<{ success: boolean; inUse: boolean; usageCount: number }> => {
      setLocalLoading(true);
      setLocalError(null);

      try {
        const inUse = await isCustomElementInUse(id);
        if (inUse) {
          const usageCount = await getCustomElementUsageCount(id);
          return { success: false, inUse: true, usageCount };
        }

        const success = await deleteCustomElement(id);
        if (success) {
          removeTemplate(id);
          return { success: true, inUse: false, usageCount: 0 };
        }

        return { success: false, inUse: false, usageCount: 0 };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete custom element';
        setLocalError(message);
        return { success: false, inUse: false, usageCount: 0 };
      } finally {
        setLocalLoading(false);
      }
    },
    [removeTemplate]
  );

  const getUsageCount = useCallback(async (id: string): Promise<number> => {
    try {
      return await getCustomElementUsageCount(id);
    } catch {
      return 0;
    }
  }, []);

  return {
    templates,
    loading: loading || useCustomElementsStore.getState().loading,
    error: error || useCustomElementsStore.getState().error,
    fetchTemplates,
    saveTemplate: saveTemplateFn,
    updateTemplate: updateTemplateFn,
    deleteTemplate: deleteTemplateFn,
    getUsageCount,
    findById: findByIdStore,
  };
}

export default useCustomElements;
