import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  countWords,
  calculateKeywordDensity,
  calculateFleschKincaid,
  extractHeaders,
  extractLinks,
  extractImages,
} from "../../tier3-quality/seo-audit-automation/audit-utils.ts";

interface ContentRequest {
  keyword: string;
  search_intent: "informational" | "commercial" | "transactional" | "navigational";
  topic_cluster_id?: string;
  target_word_count?: number;
  tone?: "professional" | "casual" | "authoritative" | "friendly";
  secondary_keywords?: string[];
}

interface GeneratedContent {
  title: string;
  meta_description: string;
  h1: string;
  slug: string;
  excerpt: string;
  content: string;
  schema_markup: Record<string, unknown>;
}

interface ContentMetrics {
  word_count: number;
  readability_score: number;
  keyword_density: number;
  internal_links: number;
  external_links: number;
  images: number;
  headers: { h1: number; h2: number; h3: number };
}

interface ContentResponse {
  blog_post_id: string;
  seo_page_id: string;
  generated: GeneratedContent;
  metrics: ContentMetrics;
  audit_score: number | null;
  execution_time_ms: number;
}

const SYSTEM_PROMPT = `You are an expert SEO content writer for WedBoardPro, a B2B SaaS platform for professional wedding planners. You create high-quality, SEO-optimized blog content that ranks well and converts readers into leads.

## Writing Framework: Problem → Agitate → Solution → Proof → CTA

1. **Problem**: Identify the specific pain point wedding planners face
2. **Agitate**: Amplify the consequences of not solving it (lost clients, wasted hours, missed revenue)
3. **Solution**: Present clear, actionable advice (with WedBoardPro as the enabler where natural)
4. **Proof**: Include specific examples, statistics, or scenarios that demonstrate credibility
5. **CTA**: Guide toward next steps (trying WedBoardPro, reading related content)

## Copywriting Principles
- Clarity over cleverness — if you have to choose, choose clear
- Benefits over features — what it MEANS for the planner, not what it DOES
- Specificity over vagueness — "Cut weekly reporting from 4 hours to 15 minutes" not "Save time"
- Use customer language — mirror how wedding planners actually talk
- One idea per section — build a logical flow
- Active voice — "Planners manage" not "Events are managed"
- No exclamation points, no buzzwords without substance

## Psychology Principles to Apply
- **Loss Aversion**: Frame in terms of what planners lose by NOT acting (lost leads, revenue left on table)
- **Social Proof**: Reference industry standards, what successful planners do, common practices
- **Authority**: Demonstrate deep knowledge of the wedding industry
- **Anchoring**: Set expectations early with specific numbers
- **Scarcity/Urgency**: Time-sensitive aspects of wedding planning (booking seasons, vendor availability)
- **Endowment Effect**: Help readers visualize already having the solution
- **Status-Quo Bias**: Acknowledge the comfort of current tools, then show the cost of staying

## Headline Formulas (vary usage)
- "{Achieve outcome} without {pain point}"
- "The {category} for {audience}"
- "Never {unpleasant event} again"
- "{Number} {people} use {approach} to {outcome}"
- "Stop {pain}. Start {pleasure}."
- "What if you could {desirable outcome}?"

## Content Structure Requirements
- Start with a compelling hook (question, statistic, or scenario)
- Use H2 headings for main sections, H3 for subsections
- Include actionable takeaways in each section
- Add internal links to related WedBoardPro content using markdown: [anchor text](/blog/related-slug)
- Include at least one external reference link to an authoritative source
- End with a clear conclusion and call-to-action
- Use bullet points and numbered lists for scanability
- Include at least one image placeholder: ![descriptive alt text](placeholder-image-url)

## Brand Context
- WedBoardPro is the "operating system" for wedding planners
- Target audience: Professional wedding planners managing 10-20 weddings simultaneously
- They're busy, stressed, and juggling multiple vendors/clients/timelines
- Pricing: €29-€100+/month
- Competitors: spreadsheets, fragmented tools, generic project management software
- Tone: Professional but warm, never condescending. Think Linear/Notion quality.`;

function buildUserPrompt(req: ContentRequest): string {
  const wordTarget = req.target_word_count ?? 1500;
  const tone = req.tone ?? "professional";
  const secondaryKw = req.secondary_keywords?.length
    ? `\nSecondary keywords to include naturally: ${req.secondary_keywords.join(", ")}`
    : "";

  return `Write a comprehensive blog post optimized for the following:

**Primary Keyword**: ${req.keyword}
**Search Intent**: ${req.search_intent}${secondaryKw}
**Target Word Count**: ${wordTarget} words (minimum ${Math.floor(wordTarget * 0.8)})
**Tone**: ${tone}

## Output Format (respond with ONLY valid JSON, no markdown code fences)

{
  "title": "SEO-optimized title tag (50-60 characters, includes primary keyword)",
  "meta_description": "Compelling meta description (130-155 characters, includes keyword, has CTA)",
  "h1": "Page H1 heading (can differ from title, more engaging/specific)",
  "slug": "url-friendly-slug-with-keyword",
  "excerpt": "2-3 sentence excerpt for previews and social sharing (under 200 characters)",
  "content": "Full markdown blog post content with proper H2/H3 structure, internal links, external links, and image placeholders"
}

## Content Requirements for "${req.search_intent}" intent:
${getIntentGuidance(req.search_intent)}

Remember: Write for professional wedding planners, not couples. Every point should relate to running a wedding planning BUSINESS.`;
}

function getIntentGuidance(intent: string): string {
  switch (intent) {
    case "informational":
      return `- Focus on educating and providing comprehensive answers
- Include "What", "How", "Why" sections
- Provide actionable steps and frameworks
- Cite industry data or standards where possible
- Naturally mention WedBoardPro only where genuinely relevant (1-2 times max)`;
    case "commercial":
      return `- Compare approaches, tools, or strategies
- Include pros/cons analysis
- Help the reader evaluate options
- Position WedBoardPro as a strong option among alternatives
- Include comparison elements (tables, feature lists)`;
    case "transactional":
      return `- Focus on getting the reader to take action
- Include clear benefits and value propositions
- Address common objections and hesitations
- Include strong CTAs throughout
- Show concrete ROI or time-saving examples with WedBoardPro`;
    case "navigational":
      return `- Provide clear, direct information about the specific topic
- Structure for quick scanning and finding answers
- Include a table of contents for longer pieces
- Focus on being the definitive resource for this topic`;
    default:
      return `- Write comprehensive, well-structured content
- Balance education with actionable advice
- Include relevant examples from the wedding planning industry`;
  }
}

function generateSchemaMarkup(
  generated: { title: string; meta_description: string; slug: string; excerpt: string },
  keyword: string,
  wordCount: number,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: generated.title,
    description: generated.meta_description,
    url: `https://wedboardpro.com/blog/${generated.slug}`,
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: {
      "@type": "Organization",
      name: "WedBoardPro",
      url: "https://wedboardpro.com",
    },
    publisher: {
      "@type": "Organization",
      name: "WedBoardPro",
      url: "https://wedboardpro.com",
      logo: {
        "@type": "ImageObject",
        url: "https://wedboardpro.com/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://wedboardpro.com/blog/${generated.slug}`,
    },
    keywords: keyword,
    wordCount,
    articleSection: "Wedding Planning",
    inLanguage: "en-US",
    about: {
      "@type": "Thing",
      name: keyword,
    },
  };
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
    const body: ContentRequest = await req.json();

    if (!body.keyword?.trim()) {
      return jsonResponse({ error: "keyword is required" }, 400);
    }
    if (
      !body.search_intent ||
      !["informational", "commercial", "transactional", "navigational"].includes(
        body.search_intent,
      )
    ) {
      return jsonResponse(
        { error: "search_intent must be one of: informational, commercial, transactional, navigational" },
        400,
      );
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // =============================================
    // GENERATE CONTENT WITH OPENAI
    // =============================================
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
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(body) },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      },
    );

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error("OpenAI API error:", errText);
      return jsonResponse(
        { error: `OpenAI API error: ${openaiResponse.status}` },
        502,
      );
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      return jsonResponse({ error: "Empty response from OpenAI" }, 502);
    }

    // Parse JSON from the response (strip code fences if present)
    let generated: GeneratedContent;
    try {
      const cleaned = rawContent
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```$/m, "")
        .trim();
      generated = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse OpenAI response:", rawContent.slice(0, 500));
      return jsonResponse(
        { error: "Failed to parse generated content as JSON" },
        502,
      );
    }

    // Validate required fields
    if (!generated.title || !generated.content || !generated.slug) {
      return jsonResponse(
        { error: "Generated content missing required fields (title, content, slug)" },
        502,
      );
    }

    // Enforce length limits
    if (generated.title.length > 60) {
      generated.title = generated.title.substring(0, 57) + "...";
    }
    if (generated.meta_description && generated.meta_description.length > 160) {
      generated.meta_description =
        generated.meta_description.substring(0, 157) + "...";
    }

    // Ensure slug format
    generated.slug = generated.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // =============================================
    // CALCULATE CONTENT METRICS
    // =============================================
    const wordCount = countWords(generated.content);
    const readabilityScore = calculateFleschKincaid(generated.content);
    const keywordDensity = calculateKeywordDensity(
      generated.content,
      body.keyword,
    );
    const internalLinks = extractLinks(generated.content, "internal");
    const externalLinks = extractLinks(generated.content, "external");
    const images = extractImages(generated.content);
    const headers = extractHeaders(generated.content);

    const metrics: ContentMetrics = {
      word_count: wordCount,
      readability_score: readabilityScore,
      keyword_density: keywordDensity,
      internal_links: internalLinks.length,
      external_links: externalLinks.length,
      images: images.length,
      headers: {
        h1: headers.h1.length,
        h2: headers.h2.length,
        h3: headers.h3.length,
      },
    };

    // Generate schema markup
    generated.schema_markup = generateSchemaMarkup(
      generated,
      body.keyword,
      wordCount,
    );

    // =============================================
    // STORE IN DATABASE
    // =============================================

    // 1. Create blog post
    const { data: blogPost, error: blogError } = await supabase
      .from("blog_posts")
      .insert({
        title: generated.title,
        slug: generated.slug,
        meta_description: generated.meta_description,
        content: generated.content,
        excerpt: generated.excerpt ?? null,
        primary_keyword: body.keyword,
        keyword_variations: body.secondary_keywords ?? [],
        target_word_count: body.target_word_count ?? 1500,
        actual_word_count: wordCount,
        topic_cluster_id: body.topic_cluster_id ?? null,
        status: "draft",
      })
      .select("id")
      .single();

    if (blogError) {
      console.error("Failed to create blog post:", blogError.message);
      return jsonResponse(
        { error: `Database error creating blog post: ${blogError.message}` },
        500,
      );
    }

    // 2. Create SEO page linked to blog post
    const { data: seoPage, error: seoError } = await supabase
      .from("seo_pages")
      .insert({
        blog_post_id: blogPost.id,
        topic_cluster_id: body.topic_cluster_id ?? null,
        page_type: "blog",
        url_path: `/blog/${generated.slug}`,
        title_tag: generated.title,
        meta_description: generated.meta_description,
        h1_tag: generated.h1 ?? generated.title,
        target_keyword: body.keyword,
        secondary_keywords: body.secondary_keywords ?? [],
        schema_markup: generated.schema_markup,
        internal_links_count: internalLinks.length,
        external_links_count: externalLinks.length,
        content_score: 0,
        technical_score: 0,
        seo_score: 0,
      })
      .select("id")
      .single();

    if (seoError) {
      console.error("Failed to create SEO page:", seoError.message);
      return jsonResponse(
        { error: `Database error creating SEO page: ${seoError.message}` },
        500,
      );
    }

    // =============================================
    // TRIGGER AUDIT VIA SQL FUNCTION
    // =============================================
    let auditScore: number | null = null;
    try {
      const { data: auditData, error: auditError } = await supabase.rpc(
        "run_seo_audit",
        { p_page_id: seoPage.id },
      );

      if (auditError) {
        console.error("Audit RPC failed:", auditError.message);
      } else if (auditData) {
        auditScore = auditData.overall_score ?? null;
      }
    } catch (auditErr) {
      console.error(
        "Audit error:",
        auditErr instanceof Error ? auditErr.message : auditErr,
      );
    }

    // =============================================
    // RESPONSE
    // =============================================
    const executionTimeMs = Math.round(performance.now() - startTime);

    const response: ContentResponse = {
      blog_post_id: blogPost.id,
      seo_page_id: seoPage.id,
      generated,
      metrics,
      audit_score: auditScore,
      execution_time_ms: executionTimeMs,
    };

    return jsonResponse(response, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Content generation failed:", message);
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
