import React, { useCallback, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import DashboardContent from './DashboardContent';
import './wedding-dashboard.css';
import { browserSupabaseClient } from '../browserSupabaseClient';
import NotificationsBell from '../components/NotificationsBell';
import { NewProjectModal, type NewProjectPayload } from '../components/NewProjectModal';
import { createEvent } from '../api/eventsPipelineApi';
import { AccountModal } from '../components/AccountModal';
import VerificationBanner from '../components/VerificationBanner';

const safeParse = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[WeddingDashboard] Failed to parse stored auth payload', error);
    return null;
  }
};

const resolveNameFromUser = (user: any): string | null => {
  if (!user) return null;
  const fullName =
    (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim());
  if (fullName) {
    return fullName;
  }
  if (typeof user?.email === 'string' && user.email.trim()) {
    return user.email.trim();
  }
  return null;
};

const deriveDisplayName = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const cachedLabel = window.localStorage.getItem('wedboarpro_display_name');
  if (cachedLabel && cachedLabel.trim()) {
    return cachedLabel.trim();
  }
  const storedUser = safeParse(window.localStorage.getItem('wedboarpro_user'));
  const storedSession = safeParse(window.localStorage.getItem('wedboarpro_session'));
  const candidateUser = storedUser ?? storedSession?.user ?? null;
  const autoName = resolveNameFromUser(candidateUser);
  if (autoName) {
    window.localStorage.setItem('wedboarpro_display_name', autoName);
    return autoName;
  }
  return null;
};

const WeddingDashboard: React.FC = () => {
  const [active, setActive] = useState('home');
  const [collapsed, setCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState(() => deriveDisplayName() ?? 'Sarah Mitchell');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isGlobalProjectModalOpen, setIsGlobalProjectModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(true); // Assume verified by default
  const [checkingVerification, setCheckingVerification] = useState(true);

  const fetchProfileFromSupabase = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!browserSupabaseClient) {
      return;
    }

    const storedSession = safeParse(window.localStorage.getItem('wedboarpro_session'));
    const accessToken = storedSession?.access_token;
    const refreshToken = storedSession?.refresh_token;
    const userId = storedSession?.user?.id;

    if (!accessToken || !refreshToken || !userId) {
      return;
    }

    try {
      const { error: sessionError } = await browserSupabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        console.warn('[WeddingDashboard] Failed to set Supabase session:', sessionError.message);
        return;
      }

      const { data, error } = await browserSupabaseClient
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('[WeddingDashboard] Failed to load Supabase profile:', error.message);
        return;
      }

      const supabaseName = typeof data?.full_name === 'string' ? data.full_name.trim() : '';
      if (supabaseName) {
        setDisplayName(supabaseName);
        window.localStorage.setItem('wedboarpro_display_name', supabaseName);
      }
      setAvatarUrl(data?.avatar_url ?? null);
    } catch (error) {
      console.warn('[WeddingDashboard] Unexpected Supabase profile error:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const refreshName = () => {
      const freshName = deriveDisplayName();
      if (freshName) {
        setDisplayName(freshName);
      }
    };

    refreshName();
    fetchProfileFromSupabase();
    window.addEventListener('storage', refreshName);
    return () => {
      window.removeEventListener('storage', refreshName);
    };
  }, [fetchProfileFromSupabase]);

  // Check email verification status
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const session = JSON.parse(
          window.localStorage.getItem('wedboarpro_session') || '{}'
        );
        const token = session?.access_token;

        if (!token) {
          setCheckingVerification(false);
          return;
        }

        const res = await fetch('/api/auth/verification-status', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setEmailVerified(data.emailVerified);
        }
      } catch (err) {
        console.error('Failed to check verification status:', err);
      } finally {
        setCheckingVerification(false);
      }
    };

    checkVerificationStatus();
  }, []);

  return (
    <div className="wp-shell">
      {!checkingVerification && !emailVerified && <VerificationBanner />}
      <Sidebar
        active={active}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        onSelect={setActive}
        userName={displayName}
        avatarUrl={avatarUrl}
      />
      <div className="wp-main">
        {/* Floating top-right controls */}
        <div className="wp-floating-controls">
          <NotificationsBell />
          <button
            type="button"
            className="wp-floating-profile"
            onClick={() => setAccountOpen(true)}
            title="Open account settings"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" />
            ) : (
              <span className="wp-floating-profile-initials">
                {(displayName || 'U')
                  .split(' ')
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
            )}
          </button>
        </div>

        <section className="wp-content">
          <DashboardContent active={active} onNavigate={setActive} userName={displayName} />
        </section>
      </div>
      <NewProjectModal
        isOpen={isGlobalProjectModalOpen}
        onClose={() => setIsGlobalProjectModalOpen(false)}
        handleCreateProject={async (payload: NewProjectPayload) => {
          setIsCreating(true);
          const dateForSave =
            payload.eventDate && payload.eventDate.trim().length > 0
              ? payload.eventDate
              : new Date().toISOString().slice(0, 10);
          const { data, error } = await createEvent({
            title: payload.title || `New Wedding – ${new Date().toLocaleDateString()}`,
            wedding_date: dateForSave,
          });
          setIsCreating(false);
          if (error) {
            // eslint-disable-next-line no-alert
            alert(`Failed to create event: ${error}`);
            return;
          }
          if (data?.event) {
            // Inform WorkSection to refresh events
            window.dispatchEvent(new CustomEvent('wbp:new-event-created', { detail: data.event }));
          }
          setActive('work');
          setIsGlobalProjectModalOpen(false);
        }}
      />
      <AccountModal open={accountOpen} onOpenChange={setAccountOpen} />
    </div>
  );
};

export default WeddingDashboard;


