import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface RoundTableData {
  diameter: number;
  unit: 'cm' | 'm';
  seats: number;
  quantity: number;
}

interface RoundTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RoundTableData) => void;
}

const SEAT_SIZE_CM = 45;
const SEAT_OFFSET_CM = 10;

export const RoundTableModal: React.FC<RoundTableModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [diameter, setDiameter] = useState(150);
  const [unit, setUnit] = useState<'cm' | 'm'>('cm');
  const [seats, setSeats] = useState(8);
  const [quantity, setQuantity] = useState(1);

  const handleDiameterChange = useCallback((value: number) => {
    setDiameter(Math.max(60, Math.min(300, value)));
  }, []);

  const handleUnitChange = useCallback((newUnit: 'cm' | 'm') => {
    if (newUnit === 'm') {
      setDiameter(Math.round(diameter / 100));
    } else {
      setDiameter(diameter * 100);
    }
    setUnit(newUnit);
  }, [diameter]);

  const handleSubmit = useCallback(() => {
    // Always convert to cm for consistency, then pass unit as 'cm'
    const finalDiameter = unit === 'm' ? diameter * 100 : diameter;
    onSubmit({
      diameter: finalDiameter,
      unit: 'cm',  // Always cm since we converted above
      seats,
      quantity,
    });
    onClose();
  }, [diameter, unit, seats, quantity, onSubmit, onClose]);

  const previewData = useMemo(() => {
    const displayDiameter = unit === 'm' ? diameter * 100 : diameter;
    return {
      tableRadius: displayDiameter / 2,
      seatRadius: displayDiameter / 2 + SEAT_OFFSET_CM,
      seatSize: SEAT_SIZE_CM,
    };
  }, [unit, diameter]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [onClose, handleSubmit]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '400px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onKeyDown={handleKeyDown}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
          }}>
            Add Round Tables
          </h2>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '8px',
            }}>
              Quantity
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <path d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '60px',
                  height: '36px',
                  textAlign: 'center',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                }}
                min="1"
                max="20"
              />
              <button
                onClick={() => setQuantity(Math.min(20, quantity + 1))}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <path d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '8px',
            }}>
              Diameter
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                value={unit === 'm' ? diameter : Math.round(diameter)}
                onChange={(e) => handleDiameterChange(parseFloat(e.target.value) || 60)}
                style={{
                  flex: 1,
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                }}
                min={unit === 'm' ? 0.6 : 60}
                max={unit === 'm' ? 3 : 300}
                step={unit === 'm' ? 0.1 : 10}
              />
              <select
                value={unit}
                onChange={(e) => handleUnitChange(e.target.value as 'cm' | 'm')}
                style={{
                  width: '70px',
                  height: '36px',
                  padding: '0 8px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="cm">cm</option>
                <option value="m">m</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '8px',
            }}>
              Seats per Table
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setSeats(Math.max(2, seats - 1))}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <path d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                value={seats}
                onChange={(e) => setSeats(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                style={{
                  width: '60px',
                  height: '36px',
                  textAlign: 'center',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                }}
                min="2"
                max="20"
              />
              <button
                onClick={() => setSeats(Math.min(20, seats + 1))}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <path d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{
              height: '130px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              overflow: 'hidden',
            }}>
              <svg width="100%" height="100%" viewBox="0 0 200 200">
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="200" height="200" fill="url(#grid)" />

                <g transform="translate(100, 100)">
                  {Array.from({ length: Math.min(seats, 10) }).map((_, i) => {
                    const angle = (i / Math.min(seats, 10)) * Math.PI * 2 - Math.PI / 2;
                    const seatX = Math.cos(angle) * previewData.seatRadius;
                    const seatY = Math.sin(angle) * previewData.seatRadius;

                    return (
                      <g key={i}>
                        <circle
                          cx={seatX}
                          cy={seatY}
                          r={previewData.seatSize / 2}
                          fill="#ffffff"
                          stroke="#374151"
                          strokeWidth="1"
                        />
                        <line
                          x1={Math.cos(angle) * previewData.tableRadius}
                          y1={Math.sin(angle) * previewData.tableRadius}
                          x2={seatX}
                          y2={seatY}
                          stroke="#d1d5db"
                          strokeWidth="0.5"
                        />
                      </g>
                    );
                  })}

                  <circle
                    cx={0}
                    cy={0}
                    r={previewData.tableRadius}
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth="2"
                  />
                  <line x1="-5" y1="0" x2="5" y2="0" stroke="#1f2937" strokeWidth="1.5" />
                  <line x1="0" y1="-5" x2="0" y2="5" stroke="#1f2937" strokeWidth="1.5" />
                </g>
              </svg>
            </div>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              textAlign: 'center',
              marginTop: '8px',
            }}>
              {diameter}{unit} diameter × {seats} seats
            </p>
          </div>

          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '14px', color: '#4b5563' }}>Total capacity</span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              {quantity * seats} guests
            </span>
          </div>
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#4b5563',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            Add {quantity} table{quantity > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default RoundTableModal;
