import React, { useMemo } from 'react';

const gridSize = 20;
const majorGridSize = 100;

const InfiniteGridBackground: React.FC = () => {
  const styles = useMemo(() => ({
    container: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 0,
      pointerEvents: 'none' as const,
      overflow: 'hidden',
      transform: 'translateZ(0)',
      willChange: 'transform',
    },
    grid: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#e5e5e5',
      backgroundImage: `
        linear-gradient(to right, #d0d0d0 0.5px, transparent 0.5px),
        linear-gradient(to bottom, #d0d0d0 0.5px, transparent 0.5px),
        linear-gradient(to right, #b0b0b0 1px, transparent 1px),
        linear-gradient(to bottom, #b0b0b0 1px, transparent 1px)
      `,
      backgroundSize: `
        ${gridSize}px ${gridSize}px,
        ${gridSize}px ${gridSize}px,
        ${majorGridSize}px ${majorGridSize}px,
        ${majorGridSize}px ${majorGridSize}px
      `,
      backgroundPosition: '0 0, 0 0, 0 0, 0 0',
      transform: 'translateZ(0)',
      willChange: 'background-image',
    },
  }), []);

  return (
    <div style={styles.container} data-grid-background="true">
      <div style={styles.grid} />
    </div>
  );
};

export default React.memo(InfiniteGridBackground);
