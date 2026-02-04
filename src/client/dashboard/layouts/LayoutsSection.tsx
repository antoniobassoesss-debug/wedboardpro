/**
 * Layouts Section - Dashboard Tab
 *
 * Shows layout files organized by event.
 * Each event has ONE layout file containing multiple tabs.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './layouts.css';
import {
  listLayoutsWithEvents,
  getOrCreateLayoutForEvent,
  isLayoutFileData,
  type LayoutRecord,
  type LayoutFileData,
} from '../../api/layoutsApi';
import { listEvents, type Event } from '../../api/eventsPipelineApi';
import EventSelectorModal from '../../components/EventSelectorModal';

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

const PlusIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

interface LayoutWithEvent extends LayoutRecord {
  event?: {
    id: string;
    title: string;
    wedding_date: string;
  };
}

type SortOption = 'updated' | 'event' | 'date';

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
  return 1; // Legacy single canvas
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
  // Legacy format
  const shapes = layout.canvas_data.shapes || [];
  return {
    tables: shapes.filter((s: any) => s.tableData).length,
    elements: shapes.length + (layout.canvas_data.walls?.length || 0),
  };
};

const LayoutsSection: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [layouts, setLayouts] = useState<LayoutWithEvent[]>([]);
  const [eventsWithoutLayout, setEventsWithoutLayout] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [showEventModal, setShowEventModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load layouts and events
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch layouts with event info
      const layoutsResult = await listLayoutsWithEvents();
      if (layoutsResult.data) {
        setLayouts(layoutsResult.data);
      }

      // Fetch all events to find those without layouts
      const eventsResult = await listEvents();
      if (eventsResult.data && layoutsResult.data) {
        const eventIdsWithLayouts = new Set(
          layoutsResult.data.filter(l => l.event_id).map(l => l.event_id)
        );
        const withoutLayout = eventsResult.data.filter(
          e => e.status !== 'completed' && !eventIdsWithLayouts.has(e.id)
        );
        setEventsWithoutLayout(withoutLayout);
      }
    } catch (err) {
      console.error('[LayoutsSection] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter and sort layouts
  const filteredLayouts = useMemo(() => {
    let result = layouts;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.event?.title.toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'event':
          return (a.event?.title || '').localeCompare(b.event?.title || '');
        case 'date':
          return new Date(b.event?.wedding_date || 0).getTime() - new Date(a.event?.wedding_date || 0).getTime();
        case 'updated':
        default:
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      }
    });

    return result;
  }, [layouts, searchQuery, sortBy]);

  const handleNewLayout = () => {
    setShowEventModal(true);
  };

  const handleSelectEvent = async (eventId: string, eventTitle: string, existingLayoutId?: string) => {
    setShowEventModal(false);

    if (existingLayoutId) {
      // Open existing layout
      navigate(`/layout-maker?eventId=${eventId}`);
    } else {
      // Create new layout for event
      showToast('Creating layout...');
      const result = await getOrCreateLayoutForEvent(eventId, eventTitle);
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }
      navigate(`/layout-maker?eventId=${eventId}`);
    }
  };

  const handleOpenLayout = (layout: LayoutWithEvent) => {
    if (layout.event_id) {
      navigate(`/layout-maker?eventId=${layout.event_id}`);
    } else {
      // Legacy layout without event - open by layout ID
      navigate(`/layout-maker?layoutId=${layout.id}`);
    }
  };

  const isEmpty = layouts.length === 0 && eventsWithoutLayout.length === 0;

  return (
    <div className="layouts-container">
      {/* Header */}
      <div className="layouts-header">
        <div className="layouts-header-right">
          <button type="button" className="layouts-new-btn" onClick={handleNewLayout}>
            + New Layout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="layouts-loading">
          <div className="layouts-loading-spinner" />
          <span>Loading layouts...</span>
        </div>
      ) : isEmpty ? (
        // Empty State
        <div className="layouts-empty-state">
          <div className="layouts-empty-illustration">
            <div className="layouts-empty-icon">📐</div>
          </div>
          <h2 className="layouts-empty-title">No layouts yet</h2>
          <p className="layouts-empty-description">
            Create a layout for your events to design floorplans, seating arrangements, and more.
          </p>
          <button type="button" className="layouts-empty-cta" onClick={handleNewLayout}>
            Create your first layout
          </button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="layouts-toolbar">
            <div className="layouts-toolbar-left">
              <input
                type="text"
                className="layouts-search"
                placeholder="Search by event name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="layouts-toolbar-right">
              <select
                className="layouts-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="updated">Last Updated</option>
                <option value="event">Event Name</option>
                <option value="date">Wedding Date</option>
              </select>
            </div>
          </div>

          {/* Events without layouts section */}
          {eventsWithoutLayout.length > 0 && (
            <div className="layouts-section">
              <h3 className="layouts-section-title">
                Events without layouts ({eventsWithoutLayout.length})
              </h3>
              <div className="layouts-events-grid">
                {eventsWithoutLayout.map((event) => (
                  <div
                    key={event.id}
                    className="layouts-event-card create"
                    onClick={() => handleSelectEvent(event.id, event.title)}
                  >
                    <div className="layouts-event-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <div className="layouts-event-card-content">
                      <span className="layouts-event-card-title">{event.title}</span>
                      <span className="layouts-event-card-date">{formatWeddingDate(event.wedding_date)}</span>
                    </div>
                    <span className="layouts-event-card-action">Create Layout</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing layouts */}
          {filteredLayouts.length > 0 && (
            <div className="layouts-section">
              <h3 className="layouts-section-title">
                Layout Files ({filteredLayouts.length})
              </h3>
              <div className="layouts-grid">
                {filteredLayouts.map((layout) => {
                  const tabCount = getTabCount(layout);
                  const { tables, elements } = getLayoutPreviewInfo(layout);

                  return (
                    <div
                      key={layout.id}
                      className="layouts-card"
                      onClick={() => handleOpenLayout(layout)}
                    >
                      <div className="layouts-card-thumbnail">
                        <div className="layouts-card-thumbnail-content">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                          </svg>
                        </div>
                        <div className="layouts-card-badge">
                          {tabCount} tab{tabCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="layouts-card-info">
                        <div className="layouts-card-event">
                          {layout.event ? (
                            <>
                              <span className="layouts-card-event-name">{layout.event.title}</span>
                              <span className="layouts-card-event-date">{formatWeddingDate(layout.event.wedding_date)}</span>
                            </>
                          ) : (
                            <span className="layouts-card-event-name">{layout.name}</span>
                          )}
                        </div>
                        <div className="layouts-card-meta">
                          <span>{tables} table{tables !== 1 ? 's' : ''}</span>
                          <span className="layouts-card-meta-divider">·</span>
                          <span>{elements} element{elements !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="layouts-card-updated">
                          Updated {formatDate(layout.updated_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredLayouts.length === 0 && searchQuery && (
            <div className="layouts-no-results">
              <p>No layouts match "{searchQuery}"</p>
              <button type="button" onClick={() => setSearchQuery('')}>
                Clear search
              </button>
            </div>
          )}
        </>
      )}

      {/* Event Selector Modal */}
      <EventSelectorModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSelectEvent={handleSelectEvent}
      />

      {/* Toast */}
      {toast && (
        <div className={`layouts-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* FAB for mobile */}
      {isMobile && (
        <button type="button" className="layouts-fab" onClick={handleNewLayout} aria-label="Create new layout">
          <PlusIcon />
        </button>
      )}
    </div>
  );
};

export default LayoutsSection;
