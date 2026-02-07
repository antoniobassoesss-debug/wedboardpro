/**
 * Rotate Button Component
 *
 * Floating action button for rotating elements 90 degrees.
 * Appears on double-click of canvas elements.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface RotateButtonProps {
  x: number;
  y: number;
  onRotate: () => void;
  onClose: () => void;
  elementSize: { width: number; height: number };
}

const BUTTON_SIZE = 36;
const ARROW_OFFSET = 12;

export const RotateButton: React.FC<RotateButtonProps> = ({
  x,
  y,
  onRotate,
  onClose,
  elementSize,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const buttonRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();

  const handleClick = useCallback((e: React.MouseEvent) => {
    console.log('[RotateButton] Button clicked!');
    e.stopPropagation();

    setIsRotating(true);
    setRotation((prev) => prev + 90);

    setTimeout(() => {
      console.log('[RotateButton] Calling onRotate callback');
      onRotate();
      setIsRotating(false);
      setRotation(0);
    }, 200);
  }, [onRotate]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setIsVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    animationTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 1500);
  }, []);

  useEffect(() => {
    if (isVisible) {
      console.log('[RotateButton] Button visible at position:', { x, y });
    }
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [isVisible, x, y]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${isRotating ? 0.8 : isVisible ? 1 : 0.8})`,
    opacity: isVisible ? 1 : 0,
    transition: isRotating
      ? 'transform 200ms ease-in-out'
      : 'transform 200ms ease, opacity 200ms ease',
    cursor: 'pointer',
    zIndex: 1000,
    pointerEvents: isVisible ? 'auto' : 'none',
  };

  const glowStyle: React.CSSProperties = {
    position: 'absolute',
    inset: -4,
    background: `radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0) 70%)`,
    borderRadius: '50%',
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 200ms ease',
  };

  const buttonContent = (
    <div
      ref={buttonRef}
      style={positionStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="rotate-button"
    >
      <div style={glowStyle} />

      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: isHovered
            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
            : 'white',
          border: '2px solid #e5e7eb',
          boxShadow: isHovered
            ? '0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 6px rgba(0, 0, 0, 0.1)'
            : '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 200ms ease',
          transform: isRotating ? 'rotate(90deg)' : 'rotate(0deg)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isHovered ? 'white' : '#6b7280'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: 'rotate(-45deg)',
            transition: 'stroke 200ms ease',
          }}
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </div>

      {isHovered && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '4px 10px',
            background: '#1f2937',
            color: 'white',
            fontSize: '11px',
            fontWeight: 500,
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          Rotate 90°
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(buttonContent, document.body);
};

export default RotateButton;
