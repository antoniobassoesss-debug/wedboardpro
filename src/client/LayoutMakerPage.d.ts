import React from 'react';
import type { Wall, Door } from './types/wall.js';
export interface Project {
    id: string;
    name: string;
    canvasData: {
        drawings: any[];
        shapes: any[];
        textElements: any[];
        walls?: Wall[];
        doors?: Door[];
        viewBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
}
declare const LayoutMakerPage: React.FC;
export default LayoutMakerPage;
//# sourceMappingURL=LayoutMakerPage.d.ts.map