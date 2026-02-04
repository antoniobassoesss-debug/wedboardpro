import React from 'react';

interface ElectricalIconProps {
  x: number;
  y: number;
  onClick?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  size?: number;
}

const ElectricalIcon = React.memo<ElectricalIconProps>(({
  x,
  y,
  onClick,
  isSelected = false,
  size = 20,
}) => {
  return (
    <g
      onClick={onClick}
      style={{
        cursor: 'pointer',
        transform: `translate(${x - size / 2}px, ${y - size / 2}px)`,
      }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2}
        fill="rgba(245, 158, 11, 0.15)"
        stroke="#f59e0b"
        strokeWidth={isSelected ? 2 : 1.5}
      />
      <svg
        x={size * 0.2}
        y={size * 0.15}
        width={size * 0.6}
        height={size * 0.7}
        viewBox="0 0 24 24"
        style={{ overflow: 'visible' }}
      >
        <path
          d="M13 2L4.09 12.69C3.71 13.14 3.47 13.5 3.47 13.88C3.47 14.54 4.01 15 4.67 15H10L9 22L17.91 11.31C18.29 10.86 18.53 10.5 18.53 10.12C18.53 9.46 17.99 9 17.33 9H12L13 2Z"
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth={0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {isSelected && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 + 4}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          style={{ opacity: 0.6 }}
        />
      )}
    </g>
  );
}, (prev, next) => {
  return prev.x === next.x && 
         prev.y === next.y && 
         prev.isSelected === next.isSelected &&
         prev.size === next.size &&
         prev.onClick === next.onClick;
});

ElectricalIcon.displayName = 'ElectricalIcon';

export default ElectricalIcon;
