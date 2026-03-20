/**
 * Ceremony Seating Modal — Refactored
 *
 * World-class configuration modal for ceremony seating blocks.
 * Left panel: 3 collapsible accordion sections (Layout, Style, Labels)
 * Right panel: interactive SVG preview — clickable seats, arc curvature, multi-aisle types
 */

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

const PIXELS_PER_METER = 100;
const PREVIEW_W = 420;
const PREVIEW_H = 320;
const ALTAR_AREA_H = 44;

type ChairStyle = 'chiavari' | 'ghost' | 'folding' | 'banquet';
type AisleType = 'none' | 'center' | 'sides' | 'double';

interface SectionLabelsConfig {
  enabled: boolean;
  left: string;
  right: string;
}

interface PlacementData {
  totalWidthM: number;
  totalHeightM: number;
  ceremonyData: {
    mode: 'full-block' | 'row-by-row';
    seatsPerRow: number;
    rowCount: number;
    seatWidthPx: number;
    seatHeightPx: number;
    rowGapPx: number;
    seatGapPx: number;
    aisleWidthPx: number;
    showLabels: boolean;
    removedSeats: string[];
    curvature: number;
    chairStyle: ChairStyle;
    aisleType: AisleType;
    sectionLabels: SectionLabelsConfig;
    reservedRows: number[];
    perRowOverrides: Record<number, number>;
  };
}

interface CeremonySeatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceCeremony: (data: PlacementData) => void;
}

const PRESET_CONFIGS = {
  small:  { seatsPerRow: 5, rowCount: 8 },
  medium: { seatsPerRow: 8, rowCount: 12 },
  large:  { seatsPerRow: 10, rowCount: 16 },
};

// ── Accordion Section ────────────────────────────────────────────────────────

interface AccordionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionProps> = ({ title, open, onToggle, children }) => (
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
      <svg
        width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5"
        style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s', flexShrink: 0 }}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
    {open && (
      <div style={{ padding: '2px 20px 16px' }}>
        {children}
      </div>
    )}
  </div>
);

// ── Chair style icon (28×28 SVG) ─────────────────────────────────────────────

const ChairIcon: React.FC<{ chairType: ChairStyle; selected: boolean }> = ({ chairType, selected }) => {
  const stroke = selected ? '#ffffff' : '#64748b';
  const fill   = selected ? 'rgba(255,255,255,0.18)' : '#f1f5f9';
  const w = chairType === 'banquet' ? 22 : 18;
  const h = 16;
  const ox = (28 - w) / 2;
  const oy = (28 - h) / 2;
  const rx = chairType === 'ghost' ? 5 : chairType === 'folding' ? 0 : chairType === 'banquet' ? 1 : 2;
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <rect x={ox} y={oy} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth="1.5" />
      {chairType === 'chiavari' && (
        <>
          <line x1={ox + w / 3} y1={oy + 2} x2={ox + w / 3} y2={oy + h - 2} stroke={stroke} strokeWidth="0.8" opacity="0.65" />
          <line x1={ox + (2 * w) / 3} y1={oy + 2} x2={ox + (2 * w) / 3} y2={oy + h - 2} stroke={stroke} strokeWidth="0.8" opacity="0.65" />
        </>
      )}
      {chairType === 'ghost' && (
        <rect x={ox + 2} y={oy + 2} width={w - 4} height={h - 4} rx={3} fill="none" stroke={stroke} strokeWidth="0.7" opacity="0.5" />
      )}
      {chairType === 'folding' && (
        <line x1={ox + 1} y1={oy + h / 2} x2={ox + w - 1} y2={oy + h / 2} stroke={stroke} strokeWidth="0.9" opacity="0.6" />
      )}
      {chairType === 'banquet' && (
        <rect x={ox + 2} y={oy + h - 4} width={w - 4} height={2.5} rx="1" fill={stroke} opacity="0.45" />
      )}
    </svg>
  );
};

// ── Section layout helper ─────────────────────────────────────────────────────

interface SectionInfo { startXM: number; count: number; sectionIdx: number }

function getSections(
  seatsPerRow: number,
  aisleType: AisleType,
  aisleWidthM: number,
  seatWidthM: number,
  seatGapM: number,
): { sections: SectionInfo[]; totalWidthM: number } {
  const sw = seatsPerRow * seatWidthM + Math.max(0, seatsPerRow - 1) * seatGapM;
  switch (aisleType) {
    case 'none':
      return { sections: [{ startXM: 0, count: seatsPerRow, sectionIdx: 0 }], totalWidthM: sw };
    case 'center':
      return {
        sections: [
          { startXM: 0, count: seatsPerRow, sectionIdx: 0 },
          { startXM: sw + aisleWidthM, count: seatsPerRow, sectionIdx: 1 },
        ],
        totalWidthM: 2 * sw + aisleWidthM,
      };
    case 'sides':
      return {
        sections: [{ startXM: aisleWidthM, count: seatsPerRow, sectionIdx: 0 }],
        totalWidthM: sw + 2 * aisleWidthM,
      };
    case 'double':
      return {
        sections: [
          { startXM: 0,                       count: seatsPerRow, sectionIdx: 0 },
          { startXM: sw + aisleWidthM,         count: seatsPerRow, sectionIdx: 1 },
          { startXM: 2 * (sw + aisleWidthM),   count: seatsPerRow, sectionIdx: 2 },
        ],
        totalWidthM: 3 * sw + 2 * aisleWidthM,
      };
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export const CeremonySeatingModal: React.FC<CeremonySeatingModalProps> = ({
  isOpen,
  onClose,
  onPlaceCeremony,
}) => {
  // Core layout config
  const [mode, setMode]             = useState<'full-block' | 'row-by-row'>('full-block');
  const [seatsPerRow, setSeatsPerRow] = useState(8);
  const [rowCount, setRowCount]     = useState(10);
  const [seatWidthM, setSeatWidthM] = useState(0.45);
  const [seatHeightM, setSeatHeightM] = useState(0.45);
  const [rowGapM, setRowGapM]       = useState(0.10);
  const [seatGapM, setSeatGapM]     = useState(0.05);
  const [aisleWidthM, setAisleWidthM] = useState(1.00);
  const [showLabels, setShowLabels] = useState(true);

  // New state
  const [removedSeats, setRemovedSeats]   = useState<Set<string>>(new Set());
  const [curvature, setCurvature]         = useState(0);
  const [chairStyle, setChairStyle]       = useState<ChairStyle>('chiavari');
  const [aisleType, setAisleType]         = useState<AisleType>('center');
  const [sectionLabels, setSectionLabels] = useState<SectionLabelsConfig>({
    enabled: false, left: "Bride's Side", right: "Groom's Side",
  });
  const [reservedRows, setReservedRows]   = useState<Set<number>>(new Set());
  // perRowOverrides: future use — no UI yet
  const [perRowOverrides] = useState<Map<number, number>>(new Map());

  // Accordion
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['layout', 'style', 'labels']));
  const toggleAccordion = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // SVG hover
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  // ── Derived geometry ────────────────────────────────────────────────────────

  const { sections, totalWidthM } = useMemo(
    () => getSections(seatsPerRow, aisleType, aisleWidthM, seatWidthM, seatGapM),
    [seatsPerRow, aisleType, aisleWidthM, seatWidthM, seatGapM],
  );

  const totalHeightM = useMemo(
    () => rowCount * seatHeightM + Math.max(0, rowCount - 1) * rowGapM,
    [rowCount, seatHeightM, rowGapM],
  );

  const totalSeatsRaw = useMemo(
    () => sections.reduce((sum, s) => sum + s.count, 0) * rowCount,
    [sections, rowCount],
  );

  const totalSeats = totalSeatsRaw - removedSeats.size;

  // Preview scale — fit seating block inside available area
  const scale = useMemo(() => {
    const availW = PREVIEW_W - 48;
    const availH = PREVIEW_H - ALTAR_AREA_H - 18;
    return Math.min(
      availW / Math.max(totalWidthM, 0.1),
      availH / Math.max(totalHeightM, 0.1),
    ) * 0.87;
  }, [totalWidthM, totalHeightM]);

  // ── Seat descriptors — memoized geometry ───────────────────────────────────

  const seatDescriptors = useMemo(() => {
    const seatWPx  = seatWidthM  * scale;
    const seatHPx  = seatHeightM * scale;
    const rowGapPx = rowGapM     * scale;
    const blockWPx = totalWidthM * scale;
    const blockHPx = totalHeightM * scale;
    const blockLeftPx = (PREVIEW_W - blockWPx) / 2;
    const blockTopPx  = ALTAR_AREA_H + (PREVIEW_H - ALTAR_AREA_H - 18 - blockHPx) / 2;

    const curvatureRad = curvature * Math.PI / 180;
    const hasCurvature = curvature > 0.5 && blockWPx > 0;
    const R      = hasCurvature ? (blockWPx / 2) / Math.sin(curvatureRad / 2) : 0;
    const focalX = PREVIEW_W / 2;
    const focalY = blockTopPx - R;

    const result: Array<{
      key: string; rowIdx: number; globalSeatIdx: number;
      cx: number; cy: number; rotation: number; sectionIdx: number;
    }> = [];

    for (let r = 0; r < rowCount; r++) {
      const flatRowCenterY = blockTopPx + r * (seatHPx + rowGapPx) + seatHPx / 2;
      const rowRadius = hasCurvature ? R + r * (seatHPx + rowGapPx) + seatHPx / 2 : 0;
      let globalSeatIdx = 0;

      for (const sec of sections) {
        for (let s = 0; s < sec.count; s++) {
          const flatCX = blockLeftPx + (sec.startXM + s * (seatWidthM + seatGapM)) * scale + seatWPx / 2;

          let cx: number, cy: number, rotation: number;
          if (hasCurvature) {
            const t = (flatCX - blockLeftPx) / blockWPx;
            const angle = -curvatureRad / 2 + t * curvatureRad;
            cx       = focalX + rowRadius * Math.sin(angle);
            cy       = focalY + rowRadius * Math.cos(angle);
            rotation = -(angle * 180) / Math.PI;
          } else {
            cx = flatCX; cy = flatRowCenterY; rotation = 0;
          }

          result.push({ key: `${r}-${globalSeatIdx}`, rowIdx: r, globalSeatIdx, cx, cy, rotation, sectionIdx: sec.sectionIdx });
          globalSeatIdx++;
        }
      }
    }

    return result;
  }, [rowCount, sections, totalWidthM, totalHeightM, scale, seatWidthM, seatHeightM, seatGapM, rowGapM, curvature]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleSeat = useCallback((key: string) => {
    setRemovedSeats((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleReservedRow = useCallback((rowIdx: number) => {
    setReservedRows((prev) => {
      const next = new Set(prev);
      next.has(rowIdx) ? next.delete(rowIdx) : next.add(rowIdx);
      return next;
    });
  }, []);

  const handleAdd = () => {
    onPlaceCeremony({
      totalWidthM,
      totalHeightM,
      ceremonyData: {
        mode, seatsPerRow, rowCount,
        seatWidthPx:  Math.round(seatWidthM  * PIXELS_PER_METER),
        seatHeightPx: Math.round(seatHeightM * PIXELS_PER_METER),
        rowGapPx:     Math.round(rowGapM     * PIXELS_PER_METER),
        seatGapPx:    Math.round(seatGapM    * PIXELS_PER_METER),
        aisleWidthPx: Math.round(aisleWidthM * PIXELS_PER_METER),
        showLabels,
        removedSeats: Array.from(removedSeats),
        curvature,
        chairStyle,
        aisleType,
        sectionLabels,
        reservedRows: Array.from(reservedRows),
        perRowOverrides: Object.fromEntries(perRowOverrides),
      },
    });
    onClose();
  };

  if (!isOpen) return null;

  // ── Shared inline styles ────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none',
    color: '#0f172a', boxSizing: 'border-box', background: '#fff',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5,
  };

  // ── Preview computed values (used in JSX directly) ──────────────────────────

  const seatWPx   = seatWidthM  * scale;
  const seatHPx   = seatHeightM * scale;
  const rowGapPx  = rowGapM     * scale;
  const blockWPx  = totalWidthM * scale;
  const blockHPx  = totalHeightM * scale;
  const blockLeftPx = (PREVIEW_W - blockWPx) / 2;
  const blockTopPx  = ALTAR_AREA_H + (PREVIEW_H - ALTAR_AREA_H - 18 - blockHPx) / 2;

  // Chair style modifiers
  const seatRx      = chairStyle === 'ghost' ? 4 : chairStyle === 'folding' ? 0 : chairStyle === 'banquet' ? 1 : 2;
  const seatRenderW = chairStyle === 'banquet' ? seatWPx * 1.1 : seatWPx;

  // ── SVG elements ────────────────────────────────────────────────────────────

  const seatElements = seatDescriptors.map((seat) => {
    const isRemoved  = removedSeats.has(seat.key);
    const isReserved = reservedRows.has(seat.rowIdx);
    const isHovered  = hoveredSeat === seat.key;

    let fill: string, stroke: string, fillOpacity = 1, strokeDasharray: string | undefined;

    if (isRemoved) {
      fill = 'transparent'; stroke = '#D0C8C0'; strokeDasharray = '3,2';
    } else if (isReserved) {
      fill = isHovered ? '#FDE68A' : '#FEF3C7'; stroke = '#D97706';
    } else {
      fill = isHovered ? '#C8C4BF' : '#E8E4DF'; stroke = '#C4BDB5';
      if (chairStyle === 'ghost') fillOpacity = 0.65;
    }

    const hw = seatRenderW / 2;
    const hh = seatHPx / 2;

    return (
      <g
        key={seat.key}
        transform={`translate(${seat.cx.toFixed(2)},${seat.cy.toFixed(2)}) rotate(${seat.rotation.toFixed(2)})`}
        onClick={() => toggleSeat(seat.key)}
        onMouseEnter={() => setHoveredSeat(seat.key)}
        onMouseLeave={() => setHoveredSeat(null)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={-hw} y={-hh}
          width={seatRenderW} height={seatHPx}
          rx={seatRx}
          fill={fill} fillOpacity={fillOpacity}
          stroke={stroke} strokeWidth={1}
          strokeDasharray={strokeDasharray}
          opacity={isRemoved ? 0.4 : 1}
        />
        {chairStyle === 'chiavari' && !isRemoved && hw > 3 && hh > 4 && (
          <>
            <line x1={-hw / 2.5} y1={-hh + 1.5} x2={-hw / 2.5} y2={hh - 1.5} stroke={stroke} strokeWidth="0.6" opacity="0.5" />
            <line x1={ hw / 2.5} y1={-hh + 1.5} x2={ hw / 2.5} y2={hh - 1.5} stroke={stroke} strokeWidth="0.6" opacity="0.5" />
          </>
        )}
      </g>
    );
  });

  const rowLabelElements = showLabels
    ? Array.from({ length: rowCount }, (_, r) => {
        const y = blockTopPx + r * (seatHPx + rowGapPx) + seatHPx / 2;
        return (
          <text key={r} x={blockLeftPx - 6} y={y}
            textAnchor="end" dominantBaseline="middle" fontSize="7" fill="#94a3b8">
            {r < 26 ? String.fromCharCode(65 + r) : String(r + 1)}
          </text>
        );
      })
    : null;

  const sectionLabelElements = (() => {
    if (!sectionLabels.enabled || (aisleType !== 'center' && aisleType !== 'double')) return null;
    return sections.slice(0, 2).map((sec) => {
      const secLeftPx = blockLeftPx + sec.startXM * scale;
      const secWPx    = sec.count * seatWidthM * scale + Math.max(0, sec.count - 1) * seatGapM * scale;
      const label = sec.sectionIdx === 0 ? sectionLabels.left : sectionLabels.right;
      return (
        <text key={sec.sectionIdx} x={secLeftPx + secWPx / 2} y={blockTopPx - 10}
          textAnchor="middle" dominantBaseline="baseline" fontSize="8" fill="#6B7280" fontStyle="italic">
          {label}
        </text>
      );
    });
  })();

  // ── Row badges for reserved rows ────────────────────────────────────────────

  const rowBadges = Array.from({ length: Math.min(rowCount, 16) }, (_, i) => {
    const label = i < 26 ? String.fromCharCode(65 + i) : String(i + 1);
    const isReserved = reservedRows.has(i);
    return (
      <button
        key={i}
        onClick={() => toggleReservedRow(i)}
        title={`Row ${label}`}
        style={{
          width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
          fontSize: 10, fontWeight: 700,
          background: isReserved ? '#FEF3C7' : '#f1f5f9',
          color: isReserved ? '#D97706' : '#64748b',
          outline: isReserved ? '2px solid #D97706' : '2px solid transparent',
          outlineOffset: 1,
        }}
      >
        {label}
      </button>
    );
  });

  // ── Render ───────────────────────────────────────────────────────────────────

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
        width: 860, maxWidth: '97vw',
        background: '#ffffff', borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', maxHeight: '94vh',
      }}>

        {/* ── Header (preserved shell) ─────────────────────────────────── */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Ceremony Seating
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Configure the arrangement and add to canvas
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

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left: accordion config */}
          <div style={{ width: 300, borderRight: '1px solid #f3f4f6', overflow: 'auto', flexShrink: 0 }}>

            {/* ── SECTION 1: LAYOUT ─────────────────────────────── */}
            <AccordionSection title="Layout" open={openSections.has('layout')} onToggle={() => toggleAccordion('layout')}>

              {/* Mode */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Mode</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['full-block', 'row-by-row'] as const).map((m) => (
                    <button key={m} onClick={() => setMode(m)} style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `2px solid ${mode === m ? '#0f172a' : '#e2e8f0'}`,
                      background: mode === m ? '#0f172a' : '#fff',
                      color: mode === m ? '#fff' : '#64748b',
                    }}>
                      {m === 'full-block' ? 'Full Block' : 'Row-by-Row'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Presets */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Preset Size</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(Object.entries(PRESET_CONFIGS) as [string, { seatsPerRow: number; rowCount: number }][]).map(([key, preset]) => (
                    <button key={key}
                      onClick={() => { setSeatsPerRow(preset.seatsPerRow); setRowCount(preset.rowCount); }}
                      style={{
                        flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b',
                        cursor: 'pointer', textTransform: 'capitalize',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rows + Seats/Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Rows</label>
                  <input type="number" min={1} max={50} value={rowCount}
                    onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Seats / Row</label>
                  <input type="number" min={1} max={30} value={seatsPerRow}
                    onChange={(e) => setSeatsPerRow(Math.max(1, parseInt(e.target.value) || 1))}
                    style={inputStyle} />
                </div>
              </div>

              {/* Curvature */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Row Curvature</label>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{curvature}°</span>
                </div>
                <input
                  type="range" min={0} max={50} step={1} value={curvature}
                  onChange={(e) => setCurvature(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#0f172a' }}
                />
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#94a3b8' }}>Arc rows toward altar</p>
              </div>

              {/* Aisle Type */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Aisle Type</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['none', 'center', 'sides', 'double'] as AisleType[]).map((at) => (
                    <button key={at} onClick={() => setAisleType(at)} style={{
                      flex: 1, padding: '6px 2px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      border: `2px solid ${aisleType === at ? '#0f172a' : '#e2e8f0'}`,
                      background: aisleType === at ? '#0f172a' : '#fff',
                      color: aisleType === at ? '#fff' : '#64748b',
                      textTransform: 'capitalize',
                    }}>
                      {at === 'none' ? 'None' : at === 'center' ? 'Center' : at === 'sides' ? 'Sides' : 'Double'}
                    </button>
                  ))}
                </div>
                {aisleType !== 'none' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>Aisle Width (m)</label>
                    <input type="number" min={0.3} max={4} step={0.1} value={aisleWidthM}
                      onChange={(e) => setAisleWidthM(Math.max(0.3, parseFloat(e.target.value) || 0.3))}
                      style={inputStyle} />
                  </div>
                )}
              </div>

              {/* Chair W / H */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Chair W (m)</label>
                  <input type="number" min={0.2} max={1} step={0.05} value={seatWidthM}
                    onChange={(e) => setSeatWidthM(Math.max(0.2, parseFloat(e.target.value) || 0.2))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Chair H (m)</label>
                  <input type="number" min={0.2} max={1} step={0.05} value={seatHeightM}
                    onChange={(e) => setSeatHeightM(Math.max(0.2, parseFloat(e.target.value) || 0.2))}
                    style={inputStyle} />
                </div>
              </div>

              {/* Row Gap / Seat Gap */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Row Gap (m)</label>
                  <input type="number" min={0} max={1} step={0.05} value={rowGapM}
                    onChange={(e) => setRowGapM(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Seat Gap (m)</label>
                  <input type="number" min={0} max={0.5} step={0.02} value={seatGapM}
                    onChange={(e) => setSeatGapM(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={inputStyle} />
                </div>
              </div>

            </AccordionSection>

            {/* ── SECTION 2: STYLE ──────────────────────────────── */}
            <AccordionSection title="Style" open={openSections.has('style')} onToggle={() => toggleAccordion('style')}>

              {/* Chair Style cards */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Chair Style</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['chiavari', 'ghost', 'folding', 'banquet'] as ChairStyle[]).map((cs) => {
                    const sel = chairStyle === cs;
                    return (
                      <button key={cs} onClick={() => setChairStyle(cs)} style={{
                        padding: '8px 6px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${sel ? '#0f172a' : '#e2e8f0'}`,
                        background: sel ? '#0f172a' : '#fff',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      }}>
                        <ChairIcon chairType={cs} selected={sel} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: sel ? '#fff' : '#64748b', textTransform: 'capitalize' }}>
                          {cs}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reserved Rows */}
              <div>
                <label style={labelStyle}>Mark Reserved Rows</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 70, overflowY: 'auto' }}>
                  {rowBadges}
                </div>
                {rowCount > 16 && (
                  <p style={{ margin: '5px 0 0', fontSize: 10, color: '#94a3b8' }}>Showing first 16 rows</p>
                )}
              </div>

            </AccordionSection>

            {/* ── SECTION 3: LABELS ─────────────────────────────── */}
            <AccordionSection title="Labels" open={openSections.has('labels')} onToggle={() => toggleAccordion('labels')}>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                  <input type="checkbox" checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#0f172a' }}
                  />
                  Show row / seat labels
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', marginBottom: 10 }}>
                  <input type="checkbox" checked={sectionLabels.enabled}
                    onChange={(e) => setSectionLabels((prev) => ({ ...prev, enabled: e.target.checked }))}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#0f172a' }}
                  />
                  Show Side Labels (Bride/Groom)
                </label>
                {sectionLabels.enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <label style={labelStyle}>Left Label</label>
                      <input type="text" value={sectionLabels.left}
                        onChange={(e) => setSectionLabels((prev) => ({ ...prev, left: e.target.value }))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Right Label</label>
                      <input type="text" value={sectionLabels.right}
                        onChange={(e) => setSectionLabels((prev) => ({ ...prev, right: e.target.value }))}
                        style={inputStyle} />
                    </div>
                  </div>
                )}
              </div>

            </AccordionSection>
          </div>

          {/* Right: SVG preview */}
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'auto', background: '#fafafa' }}>
            <div style={{
              flex: 1, background: '#f8fafc', borderRadius: 12,
              border: '1px solid #e2e8f0', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 240, position: 'relative',
            }}>
              <svg
                width={PREVIEW_W} height={PREVIEW_H}
                viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
                style={{ display: 'block' }}
              >
                {/* Dot-grid background */}
                <defs>
                  <pattern id="csmDotGrid" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.7" fill="#b8c4d0" opacity="0.45" />
                  </pattern>
                </defs>
                <rect width={PREVIEW_W} height={PREVIEW_H} fill="url(#csmDotGrid)" />

                {/* Altar indicator */}
                <rect
                  x={PREVIEW_W / 2 - 30} y={7}
                  width={60} height={8} rx={4}
                  fill="#8B7355" opacity={0.6}
                />
                <text
                  x={PREVIEW_W / 2} y={21}
                  textAnchor="middle" fontSize="7" fill="#8B7355"
                  letterSpacing="2"
                >
                  ALTAR
                </text>
                {/* Dashed center line from altar to first row */}
                <line
                  x1={PREVIEW_W / 2} y1={15}
                  x2={PREVIEW_W / 2} y2={blockTopPx}
                  stroke="#8B7355" strokeWidth="0.8"
                  strokeDasharray="3,3" opacity={0.35}
                />

                {/* Section labels */}
                {sectionLabelElements}

                {/* Row labels */}
                {rowLabelElements}

                {/* Seats */}
                {seatElements}
              </svg>

              {/* "Click seats to remove" hint — fades after first removal */}
              {removedSeats.size === 0 && (
                <div style={{
                  position: 'absolute', bottom: 9, left: 0, right: 0,
                  textAlign: 'center', fontSize: 10, color: '#94a3b8', pointerEvents: 'none',
                }}>
                  Click seats to remove them
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats Bar ─────────────────────────────────────────────────── */}
        <div style={{
          padding: '9px 24px', borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          background: '#fafafa', flexShrink: 0,
        }}>
          {[
            `${totalSeats} seats`,
            `${totalWidthM.toFixed(1)} m wide`,
            `${totalHeightM.toFixed(1)} m deep`,
          ].map((label) => (
            <span key={label} style={{
              padding: '4px 10px', borderRadius: 20,
              background: '#f1f5f9', fontSize: 12, fontWeight: 600, color: '#475569',
            }}>
              {label}
            </span>
          ))}

          {removedSeats.size > 0 && (
            <span style={{
              padding: '4px 10px', borderRadius: 20, background: '#FEF3C7',
              fontSize: 12, fontWeight: 600, color: '#D97706',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              -{removedSeats.size} removed
              <button
                onClick={() => setRemovedSeats(new Set())}
                title="Restore all removed seats"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, display: 'inline-flex', alignItems: 'center', color: '#D97706',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            </span>
          )}
        </div>

        {/* ── Footer (preserved shell) ──────────────────────────────────── */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {totalSeats} seats · {totalWidthM.toFixed(1)} m × {totalHeightM.toFixed(1)} m
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
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
              onClick={handleAdd}
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

export default CeremonySeatingModal;
