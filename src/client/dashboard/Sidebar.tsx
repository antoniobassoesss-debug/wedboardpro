import React from 'react';
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
  { id: 'work', label: 'Work', icon: WorkIcon },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'layouts', label: 'Layouts', icon: LayoutIcon },
  { id: 'crm', label: 'CRM', icon: QuotesIcon },
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
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  active,
  collapsed,
  onToggle,
  onSelect,
  userName,
  avatarUrl,
  onLogout
}) => {

  return (
    <aside className={`wp-sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
      {!collapsed && (
    <div className="wp-sidebar-logo">
      <img src="/logo/iconlogo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
      <div>
        <div style={{ fontWeight: 700 }}>WedBoardPro</div>
      </div>
    </div>
      )}
      <button type="button" className="wp-toggle" onClick={onToggle} aria-label="Toggle sidebar">
        <span className="wp-toggle-lines">
          <span />
          <span />
          <span />
        </span>
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

    {/* User Profile Section at Bottom */}
    <div className="wp-sidebar-profile">
      <div className="wp-profile-info">
        <div className="wp-profile-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName || 'User'} />
          ) : (
            <div className="wp-avatar-placeholder">
              {(userName || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="wp-profile-details">
            <div className="wp-profile-name">{userName || 'User'}</div>
            <button
              type="button"
              className="wp-logout-button"
              onClick={onLogout}
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
    </aside>
  );
};

export default Sidebar;


