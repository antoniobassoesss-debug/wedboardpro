import React from 'react';
import type { Stage, StageStatus } from './projectsData';
interface StageItemProps {
    stage: Stage;
    onStatusChange: (status: StageStatus) => void;
    onNotesChange: (notes: string) => void;
    onAssign: () => void;
}
declare const StageItem: React.FC<StageItemProps>;
export default StageItem;
//# sourceMappingURL=StageItem.d.ts.map