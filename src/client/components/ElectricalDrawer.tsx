/**
 * ElectricalDrawer - Minimalist right-side panel for power point configuration.
 */
import React, { useState } from 'react';
import type { PowerPoint } from '../types/powerPoint';
import type { ElectricalStandard } from '../types/electrical';
import { MAX_OUTLETS } from '../types/electrical';
import ElectricalBreakerCalculator from './ElectricalBreakerCalculator';
import ElectricalAIChat from './ElectricalAIChat';

interface ElectricalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  powerPoint: PowerPoint | null;
  onUpdate: (updated: PowerPoint) => void;
  onDelete: (id: string) => void;
}

const STANDARDS: { value: ElectricalStandard; label: string }[] = [
  { value: 'EU_PT', label: 'EU (230V)' },
  { value: 'US_NEC', label: 'US (120V)' },
];

const BREAKER_OPTIONS = {
  EU_PT: [10, 16, 20, 25, 32, 40, 63],
  US_NEC: [15, 20, 25, 30, 40, 50],
};

const ElectricalDrawer: React.FC<ElectricalDrawerProps> = ({
  isOpen,
  onClose,
  powerPoint,
  onUpdate,
  onDelete,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isOpen || !powerPoint) return null;

  const maxOutlets = MAX_OUTLETS[powerPoint.standard];
  const capacityWatts = (powerPoint.breaker_amps || 16) * (powerPoint.voltage || 230);

  const handleStandardChange = (standard: ElectricalStandard) => {
    const breakers = BREAKER_OPTIONS[standard];
    onUpdate({
      ...powerPoint,
      standard,
      breaker_amps: breakers[0] || 16,
      voltage: standard === 'EU_PT' ? 230 : 120,
    });
  };

  const handleLoadConfirmed = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 200000,
        }}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '420px',
          height: '100vh',
          background: '#ffffff',
          borderLeft: '1px solid #e5e7eb',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
          zIndex: 200001,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              Power Point
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Configure outlet
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: '#f3f4f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {/* Label */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Label
            </label>
            <input
              type="text"
              value={powerPoint.label || ''}
              onChange={(e) => onUpdate({ ...powerPoint, label: e.target.value })}
              placeholder="e.g., Dance floor, DJ booth"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Standard */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Standard
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {STANDARDS.map((std) => (
                <button
                  key={std.value}
                  onClick={() => handleStandardChange(std.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: powerPoint.standard === std.value ? '2px solid #111827' : '1px solid #d1d5db',
                    background: powerPoint.standard === std.value ? '#111827' : '#ffffff',
                    color: powerPoint.standard === std.value ? '#ffffff' : '#374151',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {std.label}
                </button>
              ))}
            </div>
          </div>

          {/* Breaker */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              Breaker (Amps)
            </label>
            <select
              value={powerPoint.breaker_amps}
              onChange={(e) => onUpdate({ ...powerPoint, breaker_amps: parseInt(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                outline: 'none',
                background: '#ffffff',
                cursor: 'pointer',
              }}
            >
              {BREAKER_OPTIONS[powerPoint.standard].map((amps) => (
                <option key={amps} value={amps}>
                  {amps}A
                </option>
              ))}
            </select>
          </div>

          {/* Capacity Info */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Capacity</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                {capacityWatts}W
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Max outlets</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                {maxOutlets}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Voltage</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                {powerPoint.voltage}V
              </span>
            </div>
          </div>

          {/* AI Assistant Section */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>AI Electrical Assistant</span>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px' }}>
              Get help with electrical rules, load calculations, and safety.
            </p>
          </div>

          {/* AI Chat */}
          <div style={{ height: '320px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <ElectricalAIChat
              key={refreshKey}
              circuitId={powerPoint.circuitId || null}
              standard={powerPoint.standard}
              breakerAmps={powerPoint.breaker_amps || 16}
              voltage={powerPoint.voltage || 230}
              maxOutlets={maxOutlets}
              currentWatts={0}
              currentOutlets={0}
              onConfirmed={handleLoadConfirmed}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            onClick={() => onDelete(powerPoint.id)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              background: '#ffffff',
              color: '#ef4444',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: '#111827',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
};

export default ElectricalDrawer;
