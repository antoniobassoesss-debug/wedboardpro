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
export declare function snapToGrid(x: number, y: number, gridSize: number): SnapResult;
/**
 * Calculate angle between two points in degrees
 */
export declare function calculateAngle(x1: number, y1: number, x2: number, y2: number): number;
/**
 * Snap an angle to the nearest allowed angle
 */
export declare function snapAngle(angle: number, snapAngles: number[], threshold?: number): {
    angle: number;
    snapped: boolean;
    snapAngle?: number;
};
/**
 * Apply angle snapping to a line by adjusting the end point
 */
export declare function snapLineToAngle(startX: number, startY: number, endX: number, endY: number, snapAngles: number[], threshold?: number): {
    x: number;
    y: number;
    snapped: boolean;
    angle?: number;
};
/**
 * Calculate distance between two points
 */
export declare function calculateDistance(x1: number, y1: number, x2: number, y2: number): number;
//# sourceMappingURL=gridSnap.d.ts.map