import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface GapResult {
  competitor_name: string;
  keyword_primary: string;
  topic: string;
  their_url: string | null;
  their_word_count: number;
  their_domain_authority: number;
  opportunity_score: number;
  priority: string;
  status: string;
}

interface AnalyzeResult {
  competitor_name: string;
  gaps_from_tracking: number;
  gaps_from_ai: number;
  total_gaps: number;
  gaps: GapResult[];
}

async function analyzeCompetitorGaps(competitorName: string): Promise<AnalyzeResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Get competitor data from both tables
  const { data: competitor } = await supabase
    .from("competitor_comparisons")
    .select("*")
    .eq("competitor_name", competitorName)
    .single();

  if (!competitor) {
    throw new Error(`Competitor not found: ${competitorName}`);
  }

  // Get the FK id from the competitors table
  const { data: competitorRef } = await supabase
    .from("competitors")
    .select("id")
    .eq("name", competitorName)
    .single();

  const competitorId = competitorRef?.id ?? null;

  // 2. Get tracking data for this competitor
  const { data: tracking } = await supabase
    .from("competitor_tracking")
    .select("*")
    .eq("competitor_name", competitorName)
    .order("opportunity_score", { ascending: false });

  // 3. Get our existing blog posts to check coverage
  const { data: ourPosts } = await supabase
    .from("blog_posts")
    .select("id, title, slug, primary_keyword, status")
    .in("status", ["published", "in_review", "draft"]);

  const ourKeywords = new Set(
    (ourPosts ?? []).map((p: { primary_keyword: string }) => p.primary_keyword?.toLowerCase()).filter(Boolean),
  );

  const gaps: GapResult[] = [];
  let gapsFromTracking = 0;

  // 4. Analyze tracking data — find gaps where they rank and we don't
  for (const item of tracking ?? []) {
    // Skip vs-comparison articles (already handled separately)
    if (item.keyword?.includes(" vs ")) continue;

    // Check if we already cover this keyword
    const keywordLower = item.keyword?.toLowerCase() ?? "";
    const hasCoverage = ourKeywords.has(keywordLower) ||
      [...ourKeywords].some(k => k.includes(keywordLower) || keywordLower.includes(k));

    // Find matching post if we have coverage
    let ourPostId: string | null = null;
    let coverage = "none";
    if (hasCoverage) {
      const match = (ourPosts ?? []).find(
        (p: { primary_keyword: string }) =>
          p.primary_keyword?.toLowerCase() === keywordLower ||
          p.primary_keyword?.toLowerCase().includes(keywordLower),
      );
      if (match) {
        ourPostId = match.id;
        coverage = match.status === "published" ? "published" : "draft";
      }
    }

    // Skip if we already have published content
    if (coverage === "published") continue;

    // Calculate opportunity score
    let score = 0;
    if (item.their_position && item.their_position <= 5) score += 35;
    else if (item.their_position && item.their_position <= 10) score += 25;
    if (!ourPostId) score += 30;
    if (item.their_domain_authority && item.their_domain_authority >= 60) score += 10;
    if (item.opportunity_score) score += Math.min(Math.round(item.opportunity_score / 4), 25);
    score = Math.min(score, 100);

    const priority = score >= 80 ? "high" : score >= 60 ? "medium" : "low";
    const topic = item.content_gap_analysis?.topic ?? "General";

    const gap: GapResult = {
      competitor_name: competitorName,
      keyword_primary: item.keyword,
      topic,
      their_url: item.competitor_url,
      their_word_count: item.their_word_count ?? 0,
      their_domain_authority: item.their_domain_authority ?? 0,
      opportunity_score: score,
      priority,
      status: "identified",
    };
    gaps.push(gap);

    await supabase
      .from("competitor_content_gaps")
      .upsert(
        {
          competitor_id: competitorId,
          competitor_name: competitorName,
          topic,
          their_url: item.competitor_url,
          their_word_count: item.their_word_count ?? 0,
          their_domain_authority: item.their_domain_authority ?? 0,
          keyword_primary: item.keyword,
          our_coverage: coverage,
          our_post_id: ourPostId,
          opportunity_score: score,
          priority,
          status: "identified",
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "competitor_name,keyword_primary" },
      );

    gapsFromTracking++;
  }

  // 5. AI-powered gap discovery — ask GPT to identify additional content gaps
  let gapsFromAi = 0;

  const strengths = (competitor.strengths as string[]) ?? [];
  const weaknesses = (competitor.weaknesses as string[]) ?? [];
  const existingKeywords = (tracking ?? []).map((t: { keyword: string }) => t.keyword);
  const ourExistingKeywords = [...ourKeywords].slice(0, 30);

  const aiPrompt = `You are an SEO content strategist for WedBoardPro, a B2B wedding planner software.

Competitor: ${competitorName} (${competitor.competitor_domain})
Their strengths: ${strengths.join(", ")}
Their weaknesses: ${weaknesses.join(", ")}

Keywords we already track for this competitor:
${existingKeywords.join("\n")}

Our existing blog content keywords:
${ourExistingKeywords.join("\n")}

Identify 8 HIGH-VALUE content gaps where ${competitorName} likely ranks well but we have NO content. Focus on:
1. Keywords related to their strengths (they have content, we don't)
2. Comparison/alternative keywords (people searching for alternatives)
3. Problem-solution keywords that wedding planners search for

For each gap, provide:
- keyword: the target search keyword (2-5 words, realistic search query)
- topic: category (e.g., "Client Management", "Budget Tools", "Automation", "Contracts")
- estimated_difficulty: 1-100 keyword difficulty estimate
- estimated_volume: monthly search volume estimate
- recommended_word_count: how many words our article should be
- reasoning: why this is a gap worth targeting (1 sentence)

Return ONLY valid JSON array, no markdown:
[{"keyword":"...","topic":"...","estimated_difficulty":50,"estimated_volume":500,"recommended_word_count":1500,"reasoning":"..."}]`;

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: aiPrompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (aiResponse.ok) {
      const aiResult = await aiResponse.json();
      const content = aiResult.choices?.[0]?.message?.content?.trim() ?? "[]";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const aiGaps = JSON.parse(cleaned) as Array<{
        keyword: string;
        topic: string;
        estimated_difficulty: number;
        estimated_volume: number;
        recommended_word_count: number;
        reasoning: string;
      }>;

      for (const aiGap of aiGaps) {
        const kw = aiGap.keyword?.toLowerCase();
        if (!kw) continue;

        // Skip if we already have this keyword from tracking or our posts
        if (ourKeywords.has(kw)) continue;
        if (gaps.some(g => g.keyword_primary.toLowerCase() === kw)) continue;

        // Calculate opportunity score for AI-discovered gaps
        let aiScore = 50; // Base score for AI-discovered
        if (aiGap.estimated_volume > 1000) aiScore += 15;
        else if (aiGap.estimated_volume > 500) aiScore += 10;
        if (aiGap.estimated_difficulty < 40) aiScore += 15;
        else if (aiGap.estimated_difficulty < 60) aiScore += 8;
        aiScore = Math.min(aiScore, 100);

        const priority = aiScore >= 75 ? "high" : aiScore >= 55 ? "medium" : "low";

        const gap: GapResult = {
          competitor_name: competitorName,
          keyword_primary: aiGap.keyword,
          topic: aiGap.topic,
          their_url: null,
          their_word_count: aiGap.recommended_word_count ?? 1500,
          their_domain_authority: competitor.competitor_domain ? 60 : 0,
          opportunity_score: aiScore,
          priority,
          status: "identified",
        };
        gaps.push(gap);

        await supabase
          .from("competitor_content_gaps")
          .upsert(
            {
              competitor_id: competitorId,
              competitor_name: competitorName,
              topic: aiGap.topic,
              keyword_primary: aiGap.keyword,
              keyword_difficulty: aiGap.estimated_difficulty ?? 50,
              search_volume: aiGap.estimated_volume ?? 0,
              their_word_count: aiGap.recommended_word_count ?? 1500,
              their_domain_authority: competitor.competitor_domain ? 60 : 0,
              our_coverage: "none",
              opportunity_score: aiScore,
              priority,
              status: "identified",
              notes: aiGap.reasoning,
              analyzed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "competitor_name,keyword_primary" },
          );

        gapsFromAi++;
      }
    }
  } catch (err) {
    console.error("AI gap discovery error:", err);
    // Non-fatal — we still have tracking-based gaps
  }

  // Sort by opportunity score
  gaps.sort((a, b) => b.opportunity_score - a.opportunity_score);

  return {
    competitor_name: competitorName,
    gaps_from_tracking: gapsFromTracking,
    gaps_from_ai: gapsFromAi,
    total_gaps: gaps.length,
    gaps,
  };
}

async function generateGapContent(gapId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get gap data
  const { data: gap, error: gapError } = await supabase
    .from("competitor_content_gaps")
    .select("*")
    .eq("id", gapId)
    .single();

  if (gapError || !gap) {
    throw new Error(`Gap not found: ${gapId}`);
  }

  // Update status to targeted
  await supabase
    .from("competitor_content_gaps")
    .update({ status: "targeted", updated_at: new Date().toISOString() })
    .eq("id", gapId);

  // Call pipeline controller to generate article
  const response = await fetch(`${supabaseUrl}/functions/v1/seo-pipeline-controller`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "generate_single",
      keyword: gap.keyword_primary,
      target_word_count: Math.max(gap.their_word_count ? Math.round(gap.their_word_count * 1.2) : 1500, 1500),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    await supabase
      .from("competitor_content_gaps")
      .update({ status: "identified", updated_at: new Date().toISOString() })
      .eq("id", gapId);
    throw new Error(`Content generation failed: ${errorText}`);
  }

  const result = await response.json();

  if (result.error) {
    await supabase
      .from("competitor_content_gaps")
      .update({ status: "identified", updated_at: new Date().toISOString() })
      .eq("id", gapId);
    throw new Error(`Content generation error: ${result.error}`);
  }

  // Update gap with article reference
  await supabase
    .from("competitor_content_gaps")
    .update({
      our_post_id: result.article_id,
      our_coverage: "draft",
      status: "content_created",
      updated_at: new Date().toISOString(),
    })
    .eq("id", gapId);

  return {
    gap_id: gapId,
    keyword: gap.keyword_primary,
    competitor: gap.competitor_name,
    article_id: result.article_id,
    title: result.title,
    slug: result.slug,
    word_count: result.word_count,
    status: "content_created",
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
    const { action, competitor_name, gap_id } = await req.json();

    if (action === "analyze") {
      if (!competitor_name) {
        return new Response(
          JSON.stringify({ error: "competitor_name is required" }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
        );
      }
      const result = await analyzeCompetitorGaps(competitor_name);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (action === "generate") {
      if (!gap_id) {
        return new Response(
          JSON.stringify({ error: "gap_id is required" }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
        );
      }
      const result = await generateGapContent(gap_id);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "analyze" or "generate"' }),
      { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  }
});
