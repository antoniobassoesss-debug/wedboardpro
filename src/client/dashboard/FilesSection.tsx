import React, { useState, useEffect } from 'react';
import { listEvents, type Event } from '../api/eventsPipelineApi';

interface EventFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  category: string;
}

const FileIcon: React.FC<{ fileType: string; fileName: string }> = ({ fileType, fileName }) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (fileType.startsWith('image/')) {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="2" stroke="#8b5cf6" strokeWidth="1.5" />
        <circle cx="7" cy="7" r="2" stroke="#8b5cf6" strokeWidth="1.5" />
        <path d="M2 13l4-4 2 2 4-4 4 4" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  
  if (fileType === 'application/pdf') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 2h7l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#ef4444" strokeWidth="1.5" />
        <path d="M11 2v3h3" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 8h6M6 11h4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  
  if (ext === 'doc' || ext === 'docx') {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 2h7l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3b82f6" strokeWidth="1.5" />
        <path d="M11 2v3h3" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9h6M5 12h4" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 2h7l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#64748b" strokeWidth="1.5" />
      <path d="M11 2v3h3" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const FolderIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M1 5a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V5z" stroke="#64748b" strokeWidth="1.5" />
  </svg>
);

const FilesSection: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filesByEvent, setFilesByEvent] = useState<Record<string, EventFile[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    const { data } = await listEvents();
    if (data) {
      setEvents(data);
      if (data.length > 0 && !selectedEventId && data[0]?.id) {
        setSelectedEventId(data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const files = selectedEventId ? (filesByEvent[selectedEventId] || []) : [];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>
          Files
        </h2>
        {selectedEvent && (
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            {selectedEvent.title}
          </span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        gap: 12,
        flex: 1,
        minHeight: 0,
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e5e5e5',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', padding: '4px 8px', textTransform: 'uppercase' }}>
            Events
          </div>
          {loading ? (
            <div style={{ padding: 12, fontSize: 12, color: '#9ca3af' }}>Loading...</div>
          ) : events.map(event => (
            <button
              key={event.id}
              onClick={() => setSelectedEventId(event.id)}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                background: selectedEventId === event.id ? '#f1f5f9' : 'transparent',
                color: selectedEventId === event.id ? '#0f172a' : '#64748b',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FolderIcon />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.title}
              </span>
            </button>
          ))}
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 80px',
            gap: 12,
            padding: '10px 14px',
            borderBottom: '1px solid #f3f4f6',
            background: '#fafafa',
            fontSize: 11,
            fontWeight: 500,
            color: '#9ca3af',
            textTransform: 'uppercase',
          }}>
            <span>Name</span>
            <span>Date</span>
            <span>Size</span>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                Loading...
              </div>
            ) : files.length === 0 ? (
              <div style={{
                padding: 40,
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: 13,
              }}>
                No files in this event
              </div>
            ) : (
              files.map(file => (
                <div
                  key={file.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 80px',
                    gap: 12,
                    padding: '10px 14px',
                    borderBottom: '1px solid #f9fafb',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileIcon fileType={file.file_type} fileName={file.file_name} />
                    <span style={{ fontSize: 13, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.file_name}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{formatDate(file.uploaded_at)}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{formatFileSize(file.file_size)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilesSection;
