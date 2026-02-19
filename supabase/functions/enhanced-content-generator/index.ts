import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  countWords,
  calculateKeywordDensity,
  calculateFleschKincaid,
  extractHeaders,
  extractLinks,
  extractImages,
} from "../content-generation/audit-utils.ts";

// =============================================
// TYPES
// =============================================

interface ContentRequest {
  keyword: string;
  search_intent: "informational" | "commercial" | "transactional" | "navigational";
  topic_cluster_id?: string;
  target_word_count?: number;
  tone?: "professional" | "casual" | "authoritative" | "friendly";
  secondary_keywords?: string[];
  content_type?: string; // guide, comparison, how-to, checklist, case-study, product
}

interface ProductFeature {
  feature_name: string;
  feature_slug: string;
  category: string;
  description: string;
  key_benefits: string[];
  competitive_advantage: string | null;
  related_keywords: string[];
}

interface CompetitorComparison {
  competitor_name: string;
  competitor_domain: string;
  target_market: string;
  strengths: string[];
  weaknesses: string[];
  our_advantages: string[];
  feature_comparison: Record<string, string>;
  comparison_keywords: string[];
}

interface CTATemplate {
  id: string;
  name: string;
  cta_type: string;
  content_type: string;
  heading: string;
  body_text: string;
  button_text: string;
  button_url: string;
  secondary_text: string | null;
  placement_hint: string | null;
  feature_slug: string | null;
}

interface ClusterContext {
  id: string;
  name: string;
  pillar_keyword: string;
  description: string | null;
  related_features: string[];
  internal_linking_strategy: string | null;
  existing_posts: Array<{ title: string; slug: string; primary_keyword: string | null }>;
}

interface IntelligenceContext {
  features: ProductFeature[];
  competitors: CompetitorComparison[];
  ctas: CTATemplate[];
  cluster: ClusterContext | null;
  contentGaps: Array<{ keyword_primary: string; competitor_name: string; opportunity_score: number }>;
  existingPosts: Array<{ title: string; slug: string; primary_keyword: string | null }>;
}

// =============================================
// INTELLIGENCE GATHERER — Fetches all context
// =============================================

async function gatherIntelligence(
  supabase: SupabaseClient,
  request: ContentRequest,
): Promise<IntelligenceContext> {
  const [featuresRes, competitorsRes, ctasRes, postsRes, gapsRes] = await Promise.all([
    supabase.from("product_features").select("feature_name, feature_slug, category, description, key_benefits, competitive_advantage, related_keywords").eq("is_active", true).order("display_order"),
    supabase.from("competitor_comparisons").select("competitor_name, competitor_domain, target_market, strengths, weaknesses, our_advantages, feature_comparison, comparison_keywords").eq("is_active", true),
    supabase.from("cta_templates").select("id, name, cta_type, content_type, heading, body_text, button_text, button_url, secondary_text, placement_hint, feature_slug").eq("is_active", true),
    supabase.from("blog_posts").select("title, slug, primary_keyword").eq("status", "published").order("published_at", { ascending: false }).limit(30),
    supabase.from("competitor_content_gaps").select("keyword_primary, competitor_name, opportunity_score").in("status", ["identified", "targeting"]).order("opportunity_score", { ascending: false }).limit(20),
  ]);

  const features = (featuresRes.data ?? []) as ProductFeature[];
  const competitors = (competitorsRes.data ?? []) as CompetitorComparison[];
  const allCtas = (ctasRes.data ?? []) as CTATemplate[];
  const existingPosts = (postsRes.data ?? []) as Array<{ title: string; slug: string; primary_keyword: string | null }>;
  const contentGaps = (gapsRes.data ?? []) as Array<{ keyword_primary: string; competitor_name: string; opportunity_score: number }>;

  // Filter CTAs for this content type
  const contentType = request.content_type ?? detectContentType(request.keyword, request.search_intent);
  const ctas = allCtas.filter(c => c.content_type === contentType || c.content_type === "general");

  // Get cluster context if available
  let cluster: ClusterContext | null = null;
  if (request.topic_cluster_id) {
    const { data: clusterData } = await supabase
      .from("topic_clusters")
      .select("id, name, pillar_keyword, description, related_features, internal_linking_strategy")
      .eq("id", request.topic_cluster_id)
      .single();

    if (clusterData) {
      // Get existing posts in this cluster for internal linking
      const { data: clusterPosts } = await supabase
        .from("blog_posts")
        .select("title, slug, primary_keyword")
        .eq("topic_cluster_id", request.topic_cluster_id)
        .eq("status", "published")
        .limit(10);

      cluster = {
        ...(clusterData as {
          id: string; name: string; pillar_keyword: string;
          description: string | null; related_features: string[];
          internal_linking_strategy: string | null;
        }),
        existing_posts: (clusterPosts ?? []) as Array<{ title: string; slug: string; primary_keyword: string | null }>,
      };
    }
  }

  return { features, competitors, ctas, cluster, contentGaps, existingPosts };
}

function detectContentType(keyword: string, intent: string): string {
  const kw = keyword.toLowerCase();
  if (kw.includes(" vs ") || kw.includes("alternative") || kw.includes("compare")) return "comparison";
  if (kw.includes("how to") || kw.includes("how do")) return "how-to";
  if (kw.includes("checklist") || kw.includes("template")) return "checklist";
  if (kw.includes("review") || kw.includes("case study")) return "case-study";
  if (intent === "commercial" || intent === "transactional") return "product";
  return "guide";
}

// =============================================
// PROMPT BUILDER — The core intelligence
// =============================================

function buildEnhancedSystemPrompt(intel: IntelligenceContext, contentType: string): string {
  // Build product knowledge section
  const featuresBlock = intel.features.map(f =>
    `- **${f.feature_name}** (/${f.feature_slug}): ${f.description}\n  Benefits: ${f.key_benefits.slice(0, 2).join(", ")}${f.competitive_advantage ? `\n  Advantage: ${f.competitive_advantage}` : ""}`
  ).join("\n");

  // Build competitor knowledge section
  const competitorBlock = intel.competitors.map(c =>
    `- **${c.competitor_name}** (${c.competitor_domain}): Targets ${c.target_market}\n  Their weaknesses: ${c.weaknesses.slice(0, 3).join(", ")}\n  Our advantages: ${c.our_advantages.slice(0, 3).join(", ")}`
  ).join("\n");

  // Build internal linking assets
  const linkableContent = intel.existingPosts.slice(0, 15).map(p =>
    `- [${p.title}](/blog/${p.slug}) — keyword: "${p.primary_keyword ?? "general"}"`
  ).join("\n");

  // Build CTA instructions
  const ctaInstructions = buildCTAInstructions(intel.ctas, contentType);

  // Build cluster context
  const clusterBlock = intel.cluster
    ? `\n## TOPIC CLUSTER CONTEXT
This article belongs to the "${intel.cluster.name}" cluster (pillar: "${intel.cluster.pillar_keyword}").
${intel.cluster.description ? `Cluster description: ${intel.cluster.description}` : ""}
${intel.cluster.internal_linking_strategy ? `Linking strategy: ${intel.cluster.internal_linking_strategy}` : ""}
${intel.cluster.existing_posts.length > 0 ? `\nExisting articles in this cluster to link to:\n${intel.cluster.existing_posts.map(p => `- [${p.title}](/blog/${p.slug})`).join("\n")}` : ""}`
    : "";

  // Build content gap context
  const gapBlock = intel.contentGaps.length > 0
    ? `\n## COMPETITOR CONTENT GAPS (opportunities to mention)
These are topics competitors cover that we should address:\n${intel.contentGaps.slice(0, 5).map(g => `- "${g.keyword_primary}" (${g.competitor_name}, opportunity: ${g.opportunity_score}/100)`).join("\n")}`
    : "";

  return `You are an elite SEO content writer for WedBoardPro, a B2B SaaS platform built exclusively for professional wedding planners. You create content that ranks on page 1 of Google AND converts readers into paying customers.

## YOUR PRODUCT KNOWLEDGE (use naturally, never force)
${featuresBlock}

## COMPETITIVE LANDSCAPE (use for comparison content and differentiation)
${competitorBlock}

## EXISTING CONTENT TO LINK TO (use 3-5 internal links naturally)
${linkableContent || "No published content yet — skip internal links."}
${clusterBlock}
${gapBlock}

## WRITING FRAMEWORK: Problem → Agitate → Solution → Proof → CTA

1. **Problem**: Identify the specific pain point wedding planners face related to this topic
2. **Agitate**: Amplify consequences — lost clients, wasted hours, missed revenue, stress
3. **Solution**: Present clear, actionable advice with WedBoardPro as the natural enabler
4. **Proof**: Include specific examples, statistics, or realistic scenarios
5. **CTA**: Guide toward next steps with the CTAs provided below

## COPYWRITING PRINCIPLES
- Clarity over cleverness
- Benefits over features — what it MEANS for the planner, not what it DOES
- Specificity: "Cut weekly reporting from 4 hours to 15 minutes" not "Save time"
- Mirror how wedding planners actually talk
- Active voice, no exclamation points, no buzzwords without substance
- One idea per section, logical flow

## PSYCHOLOGY TO APPLY
- **Loss Aversion**: What planners lose by NOT acting (leads, revenue, time)
- **Social Proof**: What successful planners do, industry benchmarks
- **Authority**: Deep wedding industry knowledge
- **Anchoring**: Set expectations with specific numbers early
- **Scarcity**: Booking seasons, vendor availability windows
- **Status-Quo Bias**: Acknowledge comfort of current tools, show the cost of staying

## HEADLINE FORMULAS (vary per article)
- "{Achieve outcome} without {pain point}"
- "The {category} for {audience}"
- "Never {unpleasant event} again"
- "Stop {pain}. Start {pleasure}."
- "What if you could {desirable outcome}?"
- "{Number} Proven Ways to {outcome}"

${ctaInstructions}

## CONTENT STRUCTURE REQUIREMENTS
- Start with a compelling hook (question, statistic, or scenario)
- Use H2 headings for main sections, H3 for subsections
- Include actionable takeaways in each section
- Add 3-5 internal links using markdown: [anchor text](/blog/slug)
- Include 1-2 external links to authoritative sources
- End with a clear conclusion and call-to-action
- Use bullet points and numbered lists for scannability
- Include 2-3 image placeholders: ![descriptive alt text](placeholder-image-url)
- Minimum 1500 words for comprehensive coverage

## BRAND CONTEXT
- WedBoardPro is the "operating system" for professional wedding planners
- Target: Pros managing 10-20 weddings simultaneously
- Pricing: Starting at $29/month
- Competitors: HoneyBook, Aisle Planner, Dubsado, Planning Pod, spreadsheets
- Tone: Professional, warm, never condescending. Think Linear/Notion quality.
- Always write for PROFESSIONAL PLANNERS, never for couples.`;
}

function buildCTAInstructions(ctas: CTATemplate[], contentType: string): string {
  if (ctas.length === 0) {
    return `## CTA PLACEMENT
Include 2-3 natural calls-to-action:
1. One inline CTA mid-article after presenting a solution
2. One section-break CTA between major sections
3. One strong conclusion CTA at the end`;
  }

  // Select best CTAs for placement
  const inlineCtas = ctas.filter(c => c.cta_type === "inline").slice(0, 2);
  const sectionCtas = ctas.filter(c => c.cta_type === "section_break").slice(0, 1);
  const conclusionCtas = ctas.filter(c => c.cta_type === "conclusion").slice(0, 1);

  const selectedCtas = [...inlineCtas, ...sectionCtas, ...conclusionCtas];
  if (selectedCtas.length === 0) {
    // Fallback: use any available
    selectedCtas.push(...ctas.slice(0, 3));
  }

  const ctaBlocks = selectedCtas.map((cta, i) => {
    return `### CTA ${i + 1}: "${cta.name}" (${cta.cta_type}, place ${cta.placement_hint ?? "naturally"})
**Heading**: ${cta.heading}
**Body**: ${cta.body_text}
**Button**: [${cta.button_text}](${cta.button_url})${cta.secondary_text ? `\n**Note**: ${cta.secondary_text}` : ""}`;
  }).join("\n\n");

  return `## CTA PLACEMENT — Insert these EXACTLY as formatted (in markdown callout blocks)
Use markdown callout syntax for CTAs: > **heading** followed by body text and button link.
Place ${selectedCtas.length} CTAs naturally throughout the article:

${ctaBlocks}

FORMAT each CTA in the article as a markdown blockquote section:
> **[CTA Heading]**
>
> [CTA Body Text]
>
> [Button Text](button-url) | [Secondary text if any]`;
}

function buildEnhancedUserPrompt(request: ContentRequest, intel: IntelligenceContext): string {
  const wordTarget = request.target_word_count ?? 2000;
  const tone = request.tone ?? "professional";
  const contentType = request.content_type ?? detectContentType(request.keyword, request.search_intent);
  const secondaryKw = request.secondary_keywords?.length
    ? `\nSecondary keywords to weave in naturally: ${request.secondary_keywords.join(", ")}`
    : "";

  // Find relevant features for this keyword
  const keywordLower = request.keyword.toLowerCase();
  const relevantFeatures = intel.features.filter(f =>
    f.related_keywords.some(k => keywordLower.includes(k.toLowerCase())) ||
    f.description.toLowerCase().includes(keywordLower.split(" ")[0])
  );

  const featureHint = relevantFeatures.length > 0
    ? `\nMost relevant WedBoardPro features to mention: ${relevantFeatures.map(f => f.feature_name).join(", ")}`
    : "";

  // Find relevant competitor comparisons
  const relevantCompetitors = intel.competitors.filter(c =>
    c.comparison_keywords.some(k => keywordLower.includes(k.toLowerCase().split(" ")[0]))
  );
  const competitorHint = relevantCompetitors.length > 0
    ? `\nRelevant competitors to compare against: ${relevantCompetitors.map(c => c.competitor_name).join(", ")}`
    : "";

  return `Write a comprehensive, high-converting blog post:

**Primary Keyword**: ${request.keyword}
**Content Type**: ${contentType}
**Search Intent**: ${request.search_intent}${secondaryKw}
**Target Word Count**: ${wordTarget} words (minimum ${Math.floor(wordTarget * 0.85)})
**Tone**: ${tone}${featureHint}${competitorHint}

## Content Type Guidance for "${contentType}":
${getContentTypeGuidance(contentType, intel)}

## Output Format (respond with ONLY valid JSON, no markdown code fences)

{
  "title": "SEO-optimized title (50-60 chars, includes primary keyword)",
  "meta_description": "Compelling meta description (130-155 chars, keyword + CTA)",
  "h1": "Page H1 (can differ from title, more engaging)",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence excerpt under 200 chars",
  "content": "Full markdown content with H2/H3 structure, CTAs, internal links, external links, images",
  "product_features_mentioned": ["feature-slug-1", "feature-slug-2"],
  "competitor_mentions": ["CompetitorName1"],
  "content_grade_self_assessment": "A"
}

Remember: Write for PROFESSIONAL wedding planners running a BUSINESS. Every point must relate to their professional challenges.`;
}

function getContentTypeGuidance(contentType: string, intel: IntelligenceContext): string {
  switch (contentType) {
    case "comparison":
      return `- Create a fair, thorough comparison (we should come out ahead naturally)
- Use comparison tables where relevant
- Address each competitor's strengths honestly before showing our advantages
- Include a "Verdict" or "Best For" section
- Mention specific competitors: ${intel.competitors.map(c => c.competitor_name).join(", ")}
- Use comparison keywords naturally
- Strong commercial CTAs — readers are evaluating options`;

    case "how-to":
      return `- Step-by-step instructions with numbered steps
- Include screenshots/image placeholders for key steps
- Show how WedBoardPro makes each step easier (but don't be pushy)
- Include a "Quick Start" summary at the top
- Practical, actionable — the reader should be able to do this TODAY
- Tool-mention CTAs where our features naturally help`;

    case "checklist":
      return `- Organized checklist with clear categories
- Each item should be actionable and specific
- Include timeline or priority indicators
- Mention how WedBoardPro digitalizes these checklists
- Downloadable/shareable value — make readers want to bookmark
- Template-download CTAs`;

    case "case-study":
      return `- Tell a compelling story: Challenge → Solution → Results
- Include specific numbers and outcomes
- Quote-style testimonials (can be realistic scenarios)
- Before/after comparisons
- Results-focused CTAs`;

    case "product":
      return `- Feature deep-dive with real use cases
- Show the workflow, not just the feature list
- Compare to alternatives (spreadsheets, other tools)
- Include ROI calculations or time-savings estimates
- Demo/trial CTAs — readers want to see it`;

    default: // guide
      return `- Comprehensive coverage — be the definitive resource on this topic
- Balance education with actionable advice
- Include frameworks, templates, or models the reader can apply
- Real-world wedding planning scenarios and examples
- Position WedBoardPro naturally where it solves problems discussed
- Mix of informational and soft-commercial CTAs`;
  }
}

// =============================================
// CONTENT GENERATOR
// =============================================

async function generateEnhancedContent(
  supabase: SupabaseClient,
  openaiKey: string,
  request: ContentRequest,
): Promise<{
  blog_post_id: string;
  seo_page_id: string;
  metrics: Record<string, unknown>;
  content_grade: string;
  features_mentioned: string[];
  competitors_mentioned: string[];
  cta_ids: string[];
} | { error: string }> {
  // Gather all intelligence context
  const intel = await gatherIntelligence(supabase, request);

  const contentType = request.content_type ?? detectContentType(request.keyword, request.search_intent);
  const systemPrompt = buildEnhancedSystemPrompt(intel, contentType);
  const userPrompt = buildEnhancedUserPrompt(request, intel);

  // Generate with GPT-4o
  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
      max_tokens: 8192,
    }),
  });

  if (!openaiResponse.ok) {
    return { error: `OpenAI API error: ${openaiResponse.status}` };
  }

  const openaiData = await openaiResponse.json();
  const rawContent = openaiData.choices?.[0]?.message?.content;
  if (!rawContent) return { error: "Empty OpenAI response" };

  // Parse JSON response
  let generated: {
    title: string;
    meta_description: string;
    h1: string;
    slug: string;
    excerpt?: string;
    content: string;
    product_features_mentioned?: string[];
    competitor_mentions?: string[];
    content_grade_self_assessment?: string;
  };

  try {
    const cleaned = rawContent.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
    generated = JSON.parse(cleaned);
  } catch {
    return { error: "Failed to parse AI JSON response" };
  }

  if (!generated.title || !generated.content || !generated.slug) {
    return { error: "Missing required fields (title, content, slug)" };
  }

  // Enforce limits
  if (generated.title.length > 60) generated.title = generated.title.substring(0, 57) + "...";
  if (generated.meta_description?.length > 160) generated.meta_description = generated.meta_description.substring(0, 157) + "...";
  generated.slug = generated.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  // Calculate metrics
  const wordCount = countWords(generated.content);
  const readability = calculateFleschKincaid(generated.content);
  const keywordDensity = calculateKeywordDensity(generated.content, request.keyword);
  const internalLinks = extractLinks(generated.content, "internal");
  const externalLinks = extractLinks(generated.content, "external");
  const images = extractImages(generated.content);
  const headers = extractHeaders(generated.content);

  // Determine content grade
  let grade = "B";
  let score = 0;
  if (wordCount >= (request.target_word_count ?? 2000) * 0.9) score += 2;
  if (wordCount >= (request.target_word_count ?? 2000)) score += 1;
  if (internalLinks.length >= 3) score += 2;
  if (externalLinks.length >= 1) score += 1;
  if (images.length >= 2) score += 1;
  if (headers.h2.length >= 4) score += 1;
  if (keywordDensity >= 0.5 && keywordDensity <= 3) score += 2;
  if (readability >= 40 && readability <= 70) score += 1;
  if ((generated.product_features_mentioned?.length ?? 0) >= 2) score += 1;

  if (score >= 10) grade = "A+";
  else if (score >= 8) grade = "A";
  else if (score >= 6) grade = "B";
  else if (score >= 4) grade = "C";
  else grade = "D";

  // Select which CTA template IDs were used
  const usedCtaIds = intel.ctas.slice(0, 3).map(c => c.id);

  // Store in database
  const { data: blogPost, error: blogErr } = await supabase
    .from("blog_posts")
    .insert({
      title: generated.title,
      slug: generated.slug,
      meta_description: generated.meta_description,
      content: generated.content,
      excerpt: generated.excerpt ?? null,
      primary_keyword: request.keyword,
      keyword_variations: request.secondary_keywords ?? [],
      target_word_count: request.target_word_count ?? 2000,
      actual_word_count: wordCount,
      topic_cluster_id: request.topic_cluster_id ?? null,
      category: contentType,
      status: "in_review",
      product_features_mentioned: generated.product_features_mentioned ?? [],
      competitor_mentions: generated.competitor_mentions ?? [],
      internal_links_count: internalLinks.length,
      external_links_count: externalLinks.length,
      content_grade: grade,
      generation_model: "enhanced-v1",
      generation_context: {
        content_type: contentType,
        features_available: intel.features.length,
        competitors_available: intel.competitors.length,
        ctas_used: usedCtaIds.length,
        cluster_id: request.topic_cluster_id,
        word_count: wordCount,
        readability_score: readability,
        keyword_density: keywordDensity,
      },
      cta_template_ids: usedCtaIds,
    })
    .select("id")
    .single();

  if (blogErr) return { error: `Blog insert failed: ${blogErr.message}` };

  // Create SEO page
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: generated.title,
    description: generated.meta_description,
    url: `https://wedboardpro.com/blog/${generated.slug}`,
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: { "@type": "Organization", name: "WedBoardPro", url: "https://wedboardpro.com" },
    publisher: { "@type": "Organization", name: "WedBoardPro", url: "https://wedboardpro.com", logo: { "@type": "ImageObject", url: "https://wedboardpro.com/logo.png" } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://wedboardpro.com/blog/${generated.slug}` },
    keywords: request.keyword,
    wordCount,
    articleSection: "Wedding Planning",
    inLanguage: "en-US",
  };

  const { data: seoPage, error: seoErr } = await supabase
    .from("seo_pages")
    .insert({
      blog_post_id: blogPost.id,
      topic_cluster_id: request.topic_cluster_id ?? null,
      page_type: "blog",
      url_path: `/blog/${generated.slug}`,
      title_tag: generated.title,
      meta_description: generated.meta_description,
      h1_tag: generated.h1 ?? generated.title,
      target_keyword: request.keyword,
      secondary_keywords: request.secondary_keywords ?? [],
      schema_markup: schemaMarkup,
      internal_links_count: internalLinks.length,
      external_links_count: externalLinks.length,
      content_score: 0,
      technical_score: 0,
      seo_score: 0,
    })
    .select("id")
    .single();

  if (seoErr) return { error: `SEO page insert failed: ${seoErr.message}` };

  // Trigger audit
  try {
    await supabase.rpc("run_seo_audit", { p_page_id: seoPage.id });
  } catch {
    // Audit is optional
  }

  return {
    blog_post_id: blogPost.id,
    seo_page_id: seoPage.id,
    metrics: {
      word_count: wordCount,
      readability_score: readability,
      keyword_density: keywordDensity,
      internal_links: internalLinks.length,
      external_links: externalLinks.length,
      images: images.length,
      headers: { h2: headers.h2.length, h3: headers.h3.length },
    },
    content_grade: grade,
    features_mentioned: generated.product_features_mentioned ?? [],
    competitors_mentioned: generated.competitor_mentions ?? [],
    cta_ids: usedCtaIds,
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
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const startTime = performance.now();

  try {
    const body: ContentRequest = await req.json();

    if (!body.keyword?.trim()) {
      return jsonResponse({ error: "keyword is required" }, 400);
    }
    if (!body.search_intent || !["informational", "commercial", "transactional", "navigational"].includes(body.search_intent)) {
      return jsonResponse({ error: "search_intent must be one of: informational, commercial, transactional, navigational" }, 400);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const result = await generateEnhancedContent(supabase, openaiKey, body);

    if ("error" in result) {
      return jsonResponse({ error: result.error }, 500);
    }

    const executionTimeMs = Math.round(performance.now() - startTime);

    return jsonResponse({
      ...result,
      execution_time_ms: executionTimeMs,
      generator: "enhanced-v1",
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Enhanced content generation failed:", message);
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
