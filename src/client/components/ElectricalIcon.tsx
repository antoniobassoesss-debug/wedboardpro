/**
 * ElectricalIcon - Clickable lightning bolt icon for power points.
 * 20x20px SVG, amber-500 color, hover: scale 1.1 + glow.
 */
import React from 'react';
import { motion } from 'framer-motion';

interface ElectricalIconProps {
  x: number;
  y: number;
  onClick?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  size?: number;
}

const ElectricalIcon: React.FC<ElectricalIconProps> = ({
  x,
  y,
  onClick,
  isSelected = false,
  size = 20,
}) => {
  return (
    <motion.g
      transform={`translate(${x - size / 2}, ${y - size / 2})`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      initial={{ scale: 1 }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow effect background */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 + 4}
        fill="none"
        stroke={isSelected ? '#f59e0b' : 'transparent'}
        strokeWidth={2}
        initial={{ opacity: 0 }}
        animate={{ opacity: isSelected ? 0.6 : 0 }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2}
        fill="rgba(245, 158, 11, 0.15)"
        stroke="#f59e0b"
        strokeWidth={1.5}
      />
      
      {/* Lightning bolt SVG */}
      <svg
        x={size * 0.2}
        y={size * 0.15}
        width={size * 0.6}
        height={size * 0.7}
        viewBox="0 0 24 24"
        fill="none"
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
      
      {/* Subtle inner glow */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={size / 3}
        fill="rgba(251, 191, 36, 0.3)"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.g>
  );
};

export default ElectricalIcon;

