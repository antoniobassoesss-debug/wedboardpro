/**
 * useCircuitCalculations - Fetches circuit + loads from Supabase and computes
 * P_max, P_safe, status, and progress percentage.
 */
import { useState, useEffect, useCallback } from 'react';
import { browserSupabaseClient } from '../browserSupabaseClient.js';
import type { ElectricalStandard, CircuitStatus } from '../types/electrical.js';
import {
  EU_PT_BREAKER_AMPS,
  US_NEC_BREAKER_AMPS,
  EU_PT_VOLTAGE,
  US_NEC_VOLTAGE,
  MAX_OUTLETS,
} from '../types/electrical.js';

interface ElectricalLoad {
  id: string;
  label: string;
  watts: number;
  quantity: number;
  outlets_per_unit: number;
  kind: string | null;
}

interface CircuitData {
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
  loads: any; // JSONB array from Supabase
}

interface UseCircuitCalculationsOptions {
  circuitId: string | null;
  /** If true, compute locally without fetching (for new/unsaved circuits) */
  localMode?: boolean;
  initialStandard?: ElectricalStandard;
  initialBreakerAmps?: number;
}

interface UseCircuitCalculationsReturn {
  // Data
  circuitId: string | null;
  standard: ElectricalStandard;
  breakerAmps: number;
  voltage: number;
  maxOutlets: number;
  totalWatts: number;
  totalOutlets: number;
  pMax: number;
  pSafe: number;
  status: CircuitStatus;
  progressPercent: number;
  loads: ElectricalLoad[];
  breakerOptions: readonly number[];

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  setStandard: (standard: ElectricalStandard) => void;
  setBreakerAmps: (amps: number) => void;
  addLoad: (load: Omit<ElectricalLoad, 'id'>) => void;
  removeLoad: (loadId: string) => void;
  refresh: () => Promise<void>;
}

export const useCircuitCalculations = (
  options: UseCircuitCalculationsOptions
): UseCircuitCalculationsReturn => {
  const { circuitId, localMode = false, initialStandard = 'EU_PT', initialBreakerAmps } = options;

  // Core state
  const [standard, setStandardInternal] = useState<ElectricalStandard>(initialStandard);
  const [breakerAmps, setBreakerAmpsInternal] = useState<number>(
    initialBreakerAmps ?? (initialStandard === 'EU_PT' ? EU_PT_BREAKER_AMPS[1] : US_NEC_BREAKER_AMPS[0])
  );
  const [loads, setLoads] = useState<ElectricalLoad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived values
  const voltage = standard === 'EU_PT' ? EU_PT_VOLTAGE : US_NEC_VOLTAGE;
  const maxOutlets = MAX_OUTLETS[standard];
  const breakerOptions = standard === 'EU_PT' ? EU_PT_BREAKER_AMPS : US_NEC_BREAKER_AMPS;

  // Calculate totals from loads
  const totalWatts = loads.reduce((sum, load) => sum + load.watts * load.quantity, 0);
  const totalOutlets = loads.reduce((sum, load) => sum + load.outlets_per_unit * load.quantity, 0);

  // Power calculations
  const pMax = breakerAmps * voltage;
  const pSafe = Math.floor(pMax * 0.8);

  // Status determination
  let status: CircuitStatus = 'ok';
  if (totalWatts > pMax) {
    status = 'overload';
  } else if (totalWatts > pSafe) {
    status = 'warning';
  }

  // Progress percentage (capped at 120% for visual overflow)
  const progressPercent = pMax > 0 ? Math.min(120, (totalWatts / pMax) * 100) : 0;

  // Fetch circuit data from Supabase
  const fetchCircuit = useCallback(async () => {
    if (localMode || !circuitId || !browserSupabaseClient) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get session
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

      // Fetch circuit
      const { data: circuitData, error: circuitError } = await browserSupabaseClient
        .from('electrical_circuits')
        .select('*')
        .eq('id', circuitId)
        .single();

      if (circuitError) throw circuitError;
      if (!circuitData) throw new Error('Circuit not found');

      const circuit = circuitData as CircuitData;

      // Update state from fetched data
      setStandardInternal(circuit.standard);
      setBreakerAmpsInternal(circuit.breaker_amps);

      // Parse loads from JSONB
      if (Array.isArray(circuit.loads)) {
        setLoads(
          circuit.loads.map((l: any) => ({
            id: l.id || `load-${Math.random().toString(36).substr(2, 9)}`,
            label: l.label || 'Unknown',
            watts: l.watts || 0,
            quantity: l.quantity || 1,
            outlets_per_unit: l.outlets_per_unit || 0,
            kind: l.kind || null,
          }))
        );
      }
    } catch (err: any) {
      console.error('[useCircuitCalculations] Fetch error:', err);
      setError(err?.message || 'Failed to fetch circuit');
    } finally {
      setIsLoading(false);
    }
  }, [circuitId, localMode]);

  // Initial fetch
  useEffect(() => {
    if (circuitId && !localMode) {
      fetchCircuit();
    }
  }, [circuitId, localMode, fetchCircuit]);

  // Standard change handler (updates breaker to valid option)
  const setStandard = useCallback((newStandard: ElectricalStandard) => {
    setStandardInternal(newStandard);
    const newBreakerOptions = newStandard === 'EU_PT' ? EU_PT_BREAKER_AMPS : US_NEC_BREAKER_AMPS;
    // Keep current breaker if valid, otherwise pick first option
    setBreakerAmpsInternal((prev) => {
      if (newBreakerOptions.includes(prev as any)) {
        return prev;
      }
      return newBreakerOptions[0];
    });
  }, []);

  // Breaker change handler
  const setBreakerAmps = useCallback((amps: number) => {
    setBreakerAmpsInternal(amps);
  }, []);

  // Add load (local only for now)
  const addLoad = useCallback((load: Omit<ElectricalLoad, 'id'>) => {
    const newLoad: ElectricalLoad = {
      ...load,
      id: `load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setLoads((prev) => [...prev, newLoad]);
  }, []);

  // Remove load (local only for now)
  const removeLoad = useCallback((loadId: string) => {
    setLoads((prev) => prev.filter((l) => l.id !== loadId));
  }, []);

  return {
    circuitId,
    standard,
    breakerAmps,
    voltage,
    maxOutlets,
    totalWatts,
    totalOutlets,
    pMax,
    pSafe,
    status,
    progressPercent,
    loads,
    breakerOptions,
    isLoading,
    error,
    setStandard,
    setBreakerAmps,
    addLoad,
    removeLoad,
    refresh: fetchCircuit,
  };
};

export default useCircuitCalculations;

