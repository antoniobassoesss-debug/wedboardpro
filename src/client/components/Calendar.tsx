import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../api/calendarEventsApi.js';
import type { CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput } from '../api/calendarEventsApi.js';
import { EventColorPicker } from './EventColorPicker.js';
import { EventSharingSection } from './EventSharingSection.js';

type CalendarView = 'month' | 'week';

type CalendarProps = {
  accountId: string;
  currentUserId?: string;
  weekStartsOn?: 'monday' | 'sunday';
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

const ChevronLeft: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

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

  const resolveColor = (evt: CalendarEvent): string => {
    if (evt.color && evt.color in EVENT_COLORS) return EVENT_COLORS[evt.color]!;
    if (evt.event_type in EVENT_COLORS) return EVENT_COLORS[evt.event_type]!;
    return EVENT_COLORS.default!;
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

  const isMobile = useIsMobile();

  const MobileCalendar: React.FC = () => {
    const [mobileSelectedDay, setMobileSelectedDay] = useState<string | null>(null);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    };

    const handlePrevMonth = () => setCurrentDate(addMonths(currentDate, -1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const daysForCurrentMonth = useMemo(() => {
      const start = startOfWeek(monthStart);
      return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    }, [monthStart]);

    return (
      <div className="wp-calendar-mobile">
        <div className="wp-calendar-mobile-header">
          <div className="wp-calendar-mobile-nav">
            <button className="wp-calendar-mobile-nav-left" onClick={handlePrevMonth}>
              <ChevronLeft />
            </button>
            <span className="wp-calendar-mobile-title">{formatMonthLabel(currentDate)}</span>
            <button className="wp-calendar-mobile-today" onClick={() => setCurrentDate(new Date())}>
              Today
            </button>
            <button className="wp-calendar-mobile-nav-right" onClick={handleNextMonth}>
              <ChevronRight />
            </button>
          </div>
          <div className="wp-calendar-mobile-view-toggle">
            <button
              className={`wp-calendar-mobile-view-btn ${view === 'month' ? 'active' : ''}`}
              onClick={() => setView('month')}
            >
              Month
            </button>
            <button
              className={`wp-calendar-mobile-view-btn ${view === 'week' ? 'active' : ''}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
          </div>
        </div>

        {view === 'month' ? (
          <>
            <div className="wp-calendar-mobile-grid">
              <div className="wp-calendar-mobile-weekdays">
                {weekDays.map((day) => (
                  <div key={day} className="wp-calendar-mobile-weekday">{day}</div>
                ))}
              </div>
              <div className="wp-calendar-mobile-days">
                {daysForCurrentMonth.map((date) => {
                  const dateStr = date.toISOString().slice(0, 10);
                  const dayEvents = eventsByDay.get(dateStr) || [];
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isDayToday = isToday(date);
                  const showEvents = dayEvents.slice(0, 2);
                  const moreCount = dayEvents.length - 2;

                  return (
                    <div
                      key={dateStr}
                      className={`wp-calendar-mobile-day ${isDayToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''} ${dayEvents.length > 0 ? 'has-events' : ''} ${mobileSelectedDay === dateStr ? 'selected' : ''}`}
                      onClick={() => {
                        handleOpenCreate(dateStr);
                        setMobileSelectedDay(dateStr);
                      }}
                    >
                      <span className="wp-calendar-mobile-day-num">{date.getDate()}</span>
                      {isCurrentMonth && dayEvents.length > 0 && (
                        <div className="wp-calendar-mobile-events">
                          {showEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className="wp-calendar-mobile-event"
                              style={{ background: resolveColor(ev) }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(ev);
                              }}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {moreCount > 0 && <div className="wp-calendar-mobile-more">+{moreCount}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {mobileSelectedDay && (
              <div className="wp-calendar-mobile-selected">
                <div className="wp-calendar-mobile-selected-header">
                  <span className="wp-calendar-mobile-selected-title">
                    {new Date(mobileSelectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                  <button
                    className="wp-calendar-mobile-selected-close"
                    onClick={() => setMobileSelectedDay(null)}
                  >
                    ×
                  </button>
                </div>
                {(eventsByDay.get(mobileSelectedDay) || []).length === 0 ? (
                  <div className="wp-calendar-mobile-empty">No events scheduled</div>
                ) : (
                  (eventsByDay.get(mobileSelectedDay) || []).map((ev) => (
                    <div
                      key={ev.id}
                      className="wp-calendar-mobile-event-card"
                      onClick={() => handleOpenEdit(ev)}
                    >
                      <div className="wp-calendar-mobile-event-color" style={{ background: resolveColor(ev) }} />
                      <div className="wp-calendar-mobile-event-info">
                        <div className="wp-calendar-mobile-event-title">{ev.title}</div>
                        <div className="wp-calendar-mobile-event-time">
                          {ev.all_day ? 'All day' : new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        ) : (
          <div className="wp-calendar-mobile-week-view">
            <div className="wp-calendar-mobile-week-header">
              {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => {
                const dStr = d.toISOString().slice(0, 10);
                const isDayToday = isToday(d);

                return (
                  <div
                    key={dStr}
                    className={`wp-calendar-mobile-week-day ${isDayToday ? 'today' : ''}`}
                    onClick={() => {
                      handleOpenCreate(dStr);
                      setMobileSelectedDay(dStr);
                    }}
                  >
                    <div className="wp-calendar-mobile-week-day-name">
                      {d.toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                    <div className="wp-calendar-mobile-week-day-num">{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="wp-calendar-mobile-hours">
              {hours.slice(0, 10).map((h) => {
                const dayKey = weekStart.toISOString().slice(0, 10);
                const dayEvents = eventsByDay.get(dayKey) || [];
                const hourEvents = dayEvents.filter((ev) => new Date(ev.start_at).getHours() === h);

                return (
                  <div key={h} className="wp-calendar-mobile-hour">
                    <div className="wp-calendar-mobile-hour-label">{String(h).padStart(2, '0')}:00</div>
                    <div className="wp-calendar-mobile-hour-events">
                      {hourEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="wp-calendar-mobile-hour-event"
                          style={{ background: resolveColor(ev) }}
                          onClick={() => handleOpenEdit(ev)}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          className="wp-calendar-mobile-fab"
          onClick={() => {
            handleOpenCreate(new Date().toISOString().slice(0, 10));
          }}
        >
          <PlusIcon />
        </button>

        <button
          type="button"
          className="wp-calendar-mobile-menu"
          onClick={() => window.dispatchEvent(new CustomEvent('wbp:toggle-mobile-menu'))}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Mobile Event Editor Modal */}
        {editorOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: '#fff',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid #e5e5e5',
            }}>
              <button
                onClick={() => setEditorOpen(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: 6,
                  marginLeft: -6,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {editorMode === 'create' ? 'New Event' : 'Edit Event'}
              </div>
              <div style={{ width: 36 }} />
            </div>

            {/* Form Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
                Title
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Event title"
                  style={{
                    borderRadius: 10,
                    border: '1px solid #e3e3e3',
                    padding: '10px 12px',
                    fontSize: 16,
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Details, notes, location…"
                  style={{
                    borderRadius: 10,
                    border: '1px solid #e3e3e3',
                    padding: '10px 12px',
                    fontSize: 16,
                    minHeight: 80,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
                Start
                <input
                  type="datetime-local"
                  value={form.start_at ? form.start_at.slice(0, 16) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const newStart = new Date(e.target.value).toISOString();
                      setForm((f) => ({
                        ...f,
                        start_at: newStart,
                        end_at: new Date(f.end_at) < new Date(newStart)
                          ? new Date(new Date(newStart).getTime() + 60 * 60 * 1000).toISOString()
                          : f.end_at,
                      }));
                    }
                  }}
                  style={{
                    borderRadius: 10,
                    border: '1px solid #e3e3e3',
                    padding: '10px 12px',
                    fontSize: 16,
                    outline: 'none',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
                End
                <input
                  type="datetime-local"
                  value={form.end_at ? form.end_at.slice(0, 16) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setForm((f) => ({
                        ...f,
                        end_at: new Date(e.target.value).toISOString(),
                      }));
                    }
                  }}
                  style={{
                    borderRadius: 10,
                    border: '1px solid #e3e3e3',
                    padding: '10px 12px',
                    fontSize: 16,
                    outline: 'none',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                />
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
                  Type
                  <select
                    value={form.event_type}
                    onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
                    style={{
                      borderRadius: 10,
                      border: '1px solid #e3e3e3',
                      padding: '10px 12px',
                      fontSize: 16,
                      background: '#fff',
                    }}
                  >
                    <option value="event">Event</option>
                    <option value="meeting">Meeting</option>
                    <option value="task">Task</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                    style={{
                      borderRadius: 10,
                      border: '1px solid #e3e3e3',
                      padding: '10px 12px',
                      fontSize: 16,
                      background: '#fff',
                    }}
                  >
                    <option value="planned">Planned</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
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

              <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.all_day}
                  onChange={(e) => setForm((f) => ({ ...f, all_day: e.target.checked }))}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                All day
              </label>

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
                    borderRadius: 10,
                    padding: '12px',
                    border: '1px solid #fee2e2',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: 8,
                  }}
                >
                  Delete Event
                </button>
              )}

              {editorError && (
                <div style={{ color: '#b91c1c', fontSize: 14, background: '#fee2e2', padding: 10, borderRadius: 8 }}>
                  {editorError}
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div style={{
              padding: '14px 16px',
              borderTop: '1px solid #e5e5e5',
            }}>
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
                  width: '100%',
                  borderRadius: 10,
                  padding: '12px',
                  border: 'none',
                  background: '#0c0c0c',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isMobile) {
    return <MobileCalendar />;
  }

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
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setCurrentDate(new Date())}
                style={{
                  borderRadius: 999,
                  border: 'none',
                  padding: '8px 16px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0f172a'}
              >
                Today
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() =>
                    setCurrentDate(view === 'month' ? addMonths(currentDate, -1) : addWeeks(currentDate, -1))
                  }
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    color: '#64748b',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#0f172a';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  ←
                </button>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: 15, 
                  color: '#0f172a',
                  minWidth: 180,
                  textAlign: 'center',
                }}>
                  {view === 'month' ? formatMonthLabel(currentDate) : formatWeekLabel(weekStart)}
                </div>
                <button
                  onClick={() => setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    color: '#64748b',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#0f172a';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  →
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, background: '#f8fafc', padding: 3, borderRadius: 999 }}>
              <button
                onClick={() => setView('month')}
                style={{
                  borderRadius: 999,
                  padding: '7px 16px',
                  border: 'none',
                  background: view === 'month' ? '#0f172a' : 'transparent',
                  color: view === 'month' ? '#ffffff' : '#64748b',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                style={{
                  borderRadius: 999,
                  padding: '7px 16px',
                  border: 'none',
                  background: view === 'week' ? '#0f172a' : 'transparent',
                  color: view === 'week' ? '#ffffff' : '#64748b',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
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
              gap: 16,
              flexWrap: 'wrap',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              padding: '14px 18px',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project</span>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                style={{ 
                  borderRadius: 999, 
                  border: '1px solid #e5e7eb', 
                  padding: '7px 36px 7px 14px', 
                  fontSize: 13,
                  fontWeight: 500,
                  background: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 150ms ease',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '14px',
                }}
              >
                <option value="all">All projects</option>
                <option value="project-1">Project 1</option>
                <option value="project-2">Project 2</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 250 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Event Types</span>
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
                        padding: '6px 14px',
                        border: 'none',
                        background: active ? '#0f172a' : '#f1f5f9',
                        color: active ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'all 150ms ease',
                        textTransform: 'capitalize',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = '#e2e8f0';
                          e.currentTarget.style.color = '#0f172a';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.color = '#64748b';
                        }
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 280 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</span>
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
                        padding: '6px 14px',
                        border: 'none',
                        background: active ? '#0f172a' : '#f1f5f9',
                        color: active ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'all 150ms ease',
                        textTransform: 'capitalize',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = '#e2e8f0';
                          e.currentTarget.style.color = '#0f172a';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.color = '#64748b';
                        }
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
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
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 24,
              width: 440,
              maxWidth: '90vw',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid #f1f5f9',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 4,
                  }}>
                    Schedule
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: '#0f172a', lineHeight: 1.3 }}>
                    {selectedDayLabel}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  style={{
                    border: 'none',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Events List */}
            <div style={{ padding: '8px 24px', flex: 1, overflowY: 'auto', maxHeight: '50vh' }}>
              {selectedDayEvents.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: 14,
                  padding: '40px 20px',
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px', opacity: 0.5 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <div style={{ fontWeight: 500 }}>No events scheduled</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Click below to add an event</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
                  {selectedDayEvents.map((ev) => {
                    const color = resolveColor(ev);
                    const statusColors = {
                      planned: { bg: '#f1f5f9', text: '#64748b' },
                      confirmed: { bg: '#dcfce7', text: '#16a34a' },
                      done: { bg: '#dbeafe', text: '#2563eb' },
                      cancelled: { bg: '#fee2e2', text: '#dc2626' },
                    } as const;
                    type StatusColorKey = keyof typeof statusColors;
                    const statusKey: StatusColorKey = (ev.status as StatusColorKey) || 'planned';
                    const statusColor = statusColors[statusKey] || statusColors.planned;

                    return (
                      <div
                        key={ev.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 16,
                          padding: 14,
                          display: 'flex',
                          gap: 14,
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          background: '#ffffff',
                        }}
                        onClick={() => handleOpenEdit(ev)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = color;
                          e.currentTarget.style.boxShadow = `0 4px 12px ${color}20`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Color indicator */}
                        <div style={{
                          width: 4,
                          borderRadius: 4,
                          background: color,
                          flexShrink: 0,
                        }} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{
                              fontWeight: 600,
                              fontSize: 15,
                              color: '#0f172a',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {ev.title}
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            fontSize: 13,
                            color: '#64748b',
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                              {new Date(ev.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              background: statusColor.bg,
                              color: statusColor.text,
                            }}>
                              {ev.status}
                            </span>
                          </div>

                          {ev.description && (
                            <div style={{
                              fontSize: 13,
                              color: '#64748b',
                              marginTop: 6,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {ev.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px 20px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafbfc',
            }}>
              <button
                onClick={() => {
                  if (selectedDay) handleOpenCreate(selectedDay);
                  setSelectedDay(null);
                }}
                style={{
                  width: '100%',
                  borderRadius: 12,
                  padding: '12px 16px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0f172a'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Event
              </button>
            </div>
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
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 120,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 440,
              maxWidth: '100%',
              background: '#ffffff',
              height: '100%',
              boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid #f1f5f9',
              background: '#fafbfc',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: form.color
                          ? EVENT_COLORS[form.color]
                          : EVENT_COLORS[form.event_type] || EVENT_COLORS.default,
                        flexShrink: 0,
                        boxShadow: `0 2px 8px ${form.color ? EVENT_COLORS[form.color] : EVENT_COLORS[form.event_type] || EVENT_COLORS.default}40`,
                      }}
                    />
                    <div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>
                      {editorMode === 'create' ? 'New Event' : 'Edit Event'}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b', marginTop: 6, marginLeft: 26 }}>
                    {new Date(form.start_at || Date.now()).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <button
                  onClick={() => setEditorOpen(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    cursor: 'pointer',
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ padding: '20px 28px 28px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Title
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Event title"
                    style={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      padding: '12px 14px',
                      fontSize: 15,
                      outline: 'none',
                      transition: 'all 150ms ease',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontWeight: 500,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0f172a';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Description
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Details, notes, location…"
                    style={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      padding: '12px 14px',
                      fontSize: 15,
                      minHeight: 100,
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'all 150ms ease',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontWeight: 500,
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0f172a';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Start
                    <input
                      type="datetime-local"
                      value={form.start_at ? form.start_at.slice(0, 16) : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const newStart = new Date(e.target.value).toISOString();
                          setForm((f) => ({
                            ...f,
                            start_at: newStart,
                            end_at: new Date(f.end_at) < new Date(newStart) 
                              ? new Date(new Date(newStart).getTime() + 60 * 60 * 1000).toISOString() 
                              : f.end_at,
                          }));
                        }
                      }}
                      style={{ 
                        borderRadius: 12, 
                        border: '1px solid #e2e8f0', 
                        padding: '12px 14px', 
                        fontSize: 15,
                        outline: 'none',
                        cursor: 'pointer',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: 500,
                        width: '100%',
                      }}
                    />
                  </label>
                </div>
                <div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    End
                    <input
                      type="datetime-local"
                      value={form.end_at ? form.end_at.slice(0, 16) : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          setForm((f) => ({
                            ...f,
                            end_at: new Date(e.target.value).toISOString(),
                          }));
                        }
                      }}
                      style={{ 
                        borderRadius: 12, 
                        border: '1px solid #e2e8f0', 
                        padding: '12px 14px', 
                        fontSize: 15,
                        outline: 'none',
                        cursor: 'pointer',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: 500,
                        width: '100%',
                      }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Type
                    <select
                      value={form.event_type}
                      onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
                      style={{ 
                        borderRadius: 12, 
                        border: '1px solid #e2e8f0', 
                        padding: '12px 14px', 
                        fontSize: 15,
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: 500,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="event">Event</option>
                      <option value="meeting">Meeting</option>
                      <option value="task">Task</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                </div>
                <div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                      style={{ 
                        borderRadius: 12, 
                        border: '1px solid #e2e8f0', 
                        padding: '12px 14px', 
                        fontSize: 15,
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: 500,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="planned">Planned</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="done">Done</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Color
                  <EventColorPicker
                    value={form.color}
                    onChange={(color) => setForm((f) => ({ ...f, color }))}
                    showAuto={true}
                  />
                </label>
              </div>

              <EventSharingSection
                currentUserId={currentUserId || accountId}
                visibility={form.visibility}
                sharedUserIds={sharedUserIds}
                onVisibilityChange={(vis) => setForm((f) => ({ ...f, visibility: vis }))}
                onSharedUsersChange={setSharedUserIds}
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500, color: '#0f172a', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.all_day}
                  onChange={(e) => setForm((f) => ({ ...f, all_day: e.target.checked }))}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#0f172a' }}
                />
                <span>All day event</span>
              </label>

              <div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Project
                  <select
                    value={form.project_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value || null }))}
                    style={{ 
                      borderRadius: 12, 
                      border: '1px solid #e2e8f0', 
                      padding: '12px 14px', 
                      fontSize: 15,
                      background: '#ffffff',
                      color: '#0f172a',
                      fontWeight: 500,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="">No project</option>
                    <option value="project-1">Project 1</option>
                    <option value="project-2">Project 2</option>
                  </select>
                </label>
              </div>

              {editorError && (
                <div style={{ 
                  color: '#dc2626', 
                  fontSize: 13, 
                  background: '#fef2f2', 
                  padding: '12px 14px', 
                  borderRadius: 10,
                  border: '1px solid #fee2e2',
                  fontWeight: 500,
                }}>
                  {editorError}
                </div>
              )}

              {/* Footer Actions */}
              <div style={{ 
                display: 'flex', 
                gap: 10, 
                marginTop: 8,
                paddingTop: 20,
                borderTop: '1px solid #f1f5f9',
              }}>
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
                      borderRadius: 12,
                      padding: '12px 18px',
                      border: '1px solid #fecaca',
                      background: '#ffffff',
                      color: '#dc2626',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
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
                  borderRadius: 12,
                  padding: '12px 24px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0f172a'}
              >
                {saving ? 'Saving...' : 'Save Event'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Calendar;

