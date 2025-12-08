import React from 'react';

const InfiniteGridBackground: React.FC = () => {
  const gridSize = 20;
  const majorGridSize = 100;

  // Create SVG pattern for the grid
  const gridPattern = `
    <defs>
      <pattern id="grid-pattern" x="0" y="0" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
        <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="#d0d0d0" stroke-width="0.5"/>
      </pattern>
      <pattern id="major-grid-pattern" x="0" y="0" width="${majorGridSize}" height="${majorGridSize}" patternUnits="userSpaceOnUse">
        <path d="M ${majorGridSize} 0 L 0 0 0 ${majorGridSize}" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-pattern)"/>
    <rect width="100%" height="100%" fill="url(#major-grid-pattern)"/>
  `;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#e5e5e5',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        dangerouslySetInnerHTML={{ __html: gridPattern }}
      />
      {/* Alternative CSS-based grid (more performant) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
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
        }}
      />
    </div>
  );
};

export default InfiniteGridBackground;
