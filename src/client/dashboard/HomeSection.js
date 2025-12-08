import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
const stats = [
    { label: 'Active Projects', value: null },
    { label: 'Weekly Events', value: null },
    { label: 'Pending Quotes', value: null },
    { label: 'Tasks Due', value: null },
];
const previewCards = [
    {
        title: 'Upcoming Events',
        description: 'Add events to see them here.',
        target: 'calendar',
    },
    {
        title: 'Recent Projects',
        description: 'Newly created projects will appear here.',
        target: 'work',
    },
    {
        title: 'Pending Quotes',
        description: 'Create a quote to track approval status.',
        target: 'quotes',
    },
    {
        title: 'Urgent Tasks',
        description: 'Tasks you create will appear in this list.',
        target: 'todo',
    },
];
const HomeSection = ({ onNavigate }) => (_jsxs(_Fragment, { children: [_jsxs("div", { className: "wp-card", children: [_jsxs("div", { className: "wp-section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Welcome back" }), _jsx("h2", { children: "Start by adding your own projects, layouts, and events." })] }), _jsxs("div", { className: "home-actions", children: [_jsx("button", { type: "button", className: "wp-pill primary", onClick: () => onNavigate('layouts'), children: "Create Layout" }), _jsx("button", { type: "button", className: "wp-pill", children: "Share Brief" })] })] }), _jsx("div", { className: "stats-grid", children: stats.map((stat) => (_jsxs("div", { className: "stat-card", children: [_jsx("span", { children: stat.label }), _jsx("strong", { children: stat.value ?? '—' }), _jsx("p", { style: { margin: 0, color: '#9a9a9a', fontSize: 12 }, children: "Populate data to see metrics." })] }, stat.label))) })] }), _jsx("div", { className: "wp-grid", children: previewCards.map((card) => (_jsxs("div", { className: "wp-preview-card", children: [_jsxs("div", { children: [_jsx("h3", { children: card.title }), _jsx("p", { style: { color: '#7b7b7b', margin: 0 }, children: card.description })] }), _jsx("button", { type: "button", className: "wp-pill", onClick: () => onNavigate(card.target), children: "View All" })] }, card.title))) })] }));
export default HomeSection;
//# sourceMappingURL=HomeSection.js.map