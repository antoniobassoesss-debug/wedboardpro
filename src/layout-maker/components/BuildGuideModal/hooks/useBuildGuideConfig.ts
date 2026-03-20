/**
 * Build Guide Config Hook
 *
 * Manages loading and saving the Build Guide configuration to Supabase.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { browserSupabaseClient } from '../../../../client/browserSupabaseClient';
import type { BuildGuideConfig, LayoutConfig, TimelineRow, Contact, DocumentSettings, ElementCategoryKey } from '../../../types/buildGuide';
import { ELEMENT_CATEGORIES } from '../../../types/buildGuide';

interface UseBuildGuideConfigProps {
  eventId: string;
  layoutList: LayoutConfig[];
  defaultSettings: DocumentSettings;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const createDefaultLayoutConfigs = (layouts: LayoutConfig[]): LayoutConfig[] => {
  return layouts.map((layout) => ({
    layoutId: layout.layoutId,
    layoutName: layout.layoutName,
    spaceName: layout.spaceName,
    included: true,
    pageSize: 'half' as const,
    elementVisibility: ELEMENT_CATEGORIES.map((cat) => ({
      category: cat.key,
      visible: true,
    })),
    includeLegend: true,
    includeDimensions: true,
    includeNotes: true,
    includeTasks: true,
    notes: [],
    tasks: [],
    // Preserve shape/background data passed from the canvas store — needed for off-screen rendering
    ...(layout.shapes !== undefined && { shapes: layout.shapes }),
    ...(layout.viewBox !== undefined && { viewBox: layout.viewBox }),
    ...(layout.satelliteBackground !== undefined && { satelliteBackground: layout.satelliteBackground }),
  }));
};

export const useBuildGuideConfig = (
  eventId: string,
  layoutList: LayoutConfig[],
  defaultSettings: DocumentSettings
) => {
  const [config, setConfig] = useState<BuildGuideConfig>({
    eventId,
    layoutConfigs: createDefaultLayoutConfigs(layoutList),
    timelineRows: [],
    contacts: [],
    documentSettings: defaultSettings,
    versionLabel: 'v1',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      if (!browserSupabaseClient) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await browserSupabaseClient
          .from('build_guide_configs')
          .select('*')
          .eq('event_id', eventId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading build guide config:', error);
          setIsLoading(false);
          return;
        }

        if (data) {
          const dbConfig = data as any;
          
          const mergedLayoutConfigs = createDefaultLayoutConfigs(layoutList).map((defaultConfig) => {
            const savedConfig = (dbConfig.layout_configs || []).find(
              (saved: LayoutConfig) => saved.layoutId === defaultConfig.layoutId
            );
            // Always inject shapes/viewBox from the live layoutList — they are
            // never persisted to Supabase and must come from the canvas store.
            const base = savedConfig || defaultConfig;
            return {
              ...base,
              ...(defaultConfig.shapes !== undefined && { shapes: defaultConfig.shapes }),
              ...(defaultConfig.viewBox !== undefined && { viewBox: defaultConfig.viewBox }),
              ...(defaultConfig.satelliteBackground !== undefined && { satelliteBackground: defaultConfig.satelliteBackground }),
            };
          });

          setConfig({
            id: dbConfig.id,
            eventId: dbConfig.event_id,
            layoutConfigs: mergedLayoutConfigs,
            timelineRows: dbConfig.timeline_rows || [],
            contacts: dbConfig.contacts || [],
            documentSettings: {
              ...defaultSettings,
              ...(dbConfig.document_settings || {}),
            },
            versionLabel: dbConfig.version_label || 'v1',
            lastGeneratedAt: dbConfig.last_generated_at,
            createdAt: dbConfig.created_at,
            updatedAt: dbConfig.updated_at,
          });
        } else {
          setConfig({
            eventId,
            layoutConfigs: createDefaultLayoutConfigs(layoutList),
            timelineRows: [],
            contacts: [],
            documentSettings: defaultSettings,
            versionLabel: 'v1',
          });
        }
      } catch (error) {
        console.error('Error loading build guide config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [eventId, layoutList, defaultSettings]);

  const saveConfig = useCallback(async (updates: Partial<BuildGuideConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!browserSupabaseClient) return;

      setIsSaving(true);

      try {
        const configToSave = { ...config, ...updates };
        
        const dbData = {
          event_id: configToSave.eventId,
          layout_configs: configToSave.layoutConfigs,
          timeline_rows: configToSave.timelineRows,
          contacts: configToSave.contacts,
          document_settings: configToSave.documentSettings,
          version_label: configToSave.versionLabel,
        };

        const { error } = await browserSupabaseClient
          .from('build_guide_configs')
          .upsert(dbData, { onConflict: 'event_id' });

        if (error) {
          console.error('Error saving build guide config:', error);
        }
      } catch (error) {
        console.error('Error saving build guide config:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  }, [config]);

  return {
    config,
    isLoading,
    isSaving,
    saveConfig,
  };
};
