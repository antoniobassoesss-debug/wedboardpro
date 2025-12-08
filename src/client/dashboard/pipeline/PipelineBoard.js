import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from 'react';
import { createEmptyProject, mockProjects } from './projectsData';
import ProjectsPage from './ProjectsPage';
import ProjectPipelinePage from './ProjectPipelinePage';
import './pipeline.css';
const PipelineBoard = () => {
    const [projects, setProjects] = useState(mockProjects);
    const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? null);
    const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? null, [projects, selectedProjectId]);
    const handleSelectProject = (projectId) => {
        setSelectedProjectId(projectId);
    };
    const handleCreateProject = () => {
        const newProject = createEmptyProject();
        setProjects((prev) => [newProject, ...prev]);
        setSelectedProjectId(newProject.id);
    };
    const updateProject = (projectId, updater) => {
        setProjects((prev) => prev.map((project) => (project.id === projectId ? updater(project) : project)));
    };
    const handleProjectNameChange = (name) => {
        if (!selectedProject)
            return;
        updateProject(selectedProject.id, (project) => ({
            ...project,
            name,
            updatedAt: new Date().toISOString(),
        }));
    };
    const handleStageStatusChange = (stageId, status) => {
        if (!selectedProject)
            return;
        updateProject(selectedProject.id, (project) => ({
            ...project,
            stages: project.stages.map((stage) => stage.id === stageId ? { ...stage, status } : stage),
            updatedAt: new Date().toISOString(),
        }));
    };
    const handleStageNotesChange = (stageId, notes) => {
        if (!selectedProject)
            return;
        updateProject(selectedProject.id, (project) => ({
            ...project,
            stages: project.stages.map((stage) => stage.id === stageId ? { ...stage, notes } : stage),
            updatedAt: new Date().toISOString(),
        }));
    };
    const handleAssignStage = (stageId) => {
        if (!selectedProject)
            return;
        updateProject(selectedProject.id, (project) => ({
            ...project,
            stages: project.stages.map((stage) => stage.id === stageId
                ? { ...stage, assignee: stage.assignee ? stage.assignee : 'Planner Team' }
                : stage),
        }));
    };
    return (_jsxs("div", { className: "pipeline-wrapper", children: [_jsx(ProjectsPage, { projects: projects, selectedProjectId: selectedProjectId, onSelectProject: handleSelectProject, onCreateProject: handleCreateProject }), _jsx(ProjectPipelinePage, { project: selectedProject, onProjectNameChange: handleProjectNameChange, onStageStatusChange: handleStageStatusChange, onStageNotesChange: handleStageNotesChange, onAssignStage: handleAssignStage })] }));
};
export default PipelineBoard;
//# sourceMappingURL=PipelineBoard.js.map