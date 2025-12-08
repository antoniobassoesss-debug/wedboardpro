export interface Wall {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    thickness: number;
    length?: number;
    angle?: number;
    color?: string;
    snapToGrid?: boolean;
    snapAngle?: number;
}
export interface WallMakerConfig {
    gridSize: number;
    snapToGrid: boolean;
    snapAngles: number[];
    defaultThickness: number;
    showMeasurements: boolean;
    showAngles: boolean;
    showGrid: boolean;
}
export interface WallMakerState {
    walls: Wall[];
    isDrawing: boolean;
    currentWall: Partial<Wall> | null;
    history: Wall[][];
    historyIndex: number;
}
export interface Door {
    id: string;
    wallId: string;
    position: number;
    width: number;
    openingDirection: 'left' | 'right' | 'both' | 'inward';
    hingeSide?: 'start' | 'end';
}
//# sourceMappingURL=wall.d.ts.map