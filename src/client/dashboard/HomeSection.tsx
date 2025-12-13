import React, { useEffect, useState, useCallback } from 'react';
import { listEvents, type Event } from '../api/eventsPipelineApi';
import { listTasks, type Task } from '../api/tasksApi';
import { getOrCreateDefaultPipeline, listDeals, getCrmMetrics, type CrmDealCard, type CrmMetrics } from '../api/crmApi';

interface HomeSectionProps {
  onNavigate: (section: string) => void;
  userName?: string;
}

// Types for dashboard data
interface DashboardData {
  // Work
  activeProjects: number;
  eventsThisWeek: number;
  recentEvents: Event[];
  // Tasks
  overdueTasks: number;
  tasksDueToday: number;
  urgentTasks: Task[];
  // CRM
  totalDeals: number;
  pipelineValue: number;
  recentDeals: CrmDealCard[];
  // Loading states
  loading: boolean;
  error: string | null;
}

const formatCurrency = (cents: number | null): string => {
  if (!cents) return '€0';
  return `€${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const isThisWeek = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return d >= weekStart && d < weekEnd;
};

const isOverdue = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
};

const isToday = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

const HomeSection: React.FC<HomeSectionProps> = ({ onNavigate, userName }) => {
  const [data, setData] = useState<DashboardData>({
    activeProjects: 0,
    eventsThisWeek: 0,
    recentEvents: [],
    overdueTasks: 0,
    tasksDueToday: 0,
    urgentTasks: [],
    totalDeals: 0,
    pipelineValue: 0,
    recentDeals: [],
    loading: true,
    error: null,
  });

  const fetchDashboardData = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch all data in parallel
      const [eventsRes, tasksRes, pipelineRes] = await Promise.all([
        listEvents(),
        listTasks(),
        getOrCreateDefaultPipeline(),
      ]);

      let activeProjects = 0;
      let eventsThisWeek = 0;
      let recentEvents: Event[] = [];

      if (eventsRes.data) {
        const events = eventsRes.data;
        activeProjects = events.filter((e) => e.status !== 'completed').length;
        eventsThisWeek = events.filter((e) => isThisWeek(e.wedding_date)).length;
        recentEvents = events
          .sort((a, b) => new Date(a.wedding_date).getTime() - new Date(b.wedding_date).getTime())
          .filter((e) => new Date(e.wedding_date) >= new Date())
          .slice(0, 4);
      }

      let overdueTasks = 0;
      let tasksDueToday = 0;
      let urgentTasks: Task[] = [];

      if (tasksRes.data) {
        const tasks = tasksRes.data.filter((t) => !t.is_completed);
        overdueTasks = tasks.filter((t) => isOverdue(t.due_date) && !isToday(t.due_date)).length;
        tasksDueToday = tasks.filter((t) => isToday(t.due_date)).length;
        urgentTasks = tasks
          .filter((t) => t.priority === 'high' || isOverdue(t.due_date))
          .sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          })
          .slice(0, 4);
      }

      let totalDeals = 0;
      let pipelineValue = 0;
      let recentDeals: CrmDealCard[] = [];

      if (pipelineRes.data) {
        const [dealsRes, metricsRes] = await Promise.all([
          listDeals(pipelineRes.data.id),
          getCrmMetrics(pipelineRes.data.id),
        ]);

        if (dealsRes.data) {
          recentDeals = dealsRes.data.slice(0, 4);
        }
        if (metricsRes.data) {
          totalDeals = metricsRes.data.totalDeals;
          pipelineValue = metricsRes.data.totalValueCents;
        }
      }

      setData({
        activeProjects,
        eventsThisWeek,
        recentEvents,
        overdueTasks,
        tasksDueToday,
        urgentTasks,
        totalDeals,
        pipelineValue,
        recentDeals,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load dashboard data',
      }));
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stats = [
    { label: 'Active Projects', value: data.activeProjects, color: '#0f172a' },
    { label: 'Events This Week', value: data.eventsThisWeek, color: '#3b82f6' },
    { label: 'Tasks Due Today', value: data.tasksDueToday, color: '#f59e0b' },
    { label: 'Overdue Tasks', value: data.overdueTasks, color: data.overdueTasks > 0 ? '#ef4444' : '#94a3b8' },
  ];

  return (
    <div className="home-dashboard">
      {/* Hero / Welcome Section */}
      <div className="wp-card">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Welcome, {userName || 'there'}</h2>
        </div>

        {/* KPI Stats Row */}
        <div className="stats-grid" style={{ marginTop: '20px' }}>
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <span className="stat-label">{stat.label}</span>
              <strong className="stat-value" style={{ color: stat.color }}>
                {data.loading ? '—' : stat.value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="home-grid">
        {/* Work Overview */}
        <div className="home-card">
          <div className="home-card-header">
            <h3>Work Overview</h3>
            <button type="button" className="wp-pill small" onClick={() => onNavigate('work')}>
              View All
            </button>
          </div>
          <div className="home-card-content">
            {data.loading ? (
              <div className="home-skeleton-list">
                <div className="home-skeleton-row" />
                <div className="home-skeleton-row" />
              </div>
            ) : data.recentEvents.length === 0 ? (
              <div className="home-empty">
                <p>No upcoming events yet.</p>
                <button type="button" className="wp-pill small primary" onClick={() => onNavigate('work')}>
                  Create Project
                </button>
              </div>
            ) : (
              <div className="home-list">
                {data.recentEvents.map((event) => (
                  <div key={event.id} className="home-list-item" onClick={() => onNavigate('work')}>
                    <div className="home-list-main">
                      <span className="home-list-title">{event.title}</span>
                      <span className="home-list-meta">{formatDate(event.wedding_date)}</span>
                    </div>
                    <span className={`home-status-badge status-${event.status}`}>
                      {event.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Preview */}
        <div className="home-card">
          <div className="home-card-header">
            <h3>Upcoming Events</h3>
            <button type="button" className="wp-pill small" onClick={() => onNavigate('calendar')}>
              Full Calendar
            </button>
          </div>
          <div className="home-card-content">
            {data.loading ? (
              <div className="home-skeleton-list">
                <div className="home-skeleton-row" />
                <div className="home-skeleton-row" />
              </div>
            ) : data.recentEvents.length === 0 ? (
              <div className="home-empty">
                <p>No events on the calendar.</p>
                <button type="button" className="wp-pill small primary" onClick={() => onNavigate('calendar')}>
                  Add Event
                </button>
              </div>
            ) : (
              <div className="home-list">
                {data.recentEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="home-list-item" onClick={() => onNavigate('calendar')}>
                    <div className="home-list-date">
                      <span className="home-date-day">{new Date(event.wedding_date).getDate()}</span>
                      <span className="home-date-month">
                        {new Date(event.wedding_date).toLocaleDateString(undefined, { month: 'short' })}
                      </span>
                    </div>
                    <div className="home-list-main">
                      <span className="home-list-title">{event.title}</span>
                      <span className="home-list-meta">{event.guest_count_expected || 0} guests expected</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CRM Snapshot */}
        <div className="home-card">
          <div className="home-card-header">
            <h3>CRM Pipeline</h3>
            <button type="button" className="wp-pill small" onClick={() => onNavigate('crm')}>
              Open CRM
            </button>
          </div>
          <div className="home-card-content">
            <div className="home-crm-stats">
              <div className="home-crm-stat">
                <span className="home-crm-value">{data.loading ? '—' : data.totalDeals}</span>
                <span className="home-crm-label">Active Deals</span>
              </div>
              <div className="home-crm-stat">
                <span className="home-crm-value">{data.loading ? '—' : formatCurrency(data.pipelineValue)}</span>
                <span className="home-crm-label">Pipeline Value</span>
              </div>
            </div>
            {!data.loading && data.recentDeals.length > 0 && (
              <div className="home-list compact">
                {data.recentDeals.slice(0, 3).map((deal) => (
                  <div key={deal.id} className="home-list-item" onClick={() => onNavigate('crm')}>
                    <span className="home-list-title">{deal.coupleNames || deal.title}</span>
                    <span className="home-list-meta">{formatCurrency(deal.value_cents)}</span>
                  </div>
                ))}
              </div>
            )}
            {!data.loading && data.recentDeals.length === 0 && (
              <div className="home-empty small">
                <p>No deals in pipeline.</p>
              </div>
            )}
          </div>
        </div>

        {/* Tasks & To-Do */}
        <div className="home-card">
          <div className="home-card-header">
            <h3>Tasks & To‑Dos</h3>
            <button type="button" className="wp-pill small" onClick={() => onNavigate('todo')}>
              All Tasks
            </button>
          </div>
          <div className="home-card-content">
            {data.loading ? (
              <div className="home-skeleton-list">
                <div className="home-skeleton-row" />
                <div className="home-skeleton-row" />
              </div>
            ) : data.urgentTasks.length === 0 ? (
              <div className="home-empty">
                <p>No urgent tasks. You're all caught up!</p>
                <button type="button" className="wp-pill small primary" onClick={() => onNavigate('todo')}>
                  Add Task
                </button>
              </div>
            ) : (
              <div className="home-list">
                {data.urgentTasks.map((task) => (
                  <div key={task.id} className="home-list-item" onClick={() => onNavigate('todo')}>
                    <div className="home-list-main">
                      <span className="home-list-title">{task.title}</span>
                      <span className={`home-list-meta ${isOverdue(task.due_date) ? 'overdue' : ''}`}>
                        {task.due_date ? formatDate(task.due_date) : 'No due date'}
                      </span>
                    </div>
                    <span className={`home-priority-badge priority-${task.priority}`}>{task.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Layouts */}
        <div className="home-card">
          <div className="home-card-header">
            <h3>Layouts</h3>
            <button type="button" className="wp-pill small" onClick={() => onNavigate('layouts')}>
              View All
            </button>
          </div>
          <div className="home-card-content">
            <div className="home-empty">
              <p>Create event layouts and floor plans.</p>
              <button type="button" className="wp-pill small primary" onClick={() => onNavigate('layouts')}>
                Create Layout
              </button>
            </div>
          </div>
        </div>

        {/* Suppliers */}
        <div className="home-card">
          <div className="home-card-header">
            <h3>Suppliers</h3>
            <button type="button" className="wp-pill small" onClick={() => onNavigate('suppliers')}>
              View All
            </button>
          </div>
          <div className="home-card-content">
            <div className="home-empty">
              <p>Manage vendors, contracts, and bookings.</p>
              <button type="button" className="wp-pill small primary" onClick={() => onNavigate('suppliers')}>
                Add Supplier
              </button>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="home-card">
          <div className="home-card-header">
            <h3>Chat</h3>
            <button type="button" className="wp-pill small" onClick={() => onNavigate('chat')}>
              Open Chat
            </button>
          </div>
          <div className="home-card-content">
            <div className="home-empty">
              <p>Message clients and team members.</p>
              <button type="button" className="wp-pill small primary" onClick={() => onNavigate('chat')}>
                Start Conversation
              </button>
            </div>
          </div>
        </div>

        {/* Teams */}
        <div className="home-card">
          <div className="home-card-header">
            <h3>Teams</h3>
            <button type="button" className="wp-pill small" onClick={() => onNavigate('teams')}>
              Open Teams
            </button>
          </div>
          <div className="home-card-content">
            <div className="home-empty">
              <p>Manage team members and assignments.</p>
              <button type="button" className="wp-pill small primary" onClick={() => onNavigate('teams')}>
                Manage Team
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeSection;
