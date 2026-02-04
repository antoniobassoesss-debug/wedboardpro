import { useState, useEffect, useCallback } from 'react';
import { getValidAccessToken } from '../utils/sessionManager.js';

export interface UserPermissions {
  is_owner: boolean;
  can_view_billing: boolean;
  can_manage_billing: boolean;
  can_view_usage: boolean;
  can_manage_team: boolean;
  can_manage_settings: boolean;
  can_create_events: boolean;
  can_view_all_events: boolean;
  can_delete_events: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  is_owner: false,
  can_view_billing: false,
  can_manage_billing: false,
  can_view_usage: false,
  can_manage_team: false,
  can_manage_settings: false,
  can_create_events: true,
  can_view_all_events: true,
  can_delete_events: false,
};

const OWNER_PERMISSIONS: UserPermissions = {
  is_owner: true,
  can_view_billing: true,
  can_manage_billing: true,
  can_view_usage: true,
  can_manage_team: true,
  can_manage_settings: true,
  can_create_events: true,
  can_view_all_events: true,
  can_delete_events: true,
};

interface UsePermissionsResult {
  permissions: UserPermissions;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePermissions(): UsePermissionsResult {
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setPermissions(DEFAULT_PERMISSIONS);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/teams/my-team', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      });

      if (res.status === 404) {
        // No team - use owner permissions (they'll create their own team)
        setPermissions(OWNER_PERMISSIONS);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await res.json();

      if (data.membership) {
        setPermissions({
          is_owner: data.membership.is_owner ?? data.membershipRole === 'owner',
          can_view_billing: data.membership.can_view_billing ?? false,
          can_manage_billing: data.membership.can_manage_billing ?? false,
          can_view_usage: data.membership.can_view_usage ?? false,
          can_manage_team: data.membership.can_manage_team ?? false,
          can_manage_settings: data.membership.can_manage_settings ?? false,
          can_create_events: data.membership.can_create_events ?? true,
          can_view_all_events: data.membership.can_view_all_events ?? true,
          can_delete_events: data.membership.can_delete_events ?? false,
        });
      } else if (data.membershipRole === 'owner') {
        setPermissions(OWNER_PERMISSIONS);
      } else {
        setPermissions(DEFAULT_PERMISSIONS);
      }

      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch permissions:', err);
      setError(err?.message || 'Failed to fetch permissions');
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    loading,
    error,
    refetch: fetchPermissions,
  };
}

export default usePermissions;
