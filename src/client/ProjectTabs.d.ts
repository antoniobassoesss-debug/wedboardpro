import React from 'react';
interface Project {
    id: string;
    name: string;
}
interface ProjectTabsProps {
    projects: Project[];
    activeProjectId: string;
    onProjectSelect: (projectId: string) => void;
    onNewProject: () => void;
    onDeleteProject?: (projectId: string) => void;
    onRenameProject?: (projectId: string, newName: string) => void;
    newlyCreatedProjectId?: string | null;
}
declare const ProjectTabs: React.FC<ProjectTabsProps>;
export default ProjectTabs;
//# sourceMappingURL=ProjectTabs.d.ts.map