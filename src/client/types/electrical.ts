/**
 * TypeScript interfaces for GLOBAL Electrical Module tables (Supabase Postgres)
 * Supports EU/PT (RTE BT) + US (NEC) standards
 */

// ============================================================================
// Enums
// ============================================================================

/** Electrical standard toggle: EU/PT (RTE BT) or US (NEC) */
export type ElectricalStandard = 'EU_PT' | 'US_NEC';

/** Circuit status based on load vs capacity */
export type CircuitStatus = 'ok' | 'warning' | 'overload';

/** Chat message role */
export type ElectricalChatRole = 'user' | 'assistant' | 'system';

// ============================================================================
// Standard-specific constants
// ============================================================================

/** EU/PT (RTE BT) breaker options in Amps */
export const EU_PT_BREAKER_AMPS = [10, 16, 20, 25, 32, 40, 63] as const;
export type EuPtBreakerAmps = (typeof EU_PT_BREAKER_AMPS)[number];

/** US (NEC) breaker options in Amps */
export const US_NEC_BREAKER_AMPS = [15, 20, 25, 30, 40, 50] as const;
export type UsNecBreakerAmps = (typeof US_NEC_BREAKER_AMPS)[number];

/** EU/PT voltage */
export const EU_PT_VOLTAGE = 230;

/** US voltage */
export const US_NEC_VOLTAGE = 120;

/** Max outlets per standard */
export const MAX_OUTLETS: Record<ElectricalStandard, number> = {
  EU_PT: 8,
  US_NEC: 10,
};

// ============================================================================
// JSON type helper
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// ============================================================================
// Database Row Types
// ============================================================================

/** electrical_projects table row */
export interface ElectricalProjectRow {
  id: string; // uuid
  owner_id: string; // uuid (auth.users.id)
  layout_id: string | null; // uuid (optional link to layouts)
  event_id: string | null; // uuid (optional link to events)
  name: string;
  description: string | null;
  standard: ElectricalStandard;
  created_at: string; // timestamptz (ISO)
  updated_at: string; // timestamptz (ISO)
}

/** electrical_circuits table row */
export interface ElectricalCircuitRow {
  id: string; // uuid
  project_id: string; // uuid -> electrical_projects.id

  name: string;
  standard: ElectricalStandard;

  breaker_amps: number; // int (EU_PT: 10/16/20/25/32/40/63, US_NEC: 15/20/25/30/40/50)
  voltage: number; // int (EU_PT=230, US_NEC=120)

  total_watts: number; // int (computed via trigger)
  total_outlets: number; // int (computed via trigger)

  capacity_watts: number; // int (breaker_amps * voltage)
  recommended_max_watts: number; // int (floor(capacity_watts * 0.8))

  status: CircuitStatus;

  loads: Json; // jsonb array (cached, computed via trigger)

  created_at: string; // timestamptz (ISO)
  updated_at: string; // timestamptz (ISO)
}

/** electrical_loads table row */
export interface ElectricalLoadRow {
  id: string; // uuid
  circuit_id: string; // uuid -> electrical_circuits.id

  label: string;
  watts: number; // int (>=0) watts per unit
  quantity: number; // int (>=1)
  outlets_per_unit: number; // int (>=0)

  kind: string | null; // optional classification
  meta: Json; // jsonb

  created_at: string; // timestamptz (ISO)
  updated_at: string; // timestamptz (ISO)
}

/** electrical_chats table row */
export interface ElectricalChatRow {
  id: string; // uuid
  project_id: string; // uuid -> electrical_projects.id
  circuit_id: string | null; // uuid -> electrical_circuits.id (optional)

  role: ElectricalChatRole;
  content: string;

  created_at: string; // timestamptz (ISO)
}

// ============================================================================
// Insert/Update Types (omit auto-generated fields)
// ============================================================================

/** Insert payload for electrical_projects */
export interface ElectricalProjectInsert {
  owner_id: string;
  name: string;
  description?: string | null;
  standard?: ElectricalStandard;
  layout_id?: string | null;
  event_id?: string | null;
}

/** Update payload for electrical_projects */
export interface ElectricalProjectUpdate {
  name?: string;
  description?: string | null;
  standard?: ElectricalStandard;
  layout_id?: string | null;
  event_id?: string | null;
}

/** Insert payload for electrical_circuits */
export interface ElectricalCircuitInsert {
  project_id: string;
  name: string;
  standard?: ElectricalStandard; // defaults to project.standard if omitted
  breaker_amps: number;
  voltage: number;
}

/** Update payload for electrical_circuits */
export interface ElectricalCircuitUpdate {
  name?: string;
  breaker_amps?: number;
  voltage?: number;
  // Note: changing standard/breaker/voltage requires matching the constraint
}

/** Insert payload for electrical_loads */
export interface ElectricalLoadInsert {
  circuit_id: string;
  label: string;
  watts: number;
  quantity?: number;
  outlets_per_unit?: number;
  kind?: string | null;
  meta?: Json;
}

/** Update payload for electrical_loads */
export interface ElectricalLoadUpdate {
  label?: string;
  watts?: number;
  quantity?: number;
  outlets_per_unit?: number;
  kind?: string | null;
  meta?: Json;
}

/** Insert payload for electrical_chats */
export interface ElectricalChatInsert {
  project_id: string;
  circuit_id?: string | null;
  role: ElectricalChatRole;
  content: string;
}

// ============================================================================
// Cached Load Item (from circuit.loads JSONB)
// ============================================================================

/** Shape of each item in circuit.loads JSONB array */
export interface CachedLoadItem {
  id: string;
  label: string;
  kind: string | null;
  watts: number;
  quantity: number;
  outlets_per_unit: number;
  total_watts: number;
  total_outlets: number;
  meta: Json;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Get valid breaker options for a standard */
export function getBreakerOptions(standard: ElectricalStandard): readonly number[] {
  return standard === 'EU_PT' ? EU_PT_BREAKER_AMPS : US_NEC_BREAKER_AMPS;
}

/** Get voltage for a standard */
export function getVoltage(standard: ElectricalStandard): number {
  return standard === 'EU_PT' ? EU_PT_VOLTAGE : US_NEC_VOLTAGE;
}

/** Get max outlets for a standard */
export function getMaxOutlets(standard: ElectricalStandard): number {
  return MAX_OUTLETS[standard];
}

/** Calculate capacity in watts */
export function calculateCapacity(breakerAmps: number, voltage: number): number {
  return breakerAmps * voltage;
}

/** Calculate recommended max watts (80% of capacity) */
export function calculateRecommendedMax(capacityWatts: number): number {
  return Math.floor(capacityWatts * 0.8);
}

/** Determine circuit status based on load vs capacity */
export function determineCircuitStatus(
  totalWatts: number,
  capacityWatts: number,
  recommendedMaxWatts: number
): CircuitStatus {
  if (totalWatts > capacityWatts) return 'overload';
  if (totalWatts > recommendedMaxWatts) return 'warning';
  return 'ok';
}

