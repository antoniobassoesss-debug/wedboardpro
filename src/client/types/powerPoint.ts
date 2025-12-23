/**
 * PowerPoint type for electrical power outlets on the Layout Maker canvas.
 */
import type { ElectricalStandard } from './electrical';

export interface PowerPoint {
  id: string;
  x: number;
  y: number;
  electrical: boolean;
  standard: ElectricalStandard;
  breaker_amps: number;
  voltage: number;
  label?: string;
  // Link to electrical project/circuit in Supabase (optional)
  electricalProjectId?: string;
  circuitId?: string;
}

export const DEFAULT_EU_POWER_POINT: Omit<PowerPoint, 'id' | 'x' | 'y'> = {
  electrical: true,
  standard: 'EU_PT',
  breaker_amps: 16,
  voltage: 230,
};

export const DEFAULT_US_POWER_POINT: Omit<PowerPoint, 'id' | 'x' | 'y'> = {
  electrical: true,
  standard: 'US_NEC',
  breaker_amps: 15,
  voltage: 120,
};

export const createPowerPoint = (
  x: number,
  y: number,
  standard: ElectricalStandard = 'EU_PT'
): PowerPoint => {
  const defaults = standard === 'EU_PT' ? DEFAULT_EU_POWER_POINT : DEFAULT_US_POWER_POINT;
  return {
    id: `pp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    ...defaults,
    standard,
  };
};

