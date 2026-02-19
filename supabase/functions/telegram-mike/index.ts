import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
});

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

async function sendTelegram(chatId: number, text: string): Promise<any> {
  // Send WITHOUT parse_mode to avoid any Markdown issues
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return await res.json();
}

async function sendTyping(chatId: number) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch(() => {});
}

async function loadDashboardData() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [articles, clusters, gaps, demos, crmDeals, seoAudits, competitorTracking] = await Promise.all([
    supabase.from("blog_posts").select("id, title, status, slug, actual_word_count, primary_keyword, created_at, published_at, total_views, avg_position").order("created_at", { ascending: false }).limit(100),
    supabase.from("content_clusters").select("id, cluster_name, cluster_status, completed_articles, target_articles, estimated_monthly_traffic, pillar_keyword").order("completed_articles", { ascending: false }),
    supabase.from("competitor_content_gaps").select("id, target_keyword, competitor_name, opportunity_score, status, their_position, our_position").eq("status", "opportunity").order("opportunity_score", { ascending: false }).limit(10),
    supabase.from("demo_bookings").select("id, name, email, company, booking_date, booking_time, status, lead_stage, goal, team_size, estimated_value").is("deleted_at", null).gte("booking_date", today).lte("booking_date", tomorrowStr).order("booking_date", { ascending: true }),
    supabase.from("crm_deals").select("id, title, value_cents, currency, priority, next_action, is_won, is_lost, wedding_date, created_at").eq("is_lost", false).eq("is_won", false).order("created_at", { ascending: false }).limit(20),
    supabase.from("seo_audit_results").select("overall_score, content_score, technical_score, created_at").order("created_at", { ascending: false }).limit(1),
    supabase.from("competitor_tracking").select("competitor_name, keyword, their_position, our_position, opportunity_score").order("opportunity_score", { ascending: false }).limit(10),
  ]);

  const allArticles = articles.data || [];
  const published = allArticles.filter((a: any) => a.status === "published");
  const drafts = allArticles.filter((a: any) => a.status === "draft");
  const thisWeek = allArticles.filter((a: any) => new Date(a.created_at) > weekAgo);
  const allClusters = clusters.data || [];
  const activeClusters = allClusters.filter((c: any) => c.cluster_status !== "completed");
  const allDemos = demos.data || [];
  const todayDemos = allDemos.filter((d: any) => d.booking_date === today);
  const tomorrowDemos = allDemos.filter((d: any) => d.booking_date === tomorrowStr);
  const activeDeals = crmDeals.data || [];
  const totalPipelineValue = activeDeals.reduce((sum: number, d: any) => sum + (d.value_cents || 0), 0);

  return {
    articles: { total: allArticles.length, published: published.length, drafts: drafts.length, created_this_week: thisWeek.length, total_views: published.reduce((sum: number, a: any) => sum + (a.total_views || 0), 0), recent_drafts: drafts.slice(0, 5) },
    clusters: { total: allClusters.length, active: activeClusters.length, list: allClusters.slice(0, 5) },
    gaps: { total_opportunities: gaps.data?.length || 0, top_opportunities: (gaps.data || []).slice(0, 5) },
    demos: { today: todayDemos, tomorrow: tomorrowDemos, today_count: todayDemos.length, tomorrow_count: tomorrowDemos.length },
    crm: { active_deals: activeDeals.length, pipeline_value_eur: Math.round(totalPipelineValue / 100), deals: activeDeals.slice(0, 5) },
    seo_health: { latest_score: seoAudits.data?.[0]?.overall_score || null, content_score: seoAudits.data?.[0]?.content_score || null, technical_score: seoAudits.data?.[0]?.technical_score || null },
    competitors: (competitorTracking.data || []).slice(0, 5),
    today, tomorrow: tomorrowStr,
  };
}

async function executeAction(actionName: string, params: any) {
  const headers = { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" };
  const baseUrl = Deno.env.get("SUPABASE_URL");
  switch (actionName) {
    case "generate_article": { const res = await fetch(`${baseUrl}/functions/v1/seo-pipeline-controller`, { method: "POST", headers, body: JSON.stringify({ action: "generate_single", keyword: params.keyword, intent: params.intent || "informational", target_word_count: params.word_count || 1500 }) }); const result = await res.json(); return `Article created: "${result.title || params.keyword}" saved as draft`; }
    case "analyze_competitor": { const res = await fetch(`${baseUrl}/functions/v1/gap-analyzer`, { method: "POST", headers, body: JSON.stringify({ action: "analyze", competitor_name: params.competitor_name }) }); const result = await res.json(); return `Analysis complete! Found ${result.count || 0} content gaps for ${params.competitor_name}`; }
    case "publish_article": { const { data } = await supabase.from("blog_posts").update({ status: "published", published_at: new Date().toISOString() }).eq("id", params.article_id).select("title").single(); return `Published! "${data?.title}" is now live!`; }
    default: return `Unknown action: ${actionName}`;
  }
}

const sessions = new Map<number, any[]>();
function getHistory(chatId: number): any[] { if (!sessions.has(chatId)) sessions.set(chatId, []); return sessions.get(chatId)!; }
function addMessage(chatId: number, role: string, content: string) { const h = getHistory(chatId); h.push({ role, content }); if (h.length > 20) h.splice(0, 2); }

async function askMike(userMessage: string, data: any, history: any[]): Promise<string> {
  const systemPrompt = `You are Mike, Antonio's AI business operator for WedBoardPro. Not an assistant - a STRATEGIC PARTNER who thinks 3 steps ahead.

PERSONALITY:
- PROACTIVE: Volunteer insights, don't wait to be asked
- STRATEGIC: Every suggestion ties back to revenue or growth
- BRUTALLY HONEST: Cut the fluff, say what needs saying
- PROTECTIVE: Guard Antonio's time like a bulldog
- REVENUE-FOCUSED: Use this decision hierarchy:
  1. Will it make money THIS WEEK? Do it.
  2. Will it prevent losing money? Do it.
  3. Will it save significant time? Maybe.
  4. Everything else? Probably skip it.

WEDBOARDPRO: B2B SaaS for professional wedding planners. 29/69/149 EUR plans. Antonio is solo founder, bootstrapped, based in Portugal. Unique feature: Layout Maker (drag-drop floorplans). Also CRM, Budget, Team tools.

LIVE DASHBOARD DATA (real-time):
${JSON.stringify(data, null, 2)}

WHAT YOU DO:

1. MORNING BRIEFS (when user says "morning", "good morning", "gm", etc):
- Today's demos with prep context (company, deal size, what they need)
- Urgent tasks ranked by revenue impact
- Overnight metric changes worth noting
- Competitor movements if any
- Top 3 prioritized recommendations for the day

2. DEMO INTELLIGENCE:
- When demos are coming up, proactively offer prep
- Analyze what you know from the booking data (goal, team size, company)
- Suggest pitch strategy based on their needs
- Calculate potential deal value

3. REVENUE TRACKING:
- Know pipeline value, deal stages, close probabilities
- Flag deals likely to close this week
- Warn about stale deals that need action
- Celebrate wins when deals close

4. CONTENT STRATEGY (not just generation):
- When suggesting articles, explain WHY this topic NOW
- Tie content to competitive positioning
- Consider seasonal wedding industry trends
- Focus on keywords that drive demo bookings, not just traffic

5. TIME PROTECTOR:
- Prioritize tasks by revenue impact
- Push back on low-value activities
- Be opinionated about what Antonio should focus on

COMMUNICATION STYLE:
- Be like a sharp COO texting the CEO
- Lead with what MATTERS MOST
- Use emojis as section markers only
- Numbers are concrete, never vague
- Always end with a clear next action
- When asked "what should I do?" - give a RANKED priority list with reasoning
- Don't say "you could" - say "do this"

ACTIONS (include these tags to trigger real actions):
[ACTION:generate_article:{"keyword":"topic here","intent":"informational","word_count":1500}]
[ACTION:analyze_competitor:{"competitor_name":"CompetitorName"}]
[ACTION:publish_article:{"article_id":"UUID_HERE"}]

FORMATTING RULES (CRITICAL - this is Telegram):
- Plain text only. NO markdown formatting.
- NO asterisks, underscores, brackets, or backticks.
- Use ALL CAPS for emphasis instead of bold.
- Use simple dashes for lists.
- Short paragraphs (2-3 lines max).
- Use emoji at start of sections for visual scanning.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userMessage }],
    max_tokens: 800,
    temperature: 0.7,
  });
  return response.choices[0].message.content || "Sorry, could not process that.";
}

Deno.serve(async (req) => {
  // Debug endpoint
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", token: !!TELEGRAM_TOKEN, openai: !!Deno.env.get("OPENAI_API_KEY") }), { headers: { "Content-Type": "application/json" } });
  }
  if (req.method !== "POST") return new Response("OK", { status: 200 });

  const debug: string[] = [];
  try {
    const update = await req.json();
    debug.push("parsed_update");

    if (!update?.message?.text) {
      debug.push("no_text");
      return new Response(JSON.stringify({ debug }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const chatId = update.message.chat.id;
    const userText = update.message.text;
    const firstName = update.message.from?.first_name || "Antonio";
    debug.push(`msg:${firstName}:${userText}`);

    // /start - simple test
    if (userText === "/start") {
      debug.push("handling_start");
      const result = await sendTelegram(chatId, `Hey ${firstName}! I'm Mike - your WedBoardPro business operator.\n\nI have LIVE access to your entire dashboard and I don't just answer questions - I think strategically about your business.\n\nTry these:\n\n- "morning" - get your daily brief\n- "what should I do?" - prioritized action plan\n- "pipeline" - revenue analysis with recommendations\n- "write article about X" - I'll generate it\n- "analyze HoneyBook" - competitive intelligence\n- "publish [article]" - push content live\n\nI'm always thinking about revenue, growth, and protecting your time. What's up?`);
      debug.push(`telegram_result:${JSON.stringify(result)}`);
      return new Response(JSON.stringify({ debug }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Regular flow
    await sendTyping(chatId);
    debug.push("typing_sent");

    const dashboardData = await loadDashboardData();
    debug.push(`dashboard:articles=${dashboardData.articles.total}`);

    const history = getHistory(chatId);
    const response = await askMike(userText, dashboardData, history);
    debug.push(`openai:len=${response.length}`);

    addMessage(chatId, "user", userText);
    addMessage(chatId, "assistant", response);

    // Check for actions
    const actionMatch = response.match(/\[ACTION:(\w+):(\{[\s\S]*?\})\]/);
    if (actionMatch) {
      const textPart = response.replace(/\[ACTION:[\s\S]*?\]/, "").trim();
      if (textPart) { const r1 = await sendTelegram(chatId, textPart); debug.push(`sent_text:${JSON.stringify(r1)}`); }
      await sendTelegram(chatId, "On it... give me a moment");
      try {
        const result = await executeAction(actionMatch[1], JSON.parse(actionMatch[2]));
        const r2 = await sendTelegram(chatId, result);
        debug.push(`action_done:${JSON.stringify(r2)}`);
      } catch (e) { debug.push(`action_err:${e}`); }
    } else {
      const r = await sendTelegram(chatId, response);
      debug.push(`sent:${JSON.stringify(r)}`);
    }

    debug.push("done");
    return new Response(JSON.stringify({ debug }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    debug.push(`error:${error}`);
    return new Response(JSON.stringify({ debug, error: String(error) }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });
  }
});
