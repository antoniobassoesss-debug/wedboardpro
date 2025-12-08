import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import StageItem from './StageItem';
const deriveStatusBadge = (project) => {
    if (!project)
        return { label: 'No project', className: 'badge neutral' };
    if (project.stages.some((stage) => stage.status === 'urgent')) {
        return { label: 'Needs attention', className: 'badge danger' };
    }
    if (project.stages.some((stage) => stage.status === 'blocked')) {
        return { label: 'Blocked', className: 'badge warning' };
    }
    if (project.stages.every((stage) => stage.status === 'completed')) {
        return { label: 'Complete', className: 'badge success' };
    }
    return { label: 'On track', className: 'badge info' };
};
const ProjectPipelinePage = ({ project, onBack, onProjectNameChange, onStageStatusChange, onStageNotesChange, onAssignStage, }) => {
    if (!project) {
        return (_jsx("div", { className: "pipeline-detail empty-state", children: _jsx("p", { children: "Select a project to see its stages." }) }));
    }
    const completedCount = project.stages.filter((stage) => stage.status === 'completed').length;
    const progressPercent = Math.round((completedCount / project.stages.length) * 100);
    const badge = deriveStatusBadge(project);
    return (_jsxs("div", { className: "pipeline-detail", children: [_jsxs("div", { className: "pipeline-detail__header", children: [_jsxs("div", { children: [_jsxs("label", { className: "project-name-input", children: [_jsx("span", { children: "Project name" }), _jsx("input", { type: "text", value: project.name, onChange: (event) => onProjectNameChange(event.target.value) })] }), _jsxs("div", { className: "pipeline-progress", children: [_jsxs("div", { className: "pipeline-progress__meta", children: [_jsxs("strong", { children: [completedCount, "/", project.stages.length] }), ' ', "stages completed"] }), _jsx("div", { className: "pipeline-progress__bar", children: _jsx("span", { style: { width: `${progressPercent}%` } }) })] })] }), _jsxs("div", { className: "pipeline-header-actions", children: [onBack && (_jsx("button", { type: "button", className: "secondary-btn", onClick: onBack, children: "Back to projects" })), _jsx("span", { className: badge.className, children: badge.label })] })] }), _jsx("div", { className: "stage-list", children: project.stages.map((stage) => (_jsx(StageItem, { stage: stage, onStatusChange: (status) => onStageStatusChange(stage.id, status), onNotesChange: (notes) => onStageNotesChange(stage.id, notes), onAssign: () => onAssignStage(stage.id) }, stage.id))) })] }));
};
export default ProjectPipelinePage;
//# sourceMappingURL=ProjectPipelinePage.js.map