/**
 * shadcn/ui Select component
 * A styled dropdown select using Radix-like patterns
 */
import React, { useState, useRef, useEffect } from 'react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid rgba(0,0,0,0.1)',
          background: disabled ? 'rgba(0,0,0,0.02)' : 'white',
          fontSize: '14px',
          color: disabled ? '#9ca3af' : '#1f2937',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          outline: 'none',
        }}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'white',
            borderRadius: '10px',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            zIndex: 50,
            maxHeight: '200px',
            overflow: 'auto',
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                if (!option.disabled) {
                  onValueChange(option.value);
                  setIsOpen(false);
                }
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                textAlign: 'left',
                border: 'none',
                background: value === option.value ? 'rgba(245,158,11,0.1)' : 'transparent',
                color: option.disabled ? '#9ca3af' : '#1f2937',
                fontSize: '14px',
                cursor: option.disabled ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!option.disabled && value !== option.value) {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  value === option.value ? 'rgba(245,158,11,0.1)' : 'transparent';
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Select;

