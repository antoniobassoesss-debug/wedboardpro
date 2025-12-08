import React, { useState } from 'react';
import {
  CalendarIcon,
  ChatIcon,
  HomeIcon,
  LayoutIcon,
  QuotesIcon,
  TodoIcon,
  WorkIcon,
  UsersIcon,
  SuppliersIcon,
} from './icons';

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

interface SidebarProps {
  active: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  userName?: string;
  avatarUrl?: string | null;
}

import { AccountModal } from '../components/AccountModal'

const Sidebar: React.FC<SidebarProps> = ({ active, collapsed, onToggle, onSelect, userName, avatarUrl }) => {
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <aside className={`wp-sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
      {!collapsed && (
    <div className="wp-sidebar-logo">
      <img src="/logo/iconlogo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
      <div>
        <div style={{ fontWeight: 700 }}>WedBoarPro</div>
        <span style={{ fontSize: 12, color: '#7b7b7b' }}>Wedding Planner</span>
      </div>
    </div>
      )}
      <button type="button" className="wp-toggle" onClick={onToggle}>
        {collapsed ? '▶' : '◀'}
      </button>
    </div>
    <nav className="wp-sidebar-menu">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`wp-nav-button ${active === id ? 'active' : ''}`}
          onClick={() => onSelect(id)}
        >
          <Icon />
          {!collapsed && <span>{label}</span>}
        </button>
      ))}
    </nav>
    <div className="wp-sidebar-footer">
      <div
        className="wp-dropdown"
        role="button"
        tabIndex={0}
        onClick={() => setAccountOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setAccountOpen(true)
        }}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 8,
          padding: collapsed ? 8 : '8px 12px',
        }}
        title="Open account settings"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile avatar"
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#efefef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#111',
            }}
          >
            {(userName || 'U')
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
        )}
      </div>
    </div>
    <AccountModal open={accountOpen} onOpenChange={setAccountOpen} />
    </aside>
  );
};

export default Sidebar;


