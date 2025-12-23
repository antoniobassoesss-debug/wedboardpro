/**
 * ElectricalBreakerCalculator - Standards toggle + breaker selector with real-time calculations.
 * Features glassmorphism UI, shadcn Select/Badge/Progress, and live P_max/P_safe display.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Select } from './ui/select.js';
import { Badge } from './ui/badge.js';
import { Progress } from './ui/progress.js';
import { useCircuitCalculations } from '../hooks/useCircuitCalculations.js';
import type { ElectricalStandard, CircuitStatus } from '../types/electrical.js';

interface ElectricalBreakerCalculatorProps {
  /** Circuit ID to fetch from Supabase. If null, uses local-only mode. */
  circuitId?: string | null;
  /** Initial standard for local mode */
  initialStandard?: ElectricalStandard;
  /** Initial breaker amps for local mode */
  initialBreakerAmps?: number;
  /** Callback when standard or breaker changes */
  onChange?: (data: { standard: ElectricalStandard; breakerAmps: number; voltage: number }) => void;
}

const statusConfig: Record<CircuitStatus, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  ok: { label: 'OK', variant: 'success' },
  warning: { label: 'Warning', variant: 'warning' },
  overload: { label: 'OVERLOAD', variant: 'destructive' },
};

const ElectricalBreakerCalculator: React.FC<ElectricalBreakerCalculatorProps> = ({
  circuitId = null,
  initialStandard = 'EU_PT',
  initialBreakerAmps,
  onChange,
}) => {
  const {
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
    breakerOptions,
    isLoading,
    error,
    setStandard,
    setBreakerAmps,
  } = useCircuitCalculations({
    circuitId,
    localMode: !circuitId,
    initialStandard,
    initialBreakerAmps,
  });

  const handleStandardChange = (newStandard: ElectricalStandard) => {
    setStandard(newStandard);
    const newVoltage = newStandard === 'EU_PT' ? 230 : 120;
    const newBreakerOptions = newStandard === 'EU_PT' ? [10, 16, 20, 25, 32, 40, 63] : [15, 20, 25, 30, 40, 50];
    const newBreaker = newBreakerOptions.includes(breakerAmps) ? breakerAmps : newBreakerOptions[0];
    onChange?.({ standard: newStandard, breakerAmps: newBreaker, voltage: newVoltage });
  };

  const handleBreakerChange = (value: string) => {
    const amps = parseInt(value, 10);
    setBreakerAmps(amps);
    onChange?.({ standard, breakerAmps: amps, voltage });
  };

  const progressVariant = status === 'ok' ? 'success' : status === 'warning' ? 'warning' : 'destructive';
  const statusInfo = statusConfig[status];

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.98) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        padding: '20px',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>Circuit Calculator</span>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>Loading circuit...</div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#ef4444', fontSize: '13px' }}>{error}</div>
      )}

      {!isLoading && !error && (
        <>
          {/* Standards Toggle */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '8px' }}>
              Electrical Standard
            </label>
            <div
              style={{
                display: 'flex',
                gap: '6px',
                padding: '4px',
                background: 'rgba(0,0,0,0.04)',
                borderRadius: '10px',
              }}
            >
              {[
                { id: 'EU_PT' as ElectricalStandard, flag: '🇪🇺', label: 'EU/PT', sublabel: '230V' },
                { id: 'US_NEC' as ElectricalStandard, flag: '🇺🇸', label: 'US', sublabel: '120V' },
              ].map((option) => (
                <motion.button
                  key={option.id}
                  onClick={() => handleStandardChange(option.id)}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: standard === option.id
                      ? 'linear-gradient(135deg, white 0%, #fefefe 100%)'
                      : 'transparent',
                    boxShadow: standard === option.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{option.flag}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{option.label}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>{option.sublabel}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Breaker Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '8px' }}>
              Circuit Breaker
            </label>
            <Select
              value={String(breakerAmps)}
              onValueChange={handleBreakerChange}
              options={breakerOptions.map((a) => ({ value: String(a), label: `${a}A` }))}
              placeholder="Select breaker..."
            />
          </div>

          {/* Power Readouts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.15)',
              }}
            >
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Max Capacity</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>{pMax.toLocaleString()}W</div>
            </div>
            <div
              style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.15)',
              }}
            >
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Safe Load (80%)</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{pSafe.toLocaleString()}W</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Current Load</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                {totalWatts.toLocaleString()}W / {pMax.toLocaleString()}W
              </span>
            </div>
            <Progress value={Math.min(100, progressPercent)} variant={progressVariant} height={10} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>0W</span>
              <span style={{ fontSize: '11px', color: '#f59e0b' }}>{pSafe.toLocaleString()}W</span>
              <span style={{ fontSize: '11px', color: '#ef4444' }}>{pMax.toLocaleString()}W</span>
            </div>
          </div>

          {/* Outlet Count */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '10px',
              background: totalOutlets > maxOutlets ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${totalOutlets > maxOutlets ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Outlets</span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: totalOutlets > maxOutlets ? '#ef4444' : '#1f2937',
              }}
            >
              {totalOutlets} / {maxOutlets} max
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default ElectricalBreakerCalculator;

