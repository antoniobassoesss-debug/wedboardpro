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

function getUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return token;
}

function errorHandler(res: Response, err: any, endpoint: string) {
  console.error(`Error in ${endpoint}:`, err);
  res.status(500).json({ error: err.message || 'Internal server error' });
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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

    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { error } = await supabase.from('team_members').delete().eq('id', req.params.memberId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { errorHandler(res, err, '/team/members/:id'); }
});

app.post('/api/team/leave', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { data: membership } = await supabase.from('team_members').select('id').eq('user_id', userId).single();
    if (membership) await supabase.from('team_members').delete().eq('id', membership.id);
    res.json({ success: true });
  } catch (err) { errorHandler(res, err, '/team/leave'); }
});

app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
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
    const userId = getUserId(req);
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
  try { res.json({ bookings: [] }); } catch (err) { errorHandler(res, err, '/v1/team/bookings'); }
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

app.post('/api/assistant', async (req: Request, res: Response) => {
  try { res.json({ response: 'I can help you with that.' }); } catch (err) { errorHandler(res, err, '/assistant'); }
});

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
