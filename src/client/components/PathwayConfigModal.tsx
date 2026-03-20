/**
 * Pathway Configuration Modal
 *
 * Styles: plain, dashed center line, petal/decorated.
 * Renders as a vertical rectangle (planners rotate as needed).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PathwayStyle = 'plain' | 'dashed' | 'petal';

export interface PathwayData {
  lengthM: number;
  widthM: number;
  style: PathwayStyle;
  fillColor: string;
  label: string;
  labelVisible: boolean;
  notes: string;
}

interface PathwayConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlace: (data: PathwayData) => void;
  initialData?: PathwayData;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PREVIEW_W = 400;
const PREVIEW_H = 300;

const PALETTE = [
  { hex: '#f9f7f4', label: 'Off-white' },
  { hex: '#f5f0e8', label: 'Cream' },
  { hex: '#ffffff', label: 'White' },
  { hex: '#e8dcc8', label: 'Linen' },
  { hex: '#e8c4b8', label: 'Blush' },
  { hex: '#c8e4c8', label: 'Sage' },
  { hex: '#b8e0c4', label: 'Mint' },
  { hex: '#c8a074', label: 'Oak' },
  { hex: '#e0e0e0', label: 'Silver' },
  { hex: '#888888', label: 'Gray' },
  { hex: '#333333', label: 'Charcoal' },
  { hex: '#111111', label: 'Black' },
  { hex: '#d4a843', label: 'Gold' },
  { hex: '#b3d4f5', label: 'Sky' },
  { hex: '#e8b4c8', label: 'Pink' },
  { hex: '#7c5cbf', label: 'Purple' },
];

const DEFAULT_DATA: PathwayData = {
  lengthM: 10, widthM: 1.5,
  style: 'plain',
  fillColor: '#f9f7f4',
  label: 'Pathway', labelVisible: false, notes: '',
};

// ── Sub-components ────────────────────────────────────────────────────────────

const AccordionSection: React.FC<{
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}> = ({ title, open, onToggle, children }) => (
  <div style={{ borderBottom: '1px solid #f1f5f9' }}>
    <button onClick={onToggle} style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 20px', background: 'none', border: 'none', cursor: 'pointer',
      fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      {title}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s', flexShrink: 0 }}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    {open && <div style={{ padding: '2px 20px 16px' }}>{children}</div>}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)} style={{
    width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
    background: checked ? '#0f172a' : '#e2e8f0', padding: 0, position: 'relative', flexShrink: 0,
    transition: 'background 0.15s',
  }}>
    <div style={{
      width: 16, height: 16, borderRadius: '50%', background: '#fff',
      position: 'absolute', top: 3, left: checked ? 19 : 3, transition: 'left 0.15s',
    }} />
  </button>
);

// Deterministic petal scatter — no Math.random() so positions are stable
function petalPositions(bx: number, by: number, bw: number, bh: number, count: number) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    // Alternate sides with fixed offset for visual balance
    const sideOffset = ((i * 47) % 100) / 100 - 0.5; // -0.5..0.5
    const x = bx + bw * 0.5 + sideOffset * bw * 0.55;
    const y = by + t * bh;
    const rot = (i * 67) % 180;
    pts.push({ x, y, rot });
  }
  return pts;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PathwayConfigModal: React.FC<PathwayConfigModalProps> = ({
  isOpen, onClose, onPlace, initialData,
}) => {
  const init = initialData ?? DEFAULT_DATA;

  const [lengthM, setLengthM] = useState(init.lengthM);
  const [widthM, setWidthM]   = useState(init.widthM);
  const [style, setStyle]     = useState<PathwayStyle>(init.style);
  const [fillColor, setFillColor] = useState(init.fillColor);
  const [label, setLabel]               = useState(init.label);
  const [labelVisible, setLabelVisible] = useState(init.labelVisible);
  const [notes, setNotes]               = useState(init.notes);

  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['dimensions', 'style', 'color', 'notes'])
  );
  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Preview geometry ───────────────────────────────────────────────────────
  // Preview is tall (portrait) since pathway is vertical by default
  const { bx, by, bw, bh, cx, cy } = useMemo(() => {
    const availW = PREVIEW_W - 80;
    const availH = PREVIEW_H - 60;
    // Pathway is tall (length > width), so scale to fit vertically
    const scale = Math.min(availW / Math.max(widthM, 0.1), availH / Math.max(lengthM, 0.1)) * 0.65;
    const bw = widthM * scale;
    const bh = lengthM * scale;
    const cx = PREVIEW_W / 2;
    const cy = PREVIEW_H / 2;
    return { bx: cx - bw / 2, by: cy - bh / 2, bw, bh, cx, cy };
  }, [widthM, lengthM]);

  const petals = useMemo(() => {
    if (style !== 'petal') return [];
    const count = Math.max(4, Math.min(20, Math.round(lengthM * 2)));
    return petalPositions(bx, by, bw, bh, count);
  }, [style, bx, by, bw, bh, lengthM]);

  const handleAdd = () => {
    onPlace({ lengthM, widthM, style, fillColor, label, labelVisible, notes });
    onClose();
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none',
    color: '#0f172a', boxSizing: 'border-box', background: '#fff',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5,
  };

  const isDark = ['#111111', '#333333'].includes(fillColor);

  // Style card button
  const styleCardBtn = (s: PathwayStyle, lbl: string, desc: string): React.ReactNode => {
    const active = style === s;
    return (
      <button key={s} onClick={() => setStyle(s)} style={{
        width: '100%', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
        border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
        background: active ? '#0f172a' : '#fff',
        marginBottom: 6,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : '#0f172a', marginBottom: 2 }}>{lbl}</div>
        <div style={{ fontSize: 10, color: active ? '#94a3b8' : '#64748b' }}>{desc}</div>
      </button>
    );
  };

  const content = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 740, maxWidth: '97vw', background: '#ffffff', borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', maxHeight: '95vh',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Pathway</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Configure and add to canvas</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left: config */}
          <div style={{ width: 280, borderRight: '1px solid #f3f4f6', overflow: 'auto', flexShrink: 0 }}>

            {/* Dimensions */}
            <AccordionSection title="Dimensions" open={openSections.has('dimensions')} onToggle={() => toggleSection('dimensions')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <div>
                  <label style={labelStyle}>Length (m)</label>
                  <input type="number" min={1} max={50} step={0.5} value={lengthM}
                    onChange={(e) => setLengthM(Math.max(1, parseFloat(e.target.value) || 10))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Width (m)</label>
                  <input type="number" min={0.5} max={10} step={0.5} value={widthM}
                    onChange={(e) => setWidthM(Math.max(0.5, parseFloat(e.target.value) || 1.5))}
                    style={inputStyle} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>{widthM} m wide · {lengthM} m long</p>
            </AccordionSection>

            {/* Style */}
            <AccordionSection title="Style" open={openSections.has('style')} onToggle={() => toggleSection('style')}>
              {styleCardBtn('plain', 'Plain', 'Simple filled rectangle')}
              {styleCardBtn('dashed', 'Dashed center line', 'Walking path indicator down the center')}
              {styleCardBtn('petal', 'Petal / Decorated', 'Scattered flower petals along the path')}
            </AccordionSection>

            {/* Colour */}
            <AccordionSection title="Colour" open={openSections.has('color')} onToggle={() => toggleSection('color')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 12 }}>
                {PALETTE.map(({ hex, label: lbl }) => (
                  <button key={hex} onClick={() => setFillColor(hex)} title={lbl}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 8, cursor: 'pointer', background: hex,
                      border: fillColor === hex ? '3px solid #0f172a' : '2px solid #e2e8f0',
                      boxShadow: fillColor === hex ? '0 0 0 2px rgba(15,23,42,0.2)' : 'none', outline: 'none',
                    }} />
                ))}
              </div>
              <div>
                <label style={labelStyle}>Custom</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)}
                    style={{ width: 40, height: 34, borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                  <input type="text" value={fillColor} onChange={(e) => setFillColor(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
            </AccordionSection>

            {/* Label & Notes */}
            <AccordionSection title="Label & Notes" open={openSections.has('notes')} onToggle={() => toggleSection('notes')}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Label</label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Main Aisle" maxLength={40} style={inputStyle} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: '#374151' }}>Show on canvas</span>
                  <Toggle checked={labelVisible} onChange={setLabelVisible} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Planner notes — not shown on canvas" rows={3}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
              </div>
            </AccordionSection>
          </div>

          {/* Right: preview */}
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <svg width={PREVIEW_W} height={PREVIEW_H} viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`} style={{ display: 'block' }}>
                <defs>
                  <pattern id="pwy-dot" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.7" fill="#b8c4d0" opacity="0.4" />
                  </pattern>
                </defs>
                <rect width={PREVIEW_W} height={PREVIEW_H} fill="url(#pwy-dot)" />

                {/* Pathway rectangle */}
                <rect x={bx} y={by} width={bw} height={bh} fill={fillColor} stroke="#d0c8b8" strokeWidth={1.5} />

                {/* Style overlays */}
                {style === 'dashed' && (
                  <line x1={cx} y1={by + 6} x2={cx} y2={by + bh - 6}
                    stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.25)'}
                    strokeWidth={1.5} strokeDasharray="8,6" />
                )}
                {style === 'petal' && petals.map((p, i) => (
                  <ellipse key={i}
                    cx={p.x} cy={p.y}
                    rx={Math.min(bw * 0.18, 7)} ry={Math.min(bw * 0.1, 4)}
                    fill="rgba(220,140,160,0.55)"
                    transform={`rotate(${p.rot},${p.x},${p.y})`} />
                ))}

                {/* Label */}
                {labelVisible && label && (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                    fontSize={Math.max(9, Math.min(14, bw / 4))}
                    fill={isDark ? '#f8fafc' : '#374151'} fontWeight="600"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {label}
                  </text>
                )}
              </svg>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
              Rotate on canvas after placing
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{widthM} m × {lengthM} m · {style}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleAdd}
              style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a'; }}
            >
              {initialData ? 'Update Pathway' : 'Add to Canvas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default PathwayConfigModal;
