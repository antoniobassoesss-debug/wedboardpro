import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browserSupabaseClient } from '../browserSupabaseClient';
import './chat.css';
import { groupMessagesBySender, groupByDate } from './chatUtils';
import MessageGroup from './MessageGroup';
import DateSeparator from './DateSeparator';

type Message = {
  id: string;
  team_id: string;
  user_id: string;
  recipient_id: string | null;
  content: string;
  created_at: string;
  profile?: {
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
};

type Conversation = {
  type: 'team' | 'direct';
  id: string;
  name: string;
  lastMessage?: { content: string; created_at: string };
  unread?: number;
};

type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
  displayEmail?: string | null;
  displayName?: string | null;
};

const safeParse = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const deriveDisplayName = (user: any): string | null => {
  if (!user) return null;
  const metaName =
    (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim());
  if (metaName) return metaName;
  if (typeof user?.email === 'string' && user.email.trim()) return user.email.trim();
  return null;
};

const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default function ChatTab() {
  const [team, setTeam] = useState<{ id: string; name: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'team' | 'direct'>('all');
  const [profileCache, setProfileCache] = useState<
    Record<string, { full_name?: string | null; email?: string | null; avatar_url?: string | null }>
  >({});
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const channelRef = useRef<ReturnType<NonNullable<typeof browserSupabaseClient>['channel']> | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const storedSession = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return safeParse(window.localStorage.getItem('wedboarpro_session'));
  }, []);

  const accessToken = storedSession?.access_token ?? null;
  const refreshToken = storedSession?.refresh_token ?? null;
  const authedUser = storedSession?.user ?? null;
  const authedUserId = authedUser?.id ?? null;
  const authedDisplayName = deriveDisplayName(authedUser) ?? 'You';

  const setSupabaseSession = useCallback(async () => {
    if (!browserSupabaseClient || !accessToken || !refreshToken) return;
    try {
      await browserSupabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (err) {
      console.warn('[ChatTab] Failed to set Supabase session', err);
    }
  }, [accessToken, refreshToken]);

  const fetchTeam = useCallback(async () => {
    if (!accessToken) {
      setTeam(null);
      setError('Please log in to use chat.');
      setLoading(false);
      setConversationsLoading(false);
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
        setConversationsLoading(false);
        return null;
      }
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to load team');
      }
      setTeam(body.team);
      return body.team as { id: string; name: string };
    } catch (err: any) {
      setError(err?.message || 'Failed to load team');
      setLoading(false);
      setConversationsLoading(false);
      return null;
    }
  }, [accessToken]);

  const fetchConversations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to load conversations');
      setConversations(Array.isArray(body.conversations) ? body.conversations : []);
      if (!activeConversation && body.conversations?.length > 0) {
        const teamConv = body.conversations.find((c: Conversation) => c.type === 'team');
        if (teamConv) {
          setActiveConversation(teamConv.id);
          setActiveRecipientId(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  }, [accessToken, activeConversation]);

  const fetchMessages = useCallback(
    async (opts?: { before?: string }) => {
      if (!accessToken || !team || !activeConversation) {
        setLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams();
        params.set('limit', '50');
        if (opts?.before) params.set('before', opts.before);
        if (activeRecipientId) params.set('recipientId', activeRecipientId);

        console.log('[ChatTab] Fetching messages:', {
          activeConversation,
          activeRecipientId,
          isDirect: !!activeRecipientId,
          url: `/api/chat/messages?${params.toString()}`,
        });

        const res = await fetch(`/api/chat/messages?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.error || 'Failed to load messages');
        }
        const incoming: Message[] = Array.isArray(body.messages) ? body.messages : [];
        const incomingProfiles: Record<
          string,
          { full_name?: string | null; email?: string | null; avatar_url?: string | null }
        > = {};
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

        console.log('[ChatTab] Setting messages:', {
          count: sorted.length,
          activeRecipientId,
          isDirect: !!activeRecipientId,
          sample: sorted.slice(0, 3).map(m => ({
            id: m.id,
            user_id: m.user_id,
            recipient_id: m.recipient_id,
            content: m.content.substring(0, 30),
          })),
        });

        setMessages(sorted);
        setError(null);
        console.log('[ChatTab] Messages set successfully, count:', sorted.length);
      } catch (err: any) {
        console.error('[ChatTab] Failed to fetch messages:', err);
        setError(err?.message || 'Failed to load messages');
      } finally {
        console.log('[ChatTab] Setting loading to false');
        setLoading(false);
      }
    },
    [accessToken, team, activeConversation, activeRecipientId],
  );

  const subscribeToRealtime = useCallback(async (currentRecipientId: string | null) => {
    if (!browserSupabaseClient || !team || !authedUserId || !activeConversation) {
      console.log('[ChatTab] Cannot subscribe - missing requirements:', {
        hasClient: !!browserSupabaseClient,
        hasTeam: !!team,
        hasUser: !!authedUserId,
        hasConversation: !!activeConversation,
      });
      return;
    }
    await setSupabaseSession();

    if (channelRef.current) {
      console.log('[ChatTab] Removing existing channel');
      await browserSupabaseClient.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `team:${team.id}:chat:${Date.now()}`;
    console.log('[ChatTab] Creating new realtime channel:', channelName, {
      teamId: team.id,
      activeConversation,
      currentRecipientId,
      isDirect: !!currentRecipientId,
    });

    const channel = browserSupabaseClient.channel(channelName, {
      config: {
        presence: { key: authedUserId },
      },
    });

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `team_id=eq.${team.id}`,
      },
      (payload) => {
        console.log('[ChatTab] Realtime message received:', payload);
        const data = (payload.new as any) ?? null;
        if (!data?.id) return;

        const isTeamMessage = !data.recipient_id;
        const isDirectMessage = data.recipient_id && (data.user_id === authedUserId || data.recipient_id === authedUserId);
        const matchesActive =
          (currentRecipientId === null && isTeamMessage) ||
          (currentRecipientId && isDirectMessage && (data.user_id === currentRecipientId || data.recipient_id === currentRecipientId));

        console.log('[ChatTab] Message filtering:', {
          messageId: data.id,
          isTeamMessage,
          isDirectMessage,
          matchesActive,
          currentRecipientId,
          messageRecipientId: data.recipient_id,
          messageUserId: data.user_id,
        });

        if (!matchesActive) {
          console.log('[ChatTab] Message does not match active conversation, ignoring');
          return;
        }

        console.log('[ChatTab] Adding message to conversation');

        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          const next: Message[] = [
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

        if (data.user_id) {
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
            } catch {
              // ignore
            }
          })();
        }
      },
    );

    channelRef.current = channel;

    const subscriptionStatus = await channel.subscribe();
    console.log('[ChatTab] Channel subscription status:', subscriptionStatus);

    if (subscriptionStatus === 'SUBSCRIBED') {
      console.log('[ChatTab] ✅ Successfully subscribed to realtime channel');
    } else if (subscriptionStatus === 'TIMED_OUT') {
      console.error('[ChatTab] ⚠️ Subscription timed out, but channel is saved and may reconnect');
    } else if (subscriptionStatus === 'CLOSED') {
      console.error('[ChatTab] ⚠️ Subscription closed');
    } else {
      console.log('[ChatTab] ⏳ Subscription status:', subscriptionStatus, '- channel will complete connection asynchronously');
    }
  }, [authedUserId, setSupabaseSession, team, activeConversation]);

  const sendMessage = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!team || !accessToken || !input.trim() || !activeConversation) return;
      const content = input.trim();
      const currentUserAvatar = authedUserId ? profileCache[authedUserId]?.avatar_url ?? null : null;
      const optimistic: Message = {
        id: `temp-${Date.now()}`,
        team_id: team.id,
        user_id: authedUserId || 'me',
        recipient_id: activeRecipientId,
        content,
        created_at: new Date().toISOString(),
        profile: {
          full_name: authedDisplayName,
          email: authedUser?.email ?? null,
          avatar_url: currentUserAvatar,
        },
      };
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
        const saved: Message | null = body.message ?? null;
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
        await fetchConversations();
      } catch (err: any) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setError(err?.message || 'Failed to send message');
      } finally {
        setSending(false);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    },
    [accessToken, authedDisplayName, authedUser, authedUserId, input, team, activeConversation, activeRecipientId, fetchConversations],
  );

  const handleSelectConversation = useCallback(
    (convId: string) => {
      // Extract recipient ID first to ensure states stay in sync
      const recipientId = convId.startsWith('direct-') ? convId.replace('direct-', '') : null;

      console.log('[ChatTab] Selecting conversation:', {
        convId,
        recipientId,
        isDirect: convId.startsWith('direct-'),
      });

      // Update all states together
      setActiveConversation(convId);
      setActiveRecipientId(recipientId);
      setMessages([]);
      setLoading(true);
    },
    [],
  );

  const fetchTeamMembers = useCallback(async () => {
    if (!accessToken) return;
    setMembersLoading(true);
    try {
      const res = await fetch('/api/teams/members', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Failed to load team members');
      const members = Array.isArray(body.members) ? body.members : [];
      setTeamMembers(members);

      // Cache member profiles for avatar display
      const memberProfiles: Record<string, { full_name?: string | null; email?: string | null; avatar_url?: string | null }> = {};
      members.forEach((member: TeamMember) => {
        if (member.user_id && member.profile) {
          memberProfiles[member.user_id] = {
            full_name: member.profile.full_name ?? null,
            email: member.profile.email ?? null,
            avatar_url: member.profile.avatar_url ?? null,
          };
        }
      });
      if (Object.keys(memberProfiles).length > 0) {
        setProfileCache((prev) => ({ ...prev, ...memberProfiles }));
      }
    } catch (err: any) {
      console.error('Failed to fetch team members:', err);
    } finally {
      setMembersLoading(false);
    }
  }, [accessToken]);

  const handleOpenNewChatModal = useCallback(() => {
    setShowNewChatModal(true);
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleStartDirectChat = useCallback(
    (member: TeamMember) => {
      const recipientId = member.user_id;
      // Check if conversation already exists
      const existingConv = conversations.find(
        (c) => c.type === 'direct' && c.id === `direct-${recipientId}`
      );
      if (existingConv) {
        handleSelectConversation(existingConv.id);
      } else {
        // Create a new direct conversation entry locally
        const memberName = member.displayName || member.profile?.full_name || member.displayEmail || 'Unknown';
        const newConv: Conversation = {
          type: 'direct',
          id: `direct-${recipientId}`,
          name: memberName,
        };
        setConversations((prev) => {
          if (prev.some((c) => c.id === newConv.id)) return prev;
          return [...prev, newConv];
        });
        handleSelectConversation(newConv.id);
      }
      setShowNewChatModal(false);
      setFilterType('direct');
    },
    [conversations, handleSelectConversation],
  );

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

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
      if (cancelled || !fetchedTeam) return;
      await fetchConversations();

      // Fetch current user's profile for avatar
      if (authedUserId && browserSupabaseClient) {
        try {
          const { data: profileRow } = await browserSupabaseClient
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('id', authedUserId)
            .maybeSingle();
          if (profileRow) {
            setProfileCache((prev) => ({
              ...prev,
              [authedUserId]: {
                full_name: profileRow.full_name ?? null,
                email: profileRow.email ?? null,
                avatar_url: profileRow.avatar_url ?? null,
              },
            }));
          }
        } catch (err) {
          console.error('Failed to fetch current user profile:', err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchTeam, setSupabaseSession, fetchConversations, authedUserId]);

  useEffect(() => {
    if (!activeConversation || !team) {
      return;
    }

    console.log('[ChatTab] useEffect triggered - activeConversation changed:', {
      activeConversation,
      activeRecipientId,
      isDirect: !!activeRecipientId,
    });

    // Clear messages immediately when conversation changes
    setMessages([]);

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchMessages();
        if (!cancelled && team && activeConversation) {
          console.log('[ChatTab] About to subscribe to realtime, activeRecipientId:', activeRecipientId);
          await subscribeToRealtime(activeRecipientId);
          console.log('[ChatTab] Subscribed to realtime successfully');
        } else {
          console.log('[ChatTab] NOT subscribing, conditions:', { cancelled, hasTeam: !!team, hasConversation: !!activeConversation });
        }
      } catch (err) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation, activeRecipientId, team?.id]);

  // Lightweight polling fallback to ensure other users' messages appear quickly
  useEffect(() => {
    if (!activeConversation || !team) return;
    const interval = setInterval(() => {
      fetchMessages().catch(() => {});
    }, 2500);
    return () => clearInterval(interval);
  }, [activeConversation, activeRecipientId, team?.id, fetchMessages]);

  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(() => {
      fetchConversations();
    }, 10000);
    return () => clearInterval(interval);
  }, [accessToken, fetchConversations]);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    if (filterType !== 'all') {
      filtered = filtered.filter((c) => c.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.lastMessage?.content.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [conversations, filterType, searchQuery]);

  const activeConv = conversations.find((c) => c.id === activeConversation);
  const activeConvName = activeConv?.name || 'Chat';

  const getInitials = (name: string) => {
    return (name || 'U')
      .split(' ')
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="chat-shell">
      {/* Sidebar - Conversations List */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title-row">
            <h2 className="chat-sidebar-title">Messages</h2>
            <button type="button" className="chat-new-btn" onClick={handleOpenNewChatModal}>
              <PlusIcon /> New
            </button>
          </div>
          <div className="chat-search">
            <span className="chat-search-icon">
              <SearchIcon />
            </span>
            <input
              type="text"
              className="chat-search-input"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="chat-filter-tabs">
            <button
              type="button"
              className={`chat-filter-tab ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`chat-filter-tab ${filterType === 'team' ? 'active' : ''}`}
              onClick={() => setFilterType('team')}
            >
              Team
            </button>
            <button
              type="button"
              className={`chat-filter-tab ${filterType === 'direct' ? 'active' : ''}`}
              onClick={() => setFilterType('direct')}
            >
              Direct
            </button>
          </div>
        </div>

        <div className="chat-conversation-list">
          {conversationsLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="chat-skeleton-item">
                  <div className="chat-skeleton-avatar" />
                  <div className="chat-skeleton-lines">
                    <div className="chat-skeleton-line" />
                    <div className="chat-skeleton-line short" />
                  </div>
                </div>
              ))}
            </>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              {searchQuery ? 'No conversations found.' : 'No conversations yet.'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversation;
              const hasUnread = conv.unread && conv.unread > 0;
              const lastMsgTime = conv.lastMessage ? formatTime(conv.lastMessage.created_at) : null;
              const recipientId = conv.id.startsWith('direct-') ? conv.id.replace('direct-', '') : null;
              const avatarUrl = recipientId ? profileCache[recipientId]?.avatar_url : null;

              return (
                <div
                  key={conv.id}
                  className={`chat-conversation-item ${isActive ? 'active' : ''} ${hasUnread ? 'unread' : ''}`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className={`chat-conversation-avatar ${conv.type === 'team' ? 'team' : ''}`}>
                    {conv.type === 'team' ? (
                      '👥'
                    ) : avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={conv.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      getInitials(conv.name)
                    )}
                  </div>
                  <div className="chat-conversation-content">
                    <div className="chat-conversation-header">
                      <span className="chat-conversation-name">{conv.name}</span>
                      {lastMsgTime && <span className="chat-conversation-time">{lastMsgTime}</span>}
                    </div>
                    {conv.lastMessage && (
                      <div className="chat-conversation-preview">{conv.lastMessage.content}</div>
                    )}
                  </div>
                  {hasUnread && (
                    <div className="chat-unread-badge">{conv.unread}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {error && !activeConversation && (
          <div className="chat-error">{error}</div>
        )}

        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className={`chat-header-avatar ${activeConv?.type === 'team' ? 'team' : ''}`}>
                {activeConv?.type === 'team' ? (
                  '👥'
                ) : activeRecipientId && profileCache[activeRecipientId]?.avatar_url ? (
                  <img
                    src={profileCache[activeRecipientId].avatar_url!}
                    alt={activeConvName}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  getInitials(activeConvName)
                )}
              </div>
              <div className="chat-header-info">
                <h3 className="chat-header-title">{activeConvName}</h3>
                <p className="chat-header-subtitle">
                  {activeConv?.type === 'team' ? 'Team conversation' : 'Direct message'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={messageListRef}>
              {loading ? (
                <div className="chat-loading">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="chat-empty">
                  <div className="chat-empty-icon">💬</div>
                  <h3 className="chat-empty-title">No messages yet</h3>
                  <p className="chat-empty-text">Start the conversation by sending a message below.</p>
                </div>
              ) : (
                (() => {
                  try {
                    // Group messages by sender for Instagram-style display
                    const messageGroups = groupMessagesBySender(messages);
                    // Group by date for date separators
                    const groupedByDate = groupByDate(messageGroups);

                    // Find the last message group sent by the current user
                    const allGroups = groupedByDate.flatMap(d => d.groups);
                    const lastOwnMessageGroupIndex = allGroups.map(g => g.user_id === authedUserId).lastIndexOf(true);

                    let groupCounter = 0;
                    return groupedByDate.map((dateGroup) => (
                      <React.Fragment key={dateGroup.date}>
                        {/* Date separator */}
                        <DateSeparator date={dateGroup.date} timestamp={dateGroup.timestamp} />

                        {/* Message groups for this date */}
                        {dateGroup.groups.map((group) => {
                          const isOwnMessage = group.user_id === authedUserId;
                          const isLastOwnMessageGroup = groupCounter === lastOwnMessageGroupIndex;
                          groupCounter++;
                          return (
                            <MessageGroup
                              key={`${group.user_id}-${group.timestamp}`}
                              group={group}
                              isOwnMessage={isOwnMessage}
                              profileCache={profileCache}
                              authedDisplayName={authedDisplayName}
                              isLastOwnMessageGroup={isLastOwnMessageGroup}
                              isDirectMessage={!!activeRecipientId}
                            />
                          );
                        })}
                      </React.Fragment>
                    ));
                  } catch (err) {
                    console.error('[ChatTab] Error rendering messages:', err);
                    return (
                      <div className="chat-error">
                        Error rendering messages: {String(err)}
                      </div>
                    );
                  }
                })()
              )}
            </div>

            {/* Composer */}
            <div className="chat-composer">
              <form className="chat-composer-form" onSubmit={sendMessage}>
                <div className="chat-input-wrapper">
                  <input
                    ref={inputRef}
                    type="text"
                    className="chat-input"
                    placeholder={team ? 'Type a message...' : 'Join a team to chat'}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={!team}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        sendMessage(e);
                      }
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!team || sending || !input.trim()}
                >
                  <SendIcon />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <h3 className="chat-empty-title">Select a conversation</h3>
            <p className="chat-empty-text">Choose a conversation from the list to start messaging, or create a new one.</p>
            <button type="button" className="chat-empty-btn" onClick={handleOpenNewChatModal}>
              <PlusIcon /> Start New Chat
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="chat-modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3 className="chat-modal-title">New Direct Message</h3>
              <button
                type="button"
                className="chat-modal-close"
                onClick={() => setShowNewChatModal(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="chat-modal-content">
              <p className="chat-modal-subtitle">Select a team member to start a conversation</p>
              {membersLoading ? (
                <div className="chat-modal-loading">Loading team members...</div>
              ) : teamMembers.filter((m) => m.user_id !== authedUserId).length === 0 ? (
                <div className="chat-modal-empty">No other team members found.</div>
              ) : (
                <div className="chat-member-list">
                  {teamMembers
                    .filter((m) => m.user_id !== authedUserId)
                    .map((member) => {
                      const name = member.displayName || member.profile?.full_name || member.displayEmail || 'Unknown';
                      const email = member.displayEmail || member.profile?.email || '';
                      const avatarUrl = member.profile?.avatar_url || null;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          className="chat-member-item"
                          onClick={() => handleStartDirectChat(member)}
                        >
                          <div className="chat-member-avatar">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              getInitials(name)
                            )}
                          </div>
                          <div className="chat-member-info">
                            <span className="chat-member-name">{name}</span>
                            {email && <span className="chat-member-email">{email}</span>}
                          </div>
                          <span className="chat-member-role">{member.role}</span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
