/**
 * Custom Elements Store
 *
 * State management for custom element templates.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { CustomElementTemplate } from '../types/elements';

interface CustomElementsState {
  templates: CustomElementTemplate[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;

  setTemplates: (templates: CustomElementTemplate[]) => void;
  addTemplate: (template: CustomElementTemplate) => void;
  updateTemplate: (id: string, updates: Partial<CustomElementTemplate>) => void;
  removeTemplate: (id: string) => void;
  selectTemplate: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  findById: (id: string) => CustomElementTemplate | undefined;
}

export const useCustomElementsStore = create<CustomElementsState>()(
  subscribeWithSelector(
    (set, get) => ({
      templates: [],
      loading: false,
      error: null,
      selectedId: null,

      setTemplates: (templates) => {
        set({ templates });
      },

      addTemplate: (template) => {
        set((state) => ({
          templates: [template, ...state.templates],
        }));
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      removeTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        }));
      },

      selectTemplate: (id) => {
        set({ selectedId: id });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      setError: (error) => {
        set({ error });
      },

      findById: (id) => {
        return get().templates.find((t) => t.id === id);
      },
    })
  )
);
