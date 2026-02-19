import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =============================================
// TYPES
// =============================================

export type SchemaType =
  | "Article"
  | "FAQPage"
  | "HowTo"
  | "SoftwareApplication"
  | "LocalBusiness";

export interface SchemaPageInput {
  url_path: string;
  title_tag?: string | null;
  meta_description?: string | null;
  h1_tag?: string | null;
  target_keyword?: string | null;
  og_image_url?: string | null;
  page_type?: string | null;
  blog_post?: {
    title?: string | null;
    slug?: string | null;
    content?: string | null;
    excerpt?: string | null;
    meta_description?: string | null;
    hero_image_url?: string | null;
    hero_image_alt?: string | null;
    category?: string | null;
    tags?: string[] | null;
    published_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface HowToStep {
  name: string;
  text: string;
  position: number;
}

type JsonLd = Record<string, unknown>;

// =============================================
// CONSTANTS
// =============================================

const BASE_URL = "https://wedboardpro.com";

const ORGANIZATION: JsonLd = {
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "WedBoardPro",
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/logo.png`,
  },
  sameAs: [
    "https://twitter.com/wedboardpro",
    "https://linkedin.com/company/wedboardpro",
    "https://instagram.com/wedboardpro",
  ],
};

const PUBLISHER: JsonLd = {
  "@type": "Organization",
  name: "WedBoardPro",
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/logo.png`,
  },
};

// =============================================
// CONTENT PARSERS
// =============================================

/**
 * Detects FAQ-style question/answer pairs from markdown content.
 * Matches patterns like:
 *   ## What is...?\n Answer text
 *   **Q: Question?**\n Answer text
 *   ### Question?\n Answer text
 */
export function extractFAQItems(content: string): FAQItem[] {
  const items: FAQItem[] = [];
  if (!content) return items;

  // Pattern 1: Header-based Q&A (## or ### ending with ?)
  const headerFaqRegex =
    /^#{2,3}\s+(.+\?)\s*\n([\s\S]*?)(?=\n#{1,3}\s|\n---|\n\*\*Q:|$)/gm;
  let match: RegExpExecArray | null;

  while ((match = headerFaqRegex.exec(content)) !== null) {
    const question = match[1].trim();
    const answer = cleanAnswerText(match[2]);
    if (question && answer) {
      items.push({ question, answer });
    }
  }

  if (items.length > 0) return items;

  // Pattern 2: Bold Q: format — **Q: Question?** \n Answer
  const boldFaqRegex =
    /\*\*Q:\s*(.+?\?)\s*\*\*\s*\n([\s\S]*?)(?=\*\*Q:|\n#{1,3}\s|\n---|\n\*\*A:|$)/gm;

  while ((match = boldFaqRegex.exec(content)) !== null) {
    const question = match[1].trim();
    const answer = cleanAnswerText(match[2]);
    if (question && answer) {
      items.push({ question, answer });
    }
  }

  return items;
}

/**
 * Detects step-by-step instructions from markdown content.
 * Matches patterns like:
 *   ## Step 1: Do something
 *   1. First step description
 *   ### Step 1 — Title
 */
export function extractHowToSteps(content: string): HowToStep[] {
  const steps: HowToStep[] = [];
  if (!content) return steps;

  // Pattern 1: Header-based steps (## Step N: Title)
  const headerStepRegex =
    /^#{2,3}\s+(?:Step\s+\d+[:.—–-]\s*)(.+)\s*\n([\s\S]*?)(?=\n#{1,3}\s+(?:Step\s+\d+)|\n---|\n#{1,2}\s|$)/gim;
  let match: RegExpExecArray | null;
  let pos = 1;

  while ((match = headerStepRegex.exec(content)) !== null) {
    const name = match[1].trim();
    const text = cleanAnswerText(match[2]);
    if (name && text) {
      steps.push({ name, text, position: pos++ });
    }
  }

  if (steps.length >= 2) return steps;

  // Pattern 2: Ordered list items (1. Step text)
  steps.length = 0;
  pos = 1;
  const listStepRegex = /^\d+\.\s+\*?\*?(.+?)\*?\*?\s*(?:\n(?!\d+\.)(.+))?/gm;

  while ((match = listStepRegex.exec(content)) !== null) {
    const name = match[1].replace(/\*\*/g, "").trim();
    const text = match[2]?.trim() ?? name;
    if (name) {
      steps.push({ name, text, position: pos++ });
    }
  }

  // Only return if there are at least 2 sequential steps
  return steps.length >= 2 ? steps : [];
}

/**
 * Detects the best schema type by analyzing content patterns.
 */
export function detectSchemaType(page: SchemaPageInput): SchemaType {
  const content = page.blog_post?.content ?? "";
  const pageType = page.page_type ?? "blog";

  if (pageType === "product" || pageType === "pricing") {
    return "SoftwareApplication";
  }
  if (pageType === "location") {
    return "LocalBusiness";
  }

  const faqItems = extractFAQItems(content);
  if (faqItems.length >= 3) {
    return "FAQPage";
  }

  const steps = extractHowToSteps(content);
  if (steps.length >= 3) {
    return "HowTo";
  }

  return "Article";
}

// =============================================
// SCHEMA BUILDERS
// =============================================

function buildArticleSchema(page: SchemaPageInput): JsonLd {
  const blog = page.blog_post;
  const headline = page.title_tag ?? blog?.title ?? page.h1_tag ?? "";
  const description =
    page.meta_description ?? blog?.meta_description ?? blog?.excerpt ?? "";
  const imageUrl =
    page.og_image_url ?? blog?.hero_image_url ?? `${BASE_URL}/og-default.png`;
  const publishedAt =
    blog?.published_at ?? blog?.created_at ?? new Date().toISOString();
  const modifiedAt = blog?.updated_at ?? publishedAt;
  const fullUrl = `${BASE_URL}${page.url_path}`;

  const schema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image: imageUrl,
    url: fullUrl,
    datePublished: publishedAt,
    dateModified: modifiedAt,
    author: {
      "@type": "Organization",
      name: "WedBoardPro",
      url: BASE_URL,
    },
    publisher: PUBLISHER,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
    inLanguage: "en-US",
    articleSection: blog?.category ?? "Wedding Planning",
  };

  if (page.target_keyword) {
    schema.keywords = page.target_keyword;
  }
  if (blog?.content) {
    const wordCount = blog.content
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    schema.wordCount = wordCount;
  }
  if (blog?.hero_image_alt) {
    schema.image = {
      "@type": "ImageObject",
      url: imageUrl,
      caption: blog.hero_image_alt,
    };
  }

  return schema;
}

function buildFAQPageSchema(
  page: SchemaPageInput,
  faqItems?: FAQItem[],
): JsonLd {
  const items = faqItems ?? extractFAQItems(page.blog_post?.content ?? "");
  const fullUrl = `${BASE_URL}${page.url_path}`;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: page.title_tag ?? page.h1_tag ?? "FAQ",
    url: fullUrl,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
  };
}

function buildHowToSchema(
  page: SchemaPageInput,
  steps?: HowToStep[],
): JsonLd {
  const howToSteps = steps ?? extractHowToSteps(page.blog_post?.content ?? "");
  const fullUrl = `${BASE_URL}${page.url_path}`;
  const description =
    page.meta_description ??
    page.blog_post?.meta_description ??
    page.blog_post?.excerpt ??
    "";
  const imageUrl =
    page.og_image_url ??
    page.blog_post?.hero_image_url ??
    `${BASE_URL}/og-default.png`;

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: page.title_tag ?? page.h1_tag ?? "How To Guide",
    description,
    image: imageUrl,
    url: fullUrl,
    step: howToSteps.map((s) => ({
      "@type": "HowToStep",
      name: s.name,
      text: s.text,
      position: s.position,
      url: `${fullUrl}#step${s.position}`,
    })),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
  };
}

function buildSoftwareApplicationSchema(page: SchemaPageInput): JsonLd {
  const fullUrl = `${BASE_URL}${page.url_path}`;
  const imageUrl =
    page.og_image_url ??
    page.blog_post?.hero_image_url ??
    `${BASE_URL}/og-default.png`;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "WedBoardPro",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Wedding Planning Software",
    operatingSystem: "Web",
    url: fullUrl,
    image: imageUrl,
    description:
      page.meta_description ??
      "The all-in-one operating system for professional wedding planners. Manage clients, vendors, budgets, timelines, and more.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: "29",
      highPrice: "100",
      offerCount: "3",
      offers: [
        {
          "@type": "Offer",
          name: "Basic",
          price: "29",
          priceCurrency: "EUR",
          url: `${BASE_URL}/pricing`,
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "50",
          priceCurrency: "EUR",
          url: `${BASE_URL}/pricing`,
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Enterprise",
          price: "100",
          priceCurrency: "EUR",
          url: `${BASE_URL}/pricing`,
          availability: "https://schema.org/InStock",
        },
      ],
    },
    author: ORGANIZATION,
    publisher: PUBLISHER,
    featureList: [
      "Client & Wedding Management",
      "Vendor CRM",
      "Budget Tracking",
      "Timeline Builder",
      "Seating Charts",
      "Layout Maker",
      "Guest Management",
      "Invoice & Payments",
    ],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
  };
}

function buildLocalBusinessSchema(page: SchemaPageInput): JsonLd {
  const fullUrl = `${BASE_URL}${page.url_path}`;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: page.title_tag ?? page.h1_tag ?? "WedBoardPro",
    url: fullUrl,
    image:
      page.og_image_url ??
      page.blog_post?.hero_image_url ??
      `${BASE_URL}/og-default.png`,
    description:
      page.meta_description ??
      "Professional wedding planning software and services.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "PT",
    },
    parentOrganization: ORGANIZATION,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
  };
}

// =============================================
// GRAPH BUILDER (combines multiple schema types)
// =============================================

function buildBreadcrumbSchema(page: SchemaPageInput): JsonLd {
  const parts = page.url_path.split("/").filter(Boolean);
  const items: JsonLd[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: BASE_URL,
    },
  ];

  let currentPath = "";
  for (let i = 0; i < parts.length; i++) {
    currentPath += `/${parts[i]}`;
    const name =
      i === parts.length - 1
        ? page.title_tag ?? page.h1_tag ?? parts[i]
        : parts[i].charAt(0).toUpperCase() + parts[i].slice(1);

    items.push({
      "@type": "ListItem",
      position: i + 2,
      name,
      item: `${BASE_URL}${currentPath}`,
    });
  }

  return {
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

// =============================================
// MAIN EXPORT
// =============================================

/**
 * Generates Schema.org JSON-LD markup for a page.
 *
 * When type is omitted, automatically detects the best schema type
 * based on page content (FAQ patterns, HowTo steps, page_type field).
 *
 * Always includes BreadcrumbList and Organization in the @graph.
 */
export function generateSchemaMarkup(
  page: SchemaPageInput,
  type?: SchemaType | string,
): JsonLd {
  const schemaType = (type as SchemaType) ?? detectSchemaType(page);

  let primarySchema: JsonLd;
  switch (schemaType) {
    case "FAQPage":
      primarySchema = buildFAQPageSchema(page);
      break;
    case "HowTo":
      primarySchema = buildHowToSchema(page);
      break;
    case "SoftwareApplication":
      primarySchema = buildSoftwareApplicationSchema(page);
      break;
    case "LocalBusiness":
      primarySchema = buildLocalBusinessSchema(page);
      break;
    case "Article":
    default:
      primarySchema = buildArticleSchema(page);
      break;
  }

  // For Article + FAQ combo (content has both article structure and FAQ items)
  const content = page.blog_post?.content ?? "";
  const faqItems = extractFAQItems(content);
  const hasEmbeddedFAQ = schemaType === "Article" && faqItems.length >= 2;

  // Strip @context from primary — it goes on the graph wrapper
  const { "@context": _ctx, ...primaryWithoutContext } = primarySchema;

  const graphNodes: JsonLd[] = [
    { ...ORGANIZATION },
    primaryWithoutContext,
    buildBreadcrumbSchema(page),
  ];

  // Append FAQ schema alongside Article when content has Q&A sections
  if (hasEmbeddedFAQ) {
    const { "@context": _faqCtx, ...faqWithoutContext } = buildFAQPageSchema(
      page,
      faqItems,
    );
    graphNodes.push(faqWithoutContext);
  }

  return {
    "@context": "https://schema.org",
    "@graph": graphNodes,
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
    const { pageId, type } = body as { pageId?: string; type?: string };

    if (!pageId) {
      return jsonResponse({ error: "pageId is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch page + linked blog post
    const { data: page, error: pageError } = await supabase
      .from("seo_pages")
      .select("*, blog_posts(*)")
      .eq("id", pageId)
      .single();

    if (pageError || !page) {
      return jsonResponse(
        { error: `Page not found: ${pageError?.message ?? "no data"}` },
        404,
      );
    }

    // Build page input from DB row
    const pageInput: SchemaPageInput = {
      url_path: page.url_path,
      title_tag: page.title_tag,
      meta_description: page.meta_description,
      h1_tag: page.h1_tag,
      target_keyword: page.target_keyword,
      og_image_url: page.og_image_url,
      page_type: page.page_type,
      blog_post: page.blog_posts
        ? {
            title: page.blog_posts.title,
            slug: page.blog_posts.slug,
            content: page.blog_posts.content,
            excerpt: page.blog_posts.excerpt,
            meta_description: page.blog_posts.meta_description,
            hero_image_url: page.blog_posts.hero_image_url,
            hero_image_alt: page.blog_posts.hero_image_alt,
            category: page.blog_posts.category,
            tags: page.blog_posts.tags,
            published_at: page.blog_posts.published_at,
            created_at: page.blog_posts.created_at,
            updated_at: page.blog_posts.updated_at,
          }
        : null,
    };

    const detectedType = type ?? detectSchemaType(pageInput);
    const schema = generateSchemaMarkup(pageInput, type);

    // Persist schema to seo_pages
    const { error: updateError } = await supabase
      .from("seo_pages")
      .update({ schema_markup: schema })
      .eq("id", pageId);

    if (updateError) {
      console.error("Failed to save schema:", updateError.message);
    }

    return jsonResponse({
      page_id: pageId,
      detected_type: detectedType,
      requested_type: type ?? null,
      schema,
      saved: !updateError,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Schema generation failed:", message);
    return jsonResponse({ error: message }, 500);
  }
});

// =============================================
// HELPERS
// =============================================

function cleanAnswerText(raw: string): string {
  return raw
    .replace(/^\s*\*?\*?A:\s*/i, "")
    .replace(/\*\*/g, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
