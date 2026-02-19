import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================
// MONTHLY SEO AUDIT
// Re-audits all pages, flags those needing refresh
// =============================================

interface MonthlyReport {
  run_id: string;
  total_pages: number;
  audited: number;
  improved: number;
  declined: number;
  flagged_for_refresh: number;
  score_distribution: {
    critical: number;
    warning: number;
    passing: number;
  };
  errors: string[];
  duration_seconds: number;
}

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
        automation_type: "monthly-audit",
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

    // Load config
    const { data: configRow } = await supabase
      .from("seo_automation_config")
      .select("config_value")
      .eq("config_key", "target_seo_score")
      .single();

    const targetScore = (configRow?.config_value as number) ?? 80;

    // Fetch all pages with their current scores
    const { data: pages, error: fetchErr } = await supabase
      .from("seo_pages")
      .select("id, url_path, seo_score, blog_post_id")
      .order("seo_score", { ascending: true });

    if (fetchErr) {
      const durationSeconds = Math.round((performance.now() - startTime) / 1000);
      await supabase
        .from("automation_runs")
        .update({
          status: "failed",
          error_message: fetchErr.message,
          completed_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", run.id);

      return jsonResponse({ error: fetchErr.message }, 500);
    }

    const allPages = pages ?? [];
    const errors: string[] = [];
    let audited = 0;
    let improved = 0;
    let declined = 0;
    let flaggedForRefresh = 0;

    // Re-audit every page
    for (const page of allPages) {
      const previousScore = page.seo_score ?? 0;

      try {
        const { data: auditData, error: auditErr } = await supabase.rpc(
          "run_seo_audit",
          { p_page_id: page.id },
        );

        if (auditErr) {
          errors.push(`Audit failed for ${page.url_path}: ${auditErr.message}`);
          continue;
        }

        audited++;
        const newScore = auditData?.overall_score ?? 0;

        if (newScore > previousScore) {
          improved++;
        } else if (newScore < previousScore) {
          declined++;
        }

        // Flag pages that need refresh: score dropped or still below target
        if (
          (newScore < previousScore && previousScore > 0) ||
          (newScore > 0 && newScore < targetScore)
        ) {
          flaggedForRefresh++;

          // Create optimization task if linked to a blog post
          if (page.blog_post_id) {
            const { data: existingTask } = await supabase
              .from("optimization_tasks")
              .select("id")
              .eq("post_id", page.blog_post_id)
              .eq("task_type", "content_refresh")
              .eq("status", "pending")
              .maybeSingle();

            if (!existingTask) {
              const actions: string[] = [];
              if (newScore < previousScore) {
                actions.push(
                  `Score declined from ${previousScore} to ${newScore} — review and update content`,
                );
              }
              if (newScore < targetScore) {
                actions.push(
                  `Score ${newScore} is below target of ${targetScore} — improve SEO elements`,
                );
              }

              await supabase
                .from("optimization_tasks")
                .insert({
                  post_id: page.blog_post_id,
                  task_type: "content_refresh",
                  priority: newScore < 50 ? "high" : "medium",
                  reason: `Monthly audit: ${page.url_path} scored ${newScore}/${targetScore}`,
                  recommended_actions: actions,
                  status: "pending",
                  due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                });
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Audit error for ${page.url_path}: ${msg}`);
      }

      // Rate limit between audits
      await new Promise((r) => setTimeout(r, 200));
    }

    // Calculate score distribution
    const { data: updatedPages } = await supabase
      .from("seo_pages")
      .select("seo_score");

    const scoreList = (updatedPages ?? []).map(
      (p: { seo_score: number }) => p.seo_score,
    );
    const distribution = {
      critical: scoreList.filter((s: number) => s > 0 && s < 50).length,
      warning: scoreList.filter((s: number) => s >= 50 && s < targetScore).length,
      passing: scoreList.filter((s: number) => s >= targetScore).length,
    };

    // Complete run
    const durationSeconds = Math.round((performance.now() - startTime) / 1000);

    await supabase
      .from("automation_runs")
      .update({
        status: errors.length > 0 && audited === 0 ? "failed" : "completed",
        items_processed: allPages.length,
        items_created: flaggedForRefresh,
        items_updated: audited,
        error_message: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq("id", run.id);

    const report: MonthlyReport = {
      run_id: run.id,
      total_pages: allPages.length,
      audited,
      improved,
      declined,
      flagged_for_refresh: flaggedForRefresh,
      score_distribution: distribution,
      errors,
      duration_seconds: durationSeconds,
    };

    return jsonResponse(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Monthly audit error:", message);
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
