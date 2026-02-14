import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './BeautifulCalendar.css';
import { listCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../api/calendarEventsApi.js';
import type { CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput } from '../api/calendarEventsApi.js';

type CalendarViewMode = 'month' | 'week' | 'list';

type CalendarProps = {
  accountId: string;
  currentUserId?: string;
  weekStartsOn?: 'monday' | 'sunday';
  openEditorTrigger?: number;
};

export function BeautifulCalendar({ accountId, currentUserId, weekStartsOn = 'monday', openEditorTrigger }: CalendarProps) {
  const [view, setView] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    all_day: boolean;
    event_type: string;
    status: 'planned' | 'confirmed' | 'done' | 'cancelled';
    color: string | null;
  }>({
    title: '',
    description: '',
    start_date: formatDateKey(new Date()),
    start_time: '09:00',
    end_date: formatDateKey(new Date()),
    end_time: '10:00',
    all_day: false,
    event_type: 'event',
    status: 'planned',
    color: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayKey = formatDateKey(new Date());

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const monthStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const startDay = weekStartsOn === 'monday' ? (firstDayOfMonth + 6) % 7 : firstDayOfMonth;

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(addDays(monthStart, -i - 1));
    }
    for (let i = 0; i < daysInMonth; i++) {
      days.push(addDays(monthStart, i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(addDays(addMonths(monthStart, 1), i - 1));
    }
    return days;
  }, [monthStart, daysInMonth, startDay]);

  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((e) => new Date(e.start_at) >= new Date())
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 8);
  }, [events]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listCalendarEvents({
      accountId,
      currentUserId: currentUserId || accountId,
    });
    if (error) {
      console.error('Failed to fetch events:', error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, [accountId, currentUserId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (openEditorTrigger) {
      handleOpenCreate();
    }
  }, [openEditorTrigger]);

  const resolveColor = (evt: CalendarEvent): string => {
    if (evt.color && evt.color in EVENT_COLORS) {
      const key = evt.color as keyof typeof EVENT_COLORS;
      return EVENT_COLORS[key]!;
    }
    const eventType = (evt.event_type || 'other') as keyof typeof EVENT_COLORS;
    return EVENT_COLORS[eventType]!;
  };

  const getStatusConfig = (status: string): { label: string; color: string; bg: string } => {
    const configs = {
      planned: { label: 'Planned', color: '#6b7280', bg: '#f3f4f6' },
      confirmed: { label: 'Confirmed', color: '#16a34a', bg: '#ecfdf5' },
      done: { label: 'Done', color: '#2563eb', bg: '#eff6ff' },
      cancelled: { label: 'Cancelled', color: '#dc2626', bg: '#fef2f2' },
    } as const;
    const key = status as keyof typeof configs;
    return configs[key] ?? configs.planned;
  };

  const handleOpenCreate = (dayKey?: string) => {
    const date = dayKey || formatDateKey(new Date());
    setForm({
      title: '',
      description: '',
      start_date: date,
      start_time: '09:00',
      end_date: date,
      end_time: '10:00',
      all_day: false,
      event_type: 'event',
      status: 'planned',
      color: null,
    });
    setEditorMode('create');
    setSelectedEvent(null);
    setError(null);
    setShowEditor(true);
  };

  const handleOpenEdit = (evt: CalendarEvent) => {
    const start = new Date(evt.start_at);
    const end = new Date(evt.end_at);
    setForm({
      title: evt.title,
      description: evt.description || '',
      start_date: formatDateKey(start),
      start_time: start.toTimeString().slice(0, 5),
      end_date: formatDateKey(end),
      end_time: end.toTimeString().slice(0, 5),
      all_day: evt.all_day,
      event_type: evt.event_type,
      status: evt.status as any,
      color: evt.color || null,
    });
    setEditorMode('edit');
    setSelectedEvent(evt);
    setError(null);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    const startAt = form.all_day
      ? `${form.start_date}T00:00:00`
      : `${form.start_date}T${form.start_time}:00`;
    const endAt = form.all_day
      ? `${form.end_date}T23:59:59`
      : `${form.end_date}T${form.end_time}:00`;

    if (editorMode === 'create') {
      const payload: CreateCalendarEventInput = {
        account_id: accountId,
        created_by: currentUserId || accountId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_at: startAt,
        end_at: endAt,
        all_day: form.all_day,
        event_type: form.event_type,
        status: form.status,
        color: form.color as 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | null,
        visibility: 'private',
      };
      const { error } = await createCalendarEvent(payload);
      if (error) {
        setError(error);
        setSaving(false);
        return;
      }
    } else if (selectedEvent) {
      const payload: UpdateCalendarEventInput = {
        currentUserId: currentUserId || accountId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_at: startAt,
        end_at: endAt,
        all_day: form.all_day,
        event_type: form.event_type,
        status: form.status,
        color: form.color as 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | null,
        visibility: selectedEvent.visibility,
      };
      const { error } = await updateCalendarEvent(selectedEvent.id, payload);
      if (error) {
        setError(error);
        setSaving(false);
        return;
      }
    }

    setShowEditor(false);
    await fetchEvents();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    setSaving(true);
    const { error } = await deleteCalendarEvent(selectedEvent.id);
    if (error) {
      setError(error);
      setSaving(false);
      return;
    }
    setShowEditor(false);
    await fetchEvents();
    setSaving(false);
  };

  const navigateMonth = (delta: number) => {
    setCurrentDate(addMonths(currentDate, delta));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
  };

  return (
    <div className="bcal-container">
      {/* Header */}
      <div className="bcal-header">
        <div className="bcal-title-section">
          <h1 className="bcal-title">Calendar</h1>
          <div className="bcal-subtitle">{formatMonthLabel(currentDate)}</div>
        </div>

        <div className="bcal-actions">
          <button className="bcal-today-btn" onClick={goToToday}>Today</button>

          <div className="bcal-nav">
            <button className="bcal-nav-btn" onClick={() => navigateMonth(-1)}>←</button>
            <button className="bcal-nav-btn" onClick={() => navigateMonth(1)}>→</button>
          </div>

          <div className="bcal-view-toggle">
            <button
              className={`bcal-view-btn ${view === 'month' ? 'bcal-active' : ''}`}
              onClick={() => setView('month')}
            >
              Month
            </button>
            <button
              className={`bcal-view-btn ${view === 'week' ? 'bcal-active' : ''}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button
              className={`bcal-view-btn ${view === 'list' ? 'bcal-active' : ''}`}
              onClick={() => setView('list')}
            >
              List
            </button>
          </div>

          {isMobile && (
            <button className="bcal-add-btn" onClick={() => handleOpenCreate()}>
              + Add Event
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="bcal-main">
        {/* Calendar Grid */}
        {view === 'month' && (
          <div className="bcal-month-container">
            <div className="bcal-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bcal-weekday">{day}</div>
              ))}
            </div>

            <div className="bcal-days">
              {calendarDays.map((day, idx) => {
                const dayKey = formatDateKey(day);
                const dayEvents = eventsByDay.get(dayKey) || [];
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = dayKey === todayKey;
                const isPast = dayKey < todayKey && !isToday;

                return (
                  <div
                    key={dayKey}
                    className={`bcal-day ${!isCurrentMonth ? 'bcal-other-month' : ''} ${isToday ? 'bcal-today' : ''} ${isPast ? 'bcal-past' : ''}`}
                    onClick={() => !isPast && handleOpenCreate(dayKey)}
                  >
                    <div className={`bcal-day-number ${isToday ? 'bcal-day-number-today' : ''}`}>
                      {day.getDate()}
                    </div>
                    <div className="bcal-day-events">
                      {dayEvents.slice(0, 3).map(evt => (
                        <div
                          key={evt.id}
                          className="bcal-event-pill"
                          style={{ backgroundColor: resolveColor(evt) }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(evt);
                          }}
                        >
                          <span className="bcal-event-time">
                            {evt.all_day ? 'All day' : new Date(evt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="bcal-event-title">{evt.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="bcal-more-events">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View */}
        {view === 'week' && (
          <WeekView
            eventsByDay={eventsByDay}
            currentDate={currentDate}
            onEventClick={handleOpenEdit}
            onDayClick={handleOpenCreate}
            resolveColor={resolveColor}
          />
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="bcal-list-container">
            <h3 className="bcal-list-title">Upcoming Events</h3>
            {upcomingEvents.length > 0 ? (
              <div className="bcal-list">
                {upcomingEvents.map(evt => {
                  const statusConfig = getStatusConfig(evt.status);
                  return (
                    <div
                      key={evt.id}
                      className="bcal-list-item"
                      onClick={() => handleOpenEdit(evt)}
                    >
                      <div
                        className="bcal-list-color"
                        style={{ backgroundColor: resolveColor(evt) }}
                      />
                      <div className="bcal-list-date">
                        <div className="bcal-list-day">
                          {new Date(evt.start_at).getDate()}
                        </div>
                        <div className="bcal-list-month">
                          {new Date(evt.start_at).toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      </div>
                      <div className="bcal-list-info">
                        <div className="bcal-list-event-title">{evt.title}</div>
                        <div className="bcal-list-meta">
                          {EVENT_TYPE_ICONS[evt.event_type]} {EVENT_TYPE_LABELS[evt.event_type]}
                          {!evt.all_day && ` • ${new Date(evt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                      </div>
                      {(() => {
                        const sc = getStatusConfig(evt.status);
                        return (
                          <div className="bcal-list-status" style={{ color: sc.color, backgroundColor: sc.bg }}>
                            {sc.label}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bcal-empty">
                <div className="bcal-empty-icon">📅</div>
                <div className="bcal-empty-title">No upcoming events</div>
                <div className="bcal-empty-text">Create your first event to get started</div>
                <button className="bcal-empty-btn" onClick={() => handleOpenCreate()}>+ Add Event</button>
              </div>
            )}
          </div>
        )}

        {/* Sidebar - Today's Events */}
        <div className={`bcal-sidebar ${isMobile ? (showMobileSidebar ? 'bcal-sidebar-open' : 'bcal-sidebar-collapsed') : ''}`}>
          {isMobile && (
            <button className="bcal-sidebar-toggle" onClick={() => setShowMobileSidebar(!showMobileSidebar)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {showMobileSidebar ? 'Hide' : 'Show'} Details
            </button>
          )}
          <div className="bcal-sidebar-section">
            <h3 className="bcal-sidebar-title">Today</h3>
            {(() => {
              const todayEvents = eventsByDay.get(todayKey) || [];
              return todayEvents.length > 0 ? (
                <div className="bcal-today-events">
                  {todayEvents.map(evt => (
                    <div
                      key={evt.id}
                      className="bcal-today-event"
                      onClick={() => handleOpenEdit(evt)}
                    >
                      <div
                        className="bcal-today-event-color"
                        style={{ backgroundColor: resolveColor(evt) }}
                      />
                      <div className="bcal-today-event-info">
                        <div className="bcal-today-event-title">{evt.title}</div>
                        <div className="bcal-today-event-time">
                          {evt.all_day ? 'All day' : new Date(evt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bcal-sidebar-empty">No events today</div>
              );
            })()}
          </div>

          <div className="bcal-sidebar-section">
            <h3 className="bcal-sidebar-title">Quick Stats</h3>
            <div className="bcal-stats">
              <div className="bcal-stat">
                <div className="bcal-stat-value">{events.length}</div>
                <div className="bcal-stat-label">Total Events</div>
              </div>
              <div className="bcal-stat">
                <div className="bcal-stat-value">{upcomingEvents.length}</div>
                <div className="bcal-stat-label">Upcoming</div>
              </div>
              <div className="bcal-stat">
                <div className="bcal-stat-value">{events.filter(e => e.status === 'confirmed').length}</div>
                <div className="bcal-stat-label">Confirmed</div>
              </div>
              </div>
            </div>
          </div>
        </div>

      {/* Floating Action Button for Mobile */}
      {isMobile && !showEditor && (
        <button
          className="bcal-fab"
          onClick={() => handleOpenCreate()}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      )}

      {/* Event Editor Modal */}
      {showEditor && (
        <div className="bcal-modal-backdrop" onClick={() => setShowEditor(false)}>
          <div className="bcal-modal" onClick={e => e.stopPropagation()}>
            <div className="bcal-modal-header">
              <h3 className="bcal-modal-title">{editorMode === 'create' ? 'New Event' : 'Edit Event'}</h3>
              <button className="bcal-modal-close" onClick={() => setShowEditor(false)}>×</button>
            </div>

            <div className="bcal-modal-body">
              {error && <div className="bcal-modal-error">{error}</div>}

              <div className="bcal-form-group">
                <label className="bcal-label">Title *</label>
                <input
                  type="text"
                  className="bcal-input"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Event title"
                  autoFocus
                />
              </div>

              <div className="bcal-form-group">
                <label className="bcal-label">Description</label>
                <textarea
                  className="bcal-textarea"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Add details..."
                  rows={3}
                />
              </div>

              <div className="bcal-form-row">
                <div className="bcal-form-group">
                  <label className="bcal-label">Start</label>
                  <div className="bcal-datetime-row">
                    <input
                      type="date"
                      className="bcal-input bcal-input-date"
                      value={form.start_date}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                    />
                    {!form.all_day && (
                      <input
                        type="time"
                        className="bcal-input bcal-input-time"
                        value={form.start_time}
                        onChange={e => setForm({ ...form, start_time: e.target.value })}
                      />
                    )}
                  </div>
                </div>

                <div className="bcal-form-group">
                  <label className="bcal-label">End</label>
                  <div className="bcal-datetime-row">
                    <input
                      type="date"
                      className="bcal-input bcal-input-date"
                      value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                    />
                    {!form.all_day && (
                      <input
                        type="time"
                        className="bcal-input bcal-input-time"
                        value={form.end_time}
                        onChange={e => setForm({ ...form, end_time: e.target.value })}
                      />
                    )}
                  </div>
                </div>
              </div>

              <label className="bcal-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.all_day}
                  onChange={e => setForm({ ...form, all_day: e.target.checked })}
                />
                All day event
              </label>

              <div className="bcal-form-row">
                <div className="bcal-form-group">
                  <label className="bcal-label">Type</label>
                  <select
                    className="bcal-select"
                    value={form.event_type}
                    onChange={e => setForm({ ...form, event_type: e.target.value })}
                  >
                    <option value="event">Event</option>
                    <option value="meeting">Meeting</option>
                    <option value="task">Task</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="bcal-form-group">
                  <label className="bcal-label">Status</label>
                  <select
                    className="bcal-select"
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as any })}
                  >
                    <option value="planned">Planned</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="bcal-form-group">
                <label className="bcal-label">Color</label>
                <div className="bcal-color-picker">
                  {[null, 'red', 'orange', 'green', 'blue', 'purple'].map(color => (
                    <button
                      key={color || 'auto'}
                      type="button"
                      className={`bcal-color-btn ${form.color === color ? 'bcal-color-active' : ''}`}
                      style={{ backgroundColor: color ? EVENT_COLORS[color] : '#e5e7eb' }}
                      onClick={() => setForm({ ...form, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="bcal-modal-footer">
              {editorMode === 'edit' && (
                <button className="bcal-btn-danger" onClick={handleDelete} disabled={saving}>
                  Delete
                </button>
              )}
              <div className="bcal-modal-actions">
                <button className="bcal-btn-secondary" onClick={() => setShowEditor(false)}>
                  Cancel
                </button>
                <button className="bcal-btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editorMode === 'create' ? 'Create Event' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Week View Component
function WeekView({
  eventsByDay,
  currentDate,
  onEventClick,
  onDayClick,
  resolveColor,
}: {
  eventsByDay: Map<string, CalendarEvent[]>;
  currentDate: Date;
  onEventClick: (evt: CalendarEvent) => void;
  onDayClick: (dayKey: string) => void;
  resolveColor: (evt: CalendarEvent) => string;
}) {
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = day === 0 ? 0 : -day + (day === 0 ? 0 : 1);
    d.setDate(d.getDate() + diff);
    return d;
  }, [currentDate]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

  const todayKey = formatDateKey(new Date());

  return (
    <div className="bcal-week-container">
      <div className="bcal-week-header">
        {weekDays.map(day => {
          const dayKey = formatDateKey(day);
          const dayEvents = eventsByDay.get(dayKey) || [];
          const isToday = dayKey === todayKey;
          return (
            <div
              key={dayKey}
              className={`bcal-week-day-header ${isToday ? 'bcal-week-today' : ''}`}
              onClick={() => onDayClick(dayKey)}
            >
              <div className="bcal-week-day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className={`bcal-week-day-num ${isToday ? 'bcal-week-num-today' : ''}`}>{day.getDate()}</div>
              {dayEvents.length > 0 && (
                <div className="bcal-week-day-count">{dayEvents.length} events</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bcal-week-grid">
        {hours.map(hour => (
          <React.Fragment key={hour}>
            <div className="bcal-week-hour-label">{hour}:00</div>
            {weekDays.map(day => {
              const dayKey = formatDateKey(day);
              const dayEvents = eventsByDay.get(dayKey) || [];
              const hourEvents = dayEvents.filter(e => {
                const evHour = new Date(e.start_at).getHours();
                return evHour <= hour && new Date(e.end_at).getHours() > hour;
              });

              return (
                <div
                  key={`${dayKey}-${hour}`}
                  className="bcal-week-cell"
                  onClick={() => {
                    const date = new Date(dayKey);
                    date.setHours(hour, 0, 0, 0);
                    onDayClick(formatDateKey(date));
                  }}
                >
                  {hourEvents.map(evt => (
                    <div
                      key={evt.id}
                      className="bcal-week-event"
                      style={{ backgroundColor: resolveColor(evt) }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(evt);
                      }}
                    >
                      <span className="bcal-week-event-time">
                        {new Date(evt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="bcal-week-event-title">{evt.title}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default BeautifulCalendar;
