import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// =============================================
// TYPES
// =============================================

interface DailyReport {
  run_id: string;
  performance_tracked: number;
  underperformers_flagged: number;
  competitors_checked: number;
  errors: string[];
  duration_seconds: number;
}

// =============================================
// 1. TRACK PERFORMANCE
// Stub for Search Console API — inserts simulated data
// =============================================

async function trackPerformance(
  supabase: SupabaseClient,
): Promise<{ tracked: number; errors: string[] }> {
  const errors: string[] = [];
  let tracked = 0;

  // Get all published SEO pages with target keywords
  const { data: pages, error } = await supabase
    .from("seo_pages")
    .select("id, url_path, target_keyword, seo_score")
    .not("target_keyword", "is", null);

  if (error) {
    errors.push(`Failed to fetch pages: ${error.message}`);
    return { tracked, errors };
  }

  if (!pages || pages.length === 0) {
    return { tracked, errors };
  }

  const today = new Date().toISOString().split("T")[0];

  for (const page of pages) {
    if (!page.target_keyword) continue;

    // Check if we already have a record for today
    const { data: existing } = await supabase
      .from("seo_performance")
      .select("id")
      .eq("seo_page_id", page.id)
      .eq("keyword", page.target_keyword)
      .eq("date", today)
      .maybeSingle();

    if (existing) continue;

    // Get yesterday's position for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: prevRecord } = await supabase
      .from("seo_performance")
      .select("position")
      .eq("seo_page_id", page.id)
      .eq("keyword", page.target_keyword)
      .eq("date", yesterdayStr)
      .maybeSingle();

    const previousPosition = prevRecord?.position ?? null;

    // TODO: Replace with real Search Console API call
    // For now, stub with placeholder (no position data = null)
    const { error: insertErr } = await supabase
      .from("seo_performance")
      .insert({
        seo_page_id: page.id,
        keyword: page.target_keyword,
        position: null,
        previous_position: previousPosition,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        date: today,
        search_engine: "google",
        device_type: "all",
        country: "US",
      });

    if (insertErr) {
      errors.push(`Performance insert failed for ${page.url_path}: ${insertErr.message}`);
    } else {
      tracked++;
    }
  }

  return { tracked, errors };
}

// =============================================
// 2. FLAG UNDERPERFORMERS
// Find pages with declining rankings and create optimization tasks
// =============================================

async function flagUnderperformers(
  supabase: SupabaseClient,
): Promise<{ flagged: number; errors: string[] }> {
  const errors: string[] = [];
  let flagged = 0;

  // Load config
  const { data: configRows } = await supabase
    .from("seo_automation_config")
    .select("config_key, config_value")
    .in("config_key", [
      "alert_position_drop_threshold",
      "alert_traffic_drop_pct",
      "target_seo_score",
    ]);

  const config = Object.fromEntries(
    (configRows ?? []).map((r: { config_key: string; config_value: unknown }) => [
      r.config_key,
      r.config_value,
    ]),
  );

  const dropThreshold = (config.alert_position_drop_threshold as number) ?? 5;
  const targetScore = (config.target_seo_score as number) ?? 80;

  // Find pages with SEO score below target
  const { data: lowPages, error: lowErr } = await supabase
    .from("seo_pages")
    .select("id, url_path, target_keyword, seo_score, content_score, technical_score, blog_post_id")
    .gt("seo_score", 0)
    .lt("seo_score", targetScore);

  if (lowErr) {
    errors.push(`Failed to fetch low-scoring pages: ${lowErr.message}`);
    return { flagged, errors };
  }

  for (const page of lowPages ?? []) {
    if (!page.blog_post_id) continue;

    // Check if we already have a pending task for this post
    const { data: existingTask } = await supabase
      .from("optimization_tasks")
      .select("id")
      .eq("post_id", page.blog_post_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingTask) continue;

    // Determine priority, task type, and recommendations
    const priority = page.seo_score < 50 ? "high" : "medium";
    // Valid task_type: content_refresh | improve_title_meta | add_internal_links |
    //   improve_conversion | recover_ranking | expand_content | add_multimedia
    let taskType = "content_refresh";
    const actions: string[] = [];

    if (page.content_score < 50) {
      taskType = "expand_content";
      actions.push("Improve content quality: add more relevant keywords, increase word count");
    }
    if (page.technical_score < 80) {
      taskType = "improve_title_meta";
      actions.push("Fix technical SEO: check meta tags, schema markup, heading structure");
    }
    if (page.seo_score < targetScore) {
      actions.push(`Target SEO score of ${targetScore}+ (currently ${page.seo_score})`);
    }

    const { error: taskErr } = await supabase
      .from("optimization_tasks")
      .insert({
        post_id: page.blog_post_id,
        task_type: taskType,
        priority,
        reason: `SEO score ${page.seo_score} is below target of ${targetScore} for ${page.url_path}`,
        recommended_actions: actions,
        current_position: null,
        target_position: 10,
        potential_traffic_gain: Math.max(0, (targetScore - page.seo_score) * 5),
        status: "pending",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });

    if (taskErr) {
      errors.push(`Task create failed for ${page.url_path}: ${taskErr.message}`);
    } else {
      flagged++;
    }
  }

  // Also check keyword_rankings for position drops
  const { data: rankings } = await supabase
    .from("keyword_rankings")
    .select("post_id, keyword, position, previous_position, position_change")
    .not("position_change", "is", null)
    .lt("position_change", -dropThreshold)
    .order("position_change", { ascending: true })
    .limit(10);

  for (const ranking of rankings ?? []) {
    if (!ranking.post_id) continue;

    const { data: existingTask } = await supabase
      .from("optimization_tasks")
      .select("id")
      .eq("post_id", ranking.post_id)
      .eq("task_type", "recover_ranking")
      .eq("status", "pending")
      .maybeSingle();

    if (existingTask) continue;

    const { error: taskErr } = await supabase
      .from("optimization_tasks")
      .insert({
        post_id: ranking.post_id,
        task_type: "recover_ranking",
        priority: "high",
        reason: `Keyword "${ranking.keyword}" dropped ${Math.abs(ranking.position_change)} positions (${ranking.previous_position} → ${ranking.position})`,
        recommended_actions: [
          "Review and update content for freshness",
          "Check for new competitor content ranking above",
          "Add internal links from high-authority pages",
          "Consider updating title and meta description",
        ],
        current_position: ranking.position,
        target_position: ranking.previous_position,
        status: "pending",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });

    if (!taskErr) {
      flagged++;
    }
  }

  return { flagged, errors };
}

// =============================================
// 3. UPDATE COMPETITOR INTELLIGENCE
// Stub — checks for stale competitor entries
// =============================================

async function updateCompetitorIntel(
  supabase: SupabaseClient,
): Promise<{ checked: number; errors: string[] }> {
  const errors: string[] = [];
  let checked = 0;

  // Load config
  const { data: configRow } = await supabase
    .from("seo_automation_config")
    .select("config_value")
    .eq("config_key", "competitor_check_frequency_days")
    .single();

  const checkFrequencyDays = (configRow?.config_value as number) ?? 3;

  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - checkFrequencyDays);

  // Find competitors not checked recently
  const { data: staleCompetitors, error } = await supabase
    .from("competitor_tracking")
    .select("id, competitor_name, competitor_domain, last_checked_at")
    .in("status", ["targeting", "monitoring", "opportunity"])
    .or(`last_checked_at.lt.${staleCutoff.toISOString()},last_checked_at.is.null`);

  if (error) {
    errors.push(`Failed to fetch stale competitors: ${error.message}`);
    return { checked, errors };
  }

  for (const comp of staleCompetitors ?? []) {
    checked++;

    // TODO: Replace with actual competitor blog/content scraping
    // For now, just update the last_checked_at timestamp
    const { error: updateErr } = await supabase
      .from("competitor_tracking")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", comp.id);

    if (updateErr) {
      errors.push(`Failed to update ${comp.competitor_name}: ${updateErr.message}`);
    }
  }

  return { checked, errors };
}

// =============================================
// EDGE FUNCTION HANDLER
// =============================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const startTime = performance.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Start automation run
    const { data: run, error: runErr } = await supabase
      .from("automation_runs")
      .insert({
        automation_type: "daily-seo-tasks",
        status: "running",
        items_processed: 0,
        items_created: 0,
        items_updated: 0,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runErr) {
      return jsonResponse({ error: `Failed to start run: ${runErr.message}` }, 500);
    }

    const allErrors: string[] = [];

    // 1. Track performance
    const perfResult = await trackPerformance(supabase);
    allErrors.push(...perfResult.errors);

    // 2. Flag underperformers
    const flagResult = await flagUnderperformers(supabase);
    allErrors.push(...flagResult.errors);

    // 3. Update competitor intel
    const compResult = await updateCompetitorIntel(supabase);
    allErrors.push(...compResult.errors);

    // Complete run
    const durationSeconds = Math.round((performance.now() - startTime) / 1000);
    const totalProcessed = perfResult.tracked + flagResult.flagged + compResult.checked;

    await supabase
      .from("automation_runs")
      .update({
        status: allErrors.length > 0 && totalProcessed === 0 ? "failed" : "completed",
        items_processed: totalProcessed,
        items_created: flagResult.flagged,
        items_updated: perfResult.tracked + compResult.checked,
        error_message: allErrors.length > 0 ? allErrors.slice(0, 5).join("; ") : null,
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq("id", run.id);

    const report: DailyReport = {
      run_id: run.id,
      performance_tracked: perfResult.tracked,
      underperformers_flagged: flagResult.flagged,
      competitors_checked: compResult.checked,
      errors: allErrors,
      duration_seconds: durationSeconds,
    };

    return jsonResponse(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Daily SEO tasks error:", message);
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
