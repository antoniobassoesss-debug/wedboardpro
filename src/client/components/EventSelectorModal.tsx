/**
 * Event Selector Modal
 *
 * Modal for selecting which event to open/create a layout for.
 * Shows ongoing events and their layout status.
 */

import React, { useState, useEffect } from 'react';
import { listEvents, type Event } from '../api/eventsPipelineApi';
import { getLayoutForEvent } from '../api/layoutsApi';

interface EventWithLayoutStatus extends Event {
  hasLayout: boolean;
  layoutId?: string;
}

interface EventSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: (eventId: string, eventTitle: string, existingLayoutId?: string) => void;
}

const EventSelectorModal: React.FC<EventSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectEvent,
}) => {
  const [events, setEvents] = useState<EventWithLayoutStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const loadEventsWithLayoutStatus = async () => {
      setLoading(true);
      setError(null);

      try {
        const eventsResult = await listEvents();
        if (eventsResult.error || !eventsResult.data) {
          setError(eventsResult.error || 'Failed to load events');
          setLoading(false);
          return;
        }

        // Filter to only ongoing events (not completed)
        const ongoingEvents = eventsResult.data.filter(e => e.status !== 'completed');

        // Check layout status for each event
        const eventsWithStatus: EventWithLayoutStatus[] = await Promise.all(
          ongoingEvents.map(async (event) => {
            const layoutResult = await getLayoutForEvent(event.id);
            const result: EventWithLayoutStatus = {
              ...event,
              hasLayout: !!layoutResult.data,
            };
            if (layoutResult.data?.id) {
              result.layoutId = layoutResult.data.id;
            }
            return result;
          })
        );

        setEvents(eventsWithStatus);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadEventsWithLayoutStatus();
  }, [isOpen]);

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return { bg: '#dcfce7', text: '#166534' };
      case 'at_risk': return { bg: '#fef3c7', text: '#92400e' };
      case 'delayed': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '80vh',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                  Select Event
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                  Choose which event this layout is for
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                background: '#f3f4f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                fontSize: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                outline: 'none',
                background: '#ffffff',
              }}
            />
          </div>
        </div>

        {/* Event List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #e5e7eb',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                margin: '0 auto 12px',
                animation: 'spin 1s linear infinite',
              }} />
              Loading events...
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
              {error}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              {searchQuery ? 'No events match your search' : 'No ongoing events found'}
            </div>
          ) : (
            filteredEvents.map((event) => {
              const statusColor = getStatusColor(event.status);
              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event.id, event.title, event.layoutId)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    transition: 'all 0.15s ease',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 500, color: '#111827' }}>
                          {event.title}
                        </span>
                        {event.hasLayout && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 500,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#dbeafe',
                            color: '#1d4ed8',
                          }}>
                            Has Layout
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                          {formatDate(event.wedding_date)}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: statusColor.bg,
                          color: statusColor.text,
                          textTransform: 'capitalize',
                        }}>
                          {event.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb',
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center',
        }}>
          {events.filter(e => e.hasLayout).length > 0
            ? `${events.filter(e => e.hasLayout).length} event(s) already have layouts - click to open`
            : 'Select an event to create its layout file'}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EventSelectorModal;
