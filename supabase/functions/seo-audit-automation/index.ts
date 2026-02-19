import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  countWords,
  calculateKeywordDensity,
  extractHeaders,
  extractLinks,
  extractImages,
  calculateFleschKincaid,
} from "./audit-utils.ts";

interface AuditIssue {
  type: "critical" | "warning" | "info";
  category: "technical" | "content";
  check: string;
  message: string;
  recommendation: string;
  points_deducted: number;
}

interface AutoFix {
  field: string;
  original: string;
  fixed: string;
  reason: string;
}

interface AuditResponse {
  page_id: string;
  url_path: string;
  technical_score: number;
  content_score: number;
  overall_score: number;
  status: "approved" | "pending_review" | "draft";
  critical_issues: AuditIssue[];
  warnings: AuditIssue[];
  info: AuditIssue[];
  recommendations: string[];
  auto_fixed_issues: AutoFix[];
  execution_time_ms: number;
}

// -- Scoring weights --

const TECHNICAL_CHECKS = {
  title_exists: 10,
  title_length: 15,
  meta_exists: 10,
  meta_length: 15,
  slug_format: 20,
  single_h1: 20,
  schema_markup: 10,
} as const;

const CONTENT_CHECKS = {
  word_count: 25,
  keyword_density: 20,
  readability: 20,
  internal_links: 15,
  external_links: 5,
  images: 15,
} as const;

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
    const { pageId } = await req.json();
    if (!pageId) {
      return jsonResponse({ error: "pageId is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch SEO page with linked blog post
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

    const blogPost = page.blog_posts;
    const content: string = blogPost?.content ?? "";
    const targetKeyword: string =
      page.target_keyword ?? blogPost?.primary_keyword ?? "";

    const issues: AuditIssue[] = [];
    const autoFixes: AutoFix[] = [];
    const pageUpdates: Record<string, unknown> = {};

    // =============================================
    // TECHNICAL SEO CHECKS (100 points)
    // =============================================
    let technicalDeductions = 0;

    // 1. Title tag
    const titleTag = page.title_tag ?? blogPost?.title ?? "";
    if (!titleTag) {
      technicalDeductions += TECHNICAL_CHECKS.title_exists + TECHNICAL_CHECKS.title_length;
      issues.push({
        type: "critical",
        category: "technical",
        check: "title_tag",
        message: "Missing title tag",
        recommendation: "Add a title tag between 30-60 characters that includes your target keyword.",
        points_deducted: TECHNICAL_CHECKS.title_exists + TECHNICAL_CHECKS.title_length,
      });
    } else {
      const len = titleTag.length;
      if (len < 30) {
        technicalDeductions += TECHNICAL_CHECKS.title_length;
        issues.push({
          type: "warning",
          category: "technical",
          check: "title_length",
          message: `Title tag too short (${len} chars, minimum 30)`,
          recommendation: "Expand your title to at least 30 characters for better SEO visibility.",
          points_deducted: TECHNICAL_CHECKS.title_length,
        });
      } else if (len > 60) {
        const truncated = titleTag.substring(0, 57) + "...";
        autoFixes.push({
          field: "title_tag",
          original: titleTag,
          fixed: truncated,
          reason: `Title truncated from ${len} to 60 chars`,
        });
        pageUpdates.title_tag = truncated;
      }
    }

    // 2. Meta description
    const metaDesc = page.meta_description ?? blogPost?.meta_description ?? "";
    if (!metaDesc) {
      technicalDeductions += TECHNICAL_CHECKS.meta_exists + TECHNICAL_CHECKS.meta_length;
      issues.push({
        type: "critical",
        category: "technical",
        check: "meta_description",
        message: "Missing meta description",
        recommendation: "Add a meta description between 120-160 characters that summarizes the page.",
        points_deducted: TECHNICAL_CHECKS.meta_exists + TECHNICAL_CHECKS.meta_length,
      });
    } else {
      const len = metaDesc.length;
      if (len < 120) {
        technicalDeductions += TECHNICAL_CHECKS.meta_length;
        issues.push({
          type: "warning",
          category: "technical",
          check: "meta_description_length",
          message: `Meta description too short (${len} chars, minimum 120)`,
          recommendation: "Expand your meta description to at least 120 characters for better click-through rates.",
          points_deducted: TECHNICAL_CHECKS.meta_length,
        });
      } else if (len > 160) {
        const truncated = metaDesc.substring(0, 157) + "...";
        autoFixes.push({
          field: "meta_description",
          original: metaDesc,
          fixed: truncated,
          reason: `Meta description truncated from ${len} to 160 chars`,
        });
        pageUpdates.meta_description = truncated;
      }
    }

    // 3. URL slug format
    const slug = page.url_path ?? blogPost?.slug ?? "";
    const slugValid = /^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/.test(slug);
    if (!slug) {
      technicalDeductions += TECHNICAL_CHECKS.slug_format;
      issues.push({
        type: "critical",
        category: "technical",
        check: "url_slug",
        message: "Missing URL path",
        recommendation: "Set a URL path using lowercase letters and hyphens.",
        points_deducted: TECHNICAL_CHECKS.slug_format,
      });
    } else if (!slugValid) {
      technicalDeductions += TECHNICAL_CHECKS.slug_format;
      issues.push({
        type: "warning",
        category: "technical",
        check: "url_slug_format",
        message: `URL slug has invalid format: "${slug}"`,
        recommendation: "URL should use lowercase letters, numbers, and hyphens only (e.g., /wedding-planning-guide).",
        points_deducted: TECHNICAL_CHECKS.slug_format,
      });
    }

    // 4. H1 tag (from content or page field)
    const headers = extractHeaders(content);
    const h1Source = page.h1_tag ? [page.h1_tag] : headers.h1;
    if (h1Source.length === 0) {
      technicalDeductions += TECHNICAL_CHECKS.single_h1;
      issues.push({
        type: "critical",
        category: "technical",
        check: "h1_tag",
        message: "No H1 tag found",
        recommendation: "Add exactly one H1 heading that includes your target keyword.",
        points_deducted: TECHNICAL_CHECKS.single_h1,
      });
    } else if (h1Source.length > 1) {
      technicalDeductions += Math.floor(TECHNICAL_CHECKS.single_h1 / 2);
      issues.push({
        type: "warning",
        category: "technical",
        check: "h1_multiple",
        message: `Multiple H1 tags found (${h1Source.length})`,
        recommendation: "Use exactly one H1 per page. Convert extra H1s to H2s.",
        points_deducted: Math.floor(TECHNICAL_CHECKS.single_h1 / 2),
      });
    }

    // 5. Schema markup
    if (!page.schema_markup) {
      technicalDeductions += TECHNICAL_CHECKS.schema_markup;
      issues.push({
        type: "warning",
        category: "technical",
        check: "schema_markup",
        message: "No schema markup configured",
        recommendation: "Add Article or BlogPosting schema markup for rich search results.",
        points_deducted: TECHNICAL_CHECKS.schema_markup,
      });
    }

    const technicalScore = Math.max(0, 100 - technicalDeductions);

    // =============================================
    // CONTENT QUALITY CHECKS (100 points)
    // =============================================
    let contentDeductions = 0;

    // 1. Word count
    const wordCount = countWords(content);
    if (wordCount < 300) {
      contentDeductions += CONTENT_CHECKS.word_count;
      issues.push({
        type: "critical",
        category: "content",
        check: "word_count",
        message: `Word count critically low (${wordCount} words, minimum 800)`,
        recommendation: "Content needs significant expansion. Aim for at least 800 words, ideally 1,500+ for pillar content.",
        points_deducted: CONTENT_CHECKS.word_count,
      });
    } else if (wordCount < 800) {
      const deduction = Math.floor(
        CONTENT_CHECKS.word_count * ((800 - wordCount) / 500),
      );
      contentDeductions += deduction;
      issues.push({
        type: "warning",
        category: "content",
        check: "word_count",
        message: `Word count below minimum (${wordCount} words, minimum 800)`,
        recommendation: "Expand content to at least 800 words for better search ranking potential.",
        points_deducted: deduction,
      });
    }

    // 2. Keyword density
    if (targetKeyword) {
      const density = calculateKeywordDensity(content, targetKeyword);
      if (density === 0) {
        contentDeductions += CONTENT_CHECKS.keyword_density;
        issues.push({
          type: "critical",
          category: "content",
          check: "keyword_density",
          message: `Target keyword "${targetKeyword}" not found in content`,
          recommendation: "Include your target keyword naturally throughout the content, aiming for 0.5-3% density.",
          points_deducted: CONTENT_CHECKS.keyword_density,
        });
      } else if (density < 0.5) {
        const deduction = Math.floor(CONTENT_CHECKS.keyword_density / 2);
        contentDeductions += deduction;
        issues.push({
          type: "warning",
          category: "content",
          check: "keyword_density_low",
          message: `Keyword density too low (${density}%, target 0.5-3%)`,
          recommendation: "Add a few more natural mentions of your target keyword.",
          points_deducted: deduction,
        });
      } else if (density > 3) {
        const deduction = Math.floor(CONTENT_CHECKS.keyword_density / 2);
        contentDeductions += deduction;
        issues.push({
          type: "warning",
          category: "content",
          check: "keyword_density_high",
          message: `Keyword density too high (${density}%, target 0.5-3%)`,
          recommendation: "Reduce keyword repetition to avoid over-optimization. Use synonyms and variations.",
          points_deducted: deduction,
        });
      }
    } else {
      contentDeductions += CONTENT_CHECKS.keyword_density;
      issues.push({
        type: "critical",
        category: "content",
        check: "keyword_missing",
        message: "No target keyword set for this page",
        recommendation: "Set a target keyword in the SEO page or blog post settings.",
        points_deducted: CONTENT_CHECKS.keyword_density,
      });
    }

    // 3. Readability
    const readabilityScore = calculateFleschKincaid(content);
    if (readabilityScore < 30) {
      contentDeductions += CONTENT_CHECKS.readability;
      issues.push({
        type: "critical",
        category: "content",
        check: "readability",
        message: `Readability score very low (${readabilityScore}/100)`,
        recommendation: "Simplify sentences and use shorter words. Aim for a Flesch-Kincaid score above 50.",
        points_deducted: CONTENT_CHECKS.readability,
      });
    } else if (readabilityScore < 50) {
      const deduction = Math.floor(
        CONTENT_CHECKS.readability * ((50 - readabilityScore) / 20),
      );
      contentDeductions += deduction;
      issues.push({
        type: "warning",
        category: "content",
        check: "readability",
        message: `Readability could be improved (${readabilityScore}/100, target >50)`,
        recommendation: "Break up long sentences and use simpler language where possible.",
        points_deducted: deduction,
      });
    }

    // 4. Internal links
    const internalLinks = extractLinks(content, "internal");
    if (internalLinks.length === 0) {
      contentDeductions += CONTENT_CHECKS.internal_links;
      issues.push({
        type: "warning",
        category: "content",
        check: "internal_links",
        message: "No internal links found",
        recommendation: "Add at least 2 internal links to related content on your site.",
        points_deducted: CONTENT_CHECKS.internal_links,
      });
    } else if (internalLinks.length < 2) {
      const deduction = Math.floor(CONTENT_CHECKS.internal_links / 2);
      contentDeductions += deduction;
      issues.push({
        type: "warning",
        category: "content",
        check: "internal_links_low",
        message: `Only ${internalLinks.length} internal link(s) found (minimum 2)`,
        recommendation: "Add at least one more internal link to strengthen site structure.",
        points_deducted: deduction,
      });
    }

    // 5. External links
    const externalLinks = extractLinks(content, "external");
    if (externalLinks.length === 0) {
      contentDeductions += CONTENT_CHECKS.external_links;
      issues.push({
        type: "info",
        category: "content",
        check: "external_links",
        message: "No external links found",
        recommendation: "Consider adding authoritative external references to boost credibility.",
        points_deducted: CONTENT_CHECKS.external_links,
      });
    }

    // 6. Images + alt text
    const images = extractImages(content);
    if (images.length === 0) {
      contentDeductions += CONTENT_CHECKS.images;
      issues.push({
        type: "warning",
        category: "content",
        check: "images",
        message: "No images found in content",
        recommendation: "Add at least one relevant image to improve engagement and SEO.",
        points_deducted: CONTENT_CHECKS.images,
      });
    } else {
      const missingAlt = images.filter((img) => !img.alt);
      if (missingAlt.length > 0) {
        const deduction = Math.floor(CONTENT_CHECKS.images / 2);
        contentDeductions += deduction;
        issues.push({
          type: "warning",
          category: "content",
          check: "images_alt_text",
          message: `${missingAlt.length} image(s) missing alt text`,
          recommendation: "Add descriptive alt text to all images for accessibility and image SEO.",
          points_deducted: deduction,
        });
      }
    }

    const contentScore = Math.max(0, 100 - contentDeductions);
    const overallScore = Math.round((technicalScore + contentScore) / 2);

    // =============================================
    // DETERMINE STATUS
    // =============================================
    const criticalIssues = issues.filter((i) => i.type === "critical");
    let status: "approved" | "pending_review" | "draft";
    if (overallScore >= 80 && criticalIssues.length === 0) {
      status = "approved";
    } else if (overallScore >= 70) {
      status = "pending_review";
    } else {
      status = "draft";
    }

    // =============================================
    // APPLY AUTO-FIXES & UPDATE SEO PAGE
    // =============================================
    pageUpdates.seo_score = overallScore;
    pageUpdates.technical_score = technicalScore;
    pageUpdates.content_score = contentScore;
    pageUpdates.internal_links_count = internalLinks.length;
    pageUpdates.external_links_count = externalLinks.length;

    const { error: updatePageError } = await supabase
      .from("seo_pages")
      .update(pageUpdates)
      .eq("id", pageId);

    if (updatePageError) {
      console.error("Failed to update seo_pages:", updatePageError.message);
    }

    // Update linked blog post status if present
    if (blogPost?.id) {
      const blogStatus =
        status === "approved"
          ? "published"
          : status === "pending_review"
            ? "in_review"
            : "draft";

      const { error: updateBlogError } = await supabase
        .from("blog_posts")
        .update({ status: blogStatus })
        .eq("id", blogPost.id);

      if (updateBlogError) {
        console.error("Failed to update blog_posts:", updateBlogError.message);
      }
    }

    // =============================================
    // STORE AUDIT RESULT
    // =============================================
    const warnings = issues.filter((i) => i.type === "warning");
    const info = issues.filter((i) => i.type === "info");

    const recommendations = [
      ...criticalIssues.map((i) => `[CRITICAL] ${i.recommendation}`),
      ...warnings.map((i) => `[WARNING] ${i.recommendation}`),
      ...info.map((i) => `[INFO] ${i.recommendation}`),
    ];

    const executionTimeMs = Math.round(performance.now() - startTime);

    const { error: insertError } = await supabase
      .from("seo_audit_results")
      .insert({
        seo_page_id: pageId,
        audit_type: "full",
        overall_score: overallScore,
        content_score: contentScore,
        technical_score: technicalScore,
        on_page_score: technicalScore,
        issues: { critical: criticalIssues, warnings, info },
        recommendations,
        raw_data: {
          auto_fixed_issues: autoFixes,
          execution_time_ms: executionTimeMs,
          word_count: wordCount,
          readability_score: readabilityScore,
          keyword_density: targetKeyword
            ? calculateKeywordDensity(content, targetKeyword)
            : null,
          internal_links_count: internalLinks.length,
          external_links_count: externalLinks.length,
          images_count: images.length,
          images_missing_alt: images.filter((i) => !i.alt).length,
          headers_summary: {
            h1: headers.h1.length,
            h2: headers.h2.length,
            h3: headers.h3.length,
          },
          status_assigned: status,
        },
        audited_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to insert audit result:", insertError.message);
    }

    // =============================================
    // RESPONSE
    // =============================================
    const response: AuditResponse = {
      page_id: pageId,
      url_path: page.url_path,
      technical_score: technicalScore,
      content_score: contentScore,
      overall_score: overallScore,
      status,
      critical_issues: criticalIssues,
      warnings,
      info,
      recommendations,
      auto_fixed_issues: autoFixes,
      execution_time_ms: executionTimeMs,
    };

    return jsonResponse(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Audit failed:", message);
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
