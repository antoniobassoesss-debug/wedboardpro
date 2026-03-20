/**
 * AVElementModal
 *
 * Unified creation / editing modal for all Audio Visual equipment elements.
 * Opens for: av-mixing-desk, av-speaker, av-subwoofer, av-truss, av-moving-head,
 *             av-led-wall, av-screen, av-projector, av-light-console
 *
 * Renders a live SVG preview (left) + form (right).
 */

import React, { useState, useEffect } from 'react';

export interface AVData {
  type: string;
  widthM: number;
  heightM: number;
  label: string;
  labelVisible: boolean;
  orientation?: 'landscape' | 'portrait';
  quantity?: number;
  color?: string;
  model?: string;
  stackedSub?: boolean;
  beamAngle?: number;
  screenAspect?: '16:9' | '4:3' | '21:9';
  resolution?: string;
  throw?: 'short' | 'standard' | 'long';
  channels?: number;
}

interface AVElementModalProps {
  isOpen: boolean;
  avType: string;
  onClose: () => void;
  onPlace: (data: AVData) => void;
  onUpdate?: (data: AVData) => void;
  editingData?: AVData | null;
}

// ----- Defaults per type -----
const TYPE_META: Record<string, { label: string; w: number; h: number }> = {
  'av-mixing-desk':   { label: 'Mixing Desk',       w: 1.2, h: 0.8 },
  'av-speaker':       { label: 'Speaker / PA',       w: 0.4, h: 0.6 },
  'av-subwoofer':     { label: 'Subwoofer',          w: 0.6, h: 0.6 },
  'av-truss':         { label: 'Truss',              w: 3.0, h: 0.3 },
  'av-moving-head':   { label: 'Moving Head',        w: 0.4, h: 0.4 },
  'av-led-wall':      { label: 'LED Wall',           w: 3.0, h: 0.25 },
  'av-screen':        { label: 'Projection Screen',  w: 2.5, h: 0.20 },
  'av-projector':     { label: 'Projector',          w: 0.5, h: 0.4 },
  'av-light-console': { label: 'Lighting Console',   w: 0.9, h: 0.6 },
};

// ----- Live SVG Preview -----
const AVPreview: React.FC<{ data: AVData }> = ({ data }) => {
  const W = 200, H = 160;
  const pad = 20;
  const aspect = data.widthM / Math.max(data.heightM, 0.01);
  let pw = Math.min(W - pad * 2, (H - pad * 2) * aspect);
  let ph = pw / aspect;
  if (ph > H - pad * 2) { ph = H - pad * 2; pw = ph * aspect; }
  const x0 = (W - pw) / 2, y0 = (H - ph) / 2;

  // All previews are strict top-down / bird's eye view
  const renderShape = () => {
    const mcx = x0 + pw / 2, mcy = y0 + ph / 2;
    switch (data.type) {
      case 'av-mixing-desk': {
        // Rectangle footprint with concave arc on operator-facing (bottom) edge
        const d = `M${x0},${y0} H${x0 + pw} V${y0 + ph} Q${mcx},${y0 + ph * 0.45} ${x0},${y0 + ph} Z`;
        return (
          <g>
            <path d={d} fill="#2a2a2a" stroke="#7c8b9b" strokeWidth="1.5" />
            {/* rear edge detail */}
            <line x1={x0 + pw * 0.1} y1={y0 + ph * 0.12} x2={x0 + pw * 0.9} y2={y0 + ph * 0.12} stroke="#4b5563" strokeWidth="0.8" />
          </g>
        );
      }
      case 'av-speaker': {
        const qty = data.quantity || 1;
        const cellW = pw / qty;
        return (
          <g>
            {Array.from({ length: qty }, (_, i) => {
              const sx = x0 + cellW * i + cellW * 0.1;
              const sw = cellW * 0.8;
              const cabH = ph * 0.62;
              // Cabinet footprint
              return (
                <g key={i}>
                  <rect x={sx} y={y0} width={sw} height={cabH} rx="2" fill="#1a1a1a" stroke="#6b7280" strokeWidth="1.2" />
                  {/* Throw wedge extending forward (downward in top-down) */}
                  <path d={`M${sx + sw * 0.25},${y0 + cabH} L${sx + sw * 0.75},${y0 + cabH} L${sx + sw / 2 + sw * 0.55},${y0 + ph} L${sx + sw / 2 - sw * 0.55},${y0 + ph} Z`}
                    fill="#1a1a1a" fillOpacity={0.35} stroke="#6b7280" strokeWidth="0.8" strokeDasharray="3 2" />
                </g>
              );
            })}
          </g>
        );
      }
      case 'av-subwoofer': {
        const qty = data.quantity || 1;
        const cellW = pw / qty;
        return (
          <g>
            {Array.from({ length: qty }, (_, i) => {
              const sx = x0 + cellW * i + cellW * 0.05;
              const sw = cellW * 0.9;
              return (
                <g key={i}>
                  {/* Heavier visual weight — thicker stroke + darker fill */}
                  <rect x={sx} y={y0 + ph * 0.1} width={sw} height={ph * 0.8} rx="2"
                    fill="#0d0d0d" stroke="#9ca3af" strokeWidth="2.5" />
                  {/* Centre line indicating mass */}
                  <line x1={sx + sw * 0.5} y1={y0 + ph * 0.18} x2={sx + sw * 0.5} y2={y0 + ph * 0.82}
                    stroke="#374151" strokeWidth="1.2" />
                </g>
              );
            })}
          </g>
        );
      }
      case 'av-truss': {
        const qty = data.quantity || 1;
        const rowH = ph / qty;
        return (
          <g>
            {Array.from({ length: qty }, (_, i) => {
              const ty = y0 + rowH * i + rowH * 0.15;
              const th = rowH * 0.7;
              // Solid beam outline
              return (
                <g key={i}>
                  <rect x={x0} y={ty} width={pw} height={th} fill="#3a3a3a" stroke="#9ca3af" strokeWidth="1.5" />
                  {/* Diagonal crosshatch inside to suggest lattice */}
                  <clipPath id={`truss-clip-${i}`}>
                    <rect x={x0} y={ty} width={pw} height={th} />
                  </clipPath>
                  {Array.from({ length: Math.ceil(pw / 14) + 1 }, (_, ci) => (
                    <g key={ci} clipPath={`url(#truss-clip-${i})`}>
                      <line x1={x0 + ci * 14 - th} y1={ty} x2={x0 + ci * 14} y2={ty + th}
                        stroke="#6b7280" strokeWidth="0.7" />
                      <line x1={x0 + ci * 14} y1={ty} x2={x0 + ci * 14 - th} y2={ty + th}
                        stroke="#6b7280" strokeWidth="0.7" />
                    </g>
                  ))}
                </g>
              );
            })}
          </g>
        );
      }
      case 'av-moving-head': {
        const qty = data.quantity || 1;
        const cellW = pw / qty;
        const accent = data.color || '#3b82f6';
        return (
          <g>
            {Array.from({ length: qty }, (_, i) => {
              const ucx = x0 + cellW * i + cellW / 2;
              const ucy = y0 + ph * 0.42;
              const r = Math.min(cellW * 0.36, ph * 0.36);
              const beamSpread = r * 1.5;
              return (
                <g key={i}>
                  {/* Unit square footprint */}
                  <rect x={ucx - r} y={ucy - r} width={r * 2} height={r * 2} rx="2"
                    fill="#1a1a1a" stroke="#6b7280" strokeWidth="1.2" />
                  {/* Head circle from above */}
                  <circle cx={ucx} cy={ucy} r={r * 0.6} fill="#111" stroke={accent} strokeWidth="1.2" />
                  {/* Beam cone extending downward (forward throw direction) */}
                  <path d={`M${ucx - r * 0.45},${ucy + r} L${ucx + r * 0.45},${ucy + r} L${ucx + beamSpread},${y0 + ph} L${ucx - beamSpread},${y0 + ph} Z`}
                    fill={accent} fillOpacity={0.15} stroke={accent} strokeWidth="0.8" strokeDasharray="3 2" />
                </g>
              );
            })}
          </g>
        );
      }
      case 'av-led-wall': {
        // Top-down: very thin rectangle (the panel wall standing upright, seen from above)
        // Occupy full width, small slice of height
        const wallH = Math.min(ph, pw * 0.12, 18);
        const wy = mcy - wallH / 2;
        const panelCount = 5;
        const panelW = pw / panelCount;
        return (
          <g>
            <rect x={x0} y={wy} width={pw} height={wallH} fill="#1a1a1a" stroke="#4b5563" strokeWidth="1.5" />
            {/* Vertical module joints */}
            {Array.from({ length: panelCount - 1 }, (_, i) => (
              <line key={i} x1={x0 + panelW * (i + 1)} y1={wy} x2={x0 + panelW * (i + 1)} y2={wy + wallH}
                stroke="#6b7280" strokeWidth="0.8" />
            ))}
            {/* Shadow/depth indicator below the wall */}
            <rect x={x0 + pw * 0.02} y={wy + wallH} width={pw * 0.96} height={wallH * 0.5}
              fill="#0a0a0a" fillOpacity={0.4} />
          </g>
        );
      }
      case 'av-screen': {
        // Top-down: thin rectangle (standing screen seen from above) + foot markers
        const screenH = Math.min(ph, pw * 0.1, 14);
        const sy2 = mcy - screenH / 2;
        return (
          <g>
            <rect x={x0} y={sy2} width={pw} height={screenH} fill="#d1d5db" stroke="#6b7280" strokeWidth="1.5" />
            {/* Foot/stand indicators at each end */}
            <rect x={x0 - 3} y={sy2 + screenH} width={8} height={screenH * 0.8} rx="1"
              fill="#9ca3af" stroke="#6b7280" strokeWidth="0.8" />
            <rect x={x0 + pw - 5} y={sy2 + screenH} width={8} height={screenH * 0.8} rx="1"
              fill="#9ca3af" stroke="#6b7280" strokeWidth="0.8" />
          </g>
        );
      }
      case 'av-projector': {
        const accent = data.color || '#3b82f6';
        const bodyH = ph * 0.55;
        const bodyW = pw * 0.7;
        const bx2 = mcx - bodyW / 2;
        const by2 = y0 + ph * 0.1;
        // Cone extends from front (bottom) of body to the bottom of the preview box
        const coneTopL = bx2 + bodyW * 0.2;
        const coneTopR = bx2 + bodyW * 0.8;
        const coneBotL = x0;
        const coneBotR = x0 + pw;
        return (
          <g>
            {/* Throw cone */}
            <path d={`M${coneTopL},${by2 + bodyH} L${coneTopR},${by2 + bodyH} L${coneBotR},${y0 + ph} L${coneBotL},${y0 + ph} Z`}
              fill={accent} fillOpacity={0.12} stroke={accent} strokeWidth="0.8" strokeDasharray="4 3" />
            {/* Projector body */}
            <rect x={bx2} y={by2} width={bodyW} height={bodyH} rx="3"
              fill="#1a1a1a" stroke="#6b7280" strokeWidth="1.5" />
            {/* Lens dot on front edge */}
            <circle cx={mcx} cy={by2 + bodyH} r={Math.min(bodyW, bodyH) * 0.12}
              fill={accent} fillOpacity={0.8} />
          </g>
        );
      }
      case 'av-light-console': {
        // Top-down: trapezoid — wider at operator (bottom) edge, narrower at back
        const narrowW = pw * 0.7;
        const d = `M${mcx - narrowW / 2},${y0} H${mcx + narrowW / 2} L${x0 + pw},${y0 + ph} H${x0} Z`;
        return (
          <g>
            <path d={d} fill="#0f172a" stroke="#4b5563" strokeWidth="1.5" />
            {/* Central ridge line top-down */}
            <line x1={mcx} y1={y0 + ph * 0.1} x2={mcx} y2={y0 + ph * 0.85} stroke="#374151" strokeWidth="0.8" />
          </g>
        );
      }
      default:
        return (
          <rect x={x0} y={y0} width={pw} height={ph} rx="4"
            fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth="1.5" />
        );
    }
  };

  return (
    <svg width={W} height={H} style={{ background: '#0f172a', borderRadius: 8 }}>
      {renderShape()}
      {data.labelVisible && data.label && (
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">{data.label}</text>
      )}
    </svg>
  );
};

// ----- Main Modal -----
export const AVElementModal: React.FC<AVElementModalProps> = ({
  isOpen,
  avType,
  onClose,
  onPlace,
  onUpdate,
  editingData,
}) => {
  const meta = TYPE_META[avType] || { label: avType, w: 1.0, h: 1.0 };
  const isEditing = !!editingData;

  const buildDefaults = (type: string, editing?: AVData | null): AVData => {
    const m = TYPE_META[type] || { label: type, w: 1.0, h: 1.0 };
    const defaults: AVData = {
      type,
      widthM: m.w,
      heightM: m.h,
      label: m.label,
      labelVisible: true,
      quantity: 1,
      color: '#3b82f6',
      channels: 8,
      screenAspect: '16:9',
      beamAngle: 25,
      throw: 'standard',
    };
    if (editing) return { ...defaults, ...editing, type };
    return defaults;
  };

  const [data, setData] = useState<AVData>(() => buildDefaults(avType, editingData));

  useEffect(() => {
    if (isOpen) {
      setData(buildDefaults(avType, editingData));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, avType]);

  const set = <K extends keyof AVData>(k: K, v: AVData[K]) =>
    setData((prev) => ({ ...prev, [k]: v }));

  const handleConfirm = () => {
    if (isEditing && onUpdate) {
      onUpdate(data);
    } else {
      onPlace(data);
    }
    onClose();
  };

  if (!isOpen) return null;

  const showQuantity = ['av-speaker', 'av-subwoofer', 'av-moving-head', 'av-truss'].includes(avType);
  const showChannels = avType === 'av-mixing-desk';
  const showBeamAngle = ['av-moving-head', 'av-projector'].includes(avType);
  const showScreenAspect = ['av-led-wall', 'av-screen'].includes(avType);
  const showThrow = avType === 'av-projector';
  const showColor = ['av-moving-head', 'av-projector', 'av-led-wall'].includes(avType);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, width: 560,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {isEditing ? 'Edit' : 'Add'} {meta.label}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Audio Visual</p>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#475569' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, padding: 24 }}>
          {/* Preview */}
          <div style={{ flexShrink: 0 }}>
            <AVPreview data={data} />
            <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Live preview</p>
          </div>

          {/* Form */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Label */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Label</label>
              <input
                type="text"
                value={data.label}
                onChange={(e) => set('label', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                <input type="checkbox" checked={data.labelVisible} onChange={(e) => set('labelVisible', e.target.checked)} />
                Show label on canvas
              </label>
            </div>

            {/* Dimensions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Width (m)</label>
                <input
                  type="number"
                  min={0.1} step={0.1}
                  value={data.widthM}
                  onChange={(e) => set('widthM', parseFloat(e.target.value) || meta.w)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Depth (m)</label>
                <input
                  type="number"
                  min={0.1} step={0.1}
                  value={data.heightM}
                  onChange={(e) => set('heightM', parseFloat(e.target.value) || meta.h)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Quantity */}
            {showQuantity && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Quantity</label>
                <input
                  type="number"
                  min={1} max={12} step={1}
                  value={data.quantity || 1}
                  onChange={(e) => set('quantity', parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>Places {data.quantity || 1} {meta.label}(s) as a group</p>
              </div>
            )}

            {/* Channels (mixing desk) */}
            {showChannels && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Channels</label>
                <select
                  value={data.channels || 8}
                  onChange={(e) => set('channels', parseInt(e.target.value))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  {[4, 8, 12, 16, 24, 32].map((n) => (
                    <option key={n} value={n}>{n} ch</option>
                  ))}
                </select>
              </div>
            )}

            {/* Screen aspect */}
            {showScreenAspect && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Aspect ratio</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['16:9', '4:3', '21:9'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => set('screenAspect', r)}
                      style={{
                        flex: 1, padding: '6px 0', border: `1.5px solid ${data.screenAspect === r ? '#3b82f6' : '#e5e7eb'}`,
                        borderRadius: 6, background: data.screenAspect === r ? '#eff6ff' : '#fff',
                        color: data.screenAspect === r ? '#3b82f6' : '#475569',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >{r}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Beam angle */}
            {showBeamAngle && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Beam angle: {data.beamAngle}°
                </label>
                <input
                  type="range" min={5} max={60} step={5}
                  value={data.beamAngle || 25}
                  onChange={(e) => set('beamAngle', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {/* Throw (projector) */}
            {showThrow && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Throw ratio</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['short', 'standard', 'long'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => set('throw', t)}
                      style={{
                        flex: 1, padding: '6px 0', border: `1.5px solid ${data.throw === t ? '#3b82f6' : '#e5e7eb'}`,
                        borderRadius: 6, background: data.throw === t ? '#eff6ff' : '#fff',
                        color: data.throw === t ? '#3b82f6' : '#475569',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                      }}
                    >{t}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Color */}
            {showColor && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Accent color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      onClick={() => set('color', c)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', border: `2px solid ${data.color === c ? '#0f172a' : 'transparent'}`,
                        background: c, cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                  <input type="color" value={data.color || '#3b82f6'} onChange={(e) => set('color', e.target.value)}
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e5e7eb', padding: 0, cursor: 'pointer' }} />
                </div>
              </div>
            )}

            {/* Model name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Model / Note (optional)</label>
              <input
                type="text"
                placeholder="e.g. Yamaha CL5, Martin MAC Quantum"
                value={data.model || ''}
                onChange={(e) => set('model', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fff', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} style={{ padding: '10px 24px', border: 'none', borderRadius: 10, background: '#0f172a', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
            {isEditing ? 'Save Changes' : `Place ${meta.label}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AVElementModal;
