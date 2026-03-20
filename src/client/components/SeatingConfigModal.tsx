/**
 * Seating Config Modal
 *
 * Form + live SVG preview for placing individual seat elements:
 * - Standard Chair, Armchair, Chaise Longue, Sofa (2–3 seats), Bench
 * - Label, Width, Depth (meters), Fill color
 * - Seat count selector for Sofa
 * - Quantity (creation mode only)
 * - Bench length presets
 * - Editing mode: pre-populated from existing shape, "Save Changes" instead of "Add"
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ElementType } from '../../layout-maker/types/elements';
import { ELEMENT_DEFAULTS } from '../../layout-maker/constants';

const DEFAULT_FILL = '#D4C5B0';
const STROKE_COLOR = '#8B7355';

const COLOR_PRESETS = [
  '#D4C5B0', '#f5f0eb', '#E8D5B7', '#C4A882',
  '#B5C4B1', '#D4B5B5', '#B5C4D4', '#1a1a1a',
];

const BENCH_PRESETS = [
  { label: '1.5 m', widthM: 1.5 },
  { label: '2 m',   widthM: 2.0 },
  { label: '3 m',   widthM: 3.0 },
];

const SOFA_SEAT_WIDTHS: Record<2 | 3, number> = { 2: 1.50, 3: 2.10 };

export interface SeatingItem {
  elementType: ElementType;
  widthM: number;
  heightM: number;
  label: string;
  fill: string;
  count: number;
}

export interface SeatingEditingShape {
  id: string;
  elementType: ElementType;
  widthPx: number;
  heightPx: number;
  fill: string;
  label?: string;
}

interface SeatingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  elementType: ElementType;
  onPlaceSeats: (elements: SeatingItem[]) => void;
  // Editing mode
  editingShape?: SeatingEditingShape | null;
  onUpdateSeat?: (shapeId: string, widthM: number, heightM: number, fill: string, label: string, elementType: ElementType) => void;
  pixelsPerMeter?: number;
}

// ── Live SVG Preview ───────────────────────────────────────────────────────────

interface SeatPreviewProps {
  type: ElementType;
  widthM: number;
  heightM: number;
  fill: string;
  seatCount: 2 | 3;
}

const SeatPreview: React.FC<SeatPreviewProps> = ({ type, widthM, heightM, fill, seatCount }) => {
  const SIZE = 160;
  const PAD = 18;
  const aspect = widthM / Math.max(heightM, 0.01);
  let pw: number, ph: number;
  if (aspect > 1) {
    pw = SIZE - PAD * 2;
    ph = pw / aspect;
  } else {
    ph = SIZE - PAD * 2;
    pw = ph * aspect;
  }
  const px = (SIZE - pw) / 2;
  const py = (SIZE - ph) / 2;
  const sw = 1.8;
  const stroke = STROKE_COLOR;

  // For seat-sofa, resolve to 2 or 3 seat variant
  const et = type === 'seat-sofa' ? (seatCount === 3 ? 'seat-sofa-3' : 'seat-sofa-2') : type;

  return (
    <svg
      width={SIZE} height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ display: 'block', borderRadius: 10, background: '#f1f5f9' }}
    >
      {et === 'seat-standard' && (
        <>
          <rect x={px} y={py + ph * 0.42} width={pw} height={ph * 0.58} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px} y={py} width={pw} height={ph * 0.44} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
        </>
      )}
      {et === 'seat-armchair' && (
        <>
          <rect x={px + pw * 0.18} y={py + ph * 0.4} width={pw * 0.64} height={ph * 0.6} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px + pw * 0.18} y={py} width={pw * 0.64} height={ph * 0.42} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px} y={py + ph * 0.36} width={pw * 0.2} height={ph * 0.64} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px + pw * 0.8} y={py + ph * 0.36} width={pw * 0.2} height={ph * 0.64} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
        </>
      )}
      {et === 'seat-chaise' && (
        <>
          <rect x={px} y={py + ph * 0.3} width={pw * 0.78} height={ph * 0.7} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px + pw * 0.76} y={py} width={pw * 0.24} height={ph} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
        </>
      )}
      {et === 'seat-sofa-2' && (
        <>
          <rect x={px} y={py} width={pw} height={ph * 0.35} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px} y={py + ph * 0.33} width={pw * 0.11} height={ph * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px + pw * 0.89} y={py + ph * 0.33} width={pw * 0.11} height={ph * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px + pw * 0.11} y={py + ph * 0.33} width={pw * 0.78} height={ph * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <line x1={px + pw * 0.5} y1={py + ph * 0.33} x2={px + pw * 0.5} y2={py + ph} stroke={stroke} strokeWidth={0.8} opacity={0.5} />
        </>
      )}
      {et === 'seat-sofa-3' && (
        <>
          <rect x={px} y={py} width={pw} height={ph * 0.35} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px} y={py + ph * 0.33} width={pw * 0.08} height={ph * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px + pw * 0.92} y={py + ph * 0.33} width={pw * 0.08} height={ph * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={px + pw * 0.08} y={py + ph * 0.33} width={pw * 0.84} height={ph * 0.67} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} />
          <line x1={px + pw * 0.08 + pw * 0.84 / 3} y1={py + ph * 0.33} x2={px + pw * 0.08 + pw * 0.84 / 3} y2={py + ph} stroke={stroke} strokeWidth={0.8} opacity={0.5} />
          <line x1={px + pw * 0.08 + pw * 0.84 * 2 / 3} y1={py + ph * 0.33} x2={px + pw * 0.08 + pw * 0.84 * 2 / 3} y2={py + ph} stroke={stroke} strokeWidth={0.8} opacity={0.5} />
        </>
      )}
      {et === 'seat-bench' && (
        <rect x={px} y={py + ph * 0.2} width={pw} height={ph * 0.6} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
      )}
    </svg>
  );
};

// ── Modal ──────────────────────────────────────────────────────────────────────

export const SeatingConfigModal: React.FC<SeatingConfigModalProps> = ({
  isOpen,
  onClose,
  elementType,
  onPlaceSeats,
  editingShape = null,
  onUpdateSeat,
  pixelsPerMeter = 100,
}) => {
  const isEditing = !!editingShape;

  // Resolve display type for sofa variants (seat-sofa-2/3 both map to seat-sofa in the UI)
  const displayType: ElementType = (elementType === 'seat-sofa-2' || elementType === 'seat-sofa-3')
    ? 'seat-sofa'
    : elementType;

  const defaults = ELEMENT_DEFAULTS[displayType as keyof typeof ELEMENT_DEFAULTS]
    ?? ELEMENT_DEFAULTS[elementType as keyof typeof ELEMENT_DEFAULTS];

  // Determine initial seat count from editing shape or type
  const initSeatCount = (): 2 | 3 => {
    if (editingShape?.elementType === 'seat-sofa-3') return 3;
    if (elementType === 'seat-sofa-3') return 3;
    return 2;
  };

  const [label,     setLabel]     = useState(editingShape?.label || defaults?.label || '');
  const [widthM,    setWidthM]    = useState(editingShape ? editingShape.widthPx / pixelsPerMeter : (defaults?.width  ?? 0.45));
  const [heightM,   setHeightM]   = useState(editingShape ? editingShape.heightPx / pixelsPerMeter : (defaults?.height ?? 0.45));
  const [fill,      setFill]      = useState(editingShape?.fill || DEFAULT_FILL);
  const [seatCount, setSeatCount] = useState<2 | 3>(initSeatCount());
  const [quantity,  setQuantity]  = useState(1);

  // Reset state when modal opens or elementType changes
  useEffect(() => {
    if (!isOpen) return;
    const sc = initSeatCount();
    setSeatCount(sc);
    if (editingShape) {
      setLabel(editingShape.label || defaults?.label || '');
      setWidthM(editingShape.widthPx / pixelsPerMeter);
      setHeightM(editingShape.heightPx / pixelsPerMeter);
      setFill(editingShape.fill || DEFAULT_FILL);
    } else {
      setLabel(defaults?.label || '');
      const sofaW = displayType === 'seat-sofa' ? SOFA_SEAT_WIDTHS[sc] : (defaults?.width ?? 0.45);
      setWidthM(sofaW);
      setHeightM(defaults?.height ?? 0.45);
      setFill(DEFAULT_FILL);
      setQuantity(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, elementType]);

  // When seat count changes for sofa, update suggested width
  const handleSeatCountChange = (count: 2 | 3) => {
    setSeatCount(count);
    setWidthM(SOFA_SEAT_WIDTHS[count]);
  };

  const typeLabel = defaults?.label ?? String(elementType);
  const isBench   = displayType === 'seat-bench';
  const isSofa    = displayType === 'seat-sofa';

  const handleConfirm = () => {
    if (isEditing && editingShape && onUpdateSeat) {
      const placedType: ElementType = isSofa
        ? (seatCount === 3 ? 'seat-sofa-3' : 'seat-sofa-2')
        : elementType;
      onUpdateSeat(editingShape.id, widthM, heightM, fill, label || typeLabel, placedType);
    } else {
      const placedType: ElementType = isSofa
        ? (seatCount === 3 ? 'seat-sofa-3' : 'seat-sofa-2')
        : elementType;
      onPlaceSeats([{
        elementType: placedType,
        widthM,
        heightM,
        label: label || typeLabel,
        fill,
        count: quantity,
      }]);
    }
    onClose();
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: 13,
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6,
  };

  const content = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 560, maxWidth: '95vw',
        background: '#ffffff', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              {isEditing ? `Edit ${typeLabel}` : `Add ${typeLabel}`}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              {isEditing ? 'Update dimensions, color, and label' : 'Configure and place on canvas'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: '#f1f5f9', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: preview + form side by side */}
        <div style={{ display: 'flex', gap: 0 }}>
          {/* Left: live preview */}
          <div style={{
            width: 192, flexShrink: 0, padding: '20px 0 20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Preview
              </div>
              <SeatPreview
                type={displayType}
                widthM={widthM}
                heightM={heightM}
                fill={fill}
                seatCount={seatCount}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>
                {widthM.toFixed(2)} m × {heightM.toFixed(2)} m
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Label */}
            <div>
              <label style={labelStyle}>Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={typeLabel}
                maxLength={40}
                style={inputStyle}
              />
            </div>

            {/* Seat count (sofa only) */}
            {isSofa && (
              <div>
                <label style={labelStyle}>Seats</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([2, 3] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => handleSeatCountChange(n)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: `2px solid ${seatCount === n ? '#0f172a' : '#e2e8f0'}`,
                        background: seatCount === n ? '#0f172a' : '#ffffff',
                        color: seatCount === n ? '#ffffff' : '#475569',
                      }}
                    >
                      {n} seats
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bench presets */}
            {isBench && (
              <div>
                <label style={labelStyle}>Length Preset</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {BENCH_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setWidthM(p.widthM)}
                      style={{
                        flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `2px solid ${Math.abs(widthM - p.widthM) < 0.01 ? '#0f172a' : '#e2e8f0'}`,
                        background: Math.abs(widthM - p.widthM) < 0.01 ? '#0f172a' : '#ffffff',
                        color: Math.abs(widthM - p.widthM) < 0.01 ? '#ffffff' : '#475569',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dimensions */}
            <div>
              <label style={labelStyle}>Dimensions (meters)</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Width</div>
                  <input
                    type="number" step="0.05" min="0.1" max="10"
                    value={widthM}
                    onChange={(e) => setWidthM(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    style={inputStyle}
                  />
                </div>
                <span style={{ color: '#94a3b8', paddingBottom: 9 }}>×</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Depth</div>
                  <input
                    type="number" step="0.05" min="0.1" max="10"
                    value={heightM}
                    onChange={(e) => setHeightM(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Fill color */}
            <div>
              <label style={labelStyle}>Color</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFill(c)}
                    title={c}
                    style={{
                      width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: c,
                      outline: fill === c ? `3px solid #0f172a` : `2px solid transparent`,
                      outlineOffset: 1,
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={fill}
                  onChange={(e) => setFill(e.target.value)}
                  title="Custom color"
                  style={{
                    width: 26, height: 26, padding: 0, border: '1px solid #e2e8f0',
                    borderRadius: 6, cursor: 'pointer', background: 'none',
                  }}
                />
              </div>
            </div>

            {/* Quantity (creation mode only) */}
            {!isEditing && (
              <div>
                <label style={labelStyle}>Quantity</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
                      background: '#f8fafc', cursor: 'pointer', fontSize: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151',
                    }}
                  >−</button>
                  <input
                    type="number" min={1} max={50} value={quantity}
                    onChange={(e) => setQuantity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                    style={{ width: 56, textAlign: 'center', padding: '6px 8px', fontSize: 15, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a' }}
                  />
                  <button
                    onClick={() => setQuantity(Math.min(50, quantity + 1))}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
                      background: '#f8fafc', cursor: 'pointer', fontSize: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151',
                    }}
                  >+</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#ffffff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '9px 20px', borderRadius: 10, border: 'none',
              background: '#0f172a', color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a'; }}
          >
            {isEditing
              ? 'Save Changes'
              : `Add ${quantity} ${label || typeLabel}${quantity > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default SeatingConfigModal;
