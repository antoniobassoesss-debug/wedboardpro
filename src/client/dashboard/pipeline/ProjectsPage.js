import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const ProjectsPage = ({ projects, selectedProjectId, onSelectProject, onCreateProject, }) => {
    return (_jsxs("div", { className: "projects-panel", children: [_jsxs("div", { className: "projects-panel__header", children: [_jsx("h3", { children: "Projects" }), _jsx("button", { type: "button", className: "primary-btn", onClick: onCreateProject, children: "New Project" })] }), _jsxs("div", { className: "projects-panel__list", children: [projects.map((project) => {
                        const completedStages = project.stages.filter((stage) => stage.status === 'completed').length;
                        return (_jsxs("button", { type: "button", className: `project-card ${selectedProjectId === project.id ? 'active' : ''}`, onClick: () => onSelectProject(project.id), children: [_jsxs("div", { children: [_jsx("strong", { children: project.name }), _jsxs("p", { children: [completedStages, " of ", project.stages.length, " stages complete"] })] }), _jsxs("span", { className: "project-card__meta", children: ["Updated ", formatDate(project.updatedAt)] })] }, project.id));
                    }), projects.length === 0 && (_jsx("div", { className: "empty-state", children: _jsx("p", { children: "No projects yet. Click \u201CNew Project\u201D to get started." }) }))] })] }));
};
export default ProjectsPage;
//# sourceMappingURL=ProjectsPage.js.map