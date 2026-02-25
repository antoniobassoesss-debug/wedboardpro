import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { exportLayout, printLayout, PAPER_SIZES, type ExportFormat } from '../../lib/layout-export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  a4Bounds: { x: number; y: number; width: number; height: number } | null;
  layoutName?: string | undefined;
}

type QualityLevel = 'draft' | 'standard' | 'high';
type PaperSize = 'A4' | 'A3' | 'Letter';
type Orientation = 'portrait' | 'landscape';
type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

const QUALITY_MAP: Record<QualityLevel, number> = { draft: 1, standard: 2, high: 3 };

const FORMAT_CARDS: Array<{
  format: ExportFormat;
  name: string;
  description: string;
  bestFor: string;
  icon: React.ReactNode;
}> = [
  {
    format: 'pdf',
    name: 'PDF',
    description: 'Print-ready document',
    bestFor: 'Professional printing',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    format: 'png',
    name: 'PNG',
    description: 'High quality image',
    bestFor: 'Digital sharing',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    format: 'jpg',
    name: 'JPG',
    description: 'Compressed image',
    bestFor: 'Email & WhatsApp',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
];

const FILE_SIZE_ESTIMATES: Record<ExportFormat, Record<QualityLevel, string>> = {
  pdf: { draft: '~200KB', standard: '~800KB', high: '~2MB' },
  png: { draft: '~500KB', standard: '~2MB', high: '~5MB' },
  jpg: { draft: '~100KB', standard: '~300KB', high: '~800KB' },
};

const PillButton: React.FC<{
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ selected, onClick, disabled, children, icon }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '6px 14px',
      borderRadius: '8px',
      border: `1.5px solid ${selected ? '#6366f1' : '#e2e8f0'}`,
      background: selected ? '#eef2ff' : '#ffffff',
      color: selected ? '#4338ca' : '#64748b',
      fontSize: '12px',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    {icon}
    {children}
  </button>
);

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  svgRef,
  a4Bounds,
  layoutName = 'layout',
}) => {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [quality, setQuality] = useState<QualityLevel>('high');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [visible, setVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Animate in
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Focus trap: close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
    }
  }, [isOpen]);

  const isDisabled = status === 'exporting' || status === 'success';

  const handleExport = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg || !a4Bounds) {
      setStatus('error');
      return;
    }

    setStatus('exporting');

    try {
      const sanitizedName = layoutName
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase() || 'layout';

      await exportLayout(svg, {
        format,
        quality: 0.95,
        scale: QUALITY_MAP[quality],
        filename: sanitizedName,
        paperSize,
        orientation,
      }, a4Bounds);

      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 1200);
    } catch (err) {
      console.error('[Export] Failed:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [svgRef, a4Bounds, format, quality, paperSize, orientation, layoutName, onClose]);

  const handlePrint = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg || !a4Bounds) return;

    setStatus('exporting');
    try {
      await printLayout(svg, a4Bounds);
      setStatus('idle');
    } catch (err) {
      console.error('[Print] Failed:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [svgRef, a4Bounds]);

  if (!isOpen) return null;

  const filenamePreview = `${layoutName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'layout'}.${format}`;

  const modalContent = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !isDisabled) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(4px)' : 'none',
        transition: 'background 0.2s ease, backdrop-filter 0.2s ease',
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '520px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.2s ease, opacity 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366f1',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Export Layout</h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>Choose format and quality settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDisabled}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!isDisabled) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Section 1 — Format selector */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'block' }}>
              Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {FORMAT_CARDS.map((card) => {
                const selected = format === card.format;
                return (
                  <button
                    key={card.format}
                    onClick={() => { if (!isDisabled) setFormat(card.format); }}
                    disabled={isDisabled}
                    style={{
                      position: 'relative',
                      padding: '14px 12px',
                      borderRadius: '12px',
                      border: `2px solid ${selected ? '#6366f1' : '#e2e8f0'}`,
                      background: selected ? '#f5f3ff' : '#ffffff',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease',
                      opacity: isDisabled ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!selected && !isDisabled) {
                        e.currentTarget.style.borderColor = '#c7d2fe';
                        e.currentTarget.style.background = '#fafafe';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected && !isDisabled) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#ffffff';
                      }
                    }}
                  >
                    {/* Checkmark badge */}
                    {selected && (
                      <div style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    <div style={{ color: selected ? '#6366f1' : '#94a3b8' }}>
                      {card.icon}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: selected ? '#4338ca' : '#0f172a' }}>
                      {card.name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                      {card.description}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: selected ? '#6366f1' : '#94a3b8',
                      background: selected ? '#eef2ff' : '#f8fafc',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}>
                      {card.bestFor}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2 — Quality (for JPG and PDF) */}
          {(format === 'jpg' || format === 'pdf' || format === 'png') && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
                Export Quality
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <PillButton selected={quality === 'draft'} onClick={() => setQuality('draft')} disabled={isDisabled}>
                  Draft (72 DPI)
                </PillButton>
                <PillButton selected={quality === 'standard'} onClick={() => setQuality('standard')} disabled={isDisabled}>
                  Standard (150 DPI)
                </PillButton>
                <PillButton selected={quality === 'high'} onClick={() => setQuality('high')} disabled={isDisabled}>
                  High (300 DPI)
                </PillButton>
              </div>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Higher quality = larger file size</p>
            </div>
          )}

          {/* Section 3 — Paper Size (PDF only) */}
          {format === 'pdf' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
                Paper Size
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['A4', 'A3', 'Letter'] as PaperSize[]).map((size) => (
                  <PillButton key={size} selected={paperSize === size} onClick={() => setPaperSize(size)} disabled={isDisabled}>
                    {size}
                  </PillButton>
                ))}
              </div>
            </div>
          )}

          {/* Section 4 — Orientation (PDF only) */}
          {format === 'pdf' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
                Orientation
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <PillButton
                  selected={orientation === 'portrait'}
                  onClick={() => setOrientation('portrait')}
                  disabled={isDisabled}
                  icon={
                    <svg width="12" height="12" viewBox="0 0 12 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1" y="1" width="10" height="14" rx="1" />
                    </svg>
                  }
                >
                  Portrait
                </PillButton>
                <PillButton
                  selected={orientation === 'landscape'}
                  onClick={() => setOrientation('landscape')}
                  disabled={isDisabled}
                  icon={
                    <svg width="14" height="10" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1" y="1" width="14" height="10" rx="1" />
                    </svg>
                  }
                >
                  Landscape
                </PillButton>
              </div>
            </div>
          )}

          {/* Section 5 — Preview strip */}
          <div style={{
            padding: '14px 16px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            {/* Thumbnail placeholder */}
            <div style={{
              width: orientation === 'landscape' && format === 'pdf' ? '113px' : '80px',
              height: orientation === 'landscape' && format === 'pdf' ? '80px' : '113px',
              borderRadius: '6px',
              background: '#e2e8f0',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12px',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                color: '#475569',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {filenamePreview}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                Estimated size: {FILE_SIZE_ESTIMATES[format][quality]}
              </div>
              {format === 'pdf' && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {paperSize} {orientation}  ·  {PAPER_SIZES[paperSize]?.w ?? 210} × {PAPER_SIZES[paperSize]?.h ?? 297} mm
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Left: Print button */}
          <button
            onClick={handlePrint}
            disabled={isDisabled}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: 'transparent',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isDisabled ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>

          {/* Right: Cancel + Export */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              disabled={isDisabled}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: 'transparent',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleExport}
              disabled={isDisabled}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: status === 'success' ? '#22c55e' : (status === 'error' ? '#ef4444' : '#6366f1'),
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '120px',
                justifyContent: 'center',
                transition: 'background 0.2s ease',
                boxShadow: status === 'idle' ? '0 1px 3px rgba(99,102,241,0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (status === 'idle') e.currentTarget.style.background = '#4f46e5';
              }}
              onMouseLeave={(e) => {
                if (status === 'idle') e.currentTarget.style.background = '#6366f1';
              }}
            >
              {status === 'exporting' && (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Exporting...
                </>
              )}
              {status === 'success' && (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Done!
                </>
              )}
              {status === 'error' && 'Failed — retry'}
              {status === 'idle' && (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Spin keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ExportModal;
