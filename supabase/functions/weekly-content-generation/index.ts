import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================
// WEEKLY CONTENT GENERATION
// Calls the seo-pipeline-controller to run the full pipeline
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Start automation run
    const { data: run, error: runErr } = await supabase
      .from("automation_runs")
      .insert({
        automation_type: "weekly-content-generation",
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

    // Call the seo-pipeline-controller edge function
    const pipelineResponse = await fetch(
      `${supabaseUrl}/functions/v1/seo-pipeline-controller`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ action: "run-pipeline" }),
      },
    );

    const durationSeconds = Math.round((performance.now() - startTime) / 1000);

    if (!pipelineResponse.ok) {
      const errorText = await pipelineResponse.text();
      console.error("Pipeline controller error:", errorText);

      await supabase
        .from("automation_runs")
        .update({
          status: "failed",
          error_message: `Pipeline returned ${pipelineResponse.status}: ${errorText.slice(0, 200)}`,
          completed_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", run.id);

      return jsonResponse({
        run_id: run.id,
        status: "failed",
        error: `Pipeline controller returned ${pipelineResponse.status}`,
      }, 502);
    }

    const pipelineResult = await pipelineResponse.json();
    const report = pipelineResult?.report;

    // Extract summary from pipeline result
    const summary = report?.summary ?? {};

    await supabase
      .from("automation_runs")
      .update({
        status: "completed",
        items_processed: summary.total_processed ?? 0,
        items_created: summary.total_created ?? 0,
        items_updated: summary.total_updated ?? 0,
        error_message: summary.total_errors > 0
          ? `${summary.total_errors} error(s) during pipeline execution`
          : null,
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq("id", run.id);

    return jsonResponse({
      run_id: run.id,
      status: "completed",
      pipeline_result: pipelineResult,
      duration_seconds: durationSeconds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Weekly content generation error:", message);
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
