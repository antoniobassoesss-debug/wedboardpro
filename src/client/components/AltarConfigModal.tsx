/**
 * Altar Configuration Modal
 *
 * Full redesign: 5 shape variants with live vertex editor, arch, draping,
 * colour, label & notes. Backward-compatible — new fields are optional.
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

type ArchStyle    = 'round' | 'gothic' | 'geometric' | 'organic';
type ArchMaterial = 'floral' | 'greenery' | 'wood-metal' | 'fabric';
type DrapingStyle = 'full-cover' | 'front-panel' | 'side-swags';

export interface AltarData {
  widthM: number;
  depthM: number;
  heightM?: number;
  aspectRatioLocked?: boolean;
  variant: 'rectangular' | 'semicircular' | 'hexagonal' | 'circular' | 't-shape';
  customShapeData?: CustomShapeData | null;
  fillColor: string;
  borderEnabled: boolean;
  borderColor: string;
  archEnabled?: boolean;
  archStyle?: ArchStyle;
  archMaterial?: ArchMaterial;
  archWidthM?: number;
  archHeightM?: number;
  drapingEnabled?: boolean;
  drapingColor?: string;
  drapingStyle?: DrapingStyle;
  label: string;
  labelVisible: boolean;
  notes: string;
}

interface AltarConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlace: (data: AltarData) => void;
  initialData?: AltarData;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PREVIEW_W = 420;
const PREVIEW_H = 360;

const PALETTE = [
  { hex: '#f5f0e8', label: 'Cream' },
  { hex: '#ffffff', label: 'White' },
  { hex: '#e8dcc8', label: 'Linen' },
  { hex: '#fdf6e3', label: 'Ivory' },
  { hex: '#c8a074', label: 'Oak' },
  { hex: '#8b6340', label: 'Walnut' },
  { hex: '#e0e0e0', label: 'Silver' },
  { hex: '#888888', label: 'Gray' },
  { hex: '#333333', label: 'Charcoal' },
  { hex: '#111111', label: 'Black' },
  { hex: '#b3d4f5', label: 'Sky' },
  { hex: '#b8e0c4', label: 'Mint' },
  { hex: '#d4a843', label: 'Gold' },
  { hex: '#7c5cbf', label: 'Purple' },
  { hex: '#e8b4c8', label: 'Blush' },
  { hex: '#2d5a3d', label: 'Forest' },
];

const ARCH_STYLES: { id: ArchStyle; label: string }[] = [
  { id: 'round',     label: 'Classic Round' },
  { id: 'gothic',    label: 'Gothic' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'organic',   label: 'Organic' },
];

const ARCH_MATERIALS: { id: ArchMaterial; label: string; color: string }[] = [
  { id: 'floral',     label: 'Floral',      color: '#f9a8c9' },
  { id: 'greenery',   label: 'Greenery',    color: '#4ade80' },
  { id: 'wood-metal', label: 'Wood/Metal',  color: '#c8a074' },
  { id: 'fabric',     label: 'Fabric',      color: '#e2e8f0' },
];

const DRAPING_STYLES: { id: DrapingStyle; label: string; desc: string }[] = [
  { id: 'full-cover',   label: 'Full Cover',   desc: 'Entire altar draped' },
  { id: 'front-panel',  label: 'Front Panel',  desc: 'Fabric on front face' },
  { id: 'side-swags',   label: 'Side Swags',   desc: 'Swags on left & right' },
];

const DEFAULT_DATA: AltarData = {
  widthM: 2, depthM: 1, heightM: 1.0, aspectRatioLocked: false,
  variant: 'rectangular', customShapeData: null,
  fillColor: '#f5f0e8', borderEnabled: true, borderColor: '#b8a080',
  archEnabled: false, archStyle: 'round', archMaterial: 'floral',
  archWidthM: 2.0, archHeightM: 2.5,
  drapingEnabled: false, drapingColor: '#ffffff', drapingStyle: 'full-cover',
  label: 'Altar', labelVisible: true, notes: '',
};

// ── Shape variant mini-icons ───────────────────────────────────────────────────

function ShapeIcon({ variant, active }: { variant: string; active: boolean }) {
  const c = active ? '#fff' : '#475569';
  const s = active ? '#fff' : '#94a3b8';
  const vb = '0 0 40 32';
  switch (variant) {
    case 'rectangular':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <rect x="4" y="6" width="32" height="20" rx="1.5" fill={active ? 'rgba(255,255,255,0.25)' : '#f1f5f9'} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'semicircular':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <path d={`M4,6 H36 V22 C36,30 4,30 4,22 Z`} fill={active ? 'rgba(255,255,255,0.25)' : '#f1f5f9'} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'hexagonal':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <polygon points="20,4 35,10.5 35,21.5 20,28 5,21.5 5,10.5"
            fill={active ? 'rgba(255,255,255,0.25)' : '#f1f5f9'} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 'circular':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <ellipse cx="20" cy="16" rx="15" ry="12" fill={active ? 'rgba(255,255,255,0.25)' : '#f1f5f9'} stroke={c} strokeWidth="1.5" />
        </svg>
      );
    case 't-shape':
      return (
        <svg width="40" height="32" viewBox={vb}>
          <path d={`M4,4 H36 V14 H26 V28 H14 V14 H4 Z`} fill={active ? 'rgba(255,255,255,0.25)' : '#f1f5f9'} stroke={c} strokeWidth="1.5" />
          <line x1="14" y1="14" x2="26" y2="14" stroke={s} strokeWidth="1" strokeDasharray="2,1" />
        </svg>
      );
    default:
      return null;
  }
}

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

// ── Arch path builders ─────────────────────────────────────────────────────────

function buildArchPath(
  style: ArchStyle,
  cx: number, baseY: number, halfW: number, archH: number
): string {
  const lx = cx - halfW;
  const rx = cx + halfW;
  const topY = baseY - archH;
  switch (style) {
    case 'round':
      return `M${lx},${baseY} L${lx},${topY + archH * 0.35} Q${lx},${topY} ${cx},${topY} Q${rx},${topY} ${rx},${topY + archH * 0.35} L${rx},${baseY}`;
    case 'gothic':
      return `M${lx},${baseY} L${lx},${topY + archH * 0.15} Q${lx},${topY - 5} ${cx},${topY} Q${rx},${topY - 5} ${rx},${topY + archH * 0.15} L${rx},${baseY}`;
    case 'geometric':
      return `M${lx},${baseY} L${lx},${topY} L${rx},${topY} L${rx},${baseY}`;
    case 'organic':
      return `M${lx},${baseY} C${lx},${topY + archH * 0.5} ${cx - halfW * 0.6},${topY} ${cx},${topY} C${cx + halfW * 0.6},${topY} ${rx},${topY + archH * 0.5} ${rx},${baseY}`;
    default:
      return '';
  }
}

function archMaterialColor(mat: ArchMaterial): string {
  const map: Record<ArchMaterial, string> = {
    'floral': '#f9a8c9', 'greenery': '#4ade80',
    'wood-metal': '#c8a074', 'fabric': '#e2e8f0',
  };
  return map[mat];
}

// ── Component ──────────────────────────────────────────────────────────────────

export const AltarConfigModal: React.FC<AltarConfigModalProps> = ({
  isOpen, onClose, onPlace, initialData,
}) => {
  const init = initialData ?? DEFAULT_DATA;

  // Dimensions
  const [widthM,      setWidthM]      = useState(init.widthM);
  const [depthM,      setDepthM]      = useState(init.depthM);
  const [heightM,     setHeightM]     = useState(init.heightM ?? 1.0);
  const [aspectLocked,setAspectLocked]= useState(init.aspectRatioLocked ?? false);

  // Shape
  const [variant,         setVariant]         = useState<AltarData['variant']>(init.variant ?? 'rectangular');
  const [customShapeData, setCustomShapeData] = useState<CustomShapeData | null>(init.customShapeData ?? null);
  const [hasCustomEdits,  setHasCustomEdits]  = useState(!!init.customShapeData);

  // Arch
  const [archEnabled,  setArchEnabled]  = useState(init.archEnabled ?? false);
  const [archStyle,    setArchStyle]    = useState<ArchStyle>(init.archStyle ?? 'round');
  const [archMaterial, setArchMaterial] = useState<ArchMaterial>(init.archMaterial ?? 'floral');
  const [archWidthM,   setArchWidthM]   = useState(init.archWidthM ?? 2.0);
  const [archHeightM,  setArchHeightM]  = useState(init.archHeightM ?? 2.5);

  // Draping
  const [drapingEnabled, setDrapingEnabled] = useState(init.drapingEnabled ?? false);
  const [drapingColor,   setDrapingColor]   = useState(init.drapingColor ?? '#ffffff');
  const [drapingStyle,   setDrapingStyle]   = useState<DrapingStyle>(init.drapingStyle ?? 'full-cover');

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
    new Set(['dimensions', 'shape', 'editor', 'colour', 'label'])
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
    () => (customShapeData ?? BASE_SHAPE_DATA[variant] ?? BASE_SHAPE_DATA['rectangular']) as CustomShapeData,
    [customShapeData, variant]
  );

  // Preview geometry — altar centered with room for arch above
  const previewGeo = useMemo(() => {
    const archRoomFrac = archEnabled ? (archHeightM / Math.max(depthM, 0.1)) * 0.55 : 0;
    const availW = PREVIEW_W - 80;
    const availH = PREVIEW_H - 80 - PREVIEW_H * archRoomFrac * 0.5;
    const scale  = Math.min(availW / Math.max(widthM, 0.1), availH / Math.max(depthM, 0.1)) * 0.55;
    const bw     = widthM * scale;
    const bh     = depthM * scale;
    const archH  = archEnabled ? archHeightM * scale * 0.55 : 0;
    const totalH = bh + archH;
    const cx     = PREVIEW_W / 2;
    const midY   = PREVIEW_H / 2 + archH * 0.3;
    const bx     = cx - bw / 2;
    const by     = midY - bh / 2;
    const archCY = by; // arch base sits at altar top
    const archHW = (archWidthM / Math.max(widthM, 0.01)) * (bw / 2) * 1.05;
    return { bx, by, bw, bh, cx, cy: midY, archH, archCY, archHW, scale };
  }, [widthM, depthM, archEnabled, archHeightM, archWidthM]);

  const { bx, by, bw, bh, cx, cy, archH, archCY, archHW } = previewGeo;

  // Altar path using computeShapePath
  const altarPath = useMemo(
    () => computeShapePath(effectiveShapeData, bx, by, bw, bh),
    [effectiveShapeData, bx, by, bw, bh]
  );

  // Arch path
  const archPath = useMemo(() => {
    if (!archEnabled || archH <= 0) return '';
    return buildArchPath(archStyle, cx, archCY, archHW, archH);
  }, [archEnabled, archStyle, cx, archCY, archHW, archH]);

  // Draping overlay path
  const drapingPath = useMemo(() => {
    if (!drapingEnabled) return '';
    switch (drapingStyle) {
      case 'full-cover':
        return computeShapePath(effectiveShapeData, bx, by, bw, bh);
      case 'front-panel':
        // Front = bottom 40% of bounding box
        return `M${bx},${by + bh * 0.6} H${bx + bw} V${by + bh} H${bx} Z`;
      case 'side-swags':
        // Left swag
        return `M${bx},${by} Q${bx - bw * 0.15},${by + bh * 0.5} ${bx},${by + bh}`
             + ` M${bx + bw},${by} Q${bx + bw + bw * 0.15},${by + bh * 0.5} ${bx + bw},${by + bh}`;
      default:
        return '';
    }
  }, [drapingEnabled, drapingStyle, effectiveShapeData, bx, by, bw, bh]);

  // Variant card click — warns if custom edits would be lost
  const handleVariantChange = useCallback((v: AltarData['variant']) => {
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
      widthM, depthM, heightM, aspectRatioLocked: aspectLocked,
      variant, customShapeData: hasCustomEdits ? customShapeData : null,
      fillColor, borderEnabled, borderColor,
      archEnabled, archStyle, archMaterial, archWidthM, archHeightM,
      drapingEnabled, drapingColor, drapingStyle,
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
  const isDark = ['#111111', '#333333', '#4a2e1a', '#2d5a3d', '#1e3a5f'].includes(fillColor);
  const archColor = archMaterialColor(archMaterial);

  if (!isOpen) return null;

  const VARIANTS: { id: AltarData['variant']; label: string }[] = [
    { id: 'rectangular',  label: 'Rectangular' },
    { id: 'semicircular', label: 'Semicircular' },
    { id: 'hexagonal',    label: 'Hexagonal' },
    { id: 'circular',     label: 'Circular' },
    { id: 't-shape',      label: 'T-Shape' },
  ];

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
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Altar</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Configure shape, arch, draping and add to canvas</p>
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
                  <input type="number" min={0.5} max={20} step={0.5} value={depthM}
                    onChange={(e) => handleDepthChange(Math.max(0.5, parseFloat(e.target.value) || 1))}
                    style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Height (m) <span style={{ color: '#cbd5e1', fontWeight: 400 }}>— for supplier notes</span></label>
                <input type="number" min={0.5} max={5} step={0.1} value={heightM}
                  onChange={(e) => setHeightM(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  style={inputStyle} />
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: '#374151' }}>Lock aspect ratio</span>
                <Toggle checked={aspectLocked} onChange={setAspectLocked} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 10, color: '#94a3b8' }}>{widthM} m × {depthM} m × {heightM} m tall</p>
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
                      <ShapeIcon variant={id} active={active} />
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

            {/* Arch */}
            <AccordionSection title="Arch / Backdrop" open={openSections.has('arch')} onToggle={() => toggleSection('arch')}>
              <div style={{ ...rowStyle, marginBottom: archEnabled ? 14 : 0 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Show arch</span>
                <Toggle checked={archEnabled} onChange={setArchEnabled} />
              </div>
              {archEnabled && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Arch Style</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {ARCH_STYLES.map(({ id, label: lbl }) => {
                        const active = archStyle === id;
                        return (
                          <button key={id} onClick={() => setArchStyle(id)}
                            style={{
                              padding: '7px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                              background: active ? '#0f172a' : '#fff',
                              color: active ? '#fff' : '#374151', textAlign: 'left',
                            }}>
                            {lbl}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Material</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {ARCH_MATERIALS.map(({ id, label: lbl, color }) => {
                        const active = archMaterial === id;
                        return (
                          <button key={id} onClick={() => setArchMaterial(id)} title={lbl}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Arch Width (m)</label>
                      <input type="number" min={0.5} max={10} step={0.5} value={archWidthM}
                        onChange={(e) => setArchWidthM(Math.max(0.5, parseFloat(e.target.value) || 2))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Arch Height (m)</label>
                      <input type="number" min={0.5} max={10} step={0.5} value={archHeightM}
                        onChange={(e) => setArchHeightM(Math.max(0.5, parseFloat(e.target.value) || 2.5))}
                        style={inputStyle} />
                    </div>
                  </div>
                </>
              )}
            </AccordionSection>

            {/* Draping */}
            <AccordionSection title="Draping" open={openSections.has('draping')} onToggle={() => toggleSection('draping')}>
              <div style={{ ...rowStyle, marginBottom: drapingEnabled ? 14 : 0 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Show draping</span>
                <Toggle checked={drapingEnabled} onChange={setDrapingEnabled} />
              </div>
              {drapingEnabled && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Draping Colour</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="color" value={drapingColor} onChange={(e) => setDrapingColor(e.target.value)}
                        style={{ width: 36, height: 32, borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
                      <input type="text" value={drapingColor} onChange={(e) => setDrapingColor(e.target.value)}
                        style={{ ...inputStyle }} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Style</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {DRAPING_STYLES.map(({ id, label: lbl, desc }) => {
                        const active = drapingStyle === id;
                        return (
                          <button key={id} onClick={() => setDrapingStyle(id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '9px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                              border: `2px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                              background: active ? '#0f172a' : '#fff',
                            }}>
                            <div style={{ width: 24, height: 24, borderRadius: 4, background: active ? 'rgba(255,255,255,0.2)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {id === 'full-cover'  && <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="1.5" fill={active ? '#fff' : '#94a3b8'} opacity="0.7" /></svg>}
                              {id === 'front-panel' && <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="7" width="12" height="6" rx="1" fill={active ? '#fff' : '#94a3b8'} opacity="0.7" /></svg>}
                              {id === 'side-swags'  && <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2,2 Q0,7 2,12 M12,2 Q14,7 12,12" stroke={active ? '#fff' : '#94a3b8'} strokeWidth="1.5" fill="none" /></svg>}
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : '#374151' }}>{lbl}</div>
                              <div style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>{desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
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
                  placeholder="e.g. Altar" maxLength={40} style={inputStyle} />
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
                  <pattern id="alt-dot2" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.7" fill="#b8c4d0" opacity="0.35" />
                  </pattern>
                </defs>
                <rect width={PREVIEW_W} height={PREVIEW_H} fill="url(#alt-dot2)" />

                {/* Arch behind altar */}
                {archEnabled && archPath && (
                  <>
                    <path d={archPath}
                      fill={`${archColor}30`}
                      stroke={archColor}
                      strokeWidth={archStyle === 'geometric' ? 4 : 5}
                      strokeLinecap="round"
                      fillRule="evenodd" />
                    {/* Extra decorative dots for organic/floral */}
                    {archMaterial === 'floral' && [0.2, 0.4, 0.6, 0.8].map((t) => {
                      const ax = cx - archHW + t * 2 * archHW;
                      const ay = by - archH * (0.3 + Math.sin(t * Math.PI) * 0.5);
                      return <circle key={t} cx={ax} cy={ay} r={3.5} fill={archColor} opacity={0.7} />;
                    })}
                    {archMaterial === 'greenery' && [0.15, 0.35, 0.5, 0.65, 0.85].map((t) => {
                      const ax = cx - archHW + t * 2 * archHW;
                      const ay = by - archH * (0.2 + Math.sin(t * Math.PI) * 0.55);
                      return <ellipse key={t} cx={ax} cy={ay} rx={4} ry={2.5} fill={archColor} opacity={0.55} transform={`rotate(${(t - 0.5) * 40}, ${ax}, ${ay})`} />;
                    })}
                  </>
                )}

                {/* Altar fill */}
                <path d={altarPath} fill={fillColor} stroke={borderEnabled ? borderColor : 'none'} strokeWidth={borderEnabled ? 2 : 0} />

                {/* Draping overlay */}
                {drapingEnabled && drapingStyle !== 'side-swags' && (
                  <path d={drapingPath} fill={drapingColor} fillOpacity={0.5}
                    stroke={drapingColor} strokeWidth={0.5} strokeOpacity={0.6} />
                )}
                {drapingEnabled && drapingStyle === 'side-swags' && (
                  <>
                    <path d={`M${bx},${by} Q${bx - bw * 0.14},${by + bh * 0.5} ${bx},${by + bh}`}
                      fill="none" stroke={drapingColor} strokeWidth={5} strokeLinecap="round" opacity={0.65} />
                    <path d={`M${bx + bw},${by} Q${bx + bw + bw * 0.14},${by + bh * 0.5} ${bx + bw},${by + bh}`}
                      fill="none" stroke={drapingColor} strokeWidth={5} strokeLinecap="round" opacity={0.65} />
                  </>
                )}

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
              {archEnabled && (
                <span style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                  {ARCH_STYLES.find(s => s.id === archStyle)?.label} arch · {ARCH_MATERIALS.find(m => m.id === archMaterial)?.label}
                </span>
              )}
              {drapingEnabled && (
                <span style={{ fontSize: 10, background: '#f5f3ff', color: '#7c3aed', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                  {DRAPING_STYLES.find(d => d.id === drapingStyle)?.label}
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
            {widthM} × {depthM} m · {VARIANTS.find(v => v.id === variant)?.label}
            {archEnabled ? ` · ${ARCH_STYLES.find(s => s.id === archStyle)?.label} arch` : ''}
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
              {initialData ? 'Update Altar' : 'Add to Canvas'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default AltarConfigModal;
