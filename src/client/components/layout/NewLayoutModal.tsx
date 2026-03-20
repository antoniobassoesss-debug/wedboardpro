/**
 * NewLayoutModal — lets planners choose how to start a new layout:
 * 1. Draw from scratch (blank canvas)
 * 2. Import a floor plan (file upload → custom background)
 * 3. Use real location (satellite imagery)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type LayoutFlow = 'scratch' | 'import' | 'location';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useNewLayoutModal() {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return { isOpen, open, close };
}

// ---------------------------------------------------------------------------
// Illustrations — stroke-based SVGs that react to active/hover state
// ---------------------------------------------------------------------------

interface IllustrationProps {
  active: boolean;
}

const DrawFromScratchIllustration: React.FC<IllustrationProps> = ({ active }) => (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none" aria-hidden="true">
    {/* Grid */}
    {[20, 40, 60].map((y) => (
      <line key={`h${y}`} x1="5" y1={y} x2="115" y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
    ))}
    {[30, 60, 90].map((x) => (
      <line key={`v${x}`} x1={x} y1="5" x2={x} y2="75" stroke="#e2e8f0" strokeWidth="0.5" />
    ))}

    {/* L-shaped floor plan outline */}
    <path
      d="M18 12 L95 12 L95 48 L60 48 L60 68 L18 68 Z"
      stroke={active ? '#3b82f6' : '#94a3b8'}
      strokeWidth={active ? 1.5 : 1}
      fill="none"
      style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
    />
    {/* Internal room divider */}
    <line
      x1="18"
      y1="42"
      x2="60"
      y2="42"
      stroke={active ? '#3b82f6' : '#94a3b8'}
      strokeWidth={active ? 1.5 : 1}
      style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
    />
    {/* Door arc */}
    <path
      d="M18 42 A8 8 0 0 1 26 34"
      stroke={active ? '#93c5fd' : '#cbd5e1'}
      strokeWidth="1"
      fill="none"
      style={{ transition: 'stroke 0.2s ease' }}
    />

    {/* Pencil cursor — glides in and brightens on active */}
    <g
      style={{
        transform: active
          ? 'translate(84px, 22px) rotate(315deg)'
          : 'translate(90px, 28px) rotate(315deg)',
        opacity: active ? 1 : 0.25,
        transition: 'transform 0.25s ease, opacity 0.25s ease',
      }}
    >
      <rect
        x="-3.5"
        y="-10"
        width="7"
        height="12"
        rx="1"
        stroke={active ? '#3b82f6' : '#374151'}
        strokeWidth="1.2"
        fill="white"
        style={{ transition: 'stroke 0.2s' }}
      />
      <polygon
        points="-3.5,2 3.5,2 0,7"
        fill={active ? '#3b82f6' : '#374151'}
        style={{ transition: 'fill 0.2s' }}
      />
      <line
        x1="-3.5"
        y1="-10"
        x2="3.5"
        y2="-10"
        stroke={active ? '#93c5fd' : '#94a3b8'}
        strokeWidth="2.5"
        style={{ transition: 'stroke 0.2s' }}
      />
    </g>
  </svg>
);

const ImportFloorPlanIllustration: React.FC<IllustrationProps> = ({ active }) => (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none" aria-hidden="true">
    {/* Bottom page */}
    <rect
      x="32"
      y="25"
      width="56"
      height="42"
      rx="2"
      stroke="#cbd5e1"
      strokeWidth="1"
      fill="white"
      style={{
        transform: active ? 'translate(0px, 3px)' : 'translate(0px, 0px)',
        transition: 'transform 0.2s ease',
      }}
    />
    {/* Middle page */}
    <rect
      x="22"
      y="17"
      width="56"
      height="42"
      rx="2"
      stroke="#94a3b8"
      strokeWidth="1"
      fill="white"
      style={{
        transform: active ? 'translate(0px, 1px)' : 'translate(0px, 0px)',
        transition: 'transform 0.2s ease',
      }}
    />
    {/* Top page — lifts on active */}
    <rect
      x="12"
      y="9"
      width="56"
      height="42"
      rx="2"
      stroke={active ? '#3b82f6' : '#64748b'}
      strokeWidth={active ? 1.5 : 1}
      fill="white"
      style={{
        transform: active ? 'translate(0px, -3px)' : 'translate(0px, 0px)',
        transition: 'all 0.2s ease',
      }}
    />
    {/* Floor plan lines on top page */}
    <g
      style={{
        transform: active ? 'translate(0px, -3px)' : 'translate(0px, 0px)',
        transition: 'transform 0.2s ease',
      }}
    >
      <path
        d="M22 21 L50 21 L50 37 L42 37 L42 44 L22 44 Z"
        stroke={active ? '#3b82f6' : '#94a3b8'}
        strokeWidth="1"
        fill="none"
        style={{ transition: 'stroke 0.2s ease' }}
      />
      <line
        x1="22"
        y1="34"
        x2="42"
        y2="34"
        stroke={active ? '#93c5fd' : '#cbd5e1'}
        strokeWidth="0.8"
        style={{ transition: 'stroke 0.2s' }}
      />
    </g>

    {/* Upload arrow — pulses upward on active */}
    <g
      style={{
        transform: active ? 'translate(86px, 10px)' : 'translate(86px, 20px)',
        opacity: active ? 1 : 0.3,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      <line
        x1="0"
        y1="16"
        x2="0"
        y2="0"
        stroke="#3b82f6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <polyline
        points="-4,7 0,0 4,7"
        stroke="#3b82f6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  </svg>
);

const UseRealLocationIllustration: React.FC<IllustrationProps> = ({ active }) => (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none" aria-hidden="true">
    {/* Map card background */}
    <rect x="5" y="5" width="110" height="70" rx="3" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />

    {/* City blocks */}
    <rect x="12" y="12" width="26" height="16" rx="1" fill="#e2e8f0" />
    <rect x="12" y="36" width="16" height="22" rx="1" fill="#e2e8f0" />
    <rect x="34" y="36" width="18" height="13" rx="1" fill="#e2e8f0" />
    <rect x="47" y="12" width="18" height="25" rx="1" fill="#e2e8f0" />
    <rect x="74" y="12" width="26" height="11" rx="1" fill="#e2e8f0" />
    <rect x="74" y="31" width="15" height="27" rx="1" fill="#e2e8f0" />
    <rect x="95" y="31" width="13" height="14" rx="1" fill="#e2e8f0" />

    {/* Roads */}
    <rect x="5" y="30" width="110" height="5" fill="white" />
    <rect x="69" y="5" width="4" height="70" fill="white" />

    {/* Selection rectangle — dashes appear on active */}
    <rect
      x="47"
      y="35"
      width="22"
      height="22"
      rx="1"
      stroke={active ? '#f59e0b' : '#94a3b8'}
      strokeWidth="1.5"
      strokeDasharray={active ? '4 2' : '0'}
      fill={active ? 'rgba(251,191,36,0.07)' : 'none'}
      style={{ transition: 'stroke 0.3s ease, fill 0.3s ease, stroke-dasharray 0.3s ease' }}
    />

    {/* Location pin — bounces down from above on active */}
    <g
      style={{
        transform: active ? 'translate(58px, 38px)' : 'translate(58px, 28px)',
        opacity: active ? 1 : 0.45,
        transition:
          'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
      }}
    >
      <path
        d="M0 -10 C-6 -10 -8 -6 -8 -3 C-8 2 0 9 0 9 C0 9 8 2 8 -3 C8 -6 6 -10 0 -10 Z"
        stroke={active ? '#3b82f6' : '#64748b'}
        strokeWidth="1.2"
        fill="white"
        style={{ transition: 'stroke 0.2s' }}
      />
      <circle
        cx="0"
        cy="-3"
        r="2.5"
        fill={active ? '#3b82f6' : '#94a3b8'}
        style={{ transition: 'fill 0.2s' }}
      />
    </g>
  </svg>
);

// ---------------------------------------------------------------------------
// Card data
// ---------------------------------------------------------------------------
interface CardDef {
  id: LayoutFlow;
  tag: string;
  tagBg: string;
  tagColor: string;
  label: string;
  description: string;
}

const CARDS: CardDef[] = [
  {
    id: 'scratch',
    tag: 'Full control',
    tagBg: '#f1f5f9',
    tagColor: '#475569',
    label: 'Draw from scratch',
    description:
      'Start with a blank canvas. Define walls, rooms and measurements with precision drawing tools.',
  },
  {
    id: 'import',
    tag: 'Most popular',
    tagBg: '#dbeafe',
    tagColor: '#1e40af',
    label: 'Import a floor plan',
    description:
      'Upload a PDF or image as a reference layer. Trace over it to build your interactive layout.',
  },
  {
    id: 'location',
    tag: 'Most accurate',
    tagBg: '#dcfce7',
    tagColor: '#15803d',
    label: 'Use real location',
    description:
      'Search by address or paste coordinates to extract the exact venue boundary from satellite imagery.',
  },
];

const ILLUSTRATIONS: React.FC<IllustrationProps>[] = [
  DrawFromScratchIllustration,
  ImportFloorPlanIllustration,
  UseRealLocationIllustration,
];

// ---------------------------------------------------------------------------
// Modal component
// ---------------------------------------------------------------------------
interface NewLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (flow: LayoutFlow) => void;
}

export const NewLayoutModal: React.FC<NewLayoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selected, setSelected] = useState<LayoutFlow | null>(null);
  const [hoveredCard, setHoveredCard] = useState<LayoutFlow | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleId = 'new-layout-modal-title';

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) setSelected(null);
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const modal = modalRef.current;
    if (!modal) return;

    const getFocusable = () =>
      Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    // Focus the first card on open
    setTimeout(() => getFocusable()[0]?.focus(), 50);

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Arrow key navigation within the radiogroup
  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      const flows = ['scratch', 'import', 'location'] as const;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (idx + 1) % flows.length;
        setSelected(flows[next] as LayoutFlow);
        cardRefs.current[next]?.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (idx - 1 + flows.length) % flows.length;
        setSelected(flows[prev] as LayoutFlow);
        cardRefs.current[prev]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSelected(flows[idx] as LayoutFlow);
      }
    },
    []
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 20100,
          animation: 'modalFadeIn 0.2s ease-out',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal — uses fadeInScale which includes translate(-50%,-50%) */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          width: 'min(780px, calc(100vw - 48px))',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow:
            '0 8px 30px rgba(15, 23, 42, 0.18), 0 1px 3px rgba(15, 23, 42, 0.06)',
          zIndex: 20101,
          padding: '32px',
          animation: 'fadeInScale 0.2s ease-out both',
          boxSizing: 'border-box',
        }}
      >
        {/* Close button */}
        <button
          aria-label="Close modal"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: 'white',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px', paddingRight: '40px' }}>
          <h2
            id={titleId}
            style={{
              fontSize: '22px',
              fontWeight: '600',
              color: '#111827',
              margin: 0,
              marginBottom: '6px',
              lineHeight: '1.3',
            }}
          >
            How would you like to start?
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: '#64748b',
              margin: 0,
              lineHeight: '1.5',
            }}
          >
            Choose your canvas origin — you can always combine layers later.
          </p>
        </div>

        {/* Cards */}
        <div
          role="radiogroup"
          aria-label="Layout starting option"
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '28px',
            flexWrap: 'wrap',
          }}
        >
          {CARDS.map((card, idx) => {
            const isSelected = selected === card.id;
            const isHovered = hoveredCard === card.id;
            const IllustrationComponent = ILLUSTRATIONS[idx] as React.FC<IllustrationProps>;
            // Roving tabindex: selected card (or first if none) is in tab order
            const tabIdx =
              isSelected || (selected === null && idx === 0) ? 0 : -1;

            return (
              <div
                key={card.id}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                role="radio"
                aria-checked={isSelected}
                tabIndex={tabIdx}
                onClick={() => setSelected(card.id)}
                onKeyDown={(e) => handleCardKeyDown(e, idx)}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  position: 'relative',
                  flex: '1 1 180px',
                  minWidth: 0,
                  padding: '20px',
                  borderRadius: '12px',
                  border: isSelected
                    ? '2px solid #3b82f6'
                    : isHovered
                    ? '2px solid #cbd5e1'
                    : '2px solid #e2e8f0',
                  background: isSelected ? 'rgba(59, 130, 246, 0.04)' : '#ffffff',
                  cursor: 'pointer',
                  transition:
                    'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
                  transform: isHovered && !isSelected ? 'translateY(-2px)' : 'none',
                  boxShadow: isHovered
                    ? '0 4px 12px rgba(15, 23, 42, 0.08)'
                    : '0 1px 3px rgba(15, 23, 42, 0.04)',
                  outline: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  userSelect: 'none',
                  boxSizing: 'border-box',
                }}
              >
                {/* Tag */}
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: card.tagBg,
                    color: card.tagColor,
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '0.01em',
                    alignSelf: 'flex-start',
                    flexShrink: 0,
                  }}
                >
                  {card.tag}
                </span>

                {/* Illustration */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '80px',
                    flexShrink: 0,
                  }}
                >
                  <IllustrationComponent active={isSelected || isHovered} />
                </div>

                {/* Label */}
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#111827',
                    lineHeight: '1.3',
                  }}
                >
                  {card.label}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: '13px',
                    color: '#64748b',
                    lineHeight: '1.55',
                    flex: 1,
                  }}
                >
                  {card.description}
                </div>

                {/* Radio indicator */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #3b82f6' : '2px solid #cbd5e1',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              height: '40px',
              padding: '0 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748b';
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selected) onConfirm(selected);
            }}
            disabled={!selected}
            style={{
              height: '40px',
              padding: '0 24px',
              borderRadius: '8px',
              border: 'none',
              background: selected ? '#111827' : '#e2e8f0',
              color: selected ? '#ffffff' : '#94a3b8',
              fontSize: '14px',
              fontWeight: '500',
              cursor: selected ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s ease, color 0.15s ease',
              letterSpacing: '0.01em',
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    </>
  );
};

export default NewLayoutModal;
