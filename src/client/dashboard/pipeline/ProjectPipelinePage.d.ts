import React from 'react';
import type { Project, StageStatus } from './projectsData';
interface ProjectPipelinePageProps {
    project: Project | null;
    onBack?: () => void;
    onProjectNameChange: (name: string) => void;
    onStageStatusChange: (stageId: string, status: StageStatus) => void;
    onStageNotesChange: (stageId: string, notes: string) => void;
    onAssignStage: (stageId: string) => void;
}
declare const ProjectPipelinePage: React.FC<ProjectPipelinePageProps>;
export default ProjectPipelinePage;
//# sourceMappingURL=ProjectPipelinePage.d.ts.map