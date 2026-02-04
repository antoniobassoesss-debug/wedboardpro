import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface SquareTableData {
  size: number;
  unit: 'cm' | 'm';
  seats: number;
  quantity: number;
}

interface SquareTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SquareTableData) => void;
}

const SEAT_SIZE_CM = 45;
const SEAT_OFFSET_CM = 10;

export const SquareTableModal: React.FC<SquareTableModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [size, setSize] = useState(90);
  const [unit, setUnit] = useState<'cm' | 'm'>('cm');
  const [seats, setSeats] = useState(8);
  const [quantity, setQuantity] = useState(1);

  const handleSizeChange = useCallback((value: number) => {
    setSize(Math.max(60, Math.min(300, value)));
  }, []);

  const handleUnitChange = useCallback((newUnit: 'cm' | 'm') => {
    if (newUnit === 'm') {
      setSize(Math.round(size / 100));
    } else {
      setSize(size * 100);
    }
    setUnit(newUnit);
  }, [size]);

  const handleSubmit = useCallback(() => {
    const finalSize = unit === 'm' ? size * 100 : size;
    onSubmit({
      size: finalSize,
      unit,
      seats,
      quantity,
    });
    onClose();
  }, [size, unit, seats, quantity, onSubmit, onClose]);

  const previewData = useMemo(() => {
    const displaySize = unit === 'm' ? size * 100 : size;
    return {
      size: displaySize,
      seatSize: SEAT_SIZE_CM,
    };
  }, [unit, size]);

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
            Add Square Tables
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
              Size
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                value={unit === 'm' ? size : Math.round(size)}
                onChange={(e) => handleSizeChange(parseFloat(e.target.value) || 60)}
                style={{
                  flex: 1,
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                }}
                min={unit === 'm' ? 1 : 60}
                max={unit === 'm' ? 3 : 300}
              />
              <button
                onClick={() => handleUnitChange(unit === 'cm' ? 'm' : 'cm')}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f3f4f6',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                }}
              >
                {unit === 'cm' ? 'cm' : 'm'}
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
              Seats per table
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setSeats(Math.max(2, seats - 2))}
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
                onChange={(e) => setSeats(Math.max(2, parseInt(e.target.value) || 2))}
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
                onClick={() => setSeats(Math.min(20, seats + 2))}
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

          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <div style={{
              width: '100%',
              height: '140px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="100%" height="100%" viewBox="0 0 200 200">
                <defs>
                  <pattern id="gridSquare" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="200" height="200" fill="url(#gridSquare)" />

                <g transform="translate(100, 100)">
                  <rect
                    x={-Math.min(previewData.size * 0.35, 50)}
                    y={-Math.min(previewData.size * 0.35, 50)}
                    width={Math.min(previewData.size * 0.7, 100)}
                    height={Math.min(previewData.size * 0.7, 100)}
                    rx="4"
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth="2"
                  />

                  {Array.from({ length: Math.min(seats, 8) }).map((_, i) => {
                    const seatsPerSide = Math.floor(seats / 4);
                    const side = Math.floor(i / seatsPerSide);
                    const tableHalfSize = Math.min(previewData.size * 0.35, 50);
                    const seatOffset = 12;

                    let seatX = 0;
                    let seatY = 0;
                    let rotation = 0;

                    if (side === 0) {
                      seatX = 0;
                      seatY = -tableHalfSize - seatOffset;
                      rotation = 0;
                    } else if (side === 1) {
                      seatX = 0;
                      seatY = tableHalfSize + seatOffset;
                      rotation = 180;
                    } else if (side === 2) {
                      seatX = tableHalfSize + seatOffset;
                      seatY = 0;
                      rotation = -90;
                    } else if (side === 3) {
                      seatX = -tableHalfSize - seatOffset;
                      seatY = 0;
                      rotation = 90;
                    }

                    return (
                      <g key={i} transform={`rotate(${rotation}, ${seatX}, ${seatY})`}>
                        <circle
                          cx={seatX}
                          cy={seatY}
                          r={previewData.seatSize / 2}
                          fill="#ffffff"
                          stroke="#374151"
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              textAlign: 'center',
              marginTop: '8px',
            }}>
              {size}{unit} × {size}{unit} × {seats} seats
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0f172a',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: '#ffffff',
              }}
            >
              Add {quantity} table{quantity !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SquareTableModal;
