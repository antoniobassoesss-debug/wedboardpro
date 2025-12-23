/**
 * ElectricalDrawer - Right-side sliding drawer for electrical point configuration.
 * Glassmorphism backdrop, breaker calculator, and embedded AI chat for load validation.
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PowerPoint } from '../types/powerPoint';
import type { ElectricalStandard } from '../types/electrical';
import { MAX_OUTLETS } from '../types/electrical';
import ElectricalBreakerCalculator from './ElectricalBreakerCalculator.js';
import ElectricalAIChat from './ElectricalAIChat.js';
import { useCircuitCalculations } from '../hooks/useCircuitCalculations.js';

interface ElectricalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  powerPoint: PowerPoint | null;
  onUpdate: (updated: PowerPoint) => void;
  onDelete: (id: string) => void;
}

const ElectricalDrawer: React.FC<ElectricalDrawerProps> = ({
  isOpen,
  onClose,
  powerPoint,
  onUpdate,
  onDelete,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Use circuit calculations hook to get current totals (for circuits linked to Supabase)
  const circuitCalcs = useCircuitCalculations({
    circuitId: powerPoint?.circuitId || null,
    localMode: !powerPoint?.circuitId,
    initialStandard: powerPoint?.standard || 'EU_PT',
    initialBreakerAmps: powerPoint?.breaker_amps,
  });

  if (!powerPoint) return null;

  const handleCalculatorChange = (data: { standard: ElectricalStandard; breakerAmps: number; voltage: number }) => {
    onUpdate({
      ...powerPoint,
      standard: data.standard,
      breaker_amps: data.breakerAmps,
      voltage: data.voltage,
    });
  };

  const handleLabelChange = (label: string) => {
    onUpdate({ ...powerPoint, label });
  };

  // Refresh circuit calculations after a load is confirmed
  const handleLoadConfirmed = useCallback(() => {
    circuitCalcs.refresh();
    setRefreshKey((k) => k + 1);
  }, [circuitCalcs]);

  // Get current values from hook or fallback to power point values
  const currentWatts = circuitCalcs.totalWatts;
  const currentOutlets = circuitCalcs.totalOutlets;
  const maxOutlets = MAX_OUTLETS[powerPoint.standard];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with glassmorphism */}
          <motion.div
            className="electrical-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 50000,
            }}
          />

          {/* Drawer panel */}
          <motion.div
            className="electrical-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '420px',
              maxWidth: '90vw',
              height: '100vh',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
              zIndex: 50001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '24px',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                background: 'linear-gradient(180deg, rgba(245,158,11,0.08) 0%, transparent 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>⚡</span>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
                      Power Point
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                      Configure electrical settings
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#6b7280',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {/* Label Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={powerPoint.label || ''}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="e.g., DJ Booth, Stage Left..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    background: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#f59e0b';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Electrical Breaker Calculator - Toggle, Breaker, Capacity, Progress */}
              <div style={{ marginBottom: '24px' }}>
                <ElectricalBreakerCalculator
                  circuitId={powerPoint.circuitId || null}
                  initialStandard={powerPoint.standard}
                  initialBreakerAmps={powerPoint.breaker_amps}
                  onChange={handleCalculatorChange}
                />
              </div>

              {/* AI Electrical Chat - Load validation and addition */}
              <div style={{ height: '400px', marginBottom: '16px' }}>
                <ElectricalAIChat
                  key={refreshKey}
                  circuitId={powerPoint.circuitId || null}
                  standard={powerPoint.standard}
                  breakerAmps={powerPoint.breaker_amps}
                  voltage={powerPoint.voltage}
                  maxOutlets={maxOutlets}
                  currentWatts={currentWatts}
                  currentOutlets={currentOutlets}
                  onConfirmed={handleLoadConfirmed}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(0,0,0,0.08)',
                display: 'flex',
                gap: '12px',
              }}
            >
              <button
                onClick={() => onDelete(powerPoint.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #ef4444',
                  background: 'white',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                Delete Point
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                }}
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ElectricalDrawer;

