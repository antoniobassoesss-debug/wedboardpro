import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { CalendarIcon, ChatIcon, HomeIcon, LayoutIcon, QuotesIcon, TodoIcon, WorkIcon, UsersIcon, SuppliersIcon, } from './icons';
const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'work', label: 'The Work', icon: WorkIcon },
    { id: 'calendar', label: 'The Calendar', icon: CalendarIcon },
    { id: 'layouts', label: 'The Layouts', icon: LayoutIcon },
    { id: 'quotes', label: 'The Quotes', icon: QuotesIcon },
    { id: 'todo', label: 'To-Do List', icon: TodoIcon },
    { id: 'suppliers', label: 'Suppliers', icon: SuppliersIcon },
    { id: 'chat', label: 'Chat', icon: ChatIcon },
    { id: 'teams', label: 'Teams', icon: UsersIcon },
];
import { AccountModal } from '../components/AccountModal';
const Sidebar = ({ active, collapsed, onToggle, onSelect, userName, avatarUrl }) => {
    const [accountOpen, setAccountOpen] = useState(false);
    return (_jsxs("aside", { className: `wp-sidebar ${collapsed ? 'collapsed' : ''}`, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }, children: [!collapsed && (_jsxs("div", { className: "wp-sidebar-logo", children: [_jsx("img", { src: "/logo/iconlogo.png", alt: "Logo", style: { width: 36, height: 36, objectFit: 'contain' } }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 700 }, children: "WedBoarPro" }), _jsx("span", { style: { fontSize: 12, color: '#7b7b7b' }, children: "Wedding Planner" })] })] })), _jsx("button", { type: "button", className: "wp-toggle", onClick: onToggle, children: collapsed ? '▶' : '◀' })] }), _jsx("nav", { className: "wp-sidebar-menu", children: NAV_ITEMS.map(({ id, label, icon: Icon }) => (_jsxs("button", { type: "button", className: `wp-nav-button ${active === id ? 'active' : ''}`, onClick: () => onSelect(id), children: [_jsx(Icon, {}), !collapsed && _jsx("span", { children: label })] }, id))) }), _jsx("div", { className: "wp-sidebar-footer", children: _jsx("div", { className: "wp-dropdown", role: "button", tabIndex: 0, onClick: () => setAccountOpen(true), onKeyDown: (e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                            setAccountOpen(true);
                    }, style: {
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: 8,
                        padding: collapsed ? 8 : '8px 12px',
                    }, title: "Open account settings", children: avatarUrl ? (_jsx("img", { src: avatarUrl, alt: "Profile avatar", style: { width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' } })) : (_jsx("div", { style: {
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: '#efefef',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#111',
                        }, children: (userName || 'U')
                            .split(' ')
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() })) }) }), _jsx(AccountModal, { open: accountOpen, onOpenChange: setAccountOpen })] }));
};
export default Sidebar;
//# sourceMappingURL=Sidebar.js.map