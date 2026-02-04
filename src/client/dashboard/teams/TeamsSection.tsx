import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  listTeamMembers,
  fetchTeamMember,
  listSentInvitations,
  cancelInvitation,
  resendInvitation,
  inviteMemberWithPermissions,
  updateMemberPermissions,
  removeMember,
  type MemberPermissions,
  type TeamInvitation,
} from '../../api/teamsApi.js';
import type { TeamMemberSummary, TeamMemberDetail } from '../../api/teamsApi.js';
import { useSubscription } from '../../hooks/useSubscription.js';
import { UpgradePromptModal } from '../../components/UpgradePromptModal.js';
import './teams.css';

type StatusFilter = 'all' | 'active' | 'pending' | 'disabled';
type RoleFilter = 'all' | 'owner' | 'admin' | 'member';

const getInitials = (name: string | null | undefined, email: string | null | undefined): string => {
  const str = name || email || 'U';
  return str
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusLabel = (member: TeamMemberSummary): 'active' | 'pending' | 'disabled' => {
  if (!member.is_active) return 'disabled';
  // If they have no joined_at, they might be pending
  if (!member.joined_at) return 'pending';
  return 'active';
};

const getPositionLabel = (member: TeamMemberSummary): string => {
  if (member.position) {
    return member.position.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return member.role.charAt(0).toUpperCase() + member.role.slice(1);
};

interface MemberDrawerProps {
  member: TeamMemberDetail | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onRemove?: (memberId: string) => void;
}

const MemberDrawer: React.FC<MemberDrawerProps> = ({ member, isOpen, isLoading, onClose, onRemove }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const status = member ? getStatusLabel(member) : 'active';

  return (
    <div className="teams-drawer-backdrop" onClick={onClose}>
      <div className="teams-drawer" onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <div className="teams-drawer-loading">
            <div className="teams-skeleton teams-skeleton-avatar-lg" />
            <div className="teams-skeleton teams-skeleton-text-lg" />
            <div className="teams-skeleton teams-skeleton-text" />
            <div className="teams-skeleton teams-skeleton-text" />
          </div>
        ) : member ? (
          <>
            <div className="teams-drawer-header">
              <div className="teams-drawer-avatar">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.displayName} />
                ) : (
                  getInitials(member.displayName, member.displayEmail)
                )}
              </div>
              <div className="teams-drawer-header-info">
                <h3 className="teams-drawer-name">{member.displayName}</h3>
                {member.displayEmail && (
                  <a href={`mailto:${member.displayEmail}`} className="teams-drawer-email">
                    {member.displayEmail}
                  </a>
                )}
                <div className="teams-drawer-meta">
                  <span className="teams-drawer-role">{getPositionLabel(member)}</span>
                  <span className={`teams-status-badge ${status}`}>{status}</span>
                </div>
              </div>
              <button type="button" className="teams-drawer-close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="teams-drawer-body">
              {/* Basic Info Section */}
              <div className="teams-drawer-section">
                <div className="teams-drawer-section-title">Basic Information</div>
                <div className="teams-drawer-info-grid">
                  <div className="teams-drawer-info-item">
                    <span className="teams-drawer-label">Full Name</span>
                    <span className="teams-drawer-value">{member.displayName}</span>
                  </div>
                  <div className="teams-drawer-info-item">
                    <span className="teams-drawer-label">Email</span>
                    <span className="teams-drawer-value">{member.displayEmail || '—'}</span>
                  </div>
                  <div className="teams-drawer-info-item">
                    <span className="teams-drawer-label">Role</span>
                    <span className="teams-drawer-value">{member.role}</span>
                  </div>
                  <div className="teams-drawer-info-item">
                    <span className="teams-drawer-label">Position</span>
                    <span className="teams-drawer-value">{getPositionLabel(member)}</span>
                  </div>
                  <div className="teams-drawer-info-item">
                    <span className="teams-drawer-label">Joined</span>
                    <span className="teams-drawer-value">{formatDate(member.joined_at)}</span>
                  </div>
                  <div className="teams-drawer-info-item">
                    <span className="teams-drawer-label">Hourly Rate</span>
                    <span className="teams-drawer-value">{member.hourly_rate || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="teams-drawer-section">
                <div className="teams-drawer-section-title">Permissions</div>
                <div className="teams-drawer-permissions">
                  <div className={`teams-permission-chip ${member.permissions.can_edit_events ? 'enabled' : ''}`}>
                    <span className="teams-permission-icon">{member.permissions.can_edit_events ? '✓' : '✗'}</span>
                    Edit Events
                  </div>
                  <div className={`teams-permission-chip ${member.permissions.can_edit_budget ? 'enabled' : ''}`}>
                    <span className="teams-permission-icon">{member.permissions.can_edit_budget ? '✓' : '✗'}</span>
                    Edit Budget
                  </div>
                  <div className={`teams-permission-chip ${member.permissions.can_invite_members ? 'enabled' : ''}`}>
                    <span className="teams-permission-icon">{member.permissions.can_invite_members ? '✓' : '✗'}</span>
                    Invite Members
                  </div>
                  <div className={`teams-permission-chip ${member.permissions.can_view_financials ? 'enabled' : ''}`}>
                    <span className="teams-permission-icon">{member.permissions.can_view_financials ? '✓' : '✗'}</span>
                    View Financials
                  </div>
                </div>
              </div>

              {/* Activity Section */}
              <div className="teams-drawer-section">
                <div className="teams-drawer-section-title">Activity</div>
                <div className="teams-drawer-activity">
                  <div className="teams-drawer-activity-item">
                    <span className="teams-drawer-activity-label">Upcoming Events</span>
                    <span className="teams-drawer-activity-value">{member.upcomingEventsCount}</span>
                  </div>
                  <div className="teams-drawer-activity-item">
                    <span className="teams-drawer-activity-label">Open Tasks</span>
                    <span className="teams-drawer-activity-value">{member.openTasksCount}</span>
                  </div>
                </div>
              </div>

              {/* Assignments */}
              {member.assignments.length > 0 && (
                <div className="teams-drawer-section">
                  <div className="teams-drawer-section-title">Event Assignments</div>
                  <div className="teams-drawer-assignments">
                    {member.assignments.map((a) => (
                      <div key={a.id} className="teams-assignment-item">
                        <div className="teams-assignment-title">{a.event_title}</div>
                        <div className="teams-assignment-meta">
                          {a.wedding_date ? formatDate(a.wedding_date) : 'No date'} · {a.role_in_event}
                          {a.is_primary_contact && <span className="teams-primary-badge">Primary</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {member.notes && (
                <div className="teams-drawer-section">
                  <div className="teams-drawer-section-title">Notes</div>
                  <p className="teams-drawer-notes">{member.notes}</p>
                </div>
              )}
            </div>

            <div className="teams-drawer-footer">
              {member.role !== 'owner' && onRemove && (
                <button
                  type="button"
                  className="teams-drawer-action-btn destructive"
                  onClick={() => onRemove(member.id)}
                >
                  Remove from Team
                </button>
              )}
              {member.role === 'owner' && (
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                  Team owner cannot be removed
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="teams-drawer-empty">
            <p>Could not load member details.</p>
            <button type="button" className="teams-drawer-close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function TeamsSection() {
  const [members, setMembers] = useState<TeamMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMemberDetail | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [invitePermissions, setInvitePermissions] = useState<MemberPermissions>({
    can_view_billing: false,
    can_manage_billing: false,
    can_view_usage: false,
    can_manage_team: false,
    can_manage_settings: false,
    can_create_events: true,
    can_view_all_events: true,
    can_delete_events: false,
  });
  const [fullOwnerPermissions, setFullOwnerPermissions] = useState(false);

  // Pending invitations state
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [actioningInvite, setActioningInvite] = useState<string | null>(null);

  // Upgrade prompt state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeData, setUpgradeData] = useState<{ current: number; limit: number; planName: string; requiredPlan: string } | null>(null);

  // Subscription check
  const { planName, maxTeamMembers, memberCount } = useSubscription();

  const loadMembers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    const { data, error: err } = await listTeamMembers();
    if (err) {
      setError(err);
    } else if (data) {
      setMembers(data);
    }

    if (showLoading) setLoading(false);
  }, []);

  const loadMemberDetail = useCallback(async (memberId: string) => {
    setLoadingMember(true);
    const { data, error: err } = await fetchTeamMember(memberId);
    if (!err && data) {
      setSelectedMember(data);
    } else {
      setSelectedMember(null);
    }
    setLoadingMember(false);
  }, []);

  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    const { data, error: err } = await listSentInvitations();
    if (!err && data) {
      setPendingInvitations(data);
    }
    setLoadingInvitations(false);
  }, []);

  const handleCancelInvitation = useCallback(async (invitationId: string) => {
    setActioningInvite(invitationId);
    const { error: err } = await cancelInvitation(invitationId);
    if (!err) {
      setPendingInvitations(prev => prev.filter(i => i.id !== invitationId));
    }
    setActioningInvite(null);
  }, []);

  const handleResendInvitation = useCallback(async (invitationId: string) => {
    setActioningInvite(invitationId);
    const { data, error: err } = await resendInvitation(invitationId);
    if (!err && data) {
      setPendingInvitations(prev => prev.map(i => i.id === invitationId ? data : i));
    }
    setActioningInvite(null);
  }, []);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;
    const { error: err } = await removeMember(memberId);
    if (!err) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      if (selectedMemberId === memberId) {
        setIsDrawerOpen(false);
        setSelectedMemberId(null);
        setSelectedMember(null);
      }
    }
  }, [selectedMemberId]);

  // Initial fetch
  useEffect(() => {
    loadMembers(true);
    loadInvitations();
  }, [loadMembers, loadInvitations]);

  // Load detail when member is selected
  useEffect(() => {
    if (selectedMemberId && isDrawerOpen) {
      loadMemberDetail(selectedMemberId);
    }
  }, [selectedMemberId, isDrawerOpen, loadMemberDetail]);

  // Periodic refresh
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadMembers(false);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [loadMembers]);

  // Visibility change refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => loadMembers(false), 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [loadMembers]);

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setSelectedMember(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setInviteError('Please enter a valid email address');
      return;
    }

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    const permissions = fullOwnerPermissions
      ? {
          can_view_billing: true,
          can_manage_billing: true,
          can_view_usage: true,
          can_manage_team: true,
          can_manage_settings: true,
          can_create_events: true,
          can_view_all_events: true,
          can_delete_events: true,
        }
      : invitePermissions;

    const { data, error: err, limitError } = await inviteMemberWithPermissions(inviteEmail, permissions);

    if (limitError) {
      setInviting(false);
      setShowInviteModal(false);
      setUpgradeData({
        current: limitError.current,
        limit: limitError.limit,
        planName: limitError.planName,
        requiredPlan: limitError.requiredPlan,
      });
      setShowUpgradeModal(true);
      return;
    }

    if (err) {
      setInviteError(err);
      setInviting(false);
      return;
    }

    setInviteSuccess(true);
    setInviteEmail('');
    setFullOwnerPermissions(false);
    setInvitePermissions({
      can_view_billing: false,
      can_manage_billing: false,
      can_view_usage: false,
      can_manage_team: false,
      can_manage_settings: false,
      can_create_events: true,
      can_view_all_events: true,
      can_delete_events: false,
    });

    // Refresh lists after successful invite
    setTimeout(() => {
      loadMembers(false);
      loadInvitations();
      setShowInviteModal(false);
      setInviteSuccess(false);
    }, 1500);

    setInviting(false);
  };

  // Filter members
  const filteredMembers = useMemo(() => {
    let result = members;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.displayName?.toLowerCase().includes(q) ||
          m.displayEmail?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((m) => {
        const status = getStatusLabel(m);
        return status === statusFilter;
      });
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter((m) => m.role === roleFilter);
    }

    return result;
  }, [members, searchQuery, statusFilter, roleFilter]);

  const isEmpty = members.length === 0 && !loading && !error;
  const hasNoResults = members.length > 0 && filteredMembers.length === 0;

  return (
    <div className="teams-container">
      {/* Header */}
      <div className="teams-header">
        <div className="teams-header-right">
          <span className="teams-count">{members.length} members</span>
          <button type="button" className="teams-add-btn" onClick={() => setShowInviteModal(true)}>
            + Add team member
          </button>
        </div>
      </div>

      {isEmpty ? (
        // Empty State
        <div className="teams-empty-state">
          <div className="teams-empty-illustration">
            <div className="teams-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>
          <h2 className="teams-empty-title">No team members yet</h2>
          <p className="teams-empty-description">
            Invite your team to collaborate on wedding projects together.
          </p>
          <button type="button" className="teams-empty-cta">
            Add your first team member
          </button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="teams-toolbar">
            <input
              type="text"
              className="teams-search"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="teams-filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              style={{
                borderRadius: 999,
                border: '1px solid #e5e7eb',
                padding: '9px 36px 9px 16px',
                fontSize: 14,
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
                backgroundSize: '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0f172a';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="all">All roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
            <select
              className="teams-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              style={{
                borderRadius: 999,
                border: '1px solid #e5e7eb',
                padding: '9px 36px 9px 16px',
                fontSize: 14,
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
                backgroundSize: '16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#0f172a';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending invite</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* Loading */}
          {loading && (
            <div className="teams-list">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="teams-list-item skeleton">
                  <div className="teams-skeleton teams-skeleton-avatar" />
                  <div className="teams-skeleton-content">
                    <div className="teams-skeleton teams-skeleton-text" />
                    <div className="teams-skeleton teams-skeleton-text-sm" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="teams-error">
              <p>{error}</p>
              <button type="button" onClick={() => loadMembers(true)}>
                Try again
              </button>
            </div>
          )}

          {/* No Results */}
          {hasNoResults && !loading && (
            <div className="teams-no-results">
              <p>No team members match your search or filters.</p>
              <button
                type="button"
                className="teams-clear-filters"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setRoleFilter('all');
                }}
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Member List */}
          {!loading && !error && filteredMembers.length > 0 && (
            <div className="teams-list">
              {filteredMembers.map((m) => {
                const status = getStatusLabel(m);
                const isSelected = selectedMemberId === m.id && isDrawerOpen;

                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`teams-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectMember(m.id)}
                  >
                    <div className="teams-list-avatar">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.displayName} />
                      ) : (
                        getInitials(m.displayName, m.displayEmail)
                      )}
                    </div>
                    <div className="teams-list-info">
                      <div className="teams-list-name">{m.displayName}</div>
                      <div className="teams-list-meta">
                        <span className="teams-list-role">{getPositionLabel(m)}</span>
                        {m.displayEmail && (
                          <>
                            <span className="teams-list-separator">·</span>
                            <span className="teams-list-email">{m.displayEmail}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="teams-list-right">
                      <span className={`teams-status-badge ${status}`}>{status}</span>
                      {m.role === 'owner' && <span className="teams-role-tag">Owner</span>}
                      {m.role === 'admin' && <span className="teams-role-tag">Admin</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div style={{ marginTop: 32, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Invitations ({pendingInvitations.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingInvitations.map((invite) => {
              const isExpired = new Date(invite.expires_at) < new Date();
              const isActioning = actioningInvite === invite.id;
              return (
                <div
                  key={invite.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: isExpired ? '#fef2f2' : '#f8fafc',
                    border: `1px solid ${isExpired ? '#fee2e2' : '#e5e7eb'}`,
                    borderRadius: 12,
                    opacity: isActioning ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      background: '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#64748b',
                    }}>
                      {(invite.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{invite.email}</div>
                      <div style={{ fontSize: 12, color: isExpired ? '#ef4444' : '#64748b' }}>
                        {isExpired ? 'Expired' : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleResendInvitation(invite.id)}
                      disabled={isActioning}
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: 'none',
                        background: '#0f172a',
                        color: '#ffffff',
                        cursor: isActioning ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelInvitation(invite.id)}
                      disabled={isActioning}
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: '1px solid #e5e7eb',
                        background: '#ffffff',
                        color: '#64748b',
                        cursor: isActioning ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Member Drawer */}
      <MemberDrawer
        member={selectedMember}
        isOpen={isDrawerOpen}
        isLoading={loadingMember}
        onClose={handleCloseDrawer}
        onRemove={handleRemoveMember}
      />

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => {
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteError(null);
            setInviteSuccess(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              background: '#ffffff',
              borderRadius: 20,
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: 'modalIn 200ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                  Invite Team Member
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                  Send an invitation to join your team
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteError(null);
                  setInviteSuccess(false);
                }}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: 999,
                  fontSize: 18,
                  color: '#64748b',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Email input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError(null);
                  }}
                  placeholder="colleague@example.com"
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '10px 12px',
                    outline: 'none',
                    transition: 'all 150ms ease',
                    background: '#ffffff',
                    color: '#0f172a',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0f172a';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {inviteError && (
                  <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{inviteError}</p>
                )}
                {inviteSuccess && (
                  <p style={{ fontSize: 12, color: '#10b981', margin: 0 }}>
                    Invitation sent successfully!
                  </p>
                )}
              </div>

              {/* Permissions section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12, display: 'block' }}>
                    Permissions
                  </label>

                  {/* Full owner permissions checkbox */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '12px 14px',
                      background: fullOwnerPermissions ? '#f0f9ff' : '#f8fafc',
                      border: fullOwnerPermissions ? '1px solid #0ea5e9' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      cursor: 'pointer',
                      marginBottom: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={fullOwnerPermissions}
                      onChange={(e) => setFullOwnerPermissions(e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Give full owner permissions</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Full access to billing, team, settings, and all features. Use for business partners or co-owners.
                      </div>
                    </div>
                  </label>

                  {/* Granular permissions (disabled if full owner) */}
                  <div style={{ opacity: fullOwnerPermissions ? 0.5 : 1, pointerEvents: fullOwnerPermissions ? 'none' : 'auto' }}>
                    {/* Billing & Account */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billing & Account</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox" checked={invitePermissions.can_view_billing} onChange={(e) => setInvitePermissions(p => ({ ...p, can_view_billing: e.target.checked }))} />
                          View Billing <span style={{ color: '#94a3b8' }}>- See invoices and plan details</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox" checked={invitePermissions.can_manage_billing} onChange={(e) => setInvitePermissions(p => ({ ...p, can_manage_billing: e.target.checked, can_view_billing: e.target.checked || (p.can_view_billing ?? false) }))} />
                          Manage Billing <span style={{ color: '#94a3b8' }}>- Change plan, payment methods</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox" checked={invitePermissions.can_view_usage} onChange={(e) => setInvitePermissions(p => ({ ...p, can_view_usage: e.target.checked }))} />
                          View Usage <span style={{ color: '#94a3b8' }}>- See limits and consumption</span>
                        </label>
                      </div>
                    </div>

                    {/* Team & Settings */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team & Settings</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox" checked={invitePermissions.can_manage_team} onChange={(e) => setInvitePermissions(p => ({ ...p, can_manage_team: e.target.checked }))} />
                          Manage Team <span style={{ color: '#94a3b8' }}>- Invite/remove team members</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox" checked={invitePermissions.can_manage_settings} onChange={(e) => setInvitePermissions(p => ({ ...p, can_manage_settings: e.target.checked }))} />
                          Manage Settings <span style={{ color: '#94a3b8' }}>- Edit account settings</span>
                        </label>
                      </div>
                    </div>

                    {/* Events */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Events</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox" checked={invitePermissions.can_create_events} onChange={(e) => setInvitePermissions(p => ({ ...p, can_create_events: e.target.checked }))} />
                          Create Events <span style={{ color: '#94a3b8' }}>- Create new events</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox" checked={invitePermissions.can_view_all_events} onChange={(e) => setInvitePermissions(p => ({ ...p, can_view_all_events: e.target.checked }))} />
                          View All Events <span style={{ color: '#94a3b8' }}>- See all team events</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                          <input type="checkbox" checked={invitePermissions.can_delete_events} onChange={(e) => setInvitePermissions(p => ({ ...p, can_delete_events: e.target.checked }))} />
                          Delete Events <span style={{ color: '#94a3b8' }}>- Permanently delete events</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '16px 24px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteError(null);
                  setInviteSuccess(false);
                }}
                style={{
                  padding: '10px 24px',
                  borderRadius: 999,
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                style={{
                  padding: '10px 24px',
                  borderRadius: 999,
                  border: 'none',
                  background: inviting || !inviteEmail ? '#e5e7eb' : '#0f172a',
                  color: inviting || !inviteEmail ? '#94a3b8' : '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: inviting || !inviteEmail ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => {
                  if (inviteEmail && !inviting) {
                    e.currentTarget.style.background = '#1e293b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (inviteEmail && !inviting) {
                    e.currentTarget.style.background = '#0f172a';
                  }
                }}
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgradeModal && upgradeData && (
        <UpgradePromptModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setUpgradeData(null);
          }}
          feature="team members"
          currentPlan={upgradeData.planName}
          requiredPlan={upgradeData.requiredPlan}
          currentUsage={upgradeData.current}
          limit={upgradeData.limit}
        />
      )}
    </div>
  );
}

