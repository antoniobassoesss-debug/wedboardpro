import React, { useMemo, useState, useEffect, useRef } from 'react';
import SectionCard from './SectionCard';
import { useNavigate } from 'react-router-dom';
import TodoPage from '../todo/TodoPage';
import Calendar from '../components/Calendar';
import EventProjectPage from './pipeline/EventProjectPage';
import { listEvents, createEvent, deleteEvent, type Event } from '../api/eventsPipelineApi';
import SuppliersPage from '../suppliers/SuppliersPage';
import { NewProjectModal, type NewProjectPayload } from '../components/NewProjectModal';

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      width: '100%',
      border: '1px dashed rgba(0,0,0,0.15)',
      borderRadius: 24,
      padding: 40,
      textAlign: 'center',
      color: '#7b7b7b',
      fontSize: 16,
    }}
  >
    {message}
  </div>
);

export const WorkSection: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ eventId: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listEvents();
    if (err) {
      setError(err);
    } else if (data) {
      setEvents(data);
      if (!selectedEventId && data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when a new event is created elsewhere (e.g., global modal).
  useEffect(() => {
    const refresh = () => loadEvents();
    window.addEventListener('wbp:new-event-created', refresh);
    return () => window.removeEventListener('wbp:new-event-created', refresh);
  }, []);

  // Close context menu on outside click / scroll / escape
  useEffect(() => {
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleCreateProjectFromModal = async (payload: NewProjectPayload) => {
    // Use the modal’s data to create a new wedding event in the pipeline.
    const { title, eventDate } = payload;
    const dateForSave =
      eventDate && eventDate.trim().length > 0
        ? eventDate
        : new Date().toISOString().slice(0, 10);

    const { data, error: err } = await createEvent({
      title: title || `New Wedding – ${new Date().toLocaleDateString()}`,
      wedding_date: dateForSave,
    });

    if (err) {
      // eslint-disable-next-line no-alert
      alert(`Failed to create event: ${err}`);
      return;
    }

    if (data) {
      setEvents((prev) => [data.event, ...prev]);
      setSelectedEventId(data.event.id);
    }

    setIsNewProjectOpen(false);
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  return (
    <SectionCard title="Project Pipeline">
      <div
        ref={containerRef}
        style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 16, position: 'relative' }}
      >
        {/* Events list */}
        <div
          style={{
            borderRadius: 16,
            border: '1px solid #e5e5e5',
            padding: 12,
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Events</div>
            <button
              id="new-event-btn"
              type="button"
              onClick={() => setIsNewProjectOpen(true)}
              style={{
                borderRadius: 999,
                padding: '6px 10px',
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                position: 'relative',
                zIndex: 10,
              }}
            >
              + New event
            </button>
          </div>
          {loading && events.length === 0 && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>Loading events…</div>
          )}
          {error && (
            <div style={{ fontSize: 12, color: '#b91c1c' }}>
              {error}
            </div>
          )}
          {events.length === 0 && !loading && !error && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              No events yet. Create your first wedding project to get started.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setSelectedEventId(ev.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ eventId: ev.id, x: e.clientX, y: e.clientY });
                }}
                style={{
                  textAlign: 'left',
                  borderRadius: 10,
                  border: '1px solid',
                  borderColor: selectedEventId === ev.id ? '#0f172a' : '#e5e5e5',
                  background: selectedEventId === ev.id ? '#0f172a' : '#ffffff',
                  color: selectedEventId === ev.id ? '#ffffff' : '#111827',
                  padding: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 500 }}>{ev.title}</div>
                <div style={{ fontSize: 11, color: selectedEventId === ev.id ? '#e5e7eb' : '#6b7280' }}>
                  {ev.wedding_date ? new Date(ev.wedding_date).toLocaleDateString() : 'No date'} ·{' '}
                  {ev.status.replace('_', ' ')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Event workspace */}
        <div>
          {selectedEvent ? (
            <EventProjectPage eventId={selectedEvent.id} />
          ) : (
            <div style={{ padding: 24, color: '#6b7280', fontSize: 14 }}>
              Select or create an event on the left to open its project workspace.
            </div>
          )}
        </div>
      </div>
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 8px 20px rgba(15,23,42,0.15)',
            borderRadius: 12,
            padding: 8,
            zIndex: 9999,
            minWidth: 140,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 12, color: '#475467', padding: '6px 8px' }}>Event actions</div>
          <button
            type="button"
            onClick={async () => {
              const { error: deleteError } = await deleteEvent(contextMenu.eventId);
              if (deleteError) {
                // eslint-disable-next-line no-alert
                alert(`Failed to delete event: ${deleteError}`);
                return;
              }
              setEvents((prev) => prev.filter((ev) => ev.id !== contextMenu.eventId));
              if (selectedEventId === contextMenu.eventId) {
                setSelectedEventId(null);
              }
              setContextMenu(null);
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 10px',
              border: 'none',
              background: '#fee2e2',
              color: '#b91c1c',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Delete event
          </button>
        </div>
      )}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        handleCreateProject={handleCreateProjectFromModal}
        key={isNewProjectOpen ? 'open' : 'closed'}
      />
    </SectionCard>
  );
};

export const CalendarSection: React.FC = () => {
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('wedboarpro_session');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const uid = parsed?.user?.id ?? null;
      if (uid) setAccountId(uid);
    } catch {
      // ignore
    }
  }, []);

  return (
    <SectionCard title="Calendar" description="Keep track of events, fittings, and deadlines.">
      {accountId ? (
        <Calendar accountId={accountId} />
      ) : (
        <p style={{ marginTop: 0, marginBottom: 0, color: '#7b7b7b' }}>
          Log in to load your calendar events.
        </p>
      )}
    </SectionCard>
  );
};

export { default as LayoutsSection } from './layouts/LayoutsSection';

export const QuotesSection: React.FC = () => {
  const quotes: Array<{ client: string; date: string; amount: string; status: string }> = [];

  return (
    <SectionCard title="Quotes & Proposals" description="Track outgoing proposals and client approvals.">
      <div className="wp-section-grid">
        {quotes.length === 0 ? (
          <EmptyState message="No quotes yet. Generate a proposal to begin tracking approvals." />
        ) : (
          quotes.map((quote) => (
            <div key={quote.client} className="wp-quote-card">
              <div>
                <strong>{quote.client}</strong>
                <p style={{ margin: 0, color: '#7b7b7b' }}>{quote.date}</p>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{quote.amount}</div>
              <span className={`wp-badge ${quote.status === 'Accepted' ? 'positive' : 'neutral'}`}>{quote.status}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="wp-pill primary">
                  View details
                </button>
                <button type="button" className="wp-pill">
                  Send reminder
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
};

export const TodoSection: React.FC = () => {
  return (
    <SectionCard title="To-Do List" description="Quick tasks and reminders.">
      <TodoPage />
    </SectionCard>
  );
};

export const SuppliersSection: React.FC = () => {
  return (
    <SectionCard
      title="Suppliers"
      description="Keep all your trusted vendors in one directory, and see how often you use them."
    >
      <SuppliersPage embedded />
    </SectionCard>
  );
};

