import React from 'react';
import type { Wall, Door } from './types/wall.js';
interface SpaceOption {
    id: string;
    label: string;
    widthMeters: number;
    heightMeters: number;
    pixelsPerMeter: number;
}
interface ToolbarProps {
    activeTool: string;
    onToolChange: (tool: string) => void;
    onAddSpace?: (width: number, height: number) => void;
    onAddTable?: (type: string, size: string, seats: number, imageUrl: string, spaceId?: string) => void;
    onAddWalls?: (walls: Wall[], doors: Door[]) => void;
    brushSize?: number;
    brushColor?: string;
    onBrushSizeChange?: (size: number) => void;
    onBrushColorChange?: (color: string) => void;
    availableSpaces?: SpaceOption[];
}
declare const Toolbar: React.FC<ToolbarProps>;
export default Toolbar;
//# sourceMappingURL=Toolbar.d.ts.map