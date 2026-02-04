/**
 * Auto-Sync Hook
 *
 * Automatically syncs canvas data to Supabase with debouncing.
 * - 2-second debounce after last change
 * - Retry with exponential backoff on failure
 * - Offline detection and queuing
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { saveLayout } from '../../client/api/layoutsApi';

const SYNC_DEBOUNCE_MS = 2000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

interface UseAutoSyncOptions {
  enabled?: boolean;
  projectName?: string;
  eventId?: string;
}

export function useAutoSync(options: UseAutoSyncOptions = {}) {
  const { enabled = true, projectName, eventId } = options;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedDataRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const isSyncingRef = useRef(false);

  // Subscribe to store state
  const activeProjectId = useCanvasStore((s) => s.activeProjectId);
  const supabaseLayoutId = useCanvasStore((s) => s.supabaseLayoutId);
  const pendingChanges = useCanvasStore((s) => s.pendingChanges);
  const getCanvasData = useCanvasStore((s) => s.getCanvasData);
  const setSyncStatus = useCanvasStore((s) => s.setSyncStatus);
  const setSyncError = useCanvasStore((s) => s.setSyncError);
  const markSynced = useCanvasStore((s) => s.markSynced);
  const setSupabaseLayoutId = useCanvasStore((s) => s.setSupabaseLayoutId);

  const syncToSupabase = useCallback(async () => {
    console.log('[AutoSync] syncToSupabase called, activeProjectId:', activeProjectId, 'supabaseLayoutId:', supabaseLayoutId);
    if (isSyncingRef.current) {
      console.log('[AutoSync] Already syncing, skipping');
      return;
    }
    if (!activeProjectId) {
      console.log('[AutoSync] No activeProjectId, skipping');
      return;
    }

    const canvasData = getCanvasData();
    console.log('[AutoSync] getCanvasData returned:', {
      drawings: canvasData.drawings?.length || 0,
      shapes: canvasData.shapes?.length || 0,
      walls: canvasData.walls?.length || 0,
    });
    const currentDataString = JSON.stringify(canvasData);

    // Skip if data hasn't actually changed
    if (currentDataString === lastSyncedDataRef.current) {
      setSyncStatus('saved');
      return;
    }

    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const saveInput: Parameters<typeof saveLayout>[0] = {
        name: projectName || `Project ${activeProjectId}`,
        canvasData: canvasData as any,
      };
      if (supabaseLayoutId) saveInput.layoutId = supabaseLayoutId;
      if (eventId) saveInput.eventId = eventId;

      console.log('[AutoSync] Saving to Supabase:', {
        layoutId: supabaseLayoutId,
        projectName,
        drawings: (canvasData as any).drawings?.length || 0,
        shapes: (canvasData as any).shapes?.length || 0,
      });

      const result = await saveLayout(saveInput);
      console.log('[AutoSync] Save result:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      // Store the new layout ID if this was a new layout
      if (result.data && !supabaseLayoutId) {
        setSupabaseLayoutId(result.data.id);
      }

      lastSyncedDataRef.current = currentDataString;
      retryCountRef.current = 0;
      markSynced(Date.now());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      console.error('[useAutoSync] Sync failed:', errorMessage);

      // Retry logic with exponential backoff
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCountRef.current - 1);

        setSyncStatus('pending');
        console.log(`[useAutoSync] Retrying in ${retryDelay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`);

        setTimeout(() => {
          isSyncingRef.current = false;
          syncToSupabase();
        }, retryDelay);
        return;
      }

      // Max retries exceeded
      setSyncStatus('error');
      setSyncError(errorMessage);
    } finally {
      isSyncingRef.current = false;
    }
  }, [
    activeProjectId,
    supabaseLayoutId,
    projectName,
    eventId,
    getCanvasData,
    setSyncStatus,
    setSyncError,
    markSynced,
    setSupabaseLayoutId,
  ]);

  // Main sync effect
  useEffect(() => {
    if (!enabled || !activeProjectId || !pendingChanges) {
      return;
    }

    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setSyncStatus('pending');

    // Set up debounced sync
    debounceRef.current = setTimeout(() => {
      syncToSupabase();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [enabled, activeProjectId, pendingChanges, syncToSupabase, setSyncStatus]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useAutoSync] Back online, checking for pending changes');
      const { pendingChanges } = useCanvasStore.getState();
      if (pendingChanges) {
        syncToSupabase();
      }
    };

    const handleOffline = () => {
      console.log('[useAutoSync] Went offline');
      setSyncStatus('pending');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncToSupabase, setSyncStatus]);

  // Cleanup on unmount - force save if there are pending changes
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      const { pendingChanges, activeProjectId } = useCanvasStore.getState();
      if (pendingChanges && activeProjectId) {
        // Fire and forget - we're unmounting
        syncToSupabase();
      }
    };
  }, [syncToSupabase]);

  // Expose force sync function
  const forceSave = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    await syncToSupabase();
  }, [syncToSupabase]);

  return {
    forceSave,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
}

/**
 * Hook to display sync status information
 */
export function useSyncStatusDisplay() {
  const syncStatus = useCanvasStore((s) => s.syncStatus);
  const syncError = useCanvasStore((s) => s.syncError);
  const lastSyncedAt = useCanvasStore((s) => s.lastSyncedAt);

  const statusConfig = {
    idle: {
      icon: '○',
      text: 'Ready',
      color: '#6b7280',
      spin: false,
    },
    pending: {
      icon: '●',
      text: 'Unsaved changes',
      color: '#f59e0b',
      spin: false,
    },
    syncing: {
      icon: '◐',
      text: 'Saving...',
      color: '#3b82f6',
      spin: true,
    },
    saved: {
      icon: '●',
      text: 'Saved',
      color: '#10b981',
      spin: false,
    },
    error: {
      icon: '●',
      text: syncError || 'Sync error',
      color: '#ef4444',
      spin: false,
    },
  };

  const config = statusConfig[syncStatus];

  const getLastSyncedText = () => {
    if (!lastSyncedAt) return null;
    const diff = Date.now() - lastSyncedAt;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return {
    status: syncStatus,
    icon: config.icon,
    text: config.text,
    color: config.color,
    spin: config.spin,
    lastSyncedText: getLastSyncedText(),
    hasError: syncStatus === 'error',
    isSyncing: syncStatus === 'syncing',
    isPending: syncStatus === 'pending',
    isSaved: syncStatus === 'saved',
  };
}
