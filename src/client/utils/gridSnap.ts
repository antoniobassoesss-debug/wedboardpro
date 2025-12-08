// Grid snapping utilities

export interface Point {
  x: number;
  y: number;
}

export interface SnapResult {
  x: number;
  y: number;
  snapped: boolean;
  snapType?: 'grid' | 'angle';
}

/**
 * Snap a point to the nearest grid intersection
 */
export function snapToGrid(
  x: number,
  y: number,
  gridSize: number
): SnapResult {
  const snappedX = Math.round(x / gridSize) * gridSize;
  const snappedY = Math.round(y / gridSize) * gridSize;
  
  const distance = Math.sqrt(
    Math.pow(x - snappedX, 2) + Math.pow(y - snappedY, 2)
  );
  
  // Only snap if within 10 pixels of grid point
  const snapThreshold = 10;
  
  const snapped = distance < snapThreshold;
  return {
    x: snapped ? snappedX : x,
    y: snapped ? snappedY : y,
    snapped,
    ...(snapped && { snapType: 'grid' as const }),
  };
}

/**
 * Calculate angle between two points in degrees
 */
export function calculateAngle(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return angle < 0 ? angle + 360 : angle;
}

/**
 * Snap an angle to the nearest allowed angle
 */
export function snapAngle(
  angle: number,
  snapAngles: number[],
  threshold: number = 5 // degrees
): { angle: number; snapped: boolean; snapAngle?: number } {
  if (snapAngles.length === 0) {
    return { angle, snapped: false };
  }
  
  // Normalize angle to 0-360
  const normalizedAngle = angle < 0 ? angle + 360 : angle;
  
  let closestAngle = snapAngles[0]!;
  let minDiff = Math.abs(normalizedAngle - snapAngles[0]!);
  
  for (const snapAngle of snapAngles) {
    if (snapAngle === undefined) continue;
    const diff = Math.abs(normalizedAngle - snapAngle);
    if (diff < minDiff) {
      minDiff = diff;
      closestAngle = snapAngle;
    }
  }
  
  if (minDiff <= threshold) {
    return { angle: closestAngle, snapped: true, snapAngle: closestAngle };
  }
  
  return { angle: normalizedAngle, snapped: false };
}

/**
 * Apply angle snapping to a line by adjusting the end point
 */
export function snapLineToAngle(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  snapAngles: number[],
  threshold: number = 5
): { x: number; y: number; snapped: boolean; angle?: number } {
  const currentAngle = calculateAngle(startX, startY, endX, endY);
  const snapResult = snapAngle(currentAngle, snapAngles, threshold);
  
  if (snapResult.snapped && snapResult.snapAngle !== undefined) {
    const length = Math.sqrt(
      Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
    );
    const snapAngleValue = snapResult.snapAngle;
    const angleRad = (snapAngleValue * Math.PI) / 180;
    
    return {
      x: startX + length * Math.cos(angleRad),
      y: startY + length * Math.sin(angleRad),
      snapped: true,
      angle: snapAngleValue,
    };
  }
  
  return {
    x: endX,
    y: endY,
    snapped: false,
    angle: currentAngle,
  };
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

