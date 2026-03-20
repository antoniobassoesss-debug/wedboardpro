/**
 * Dance Floor Configuration Modal
 *
 * Simplified: rectangular shape only, colour palette for surface,
 * no label rendered on canvas.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

type DFBorderStyle = 'none' | 'simple' | 'double' | 'decorative';
type DFBorderThickness = 'thin' | 'medium' | 'thick';
type DFLightingType = 'spotlights' | 'disco-ball' | 'wash-lights' | 'uplights' | 'combined';
type DFEntranceSide = 'top' | 'bottom' | 'left' | 'right';
type DFChairStyle = 'standard' | 'chiavari' | 'ghost' | 'folding';

export interface DanceFloorData {
  shape: 'rectangle';
  widthM: number;
  heightM: number;
  aspectRatioLocked: boolean;
  fillColor: string;
  borderEnabled: boolean;
  borderStyle: DFBorderStyle;
  borderColor: string;
  borderThickness: DFBorderThickness;
  overheadLighting: boolean;
  lightingType: DFLightingType;
  lightColor: string;
  multicolorLight: boolean;
  ambientGlow: boolean;
  surroundingChairs: boolean;
  chairCount: number;
  chairStyle: DFChairStyle;
  chairSpacingCm: number;
  entranceEnabled: boolean;
  entranceSide: DFEntranceSide;
  entranceWidthM: number;
  label: string;
  labelVisible: false;
  notes: string;
}

interface DanceFloorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlace: (data: DanceFloorData) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PREVIEW_W = 420;
const PREVIEW_H = 320;

const PALETTE = [
  { hex: '#ffffff', label: 'White' },
  { hex: '#f5f0e8', label: 'Cream' },
  { hex: '#e8dcc8', label: 'Linen' },
  { hex: '#c8a074', label: 'Oak' },
  { hex: '#8b6340', label: 'Walnut' },
  { hex: '#4a2e1a', label: 'Ebony' },
  { hex: '#e0e0e0', label: 'Silver' },
  { hex: '#888888', label: 'Gray' },
  { hex: '#333333', label: 'Charcoal' },
  { hex: '#111111', label: 'Black' },
  { hex: '#b3d4f5', label: 'Sky' },
  { hex: '#1e3a5f', label: 'Navy' },
  { hex: '#b8e0c4', label: 'Mint' },
  { hex: '#2d5a3d', label: 'Forest' },
  { hex: '#d4a843', label: 'Gold' },
  { hex: '#7c5cbf', label: 'Purple' },
];

// ── Accordion ─────────────────────────────────────────────────────────────────

const AccordionSection: React.FC<{
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}> = ({ title, open, onToggle, children }) => (
  <div style={{ borderBottom: '1px solid #f1f5f9' }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 20px', background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {title}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s', flexShrink: 0 }}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    {open && <div style={{ padding: '2px 20px 16px' }}>{children}</div>}
  </div>
);

// ── Toggle ─────────────────────────────────────────────────────────────────────

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
      background: checked ? '#0f172a' : '#e2e8f0', padding: 0, position: 'relative', flexShrink: 0,
      transition: 'background 0.15s',
    }}
  >
    <div style={{
      width: 16, height: 16, borderRadius: '50%', background: '#fff',
      position: 'absolute', top: 3, left: checked ? 19 : 3, transition: 'left 0.15s',
    }} />
  </button>
);

// ── Component ─────────────────────────────────────────────────────────────────

export const DanceFloorConfigModal: React.FC<DanceFloorConfigModalProps> = ({
  isOpen, onClose, onPlace,
}) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [widthM, setWidthM] = useState(6);
  const [heightM, setHeightM] = useState(6);
  const [aspectLocked, setAspectLocked] = useState(false);
  const aspectRatio = useMemo(() => widthM / Math.max(heightM, 0.1), [widthM, heightM]);

  const [fillColor, setFillColor] = useState('#e8dcc8');

  const [borderEnabled, setBorderEnabled] = useState(true);
  const [borderStyle, setBorderStyle] = useState<DFBorderStyle>('simple');
  const [borderColor, setBorderColor] = useState('#8B6914');
  const [borderThickness, setBorderThickness] = useState<DFBorderThickness>('medium');

  const [overheadLighting, setOverheadLighting] = useState(false);
  const [lightingType, setLightingType] = useState<DFLightingType>('spotlights');
  const [lightColor, setLightColor] = useState('#fbbf24');
  const [multicolorLight, setMulticolorLight] = useState(false);
  const [ambientGlow, setAmbientGlow] = useState(false);

  const [surroundingChairs, setSurroundingChairs] = useState(false);
  const [chairCount, setChairCount] = useState(20);
  const [chairStyle, setChairStyle] = useState<DFChairStyle>('chiavari');
  const [chairSpacingCm, setChairSpacingCm] = useState(30);

  const [entranceEnabled, setEntranceEnabled] = useState(false);
  const [entranceSide, setEntranceSide] = useState<DFEntranceSide>('bottom');
  const [entranceWidthM, setEntranceWidthM] = useState(1.5);

  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');

  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['dimensions', 'color', 'border', 'lighting', 'capacity', 'entrance', 'notes'])
  );

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const handleWidthChange = useCallback((v: number) => {
    setWidthM(v);
    if (aspectLocked) setHeightM(+(v / aspectRatio).toFixed(2));
  }, [aspectLocked, aspectRatio]);

  const handleHeightChange = useCallback((v: number) => {
    setHeightM(v);
    if (aspectLocked) setWidthM(+(v * aspectRatio).toFixed(2));
  }, [aspectLocked, aspectRatio]);

  const areaM2 = widthM * heightM;
  const capacity = Math.floor(areaM2 / 0.5);

  const borderThicknessPx = borderThickness === 'thin' ? 1.5 : borderThickness === 'thick' ? 5 : 2.5;
  const borderDash = borderStyle === 'decorative' ? '8,4' : undefined;

  // ── Preview geometry ───────────────────────────────────────────────────────
  const { cx, cy, rw, rh } = useMemo(() => {
    const availW = PREVIEW_W - 80;
    const availH = PREVIEW_H - 60;
    const scale = Math.min(availW / Math.max(widthM, 0.1), availH / Math.max(heightM, 0.1)) * 0.72;
    return { cx: PREVIEW_W / 2, cy: PREVIEW_H / 2, rw: (widthM / 2) * scale, rh: (heightM / 2) * scale };
  }, [widthM, heightM]);

  // Surrounding chair positions — before early return (Rules of Hooks)
  const chairPositions = useMemo(() => {
    if (!surroundingChairs || chairCount <= 0) return [];
    const offset = 12;
    const positions: Array<{ x: number; y: number; rotation: number }> = [];
    for (let i = 0; i < Math.min(chairCount, 60); i++) {
      const t = i / chairCount;
      const perim = 2 * (rw * 2 + rh * 2);
      const dist = t * perim;
      const top = rw * 2, right = top + rh * 2, bottom = right + rw * 2;
      let x: number, y: number, rotation: number;
      if (dist <= top) {
        x = cx - rw + dist; y = cy - rh - offset; rotation = 0;
      } else if (dist <= right) {
        x = cx + rw + offset; y = cy - rh + (dist - top); rotation = 90;
      } else if (dist <= bottom) {
        x = cx + rw - (dist - right); y = cy + rh + offset; rotation = 180;
      } else {
        x = cx - rw - offset; y = cy + rh - (dist - bottom); rotation = 270;
      }
      positions.push({ x, y, rotation });
    }
    return positions;
  }, [surroundingChairs, chairCount, cx, cy, rw, rh]);

  // Entrance gap — before early return (Rules of Hooks)
  const entrancePx = useMemo(() => {
    if (!entranceEnabled) return null;
    const dim = entranceSide === 'top' || entranceSide === 'bottom' ? rw * 2 : rh * 2;
    const totalDim = entranceSide === 'top' || entranceSide === 'bottom' ? widthM : heightM;
    return (entranceWidthM / Math.max(totalDim, 0.01)) * dim;
  }, [entranceEnabled, entranceSide, rw, rh, widthM, heightM, entranceWidthM]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    onPlace({
      shape: 'rectangle', widthM, heightM, aspectRatioLocked: aspectLocked,
      fillColor,
      borderEnabled, borderStyle, borderColor, borderThickness,
      overheadLighting, lightingType, lightColor, multicolorLight, ambientGlow,
      surroundingChairs, chairCount, chairStyle, chairSpacingCm,
      entranceEnabled, entranceSide, entranceWidthM,
      label, labelVisible: false, notes,
    });
    onClose();
  };

  if (!isOpen) return null;

  // ── Shared styles ──────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none',
    color: '#0f172a', boxSizing: 'border-box', background: '#fff',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5,
  };

  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
    border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
    background: active ? '#0f172a' : '#fff',
    color: active ? '#fff' : '#64748b',
    textTransform: 'capitalize',
  });

  // ── Preview helpers ────────────────────────────────────────────────────────
  const previewId = `dfm-${Math.round(rw)}`;
  const bx = cx - rw, by = cy - rh, bw = rw * 2, bh = rh * 2;

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
        width: 820, maxWidth: '97vw',
        background: '#ffffff', borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', maxHeight: '95vh',
      }}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Dance Floor</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Configure and add to canvas</p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: '#f1f5f9', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left: config */}
          <div style={{ width: 296, borderRight: '1px solid #f3f4f6', overflow: 'auto', flexShrink: 0 }}>

            {/* ── 1. DIMENSIONS ─────────────────────────────────────── */}
            <AccordionSection title="Dimensions" open={openSections.has('dimensions')} onToggle={() => toggleSection('dimensions')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Width (m)</label>
                  <input type="number" min={1} max={50} step={0.5} value={widthM}
                    onChange={(e) => handleWidthChange(Math.max(0.5, parseFloat(e.target.value) || 1))}
                    style={inputStyle} />
                </div>
                <div style={{ textAlign: 'center', paddingBottom: 8 }}>
                  <button
                    onClick={() => setAspectLocked(!aspectLocked)}
                    title={aspectLocked ? 'Unlock ratio' : 'Lock ratio'}
                    style={{
                      width: 24, height: 24, borderRadius: 6,
                      border: `1.5px solid ${aspectLocked ? '#0f172a' : '#e2e8f0'}`,
                      background: aspectLocked ? '#0f172a' : '#f8fafc',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: aspectLocked ? '#fff' : '#94a3b8', fontSize: 10,
                    }}
                  >
                    {aspectLocked ? '🔒' : '🔓'}
                  </button>
                </div>
                <div>
                  <label style={labelStyle}>Length (m)</label>
                  <input type="number" min={1} max={50} step={0.5} value={heightM}
                    onChange={(e) => handleHeightChange(Math.max(0.5, parseFloat(e.target.value) || 1))}
                    style={inputStyle} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
                {widthM} m × {heightM} m · Area: {areaM2.toFixed(1)} m²
              </p>
            </AccordionSection>

            {/* ── 2. COLOUR ─────────────────────────────────────────── */}
            <AccordionSection title="Colour" open={openSections.has('color')} onToggle={() => toggleSection('color')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 12 }}>
                {PALETTE.map(({ hex, label: lbl }) => {
                  const sel = fillColor === hex;
                  return (
                    <button
                      key={hex}
                      onClick={() => setFillColor(hex)}
                      title={lbl}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: 8, cursor: 'pointer',
                        background: hex,
                        border: sel ? '3px solid #0f172a' : '2px solid #e2e8f0',
                        boxShadow: sel ? '0 0 0 2px rgba(15,23,42,0.2)' : 'none',
                        outline: 'none',
                      }}
                    />
                  );
                })}
              </div>
              {/* Custom colour */}
              <div>
                <label style={labelStyle}>Custom</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)}
                    style={{ width: 40, height: 34, borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                  <input type="text" value={fillColor} onChange={(e) => setFillColor(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
            </AccordionSection>

            {/* ── 3. BORDER ─────────────────────────────────────────── */}
            <AccordionSection title="Border" open={openSections.has('border')} onToggle={() => toggleSection('border')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Show Border</span>
                <Toggle checked={borderEnabled} onChange={setBorderEnabled} />
              </div>
              {borderEnabled && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Style</label>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {(['simple', 'double', 'decorative'] as DFBorderStyle[]).map((bs) => (
                        <button key={bs} onClick={() => setBorderStyle(bs)} style={segBtn(borderStyle === bs)}>
                          {bs === 'simple' ? 'Simple' : bs === 'double' ? 'Double' : 'Ornate'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Color</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)}
                          style={{ width: 36, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                        <input type="text" value={borderColor} onChange={(e) => setBorderColor(e.target.value)}
                          style={{ ...inputStyle }} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Thickness</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(['thin', 'medium', 'thick'] as DFBorderThickness[]).map((bt) => (
                          <label key={bt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                            <input type="radio" checked={borderThickness === bt} onChange={() => setBorderThickness(bt)}
                              style={{ accentColor: '#0f172a' }} />
                            {bt.charAt(0).toUpperCase() + bt.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </AccordionSection>

            {/* ── 4. LIGHTING ───────────────────────────────────────── */}
            <AccordionSection title="Lighting" open={openSections.has('lighting')} onToggle={() => toggleSection('lighting')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Overhead Lighting</span>
                <Toggle checked={overheadLighting} onChange={setOverheadLighting} />
              </div>
              {overheadLighting && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Type</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {([
                        ['spotlights', 'Spotlights'], ['disco-ball', 'Disco Ball'],
                        ['wash-lights', 'Wash Lights'], ['uplights', 'Uplights'], ['combined', 'Combined'],
                      ] as [DFLightingType, string][]).map(([id, lbl]) => (
                        <button key={id} onClick={() => setLightingType(id)} style={{ ...segBtn(lightingType === id), fontSize: 10, padding: '6px 4px' }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Light Color</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, color: '#64748b' }}>
                        <input type="checkbox" checked={multicolorLight} onChange={(e) => setMulticolorLight(e.target.checked)}
                          style={{ accentColor: '#0f172a' }} />
                        Multicolor
                      </label>
                    </div>
                    {!multicolorLight && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="color" value={lightColor} onChange={(e) => setLightColor(e.target.value)}
                          style={{ width: 36, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                        <input type="text" value={lightColor} onChange={(e) => setLightColor(e.target.value)}
                          style={{ ...inputStyle, flex: 1 }} />
                      </div>
                    )}
                  </div>
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Ambient Glow</span>
                  <p style={{ margin: '1px 0 0', fontSize: 10, color: '#94a3b8' }}>Soft halo around the floor</p>
                </div>
                <Toggle checked={ambientGlow} onChange={setAmbientGlow} />
              </div>
            </AccordionSection>

            {/* ── 5. CAPACITY & CHAIRS ──────────────────────────────── */}
            <AccordionSection title="Capacity & Chairs" open={openSections.has('capacity')} onToggle={() => toggleSection('capacity')}>
              <div style={{
                padding: '8px 12px', borderRadius: 8, background: '#f8fafc',
                border: '1px solid #e2e8f0', marginBottom: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Estimated Capacity</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>~{capacity} people</span>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 10, color: '#94a3b8' }}>Based on 0.5 m² per person</p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Surrounding Chairs</span>
                <Toggle checked={surroundingChairs} onChange={setSurroundingChairs} />
              </div>
              {surroundingChairs && (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Chair Count</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setChairCount(Math.max(4, chairCount - 2))} style={{
                        width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0',
                        background: '#f8fafc', cursor: 'pointer', fontSize: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151',
                      }}>−</button>
                      <input type="number" min={4} max={200} value={chairCount}
                        onChange={(e) => setChairCount(Math.max(4, parseInt(e.target.value) || 4))}
                        style={{ ...inputStyle, width: 60, textAlign: 'center' }} />
                      <button onClick={() => setChairCount(Math.min(200, chairCount + 2))} style={{
                        width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0',
                        background: '#f8fafc', cursor: 'pointer', fontSize: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151',
                      }}>+</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Chair Style</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {(['standard', 'chiavari', 'ghost', 'folding'] as DFChairStyle[]).map((cs) => (
                        <button key={cs} onClick={() => setChairStyle(cs)} style={segBtn(chairStyle === cs)}>
                          {cs === 'standard' ? 'Standard' : cs.charAt(0).toUpperCase() + cs.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Spacing (cm)</label>
                    <input type="number" min={5} max={100} step={5} value={chairSpacingCm}
                      onChange={(e) => setChairSpacingCm(Math.max(5, parseInt(e.target.value) || 30))}
                      style={inputStyle} />
                  </div>
                </>
              )}
            </AccordionSection>

            {/* ── 6. ENTRANCE ───────────────────────────────────────── */}
            <AccordionSection title="Entrance" open={openSections.has('entrance')} onToggle={() => toggleSection('entrance')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Entrance Marker</span>
                  <p style={{ margin: '1px 0 0', fontSize: 10, color: '#94a3b8' }}>Gap + arrow on one side</p>
                </div>
                <Toggle checked={entranceEnabled} onChange={setEntranceEnabled} />
              </div>
              {entranceEnabled && (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Side</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {(['top', 'right', 'bottom', 'left'] as DFEntranceSide[]).map((side) => (
                        <button key={side} onClick={() => setEntranceSide(side)} style={segBtn(entranceSide === side)}>
                          {side.charAt(0).toUpperCase() + side.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Width (m)</label>
                    <input type="number" min={0.5} max={10} step={0.5} value={entranceWidthM}
                      onChange={(e) => setEntranceWidthM(Math.max(0.5, parseFloat(e.target.value) || 1.5))}
                      style={inputStyle} />
                  </div>
                </>
              )}
            </AccordionSection>

            {/* ── 7. NOTES ──────────────────────────────────────────── */}
            <AccordionSection title="Notes" open={openSections.has('notes')} onToggle={() => toggleSection('notes')}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Name / Label</label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Main Dance Floor"
                  maxLength={40} style={inputStyle} />
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#94a3b8' }}>For reference only — not shown on canvas</p>
              </div>
              <div>
                <label style={labelStyle}>Internal Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Planner notes — not shown on canvas"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
              </div>
            </AccordionSection>
          </div>

          {/* Right: live preview */}
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'auto', background: '#fafafa' }}>
            <div style={{
              flex: 1, background: '#f8fafc', borderRadius: 12,
              border: '1px solid #e2e8f0', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 240,
            }}>
              <svg width={PREVIEW_W} height={PREVIEW_H} viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`} style={{ display: 'block' }}>
                <defs>
                  <pattern id={`${previewId}-dot`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.7" fill="#b8c4d0" opacity="0.4" />
                  </pattern>
                </defs>

                {/* Background grid */}
                <rect width={PREVIEW_W} height={PREVIEW_H} fill={`url(#${previewId}-dot)`} />

                {/* Ambient glow */}
                {ambientGlow && (
                  <rect x={bx - 22} y={by - 22} width={bw + 44} height={bh + 44} rx={10}
                    fill={overheadLighting && !multicolorLight ? lightColor : '#fbbf24'} opacity={0.16}
                    style={{ pointerEvents: 'none' }} />
                )}

                {/* Floor surface */}
                <rect x={bx} y={by} width={bw} height={bh}
                  fill={fillColor}
                  stroke={borderEnabled && borderStyle !== 'none' ? borderColor : 'transparent'}
                  strokeWidth={borderEnabled && borderStyle !== 'none' ? borderThicknessPx : 0}
                  strokeDasharray={borderDash}
                />

                {/* Double border inner line */}
                {borderEnabled && borderStyle === 'double' && (
                  <rect
                    x={bx + borderThicknessPx * 2 + 2} y={by + borderThicknessPx * 2 + 2}
                    width={Math.max(1, bw - (borderThicknessPx * 2 + 2) * 2)}
                    height={Math.max(1, bh - (borderThicknessPx * 2 + 2) * 2)}
                    fill="none" stroke={borderColor} strokeWidth={borderThicknessPx * 0.6} opacity={0.6}
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Overhead lighting dots */}
                {overheadLighting && (() => {
                  const lColor = multicolorLight ? null : lightColor;
                  const palette = ['#ff3a3a', '#fbbf24', '#3aff3a', '#3a3aff', '#ff3aff', '#3affff'];
                  const count = lightingType === 'disco-ball' ? 1 : lightingType === 'spotlights' ? 4 : 3;
                  const dots = lightingType === 'disco-ball'
                    ? [{ x: cx, y: cy, r: 12 }]
                    : Array.from({ length: count }, (_, i) => {
                        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
                        const r2 = Math.min(rw, rh) * 0.45;
                        return { x: cx + r2 * Math.cos(a), y: cy + r2 * Math.sin(a), r: 7 };
                      });
                  return dots.map((d, i) => (
                    <g key={i}>
                      <circle cx={d.x} cy={d.y} r={d.r * 2} fill={lColor || palette[i % 6]} opacity={0.18} />
                      <circle cx={d.x} cy={d.y} r={d.r * 0.6} fill={lColor || palette[i % 6]} opacity={0.75} />
                    </g>
                  ));
                })()}

                {/* Surrounding chairs */}
                {chairPositions.map((pos, i) => (
                  <g key={i} transform={`translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)}) rotate(${pos.rotation.toFixed(1)})`}
                    style={{ pointerEvents: 'none' }}>
                    <rect x={-4} y={-3.5} width={8} height={7} rx={1.5}
                      fill="#e8e4df" stroke="#a08060" strokeWidth={0.8}
                      fillOpacity={chairStyle === 'ghost' ? 0.4 : 1} />
                  </g>
                ))}

                {/* Entrance marker */}
                {entranceEnabled && entrancePx != null && (() => {
                  const hw = entrancePx / 2;
                  const arrLen = 14;
                  let x1: number, y1: number, x2: number, y2: number;
                  let ax: number, ay: number, adx: number, ady: number;
                  switch (entranceSide) {
                    case 'top':    x1=cx-hw; y1=by;    x2=cx+hw; y2=by;    ax=cx; ay=by-arrLen; adx=0;  ady=arrLen;  break;
                    case 'bottom': x1=cx-hw; y1=by+bh; x2=cx+hw; y2=by+bh; ax=cx; ay=by+bh+arrLen; adx=0; ady=-arrLen; break;
                    case 'left':   x1=bx; y1=cy-hw; x2=bx; y2=cy+hw; ax=bx-arrLen; ay=cy; adx=arrLen; ady=0; break;
                    case 'right':  x1=bx+bw; y1=cy-hw; x2=bx+bw; y2=cy+hw; ax=bx+bw+arrLen; ay=cy; adx=-arrLen; ady=0; break;
                    default: x1=cx-hw; y1=by+bh; x2=cx+hw; y2=by+bh; ax=cx; ay=by+bh+arrLen; adx=0; ady=-arrLen;
                  }
                  const norm = Math.sqrt(adx*adx+ady*ady)||1;
                  const perpX=(-ady/norm)*7, perpY=(adx/norm)*7;
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f8fafc" strokeWidth={borderThicknessPx + 4} />
                      <line x1={ax} y1={ay} x2={ax+adx} y2={ay+ady} stroke="#3b82f6" strokeWidth={2} />
                      <polygon
                        points={`${ax+adx},${ay+ady} ${ax+adx-adx/norm*9+perpX},${ay+ady-ady/norm*9+perpY} ${ax+adx-adx/norm*9-perpX},${ay+ady-ady/norm*9-perpY}`}
                        fill="#3b82f6" />
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        <div style={{
          padding: '9px 24px', borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          background: '#fafafa', flexShrink: 0,
        }}>
          {[`${widthM} m × ${heightM} m`, `${areaM2.toFixed(1)} m²`, `~${capacity} people`].map((chip) => (
            <span key={chip} style={{
              padding: '4px 10px', borderRadius: 20,
              background: '#f1f5f9', fontSize: 12, fontWeight: 600, color: '#475569',
            }}>
              {chip}
            </span>
          ))}
          <span style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: fillColor, color: '#374151',
            border: '1px solid rgba(0,0,0,0.1)',
          }}>
            {PALETTE.find(p => p.hex === fillColor)?.label ?? 'Custom'}
          </span>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {widthM} × {heightM} m
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              padding: '9px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#ffffff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={handleAdd}
              style={{
                padding: '9px 22px', borderRadius: 10, border: 'none',
                background: '#0f172a', color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a'; }}
            >
              Add to Canvas
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default DanceFloorConfigModal;
