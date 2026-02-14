import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount, deleteNotification, markNotificationUnread, type Notification } from '../api/notificationsApi';
import { browserSupabaseClient } from '../browserSupabaseClient';
import { getStoredSession } from '../utils/sessionManager';

interface NotificationsBellProps {
  className?: string;
}

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const TaskIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

const EmptyBellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <path d="M9 8l6 6" />
    <path d="M15 8l-6 6" />
  </svg>
);

const NotificationsBell: React.FC<NotificationsBellProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hoveredNotificationId, setHoveredNotificationId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof browserSupabaseClient>['channel']> | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await listNotifications({ unread: false, limit: 50 });
      if (error) {
        console.error('Failed to fetch notifications:', error);
        return;
      }
      setNotifications(data || []);
    } catch (err) {
      console.error('Unexpected error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count } = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  const setSupabaseSession = useCallback(async () => {
    if (!browserSupabaseClient) return;
    const session = getStoredSession();
    if (!session?.access_token || !session?.refresh_token) return;
    try {
      await browserSupabaseClient.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    } catch (err) {
      console.warn('[NotificationsBell] Failed to set Supabase session:', err);
    }
  }, []);

  useEffect(() => {
    const subscribeToRealtime = async () => {
      if (!browserSupabaseClient) return;
      const session = getStoredSession();
      const userId = session?.user?.id || (session as any)?.user_id;
      if (!userId) {
        const userStr = typeof window !== 'undefined' ? window.localStorage.getItem('wedboarpro_user') : null;
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            const extractedUserId = user?.id;
            if (extractedUserId) {
              const finalUserId = extractedUserId;
              await setSupabaseSession();
              if (channelRef.current) {
                await browserSupabaseClient.removeChannel(channelRef.current);
                channelRef.current = null;
              }
              const channelName = `notifications:${finalUserId}:${Date.now()}`;
              const channel = browserSupabaseClient.channel(channelName);
              channel.on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${finalUserId}` },
                (payload) => {
                  const newNotification = payload.new as Notification;
                  if (newNotification) {
                    setNotifications((prev) => {
                      if (prev.some((n) => n.id === newNotification.id)) return prev;
                      return [newNotification, ...prev];
                    });
                    if (!newNotification.is_read) setUnreadCount((prev) => prev + 1);
                  }
                }
              );
              channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  console.log('[NotificationsBell] Successfully subscribed to notifications');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                  console.warn('[NotificationsBell] Realtime subscription error:', status);
                }
              });
              channelRef.current = channel;
              return;
            }
          } catch (err) {
            console.warn('[NotificationsBell] Failed to parse user from localStorage:', err);
          }
        }
        return;
      }
      const finalUserId = userId;
      await setSupabaseSession();
      if (channelRef.current) {
        await browserSupabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      const channelName = `notifications:${userId}:${Date.now()}`;
      const channel = browserSupabaseClient.channel(channelName);
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotification = payload.new as Notification;
          if (newNotification && !newNotification.is_read) {
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      );
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[NotificationsBell] Successfully subscribed to notifications');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[NotificationsBell] Realtime subscription error:', status);
        }
      });
      channelRef.current = channel;
    };
    subscribeToRealtime();
    return () => {
      if (channelRef.current && browserSupabaseClient) {
        browserSupabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setSupabaseSession]);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (isOpen) fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      fetchNotifications();
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const { error } = await markNotificationRead(id);
    if (error) {
      console.error('Failed to mark notification as read:', error);
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAsUnread = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const { error } = await markNotificationUnread(id);
    if (error) {
      console.error('Failed to mark notification as unread:', error);
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)));
    setUnreadCount((prev) => prev + 1);
  };

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await deleteNotification(id);
    if (error) {
      console.error('Failed to delete notification:', error);
      return;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    const { error } = await markAllNotificationsRead();
    if (error) {
      console.error('Failed to mark all as read:', error);
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) handleMarkAsRead(notification.id);
    if (notification.related_entity_type === 'task' && notification.related_entity_id) {
      window.dispatchEvent(new CustomEvent('wbp:navigate', { detail: { tab: 'todo' } }));
    } else if (notification.type === 'team_invitation' || notification.related_entity_type === 'team') {
      window.dispatchEvent(new CustomEvent('wbp:navigate', { detail: { tab: 'teams' } }));
    }
    setIsOpen(false);
  };

  const parseNotificationMessage = (message: string, type?: string) => {
    if (type === 'team_invitation') {
      const lines = message.split('\n');
      const teamLine = lines[0]?.replace(/^Team:\s*/, '') || '';
      return { taskTitle: teamLine, projectName: null, isTeamInvitation: true };
    }
    const lines = message.split('\n');
    const taskLine = lines[0]?.replace(/^Task:\s*/, '') || '';
    const projectLine = lines[1]?.replace(/^in\s*/, '') || null;
    return { taskTitle: taskLine, projectName: projectLine, isTeamInvitation: false };
  };

  const hasUnread = unreadCount > 0;
  const bellColor = isOpen || hasUnread ? '#14B8A6' : '#6B7280';

  const renderMobileModal = () => {
    if (!isMobile) return null;
    return React.createElement('div', { className: 'notifications-mobile-overlay', onClick: () => setIsOpen(false) },
      React.createElement('div', { className: 'notifications-mobile-modal', onClick: (e: React.MouseEvent) => e.stopPropagation() },
        React.createElement('div', { className: 'notifications-mobile-header' },
          React.createElement('h3', { className: 'notifications-mobile-title' }, 'Notifications'),
          React.createElement('button', {
            type: 'button',
            className: 'notifications-mobile-close',
            onClick: () => setIsOpen(false)
          },
            React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
              React.createElement('path', { d: 'M18 6L6 18M6 6l12 12' })
            )
          )
        ),
        unreadCount > 0 && React.createElement('button', {
          type: 'button',
          className: 'notifications-mobile-mark-read',
          onClick: handleMarkAllAsRead
        }, 'Mark all as read'),
        React.createElement('div', { className: 'notifications-mobile-list' },
          loading ? React.createElement('div', { className: 'notifications-mobile-loading' }, 'Loading...') :
          notifications.length === 0 ? React.createElement('div', { className: 'notifications-mobile-empty' },
            React.createElement(EmptyBellIcon, null),
            React.createElement('p', null, 'No notifications yet'),
            React.createElement('span', null, "You'll be notified when someone assigns you a task")
          ) :
          notifications.map((notification) => {
            const { taskTitle, projectName, isTeamInvitation } = parseNotificationMessage(notification.message, notification.type);
            const isUnread = !notification.is_read;
            return React.createElement('div', {
              key: notification.id,
              className: `notifications-mobile-item ${isUnread ? 'unread' : ''}`,
              onClick: () => handleNotificationClick(notification)
            },
              React.createElement('div', { className: 'notifications-mobile-item-icon' },
                (isTeamInvitation || notification.type === 'team_invitation') ?
                  React.createElement(UsersIcon, null) :
                  React.createElement(TaskIcon, null)
              ),
              React.createElement('div', { className: 'notifications-mobile-item-content' },
                React.createElement('div', { className: 'notifications-mobile-item-title' }, notification.title),
                React.createElement('div', { className: 'notifications-mobile-item-message' },
                  isTeamInvitation ? `Team: ${taskTitle}` : taskTitle
                ),
                projectName && !isTeamInvitation && React.createElement('div', { className: 'notifications-mobile-item-project' }, `in ${projectName}`),
                React.createElement('div', { className: 'notifications-mobile-item-time' }, formatTimeAgo(notification.created_at))
              ),
              React.createElement('button', {
                type: 'button',
                className: 'notifications-mobile-dismiss',
                onClick: (e: React.MouseEvent) => handleDismiss(notification.id, e)
              },
                React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
                  React.createElement('path', { d: 'M18 6L6 18M6 6l12 12' })
                )
              )
            );
          })
        )
      )
    );
  };

  return React.createElement(React.Fragment, null,
    isOpen && isMobile && renderMobileModal(),
    React.createElement('div', { className: className, ref: dropdownRef, style: { position: 'relative' } },
      React.createElement('button', {
        type: 'button',
        onClick: () => setIsOpen(!isOpen),
        className: 'wp-floating-notifications',
        title: 'Notifications',
        style: { color: bellColor }
      },
        React.createElement(BellIcon, null),
        unreadCount > 0 && React.createElement('span', { className: 'wp-floating-notifications-badge' },
          unreadCount > 9 ? '9+' : unreadCount
        )
      ),
      isOpen && !isMobile && React.createElement('div', {
        className: 'notifications-desktop-dropdown',
        style: {
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          width: '380px',
          maxHeight: '600px',
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      },
        React.createElement('div', {
          style: {
            padding: '16px 20px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }
        },
          React.createElement('h3', { style: { margin: 0, fontSize: '16px', fontWeight: 600, color: '#1F2937' } }, 'Notifications'),
          unreadCount > 0 && React.createElement('button', {
            type: 'button',
            onClick: handleMarkAllAsRead,
            style: {
              background: 'transparent',
              border: 'none',
              color: '#14B8A6',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              padding: '4px 8px',
              borderRadius: '4px'
            }
          }, 'Mark all as read')
        ),
        React.createElement('div', {
          style: { overflowY: 'auto', maxHeight: '500px', minHeight: '200px' }
        },
          loading ? React.createElement('div', { style: { padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' } }, 'Loading...') :
          notifications.length === 0 ? React.createElement('div', {
            style: { padding: '40px 20px', textAlign: 'center', color: '#9CA3AF' }
          },
            React.createElement(EmptyBellIcon, { style: { color: '#D1D5DB', margin: '0 auto 16px' } }),
            React.createElement('div', { style: { fontSize: '14px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' } }, 'No notifications yet'),
            React.createElement('div', { style: { fontSize: '12px', color: '#9CA3AF' } }, "You'll be notified when someone assigns you a task")
          ) :
          notifications.map((notification, index) => {
            const { taskTitle, projectName, isTeamInvitation } = parseNotificationMessage(notification.message, notification.type);
            const isUnread = !notification.is_read;
            const isHovered = hoveredNotificationId === notification.id;
            const bgColor = isUnread ? 'rgba(20, 184, 166, 0.04)' : isHovered ? 'rgba(20, 184, 166, 0.08)' : '#FFFFFF';
            return React.createElement('div', {
              key: notification.id,
              onClick: () => handleNotificationClick(notification),
              onMouseEnter: () => setHoveredNotificationId(notification.id),
              onMouseLeave: () => setHoveredNotificationId(null),
              style: {
                padding: '14px 16px',
                borderBottom: index < notifications.length - 1 ? '1px solid #E5E7EB' : 'none',
                cursor: 'pointer',
                background: bgColor,
                transition: 'background 0.15s ease',
                position: 'relative',
                borderLeft: isUnread ? '3px solid #14B8A6' : '3px solid transparent'
              }
            },
              React.createElement('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start' } },
                React.createElement('div', {
                  style: {
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '1px solid #E5E7EB'
                  }
                },
                  (isTeamInvitation || notification.type === 'team_invitation') ?
                    React.createElement(UsersIcon, { style: { color: '#6B7280' } }) :
                    React.createElement(TaskIcon, { style: { color: '#6B7280' } })
                ),
                React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                  React.createElement('div', {
                    style: {
                      fontWeight: isUnread ? 600 : 500,
                      fontSize: '14px',
                      marginBottom: '4px',
                      color: '#1F2937',
                      lineHeight: '1.4'
                    }
                  }, notification.title),
                  React.createElement('div', {
                    style: { fontSize: '14px', color: '#374151', marginBottom: '2px', fontWeight: 500, lineHeight: '1.4' }
                  }, isTeamInvitation ? `Team: ${taskTitle}` : taskTitle),
                  projectName && !isTeamInvitation && React.createElement('div', {
                    style: { fontSize: '12px', color: '#6B7280', marginBottom: '4px', lineHeight: '1.4' }
                  }, `in ${projectName}`),
                  React.createElement('div', { style: { fontSize: '11px', color: '#9CA3AF', marginTop: '4px' } },
                    formatTimeAgo(notification.created_at)
                  )
                ),
                isHovered && React.createElement('div', {
                  style: { display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 },
                  onClick: (e: React.MouseEvent) => e.stopPropagation()
                },
                  notification.is_read ? React.createElement('button', {
                    type: 'button',
                    onClick: (e: React.MouseEvent) => handleMarkAsUnread(notification.id, e),
                    title: 'Mark as unread',
                    style: {
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      color: '#6B7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }
                  }, React.createElement(CheckIcon, null)) :
                  React.createElement('button', {
                    type: 'button',
                    onClick: (e: React.MouseEvent) => handleMarkAsRead(notification.id, e),
                    title: 'Mark as read',
                    style: {
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      color: '#6B7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }
                  }, React.createElement(CheckIcon, null)),
                  React.createElement('button', {
                    type: 'button',
                    onClick: (e: React.MouseEvent) => handleDismiss(notification.id, e),
                    title: 'Dismiss',
                    style: {
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      color: '#6B7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }
                  }, React.createElement(XIcon, null))
                )
              )
            );
          })
        )
      )
    )
  );
};

export default NotificationsBell;
