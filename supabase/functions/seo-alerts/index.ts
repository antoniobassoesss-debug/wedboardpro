import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface MonitoringConfig {
  monitoring_alert_email: string;
  monitoring_stale_hours: number;
  monitoring_min_avg_score: number;
  monitoring_max_consecutive_failures: number;
}

type CheckStatus = "healthy" | "warning" | "critical";

interface HealthCheck {
  name: string;
  status: CheckStatus;
  message: string;
  value: number;
}

async function loadMonitoringConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<MonitoringConfig> {
  const { data, error } = await supabase
    .from("seo_automation_config")
    .select("config_key, config_value")
    .like("config_key", "monitoring_%");

  if (error) {
    throw new Error(`Failed to load config: ${error.message}`);
  }

  const map = Object.fromEntries(
    (data ?? []).map((r: { config_key: string; config_value: unknown }) => [
      r.config_key,
      r.config_value,
    ]),
  );

  return {
    monitoring_alert_email:
      (map.monitoring_alert_email as string) ?? "admin@wedboardpro.com",
    monitoring_stale_hours: (map.monitoring_stale_hours as number) ?? 48,
    monitoring_min_avg_score: (map.monitoring_min_avg_score as number) ?? 70,
    monitoring_max_consecutive_failures:
      (map.monitoring_max_consecutive_failures as number) ?? 5,
  };
}

async function runHealthChecks(
  supabase: ReturnType<typeof createClient>,
  config: MonitoringConfig,
): Promise<{ status: CheckStatus; checks: HealthCheck[] }> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const staleCutoff = new Date(
    now.getTime() - config.monitoring_stale_hours * 60 * 60 * 1000,
  );

  const checks: HealthCheck[] = [];

  // 1. Recent Activity
  const { count: recentCount } = await supabase
    .from("automation_runs")
    .select("id", { count: "exact", head: true })
    .gte("started_at", dayAgo.toISOString());

  const runsIn24h = recentCount ?? 0;
  const { count: staleCount } = await supabase
    .from("automation_runs")
    .select("id", { count: "exact", head: true })
    .gte("started_at", staleCutoff.toISOString());

  let activityStatus: CheckStatus = "healthy";
  let activityMsg = `${runsIn24h} run(s) in last 24h`;
  if (runsIn24h === 0 && (staleCount ?? 0) === 0) {
    activityStatus = "critical";
    activityMsg = `No runs in last ${config.monitoring_stale_hours}h`;
  } else if (runsIn24h === 0) {
    activityStatus = "warning";
    activityMsg = `No runs in last 24h (last run within ${config.monitoring_stale_hours}h)`;
  }
  checks.push({
    name: "recent_activity",
    status: activityStatus,
    message: activityMsg,
    value: runsIn24h,
  });

  // 2. Failure Rate
  const { data: recentRuns7d } = await supabase
    .from("automation_runs")
    .select("status")
    .gte("started_at", weekAgo.toISOString())
    .order("started_at", { ascending: false });

  let consecutiveFailures = 0;
  for (const run of recentRuns7d ?? []) {
    if ((run as { status: string }).status === "failed") {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  const totalFailures7d = (recentRuns7d ?? []).filter(
    (r: { status: string }) => r.status === "failed",
  ).length;

  let failureStatus: CheckStatus = "healthy";
  let failureMsg = `${totalFailures7d} failure(s) in 7 days`;
  if (consecutiveFailures >= config.monitoring_max_consecutive_failures) {
    failureStatus = "critical";
    failureMsg = `${consecutiveFailures} consecutive failures`;
  } else if (totalFailures7d > 2) {
    failureStatus = "warning";
    failureMsg = `${totalFailures7d} failures in 7 days`;
  }
  checks.push({
    name: "failure_rate",
    status: failureStatus,
    message: failureMsg,
    value: totalFailures7d,
  });

  // 3. Avg Score Trend
  const { data: scoreData } = await supabase
    .from("seo_pages")
    .select("seo_score")
    .gt("seo_score", 0);

  const scores = (scoreData ?? []).map(
    (p: { seo_score: number }) => p.seo_score,
  );
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0;

  let scoreStatus: CheckStatus = "healthy";
  let scoreMsg = `Avg score: ${avgScore}`;
  if (scores.length === 0) {
    scoreStatus = "warning";
    scoreMsg = "No scored pages yet";
  } else if (avgScore < config.monitoring_min_avg_score - 10) {
    scoreStatus = "critical";
    scoreMsg = `Avg score ${avgScore} (target: ${config.monitoring_min_avg_score})`;
  } else if (avgScore < config.monitoring_min_avg_score) {
    scoreStatus = "warning";
    scoreMsg = `Avg score ${avgScore} below target ${config.monitoring_min_avg_score}`;
  }
  checks.push({
    name: "avg_score_trend",
    status: scoreStatus,
    message: scoreMsg,
    value: avgScore,
  });

  // 4. Pages Published
  const { count: publishedCount } = await supabase
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .gte("created_at", weekAgo.toISOString());

  const published = publishedCount ?? 0;
  let pubStatus: CheckStatus = "healthy";
  let pubMsg = `${published} post(s) published this week`;
  if (published === 0) {
    pubStatus = "warning";
    pubMsg = "No posts published this week";
  }
  checks.push({
    name: "pages_published",
    status: pubStatus,
    message: pubMsg,
    value: published,
  });

  // 5. Error Log count
  const { count: errorCount } = await supabase
    .from("automation_runs")
    .select("id", { count: "exact", head: true })
    .not("error_message", "is", null)
    .gte("started_at", weekAgo.toISOString());

  checks.push({
    name: "error_log",
    status: (errorCount ?? 0) > 5 ? "warning" : "healthy",
    message: `${errorCount ?? 0} error(s) this week`,
    value: errorCount ?? 0,
  });

  // Overall status
  const statusOrder: Record<CheckStatus, number> = {
    healthy: 0,
    warning: 1,
    critical: 2,
  };
  const overallStatus = checks.reduce<CheckStatus>((worst, check) => {
    return statusOrder[check.status] > statusOrder[worst]
      ? check.status
      : worst;
  }, "healthy");

  return { status: overallStatus, checks };
}

async function sendAlertEmail(
  config: MonitoringConfig,
  checks: HealthCheck[],
  overallStatus: CheckStatus,
): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!resendKey) {
    console.log(
      "RESEND_API_KEY not configured — logging alert to console instead",
    );
    console.log(`[SEO ALERT] Status: ${overallStatus}`);
    for (const check of checks) {
      console.log(`  ${check.name}: ${check.status} — ${check.message}`);
    }
    return false;
  }

  const criticalChecks = checks.filter((c) => c.status === "critical");
  const warningChecks = checks.filter((c) => c.status === "warning");

  const checkRows = checks
    .map((c) => {
      const icon =
        c.status === "healthy"
          ? "&#9989;"
          : c.status === "warning"
            ? "&#9888;&#65039;"
            : "&#10060;";
      return `<tr><td style="padding:6px 12px">${icon} ${c.name.replace(/_/g, " ")}</td><td style="padding:6px 12px">${c.status}</td><td style="padding:6px 12px">${c.message}</td></tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:${overallStatus === "critical" ? "#dc2626" : "#d97706"}">
        SEO Pipeline Alert: ${overallStatus.toUpperCase()}
      </h2>
      <p>${criticalChecks.length} critical issue(s), ${warningChecks.length} warning(s)</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;margin:16px 0">
        <thead><tr style="background:#f9fafb">
          <th style="padding:8px 12px;text-align:left">Check</th>
          <th style="padding:8px 12px;text-align:left">Status</th>
          <th style="padding:8px 12px;text-align:left">Details</th>
        </tr></thead>
        <tbody>${checkRows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:12px">
        Sent by WedBoardPro SEO Monitoring &bull; ${new Date().toISOString()}
      </p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "SEO Alerts <alerts@wedboardpro.com>",
      to: [config.monitoring_alert_email],
      subject: `[${overallStatus.toUpperCase()}] SEO Pipeline Health Alert`,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Resend API error: ${response.status} — ${errorText}`);
    return false;
  }

  return true;
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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const startTime = performance.now();

    // Log alert check run
    const { data: runData } = await supabase
      .from("automation_runs")
      .insert({
        automation_type: "seo-alert-check",
        status: "running",
        items_processed: 0,
        items_created: 0,
        items_updated: 0,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const runId = runData?.id;

    const config = await loadMonitoringConfig(supabase);
    const { status, checks } = await runHealthChecks(supabase, config);

    let emailSent = false;
    if (status === "critical") {
      emailSent = await sendAlertEmail(config, checks, status);
    }

    const durationSeconds = Math.round(
      (performance.now() - startTime) / 1000,
    );

    // Complete the run
    if (runId) {
      await supabase
        .from("automation_runs")
        .update({
          status: "completed",
          items_processed: checks.length,
          items_created: emailSent ? 1 : 0,
          items_updated: 0,
          completed_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({
        status,
        checks,
        emailSent,
        runId,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("SEO alerts error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
