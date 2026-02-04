/**
 * Scale Debug Info Component
 *
 * Displays current scale state for debugging purposes.
 * Only renders in development mode.
 */

import React from 'react';
import { useLayoutScale, useLayoutScaleOptional } from '../../contexts/LayoutScaleContext';

/**
 * Props for ScaleDebugInfo
 */
interface ScaleDebugInfoProps {
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Show even in production (not recommended) */
  forceShow?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Get position styles
 */
function getPositionStyles(position: ScaleDebugInfoProps['position']): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    zIndex: 9999,
  };

  switch (position) {
    case 'top-right':
      return { ...base, top: 8, right: 8 };
    case 'bottom-left':
      return { ...base, bottom: 8, left: 8 };
    case 'bottom-right':
      return { ...base, bottom: 8, right: 8 };
    case 'top-left':
    default:
      return { ...base, top: 8, left: 8 };
  }
}

/**
 * Scale Debug Info Component
 *
 * Displays real-time scale, zoom, and grid information.
 * Useful during development to verify the proportion system is working.
 */
export function ScaleDebugInfo({
  position = 'top-left',
  forceShow = false,
  className = '',
}: ScaleDebugInfoProps): JSX.Element | null {
  // Use optional hook to avoid throwing if outside provider
  const context = useLayoutScaleOptional();

  // Only show in development (unless forced)
  if (!forceShow && process.env.NODE_ENV !== 'development') {
    return null;
  }

  // If no context, show warning
  if (!context) {
    return (
      <div
        style={{
          ...getPositionStyles(position),
          backgroundColor: 'rgba(220, 38, 38, 0.9)',
          color: 'white',
          fontSize: 11,
          padding: '6px 10px',
          borderRadius: 4,
          fontFamily: 'monospace',
        }}
        className={className}
      >
        No LayoutScaleProvider
      </div>
    );
  }

  const { scale, spaceBounds, zoom, gridConfig, canvasSize } = context;

  return (
    <div
      style={{
        ...getPositionStyles(position),
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        fontSize: 11,
        padding: '8px 12px',
        borderRadius: 4,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: 1.6,
        minWidth: 180,
      }}
      className={className}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: '#60a5fa' }}>
        Scale Debug
      </div>

      <div>
        <span style={{ color: '#9ca3af' }}>Space: </span>
        {spaceBounds
          ? `${spaceBounds.width.toFixed(1)}m × ${spaceBounds.height.toFixed(1)}m`
          : 'null'}
      </div>

      <div>
        <span style={{ color: '#9ca3af' }}>Scale: </span>
        {scale ? `${scale.pixelsPerMeter.toFixed(2)} px/m` : 'null'}
      </div>

      <div>
        <span style={{ color: '#9ca3af' }}>Zoom: </span>
        {(zoom * 100).toFixed(0)}%
      </div>

      <div>
        <span style={{ color: '#9ca3af' }}>Canvas: </span>
        {canvasSize.width > 0
          ? `${canvasSize.width.toFixed(0)} × ${canvasSize.height.toFixed(0)}`
          : 'measuring...'}
      </div>

      <div>
        <span style={{ color: '#9ca3af' }}>Offset: </span>
        {scale
          ? `(${scale.offset.x.toFixed(1)}, ${scale.offset.y.toFixed(1)})`
          : 'null'}
      </div>

      <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #374151' }}>
        <span style={{ color: '#9ca3af' }}>Grid: </span>
        {(gridConfig.size * 100).toFixed(0)}cm
        <span style={{ marginLeft: 8 }}>
          {gridConfig.enabled ? '✓ snap' : '✗ snap'}
        </span>
        <span style={{ marginLeft: 8 }}>
          {gridConfig.visible ? '✓ show' : '✗ show'}
        </span>
      </div>
    </div>
  );
}

/**
 * Compact version of the debug info
 */
export function ScaleDebugInfoCompact({
  position = 'bottom-right',
  className = '',
}: Omit<ScaleDebugInfoProps, 'forceShow'>): JSX.Element | null {
  const context = useLayoutScaleOptional();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!context || !context.scale) {
    return null;
  }

  const { scale, zoom } = context;

  return (
    <div
      style={{
        ...getPositionStyles(position),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        fontSize: 10,
        padding: '4px 8px',
        borderRadius: 3,
        fontFamily: 'monospace',
      }}
      className={className}
    >
      {scale.pixelsPerMeter.toFixed(0)} px/m | {(zoom * 100).toFixed(0)}%
    </div>
  );
}

export default ScaleDebugInfo;
