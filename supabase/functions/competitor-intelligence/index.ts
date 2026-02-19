import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// =============================================
// TYPES
// =============================================

interface CompetitorInput {
  name: string;
  url: string;
  description?: string;
  price?: string;
  weakness?: string;
}

interface TrackResult {
  id: string;
  competitor_name: string;
  competitor_domain: string;
  status: string;
}

interface AlternativePageResult {
  competitor_id: string;
  competitor_name: string;
  seo_page_id: string;
  blog_post_id: string;
  slug: string;
  title: string;
  audit_score: number | null;
}

// =============================================
// OPENAI SYSTEM PROMPT
// =============================================

const SYSTEM_PROMPT = `You are an expert in creating competitor comparison pages for WedBoardPro, a B2B SaaS platform for professional wedding planners.

## About WedBoardPro
- All-in-one "operating system" for professional wedding planners
- Features: Client/Wedding Management, Vendor CRM, Budget Tracking, Timeline Builder, Seating Charts, Layout Maker with AI, Guest Management, Invoice & Payments
- Pricing: Basic €29/mo, Pro €50/mo, Enterprise €100+/mo
- Target: Professional planners managing 10-20 weddings simultaneously
- Differentiator: Built specifically for wedding planners (not generic PM tool)

## Writing Rules (from competitor-alternatives skill)
1. **Honesty builds trust** — acknowledge competitor strengths, be accurate about limitations
2. **Depth over surface** — go beyond feature checklists, explain WHY differences matter
3. **Help them decide** — be clear about who each tool is best for
4. **Respect the competitor** — no trash talk, factual comparisons only
5. Active voice, no exclamation points, no buzzwords
6. Write for professional wedding planners running a business

## Page Structure (Format 3: You vs Competitor)
1. TL;DR summary (key differences in 2-3 sentences)
2. At-a-glance comparison table (markdown table)
3. Detailed comparison by category (Features, Pricing, Support, Ease of use)
4. Who WedBoardPro is best for
5. Who {Competitor} is best for (be honest)
6. Why planners switch to WedBoardPro
7. Migration section
8. CTA

## Content Requirements
- Include a feature comparison markdown table
- Include at least 2 internal links: [text](/path)
- Include at least 1 external link to an authoritative source
- Include at least 1 image placeholder: ![alt](url)
- Minimum 1000 words
- Address "why switch" objections directly
- Include specific pricing numbers for both products`;

function buildUserPrompt(competitor: {
  competitor_name: string;
  competitor_domain: string;
  competitor_url?: string;
  content_gap_analysis?: Record<string, unknown>;
}): string {
  const data = competitor.content_gap_analysis ?? {};
  const description = (data.description as string) ?? "";
  const price = (data.price as string) ?? "varies";
  const weakness = (data.weakness as string) ?? "";

  return `Write a complete "WedBoardPro vs ${competitor.competitor_name}" comparison page.

**Competitor**: ${competitor.competitor_name}
**Website**: ${competitor.competitor_domain}
**Description**: ${description}
**Their pricing**: ${price}
**Known weakness**: ${weakness}

## Output Format (respond with ONLY valid JSON, no markdown code fences)

{
  "title": "SEO title tag (50-60 chars, include both product names)",
  "meta_description": "Meta description (130-155 chars, compelling comparison summary)",
  "h1": "Page H1 heading",
  "content": "Full markdown content following the page structure above. Minimum 1000 words.",
  "excerpt": "2-3 sentence excerpt under 200 chars"
}`;
}

// =============================================
// TRACK COMPETITOR
// =============================================

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }
}

async function trackCompetitor(
  supabase: SupabaseClient,
  input: CompetitorInput,
): Promise<TrackResult | { error: string }> {
  const domain = extractDomain(input.url);
  const keyword = `${input.name.toLowerCase()} vs wedboardpro`;

  // Check if already tracked
  const { data: existing } = await supabase
    .from("competitor_tracking")
    .select("id, competitor_name, competitor_domain, status")
    .eq("competitor_domain", domain)
    .maybeSingle();

  if (existing) {
    return existing as TrackResult;
  }

  const { data, error } = await supabase
    .from("competitor_tracking")
    .insert({
      competitor_name: input.name,
      competitor_domain: domain,
      competitor_url: input.url.startsWith("http") ? input.url : `https://${input.url}`,
      keyword,
      status: "targeting",
      opportunity_score: 75,
      content_gap_analysis: {
        description: input.description ?? "",
        price: input.price ?? "",
        weakness: input.weakness ?? "",
        category: "direct_competitor",
        tracked_at: new Date().toISOString(),
      },
    })
    .select("id, competitor_name, competitor_domain, status")
    .single();

  if (error) {
    return { error: error.message };
  }

  return data as TrackResult;
}

// =============================================
// GENERATE ALTERNATIVE PAGE
// =============================================

async function generateAlternativePage(
  supabase: SupabaseClient,
  competitorId: string,
): Promise<AlternativePageResult | { error: string }> {
  // Fetch competitor
  const { data: competitor, error: compErr } = await supabase
    .from("competitor_tracking")
    .select("*")
    .eq("id", competitorId)
    .single();

  if (compErr || !competitor) {
    return { error: `Competitor not found: ${compErr?.message ?? "no data"}` };
  }

  // Check if alternative page already exists
  if (competitor.our_alternative_page_id) {
    return { error: `Alternative page already exists for ${competitor.competitor_name}` };
  }

  const slug = `vs/${competitor.competitor_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  // Check for duplicate slug in seo_pages
  const { data: existingPage } = await supabase
    .from("seo_pages")
    .select("id")
    .eq("url_path", `/${slug}`)
    .maybeSingle();

  if (existingPage) {
    return { error: `Page already exists at /${slug}` };
  }

  // Generate content via OpenAI
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return { error: "OPENAI_API_KEY not configured" };
  }

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
          { role: "user", content: buildUserPrompt(competitor) },
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
    content: string;
    excerpt?: string;
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

  if (!generated.title || !generated.content) {
    return { error: "Generated content missing title or content" };
  }

  // Enforce length limits
  if (generated.title.length > 60) {
    generated.title = generated.title.substring(0, 57) + "...";
  }
  if (generated.meta_description && generated.meta_description.length > 160) {
    generated.meta_description =
      generated.meta_description.substring(0, 157) + "...";
  }

  // Create blog post
  const { data: blogPost, error: blogErr } = await supabase
    .from("blog_posts")
    .insert({
      title: generated.title,
      slug,
      meta_description: generated.meta_description,
      content: generated.content,
      excerpt: generated.excerpt ?? null,
      primary_keyword: `wedboardpro vs ${competitor.competitor_name.toLowerCase()}`,
      status: "draft",
    })
    .select("id")
    .single();

  if (blogErr) {
    return { error: `Blog post insert failed: ${blogErr.message}` };
  }

  // Create SEO page
  const targetKeyword = `wedboardpro vs ${competitor.competitor_name.toLowerCase()}`;
  const { data: seoPage, error: seoErr } = await supabase
    .from("seo_pages")
    .insert({
      blog_post_id: blogPost.id,
      page_type: "landing",
      url_path: `/${slug}`,
      title_tag: generated.title,
      meta_description: generated.meta_description,
      h1_tag: generated.h1 ?? generated.title,
      target_keyword: targetKeyword,
      secondary_keywords: [
        `${competitor.competitor_name.toLowerCase()} alternative`,
        `${competitor.competitor_name.toLowerCase()} vs wedboardpro`,
        `best ${competitor.competitor_name.toLowerCase()} alternative wedding planners`,
      ],
      schema_markup: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: generated.title,
        description: generated.meta_description,
        url: `https://wedboardpro.com/${slug}`,
        datePublished: new Date().toISOString(),
        author: {
          "@type": "Organization",
          name: "WedBoardPro",
          url: "https://wedboardpro.com",
        },
        publisher: {
          "@type": "Organization",
          name: "WedBoardPro",
          logo: {
            "@type": "ImageObject",
            url: "https://wedboardpro.com/logo.png",
          },
        },
      },
    })
    .select("id")
    .single();

  if (seoErr) {
    return { error: `SEO page insert failed: ${seoErr.message}` };
  }

  // Link back to competitor_tracking
  await supabase
    .from("competitor_tracking")
    .update({
      our_alternative_page_id: seoPage.id,
      status: "targeting",
    })
    .eq("id", competitorId);

  // Trigger audit
  let auditScore: number | null = null;
  try {
    const { data: auditData } = await supabase.rpc("run_seo_audit", {
      p_page_id: seoPage.id,
    });
    if (auditData?.overall_score != null) {
      auditScore = auditData.overall_score;
    }
  } catch {
    // Audit is optional
  }

  return {
    competitor_id: competitorId,
    competitor_name: competitor.competitor_name,
    seo_page_id: seoPage.id,
    blog_post_id: blogPost.id,
    slug,
    title: generated.title,
    audit_score: auditScore,
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

    switch (action) {
      // -----------------------------------------------
      // ACTION: track
      // -----------------------------------------------
      case "track": {
        const { competitor } = body as { competitor: CompetitorInput };
        if (!competitor?.name || !competitor?.url) {
          return jsonResponse(
            { error: "competitor.name and competitor.url are required" },
            400,
          );
        }
        const result = await trackCompetitor(supabase, competitor);
        if ("error" in result) {
          return jsonResponse({ error: result.error }, 500);
        }
        return jsonResponse({ action: "track", competitor: result }, 201);
      }

      // -----------------------------------------------
      // ACTION: track-batch
      // -----------------------------------------------
      case "track-batch": {
        const { competitors } = body as { competitors: CompetitorInput[] };
        if (!Array.isArray(competitors) || competitors.length === 0) {
          return jsonResponse(
            { error: "competitors must be a non-empty array" },
            400,
          );
        }

        const results: Array<TrackResult | { error: string }> = [];
        for (const comp of competitors) {
          const result = await trackCompetitor(supabase, comp);
          results.push(result);
        }
        return jsonResponse({ action: "track-batch", results }, 201);
      }

      // -----------------------------------------------
      // ACTION: generate-alternative
      // -----------------------------------------------
      case "generate-alternative": {
        const { competitorId } = body as { competitorId: string };
        if (!competitorId) {
          return jsonResponse({ error: "competitorId is required" }, 400);
        }

        const result = await generateAlternativePage(supabase, competitorId);
        if ("error" in result) {
          return jsonResponse({ error: result.error }, 500);
        }
        return jsonResponse({ action: "generate-alternative", page: result }, 201);
      }

      // -----------------------------------------------
      // ACTION: generate-all
      // Generates alternative pages for all active competitors
      // -----------------------------------------------
      case "generate-all": {
        const { data: competitors, error: listErr } = await supabase
          .from("competitor_tracking")
          .select("id, competitor_name, our_alternative_page_id")
          .in("status", ["targeting", "monitoring", "opportunity"]);

        if (listErr) {
          return jsonResponse({ error: listErr.message }, 500);
        }

        const pending = (competitors ?? []).filter(
          (c: { our_alternative_page_id: string | null }) => !c.our_alternative_page_id,
        );

        const results: Array<AlternativePageResult | { error: string }> = [];
        for (const comp of pending) {
          const result = await generateAlternativePage(supabase, comp.id);
          results.push(result);
          // Rate limit delay
          await new Promise((r) => setTimeout(r, 1000));
        }

        return jsonResponse({
          action: "generate-all",
          total_competitors: competitors?.length ?? 0,
          already_have_page: (competitors?.length ?? 0) - pending.length,
          generated: results.filter((r) => !("error" in r)).length,
          errors: results.filter((r) => "error" in r),
          pages: results.filter((r) => !("error" in r)),
        });
      }

      // -----------------------------------------------
      // ACTION: list
      // -----------------------------------------------
      case "list": {
        const { data, error } = await supabase
          .from("competitor_tracking")
          .select(
            "id, competitor_name, competitor_domain, status, opportunity_score, our_alternative_page_id",
          )
          .order("competitor_name");

        if (error) {
          return jsonResponse({ error: error.message }, 500);
        }
        return jsonResponse({ action: "list", competitors: data });
      }

      default:
        return jsonResponse(
          {
            error: `Unknown action: "${action}"`,
            available_actions: [
              "track",
              "track-batch",
              "generate-alternative",
              "generate-all",
              "list",
            ],
          },
          400,
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Competitor intelligence error:", message);
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
