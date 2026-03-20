/**
 * CustomUploadModal — Upload a floor plan or drone shot and calibrate scale.
 *
 * Phase 1: Upload (drag & drop)
 * Phase 2: Draw reference lines (click-click → enter real-world distance)
 * Phase 3: Grid overlay sanity check + fine-tune slider
 *
 * Design matches SatellitePickerModal: inline styles, zIndex 20000, white card.
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { X } from 'lucide-react';
import { useCanvasStore, type CalibrationLine, type CustomBackground } from '../../layout-maker/store/canvasStore';

// ── Constants ────────────────────────────────────────────────────────────────

const LINE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'];

// ── Style tokens (matching SatellitePickerModal) ─────────────────────────────

const FONT = "'Geist', 'Inter', sans-serif";

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#374151',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  fontFamily: FONT,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#f9fafb',
  color: '#1f2937',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: FONT,
};

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '12px 0',
  borderRadius: 10,
  border: 'none',
  background: '#0f172a',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: FONT,
  transition: 'background 0.15s',
};

const btnSecondary: React.CSSProperties = {
  width: '100%',
  padding: '10px 0',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#374151',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: FONT,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2 : (s[m] ?? 0);
}

function derivePixelsPerMeter(lines: CalibrationLine[], nw: number, nh: number): number {
  const ratios = lines
    .filter((l) => l.realWorldMeters > 0)
    .map((l) => {
      const dx = (l.x2 - l.x1) * nw;
      const dy = (l.y2 - l.y1) * nh;
      return Math.sqrt(dx * dx + dy * dy) / l.realWorldMeters;
    });
  return median(ratios);
}

function lineDeviation(line: CalibrationLine, mPpm: number, nw: number, nh: number): number {
  if (!mPpm || !line.realWorldMeters) return 0;
  const dx = (line.x2 - line.x1) * nw;
  const dy = (line.y2 - line.y1) * nh;
  const ppm = Math.sqrt(dx * dx + dy * dy) / line.realWorldMeters;
  return Math.abs(ppm - mPpm) / mPpm;
}

function genId() {
  return `cal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CustomUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  a4WidthPx: number;
  initialData?: CustomBackground;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CustomUploadModal: React.FC<CustomUploadModalProps> = ({
  isOpen,
  onClose,
  a4WidthPx,
  initialData,
}) => {
  const setCustomBackground = useCanvasStore((s) => s.setCustomBackground);

  // Phase
  const [phase, setPhase] = useState<'upload' | 'calibrate' | 'confirm'>('upload');

  // Image
  const [imageBase64, setImageBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Calibration
  const [lines, setLines] = useState<CalibrationLine[]>([]);
  const [pendingStart, setPendingStart] = useState<{ x: number; y: number } | null>(null);
  const [inputLineId, setInputLineId] = useState<string | null>(null);
  const [inputMeters, setInputMeters] = useState('');
  const [scaleFactor, setScaleFactor] = useState(1.0);

  // Canvas view
  const [imgZoom, setImgZoom] = useState(1);
  const [imgPan, setImgPan] = useState({ x: 0, y: 0 });
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const isPanningRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const completedLines = useMemo(() => lines.filter((l) => l.realWorldMeters > 0), [lines]);
  const rawPpm = useMemo(
    () => derivePixelsPerMeter(completedLines, naturalWidth, naturalHeight),
    [completedLines, naturalWidth, naturalHeight]
  );
  const adjustedPpm = rawPpm * scaleFactor;
  const realWorldWidth = adjustedPpm > 0 ? naturalWidth / adjustedPpm : 0;
  const realWorldHeight = adjustedPpm > 0 ? naturalHeight / adjustedPpm : 0;
  const confidence = completedLines.length >= 3 ? 3 : completedLines.length >= 2 ? 2 : completedLines.length >= 1 ? 1 : 0;

  // Reset / restore on open
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setImageBase64(initialData.imageBase64);
      setFileName(initialData.fileName);
      setFileType(initialData.fileType);
      setNaturalWidth(initialData.naturalWidth);
      setNaturalHeight(initialData.naturalHeight);
      setLines(initialData.calibrationLines);
      setScaleFactor(initialData.scaleFactor);
      setPhase(initialData.calibrationLines.length > 0 ? 'confirm' : 'calibrate');
    } else {
      setImageBase64(''); setFileName(''); setFileType('');
      setNaturalWidth(0); setNaturalHeight(0);
      setLines([]); setScaleFactor(1.0);
      setPendingStart(null); setInputMeters(''); setInputLineId(null);
      setPhase('upload'); setUploadError('');
      setImgZoom(1); setImgPan({ x: 0, y: 0 });
    }
  }, [isOpen, initialData]);

  // ── Canvas draw ────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const dw = canvas.clientWidth;
    const dh = canvas.clientHeight;
    canvas.width = dw * dpr;
    canvas.height = dh * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, dw, dh);

    ctx.save();
    ctx.translate(imgPan.x + dw / 2, imgPan.y + dh / 2);
    ctx.scale(imgZoom, imgZoom);

    const scale = Math.min(dw / img.naturalWidth, dh / img.naturalHeight) * 0.9;
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);

    // Grid overlay (confirm phase)
    if (phase === 'confirm' && adjustedPpm > 0) {
      const gpx = adjustedPpm * scale;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5 / imgZoom;
      ctx.setLineDash([3 / imgZoom, 3 / imgZoom]);
      const cols = Math.ceil(iw / gpx) + 1;
      const rows = Math.ceil(ih / gpx) + 1;
      for (let c = 0; c <= cols; c++) {
        const x = -iw / 2 + c * gpx;
        ctx.beginPath(); ctx.moveTo(x, -ih / 2); ctx.lineTo(x, ih / 2); ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        const y = -ih / 2 + r * gpx;
        ctx.beginPath(); ctx.moveTo(-iw / 2, y); ctx.lineTo(iw / 2, y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw calibration lines
    lines.forEach((line) => {
      const x1 = -iw / 2 + line.x1 * iw;
      const y1 = -ih / 2 + line.y1 * ih;
      const x2 = -iw / 2 + line.x2 * iw;
      const y2 = -ih / 2 + line.y2 * ih;
      const bad = rawPpm > 0 && lineDeviation(line, rawPpm, naturalWidth, naturalHeight) > 0.15 && completedLines.length >= 2;

      ctx.strokeStyle = bad ? '#ef4444' : line.color;
      ctx.lineWidth = 2 / imgZoom;
      ctx.setLineDash(line.realWorldMeters > 0 ? [] : [5 / imgZoom, 3 / imgZoom]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);

      // Endpoint dots
      [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(({ x, y }) => {
        ctx.fillStyle = line.color;
        ctx.beginPath(); ctx.arc(x, y, 4 / imgZoom, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 / imgZoom; ctx.stroke();
      });

      // Label
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const label = line.realWorldMeters > 0 ? `${line.realWorldMeters}m` : '…';
      ctx.font = `bold ${11 / imgZoom}px ${FONT}`;
      ctx.lineWidth = 3 / imgZoom;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(label, mx + 6 / imgZoom, my - 4 / imgZoom);
      ctx.fillStyle = bad ? '#ef4444' : '#fff';
      ctx.fillText(label, mx + 6 / imgZoom, my - 4 / imgZoom);
    });

    // Pending start dot
    if (pendingStart) {
      const x = -iw / 2 + pendingStart.x * iw;
      const y = -ih / 2 + pendingStart.y * ih;
      ctx.fillStyle = LINE_COLORS[lines.length % LINE_COLORS.length] ?? '#ef4444';
      ctx.beginPath(); ctx.arc(x, y, 6 / imgZoom, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 / imgZoom; ctx.stroke();
    }

    ctx.restore();
  }, [lines, pendingStart, phase, adjustedPpm, imgZoom, imgPan, rawPpm, naturalWidth, naturalHeight, completedLines]);

  // Load image when base64 changes
  useEffect(() => {
    if (!imageBase64 || (phase !== 'calibrate' && phase !== 'confirm')) return;
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = imageBase64;
  }, [imageBase64, phase]);

  // Redraw on state changes
  useEffect(() => { draw(); }, [draw]);

  // ── File handling ──────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    setUploadError('');
    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!accepted.includes(file.type)) { setUploadError('Only JPG, PNG, WEBP or GIF files are supported.'); return; }
    if (file.size > 50 * 1024 * 1024) { setUploadError('File too large — 50 MB max.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setNaturalWidth(img.naturalWidth);
        setNaturalHeight(img.naturalHeight);
        setImageBase64(b64);
        setFileName(file.name);
        setFileType(file.type);
        setLines([]); setScaleFactor(1.0);
        setPendingStart(null); setInputMeters(''); setInputLineId(null);
        setImgZoom(1); setImgPan({ x: 0, y: 0 });
        setPhase('calibrate');
      };
      img.src = b64;
    };
    reader.readAsDataURL(file);
  }, []);

  // ── Canvas interaction ─────────────────────────────────────────────────────

  const canvasToNorm = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return null;
    const rect = canvas.getBoundingClientRect();
    const dw = rect.width;
    const dh = rect.height;
    const scale = Math.min(dw / img.naturalWidth, dh / img.naturalHeight) * 0.9;
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const wx = (mx - (imgPan.x + dw / 2)) / imgZoom;
    const wy = (my - (imgPan.y + dh / 2)) / imgZoom;
    const ix = wx + iw / 2;
    const iy = wy + ih / 2;
    if (ix < 0 || iy < 0 || ix > iw || iy > ih) return null;
    return { x: ix / iw, y: iy / ih };
  }, [imgZoom, imgPan]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'calibrate' || isPanningRef.current) return;
    const pt = canvasToNorm(e);
    if (!pt) return;
    if (!pendingStart) {
      setPendingStart(pt);
    } else {
      const newLine: CalibrationLine = {
        id: genId(),
        x1: pendingStart.x, y1: pendingStart.y,
        x2: pt.x, y2: pt.y,
        realWorldMeters: 0,
        color: LINE_COLORS[lines.length % LINE_COLORS.length] ?? LINE_COLORS[0]!,
      };
      setLines((prev) => [...prev, newLine]);
      setPendingStart(null);
      setInputLineId(newLine.id);
      setInputMeters('');
    }
  }, [phase, pendingStart, lines.length, canvasToNorm]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      isPanningRef.current = true;
      panStart.current = { mx: e.clientX, my: e.clientY, px: imgPan.x, py: imgPan.y };
    }
  }, [imgPan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!panStart.current) return;
    const dx = e.clientX - panStart.current.mx;
    const dy = e.clientY - panStart.current.my;
    setImgPan({ x: panStart.current.px + dx, y: panStart.current.py + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    panStart.current = null;
    setTimeout(() => { isPanningRef.current = false; }, 50);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setImgZoom((z) => Math.max(0.2, Math.min(10, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))));
  }, []);

  // ── Meters input ───────────────────────────────────────────────────────────

  const submitMeters = useCallback(() => {
    const m = parseFloat(inputMeters);
    if (!inputLineId || isNaN(m) || m <= 0) return;
    setLines((prev) => prev.map((l) => l.id === inputLineId ? { ...l, realWorldMeters: m } : l));
    setInputLineId(null); setInputMeters('');
  }, [inputLineId, inputMeters]);

  // ── Add to canvas ──────────────────────────────────────────────────────────

  const handleAddToCanvas = useCallback(() => {
    if (adjustedPpm <= 0 || !imageBase64) return;
    const canvasPpm = a4WidthPx / realWorldWidth;
    const bg: CustomBackground = {
      fileName, fileType, naturalWidth, naturalHeight, imageBase64,
      calibrationLines: lines,
      pixelsPerMeter: canvasPpm,
      scaleFactor,
      realWorldWidth,
      realWorldHeight,
      addedAt: new Date().toISOString(),
    };
    setCustomBackground(bg);
    onClose();
  }, [adjustedPpm, imageBase64, a4WidthPx, realWorldWidth, realWorldHeight,
    fileName, fileType, naturalWidth, naturalHeight, lines, scaleFactor,
    setCustomBackground, onClose]);

  if (!isOpen) return null;

  // ── Phase label helpers ────────────────────────────────────────────────────

  const confidenceColor = ['#6b7280', '#ef4444', '#f59e0b', '#22c55e'][confidence];
  const confidenceLabel = ['No lines yet', 'Low confidence', 'Medium confidence', 'High confidence'][confidence];

  const phaseLabel = phase === 'upload'
    ? 'Drop your floor plan or drone photo'
    : phase === 'calibrate'
    ? 'Click two points → enter real-world distance'
    : 'Verify the 1m grid against your space';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: FONT,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onWheelCapture={(e) => e.stopPropagation()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          height: '85vh',
          maxHeight: 820,
          background: '#ffffff',
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Upload icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
                Upload Floor Plan
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>{phaseLabel}</p>
            </div>
          </div>

          {/* Phase stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {(['upload', 'calibrate', 'confirm'] as const).map((p, i) => {
              const active = phase === p;
              const enabled = p === 'upload' || (p === 'calibrate' && !!imageBase64) || (p === 'confirm' && completedLines.length > 0);
              return (
                <React.Fragment key={p}>
                  <button
                    onClick={() => enabled && setPhase(p)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: active ? '#0f172a' : 'transparent',
                      color: active ? '#fff' : enabled ? '#475569' : '#cbd5e1',
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      cursor: enabled ? 'pointer' : 'default',
                      fontFamily: FONT,
                    }}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                  {i < 2 && <span style={{ color: '#cbd5e1', fontSize: 14, margin: '0 4px' }}>/</span>}
                </React.Fragment>
              );
            })}
          </div>

          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: 'none', background: '#f1f5f9',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#64748b',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* ════════ PHASE: UPLOAD ════════ */}
          {phase === 'upload' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <div
                style={{
                  width: '100%', maxWidth: 480,
                  border: `2px dashed ${dragOver ? '#0f172a' : '#e2e8f0'}`,
                  borderRadius: 16,
                  background: dragOver ? '#f8fafc' : '#fafafa',
                  padding: '56px 40px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{
                  width: 72, height: 72, borderRadius: 16,
                  background: '#ffffff', border: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
                    Drop your floor plan here
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b' }}>
                    or click to browse
                  </p>
                  <p style={{ margin: '12px 0 0', fontSize: 12, color: '#94a3b8', letterSpacing: 0.3 }}>
                    JPG · PNG · WEBP · up to 50 MB
                  </p>
                </div>
                {uploadError && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: '#fef2f2', border: '1px solid #fecaca',
                    color: '#dc2626', fontSize: 13, textAlign: 'center',
                  }}>
                    {uploadError}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }}
              />
            </div>
          )}

          {/* ════════ PHASE: CALIBRATE ════════ */}
          {phase === 'calibrate' && (
            <>
              {/* Canvas */}
              <div style={{ flex: 1, position: 'relative', background: '#1a1a2e', overflow: 'hidden' }}>
                <canvas
                  ref={canvasRef}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                    cursor: pendingStart ? 'crosshair' : 'crosshair' }}
                  onClick={handleCanvasClick}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                />
                {/* Instructions */}
                <div style={{
                  position: 'absolute', top: 12, left: 12,
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                  borderRadius: 8, padding: '7px 12px',
                  color: '#f3f4f6', fontSize: 12, pointerEvents: 'none',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {pendingStart
                    ? '📍 Click to place the end point'
                    : '📐 Click two points to draw a reference line'}
                </div>
                {/* Zoom controls */}
                <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: '+', onClick: () => setImgZoom((z) => Math.min(10, z * 1.2)) },
                    { label: '−', onClick: () => setImgZoom((z) => Math.max(0.2, z / 1.2)) },
                    { label: '⊙', onClick: () => { setImgZoom(1); setImgPan({ x: 0, y: 0 }); } },
                  ].map(({ label, onClick }) => (
                    <button key={label} onClick={onClick} style={{
                      width: 32, height: 32,
                      background: 'rgba(0,0,0,0.6)', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8, cursor: 'pointer', fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{label}</button>
                  ))}
                </div>
                <p style={{
                  position: 'absolute', bottom: 12, left: 12,
                  margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)',
                  pointerEvents: 'none',
                }}>
                  Alt + drag or middle-click to pan · Scroll to zoom
                </p>
              </div>

              {/* Right panel */}
              <div style={{
                width: 300, flexShrink: 0,
                borderLeft: '1px solid #f1f5f9',
                background: '#ffffff',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}>
                {/* Panel header */}
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                      Reference lines
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: confidenceColor, padding: '4px 10px', background: confidenceColor === '#22c55e' ? '#dcfce7' : confidenceColor === '#f59e0b' ? '#fef3c7' : confidenceColor === '#ef4444' ? '#fee2e2' : '#f1f5f9', borderRadius: 20 }}>
                      {confidenceLabel}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                    More lines = better accuracy. Draw on known distances.
                  </p>
                </div>

                {/* Inline measure input */}
                {inputLineId && (
                  <div style={{
                    margin: '12px 16px 0',
                    padding: '14px 16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                  }}>
                    <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      How long is this line in real life?
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number" min="0.01" step="0.1" placeholder="e.g. 4.5"
                        value={inputMeters}
                        onChange={(e) => setInputMeters(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitMeters();
                          if (e.key === 'Escape') { setInputLineId(null); setInputMeters(''); }
                        }}
                        autoFocus
                        style={{
                          flex: 1, padding: '10px 12px', borderRadius: 8,
                          border: '1px solid #cbd5e1', background: '#fff',
                          fontSize: 14, outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: 13, color: '#64748b' }}>m</span>
                      <button onClick={submitMeters} style={{
                        padding: '10px 16px', borderRadius: 8, border: 'none',
                        background: '#0f172a', color: '#fff',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}>Confirm</button>
                    </div>
                  </div>
                )}

                {/* Lines list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                  {lines.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
                      No lines drawn yet.<br />Click on the image to start.
                    </div>
                  )}
                  {lines.map((line, i) => {
                    const bad = rawPpm > 0 && lineDeviation(line, rawPpm, naturalWidth, naturalHeight) > 0.15 && completedLines.length >= 2;
                    return (
                      <div key={line.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', marginBottom: 8, borderRadius: 8,
                        border: `1px solid ${bad ? '#fecaca' : '#e2e8f0'}`,
                        background: bad ? '#fef2f2' : '#f8fafc',
                        fontSize: 13,
                      }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: line.color, flexShrink: 0 }} />
                        <span style={{ color: '#6b7280' }}>Line {i + 1}</span>
                        {line.realWorldMeters > 0
                          ? <span style={{ fontWeight: 600, color: '#111827' }}>{line.realWorldMeters}m</span>
                          : <button
                              onClick={() => { setInputLineId(line.id); setInputMeters(''); }}
                              style={{ border: 'none', background: 'none', color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                            >Enter length</button>
                        }
                        {bad && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#ef4444' }}>⚠ inconsistent</span>}
                        <button
                          onClick={() => { setLines((p) => p.filter((l) => l.id !== line.id)); if (inputLineId === line.id) { setInputLineId(null); setInputMeters(''); } }}
                          style={{ marginLeft: bad ? 0 : 'auto', border: 'none', background: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 15, padding: 0, lineHeight: 1 }}
                        >×</button>
                      </div>
                    );
                  })}
                </div>

                {/* Scale summary + next */}
                {completedLines.length > 0 && (
                  <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                      <span style={{ color: '#64748b' }}>Scale</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>1m = {adjustedPpm.toFixed(0)}px</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
                      <span style={{ color: '#64748b' }}>Area</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{realWorldWidth.toFixed(1)}m × {realWorldHeight.toFixed(1)}m</span>
                    </div>
                    <button onClick={() => setPhase('confirm')} style={btnPrimary}>
                      Next: Verify grid
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ════════ PHASE: CONFIRM ════════ */}
          {phase === 'confirm' && (
            <>
              {/* Canvas with grid */}
              <div style={{ flex: 1, position: 'relative', background: '#1a1a2e', overflow: 'hidden' }}>
                <canvas
                  ref={canvasRef}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'grab' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                />
                <div style={{
                  position: 'absolute', top: 12, left: 12,
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                  borderRadius: 8, padding: '7px 12px',
                  color: '#f3f4f6', fontSize: 12, pointerEvents: 'none',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                  </svg>
                  1m × 1m grid — does it match your space?
                </div>
                <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: '+', onClick: () => setImgZoom((z) => Math.min(10, z * 1.2)) },
                    { label: '−', onClick: () => setImgZoom((z) => Math.max(0.2, z / 1.2)) },
                    { label: '⊙', onClick: () => { setImgZoom(1); setImgPan({ x: 0, y: 0 }); } },
                  ].map(({ label, onClick }) => (
                    <button key={label} onClick={onClick} style={{
                      width: 32, height: 32,
                      background: 'rgba(0,0,0,0.6)', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8, cursor: 'pointer', fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div style={{
                width: 300, flexShrink: 0,
                borderLeft: '1px solid #f1f5f9',
                background: '#ffffff',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
                    Scale verification
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                    Do the grid squares look like 1m × 1m? Use the slider if they're off.
                  </p>
                </div>

                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
                  {/* Confidence */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={confidenceColor} strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 600, color: confidenceColor }}>{confidenceLabel}</span>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>({completedLines.length} line{completedLines.length !== 1 ? 's' : ''})</span>
                  </div>

                  {/* Inconsistency warning */}
                  {completedLines.length >= 2 && completedLines.some((l) => lineDeviation(l, rawPpm, naturalWidth, naturalHeight) > 0.15) && (
                    <div style={{
                      padding: '12px 14px', borderRadius: 8,
                      background: '#fef2f2', border: '1px solid #fecaca',
                      fontSize: 13, color: '#dc2626', lineHeight: 1.5,
                    }}>
                      Some lines disagree by &gt;15%. Check measurements or go back to re-draw.
                    </div>
                  )}

                  {/* Fine-tune slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ ...labelStyle, marginBottom: 0, fontSize: 13 }}>Fine-tune scale</label>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {scaleFactor >= 1 ? '+' : ''}{((scaleFactor - 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range" min={0.8} max={1.2} step={0.01}
                      value={scaleFactor}
                      onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#0f172a' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      <span>−20%</span>
                      <button onClick={() => setScaleFactor(1)} style={{ border: 'none', background: 'none', color: '#0f172a', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Reset</button>
                      <span>+20%</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: '16px', borderRadius: 10 }}>
                    {[
                      { label: 'Scale', value: `1m = ${adjustedPpm.toFixed(0)}px` },
                      { label: 'Space area', value: `${realWorldWidth.toFixed(1)}m × ${realWorldHeight.toFixed(1)}m` },
                      { label: 'File', value: fileName },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#64748b' }}>{label}</span>
                        <span style={{ fontWeight: 500, color: '#0f172a', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setPhase('calibrate')} style={btnSecondary}>
                    Back to calibrate
                  </button>
                </div>

                {/* CTA */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                  <button
                    onClick={handleAddToCanvas}
                    disabled={adjustedPpm <= 0 || completedLines.length === 0}
                    style={{
                      ...btnPrimary,
                      opacity: (adjustedPpm <= 0 || completedLines.length === 0) ? 0.4 : 1,
                      cursor: (adjustedPpm <= 0 || completedLines.length === 0) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Add to Canvas
                  </button>
                  {completedLines.length === 0 && (
                    <p style={{ margin: '10px 0 0', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                      Draw at least one reference line first
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
