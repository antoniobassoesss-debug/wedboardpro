import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  listTeamMembers,
  fetchTeamMember,
  fetchTeamWorkload,
} from '../api/teamsApi.js';
import type { TeamMemberSummary, TeamMemberDetail, WorkloadByMember } from '../api/teamsApi.js';

type TeamsView = 'overview' | 'workload';

export default function TeamsSection() {
  const [members, setMembers] = useState<TeamMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMemberDetail | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);
  const [view, setView] = useState<TeamsView>('overview');
  const [workload, setWorkload] = useState<WorkloadByMember[] | null>(null);
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMembers = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const { data, error: err } = await listTeamMembers();
      if (err) {
        setError(err);
      } else if (data) {
        setMembers(data);
        if (!selectedMemberId && data.length > 0) {
          setSelectedMemberId(data[0].id);
        }
      }

      if (showLoading) {
        setLoading(false);
      }
    },
    [selectedMemberId],
  );

  const loadMemberDetail = useCallback(
    async (memberId: string) => {
      setLoadingMember(true);
      const { data, error: err } = await fetchTeamMember(memberId);
      if (!err && data) {
        setSelectedMember(data);
      }
      setLoadingMember(false);
    },
    [],
  );

  const loadWorkload = useCallback(async () => {
    setLoadingWorkload(true);
    const { data, error: err } = await fetchTeamWorkload();
    if (!err && data) {
      setWorkload(data);
    }
    setLoadingWorkload(false);
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    loadMembers(true);
  }, [loadMembers]);

  // Fetch detail for selected member
  useEffect(() => {
    if (selectedMemberId) {
      loadMemberDetail(selectedMemberId);
    } else {
      setSelectedMember(null);
    }
  }, [selectedMemberId, loadMemberDetail]);

  // Periodic refresh to catch cases where visibility/focus events might be missed
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadMembers(false);
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [loadMembers]);

  // Re-fetch when window becomes visible (after sleep/idle)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        fetchTimeoutRef.current = setTimeout(() => {
          loadMembers(false);
        }, 300);
      }
    };

    const handleFocus = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        loadMembers(false);
      }, 300);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [loadMembers]);

  // Workload data when switching to workload view
  useEffect(() => {
    if (view === 'workload' && workload == null && !loadingWorkload) {
      loadWorkload();
    }
  }, [view, workload, loadingWorkload, loadWorkload]);

  const renderMemberCard = (m: TeamMemberSummary) => {
    const name = m.displayName || 'Unknown';
    const email = m.displayEmail || '';
    const initials = (name || email || 'U')
      .split(' ')
      .map((s: string) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const isSelected = selectedMemberId === m.id;

    return (
      <button
        key={m.id}
        type="button"
        onClick={() => setSelectedMemberId(m.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          borderRadius: 12,
          border: isSelected ? '1px solid #0f172a' : '1px solid #eee',
          background: isSelected ? '#0f172a' : '#fff',
          color: isSelected ? '#f9fafb' : '#111827',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: isSelected ? '#111827' : '#efefef',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: isSelected ? '#f9fafb' : '#111827',
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{name}</div>
          {email && <div style={{ fontSize: 12, color: isSelected ? '#e5e7eb' : '#6b6b6b' }}>{email}</div>}
        </div>
        <div
          style={{
            fontSize: 12,
            color: isSelected ? '#e5e7eb' : '#6b6b6b',
            textTransform: 'capitalize',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <span>{m.position || m.role}</span>
        </div>
      </button>
    );
  };

  const renderMemberDetail = () => {
    if (!selectedMember) {
      return (
        <div style={{ padding: 24, color: '#6b6b6b', fontSize: 14 }}>
          Select a team member on the left to see their events, tasks, and availability.
        </div>
      );
    }

    return (
      <div
        style={{
          borderRadius: 16,
          border: '1px solid #e5e5e5',
          background: '#ffffff',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f9fafb',
              fontWeight: 700,
            }}
          >
            {(selectedMember.displayName || 'U')
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{selectedMember.displayName}</div>
            {selectedMember.displayEmail && (
              <div style={{ fontSize: 12, color: '#6b6b6b' }}>{selectedMember.displayEmail}</div>
            )}
            <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>
              {selectedMember.position || selectedMember.role} ·{' '}
              {selectedMember.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#6b6b6b', textAlign: 'right' }}>
            <div>
              {selectedMember.upcomingEventsCount} upcoming event
              {selectedMember.upcomingEventsCount === 1 ? '' : 's'}
            </div>
            <div>
              {selectedMember.openTasksCount} open task
              {selectedMember.openTasksCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div
          style={{
            borderRadius: 12,
            border: '1px dashed #e5e7eb',
            padding: 12,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 11,
            color: '#374151',
          }}
        >
          <span style={{ fontWeight: 600, marginRight: 6 }}>Permissions:</span>
          <span>
            {selectedMember.permissions.can_edit_events ? 'Can edit events' : 'View-only events'}
          </span>
          <span>·</span>
          <span>
            {selectedMember.permissions.can_edit_budget ? 'Can edit budget' : 'No budget edits'}
          </span>
          <span>·</span>
          <span>
            {selectedMember.permissions.can_invite_members ? 'Can invite members' : 'No invites'}
          </span>
          <span>·</span>
          <span>
            {selectedMember.permissions.can_view_financials
              ? 'Sees financials'
              : 'Hidden financials'}
          </span>
        </div>

        {/* Assignments and tasks side by side */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>Event assignments</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {selectedMember.assignments.length === 0 && (
                <div style={{ color: '#9ca3af' }}>No events assigned yet.</div>
              )}
              {selectedMember.assignments.map((a) => (
                <div
                  key={a.id}
                  style={{
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    padding: 8,
                    background: '#f9fafb',
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{a.event_title}</div>
                  <div style={{ color: '#6b7280' }}>
                    {a.wedding_date ? new Date(a.wedding_date).toLocaleDateString() : 'No date'} ·{' '}
                    {a.role_in_event}
                    {a.is_primary_contact ? ' · Primary contact' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>Tasks</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {selectedMember.tasks.length === 0 && (
                <div style={{ color: '#9ca3af' }}>No tasks assigned.</div>
              )}
              {selectedMember.tasks.map((t) => (
                <div
                  key={t.id}
                  style={{
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    padding: 8,
                    background: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: '2px 8px',
                        fontSize: 11,
                        textTransform: 'capitalize',
                        background:
                          t.status === 'done'
                            ? '#dcfce7'
                            : t.status === 'in_progress'
                            ? '#fef9c3'
                            : '#fee2e2',
                        color:
                          t.status === 'done'
                            ? '#15803d'
                            : t.status === 'in_progress'
                            ? '#92400e'
                            : '#b91c1c',
                      }}
                    >
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ color: '#6b7280' }}>
                    {t.event_title || 'Unlinked'} ·{' '}
                    {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Availability (compact list) */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Availability</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            {selectedMember.availability.length === 0 && (
              <div style={{ color: '#9ca3af' }}>No availability data recorded.</div>
            )}
            {selectedMember.availability.map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderRadius: 8,
                  padding: '4px 8px',
                  background: '#f9fafb',
                }}
              >
                <span>{new Date(d.date).toLocaleDateString()}</span>
                <span style={{ textTransform: 'capitalize', color: '#4b5563' }}>
                  {d.status.replace('_', ' ')}
                  {d.note ? ` · ${d.note}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWorkload = () => {
    if (loadingWorkload && !workload) {
      return <div style={{ color: '#6b6b6b' }}>Loading workload…</div>;
    }

    if (!workload || workload.length === 0) {
      return (
        <div style={{ padding: 16, color: '#6b6b6b', fontSize: 14 }}>
          No assignments yet. As you connect team members to events, their workload will appear here.
        </div>
      );
    }

    return (
      <div
        style={{
          borderRadius: 16,
          border: '1px solid #e5e5e5',
          background: '#ffffff',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {workload.map((row) => (
          <div
            key={row.member_id}
            style={{
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: 10,
              background: '#f9fafb',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{row.member_name}</div>
            {row.assignments.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9ca3af' }}>No events assigned.</div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  fontSize: 11,
                }}
              >
                {row.assignments.map((a, idx) => (
                  <div
                    key={`${row.member_id}-${idx}-${a.event_id || 'none'}`}
                    style={{
                      borderRadius: 999,
                      padding: '4px 10px',
                      background: '#0f172a',
                      color: '#f9fafb',
                    }}
                  >
                    {a.event_title} ·{' '}
                    {a.wedding_date ? new Date(a.wedding_date).toLocaleDateString() : 'No date'}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Teams</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#6b6b6b' }}>
            See who is on your team, their workload and assignments.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: '#6b6b6b', fontSize: 13 }}>{members.length} members</div>
          <div
            style={{
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              padding: 2,
              display: 'flex',
              background: '#f9fafb',
            }}
          >
            <button
              type="button"
              onClick={() => setView('overview')}
              style={{
                border: 'none',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                cursor: 'pointer',
                background: view === 'overview' ? '#0f172a' : 'transparent',
                color: view === 'overview' ? '#f9fafb' : '#4b5563',
              }}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setView('workload')}
              style={{
                border: 'none',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                cursor: 'pointer',
                background: view === 'workload' ? '#0f172a' : 'transparent',
                color: view === 'workload' ? '#f9fafb' : '#4b5563',
              }}
            >
              Workload
            </button>
          </div>
        </div>
      </div>

      {loading && <div style={{ color: '#6b6b6b' }}>Loading team…</div>}
      {error && <div style={{ color: '#b91c1c' }}>{error}</div>}

      {!loading && !error && view === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 16 }}>
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
            <div style={{ fontSize: 13, fontWeight: 600 }}>Team members</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.length === 0 && (
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  No team members yet. Invite your team from Account → Team.
                </div>
              )}
              {members.map((m) => renderMemberCard(m))}
            </div>
          </div>

          <div>{loadingMember ? <div style={{ color: '#6b6b6b' }}>Loading member…</div> : renderMemberDetail()}</div>
        </div>
      )}

      {!loading && !error && view === 'workload' && renderWorkload()}
    </div>
  );
}

