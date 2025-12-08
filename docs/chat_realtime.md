## Chat deployment checklist
- Run `supabase_team_schema.sql` to create `messages`, indexes, RLS, and the `broadcast_team_message` trigger.
- Ensure env vars are set on the server and client: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Restart the backend after applying SQL so the `messages` table is available to the API.
- Log in with two accounts in the same team; open the new Chat tab in both and verify realtime delivery and presence.
- Verify cross-team isolation by posting from a user in a different team—messages must not arrive.
- Confirm unauthorized users cannot load `/api/chat/messages` or subscribe (requires valid session token).

## Optional Edge Function (system messages / moderation)
Create `supabase/functions/system-message/index.ts`:

```ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

serve(async (req) => {
  const { team_id, content } = await req.json().catch(() => ({}));
  if (!team_id || typeof content !== "string") {
    return new Response(JSON.stringify({ error: "team_id and content required" }), { status: 400 });
  }

  // Example profanity stub — replace with a real filter or classifier
  const sanitized = content.replace(/badword/gi, "****").slice(0, 4000);

  const { data, error } = await supabase
    .from("messages")
    .insert({ team_id, user_id: "00000000-0000-0000-0000-000000000000", content: `[system] ${sanitized}` })
    .select("id, team_id, user_id, content, created_at")
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Background work (e.g., indexing)
  // @ts-ignore EdgeRuntime
  EdgeRuntime.waitUntil(Promise.resolve());

  return new Response(JSON.stringify({ message: data }), { headers: { "Content-Type": "application/json" } });
});
```

Deploy with `supabase functions deploy system-message` and secure it (e.g., JWT secret or signed payloads) before exposing.

