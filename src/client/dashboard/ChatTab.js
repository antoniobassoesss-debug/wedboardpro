import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browserSupabaseClient } from '../browserSupabaseClient';
const safeParse = (raw) => {
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
};
const deriveDisplayName = (user) => {
    if (!user)
        return null;
    const metaName = (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
        (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim());
    if (metaName)
        return metaName;
    if (typeof user?.email === 'string' && user.email.trim())
        return user.email.trim();
    return null;
};
export default function ChatTab() {
    const [team, setTeam] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [activeRecipientId, setActiveRecipientId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [profileCache, setProfileCache] = useState({});
    const channelRef = useRef(null);
    const messageListRef = useRef(null);
    const inputRef = useRef(null);
    const storedSession = useMemo(() => {
        if (typeof window === 'undefined')
            return null;
        return safeParse(window.localStorage.getItem('wedboarpro_session'));
    }, []);
    const accessToken = storedSession?.access_token ?? null;
    const refreshToken = storedSession?.refresh_token ?? null;
    const authedUser = storedSession?.user ?? null;
    const authedUserId = authedUser?.id ?? null;
    const authedDisplayName = deriveDisplayName(authedUser) ?? 'You';
    const setSupabaseSession = useCallback(async () => {
        if (!browserSupabaseClient || !accessToken || !refreshToken)
            return;
        try {
            await browserSupabaseClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
        }
        catch (err) {
            console.warn('[ChatTab] Failed to set Supabase session', err);
        }
    }, [accessToken, refreshToken]);
    const fetchTeam = useCallback(async () => {
        if (!accessToken) {
            setTeam(null);
            setError('Please log in to use chat.');
            setLoading(false);
            return null;
        }
        try {
            const res = await fetch('/api/teams/my-team', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache',
                },
                cache: 'no-store',
            });
            if (res.status === 404) {
                setTeam(null);
                setError('No team found. Create one to start chatting.');
                setLoading(false);
                return null;
            }
            const body = await res.json();
            if (!res.ok) {
                throw new Error(body?.error || 'Failed to load team');
            }
            setTeam(body.team);
            return body.team;
        }
        catch (err) {
            setError(err?.message || 'Failed to load team');
            setLoading(false);
            return null;
        }
    }, [accessToken]);
    const fetchConversations = useCallback(async () => {
        if (!accessToken)
            return;
        try {
            const res = await fetch('/api/chat/conversations', {
                headers: { Authorization: `Bearer ${accessToken}` },
                cache: 'no-store',
            });
            const body = await res.json();
            if (!res.ok)
                throw new Error(body?.error || 'Failed to load conversations');
            setConversations(Array.isArray(body.conversations) ? body.conversations : []);
            // Auto-select team conversation if none selected
            if (!activeConversation && body.conversations?.length > 0) {
                const teamConv = body.conversations.find((c) => c.type === 'team');
                if (teamConv) {
                    setActiveConversation(teamConv.id);
                    setActiveRecipientId(null);
                }
            }
        }
        catch (err) {
            console.error('Failed to fetch conversations:', err);
        }
    }, [accessToken, activeConversation]);
    const fetchMessages = useCallback(async (opts) => {
        if (!accessToken || !team || !activeConversation) {
            setLoading(false);
            if (!accessToken)
                setError('Please log in to use chat.');
            if (!team)
                setError('Join or create a team to chat.');
            if (!activeConversation)
                setError('Select a conversation to view messages.');
            return;
        }
        try {
            const params = new URLSearchParams();
            params.set('limit', '50');
            if (opts?.before)
                params.set('before', opts.before);
            if (activeRecipientId)
                params.set('recipientId', activeRecipientId);
            const res = await fetch(`/api/chat/messages?${params.toString()}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                cache: 'no-store',
            });
            const body = await res.json();
            if (!res.ok) {
                throw new Error(body?.error || 'Failed to load messages');
            }
            const incoming = Array.isArray(body.messages) ? body.messages : [];
            console.log('[ChatTab] Fetched messages:', incoming.length, 'for conversation:', activeConversation);
            const incomingProfiles = {};
            incoming.forEach((m) => {
                if (m.user_id && m.profile) {
                    incomingProfiles[m.user_id] = {
                        full_name: m.profile.full_name ?? null,
                        email: m.profile.email ?? null,
                        avatar_url: m.profile.avatar_url ?? null,
                    };
                }
            });
            if (Object.keys(incomingProfiles).length > 0) {
                setProfileCache((prev) => ({ ...prev, ...incomingProfiles }));
            }
            const sorted = incoming.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            console.log('[ChatTab] Setting messages:', sorted.length);
            setMessages(sorted);
            setError(null);
        }
        catch (err) {
            console.error('[ChatTab] Failed to fetch messages:', err);
            setError(err?.message || 'Failed to load messages');
        }
        finally {
            setLoading(false);
        }
    }, [accessToken, team, activeConversation, activeRecipientId]);
    const subscribeToRealtime = useCallback(async () => {
        if (!browserSupabaseClient || !team || !authedUserId || !activeConversation)
            return;
        await setSupabaseSession();
        if (channelRef.current) {
            browserSupabaseClient.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        const channel = browserSupabaseClient.channel(`team:${team.id}:chat`, {
            config: {
                presence: { key: authedUserId },
            },
        });
        channel.on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `team_id=eq.${team.id}`,
        }, (payload) => {
            const data = payload.new ?? null;
            if (!data?.id)
                return;
            // Filter by conversation type
            const isTeamMessage = !data.recipient_id;
            const isDirectMessage = data.recipient_id && (data.user_id === authedUserId || data.recipient_id === authedUserId);
            const matchesActive = (activeRecipientId === null && isTeamMessage) ||
                (activeRecipientId && isDirectMessage && (data.user_id === activeRecipientId || data.recipient_id === activeRecipientId));
            if (!matchesActive)
                return;
            setMessages((prev) => {
                if (prev.some((m) => m.id === data.id))
                    return prev;
                const next = [
                    ...prev,
                    {
                        id: data.id,
                        team_id: data.team_id,
                        user_id: data.user_id,
                        recipient_id: data.recipient_id ?? null,
                        content: data.content,
                        created_at: data.created_at,
                        profile: null,
                    },
                ];
                return next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
            // Best-effort profile hydration
            if (data.user_id && !profileCache[data.user_id]) {
                (async () => {
                    try {
                        await setSupabaseSession();
                        const { data: profileRow } = await browserSupabaseClient
                            ?.from('profiles')
                            .select('full_name, email, avatar_url')
                            .eq('id', data.user_id)
                            .maybeSingle();
                        if (profileRow) {
                            setProfileCache((prev) => ({
                                ...prev,
                                [data.user_id]: {
                                    full_name: profileRow.full_name ?? null,
                                    email: profileRow.email ?? null,
                                    avatar_url: profileRow.avatar_url ?? null,
                                },
                            }));
                        }
                    }
                    catch {
                        // ignore
                    }
                })();
            }
        });
        await channel.subscribe();
        channelRef.current = channel;
    }, [authedUserId, setSupabaseSession, team, activeConversation, activeRecipientId, profileCache]);
    const sendMessage = useCallback(async (e) => {
        if (e)
            e.preventDefault();
        if (!team || !accessToken || !input.trim() || !activeConversation)
            return;
        const content = input.trim();
        const optimistic = {
            id: `temp-${Date.now()}`,
            team_id: team.id,
            user_id: authedUserId || 'me',
            recipient_id: activeRecipientId,
            content,
            created_at: new Date().toISOString(),
            profile: {
                full_name: authedDisplayName,
                email: authedUser?.email ?? null,
                avatar_url: null,
            },
        };
        if (authedUserId) {
            setProfileCache((prev) => ({
                ...prev,
                [authedUserId]: {
                    full_name: authedDisplayName,
                    email: authedUser?.email ?? null,
                    avatar_url: null,
                },
            }));
        }
        setMessages((prev) => [...prev, optimistic]);
        setInput('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
        setSending(true);
        try {
            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ content, recipientId: activeRecipientId }),
            });
            const body = await res.json();
            if (!res.ok) {
                throw new Error(body?.error || 'Failed to send');
            }
            const saved = body.message ?? null;
            if (saved) {
                setMessages((prev) => {
                    const idx = prev.findIndex((m) => m.id === optimistic.id);
                    if (idx >= 0) {
                        const next = [...prev];
                        next[idx] = saved;
                        return next;
                    }
                    return [...prev, saved];
                });
            }
            // Refresh conversations to update last message
            await fetchConversations();
        }
        catch (err) {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setError(err?.message || 'Failed to send message');
        }
        finally {
            setSending(false);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    }, [accessToken, authedDisplayName, authedUser, authedUserId, input, team, activeConversation, activeRecipientId, fetchConversations]);
    const handleSelectConversation = useCallback((convId) => {
        setActiveConversation(convId);
        setMessages([]);
        setLoading(true);
        if (convId.startsWith('direct-')) {
            const recipientId = convId.replace('direct-', '');
            setActiveRecipientId(recipientId);
        }
        else {
            setActiveRecipientId(null);
        }
    }, []);
    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages]);
    // Keep focus on input when conversation changes or component mounts
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [activeConversation]);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            await setSupabaseSession();
            const fetchedTeam = await fetchTeam();
            if (cancelled || !fetchedTeam)
                return;
            await fetchConversations();
        })();
        return () => {
            cancelled = true;
        };
    }, [fetchTeam, setSupabaseSession, fetchConversations]);
    useEffect(() => {
        if (!activeConversation || !team) {
            return;
        }
        let cancelled = false;
        (async () => {
            console.log('[ChatTab] Loading messages for conversation:', activeConversation, 'recipient:', activeRecipientId, 'team:', team?.id);
            setLoading(true);
            setError(null);
            try {
                await fetchMessages();
                if (!cancelled && team && activeConversation) {
                    await subscribeToRealtime();
                }
            }
            catch (err) {
                console.error('[ChatTab] Error in message loading effect:', err);
            }
        })();
        return () => {
            cancelled = true;
            if (browserSupabaseClient && channelRef.current) {
                browserSupabaseClient.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [activeConversation, activeRecipientId, team, fetchMessages, subscribeToRealtime]);
    // Poll conversations every 10 seconds
    useEffect(() => {
        if (!accessToken)
            return;
        const interval = setInterval(() => {
            fetchConversations();
        }, 10000);
        return () => clearInterval(interval);
    }, [accessToken, fetchConversations]);
    const activeConv = conversations.find((c) => c.id === activeConversation);
    const activeConvName = activeConv?.name || 'Chat';
    return (_jsxs("div", { style: { display: 'flex', height: 'calc(100vh - 200px)', gap: 0, background: '#f5f5f5' }, children: [_jsxs("div", { style: {
                    width: 380,
                    background: '#fff',
                    borderRight: '1px solid #e3e3e3',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    borderRadius: '32px 0 0 32px',
                    overflow: 'hidden',
                }, children: [_jsx("div", { style: {
                            padding: '24px 20px',
                            background: '#fff',
                            borderBottom: '1px solid #e3e3e3',
                        }, children: _jsx("h2", { style: { margin: 0, fontSize: 20, fontWeight: 700, color: '#0c0c0c' }, children: "Chats" }) }), _jsx("div", { style: { flex: 1, overflowY: 'auto' }, children: conversations.map((conv) => {
                            const isActive = conv.id === activeConversation;
                            const lastMsgTime = conv.lastMessage
                                ? new Date(conv.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : null;
                            return (_jsxs("div", { onClick: () => handleSelectConversation(conv.id), style: {
                                    padding: '14px 20px',
                                    cursor: 'pointer',
                                    background: isActive ? '#ebebeb' : '#fff',
                                    borderBottom: '1px solid #e3e3e3',
                                    display: 'flex',
                                    gap: 12,
                                    alignItems: 'center',
                                    transition: 'background 0.15s',
                                }, onMouseEnter: (e) => {
                                    if (!isActive)
                                        e.currentTarget.style.background = '#f5f5f5';
                                }, onMouseLeave: (e) => {
                                    if (!isActive)
                                        e.currentTarget.style.background = '#fff';
                                }, children: [_jsx("div", { style: {
                                            width: 50,
                                            height: 50,
                                            borderRadius: '50%',
                                            background: conv.type === 'team' ? '#0c0c0c' : '#e5e5e5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 600,
                                            fontSize: 18,
                                            color: conv.type === 'team' ? '#fff' : '#0c0c0c',
                                            flexShrink: 0,
                                        }, children: conv.type === 'team' ? '👥' : (conv.name || 'U').charAt(0).toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 15, color: '#0c0c0c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: conv.name }), lastMsgTime && (_jsx("div", { style: { fontSize: 12, color: '#7c7c7c', flexShrink: 0, marginLeft: 8 }, children: lastMsgTime }))] }), conv.lastMessage && (_jsx("div", { style: {
                                                    fontSize: 13,
                                                    color: '#7c7c7c',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }, children: conv.lastMessage.content }))] })] }, conv.id));
                        }) })] }), _jsx("div", { style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#fff',
                    height: '100%',
                    borderRadius: '0 32px 32px 0',
                    overflow: 'hidden',
                }, children: activeConversation ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                padding: '16px 24px',
                                background: '#fff',
                                borderBottom: '1px solid #e3e3e3',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }, children: [_jsx("div", { style: {
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        background: activeConv?.type === 'team' ? '#0c0c0c' : '#e5e5e5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 600,
                                        fontSize: 16,
                                        color: activeConv?.type === 'team' ? '#fff' : '#0c0c0c',
                                    }, children: activeConv?.type === 'team' ? '👥' : (activeConvName || 'U').charAt(0).toUpperCase() }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600, fontSize: 15, color: '#0c0c0c' }, children: activeConvName }), _jsx("div", { style: { fontSize: 12, color: '#7c7c7c' }, children: activeConv?.type === 'team' ? 'Team chat' : 'Direct message' })] })] }), _jsx("div", { ref: messageListRef, style: {
                                flex: 1,
                                overflowY: 'auto',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16,
                                background: '#f5f5f5',
                            }, children: loading && messages.length === 0 ? (_jsx("div", { style: { color: '#6b6b6b', textAlign: 'center', padding: 40, fontSize: 14 }, children: "Loading messages\u2026" })) : messages.length === 0 ? (_jsxs("div", { style: {
                                    color: '#6b6b6b',
                                    textAlign: 'center',
                                    padding: 40,
                                    fontSize: 14,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                }, children: [_jsx("div", { style: { fontSize: 48, marginBottom: 12, opacity: 0.3 }, children: "\uD83D\uDCAC" }), _jsx("div", { children: "No messages yet. Start the conversation!" })] })) : (messages.map((msg) => {
                                const isOwnMessage = msg.user_id === authedUserId;
                                const cachedProfile = msg.profile ?? profileCache[msg.user_id];
                                const name = cachedProfile?.full_name || cachedProfile?.email || 'Unknown';
                                const initials = (name || 'U')
                                    .split(' ')
                                    .map((s) => s[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase();
                                const timestamp = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                if (isOwnMessage) {
                                    return (_jsx("div", { style: {
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            alignItems: 'flex-end',
                                            gap: 8,
                                            marginLeft: '20%',
                                        }, children: _jsxs("div", { style: {
                                                background: '#0c0c0c',
                                                color: '#fff',
                                                borderRadius: '20px 20px 4px 20px',
                                                padding: '12px 16px',
                                                maxWidth: '75%',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                                            }, children: [_jsx("div", { style: { whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5 }, children: msg.content }), _jsx("div", { style: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6, textAlign: 'right' }, children: timestamp })] }) }, msg.id));
                                }
                                else {
                                    return (_jsxs("div", { style: {
                                            display: 'flex',
                                            gap: 10,
                                            alignItems: 'flex-end',
                                            marginRight: '20%',
                                        }, children: [_jsx("div", { style: {
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    background: '#ebebeb',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 600,
                                                    fontSize: 13,
                                                    color: '#0c0c0c',
                                                    flexShrink: 0,
                                                }, children: initials }), _jsxs("div", { style: {
                                                    background: '#fff',
                                                    borderRadius: '20px 20px 20px 4px',
                                                    padding: '12px 16px',
                                                    maxWidth: '100%',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                                                    border: '1px solid #e3e3e3',
                                                }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 12, color: '#0c0c0c', marginBottom: 6 }, children: name }), _jsx("div", { style: { whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5, color: '#0c0c0c' }, children: msg.content }), _jsx("div", { style: { fontSize: 11, color: '#7c7c7c', marginTop: 6 }, children: timestamp })] })] }, msg.id));
                                }
                            })) }), _jsx("div", { style: {
                                padding: '16px 24px',
                                background: '#fff',
                                borderTop: '1px solid #e3e3e3',
                            }, children: _jsxs("form", { onSubmit: sendMessage, style: { display: 'flex', gap: 10, alignItems: 'center' }, children: [_jsx("input", { ref: inputRef, autoFocus: true, disabled: !team, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                sendMessage(e);
                                            }
                                        }, placeholder: team ? 'Type a message…' : 'Join a team to chat', style: {
                                            flex: 1,
                                            padding: '12px 18px',
                                            borderRadius: 999,
                                            border: '1px solid #e3e3e3',
                                            fontSize: 14,
                                            background: '#f5f5f5',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            fontFamily: "'Geist', 'Inter', sans-serif",
                                        }, onFocus: (e) => {
                                            e.target.style.borderColor = '#0c0c0c';
                                            e.target.style.background = '#fff';
                                        }, onBlur: (e) => {
                                            e.target.style.borderColor = '#e3e3e3';
                                            e.target.style.background = '#f5f5f5';
                                        } }), _jsx("button", { type: "submit", disabled: !team || sending || !input.trim(), style: {
                                            border: 'none',
                                            background: !team || sending || !input.trim() ? '#d7d7d7' : '#0c0c0c',
                                            color: '#fff',
                                            padding: '10px 20px',
                                            borderRadius: 24,
                                            cursor: !team || sending || !input.trim() ? 'not-allowed' : 'pointer',
                                            fontWeight: 600,
                                            fontSize: 14,
                                            transition: 'all 0.2s',
                                        }, children: sending ? 'Sending…' : 'Send' })] }) })] })) : (_jsx("div", { style: {
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b6b6b',
                        fontSize: 16,
                    }, children: "Select a conversation to start chatting" })) })] }));
}
//# sourceMappingURL=ChatTab.js.map