import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import DashboardContent from './DashboardContent';
import './wedding-dashboard.css';
import { browserSupabaseClient } from '../browserSupabaseClient';
import NotificationsBell from '../components/NotificationsBell';

const SECTION_TITLES: Record<string, string> = {
  home: 'Bloom Studio Dashboard',
  work: 'Project Pipeline',
  calendar: 'Event Calendar',
  layouts: 'Layout Library',
  quotes: 'Quotes & Proposals',
  todo: 'Task Manager',
};

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

  const title = useMemo(() => SECTION_TITLES[active] ?? 'Bloom Studio Dashboard', [active]);

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

  return (
    <div className="wp-shell">
      <Sidebar
        active={active}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        onSelect={setActive}
        userName={displayName}
        avatarUrl={avatarUrl}
      />
      <div className="wp-main">
        <header className="wp-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo/iconlogo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <div>
              <h1 style={{ margin: 0 }}>{title}</h1>
            </div>
          </div>
          <div className="wp-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationsBell />
            <button type="button" className="wp-pill">
              Search
            </button>
            <button type="button" className="wp-pill primary">
              New Project
            </button>
          </div>
        </header>
        <section className="wp-content">
          <DashboardContent active={active} onNavigate={setActive} />
        </section>
      </div>
    </div>
  );
};

export default WeddingDashboard;


