import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard-layout.css';
const WorkIcon = ({ active }) => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M5 7h14a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2z", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }), _jsx("path", { d: "M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }), _jsx("rect", { x: "3", y: "11", width: "18", height: "4", fill: active ? 'currentColor' : 'none', opacity: active ? 0.2 : 0 })] }));
const CalendarIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "4", y: "5", width: "16", height: "15", rx: "2", stroke: "currentColor", strokeWidth: "1.6" }), _jsx("path", { d: "M8 3v4M16 3v4M4 10h16", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" })] }));
const LayoutIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2", stroke: "currentColor", strokeWidth: "1.6" }), _jsx("rect", { x: "7", y: "8", width: "5", height: "8", rx: "1", fill: "currentColor", opacity: "0.2" }), _jsx("rect", { x: "13", y: "8", width: "4", height: "8", rx: "1", stroke: "currentColor", strokeWidth: "1.3" })] }));
const QuotesIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M7 9h5M7 13h3M7 17h10", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }), _jsx("rect", { x: "4", y: "5", width: "16", height: "14", rx: "2", stroke: "currentColor", strokeWidth: "1.6" })] }));
const TodoIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M9 6l-1 1-1-1M9 12l-1 1-1-1M9 18l-1 1-1-1", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M13 6h5M13 12h5M13 18h5", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" })] }));
const MENU_ITEMS = [
    { id: 'home', label: 'Home', icon: WorkIcon, description: 'Jump back in to your workspace overview.' },
    { id: 'work', label: 'Work', icon: WorkIcon, description: 'Project boards, briefs, and current progress.' },
    {
        id: 'calendar',
        label: 'Calendar',
        icon: CalendarIcon,
        description: 'Schedule view for upcoming events and milestones.',
    },
    { id: 'layouts', label: 'Layouts', icon: LayoutIcon, description: 'Quick access to your layout tools and templates.' },
    { id: 'quotes', label: 'Quotes', icon: QuotesIcon, description: 'Placeholder for proposals and quote builders.' },
    { id: 'todo', label: 'To-Do List', icon: TodoIcon, description: 'Tasks and reminders to keep planning on track.' },
];
const SidebarItem = ({ icon: Icon, label, isActive, collapsed, onClick }) => {
    return (_jsxs("button", { className: `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`, onClick: onClick, type: "button", children: [_jsx("span", { className: "sidebar-icon", children: _jsx(Icon, { active: isActive }) }), _jsx("span", { className: "sidebar-label", children: label })] }));
};
const Sidebar = ({ collapsed, activeId, onSelect, onToggle, mobileOpen }) => (_jsxs("aside", { className: `dashboard-sidebar ${collapsed ? 'collapsed' : 'expanded'} ${mobileOpen ? 'mobile-open' : ''}`, children: [_jsxs("div", { className: "sidebar-header", children: [_jsx("div", { className: "sidebar-title", children: collapsed ? 'Menu' : 'Workspace' }), _jsx("button", { className: "sidebar-toggle desktop-only", type: "button", onClick: onToggle, children: collapsed ? 'Expand' : 'Collapse' })] }), _jsx("div", { className: "sidebar-items", children: MENU_ITEMS.map((item) => (_jsx(SidebarItem, { id: item.id, icon: item.icon, label: item.label, isActive: activeId === item.id, collapsed: collapsed, onClick: () => onSelect(item.id) }, item.id))) })] }));
const TopBar = ({ title, onMobileMenu }) => (_jsxs("header", { className: "dashboard-topbar", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("button", { className: "mobile-menu-btn", type: "button", onClick: onMobileMenu, children: "\u2630 Menu" }), _jsx("h1", { children: title })] }), _jsxs("div", { className: "topbar-actions", children: [_jsx("div", { className: "search-placeholder", children: "Search or jump to\u2026" }), _jsx("div", { className: "topbar-avatar", style: { width: 36, height: 36, borderRadius: '50%', background: '#e4e7ec' } })] })] }));
const HomeSection = ({ onNavigate }) => (_jsxs("div", { className: "home-section", children: [_jsxs("div", { className: "home-hero", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Workspace" }), _jsx("h2", { children: "Planning made calm" }), _jsx("p", { children: "Create layouts, manage proposals, and keep every event under control in one single page." }), _jsxs("div", { className: "home-actions", children: [_jsx("button", { type: "button", className: "primary", onClick: () => onNavigate('layouts'), children: "Go to Layouts" }), _jsx("button", { type: "button", className: "ghost", children: "Invite teammate" })] })] }), _jsxs("div", { className: "home-hero-panel", children: [_jsx("div", { children: "Next Milestone" }), _jsx("strong", { children: "Launch summer venue library" }), _jsx("p", { children: "Due in 4 days" })] })] }), _jsx("div", { className: "stats-grid", children: ['Active Layouts', 'Signed Quotes', 'Upcoming Events', 'Tasks'].map((label, idx) => (_jsxs("div", { className: "stat-card", children: [_jsx("span", { children: label }), _jsx("strong", { children: [12, 8, 5, 14][idx] })] }, label))) }), _jsxs("div", { className: "timeline-card", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Today" }), _jsx("h3", { children: "Daily planning" })] }), _jsx("div", { className: "timeline-list", children: ['Review ballroom layout', 'Send updated quote', 'Confirm AV vendor'].map((task) => (_jsxs("div", { className: "timeline-item", children: [_jsx("span", { className: "dot" }), _jsx("p", { children: task })] }, task))) })] })] }));
const LayoutsSection = () => {
    const navigate = useNavigate();
    const recent = useMemo(() => ['Garden Gala', 'Corporate Launch', 'Winter Ball'], []);
    const saved = useMemo(() => ['Conference template', 'Banquet seating', 'Outdoor ceremony', 'Black tie ballroom'], []);
    return (_jsxs("div", { className: "layouts-section", children: [_jsxs("div", { className: "layouts-header", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Layouts" }), _jsx("h2", { children: "Your layout library" })] }), _jsx("button", { type: "button", onClick: () => navigate('/layout-maker'), className: "primary ghost", children: "Layout Maker" })] }), _jsxs("div", { className: "layout-panels", children: [_jsxs("div", { className: "layout-panel", children: [_jsx("h3", { children: "Create New Layout" }), _jsx("p", { children: "Start from a blank canvas or apply your templates." }), _jsx("button", { type: "button", onClick: () => navigate('/layout-maker'), className: "primary", children: "+ New Layout" })] }), _jsxs("div", { className: "layout-panel list", children: [_jsx("h3", { children: "Recent" }), _jsx("ul", { children: recent.map((item) => (_jsx("li", { children: item }, item))) })] }), _jsxs("div", { className: "layout-panel list", children: [_jsx("h3", { children: "Saved Layouts" }), _jsx("ul", { children: saved.map((item) => (_jsx("li", { children: item }, item))) })] })] })] }));
};
const DashboardLayout = () => {
    const [activeSectionId, setActiveSectionId] = useState('home');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const activeItem = MENU_ITEMS.find((item) => item.id === activeSectionId) ?? MENU_ITEMS[0];
    const renderContent = () => {
        switch (activeItem.id) {
            case 'home':
                return _jsx(HomeSection, { onNavigate: setActiveSectionId });
            case 'layouts':
                return _jsx(LayoutsSection, {});
            case 'work':
            case 'calendar':
            case 'quotes':
            case 'todo':
            default:
                return (_jsxs("div", { className: "placeholder-card", children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }, children: _jsxs("div", { children: [_jsx("h2", { children: activeItem.label }), _jsx("p", { style: { color: '#475467', margin: 0 }, children: activeItem.description })] }) }), _jsxs("div", { className: "placeholder-grid", style: { marginTop: '24px' }, children: [_jsx("div", { className: "placeholder-tile", children: "Widget" }), _jsx("div", { className: "placeholder-tile", children: "Widget" }), _jsx("div", { className: "placeholder-tile", children: "Widget" })] })] }));
        }
    };
    const handleSelect = (id) => {
        setActiveSectionId(id);
        setMobileSidebarOpen(false);
    };
    return (_jsxs("div", { className: "dashboard-shell", children: [_jsx("div", { className: "background-accent" }), _jsx(Sidebar, { collapsed: isCollapsed, activeId: activeSectionId, onSelect: handleSelect, onToggle: () => setIsCollapsed((prev) => !prev), mobileOpen: isMobileSidebarOpen }), _jsx("div", { className: `dashboard-overlay ${isMobileSidebarOpen ? 'visible' : ''}`, onClick: () => setMobileSidebarOpen(false) }), _jsxs("main", { className: "dashboard-main", children: [_jsx(TopBar, { title: activeItem.label, onMobileMenu: () => setMobileSidebarOpen(true) }), _jsx("section", { className: "dashboard-content", children: renderContent() })] })] }));
};
export default DashboardLayout;
//# sourceMappingURL=DashboardLayout.js.map