import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[my-team] Missing or invalid Authorization header');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    // Use anon key with JWT from client - this allows getUser() to validate
    // the user's session and return their user context. Service role bypasses
    // auth entirely and has no user session, causing 401.
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[my-team] Auth error:', authError);
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('[my-team] Fetching teams for user:', user.id);

    const { data: teamIds, error: rpcError } = await supabase
      .rpc('get_user_team_ids');

    if (rpcError) {
      console.error('[my-team] RPC error:', rpcError);
      return res.status(500).json({ message: 'Failed to fetch team IDs' });
    }

    if (!teamIds || teamIds.length === 0) {
      console.log('[my-team] No teams found for user:', user.id);
      return res.status(404).json({ message: 'No teams found' });
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (teamError || !team) {
      console.error('[my-team] Team fetch error:', teamError);
      return res.status(404).json({ message: 'No team found' });
    }

    console.log('[my-team] Returning team:', team.id);
    res.status(200).json(team);
  } catch (err: any) {
    console.error('[my-team] Unexpected error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}
