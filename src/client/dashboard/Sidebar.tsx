import React, { useMemo, useState, useEffect } from 'react';
import {
  CalendarIcon,
  ChatIcon,
  FilesIcon,
  HomeIcon,
  LayoutIcon,
  QuotesIcon,
  TodoIcon,
  WorkIcon,
  UsersIcon,
  SuppliersIcon,
} from './icons';
import { usePermissions, type UserPermissions } from '../hooks/usePermissions.js';

interface NavItem {
  id: string;
  label: string;
  icon: React.FC;
  requiresPermission?: keyof UserPermissions | 'always';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: HomeIcon, requiresPermission: 'always' },
  { id: 'work', label: 'Work', icon: WorkIcon, requiresPermission: 'always' },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon, requiresPermission: 'always' },
  { id: 'layouts', label: 'Layouts', icon: LayoutIcon, requiresPermission: 'always' },
  { id: 'crm', label: 'CRM', icon: QuotesIcon, requiresPermission: 'always' },
  { id: 'todo', label: 'To-Do List', icon: TodoIcon, requiresPermission: 'always' },
  { id: 'suppliers', label: 'Suppliers', icon: SuppliersIcon, requiresPermission: 'always' },
  { id: 'files', label: 'Files', icon: FilesIcon, requiresPermission: 'always' },
  { id: 'chat', label: 'Chat', icon: ChatIcon, requiresPermission: 'always' },
  { id: 'teams', label: 'Teams', icon: UsersIcon, requiresPermission: 'can_manage_team' },
];

interface SidebarProps {
  active: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  hideMobileToggle?: boolean;
}

const XIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MenuLinesIcon: React.FC = () => (
  <span className="wp-toggle-lines">
    <span />
    <span />
    <span />
  </span>
);

const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ active, collapsed, onToggle, onSelect, hideMobileToggle = false }) => {
  const { permissions } = usePermissions();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleToggleMobileMenu = () => {
      if (isMobile) {
        setMobileOpen(prev => !prev);
      }
    };
    window.addEventListener('wbp:toggle-mobile-menu', handleToggleMobileMenu as EventListener);
    return () => window.removeEventListener('wbp:toggle-mobile-menu', handleToggleMobileMenu as EventListener);
  }, [isMobile]);

  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.requiresPermission === 'always') return true;
      if (!item.requiresPermission) return true;
      if (permissions.is_owner) return true;
      return permissions[item.requiresPermission] === true;
    });
  }, [permissions]);

  if (isMobile) {
    return (
      <>
        {!hideMobileToggle && (
          <button
            type="button"
            className="wp-menu-toggle"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            style={{ display: mobileOpen ? 'none' : 'flex' }}
          >
            <MenuIcon />
          </button>
        )}
        <div
          className={`wp-sidebar-overlay ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(false)}
        />
        <aside className={`wp-sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="wp-sidebar-header">
            <div className="wp-sidebar-logo">
              <img src="/logo/iconlogo.png" alt="Logo" />
              <span className="wp-sidebar-logo-text">WedBoardPro</span>
            </div>
            <button
              type="button"
              className="wp-close-button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <XIcon style={{ width: 18, height: 18 }} />
            </button>
          </div>
          <nav className="wp-sidebar-menu">
            {visibleNavItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`wp-nav-button ${active === id ? 'active' : ''}`}
                onClick={() => {
                  onSelect(id);
                  setMobileOpen(false);
                }}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>
      </>
    );
  }

  return (
    <aside className={`wp-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed && (
          <div className="wp-sidebar-logo">
            <img
              src="/logo/iconlogo.png"
              alt="Logo"
              style={{ width: 36, height: 36, objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontWeight: 700 }}>WedBoardPro</div>
            </div>
          </div>
        )}
        <button type="button" className="wp-toggle" onClick={onToggle} aria-label="Toggle sidebar">
          <MenuLinesIcon />
        </button>
      </div>
      <nav className="wp-sidebar-menu">
        {visibleNavItems.map(({ id, label, icon: Icon }) => (
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
    </aside>
  );
};

export default Sidebar;
