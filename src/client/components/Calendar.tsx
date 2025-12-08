import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../api/calendarEventsApi.js';
import type { CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput } from '../api/calendarEventsApi.js';
import { EventColorPicker } from './EventColorPicker.js';
import { EventSharingSection } from './EventSharingSection.js';

type CalendarView = 'month' | 'week';

type CalendarProps = {
  accountId: string;
  currentUserId?: string; // if omitted, falls back to accountId
  weekStartsOn?: 'monday' | 'sunday';
};

const EVENT_COLORS: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#2563eb',
  purple: '#8b5cf6',
  event: '#0c0c0c',
  meeting: '#2563eb',
  task: '#22c55e',
  other: '#6b7280',
  default: '#6b7280',
};

const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM - 19 PM

const startOfWeek = (d: Date, startsOn: 'monday' | 'sunday' = 'monday') => {
  const date = new Date(d);
  const offset = startsOn === 'monday' ? (date.getDay() + 6) % 7 : date.getDay();
  const day = offset;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (d: Date, n: number) => {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
};

const addMonths = (d: Date, n: number) => {
  const date = new Date(d);
  date.setMonth(date.getMonth() + n);
  return date;
};

const addWeeks = (d: Date, n: number) => addDays(d, n * 7);

const formatMonthLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const formatWeekLabel = (start: Date) => {
  const end = addDays(start, 6);
  const fmt = (x: Date) =>
    x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `Week of ${fmt(start)} – ${fmt(end)}`;
};

const iso = (d: Date) => d.toISOString();

function groupEventsByDay(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  events.forEach((evt) => {
    const day = evt.start_at.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(evt);
  });
  return map;
}

export function Calendar({ accountId, currentUserId, weekStartsOn = 'monday' }: CalendarProps) {
  const [weekStartSetting, setWeekStartSetting] = useState<'monday' | 'sunday'>(weekStartsOn);
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    start_at: string;
    end_at: string;
    all_day: boolean;
    event_type: string;
    status: 'planned' | 'confirmed' | 'done' | 'cancelled';
    project_id: string | null;
    color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | null;
    visibility: 'private' | 'team' | 'custom';
  }>({
    title: '',
    description: '',
    start_at: '',
    end_at: '',
    all_day: false,
    event_type: 'event',
    status: 'planned',
    project_id: null,
    color: null,
    visibility: 'private',
  });
  const [sharedUserIds, setSharedUserIds] = useState<string[]>([]);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [showWeekends, setShowWeekends] = useState(true);

  const monthStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const weekStart = useMemo(() => startOfWeek(currentDate, weekStartSetting), [currentDate, weekStartSetting]);

  const visibleRange = useMemo(() => {
    if (view === 'month') {
      const start = startOfWeek(monthStart);
      const end = addDays(start, 41); // 6 weeks
      return { from: start, to: end };
    }
    const start = weekStart;
    const end = addDays(start, 6);
    return { from: start, to: end };
  }, [view, monthStart, weekStart]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    const userIdForVisibility = currentUserId || accountId;
    const { data, error } = await listCalendarEvents({
      accountId,
      currentUserId: userIdForVisibility,
      from: iso(visibleRange.from),
      to: iso(addDays(visibleRange.to, 1)), // inclusive
      projectId: projectFilter !== 'all' ? projectFilter : null,
      ...(typeFilter.size ? { eventTypes: Array.from(typeFilter) } : {}),
      ...(statusFilter.size ? { statuses: Array.from(statusFilter) } : {}),
    });
    if (error) {
      setError(error);
      setEvents([]);
    } else {
      setEvents(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [accountId, visibleRange.from.getTime(), visibleRange.to.getTime()]);

  const daysForMonth = useMemo(() => {
    const start = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [monthStart]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (projectFilter !== 'all' && ev.project_id !== projectFilter) return false;
      if (typeFilter.size && !typeFilter.has(ev.event_type)) return false;
      if (statusFilter.size && !statusFilter.has(ev.status)) return false;
      return true;
    });
  }, [events, projectFilter, typeFilter, statusFilter]);

  const eventsByDay = useMemo(() => groupEventsByDay(filteredEvents), [filteredEvents]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return [...filteredEvents]
      .filter((e) => new Date(e.end_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 5);
  }, [filteredEvents]);

  const handleOpenCreate = (dayKey: string, startHour?: number) => {
    const start = new Date(dayKey);
    if (startHour !== undefined) {
      start.setHours(startHour, 0, 0, 0);
    }
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setForm({
      title: '',
      description: '',
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: false,
      event_type: 'event',
      status: 'planned',
      project_id: null,
      color: null,
      visibility: 'private',
    });
    setSharedUserIds([]);
    setEditingEvent(null);
    setEditorMode('create');
    setEditorError(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (evt: CalendarEvent) => {
    setForm({
      title: evt.title,
      description: evt.description ?? '',
      start_at: evt.start_at,
      end_at: evt.end_at,
      all_day: evt.all_day,
      event_type: evt.event_type,
      status: (evt.status as any) ?? 'planned',
      project_id: evt.project_id ?? null,
      color: (evt.color as any) ?? null,
      visibility: (evt.visibility as any) ?? 'private',
    });
    setSharedUserIds([]);
    setEditingEvent(evt);
    setEditorMode('edit');
    setEditorError(null);
    setEditorOpen(true);
  };

  const resolveColor = (evt: CalendarEvent) => {
    if (evt.color && EVENT_COLORS[evt.color]) return EVENT_COLORS[evt.color];
    return EVENT_COLORS[evt.event_type] || EVENT_COLORS.default;
  };

  const getSharingLabel = (evt: CalendarEvent): string => {
    const vis: 'private' | 'team' | 'custom' = (evt.visibility || 'private') as 'private' | 'team' | 'custom';
    if (vis === 'team') return 'Shared with team';
    if (vis === 'custom') return 'Shared with specific people';
    return 'Private';
  };

  const renderEventPill = (evt: CalendarEvent, showTooltip = false) => {
    const color = resolveColor(evt);
    const isShared = evt.visibility === 'team' || evt.visibility === 'custom';
    const timeStr = evt.all_day
      ? 'All day'
      : `${new Date(evt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const tooltipText = showTooltip
      ? `${evt.title}\n${timeStr}\n${evt.color ? evt.color.charAt(0).toUpperCase() + evt.color.slice(1) : 'Auto'} • ${getSharingLabel(evt)}`
      : evt.title;

    return (
      <div
        key={evt.id}
        style={{
          background: color,
          color: '#fff',
          borderRadius: 8,
          padding: '2px 6px',
          fontSize: 12,
          marginBottom: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          position: 'relative',
          borderLeft: `3px solid ${color}`,
          paddingLeft: '8px',
        }}
        title={tooltipText}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.title}</span>
          {isShared && (
            <span
              style={{
                fontSize: 10,
                opacity: 0.9,
                display: 'flex',
                alignItems: 'center',
              }}
              title={getSharingLabel(evt)}
            >
              👥
            </span>
          )}
        </div>
      </div>
    );
  };

  const DayCell = ({ date }: { date: Date }) => {
    const dayKey = date.toISOString().slice(0, 10);
    const dayEvents = eventsByDay.get(dayKey) || [];
    const maxShown = 3;
    const moreCount = Math.max(0, dayEvents.length - maxShown);
    const shown = dayEvents.slice(0, maxShown);
    const isCurrentMonth = date.getMonth() === monthStart.getMonth();
    const isToday = dayKey === new Date().toISOString().slice(0, 10);

    return (
      <div
        onClick={() => handleOpenCreate(dayKey)}
        style={{
          border: '1px solid #e5e5e5',
          padding: 10,
          minHeight: 110,
          background: isCurrentMonth ? '#fff' : '#fafafa',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: isToday ? '#0c0c0c' : 'transparent',
              color: isToday ? '#fff' : '#0c0c0c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            {date.getDate()}
          </div>
          <div style={{ fontSize: 11, color: '#7c7c7c' }}>
            {date.toLocaleDateString(undefined, { weekday: 'short' })}
          </div>
        </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {shown.map((evt) => renderEventPill(evt, true))}
              {moreCount > 0 && (
                <div style={{ fontSize: 12, color: '#6b6b6b' }}>+{moreCount} more</div>
              )}
            </div>
      </div>
    );
  };

type MonthGridViewProps = {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  onDayClick: (dayKey: string) => void;
  onEventClick: (ev: CalendarEvent) => void;
  resolveColor: (ev: CalendarEvent) => string;
  getSharingLabel: (ev: CalendarEvent) => string;
};

const MonthGridView: React.FC<MonthGridViewProps> = ({
  days,
  eventsByDay,
  onDayClick,
  onEventClick,
  resolveColor,
  getSharingLabel,
}) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthIdx =
    days.length > 0 && days[Math.min(14, days.length - 1)]
      ? days[Math.min(14, days.length - 1)]!.getMonth()
      : new Date().getMonth();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
      {days.map((date) => {
        const dayKey = date.toISOString().slice(0, 10);
        const dayEvents = eventsByDay.get(dayKey) || [];
        const maxShown = 3;
        const moreCount = Math.max(0, dayEvents.length - maxShown);
        const shown = dayEvents.slice(0, maxShown);
        const isCurrentMonth = date.getMonth() === monthIdx;
        const isToday = dayKey === todayKey;
        return (
          <div
            key={dayKey}
            onClick={() => onDayClick(dayKey)}
            style={{
              border: '1px solid #e5e5e5',
              borderRadius: 16,
              padding: 10,
              minHeight: 110,
              background: isCurrentMonth ? '#fff' : '#fafafa',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: isToday ? '#0c0c0c' : 'transparent',
                  color: isToday ? '#fff' : '#0c0c0c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  opacity: isCurrentMonth ? 1 : 0.55,
                }}
              >
                {date.getDate()}
              </div>
              <div style={{ fontSize: 11, color: '#7c7c7c' }}>
                {date.toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {shown.map((evt) => {
                const color = resolveColor(evt);
                const isShared = evt.visibility === 'team' || evt.visibility === 'custom';
                const timeStr = evt.all_day
                  ? 'All day'
                  : `${new Date(evt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                const tooltipText = `${evt.title}\n${timeStr}\n${evt.color ? evt.color.charAt(0).toUpperCase() + evt.color.slice(1) : 'Auto'} • ${getSharingLabel(evt)}`;
                return (
                  <div
                    key={evt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(evt);
                    }}
                    style={{
                      background: color,
                      color: '#fff',
                      borderRadius: 8,
                      padding: '2px 6px',
                      fontSize: 12,
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      position: 'relative',
                      borderLeft: `3px solid ${color}`,
                      paddingLeft: '8px',
                    }}
                    title={tooltipText}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.title}</span>
                      {isShared && (
                        <span style={{ fontSize: 10, opacity: 0.9 }} title={getSharingLabel(evt)}>
                          👥
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {moreCount > 0 && <div style={{ fontSize: 12, color: '#6b6b6b' }}>+{moreCount} more</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

type WeekViewProps = {
  weekStart: Date;
  showWeekends: boolean;
  eventsByDay: Map<string, CalendarEvent[]>;
  onEventClick: (ev: CalendarEvent) => void;
  resolveColor: (ev: CalendarEvent) => string;
  getSharingLabel: (ev: CalendarEvent) => string;
};

const WeekView: React.FC<WeekViewProps> = ({
  weekStart,
  showWeekends,
  eventsByDay,
  onEventClick,
  resolveColor,
  getSharingLabel,
}) => {
  const rawDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const days = showWeekends ? rawDays : rawDays.filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', minHeight: 500 }}>
      <div />
      {days.map((d) => (
        <div
          key={d.toISOString()}
          style={{
            borderBottom: '1px solid #e5e5e5',
            padding: '8px 6px',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      ))}
      {hours.map((h) => (
        <React.Fragment key={h}>
          <div
            style={{
              borderTop: '1px solid #f0f0f0',
              padding: '4px 6px',
              fontSize: 12,
              color: '#7c7c7c',
            }}
          >
            {String(h).padStart(2, '0')}:00
          </div>
          {days.map((d) => {
            const dayKey = d.toISOString().slice(0, 10);
            const dayEvents = eventsByDay.get(dayKey) || [];
            const hourEvents = dayEvents.filter((ev) => {
              const evStart = new Date(ev.start_at);
              return evStart.getHours() === h;
            });
            return (
              <div
                key={`${dayKey}-${h}`}
                style={{
                  borderTop: '1px solid #f5f5f5',
                  borderLeft: '1px solid #f5f5f5',
                  minHeight: 60,
                  padding: 4,
                  position: 'relative',
                  background: '#fff',
                }}
              >
                {hourEvents.map((ev) => {
                  const color = resolveColor(ev);
                  const height = Math.max(
                    28,
                    Math.min(120, (new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime()) / (1000 * 60)),
                  );
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(ev);
                      }}
                      title={ev.title}
                      style={{
                        position: 'absolute',
                        left: 4,
                        right: 4,
                        top: 2,
                        height,
                        background: color,
                        color: '#fff',
                        borderRadius: 10,
                        padding: '4px 8px',
                        fontSize: 12,
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                        cursor: 'pointer',
                      }}
                    >
                      {ev.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

  const selectedDayDate = useMemo(() => (selectedDay ? new Date(selectedDay) : null), [selectedDay]);
  const selectedDayKey = selectedDay ?? '';
  const selectedDayEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : [];
  const selectedDayLabel = selectedDayDate
    ? selectedDayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  return (
    <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Top Bar + Filters */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              justifyContent: 'space-between',
              padding: '8px 4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setCurrentDate(new Date())}
                style={{
                  borderRadius: 999,
                  border: '1px solid #e3e3e3',
                  padding: '8px 14px',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Today
              </button>
              <button
                onClick={() =>
                  setCurrentDate(view === 'month' ? addMonths(currentDate, -1) : addWeeks(currentDate, -1))
                }
                style={{
                  borderRadius: 999,
                  border: '1px solid #e3e3e3',
                  padding: '8px 12px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                ←
              </button>
              <button
                onClick={() => setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))}
                style={{
                  borderRadius: 999,
                  border: '1px solid #e3e3e3',
                  padding: '8px 12px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                →
              </button>
              <div style={{ fontWeight: 700, fontSize: 18, marginLeft: 8 }}>
                {view === 'month' ? formatMonthLabel(currentDate) : formatWeekLabel(weekStart)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setView('month')}
                style={{
                  borderRadius: 999,
                  padding: '8px 14px',
                  border: view === 'month' ? '1px solid #0c0c0c' : '1px solid #e3e3e3',
                  background: view === 'month' ? '#0c0c0c' : '#fff',
                  color: view === 'month' ? '#fff' : '#0c0c0c',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                style={{
                  borderRadius: 999,
                  padding: '8px 14px',
                  border: view === 'week' ? '1px solid #0c0c0c' : '1px solid #e3e3e3',
                  background: view === 'week' ? '#0c0c0c' : '#fff',
                  color: view === 'week' ? '#fff' : '#0c0c0c',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Week
              </button>
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              background: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: 16,
              padding: 12,
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
              <span style={{ fontSize: 12, color: '#7c7c7c' }}>Project</span>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                style={{ borderRadius: 10, border: '1px solid #e3e3e3', padding: '8px 10px', fontSize: 13 }}
              >
                <option value="all">All projects</option>
                <option value="project-1">Project 1</option>
                <option value="project-2">Project 2</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#7c7c7c' }}>Event type</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['event', 'meeting', 'task', 'other'].map((t) => {
                  const active = typeFilter.has(t);
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setTypeFilter((prev) => {
                          const next = new Set(prev);
                          if (next.has(t)) next.delete(t);
                          else next.add(t);
                          return next;
                        });
                      }}
                      style={{
                        borderRadius: 999,
                        padding: '6px 10px',
                        border: active ? '1px solid #0c0c0c' : '1px solid #e3e3e3',
                        background: active ? '#0c0c0c' : '#fff',
                        color: active ? '#fff' : '#0c0c0c',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#7c7c7c' }}>Status</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['planned', 'confirmed', 'done', 'cancelled'].map((s) => {
                  const active = statusFilter.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter((prev) => {
                          const next = new Set(prev);
                          if (next.has(s)) next.delete(s);
                          else next.add(s);
                          return next;
                        });
                      }}
                      style={{
                        borderRadius: 999,
                        padding: '6px 10px',
                        border: active ? '1px solid #0c0c0c' : '1px solid #e3e3e3',
                        background: active ? '#0c0c0c' : '#fff',
                        color: active ? '#fff' : '#0c0c0c',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
              <label style={{ fontSize: 12, color: '#0c0c0c', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={weekStartSetting === 'sunday'}
                  onChange={(e) => setWeekStartSetting(e.target.checked ? 'sunday' : 'monday')}
                />
                Week starts on Sunday
              </label>
              <label style={{ fontSize: 12, color: '#0c0c0c', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={showWeekends} onChange={(e) => setShowWeekends(e.target.checked)} />
                Show weekends
              </label>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 20, padding: 16 }}>
          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: 10,
                borderRadius: 10,
                background: '#fee2e2',
                color: '#b91c1c',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
          {loading && events.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#7c7c7c', padding: 40 }}>Loading events…</div>
          ) : view === 'month' ? (
            <MonthGridView
              days={daysForMonth}
              eventsByDay={eventsByDay}
              onDayClick={(dayKey) => handleOpenCreate(dayKey)}
              onEventClick={handleOpenEdit}
              resolveColor={resolveColor}
              getSharingLabel={getSharingLabel}
            />
          ) : (
            <WeekView
              weekStart={weekStart}
              showWeekends={showWeekends}
              eventsByDay={eventsByDay}
              onEventClick={handleOpenEdit}
              resolveColor={resolveColor}
              getSharingLabel={getSharingLabel}
            />
          )}
        </div>
      </div>

      {/* Upcoming list */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e5e5',
          borderRadius: 20,
          padding: 16,
          minHeight: 200,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Today / Upcoming</div>
        {upcomingEvents.length === 0 ? (
          <div style={{ color: '#7c7c7c', fontSize: 13 }}>No upcoming events.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcomingEvents.map((ev) => {
              const color = EVENT_COLORS[ev.event_type] || EVENT_COLORS.default;
              return (
                <div
                  key={ev.id}
                  style={{
                    border: '1px solid #e5e5e5',
                    borderRadius: 12,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                      }}
                    />
                    <div style={{ fontWeight: 600 }}>{ev.title}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    {new Date(ev.start_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 12, color: '#7c7c7c' }}>{ev.status}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

      {/* Day modal/panel */}
      {selectedDay && (
        <div
          onClick={() => setSelectedDay(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: 24,
              width: 420,
              maxWidth: '90vw',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {selectedDayLabel}
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                style={{
                  border: '1px solid #e3e3e3',
                  borderRadius: 999,
                  padding: '6px 10px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto' }}>
              {selectedDayEvents.map((ev) => {
                const color = resolveColor(ev);
                return (
                  <div
                    key={ev.id}
                    style={{
                      border: '1px solid #e5e5e5',
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: color,
                        }}
                      />
                      <div style={{ fontWeight: 600 }}>{ev.title}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#555' }}>
                      {new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {new Date(ev.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {ev.description && <div style={{ fontSize: 13, color: '#555' }}>{ev.description}</div>}
                  </div>
                );
              })}
              {selectedDayEvents.length === 0 && (
                <div style={{ textAlign: 'center', color: '#7c7c7c', fontSize: 14 }}>No events yet for this day.</div>
              )}
            </div>
            <button
              onClick={() => {
                if (selectedDay) handleOpenCreate(selectedDay);
                setSelectedDay(null);
              }}
              style={{
                borderRadius: 999,
                padding: '10px 16px',
                border: 'none',
                background: '#0c0c0c',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              New event
            </button>
          </div>
        </div>
      )}

      {/* Event Editor Side Sheet */}
      {editorOpen && (
        <div
          onClick={() => setEditorOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 120,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 420,
              maxWidth: '90vw',
              background: '#fff',
              height: '100%',
              padding: 20,
              boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: form.color
                        ? EVENT_COLORS[form.color]
                        : EVENT_COLORS[form.event_type] || EVENT_COLORS.default,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {editorMode === 'create' ? 'New Event' : 'Edit Event'}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#7c7c7c', marginTop: 4 }}>
                  {new Date(form.start_at || Date.now()).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
              <button
                onClick={() => setEditorOpen(false)}
                style={{
                  border: '1px solid #e3e3e3',
                  borderRadius: 999,
                  padding: '6px 10px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Event title"
                style={{
                  borderRadius: 12,
                  border: '1px solid #e3e3e3',
                  padding: '10px 12px',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Details, notes, location…"
                style={{
                  borderRadius: 12,
                  border: '1px solid #e3e3e3',
                  padding: '10px 12px',
                  fontSize: 14,
                  minHeight: 80,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                Start
                <input
                  type="datetime-local"
                  value={form.start_at ? form.start_at.slice(0, 16) : ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      start_at: e.target.value ? new Date(e.target.value).toISOString() : f.start_at,
                    }))
                  }
                  style={{ borderRadius: 12, border: '1px solid #e3e3e3', padding: '10px 12px', fontSize: 14 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                End
                <input
                  type="datetime-local"
                  value={form.end_at ? form.end_at.slice(0, 16) : ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      end_at: e.target.value ? new Date(e.target.value).toISOString() : f.end_at,
                    }))
                  }
                  style={{ borderRadius: 12, border: '1px solid #e3e3e3', padding: '10px 12px', fontSize: 14 }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                Type
                <select
                  value={form.event_type}
                  onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
                  style={{ borderRadius: 12, border: '1px solid #e3e3e3', padding: '10px 12px', fontSize: 14 }}
                >
                  <option value="event">Event</option>
                  <option value="meeting">Meeting</option>
                  <option value="task">Task</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                  style={{ borderRadius: 12, border: '1px solid #e3e3e3', padding: '10px 12px', fontSize: 14 }}
                >
                  <option value="planned">Planned</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Color
              <EventColorPicker
                value={form.color}
                onChange={(color) => setForm((f) => ({ ...f, color }))}
                showAuto={true}
              />
            </label>

            <EventSharingSection
              currentUserId={currentUserId || accountId}
              visibility={form.visibility}
              sharedUserIds={sharedUserIds}
              onVisibilityChange={(vis) => setForm((f) => ({ ...f, visibility: vis }))}
              onSharedUsersChange={setSharedUserIds}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={form.all_day}
                onChange={(e) => setForm((f) => ({ ...f, all_day: e.target.checked }))}
              />
              All day
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Project (placeholder)
              <select
                value={form.project_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value || null }))}
                style={{ borderRadius: 12, border: '1px solid #e3e3e3', padding: '10px 12px', fontSize: 14 }}
              >
                <option value="">No project</option>
                <option value="project-1">Project 1</option>
                <option value="project-2">Project 2</option>
              </select>
            </label>

            {editorError && (
              <div style={{ color: '#b91c1c', fontSize: 13, background: '#fee2e2', padding: 8, borderRadius: 10 }}>
                {editorError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {editorMode === 'edit' && editingEvent && (
                <button
                  onClick={async () => {
                    if (!editingEvent) return;
                    setSaving(true);
                    const { error } = await deleteCalendarEvent(editingEvent.id);
                    setSaving(false);
                    if (error) {
                      setEditorError(error);
                      return;
                    }
                    setEditorOpen(false);
                    await fetchEvents();
                  }}
                  style={{
                    borderRadius: 999,
                    padding: '10px 14px',
                    border: '1px solid #e3e3e3',
                    background: '#fff',
                    color: '#0c0c0c',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button
                onClick={async () => {
                  if (!form.title.trim()) {
                    setEditorError('Title is required');
                    return;
                  }
                  if (new Date(form.end_at).getTime() <= new Date(form.start_at).getTime()) {
                    setEditorError('End time must be after start time');
                    return;
                  }
                  setSaving(true);
                  setEditorError(null);
                  if (editorMode === 'create') {
                    const payload: CreateCalendarEventInput = {
                      account_id: accountId,
                      created_by: currentUserId || accountId,
                      title: form.title.trim(),
                      description: form.description.trim() || null,
                      start_at: form.start_at,
                      end_at: form.end_at,
                      all_day: form.all_day,
                      event_type: form.event_type,
                      project_id: form.project_id,
                      status: form.status,
                      color: form.color,
                      visibility: form.visibility,
                      ...(form.visibility === 'custom' && sharedUserIds.length > 0 ? { shared_user_ids: sharedUserIds } : {}),
                    };
                    const { error } = await createCalendarEvent(payload);
                    if (error) {
                      setEditorError(error);
                      setSaving(false);
                      return;
                    }
                  } else if (editingEvent) {
                    const payload: UpdateCalendarEventInput = {
                      currentUserId: currentUserId || accountId,
                      title: form.title.trim(),
                      description: form.description.trim() || null,
                      start_at: form.start_at,
                      end_at: form.end_at,
                      all_day: form.all_day,
                      event_type: form.event_type,
                      project_id: form.project_id,
                      status: form.status,
                      color: form.color,
                      visibility: form.visibility,
                      ...(form.visibility === 'custom' && sharedUserIds.length > 0 ? { shared_user_ids: sharedUserIds } : {}),
                    };
                    const { error } = await updateCalendarEvent(editingEvent.id, payload);
                    if (error) {
                      setEditorError(error);
                      setSaving(false);
                      return;
                    }
                  }
                  setSaving(false);
                  setEditorOpen(false);
                  await fetchEvents();
                }}
                style={{
                  borderRadius: 999,
                  padding: '10px 16px',
                  border: 'none',
                  background: '#0c0c0c',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minWidth: 100,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Calendar;

