import React from 'react';
import type { Project } from './projectsData';
interface ProjectsPageProps {
    projects: Project[];
    selectedProjectId: string | null;
    onSelectProject: (projectId: string) => void;
    onCreateProject: () => void;
}
declare const ProjectsPage: React.FC<ProjectsPageProps>;
export default ProjectsPage;
//# sourceMappingURL=ProjectsPage.d.ts.map