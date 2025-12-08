import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const { getSupabaseAnonClient, getSupabaseServiceClient } = await import('./supabaseClient.js');

const app = express();
const port = 3000;

// CORS middleware for development and production
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow requests from Vite dev server, same origin, and Vercel domains
  if (origin && (
    origin.includes('localhost:5173') || 
    origin.includes('localhost:3000') || 
    origin.includes('127.0.0.1') ||
    origin.includes('vercel.app') ||
    origin.includes('vercel.com')
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
// Log whether the key was loaded (masked) to help diagnose env issues.
console.log('OPENAI_API_KEY present:', Boolean(openaiApiKey), openaiApiKey ? `${String(openaiApiKey).slice(0,8)}...` : '');

// In production, serve built files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist/client')));
} else {
  // In development, Vite runs on port 5173
  app.get('/', (req, res) => {
    res.redirect('http://localhost:5173');
  });
}

// API routes
const layouts: any[] = [];

app.get('/api/layouts', (req, res) => {
  res.json(layouts);
});

app.post('/api/layouts', express.json(), (req, res) => {
  const layout = req.body;
  layouts.push(layout);
  res.status(201).json(layout);
});

app.post('/api/assistant', express.json(), async (req, res) => {
  try {
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    if (!openaiClient) {
      return res.status(500).json({ error: 'OpenAI client not initialized' });
    }

    const { message } = req.body ?? {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an AI assistant for an event layout SaaS. Answer clearly and briefly. If the user asks about event layouts or seating, you may include structured JSON suggestions when appropriate.',
        },
        { role: 'user', content: message },
      ],
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ??
      'I was unable to generate a response.';

    return res.status(200).json({ answer });
  } catch (error: any) {
    // Detailed logging to help debug OpenAI client errors
    console.error('Assistant error name:', error?.name);
    console.error('Assistant error message:', error?.message);
    if (error?.response) {
      try {
        console.error('Assistant error response status:', error.response.status);
        console.error('Assistant error response data:', JSON.stringify(error.response.data));
      } catch (e) {
        console.error('Error while logging error.response:', e);
      }
    }
    console.error('Assistant error stack:', error?.stack);
    return res.status(500).json({ error: 'Failed to reach assistant' });
  }
});

app.post('/api/auth/signup', express.json(), async (req, res) => {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    console.log('/api/auth/signup request from', req.ip, 'body:', { email: String(email).slice(0, 40) });

    const result = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    // Log full Supabase response for debugging (do not log secrets)
    console.log('/api/auth/signup supabase response:', {
      status: result,
      data: (result as any)?.data ? { ...((result as any).data), user: undefined } : undefined,
      error: (result as any)?.error,
    });

    const data = (result as any)?.data;
    const error = (result as any)?.error;

    if (error) {
      console.error('/api/auth/signup supabase error message:', error.message);
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ user: data?.user ?? null });
  } catch (err: any) {
    console.error('Supabase signup error (unexpected):', err);
    // In development, return details to help debugging. Do NOT expose in production.
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({
        error: 'Failed to create account',
        details:
          err?.message ??
          (typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err) || [])),
      });
    }
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/auth/login', express.json(), async (req, res) => {
  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client unavailable' });
  }

  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    // Send session tokens so the client can store/manage them
    return res.status(200).json({ session: data.session, user: data.user });
  } catch (err: any) {
    console.error('Supabase login error:', err?.message ?? err);
    return res.status(500).json({ error: 'Failed to log in' });
  }
});

// Helper function to get authenticated user from request
async function getAuthenticatedUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  const supabase = getSupabaseAnonClient();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error) {
    console.error('[auth] getUser failed', error);
    return null;
  }
  if (!user) {
    console.warn('[auth] No user returned for token');
    return null;
  }
  return user;
}

async function createTeamForUser(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  ownerId: string,
  name?: string,
) {
  const teamName = name && name.trim().length > 0 ? name.trim() : 'My Team';

  const { data: newTeam, error: createError } = await supabase
    .from('teams')
    .insert({
      owner_id: ownerId,
      name: teamName,
    })
    .select()
    .single();

  if (createError) {
    throw createError;
  }

  await supabase
    .from('team_members')
    .insert({
      team_id: newTeam.id,
      user_id: ownerId,
      role: 'owner',
    });

  return newTeam;
}

async function getUserTeam(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  userId: string,
) {
  const { data: membershipRow, error: membershipError } = await supabase
    .from('team_members')
    .select(
      `
        team_id,
        role,
        teams:team_id (
          id,
          name,
          owner_id
        )
      `,
    )
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .maybeSingle();

  if (membershipError && membershipError.code !== 'PGRST116') {
    throw membershipError;
  }

  if (membershipRow?.teams) {
    return {
      team: membershipRow.teams,
      membershipRole: (membershipRow.role as 'owner' | 'admin' | 'member') ?? 'member',
    };
  }

  const { data: ownerTeam, error: ownerError } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();

  if (ownerError && ownerError.code !== 'PGRST116') {
    throw ownerError;
  }

  if (ownerTeam) {
    return { team: ownerTeam, membershipRole: 'owner' as const };
  }

  return null;
}

async function ensureUserTeamMembership(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  userId: string,
) {
  const teamResult = await getUserTeam(supabase, userId);
  if (!teamResult || !teamResult.team) {
    throw new Error('You have not created or joined a team yet');
  }
  return teamResult;
}

// Team Management API Routes
app.get('/api/teams/my-team', express.json(), async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  try {
    const teamResult = await getUserTeam(supabase, user.id);
    if (!teamResult) {
      return res.status(404).json({ team: null });
    }
    return res.json(teamResult);
  } catch (err: any) {
    console.error('Get team error:', err);
    return res.status(500).json({ error: 'Failed to get team' });
  }
});

app.post('/api/teams', express.json(), async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  const requestedName =
    typeof req.body?.name === 'string' && req.body.name.trim().length > 0 ? req.body.name.trim() : undefined;

  try {
    const existingTeam = await getUserTeam(supabase, user.id);
    if (existingTeam?.team) {
      return res.status(400).json({ error: 'You already belong to a team' });
    }

    const team = await createTeamForUser(supabase, user.id, requestedName);
    return res.status(201).json({ team });
  } catch (err: any) {
    console.error('Create team error:', err);
    return res.status(500).json({ error: 'Failed to create team' });
  }
});

app.get('/api/teams/members', express.json(), async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  try {
    const teamResult = await getUserTeam(supabase, user.id);
    if (!teamResult) {
      return res.status(404).json({ error: 'You have not created or joined a team yet' });
    }
    const { team } = teamResult;

    // Fetch team members (no profile join to avoid profile RLS issues)
    const { data: members, error } = await supabase
      .from('team_members')
      .select('id, user_id, role, joined_at')
      .eq('team_id', team.id)
      .order('joined_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const membersSafe = members ?? [];

    // Optionally hydrate with profile info (best-effort; ignore failures)
    const userIds = membersSafe.map((m) => m.user_id).filter(Boolean);
    let profilesById: Record<string, { id: string; full_name?: string; email?: string; avatar_url?: string }> = {};
    if (userIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      if (profileRows) {
        profilesById = profileRows.reduce((acc, row) => {
          acc[row.id] = row;
          return acc;
        }, {} as Record<string, { id: string; full_name?: string; email?: string; avatar_url?: string }>);
      }
    }

    // Fallback: fetch auth emails for any members missing profile info
    let adminEmailsById: Record<string, string> = {};
    const missingProfileIds = membersSafe
      .map((m) => m.user_id)
      .filter((id) => id && !profilesById[id]);
    for (const uid of missingProfileIds) {
      try {
        const { data: adminUser } = await supabase.auth.admin.getUserById(uid);
        const email = adminUser?.user?.email;
        if (email) {
          adminEmailsById[uid] = email;
        }
      } catch {
        // ignore
      }
    }

    const enriched = membersSafe.map((m) => ({
      ...m,
      profile: profilesById[m.user_id] ?? null,
      displayEmail: profilesById[m.user_id]?.email ?? adminEmailsById[m.user_id] ?? null,
      displayName:
        profilesById[m.user_id]?.full_name ??
        profilesById[m.user_id]?.email ??
        adminEmailsById[m.user_id] ??
        null,
    }));

    return res.json({ members: enriched });
  } catch (err: any) {
    console.error('Get members error:', err);
    return res.status(500).json({ error: 'Failed to get members' });
  }
});

// ===== Teams module API (overview, member detail, workload) =====

// GET /api/team - list all members in the current user's team with basic stats
app.get('/api/team', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  try {
    const teamResult = await ensureUserTeamMembership(supabase, user.id);
    const { team } = teamResult;

    // 1) Core team members
    const { data: memberRows, error: membersError } = await supabase
      .from('team_members')
      .select('id, team_id, user_id, role, position, is_active, hourly_rate, notes, joined_at')
      .eq('team_id', team.id)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('List team members error:', membersError);
      return res.status(500).json({ error: 'Failed to load team members' });
    }

    const membersSafe = memberRows ?? [];
    const memberIds = membersSafe.map((m) => m.id);
    const userIds = membersSafe.map((m) => m.user_id);

    // 2) Profile data (best-effort)
    let profilesById: Record<string, { id: string; full_name?: string; email?: string; avatar_url?: string }> = {};
    try {
      if (userIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);
        if (!profileError && profileRows) {
          profilesById = profileRows.reduce((acc, row) => {
            acc[row.id] = row;
            return acc;
          }, {} as Record<string, { id: string; full_name?: string; email?: string; avatar_url?: string }>);
        }
      }
    } catch (profileErr) {
      console.warn('Profiles lookup failed (non-fatal):', profileErr);
    }

    // 3) Fallback auth emails for members missing profiles
    const missingProfileIds = userIds.filter((id) => id && !profilesById[id]);
    const adminEmailsById: Record<string, string> = {};
    for (const uid of missingProfileIds) {
      try {
        const { data: adminUser } = await supabase.auth.admin.getUserById(uid);
        const email = adminUser?.user?.email;
        if (email) {
          adminEmailsById[uid] = email;
        }
      } catch {
        // ignore
      }
    }

    // 4) Upcoming events per member via event_assignments + events
    let assignmentsByMember: Record<string, any[]> = {};
    try {
      if (memberIds.length > 0) {
        const { data: assignmentRows, error: assignmentsError } = await supabase
          .from('event_assignments')
          .select('id, event_id, team_member_id')
          .in('team_member_id', memberIds);
        if (!assignmentsError && assignmentRows) {
          assignmentsByMember = assignmentRows.reduce((acc, row) => {
            const key = row.team_member_id;
            if (!key) return acc;
            if (!acc[key]) acc[key] = [];
            acc[key]?.push(row);
            return acc;
          }, {} as Record<string, any[]>);
        }
      }
    } catch (assignErr) {
      console.warn('Event assignments lookup failed (non-fatal):', assignErr);
    }

    // Fetch events for those assignments to filter by future dates
    const eventIds = Object.values(assignmentsByMember)
      .flat()
      .map((a: any) => a.event_id)
      .filter((id, index, arr) => id && arr.indexOf(id) === index);

    let eventsById: Record<string, { id: string; title: string; wedding_date: string | null }> = {};
    try {
      if (eventIds.length > 0) {
        const { data: eventRows, error: eventsError } = await supabase
          .from('events')
          .select('id, title, wedding_date')
          .in('id', eventIds);
        if (!eventsError && eventRows) {
          eventsById = eventRows.reduce((acc, ev) => {
            acc[ev.id] = {
              id: ev.id,
              title: ev.title,
              wedding_date: ev.wedding_date ?? null,
            };
            return acc;
          }, {} as Record<string, { id: string; title: string; wedding_date: string | null }>);
        }
      }
    } catch (eventsErr) {
      console.warn('Events lookup for workload failed (non-fatal):', eventsErr);
    }

    const today = new Date();
    const isFutureOrToday = (iso: string | null) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
    };

    // 5) Open tasks per member via stage_tasks
    let tasksByUserId: Record<string, any[]> = {};
    try {
      if (userIds.length > 0) {
        const { data: taskRows, error: tasksError } = await supabase
          .from('stage_tasks')
          .select('id, assigned_to, status')
          .in('assigned_to', userIds);
        if (!tasksError && taskRows) {
          tasksByUserId = taskRows.reduce((acc, row) => {
            const uid = row.assigned_to;
            if (!uid) return acc;
            if (!acc[uid]) acc[uid] = [];
            acc[uid].push(row);
            return acc;
          }, {} as Record<string, any[]>);
        }
      }
    } catch (tasksErr) {
      console.warn('Stage tasks lookup failed (non-fatal):', tasksErr);
    }

    const members = membersSafe.map((m) => {
      const profile = profilesById[m.user_id] ?? null;
      const adminEmail = adminEmailsById[m.user_id] ?? null;

      const displayEmail = profile?.email ?? adminEmail;
      const displayName =
        profile?.full_name ??
        profile?.email ??
        adminEmail ??
        'Unknown';

      const memberAssignments = assignmentsByMember[m.id] ?? [];
      const upcomingEventsCount = memberAssignments.filter((a: any) => {
        const ev = eventsById[a.event_id];
        return ev && isFutureOrToday(ev.wedding_date);
      }).length;

      const memberTasks = tasksByUserId[m.user_id] ?? [];
      const openTasksCount = memberTasks.filter((t: any) => t.status !== 'done').length;

      return {
        id: m.id,
        user_id: m.user_id,
        team_id: m.team_id,
        role: m.role,
        position: m.position ?? null,
        is_active: m.is_active ?? true,
        hourly_rate: m.hourly_rate !== undefined && m.hourly_rate !== null ? String(m.hourly_rate) : null,
        notes: m.notes ?? null,
        joined_at: m.joined_at ?? null,
        displayName,
        displayEmail,
        avatarUrl: profile?.avatar_url ?? null,
        upcomingEventsCount,
        openTasksCount,
      };
    });

    return res.json({ members });
  } catch (err: any) {
    console.error('GET /api/team error:', err);
    return res.status(500).json({ error: 'Failed to load team' });
  }
});

// GET /api/team/:id - member detail (permissions, assignments, tasks, availability)
app.get('/api/team/:id', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  const memberId = req.params.id;

  try {
    const teamResult = await ensureUserTeamMembership(supabase, user.id);
    const { team } = teamResult;

    // 1) Member row
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('id, team_id, user_id, role, position, is_active, hourly_rate, notes, joined_at')
      .eq('id', memberId)
      .maybeSingle();

    if (memberError) {
      console.error('Load team member error:', memberError);
      return res.status(500).json({ error: 'Failed to load team member' });
    }

    if (!member || member.team_id !== team.id) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    // 2) Profile info
    let profile:
      | {
          id: string;
          full_name?: string;
          email?: string;
          avatar_url?: string;
        }
      | null = null;
    let adminEmail: string | null = null;

    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', member.user_id)
        .maybeSingle();
      if (profileRow) {
        profile = profileRow;
      }
    } catch {
      // ignore
    }

    if (!profile) {
      try {
        const { data: adminUser } = await supabase.auth.admin.getUserById(member.user_id);
        adminEmail = adminUser?.user?.email ?? null;
      } catch {
        // ignore
      }
    }

    const displayEmail = profile?.email ?? adminEmail;
    const displayName =
      profile?.full_name ??
      profile?.email ??
      adminEmail ??
      'Unknown';

    // 3) Permissions
    let permissions = {
      can_edit_events: false,
      can_edit_budget: false,
      can_invite_members: false,
      can_view_financials: false,
    };

    try {
      const { data: permRow, error: permError } = await supabase
        .from('team_member_permissions')
        .select('can_edit_events, can_edit_budget, can_invite_members, can_view_financials')
        .eq('team_member_id', member.id)
        .maybeSingle();
      if (!permError && permRow) {
        permissions = {
          can_edit_events: !!permRow.can_edit_events,
          can_edit_budget: !!permRow.can_edit_budget,
          can_invite_members: !!permRow.can_invite_members,
          can_view_financials: !!permRow.can_view_financials,
        };
      }
    } catch {
      // ignore, keep defaults
    }

    // 4) Event assignments
    const { data: assignmentRows, error: assignmentsError } = await supabase
      .from('event_assignments')
      .select('id, event_id, role_in_event, is_primary_contact, notes')
      .eq('team_member_id', member.id);

    if (assignmentsError) {
      console.error('Load event assignments error:', assignmentsError);
      return res.status(500).json({ error: 'Failed to load event assignments' });
    }

    const assignmentSafe = assignmentRows ?? [];
    const eventIdsFromAssignments = assignmentSafe.map((a) => a.event_id);
    const uniqueEventIds = eventIdsFromAssignments.filter(
      (id, index, arr) => id && arr.indexOf(id) === index,
    );

    let eventsById: Record<string, { id: string; title: string; wedding_date: string | null }> = {};
    if (uniqueEventIds.length > 0) {
      const { data: eventRows, error: eventsError } = await supabase
        .from('events')
        .select('id, title, wedding_date')
        .in('id', uniqueEventIds);
      if (eventsError) {
        console.error('Load events for assignments error:', eventsError);
      } else if (eventRows) {
        eventsById = eventRows.reduce((acc, ev) => {
          acc[ev.id] = {
            id: ev.id,
            title: ev.title,
            wedding_date: ev.wedding_date ?? null,
          };
          return acc;
        }, {} as Record<string, { id: string; title: string; wedding_date: string | null }>);
      }
    }

    const assignments = assignmentSafe.map((a) => {
      const ev = a.event_id ? eventsById[a.event_id] : null;
      return {
        id: a.id,
        event_id: a.event_id,
        event_title: ev?.title ?? 'Untitled event',
        wedding_date: ev?.wedding_date ?? null,
        role_in_event: a.role_in_event,
        is_primary_contact: a.is_primary_contact ?? false,
      };
    });

    // 5) Tasks for this member (via stage_tasks.assigned_to = member.user_id)
    const { data: taskRows, error: tasksError } = await supabase
      .from('stage_tasks')
      .select('id, event_id, title, status, priority, due_date')
      .eq('assigned_to', member.user_id);

    if (tasksError) {
      console.error('Load tasks for member error:', tasksError);
      return res.status(500).json({ error: 'Failed to load tasks for member' });
    }

    const tasksSafe = taskRows ?? [];
    const eventIdsFromTasks = tasksSafe.map((t) => t.event_id);
    const uniqueTaskEventIds = eventIdsFromTasks.filter(
      (id, index, arr) => id && arr.indexOf(id) === index,
    );

    if (uniqueTaskEventIds.length > 0) {
      const { data: taskEventRows, error: taskEventsError } = await supabase
        .from('events')
        .select('id, title')
        .in('id', uniqueTaskEventIds);
      if (taskEventsError) {
        console.error('Load events for tasks error:', taskEventsError);
      } else if (taskEventRows) {
        taskEventRows.forEach((ev) => {
          const eventId: string | undefined = (ev as any).id;
          if (!eventId) return;
          if (!eventsById[eventId]) {
            eventsById[eventId] = {
              id: eventId,
              title: ev.title,
              wedding_date: null,
            };
          } else {
            eventsById[eventId].title = ev.title;
          }
        });
      }
    }

    const tasks = tasksSafe.map((t) => {
      const ev = t.event_id ? eventsById[t.event_id] : null;
      return {
        id: t.id,
        event_id: t.event_id,
        event_title: ev?.title ?? null,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date ?? null,
      };
    });

    // 6) Availability snapshot
    const { data: availabilityRows, error: availabilityError } = await supabase
      .from('team_availability')
      .select('id, team_member_id, date, status, note')
      .eq('team_member_id', member.id)
      .order('date', { ascending: true });

    if (availabilityError) {
      console.error('Load team availability error:', availabilityError);
      return res.status(500).json({ error: 'Failed to load team availability' });
    }

    const availability =
      availabilityRows?.map((row) => ({
        id: row.id,
        team_member_id: row.team_member_id,
        date: row.date,
        status: row.status,
        note: row.note ?? null,
      })) ?? [];

    const memberPayload = {
      id: member.id,
      user_id: member.user_id,
      team_id: member.team_id,
      role: member.role,
      position: member.position ?? null,
      is_active: member.is_active ?? true,
      hourly_rate: member.hourly_rate !== undefined && member.hourly_rate !== null ? String(member.hourly_rate) : null,
      notes: member.notes ?? null,
      joined_at: member.joined_at ?? null,
      displayName,
      displayEmail,
      avatarUrl: profile?.avatar_url ?? null,
      upcomingEventsCount: assignments.length,
      openTasksCount: tasks.filter((t) => t.status !== 'done').length,
      permissions,
      assignments,
      tasks,
      availability,
    };

    return res.json({ member: memberPayload });
  } catch (err: any) {
    console.error('GET /api/team/:id error:', err);
    return res.status(500).json({ error: 'Failed to load team member' });
  }
});

// GET /api/team/:id/tasks - tasks for a member (shortcut endpoint)
app.get('/api/team/:id/tasks', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  const memberId = req.params.id;

  try {
    const teamResult = await ensureUserTeamMembership(supabase, user.id);
    const { team } = teamResult;

    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('id, team_id, user_id')
      .eq('id', memberId)
      .maybeSingle();

    if (memberError) {
      console.error('Load team member for tasks error:', memberError);
      return res.status(500).json({ error: 'Failed to load member' });
    }

    if (!member || member.team_id !== team.id) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    const { data: taskRows, error: tasksError } = await supabase
      .from('stage_tasks')
      .select('id, event_id, title, status, priority, due_date')
      .eq('assigned_to', member.user_id);

    if (tasksError) {
      console.error('Load member tasks error:', tasksError);
      return res.status(500).json({ error: 'Failed to load tasks' });
    }

    const tasksSafe = taskRows ?? [];
    const eventIds = tasksSafe.map((t) => t.event_id);
    const uniqueEventIds = eventIds.filter((id, index, arr) => id && arr.indexOf(id) === index);

    let eventsById: Record<string, { id: string; title: string }> = {};
    if (uniqueEventIds.length > 0) {
      const { data: eventRows, error: eventsError } = await supabase
        .from('events')
        .select('id, title')
        .in('id', uniqueEventIds);
      if (eventsError) {
        console.error('Load events for member tasks error:', eventsError);
      } else if (eventRows) {
        eventsById = eventRows.reduce((acc, ev) => {
          acc[ev.id] = { id: ev.id, title: ev.title };
          return acc;
        }, {} as Record<string, { id: string; title: string }>);
      }
    }

    const tasks = tasksSafe.map((t) => {
      const ev = t.event_id ? eventsById[t.event_id] : null;
      return {
        id: t.id,
        event_id: t.event_id,
        event_title: ev?.title ?? null,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date ?? null,
      };
    });

    return res.json({ tasks });
  } catch (err: any) {
    console.error('GET /api/team/:id/tasks error:', err);
    return res.status(500).json({ error: 'Failed to load member tasks' });
  }
});

// GET /api/team/calendar - workload view: events by member
app.get('/api/team/calendar', async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  try {
    const teamResult = await ensureUserTeamMembership(supabase, user.id);
    const { team } = teamResult;

    const { data: memberRows, error: membersError } = await supabase
      .from('team_members')
      .select('id, team_id, user_id, position')
      .eq('team_id', team.id);

    if (membersError) {
      console.error('Load team members for workload error:', membersError);
      return res.status(500).json({ error: 'Failed to load team members' });
    }

    const membersSafe = memberRows ?? [];
    const memberIds = membersSafe.map((m) => m.id);

    const { data: assignmentRows, error: assignmentsError } = await supabase
      .from('event_assignments')
      .select('id, event_id, team_member_id, role_in_event')
      .in('team_member_id', memberIds);

    if (assignmentsError) {
      console.error('Load assignments for workload error:', assignmentsError);
      return res.status(500).json({ error: 'Failed to load assignments' });
    }

    const assignmentsSafe = assignmentRows ?? [];
    const eventIds = assignmentsSafe.map((a) => a.event_id);
    const uniqueEventIds = eventIds.filter((id, index, arr) => id && arr.indexOf(id) === index);

    let eventsById: Record<string, { id: string; title: string; wedding_date: string | null }> = {};
    if (uniqueEventIds.length > 0) {
      const { data: eventRows, error: eventsError } = await supabase
        .from('events')
        .select('id, title, wedding_date')
        .in('id', uniqueEventIds);
      if (eventsError) {
        console.error('Load events for workload error:', eventsError);
      } else if (eventRows) {
        eventsById = eventRows.reduce((acc, ev) => {
          acc[ev.id] = {
            id: ev.id,
            title: ev.title,
            wedding_date: ev.wedding_date ?? null,
          };
          return acc;
        }, {} as Record<string, { id: string; title: string; wedding_date: string | null }>);
      }
    }

    // Basic member name map for display
    const userIds = membersSafe.map((m) => m.user_id);
    let profilesById: Record<string, { id: string; full_name?: string; email?: string }> = {};
    try {
      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        if (profileRows) {
          profilesById = profileRows.reduce((acc, row) => {
            acc[row.id] = row;
            return acc;
          }, {} as Record<string, { id: string; full_name?: string; email?: string }>);
        }
      }
    } catch {
      // ignore
    }

    const workload = membersSafe.map((m) => {
      const profile = profilesById[m.user_id] ?? null;
      const memberAssignments = assignmentsSafe.filter((a) => a.team_member_id === m.id);
      const assignments = memberAssignments.map((a) => {
        const ev = a.event_id ? eventsById[a.event_id] : null;
        return {
          event_id: a.event_id,
          event_title: ev?.title ?? 'Untitled event',
          wedding_date: ev?.wedding_date ?? null,
          role_in_event: a.role_in_event,
        };
      });

      const memberName =
        profile?.full_name ??
        profile?.email ??
        m.position ??
        'Unknown';

      return {
        member_id: m.id,
        member_name: memberName,
        assignments,
      };
    });

    return res.json({ workload });
  } catch (err: any) {
    console.error('GET /api/team/calendar error:', err);
    return res.status(500).json({ error: 'Failed to load team workload' });
  }
});

app.post('/api/teams/invite', express.json(), async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email } = req.body ?? {};
  if (typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  try {
    const teamResult = await getUserTeam(supabase, user.id);
    if (!teamResult) {
      return res.status(400).json({ error: 'Create a team before inviting members' });
    }
    const { team } = teamResult;

    const normalizedEmail = email.trim().toLowerCase();

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', team.id)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle();

    const generateToken = () =>
      Buffer.from(Math.random().toString(36) + Date.now().toString(36)).toString('base64url').slice(0, 48);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    if (existingInvite) {
      const { data: updatedInvite, error: updateError } = await supabase
        .from('team_invitations')
        .update({
          inviter_id: user.id,
          token: generateToken(),
          expires_at: expiresAt,
          status: 'pending',
          accepted_at: null,
          created_at: new Date().toISOString(),
        })
        .eq('id', existingInvite.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update invitation error:', updateError);
        return res.status(500).json({ error: updateError.message });
      }

      return res.status(200).json({ invitation: updatedInvite, resent: true });
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: team.id,
        inviter_id: user.id,
        email: normalizedEmail,
        token: generateToken(),
        status: 'pending',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Create invitation error:', inviteError);
      return res.status(500).json({ error: inviteError.message });
    }

    // TODO: Send email notification here (using a service like SendGrid, Resend, etc.)

    return res.status(201).json({ invitation });
  } catch (err: any) {
    console.error('Invite error:', err);
    return res.status(500).json({ error: 'Failed to send invitation' });
  }
});

app.get('/api/teams/invitations/pending', express.json(), async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  try {
    const userEmail = typeof user.email === 'string' ? user.email.toLowerCase() : null;
    if (!userEmail) {
      return res.json({ invitations: [] });
    }

    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select('id, team_id, inviter_id, email, status, expires_at, created_at, token')
      .eq('email', userEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    let teamsById: Record<string, { id: string; name: string; owner_id: string }> = {};
    const teamIds = (invitations ?? []).map((invite) => invite.team_id).filter(Boolean);

    if (teamIds.length > 0) {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, owner_id')
        .in('id', teamIds);

      if (teamsError) {
        return res.status(500).json({ error: teamsError.message });
      }

      if (teamsData) {
        teamsById = teamsData.reduce(
          (acc, team) => ({
            ...acc,
            [team.id]: team,
          }),
          {},
        );
      }
    }

    const responseInvites =
      invitations?.map((invite) => ({
        ...invite,
        team: invite.team_id ? teamsById[invite.team_id] ?? null : null,
      })) ?? [];

    return res.json({ invitations: responseInvites });
  } catch (err: any) {
    console.error('Get invitations error:', err);
    return res.status(500).json({ error: 'Failed to get invitations' });
  }
});

app.post('/api/teams/invitations/accept', express.json(), async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { token } = req.body ?? {};
  if (typeof token !== 'string') {
    return res.status(400).json({ error: 'Invitation token is required' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  try {
    // Use the database function to accept invitation
    const { data, error } = await supabase.rpc('accept_team_invitation', { invitation_token: token });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data || !data.success) {
      return res.status(400).json({ error: data?.error || 'Failed to accept invitation' });
    }

    return res.json({ success: true, team_id: data.team_id });
  } catch (err: any) {
    console.error('Accept invitation error:', err);
    return res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Chat: list conversations (team + direct messages)
app.get('/api/chat/conversations', express.json(), async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  try {
    const { team } = await ensureUserTeamMembership(supabase, user.id);

    // Get latest message per conversation
    const { data: teamMessages } = await supabase
      .from('messages')
      .select('id, content, created_at, user_id')
      .eq('team_id', team.id)
      .is('recipient_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get direct message conversations (skip if column missing)
    let directMessages: { id: string; content: string; created_at: string; user_id: string; recipient_id: string | null }[] = [];
    try {
      const { data: directData, error: directErr } = await supabase
        .from('messages')
        .select('id, content, created_at, user_id, recipient_id')
        .eq('team_id', team.id)
        .not('recipient_id', 'is', null)
        .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (directErr) throw directErr;
      directMessages = directData ?? [];
    } catch (e: any) {
      const msg = e?.message || '';
      if (!msg.includes('recipient_id')) {
        console.warn('Direct message fetch failed:', msg);
      } else {
        console.warn('Direct messages skipped (recipient_id missing). Apply supabase_chat_direct_messages.sql to enable DMs.');
      }
      directMessages = [];
    }

    // Group by conversation partner
    const conversations: Array<{
      type: 'team' | 'direct';
      id: string;
      name: string;
      lastMessage?: { content: string; created_at: string };
      unread?: number;
    }> = [];

    // Add team conversation
    if (teamMessages) {
      conversations.push({
        type: 'team',
        id: `team-${team.id}`,
        name: team.name,
        lastMessage: {
          content: teamMessages.content,
          created_at: teamMessages.created_at,
        },
      });
    } else {
      conversations.push({
        type: 'team',
        id: `team-${team.id}`,
        name: team.name,
      });
    }

    // Group direct messages by partner
    const directByPartner = new Map<string, Array<{ content: string; created_at: string; user_id: string; recipient_id: string | null }>>();
    directMessages?.forEach((msg) => {
      const partnerId = msg.user_id === user.id ? msg.recipient_id : msg.user_id;
      if (partnerId) {
        const existing = directByPartner.get(partnerId);
        if (!existing || new Date(msg.created_at) > new Date(existing[0]?.created_at || '')) {
          directByPartner.set(partnerId, [{ content: msg.content, created_at: msg.created_at, user_id: msg.user_id, recipient_id: msg.recipient_id }]);
        }
      }
    });

    // Get profiles for direct message partners
    const partnerIds = Array.from(directByPartner.keys());
    let partnerProfiles: Record<string, { full_name?: string | null; email?: string | null }> = {};
    if (partnerIds.length > 0) {
      try {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', partnerIds);
        if (profileRows) {
          partnerProfiles = profileRows.reduce((acc, row) => {
            acc[row.id] = { full_name: row.full_name ?? null, email: row.email ?? null };
            return acc;
          }, {} as Record<string, { full_name?: string | null; email?: string | null }>);
        }
      } catch {
        // ignore
      }

      // Fallback to admin emails
      for (const pid of partnerIds) {
        if (!partnerProfiles[pid]) {
          try {
            const { data: adminUser } = await supabase.auth.admin.getUserById(pid);
            if (adminUser?.user?.email) {
              partnerProfiles[pid] = { full_name: null, email: adminUser.user.email };
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // Add direct message conversations
    directByPartner.forEach((msgs, partnerId) => {
      const profile = partnerProfiles[partnerId];
      const name = profile?.full_name || profile?.email || 'Unknown';
      const lastMsg = msgs?.[0];
      if (lastMsg) {
        conversations.push({
          type: 'direct',
          id: `direct-${partnerId}`,
          name,
          lastMessage: { content: String(lastMsg.content), created_at: String(lastMsg.created_at) },
        });
      } else {
        conversations.push({
          type: 'direct',
          id: `direct-${partnerId}`,
          name,
        });
      }
    });

    // Sort by last message time
    conversations.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return res.json({ conversations });
  } catch (err: any) {
    console.error('Conversations list error:', err);
    return res.status(400).json({ error: err?.message || 'Failed to load conversations' });
  }
});

// Chat: list messages (team or direct, paginated)
app.get('/api/chat/messages', express.json(), async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  const { limit: rawLimit, before, recipientId } = (req.query as any) ?? {};
  const limit = Math.min(Number(rawLimit) || 50, 200);

  try {
    const { team } = await ensureUserTeamMembership(supabase, user.id);

    let query = supabase
      .from('messages')
      .select('id, team_id, user_id, recipient_id, content, created_at')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (recipientId && typeof recipientId === 'string') {
      // Direct message conversation
      query = query
        .not('recipient_id', 'is', null)
        .or(`and(user_id.eq.${user.id},recipient_id.eq.${recipientId}),and(user_id.eq.${recipientId},recipient_id.eq.${user.id})`);
    } else {
      // Team messages
      query = query.is('recipient_id', null);
    }

    if (typeof before === 'string') {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    // Fallback if recipient_id column missing: fetch team messages only
    if (error && String(error.message || '').includes('recipient_id')) {
      console.warn('messages.recipient_id missing; returning team messages only. Apply supabase_chat_direct_messages.sql to enable DMs.');
      const fallback = await supabase
        .from('messages')
        .select('id, team_id, user_id, content, created_at')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (fallback.error) {
        return res.status(500).json({ error: fallback.error.message });
      }
      const rows = fallback.data ?? [];
      return res.json({
        messages: rows
          .map((row) => ({
            id: row.id,
            team_id: row.team_id,
            user_id: row.user_id,
            recipient_id: null,
            content: row.content,
            created_at: row.created_at,
            profile: null,
          }))
          .reverse(),
      });
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const rows = data ?? [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
    let profilesById: Record<string, { full_name?: string | null; email?: string | null; avatar_url?: string | null }> =
      {};

    if (userIds.length > 0) {
      try {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        if (!profileError && profileRows) {
          profilesById = profileRows.reduce((acc, row) => {
            acc[row.id] = {
              full_name: row.full_name ?? null,
              email: row.email ?? null,
              avatar_url: row.avatar_url ?? null,
            };
            return acc;
          }, {} as Record<string, { full_name?: string | null; email?: string | null; avatar_url?: string | null }>);
        }
      } catch (e: any) {
        // If profiles table doesn't exist in this project, continue without profiles.
        const msg = e?.message || '';
        if (!String(msg).includes('profiles')) {
          console.warn('Profiles lookup failed:', msg);
        }
      }
    }

    // Best-effort admin email lookup for any missing profiles
    const missingProfileIds = userIds.filter((id) => !profilesById[id]);
    if (missingProfileIds.length > 0) {
      for (const uid of missingProfileIds) {
        try {
          const { data: adminUser } = await supabase.auth.admin.getUserById(uid);
          const email = adminUser?.user?.email ?? null;
          if (email) {
            profilesById[uid] = { full_name: null, email, avatar_url: null };
          }
        } catch {
          // ignore admin lookup failures
        }
      }
    }

    const normalized = rows.map((row) => ({
      id: row.id,
      team_id: row.team_id,
      user_id: row.user_id,
      recipient_id: row.recipient_id ?? null,
      content: row.content,
      created_at: row.created_at,
      profile: profilesById[row.user_id] ?? null,
    }));

    return res.json({ messages: normalized.reverse() });
  } catch (err: any) {
    console.error('Chat list error:', err);
    return res.status(400).json({ error: err?.message || 'Failed to load messages' });
  }
});

// Chat: send message (team or direct)
app.post('/api/chat/messages', express.json(), async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service client unavailable' });
  }

  const { content, recipientId } = req.body ?? {};
  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const { team } = await ensureUserTeamMembership(supabase, user.id);
    const trimmed = content.trim();

    // Validate recipient is in same team if direct message
    if (recipientId && typeof recipientId === 'string') {
      const { data: memberCheck } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.id)
        .eq('user_id', recipientId)
        .maybeSingle();
      if (!memberCheck) {
        return res.status(400).json({ error: 'Recipient must be in the same team' });
      }
    }

    const insertPayload: any = {
      team_id: team.id,
      user_id: user.id,
      content: trimmed,
    };
    if (recipientId && typeof recipientId === 'string') {
      insertPayload.recipient_id = recipientId;
    }

    let { data, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select('id, team_id, user_id, recipient_id, content, created_at')
      .single();

    // Fallback if recipient_id column missing: retry without it (team message only)
    if (error && String(error.message || '').includes('recipient_id')) {
      console.warn('messages.recipient_id missing; inserting as team message. Apply supabase_chat_direct_messages.sql to enable DMs.');
      const fallbackInsert = await supabase
        .from('messages')
        .insert({
          team_id: team.id,
          user_id: user.id,
          content: trimmed,
        })
        .select('id, team_id, user_id, content, created_at')
        .single();
      if (fallbackInsert.error) {
        return res.status(500).json({ error: fallbackInsert.error.message });
      }
      data = fallbackInsert.data as any;
    } else if (error) {
      return res.status(500).json({ error: error.message });
    }

    let profile: { full_name?: string | null; email?: string | null; avatar_url?: string | null } | null = null;
    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profileRow) {
        profile = {
          full_name: profileRow.full_name ?? null,
          email: profileRow.email ?? null,
          avatar_url: profileRow.avatar_url ?? null,
        };
      }
    } catch (e: any) {
      // If profiles table not present, continue without profile
      const msg = e?.message || '';
      if (!String(msg).includes('profiles')) {
        console.warn('Profiles lookup failed on send:', msg);
      }
    }

    // Fallback to admin email if profile missing
    if (!profile) {
      try {
        const { data: adminUser } = await supabase.auth.admin.getUserById(user.id);
        const email = adminUser?.user?.email ?? null;
        if (email) {
          profile = { full_name: null, email, avatar_url: null };
        }
      } catch {
        // ignore
      }
    }

    const responseMessage = data
      ? {
          id: data.id,
          team_id: data.team_id,
          user_id: data.user_id,
          recipient_id: data.recipient_id ?? null,
          content: data.content,
          created_at: data.created_at,
          profile,
        }
      : null;

    return res.status(201).json({ message: responseMessage });
  } catch (err: any) {
    console.error('Chat send error:', err);
    return res.status(400).json({ error: err?.message || 'Failed to send message' });
  }
});

// ===== EVENTS / PROJECT PIPELINE API =====

const DEFAULT_PIPELINE_STAGES: Array<{ key: string; title: string; description: string | null; order_index: number }> =
  [
    { key: 'vision_style', title: 'Vision & Style', description: 'Overall vision, mood, and style for the wedding.', order_index: 1 },
    { key: 'venue_date', title: 'Venue & Date', description: 'Secure venue and confirm wedding date.', order_index: 2 },
    { key: 'guest_list', title: 'Guest List & Seating', description: 'Guest list, RSVPs, and seating plan.', order_index: 3 },
    { key: 'budget', title: 'Budget & Payments', description: 'Budget, deposits, and payment schedule.', order_index: 4 },
    { key: 'vendors', title: 'Vendors & Contracts', description: 'Select and contract key vendors.', order_index: 5 },
    { key: 'design_layout', title: 'Design & Layout', description: 'Decor, floor plans, and aesthetic details.', order_index: 6 },
    { key: 'logistics', title: 'Logistics & Timeline', description: 'Timelines, transportation, and logistics.', order_index: 7 },
    { key: 'wedding_day', title: 'Wedding Day', description: 'Day-of coordination and run-of-show.', order_index: 8 },
    { key: 'post_event', title: 'Post-Event', description: 'Photos, payments, and feedback.', order_index: 9 },
  ];

async function logEventActivity(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  eventId: string,
  userId: string,
  action: string,
) {
  try {
    await supabase.from('event_activity_log').insert({
      event_id: eventId,
      created_by: userId,
      action,
    });
  } catch (err) {
    console.warn('[event_activity_log] Failed to insert activity:', err);
  }
}

// List events for current planner
app.get('/api/events', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('planner_id', user.id)
      .order('wedding_date', { ascending: true });

    if (error) {
      console.error('[GET /api/events] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ events: events ?? [] });
  } catch (error: any) {
    console.error('[GET /api/events] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Create a new event and seed default pipeline stages
app.post('/api/events', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      wedding_date,
      guest_count_expected,
      guest_count_confirmed,
      budget_planned,
      budget_actual,
      notes_internal,
    } = req.body ?? {};

    if (!title || typeof title !== 'string' || !wedding_date) {
      return res.status(400).json({ error: 'Title and wedding_date are required' });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        planner_id: user.id,
        title: title.trim(),
        wedding_date,
        status: 'on_track',
        guest_count_expected: typeof guest_count_expected === 'number' ? guest_count_expected : 0,
        guest_count_confirmed: guest_count_confirmed ?? null,
        budget_planned: budget_planned ?? null,
        budget_actual: budget_actual ?? null,
        notes_internal: notes_internal ?? null,
      })
      .select('*')
      .single();

    if (error || !event) {
      console.error('[POST /api/events] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to create event' });
    }

    // Seed default pipeline stages
    const stagesToInsert = DEFAULT_PIPELINE_STAGES.map((stage) => ({
      event_id: event.id,
      order_index: stage.order_index,
      key: stage.key,
      title: stage.title,
      description: stage.description,
      progress_percent: 0,
      is_blocking: true,
      due_date: null,
    }));

    const { data: seededStages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .insert(stagesToInsert)
      .select('*')
      .order('order_index', { ascending: true });

    if (stagesError) {
      console.error('[POST /api/events] Failed to seed stages:', stagesError);
    } else {
      await logEventActivity(supabase, event.id, user.id, 'Event created and default pipeline stages initialized');
    }

    return res.status(201).json({
      event,
      stages: seededStages ?? [],
    });
  } catch (error: any) {
    console.error('[POST /api/events] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Get event workspace (event + related data)
app.get('/api/events/:id', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('planner_id', user.id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const [
      stagesResult,
      tasksResult,
      clientResult,
      venueResult,
      vendorsResult,
      filesResult,
      activityResult,
    ] = await Promise.all([
      supabase.from('pipeline_stages').select('*').eq('event_id', event.id).order('order_index', { ascending: true }),
      supabase.from('stage_tasks').select('*').eq('event_id', event.id),
      supabase.from('clients').select('*').eq('event_id', event.id).maybeSingle(),
      supabase.from('venues').select('*').eq('event_id', event.id).maybeSingle(),
      supabase.from('vendors').select('*').eq('event_id', event.id),
      supabase.from('event_files').select('*').eq('event_id', event.id),
      supabase
        .from('event_activity_log')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (stagesResult.error || tasksResult.error || clientResult.error || venueResult.error || vendorsResult.error || filesResult.error || activityResult.error) {
      console.error('[GET /api/events/:id] Error loading workspace', {
        stagesError: stagesResult.error,
        tasksError: tasksResult.error,
        clientError: clientResult.error,
        venueError: venueResult.error,
        vendorsError: vendorsResult.error,
        filesError: filesResult.error,
        activityError: activityResult.error,
      });
      return res.status(500).json({ error: 'Failed to load event workspace' });
    }

    return res.json({
      workspace: {
        event,
        stages: stagesResult.data ?? [],
        tasks: tasksResult.data ?? [],
        client: clientResult.data ?? null,
        venue: venueResult.data ?? null,
        vendors: vendorsResult.data ?? [],
        files: filesResult.data ?? [],
        activityLog: activityResult.data ?? [],
      },
    });
  } catch (error: any) {
    console.error('[GET /api/events/:id] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Update event high-level fields
app.patch('/api/events/:id', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Ensure event belongs to user
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('planner_id', user.id)
      .single();

    if (fetchError || !existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const patch: any = {};
    const body = req.body ?? {};
    if (body.title !== undefined) patch.title = String(body.title);
    if (body.wedding_date !== undefined) patch.wedding_date = body.wedding_date;
    if (body.status !== undefined) patch.status = body.status;
    if (body.current_stage !== undefined) patch.current_stage = body.current_stage;
    if (body.guest_count_expected !== undefined) patch.guest_count_expected = body.guest_count_expected;
    if (body.guest_count_confirmed !== undefined) patch.guest_count_confirmed = body.guest_count_confirmed;
    if (body.budget_planned !== undefined) patch.budget_planned = body.budget_planned;
    if (body.budget_actual !== undefined) patch.budget_actual = body.budget_actual;
    if (body.notes_internal !== undefined) patch.notes_internal = body.notes_internal;

    const { data: updatedEvent, error } = await supabase
      .from('events')
      .update(patch)
      .eq('id', eventId)
      .select('*')
      .single();

    if (error || !updatedEvent) {
      console.error('[PATCH /api/events/:id] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to update event' });
    }

    await logEventActivity(supabase, eventId, user.id, 'Event updated');

    return res.json({ event: updatedEvent });
  } catch (error: any) {
    console.error('[PATCH /api/events/:id] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Get stages for an event
app.get('/api/events/:id/stages', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('planner_id', user.id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { data: stages, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('event_id', eventId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[GET /api/events/:id/stages] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ stages: stages ?? [] });
  } catch (error: any) {
    console.error('[GET /api/events/:id/stages] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Update a pipeline stage
app.patch('/api/stages/:id', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const stageId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: stageRow, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id, event_id, title')
      .eq('id', stageId)
      .single();

    if (stageError || !stageRow) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    // Ensure event belongs to user
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', stageRow.event_id)
      .eq('planner_id', user.id)
      .single();

    if (eventError || !event) {
      return res.status(403).json({ error: 'Not authorized to update this stage' });
    }

    const patch: any = {};
    const body = req.body ?? {};
    if (body.title !== undefined) patch.title = String(body.title);
    if (body.description !== undefined) patch.description = body.description;
    if (body.progress_percent !== undefined) patch.progress_percent = body.progress_percent;
    if (body.due_date !== undefined) patch.due_date = body.due_date;
    if (body.is_blocking !== undefined) patch.is_blocking = body.is_blocking;
    if (body.order_index !== undefined) patch.order_index = body.order_index;

    const { data: updatedStage, error } = await supabase
      .from('pipeline_stages')
      .update(patch)
      .eq('id', stageId)
      .select('*')
      .single();

    if (error || !updatedStage) {
      console.error('[PATCH /api/stages/:id] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to update stage' });
    }

    await logEventActivity(supabase, stageRow.event_id, user.id, `Stage updated: ${updatedStage.title}`);

    return res.json({ stage: updatedStage });
  } catch (error: any) {
    console.error('[PATCH /api/stages/:id] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Create a new task under a stage
app.post('/api/stages/:id/tasks', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const stageId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: stageRow, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id, event_id, title')
      .eq('id', stageId)
      .single();

    if (stageError || !stageRow) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    // Ensure event belongs to user
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', stageRow.event_id)
      .eq('planner_id', user.id)
      .single();

    if (eventError || !event) {
      return res.status(403).json({ error: 'Not authorized to add tasks to this stage' });
    }

    const { title, description, assigned_to, status, priority, due_date } = req.body ?? {};

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Optional: validate assigned_to is a team member
    if (assigned_to) {
      try {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('user_id', assigned_to)
          .maybeSingle();
        if (!teamMember) {
          return res.status(400).json({ error: 'Assignee must be a team member' });
        }
      } catch (err) {
        console.warn('[POST /api/stages/:id/tasks] Failed to validate assignee:', err);
      }
    }

    const { data: task, error } = await supabase
      .from('stage_tasks')
      .insert({
        event_id: stageRow.event_id,
        stage_id: stageId,
        title: title.trim(),
        description: description ?? null,
        assigned_to: assigned_to ?? null,
        status: status ?? 'todo',
        priority: priority ?? 'medium',
        due_date: due_date ?? null,
      })
      .select('*')
      .single();

    if (error || !task) {
      console.error('[POST /api/stages/:id/tasks] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to create task' });
    }

    // Recalculate stage progress based on tasks
    const { data: allTasks, error: tasksError } = await supabase
      .from('stage_tasks')
      .select('id, status')
      .eq('stage_id', stageId);

    if (!tasksError && allTasks && allTasks.length > 0) {
      const total = allTasks.length;
      const doneCount = allTasks.filter((t: any) => t.status === 'done').length;
      const progress = Math.round((doneCount / total) * 100);
      await supabase.from('pipeline_stages').update({ progress_percent: progress }).eq('id', stageId);
    }

    await logEventActivity(supabase, stageRow.event_id, user.id, `Task created in stage: ${stageRow.title}`);

    return res.status(201).json({ task });
  } catch (error: any) {
    console.error('[POST /api/stages/:id/tasks] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Update a stage task
app.patch('/api/tasks/:id', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const taskId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Fetch task with event and stage
    const { data: taskRow, error: taskError } = await supabase
      .from('stage_tasks')
      .select('id, event_id, stage_id, status')
      .eq('id', taskId)
      .single();

    if (taskError || !taskRow) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Ensure event belongs to user
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', taskRow.event_id)
      .eq('planner_id', user.id)
      .single();

    if (eventError || !event) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const body = req.body ?? {};
    const updates: any = {};
    if (body.title !== undefined) updates.title = String(body.title);
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.due_date !== undefined) updates.due_date = body.due_date ?? null;
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to ?? null;

    // Validate assignee if changed
    if (updates.assigned_to) {
      try {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('user_id', updates.assigned_to)
          .maybeSingle();
        if (!teamMember) {
          return res.status(400).json({ error: 'Assignee must be a team member' });
        }
      } catch (err) {
        console.warn('[PATCH /api/tasks/:id] Failed to validate assignee:', err);
      }
    }

    const { data: updatedTask, error } = await supabase
      .from('stage_tasks')
      .update(updates)
      .eq('id', taskId)
      .select('*')
      .single();

    if (error || !updatedTask) {
      console.error('[PATCH /api/tasks/:id] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to update task' });
    }

    // Recalculate stage progress based on tasks
    const { data: allTasks, error: tasksError } = await supabase
      .from('stage_tasks')
      .select('id, status')
      .eq('stage_id', taskRow.stage_id);

    if (!tasksError && allTasks && allTasks.length > 0) {
      const total = allTasks.length;
      const doneCount = allTasks.filter((t: any) => t.status === 'done').length;
      const progress = Math.round((doneCount / total) * 100);
      await supabase.from('pipeline_stages').update({ progress_percent: progress }).eq('id', taskRow.stage_id);
    }

    await logEventActivity(supabase, taskRow.event_id, user.id, 'Task updated');

    return res.json({ task: updatedTask });
  } catch (error: any) {
    console.error('[PATCH /api/tasks/:id] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Get vendors for an event
app.get('/api/events/:id/vendors', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('planner_id', user.id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { data: vendors, error } = await supabase.from('vendors').select('*').eq('event_id', eventId);

    if (error) {
      console.error('[GET /api/events/:id/vendors] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ vendors: vendors ?? [] });
  } catch (error: any) {
    console.error('[GET /api/events/:id/vendors] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Update vendor
app.patch('/api/vendors/:id', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const vendorId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: vendorRow, error: vendorError } = await supabase
      .from('vendors')
      .select('id, event_id, name')
      .eq('id', vendorId)
      .single();

    if (vendorError || !vendorRow) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', vendorRow.event_id)
      .eq('planner_id', user.id)
      .single();

    if (eventError || !event) {
      return res.status(403).json({ error: 'Not authorized to update this vendor' });
    }

    const body = req.body ?? {};
    const patch: any = {};
    if (body.category !== undefined) patch.category = body.category;
    if (body.name !== undefined) patch.name = body.name;
    if (body.contact_phone !== undefined) patch.contact_phone = body.contact_phone;
    if (body.contact_email !== undefined) patch.contact_email = body.contact_email;
    if (body.website !== undefined) patch.website = body.website;
    if (body.contract_status !== undefined) patch.contract_status = body.contract_status;
    if (body.quote_amount !== undefined) patch.quote_amount = body.quote_amount;
    if (body.final_amount !== undefined) patch.final_amount = body.final_amount;
    if (body.notes !== undefined) patch.notes = body.notes;

    const { data: updatedVendor, error } = await supabase
      .from('vendors')
      .update(patch)
      .eq('id', vendorId)
      .select('*')
      .single();

    if (error || !updatedVendor) {
      console.error('[PATCH /api/vendors/:id] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to update vendor' });
    }

    await logEventActivity(supabase, vendorRow.event_id, user.id, `Vendor updated: ${updatedVendor.name}`);

    return res.json({ vendor: updatedVendor });
  } catch (error: any) {
    console.error('[PATCH /api/vendors/:id] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// ===== Suppliers / Vendors directory =====

// List suppliers for current planner
app.get('/api/suppliers', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const favorite =
      typeof req.query.favorite === 'string' && req.query.favorite.toLowerCase() === 'true';

    let query = supabase
      .from('suppliers')
      .select('id, planner_id, name, category, company_name, email, phone, website, location, notes, rating_internal, is_favorite, created_at, updated_at')
      .eq('planner_id', user.id);

    if (category) {
      query = query.eq('category', category);
    }
    if (favorite) {
      query = query.eq('is_favorite', true);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: suppliers, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/suppliers] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    const supplierIds = (suppliers ?? []).map((s) => s.id);
    let countsBySupplier: Record<string, number> = {};
    if (supplierIds.length > 0) {
      const { data: counts, error: countError } = await supabase
        .from('event_suppliers')
        .select('supplier_id, event_id');
      if (!countError && counts) {
        countsBySupplier = counts.reduce((acc: Record<string, number>, row: any) => {
          if (!row.supplier_id) return acc;
          acc[row.supplier_id] = (acc[row.supplier_id] ?? 0) + 1;
          return acc;
        }, {});
      }
    }

    const withCounts = (suppliers ?? []).map((s) => ({
      ...s,
      linked_events_count: countsBySupplier[s.id] ?? 0,
    }));

    return res.json({ suppliers: withCounts });
  } catch (error: any) {
    console.error('[GET /api/suppliers] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Create supplier
app.post('/api/suppliers', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, category, company_name, email, phone, website, location, notes } = req.body ?? {};

    if (!name || typeof name !== 'string' || !category || typeof category !== 'string') {
      return res.status(400).json({ error: 'name and category are required' });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        planner_id: user.id,
        name: name.trim(),
        category: category.trim(),
        company_name: company_name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        website: website ?? null,
        location: location ?? null,
        notes: notes ?? null,
      })
      .select('*')
      .single();

    if (error || !supplier) {
      console.error('[POST /api/suppliers] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to create supplier' });
    }

    return res.status(201).json({ supplier });
  } catch (error: any) {
    console.error('[POST /api/suppliers] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Update supplier
app.patch('/api/suppliers/:id', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const supplierId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: supplierRow, error: loadError } = await supabase
      .from('suppliers')
      .select('id, planner_id')
      .eq('id', supplierId)
      .single();

    if (loadError || !supplierRow || supplierRow.planner_id !== user.id) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const body = req.body ?? {};
    const patch: any = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.category !== undefined) patch.category = body.category;
    if (body.company_name !== undefined) patch.company_name = body.company_name;
    if (body.email !== undefined) patch.email = body.email;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.website !== undefined) patch.website = body.website;
    if (body.location !== undefined) patch.location = body.location;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.rating_internal !== undefined) patch.rating_internal = body.rating_internal;
    if (body.is_favorite !== undefined) patch.is_favorite = body.is_favorite;

    const { data: updated, error } = await supabase
      .from('suppliers')
      .update(patch)
      .eq('id', supplierId)
      .select('*')
      .single();

    if (error || !updated) {
      console.error('[PATCH /api/suppliers/:id] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to update supplier' });
    }

    return res.json({ supplier: updated });
  } catch (error: any) {
    console.error('[PATCH /api/suppliers/:id] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Delete supplier (hard delete)
app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const supplierId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: supplierRow, error: loadError } = await supabase
      .from('suppliers')
      .select('id, planner_id')
      .eq('id', supplierId)
      .single();

    if (loadError || !supplierRow || supplierRow.planner_id !== user.id) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
    if (error) {
      console.error('[DELETE /api/suppliers/:id] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(204).json({});
  } catch (error: any) {
    console.error('[DELETE /api/suppliers/:id] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// List event suppliers
app.get('/api/events/:id/suppliers', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, planner_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event || event.planner_id !== user.id) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { data: rows, error } = await supabase
      .from('event_suppliers')
      .select(
        `
        id,
        event_id,
        supplier_id,
        category,
        status,
        quoted_price,
        currency,
        notes,
        created_at,
        suppliers:supplier_id (
          id,
          planner_id,
          name,
          category,
          company_name,
          email,
          phone,
          website,
          location,
          notes,
          rating_internal,
          is_favorite,
          created_at,
          updated_at
        )
      `,
      )
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[GET /api/events/:id/suppliers] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    const eventSuppliers = (rows ?? []).map((row: any) => ({
      ...row,
      supplier: row.suppliers ?? null,
    }));

    return res.json({ eventSuppliers });
  } catch (error: any) {
    console.error('[GET /api/events/:id/suppliers] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Add supplier to event
app.post('/api/events/:id/suppliers', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, planner_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event || event.planner_id !== user.id) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { supplier_id, category, status, quoted_price, currency, notes } = req.body ?? {};
    if (!supplier_id || !category) {
      return res.status(400).json({ error: 'supplier_id and category are required' });
    }

    const { data: supplierRow, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, planner_id')
      .eq('id', supplier_id)
      .single();

    if (supplierError || !supplierRow || supplierRow.planner_id !== user.id) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const { data: inserted, error } = await supabase
      .from('event_suppliers')
      .insert({
        event_id: eventId,
        supplier_id,
        category,
        status: status ?? 'researched',
        quoted_price: quoted_price ?? null,
        currency: currency ?? 'EUR',
        notes: notes ?? null,
      })
      .select('*')
      .single();

    if (error || !inserted) {
      console.error('[POST /api/events/:id/suppliers] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to add event supplier' });
    }

    return res.status(201).json({ eventSupplier: inserted });
  } catch (error: any) {
    console.error('[POST /api/events/:id/suppliers] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Update event supplier
app.patch('/api/event-suppliers/:id', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const linkId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: linkRow, error: linkError } = await supabase
      .from('event_suppliers')
      .select('id, event_id')
      .eq('id', linkId)
      .single();

    if (linkError || !linkRow) {
      return res.status(404).json({ error: 'Event supplier not found' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, planner_id')
      .eq('id', linkRow.event_id)
      .single();

    if (eventError || !event || event.planner_id !== user.id) {
      return res.status(403).json({ error: 'Not authorized to update this event supplier' });
    }

    const body = req.body ?? {};
    const patch: any = {};
    if (body.status !== undefined) patch.status = body.status;
    if (body.quoted_price !== undefined) patch.quoted_price = body.quoted_price;
    if (body.currency !== undefined) patch.currency = body.currency;
    if (body.notes !== undefined) patch.notes = body.notes;

    const { data: updated, error } = await supabase
      .from('event_suppliers')
      .update(patch)
      .eq('id', linkId)
      .select('*')
      .single();

    if (error || !updated) {
      console.error('[PATCH /api/event-suppliers/:id] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to update event supplier' });
    }

    return res.json({ eventSupplier: updated });
  } catch (error: any) {
    console.error('[PATCH /api/event-suppliers/:id] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Create file metadata for an event
app.post('/api/events/:id/files', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const eventId = req.params.id;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('planner_id', user.id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { file_name, file_url, category } = req.body ?? {};
    if (!file_name || !file_url) {
      return res.status(400).json({ error: 'file_name and file_url are required' });
    }

    const { data: fileRow, error } = await supabase
      .from('event_files')
      .insert({
        event_id: eventId,
        file_name,
        file_url,
        category: category || 'other',
      })
      .select('*')
      .single();

    if (error || !fileRow) {
      console.error('[POST /api/events/:id/files] Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to create file record' });
    }

    await logEventActivity(supabase, eventId, user.id, `File uploaded: ${fileRow.file_name}`);

    return res.status(201).json({ file: fileRow });
  } catch (error: any) {
    console.error('[POST /api/events/:id/files] Unexpected error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// ===== TASKS API =====

// Get tasks for current user's team
app.get('/api/tasks', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const { data: team, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: 'No team found' });
    }

    // Get query parameters for filtering
    const assigneeId = req.query.assignee_id as string | undefined;
    const showUnassigned = req.query.unassigned === 'true';
    const isCompleted = req.query.completed as string | undefined;

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('team_id', team.team_id)
      .order('created_at', { ascending: false });

    // Filter by assignee
    if (showUnassigned) {
      query = query.is('assignee_id', null);
    } else if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }

    // Filter by completion status
    if (isCompleted !== undefined) {
      query = query.eq('is_completed', isCompleted === 'true');
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('[GET /api/tasks] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Enrich with profile data (fallback to auth.users if profiles table missing)
    const enrichedTasks = await Promise.all(
      (tasks || []).map(async (task: any) => {
        let assignee = null;
        if (task.assignee_id) {
          try {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .eq('id', task.assignee_id)
              .maybeSingle();

            if (profileRow) {
              assignee = {
                id: profileRow.id,
                full_name: profileRow.full_name,
                email: profileRow.email,
                avatar_url: profileRow.avatar_url,
              };
            } else {
              // Fallback to auth.users
              const { data: userData } = await supabase.auth.admin.getUserById(task.assignee_id);
              assignee = {
                id: task.assignee_id,
                full_name: userData?.user?.user_metadata?.full_name || null,
                email: userData?.user?.email || null,
                avatar_url: null,
              };
            }
          } catch (err) {
            console.warn('[GET /api/tasks] Failed to fetch assignee user:', err);
          }
        }

        return {
          id: task.id,
          team_id: task.team_id,
          created_by: task.created_by,
          assignee_id: task.assignee_id,
          assignee: assignee,
          title: task.title,
          description: task.description || '',
          is_completed: task.is_completed,
          priority: task.priority,
          is_flagged: task.is_flagged,
          due_date: task.due_date,
          created_at: task.created_at,
          updated_at: task.updated_at,
        };
      })
    );

    res.json({ tasks: enrichedTasks });
  } catch (error: any) {
    console.error('[GET /api/tasks] Unexpected error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create a new task
app.post('/api/tasks', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, description, priority, is_flagged, due_date, assignee_id } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const { data: team, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: 'No team found' });
    }

    // Validate assignee is in the same team
    if (assignee_id) {
      const { data: assigneeMember } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.team_id)
        .eq('user_id', assignee_id)
        .single();

      if (!assigneeMember) {
        return res.status(400).json({ error: 'Assignee must be a team member' });
      }
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        team_id: team.team_id,
        created_by: user.id,
        assignee_id: assignee_id || null,
        title: title.trim(),
        description: description || '',
        priority: priority || 'low',
        is_flagged: is_flagged || false,
        due_date: due_date || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[POST /api/tasks] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Enrich with assignee profile
    let assignee = null;
    if (task.assignee_id) {
      try {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .eq('id', task.assignee_id)
          .maybeSingle();

        if (profileRow) {
          assignee = {
            id: profileRow.id,
            full_name: profileRow.full_name,
            email: profileRow.email,
            avatar_url: profileRow.avatar_url,
          };
        } else {
          const { data: userData } = await supabase.auth.admin.getUserById(task.assignee_id);
          assignee = {
            id: task.assignee_id,
            full_name: userData?.user?.user_metadata?.full_name || null,
            email: userData?.user?.email || null,
            avatar_url: null,
          };
        }
      } catch (err) {
        console.warn('[POST /api/tasks] Failed to fetch assignee user:', err);
      }

      // Send notification (email + in-app via trigger)
      if (task.assignee_id !== user.id) {
        await notifyTaskAssignment(supabase, task.assignee_id, task.title, task.id, false);
      }
    }

    res.status(201).json({
      task: {
        id: task.id,
        team_id: task.team_id,
        created_by: task.created_by,
        assignee_id: task.assignee_id,
        assignee: assignee,
        title: task.title,
        description: task.description || '',
        is_completed: task.is_completed,
        priority: task.priority,
        is_flagged: task.is_flagged,
        due_date: task.due_date,
        created_at: task.created_at,
        updated_at: task.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/tasks] Unexpected error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update a task
app.patch('/api/tasks/:id', express.json(), async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const taskId = req.params.id;
    const updates: any = {};

    // Allowed fields to update
    if (req.body.title !== undefined) updates.title = req.body.title.trim();
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.is_completed !== undefined) updates.is_completed = req.body.is_completed;
    if (req.body.priority !== undefined) updates.priority = req.body.priority;
    if (req.body.is_flagged !== undefined) updates.is_flagged = req.body.is_flagged;
    if (req.body.due_date !== undefined) updates.due_date = req.body.due_date || null;
    if (req.body.assignee_id !== undefined) updates.assignee_id = req.body.assignee_id || null;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Get the task to check team membership
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('team_id, assignee_id, title')
      .eq('id', taskId)
      .single();

    if (fetchError || !existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify user is in the same team
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('team_id', existingTask.team_id)
      .eq('user_id', user.id)
      .single();

    if (!teamMember) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    // Validate assignee if being updated
    if (updates.assignee_id !== undefined && updates.assignee_id) {
      const { data: assigneeMember } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', existingTask.team_id)
        .eq('user_id', updates.assignee_id)
        .single();

      if (!assigneeMember) {
        return res.status(400).json({ error: 'Assignee must be a team member' });
      }
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('*')
      .single();

    if (error) {
      console.error('[PATCH /api/tasks/:id] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Enrich with assignee profile
    let assignee = null;
    if (task.assignee_id) {
      try {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .eq('id', task.assignee_id)
          .maybeSingle();

        if (profileRow) {
          assignee = {
            id: profileRow.id,
            full_name: profileRow.full_name,
            email: profileRow.email,
            avatar_url: profileRow.avatar_url,
          };
        } else {
          const { data: userData } = await supabase.auth.admin.getUserById(task.assignee_id);
          assignee = {
            id: task.assignee_id,
            full_name: userData?.user?.user_metadata?.full_name || null,
            email: userData?.user?.email || null,
            avatar_url: null,
          };
        }
      } catch (err) {
        console.warn('[PATCH /api/tasks/:id] Failed to fetch assignee user:', err);
      }

      // Send notification if assignee changed (email + in-app via trigger)
      if (updates.assignee_id !== undefined && task.assignee_id && task.assignee_id !== user.id) {
        const wasReassignment = existingTask.assignee_id !== null && existingTask.assignee_id !== task.assignee_id;
        await notifyTaskAssignment(supabase, task.assignee_id, existingTask.title || task.title, task.id, wasReassignment);
      }
    }

    res.json({
      task: {
        id: task.id,
        team_id: task.team_id,
        created_by: task.created_by,
        assignee_id: task.assignee_id,
        assignee: assignee,
        title: task.title,
        description: task.description || '',
        is_completed: task.is_completed,
        priority: task.priority,
        is_flagged: task.is_flagged,
        due_date: task.due_date,
        created_at: task.created_at,
        updated_at: task.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[PATCH /api/tasks/:id] Unexpected error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const taskId = req.params.id;
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Get the task to check ownership
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('created_by')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only creator can delete
    if (task.created_by !== user.id) {
      return res.status(403).json({ error: 'Only the task creator can delete it' });
    }

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) {
      console.error('[DELETE /api/tasks/:id] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/tasks/:id] Unexpected error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ===== NOTIFICATIONS API =====

// Get user's notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const unreadOnly = req.query.unread === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('[GET /api/notifications] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ notifications: notifications || [] });
  } catch (error: any) {
    console.error('[GET /api/notifications] Unexpected error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationId = req.params.id;
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/notifications/:id/read] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification: data });
  } catch (error: any) {
    console.error('[PATCH /api/notifications/:id/read] Unexpected error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Mark all notifications as read
app.patch('/api/notifications/read-all', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[PATCH /api/notifications/read-all] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[PATCH /api/notifications/read-all] Unexpected error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get unread count
app.get('/api/notifications/unread-count', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[GET /api/notifications/unread-count] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ count: count || 0 });
  } catch (error: any) {
    console.error('[GET /api/notifications/unread-count] Unexpected error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Helper function to send email notification (placeholder - implement with your email service)
async function sendEmailNotification(
  email: string,
  subject: string,
  message: string,
): Promise<void> {
  // TODO: Implement email sending using a service like SendGrid, Resend, or Nodemailer
  // For now, just log it
  console.log(`[EMAIL] To: ${email}, Subject: ${subject}, Message: ${message}`);
  
  // Example implementation with a service:
  // if (process.env.EMAIL_SERVICE_API_KEY) {
  //   // Use your email service here
  // }
}

// Helper function to create notification and send email
async function notifyTaskAssignment(
  supabase: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  assigneeId: string,
  taskTitle: string,
  taskId: string,
  isReassignment: boolean = false,
): Promise<void> {
  try {
    // Get assignee email
    let assigneeEmail: string | null = null;
    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', assigneeId)
        .maybeSingle();

      if (profileRow?.email) {
        assigneeEmail = profileRow.email;
      } else {
        const { data: userData } = await supabase.auth.admin.getUserById(assigneeId);
        assigneeEmail = userData?.user?.email || null;
      }
    } catch (err) {
      console.warn('[notifyTaskAssignment] Failed to fetch assignee email:', err);
    }

    // Send email notification if email is available
    if (assigneeEmail) {
      const subject = isReassignment
        ? `Task reassigned: ${taskTitle}`
        : `New task assigned: ${taskTitle}`;
      const emailMessage = isReassignment
        ? `Task "${taskTitle}" has been reassigned to you. View it in your task list.`
        : `You have been assigned to a new task: "${taskTitle}". View it in your task list.`;

      await sendEmailNotification(assigneeEmail, subject, emailMessage);
    }

    // Note: Database trigger will create the in-app notification automatically
    // But we can also create it here if needed for consistency
  } catch (error) {
    console.error('[notifyTaskAssignment] Error:', error);
    // Don't throw - notifications are non-critical
  }
}

// Export app for Vercel serverless functions
export default app;

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Vite dev server should run on http://localhost:5173`);
    }
  });
}
