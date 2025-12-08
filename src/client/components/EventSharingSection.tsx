import React, { useEffect, useState } from 'react';

type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    full_name?: string | null;
    email?: string | null;
  };
  displayName?: string;
  displayEmail?: string;
};

type EventSharingSectionProps = {
  currentUserId: string;
  visibility: 'private' | 'team' | 'custom';
  sharedUserIds: string[];
  onVisibilityChange: (visibility: 'private' | 'team' | 'custom') => void;
  onSharedUsersChange: (userIds: string[]) => void;
};

export const EventSharingSection: React.FC<EventSharingSectionProps> = ({
  currentUserId,
  visibility,
  sharedUserIds,
  onVisibilityChange,
  onSharedUsersChange,
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const session = JSON.parse(localStorage.getItem('wedboarpro_session') || '{}');
        const token = session?.access_token;
        if (!token) {
          setTeamMembers([]);
          return;
        }
        const res = await fetch('/api/teams/members', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data.members || []);
        }
      } catch (err) {
        console.error('Failed to fetch team members:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const filteredMembers = teamMembers.filter((m) => {
    if (m.user_id === currentUserId) return false; // exclude self
    const name = m.profile?.full_name || m.displayName || '';
    const email = m.profile?.email || m.displayEmail || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  const toggleUser = (userId: string) => {
    const next = sharedUserIds.includes(userId)
      ? sharedUserIds.filter((id) => id !== userId)
      : [...sharedUserIds, userId];
    onSharedUsersChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0c0c0c' }}>Sharing</div>

      {/* Radio buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            background: visibility === 'private' ? '#f5f5f5' : 'transparent',
          }}
        >
          <input
            type="radio"
            checked={visibility === 'private'}
            onChange={() => onVisibilityChange('private')}
            style={{ cursor: 'pointer' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Only me</div>
            <div style={{ fontSize: 12, color: '#7c7c7c' }}>Private event, only visible to you</div>
          </div>
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            background: visibility === 'team' ? '#f5f5f5' : 'transparent',
          }}
        >
          <input
            type="radio"
            checked={visibility === 'team'}
            onChange={() => onVisibilityChange('team')}
            style={{ cursor: 'pointer' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Whole team</div>
            <div style={{ fontSize: 12, color: '#7c7c7c' }}>
              {visibility === 'team' && (
                <span style={{ color: '#2563eb', fontWeight: 500 }}>This will appear for everyone in your team</span>
              )}
              {visibility !== 'team' && 'Visible to all team members'}
            </div>
          </div>
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            background: visibility === 'custom' ? '#f5f5f5' : 'transparent',
          }}
        >
          <input
            type="radio"
            checked={visibility === 'custom'}
            onChange={() => onVisibilityChange('custom')}
            style={{ cursor: 'pointer' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Specific people</div>
            <div style={{ fontSize: 12, color: '#7c7c7c' }}>Choose who can see this event</div>
          </div>
        </label>
      </div>

      {/* Multi-select for custom */}
      {visibility === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              borderRadius: 8,
              border: '1px solid #e3e3e3',
              padding: '8px 12px',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <div
            style={{
              maxHeight: 200,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              border: '1px solid #e3e3e3',
              borderRadius: 8,
              padding: 8,
            }}
          >
            {loading ? (
              <div style={{ fontSize: 12, color: '#7c7c7c', textAlign: 'center', padding: 12 }}>Loading...</div>
            ) : filteredMembers.length === 0 ? (
              <div style={{ fontSize: 12, color: '#7c7c7c', textAlign: 'center', padding: 12 }}>
                {searchQuery ? 'No members found' : 'No team members available'}
              </div>
            ) : (
              filteredMembers.map((member) => {
                const name = member.profile?.full_name || member.displayName || 'Unknown';
                const email = member.profile?.email || member.displayEmail || '';
                const isSelected = sharedUserIds.includes(member.user_id);
                return (
                  <label
                    key={member.user_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      padding: 8,
                      borderRadius: 6,
                      background: isSelected ? '#f0f9ff' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUser(member.user_id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{name}</div>
                      {email && <div style={{ fontSize: 11, color: '#7c7c7c' }}>{email}</div>}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Future: Per-user notification settings when they are added to a shared event */}
      {/* TODO: Add notification preferences (email, in-app) per shared user */}
    </div>
  );
};

