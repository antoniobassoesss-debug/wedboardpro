import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// =============================================
// TYPES
// =============================================

interface VariableDefinition {
  name: string;
  type: "string" | "number";
  required: boolean;
  description?: string;
}

interface TemplateDefinition {
  name: string;
  description: string;
  template_type: "location" | "comparison" | "how_to" | "listicle" | "glossary" | "custom";
  url_pattern: string;
  title_pattern: string;
  meta_pattern: string;
  content_structure: string[];
  keyword_pattern: string;
  variables: VariableDefinition[];
  schema_type?: string;
}

interface DataPoint {
  [key: string]: string | number;
}

interface GenerateRequest {
  templateId: string;
  dataSource: DataPoint[];
}

interface GenerateResult {
  total_submitted: number;
  pages_created: number;
  pages_skipped: number;
  errors: Array<{ variables: DataPoint; error: string }>;
  pages: Array<{ id: string; slug: string; title: string }>;
}

interface BatchProgress {
  batch: number;
  total_batches: number;
  created: number;
  skipped: number;
  errors: number;
}

// =============================================
// TEMPLATE DEFINITIONS
// =============================================

const BUILT_IN_TEMPLATES: Record<string, TemplateDefinition> = {
  location: {
    name: "Wedding Planners by City",
    description:
      "Location-based landing pages targeting wedding planners in specific US cities",
    template_type: "location",
    url_pattern: "/wedding-planners/{city}-{state}",
    title_pattern:
      "Wedding Planners in {City}, {State} - Plan Your Perfect Day",
    meta_pattern:
      "Find professional wedding planners in {City}, {State}. Compare services, read reviews, and book your perfect wedding planner.",
    content_structure: [
      "intro",
      "why-{city}",
      "services",
      "pricing",
      "how-wedboardpro-helps",
      "cta",
    ],
    keyword_pattern: "wedding planners {city} {state}",
    variables: [
      { name: "city", type: "string", required: true, description: "City name" },
      { name: "state", type: "string", required: true, description: "State abbreviation" },
      { name: "state_full", type: "string", required: false, description: "Full state name" },
      { name: "population", type: "number", required: false, description: "City population" },
      { name: "venues_count", type: "number", required: false, description: "Number of wedding venues" },
      { name: "avg_wedding_cost", type: "number", required: false, description: "Average wedding cost in area" },
    ],
    schema_type: "LocalBusiness",
  },
  comparison: {
    name: "WedBoardPro vs Competitors",
    description:
      "Comparison pages positioning WedBoardPro against competitor wedding planning tools",
    template_type: "comparison",
    url_pattern: "/vs/{competitor_slug}",
    title_pattern:
      "WedBoardPro vs {Competitor} - Best Wedding Planning Software",
    meta_pattern:
      "Compare WedBoardPro and {Competitor} side-by-side. See features, pricing, and which wedding planning software is right for your business.",
    content_structure: [
      "comparison-table",
      "feature-breakdown",
      "pricing",
      "who-best-for",
      "migration",
      "cta",
    ],
    keyword_pattern: "wedboardpro vs {competitor_slug}",
    variables: [
      { name: "competitor", type: "string", required: true, description: "Competitor name" },
      { name: "competitor_slug", type: "string", required: true, description: "URL-safe competitor name" },
      { name: "competitor_price", type: "string", required: false, description: "Competitor starting price" },
      { name: "competitor_description", type: "string", required: false, description: "Brief competitor description" },
      { name: "competitor_weakness", type: "string", required: false, description: "Key competitor weakness" },
    ],
    schema_type: "Article",
  },
  resource: {
    name: "Free Resources for Wedding Planners",
    description:
      "Resource and tool pages offering free utilities for wedding planners",
    template_type: "how_to",
    url_pattern: "/resources/{resource_slug}",
    title_pattern: "{ResourceName} for Wedding Planners - Free Tool",
    meta_pattern:
      "Free {resource_name} designed for professional wedding planners. {resource_description}",
    content_structure: [
      "tool-description",
      "how-to-use",
      "tips",
      "related-resources",
      "cta",
    ],
    keyword_pattern: "{resource_name} wedding planners",
    variables: [
      { name: "resource_name", type: "string", required: true, description: "Resource name" },
      { name: "resource_slug", type: "string", required: true, description: "URL-safe resource name" },
      { name: "resource_description", type: "string", required: false, description: "Short description" },
      { name: "resource_type", type: "string", required: false, description: "Type: calculator, checklist, template, guide" },
    ],
    schema_type: "HowTo",
  },
};

// =============================================
// OPENAI SYSTEM PROMPTS PER TEMPLATE TYPE
// =============================================

function getSystemPrompt(templateType: string): string {
  const base = `You are an expert SEO content writer for WedBoardPro, a B2B SaaS platform for professional wedding planners (NOT couples). Write content that is unique, valuable, and avoids thin content penalties.

## Rules
- Every page must provide genuine value — not just swapped variables
- Include location/competitor/topic-specific details that make the content unique
- Use natural language, avoid keyword stuffing
- Write for professional wedding planners running a business
- Include internal links using markdown: [text](/path)
- Include at least one external reference link to an authoritative source
- Tone: Professional, warm, never condescending
- No exclamation points, no marketing buzzwords without substance`;

  const specific: Record<string, string> = {
    location: `
## Location Page Guidelines
- Include genuine local information: popular venues, local wedding trends, seasonal considerations
- Mention area-specific pricing context and market size
- Reference local wedding traditions or cultural elements when relevant
- Include at least 3 location-specific details that could NOT be swapped with another city
- Structure: Brief intro → Why this city for weddings → Services available → Local pricing → How WedBoardPro helps → CTA
- Link to related city pages and resource pages internally`,

    comparison: `
## Comparison Page Guidelines
- Be honest and balanced — acknowledge competitor strengths
- Lead with a feature comparison table (markdown table format)
- Highlight genuine differentiators, not invented ones
- Address "who is each tool best for?" clearly
- Include pricing comparison with specific numbers
- Add a migration section explaining how to switch
- WedBoardPro advantages: all-in-one platform, wedding-specific features, European pricing
- Structure: Comparison table → Feature breakdown → Pricing → Who it's best for → Migration guide → CTA`,

    how_to: `
## Resource/How-To Page Guidelines
- Focus on providing immediate, actionable value
- Include step-by-step instructions with clear numbered steps
- Add practical tips that demonstrate expertise
- Mention related resources and tools
- Position WedBoardPro as the tool that makes the process easier (subtle, not salesy)
- Structure: What this resource does → Step-by-step usage → Pro tips → Related resources → CTA`,
  };

  return base + (specific[templateType] ?? "");
}

function buildContentPrompt(
  template: {
    title_template: string;
    content_template: string;
    template_type: string;
  },
  variables: DataPoint,
  interpolatedTitle: string,
  contentStructure: string[],
): string {
  const sections = contentStructure
    .map((s) => interpolateString(s, variables))
    .join(", ");

  return `Write a complete blog post for the following page:

**Title**: ${interpolatedTitle}
**Template type**: ${template.template_type}
**Content sections to include**: ${sections}
**Variables available**: ${JSON.stringify(variables)}

## Output Format (respond with ONLY valid JSON, no markdown code fences)

{
  "content": "Full markdown content with H2/H3 structure, internal links, external links, and at least one image placeholder. Minimum 800 words.",
  "excerpt": "2-3 sentence excerpt under 200 characters"
}

IMPORTANT:
- Do NOT include the H1 in the content (it's handled separately)
- Make content genuinely unique to these specific variables
- Include at least 2 internal links to other WedBoardPro pages
- Include at least 1 external authoritative link
- Include at least 1 image placeholder: ![alt text](image-url)
- Use the specific variable data to create content that could NOT be used for a different page`;
}

// =============================================
// VARIABLE INTERPOLATION
// =============================================

/**
 * Replaces {variable} placeholders in a string with values from data.
 * Supports: {city}, {City} (capitalized), {CITY} (uppercase), {city_slug} (lowered+hyphenated)
 */
function interpolateString(template: string, data: DataPoint): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    // Check for exact match first
    if (key in data) return String(data[key]);

    // Check lowercase version
    const lower = key.toLowerCase();
    if (lower in data) {
      const val = String(data[lower]);
      // {City} → capitalize first letter
      if (key[0] === key[0].toUpperCase() && key !== key.toUpperCase()) {
        return val.charAt(0).toUpperCase() + val.slice(1);
      }
      // {CITY} → all uppercase
      if (key === key.toUpperCase()) {
        return val.toUpperCase();
      }
      return val;
    }

    // Check for compound keys like ResourceName → resource_name
    const snakeCase = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
    if (snakeCase in data) {
      const val = String(data[snakeCase]);
      // PascalCase key → capitalize each word
      if (key[0] === key[0].toUpperCase()) {
        return val
          .split(/[\s_-]+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
      return val;
    }

    return `{${key}}`;
  });
}

/**
 * Generates a URL slug from the interpolated URL pattern.
 */
function buildSlug(urlPattern: string, data: DataPoint): string {
  return interpolateString(urlPattern, data)
    .toLowerCase()
    .replace(/[^a-z0-9/\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// =============================================
// SCHEMA GENERATION (inline, simplified)
// =============================================

const BASE_URL = "https://wedboardpro.com";

function generateSchema(
  schemaType: string,
  title: string,
  meta: string,
  urlPath: string,
  variables: DataPoint,
): Record<string, unknown> {
  const fullUrl = `${BASE_URL}${urlPath}`;
  const now = new Date().toISOString();

  const publisher = {
    "@type": "Organization",
    name: "WedBoardPro",
    url: BASE_URL,
    logo: { "@type": "ImageObject", url: `${BASE_URL}/logo.png` },
  };

  switch (schemaType) {
    case "LocalBusiness":
      return {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: title,
        url: fullUrl,
        description: meta,
        address: {
          "@type": "PostalAddress",
          addressLocality: String(variables.city ?? ""),
          addressRegion: String(variables.state ?? variables.state_full ?? ""),
          addressCountry: "US",
        },
        parentOrganization: publisher,
        mainEntityOfPage: { "@type": "WebPage", "@id": fullUrl },
      };

    case "HowTo":
      return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: title,
        description: meta,
        url: fullUrl,
        mainEntityOfPage: { "@type": "WebPage", "@id": fullUrl },
      };

    case "Article":
    default:
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description: meta,
        url: fullUrl,
        datePublished: now,
        dateModified: now,
        author: publisher,
        publisher,
        mainEntityOfPage: { "@type": "WebPage", "@id": fullUrl },
        inLanguage: "en-US",
      };
  }
}

// =============================================
// TEMPLATE INSERTION
// =============================================

async function insertTemplate(
  supabase: SupabaseClient,
  def: TemplateDefinition,
): Promise<{ id: string } | { error: string }> {
  const contentTemplate = buildContentTemplate(def);

  const { data, error } = await supabase
    .from("programmatic_templates")
    .insert({
      name: def.name,
      description: def.description,
      template_type: def.template_type,
      title_template: def.title_pattern,
      meta_description_template: def.meta_pattern,
      content_template: contentTemplate,
      variables_schema: def.variables,
      target_keyword_pattern: def.keyword_pattern,
      estimated_pages: 0,
      status: "active",
      pages_generated: 0,
      pages_published: 0,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }
  return { id: data.id };
}

function buildContentTemplate(def: TemplateDefinition): string {
  const sections = def.content_structure
    .map((s) => `## ${sectionToHeading(s)}`)
    .join("\n\n{section_content}\n\n");

  return `# ${def.title_pattern}\n\n${sections}`;
}

function sectionToHeading(section: string): string {
  return section
    .replace(/^\{|\}$/g, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// =============================================
// PAGE GENERATION
// =============================================

const BATCH_SIZE = 10;
const OPENAI_DELAY_MS = 500;

async function generatePages(
  supabase: SupabaseClient,
  templateId: string,
  dataSource: DataPoint[],
): Promise<GenerateResult> {
  // Fetch template
  const { data: template, error: tmplError } = await supabase
    .from("programmatic_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (tmplError || !template) {
    return {
      total_submitted: dataSource.length,
      pages_created: 0,
      pages_skipped: 0,
      errors: [{ variables: {}, error: `Template not found: ${tmplError?.message ?? "no data"}` }],
      pages: [],
    };
  }

  // Validate template is active
  if (template.status !== "active") {
    return {
      total_submitted: dataSource.length,
      pages_created: 0,
      pages_skipped: 0,
      errors: [{ variables: {}, error: `Template status is "${template.status}", must be "active"` }],
      pages: [],
    };
  }

  // Parse content structure from content_template
  const contentStructure: string[] = parseContentStructure(template);
  const schemaType = detectSchemaType(template.template_type);

  // Fetch all existing slugs for this template to check duplicates
  const { data: existingSlugs } = await supabase
    .from("programmatic_pages")
    .select("slug")
    .eq("template_id", templateId);
  const slugSet = new Set((existingSlugs ?? []).map((r: { slug: string }) => r.slug));

  const result: GenerateResult = {
    total_submitted: dataSource.length,
    pages_created: 0,
    pages_skipped: 0,
    errors: [],
    pages: [],
  };

  // Process in batches
  const totalBatches = Math.ceil(dataSource.length / BATCH_SIZE);

  for (let batch = 0; batch < totalBatches; batch++) {
    const start = batch * BATCH_SIZE;
    const items = dataSource.slice(start, start + BATCH_SIZE);

    const progress: BatchProgress = {
      batch: batch + 1,
      total_batches: totalBatches,
      created: result.pages_created,
      skipped: result.pages_skipped,
      errors: result.errors.length,
    };
    console.log(`Processing batch ${progress.batch}/${progress.total_batches}`);

    // Process items sequentially within a batch to avoid rate limits
    for (const dataPoint of items) {
      try {
        const pageResult = await generateSinglePage(
          supabase,
          template,
          dataPoint,
          contentStructure,
          schemaType,
          slugSet,
        );

        if (pageResult.skipped) {
          result.pages_skipped++;
        } else if (pageResult.error) {
          result.errors.push({ variables: dataPoint, error: pageResult.error });
        } else if (pageResult.page) {
          result.pages_created++;
          result.pages.push(pageResult.page);
          slugSet.add(pageResult.page.slug);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        result.errors.push({ variables: dataPoint, error: msg });
      }
    }

    // Delay between batches
    if (batch < totalBatches - 1) {
      await delay(OPENAI_DELAY_MS);
    }
  }

  // Update template counters
  await supabase
    .from("programmatic_templates")
    .update({
      pages_generated: (template.pages_generated ?? 0) + result.pages_created,
      estimated_pages: Math.max(
        template.estimated_pages ?? 0,
        (template.pages_generated ?? 0) + result.pages_created,
      ),
    })
    .eq("id", templateId);

  return result;
}

async function generateSinglePage(
  supabase: SupabaseClient,
  template: Record<string, unknown>,
  data: DataPoint,
  contentStructure: string[],
  schemaType: string,
  existingSlugs: Set<string>,
): Promise<{
  page?: { id: string; slug: string; title: string };
  skipped?: boolean;
  error?: string;
}> {
  const titleTemplate = template.title_template as string;
  const metaTemplate = template.meta_description_template as string;
  const keywordPattern = template.target_keyword_pattern as string;
  const templateType = template.template_type as string;

  // Build URL pattern from content_template's first line or infer from type
  const urlPattern = inferUrlPattern(template);
  const slug = buildSlug(urlPattern, data);

  // Check uniqueness
  if (existingSlugs.has(slug)) {
    return { skipped: true };
  }

  // Also check DB (race condition safety)
  const { data: existing } = await supabase
    .from("programmatic_pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return { skipped: true };
  }

  // Interpolate template fields
  const title = interpolateString(titleTemplate, data);
  const meta = interpolateString(metaTemplate, data);
  const keyword = interpolateString(keywordPattern ?? "", data);

  // Enforce length limits
  const finalTitle = title.length > 60 ? title.substring(0, 57) + "..." : title;
  const finalMeta = meta.length > 160 ? meta.substring(0, 157) + "..." : meta;

  // Generate content via OpenAI
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return { error: "OPENAI_API_KEY not configured" };
  }

  const systemPrompt = getSystemPrompt(templateType);
  const userPrompt = buildContentPrompt(
    template as { title_template: string; content_template: string; template_type: string },
    data,
    title,
    contentStructure,
  );

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
        temperature: 0.75,
        max_tokens: 3000,
      }),
    },
  );

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text();
    console.error("OpenAI error:", errText);
    return { error: `OpenAI ${openaiResponse.status}` };
  }

  const openaiData = await openaiResponse.json();
  const rawContent = openaiData.choices?.[0]?.message?.content;

  if (!rawContent) {
    return { error: "Empty OpenAI response" };
  }

  let generated: { content: string; excerpt?: string };
  try {
    const cleaned = rawContent
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```$/m, "")
      .trim();
    generated = JSON.parse(cleaned);
  } catch {
    return { error: "Failed to parse OpenAI JSON response" };
  }

  if (!generated.content) {
    return { error: "Generated content is empty" };
  }

  // Generate schema markup
  const urlPath = slug.startsWith("/") ? slug : `/${slug}`;
  const schema = generateSchema(schemaType, finalTitle, finalMeta, urlPath, data);

  // Create SEO page first
  const { data: seoPage, error: seoErr } = await supabase
    .from("seo_pages")
    .insert({
      page_type: "programmatic",
      url_path: urlPath,
      title_tag: finalTitle,
      meta_description: finalMeta,
      h1_tag: title,
      target_keyword: keyword,
      schema_markup: schema,
    })
    .select("id")
    .single();

  if (seoErr) {
    return { error: `SEO page insert failed: ${seoErr.message}` };
  }

  // Create programmatic page
  const { data: page, error: pageErr } = await supabase
    .from("programmatic_pages")
    .insert({
      template_id: template.id as string,
      seo_page_id: seoPage.id,
      title: finalTitle,
      slug,
      meta_description: finalMeta,
      content: generated.content,
      target_keyword: keyword,
      variables_used: data,
      status: "draft",
      quality_score: 0,
    })
    .select("id, slug, title")
    .single();

  if (pageErr) {
    // Clean up the orphaned seo_page
    await supabase.from("seo_pages").delete().eq("id", seoPage.id);
    return { error: `Page insert failed: ${pageErr.message}` };
  }

  // Run audit if available
  try {
    const { data: auditData } = await supabase.rpc("run_seo_audit", {
      p_page_id: seoPage.id,
    });
    if (auditData?.overall_score != null) {
      await supabase
        .from("programmatic_pages")
        .update({ quality_score: auditData.overall_score })
        .eq("id", page.id);
    }
  } catch {
    // Audit is optional — page is still created
  }

  return { page: { id: page.id, slug: page.slug, title: page.title } };
}

// =============================================
// HELPERS
// =============================================

function parseContentStructure(template: Record<string, unknown>): string[] {
  const raw = template.content_template as string;
  // Extract H2 section names from the content template
  const matches = raw.match(/^## (.+)$/gm);
  if (matches && matches.length > 0) {
    return matches.map((m) =>
      m
        .replace(/^## /, "")
        .toLowerCase()
        .replace(/\s+/g, "-"),
    );
  }
  // Fallback: generic sections
  return ["introduction", "details", "conclusion"];
}

function detectSchemaType(templateType: string): string {
  switch (templateType) {
    case "location":
      return "LocalBusiness";
    case "comparison":
      return "Article";
    case "how_to":
      return "HowTo";
    default:
      return "Article";
  }
}

function inferUrlPattern(template: Record<string, unknown>): string {
  const titleTemplate = template.title_template as string;
  const type = template.template_type as string;

  // Build a reasonable URL pattern from template type and title
  switch (type) {
    case "location":
      return "/wedding-planners/{city}-{state}";
    case "comparison":
      return "/vs/{competitor_slug}";
    case "how_to":
      return "/resources/{resource_slug}";
    default: {
      // Generate from title: lowercase, replace spaces with hyphens, keep {vars}
      return (
        "/" +
        titleTemplate
          .toLowerCase()
          .replace(/[^a-z0-9\s{}-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
      );
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
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
      // ACTION: setup-templates
      // Inserts the 3 built-in templates into the DB
      // -----------------------------------------------
      case "setup-templates": {
        const results: Record<string, { id?: string; error?: string }> = {};

        for (const [key, def] of Object.entries(BUILT_IN_TEMPLATES)) {
          // Check if template with same name already exists
          const { data: existing } = await supabase
            .from("programmatic_templates")
            .select("id")
            .eq("name", def.name)
            .maybeSingle();

          if (existing) {
            results[key] = { id: existing.id, error: "already exists" };
            continue;
          }

          const res = await insertTemplate(supabase, def);
          results[key] = res;
        }

        return jsonResponse({ action: "setup-templates", results });
      }

      // -----------------------------------------------
      // ACTION: create-template
      // Inserts a custom template definition
      // -----------------------------------------------
      case "create-template": {
        const { template } = body as { template: TemplateDefinition };
        if (!template?.name || !template?.title_pattern) {
          return jsonResponse(
            { error: "template.name and template.title_pattern are required" },
            400,
          );
        }

        const res = await insertTemplate(supabase, template);
        if ("error" in res) {
          return jsonResponse({ error: res.error }, 500);
        }
        return jsonResponse({ action: "create-template", template_id: res.id }, 201);
      }

      // -----------------------------------------------
      // ACTION: generate
      // Generates pages from a template + data source
      // -----------------------------------------------
      case "generate": {
        const { templateId, dataSource } = body as GenerateRequest;

        if (!templateId) {
          return jsonResponse({ error: "templateId is required" }, 400);
        }
        if (!Array.isArray(dataSource) || dataSource.length === 0) {
          return jsonResponse(
            { error: "dataSource must be a non-empty array" },
            400,
          );
        }

        const result = await generatePages(supabase, templateId, dataSource);
        return jsonResponse({ action: "generate", result });
      }

      // -----------------------------------------------
      // ACTION: list-templates
      // Returns all templates with their stats
      // -----------------------------------------------
      case "list-templates": {
        const { data, error } = await supabase
          .from("programmatic_templates")
          .select("id, name, template_type, status, pages_generated, pages_published, estimated_pages")
          .order("created_at", { ascending: false });

        if (error) {
          return jsonResponse({ error: error.message }, 500);
        }
        return jsonResponse({ action: "list-templates", templates: data });
      }

      // -----------------------------------------------
      // ACTION: template-preview
      // Shows what a page would look like with given data
      // -----------------------------------------------
      case "template-preview": {
        const { templateId: previewId, variables: previewVars } = body as {
          templateId: string;
          variables: DataPoint;
        };

        if (!previewId || !previewVars) {
          return jsonResponse(
            { error: "templateId and variables are required" },
            400,
          );
        }

        const { data: tmpl, error: tmplErr } = await supabase
          .from("programmatic_templates")
          .select("*")
          .eq("id", previewId)
          .single();

        if (tmplErr || !tmpl) {
          return jsonResponse({ error: "Template not found" }, 404);
        }

        const urlPattern = inferUrlPattern(tmpl);
        const slug = buildSlug(urlPattern, previewVars);
        const title = interpolateString(tmpl.title_template, previewVars);
        const meta = interpolateString(
          tmpl.meta_description_template,
          previewVars,
        );
        const keyword = interpolateString(
          tmpl.target_keyword_pattern ?? "",
          previewVars,
        );

        return jsonResponse({
          action: "template-preview",
          preview: {
            slug,
            title: title.length > 60 ? title.substring(0, 57) + "..." : title,
            meta_description:
              meta.length > 160 ? meta.substring(0, 157) + "..." : meta,
            target_keyword: keyword,
            url: `${BASE_URL}${slug.startsWith("/") ? slug : "/" + slug}`,
          },
        });
      }

      default:
        return jsonResponse(
          {
            error: `Unknown action: "${action}"`,
            available_actions: [
              "setup-templates",
              "create-template",
              "generate",
              "list-templates",
              "template-preview",
            ],
          },
          400,
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Programmatic SEO engine error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
