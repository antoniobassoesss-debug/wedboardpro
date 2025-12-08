import React from 'react';
export interface Wall {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    thickness: number;
    length: number;
    angle: number;
    color: string;
    snapToGrid: boolean;
    gridSize: number;
}
interface WallPreviewWindowProps {
    onConfirm: (walls: Wall[]) => void;
    onCancel: () => void;
    gridSize?: number;
    wallThickness?: number;
    snapToGrid?: boolean;
    snapToAngles?: boolean;
}
declare const WallPreviewWindow: React.FC<WallPreviewWindowProps>;
export default WallPreviewWindow;
//# sourceMappingURL=WallPreviewWindow.d.ts.map