import React from 'react';
import type { Wall, WallMakerConfig, Door } from '../types/wall.js';
interface WallMakerProps {
    width: number;
    height: number;
    config: WallMakerConfig;
    walls: Wall[];
    onWallsChange: (walls: Wall[]) => void;
    onClose?: () => void;
    onAddToCanvas?: (walls: Wall[]) => void;
    onSavePreset?: (walls: Wall[], name: string) => void;
    activeTool?: 'wall' | 'pan' | 'door';
    doors?: Door[];
    onDoorsChange?: (doors: Door[]) => void;
}
declare const WallMaker: React.FC<WallMakerProps>;
export default WallMaker;
//# sourceMappingURL=WallMaker.d.ts.map