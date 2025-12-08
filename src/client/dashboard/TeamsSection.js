import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { listTeamMembers, fetchTeamMember, fetchTeamWorkload, } from '../api/teamsApi.js';
export default function TeamsSection() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [loadingMember, setLoadingMember] = useState(false);
    const [view, setView] = useState('overview');
    const [workload, setWorkload] = useState(null);
    const [loadingWorkload, setLoadingWorkload] = useState(false);
    const fetchTimeoutRef = useRef(null);
    const loadMembers = useCallback(async (showLoading = true) => {
        if (showLoading) {
            setLoading(true);
        }
        setError(null);
        const { data, error: err } = await listTeamMembers();
        if (err) {
            setError(err);
        }
        else if (data) {
            setMembers(data);
            if (!selectedMemberId && data.length > 0) {
                setSelectedMemberId(data[0].id);
            }
        }
        if (showLoading) {
            setLoading(false);
        }
    }, [selectedMemberId]);
    const loadMemberDetail = useCallback(async (memberId) => {
        setLoadingMember(true);
        const { data, error: err } = await fetchTeamMember(memberId);
        if (!err && data) {
            setSelectedMember(data);
        }
        setLoadingMember(false);
    }, []);
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
        }
        else {
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
        if (typeof window === 'undefined')
            return;
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
    const renderMemberCard = (m) => {
        const name = m.displayName || 'Unknown';
        const email = m.displayEmail || '';
        const initials = (name || email || 'U')
            .split(' ')
            .map((s) => s[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
        const isSelected = selectedMemberId === m.id;
        return (_jsxs("button", { type: "button", onClick: () => setSelectedMemberId(m.id), style: {
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
            }, children: [_jsx("div", { style: {
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        background: isSelected ? '#111827' : '#efefef',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: isSelected ? '#f9fafb' : '#111827',
                    }, children: initials }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600 }, children: name }), email && _jsx("div", { style: { fontSize: 12, color: isSelected ? '#e5e7eb' : '#6b6b6b' }, children: email })] }), _jsx("div", { style: {
                        fontSize: 12,
                        color: isSelected ? '#e5e7eb' : '#6b6b6b',
                        textTransform: 'capitalize',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                    }, children: _jsx("span", { children: m.position || m.role }) })] }, m.id));
    };
    const renderMemberDetail = () => {
        if (!selectedMember) {
            return (_jsx("div", { style: { padding: 24, color: '#6b6b6b', fontSize: 14 }, children: "Select a team member on the left to see their events, tasks, and availability." }));
        }
        return (_jsxs("div", { style: {
                borderRadius: 16,
                border: '1px solid #e5e5e5',
                background: '#ffffff',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: {
                                width: 48,
                                height: 48,
                                borderRadius: 999,
                                background: '#0f172a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#f9fafb',
                                fontWeight: 700,
                            }, children: (selectedMember.displayName || 'U')
                                .split(' ')
                                .map((s) => s[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase() }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600 }, children: selectedMember.displayName }), selectedMember.displayEmail && (_jsx("div", { style: { fontSize: 12, color: '#6b6b6b' }, children: selectedMember.displayEmail })), _jsxs("div", { style: { fontSize: 12, color: '#6b6b6b', marginTop: 4 }, children: [selectedMember.position || selectedMember.role, " \u00B7", ' ', selectedMember.is_active ? 'Active' : 'Inactive'] })] }), _jsxs("div", { style: { fontSize: 12, color: '#6b6b6b', textAlign: 'right' }, children: [_jsxs("div", { children: [selectedMember.upcomingEventsCount, " upcoming event", selectedMember.upcomingEventsCount === 1 ? '' : 's'] }), _jsxs("div", { children: [selectedMember.openTasksCount, " open task", selectedMember.openTasksCount === 1 ? '' : 's'] })] })] }), _jsxs("div", { style: {
                        borderRadius: 12,
                        border: '1px dashed #e5e7eb',
                        padding: 12,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        fontSize: 11,
                        color: '#374151',
                    }, children: [_jsx("span", { style: { fontWeight: 600, marginRight: 6 }, children: "Permissions:" }), _jsx("span", { children: selectedMember.permissions.can_edit_events ? 'Can edit events' : 'View-only events' }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: selectedMember.permissions.can_edit_budget ? 'Can edit budget' : 'No budget edits' }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: selectedMember.permissions.can_invite_members ? 'Can invite members' : 'No invites' }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: selectedMember.permissions.can_view_financials
                                ? 'Sees financials'
                                : 'Hidden financials' })] }), _jsxs("div", { style: {
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
                        gap: 12,
                    }, children: [_jsxs("div", { children: [_jsx("div", { style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 6,
                                    }, children: _jsx("div", { style: { fontSize: 13, fontWeight: 600 }, children: "Event assignments" }) }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }, children: [selectedMember.assignments.length === 0 && (_jsx("div", { style: { color: '#9ca3af' }, children: "No events assigned yet." })), selectedMember.assignments.map((a) => (_jsxs("div", { style: {
                                                borderRadius: 10,
                                                border: '1px solid #e5e7eb',
                                                padding: 8,
                                                background: '#f9fafb',
                                            }, children: [_jsx("div", { style: { fontWeight: 500 }, children: a.event_title }), _jsxs("div", { style: { color: '#6b7280' }, children: [a.wedding_date ? new Date(a.wedding_date).toLocaleDateString() : 'No date', " \u00B7", ' ', a.role_in_event, a.is_primary_contact ? ' · Primary contact' : ''] })] }, a.id)))] })] }), _jsxs("div", { children: [_jsx("div", { style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 6,
                                    }, children: _jsx("div", { style: { fontSize: 13, fontWeight: 600 }, children: "Tasks" }) }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }, children: [selectedMember.tasks.length === 0 && (_jsx("div", { style: { color: '#9ca3af' }, children: "No tasks assigned." })), selectedMember.tasks.map((t) => (_jsxs("div", { style: {
                                                borderRadius: 10,
                                                border: '1px solid #e5e7eb',
                                                padding: 8,
                                                background: '#ffffff',
                                            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 6 }, children: [_jsx("div", { style: { fontWeight: 500 }, children: t.title }), _jsx("span", { style: {
                                                                borderRadius: 999,
                                                                padding: '2px 8px',
                                                                fontSize: 11,
                                                                textTransform: 'capitalize',
                                                                background: t.status === 'done'
                                                                    ? '#dcfce7'
                                                                    : t.status === 'in_progress'
                                                                        ? '#fef9c3'
                                                                        : '#fee2e2',
                                                                color: t.status === 'done'
                                                                    ? '#15803d'
                                                                    : t.status === 'in_progress'
                                                                        ? '#92400e'
                                                                        : '#b91c1c',
                                                            }, children: t.status.replace('_', ' ') })] }), _jsxs("div", { style: { color: '#6b7280' }, children: [t.event_title || 'Unlinked', " \u00B7", ' ', t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date'] })] }, t.id)))] })] })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, marginBottom: 6 }, children: "Availability" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }, children: [selectedMember.availability.length === 0 && (_jsx("div", { style: { color: '#9ca3af' }, children: "No availability data recorded." })), selectedMember.availability.map((d) => (_jsxs("div", { style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderRadius: 8,
                                        padding: '4px 8px',
                                        background: '#f9fafb',
                                    }, children: [_jsx("span", { children: new Date(d.date).toLocaleDateString() }), _jsxs("span", { style: { textTransform: 'capitalize', color: '#4b5563' }, children: [d.status.replace('_', ' '), d.note ? ` · ${d.note}` : ''] })] }, d.id)))] })] })] }));
    };
    const renderWorkload = () => {
        if (loadingWorkload && !workload) {
            return _jsx("div", { style: { color: '#6b6b6b' }, children: "Loading workload\u2026" });
        }
        if (!workload || workload.length === 0) {
            return (_jsx("div", { style: { padding: 16, color: '#6b6b6b', fontSize: 14 }, children: "No assignments yet. As you connect team members to events, their workload will appear here." }));
        }
        return (_jsx("div", { style: {
                borderRadius: 16,
                border: '1px solid #e5e5e5',
                background: '#ffffff',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
            }, children: workload.map((row) => (_jsxs("div", { style: {
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    padding: 10,
                    background: '#f9fafb',
                }, children: [_jsx("div", { style: { fontWeight: 600, marginBottom: 4 }, children: row.member_name }), row.assignments.length === 0 ? (_jsx("div", { style: { fontSize: 12, color: '#9ca3af' }, children: "No events assigned." })) : (_jsx("div", { style: {
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                            fontSize: 11,
                        }, children: row.assignments.map((a, idx) => (_jsxs("div", { style: {
                                borderRadius: 999,
                                padding: '4px 10px',
                                background: '#0f172a',
                                color: '#f9fafb',
                            }, children: [a.event_title, " \u00B7", ' ', a.wedding_date ? new Date(a.wedding_date).toLocaleDateString() : 'No date'] }, `${row.member_id}-${idx}-${a.event_id || 'none'}`))) }))] }, row.member_id))) }));
    };
    return (_jsxs("div", { style: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0 }, children: "Teams" }), _jsx("p", { style: { margin: 0, fontSize: 13, color: '#6b6b6b' }, children: "See who is on your team, their workload and assignments." })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("div", { style: { color: '#6b6b6b', fontSize: 13 }, children: [members.length, " members"] }), _jsxs("div", { style: {
                                    borderRadius: 999,
                                    border: '1px solid #e5e7eb',
                                    padding: 2,
                                    display: 'flex',
                                    background: '#f9fafb',
                                }, children: [_jsx("button", { type: "button", onClick: () => setView('overview'), style: {
                                            border: 'none',
                                            padding: '4px 10px',
                                            borderRadius: 999,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            background: view === 'overview' ? '#0f172a' : 'transparent',
                                            color: view === 'overview' ? '#f9fafb' : '#4b5563',
                                        }, children: "Overview" }), _jsx("button", { type: "button", onClick: () => setView('workload'), style: {
                                            border: 'none',
                                            padding: '4px 10px',
                                            borderRadius: 999,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            background: view === 'workload' ? '#0f172a' : 'transparent',
                                            color: view === 'workload' ? '#f9fafb' : '#4b5563',
                                        }, children: "Workload" })] })] })] }), loading && _jsx("div", { style: { color: '#6b6b6b' }, children: "Loading team\u2026" }), error && _jsx("div", { style: { color: '#b91c1c' }, children: error }), !loading && !error && view === 'overview' && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 16 }, children: [_jsxs("div", { style: {
                            borderRadius: 16,
                            border: '1px solid #e5e5e5',
                            padding: 12,
                            background: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            height: '100%',
                        }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600 }, children: "Team members" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [members.length === 0 && (_jsx("div", { style: { fontSize: 12, color: '#6b7280' }, children: "No team members yet. Invite your team from Account \u2192 Team." })), members.map((m) => renderMemberCard(m))] })] }), _jsx("div", { children: loadingMember ? _jsx("div", { style: { color: '#6b6b6b' }, children: "Loading member\u2026" }) : renderMemberDetail() })] })), !loading && !error && view === 'workload' && renderWorkload()] }));
}
//# sourceMappingURL=TeamsSection.js.map