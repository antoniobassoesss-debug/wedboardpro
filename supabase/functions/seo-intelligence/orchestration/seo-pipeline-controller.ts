import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// =============================================
// TYPES
// =============================================

interface AutomationConfig {
  target_seo_score: number;
  audit_frequency_days: number;
  programmatic_min_quality_score: number;
  programmatic_auto_publish: boolean;
  competitor_check_frequency_days: number;
  audit_min_score_alert: number;
  max_competitors_per_keyword: number;
}

interface RunRecord {
  id: string;
  automation_type: string;
  status: string;
  items_processed: number;
  items_created: number;
  items_updated: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

interface TierResult {
  tier: string;
  action: string;
  processed: number;
  created: number;
  updated: number;
  errors: string[];
}

interface PipelineReport {
  run_id: string;
  automation_type: string;
  status: "completed" | "failed";
  tiers: TierResult[];
  summary: {
    total_processed: number;
    total_created: number;
    total_updated: number;
    total_errors: number;
    duration_seconds: number;
  };
}

interface StatusReport {
  pages: {
    total: number;
    passing: number;
    below_target: number;
    unaudited: number;
  };
  blog_posts: {
    total: number;
    draft: number;
    in_review: number;
    published: number;
  };
  competitors: {
    total: number;
    with_page: number;
    without_page: number;
  };
  topics: {
    total: number;
    by_status: Record<string, number>;
  };
  programmatic: {
    templates: number;
    pages_generated: number;
  };
  recent_runs: RunRecord[];
  config: AutomationConfig;
  stale_pages: number;
}

// =============================================
// CONFIG LOADER
// =============================================

async function loadConfig(supabase: SupabaseClient): Promise<AutomationConfig> {
  const { data, error } = await supabase
    .from("seo_automation_config")
    .select("config_key, config_value");

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
    target_seo_score: (map.target_seo_score as number) ?? 80,
    audit_frequency_days: (map.audit_frequency_days as number) ?? 7,
    programmatic_min_quality_score:
      (map.programmatic_min_quality_score as number) ?? 70,
    programmatic_auto_publish:
      (map.programmatic_auto_publish as boolean) ?? false,
    competitor_check_frequency_days:
      (map.competitor_check_frequency_days as number) ?? 3,
    audit_min_score_alert: (map.audit_min_score_alert as number) ?? 50,
    max_competitors_per_keyword:
      (map.max_competitors_per_keyword as number) ?? 5,
  };
}

// =============================================
// AUTOMATION RUN TRACKER
// =============================================

async function startRun(
  supabase: SupabaseClient,
  automationType: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("automation_runs")
    .insert({
      automation_type: automationType,
      status: "running",
      items_processed: 0,
      items_created: 0,
      items_updated: 0,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to start run: ${error.message}`);
  }
  return data.id;
}

async function completeRun(
  supabase: SupabaseClient,
  runId: string,
  result: {
    status: "completed" | "failed";
    items_processed: number;
    items_created: number;
    items_updated: number;
    error_message?: string;
  },
  startTime: number,
): Promise<void> {
  const durationSeconds = Math.round((performance.now() - startTime) / 1000);

  await supabase
    .from("automation_runs")
    .update({
      status: result.status,
      items_processed: result.items_processed,
      items_created: result.items_created,
      items_updated: result.items_updated,
      error_message: result.error_message ?? null,
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", runId);
}

// =============================================
// TIER 1: STRATEGY
// =============================================

async function runTier1Strategy(
  supabase: SupabaseClient,
  config: AutomationConfig,
): Promise<TierResult[]> {
  const results: TierResult[] = [];

  // 1A. Process topics pipeline — advance validated topics to brief_created
  const topicsResult = await processTopicsPipeline(supabase);
  results.push(topicsResult);

  // 1B. Check competitors without alternative pages
  const competitorResult = await processCompetitorGaps(supabase, config);
  results.push(competitorResult);

  return results;
}

async function processTopicsPipeline(
  supabase: SupabaseClient,
): Promise<TierResult> {
  const result: TierResult = {
    tier: "tier1-strategy",
    action: "process-topics",
    processed: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  // Find validated topics ready for content briefs
  const { data: topics, error } = await supabase
    .from("topics_pipeline")
    .select("id, keyword_primary, keyword_variations, search_volume, priority_score, topic_cluster_id, category")
    .eq("status", "validated")
    .order("priority_score", { ascending: false })
    .limit(10);

  if (error) {
    result.errors.push(`Failed to fetch topics: ${error.message}`);
    return result;
  }

  if (!topics || topics.length === 0) {
    return result;
  }

  for (const topic of topics) {
    result.processed++;

    // Advance to brief_created
    const { error: updateErr } = await supabase
      .from("topics_pipeline")
      .update({
        status: "brief_created",
        updated_at: new Date().toISOString(),
      })
      .eq("id", topic.id);

    if (updateErr) {
      result.errors.push(
        `Failed to advance topic "${topic.keyword_primary}": ${updateErr.message}`,
      );
      continue;
    }

    result.updated++;
  }

  return result;
}

async function processCompetitorGaps(
  supabase: SupabaseClient,
  _config: AutomationConfig,
): Promise<TierResult> {
  const result: TierResult = {
    tier: "tier1-strategy",
    action: "competitor-gaps",
    processed: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  // Find competitors without alternative pages
  const { data: competitors, error } = await supabase
    .from("competitor_tracking")
    .select("id, competitor_name, status, our_alternative_page_id")
    .in("status", ["targeting", "monitoring", "opportunity"])
    .is("our_alternative_page_id", null);

  if (error) {
    result.errors.push(`Failed to fetch competitors: ${error.message}`);
    return result;
  }

  result.processed = competitors?.length ?? 0;

  // Report gaps — actual generation happens in tier2
  if (competitors && competitors.length > 0) {
    result.errors.push(
      `${competitors.length} competitor(s) missing alternative pages: ${competitors.map((c: { competitor_name: string }) => c.competitor_name).join(", ")}`,
    );
  }

  return result;
}

// =============================================
// TIER 2: EXECUTION
// =============================================

async function runTier2Execution(
  supabase: SupabaseClient,
  config: AutomationConfig,
): Promise<TierResult[]> {
  const results: TierResult[] = [];

  // 2A. Generate content for topics in "brief_created" status
  const contentResult = await generateTopicContent(supabase);
  results.push(contentResult);

  // 2B. Check programmatic pages quality
  const programmaticResult = await reviewProgrammaticPages(supabase, config);
  results.push(programmaticResult);

  return results;
}

async function generateTopicContent(
  supabase: SupabaseClient,
): Promise<TierResult> {
  const result: TierResult = {
    tier: "tier2-execution",
    action: "generate-content",
    processed: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  // Find topics with briefs ready for content generation
  const { data: topics, error } = await supabase
    .from("topics_pipeline")
    .select("id, keyword_primary, keyword_variations, topic_cluster_id, category")
    .eq("status", "brief_created")
    .order("priority_score", { ascending: false })
    .limit(5);

  if (error) {
    result.errors.push(`Failed to fetch brief topics: ${error.message}`);
    return result;
  }

  if (!topics || topics.length === 0) {
    return result;
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    result.errors.push("OPENAI_API_KEY not configured — skipping content generation");
    return result;
  }

  for (const topic of topics) {
    result.processed++;

    // Determine search intent from category
    const intent = mapCategoryToIntent(topic.category);

    // Mark as in_production
    await supabase
      .from("topics_pipeline")
      .update({ status: "in_production", updated_at: new Date().toISOString() })
      .eq("id", topic.id);

    try {
      // Call the content-generation edge function internally
      const contentPayload = {
        keyword: topic.keyword_primary,
        search_intent: intent,
        topic_cluster_id: topic.topic_cluster_id,
        secondary_keywords: topic.keyword_variations ?? [],
        target_word_count: 1500,
        tone: "professional" as const,
      };

      const generated = await callContentGeneration(supabase, openaiKey, contentPayload);

      if ("error" in generated) {
        result.errors.push(`Content gen failed for "${topic.keyword_primary}": ${generated.error}`);
        continue;
      }

      // Link blog post back to topics_pipeline
      await supabase
        .from("topics_pipeline")
        .update({
          status: "in_review",
          published_post_id: generated.blog_post_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", topic.id);

      result.created++;
      result.updated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Content gen error for "${topic.keyword_primary}": ${msg}`);
    }

    // Rate limit between generations
    await new Promise((r) => setTimeout(r, 2000));
  }

  return result;
}

function mapCategoryToIntent(
  category: string | null,
): "informational" | "commercial" | "transactional" | "navigational" {
  switch (category?.toLowerCase()) {
    case "comparison":
    case "alternative":
    case "vs":
      return "commercial";
    case "pricing":
    case "buy":
    case "trial":
      return "transactional";
    case "brand":
    case "product":
      return "navigational";
    default:
      return "informational";
  }
}

async function callContentGeneration(
  supabase: SupabaseClient,
  openaiKey: string,
  payload: {
    keyword: string;
    search_intent: string;
    topic_cluster_id?: string | null;
    secondary_keywords?: string[];
    target_word_count?: number;
    tone?: string;
  },
): Promise<{ blog_post_id: string; seo_page_id: string } | { error: string }> {
  const wordTarget = payload.target_word_count ?? 1500;
  const tone = payload.tone ?? "professional";
  const secondaryKw = payload.secondary_keywords?.length
    ? `\nSecondary keywords to include naturally: ${payload.secondary_keywords.join(", ")}`
    : "";

  const systemPrompt = `You are an expert SEO content writer for WedBoardPro, a B2B SaaS platform for professional wedding planners. Write high-quality, SEO-optimized content that ranks well and converts readers.

Rules:
- Write for professional wedding planners, not couples
- Use Problem → Agitate → Solution → Proof → CTA framework
- Active voice, no exclamation points, specific over vague
- Include H2/H3 structure, internal links [text](/blog/slug), at least one external link
- Include at least one image placeholder: ![alt](placeholder-url)
- Minimum ${Math.floor(wordTarget * 0.8)} words`;

  const userPrompt = `Write a blog post for:

**Primary Keyword**: ${payload.keyword}
**Search Intent**: ${payload.search_intent}${secondaryKw}
**Target Word Count**: ${wordTarget}
**Tone**: ${tone}

Respond with ONLY valid JSON:
{
  "title": "SEO title (50-60 chars)",
  "meta_description": "Meta description (130-155 chars)",
  "h1": "Page H1 heading",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence excerpt under 200 chars",
  "content": "Full markdown content"
}`;

  const openaiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    },
  );

  if (!openaiResponse.ok) {
    return { error: `OpenAI API error: ${openaiResponse.status}` };
  }

  const openaiData = await openaiResponse.json();
  const rawContent = openaiData.choices?.[0]?.message?.content;

  if (!rawContent) {
    return { error: "Empty OpenAI response" };
  }

  let generated: {
    title: string;
    meta_description: string;
    h1: string;
    slug: string;
    excerpt?: string;
    content: string;
  };
  try {
    const cleaned = rawContent
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```$/m, "")
      .trim();
    generated = JSON.parse(cleaned);
  } catch {
    return { error: "Failed to parse OpenAI JSON response" };
  }

  if (!generated.title || !generated.content || !generated.slug) {
    return { error: "Missing required fields in generated content" };
  }

  // Enforce limits
  if (generated.title.length > 60) {
    generated.title = generated.title.substring(0, 57) + "...";
  }
  if (generated.meta_description?.length > 160) {
    generated.meta_description = generated.meta_description.substring(0, 157) + "...";
  }
  generated.slug = generated.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Insert blog post
  const { data: blogPost, error: blogErr } = await supabase
    .from("blog_posts")
    .insert({
      title: generated.title,
      slug: generated.slug,
      meta_description: generated.meta_description,
      content: generated.content,
      excerpt: generated.excerpt ?? null,
      primary_keyword: payload.keyword,
      keyword_variations: payload.secondary_keywords ?? [],
      target_word_count: wordTarget,
      topic_cluster_id: payload.topic_cluster_id ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (blogErr) {
    return { error: `Blog insert failed: ${blogErr.message}` };
  }

  // Insert SEO page
  const { data: seoPage, error: seoErr } = await supabase
    .from("seo_pages")
    .insert({
      blog_post_id: blogPost.id,
      topic_cluster_id: payload.topic_cluster_id ?? null,
      page_type: "blog",
      url_path: `/blog/${generated.slug}`,
      title_tag: generated.title,
      meta_description: generated.meta_description,
      h1_tag: generated.h1 ?? generated.title,
      target_keyword: payload.keyword,
      secondary_keywords: payload.secondary_keywords ?? [],
      schema_markup: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: generated.title,
        description: generated.meta_description,
        url: `https://wedboardpro.com/blog/${generated.slug}`,
        datePublished: new Date().toISOString(),
        author: { "@type": "Organization", name: "WedBoardPro" },
      },
      content_score: 0,
      technical_score: 0,
      seo_score: 0,
    })
    .select("id")
    .single();

  if (seoErr) {
    return { error: `SEO page insert failed: ${seoErr.message}` };
  }

  // Trigger audit
  try {
    await supabase.rpc("run_seo_audit", { p_page_id: seoPage.id });
  } catch {
    // Audit is optional
  }

  return { blog_post_id: blogPost.id, seo_page_id: seoPage.id };
}

async function reviewProgrammaticPages(
  supabase: SupabaseClient,
  config: AutomationConfig,
): Promise<TierResult> {
  const result: TierResult = {
    tier: "tier2-execution",
    action: "review-programmatic",
    processed: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  // Find programmatic pages in draft/review with quality scores
  const { data: pages, error } = await supabase
    .from("programmatic_pages")
    .select("id, template_id, variables_used, quality_score, seo_page_id, status")
    .in("status", ["draft", "review"])
    .not("quality_score", "is", null)
    .limit(20);

  if (error) {
    result.errors.push(`Failed to fetch programmatic pages: ${error.message}`);
    return result;
  }

  if (!pages || pages.length === 0) {
    return result;
  }

  for (const page of pages) {
    result.processed++;
    const score = page.quality_score ?? 0;

    if (score >= config.programmatic_min_quality_score && page.status === "draft") {
      // Promote to review
      const { error: updateErr } = await supabase
        .from("programmatic_pages")
        .update({ status: "review" })
        .eq("id", page.id);

      if (updateErr) {
        result.errors.push(`Failed to promote page ${page.id}: ${updateErr.message}`);
      } else {
        result.updated++;
      }
    } else if (
      config.programmatic_auto_publish &&
      score >= config.target_seo_score &&
      page.status === "review"
    ) {
      // Auto-publish if enabled and score is high enough
      const { error: pubErr } = await supabase
        .from("programmatic_pages")
        .update({ status: "published" })
        .eq("id", page.id);

      if (pubErr) {
        result.errors.push(`Failed to publish page ${page.id}: ${pubErr.message}`);
      } else {
        result.updated++;
      }
    }
  }

  return result;
}

// =============================================
// TIER 3: QUALITY
// =============================================

async function runTier3Quality(
  supabase: SupabaseClient,
  config: AutomationConfig,
): Promise<TierResult[]> {
  const results: TierResult[] = [];

  // 3A. Audit stale pages
  const auditResult = await auditStalePages(supabase, config);
  results.push(auditResult);

  // 3B. Flag low-scoring pages
  const flagResult = await flagLowScoringPages(supabase, config);
  results.push(flagResult);

  return results;
}

async function auditStalePages(
  supabase: SupabaseClient,
  config: AutomationConfig,
): Promise<TierResult> {
  const result: TierResult = {
    tier: "tier3-quality",
    action: "audit-stale",
    processed: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - config.audit_frequency_days);

  // Find pages not audited recently
  const { data: stalePages, error } = await supabase
    .from("seo_pages")
    .select("id, url_path, seo_score, updated_at")
    .or(`updated_at.lt.${staleCutoff.toISOString()},seo_score.eq.0`)
    .order("seo_score", { ascending: true })
    .limit(20);

  if (error) {
    result.errors.push(`Failed to fetch stale pages: ${error.message}`);
    return result;
  }

  if (!stalePages || stalePages.length === 0) {
    return result;
  }

  for (const page of stalePages) {
    result.processed++;

    try {
      const { data: auditData, error: auditErr } = await supabase.rpc(
        "run_seo_audit",
        { p_page_id: page.id },
      );

      if (auditErr) {
        result.errors.push(`Audit failed for ${page.url_path}: ${auditErr.message}`);
        continue;
      }

      if (auditData?.overall_score != null) {
        result.updated++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Audit error for ${page.url_path}: ${msg}`);
    }

    // Rate limit between audits
    await new Promise((r) => setTimeout(r, 200));
  }

  return result;
}

async function flagLowScoringPages(
  supabase: SupabaseClient,
  config: AutomationConfig,
): Promise<TierResult> {
  const result: TierResult = {
    tier: "tier3-quality",
    action: "flag-low-scores",
    processed: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  // Find pages below alert threshold
  const { data: lowPages, error } = await supabase
    .from("seo_pages")
    .select("id, url_path, seo_score, target_keyword, blog_post_id")
    .lt("seo_score", config.audit_min_score_alert)
    .gt("seo_score", 0)
    .order("seo_score", { ascending: true });

  if (error) {
    result.errors.push(`Failed to fetch low-scoring pages: ${error.message}`);
    return result;
  }

  result.processed = lowPages?.length ?? 0;

  // For pages with linked blog posts, ensure blog status reflects the issue
  for (const page of lowPages ?? []) {
    if (!page.blog_post_id) continue;

    const { data: post } = await supabase
      .from("blog_posts")
      .select("id, status")
      .eq("id", page.blog_post_id)
      .single();

    // If post is published but score is critically low, flag for review
    if (post && post.status === "published" && page.seo_score < config.audit_min_score_alert) {
      const { error: updateErr } = await supabase
        .from("blog_posts")
        .update({ status: "in_review", updated_at: new Date().toISOString() })
        .eq("id", post.id);

      if (!updateErr) {
        result.updated++;
      }
    }
  }

  return result;
}

// =============================================
// STATUS REPORT
// =============================================

async function generateStatusReport(
  supabase: SupabaseClient,
): Promise<StatusReport> {
  const config = await loadConfig(supabase);

  // Pages stats
  const { data: pageStats } = await supabase.rpc("get_pipeline_stats").maybeSingle();

  // Manual counts since we may not have the RPC
  const { data: pages } = await supabase
    .from("seo_pages")
    .select("id, seo_score, updated_at");

  const targetScore = config.target_seo_score;
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - config.audit_frequency_days);

  const pageList = pages ?? [];
  const pageReport = {
    total: pageList.length,
    passing: pageList.filter((p: { seo_score: number }) => p.seo_score >= targetScore).length,
    below_target: pageList.filter(
      (p: { seo_score: number }) => p.seo_score > 0 && p.seo_score < targetScore,
    ).length,
    unaudited: pageList.filter((p: { seo_score: number | null }) => !p.seo_score || p.seo_score === 0).length,
  };

  const staleCount = pageList.filter(
    (p: { updated_at: string }) => new Date(p.updated_at) < staleCutoff,
  ).length;

  // Blog post stats
  const { data: blogPosts } = await supabase
    .from("blog_posts")
    .select("id, status");
  const blogList = blogPosts ?? [];
  const blogReport = {
    total: blogList.length,
    draft: blogList.filter((b: { status: string }) => b.status === "draft").length,
    in_review: blogList.filter((b: { status: string }) => b.status === "in_review").length,
    published: blogList.filter((b: { status: string }) => b.status === "published").length,
  };

  // Competitor stats
  const { data: competitors } = await supabase
    .from("competitor_tracking")
    .select("id, our_alternative_page_id");
  const compList = competitors ?? [];
  const competitorReport = {
    total: compList.length,
    with_page: compList.filter(
      (c: { our_alternative_page_id: string | null }) => c.our_alternative_page_id,
    ).length,
    without_page: compList.filter(
      (c: { our_alternative_page_id: string | null }) => !c.our_alternative_page_id,
    ).length,
  };

  // Topics pipeline
  const { data: topics } = await supabase
    .from("topics_pipeline")
    .select("id, status");
  const topicList = topics ?? [];
  const byStatus: Record<string, number> = {};
  for (const t of topicList) {
    const s = (t as { status: string }).status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  // Programmatic stats
  const { count: templateCount } = await supabase
    .from("programmatic_templates")
    .select("id", { count: "exact", head: true });
  const { count: progPageCount } = await supabase
    .from("programmatic_pages")
    .select("id", { count: "exact", head: true });

  // Recent runs
  const { data: recentRuns } = await supabase
    .from("automation_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(10);

  return {
    pages: pageReport,
    blog_posts: blogReport,
    competitors: competitorReport,
    topics: { total: topicList.length, by_status: byStatus },
    programmatic: {
      templates: templateCount ?? 0,
      pages_generated: progPageCount ?? 0,
    },
    recent_runs: (recentRuns ?? []) as RunRecord[],
    config,
    stale_pages: staleCount,
  };
}

// =============================================
// FULL PIPELINE
// =============================================

async function runFullPipeline(
  supabase: SupabaseClient,
  config: AutomationConfig,
  runId: string,
  startTime: number,
): Promise<PipelineReport> {
  const allTiers: TierResult[] = [];
  let pipelineStatus: "completed" | "failed" = "completed";

  // TIER 1: Strategy
  try {
    const tier1 = await runTier1Strategy(supabase, config);
    allTiers.push(...tier1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    allTiers.push({
      tier: "tier1-strategy",
      action: "strategy-error",
      processed: 0,
      created: 0,
      updated: 0,
      errors: [msg],
    });
    pipelineStatus = "failed";
  }

  // TIER 2: Execution
  try {
    const tier2 = await runTier2Execution(supabase, config);
    allTiers.push(...tier2);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    allTiers.push({
      tier: "tier2-execution",
      action: "execution-error",
      processed: 0,
      created: 0,
      updated: 0,
      errors: [msg],
    });
    pipelineStatus = "failed";
  }

  // TIER 3: Quality
  try {
    const tier3 = await runTier3Quality(supabase, config);
    allTiers.push(...tier3);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    allTiers.push({
      tier: "tier3-quality",
      action: "quality-error",
      processed: 0,
      created: 0,
      updated: 0,
      errors: [msg],
    });
    pipelineStatus = "failed";
  }

  // Aggregate
  const totalProcessed = allTiers.reduce((s, t) => s + t.processed, 0);
  const totalCreated = allTiers.reduce((s, t) => s + t.created, 0);
  const totalUpdated = allTiers.reduce((s, t) => s + t.updated, 0);
  const totalErrors = allTiers.reduce((s, t) => s + t.errors.length, 0);
  const durationSeconds = Math.round((performance.now() - startTime) / 1000);

  // If any tier had errors but others succeeded, mark as completed with warnings
  if (totalErrors > 0 && totalProcessed > 0) {
    pipelineStatus = "completed";
  }

  // Update run record
  await completeRun(supabase, runId, {
    status: pipelineStatus,
    items_processed: totalProcessed,
    items_created: totalCreated,
    items_updated: totalUpdated,
    error_message:
      totalErrors > 0
        ? allTiers
            .flatMap((t) => t.errors)
            .slice(0, 5)
            .join("; ")
        : undefined,
  }, startTime);

  return {
    run_id: runId,
    automation_type: "full-pipeline",
    status: pipelineStatus,
    tiers: allTiers,
    summary: {
      total_processed: totalProcessed,
      total_created: totalCreated,
      total_updated: totalUpdated,
      total_errors: totalErrors,
      duration_seconds: durationSeconds,
    },
  };
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

  try {
    const body = await req.json();
    const { action } = body as { action: string };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const config = await loadConfig(supabase);

    switch (action) {
      // -----------------------------------------------
      // ACTION: run-pipeline (full 3-tier run)
      // -----------------------------------------------
      case "run-pipeline": {
        const startTime = performance.now();
        const runId = await startRun(supabase, "full-pipeline");

        const report = await runFullPipeline(supabase, config, runId, startTime);
        return jsonResponse({ action: "run-pipeline", report }, 200);
      }

      // -----------------------------------------------
      // ACTION: run-tier (single tier)
      // -----------------------------------------------
      case "run-tier": {
        const { tier } = body as { tier: string };
        if (!tier || !["tier1", "tier2", "tier3"].includes(tier)) {
          return jsonResponse(
            { error: "tier must be one of: tier1, tier2, tier3" },
            400,
          );
        }

        const startTime = performance.now();
        const runId = await startRun(supabase, `${tier}-only`);

        let results: TierResult[] = [];
        try {
          if (tier === "tier1") results = await runTier1Strategy(supabase, config);
          if (tier === "tier2") results = await runTier2Execution(supabase, config);
          if (tier === "tier3") results = await runTier3Quality(supabase, config);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          results = [{
            tier,
            action: "error",
            processed: 0,
            created: 0,
            updated: 0,
            errors: [msg],
          }];
        }

        const totalProcessed = results.reduce((s, t) => s + t.processed, 0);
        const totalCreated = results.reduce((s, t) => s + t.created, 0);
        const totalUpdated = results.reduce((s, t) => s + t.updated, 0);
        const totalErrors = results.reduce((s, t) => s + t.errors.length, 0);

        await completeRun(supabase, runId, {
          status: totalErrors > 0 && totalProcessed === 0 ? "failed" : "completed",
          items_processed: totalProcessed,
          items_created: totalCreated,
          items_updated: totalUpdated,
          error_message: totalErrors > 0
            ? results.flatMap((t) => t.errors).slice(0, 5).join("; ")
            : undefined,
        }, startTime);

        return jsonResponse({ action: "run-tier", tier, results });
      }

      // -----------------------------------------------
      // ACTION: audit-stale (re-audit old pages)
      // -----------------------------------------------
      case "audit-stale": {
        const startTime = performance.now();
        const runId = await startRun(supabase, "audit-stale");

        const result = await auditStalePages(supabase, config);

        await completeRun(supabase, runId, {
          status: result.errors.length > 0 && result.processed === 0 ? "failed" : "completed",
          items_processed: result.processed,
          items_created: 0,
          items_updated: result.updated,
          error_message: result.errors.length > 0
            ? result.errors.slice(0, 5).join("; ")
            : undefined,
        }, startTime);

        return jsonResponse({ action: "audit-stale", result });
      }

      // -----------------------------------------------
      // ACTION: process-topics (advance pipeline)
      // -----------------------------------------------
      case "process-topics": {
        const startTime = performance.now();
        const runId = await startRun(supabase, "process-topics");

        const result = await processTopicsPipeline(supabase);

        await completeRun(supabase, runId, {
          status: result.errors.length > 0 && result.processed === 0 ? "failed" : "completed",
          items_processed: result.processed,
          items_created: 0,
          items_updated: result.updated,
          error_message: result.errors.length > 0
            ? result.errors.slice(0, 5).join("; ")
            : undefined,
        }, startTime);

        return jsonResponse({ action: "process-topics", result });
      }

      // -----------------------------------------------
      // ACTION: status (full dashboard report)
      // -----------------------------------------------
      case "status": {
        const report = await generateStatusReport(supabase);
        return jsonResponse({ action: "status", report });
      }

      default:
        return jsonResponse(
          {
            error: `Unknown action: "${action}"`,
            available_actions: [
              "run-pipeline",
              "run-tier",
              "audit-stale",
              "process-topics",
              "status",
            ],
          },
          400,
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Pipeline controller error:", message);
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
