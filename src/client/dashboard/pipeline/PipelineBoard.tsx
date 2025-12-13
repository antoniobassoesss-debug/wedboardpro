import React, { useMemo, useState } from 'react';
import type { Project, StageStatus } from './projectsData';
import { createEmptyProject, mockProjects } from './projectsData';
import ProjectsPage from './ProjectsPage';
import ProjectPipelinePage from './ProjectPipelinePage';
import './pipeline.css';
import { NewProjectModal, NewProjectPayload } from '../../components/NewProjectModal';

const PipelineBoard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleCreateProject = (payload: NewProjectPayload) => {
    // For now we only use the title as the project name; the other fields
    // can later be wired into Supabase / extended Project schema.
    const newProject = createEmptyProject(payload.title);
    setProjects((prev) => [newProject, ...prev]);
    setSelectedProjectId(newProject.id);
    setIsNewProjectOpen(false);
  };

  const updateProject = (projectId: string, updater: (project: Project) => Project) => {
    setProjects((prev) => prev.map((project) => (project.id === projectId ? updater(project) : project)));
  };

  const handleProjectNameChange = (name: string) => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, (project) => ({
      ...project,
      name,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleStageStatusChange = (stageId: string, status: StageStatus) => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, (project) => ({
      ...project,
      stages: project.stages.map((stage) =>
        stage.id === stageId ? { ...stage, status } : stage,
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleStageNotesChange = (stageId: string, notes: string) => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, (project) => ({
      ...project,
      stages: project.stages.map((stage) =>
        stage.id === stageId ? { ...stage, notes } : stage,
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAssignStage = (stageId: string) => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, (project) => ({
      ...project,
      stages: project.stages.map((stage) =>
        stage.id === stageId
          ? { ...stage, assignee: stage.assignee ? stage.assignee : 'Planner Team' }
          : stage,
      ),
    }));
  };

  return (
    <>
      <div className="pipeline-wrapper">
        <ProjectsPage
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onCreateProject={() => setIsNewProjectOpen(true)}
        />
        <ProjectPipelinePage
          project={selectedProject}
          onProjectNameChange={handleProjectNameChange}
          onStageStatusChange={handleStageStatusChange}
          onStageNotesChange={handleStageNotesChange}
          onAssignStage={handleAssignStage}
        />
      </div>
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        handleCreateProject={handleCreateProject}
      />
    </>
  );
};

export default PipelineBoard;


