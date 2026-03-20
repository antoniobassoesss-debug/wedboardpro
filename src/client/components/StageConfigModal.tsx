/**
 * Stage Configuration Modal
 *
 * Variants: rectangular (plain rect) and apron (front edge bows outward via bezier).
 * Configures dimensions, orientation, colour, border, and optional stairs.
 * Label is visible on canvas by default.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

export type StageFrontEdge = 'bottom' | 'top' | 'left' | 'right';
type StageVariant = 'rectangular' | 'apron';
type StageBorderStyle = 'simple' | 'double' | 'decorative';
type StageBorderThickness = 'thin' | 'medium' | 'thick';

export interface StageData {
  widthM: number;
  depthM: number;
  aspectRatioLocked: boolean;
  variant: StageVariant;
  apronDepthPct: number;       // 0.15–0.25: bow depth as fraction of front-facing dim
  frontEdge: StageFrontEdge;   // which edge faces the audience
  fillColor: string;
  borderEnabled: boolean;
  borderStyle: StageBorderStyle;
  borderColor: string;
  borderThickness: StageBorderThickness;
  stairsEnabled: boolean;
  stairsWidthM: number;
  stairsCount: 2 | 3;
  label: string;
  labelVisible: boolean;
  notes: string;
}

interface StageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlace: (data: StageData) => void;
  initialData?: StageData;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PREVIEW_W = 420;
const PREVIEW_H = 320;

const PALETTE = [
  { hex: '#f5f0e8', label: 'Cream' },
  { hex: '#e8dcc8', label: 'Linen' },
  { hex: '#c8a074', label: 'Oak' },
  { hex: '#8b6340', label: 'Walnut' },
  { hex: '#4a2e1a', label: 'Ebony' },
  { hex: '#ffffff', label: 'White' },
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

const DEFAULT_DATA: StageData = {
  widthM: 8, depthM: 4, aspectRatioLocked: false,
  variant: 'rectangular', apronDepthPct: 0.18, frontEdge: 'bottom',
  fillColor: '#e8dcc8',
  borderEnabled: true, borderStyle: 'simple', borderColor: '#8B6914', borderThickness: 'medium',
  stairsEnabled: false, stairsWidthM: 2, stairsCount: 3,
  label: 'Stage', labelVisible: true, notes: '',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

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

export const StageConfigModal: React.FC<StageConfigModalProps> = ({
  isOpen, onClose, onPlace, initialData,
}) => {
  const init = initialData ?? DEFAULT_DATA;

  // ── State ──────────────────────────────────────────────────────────────────
  const [widthM, setWidthM]     = useState(init.widthM);
  const [depthM, setDepthM]     = useState(init.depthM);
  const [aspectLocked, setAspectLocked] = useState(init.aspectRatioLocked);
  const aspectRatio = useMemo(() => widthM / Math.max(depthM, 0.1), [widthM, depthM]);

  const [variant, setVariant]             = useState<StageVariant>(init.variant);
  const [apronDepthPct, setApronDepthPct] = useState(init.apronDepthPct);

  const [fillColor, setFillColor] = useState(init.fillColor);

  const [borderEnabled, setBorderEnabled]     = useState(init.borderEnabled);
  const [borderStyle, setBorderStyle]         = useState<StageBorderStyle>(init.borderStyle);
  const [borderColor, setBorderColor]         = useState(init.borderColor);
  const [borderThickness, setBorderThickness] = useState<StageBorderThickness>(init.borderThickness);

  const [stairsEnabled, setStairsEnabled] = useState(init.stairsEnabled);
  const [stairsWidthM, setStairsWidthM]   = useState(init.stairsWidthM);
  const [stairsCount, setStairsCount]     = useState<2 | 3>(init.stairsCount);

  const [label, setLabel]               = useState(init.label);
  const [labelVisible, setLabelVisible] = useState(init.labelVisible);
  const [notes, setNotes]               = useState(init.notes);

  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['dimensions', 'variant', 'color', 'border', 'stairs', 'notes'])
  );

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Dimension handlers ─────────────────────────────────────────────────────
  const handleWidthChange = useCallback((v: number) => {
    setWidthM(v);
    if (aspectLocked) setDepthM(+(v / aspectRatio).toFixed(2));
  }, [aspectLocked, aspectRatio]);

  const handleDepthChange = useCallback((v: number) => {
    setDepthM(v);
    if (aspectLocked) setWidthM(+(v * aspectRatio).toFixed(2));
  }, [aspectLocked, aspectRatio]);

  const areaM2 = widthM * depthM;

  const borderThicknessPx = borderThickness === 'thin' ? 1.5 : borderThickness === 'thick' ? 5 : 2.5;
  const borderDash = borderStyle === 'decorative' ? '8,4' : undefined;

  // ── Preview geometry ───────────────────────────────────────────────────────
  const { bx, by, bw, bh, cx, cy } = useMemo(() => {
    const availW = PREVIEW_W - 100;
    const availH = PREVIEW_H - 100;
    const scale = Math.min(availW / Math.max(widthM, 0.1), availH / Math.max(depthM, 0.1)) * 0.65;
    const bw = widthM * scale;
    const bh = depthM * scale;
    const cx = PREVIEW_W / 2;
    const cy = PREVIEW_H / 2;
    return { bx: cx - bw / 2, by: cy - bh / 2, bw, bh, cx, cy };
  }, [widthM, depthM]);

  // Apron bows outward from the bottom edge
  const apronD = useMemo(() => {
    if (variant !== 'apron') return 0;
    return apronDepthPct * bh;
  }, [variant, apronDepthPct, bh]);

  // SVG path for stage shape (apron always bows from bottom)
  const stagePath = useMemo(() => {
    if (variant === 'rectangular') {
      return `M${bx},${by}H${bx + bw}V${by + bh}H${bx}Z`;
    }
    return `M${bx},${by}L${bx + bw},${by}L${bx + bw},${by + bh}C${bx + bw},${by + bh + apronD} ${bx},${by + bh + apronD} ${bx},${by + bh}Z`;
  }, [variant, bx, by, bw, bh, apronD]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    onPlace({
      widthM, depthM, aspectRatioLocked: aspectLocked,
      variant, apronDepthPct, frontEdge: 'bottom' as StageFrontEdge,
      fillColor,
      borderEnabled, borderStyle, borderColor, borderThickness,
      stairsEnabled, stairsWidthM, stairsCount,
      label, labelVisible, notes,
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
  const bThick = borderThicknessPx;
  const bColor = borderEnabled ? borderColor : 'transparent';

  // Stairs preview
  const renderPreviewStairs = () => {
    if (!stairsEnabled) return null;
    // Stairs always project from the bottom edge
    const stairsW = (stairsWidthM / Math.max(widthM, 0.01)) * bw;
    const stepD = 14;
    const totalPx = stairsCount * stepD;
    const baseY = by + bh + apronD;
    const fc = fillColor;
    const sc = borderEnabled ? borderColor : '#666';
    const treadLines = Array.from({ length: stairsCount - 1 }, (_, i) => i + 1);
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={cx - stairsW / 2} y={baseY} width={stairsW} height={totalPx} fill={fc} fillOpacity={0.7} />
        {treadLines.map((i) => (
          <line key={i} x1={cx - stairsW / 2} y1={baseY + i * stepD} x2={cx + stairsW / 2} y2={baseY + i * stepD} stroke={sc} strokeWidth={1} />
        ))}
        <rect x={cx - stairsW / 2} y={baseY} width={stairsW} height={totalPx} fill="none" stroke={sc} strokeWidth={1} />
      </g>
    );
  };

  const previewId = `stg-${Math.round(bw)}`;

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
        width: 840, maxWidth: '97vw',
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
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Stage</h2>
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
          <div style={{ width: 306, borderRight: '1px solid #f3f4f6', overflow: 'auto', flexShrink: 0 }}>

            {/* ── 1. DIMENSIONS ─────────────────────────────────────── */}
            <AccordionSection title="Dimensions" open={openSections.has('dimensions')} onToggle={() => toggleSection('dimensions')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Width (m)</label>
                  <input type="number" min={1} max={60} step={0.5} value={widthM}
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
                  <label style={labelStyle}>Depth (m)</label>
                  <input type="number" min={1} max={30} step={0.5} value={depthM}
                    onChange={(e) => handleDepthChange(Math.max(0.5, parseFloat(e.target.value) || 1))}
                    style={inputStyle} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
                {widthM} m × {depthM} m · {areaM2.toFixed(1)} m²
              </p>
            </AccordionSection>

            {/* ── 2. VARIANT & ORIENTATION ──────────────────────────── */}
            <AccordionSection title="Shape & Orientation" open={openSections.has('variant')} onToggle={() => toggleSection('variant')}>
              {/* Variant picker */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Shape variant</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['rectangular', 'apron'] as StageVariant[]).map((v) => (
                    <button key={v} onClick={() => setVariant(v)} style={segBtn(variant === v)}>
                      {v === 'rectangular' ? 'Rectangular' : 'Apron Stage'}
                    </button>
                  ))}
                </div>
                {variant === 'apron' && (
                  <div style={{ marginTop: 12 }}>
                    <label style={labelStyle}>Apron curve depth — {Math.round(apronDepthPct * 100)}%</label>
                    <input type="range" min={10} max={30} step={1}
                      value={Math.round(apronDepthPct * 100)}
                      onChange={(e) => setApronDepthPct(parseInt(e.target.value) / 100)}
                      style={{ width: '100%', accentColor: '#0f172a' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                      <span>10%</span><span>30%</span>
                    </div>
                  </div>
                )}
              </div>

            </AccordionSection>

            {/* ── 3. COLOUR ─────────────────────────────────────────── */}
            <AccordionSection title="Colour" open={openSections.has('color')} onToggle={() => toggleSection('color')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 12 }}>
                {PALETTE.map(({ hex, label: lbl }) => {
                  const sel = fillColor === hex;
                  return (
                    <button key={hex} onClick={() => setFillColor(hex)} title={lbl}
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

            {/* ── 4. BORDER ─────────────────────────────────────────── */}
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
                      {(['simple', 'double', 'decorative'] as StageBorderStyle[]).map((bs) => (
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
                        {(['thin', 'medium', 'thick'] as StageBorderThickness[]).map((bt) => (
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

            {/* ── 5. STAIRS ─────────────────────────────────────────── */}
            <AccordionSection title="Stairs" open={openSections.has('stairs')} onToggle={() => toggleSection('stairs')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Stairs</span>
                  <p style={{ margin: '1px 0 0', fontSize: 10, color: '#94a3b8' }}>Stepped notch on front edge</p>
                </div>
                <Toggle checked={stairsEnabled} onChange={setStairsEnabled} />
              </div>
              {stairsEnabled && (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Width (m)</label>
                    <input type="number" min={0.5} max={widthM} step={0.5} value={stairsWidthM}
                      onChange={(e) => setStairsWidthM(Math.max(0.5, parseFloat(e.target.value) || 1.5))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Steps</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([2, 3] as const).map((n) => (
                        <button key={n} onClick={() => setStairsCount(n)} style={segBtn(stairsCount === n)}>
                          {n} steps
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </AccordionSection>

            {/* ── 6. NOTES & LABEL ──────────────────────────────────── */}
            <AccordionSection title="Label & Notes" open={openSections.has('notes')} onToggle={() => toggleSection('notes')}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Label</label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Main Stage"
                  maxLength={40} style={inputStyle} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: '#374151' }}>Show on canvas</span>
                  <Toggle checked={labelVisible} onChange={setLabelVisible} />
                </div>
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

                {/* Stairs (behind stage so they appear below) */}
                {renderPreviewStairs()}

                {/* Stage surface */}
                <path
                  d={stagePath}
                  fill={fillColor}
                  stroke={borderEnabled ? borderColor : 'transparent'}
                  strokeWidth={borderEnabled ? bThick : 0}
                  strokeDasharray={borderDash}
                />

                {/* Double border inner */}
                {borderEnabled && borderStyle === 'double' && (() => {
                  const inset = bThick * 2 + 3;
                  if (variant === 'rectangular') {
                    return (
                      <rect
                        x={bx + inset} y={by + inset}
                        width={Math.max(1, bw - inset * 2)} height={Math.max(1, bh - inset * 2)}
                        fill="none" stroke={bColor} strokeWidth={bThick * 0.6} opacity={0.6}
                        style={{ pointerEvents: 'none' }}
                      />
                    );
                  }
                  return null; // skip inner border for apron (complex)
                })()}

                {/* Label */}
                {labelVisible && label && (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                    fontSize={Math.max(10, Math.min(18, bw / 7))}
                    fill={['#111111', '#333333', '#4a2e1a', '#2d5a3d', '#1e3a5f'].includes(fillColor) ? '#f8fafc' : '#374151'}
                    fontWeight="600"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {label}
                  </text>
                )}
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
          {[
            `${widthM} m × ${depthM} m`,
            `${areaM2.toFixed(1)} m²`,
            variant === 'apron' ? `Apron ${Math.round(apronDepthPct * 100)}%` : 'Rectangular',
            stairsEnabled ? `${stairsCount} steps` : null,
          ].filter(Boolean).map((chip) => (
            <span key={chip as string} style={{
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
            {PALETTE.find((p) => p.hex === fillColor)?.label ?? 'Custom'}
          </span>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {widthM} × {depthM} m · {variant === 'apron' ? 'Apron' : 'Rectangular'}
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
              {initialData ? 'Update Stage' : 'Add to Canvas'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default StageConfigModal;
