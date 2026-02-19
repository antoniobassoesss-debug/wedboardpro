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
        target_word_count: 2000,
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

// =============================================
// ENHANCED CONTENT GENERATION WITH INTELLIGENCE
// =============================================

interface ProductFeature {
  feature_name: string;
  feature_slug: string;
  category: string;
  description: string;
  key_benefits: string[];
  competitive_advantage: string | null;
  related_keywords: string[];
}

interface CompetitorComp {
  competitor_name: string;
  competitor_domain: string;
  target_market: string;
  weaknesses: string[];
  our_advantages: string[];
  comparison_keywords: string[];
}

interface CTATempl {
  id: string;
  cta_type: string;
  content_type: string;
  heading: string;
  body_text: string;
  button_text: string;
  button_url: string;
  secondary_text: string | null;
  placement_hint: string | null;
}

function detectContentType(keyword: string, intent: string): string {
  const kw = keyword.toLowerCase();
  if (kw.includes(" vs ") || kw.includes("alternative") || kw.includes("compare")) return "comparison";
  if (kw.includes("how to") || kw.includes("how do")) return "how-to";
  if (kw.includes("checklist") || kw.includes("template")) return "checklist";
  if (intent === "commercial" || intent === "transactional") return "product";
  return "guide";
}

function cleanContent(text: string): string {
  return text
    .replace(/^```markdown\n?/i, "")
    .replace(/^```\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

async function callContentGeneration(
  supabase: SupabaseClient,
  openaiKey: string,
  payload: {
    keyword: string;
    search_intent: string;
    topic_cluster_id?: string | null;
    content_cluster_id?: string | null;
    is_pillar?: boolean;
    pillar_slug?: string | null;
    secondary_keywords?: string[];
    target_word_count?: number;
    tone?: string;
  },
): Promise<{ blog_post_id: string; seo_page_id: string } | { error: string }> {
  const wordTarget = payload.target_word_count ?? 2000;
  const contentType = detectContentType(payload.keyword, payload.search_intent);

  // ── Gather Intelligence Context ──
  const [featuresRes, competitorsRes, ctasRes, postsRes] = await Promise.all([
    supabase.from("product_features").select("feature_name, feature_slug, category, description, key_benefits, competitive_advantage, related_keywords").eq("is_active", true).order("display_order"),
    supabase.from("competitor_comparisons").select("competitor_name, competitor_domain, target_market, weaknesses, our_advantages, comparison_keywords").eq("is_active", true),
    supabase.from("cta_templates").select("id, cta_type, content_type, heading, body_text, button_text, button_url, secondary_text, placement_hint").eq("is_active", true),
    supabase.from("blog_posts").select("title, slug, primary_keyword").eq("status", "published").order("published_at", { ascending: false }).limit(20),
  ]);

  const features = (featuresRes.data ?? []) as ProductFeature[];
  const competitors = (competitorsRes.data ?? []) as CompetitorComp[];
  const allCtas = (ctasRes.data ?? []) as CTATempl[];
  const existingPosts = (postsRes.data ?? []) as Array<{ title: string; slug: string; primary_keyword: string | null }>;

  // Filter CTAs for this content type
  const ctas = allCtas.filter(c => c.content_type === contentType || c.content_type === "general").slice(0, 3);

  // Get cluster context
  let clusterContext = "";
  if (payload.topic_cluster_id) {
    const { data: cluster } = await supabase
      .from("topic_clusters")
      .select("name, pillar_keyword, description, internal_linking_strategy")
      .eq("id", payload.topic_cluster_id)
      .single();

    if (cluster) {
      const { data: clusterPosts } = await supabase
        .from("blog_posts")
        .select("title, slug")
        .eq("topic_cluster_id", payload.topic_cluster_id)
        .eq("status", "published")
        .limit(10);

      clusterContext = `\n## TOPIC CLUSTER
This article belongs to "${(cluster as { name: string }).name}" (pillar: "${(cluster as { pillar_keyword: string }).pillar_keyword}").
${(cluster as { description: string | null }).description ? `Description: ${(cluster as { description: string | null }).description}` : ""}
${(cluster as { internal_linking_strategy: string | null }).internal_linking_strategy ? `Linking strategy: ${(cluster as { internal_linking_strategy: string | null }).internal_linking_strategy}` : ""}
${(clusterPosts ?? []).length > 0 ? `\nArticles in cluster to link to:\n${(clusterPosts ?? []).map((p: { title: string; slug: string }) => `- [${p.title}](/blog/${p.slug})`).join("\n")}` : ""}`;
    }
  }

  // Get content cluster context (separate from topic_clusters)
  if (payload.content_cluster_id) {
    const { data: ccCluster } = await supabase
      .from("content_clusters")
      .select("cluster_name, pillar_keyword, description, supporting_keywords")
      .eq("id", payload.content_cluster_id)
      .single();

    if (ccCluster) {
      const { data: ccArticles } = await supabase
        .from("cluster_articles")
        .select("article_role, blog_posts(title, slug)")
        .eq("cluster_id", payload.content_cluster_id);

      const existingArticles = (ccArticles ?? [])
        .filter((a: { blog_posts: unknown }) => a.blog_posts)
        .map((a: { article_role: string; blog_posts: { title: string; slug: string } }) =>
          `- [${(a.blog_posts as { title: string }).title}](/blog/${(a.blog_posts as { slug: string }).slug}) (${a.article_role})`
        ).join("\n");

      const role = payload.is_pillar ? "PILLAR" : "SUPPORTING";
      clusterContext += `\n## CONTENT CLUSTER: ${(ccCluster as { cluster_name: string }).cluster_name}
This is a ${role} article in this cluster.
${payload.is_pillar ? `As the PILLAR page, be extremely comprehensive (${wordTarget}+ words). Cover the topic end-to-end. This page will be the hub that all supporting articles link to.` : `As a SUPPORTING article, go deep on this specific sub-topic. Include a link to the pillar page: [${(ccCluster as { pillar_keyword: string }).pillar_keyword}](/blog/${payload.pillar_slug ?? (ccCluster as { pillar_keyword: string }).pillar_keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-")})`}
Cluster description: ${(ccCluster as { description: string | null }).description ?? ""}
${existingArticles ? `\nOther articles in this cluster to link to:\n${existingArticles}` : ""}`;
    }
  }

  // Build product knowledge
  const featuresBlock = features.map(f =>
    `- **${f.feature_name}**: ${f.description}${f.competitive_advantage ? ` (Advantage: ${f.competitive_advantage})` : ""}`
  ).join("\n");

  // Build competitor knowledge
  const competitorBlock = competitors.map(c =>
    `- **${c.competitor_name}**: Weaknesses: ${c.weaknesses.slice(0, 3).join(", ")}. Our advantages: ${c.our_advantages.slice(0, 3).join(", ")}`
  ).join("\n");

  // Build internal linking assets
  const linkableContent = existingPosts.slice(0, 15).map(p =>
    `- [${p.title}](/blog/${p.slug})`
  ).join("\n");

  // Build CTA instructions
  const ctaBlock = ctas.length > 0
    ? ctas.map((c, i) => `CTA ${i + 1} (${c.cta_type}, ${c.placement_hint ?? "naturally"}):\n> **${c.heading}**\n> ${c.body_text}\n> [${c.button_text}](${c.button_url})${c.secondary_text ? ` | ${c.secondary_text}` : ""}`).join("\n\n")
    : "Include 2-3 natural calls-to-action for WedBoardPro.";

  const secondaryKw = payload.secondary_keywords?.length
    ? `\nSecondary keywords: ${payload.secondary_keywords.join(", ")}`
    : "";

  const systemPrompt = `You are an elite SEO content writer for WedBoardPro, a B2B SaaS built exclusively for professional wedding planners. You create content that ranks on page 1 AND converts readers into customers.

## CRITICAL: WORD COUNT REQUIREMENT
You MUST write AT LEAST ${wordTarget} words of content. This is non-negotiable. Articles under ${Math.floor(wordTarget * 0.85)} words will be rejected. Aim for ${wordTarget}-${wordTarget + 500} words. Write comprehensive, in-depth content with:
- 6-10 H2 sections minimum
- Each section should have 150-300 words with detailed explanations, examples, and actionable advice
- Include real-world scenarios wedding planners face
- Add statistics, data points, and specific numbers where relevant
- Use sub-sections (H3) within larger sections for depth

## PRODUCT KNOWLEDGE (mention naturally, never force)
${featuresBlock || "WedBoardPro: All-in-one wedding planner operating system."}

## COMPETITIVE LANDSCAPE
${competitorBlock || "Competitors: HoneyBook, Aisle Planner, Dubsado, spreadsheets."}

## EXISTING CONTENT TO LINK TO (use 3-5 internal links)
${linkableContent || "No published content yet."}
${clusterContext}

## CTA TEMPLATES — Insert these as markdown blockquotes
${ctaBlock}

## WRITING FRAMEWORK: Problem → Agitate → Solution → Proof → CTA
1. Problem: Specific pain point for wedding planners
2. Agitate: Lost clients, wasted hours, missed revenue
3. Solution: Actionable advice with WedBoardPro as enabler
4. Proof: Specific examples, statistics, realistic scenarios
5. CTA: Guide toward next steps using CTAs above

## RULES
- Write for PROFESSIONAL wedding planners, never couples
- Active voice, no exclamation points, specific over vague
- Benefits over features
- H2/H3 structure, bullet points, numbered lists
- 3-5 internal links, 1-2 external authority links (e.g., The Knot, WeddingWire, industry stats)
- 2-3 image placeholders: ![alt](placeholder-url)
- MINIMUM ${wordTarget} words — this is the #1 priority
- Include CTAs as markdown blockquotes at natural points`;

  const userPrompt = `Write a comprehensive, long-form ${contentType} blog post of AT LEAST ${wordTarget} words about "${payload.keyword}".

Search Intent: ${payload.search_intent}${secondaryKw}

Write the FULL article in markdown. Include 8-10 H2 sections, each 200-300 words. Include CTAs as blockquotes at natural break points. Use internal links, external links, and image placeholders. The article must be thorough, detailed, and the definitive resource on this topic.

IMPORTANT: Write at least ${wordTarget} words. Do NOT be brief. Go deep on each section with examples, scenarios, statistics, and actionable advice.`;

  // Step 1: Generate the full article content as plain markdown (no JSON constraint)
  const contentResponse = await fetch(
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
        max_tokens: 16384,
      }),
    },
  );

  if (!contentResponse.ok) {
    return { error: `OpenAI API error (content): ${contentResponse.status}` };
  }

  const contentData = await contentResponse.json();
  const articleContent = contentData.choices?.[0]?.message?.content;

  if (!articleContent || articleContent.length < 100) {
    return { error: "Empty or too-short OpenAI article response" };
  }

  // Step 2: Extract metadata with a quick second call
  const metaResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Extract SEO metadata from the article. Respond with ONLY valid JSON.",
          },
          {
            role: "user",
            content: `Extract metadata from this article about "${payload.keyword}":\n\n${articleContent.substring(0, 3000)}\n\nValid product feature slugs (ONLY use these): ${features.map(f => f.feature_slug).join(", ")}\nKnown competitors (ONLY use these names): ${competitors.map(c => c.competitor_name).join(", ")}\n\nRespond with JSON:\n{\n  "title": "SEO title 50-60 chars with keyword",\n  "meta_description": "130-155 char meta description",\n  "h1": "H1 heading",\n  "slug": "url-friendly-slug",\n  "excerpt": "2-3 sentence excerpt under 200 chars",\n  "product_features_mentioned": ["only-valid-feature-slugs-from-list-above"],\n  "competitor_mentions": ["only-competitor-names-from-list-above"]\n}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    },
  );

  if (!metaResponse.ok) {
    return { error: `OpenAI API error (meta): ${metaResponse.status}` };
  }

  const metaData = await metaResponse.json();
  const metaRaw = metaData.choices?.[0]?.message?.content;

  let meta: {
    title: string;
    meta_description: string;
    h1: string;
    slug: string;
    excerpt?: string;
    product_features_mentioned?: string[];
    competitor_mentions?: string[];
  };

  try {
    const cleaned = (metaRaw ?? "")
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```$/m, "")
      .trim();
    meta = JSON.parse(cleaned);
  } catch {
    // Fallback: extract from article headings
    const firstH1 = articleContent.match(/^#\s+(.+)/m)?.[1] ?? payload.keyword;
    const firstParagraph = articleContent.match(/\n\n([^#\n][^\n]{20,})/)?.[1] ?? "";
    meta = {
      title: firstH1.substring(0, 60),
      meta_description: firstParagraph.substring(0, 155),
      h1: firstH1,
      slug: payload.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      product_features_mentioned: [],
      competitor_mentions: [],
    };
  }

  const generated = {
    title: cleanContent(meta.title || payload.keyword),
    meta_description: cleanContent(meta.meta_description || ""),
    h1: cleanContent(meta.h1 || meta.title || payload.keyword),
    slug: meta.slug || payload.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    excerpt: meta.excerpt ? cleanContent(meta.excerpt) : meta.excerpt,
    content: cleanContent(articleContent),
    product_features_mentioned: meta.product_features_mentioned,
    competitor_mentions: meta.competitor_mentions,
  };

  if (!generated.content) {
    return { error: "Missing content in generated article" };
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

  // Count content metrics
  const wordCount = generated.content.split(/\s+/).filter((w: string) => w.length > 0).length;
  const internalLinkCount = (generated.content.match(/(?<!!)\[[^\]]*\]\(\/[^)]+\)/g) ?? []).length;
  const externalLinkCount = (generated.content.match(/(?<!!)\[[^\]]*\]\(https?:\/\/[^)]+\)/g) ?? []).length;

  // Content grading
  let score = 0;
  if (wordCount >= wordTarget * 0.9) score += 2;
  if (wordCount >= wordTarget) score += 1;
  if (internalLinkCount >= 3) score += 2;
  if (externalLinkCount >= 1) score += 1;
  if ((generated.product_features_mentioned?.length ?? 0) >= 2) score += 2;
  if ((generated.competitor_mentions?.length ?? 0) >= 1) score += 1;
  const grade = score >= 8 ? "A+" : score >= 6 ? "A" : score >= 4 ? "B" : score >= 2 ? "C" : "D";

  const usedCtaIds = ctas.map(c => c.id);

  // Insert blog post with enhanced metadata
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
      actual_word_count: wordCount,
      topic_cluster_id: payload.topic_cluster_id ?? null,
      category: contentType,
      status: "in_review",
      product_features_mentioned: generated.product_features_mentioned ?? [],
      competitor_mentions: generated.competitor_mentions ?? [],
      internal_links_count: internalLinkCount,
      external_links_count: externalLinkCount,
      content_grade: grade,
      generation_model: "enhanced-v1",
      generation_context: {
        content_type: contentType,
        features_available: features.length,
        competitors_available: competitors.length,
        ctas_used: usedCtaIds.length,
        word_count: wordCount,
      },
      cta_template_ids: usedCtaIds,
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
        dateModified: new Date().toISOString(),
        author: { "@type": "Organization", name: "WedBoardPro", url: "https://wedboardpro.com" },
        publisher: { "@type": "Organization", name: "WedBoardPro", url: "https://wedboardpro.com" },
        keywords: payload.keyword,
        wordCount,
        articleSection: "Wedding Planning",
        inLanguage: "en-US",
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

      // -----------------------------------------------
      // ACTION: generate_single (for cluster generation)
      // -----------------------------------------------
      case "generate_single": {
        const { keyword, target_word_count, cluster_id, is_pillar, pillar_page_id } = body as {
          keyword: string;
          target_word_count?: number;
          cluster_id?: string;
          is_pillar?: boolean;
          pillar_page_id?: string;
        };

        if (!keyword) {
          return jsonResponse({ error: "keyword is required" }, 400);
        }

        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiKey) {
          return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);
        }

        // Get pillar slug if pillar_page_id provided
        let pillarSlug: string | null = null;
        if (pillar_page_id) {
          const { data: pillarPost } = await supabase
            .from("blog_posts")
            .select("slug")
            .eq("id", pillar_page_id)
            .single();
          pillarSlug = (pillarPost as { slug: string } | null)?.slug ?? null;
        }

        const intent = is_pillar ? "informational" : "informational";
        const wordCount = target_word_count ?? (is_pillar ? 3000 : 1500);

        const result = await callContentGeneration(supabase, openaiKey, {
          keyword,
          search_intent: intent,
          content_cluster_id: cluster_id ?? null,
          is_pillar: is_pillar ?? false,
          pillar_slug: pillarSlug,
          target_word_count: wordCount,
        });

        if ("error" in result) {
          return jsonResponse({ error: result.error }, 500);
        }

        // Get the created article title for response
        const { data: createdPost } = await supabase
          .from("blog_posts")
          .select("title, slug, actual_word_count")
          .eq("id", result.blog_post_id)
          .single();

        return jsonResponse({
          action: "generate_single",
          article_id: result.blog_post_id,
          seo_page_id: result.seo_page_id,
          title: (createdPost as { title: string } | null)?.title,
          slug: (createdPost as { slug: string } | null)?.slug,
          word_count: (createdPost as { actual_word_count: number } | null)?.actual_word_count,
        });
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
              "generate_single",
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
