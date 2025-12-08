import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from '../api/notificationsApi';
const NotificationsBell = ({ className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await listNotifications({ unread: false, limit: 20 });
            if (error) {
                console.error('Failed to fetch notifications:', error);
                return;
            }
            setNotifications(data || []);
        }
        catch (err) {
            console.error('Unexpected error fetching notifications:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const fetchUnreadCount = useCallback(async () => {
        try {
            const { count } = await getUnreadCount();
            setUnreadCount(count);
        }
        catch (err) {
            console.error('Failed to fetch unread count:', err);
        }
    }, []);
    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(() => {
            fetchUnreadCount();
            if (isOpen) {
                fetchNotifications();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications, fetchUnreadCount, isOpen]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            fetchNotifications();
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, fetchNotifications]);
    const handleMarkAsRead = async (id) => {
        const { error } = await markNotificationRead(id);
        if (error) {
            console.error('Failed to mark notification as read:', error);
            return;
        }
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
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
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'task_assigned':
            case 'task_reassigned':
                return '📋';
            case 'task_completed':
                return '✅';
            case 'team_invitation':
                return '👥';
            default:
                return '🔔';
        }
    };
    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            handleMarkAsRead(notification.id);
        }
        // Navigate to related entity if available
        if (notification.related_entity_type === 'task' && notification.related_entity_id) {
            // Could navigate to task detail or todo page
            window.location.hash = '#todo';
        }
        setIsOpen(false);
    };
    return (_jsxs("div", { className: className, style: { position: 'relative' }, ref: dropdownRef, children: [_jsxs("button", { type: "button", onClick: () => setIsOpen(!isOpen), style: {
                    position: 'relative',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }, title: "Notifications", children: [_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), _jsx("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })] }), unreadCount > 0 && (_jsx("span", { style: {
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: '#ef4444',
                            color: 'white',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }, children: unreadCount > 9 ? '9+' : unreadCount }))] }), isOpen && (_jsxs("div", { style: {
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '360px',
                    maxHeight: '500px',
                    background: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }, children: [_jsxs("div", { style: {
                            padding: '16px',
                            borderBottom: '1px solid #e5e5e5',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }, children: [_jsx("h3", { style: { margin: 0, fontSize: '16px', fontWeight: 700 }, children: "Notifications" }), unreadCount > 0 && (_jsx("button", { type: "button", onClick: handleMarkAllAsRead, style: {
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#2563eb',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    padding: '4px 8px',
                                }, children: "Mark all read" }))] }), _jsx("div", { style: {
                            overflowY: 'auto',
                            maxHeight: '400px',
                        }, children: loading ? (_jsx("div", { style: { padding: '40px', textAlign: 'center', color: '#7c7c7c' }, children: "Loading..." })) : notifications.length === 0 ? (_jsx("div", { style: { padding: '40px', textAlign: 'center', color: '#7c7c7c' }, children: "No notifications" })) : (notifications.map((notification) => (_jsx("div", { onClick: () => handleNotificationClick(notification), style: {
                                padding: '12px 16px',
                                borderBottom: '1px solid #f0f0f0',
                                cursor: 'pointer',
                                background: notification.is_read ? 'white' : '#f0f9ff',
                                transition: 'background 0.2s',
                            }, onMouseEnter: (e) => {
                                if (notification.is_read) {
                                    e.currentTarget.style.background = '#f9f9f9';
                                }
                            }, onMouseLeave: (e) => {
                                if (notification.is_read) {
                                    e.currentTarget.style.background = 'white';
                                }
                            }, children: _jsxs("div", { style: { display: 'flex', gap: '12px', alignItems: 'flex-start' }, children: [_jsx("div", { style: { fontSize: '20px', flexShrink: 0 }, children: getNotificationIcon(notification.type) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                                    fontWeight: notification.is_read ? 500 : 700,
                                                    fontSize: '14px',
                                                    marginBottom: '4px',
                                                    color: '#0c0c0c',
                                                }, children: notification.title }), _jsx("div", { style: { fontSize: '13px', color: '#666', marginBottom: '4px' }, children: notification.message }), _jsx("div", { style: { fontSize: '11px', color: '#999' }, children: formatTimeAgo(notification.created_at) })] }), !notification.is_read && (_jsx("div", { style: {
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: '#2563eb',
                                            flexShrink: 0,
                                            marginTop: '4px',
                                        } }))] }) }, notification.id)))) })] }))] }));
};
export default NotificationsBell;
//# sourceMappingURL=NotificationsBell.js.map