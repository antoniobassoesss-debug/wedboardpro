import React from 'react';
import type { Project } from './projectsData';

interface ProjectsPageProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}

const formatDate = (timestamp: string) =>
  new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
}) => {
  return (
    <div className="projects-panel">
      <div className="projects-panel__header">
        <h3>Projects</h3>
        <button type="button" className="primary-btn" onClick={onCreateProject}>
          New Project
        </button>
      </div>
      <div className="projects-panel__list">
        {projects.map((project) => {
          const completedStages = project.stages.filter((stage) => stage.status === 'completed').length;
          return (
            <button
              key={project.id}
              type="button"
              className={`project-card ${selectedProjectId === project.id ? 'active' : ''}`}
              onClick={() => onSelectProject(project.id)}
            >
              <div>
                <strong>{project.name}</strong>
                <p>{completedStages} of {project.stages.length} stages complete</p>
              </div>
              <span className="project-card__meta">Updated {formatDate(project.updatedAt)}</span>
            </button>
          );
        })}
        {projects.length === 0 && (
          <div className="empty-state">
            <p>No projects yet. Click “New Project” to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;


