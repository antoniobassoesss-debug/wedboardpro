import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getValidAccessToken } from '../utils/sessionManager.js';

interface Team {
  id: string;
  name: string;
  role: string;
}

interface TeamSwitcherProps {
  onTeamSwitch?: (teamId: string) => void;
}

const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ onTeamSwitch }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchTeams = useCallback(async () => {
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/teams/my-team', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.team) {
        const team: Team = {
          id: data.team.id,
          name: data.team.name || 'My Team',
          role: data.membershipRole || 'member',
        };
        setCurrentTeam(team);
        setTeams([team]);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTeamSelect = (team: Team) => {
    setCurrentTeam(team);
    setIsOpen(false);
    if (onTeamSwitch) {
      onTeamSwitch(team.id);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.skeleton} />
      </div>
    );
  }

  if (!currentTeam) {
    return null;
  }

  // If user only has one team, show a simplified view
  const hasMultipleTeams = teams.length > 1;

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => hasMultipleTeams && setIsOpen(!isOpen)}
        style={{
          ...styles.button,
          cursor: hasMultipleTeams ? 'pointer' : 'default',
        }}
      >
        <div style={styles.teamIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div style={styles.teamInfo}>
          <span style={styles.teamName}>{currentTeam.name}</span>
          <span style={styles.teamRole}>{currentTeam.role}</span>
        </div>
        {hasMultipleTeams && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {isOpen && hasMultipleTeams && (
        <div style={styles.dropdown}>
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => handleTeamSelect(team)}
              style={{
                ...styles.dropdownItem,
                background: team.id === currentTeam.id ? '#f8fafc' : 'transparent',
              }}
            >
              <div style={styles.dropdownTeamIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <div style={styles.dropdownTeamInfo}>
                <span style={styles.dropdownTeamName}>{team.name}</span>
                <span style={styles.dropdownTeamRole}>{team.role}</span>
              </div>
              {team.id === currentTeam.id && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  skeleton: {
    width: 180,
    height: 44,
    background: '#f1f5f9',
    borderRadius: 10,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    color: '#0f172a',
    transition: 'all 150ms ease',
  },
  teamIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
  },
  teamInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
  },
  teamName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  teamRole: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'background 150ms ease',
    textAlign: 'left',
  },
  dropdownTeamIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
  },
  dropdownTeamInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  dropdownTeamName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#0f172a',
  },
  dropdownTeamRole: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'capitalize',
  },
};

export default TeamSwitcher;
