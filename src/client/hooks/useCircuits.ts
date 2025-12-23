/**
 * useCircuits - Fetches all circuits for an electrical project with realtime subscriptions.
 * Updates automatically when circuits or loads change in Supabase.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { browserSupabaseClient } from '../browserSupabaseClient.js';
import type { ElectricalStandard, CircuitStatus } from '../types/electrical.js';
import { MAX_OUTLETS } from '../types/electrical.js';

// ============================================================================
// Types
// ============================================================================

export interface CircuitSummary {
  id: string;
  name: string;
  standard: ElectricalStandard;
  breaker_amps: number;
  voltage: number;
  total_watts: number;
  total_outlets: number;
  capacity_watts: number;
  recommended_max_watts: number;
  status: CircuitStatus;
  max_outlets: number;
  load_percent: number;
  created_at: string;
  updated_at: string;
}

interface UseCircuitsOptions {
  projectId: string | null;
}

interface UseCircuitsReturn {
  circuits: CircuitSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export const useCircuits = (options: UseCircuitsOptions): UseCircuitsReturn => {
  const { projectId } = options;
  const [circuits, setCircuits] = useState<CircuitSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Fetch circuits from Supabase
  const fetchCircuits = useCallback(async () => {
    if (!projectId || !browserSupabaseClient) {
      setCircuits([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Ensure session
      const storedSession = localStorage.getItem('wedboarpro_session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session?.access_token && session?.refresh_token) {
          await browserSupabaseClient.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        }
      }

      // Fetch circuits for project
      const { data, error: fetchError } = await browserSupabaseClient
        .from('electrical_circuits')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Map to CircuitSummary with computed fields
      const summaries: CircuitSummary[] = (data || []).map((c: any) => {
        const maxOutlets = MAX_OUTLETS[c.standard as ElectricalStandard] || 8;
        const loadPercent = c.capacity_watts > 0 ? (c.total_watts / c.capacity_watts) * 100 : 0;

        return {
          id: c.id,
          name: c.name,
          standard: c.standard,
          breaker_amps: c.breaker_amps,
          voltage: c.voltage,
          total_watts: c.total_watts || 0,
          total_outlets: c.total_outlets || 0,
          capacity_watts: c.capacity_watts || 0,
          recommended_max_watts: c.recommended_max_watts || 0,
          status: c.status || 'ok',
          max_outlets: maxOutlets,
          load_percent: Math.round(loadPercent * 10) / 10,
          created_at: c.created_at,
          updated_at: c.updated_at,
        };
      });

      setCircuits(summaries);
    } catch (err: any) {
      console.error('[useCircuits] Fetch error:', err);
      setError(err?.message || 'Failed to fetch circuits');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    fetchCircuits();
  }, [fetchCircuits]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!projectId || !browserSupabaseClient) return;

    // Subscribe to changes on electrical_circuits for this project
    const channel = browserSupabaseClient
      .channel(`circuits-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'electrical_circuits',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: any) => {
          console.log('[useCircuits] Circuit change:', payload.eventType);
          // Refetch all circuits on any change
          fetchCircuits();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'electrical_loads',
        },
        (payload: any) => {
          // Loads trigger circuit recalculation via DB triggers
          // Just refetch circuits to get updated totals
          console.log('[useCircuits] Load change:', payload.eventType);
          fetchCircuits();
        }
      )
      .subscribe((status: string) => {
        console.log('[useCircuits] Subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        browserSupabaseClient?.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [projectId, fetchCircuits]);

  return {
    circuits,
    isLoading,
    error,
    refresh: fetchCircuits,
  };
};

export default useCircuits;

