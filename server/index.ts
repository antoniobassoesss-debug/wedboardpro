import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  console.error('SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('[getUserId] No Bearer token found');
    return null;
  }
  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.warn('[getUserId] Token validation failed:', error.message);
      return null;
    }
    if (!user) {
      console.warn('[getUserId] No user found for token');
      return null;
    }
    return user.id;
  } catch (err: any) {
    console.error('[getUserId] Exception:', err.message);
    return null;
  }
}

function errorHandler(res: Response, err: any, endpoint: string) {
  console.error(`[${endpoint}] Error:`, err.message || err);
  console.error(`[${endpoint}] Stack:`, err.stack || 'no stack');
  res.status(500).json({ error: err.message || 'Internal server error', details: err.code || 'unknown' });
}

app.get('/api/auth/check-verification', async (req: Request, res: Response) => {
  try {
    res.json({ verified: true, email: 'user@example.com' });
  } catch (err) { errorHandler(res, err, '/auth/check-verification'); }
});

app.post('/api/auth/resend-verification', async (req: Request, res: Response) => {
  try { res.json({ success: true }); } catch (err) { errorHandler(res, err, '/auth/resend-verification'); }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json({ user: data.user, session: data.session });
  } catch (err) { errorHandler(res, err, '/auth/login'); }
});

app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, business_name } = req.body;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, business_name } }
    });
    if (error) throw error;
    res.json({ user: data.user, session: data.session });
  } catch (err) { errorHandler(res, err, '/auth/signup'); }
});

app.get('/api/auth/verification-status', async (req: Request, res: Response) => {
  try { res.json({ verified: true }); } catch (err) { errorHandler(res, err, '/auth/verification-status'); }
});

app.get('/api/teams/my-team', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { data: membership, error } = await supabase
      .from('team_members')
      .select('*, team:teams(*)')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    res.json({ team: membership?.team, membership });
  } catch (err) { errorHandler(res, err, '/teams/my-team'); }
});

app.get('/api/teams/members', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { data: memberships, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    if (!memberships || memberships.length === 0) return res.json({ members: [] });

    const teamIds = [...new Set(memberships.map(m => m.team_id))];
    const { data: members } = await supabase
      .from('team_members')
      .select('*')
      .in('team_id', teamIds);

    res.json({ members: members || [] });
  } catch (err) { errorHandler(res, err, '/teams/members'); }
});

app.get('/api/teams', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Get teams user owns OR is member of
    const { data: ownedTeams, error: error1 } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', userId);

    if (error1) throw error1;

    const { data: memberships, error: error2 } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);

    if (error2) throw error2;

    let teams = ownedTeams || [];

    if (memberships && memberships.length > 0) {
      const teamIds = [...new Set(memberships.map(m => m.team_id))];
      const { data: memberTeams, error: error3 } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      if (error3) throw error3;
      if (memberTeams) {
        teams = [...teams, ...memberTeams];
      }
    }

    res.json({ teams: teams || [] });
  } catch (err) { errorHandler(res, err, '/teams'); }
});

app.post('/api/teams/invite', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { email, role } = req.body;
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .single();

    if (!membership) return res.status(403).json({ error: 'Not authorized' });

    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: membership.team_id,
        inviter_id: userId,
        email,
        token: Buffer.from(email + Date.now()).toString('base64url'),
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ invitation });
  } catch (err) { errorHandler(res, err, '/teams/invite'); }
});

app.post('/api/teams/invitations/accept', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const { data: invitation } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (!invitation || invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid invitation' });
    }

    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: userId,
        role: 'member'
      });

    if (error) throw error;

    await supabase
      .from('team_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    res.json({ success: true });
  } catch (err) { errorHandler(res, err, '/teams/invitations/accept'); }
});

app.get('/api/teams/invitations/pending', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('inviter_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    res.json({ invitations: data || [] });
  } catch (err) { errorHandler(res, err, '/teams/invitations/pending'); }
});

app.get('/api/team', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { data: memberships, error: memError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);

    if (memError) throw memError;
    if (!memberships || memberships.length === 0) return res.json({ members: [] });

    const teamIds = memberships.map(m => m.team_id);
    const { data: members, error } = await supabase
      .from('team_members')
      .select('*')
      .in('team_id', teamIds);

    if (error) throw error;

    const userIds = members?.map(m => m.user_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const enriched = members?.map(m => ({
      ...m,
      displayName: profileMap.get(m.user_id)?.full_name || 'Unknown',
      displayEmail: profileMap.get(m.user_id)?.email || null,
      avatarUrl: profileMap.get(m.user_id)?.avatar_url || null,
      upcomingEventsCount: 0,
      openTasksCount: 0
    })) || [];

    res.json({ members: enriched });
  } catch (err) { errorHandler(res, err, '/api/team'); }
});

app.get('/api/team/:memberId', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { data: member, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', req.params.memberId)
      .single();

    if (error || !member) return res.status(404).json({ error: 'Member not found' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', member.user_id)
      .single();

    res.json({
      member: {
        ...member,
        displayName: profile?.full_name || 'Unknown',
        displayEmail: profile?.email || null,
        avatarUrl: profile?.avatar_url || null,
        permissions: {
          can_edit_events: true,
          can_edit_budget: true,
          can_invite_members: member.role === 'owner' || member.role === 'admin',
          can_view_financials: member.role === 'owner' || member.role === 'admin'
        },
        assignments: [],
        tasks: [],
        availability: [],
        upcomingEventsCount: 0,
        openTasksCount: 0
      }
    });
  } catch (err) { errorHandler(res, err, '/api/team/:memberId'); }
});

app.get('/api/team/:memberId/tasks', async (req: Request, res: Response) => {
  try { res.json({ tasks: [] }); } catch (err) { errorHandler(res, err, '/team/:memberId/tasks'); }
});

app.get('/api/team/calendar', async (req: Request, res: Response) => {
  try { res.json({ workload: [] }); } catch (err) { errorHandler(res, err, '/team/calendar'); }
});

app.get('/api/teams/invitations/sent', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ invitations: invitations || [] });
  } catch (err) { errorHandler(res, err, '/teams/invitations/sent'); }
});

app.delete('/api/teams/invitations/:invitationId', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', req.params.invitationId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) { errorHandler(res, err, '/teams/invitations/:id'); }
});

app.post('/api/teams/invitations/:invitationId/resend', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    await supabase
      .from('team_invitations')
      .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', req.params.invitationId);

    const { data: invitation } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('id', req.params.invitationId)
      .single();

    res.json({ invitation });
  } catch (err) { errorHandler(res, err, '/teams/invitations/:id/resend'); }
});

app.post('/api/teams/invite-with-permissions', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { email, permissions } = req.body;
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .single();

    if (!membership) return res.status(403).json({ error: 'Not authorized' });

    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: membership.team_id,
        inviter_id: userId,
        email,
        token: Buffer.from(email + Date.now()).toString('base64url'),
        status: 'pending',
        ...permissions
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ invitation });
  } catch (err) { errorHandler(res, err, '/teams/invite-with-permissions'); }
});

app.patch('/api/team/members/:memberId/permissions', async (req: Request, res: Response) => {
  try { res.json({ member: { ...req.body, id: req.params.memberId } }); } catch (err) { errorHandler(res, err, '/team/members/:id/permissions'); }
});

app.delete('/api/team/members/:memberId', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { error } = await supabase.from('team_members').delete().eq('id', req.params.memberId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { errorHandler(res, err, '/team/members/:id'); }
});

app.post('/api/team/leave', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { data: membership } = await supabase.from('team_members').select('id').eq('user_id', userId).single();
    if (membership) await supabase.from('team_members').delete().eq('id', membership.id);
    res.json({ success: true });
  } catch (err) { errorHandler(res, err, '/team/leave'); }
});

app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ events: events || [] });
  } catch (err) { errorHandler(res, err, '/events'); }
});

app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ tasks: tasks || [] });
  } catch (err) { errorHandler(res, err, '/tasks'); }
});

app.get('/api/crm/pipelines', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('crm_pipelines').select('*').order('position');
    if (error) throw error;
    res.json({ pipelines: data || [] });
  } catch (err) { errorHandler(res, err, '/crm/pipelines'); }
});

app.post('/api/crm/pipelines/default', async (req: Request, res: Response) => {
  try {
    const defaultPipeline = {
      id: 'default',
      name: 'Default Pipeline',
      stages: [
        { id: 'new', name: 'New Lead', color: '#6366f1', probability: 10 },
        { id: 'meeting', name: 'Meeting Scheduled', color: '#8b5cf6', probability: 25 },
        { id: 'proposal', name: 'Proposal Sent', color: '#f59e0b', probability: 50 },
        { id: 'contract', name: 'Contract Signed', color: '#10b981', probability: 90 },
        { id: 'won', name: 'Won', color: '#22c55e', probability: 100 }
      ]
    };
    res.json({ pipeline: defaultPipeline });
  } catch (err) { errorHandler(res, err, '/crm/pipelines/default'); }
});

app.get('/api/crm/deals', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('crm_deals').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ deals: data || [] });
  } catch (err) { errorHandler(res, err, '/crm/deals'); }
});

app.post('/api/crm/deals/import', async (req: Request, res: Response) => {
  try { res.json({ success: true, imported: 0 }); } catch (err) { errorHandler(res, err, '/crm/deals/import'); }
});

app.get('/api/suppliers', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (error) throw error;
    res.json({ suppliers: data || [] });
  } catch (err) { errorHandler(res, err, '/suppliers'); }
});

app.get('/api/custom-vendor-categories', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('custom_vendor_categories').select('*').order('name');
    if (error) throw error;
    res.json({ categories: data || [] });
  } catch (err) { errorHandler(res, err, '/custom-vendor-categories'); }
});

app.get('/api/contacts', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('contacts').select('*').order('name');
    if (error) throw error;
    res.json({ contacts: data || [] });
  } catch (err) { errorHandler(res, err, '/contacts'); }
});

app.get('/api/notifications', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    res.json({ notifications: data || [] });
  } catch (err) { errorHandler(res, err, '/notifications'); }
});

app.post('/api/notifications/read-all', async (req: Request, res: Response) => {
  try { res.json({ success: true }); } catch (err) { errorHandler(res, err, '/notifications/read-all'); }
});

app.get('/api/notifications/unread-count', async (req: Request, res: Response) => {
  try {
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false);
    res.json({ count: count || 0 });
  } catch (err) { errorHandler(res, err, '/notifications/unread-count'); }
});

app.get('/api/chat/conversations', async (req: Request, res: Response) => {
  try { res.json({ conversations: [] }); } catch (err) { errorHandler(res, err, '/chat/conversations'); }
});

app.get('/api/chat/messages', async (req: Request, res: Response) => {
  try { res.json({ messages: [] }); } catch (err) { errorHandler(res, err, '/chat/messages'); }
});

app.post('/api/chat/mark-as-read', async (req: Request, res: Response) => {
  try { res.json({ success: true }); } catch (err) { errorHandler(res, err, '/chat/mark-as-read'); }
});

app.post('/api/v1/team/login', async (req: Request, res: Response) => {
  try { res.json({ success: true, token: 'demo-token' }); } catch (err) { errorHandler(res, err, '/v1/team/login'); }
});

app.get('/api/v1/team/leads', async (req: Request, res: Response) => {
  try { res.json({ leads: [] }); } catch (err) { errorHandler(res, err, '/v1/team/leads'); }
});

app.get('/api/v1/team/bookings', async (req: Request, res: Response) => {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (error) {
      console.error('[bookings] Error fetching:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ bookings: bookings || [] });
  } catch (err) { errorHandler(res, err, '/v1/team/bookings'); }
});

app.post('/api/v1/team/bookings', async (req: Request, res: Response) => {
  try {
    const { name, email, company, phone, booking_date, booking_time, goal, team_size } = req.body;
    
    if (!name || !email || !booking_date || !booking_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        name,
        email,
        company: company || null,
        phone: phone || null,
        booking_date,
        booking_time,
        goal: goal || null,
        team_size: team_size || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('[bookings] Error creating:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ booking });
  } catch (err) { errorHandler(res, err, '/v1/team/bookings'); }
});

app.get('/api/v1/team/availability', async (req: Request, res: Response) => {
  try { res.json({ availability: [] }); } catch (err) { errorHandler(res, err, '/v1/team/availability'); }
});

// Blog Posts API
app.get('/api/v1/blog/posts', async (req: Request, res: Response) => {
  try {
    // In production, fetch from Supabase
    // const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    
    // Mock response for demo
    res.json({ 
      posts: [
        {
          id: '1',
          title: 'How to Raise Your Wedding Planning Prices by 30%',
          slug: 'raise-wedding-planning-prices',
          content: '<p>Premium pricing is essential for growing your wedding planning business...</p>',
          excerpt: 'A step-by-step framework for positioning your services as premium.',
          category: 'Business Growth',
          tags: ['pricing strategy', 'business growth'],
          primaryKeyword: 'wedding planning prices',
          secondaryKeywords: ['premium wedding services', 'raise prices'],
          featuredImage: null,
          seoTitle: 'Raise Wedding Planning Prices by 30% | Expert Guide',
          metaDescription: 'Learn proven strategies to increase your wedding planning rates without losing clients.',
          status: 'published',
          scheduledDate: null,
          publishedAt: '2026-02-08T10:00:00Z',
          createdAt: '2026-02-05T14:00:00Z',
          updatedAt: '2026-02-08T10:00:00Z',
          seoScore: 92,
          views: 2450,
          leadsGenerated: 45,
          wordCount: 1850,
          readingTime: 8,
          author: { name: 'Sarah Mitchell', avatar: '' }
        }
      ],
      stats: {
        totalPosts: 1,
        publishedPosts: 1,
        scheduledPosts: 0,
        draftPosts: 0,
        avgSeoScore: 92,
        totalViews: 2450,
        totalLeads: 45,
        viewsThisWeek: 735,
        leadsThisWeek: 11
      }
    });
  } catch (err) { errorHandler(res, err, '/v1/blog/posts'); }
});

app.get('/api/v1/blog/featured', async (req: Request, res: Response) => {
  try {
    res.json({
      posts: [
        {
          id: '1',
          title: 'How to Raise Your Wedding Planning Prices by 30%',
          slug: 'raise-wedding-planning-prices',
          excerpt: 'A step-by-step framework for positioning your services as premium and attracting high-end clients.',
          category: 'Business Growth',
          readingTime: 8,
          publishedAt: '2026-02-08T10:00:00Z',
          featuredImage: null
        },
        {
          id: '2',
          title: 'The Tech Stack Every Wedding Planner Needs in 2026',
          slug: 'tech-stack-wedding-planners-2026',
          excerpt: 'From CRM to floor plan design, discover the tools top planners use to scale their businesses.',
          category: 'Operations',
          readingTime: 12,
          publishedAt: '2026-01-28T14:00:00Z',
          featuredImage: null
        },
        {
          id: '3',
          title: 'Create Wedding Wow Moments That Generate Referrals',
          slug: 'wow-moments-wedding-referrals',
          excerpt: 'Turn every wedding into a referral machine with these proven client experience strategies.',
          category: 'Client Experience',
          readingTime: 6,
          publishedAt: '2026-01-15T09:00:00Z',
          featuredImage: null
        }
      ]
    });
  } catch (err) { errorHandler(res, err, '/v1/blog/featured'); }
});

app.post('/api/v1/blog/posts', async (req: Request, res: Response) => {
  try {
    const post = req.body;
    // In production: const { data, error } = await supabase.from('blog_posts').insert(post).select().single();
    res.status(201).json({ success: true, post });
  } catch (err) { errorHandler(res, err, '/v1/blog/posts'); }
});

app.patch('/api/v1/blog/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    // In production: const { data, error } = await supabase.from('blog_posts').update(updates).eq('id', id).select().single();
    res.json({ success: true });
  } catch (err) { errorHandler(res, err, '/v1/blog/posts/:id'); }
});

app.delete('/api/v1/blog/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // In production: const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    res.json({ success: true });
  } catch (err) { errorHandler(res, err, '/v1/blog/posts/:id'); }
});

// Google Analytics Data API
app.post('/api/v1/blog/analytics', async (req: Request, res: Response) => {
  try {
    const { propertyId, serviceAccountKey, startDate, endDate } = req.body;

    if (!propertyId || !serviceAccountKey) {
      // Return mock data for demo
      res.json({
        pageViews: 1247,
        uniqueViews: 892,
        avgTimeOnPage: 245,
        bounceRate: 34.2,
        topPages: [
          { path: '/blog/raise-wedding-planning-prices', views: 456 },
          { path: '/blog/tech-stack-wedding-planners-2026', views: 312 },
          { path: '/blog/wow-moments-wedding-referrals', views: 198 },
          { path: '/blog/vendor-management', views: 156 },
          { path: '/blog/wedding-season-prep', views: 125 }
        ],
        topSources: [
          { source: 'google', users: 534 },
          { source: 'direct', users: 234 },
          { source: 'twitter.com', users: 89 },
          { source: 'linkedin.com', users: 35 }
        ]
      });
      return;
    }

    // In production, use the GA4 Data API:
    // 1. Decode service account key
    // 2. Get OAuth2 access token
    // 3. Fetch analytics data
    
    // Example implementation:
    /*
    const { JWT } = require('google-auth-library');
    const jwtClient = new JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    });

    const token = await jwtClient.authorize();
    
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }]
        })
      }
    );
    
    const data = await response.json();
    // Process and return data
    */

    // For now, return mock data
    res.json({
      pageViews: 1247,
      uniqueViews: 892,
      avgTimeOnPage: 245,
      bounceRate: 34.2,
      topPages: [
        { path: '/blog/raise-wedding-planning-prices', views: 456 },
        { path: '/blog/tech-stack-wedding-planners-2026', views: 312 }
      ],
      topSources: [
        { source: 'google', users: 534 },
        { source: 'direct', users: 234 }
      ]
    });
  } catch (err) { 
    console.error('GA Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' }); 
  }
});

app.post('/api/v1/demo/book', async (req: Request, res: Response) => {
  try { res.json({ success: true }); } catch (err) { errorHandler(res, err, '/v1/demo/book'); }
});

// AI SEO Analysis using OpenAI - 5-Pillar Framework
app.post('/api/v1/blog/ai-seo-analyze', async (req: Request, res: Response) => {
  try {
    const { title, content, metaDescription, keyword, slug, url } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' });
      return;
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      res.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    const cleanContent = content.replace(/<[^>]*>/g, '');
    const firstSentence = cleanContent.split(/[.!?]/)[0] || '';
    const paragraphs = cleanContent.split(/\n\n+/);
    const hasLongParagraphs = paragraphs.some((p: string) => p.split('\n').length > 3);
    const bulletPoints = (cleanContent.match(/[•\-\*]/g) || []).length;
    const boldText = (cleanContent.match(/\*\*[^*]+\*\*/g) || []).length;

    const prompt = `You are the Chief SEO Strategist & Conversion Auditor for a high-end B2B Wedding SaaS in the US Market. Evaluate this blog content rigorously to ensure it ranks #1 on Google and converts Wedding Planners into software users.

## BLOG POST TO ANALYZE
- Title: ${title}
- Primary Keyword: ${keyword || 'Not specified'}
- URL Slug: ${slug || url || 'Not provided'}
- Meta Description: ${metaDescription || 'Not provided'}

## CONTENT (full text):
${cleanContent}

## YOUR TASK
Evaluate the content using this strict 100-point scoring algorithm:

### 1. KEYWORD STRATEGY & INTENT (25 points)
- PRIMARY KEYWORD MUST appear in: H1 (title), first sentence (approx), and URL slug
- Search Intent: Does content directly solve the specific "Job-to-be-Done" for the keyword?
- US Localization: STRICT CHECK for US English spelling (Color not Colour, Inquire not Enquire, Bachelorette not Hen Party, etc.) and US Wedding terminology

### 2. THE HOOK & READABILITY (20 points)
- FIRST 2 PARAGRAPHS must hook reader emotionally with pain point agitation
- NO paragraph longer than 3 lines
- Extensive bullets and bolding for scannability
- Professional yet empathetic tone for stressed planners

### 3. PRODUCT-LED CONVERSION (25 points)
- SaaS presented as the ONLY logical solution to the problem
- Required: at least one "Soft CTA" (contextual link like "See how our timeline feature helps...") and one "Hard CTA" (Start Free Trial, Book Demo, Download Template)
- Specific CTAs allowed: "Start Free Trial", "See the Feature", "Download Template"

### 4. AUTHORITY - E-E-A-T (15 points)
- Must cite reputable US industry sources: The Knot Real Weddings Study, WeddingWire, or Vogue Weddings
- Must sound like an industry veteran, not generic copywriter

### 5. TECHNICAL HYGIENE (15 points)
- Internal links to SPECIFIC feature pages (/features/timeline, /pricing, etc.) NOT just homepage
- Meta Description <155 chars with clear value proposition

## OUTPUT REQUIREMENTS
Respond with ONLY valid JSON:

{
  "scores": {
    "keyword": {
      "score": (0-25),
      "hasKeywordInTitle": true/false,
      "hasKeywordInFirstSentence": true/false,
      "hasKeywordInSlug": true/false,
      "hasUSEnglish": true/false,
      "usTermsFound": [],
      "issues": []
    },
    "hookReadability": {
      "score": (0-20),
      "hasEmotionalHook": true/false,
      "hasLongParagraphs": true/false,
      "bulletCount": 0,
      "boldCount": 0,
      "issues": []
    },
    "conversion": {
      "score": (0-25),
      "hasSoftCTA": true/false,
      "hasHardCTA": true/false,
      "softCTAsFound": [],
      "hardCTAsFound": [],
      "productIntegration": "strong/moderate/weak/none",
      "issues": []
    },
    "authority": {
      "score": (0-15),
      "hasKnotCitation": true/false,
      "hasWeddingWireCitation": true/false,
      "hasVogueCitation": true/false,
      "hasExternalSources": true/false,
      "toneExpert": true/false,
      "issues": []
    },
    "technical": {
      "score": (0-15),
      "metaDescriptionLength": 0,
      "hasMetaDescription": true/false,
      "internalLinks": [],
      "featureLinks": [],
      "issues": []
    }
  },
  "finalScore": (calculated weighted total),
  "status": "FAIL if finalScore < 90, PUBLISH if finalScore >= 90",
  "actionItems": [
    {"category": "Keywords", "issue": "specific keyword issue", "action": "what to fix"},
    {"category": "Hook", "issue": "specific hook issue", "action": "what to fix"},
    {"category": "Conversion", "issue": "specific CTA issue", "action": "what to fix"},
    {"category": "Authority", "issue": "specific citation issue", "action": "what to fix"},
    {"category": "Technical", "issue": "specific technical issue", "action": "what to fix"}
  ],
  "summary": "One sentence summary"
}`;

    const OpenAI = await import('openai');
    const openai = new OpenAI.default({ apiKey: openaiApiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      res.status(500).json({ error: 'No response from AI' });
      return;
    }

    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const analysis = JSON.parse(cleanJson);

      const keywordScore = analysis.scores?.keyword?.score || 0;
      const hookScore = analysis.scores?.hookReadability?.score || 0;
      const conversionScore = analysis.scores?.conversion?.score || 0;
      const authorityScore = analysis.scores?.authority?.score || 0;
      const technicalScore = analysis.scores?.technical?.score || 0;

      res.json({
        keywordScore,
        hookScore,
        conversionScore,
        authorityScore,
        technicalScore,
        finalScore: analysis.finalScore,
        status: analysis.status,
        scores: analysis.scores,
        actionItems: analysis.actionItems,
        summary: analysis.summary
      });
    } catch {
      console.error('Failed to parse AI response:', cleanJson);
      res.status(500).json({ error: 'Failed to parse AI response' });
    }
  } catch (err) {
    console.error('AI SEO analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze SEO' });
  }
});

// ========== SEO Intelligence System API Routes ==========

// SEO Health - get latest snapshot
app.get('/api/v1/seo/health', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('seo_health_snapshots')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ health: data || null });
  } catch (err) { errorHandler(res, err, '/v1/seo/health'); }
});

// SEO Health history (last 30 days)
app.get('/api/v1/seo/health/history', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('seo_health_snapshots')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);
    if (error) throw error;
    res.json({ history: data || [] });
  } catch (err) { errorHandler(res, err, '/v1/seo/health/history'); }
});

// Topic clusters
app.get('/api/v1/seo/clusters', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('topic_clusters')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ clusters: data || [] });
  } catch (err) { errorHandler(res, err, '/v1/seo/clusters'); }
});

app.post('/api/v1/seo/clusters', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('topic_clusters')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.json({ cluster: data });
  } catch (err) { errorHandler(res, err, '/v1/seo/clusters'); }
});

// Keyword rankings
app.get('/api/v1/seo/rankings', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('keyword_rankings')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ rankings: data || [] });
  } catch (err) { errorHandler(res, err, '/v1/seo/rankings'); }
});

// Topics pipeline - list all
app.get('/api/v1/seo/topics', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    let query = supabase
      .from('topics_pipeline')
      .select('*')
      .order('priority_score', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ topics: data || [] });
  } catch (err) { errorHandler(res, err, '/v1/seo/topics'); }
});

// Topics pipeline - get single
app.get('/api/v1/seo/topics/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('topics_pipeline')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ topic: data });
  } catch (err) { errorHandler(res, err, '/v1/seo/topics/:id'); }
});

// Topics pipeline - create (bulk)
app.post('/api/v1/seo/topics', async (req: Request, res: Response) => {
  try {
    const topics = Array.isArray(req.body) ? req.body : [req.body];
    const { data, error } = await supabase
      .from('topics_pipeline')
      .insert(topics)
      .select();
    if (error) throw error;
    res.json({ topics: data, count: data?.length || 0 });
  } catch (err) { errorHandler(res, err, '/v1/seo/topics'); }
});

// Topics pipeline - update
app.patch('/api/v1/seo/topics/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('topics_pipeline')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ topic: data });
  } catch (err) { errorHandler(res, err, '/v1/seo/topics/:id'); }
});

// Topics pipeline - delete
app.delete('/api/v1/seo/topics/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from('topics_pipeline')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { errorHandler(res, err, '/v1/seo/topics/:id'); }
});

// Topics pipeline - bulk update status
app.post('/api/v1/seo/topics/bulk-update', async (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    const { data, error } = await supabase
      .from('topics_pipeline')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', ids)
      .select();
    if (error) throw error;
    res.json({ topics: data, count: data?.length || 0 });
  } catch (err) { errorHandler(res, err, '/v1/seo/topics/bulk-update'); }
});

// Content briefs - get by topic
app.get('/api/v1/seo/briefs/topic/:topicId', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('content_briefs')
      .select('*')
      .eq('topic_id', req.params.topicId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ brief: data || null });
  } catch (err) { errorHandler(res, err, '/v1/seo/briefs/topic/:topicId'); }
});

// Content briefs - create
app.post('/api/v1/seo/briefs', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('content_briefs')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;

    // Update topic status and brief_id
    if (req.body.topic_id) {
      await supabase
        .from('topics_pipeline')
        .update({ brief_id: data.id, status: 'brief_created', updated_at: new Date().toISOString() })
        .eq('id', req.body.topic_id);
    }

    res.json({ brief: data });
  } catch (err) { errorHandler(res, err, '/v1/seo/briefs'); }
});

// Content briefs - update
app.patch('/api/v1/seo/briefs/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('content_briefs')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ brief: data });
  } catch (err) { errorHandler(res, err, '/v1/seo/briefs/:id'); }
});

// Generate brief with AI
app.post('/api/v1/seo/briefs/generate', async (req: Request, res: Response) => {
  try {
    const { keyword, topUrls, peopleAlsoAsk, relatedSearches } = req.body;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const prompt = `You are a senior SEO content strategist for WedBoardPro, a B2B SaaS for professional wedding planners.

Create a comprehensive content brief for the keyword: "${keyword}"

Context:
- Top ranking URLs: ${JSON.stringify(topUrls?.slice(0, 5) || [])}
- People Also Ask: ${JSON.stringify(peopleAlsoAsk?.slice(0, 8) || [])}
- Related searches: ${JSON.stringify(relatedSearches?.slice(0, 8) || [])}

Return a JSON object with EXACTLY this structure:
{
  "target_word_count": <number between 1500-3000>,
  "target_reading_level": "grade_8",
  "required_sections": [
    {"heading": "H2 heading text", "description": "what to cover", "target_words": 200}
  ],
  "keyword_density_target": 1.5,
  "internal_links_required": ["relevant WedBoardPro feature pages"],
  "external_authority_links": ["authority sources to cite"],
  "unique_angles": ["unique perspectives to differentiate"],
  "product_features_to_mention": ["WedBoardPro features relevant to this topic"],
  "cta_placements": ["where to place CTAs and what they should say"],
  "target_featured_snippet": true/false,
  "featured_snippet_format": "paragraph|list|table",
  "ai_prompt_template": "The full prompt to generate the article content"
}

Make the brief specific to wedding planners as a B2B audience. The ai_prompt_template should be a detailed 500+ word prompt that would generate a high-quality, SEO-optimized article.`;

    const OpenAI = await import('openai');
    const openai = new OpenAI.default({ apiKey: openaiApiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const briefData = JSON.parse(content);
    res.json({ brief: briefData });
  } catch (err) { errorHandler(res, err, '/v1/seo/briefs/generate'); }
});

// Generate article content with AI
app.post('/api/v1/seo/content/generate', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const OpenAI = await import('openai');
    const openai = new OpenAI.default({ apiKey: openaiApiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content || '';
    res.json({ content });
  } catch (err) { errorHandler(res, err, '/v1/seo/content/generate'); }
});

// Blog posts (SEO system) - create from content production
app.post('/api/v1/seo/blog-posts', async (req: Request, res: Response) => {
  try {
    const post = req.body;
    const wordCount = post.content?.split(/\s+/).length || 0;
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        ...post,
        actual_word_count: wordCount,
        status: post.status || 'draft',
        published_at: post.status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (error) throw error;

    // If linked to a topic, update the topic
    if (post.topic_pipeline_id) {
      await supabase
        .from('topics_pipeline')
        .update({ published_post_id: data.id, status: 'published', updated_at: new Date().toISOString() })
        .eq('id', post.topic_pipeline_id);
    }

    res.json({ post: data });
  } catch (err) { errorHandler(res, err, '/v1/seo/blog-posts'); }
});

// Blog posts - list for SEO dashboard
app.get('/api/v1/seo/blog-posts', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ posts: data || [] });
  } catch (err) { errorHandler(res, err, '/v1/seo/blog-posts'); }
});

// Topic discovery - trigger scraping (server-side)
app.post('/api/v1/seo/discover', async (req: Request, res: Response) => {
  try {
    const { seedKeywords, maxTopics, skipTrends } = req.body;
    if (!Array.isArray(seedKeywords) || seedKeywords.length === 0) {
      return res.status(400).json({ error: 'seedKeywords array required' });
    }

    const { discoverTopics } = await import('../src/lib/seo/scrapers/topicDiscovery');
    const topics = await discoverTopics(seedKeywords, { maxTopics: maxTopics || 20, skipTrends: skipTrends ?? false });

    // Save to database
    if (topics.length > 0) {
      const { data, error } = await supabase
        .from('topics_pipeline')
        .insert(topics)
        .select();
      if (error) throw error;
      res.json({ topics: data, count: data?.length || 0 });
    } else {
      res.json({ topics: [], count: 0 });
    }
  } catch (err) { errorHandler(res, err, '/v1/seo/discover'); }
});

// Competitor analysis for brief generation
app.post('/api/v1/seo/analyze-competitors', async (req: Request, res: Response) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: 'keyword required' });

    const { analyzeTopCompetitors } = await import('../src/lib/seo/scrapers/serp');
    const result = await analyzeTopCompetitors(keyword, 5);
    res.json(result);
  } catch (err) { errorHandler(res, err, '/v1/seo/analyze-competitors'); }
});

app.post('/api/assistant', async (req: Request, res: Response) => {
  try { res.json({ response: 'I can help you with that.' }); } catch (err) { errorHandler(res, err, '/assistant'); }
});

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
