import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchGuests,
  createGuest,
  updateGuest,
  deleteGuest,
  bulkUpdateGuests,
  bulkDeleteGuests,
  exportGuestsCSV,
  DIETARY_LABELS,
  SIDE_LABELS,
  GROUP_LABELS,
  RSVP_LABELS,
  type WeddingGuest,
  type GuestCreate,
  type GuestUpdate,
  type GuestFilters,
  type GuestStats,
  type GuestSide,
  type GuestGroup,
  type RsvpStatus,
  type DietaryRestriction,
} from '../../../api/weddingGuestsApi';
import { browserSupabaseClient } from '../../../browserSupabaseClient';
import { useToast } from '../../../components/ui/toast';
import ImportGuestsModal from './ImportGuestsModal';
import {
  Users,
  Check,
  X,
  Clock,
  Plus,
  Upload,
  Download,
  LayoutGrid,
  Phone,
  Mail,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Accessibility,
  Baby,
  AlertTriangle,
} from 'lucide-react';
import './guests.css';

interface GuestListTabProps {
  eventId: string;
}

const GuestListTab: React.FC<GuestListTabProps> = ({ eventId }) => {
  // Data state
  const [guests, setGuests] = useState<WeddingGuest[]>([]);
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState<GuestSide | ''>('');
  const [groupFilter, setGroupFilter] = useState<GuestGroup | ''>('');
  const [rsvpFilter, setRsvpFilter] = useState<RsvpStatus | ''>('');
  const [dietaryFilter, setDietaryFilter] = useState<DietaryRestriction | ''>('');
  const [accessibilityFilter, setAccessibilityFilter] = useState(false);
  const [childrenFilter, setChildrenFilter] = useState(false);

  // Pagination & sorting
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 50;

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<WeddingGuest | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Accordion state
  const [dietarySummaryOpen, setDietarySummaryOpen] = useState(false);
  const [accessibilitySummaryOpen, setAccessibilitySummaryOpen] = useState(false);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { showToast } = useToast();

  // Load guests
  const loadGuests = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: GuestFilters = {
      search: search || undefined,
      side: (sideFilter as GuestSide) || undefined,
      guest_group: (groupFilter as GuestGroup) || undefined,
      rsvp_status: (rsvpFilter as RsvpStatus) || undefined,
      dietary: (dietaryFilter as DietaryRestriction) || undefined,
      needs_accessibility: accessibilityFilter || undefined,
      is_child: childrenFilter || undefined,
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
    };

    const { data, error: err } = await fetchGuests(eventId, filters);

    if (err) {
      setError(err);
    } else if (data) {
      setGuests(data.guests);
      setStats(data.stats);
      setTotalCount(data.total_count);
    }

    setLoading(false);
  }, [eventId, search, sideFilter, groupFilter, rsvpFilter, dietaryFilter, accessibilityFilter, childrenFilter, page, sortBy, sortOrder]);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  // Real-time subscription
  useEffect(() => {
    if (!eventId || !browserSupabaseClient) return;

    const channel = browserSupabaseClient
      .channel(`guests-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_guests',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          loadGuests();
        }
      )
      .subscribe();

    return () => {
      browserSupabaseClient?.removeChannel(channel);
    };
  }, [eventId, loadGuests]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Debounced search
  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(guests.map((g) => g.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // Inline update (debounced)
  const handleInlineUpdate = (guestId: string, field: keyof GuestUpdate, value: any) => {
    // Optimistic update
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, [field]: value } : g))
    );

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const { error: err } = await updateGuest(eventId, guestId, { [field]: value });
      if (err) {
        showToast(`Failed to update: ${err}`, 'error');
        loadGuests(); // Revert on error
      }
    }, 1000);
  };

  // Delete guest
  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('Are you sure you want to delete this guest?')) return;

    const { error: err } = await deleteGuest(eventId, guestId);
    if (err) {
      showToast(`Failed to delete: ${err}`, 'error');
    } else {
      showToast('Guest deleted', 'success');
      loadGuests();
    }
  };

  // Bulk actions
  const handleBulkRsvp = async (status: RsvpStatus) => {
    const ids = Array.from(selectedIds);
    const { error: err } = await bulkUpdateGuests(eventId, ids, { rsvp_status: status });
    if (err) {
      showToast(`Failed to update: ${err}`, 'error');
    } else {
      showToast(`Updated ${ids.length} guests`, 'success');
      setSelectedIds(new Set());
      loadGuests();
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} selected guests?`)) return;

    const ids = Array.from(selectedIds);
    const { error: err } = await bulkDeleteGuests(eventId, ids);
    if (err) {
      showToast(`Failed to delete: ${err}`, 'error');
    } else {
      showToast(`Deleted ${ids.length} guests`, 'success');
      setSelectedIds(new Set());
      loadGuests();
    }
  };

  // Export
  const handleExport = async () => {
    const { data, error: err } = await exportGuestsCSV(eventId);
    if (err) {
      showToast(`Export failed: ${err}`, 'error');
      return;
    }

    const blob = new Blob([data || ''], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export complete', 'success');
  };

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setSideFilter('');
    setGroupFilter('');
    setRsvpFilter('');
    setDietaryFilter('');
    setAccessibilityFilter(false);
    setChildrenFilter(false);
    setPage(1);
  };

  const hasActiveFilters = search || sideFilter || groupFilter || rsvpFilter || dietaryFilter || accessibilityFilter || childrenFilter;

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / limit);

  // Get accessibility guests for summary
  const accessibilityGuests = guests.filter((g) => g.needs_accessibility);
  const childrenCount = stats?.children_count || 0;

  // Render loading state
  if (loading && guests.length === 0) {
    return (
      <div className="guests-tab-loading">
        <div className="venue-saving-spinner" style={{ width: 24, height: 24 }} />
        <span style={{ marginLeft: 12 }}>Loading guest list...</span>
      </div>
    );
  }

  // Render error state
  if (error && guests.length === 0) {
    return (
      <div className="guests-tab-error">
        <p>Failed to load guests: {error}</p>
        <button
          onClick={loadGuests}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: 'none',
            background: '#0f172a',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="guests-tab">
      {/* Stats Cards */}
      <div className="guests-stats-row">
        <div className="guests-stat-card">
          <div className="guests-stat-header">
            <div className="guests-stat-icon total">
              <Users size={16} />
            </div>
          </div>
          <div className="guests-stat-number total">{stats?.total || 0}</div>
          <div className="guests-stat-label">guests invited</div>
        </div>

        <div className="guests-stat-card">
          <div className="guests-stat-header">
            <div className="guests-stat-icon yes">
              <Check size={16} />
            </div>
          </div>
          <div className="guests-stat-number yes">{stats?.rsvp_yes || 0}</div>
          <div className="guests-stat-label">confirmed attending</div>
          {stats && stats.total > 0 && (
            <div className="guests-stat-subtext">
              {Math.round(((stats.rsvp_yes + stats.rsvp_no) / stats.total) * 100)}% response rate
            </div>
          )}
        </div>

        <div className="guests-stat-card">
          <div className="guests-stat-header">
            <div className="guests-stat-icon no">
              <X size={16} />
            </div>
          </div>
          <div className="guests-stat-number no">{stats?.rsvp_no || 0}</div>
          <div className="guests-stat-label">declined</div>
        </div>

        <div className="guests-stat-card">
          <div className="guests-stat-header">
            <div className="guests-stat-icon pending">
              <Clock size={16} />
            </div>
          </div>
          <div className="guests-stat-number pending">{stats?.rsvp_pending || 0}</div>
          <div className="guests-stat-label">awaiting response</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="guests-actions-row">
        <button className="guests-btn primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          Add Guest
        </button>
        <button className="guests-btn secondary" onClick={() => setShowImportModal(true)}>
          <Upload size={16} />
          Import CSV
        </button>
        <button className="guests-btn secondary" onClick={handleExport}>
          <Download size={16} />
          Export to CSV
        </button>
        <button
          className="guests-btn secondary"
          onClick={() => showToast('Seating chart coming soon!', 'info')}
        >
          <LayoutGrid size={16} />
          View Seating Chart
        </button>
      </div>

      {/* Filters */}
      <div className="guests-filters-bar">
        <input
          type="text"
          className="guests-search-input"
          placeholder="Search by name, email, or phone..."
          defaultValue={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />

        <select
          className="guests-filter-select"
          value={sideFilter}
          onChange={(e) => { setSideFilter(e.target.value as GuestSide | ''); setPage(1); }}
        >
          <option value="">All Sides</option>
          <option value="bride">Bride</option>
          <option value="groom">Groom</option>
          <option value="both">Both</option>
        </select>

        <select
          className="guests-filter-select"
          value={groupFilter}
          onChange={(e) => { setGroupFilter(e.target.value as GuestGroup | ''); setPage(1); }}
        >
          <option value="">All Groups</option>
          <option value="family">Family</option>
          <option value="friends">Friends</option>
          <option value="coworkers">Coworkers</option>
          <option value="other">Other</option>
        </select>

        <select
          className="guests-filter-select"
          value={rsvpFilter}
          onChange={(e) => { setRsvpFilter(e.target.value as RsvpStatus | ''); setPage(1); }}
        >
          <option value="">All RSVP</option>
          <option value="pending">Pending</option>
          <option value="yes">Attending</option>
          <option value="no">Declined</option>
        </select>

        <select
          className="guests-filter-select"
          value={dietaryFilter}
          onChange={(e) => { setDietaryFilter(e.target.value as DietaryRestriction | ''); setPage(1); }}
        >
          <option value="">All Dietary</option>
          {Object.entries(DIETARY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <div className="guests-active-filters">
            {search && (
              <span className="guests-filter-pill">
                Search: {search}
                <button onClick={() => setSearch('')}>×</button>
              </span>
            )}
            {sideFilter && (
              <span className="guests-filter-pill">
                Side: {SIDE_LABELS[sideFilter]}
                <button onClick={() => setSideFilter('')}>×</button>
              </span>
            )}
            {groupFilter && (
              <span className="guests-filter-pill">
                Group: {GROUP_LABELS[groupFilter]}
                <button onClick={() => setGroupFilter('')}>×</button>
              </span>
            )}
            {rsvpFilter && (
              <span className="guests-filter-pill">
                RSVP: {RSVP_LABELS[rsvpFilter]}
                <button onClick={() => setRsvpFilter('')}>×</button>
              </span>
            )}
            {dietaryFilter && (
              <span className="guests-filter-pill">
                Dietary: {DIETARY_LABELS[dietaryFilter]}
                <button onClick={() => setDietaryFilter('')}>×</button>
              </span>
            )}
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: 12,
                cursor: 'pointer',
              }}
              onClick={clearFilters}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="guests-bulk-bar">
          <span className="guests-bulk-count">{selectedIds.size} selected</span>
          <div className="guests-bulk-actions">
            <button className="guests-bulk-btn primary" onClick={() => handleBulkRsvp('yes')}>
              Mark Attending
            </button>
            <button className="guests-bulk-btn primary" onClick={() => handleBulkRsvp('no')}>
              Mark Declined
            </button>
            <button className="guests-bulk-btn danger" onClick={handleBulkDelete}>
              Delete
            </button>
          </div>
          <button className="guests-bulk-close" onClick={() => setSelectedIds(new Set())}>
            ×
          </button>
        </div>
      )}

      {/* Guest Table or Empty State */}
      {guests.length === 0 ? (
        <div className="guests-table-container">
          <div className="guests-empty-state">
            <div className="guests-empty-icon">
              <Users size={48} color="#94a3b8" />
            </div>
            <h3 className="guests-empty-title">No guests added yet</h3>
            <p className="guests-empty-text">Add your first guest or import from CSV</p>
            <button className="guests-btn primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              Add Guest
            </button>
          </div>
        </div>
      ) : (
        <div className="guests-table-container">
          <table className="guests-table">
            <thead>
              <tr>
                <th className="col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === guests.length && guests.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th
                  className={`sortable ${sortBy === 'guest_name' ? (sortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                  onClick={() => handleSort('guest_name')}
                >
                  Name
                </th>
                <th
                  className={`sortable ${sortBy === 'email' ? (sortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                  onClick={() => handleSort('email')}
                >
                  Email
                </th>
                <th>Phone</th>
                <th
                  className={`sortable ${sortBy === 'side' ? (sortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                  onClick={() => handleSort('side')}
                >
                  Side
                </th>
                <th
                  className={`sortable ${sortBy === 'guest_group' ? (sortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                  onClick={() => handleSort('guest_group')}
                >
                  Group
                </th>
                <th
                  className={`sortable ${sortBy === 'rsvp_status' ? (sortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}`}
                  onClick={() => handleSort('rsvp_status')}
                >
                  RSVP
                </th>
                <th>Dietary</th>
                <th>Special</th>
                <th>Gift</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id} className={selectedIds.has(guest.id) ? 'selected' : ''}>
                  <td className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(guest.id)}
                      onChange={(e) => handleSelectOne(guest.id, e.target.checked)}
                    />
                  </td>
                  <td>
                    <div className="guest-name-cell">
                      <span className="guest-name">
                        {guest.guest_name}
                        {guest.plus_one_allowed && (
                          <span className="guest-plus-one-badge">+1</span>
                        )}
                      </span>
                      {guest.plus_one_name && (
                        <span className="guest-plus-one">+ {guest.plus_one_name}</span>
                      )}
                      {guest.plus_one_allowed && !guest.plus_one_name && (
                        <span className="guest-plus-one" style={{ color: '#d97706' }}>
                          Plus-one not named
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {guest.email ? (
                      <a href={`mailto:${guest.email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                        {guest.email.length > 25 ? guest.email.slice(0, 22) + '...' : guest.email}
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    {guest.phone ? (
                      <a href={`tel:${guest.phone}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                        {guest.phone}
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    {guest.side && (
                      <span className={`guest-badge side-${guest.side}`}>
                        {SIDE_LABELS[guest.side]}
                      </span>
                    )}
                  </td>
                  <td>
                    {guest.guest_group && (
                      <span className={`guest-badge group-${guest.guest_group}`}>
                        {guest.guest_group === 'family' && '👨‍👩‍👧 '}
                        {guest.guest_group === 'friends' && '👋 '}
                        {guest.guest_group === 'coworkers' && '💼 '}
                        {GROUP_LABELS[guest.guest_group]}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`guest-badge rsvp-${guest.rsvp_status}`}>
                      {RSVP_LABELS[guest.rsvp_status]}
                    </span>
                  </td>
                  <td>
                    {guest.dietary_restrictions.length > 0 ? (
                      <div className="dietary-tags">
                        {guest.dietary_restrictions.slice(0, 3).map((d) => (
                          <span key={d} className={`dietary-tag ${d}`}>
                            {DIETARY_LABELS[d]}
                          </span>
                        ))}
                        {guest.dietary_restrictions.length > 3 && (
                          <span className="dietary-more">+{guest.dietary_restrictions.length - 3} more</span>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    {guest.needs_accessibility && (
                      <span
                        className="guest-icon-badge accessibility"
                        title={guest.accessibility_notes || 'Accessibility required'}
                      >
                        <Accessibility size={14} />
                      </span>
                    )}
                    {guest.is_child && (
                      <span className="guest-icon-badge child" title="Child">
                        <Baby size={14} />
                      </span>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      className="gift-checkbox"
                      checked={guest.gift_received}
                      onChange={(e) => handleInlineUpdate(guest.id, 'gift_received', e.target.checked)}
                    />
                  </td>
                  <td>
                    <div className="guest-actions">
                      <button
                        className="guest-action-btn"
                        title="Edit"
                        onClick={() => setEditingGuest(guest)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="guest-action-btn delete"
                        title="Delete"
                        onClick={() => handleDeleteGuest(guest.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="guests-pagination">
              <span className="guests-pagination-info">
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} of {totalCount}
              </span>
              <div className="guests-pagination-pages">
                <button
                  className="guests-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`guests-page-btn ${page === pageNum ? 'active' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="guests-page-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dietary Summary Panel */}
      <div className="guests-summary-panel">
        <div
          className="guests-summary-header"
          onClick={() => setDietarySummaryOpen(!dietarySummaryOpen)}
        >
          <h4 className="guests-summary-title">
            Dietary Restrictions Summary
          </h4>
          <ChevronDown
            size={18}
            className={`guests-summary-chevron ${dietarySummaryOpen ? 'open' : ''}`}
          />
        </div>
        {dietarySummaryOpen && (
          <div className="guests-summary-content">
            <div className="dietary-summary-grid">
              {Object.entries(DIETARY_LABELS).map(([key, label]) => {
                const count = stats?.dietary_counts[key as DietaryRestriction] || 0;
                const isCritical = key === 'nut_allergy' && count > 0;
                return (
                  <div
                    key={key}
                    className={`dietary-summary-item ${isCritical ? 'critical' : ''}`}
                  >
                    <span className="dietary-summary-label">
                      {isCritical && <AlertTriangle size={12} style={{ marginRight: 4 }} />}
                      {label}
                    </span>
                    <span className="dietary-summary-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Accessibility Summary Panel */}
      <div className="guests-summary-panel">
        <div
          className="guests-summary-header"
          onClick={() => setAccessibilitySummaryOpen(!accessibilitySummaryOpen)}
        >
          <h4 className="guests-summary-title">
            Accessibility & Special Needs
          </h4>
          <ChevronDown
            size={18}
            className={`guests-summary-chevron ${accessibilitySummaryOpen ? 'open' : ''}`}
          />
        </div>
        {accessibilitySummaryOpen && (
          <div className="guests-summary-content">
            {accessibilityGuests.length > 0 ? (
              <div className="accessibility-summary-list">
                {accessibilityGuests.map((guest) => (
                  <div key={guest.id} className="accessibility-guest-row">
                    <span className="accessibility-guest-name">{guest.guest_name}</span>
                    <span className="accessibility-guest-needs">Accessibility required</span>
                    <span className="accessibility-guest-notes">
                      {guest.accessibility_notes || 'No additional notes'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#64748b' }}>No accessibility requirements</p>
            )}

            {childrenCount > 0 && (
              <div className="children-summary">
                <span className="children-summary-count">{childrenCount}</span>
                <span className="children-summary-text">
                  children attending
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Guest Modal */}
      {(showAddModal || editingGuest) && (
        <GuestFormModal
          eventId={eventId}
          guest={editingGuest}
          onClose={() => {
            setShowAddModal(false);
            setEditingGuest(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingGuest(null);
            loadGuests();
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportGuestsModal
          eventId={eventId}
          onClose={() => setShowImportModal(false)}
          onSuccess={(count) => {
            setShowImportModal(false);
            showToast(`Successfully imported ${count} guests`, 'success');
            loadGuests();
          }}
        />
      )}
    </div>
  );
};

// ===== Guest Form Modal Component =====
interface GuestFormModalProps {
  eventId: string;
  guest: WeddingGuest | null;
  onClose: () => void;
  onSuccess: () => void;
}

const GuestFormModal: React.FC<GuestFormModalProps> = ({ eventId, guest, onClose, onSuccess }) => {
  const [form, setForm] = useState<GuestCreate>({
    guest_name: guest?.guest_name || '',
    email: guest?.email || '',
    phone: guest?.phone || '',
    side: guest?.side || null,
    guest_group: guest?.guest_group || null,
    rsvp_status: guest?.rsvp_status || 'pending',
    dietary_restrictions: guest?.dietary_restrictions || [],
    dietary_notes: guest?.dietary_notes || '',
    plus_one_allowed: guest?.plus_one_allowed || false,
    plus_one_name: guest?.plus_one_name || '',
    is_child: guest?.is_child || false,
    needs_accessibility: guest?.needs_accessibility || false,
    accessibility_notes: guest?.accessibility_notes || '',
    gift_received: guest?.gift_received || false,
  });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const handleDietaryToggle = (diet: DietaryRestriction) => {
    setForm((prev) => {
      const current = prev.dietary_restrictions || [];
      if (current.includes(diet)) {
        return { ...prev, dietary_restrictions: current.filter((d) => d !== diet) };
      } else {
        return { ...prev, dietary_restrictions: [...current, diet] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!form.guest_name || form.guest_name.trim().length < 2) {
      showToast('Guest name is required (min 2 characters)', 'error');
      return;
    }

    setSaving(true);

    if (guest) {
      // Update existing
      const { error } = await updateGuest(eventId, guest.id, form as GuestUpdate);
      if (error) {
        showToast(`Failed to update: ${error}`, 'error');
        setSaving(false);
        return;
      }
      showToast('Guest updated', 'success');
    } else {
      // Create new
      const { error } = await createGuest(eventId, form);
      if (error) {
        showToast(`Failed to add: ${error}`, 'error');
        setSaving(false);
        return;
      }
      showToast('Guest added', 'success');
    }

    setSaving(false);
    onSuccess();
  };

  return (
    <div className="guest-modal-backdrop" onClick={onClose}>
      <div className="guest-modal" onClick={(e) => e.stopPropagation()}>
        <div className="guest-modal-header">
          <h2 className="guest-modal-title">{guest ? 'Edit Guest' : 'Add Guest'}</h2>
          <button className="guest-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="guest-modal-body">
          {/* Name */}
          <div className="guest-form-group full-width">
            <label className="guest-form-label">Guest Name *</label>
            <input
              type="text"
              className="guest-form-input"
              value={form.guest_name}
              onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
              placeholder="John Smith"
            />
          </div>

          {/* Email & Phone */}
          <div className="guest-form-row">
            <div className="guest-form-group">
              <label className="guest-form-label">Email</label>
              <input
                type="email"
                className="guest-form-input"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value || null })}
                placeholder="john@example.com"
              />
            </div>
            <div className="guest-form-group">
              <label className="guest-form-label">Phone</label>
              <input
                type="tel"
                className="guest-form-input"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
                placeholder="+1 555-123-4567"
              />
            </div>
          </div>

          {/* Side & Group */}
          <div className="guest-form-row">
            <div className="guest-form-group">
              <label className="guest-form-label">Side</label>
              <select
                className="guest-form-select"
                value={form.side || ''}
                onChange={(e) => setForm({ ...form, side: (e.target.value as GuestSide) || null })}
              >
                <option value="">Not specified</option>
                <option value="bride">Bride</option>
                <option value="groom">Groom</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="guest-form-group">
              <label className="guest-form-label">Group</label>
              <select
                className="guest-form-select"
                value={form.guest_group || ''}
                onChange={(e) => setForm({ ...form, guest_group: (e.target.value as GuestGroup) || null })}
              >
                <option value="">Not specified</option>
                <option value="family">Family</option>
                <option value="friends">Friends</option>
                <option value="coworkers">Coworkers</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* RSVP */}
          <div className="guest-form-group">
            <label className="guest-form-label">RSVP Status</label>
            <select
              className="guest-form-select"
              value={form.rsvp_status}
              onChange={(e) => setForm({ ...form, rsvp_status: e.target.value as RsvpStatus })}
            >
              <option value="pending">Pending</option>
              <option value="yes">Attending</option>
              <option value="no">Declined</option>
            </select>
          </div>

          {/* Dietary Restrictions */}
          <div className="guest-form-group">
            <label className="guest-form-label">Dietary Restrictions</label>
            <div className="guest-form-checkbox-group">
              {Object.entries(DIETARY_LABELS).map(([key, label]) => (
                <label
                  key={key}
                  className={`guest-form-checkbox ${form.dietary_restrictions?.includes(key as DietaryRestriction) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={form.dietary_restrictions?.includes(key as DietaryRestriction)}
                    onChange={() => handleDietaryToggle(key as DietaryRestriction)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Plus One */}
          <div className="guest-form-row">
            <div className="guest-form-group">
              <label className="guest-form-toggle">
                <input
                  type="checkbox"
                  checked={form.plus_one_allowed}
                  onChange={(e) => setForm({ ...form, plus_one_allowed: e.target.checked })}
                />
                <span className="guest-form-toggle-switch" />
                <span className="guest-form-toggle-label">Plus-one allowed</span>
              </label>
            </div>
            {form.plus_one_allowed && (
              <div className="guest-form-group">
                <label className="guest-form-label">Plus One Name</label>
                <input
                  type="text"
                  className="guest-form-input"
                  value={form.plus_one_name || ''}
                  onChange={(e) => setForm({ ...form, plus_one_name: e.target.value || null })}
                  placeholder="Jane Smith"
                />
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="guest-form-row">
            <div className="guest-form-group">
              <label className="guest-form-toggle">
                <input
                  type="checkbox"
                  checked={form.is_child}
                  onChange={(e) => setForm({ ...form, is_child: e.target.checked })}
                />
                <span className="guest-form-toggle-switch" />
                <span className="guest-form-toggle-label">Is a child</span>
              </label>
            </div>
            <div className="guest-form-group">
              <label className="guest-form-toggle">
                <input
                  type="checkbox"
                  checked={form.needs_accessibility}
                  onChange={(e) => setForm({ ...form, needs_accessibility: e.target.checked })}
                />
                <span className="guest-form-toggle-switch" />
                <span className="guest-form-toggle-label">Accessibility required</span>
              </label>
            </div>
          </div>

          {/* Accessibility Notes */}
          {form.needs_accessibility && (
            <div className="guest-form-group full-width">
              <label className="guest-form-label">Accessibility Notes</label>
              <input
                type="text"
                className="guest-form-input"
                value={form.accessibility_notes || ''}
                onChange={(e) => setForm({ ...form, accessibility_notes: e.target.value || null })}
                placeholder="Wheelchair access, mobility assistance, etc."
              />
            </div>
          )}
        </div>

        <div className="guest-modal-footer">
          <button className="guests-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="guests-btn primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : guest ? 'Save Changes' : 'Add Guest'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestListTab;
