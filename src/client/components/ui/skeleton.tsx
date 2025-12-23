/**
 * shadcn/ui Skeleton component
 * A loading placeholder with shimmer animation
 */
import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  className = '',
  style = {},
}) => {
  return (
    <div
      className={className}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.06) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite ease-in-out',
        ...style,
      }}
    />
  );
};

// Inject keyframes into document head
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-shimmer-keyframes';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '' }) => (
  <div
    className={className}
    style={{
      padding: '20px',
      borderRadius: '16px',
      background: 'rgba(0,0,0,0.02)',
      border: '1px solid rgba(0,0,0,0.06)',
    }}
  >
    <Skeleton width="60%" height={18} style={{ marginBottom: '12px' }} />
    <Skeleton width="40%" height={14} style={{ marginBottom: '20px' }} />
    <Skeleton width="100%" height={8} borderRadius={4} style={{ marginBottom: '12px' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Skeleton width="30%" height={14} />
      <Skeleton width="20%" height={14} />
    </div>
  </div>
);

export default Skeleton;

