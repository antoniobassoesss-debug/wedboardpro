import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard-layout.css';

type MenuItem = {
  id: string;
  label: string;
  icon: React.FC<{ active?: boolean }>;
  description: string;
};

const WorkIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 7h14a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <rect
      x="3"
      y="11"
      width="18"
      height="4"
      fill={active ? 'currentColor' : 'none'}
      opacity={active ? 0.2 : 0}
    />
  </svg>
);

const CalendarIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const LayoutIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="7" y="8" width="5" height="8" rx="1" fill="currentColor" opacity="0.2" />
    <rect x="13" y="8" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const QuotesIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M7 9h5M7 13h3M7 17h10"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const TodoIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 6l-1 1-1-1M9 12l-1 1-1-1M9 18l-1 1-1-1"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M13 6h5M13 12h5M13 18h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const MENU_ITEMS: MenuItem[] = [
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

interface SidebarItemProps {
  id: string;
  icon: React.FC<{ active?: boolean }>;
  label: string;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, isActive, collapsed, onClick }) => {
  return (
    <button
      className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className="sidebar-icon">
        <Icon active={isActive} />
      </span>
      <span className="sidebar-label">{label}</span>
    </button>
  );
};

interface SidebarProps {
  collapsed: boolean;
  activeId: string;
  onSelect: (id: string) => void;
  onToggle: () => void;
  mobileOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, activeId, onSelect, onToggle, mobileOpen }) => (
  <aside className={`dashboard-sidebar ${collapsed ? 'collapsed' : 'expanded'} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">{collapsed ? 'Menu' : 'Workspace'}</div>
        <button className="sidebar-toggle desktop-only" type="button" onClick={onToggle}>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      <div className="sidebar-items">
        {MENU_ITEMS.map((item) => (
          <SidebarItem
            key={item.id}
            id={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activeId === item.id}
            collapsed={collapsed}
            onClick={() => onSelect(item.id)}
          />
        ))}
      </div>
    </aside>
);

interface TopBarProps {
  title: string;
  onMobileMenu: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ title, onMobileMenu }) => (
  <header className="dashboard-topbar">
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button className="mobile-menu-btn" type="button" onClick={onMobileMenu}>
        ☰ Menu
      </button>
      <h1>{title}</h1>
    </div>
    <div className="topbar-actions">
      <div className="search-placeholder">Search or jump to…</div>
      <div className="topbar-avatar" style={{ width: 36, height: 36, borderRadius: '50%', background: '#e4e7ec' }} />
    </div>
  </header>
);

const HomeSection: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => (
  <div className="home-section">
    <div className="home-hero">
      <div>
        <p className="eyebrow">Workspace</p>
        <h2>Planning made calm</h2>
        <p>Create layouts, manage proposals, and keep every event under control in one single page.</p>
        <div className="home-actions">
          <button type="button" className="primary" onClick={() => onNavigate('layouts')}>
            Go to Layouts
          </button>
          <button type="button" className="ghost">
            Invite teammate
          </button>
        </div>
      </div>
      <div className="home-hero-panel">
        <div>Next Milestone</div>
        <strong>Launch summer venue library</strong>
        <p>Due in 4 days</p>
      </div>
    </div>
    <div className="stats-grid">
      {['Active Layouts', 'Signed Quotes', 'Upcoming Events', 'Tasks'].map((label, idx) => (
        <div key={label} className="stat-card">
          <span>{label}</span>
          <strong>{[12, 8, 5, 14][idx]}</strong>
        </div>
      ))}
    </div>
    <div className="timeline-card">
      <div>
        <p className="eyebrow">Today</p>
        <h3>Daily planning</h3>
      </div>
      <div className="timeline-list">
        {['Review ballroom layout', 'Send updated quote', 'Confirm AV vendor'].map((task) => (
          <div key={task} className="timeline-item">
            <span className="dot" />
            <p>{task}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LayoutsSection: React.FC = () => {
  const navigate = useNavigate();
  const recent = useMemo(() => ['Garden Gala', 'Corporate Launch', 'Winter Ball'], []);
  const saved = useMemo(() => ['Conference template', 'Banquet seating', 'Outdoor ceremony', 'Black tie ballroom'], []);
  return (
    <div className="layouts-section">
      <div className="layouts-header">
        <div>
          <p className="eyebrow">Layouts</p>
          <h2>Your layout library</h2>
        </div>
        <button type="button" onClick={() => navigate('/layout-maker')} className="primary ghost">
          Layout Maker
        </button>
      </div>
      <div className="layout-panels">
        <div className="layout-panel">
          <h3>Create New Layout</h3>
          <p>Start from a blank canvas or apply your templates.</p>
          <button type="button" onClick={() => navigate('/layout-maker')} className="primary">
            + New Layout
          </button>
        </div>
        <div className="layout-panel list">
          <h3>Recent</h3>
          <ul>
            {recent.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="layout-panel list">
          <h3>Saved Layouts</h3>
          <ul>
            {saved.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const DashboardLayout: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState<string>('home');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const activeItem = MENU_ITEMS.find((item) => item.id === activeSectionId) ?? MENU_ITEMS[0]!;

  const renderContent = () => {
    switch (activeItem.id) {
      case 'home':
        return <HomeSection onNavigate={setActiveSectionId} />;
      case 'layouts':
        return <LayoutsSection />;
      case 'work':
      case 'calendar':
      case 'quotes':
      case 'todo':
      default:
        return (
          <div className="placeholder-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <h2>{activeItem.label}</h2>
                <p style={{ color: '#475467', margin: 0 }}>{activeItem.description}</p>
              </div>
            </div>
            <div className="placeholder-grid" style={{ marginTop: '24px' }}>
              <div className="placeholder-tile">Widget</div>
              <div className="placeholder-tile">Widget</div>
              <div className="placeholder-tile">Widget</div>
            </div>
          </div>
        );
    }
  };

  const handleSelect = (id: string) => {
    setActiveSectionId(id);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="dashboard-shell">
      <div className="background-accent" />
      <Sidebar
        collapsed={isCollapsed}
        activeId={activeSectionId}
        onSelect={handleSelect}
        onToggle={() => setIsCollapsed((prev) => !prev)}
        mobileOpen={isMobileSidebarOpen}
      />
      <div
        className={`dashboard-overlay ${isMobileSidebarOpen ? 'visible' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />
      <main className="dashboard-main">
        <TopBar title={activeItem.label} onMobileMenu={() => setMobileSidebarOpen(true)} />
        <section className="dashboard-content">{renderContent()}</section>
      </main>
    </div>
  );
};

export default DashboardLayout;


