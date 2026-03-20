/**
 * Bar Configuration Modal
 *
 * 5 shape variants with live vertex editor, back bar, service side,
 * stools, top material, colour, label & notes.
 * Backward-compatible — all new fields optional.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  VertexShapeEditor,
  computeShapePath,
  BASE_SHAPE_DATA,
} from './VertexShapeEditor';
import type { CustomShapeData } from './VertexShapeEditor';

// ── Types ─────────────────────────────────────────────────────────────────────

type BarVariant = 'straight' | 'corner' | 'l-shape' | 'u-shape' | 'arc';
type ServiceSide = 'top' | 'bottom' | 'left' | 'right';
type TopMaterial = 'wood' | 'marble' | 'stainless' | 'granite';

export interface BarData {
  widthM: number;
  depthM: number;
  aspectRatioLocked?: boolean;
  variant: BarVariant;
  customShapeData?: CustomShapeData | null;
  backBarEnabled?: boolean;
  backBarDepthM?: number;
  backBarGapM?: number;
  serviceSide?: ServiceSide;
  stoolsEnabled?: boolean;
  stoolCount?: number;
  topMaterial?: TopMaterial;
  fillColor: string;
  borderEnabled: boolean;
  borderColor: string;
  label: string;
  labelVisible: boolean;
  notes: string;
}

interface BarConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlace: (data: BarData) => void;
  initialData?: BarData;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PREVIEW_W = 420;
const PREVIEW_H = 360;

const PALETTE = [
  { hex: '#c8a074', label: 'Oak' },
  { hex: '#8b6340', label: 'Walnut' },
  { hex: '#a0522d', label: 'Mahogany' },
  { hex: '#f5f0e8', label: 'Cream' },
  { hex: '#ffffff', label: 'White' },
  { hex: '#e0e0e0', label: 'Silver' },
  { hex: '#888888', label: 'Gray' },
  { hex: '#4a4a4a', label: 'Charcoal' },
  { hex: '#111111', label: 'Black' },
  { hex: '#1c3d5a', label: 'Navy' },
  { hex: '#2d5a3d', label: 'Forest' },
  { hex: '#d4a843', label: 'Gold' },
  { hex: '#b3d4f5', label: 'Sky' },
  { hex: '#e8b4c8', label: 'Blush' },
  { hex: '#b8c4b8', label: 'Sage' },
  { hex: '#fdf6e3', label: 'Ivory' },
];

const TOP_MATERIALS: { id: TopMaterial; label: string; color: string }[] = [
  { id: 'wood',      label: 'Wood',      color: '#c8a074' },
  { id: 'marble',    label: 'Marble',    color: '#e8e0d8' },
  { id: 'stainless', label: 'Stainless', color: '#c0c8d0' },
  { id: 'granite',   label: 'Granite',   color: '#4a4a52' },
];

const SERVICE_SIDES: { id: ServiceSide; label: string }[] = [
  { id: 'top',    label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'left',   label: 'Left' },
  { id: 'right',  label: 'Right' },
];

const VARIANTS: { id: BarVariant; label: string }[] = [
  { id: 'straight', label: 'Straight' },
  { id: 'corner',   label: 'Corner' },
  { id: 'l-shape',  label: 'L-Shape' },
  { id: 'u-shape',  label: 'U-Shape' },
  { id: 'arc',      label: 'Arc' },
];

const DEFAULT_DATA: BarData = {
  widthM: 3.0, depthM: 0.6, aspectRatioLocked: false,
  variant: 'straight', customShapeData: null,
  backBarEnabled: false, backBarDepthM: 0.5, backBarGapM: 1.0,
  serviceSide: 'bottom',
  stoolsEnabled: false, stoolCount: 6,
  topMaterial: 'wood',
  fillColor: '#c8a074', borderEnabled: true, borderColor: '#8b6340',
  label: 'Bar', labelVisible: true, notes: '',
};

const STRAIGHT_EDGE = { curved: false, cpx: 0.5, cpy: 0.5 };

// ── Bar-specific shape data ───────────────────────────────────────────────────
const BAR_SHAPE_DATA: Record<BarVariant, CustomShapeData> = {
  straight: BASE_SHAPE_DATA['rectangular'] as CustomShapeData,
  corner: {
    corners: [
      { x: 0,    y: 0 },
      { x: 1,    y: 0 },
      { x: 1,    y: 0.5 },
      { x: 0.5,  y: 0.5 },
      { x: 0.5,  y: 1 },
      { x: 0,    y: 1 },
    ],
    edges: Array(6).fill(STRAIGHT_EDGE),
  },
  'l-shape': {
    corners: [
      { x: 0,    y: 0 },
      { x: 1,    y: 0 },
      { x: 1,    y: 0.35 },
      { x: 0.45, y: 0.35 },
      { x: 0.45, y: 1 },
      { x: 0,    y: 1 },
    ],
    edges: Array(6).fill(STRAIGHT_EDGE),
  },
  'u-shape': {
    corners: [
      { x: 0,    y: 0 },
      { x: 1,    y: 0 },
      { x: 1,    y: 1 },
      { x: 0.72, y: 1 },
      { x: 0.72, y: 0.32 },
      { x: 0.28, y: 0.32 },
      { x: 0.28, y: 1 },
      { x: 0,    y: 1 },
    ],
    edges: Array(8).fill(STRAIGHT_EDGE),
  },
  arc: {
    corners: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.4 },
      { x: 0, y: 0.4 },
    ],
    edges: [
      STRAIGHT_EDGE,
      STRAIGHT_EDGE,
      { curved: true, cpx: 0.5, cpy: 1.5 },
      STRAIGHT_EDGE,
    ],
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function BarShapeIcon({ variant, active }: { variant: BarVariant; active: boolean }) {
  const c = active ? '#fff' : '#475569';
  const fill = active ? 'rgba(255,255,255,0.25)' : '#f1f5f9';
  const vb = '0 0 40 32';
  switch (variant) {
    case 'straight':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <rect x="4" y="10" width="32" height="12" rx="1.5" fill={fill} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'corner':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <path d="M4,6 H36 V18 H22 V26 H4 Z" fill={fill} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'l-shape':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <path d="M4,4 H36 V16 H22 V28 H4 Z" fill={fill} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'u-shape':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <path d="M4,4 H36 V28 H26 V14 H14 V28 H4 Z" fill={fill} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'arc':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <path d="M4,8 H36 V16 Q20,30 4,16 Z" fill={fill} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
}

// ── Preview helpers ───────────────────────────────────────────────────────────

function buildServiceSideLine(
  side: ServiceSide,
  bx: number, by: number, bw: number, bh: number
): string {
  switch (side) {
    case 'top':    return `M${bx},${by} H${bx + bw}`;
    case 'bottom': return `M${bx},${by + bh} H${bx + bw}`;
    case 'left':   return `M${bx},${by} V${by + bh}`;
    case 'right':  return `M${bx + bw},${by} V${by + bh}`;
    default:       return '';
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export const BarConfigModal: React.FC<BarConfigModalProps> = ({
  isOpen, onClose, onPlace, initialData,
}) => {
  const init = initialData ?? DEFAULT_DATA;

  // Dimensions
  const [widthM,       setWidthM]       = useState(init.widthM);
  const [depthM,       setDepthM]       = useState(init.depthM);
  const [aspectLocked, setAspectLocked] = useState(init.aspectRatioLocked ?? false);

  // Shape
  const [variant,         setVariant]         = useState<BarVariant>(init.variant ?? 'straight');
  const [customShapeData, setCustomShapeData] = useState<CustomShapeData | null>(init.customShapeData ?? null);
  const [hasCustomEdits,  setHasCustomEdits]  = useState(!!init.customShapeData);

  // Details
  const [backBarEnabled,  setBackBarEnabled]  = useState(init.backBarEnabled ?? false);
  const [backBarDepthM,   setBackBarDepthM]   = useState(init.backBarDepthM ?? 0.5);
  const [backBarGapM,     setBackBarGapM]     = useState(init.backBarGapM ?? 1.0);
  const [serviceSide,     setServiceSide]     = useState<ServiceSide>(init.serviceSide ?? 'bottom');
  const [stoolsEnabled,   setStoolsEnabled]   = useState(init.stoolsEnabled ?? false);
  const [stoolCount,      setStoolCount]      = useState(init.stoolCount ?? 6);
  const [topMaterial,     setTopMaterial]     = useState<TopMaterial>(init.topMaterial ?? 'wood');

  // Colour
  const [fillColor,     setFillColor]     = useState(init.fillColor);
  const [borderEnabled, setBorderEnabled] = useState(init.borderEnabled);
  const [borderColor,   setBorderColor]   = useState(init.borderColor);

  // Label & notes
  const [label,        setLabel]        = useState(init.label);
  const [labelVisible, setLabelVisible] = useState(init.labelVisible);
  const [notes,        setNotes]        = useState(init.notes);

  // Accordion state
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['dimensions', 'shape', 'editor', 'details', 'colour', 'label'])
  );
  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Effective shape data
  const effectiveShapeData = useMemo(
    () => (customShapeData ?? BAR_SHAPE_DATA[variant] ?? BASE_SHAPE_DATA['rectangular']) as CustomShapeData,
    [customShapeData, variant]
  );

  // Preview geometry
  const previewGeo = useMemo(() => {
    const backRoom = backBarEnabled ? (backBarDepthM + backBarGapM) : 0;
    const totalDepth = depthM + backRoom;
    const availW = PREVIEW_W - 80;
    const availH = PREVIEW_H - 80;
    const scale  = Math.min(availW / Math.max(widthM, 0.1), availH / Math.max(totalDepth, 0.1)) * 0.5;
    const bw = widthM * scale;
    const bh = depthM * scale;
    const cx = PREVIEW_W / 2;
    const cy = PREVIEW_H / 2 + (backBarEnabled ? (backBarGapM + backBarDepthM) * scale * 0.25 : 0);
    const bx = cx - bw / 2;
    const by = cy - bh / 2;
    // Back bar rect: positioned above (top side) the main bar
    const bbH = backBarDepthM * scale;
    const gap  = backBarGapM * scale;
    const bbY  = by - gap - bbH;
    return { bx, by, bw, bh, cx, cy, bbH, gap, bbY, scale };
  }, [widthM, depthM, backBarEnabled, backBarDepthM, backBarGapM]);

  const { bx, by, bw, bh, cx, cy, bbH, bbY } = previewGeo;

  const barPath = useMemo(
    () => computeShapePath(effectiveShapeData, bx, by, bw, bh),
    [effectiveShapeData, bx, by, bw, bh]
  );

  const serviceLine = useMemo(
    () => buildServiceSideLine(serviceSide, bx, by, bw, bh),
    [serviceSide, bx, by, bw, bh]
  );

  // Stool positions along the service side
  const stoolPositions = useMemo(() => {
    if (!stoolsEnabled || stoolCount < 1) return [];
    const r = Math.min(bw, bh) * 0.08;
    const positions: { x: number; y: number }[] = [];
    const n = stoolCount;
    const offset = r * 2.2;
    if (serviceSide === 'bottom' || serviceSide === 'top') {
      const sy = serviceSide === 'bottom' ? by + bh + offset : by - offset;
      for (let i = 0; i < n; i++) {
        positions.push({ x: bx + (bw / (n + 1)) * (i + 1), y: sy });
      }
    } else {
      const sx = serviceSide === 'right' ? bx + bw + offset : bx - offset;
      for (let i = 0; i < n; i++) {
        positions.push({ x: sx, y: by + (bh / (n + 1)) * (i + 1) });
      }
    }
    return positions;
  }, [stoolsEnabled, stoolCount, serviceSide, bx, by, bw, bh]);

  const stoolR = Math.min(bw, bh) * 0.08;

  const handleVariantChange = useCallback((v: BarVariant) => {
    if (hasCustomEdits && v !== variant) {
      if (!window.confirm('Changing shape will reset your custom vertex edits. Continue?')) return;
    }
    setVariant(v);
    setCustomShapeData(null);
    setHasCustomEdits(false);
  }, [hasCustomEdits, variant]);

  const handleShapeEditorChange = useCallback((data: CustomShapeData) => {
    setCustomShapeData(data);
    setHasCustomEdits(true);
  }, []);

  const handleResetShape = useCallback(() => {
    setCustomShapeData(null);
    setHasCustomEdits(false);
  }, []);

  const handleWidthChange = useCallback((v: number) => {
    setWidthM(v);
    if (aspectLocked) setDepthM(parseFloat((v * (depthM / widthM)).toFixed(2)));
  }, [aspectLocked, depthM, widthM]);

  const handleDepthChange = useCallback((v: number) => {
    setDepthM(v);
    if (aspectLocked) setWidthM(parseFloat((v * (widthM / depthM)).toFixed(2)));
  }, [aspectLocked, widthM, depthM]);

  const handleAdd = () => {
    onPlace({
      widthM, depthM, aspectRatioLocked: aspectLocked,
      variant, customShapeData: hasCustomEdits ? customShapeData : null,
      backBarEnabled, backBarDepthM, backBarGapM,
      serviceSide, stoolsEnabled, stoolCount, topMaterial,
      fillColor, borderEnabled, borderColor,
      label, labelVisible, notes,
    });
    onClose();
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none',
    color: '#0f172a', boxSizing: 'border-box', background: '#fff',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5,
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  };
  const isDark = ['#111111', '#333333', '#4a4a4a', '#1c3d5a', '#2d5a3d'].includes(fillColor);
  const matColor = TOP_MATERIALS.find(m => m.id === topMaterial)?.color ?? '#c8a074';

  if (!isOpen) return null;

  const content = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 780, maxWidth: '97vw', background: '#ffffff', borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', maxHeight: '95vh',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Bar</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Configure shape, back bar and add to canvas</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left panel — config */}
          <div style={{ width: 310, borderRight: '1px solid #f3f4f6', overflow: 'auto', flexShrink: 0 }}>

            {/* Dimensions */}
            <AccordionSection title="Dimensions" open={openSections.has('dimensions')} onToggle={() => toggleSection('dimensions')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <div>
                  <label style={labelStyle}>Width (m)</label>
                  <input type="number" min={0.5} max={20} step={0.5} value={widthM}
                    onChange={(e) => handleWidthChange(Math.max(0.5, parseFloat(e.target.value) || 1))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Depth (m)</label>
                  <input type="number" min={0.3} max={5} step={0.1} value={depthM}
                    onChange={(e) => handleDepthChange(Math.max(0.3, parseFloat(e.target.value) || 0.6))}
                    style={inputStyle} />
                </div>
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: '#374151' }}>Lock aspect ratio</span>
                <Toggle checked={aspectLocked} onChange={setAspectLocked} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 10, color: '#94a3b8' }}>{widthM} m × {depthM} m</p>
            </AccordionSection>

            {/* Shape variant picker */}
            <AccordionSection title="Shape" open={openSections.has('shape')} onToggle={() => toggleSection('shape')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 8 }}>
                {VARIANTS.map(({ id, label: lbl }) => {
                  const active = variant === id;
                  return (
                    <button key={id} onClick={() => handleVariantChange(id)}
                      title={lbl}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                        background: active ? '#0f172a' : '#fff',
                        transition: 'all 0.15s',
                      }}>
                      <BarShapeIcon variant={id} active={active} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: active ? '#fff' : '#64748b', textAlign: 'center', lineHeight: 1.2 }}>{lbl}</span>
                    </button>
                  );
                })}
              </div>
            </AccordionSection>

            {/* Shape editor */}
            <AccordionSection title="Shape Editor" open={openSections.has('editor')} onToggle={() => toggleSection('editor')}>
              <div style={{ marginBottom: 8 }}>
                <VertexShapeEditor
                  shapeData={effectiveShapeData}
                  onChange={handleShapeEditorChange}
                  fillColor={fillColor}
                  svgWidth={270}
                  svgHeight={180}
                />
              </div>
              {hasCustomEdits && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600 }}>Custom shape active</span>
                  <button onClick={handleResetShape}
                    style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                    Reset
                  </button>
                </div>
              )}
              <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94a3b8' }}>Drag corners to reshape · Pull edge midpoints to curve</p>
            </AccordionSection>

            {/* Details */}
            <AccordionSection title="Details" open={openSections.has('details')} onToggle={() => toggleSection('details')}>

              {/* Back bar */}
              <div style={{ ...rowStyle, marginBottom: backBarEnabled ? 14 : 8 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Back bar</span>
                <Toggle checked={backBarEnabled} onChange={setBackBarEnabled} />
              </div>
              {backBarEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Depth (m)</label>
                    <input type="number" min={0.2} max={2} step={0.1} value={backBarDepthM}
                      onChange={(e) => setBackBarDepthM(Math.max(0.2, parseFloat(e.target.value) || 0.5))}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Gap (m)</label>
                    <input type="number" min={0.3} max={3} step={0.1} value={backBarGapM}
                      onChange={(e) => setBackBarGapM(Math.max(0.3, parseFloat(e.target.value) || 1))}
                      style={inputStyle} />
                  </div>
                </div>
              )}

              {/* Service side */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Service Side</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {SERVICE_SIDES.map(({ id, label: lbl }) => {
                    const active = serviceSide === id;
                    return (
                      <button key={id} onClick={() => setServiceSide(id)}
                        style={{
                          padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                          background: active ? '#0f172a' : '#fff',
                          color: active ? '#fff' : '#374151', textAlign: 'center',
                        }}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stools */}
              <div style={{ ...rowStyle, marginBottom: stoolsEnabled ? 10 : 0 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Bar stools</span>
                <Toggle checked={stoolsEnabled} onChange={setStoolsEnabled} />
              </div>
              {stoolsEnabled && (
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Number of stools</label>
                  <input type="number" min={1} max={20} step={1} value={stoolCount}
                    onChange={(e) => setStoolCount(Math.max(1, parseInt(e.target.value) || 6))}
                    style={inputStyle} />
                </div>
              )}

              {/* Top material */}
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Top Material</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {TOP_MATERIALS.map(({ id, label: lbl, color }) => {
                    const active = topMaterial === id;
                    return (
                      <button key={id} onClick={() => setTopMaterial(id)} title={lbl}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                          border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                          background: active ? '#0f172a' : '#fff',
                        }}>
                        <div style={{ width: 22, height: 22, borderRadius: 4, background: color, border: '1px solid rgba(0,0,0,0.1)' }} />
                        <span style={{ fontSize: 9, fontWeight: 600, color: active ? '#fff' : '#64748b', textAlign: 'center', lineHeight: 1.2 }}>{lbl}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </AccordionSection>

            {/* Colour */}
            <AccordionSection title="Colour" open={openSections.has('colour')} onToggle={() => toggleSection('colour')}>
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
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Custom</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)}
                    style={{ width: 40, height: 34, borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                  <input type="text" value={fillColor} onChange={(e) => setFillColor(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
              <div style={{ ...rowStyle }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Border</span>
                <Toggle checked={borderEnabled} onChange={setBorderEnabled} />
              </div>
              {borderEnabled && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)}
                      style={{ width: 36, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                    <input type="text" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} style={{ ...inputStyle }} />
                  </div>
                </div>
              )}
            </AccordionSection>

            {/* Label & Notes */}
            <AccordionSection title="Label & Notes" open={openSections.has('label')} onToggle={() => toggleSection('label')}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Label</label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Main Bar" maxLength={40} style={inputStyle} />
                <div style={{ ...rowStyle, marginTop: 8 }}>
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

          </div>{/* end left panel */}

          {/* Right panel — preview */}
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', background: '#fafafa', overflow: 'hidden' }}>
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <svg width={PREVIEW_W} height={PREVIEW_H} viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`} style={{ display: 'block' }}>
                <defs>
                  <pattern id="bar-dot" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.7" fill="#b8c4d0" opacity="0.35" />
                  </pattern>
                </defs>
                <rect width={PREVIEW_W} height={PREVIEW_H} fill="url(#bar-dot)" />

                {/* Back bar */}
                {backBarEnabled && (
                  <rect x={bx} y={bbY} width={bw} height={bbH}
                    fill={fillColor} fillOpacity={0.5}
                    stroke={borderEnabled ? borderColor : '#8b6340'} strokeWidth={1.5}
                    strokeDasharray="4,3" rx="2" />
                )}

                {/* Gap label */}
                {backBarEnabled && (
                  <text x={bx + bw + 6} y={(bbY + by) / 2} fontSize={9} fill="#94a3b8" dominantBaseline="middle">
                    {backBarGapM}m gap
                  </text>
                )}

                {/* Main bar */}
                <path d={barPath} fill={fillColor} stroke={borderEnabled ? borderColor : 'none'} strokeWidth={borderEnabled ? 2 : 0} />

                {/* Material stripe on top face of bar */}
                <rect x={bx + 2} y={by + 2} width={bw - 4} height={Math.min(bh * 0.35, 10)}
                  fill={matColor} fillOpacity={0.4} rx="1" />

                {/* Service side dashed line */}
                <path d={serviceLine} fill="none" stroke="#e11d48" strokeWidth={2.5} strokeDasharray="5,3" />

                {/* Stools */}
                {stoolPositions.map((pos, i) => (
                  <circle key={i} cx={pos.x} cy={pos.y} r={stoolR}
                    fill="none" stroke="#475569" strokeWidth={1.5} />
                ))}

                {/* Label */}
                {labelVisible && label && (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                    fontSize={Math.max(10, Math.min(16, bw / 6))}
                    fill={isDark ? '#f8fafc' : '#374151'} fontWeight="600"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {label}
                  </text>
                )}
              </svg>
            </div>

            {/* Preview caption */}
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                {VARIANTS.find(v => v.id === variant)?.label}
              </span>
              {backBarEnabled && (
                <span style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                  Back bar {backBarDepthM}m
                </span>
              )}
              {stoolsEnabled && (
                <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                  {stoolCount} stools
                </span>
              )}
              {hasCustomEdits && (
                <span style={{ fontSize: 10, background: '#fdf4ff', color: '#9333ea', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                  Custom shape
                </span>
              )}
            </div>
          </div>

        </div>{/* end body */}

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {widthM} × {depthM} m · {VARIANTS.find(v => v.id === variant)?.label} · Service: {serviceSide}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleAdd}
              style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a'; }}
            >
              {initialData ? 'Update Bar' : 'Add to Canvas'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default BarConfigModal;
