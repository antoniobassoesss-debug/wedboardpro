/**
 * Element Card Component (Grid Layout)
 *
 * Line-only SVG thumbnail with element name.
 * Used in ElementCategory grid layout.
 */

import React from 'react';
import type { ElementType } from '../../types/elements';
import { ELEMENT_DEFAULTS } from '../../constants';

interface ElementCardProps {
  type: ElementType;
  onClick: () => void;
  onDoubleClick?: () => void;
}

export const ElementCard: React.FC<ElementCardProps> = ({
  type,
  onClick,
  onDoubleClick,
}) => {
  const defaults = ELEMENT_DEFAULTS[type as keyof typeof ELEMENT_DEFAULTS];
  const label = defaults?.label || type;
  const iconSize = 40;

  const renderIcon = () => {
    switch (type) {
      case 'table-round':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="24" y1="8" x2="24" y2="40" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="8" y1="24" x2="40" y2="24" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'table-rectangular':
      case 'table-square':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="6" y="12" width="36" height="24" rx="3" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="6" y1="24" x2="42" y2="24" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'table-oval':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <ellipse cx="24" cy="24" rx="20" ry="12" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="4" y1="24" x2="44" y2="24" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'chair':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="10" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="24" y1="14" x2="24" y2="34" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );

      // ── Individual Seat Types ─────────────────────────────────────────────
      case 'seat-standard':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Seat */}
            <rect x="12" y="22" width="24" height="16" rx="3" stroke="#1a1a1a" strokeWidth="2" />
            {/* Back */}
            <rect x="12" y="12" width="24" height="12" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* Legs */}
            <line x1="16" y1="38" x2="16" y2="44" stroke="#1a1a1a" strokeWidth="1.5" />
            <line x1="32" y1="38" x2="32" y2="44" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'seat-armchair':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Seat */}
            <rect x="10" y="22" width="28" height="14" rx="3" stroke="#1a1a1a" strokeWidth="2" />
            {/* Back */}
            <rect x="10" y="12" width="28" height="12" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* Armrests */}
            <rect x="4" y="20" width="8" height="16" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="36" y="20" width="8" height="16" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'seat-chaise':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Long chaise body */}
            <rect x="4" y="20" width="36" height="14" rx="3" stroke="#1a1a1a" strokeWidth="2" />
            {/* Head/back end */}
            <rect x="38" y="12" width="6" height="22" rx="2" stroke="#1a1a1a" strokeWidth="2" />
          </svg>
        );
      case 'seat-sofa':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Back */}
            <rect x="4" y="14" width="40" height="10" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* Armrests */}
            <rect x="4" y="24" width="6" height="14" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="38" y="24" width="6" height="14" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Seat cushions */}
            <rect x="10" y="24" width="13" height="14" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="25" y="24" width="13" height="14" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'seat-sofa-2':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Back */}
            <rect x="6" y="14" width="36" height="12" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* 2 seat cushions */}
            <rect x="6" y="26" width="16" height="12" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <rect x="26" y="26" width="16" height="12" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* Armrests */}
            <line x1="6" y1="14" x2="6" y2="38" stroke="#1a1a1a" strokeWidth="1.5" />
            <line x1="42" y1="14" x2="42" y2="38" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'seat-sofa-3':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Back */}
            <rect x="4" y="14" width="40" height="12" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* 3 seat cushions */}
            <rect x="4" y="26" width="11" height="12" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="18.5" y="26" width="11" height="12" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="33" y="26" width="11" height="12" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'seat-bench':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Bench top */}
            <rect x="4" y="20" width="40" height="10" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* Legs */}
            <line x1="12" y1="30" x2="12" y2="42" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="36" y1="30" x2="36" y2="42" stroke="#1a1a1a" strokeWidth="2" />
            {/* Cross brace */}
            <line x1="12" y1="38" x2="36" y2="38" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'seat-barstool':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Circular seat */}
            <circle cx="24" cy="16" r="12" stroke="#1a1a1a" strokeWidth="2" />
            {/* Stool post */}
            <line x1="24" y1="28" x2="24" y2="42" stroke="#1a1a1a" strokeWidth="2" />
            {/* Footrest */}
            <line x1="16" y1="36" x2="32" y2="36" stroke="#1a1a1a" strokeWidth="2" />
          </svg>
        );
      case 'seat-throne':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Seat */}
            <rect x="10" y="24" width="28" height="14" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* High decorative back */}
            <rect x="10" y="8" width="28" height="18" rx="3" stroke="#1a1a1a" strokeWidth="2" />
            {/* Crown detail */}
            <path d="M14 8 L14 4 L19 7 L24 4 L29 7 L34 4 L34 8" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Armrests */}
            <rect x="4" y="22" width="8" height="16" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="36" y="22" width="8" height="16" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );

      // ── Ceremony Seating Block ────────────────────────────────────────────
      case 'ceremony-block':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Left section rows */}
            {[8, 16, 24, 32].map((y) => (
              [4, 10, 16].map((x) => (
                <rect key={`l-${y}-${x}`} x={x} y={y} width="4" height="4" rx="1" stroke="#1a1a1a" strokeWidth="1" />
              ))
            ))}
            {/* Aisle gap */}
            {/* Right section rows */}
            {[8, 16, 24, 32].map((y) => (
              [28, 34, 40].map((x) => (
                <rect key={`r-${y}-${x}`} x={x} y={y} width="4" height="4" rx="1" stroke="#1a1a1a" strokeWidth="1" />
              ))
            ))}
            {/* Altar area */}
            <path d="M16 42 L24 38 L32 42" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
          </svg>
        );
      case 'altar':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Altar body */}
            <rect x="8" y="18" width="32" height="20" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* Semicircular front */}
            <path d="M8 38 Q24 48 40 38" stroke="#1a1a1a" strokeWidth="2" fill="none" />
            {/* Cross on top */}
            <line x1="24" y1="6" x2="24" y2="18" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="18" y1="10" x2="30" y2="10" stroke="#1a1a1a" strokeWidth="2" />
          </svg>
        );
      case 'pathway':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Pathway rectangle */}
            <rect x="18" y="4" width="12" height="40" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* Dashed center line */}
            <line x1="24" y1="8" x2="24" y2="40" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4,3" />
          </svg>
        );
      case 'dance-floor':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="4" y="4" width="40" height="40" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="4" y1="24" x2="44" y2="24" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4,2" />
          </svg>
        );
      case 'stage':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="4" y="8" width="40" height="32" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="4" y1="16" x2="44" y2="16" stroke="#1a1a1a" strokeWidth="1" />
            <path d="M18 8 L18 4 L24 8 L30 4 L30 8" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'cocktail-area':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="#1a1a1a" strokeWidth="2" />
            <circle cx="16" cy="20" r="4" stroke="#1a1a1a" strokeWidth="1.5" />
            <circle cx="32" cy="20" r="4" stroke="#1a1a1a" strokeWidth="1.5" />
            <circle cx="24" cy="32" r="4" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'ceremony-area':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="8" y="12" width="32" height="24" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M16 12 L24 4 L32 12" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="14" y1="30" x2="34" y2="30" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'bar':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="4" y="16" width="40" height="24" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="4" y1="24" x2="44" y2="24" stroke="#1a1a1a" strokeWidth="1.5" />
            <line x1="20" y1="16" x2="20" y2="40" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'cocktail':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="16" stroke="#1a1a1a" strokeWidth="2" />
            <circle cx="24" cy="24" r="10" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="3,2" />
            {[0,60,120,180,240,300].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const x = 24 + 16 * Math.cos(rad);
              const y = 24 + 16 * Math.sin(rad);
              return <circle key={i} cx={x} cy={y} r="2.5" fill="#1a1a1a" />;
            })}
          </svg>
        );
      case 'buffet':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="4" y="12" width="40" height="24" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="24" y1="12" x2="24" y2="36" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="4" y1="20" x2="44" y2="20" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'cake-table':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="12" y="18" width="24" height="20" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M16 18 L24 10 L32 18" stroke="#1a1a1a" strokeWidth="2" fill="none" />
          </svg>
        );
      case 'gift-table':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="12" y="16" width="24" height="22" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M24 6 L24 42" stroke="#1a1a1a" strokeWidth="1.5" />
            <path d="M12 16 L36 32" stroke="#1a1a1a" strokeWidth="1" />
            <path d="M36 16 L12 32" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'dj-booth':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="10" y="8" width="28" height="32" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <circle cx="24" cy="28" r="6" stroke="#1a1a1a" strokeWidth="1.5" />
            <circle cx="24" cy="28" r="2" fill="#1a1a1a" />
          </svg>
        );
      case 'flower-arrangement':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <ellipse cx="24" cy="30" rx="8" ry="4" stroke="#1a1a1a" strokeWidth="1.5" />
            <path d="M24 30 Q20 20 24 12 Q28 20 24 30" stroke="#1a1a1a" strokeWidth="1.5" />
            <path d="M24 30 Q16 22 14 14" stroke="#1a1a1a" strokeWidth="1" />
            <path d="M24 30 Q32 22 34 14" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'arch':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <path d="M12 44 L12 20 Q12 8 24 8 Q36 8 36 20 L36 44" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="8" y1="44" x2="40" y2="44" stroke="#1a1a1a" strokeWidth="2" />
          </svg>
        );
      case 'photo-booth':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="8" y="12" width="32" height="28" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <rect x="12" y="16" width="10" height="10" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="26" y="16" width="10" height="10" stroke="#1a1a1a" strokeWidth="1.5" />
            <rect x="12" y="30" width="24" height="6" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'custom':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="8" y="10" width="32" height="28" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="8" y1="10" x2="40" y2="38" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4,2" />
            <line x1="40" y1="10" x2="8" y2="38" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="4,2" />
          </svg>
        );

      // ── Lighting — anchor-based string decorations ───────────────────
      case 'string-lights':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Wire with natural catenary sag */}
            <path d="M4 16 Q24 24 44 16" stroke="#3d2b1f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Bulbs: socket + globe + glow */}
            <rect x="8.5" y="14" width="3" height="3" rx="0.8" fill="#555" />
            <circle cx="10" cy="20" r="4.5" fill="#fff9e6" opacity="0.3" />
            <circle cx="10" cy="20" r="3" fill="#fff3b0" stroke="#f59e0b" strokeWidth="0.8" />
            <circle cx="10" cy="20" r="1" fill="#fbbf24" />

            <rect x="22.5" y="19" width="3" height="3" rx="0.8" fill="#555" />
            <circle cx="24" cy="25" r="4.5" fill="#fff9e6" opacity="0.3" />
            <circle cx="24" cy="25" r="3" fill="#fff3b0" stroke="#f59e0b" strokeWidth="0.8" />
            <circle cx="24" cy="25" r="1" fill="#fbbf24" />

            <rect x="36.5" y="14" width="3" height="3" rx="0.8" fill="#555" />
            <circle cx="38" cy="20" r="4.5" fill="#fff9e6" opacity="0.3" />
            <circle cx="38" cy="20" r="3" fill="#fff3b0" stroke="#f59e0b" strokeWidth="0.8" />
            <circle cx="38" cy="20" r="1" fill="#fbbf24" />

            {/* Anchor points */}
            <circle cx="4" cy="16" r="2.5" fill="white" stroke="#3d2b1f" strokeWidth="1" />
            <circle cx="44" cy="16" r="2.5" fill="white" stroke="#3d2b1f" strokeWidth="1" />
          </svg>
        );
      case 'bunting':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Wire with natural catenary sag */}
            <path d="M4 14 Q24 22 44 14" stroke="#c8b9a2" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Flag 1 — red */}
            <path d="M10 15 L7 28 L13 28 Z" fill="#dc2626" stroke="#b91c1c" strokeWidth="0.6" />
            {/* Flag 2 — yellow */}
            <path d="M21 18 L18 31 L24 31 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="0.6" />
            {/* Flag 3 — green */}
            <path d="M32 18 L29 31 L35 31 Z" fill="#16a34a" stroke="#15803d" strokeWidth="0.6" />
            {/* Flag 4 — red */}
            <path d="M41 15 L38 28 L44 28 Z" fill="#dc2626" stroke="#b91c1c" strokeWidth="0.6" />
            {/* Anchor points */}
            <circle cx="4" cy="14" r="2.5" fill="white" stroke="#c8b9a2" strokeWidth="1" />
            <circle cx="44" cy="14" r="2.5" fill="white" stroke="#c8b9a2" strokeWidth="1" />
          </svg>
        );

      // ── Audio Visual ─────────────────────────────────────────────────────
      case 'av-mixing-desk':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Desk body */}
            <rect x="4" y="14" width="40" height="24" rx="3" stroke="#1a1a1a" strokeWidth="2" />
            {/* Faders */}
            <line x1="12" y1="18" x2="12" y2="34" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="20" y1="18" x2="20" y2="34" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="28" y1="18" x2="28" y2="34" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="36" y1="18" x2="36" y2="34" stroke="#1a1a1a" strokeWidth="1" />
            <rect x="10" y="22" width="4" height="3" rx="0.5" stroke="#1a1a1a" strokeWidth="1.2" fill="none" />
            <rect x="18" y="26" width="4" height="3" rx="0.5" stroke="#1a1a1a" strokeWidth="1.2" fill="none" />
            <rect x="26" y="20" width="4" height="3" rx="0.5" stroke="#1a1a1a" strokeWidth="1.2" fill="none" />
            <rect x="34" y="24" width="4" height="3" rx="0.5" stroke="#1a1a1a" strokeWidth="1.2" fill="none" />
          </svg>
        );
      case 'av-speaker':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Cabinet */}
            <rect x="14" y="6" width="20" height="36" rx="3" stroke="#1a1a1a" strokeWidth="2" />
            {/* Woofer */}
            <circle cx="24" cy="26" r="8" stroke="#1a1a1a" strokeWidth="1.5" />
            <circle cx="24" cy="26" r="3" stroke="#1a1a1a" strokeWidth="1" />
            {/* Tweeter */}
            <circle cx="24" cy="13" r="3" stroke="#1a1a1a" strokeWidth="1.5" />
          </svg>
        );
      case 'av-subwoofer':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Cabinet — wider/squatter than speaker */}
            <rect x="6" y="10" width="36" height="28" rx="3" stroke="#1a1a1a" strokeWidth="2" />
            {/* Large driver */}
            <circle cx="24" cy="24" r="11" stroke="#1a1a1a" strokeWidth="1.5" />
            <circle cx="24" cy="24" r="4" stroke="#1a1a1a" strokeWidth="1" />
            {/* Port */}
            <rect x="10" y="35" width="6" height="2" rx="0.5" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'av-truss':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Horizontal rails */}
            <line x1="4" y1="16" x2="44" y2="16" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="4" y1="32" x2="44" y2="32" stroke="#1a1a1a" strokeWidth="2" />
            {/* Cross members */}
            <line x1="4" y1="16" x2="4" y2="32" stroke="#1a1a1a" strokeWidth="1.5" />
            <line x1="44" y1="16" x2="44" y2="32" stroke="#1a1a1a" strokeWidth="1.5" />
            <line x1="12" y1="16" x2="20" y2="32" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="20" y1="16" x2="12" y2="32" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="24" y1="16" x2="32" y2="32" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="32" y1="16" x2="24" y2="32" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="36" y1="16" x2="44" y2="32" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="44" y1="16" x2="36" y2="32" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'av-moving-head':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Yoke */}
            <path d="M14 14 Q14 8 24 8 Q34 8 34 14" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
            <line x1="14" y1="14" x2="14" y2="28" stroke="#1a1a1a" strokeWidth="1.5" />
            <line x1="34" y1="14" x2="34" y2="28" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Head body */}
            <ellipse cx="24" cy="28" rx="10" ry="8" stroke="#1a1a1a" strokeWidth="2" />
            {/* Lens */}
            <circle cx="24" cy="28" r="4" stroke="#1a1a1a" strokeWidth="1.2" />
            {/* Beam */}
            <line x1="21" y1="36" x2="18" y2="44" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="27" y1="36" x2="30" y2="44" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
        );
      case 'av-led-wall':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Outer frame */}
            <rect x="4" y="10" width="40" height="28" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* Pixel grid */}
            <line x1="17" y1="10" x2="17" y2="38" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="31" y1="10" x2="31" y2="38" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="4" y1="19" x2="44" y2="19" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="4" y1="29" x2="44" y2="29" stroke="#1a1a1a" strokeWidth="0.8" />
          </svg>
        );
      case 'av-screen':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Screen surface */}
            <rect x="4" y="12" width="40" height="26" rx="1" stroke="#1a1a1a" strokeWidth="2" />
            {/* Stand */}
            <line x1="24" y1="38" x2="24" y2="44" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="16" y1="44" x2="32" y2="44" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Screen lines suggesting projection */}
            <line x1="10" y1="17" x2="38" y2="17" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="10" y1="22" x2="38" y2="22" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="10" y1="27" x2="38" y2="27" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="10" y1="32" x2="38" y2="32" stroke="#1a1a1a" strokeWidth="0.8" />
          </svg>
        );
      case 'av-projector':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Body */}
            <rect x="8" y="16" width="26" height="16" rx="3" stroke="#1a1a1a" strokeWidth="2" />
            {/* Lens */}
            <circle cx="38" cy="24" r="5" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Vent slits */}
            <line x1="12" y1="20" x2="12" y2="28" stroke="#1a1a1a" strokeWidth="0.8" />
            <line x1="16" y1="20" x2="16" y2="28" stroke="#1a1a1a" strokeWidth="0.8" />
            {/* Beam */}
            <line x1="43" y1="20" x2="48" y2="14" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="43" y1="28" x2="48" y2="34" stroke="#1a1a1a" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
        );
      case 'av-light-console':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Slanted desk top */}
            <path d="M4 36 L6 14 L42 14 L44 36 Z" stroke="#1a1a1a" strokeWidth="2" fill="none" />
            {/* Screen area */}
            <rect x="12" y="17" width="24" height="10" rx="1" stroke="#1a1a1a" strokeWidth="1.2" />
            {/* Buttons row */}
            <circle cx="12" cy="31" r="1.5" stroke="#1a1a1a" strokeWidth="1" />
            <circle cx="18" cy="31" r="1.5" stroke="#1a1a1a" strokeWidth="1" />
            <circle cx="24" cy="31" r="1.5" stroke="#1a1a1a" strokeWidth="1" />
            <circle cx="30" cy="31" r="1.5" stroke="#1a1a1a" strokeWidth="1" />
            <circle cx="36" cy="31" r="1.5" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
      case 'av-preset-full-stage':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            {/* Stage platform */}
            <rect x="4" y="30" width="40" height="10" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            {/* Truss bar */}
            <line x1="4" y1="12" x2="44" y2="12" stroke="#1a1a1a" strokeWidth="2" />
            {/* Truss supports */}
            <line x1="8" y1="12" x2="8" y2="30" stroke="#1a1a1a" strokeWidth="1" />
            <line x1="40" y1="12" x2="40" y2="30" stroke="#1a1a1a" strokeWidth="1" />
            {/* Lights on truss */}
            <circle cx="16" cy="12" r="3" stroke="#1a1a1a" strokeWidth="1.2" />
            <circle cx="24" cy="12" r="3" stroke="#1a1a1a" strokeWidth="1.2" />
            <circle cx="32" cy="12" r="3" stroke="#1a1a1a" strokeWidth="1.2" />
            {/* Screen at back */}
            <rect x="12" y="16" width="24" height="12" rx="1" stroke="#1a1a1a" strokeWidth="1.2" />
            {/* Plus badge for "preset" */}
            <circle cx="42" cy="8" r="5" fill="white" stroke="#1a1a1a" strokeWidth="1.2" />
            <line x1="42" y1="5" x2="42" y2="11" stroke="#1a1a1a" strokeWidth="1.2" />
            <line x1="39" y1="8" x2="45" y2="8" stroke="#1a1a1a" strokeWidth="1.2" />
          </svg>
        );

      default:
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
            <rect x="12" y="12" width="24" height="24" rx="2" stroke="#1a1a1a" strokeWidth="2" />
            <line x1="12" y1="24" x2="36" y2="24" stroke="#1a1a1a" strokeWidth="1" />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        width: '100%',
        aspectRatio: '1',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#3b82f6';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = 'none';
      }}
      title={`Add ${label}`}
    >
      {renderIcon()}
      <span style={{
        fontSize: '11px',
        fontWeight: 500,
        color: '#475569',
        marginTop: '4px',
        textAlign: 'center',
        lineHeight: 1.2,
      }}>
        {label}
      </span>
    </button>
  );
};

export default ElementCard;
