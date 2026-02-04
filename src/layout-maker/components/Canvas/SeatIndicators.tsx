import React from 'react';
import type { SeatPosition, TableType } from '../../../types/layout-elements';

interface SeatIndicatorsProps {
  tableType: TableType;
  dimensions: { width: number; height: number };
  seatCount: number;
  seatPositions: SeatPosition[];
  chairOffset: number;
  pixelsPerMeter: number;
  isSelected?: boolean;
}

export function distributeSeatPositions(
  shape: TableType,
  dimensions: { width: number; height: number },
  count: number,
  offset: number = 0.1
): SeatPosition[] {
  const positions: SeatPosition[] = [];
  
  if (count === 0) return positions;

  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const radiusX = dimensions.width / 2 + offset;
  const radiusY = dimensions.height / 2 + offset;

  if (shape === 'table-round') {
    const radius = dimensions.width / 2 + offset;
    const angleStep = (2 * Math.PI) / count;
    
    for (let i = 0; i < count; i++) {
      const angle = angleStep * i - Math.PI / 2;
      positions.push({
        id: `seat-${i}`,
        localX: centerX + radius * Math.cos(angle),
        localY: centerY + radius * Math.sin(angle),
        angle: angle + Math.PI / 2,
      });
    }
  } else if (shape === 'table-rectangular') {
    const width = dimensions.width;
    const height = dimensions.height;
    const seatsPerSide = Math.ceil(count / 2);
    const sideCapacity = Math.floor(count / 2);
    
    const seatsLongSide = Math.min(seatsPerSide, Math.ceil(width / (offset * 2 + 0.4)));
    const seatsShortSide = Math.min(sideCapacity, Math.floor(height / (offset * 2 + 0.4)));
    
    let seatIndex = 0;
    
    for (let side = 0; side < 4 && seatIndex < count; side++) {
      const isLongSide = side % 2 === 0;
      const segmentLength = isLongSide ? width : height;
      const seatsOnThisSide = isLongSide ? seatsLongSide : seatsShortSide;
      
      for (let i = 0; i < seatsOnThisSide && seatIndex < count; i++) {
        const t = seatsOnThisSide > 1 ? i / (seatsOnThisSide - 1) : 0.5;
        const localT = isLongSide ? t : 1 - t;
        
        let x: number, y: number, angle: number;
        
        switch (side) {
          case 0:
            x = centerX + (localT - 0.5) * width;
            y = centerY - radiusY;
            angle = Math.PI / 2;
            break;
          case 1:
            x = centerX + radiusX;
            y = centerY + (localT - 0.5) * height;
            angle = 0;
            break;
          case 2:
            x = centerX + (localT - 0.5) * width;
            y = centerY + radiusY;
            angle = -Math.PI / 2;
            break;
          case 3:
            x = centerX - radiusX;
            y = centerY + (localT - 0.5) * height;
            angle = Math.PI;
            break;
          default:
            x = centerX;
            y = centerY - radiusY;
            angle = Math.PI / 2;
        }
        
        positions.push({
          id: `seat-${seatIndex}`,
          localX: x,
          localY: y,
          angle,
        });
        seatIndex++;
      }
    }
  } else if (shape === 'table-oval') {
    const angleStep = (2 * Math.PI) / count;
    
    for (let i = 0; i < count; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const normalizedT = (Math.sin(angle) + 1) / 2;
      const x = centerX + radiusX * Math.cos(angle);
      const y = centerY + radiusY * Math.sin(angle);
      
      positions.push({
        id: `seat-${i}`,
        localX: x,
        localY: y,
        angle: angle + Math.PI / 2,
      });
    }
  }

  return positions;
}

export const SeatIndicators: React.FC<SeatIndicatorsProps> = ({
  tableType,
  dimensions,
  seatCount,
  seatPositions,
  chairOffset,
  pixelsPerMeter,
  isSelected = false,
}) => {
  const seatRadius = 0.025 * pixelsPerMeter;
  const strokeWidth = 1;
  const strokeColor = '#1a1a1a';
  
  const renderSeat = (position: SeatPosition, index: number) => {
    const x = position.localX * pixelsPerMeter;
    const y = position.localY * pixelsPerMeter;
    const rotation = (position.angle * 180) / Math.PI;
    
    return (
      <g
        key={position.id || `seat-${index}`}
        transform={`translate(${x}, ${y}) rotate(${rotation})`}
      >
        <circle
          cx={0}
          cy={0}
          r={seatRadius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="element-seat"
        />
        <line
          x1={-seatRadius * 0.6}
          y1={0}
          x2={seatRadius * 0.6}
          y2={0}
          stroke={strokeColor}
          strokeWidth={strokeWidth * 0.6}
        />
      </g>
    );
  };

  const displayPositions = seatPositions.length > 0 ? seatPositions : 
    distributeSeatPositions(tableType, dimensions, seatCount, chairOffset);

  return (
    <g className="seat-indicators">
      {displayPositions.map((position, index) => renderSeat(position, index))}
    </g>
  );
};

export default SeatIndicators;
