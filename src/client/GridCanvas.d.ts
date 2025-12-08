import React from 'react';
import type { Wall, Door } from './types/wall.js';
interface ViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface DrawingPath {
    id: string;
    d: string;
    stroke: string;
    strokeWidth: number;
}
interface Shape {
    id: string;
    type: 'rectangle' | 'circle' | 'image';
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    imageUrl?: string;
    imageNaturalWidth?: number;
    imageNaturalHeight?: number;
    tableData?: {
        type: string;
        size: string;
        seats: number;
        actualSizeMeters: number;
    };
    spaceMetersWidth?: number;
    spaceMetersHeight?: number;
    pixelsPerMeter?: number;
    attachedSpaceId?: string | undefined;
}
interface TextElement {
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fill: string;
}
interface GridCanvasProps {
    activeTool: string;
    onToolChange: (tool: string) => void;
    projectId?: string;
    projectData?: {
        drawings: DrawingPath[];
        shapes: Shape[];
        textElements: TextElement[];
        walls?: Wall[];
        doors?: Door[];
        viewBox?: ViewBox;
    };
    onDataChange?: (data: {
        drawings: DrawingPath[];
        shapes: Shape[];
        textElements: TextElement[];
        walls: Wall[];
        doors: Door[];
        viewBox: ViewBox;
    }, projectId: string) => void;
    brushSize?: number;
    brushColor?: string;
}
declare const GridCanvas: React.ForwardRefExoticComponent<GridCanvasProps & React.RefAttributes<{
    addSpace: (width: number, height: number) => void;
    addTable: (type: string, size: string, seats: number, imageUrl: string, targetSpaceId?: string) => void;
    addWalls: (walls: Wall[], doors?: Door[]) => void;
}>>;
export default GridCanvas;
//# sourceMappingURL=GridCanvas.d.ts.map