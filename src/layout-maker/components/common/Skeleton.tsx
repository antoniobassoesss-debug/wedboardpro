/**
 * Skeleton Component
 *
 * Loading placeholder with animated shimmer effect.
 */

import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width = '100%',
  height = '1rem',
  radius,
  className = '',
  animate = true,
}) => {
  const baseClasses = 'bg-gray-200';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    card: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: radius ? (typeof radius === 'number' ? `${radius}px` : radius) : undefined,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animate ? 'animate-pulse' : ''} ${className}`}
      style={style}
    />
  );
};

interface SkeletonCardProps {
  title?: boolean;
  description?: boolean;
  image?: boolean;
  action?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  title = true,
  description = true,
  image = true,
  action = true,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm border ${className}`}>
      {image && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height={160}
          className="mb-4"
        />
      )}
      {title && (
        <Skeleton width="70%" height={20} className="mb-2" />
      )}
      {description && (
        <div className="space-y-2">
          <Skeleton width="100%" height={14} />
          <Skeleton width="85%" height={14} />
        </div>
      )}
      {action && (
        <div className="mt-4 flex gap-2">
          <Skeleton width={80} height={36} variant="rectangular" />
          <Skeleton width={80} height={36} variant="rectangular" />
        </div>
      )}
    </div>
  );
};

interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
  className?: string;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  itemHeight = 60,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton width="60%" height={16} className="mb-2" />
            <Skeleton width="40%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({
  rows = 5,
  columns = 4,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={`${100 / columns}%`} height={40} variant="rectangular" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} width={`${100 / columns}%`} height={32} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
