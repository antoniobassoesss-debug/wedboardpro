import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
export const EventSharingSection = ({ currentUserId, visibility, sharedUserIds, onVisibilityChange, onSharedUsersChange, }) => {
    const [teamMembers, setTeamMembers] = useState([]);
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
            }
            catch (err) {
                console.error('Failed to fetch team members:', err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, []);
    const filteredMembers = teamMembers.filter((m) => {
        if (m.user_id === currentUserId)
            return false; // exclude self
        const name = m.profile?.full_name || m.displayName || '';
        const email = m.profile?.email || m.displayEmail || '';
        const query = searchQuery.toLowerCase();
        return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    });
    const toggleUser = (userId) => {
        const next = sharedUserIds.includes(userId)
            ? sharedUserIds.filter((id) => id !== userId)
            : [...sharedUserIds, userId];
        onSharedUsersChange(next);
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: '#0c0c0c' }, children: "Sharing" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("label", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            padding: 8,
                            borderRadius: 8,
                            background: visibility === 'private' ? '#f5f5f5' : 'transparent',
                        }, children: [_jsx("input", { type: "radio", checked: visibility === 'private', onChange: () => onVisibilityChange('private'), style: { cursor: 'pointer' } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 13 }, children: "Only me" }), _jsx("div", { style: { fontSize: 12, color: '#7c7c7c' }, children: "Private event, only visible to you" })] })] }), _jsxs("label", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            padding: 8,
                            borderRadius: 8,
                            background: visibility === 'team' ? '#f5f5f5' : 'transparent',
                        }, children: [_jsx("input", { type: "radio", checked: visibility === 'team', onChange: () => onVisibilityChange('team'), style: { cursor: 'pointer' } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 13 }, children: "Whole team" }), _jsxs("div", { style: { fontSize: 12, color: '#7c7c7c' }, children: [visibility === 'team' && (_jsx("span", { style: { color: '#2563eb', fontWeight: 500 }, children: "This will appear for everyone in your team" })), visibility !== 'team' && 'Visible to all team members'] })] })] }), _jsxs("label", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            padding: 8,
                            borderRadius: 8,
                            background: visibility === 'custom' ? '#f5f5f5' : 'transparent',
                        }, children: [_jsx("input", { type: "radio", checked: visibility === 'custom', onChange: () => onVisibilityChange('custom'), style: { cursor: 'pointer' } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 13 }, children: "Specific people" }), _jsx("div", { style: { fontSize: 12, color: '#7c7c7c' }, children: "Choose who can see this event" })] })] })] }), visibility === 'custom' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }, children: [_jsx("input", { type: "text", placeholder: "Search team members...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), style: {
                            borderRadius: 8,
                            border: '1px solid #e3e3e3',
                            padding: '8px 12px',
                            fontSize: 13,
                            outline: 'none',
                        } }), _jsx("div", { style: {
                            maxHeight: 200,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            border: '1px solid #e3e3e3',
                            borderRadius: 8,
                            padding: 8,
                        }, children: loading ? (_jsx("div", { style: { fontSize: 12, color: '#7c7c7c', textAlign: 'center', padding: 12 }, children: "Loading..." })) : filteredMembers.length === 0 ? (_jsx("div", { style: { fontSize: 12, color: '#7c7c7c', textAlign: 'center', padding: 12 }, children: searchQuery ? 'No members found' : 'No team members available' })) : (filteredMembers.map((member) => {
                            const name = member.profile?.full_name || member.displayName || 'Unknown';
                            const email = member.profile?.email || member.displayEmail || '';
                            const isSelected = sharedUserIds.includes(member.user_id);
                            return (_jsxs("label", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    cursor: 'pointer',
                                    padding: 8,
                                    borderRadius: 6,
                                    background: isSelected ? '#f0f9ff' : 'transparent',
                                }, children: [_jsx("input", { type: "checkbox", checked: isSelected, onChange: () => toggleUser(member.user_id), style: { cursor: 'pointer' } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 500, fontSize: 13 }, children: name }), email && _jsx("div", { style: { fontSize: 11, color: '#7c7c7c' }, children: email })] })] }, member.user_id));
                        })) })] }))] }));
};
//# sourceMappingURL=EventSharingSection.js.map