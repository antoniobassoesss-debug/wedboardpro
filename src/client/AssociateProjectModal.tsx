import React, { useState, useEffect, useCallback } from 'react';
import { listEvents, type Event } from './api/eventsPipelineApi';
import { attachLayoutsToProject } from './api/layoutsApi';

interface AssociateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  layoutIds: string[];
  onAssociated: (eventId: string) => void;
}

const AssociateProjectModal: React.FC<AssociateProjectModalProps> = ({
  isOpen,
  onClose,
  layoutIds,
  onAssociated,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isAssociating, setIsAssociating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch events when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedEventId(null);
      setSearchQuery('');
      return;
    }

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await listEvents();
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setEvents(result.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [isOpen]);

  const handleAssociate = useCallback(async () => {
    if (!selectedEventId || layoutIds.length === 0) return;

    setIsAssociating(true);
    try {
      const result = await attachLayoutsToProject(layoutIds, selectedEventId);
      if (result.error) {
        setError(result.error);
      } else {
        onAssociated(selectedEventId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to associate layouts');
    } finally {
      setIsAssociating(false);
    }
  }, [selectedEventId, layoutIds, onAssociated]);

  // Filter events by search query
  const filteredEvents = events.filter(event => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(query) ||
      (event.wedding_date && event.wedding_date.includes(query))
    );
  });

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#0c0c0c' }}>
              Connect to a project
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666', lineHeight: 1.5 }}>
            Link {layoutIds.length === 1 ? 'this layout' : `these ${layoutIds.length} layouts`} to a wedding project for better organization.
          </p>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#f8f8f8',
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: 14,
                outline: 'none',
                color: '#0c0c0c',
              }}
            />
          </div>
        </div>

        {/* Projects List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 24px 16px',
          }}
        >
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#888' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  border: '2px solid #e0e0e0',
                  borderTopColor: '#0c0c0c',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 12px',
                }}
              />
              Loading projects...
            </div>
          ) : error ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#dc2626' }}>
              {error}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#888' }}>
              {searchQuery ? 'No projects match your search' : 'No projects found. Create a project in the Work tab first.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: selectedEventId === event.id ? '#f0f9ff' : '#fff',
                    border: `2px solid ${selectedEventId === event.id ? '#0ea5e9' : '#e5e5e5'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Wedding Icon */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: selectedEventId === event.id ? '#e0f2fe' : '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={selectedEventId === event.id ? '#0ea5e9' : '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#0c0c0c',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {event.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {event.wedding_date ? formatDate(event.wedding_date) : 'Date not set'}
                      {event.guest_count_expected ? ` · ${event.guest_count_expected} guests` : ''}
                    </div>
                  </div>
                  {/* Checkmark for selected */}
                  {selectedEventId === event.id && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              color: '#666',
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Skip for now
          </button>
          <button
            onClick={handleAssociate}
            disabled={!selectedEventId || isAssociating}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: selectedEventId ? '#0c0c0c' : '#ccc',
              border: 'none',
              borderRadius: 8,
              cursor: selectedEventId && !isAssociating ? 'pointer' : 'not-allowed',
              opacity: isAssociating ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isAssociating ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AssociateProjectModal;

