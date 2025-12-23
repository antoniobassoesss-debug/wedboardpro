/**
 * shadcn/ui Progress component
 * A styled progress bar with gradient support
 */
import React from 'react';

type ProgressVariant = 'default' | 'success' | 'warning' | 'destructive';

interface ProgressProps {
  value: number; // 0-100
  variant?: ProgressVariant;
  showLabel?: boolean;
  height?: number;
  className?: string;
}

const variantGradients: Record<ProgressVariant, string> = {
  default: 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)',
  success: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
  warning: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
  destructive: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  variant = 'default',
  showLabel = false,
  height = 8,
  className = '',
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={className} style={{ width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          borderRadius: '9999px',
          background: 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${clampedValue}%`,
            height: '100%',
            borderRadius: '9999px',
            background: variantGradients[variant],
            transition: 'width 0.3s ease, background 0.3s ease',
          }}
        />
      </div>
      {showLabel && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '12px',
            color: '#6b7280',
            textAlign: 'right',
          }}
        >
          {Math.round(clampedValue)}%
        </div>
      )}
    </div>
  );
};

export default Progress;

