/**
 * Cocktail Table Configuration Modal
 *
 * 4 shape variants with live vertex editor, linen, seats,
 * colour, label & notes.
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

type CocktailVariant = 'round' | 'rectangular' | 'square' | 'oval';

export interface CocktailData {
  widthM: number;
  depthM: number;
  aspectRatioLocked?: boolean;
  variant: CocktailVariant;
  customShapeData?: CustomShapeData | null;
  tableHeightM?: number;
  linenEnabled?: boolean;
  linenColor?: string;
  seatsEnabled?: boolean;
  seatCount?: number;
  fillColor: string;
  borderEnabled: boolean;
  borderColor: string;
  label: string;
  labelVisible: boolean;
  notes: string;
}

interface CocktailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlace: (data: CocktailData) => void;
  initialData?: CocktailData;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PREVIEW_W = 420;
const PREVIEW_H = 360;

const PALETTE = [
  { hex: '#ffffff', label: 'White' },
  { hex: '#f5f0e8', label: 'Cream' },
  { hex: '#fdf6e3', label: 'Ivory' },
  { hex: '#e8dcc8', label: 'Linen' },
  { hex: '#c8a074', label: 'Oak' },
  { hex: '#8b6340', label: 'Walnut' },
  { hex: '#e0e0e0', label: 'Silver' },
  { hex: '#888888', label: 'Gray' },
  { hex: '#333333', label: 'Charcoal' },
  { hex: '#111111', label: 'Black' },
  { hex: '#b3d4f5', label: 'Sky' },
  { hex: '#b8e0c4', label: 'Mint' },
  { hex: '#d4a843', label: 'Gold' },
  { hex: '#e8b4c8', label: 'Blush' },
  { hex: '#7c5cbf', label: 'Purple' },
  { hex: '#2d5a3d', label: 'Forest' },
];

const VARIANTS: { id: CocktailVariant; label: string }[] = [
  { id: 'round',       label: 'Round' },
  { id: 'rectangular', label: 'Rect.' },
  { id: 'square',      label: 'Square' },
  { id: 'oval',        label: 'Oval' },
];

const DEFAULT_DATA: CocktailData = {
  widthM: 0.6, depthM: 0.6, aspectRatioLocked: false,
  variant: 'round', customShapeData: null,
  tableHeightM: 1.1,
  linenEnabled: false, linenColor: '#ffffff',
  seatsEnabled: false, seatCount: 4,
  fillColor: '#f5f0e8', borderEnabled: true, borderColor: '#c8a074',
  label: 'Cocktail', labelVisible: true, notes: '',
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

function CocktailShapeIcon({ variant, active }: { variant: CocktailVariant; active: boolean }) {
  const c = active ? '#fff' : '#475569';
  const fill = active ? 'rgba(255,255,255,0.25)' : '#f1f5f9';
  const vb = '0 0 40 32';
  switch (variant) {
    case 'round':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <circle cx="20" cy="16" r="11" fill={fill} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'rectangular':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <rect x="4" y="8" width="32" height="16" rx="1.5" fill={fill} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'square':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <rect x="8" y="4" width="24" height="24" rx="1.5" fill={fill} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'oval':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <ellipse cx="20" cy="16" rx="16" ry="11" fill={fill} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
}

// ── Shape data mapping ─────────────────────────────────────────────────────────
// round/oval are drawn as ellipses in the preview, not as polygon paths,
// but we still need shape data for the VertexShapeEditor (polygon fallback)
function getBaseShapeData(variant: CocktailVariant): CustomShapeData {
  if (variant === 'round' || variant === 'square' || variant === 'oval') {
    return BASE_SHAPE_DATA['rectangular'] as CustomShapeData;
  }
  return BASE_SHAPE_DATA['rectangular'] as CustomShapeData;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const CocktailConfigModal: React.FC<CocktailConfigModalProps> = ({
  isOpen, onClose, onPlace, initialData,
}) => {
  const init = initialData ?? DEFAULT_DATA;

  // Dimensions
  const [widthM,       setWidthM]       = useState(init.widthM);
  const [depthM,       setDepthM]       = useState(init.depthM);
  const [aspectLocked, setAspectLocked] = useState(init.aspectRatioLocked ?? false);

  // Shape
  const [variant,         setVariant]         = useState<CocktailVariant>(init.variant ?? 'round');
  const [customShapeData, setCustomShapeData] = useState<CustomShapeData | null>(init.customShapeData ?? null);
  const [hasCustomEdits,  setHasCustomEdits]  = useState(!!init.customShapeData);

  // Details
  const [tableHeightM,  setTableHeightM]  = useState(init.tableHeightM ?? 1.1);
  const [linenEnabled,  setLinenEnabled]  = useState(init.linenEnabled ?? false);
  const [linenColor,    setLinenColor]    = useState(init.linenColor ?? '#ffffff');
  const [seatsEnabled,  setSeatsEnabled]  = useState(init.seatsEnabled ?? false);
  const [seatCount,     setSeatCount]     = useState(init.seatCount ?? 4);

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

  // Effective shape data (for VertexShapeEditor)
  const effectiveShapeData = useMemo(
    () => (customShapeData ?? getBaseShapeData(variant)) as CustomShapeData,
    [customShapeData, variant]
  );

  // Preview geometry
  const previewGeo = useMemo(() => {
    const linenPad = linenEnabled ? 0.25 : 0;
    const totalW = widthM + linenPad * 2;
    const totalD = depthM + linenPad * 2;
    const availW = PREVIEW_W - 100;
    const availH = PREVIEW_H - 100;
    const scale  = Math.min(availW / Math.max(totalW, 0.1), availH / Math.max(totalD, 0.1)) * 0.65;
    const bw = widthM * scale;
    const bh = depthM * scale;
    const cx = PREVIEW_W / 2;
    const cy = PREVIEW_H / 2;
    const bx = cx - bw / 2;
    const by = cy - bh / 2;
    const lPad = linenPad * scale;
    return { bx, by, bw, bh, cx, cy, lPad, scale };
  }, [widthM, depthM, linenEnabled]);

  const { bx, by, bw, bh, cx, cy, lPad } = previewGeo;

  // Seat positions around perimeter
  const seatPositions = useMemo(() => {
    if (!seatsEnabled || seatCount < 1) return [];
    const positions: { x: number; y: number; angle: number }[] = [];
    const n = seatCount;
    const r = Math.max(bw, bh) * 0.5 + 14; // offset from center
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      positions.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        angle,
      });
    }
    return positions;
  }, [seatsEnabled, seatCount, bw, bh, cx, cy]);

  const seatR = 6;

  const handleVariantChange = useCallback((v: CocktailVariant) => {
    if (hasCustomEdits && v !== variant) {
      if (!window.confirm('Changing shape will reset your custom vertex edits. Continue?')) return;
    }
    setVariant(v);
    setCustomShapeData(null);
    setHasCustomEdits(false);
    // For round/square: keep aspect ratio 1:1
    if (v === 'round' || v === 'square') {
      const s = Math.max(widthM, depthM);
      setWidthM(s);
      setDepthM(s);
    }
  }, [hasCustomEdits, variant, widthM, depthM]);

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
    if (aspectLocked || variant === 'round' || variant === 'square') {
      setDepthM(v);
    }
  }, [aspectLocked, variant]);

  const handleDepthChange = useCallback((v: number) => {
    setDepthM(v);
    if (aspectLocked || variant === 'round' || variant === 'square') {
      setWidthM(v);
    }
  }, [aspectLocked, variant]);

  const handleAdd = () => {
    onPlace({
      widthM, depthM, aspectRatioLocked: aspectLocked,
      variant, customShapeData: hasCustomEdits ? customShapeData : null,
      tableHeightM, linenEnabled, linenColor, seatsEnabled, seatCount,
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

  if (!isOpen) return null;

  const isRoundish = variant === 'round' || variant === 'oval';
  const rx = isRoundish ? bw / 2 : (variant === 'square' ? 2 : 3);
  const ry = isRoundish ? bh / 2 : (variant === 'square' ? 2 : 3);

  // For linen: draw an oversized ellipse/rect behind the table
  const linenRxExtra = lPad + (isRoundish ? bw / 2 : bw / 2);
  const linenRyExtra = lPad + (isRoundish ? bh / 2 : bh / 2);

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
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Cocktail Table</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Configure shape, linen, seats and add to canvas</p>
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
                  <input type="number" min={0.3} max={5} step={0.1} value={widthM}
                    onChange={(e) => handleWidthChange(Math.max(0.3, parseFloat(e.target.value) || 0.6))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Depth (m)</label>
                  <input type="number" min={0.3} max={5} step={0.1} value={depthM}
                    onChange={(e) => handleDepthChange(Math.max(0.3, parseFloat(e.target.value) || 0.6))}
                    style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Height (m) <span style={{ color: '#cbd5e1', fontWeight: 400 }}>— for supplier notes</span></label>
                <input type="number" min={0.5} max={2} step={0.05} value={tableHeightM}
                  onChange={(e) => setTableHeightM(Math.max(0.5, parseFloat(e.target.value) || 1.1))}
                  style={inputStyle} />
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: '#374151' }}>Lock aspect ratio</span>
                <Toggle checked={aspectLocked} onChange={setAspectLocked} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 10, color: '#94a3b8' }}>{widthM} m × {depthM} m · {tableHeightM} m tall</p>
            </AccordionSection>

            {/* Shape variant picker */}
            <AccordionSection title="Shape" open={openSections.has('shape')} onToggle={() => toggleSection('shape')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
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
                      <CocktailShapeIcon variant={id} active={active} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: active ? '#fff' : '#64748b', textAlign: 'center', lineHeight: 1.2 }}>{lbl}</span>
                    </button>
                  );
                })}
              </div>
            </AccordionSection>

            {/* Shape editor — only for rect/square variants */}
            {(variant === 'rectangular' || variant === 'square') && (
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
            )}

            {/* Details */}
            <AccordionSection title="Details" open={openSections.has('details')} onToggle={() => toggleSection('details')}>

              {/* Linen */}
              <div style={{ ...rowStyle, marginBottom: linenEnabled ? 14 : 8 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Linen tablecloth</span>
                <Toggle checked={linenEnabled} onChange={setLinenEnabled} />
              </div>
              {linenEnabled && (
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Linen Colour</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={linenColor} onChange={(e) => setLinenColor(e.target.value)}
                      style={{ width: 36, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                    <input type="text" value={linenColor} onChange={(e) => setLinenColor(e.target.value)}
                      style={{ ...inputStyle }} />
                  </div>
                </div>
              )}

              {/* Seats */}
              <div style={{ ...rowStyle, marginBottom: seatsEnabled ? 10 : 0 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Show seats</span>
                <Toggle checked={seatsEnabled} onChange={setSeatsEnabled} />
              </div>
              {seatsEnabled && (
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Number of seats</label>
                  <input type="number" min={1} max={12} step={1} value={seatCount}
                    onChange={(e) => setSeatCount(Math.max(1, parseInt(e.target.value) || 4))}
                    style={inputStyle} />
                </div>
              )}
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
                  placeholder="e.g. Cocktail Table" maxLength={40} style={inputStyle} />
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
                  <pattern id="cktl-dot" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.7" fill="#b8c4d0" opacity="0.35" />
                  </pattern>
                </defs>
                <rect width={PREVIEW_W} height={PREVIEW_H} fill="url(#cktl-dot)" />

                {/* Linen — oversized shape behind table */}
                {linenEnabled && (
                  <ellipse cx={cx} cy={cy} rx={linenRxExtra} ry={linenRyExtra}
                    fill={linenColor} fillOpacity={0.55}
                    stroke={linenColor} strokeWidth={1} strokeOpacity={0.4} />
                )}

                {/* Seats */}
                {seatPositions.map((pos, i) => (
                  <circle key={i} cx={pos.x} cy={pos.y} r={seatR}
                    fill="none" stroke="#475569" strokeWidth={1.5} />
                ))}

                {/* Table body */}
                {isRoundish ? (
                  <ellipse cx={cx} cy={cy} rx={bw / 2} ry={bh / 2}
                    fill={fillColor}
                    stroke={borderEnabled ? borderColor : 'none'} strokeWidth={borderEnabled ? 2 : 0} />
                ) : (
                  <rect x={bx} y={by} width={bw} height={bh}
                    rx={rx} ry={ry}
                    fill={fillColor}
                    stroke={borderEnabled ? borderColor : 'none'} strokeWidth={borderEnabled ? 2 : 0} />
                )}

                {/* Top sheen ring */}
                {isRoundish ? (
                  <ellipse cx={cx} cy={cy} rx={bw / 2 - 3} ry={bh / 2 - 3}
                    fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
                ) : (
                  <rect x={bx + 4} y={by + 4} width={bw - 8} height={bh - 8}
                    rx={Math.max(0, rx - 2)} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                )}

                {/* Label */}
                {labelVisible && label && (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                    fontSize={Math.max(10, Math.min(16, bw / 4))}
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
              {linenEnabled && (
                <span style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                  Linen
                </span>
              )}
              {seatsEnabled && (
                <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                  {seatCount} seats
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
            {widthM} × {depthM} m · {tableHeightM} m tall · {VARIANTS.find(v => v.id === variant)?.label}
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
              {initialData ? 'Update Table' : 'Add to Canvas'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default CocktailConfigModal;
