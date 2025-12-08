import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { stageStatusOptions } from './projectsData';
const statusLabels = {
    not_started: { label: 'Not started', className: 'stage-status neutral' },
    in_progress: { label: 'In progress', className: 'stage-status info' },
    completed: { label: 'Completed', className: 'stage-status success' },
    urgent: { label: 'Urgent', className: 'stage-status danger' },
    blocked: { label: 'Blocked', className: 'stage-status warning' },
};
const StageItem = ({ stage, onStatusChange, onNotesChange, onAssign }) => {
    const meta = statusLabels[stage.status];
    return (_jsxs("div", { className: `stage-item ${stage.status === 'completed' ? 'completed' : ''}`, children: [_jsxs("div", { className: "stage-item__header", children: [_jsxs("div", { children: [_jsxs("div", { className: "stage-item__title", children: [stage.status === 'completed' ? _jsx("span", { className: "stage-check", children: "\u2713" }) : null, _jsx("strong", { children: stage.name })] }), _jsx("span", { className: meta.className, children: meta.label })] }), _jsxs("div", { className: "stage-item__actions", children: [_jsx("select", { value: stage.status, onChange: (event) => onStatusChange(event.target.value), children: stageStatusOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }), _jsx("button", { type: "button", className: "stage-assign-btn", onClick: onAssign, children: stage.assignee ? `Assigned to ${stage.assignee}` : 'Assign' })] })] }), _jsx("div", { className: "stage-item__notes", children: _jsxs("label", { children: [_jsx("span", { children: "Notes" }), _jsx("textarea", { value: stage.notes, onChange: (event) => onNotesChange(event.target.value), placeholder: "Add notes, blockers, or context\u2026", rows: 3 })] }) })] }));
};
export default StageItem;
//# sourceMappingURL=StageItem.js.map