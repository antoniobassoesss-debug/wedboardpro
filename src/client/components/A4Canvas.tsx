import React, { useMemo } from 'react';

export interface A4Dimensions {
  a4X: number;
  a4Y: number;
  a4WidthPx: number;
  a4HeightPx: number;
}

export interface A4CanvasProps {
  dimensions: A4Dimensions;
  className?: string;
}

const A4_ASPECT_RATIO = 297 / 210;

export function calculateA4Dimensions(screenWidth: number, screenHeight: number): A4Dimensions {
  const targetWidth = screenWidth * 0.75;
  const targetHeight = screenHeight * 0.75;
  
  let a4WidthPx: number;
  let a4HeightPx: number;
  
  if (targetWidth / targetHeight > A4_ASPECT_RATIO) {
    a4HeightPx = targetHeight;
    a4WidthPx = a4HeightPx * A4_ASPECT_RATIO;
  } else {
    a4WidthPx = targetWidth;
    a4HeightPx = a4WidthPx / A4_ASPECT_RATIO;
  }
  
  return {
    a4X: -a4WidthPx / 2,
    a4Y: -a4HeightPx / 2,
    a4WidthPx,
    a4HeightPx,
  };
}

export function getInitialA4Dimensions(): A4Dimensions {
  if (typeof window === 'undefined') {
    return {
      a4X: 0,
      a4Y: 0,
      a4WidthPx: 800,
      a4HeightPx: 600,
    };
  }
  return calculateA4Dimensions(window.innerWidth, window.innerHeight);
}

const A4Canvas: React.FC<A4CanvasProps> = React.memo(({ dimensions, className }) => {
  const { a4WidthPx, a4HeightPx } = dimensions;

  const styles = useMemo(() => ({
    container: {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${a4WidthPx}px`,
      height: `${a4HeightPx}px`,
      background: '#ffffff',
      border: '2px solid #cccccc',
      borderRadius: '4px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      pointerEvents: 'none' as const,
      zIndex: 1,
    },
    svg: {
      display: 'block' as const,
      width: '100%',
      height: '100%',
    },
  }), [a4WidthPx, a4HeightPx]);

  return (
    <div className={className} style={styles.container} data-a4-canvas="true">
      <svg style={styles.svg}>
        <rect x="0" y="0" width="100%" height="100%" fill="white" />
      </svg>
    </div>
  );
});

A4Canvas.displayName = 'A4Canvas';

export default A4Canvas;
