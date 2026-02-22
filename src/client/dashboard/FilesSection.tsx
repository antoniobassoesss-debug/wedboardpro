import React, { useState, useEffect } from 'react';
import { listEvents, type Event } from '../api/eventsPipelineApi';
import './pipeline/files/files.css';

interface EventFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  category: string;
}

const FilesSection: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filesByEvent] = useState<Record<string, EventFile[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await listEvents();
      if (data) {
        setEvents(data);
        if (data.length > 0 && data[0]?.id) {
          setSelectedEventId(data[0].id);
        }
      }
      setLoading(false);
    })();
  }, []);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const files = selectedEventId ? (filesByEvent[selectedEventId] || []) : [];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getIconClass = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf') return 'pdf';
    return 'doc';
  };

  return (
    <div className="files-global-shell">
      <div className="files-global-layout">
        {/* Sidebar: event list */}
        <div className="files-global-sidebar">
          <div className="files-sidebar-section-title" style={{ marginBottom: 6 }}>Events</div>
          {loading ? (
            <div className="files-sidebar-empty">Loading…</div>
          ) : events.length === 0 ? (
            <div className="files-sidebar-empty">No events yet.</div>
          ) : (
            events.map(event => (
              <button
                key={event.id}
                type="button"
                className={`files-pill ${selectedEventId === event.id ? 'active' : ''}`}
                onClick={() => setSelectedEventId(event.id)}
              >
                {event.title}
              </button>
            ))
          )}
        </div>

        {/* Main: file list */}
        <div className="files-global-main">
          <div className="files-global-header">
            <span className="files-global-header-title">
              {selectedEvent ? selectedEvent.title : 'Select an event'}
            </span>
          </div>

          <div className="files-global-content">
            {files.length === 0 ? (
              <div className="files-empty-state">
                <div className="files-empty-illustration" />
                <h3>No files in this event</h3>
                <p>Files uploaded to this event will appear here.</p>
              </div>
            ) : (
              <div className="files-grid list">
                {files.map(file => (
                  <div key={file.id} className="files-item">
                    <div className={`files-item-icon ${getIconClass(file.file_type)}`} />
                    <div className="files-item-meta">
                      <div className="files-item-name">{file.file_name}</div>
                      <div className="files-item-sub">
                        {formatDate(file.uploaded_at)} · {formatFileSize(file.file_size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FABs */}
      <button
        type="button"
        onClick={() => {}}
        aria-label="Add file"
        className="files-fab"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('wbp:toggle-mobile-menu'))}
        aria-label="Open menu"
        className="files-menu-btn-mobile"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default FilesSection;
