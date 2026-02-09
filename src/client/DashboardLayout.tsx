import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboard-layout.css';
import {
  listLayoutsWithEvents,
  getOrCreateLayoutForEvent,
  isLayoutFileData,
  type LayoutRecord,
  type LayoutFileData,
} from './api/layoutsApi';
import { listEvents, type Event } from './api/eventsPipelineApi';

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
        <div className="sidebar-title desktop-only">{collapsed ? 'Menu' : 'Workspace'}</div>
        <button className="sidebar-close-btn" type="button" onClick={() => onSelect(activeId)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
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
  activeSectionId?: string;
}

const TopBar: React.FC<TopBarProps> = ({ title, onMobileMenu, activeSectionId }) => (
  <header className="dashboard-topbar">
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {activeSectionId !== 'chat' && (
        <button className="mobile-menu-btn" type="button" onClick={onMobileMenu} aria-label="Open menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}
      <h1>{title}</h1>
    </div>
    <div className="topbar-actions">
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

interface LayoutWithEvent extends LayoutRecord {
  event?: {
    id: string;
    title: string;
    wedding_date: string;
  };
}

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatWeddingDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const getTabCount = (layout: LayoutRecord): number => {
  if (isLayoutFileData(layout.canvas_data)) {
    return (layout.canvas_data as LayoutFileData).tabs.length;
  }
  return 1;
};

const getLayoutPreviewInfo = (layout: LayoutRecord): { tables: number; elements: number } => {
  if (isLayoutFileData(layout.canvas_data)) {
    const fileData = layout.canvas_data as LayoutFileData;
    let tables = 0;
    let elements = 0;
    fileData.tabs.forEach(tab => {
      const shapes = tab.canvas.shapes || [];
      tables += shapes.filter((s: any) => s.tableData).length;
      elements += shapes.length + (tab.canvas.walls?.length || 0);
    });
    return { tables, elements };
  }
  const shapes = layout.canvas_data.shapes || [];
  return {
    tables: shapes.filter((s: any) => s.tableData).length,
    elements: shapes.length + (layout.canvas_data.walls?.length || 0),
  };
};

const LayoutsSection: React.FC = () => {
  const navigate = useNavigate();
  const [layouts, setLayouts] = useState<LayoutWithEvent[]>([]);
  const [eventsWithoutLayout, setEventsWithoutLayout] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('[LayoutsSection] Loading layouts...');
      const layoutsResult = await listLayoutsWithEvents();
      console.log('[LayoutsSection] Layouts result:', layoutsResult);

      if (layoutsResult.data) {
        setLayouts(layoutsResult.data);
        console.log('[LayoutsSection] Loaded', layoutsResult.data.length, 'layouts');
        layoutsResult.data.forEach((l: any) => {
          console.log(`  - ${l.name}: event_id=${l.event_id}, event=${JSON.stringify(l.event)}`);
        });
      }

      const eventsResult = await listEvents();
      console.log('[LayoutsSection] Events result:', eventsResult);

      if (eventsResult.data && layoutsResult.data) {
        const eventIdsWithLayouts = new Set(
          layoutsResult.data.filter(l => l.event_id).map(l => l.event_id)
        );
        console.log('[LayoutsSection] Event IDs with layouts:', Array.from(eventIdsWithLayouts));

        const withoutLayout = eventsResult.data.filter(
          e => e.status !== 'completed' && !eventIdsWithLayouts.has(e.id)
        );
        setEventsWithoutLayout(withoutLayout);
        console.log('[LayoutsSection] Events without layouts:', withoutLayout.length);
      }
    } catch (err) {
      console.error('[LayoutsSection] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLayouts = useMemo(() => {
    if (!searchQuery.trim()) return layouts;
    const q = searchQuery.toLowerCase();
    return layouts.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.event?.title.toLowerCase().includes(q)
    );
  }, [layouts, searchQuery]);

  const handleOpenLayout = (layout: LayoutWithEvent) => {
    if (layout.event_id) {
      navigate(`/layout-maker?eventId=${layout.event_id}`);
    } else {
      navigate(`/layout-maker?layoutId=${layout.id}`);
    }
  };

  const handleSelectEvent = async (eventId: string, eventTitle: string) => {
    const result = await getOrCreateLayoutForEvent(eventId, eventTitle);
    if (result.data || !result.error) {
      navigate(`/layout-maker?eventId=${eventId}`);
    }
  };

  if (loading) {
    return (
      <div className="layouts-section">
        <div className="layouts-header">
          <div>
            <p className="eyebrow">Layouts</p>
            <h2>Your layouts</h2>
          </div>
        </div>
        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
          Loading layouts...
        </div>
      </div>
    );
  }

  return (
    <div className="layouts-section" style={{ paddingBottom: '80px' }}>
      <div className="layouts-header">
        <div>
          <p className="eyebrow">Layouts</p>
          <h2>Your layouts</h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/layout-maker')}
          className="primary ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M12 8v8M8 12h8" strokeLinecap="round" />
          </svg>
          Open Layout Maker
        </button>
      </div>

      {eventsWithoutLayout.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Events without layouts ({eventsWithoutLayout.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {eventsWithoutLayout.map((event) => (
              <div
                key={event.id}
                onClick={() => handleSelectEvent(event.id, event.title)}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M12 8v8M8 12h8" strokeLinecap="round" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {formatWeddingDate(event.wedding_date)}
                  </div>
                </div>
                <span style={{
                  padding: '6px 12px',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}>
                  Create
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredLayouts.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Layout Files ({filteredLayouts.length})
            </h3>
            <input
              type="text"
              placeholder="Search layouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '13px',
                width: '200px',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredLayouts.map((layout) => {
              const tabCount = getTabCount(layout);
              const { tables, elements } = getLayoutPreviewInfo(layout);

              return (
                <div
                  key={layout.id}
                  onClick={() => handleOpenLayout(layout)}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.12)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    height: '160px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '4px 10px',
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748b',
                    }}>
                      {tabCount} tab{tabCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                      {layout.event?.title || layout.name}
                    </div>
                    {layout.event?.wedding_date && (
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                        {formatWeddingDate(layout.event.wedding_date)}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                      <span>{tables} table{tables !== 1 ? 's' : ''}</span>
                      <span style={{ color: '#cbd5e1' }}>·</span>
                      <span>{elements} element{elements !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#94a3b8' }}>
                      Updated {formatDate(layout.updated_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {layouts.length === 0 && eventsWithoutLayout.length === 0 && (
        <div style={{ marginTop: '64px', textAlign: 'center', padding: '48px', background: '#f8fafc', borderRadius: '16px' }}>
          <div style={{ width: '64px', height: '64px', margin: '0 auto 20px', background: '#e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 8v8M8 12h8" strokeLinecap="round" />
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            No layouts yet
          </h3>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Create your first layout to start designing floor plans and seating arrangements.
          </p>
          <button
            type="button"
            onClick={() => navigate('/layout-maker')}
            className="primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 8v8M8 12h8" strokeLinecap="round" />
            </svg>
            Open Layout Maker
          </button>
        </div>
      )}
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
        <TopBar title={activeItem.label} onMobileMenu={() => setMobileSidebarOpen(true)} activeSectionId={activeSectionId} />
        <section className="dashboard-content">{renderContent()}</section>
      </main>
    </div>
  );
};

export default DashboardLayout;


