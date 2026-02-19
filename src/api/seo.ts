import { Router, json } from 'express';
import type { Request, Response } from 'express';
import { getSupabaseServiceClient } from '../supabaseClient.js';

const router = Router();
router.use(json());

// Helper to get the service client or return 503
function getClient(res: Response) {
  const client = getSupabaseServiceClient();
  if (!client) {
    res.status(503).json({ error: 'Supabase service client not available' });
    return null;
  }
  return client;
}

// =============================================
// GET /api/seo/command-center
// =============================================
router.get('/command-center', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Content Pipeline Stats ──
    const { data: postStatusData } = await supabase
      .from('blog_posts')
      .select('id, status, actual_word_count, created_at, published_at');

    const allPosts = postStatusData ?? [];
    const totalPosts = allPosts.length;
    const drafts = allPosts.filter((p: { status: string }) => p.status === 'draft').length;
    const inReview = allPosts.filter((p: { status: string }) => p.status === 'in_review').length;
    const published = allPosts.filter((p: { status: string }) => p.status === 'published').length;
    const totalWords = allPosts.reduce((s: number, p: { actual_word_count: number | null }) => s + (p.actual_word_count ?? 0), 0);
    const postsThisWeek = allPosts.filter((p: { created_at: string }) => new Date(p.created_at) >= weekAgo).length;
    const publishedThisMonth = allPosts.filter((p: { status: string; published_at: string | null }) =>
      p.status === 'published' && p.published_at && new Date(p.published_at) >= monthAgo
    ).length;

    // ── SEO Quality Metrics ──
    const { data: seoData } = await supabase
      .from('seo_pages')
      .select('seo_score, content_score, technical_score')
      .gt('seo_score', 0);

    const seoPages = seoData ?? [];
    const totalSeoPages = seoPages.length;
    const avgSeoScore = totalSeoPages > 0
      ? Math.round(seoPages.reduce((s: number, p: { seo_score: number }) => s + p.seo_score, 0) / totalSeoPages)
      : 0;
    const avgContentScore = totalSeoPages > 0
      ? Math.round(seoPages.reduce((s: number, p: { content_score: number }) => s + p.content_score, 0) / totalSeoPages)
      : 0;
    const avgTechnicalScore = totalSeoPages > 0
      ? Math.round(seoPages.reduce((s: number, p: { technical_score: number }) => s + p.technical_score, 0) / totalSeoPages)
      : 0;
    const excellentPages = seoPages.filter((p: { seo_score: number }) => p.seo_score >= 80).length;
    const goodPages = seoPages.filter((p: { seo_score: number }) => p.seo_score >= 60 && p.seo_score < 80).length;
    const needsWorkPages = seoPages.filter((p: { seo_score: number }) => p.seo_score < 60).length;

    // ── Topic Clusters ──
    const { data: clusterData } = await supabase
      .from('topic_clusters')
      .select('id, name, pillar_keyword, status, target_post_count')
      .order('name');

    const clusterIds = (clusterData ?? []).map((c: { id: string }) => c.id);
    let clusterPostCounts: Record<string, number> = {};
    if (clusterIds.length > 0) {
      const { data: clusterPosts } = await supabase
        .from('blog_posts')
        .select('topic_cluster_id')
        .in('topic_cluster_id', clusterIds);

      for (const cp of clusterPosts ?? []) {
        const cid = (cp as { topic_cluster_id: string }).topic_cluster_id;
        clusterPostCounts[cid] = (clusterPostCounts[cid] || 0) + 1;
      }
    }

    const clusters = (clusterData ?? []).map((c: {
      id: string; name: string; pillar_keyword: string; status: string; target_post_count: number;
    }) => ({
      id: c.id,
      name: c.name,
      pillarKeyword: c.pillar_keyword,
      status: c.status,
      targetPosts: c.target_post_count,
      currentPosts: clusterPostCounts[c.id] || 0,
      completion: c.target_post_count > 0
        ? Math.round(((clusterPostCounts[c.id] || 0) / c.target_post_count) * 100)
        : 0,
    }));

    // ── Recent Runs ──
    const { data: runsData } = await supabase
      .from('automation_runs')
      .select('id, automation_type, status, items_processed, items_created, items_updated, error_message, started_at, duration_seconds')
      .order('started_at', { ascending: false })
      .limit(10);

    const recentRuns = (runsData ?? []).map((r: {
      id: string; automation_type: string; status: string;
      items_processed: number; items_created: number; items_updated: number;
      error_message: string | null; started_at: string; duration_seconds: number | null;
    }) => ({
      id: r.id,
      type: r.automation_type,
      status: r.status,
      itemsProcessed: r.items_processed,
      itemsCreated: r.items_created,
      itemsUpdated: r.items_updated,
      error: r.error_message,
      startedAt: r.started_at,
      duration: r.duration_seconds,
    }));

    // ── Top Performing Posts (by SEO score) ──
    const { data: topPostsData } = await supabase
      .from('blog_posts')
      .select('id, title, slug, primary_keyword, status, total_views, total_clicks, actual_word_count, created_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(5);

    const { data: topPostsSeo } = await supabase
      .from('seo_pages')
      .select('blog_post_id, seo_score');

    const seoScoreMap = new Map(
      (topPostsSeo ?? []).map((p: { blog_post_id: string; seo_score: number }) => [p.blog_post_id, p.seo_score])
    );

    const topPosts = (topPostsData ?? []).map((p: {
      id: string; title: string; slug: string; primary_keyword: string | null;
      status: string; total_views: number | null; total_clicks: number | null;
      actual_word_count: number | null; created_at: string; published_at: string | null;
    }) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      primaryKeyword: p.primary_keyword,
      views: p.total_views ?? 0,
      clicks: p.total_clicks ?? 0,
      wordCount: p.actual_word_count ?? 0,
      seoScore: seoScoreMap.get(p.id) ?? 0,
      publishedAt: p.published_at,
    }));

    // ── Smart Action Items ──
    const actions: Array<{ type: 'warning' | 'success' | 'info'; message: string; priority: number }> = [];

    if (inReview > 0) {
      actions.push({ type: 'warning', message: `${inReview} post${inReview > 1 ? 's' : ''} waiting for review — approve or send back to draft`, priority: 1 });
    }
    if (needsWorkPages > 0) {
      actions.push({ type: 'warning', message: `${needsWorkPages} page${needsWorkPages > 1 ? 's' : ''} with SEO score below 60 — consider rewriting`, priority: 2 });
    }
    if (published === 0) {
      actions.push({ type: 'warning', message: 'No published posts yet — approve content to start getting organic traffic', priority: 1 });
    }
    if (avgContentScore > 0 && avgContentScore < 60) {
      actions.push({ type: 'warning', message: `Average content score is ${avgContentScore} — run the pipeline to generate higher-quality content`, priority: 3 });
    }
    const emptyClusters = clusters.filter(c => c.currentPosts === 0).length;
    if (emptyClusters > 0) {
      actions.push({ type: 'info', message: `${emptyClusters} topic cluster${emptyClusters > 1 ? 's' : ''} have no posts — run the pipeline to fill gaps`, priority: 4 });
    }
    if (published > 0) {
      actions.push({ type: 'success', message: `${published} post${published > 1 ? 's' : ''} live on the blog — keep publishing to build organic traffic`, priority: 10 });
    }
    if (excellentPages > 0) {
      actions.push({ type: 'success', message: `${excellentPages} page${excellentPages > 1 ? 's' : ''} scoring 80+ — excellent SEO quality`, priority: 10 });
    }
    if (postsThisWeek > 0) {
      actions.push({ type: 'success', message: `${postsThisWeek} new post${postsThisWeek > 1 ? 's' : ''} generated this week`, priority: 9 });
    }

    actions.sort((a, b) => a.priority - b.priority);

    res.json({
      pipeline: {
        totalPosts,
        drafts,
        inReview,
        published,
        totalWords,
        postsThisWeek,
        publishedThisMonth,
      },
      quality: {
        totalSeoPages,
        avgSeoScore,
        avgContentScore,
        avgTechnicalScore,
        excellentPages,
        goodPages,
        needsWorkPages,
      },
      clusters,
      recentRuns,
      topPosts,
      actions,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO command-center error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/overview
// =============================================
router.get('/overview', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total published pages
    const { count: totalPages } = await supabase
      .from('seo_pages')
      .select('id', { count: 'exact', head: true });

    // Average audit score (only scored pages)
    const { data: scoreData } = await supabase
      .from('seo_pages')
      .select('seo_score')
      .gt('seo_score', 0);

    const scores = (scoreData ?? []).map((p: { seo_score: number }) => p.seo_score);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0;

    // Pages pending review (below target score of 80)
    const { count: pendingReview } = await supabase
      .from('seo_pages')
      .select('id', { count: 'exact', head: true })
      .gt('seo_score', 0)
      .lt('seo_score', 80);

    // Content generated this week
    const { count: weeklyGenerated } = await supabase
      .from('blog_posts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    // Estimated organic traffic (sum of clicks from seo_performance)
    const { data: trafficData } = await supabase
      .from('seo_performance')
      .select('clicks')
      .gte('date', weekAgo.toISOString().split('T')[0]);

    const estimatedTraffic = (trafficData ?? []).reduce(
      (sum: number, row: { clicks: number }) => sum + (row.clicks ?? 0),
      0,
    );

    res.json({
      totalPages: totalPages ?? 0,
      avgScore,
      pendingReview: pendingReview ?? 0,
      weeklyGenerated: weeklyGenerated ?? 0,
      estimatedTraffic,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO overview error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/pages-needing-attention
// =============================================
router.get('/pages-needing-attention', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('v_pages_needing_attention')
      .select(
        'id, url_path, page_type, title_tag, target_keyword, seo_score, content_score, technical_score, health_status, attention_reason, blog_post_title, blog_post_status',
      )
      .order('seo_score', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const pages = (data ?? []).map((p: {
      id: string;
      url_path: string;
      title_tag: string;
      blog_post_title: string | null;
      seo_score: number;
      content_score: number;
      technical_score: number;
      health_status: string;
      attention_reason: string;
      page_type: string;
    }) => ({
      id: p.id,
      title: p.blog_post_title ?? p.title_tag,
      slug: p.url_path,
      score: p.seo_score,
      issues: {
        status: p.health_status,
        reason: p.attention_reason,
        contentScore: p.content_score,
        technicalScore: p.technical_score,
        pageType: p.page_type,
      },
    }));

    res.json(pages);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO pages-needing-attention error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/competitor-performance
// =============================================
router.get('/competitor-performance', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('v_competitor_intelligence')
      .select(
        'id, competitor_name, competitor_domain, keyword, our_position, their_position, position_status, opportunity_score, our_page_url, our_seo_score, status',
      )
      .order('opportunity_score', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const competitors = (data ?? []).map((c: {
      id: string;
      competitor_name: string;
      competitor_domain: string;
      keyword: string;
      our_position: number | null;
      their_position: number | null;
      position_status: string;
      opportunity_score: number;
      our_page_url: string | null;
      our_seo_score: number | null;
      status: string;
    }) => ({
      competitor: c.competitor_name,
      domain: c.competitor_domain,
      keyword: c.keyword,
      ourPage: c.our_page_url,
      score: c.our_seo_score,
      ranking: c.our_position,
      theirRanking: c.their_position,
      positionStatus: c.position_status,
      opportunityScore: c.opportunity_score,
      status: c.status,
    }));

    res.json(competitors);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO competitor-performance error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/programmatic-status
// =============================================
router.get('/programmatic-status', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('v_programmatic_performance')
      .select(
        'template_id, template_name, template_type, template_status, pages_generated, pages_published, publish_rate, avg_quality_score, total_views, total_clicks',
      )
      .order('template_name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const templates = (data ?? []).map((t: {
      template_id: string;
      template_name: string;
      template_type: string;
      template_status: string;
      pages_generated: number;
      pages_published: number;
      publish_rate: string;
      avg_quality_score: string;
      total_views: number;
      total_clicks: number;
    }) => ({
      templateName: t.template_name,
      templateType: t.template_type,
      status: t.template_status,
      generated: t.pages_generated,
      published: t.pages_published,
      needsReview: t.pages_generated - t.pages_published,
      avgScore: parseFloat(t.avg_quality_score) || 0,
      publishRate: parseFloat(t.publish_rate) || 0,
      totalViews: t.total_views,
      totalClicks: t.total_clicks,
    }));

    res.json(templates);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO programmatic-status error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// POST /api/seo/run-pipeline
// =============================================
router.post('/run-pipeline', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(503).json({ error: 'Supabase URL or service key not configured' });
    }

    // Call the seo-pipeline-controller Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/seo-pipeline-controller`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ action: 'run-pipeline' }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pipeline controller error:', errorText);
      return res.status(response.status).json({
        error: `Pipeline controller returned ${response.status}`,
        details: errorText,
      });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO run-pipeline error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/health
// =============================================
router.get('/health', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Load monitoring config
    const { data: configRows } = await supabase
      .from('seo_automation_config')
      .select('config_key, config_value')
      .like('config_key', 'monitoring_%');

    const config: Record<string, unknown> = {};
    for (const row of configRows ?? []) {
      config[(row as { config_key: string }).config_key] = (row as { config_value: unknown }).config_value;
    }

    const staleHours = (config.monitoring_stale_hours as number) ?? 48;
    const minAvgScore = (config.monitoring_min_avg_score as number) ?? 70;
    const maxConsecutiveFailures = (config.monitoring_max_consecutive_failures as number) ?? 5;
    const staleCutoff = new Date(now.getTime() - staleHours * 60 * 60 * 1000);

    type CheckStatus = 'healthy' | 'warning' | 'critical';
    interface HealthCheck {
      name: string;
      status: CheckStatus;
      message: string;
      value: number;
    }

    const checks: HealthCheck[] = [];

    // 1. Recent Activity — runs in last 24h
    const { count: recentCount } = await supabase
      .from('automation_runs')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', dayAgo.toISOString());

    const runsIn24h = recentCount ?? 0;
    const { count: staleCount } = await supabase
      .from('automation_runs')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', staleCutoff.toISOString());

    let activityStatus: CheckStatus = 'healthy';
    let activityMsg = `${runsIn24h} run(s) in last 24h`;
    if (runsIn24h === 0 && (staleCount ?? 0) === 0) {
      activityStatus = 'critical';
      activityMsg = `No runs in last ${staleHours}h`;
    } else if (runsIn24h === 0) {
      activityStatus = 'warning';
      activityMsg = `No runs in last 24h (last run within ${staleHours}h)`;
    }
    checks.push({ name: 'recent_activity', status: activityStatus, message: activityMsg, value: runsIn24h });

    // 2. Failure Rate — consecutive failures in last 7 days
    const { data: recentRuns7d } = await supabase
      .from('automation_runs')
      .select('status')
      .gte('started_at', weekAgo.toISOString())
      .order('started_at', { ascending: false });

    let consecutiveFailures = 0;
    for (const run of recentRuns7d ?? []) {
      if ((run as { status: string }).status === 'failed') {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    const totalFailures7d = (recentRuns7d ?? []).filter(
      (r: { status: string }) => r.status === 'failed',
    ).length;

    let failureStatus: CheckStatus = 'healthy';
    let failureMsg = `${totalFailures7d} failure(s) in 7 days`;
    if (consecutiveFailures >= maxConsecutiveFailures) {
      failureStatus = 'critical';
      failureMsg = `${consecutiveFailures} consecutive failures`;
    } else if (totalFailures7d > 2) {
      failureStatus = 'warning';
      failureMsg = `${totalFailures7d} failures in 7 days`;
    }
    checks.push({ name: 'failure_rate', status: failureStatus, message: failureMsg, value: totalFailures7d });

    // 3. Avg Audit Score Trend
    const { data: scoreData } = await supabase
      .from('seo_pages')
      .select('seo_score')
      .gt('seo_score', 0);

    const scores = (scoreData ?? []).map((p: { seo_score: number }) => p.seo_score);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      : 0;

    let scoreStatus: CheckStatus = 'healthy';
    let scoreMsg = `Avg score: ${avgScore}`;
    if (scores.length === 0) {
      scoreStatus = 'warning';
      scoreMsg = 'No scored pages yet';
    } else if (avgScore < minAvgScore - 10) {
      scoreStatus = 'critical';
      scoreMsg = `Avg score ${avgScore} (target: ${minAvgScore})`;
    } else if (avgScore < minAvgScore) {
      scoreStatus = 'warning';
      scoreMsg = `Avg score ${avgScore} below target ${minAvgScore}`;
    }
    checks.push({ name: 'avg_score_trend', status: scoreStatus, message: scoreMsg, value: avgScore });

    // 4. Pages Published this week
    const { count: publishedCount } = await supabase
      .from('blog_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('created_at', weekAgo.toISOString());

    const published = publishedCount ?? 0;
    let pubStatus: CheckStatus = 'healthy';
    let pubMsg = `${published} post(s) published this week`;
    if (published === 0) {
      pubStatus = 'warning';
      pubMsg = 'No posts published this week';
    }
    checks.push({ name: 'pages_published', status: pubStatus, message: pubMsg, value: published });

    // 5. Error Log — last 10 runs with errors
    const { data: errorRuns } = await supabase
      .from('automation_runs')
      .select('id, automation_type, error_message, started_at')
      .not('error_message', 'is', null)
      .order('started_at', { ascending: false })
      .limit(10);

    // Separate real errors from informational messages
    const infoPatterns = [/competitor\(s\) missing alternative pages/i, /column .+ does not exist/i];
    const allEntries = (errorRuns ?? []).map((r: {
      id: string;
      automation_type: string;
      error_message: string;
      started_at: string;
    }) => {
      const isInfo = infoPatterns.some(p => p.test(r.error_message));
      return {
        id: r.id,
        type: r.automation_type,
        error: r.error_message,
        startedAt: r.started_at,
        severity: isInfo ? 'info' as const : 'error' as const,
      };
    });
    const errorLog = allEntries.filter(e => e.severity === 'error');
    const infoLog = allEntries.filter(e => e.severity === 'info');

    checks.push({
      name: 'error_log',
      status: errorLog.length > 5 ? 'warning' : 'healthy',
      message: `${errorLog.length} recent error(s)`,
      value: errorLog.length,
    });

    // Recent runs for dashboard
    const { data: recentRunsData } = await supabase
      .from('automation_runs')
      .select('id, automation_type, status, items_processed, items_created, items_updated, error_message, started_at, duration_seconds')
      .order('started_at', { ascending: false })
      .limit(20);

    const recentRuns = (recentRunsData ?? []).map((r: {
      id: string;
      automation_type: string;
      status: string;
      items_processed: number;
      items_created: number;
      items_updated: number;
      error_message: string | null;
      started_at: string;
      duration_seconds: number | null;
    }) => ({
      id: r.id,
      type: r.automation_type,
      status: r.status,
      itemsProcessed: r.items_processed,
      itemsCreated: r.items_created,
      itemsUpdated: r.items_updated,
      error: r.error_message,
      startedAt: r.started_at,
      duration: r.duration_seconds,
    }));

    // Overall status = worst individual check
    const statusOrder: Record<CheckStatus, number> = { healthy: 0, warning: 1, critical: 2 };
    const overallStatus = checks.reduce<CheckStatus>((worst, check) => {
      return statusOrder[check.status] > statusOrder[worst] ? check.status : worst;
    }, 'healthy');

    res.json({
      status: overallStatus,
      checks,
      recentRuns,
      errorLog,
      infoLog,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO health error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/recent-runs
// =============================================
router.get('/recent-runs', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('automation_runs')
      .select('id, automation_type, status, items_processed, items_created, items_updated, error_message, started_at, duration_seconds')
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const runs = (data ?? []).map((r: {
      id: string;
      automation_type: string;
      status: string;
      items_processed: number;
      items_created: number;
      items_updated: number;
      error_message: string | null;
      started_at: string;
      duration_seconds: number | null;
    }) => ({
      id: r.id,
      type: r.automation_type,
      status: r.status,
      itemsProcessed: r.items_processed,
      itemsCreated: r.items_created,
      itemsUpdated: r.items_updated,
      error: r.error_message,
      startedAt: r.started_at,
      duration: r.duration_seconds,
    }));

    res.json(runs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO recent-runs error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/content-review
// =============================================
router.get('/content-review', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data: posts, error: postsErr } = await supabase
      .from('blog_posts')
      .select('id, title, slug, status, content, excerpt, meta_description, primary_keyword, keyword_variations, actual_word_count, created_at, published_at')
      .order('created_at', { ascending: false });

    if (postsErr) {
      return res.status(500).json({ error: postsErr.message });
    }

    const { data: pages, error: pagesErr } = await supabase
      .from('seo_pages')
      .select('blog_post_id, seo_score, content_score, technical_score, url_path');

    if (pagesErr) {
      return res.status(500).json({ error: pagesErr.message });
    }

    const seoMap = new Map(
      (pages ?? []).map((p: { blog_post_id: string; seo_score: number; content_score: number; technical_score: number; url_path: string }) => [p.blog_post_id, p])
    );

    const results = (posts ?? []).map((post: {
      id: string; title: string; slug: string; status: string; content: string;
      excerpt: string | null; meta_description: string | null; primary_keyword: string | null;
      keyword_variations: string[] | null; actual_word_count: number | null;
      created_at: string; published_at: string | null;
    }) => {
      const seo = seoMap.get(post.id) as { seo_score: number; content_score: number; technical_score: number; url_path: string } | undefined;
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        content: post.content,
        excerpt: post.excerpt,
        metaDescription: post.meta_description,
        primaryKeyword: post.primary_keyword,
        keywordVariations: post.keyword_variations ?? [],
        wordCount: post.actual_word_count ?? (post.content ? post.content.split(/\s+/).length : 0),
        createdAt: post.created_at,
        publishedAt: post.published_at,
        seoScore: seo?.seo_score ?? 0,
        contentScore: seo?.content_score ?? 0,
        technicalScore: seo?.technical_score ?? 0,
        urlPath: seo?.url_path ?? `/blog/${post.slug}`,
      };
    });

    res.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO content-review error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// PATCH /api/seo/content-review/:id
// =============================================
router.patch('/content-review/:id', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { id } = req.params;
    const { status } = req.body as { status: string };

    if (!status || !['draft', 'in_review', 'published'].includes(status)) {
      return res.status(400).json({ error: 'status must be draft, in_review, or published' });
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'published') {
      updates.published_at = new Date().toISOString();
    }
    if (status === 'draft') {
      updates.published_at = null;
    }

    const { error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, id, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO content-review patch error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// DELETE /api/seo/content-review/:id
// =============================================
router.delete('/content-review/:id', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { id } = req.params;

    await supabase.from('seo_pages').delete().eq('blog_post_id', id);

    const { error } = await supabase.from('blog_posts').delete().eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO content-review delete error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/blog/posts — Published posts for listing
// =============================================
router.get('/blog/posts', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data: posts, error: postsErr } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, meta_description, category, primary_keyword, actual_word_count, published_at, hero_image_url')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (postsErr) {
      return res.status(500).json({ error: postsErr.message });
    }

    const { data: pages } = await supabase
      .from('seo_pages')
      .select('blog_post_id, seo_score');

    const seoMap = new Map(
      (pages ?? []).map((p: { blog_post_id: string; seo_score: number }) => [p.blog_post_id, p.seo_score])
    );

    const results = (posts ?? []).map((post: {
      id: string; title: string; slug: string; excerpt: string | null;
      meta_description: string | null; category: string | null;
      primary_keyword: string | null; actual_word_count: number | null;
      published_at: string | null; hero_image_url: string | null;
    }) => {
      const wordCount = post.actual_word_count ?? 0;
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || post.meta_description || '',
        category: post.category || 'Guides',
        primaryKeyword: post.primary_keyword,
        wordCount,
        readingTime: Math.max(1, Math.round(wordCount / 238)),
        publishedAt: post.published_at,
        heroImage: post.hero_image_url,
        seoScore: seoMap.get(post.id) ?? 0,
      };
    });

    res.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO blog/posts error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/blog/posts/:slug — Single post
// =============================================
router.get('/blog/posts/:slug', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { slug } = req.params;

    const { data: post, error: postErr } = await supabase
      .from('blog_posts')
      .select('id, title, slug, content, excerpt, meta_description, category, primary_keyword, keyword_variations, tags, actual_word_count, published_at, hero_image_url, hero_image_alt')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (postErr || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const { data: seoPage } = await supabase
      .from('seo_pages')
      .select('seo_score, content_score, technical_score')
      .eq('blog_post_id', post.id)
      .single();

    // Fetch related posts (same category or most recent, excluding current)
    let relatedQuery = supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, meta_description, category, actual_word_count, published_at, hero_image_url')
      .eq('status', 'published')
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(3);

    if (post.category) {
      relatedQuery = relatedQuery.eq('category', post.category);
    }

    const { data: relatedPosts } = await relatedQuery;

    // If not enough same-category posts, fill with recent posts
    let related = relatedPosts ?? [];
    if (related.length < 3) {
      const { data: morePosts } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, meta_description, category, actual_word_count, published_at, hero_image_url')
        .eq('status', 'published')
        .neq('id', post.id)
        .order('published_at', { ascending: false })
        .limit(3);

      const existingIds = new Set(related.map((p: { id: string }) => p.id));
      for (const p of morePosts ?? []) {
        if (!existingIds.has((p as { id: string }).id) && related.length < 3) {
          related.push(p as typeof related[number]);
        }
      }
    }

    const wordCount = (post as { actual_word_count: number | null }).actual_word_count ?? 0;

    res.json({
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: (post as { excerpt: string | null }).excerpt || (post as { meta_description: string | null }).meta_description || '',
      metaDescription: (post as { meta_description: string | null }).meta_description || '',
      category: (post as { category: string | null }).category || 'Guides',
      primaryKeyword: (post as { primary_keyword: string | null }).primary_keyword,
      keywordVariations: (post as { keyword_variations: string[] | null }).keyword_variations ?? [],
      tags: (post as { tags: string[] | null }).tags ?? [],
      wordCount,
      readingTime: Math.max(1, Math.round(wordCount / 238)),
      publishedAt: (post as { published_at: string | null }).published_at,
      heroImage: (post as { hero_image_url: string | null }).hero_image_url,
      heroImageAlt: (post as { hero_image_alt: string | null }).hero_image_alt,
      seoScore: seoPage?.seo_score ?? 0,
      contentScore: seoPage?.content_score ?? 0,
      technicalScore: seoPage?.technical_score ?? 0,
      relatedPosts: related.map((rp: {
        id: string; title: string; slug: string; excerpt: string | null;
        meta_description: string | null; category: string | null;
        actual_word_count: number | null; published_at: string | null;
        hero_image_url: string | null;
      }) => ({
        id: rp.id,
        title: rp.title,
        slug: rp.slug,
        excerpt: rp.excerpt || rp.meta_description || '',
        category: rp.category || 'Guides',
        readingTime: Math.max(1, Math.round((rp.actual_word_count ?? 0) / 238)),
        publishedAt: rp.published_at,
        heroImage: rp.hero_image_url,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO blog/posts/:slug error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/blog/featured — Latest 3 for homepage
// =============================================
router.get('/blog/featured', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, meta_description, category, actual_word_count, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(3);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const results = (posts ?? []).map((post: {
      id: string; title: string; slug: string; excerpt: string | null;
      meta_description: string | null; category: string | null;
      actual_word_count: number | null; published_at: string | null;
    }) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || post.meta_description || '',
      category: post.category || 'Guides',
      readingTime: Math.max(1, Math.round((post.actual_word_count ?? 0) / 238)),
      publishedAt: post.published_at,
    }));

    res.json({ posts: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO blog/featured error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/pipeline/topics — All topics with funnel counts
// =============================================
router.get('/pipeline/topics', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data: topics, error } = await supabase
      .from('topics_pipeline')
      .select('id, keyword_primary, keyword_variations, search_volume, keyword_difficulty, priority_score, estimated_monthly_traffic, category, status, topic_cluster_id, published_post_id, created_at, validated_at, updated_at')
      .order('priority_score', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const list = topics ?? [];
    const funnel: Record<string, number> = {};
    for (const t of list) {
      const s = (t as { status: string }).status;
      funnel[s] = (funnel[s] ?? 0) + 1;
    }

    // Cluster name lookup
    const clusterIds = [...new Set(list.filter((t: { topic_cluster_id: string | null }) => t.topic_cluster_id).map((t: { topic_cluster_id: string }) => t.topic_cluster_id))];
    let clusterMap: Record<string, string> = {};
    if (clusterIds.length > 0) {
      const { data: clusters } = await supabase
        .from('topic_clusters')
        .select('id, name')
        .in('id', clusterIds);
      clusterMap = Object.fromEntries((clusters ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
    }

    const mapped = list.map((t: {
      id: string; keyword_primary: string; keyword_variations: string[] | null;
      search_volume: number | null; keyword_difficulty: number | null;
      priority_score: number | null; estimated_monthly_traffic: number | null;
      category: string | null; status: string; topic_cluster_id: string | null;
      published_post_id: string | null; created_at: string; validated_at: string | null; updated_at: string | null;
    }) => ({
      id: t.id,
      keyword: t.keyword_primary,
      variations: t.keyword_variations ?? [],
      volume: t.search_volume ?? 0,
      difficulty: t.keyword_difficulty ?? 0,
      priority: t.priority_score ?? 0,
      traffic: t.estimated_monthly_traffic ?? 0,
      category: t.category ?? 'General',
      status: t.status,
      clusterId: t.topic_cluster_id,
      clusterName: t.topic_cluster_id ? clusterMap[t.topic_cluster_id] ?? null : null,
      postId: t.published_post_id,
      createdAt: t.created_at,
      validatedAt: t.validated_at,
    }));

    res.json({ topics: mapped, funnel });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// =============================================
// PATCH /api/seo/pipeline/topics/:id/status — Update topic status
// =============================================
router.patch('/pipeline/topics/:id/status', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  const { id } = req.params;
  const { status } = req.body as { status: string };
  const validStatuses = ['discovered', 'validated', 'brief_created', 'in_production', 'in_review', 'published'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'validated') update.validated_at = new Date().toISOString();

    const { error } = await supabase
      .from('topics_pipeline')
      .update(update)
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// =============================================
// POST /api/seo/pipeline/topics/bulk-validate — Bulk validate discovered topics
// =============================================
router.post('/pipeline/topics/bulk-validate', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  const { ids } = req.body as { ids: string[] };
  if (!ids?.length) return res.status(400).json({ error: 'ids array required' });

  try {
    const { error } = await supabase
      .from('topics_pipeline')
      .update({ status: 'validated', validated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('status', 'discovered');

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, validated: ids.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// =============================================
// POST /api/seo/pipeline/discover — Generate new topic ideas via OpenAI
// =============================================
router.post('/pipeline/discover', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  const { seedKeywords, count } = req.body as { seedKeywords: string[]; count?: number };
  if (!seedKeywords?.length) return res.status(400).json({ error: 'seedKeywords array required' });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  try {
    // Get existing keywords to avoid duplicates
    const { data: existing } = await supabase
      .from('topics_pipeline')
      .select('keyword_primary');
    const existingKeywords = new Set((existing ?? []).map((t: { keyword_primary: string }) => t.keyword_primary.toLowerCase()));

    // Get clusters for assignment
    const { data: clusters } = await supabase
      .from('topic_clusters')
      .select('id, name, pillar_keyword');

    const clusterList = (clusters ?? []).map((c: { id: string; name: string; pillar_keyword: string }) => `${c.name} (${c.pillar_keyword})`).join(', ');

    const topicCount = Math.min(count ?? 15, 30);

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an SEO keyword researcher for WedBoardPro, a B2B SaaS for professional wedding planners. Generate topic ideas that wedding planners would search for. Focus on long-tail, high-intent keywords with low competition.

Available topic clusters: ${clusterList}

Rules:
- Target professional wedding planners (NOT couples)
- Mix informational, commercial, and comparison keywords
- Include search volume estimates (realistic for niche B2B)
- Include keyword difficulty estimates (0-100)
- Suggest 3-4 keyword variations per topic
- Assign a priority score (0-100) based on opportunity
- Categorize each: guide, comparison, product, informational, how-to, template, checklist
- Match topics to the closest cluster when possible

Respond with ONLY valid JSON array.`
          },
          {
            role: 'user',
            content: `Generate ${topicCount} SEO topic ideas based on these seed keywords: ${seedKeywords.join(', ')}

Existing topics to AVOID duplicating: ${[...existingKeywords].slice(0, 30).join(', ')}

Return JSON array:
[{
  "keyword_primary": "main keyword phrase",
  "keyword_variations": ["var1", "var2", "var3"],
  "search_volume": 1200,
  "keyword_difficulty": 35,
  "priority_score": 85,
  "estimated_monthly_traffic": 900,
  "category": "guide",
  "cluster_name": "Wedding Budget Management"
}]`
          }
        ],
        temperature: 0.8,
        max_tokens: 4096,
      }),
    });

    if (!openaiRes.ok) {
      return res.status(500).json({ error: `OpenAI API error: ${openaiRes.status}` });
    }

    const data = await openaiRes.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return res.status(500).json({ error: 'Empty OpenAI response' });

    let topics: Array<{
      keyword_primary: string;
      keyword_variations: string[];
      search_volume: number;
      keyword_difficulty: number;
      priority_score: number;
      estimated_monthly_traffic: number;
      category: string;
      cluster_name?: string;
    }>;

    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
      topics = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Build cluster name → id map
    const clusterNameMap: Record<string, string> = {};
    for (const c of (clusters ?? []) as Array<{ id: string; name: string }>) {
      clusterNameMap[c.name.toLowerCase()] = c.id;
    }

    // Filter out duplicates and insert
    const newTopics = topics.filter(t => !existingKeywords.has(t.keyword_primary.toLowerCase()));

    if (newTopics.length === 0) {
      return res.json({ discovered: 0, message: 'All generated topics already exist' });
    }

    const rows = newTopics.map(t => ({
      keyword_primary: t.keyword_primary,
      keyword_variations: t.keyword_variations ?? [],
      search_volume: t.search_volume ?? 0,
      keyword_difficulty: t.keyword_difficulty ?? 50,
      priority_score: t.priority_score ?? 70,
      estimated_monthly_traffic: t.estimated_monthly_traffic ?? 0,
      category: t.category ?? 'informational',
      topic_cluster_id: t.cluster_name ? clusterNameMap[t.cluster_name.toLowerCase()] ?? null : null,
      status: 'discovered',
      discovered_at: new Date().toISOString(),
    }));

    const { error: insertErr } = await supabase
      .from('topics_pipeline')
      .insert(rows);

    if (insertErr) return res.status(500).json({ error: insertErr.message });

    res.json({ discovered: newTopics.length, topics: newTopics.map(t => t.keyword_primary) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// =============================================
// DELETE /api/seo/pipeline/topics/:id — Remove a topic
// =============================================
router.delete('/pipeline/topics/:id', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('topics_pipeline')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// =============================================
// POST /api/seo/pipeline/smart-discover — Auto-discover best topics using full context
// =============================================
router.post('/pipeline/smart-discover', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  const { count } = req.body as { count?: number };
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  try {
    // Gather all context the AI needs to find optimal topics
    const [existingRes, clustersRes, competitorsRes, publishedRes, performanceRes] = await Promise.all([
      supabase.from('topics_pipeline').select('keyword_primary, status, category'),
      supabase.from('topic_clusters').select('id, name, pillar_keyword, target_post_count'),
      supabase.from('competitor_tracking').select('competitor_name, keyword, our_position, their_position'),
      supabase.from('blog_posts').select('title, primary_keyword, slug, status, total_views, total_clicks').eq('status', 'published'),
      supabase.from('seo_pages').select('target_keyword, seo_score, content_score').gt('seo_score', 0),
    ]);

    const existingTopics = (existingRes.data ?? []).map((t: { keyword_primary: string }) => t.keyword_primary);
    const clusters = (clustersRes.data ?? []) as Array<{ id: string; name: string; pillar_keyword: string; target_post_count: number }>;
    const competitors = (competitorsRes.data ?? []) as Array<{ competitor_name: string; keyword: string; our_position: number | null; their_position: number | null }>;
    const published = (publishedRes.data ?? []) as Array<{ title: string; primary_keyword: string | null; slug: string; total_views: number | null; total_clicks: number | null }>;
    const pages = (performanceRes.data ?? []) as Array<{ target_keyword: string | null; seo_score: number; content_score: number }>;

    // Count posts per cluster
    const topicsByCluster: Record<string, number> = {};
    for (const t of (existingRes.data ?? []) as Array<{ keyword_primary: string; category: string | null }>) {
      const cat = t.category ?? 'other';
      topicsByCluster[cat] = (topicsByCluster[cat] ?? 0) + 1;
    }

    // Build cluster context
    const clusterContext = clusters.map(c => {
      const postCount = (existingRes.data ?? []).filter((t: { keyword_primary: string; status: string }) =>
        t.keyword_primary.toLowerCase().includes((c.pillar_keyword ?? '').split(' ')[0].toLowerCase())
      ).length;
      return `- ${c.name} (pillar: "${c.pillar_keyword}", target: ${c.target_post_count} posts, current: ~${postCount})`;
    }).join('\n');

    // Build competitor context
    const competitorContext = competitors.length > 0
      ? competitors.slice(0, 15).map(c => `- ${c.competitor_name}: "${c.keyword}" (them: #${c.their_position ?? '?'}, us: #${c.our_position ?? 'unranked'})`).join('\n')
      : 'No competitor data yet';

    // Build published content context
    const publishedContext = published.length > 0
      ? published.map(p => `- "${p.primary_keyword ?? p.title}" (${p.total_views ?? 0} views, ${p.total_clicks ?? 0} clicks)`).join('\n')
      : 'No published content yet';

    // Weak content (low scores)
    const weakPages = pages.filter(p => p.seo_score < 60 && p.target_keyword);
    const weakContext = weakPages.length > 0
      ? weakPages.map(p => `- "${p.target_keyword}" (score: ${p.seo_score})`).join('\n')
      : 'None';

    const topicCount = Math.min(count ?? 20, 30);

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a senior SEO strategist for WedBoardPro, a B2B SaaS platform for professional wedding planners (NOT couples). Your job is to identify the highest-impact keyword opportunities to drive organic traffic and conversions.

You have access to the full SEO landscape below. Use it to make data-driven decisions about which topics to target next.

STRATEGY PRIORITIES:
1. Fill gaps in underpopulated topic clusters (clusters below target post count)
2. Target keywords where competitors rank but we don't
3. Find long-tail variations of our best-performing content
4. Identify comparison/alternative keywords for competitor names
5. Target high-intent keywords (commercial + transactional) for conversion
6. Find informational keywords to build topical authority
7. Avoid cannibalizing existing content — find NEW angles

KEYWORD QUALITY RULES:
- Realistic search volumes for B2B wedding planner niche (100-5000/mo typical)
- Prefer low difficulty (<50) with decent volume
- Mix: 40% informational, 30% commercial, 20% comparison, 10% transactional
- Every keyword must serve professional wedding planners specifically
- Priority scores should reflect true business impact (traffic × intent × feasibility)`
          },
          {
            role: 'user',
            content: `Analyze our SEO landscape and generate the ${topicCount} best topic opportunities:

## TOPIC CLUSTERS (content pillars)
${clusterContext || 'No clusters defined yet'}

## EXISTING TOPICS (already in pipeline — DO NOT duplicate)
${existingTopics.slice(0, 40).join(', ') || 'None'}

## COMPETITOR LANDSCAPE
${competitorContext}

## OUR PUBLISHED CONTENT (what's working)
${publishedContext}

## WEAK CONTENT (needs supporting articles)
${weakContext}

Generate ${topicCount} new topics. For each, match to the best topic cluster.

Respond with ONLY a valid JSON array:
[{
  "keyword_primary": "exact search phrase",
  "keyword_variations": ["var1", "var2", "var3"],
  "search_volume": 1200,
  "keyword_difficulty": 35,
  "priority_score": 85,
  "estimated_monthly_traffic": 900,
  "category": "guide|comparison|product|how-to|template|checklist|case-study",
  "cluster_name": "exact cluster name from list above",
  "rationale": "one sentence explaining why this topic matters"
}]`
          }
        ],
        temperature: 0.75,
        max_tokens: 4096,
      }),
    });

    if (!openaiRes.ok) {
      return res.status(500).json({ error: `OpenAI API error: ${openaiRes.status}` });
    }

    const data = await openaiRes.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return res.status(500).json({ error: 'Empty AI response' });

    let topics: Array<{
      keyword_primary: string;
      keyword_variations: string[];
      search_volume: number;
      keyword_difficulty: number;
      priority_score: number;
      estimated_monthly_traffic: number;
      category: string;
      cluster_name?: string;
      rationale?: string;
    }>;

    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
      topics = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Build cluster name → id map
    const clusterNameMap: Record<string, string> = {};
    for (const c of clusters) {
      clusterNameMap[c.name.toLowerCase()] = c.id;
    }

    // Filter out duplicates
    const existingSet = new Set(existingTopics.map((k: string) => k.toLowerCase()));
    const newTopics = topics.filter(t => !existingSet.has(t.keyword_primary.toLowerCase()));

    if (newTopics.length === 0) {
      return res.json({ discovered: 0, message: 'All generated topics already exist' });
    }

    const rows = newTopics.map(t => ({
      keyword_primary: t.keyword_primary,
      keyword_variations: t.keyword_variations ?? [],
      search_volume: t.search_volume ?? 0,
      keyword_difficulty: t.keyword_difficulty ?? 50,
      priority_score: t.priority_score ?? 70,
      estimated_monthly_traffic: t.estimated_monthly_traffic ?? 0,
      category: t.category ?? 'informational',
      topic_cluster_id: t.cluster_name ? clusterNameMap[t.cluster_name.toLowerCase()] ?? null : null,
      status: 'discovered',
      discovered_at: new Date().toISOString(),
    }));

    const { error: insertErr } = await supabase.from('topics_pipeline').insert(rows);
    if (insertErr) return res.status(500).json({ error: insertErr.message });

    res.json({
      discovered: newTopics.length,
      topics: newTopics.map(t => ({ keyword: t.keyword_primary, priority: t.priority_score, rationale: t.rationale })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/intelligence/product-features — All product features
// =============================================
router.get('/intelligence/product-features', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('product_features')
      .select('id, feature_name, feature_slug, category, description, key_benefits, use_cases, competitive_advantage, related_keywords, landing_page_url, is_active, display_order')
      .order('display_order');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// =============================================
// GET /api/seo/intelligence/competitor-comparisons — All competitor comparisons
// =============================================
router.get('/intelligence/competitor-comparisons', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('competitor_comparisons')
      .select('id, competitor_name, competitor_domain, competitor_tagline, pricing_info, target_market, strengths, weaknesses, our_advantages, feature_comparison, key_differentiators, comparison_keywords, is_active, last_analyzed_at')
      .order('competitor_name');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// =============================================
// GET /api/seo/intelligence/cta-templates — All CTA templates
// =============================================
router.get('/intelligence/cta-templates', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('cta_templates')
      .select('id, name, cta_type, content_type, heading, body_text, button_text, button_url, secondary_text, urgency_level, placement_hint, feature_slug, is_active, usage_count, conversion_rate')
      .order('content_type, cta_type');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// =============================================
// GET /api/seo/intelligence/content-gaps — Competitor content gaps
// =============================================
router.get('/intelligence/content-gaps', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('competitor_content_gaps')
      .select('id, competitor_name, topic, their_url, their_title, their_estimated_traffic, keyword_primary, keyword_difficulty, search_volume, our_coverage, opportunity_score, priority, status, notes, analyzed_at')
      .order('opportunity_score', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// =============================================
// GET /api/seo/intelligence/summary — Intelligence system overview
// =============================================
router.get('/intelligence/summary', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const [featuresRes, competitorsRes, ctasRes, gapsRes, postsRes] = await Promise.all([
      supabase.from('product_features').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('competitor_comparisons').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('cta_templates').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('competitor_content_gaps').select('id, status', { count: 'exact' }),
      supabase.from('blog_posts').select('id, generation_model, content_grade').not('generation_model', 'is', null),
    ]);

    const gaps = gapsRes.data ?? [];
    const gapsByStatus: Record<string, number> = {};
    for (const g of gaps) {
      const s = (g as { status: string }).status;
      gapsByStatus[s] = (gapsByStatus[s] ?? 0) + 1;
    }

    const enhancedPosts = (postsRes.data ?? []).filter((p: { generation_model: string | null }) => p.generation_model === 'enhanced-v1');
    const gradeDistribution: Record<string, number> = {};
    for (const p of enhancedPosts) {
      const g = (p as { content_grade: string | null }).content_grade ?? 'unknown';
      gradeDistribution[g] = (gradeDistribution[g] ?? 0) + 1;
    }

    res.json({
      productFeatures: featuresRes.count ?? 0,
      competitorComparisons: competitorsRes.count ?? 0,
      ctaTemplates: ctasRes.count ?? 0,
      contentGaps: {
        total: gaps.length,
        byStatus: gapsByStatus,
      },
      enhancedContent: {
        total: enhancedPosts.length,
        gradeDistribution,
      },
      systemVersion: 'enhanced-v1',
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// =============================================
// POST /api/seo/intelligence/analyze-gaps — AI-powered competitor gap analysis
// =============================================
router.post('/intelligence/analyze-gaps', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  try {
    // Gather context
    const [competitorsRes, postsRes, topicsRes] = await Promise.all([
      supabase.from('competitor_comparisons').select('competitor_name, competitor_domain, comparison_keywords').eq('is_active', true),
      supabase.from('blog_posts').select('title, primary_keyword, slug').eq('status', 'published'),
      supabase.from('topics_pipeline').select('keyword_primary, status'),
    ]);

    const competitors = (competitorsRes.data ?? []) as Array<{ competitor_name: string; competitor_domain: string; comparison_keywords: string[] }>;
    const published = (postsRes.data ?? []) as Array<{ title: string; primary_keyword: string | null; slug: string }>;
    const topics = (topicsRes.data ?? []) as Array<{ keyword_primary: string; status: string }>;

    const existingKeywords = new Set([
      ...published.map(p => p.primary_keyword?.toLowerCase()).filter(Boolean),
      ...topics.map(t => t.keyword_primary.toLowerCase()),
    ]);

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an SEO competitive analyst. Analyze the competitor landscape for WedBoardPro (B2B SaaS for professional wedding planners) and identify content gaps — topics competitors likely cover that we don't.

Focus on high-value, rankable content opportunities.`
          },
          {
            role: 'user',
            content: `Analyze these competitors and find 15 content gaps:

Competitors: ${competitors.map(c => `${c.competitor_name} (${c.competitor_domain})`).join(', ')}

Our existing content: ${published.map(p => p.primary_keyword ?? p.title).join(', ') || 'None'}

Topics already in pipeline: ${topics.map(t => t.keyword_primary).slice(0, 20).join(', ') || 'None'}

Return ONLY valid JSON array:
[{
  "competitor_name": "HoneyBook",
  "topic": "short topic description",
  "keyword_primary": "exact search keyword",
  "search_volume": 800,
  "keyword_difficulty": 40,
  "opportunity_score": 85,
  "priority": "high",
  "our_coverage": "none"
}]`
          }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!openaiRes.ok) return res.status(500).json({ error: `OpenAI error: ${openaiRes.status}` });

    const data = await openaiRes.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return res.status(500).json({ error: 'Empty AI response' });

    let gaps: Array<{
      competitor_name: string;
      topic: string;
      keyword_primary: string;
      search_volume: number;
      keyword_difficulty: number;
      opportunity_score: number;
      priority: string;
      our_coverage: string;
    }>;

    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
      gaps = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Filter duplicates
    const newGaps = gaps.filter(g => !existingKeywords.has(g.keyword_primary.toLowerCase()));

    if (newGaps.length === 0) {
      return res.json({ analyzed: 0, message: 'No new gaps found' });
    }

    // Look up competitor IDs
    const { data: compRows } = await supabase.from('competitors').select('id, name');
    const compIdMap: Record<string, string> = {};
    for (const c of (compRows ?? []) as Array<{ id: string; name: string }>) {
      compIdMap[c.name.toLowerCase()] = c.id;
    }

    const rows = newGaps.map(g => ({
      competitor_id: compIdMap[g.competitor_name.toLowerCase()] ?? null,
      competitor_name: g.competitor_name,
      topic: g.topic,
      keyword_primary: g.keyword_primary,
      search_volume: g.search_volume ?? 0,
      keyword_difficulty: g.keyword_difficulty ?? 50,
      opportunity_score: g.opportunity_score ?? 70,
      priority: g.priority ?? 'medium',
      our_coverage: g.our_coverage ?? 'none',
      status: 'identified',
      analyzed_at: new Date().toISOString(),
    }));

    const { error: insertErr } = await supabase.from('competitor_content_gaps').insert(rows);
    if (insertErr) return res.status(500).json({ error: insertErr.message });

    res.json({ analyzed: newGaps.length, gaps: newGaps.map(g => ({ keyword: g.keyword_primary, competitor: g.competitor_name, opportunity: g.opportunity_score })) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// =============================================
// CONTENT CLUSTERS
// =============================================

// GET /intelligence/clusters — list all content clusters with article counts
router.get('/intelligence/clusters', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data: clusters, error } = await supabase
      .from('content_clusters')
      .select('*, cluster_articles(id)')
      .order('estimated_monthly_traffic', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const result = (clusters ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      article_count: Array.isArray(c.cluster_articles) ? (c.cluster_articles as unknown[]).length : 0,
      cluster_articles: undefined,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// GET /intelligence/clusters/:id — cluster details with articles
router.get('/intelligence/clusters/:id', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data: cluster, error } = await supabase
      .from('content_clusters')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Cluster not found' });

    // Get articles in this cluster
    const { data: articles } = await supabase
      .from('cluster_articles')
      .select('id, article_role, internal_links_to, internal_links_from, blog_posts(id, title, slug, status, actual_word_count, content_grade, created_at)')
      .eq('cluster_id', req.params.id);

    res.json({ ...cluster, articles: articles ?? [] });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// POST /intelligence/clusters/:id/generate — trigger cluster generation
router.post('/intelligence/clusters/:id/generate', async (req: Request, res: Response) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Missing Supabase configuration' });
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/cluster-generator`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cluster_id: req.params.id }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(result);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// GET /intelligence/gaps — list all content gaps
router.get('/intelligence/gaps', async (_req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data: gaps, error } = await supabase
      .from('competitor_content_gaps')
      .select('*')
      .order('opportunity_score', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(gaps ?? []);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// POST /intelligence/gaps/analyze — analyze gaps for a competitor
router.post('/intelligence/gaps/analyze', async (req: Request, res: Response) => {
  try {
    const { competitor_name } = req.body;
    if (!competitor_name) {
      return res.status(400).json({ error: 'competitor_name is required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Missing Supabase configuration' });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/gap-analyzer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'analyze', competitor_name }),
    });

    const result = await response.json();
    if (!response.ok) return res.status(response.status).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// POST /intelligence/gaps/:id/generate — generate content for a gap
router.post('/intelligence/gaps/:id/generate', async (req: Request, res: Response) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Missing Supabase configuration' });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/gap-analyzer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'generate', gap_id: req.params.id }),
    });

    const result = await response.json();
    if (!response.ok) return res.status(response.status).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// =============================================
// POST /api/seo/intelligence/generate-manual — Manual article generation
// =============================================
router.post('/intelligence/generate-manual', async (req: Request, res: Response) => {
  try {
    const { keyword, intent, target_word_count, cluster_id } = req.body as {
      keyword: string;
      intent?: string;
      target_word_count?: number;
      cluster_id?: string;
    };

    if (!keyword) {
      return res.status(400).json({ error: 'keyword is required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: 'Missing Supabase configuration' });
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/seo-pipeline-controller`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_single',
          keyword,
          intent: intent || 'informational',
          target_word_count: target_word_count || 1500,
          cluster_id: cluster_id || null,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(result);
    }

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO generate-manual error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// GET /api/seo/articles — All articles with filters, sorting, pagination
// =============================================
router.get('/articles', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const {
      status = 'all',
      sort = 'created_at',
      order = 'desc',
      page = '1',
      per_page = '20',
      search = '',
    } = req.query as Record<string, string>;

    let query = supabase
      .from('blog_posts')
      .select('id, title, slug, status, content, meta_description, primary_keyword, actual_word_count, total_views, total_clicks, created_at, published_at, excerpt', { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,primary_keyword.ilike.%${search}%`);
    }

    const validSortFields = ['created_at', 'published_at', 'total_views', 'actual_word_count'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    query = query.order(sortField, { ascending: order === 'asc', nullsFirst: false });

    const pageNum = parseInt(page) || 1;
    const perPageNum = Math.min(parseInt(per_page) || 20, 100);
    const from = (pageNum - 1) * perPageNum;
    const to = from + perPageNum - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    // Get SEO scores
    const postIds = (data ?? []).map((p: { id: string }) => p.id);
    let seoMap = new Map<string, number>();
    if (postIds.length > 0) {
      const { data: seoData } = await supabase
        .from('seo_pages')
        .select('blog_post_id, seo_score')
        .in('blog_post_id', postIds);

      seoMap = new Map(
        (seoData ?? []).map((p: { blog_post_id: string; seo_score: number }) => [p.blog_post_id, p.seo_score])
      );
    }

    const articles = (data ?? []).map((p: {
      id: string; title: string; slug: string; status: string;
      content: string; meta_description: string | null;
      primary_keyword: string | null; actual_word_count: number | null;
      total_views: number | null; total_clicks: number | null;
      created_at: string; published_at: string | null; excerpt: string | null;
    }) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      content: p.content,
      meta_description: p.meta_description || '',
      primary_keyword: p.primary_keyword,
      actual_word_count: p.actual_word_count ?? 0,
      total_views: p.total_views ?? 0,
      total_clicks: p.total_clicks ?? 0,
      created_at: p.created_at,
      published_at: p.published_at,
      excerpt: p.excerpt || '',
      seo_score: seoMap.get(p.id) ?? 0,
    }));

    res.json({
      articles,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / perPageNum),
      page: pageNum,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO articles error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// PATCH /api/seo/articles/:id — Update article
// =============================================
router.patch('/articles/:id', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { id } = req.params;
    const { title, content, meta_description, status, actual_word_count } = req.body as {
      title?: string;
      content?: string;
      meta_description?: string;
      status?: string;
      actual_word_count?: number;
    };

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (meta_description !== undefined) updates.meta_description = meta_description;
    if (actual_word_count !== undefined) updates.actual_word_count = actual_word_count;
    if (status !== undefined) {
      updates.status = status;
      if (status === 'published') {
        updates.published_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select('id, title, slug, status, content, meta_description, primary_keyword, actual_word_count, total_views, total_clicks, created_at, published_at, excerpt')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO articles patch error:', message);
    res.status(500).json({ error: message });
  }
});

// =============================================
// POST /api/seo/articles/:id/publish — Publish article
// =============================================
router.post('/articles/:id/publish', async (req: Request, res: Response) => {
  const supabase = getClient(res);
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('id, title, slug, status, published_at')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('SEO articles publish error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
