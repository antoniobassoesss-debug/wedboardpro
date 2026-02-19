import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface ClusterGenerationResult {
  cluster_name: string;
  pillar_page_id?: string;
  article_generated?: {
    id: string;
    title: string;
    slug: string;
    word_count: number;
    role: "pillar" | "supporting";
    keyword: string;
  };
  completed_articles: number;
  target_articles: number;
  remaining: number;
  status: string;
  error?: string;
}

async function generateNextArticle(clusterId: string): Promise<ClusterGenerationResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Get cluster data
  const { data: cluster, error: clusterError } = await supabase
    .from("content_clusters")
    .select("*")
    .eq("id", clusterId)
    .single();

  if (clusterError || !cluster) {
    throw new Error(`Cluster not found: ${clusterId}`);
  }

  const clusterName = cluster.cluster_name as string;
  const targetArticles = cluster.target_articles as number;
  let pillarPageId = cluster.pillar_page_id as string | null;

  // Update status to in_progress
  await supabase
    .from("content_clusters")
    .update({ cluster_status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", clusterId);

  // 2. If no pillar page, generate it
  if (!pillarPageId) {
    const pillarResponse = await fetch(`${supabaseUrl}/functions/v1/seo-pipeline-controller`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "generate_single",
        keyword: cluster.pillar_keyword,
        target_word_count: 3000,
        cluster_id: clusterId,
        is_pillar: true,
      }),
    });

    if (!pillarResponse.ok) {
      const errorText = await pillarResponse.text();
      throw new Error(`Pillar generation failed: ${errorText}`);
    }

    const pillarResult = await pillarResponse.json();
    if (pillarResult.error) {
      throw new Error(`Pillar generation error: ${pillarResult.error}`);
    }

    pillarPageId = pillarResult.article_id;

    // Update cluster with pillar page
    await supabase
      .from("content_clusters")
      .update({ pillar_page_id: pillarPageId })
      .eq("id", clusterId);

    // Add to cluster_articles
    await supabase
      .from("cluster_articles")
      .insert({
        cluster_id: clusterId,
        article_id: pillarPageId,
        article_role: "pillar",
      });

    // Re-fetch completed count
    const { data: updated } = await supabase
      .from("content_clusters")
      .select("completed_articles")
      .eq("id", clusterId)
      .single();
    const completedNow = (updated?.completed_articles as number) ?? 1;

    return {
      cluster_name: clusterName,
      pillar_page_id: pillarPageId!,
      article_generated: {
        id: pillarResult.article_id,
        title: pillarResult.title,
        slug: pillarResult.slug,
        word_count: pillarResult.word_count,
        role: "pillar",
        keyword: cluster.pillar_keyword as string,
      },
      completed_articles: completedNow,
      target_articles: targetArticles,
      remaining: targetArticles - completedNow,
      status: "in_progress",
    };
  }

  // 3. Pillar exists — generate next supporting article
  const supportingKeywords = (cluster.supporting_keywords ?? []) as string[];

  // Find which keywords already have articles
  const { data: existingClusterArticles } = await supabase
    .from("cluster_articles")
    .select("blog_posts(primary_keyword)")
    .eq("cluster_id", clusterId);

  const existingKeywords = new Set(
    (existingClusterArticles ?? [])
      .map((a: { blog_posts: { primary_keyword: string } | null }) =>
        (a.blog_posts as { primary_keyword: string } | null)?.primary_keyword?.toLowerCase()
      )
      .filter(Boolean),
  );

  const nextKeyword = supportingKeywords
    .find(kw => !existingKeywords.has(kw.toLowerCase()));

  if (!nextKeyword) {
    // All keywords exhausted — mark completed
    await supabase
      .from("content_clusters")
      .update({ cluster_status: "completed", updated_at: new Date().toISOString() })
      .eq("id", clusterId);

    const { data: final } = await supabase
      .from("content_clusters")
      .select("completed_articles")
      .eq("id", clusterId)
      .single();
    const completedFinal = (final?.completed_articles as number) ?? 0;

    return {
      cluster_name: clusterName,
      pillar_page_id: pillarPageId,
      completed_articles: completedFinal,
      target_articles: targetArticles,
      remaining: 0,
      status: "completed",
    };
  }

  // Check if we've hit the target
  const currentCompleted = (cluster.completed_articles as number) ?? 0;
  if (currentCompleted >= targetArticles) {
    await supabase
      .from("content_clusters")
      .update({ cluster_status: "completed", updated_at: new Date().toISOString() })
      .eq("id", clusterId);

    return {
      cluster_name: clusterName,
      pillar_page_id: pillarPageId,
      completed_articles: currentCompleted,
      target_articles: targetArticles,
      remaining: 0,
      status: "completed",
    };
  }

  // Get pillar slug for internal linking
  const { data: pillarPost } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("id", pillarPageId)
    .single();

  const articleResponse = await fetch(`${supabaseUrl}/functions/v1/seo-pipeline-controller`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "generate_single",
      keyword: nextKeyword,
      target_word_count: 1500,
      cluster_id: clusterId,
      is_pillar: false,
      pillar_page_id: pillarPageId,
    }),
  });

  if (!articleResponse.ok) {
    const errorText = await articleResponse.text();
    throw new Error(`Article "${nextKeyword}" failed: ${errorText}`);
  }

  const articleResult = await articleResponse.json();
  if (articleResult.error) {
    throw new Error(`Article "${nextKeyword}" error: ${articleResult.error}`);
  }

  // Add to cluster_articles
  await supabase
    .from("cluster_articles")
    .insert({
      cluster_id: clusterId,
      article_id: articleResult.article_id,
      article_role: "supporting",
      internal_links_to: [pillarPageId],
    });

  // Get updated count
  const { data: updatedCluster } = await supabase
    .from("content_clusters")
    .select("completed_articles")
    .eq("id", clusterId)
    .single();
  const completedNow = (updatedCluster?.completed_articles as number) ?? 0;
  const remaining = targetArticles - completedNow;

  // Update status
  const finalStatus = remaining <= 0 ? "completed" : "in_progress";
  await supabase
    .from("content_clusters")
    .update({ cluster_status: finalStatus, updated_at: new Date().toISOString() })
    .eq("id", clusterId);

  return {
    cluster_name: clusterName,
    pillar_page_id: pillarPageId,
    article_generated: {
      id: articleResult.article_id,
      title: articleResult.title,
      slug: articleResult.slug,
      word_count: articleResult.word_count,
      role: "supporting",
      keyword: nextKeyword,
    },
    completed_articles: completedNow,
    target_articles: targetArticles,
    remaining: Math.max(0, remaining),
    status: finalStatus,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  }

  try {
    const { cluster_id } = await req.json();

    if (!cluster_id) {
      return new Response(
        JSON.stringify({ error: "cluster_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
      );
    }

    const result = await generateNextArticle(cluster_id);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  }
});
