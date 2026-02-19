import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import '../team.css';

// ── Command Center interfaces ───────────────────────────────────────

interface CommandCenterData {
  pipeline: {
    totalPosts: number;
    drafts: number;
    inReview: number;
    published: number;
    totalWords: number;
    postsThisWeek: number;
    publishedThisMonth: number;
  };
  quality: {
    totalSeoPages: number;
    avgSeoScore: number;
    avgContentScore: number;
    avgTechnicalScore: number;
    excellentPages: number;
    goodPages: number;
    needsWorkPages: number;
  };
  clusters: Array<{
    id: string;
    name: string;
    pillarKeyword: string;
    status: string;
    targetPosts: number;
    currentPosts: number;
    completion: number;
  }>;
  recentRuns: Array<{
    id: string;
    type: string;
    status: string;
    itemsProcessed: number;
    itemsCreated: number;
    itemsUpdated: number;
    error: string | null;
    startedAt: string;
    duration: number | null;
  }>;
  topPosts: Array<{
    id: string;
    title: string;
    slug: string;
    primaryKeyword: string | null;
    views: number;
    clicks: number;
    wordCount: number;
    seoScore: number;
    publishedAt: string | null;
  }>;
  actions: Array<{
    type: 'warning' | 'success' | 'info';
    message: string;
    priority: number;
  }>;
}

// ── Intelligence interfaces ─────────────────────────────────────────

interface IntelOverview {
  totalPages: number;
  avgScore: number;
  pendingReview: number;
  weeklyGenerated: number;
  estimatedTraffic: number;
}

interface PageAttention {
  id: string;
  title: string;
  slug: string;
  score: number;
  issues: {
    status: string;
    reason: string;
    contentScore: number;
    technicalScore: number;
    pageType: string;
  };
}

interface CompetitorEntry {
  competitor: string;
  domain: string;
  keyword: string;
  ourPage: string | null;
  score: number | null;
  ranking: number | null;
  theirRanking: number | null;
  positionStatus: string;
  opportunityScore: number;
  status: string;
}

interface ProgrammaticTemplate {
  templateName: string;
  templateType: string;
  status: string;
  generated: number;
  published: number;
  needsReview: number;
  avgScore: number;
  publishRate: number;
  totalViews: number;
  totalClicks: number;
}

interface IntelHealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  value: number;
}

interface IntelHealthData {
  status: 'healthy' | 'warning' | 'critical';
  checks: IntelHealthCheck[];
  recentRuns: IntelRecentRun[];
  errorLog: IntelErrorEntry[];
  infoLog?: IntelErrorEntry[];
}

interface IntelRecentRun {
  id: string;
  type: string;
  status: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  error: string | null;
  startedAt: string;
  duration: number | null;
}

interface IntelErrorEntry {
  id: string;
  type: string;
  error: string;
  startedAt: string;
}

// ── Cluster & Gap interfaces ────────────────────────────────────

interface ClusterData {
  id: string;
  cluster_name: string;
  description: string | null;
  pillar_keyword: string;
  pillar_page_id: string | null;
  supporting_keywords: string[];
  target_articles: number;
  completed_articles: number;
  cluster_status: string;
  estimated_monthly_traffic: number;
  actual_monthly_traffic: number | null;
  cluster_authority_score: number | null;
  article_count: number;
  created_at: string;
  updated_at: string;
}

interface GapData {
  id: string;
  competitor_id: string | null;
  competitor_name: string;
  topic: string;
  their_url: string | null;
  their_title: string | null;
  their_word_count: number;
  their_domain_authority: number;
  keyword_primary: string;
  keyword_difficulty: number | null;
  search_volume: number | null;
  our_coverage: string;
  our_post_id: string | null;
  opportunity_score: number;
  priority: string;
  status: string;
  notes: string | null;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Content Review interfaces ─────────────────────────────────────

interface ContentPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  content: string;
  excerpt: string | null;
  metaDescription: string | null;
  primaryKeyword: string | null;
  keywordVariations: string[];
  wordCount: number;
  createdAt: string;
  publishedAt: string | null;
  seoScore: number;
  contentScore: number;
  technicalScore: number;
  urlPath: string;
}

interface TeamUser {
  email: string;
  name: string;
  role: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function intelScoreColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#d97706';
  if (score >= 40) return '#ea580c';
  return '#dc2626';
}

function intelScoreBg(score: number): { background: string; color: string } {
  if (score >= 80) return { background: '#ecfdf5', color: '#059669' };
  if (score >= 60) return { background: '#fffbeb', color: '#d97706' };
  if (score >= 40) return { background: '#fff7ed', color: '#ea580c' };
  return { background: '#fef2f2', color: '#dc2626' };
}

function intelScoreBarBg(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function statusStyle(status: string): { background: string; color: string } {
  switch (status) {
    case 'winning': case 'completed': case 'active': case 'healthy':
      return { background: '#ecfdf5', color: '#059669' };
    case 'competing': case 'warning': case 'paused':
      return { background: '#fffbeb', color: '#d97706' };
    case 'losing': case 'failed': case 'critical':
      return { background: '#fef2f2', color: '#dc2626' };
    case 'opportunity': case 'running':
      return { background: '#eff6ff', color: '#2563eb' };
    default:
      return { background: '#f3f4f6', color: '#6b7280' };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Component ───────────────────────────────────────────────────────

const SEODashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'command' | 'intelligence' | 'content' | 'pipeline'>('command');
  const [user, setUser] = useState<TeamUser | null>(null);

  // Command Center state
  const [commandData, setCommandData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commandError, setCommandError] = useState<string | null>(null);

  // Intelligence state
  const [intelOverview, setIntelOverview] = useState<IntelOverview | null>(null);
  const [intelPages, setIntelPages] = useState<PageAttention[]>([]);
  const [intelCompetitors, setIntelCompetitors] = useState<CompetitorEntry[]>([]);
  const [intelTemplates, setIntelTemplates] = useState<ProgrammaticTemplate[]>([]);
  const [intelHealth, setIntelHealth] = useState<IntelHealthData | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [intelFetched, setIntelFetched] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineMessage, setPipelineMessage] = useState<string | null>(null);
  const [intelSubTab, setIntelSubTab] = useState<'overview' | 'pages' | 'competitors' | 'templates' | 'clusters' | 'gaps'>('overview');

  // Clusters & Gaps state
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [gaps, setGaps] = useState<GapData[]>([]);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [clustersFetched, setClustersFetched] = useState(false);
  const [gapsFetched, setGapsFetched] = useState(false);
  const [generatingClusterId, setGeneratingClusterId] = useState<string | null>(null);
  const [generatingGapId, setGeneratingGapId] = useState<string | null>(null);
  const [analyzingCompetitor, setAnalyzingCompetitor] = useState<string | null>(null);
  const [clusterMessage, setClusterMessage] = useState<string | null>(null);
  const [gapMessage, setGapMessage] = useState<string | null>(null);

  // Content Review state
  const [contentPosts, setContentPosts] = useState<ContentPost[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentFetched, setContentFetched] = useState(false);
  const [contentFilter, setContentFilter] = useState<'all' | 'draft' | 'in_review' | 'published'>('all');
  const [contentSort, setContentSort] = useState<'date' | 'score' | 'title'>('date');
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Pipeline state
  interface PipelineTopic {
    id: string;
    keyword: string;
    variations: string[];
    volume: number;
    difficulty: number;
    priority: number;
    traffic: number;
    category: string;
    status: string;
    clusterId: string | null;
    clusterName: string | null;
    postId: string | null;
    createdAt: string;
    validatedAt: string | null;
  }
  const [pipelineTopics, setPipelineTopics] = useState<PipelineTopic[]>([]);
  const [pipelineFunnel, setPipelineFunnel] = useState<Record<string, number>>({});
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineFetched, setPipelineFetched] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');
  const [discoverKeywords, setDiscoverKeywords] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discoverMessage, setDiscoverMessage] = useState<string | null>(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());

  const token = sessionStorage.getItem('team_token');

  useEffect(() => {
    if (!token) { navigate('/team-login'); return; }
    try {
      const userData = sessionStorage.getItem('team_user');
      if (userData) setUser(JSON.parse(userData));
    } catch { navigate('/team-login'); }
  }, [navigate, token]);

  // Command Center fetch
  const fetchCommandData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setCommandError(null);
    try {
      const res = await fetch('/api/seo/command-center', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setCommandError('Failed to load command center data.');
      } else {
        setCommandData(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch command center data:', err);
      setCommandError('Failed to load data. Check your connection.');
    } finally { setLoading(false); }
  }, [token]);

  // Intelligence fetch
  const fetchIntelData = useCallback(async () => {
    if (!token) return;
    setIntelLoading(true);
    setIntelError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [overviewRes, pagesRes, competitorsRes, templatesRes, healthRes] = await Promise.all([
        fetch('/api/seo/overview', { headers }),
        fetch('/api/seo/pages-needing-attention', { headers }),
        fetch('/api/seo/competitor-performance', { headers }),
        fetch('/api/seo/programmatic-status', { headers }),
        fetch('/api/seo/health', { headers }),
      ]);
      const allFailed = !overviewRes.ok && !pagesRes.ok && !competitorsRes.ok && !templatesRes.ok && !healthRes.ok;
      if (allFailed) {
        setIntelError('Intelligence APIs are unavailable (503). The Supabase service client may not be configured.');
      } else {
        if (overviewRes.ok) setIntelOverview(await overviewRes.json());
        if (pagesRes.ok) setIntelPages(await pagesRes.json());
        if (competitorsRes.ok) setIntelCompetitors(await competitorsRes.json());
        if (templatesRes.ok) setIntelTemplates(await templatesRes.json());
        if (healthRes.ok) setIntelHealth(await healthRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch intelligence data:', err);
      setIntelError('Failed to load intelligence data. Check your connection.');
    } finally {
      setIntelLoading(false);
      setIntelFetched(true);
    }
  }, [token]);

  useEffect(() => { fetchCommandData(); }, [fetchCommandData]);

  useEffect(() => {
    if (activeTab === 'intelligence' && !intelFetched && !intelLoading) {
      fetchIntelData();
    }
  }, [activeTab, intelFetched, intelLoading, fetchIntelData]);

  // Content Review fetch
  const fetchContentPosts = useCallback(async () => {
    if (!token) return;
    setContentLoading(true);
    setContentError(null);
    try {
      const res = await fetch('/api/seo/content-review', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setContentError('Failed to load content review data.');
      } else {
        setContentPosts(await res.json());
      }
    } catch {
      setContentError('Failed to load content review data. Check your connection.');
    } finally {
      setContentLoading(false);
      setContentFetched(true);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'content' && !contentFetched && !contentLoading) {
      fetchContentPosts();
    }
  }, [activeTab, contentFetched, contentLoading, fetchContentPosts]);

  const handleUpdatePostStatus = async (postId: string, newStatus: string) => {
    if (!token) return;
    setUpdatingPostId(postId);
    const prevPosts = [...contentPosts];
    setContentPosts(posts => posts.map(p => p.id === postId ? { ...p, status: newStatus, publishedAt: newStatus === 'published' ? new Date().toISOString() : p.publishedAt } : p));
    try {
      const res = await fetch(`/api/seo/content-review/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setContentPosts(prevPosts);
        alert('Failed to update post status.');
      }
    } catch {
      setContentPosts(prevPosts);
      alert('Failed to update post status.');
    } finally { setUpdatingPostId(null); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!token || !confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
    setDeletingPostId(postId);
    try {
      const res = await fetch(`/api/seo/content-review/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setContentPosts(posts => posts.filter(p => p.id !== postId));
      } else { alert('Failed to delete post.'); }
    } catch { alert('Failed to delete post.'); }
    finally { setDeletingPostId(null); }
  };

  const filteredPosts = contentPosts
    .filter(p => contentFilter === 'all' || p.status === contentFilter)
    .sort((a, b) => {
      if (contentSort === 'score') return b.seoScore - a.seoScore;
      if (contentSort === 'title') return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const contentStats = {
    total: contentPosts.length,
    draft: contentPosts.filter(p => p.status === 'draft').length,
    inReview: contentPosts.filter(p => p.status === 'in_review').length,
    published: contentPosts.filter(p => p.status === 'published').length,
  };

  // Pipeline functions
  const fetchPipelineTopics = useCallback(async () => {
    if (!token) return;
    setPipelineLoading(true);
    setPipelineError(null);
    try {
      const res = await fetch('/api/seo/pipeline/topics', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setPipelineError('Failed to load pipeline data.'); return; }
      const data = await res.json();
      setPipelineTopics(data.topics);
      setPipelineFunnel(data.funnel);
    } catch { setPipelineError('Failed to load pipeline data.'); }
    finally { setPipelineLoading(false); setPipelineFetched(true); }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'pipeline' && !pipelineFetched && !pipelineLoading) {
      fetchPipelineTopics();
    }
  }, [activeTab, pipelineFetched, pipelineLoading, fetchPipelineTopics]);

  const handleValidateTopic = async (topicId: string) => {
    if (!token) return;
    const prev = [...pipelineTopics];
    setPipelineTopics(t => t.map(x => x.id === topicId ? { ...x, status: 'validated' } : x));
    try {
      const res = await fetch(`/api/seo/pipeline/topics/${topicId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'validated' }),
      });
      if (!res.ok) { setPipelineTopics(prev); alert('Failed to validate topic.'); }
      else { fetchPipelineTopics(); }
    } catch { setPipelineTopics(prev); }
  };

  const handleBulkValidate = async () => {
    if (!token || selectedTopicIds.size === 0) return;
    const ids = [...selectedTopicIds];
    try {
      const res = await fetch('/api/seo/pipeline/topics/bulk-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setSelectedTopicIds(new Set());
        fetchPipelineTopics();
      } else { alert('Failed to bulk validate.'); }
    } catch { alert('Failed to bulk validate.'); }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!token || !confirm('Delete this topic from the pipeline?')) return;
    try {
      const res = await fetch(`/api/seo/pipeline/topics/${topicId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchPipelineTopics();
      else alert('Failed to delete topic.');
    } catch { alert('Failed to delete topic.'); }
  };

  const handleDiscoverTopics = async () => {
    if (!token || !discoverKeywords.trim()) return;
    setDiscovering(true);
    setDiscoverMessage(null);
    try {
      const seeds = discoverKeywords.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/seo/pipeline/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ seedKeywords: seeds, count: 15 }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiscoverMessage(`Discovered ${data.discovered} new topics`);
        setDiscoverKeywords('');
        fetchPipelineTopics();
      } else {
        setDiscoverMessage(`Error: ${data.error}`);
      }
    } catch { setDiscoverMessage('Failed to discover topics.'); }
    finally { setDiscovering(false); }
  };

  const [smartDiscovering, setSmartDiscovering] = useState(false);

  const handleSmartDiscover = async () => {
    if (!token) return;
    setSmartDiscovering(true);
    setDiscoverMessage(null);
    try {
      const res = await fetch('/api/seo/pipeline/smart-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ count: 20 }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiscoverMessage(`AI discovered ${data.discovered} high-impact topics based on your clusters, competitors, and content gaps`);
        fetchPipelineTopics();
      } else {
        setDiscoverMessage(`Error: ${data.error}`);
      }
    } catch { setDiscoverMessage('Failed to run smart discovery.'); }
    finally { setSmartDiscovering(false); }
  };

  const pipelineStatuses = ['discovered', 'validated', 'brief_created', 'in_production', 'in_review', 'published'];
  const filteredTopics = pipelineFilter === 'all'
    ? pipelineTopics
    : pipelineTopics.filter(t => t.status === pipelineFilter);

  const toggleTopicSelection = (id: string) => {
    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRunPipeline = async () => {
    if (!token) return;
    setRunningPipeline(true);
    setPipelineMessage(null);
    try {
      const res = await fetch('/api/seo/run-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPipelineMessage('Pipeline started successfully. Refreshing data...');
        setTimeout(() => { fetchIntelData(); fetchCommandData(); if (pipelineFetched) fetchPipelineTopics(); }, 3000);
      } else {
        const err = await res.json();
        setPipelineMessage(`Pipeline failed: ${err.error || 'Unknown error'}`);
      }
    } catch { setPipelineMessage('Failed to start pipeline. Check connection.'); }
    finally { setRunningPipeline(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('team_token');
    sessionStorage.removeItem('team_user');
    navigate('/team-login');
  };

  // Clusters fetch
  const fetchClusters = useCallback(async () => {
    if (!token) return;
    setClustersLoading(true);
    try {
      const res = await fetch('/api/seo/intelligence/clusters', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setClusters(await res.json());
    } catch { /* ignore */ }
    finally { setClustersLoading(false); setClustersFetched(true); }
  }, [token]);

  // Gaps fetch
  const fetchGaps = useCallback(async () => {
    if (!token) return;
    setGapsLoading(true);
    try {
      const res = await fetch('/api/seo/intelligence/gaps', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setGaps(await res.json());
    } catch { /* ignore */ }
    finally { setGapsLoading(false); setGapsFetched(true); }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'intelligence' && intelSubTab === 'clusters' && !clustersFetched && !clustersLoading) {
      fetchClusters();
    }
  }, [activeTab, intelSubTab, clustersFetched, clustersLoading, fetchClusters]);

  useEffect(() => {
    if (activeTab === 'intelligence' && intelSubTab === 'gaps' && !gapsFetched && !gapsLoading) {
      fetchGaps();
    }
  }, [activeTab, intelSubTab, gapsFetched, gapsLoading, fetchGaps]);

  // Generate next article in a cluster
  const handleGenerateClusterArticle = async (clusterId: string) => {
    if (!token) return;
    setGeneratingClusterId(clusterId);
    setClusterMessage(null);
    try {
      const res = await fetch(`/api/seo/intelligence/clusters/${clusterId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setClusterMessage(`Generated "${data.article_generated?.title ?? 'article'}" (${data.article_generated?.word_count ?? 0} words) — ${data.remaining} remaining`);
        fetchClusters();
      } else {
        setClusterMessage(`Error: ${data.error}`);
      }
    } catch { setClusterMessage('Failed to generate article.'); }
    finally { setGeneratingClusterId(null); }
  };

  // Analyze competitor gaps
  const handleAnalyzeCompetitor = async (competitorName: string) => {
    if (!token) return;
    setAnalyzingCompetitor(competitorName);
    setGapMessage(null);
    try {
      const res = await fetch('/api/seo/intelligence/gaps/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ competitor_name: competitorName }),
      });
      const data = await res.json();
      if (res.ok) {
        setGapMessage(`Found ${data.total_gaps} gaps for ${competitorName} (${data.gaps_from_tracking} from tracking, ${data.gaps_from_ai} from AI)`);
        fetchGaps();
      } else {
        setGapMessage(`Error: ${data.error}`);
      }
    } catch { setGapMessage('Failed to analyze competitor.'); }
    finally { setAnalyzingCompetitor(null); }
  };

  // Generate content for a gap
  const handleGenerateGapContent = async (gapId: string) => {
    if (!token) return;
    setGeneratingGapId(gapId);
    setGapMessage(null);
    try {
      const res = await fetch(`/api/seo/intelligence/gaps/${gapId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setGapMessage(`Created article "${data.title}" (${data.word_count} words) for keyword "${data.keyword}"`);
        fetchGaps();
      } else {
        setGapMessage(`Error: ${data.error}`);
      }
    } catch { setGapMessage('Failed to generate content.'); }
    finally { setGeneratingGapId(null); }
  };

  const criticalPages = intelPages.filter(p => p.issues.status === 'critical').length;
  const warningPages = intelPages.filter(p => p.issues.status === 'warning').length;
  const lastRun = intelHealth?.recentRuns?.[0];

  if (!user) return null;

  return (
    <div className="team-dashboard-page">
      <header className="team-header">
        <div className="team-header-left">
          <Link to="/" className="team-header-logo">
            <img src="/logo/iconlogo.png" alt="WedBoardPro" />
            <span>WedBoardPro</span>
          </Link>
          <span style={{ fontSize: 14, color: '#6b7280' }}>SEO</span>
        </div>
        <nav className="team-header-nav">
          <button
            className={`team-nav-btn ${activeTab === 'command' ? 'active' : ''}`}
            onClick={() => setActiveTab('command')}
          >
            Command Center
          </button>
          <button
            className={`team-nav-btn ${activeTab === 'intelligence' ? 'active' : ''}`}
            onClick={() => setActiveTab('intelligence')}
          >
            Intelligence
          </button>
          <button
            className={`team-nav-btn ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            Content Review
          </button>
          <button
            className={`team-nav-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            Pipeline
          </button>
          <button
            className="team-nav-btn"
            onClick={() => navigate('/team')}
            style={{ background: 'transparent', color: '#6b7280' }}
          >
            Back to Dashboard
          </button>
        </nav>
        <div className="team-header-right">
          <div className="team-user-info">
            <div className="team-user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <span className="team-user-name">{user.name}</span>
          </div>
          <button className="team-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="team-content">

        {/* ═══════════════ COMMAND CENTER TAB ═══════════════ */}
        {activeTab === 'command' && (
          <>
            {loading ? (
              <div className="team-section" style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Loading command center...</div>
              </div>
            ) : commandError ? (
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14,
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span>{commandError}</span>
                <button onClick={fetchCommandData} className="team-action-btn" style={{ fontSize: 12 }}>Retry</button>
              </div>
            ) : commandData && (
              <>
                {/* Stats Row */}
                <div className="team-stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                  <div className="team-stat-card" style={{ textAlign: 'center' }}>
                    <div className="team-stat-label">Total Posts</div>
                    <div className="team-stat-value">{commandData.pipeline.totalPosts}</div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{commandData.pipeline.postsThisWeek} this week</p>
                  </div>
                  <div className="team-stat-card" style={{ textAlign: 'center' }}>
                    <div className="team-stat-label">Published</div>
                    <div className="team-stat-value" style={{ color: '#059669' }}>{commandData.pipeline.published}</div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>live on blog</p>
                  </div>
                  <div className="team-stat-card" style={{ textAlign: 'center' }}>
                    <div className="team-stat-label">Awaiting Review</div>
                    <div className="team-stat-value" style={{ color: commandData.pipeline.inReview > 0 ? '#d97706' : '#111827' }}>{commandData.pipeline.inReview}</div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{commandData.pipeline.drafts} drafts</p>
                  </div>
                  <div className="team-stat-card" style={{ textAlign: 'center' }}>
                    <div className="team-stat-label">Avg SEO Score</div>
                    <div className={`team-stat-value ${getScoreColor(commandData.quality.avgSeoScore)}`}>{commandData.quality.avgSeoScore}</div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{commandData.quality.totalSeoPages} pages scored</p>
                  </div>
                  <div className="team-stat-card" style={{ textAlign: 'center' }}>
                    <div className="team-stat-label">Total Words</div>
                    <div className="team-stat-value">{commandData.pipeline.totalWords.toLocaleString()}</div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>content produced</p>
                  </div>
                </div>

                {/* Action Items + Quick Actions */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
                  <div className="team-section" style={{ flex: 2 }}>
                    <div className="team-section-header">
                      <h3 className="team-section-title">Action Items</h3>
                      <button onClick={fetchCommandData} disabled={loading} className="team-action-btn" style={{ fontSize: 12, opacity: loading ? 0.5 : 1 }}>
                        Refresh
                      </button>
                    </div>
                    {commandData.actions.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                        <p style={{ fontSize: 14 }}>All good! No action items.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {commandData.actions.map((action, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
                            background: action.type === 'warning' ? '#fffbeb' : action.type === 'success' ? '#f0fdf4' : '#eff6ff',
                          }}>
                            {action.type === 'warning' ? (
                              <AlertTriangle style={{ width: 16, height: 16, color: '#d97706', flexShrink: 0 }} />
                            ) : action.type === 'success' ? (
                              <CheckCircle style={{ width: 16, height: 16, color: '#059669', flexShrink: 0 }} />
                            ) : (
                              <Zap style={{ width: 16, height: 16, color: '#2563eb', flexShrink: 0 }} />
                            )}
                            <span style={{
                              fontSize: 13,
                              color: action.type === 'warning' ? '#92400e' : action.type === 'success' ? '#065f46' : '#1e40af',
                            }}>{action.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions Panel */}
                  <div className="team-section" style={{ flex: 1 }}>
                    <div className="team-section-header">
                      <h3 className="team-section-title">Quick Actions</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button
                        onClick={handleRunPipeline}
                        disabled={runningPipeline}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8,
                          background: '#111827', color: '#fff', border: 'none', cursor: 'pointer', width: '100%',
                          fontSize: 13, fontWeight: 500, opacity: runningPipeline ? 0.6 : 1,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>▶</span>
                        {runningPipeline ? 'Running Pipeline...' : 'Generate New Content'}
                      </button>
                      {commandData.pipeline.inReview > 0 && (
                        <button
                          onClick={() => setActiveTab('content')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8,
                            background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', cursor: 'pointer', width: '100%',
                            fontSize: 13, fontWeight: 500,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>📋</span>
                          Review {commandData.pipeline.inReview} Pending Post{commandData.pipeline.inReview > 1 ? 's' : ''}
                        </button>
                      )}
                      {commandData.pipeline.published > 0 && (
                        <Link
                          to="/blog"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8,
                            background: '#f0fdf4', color: '#065f46', border: '1px solid #bbf7d0', textDecoration: 'none', width: '100%',
                            fontSize: 13, fontWeight: 500,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>🌐</span>
                          View Live Blog
                        </Link>
                      )}
                      <button
                        onClick={() => setActiveTab('intelligence')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8,
                          background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', cursor: 'pointer', width: '100%',
                          fontSize: 13, fontWeight: 500,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>📊</span>
                        SEO Intelligence
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pipeline Message from Run Pipeline */}
                {pipelineMessage && (
                  <div style={{
                    padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 8,
                    ...(pipelineMessage.includes('failed') || pipelineMessage.includes('Failed')
                      ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
                      : { background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' })
                  }}>
                    <span>{pipelineMessage.includes('failed') || pipelineMessage.includes('Failed') ? '✕' : '✓'}</span>
                    {pipelineMessage}
                  </div>
                )}

                {/* Bottom Grid: Quality + Clusters + Recent Runs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  {/* SEO Quality */}
                  <div className="team-section">
                    <div className="team-section-header">
                      <h3 className="team-section-title">SEO Quality</h3>
                    </div>
                    {commandData.quality.totalSeoPages === 0 ? (
                      <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 32 }}>No scored pages yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Score Distribution */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1, padding: 12, borderRadius: 8, background: '#f0fdf4', textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>{commandData.quality.excellentPages}</div>
                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>80+</div>
                          </div>
                          <div style={{ flex: 1, padding: 12, borderRadius: 8, background: '#fffbeb', textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#d97706' }}>{commandData.quality.goodPages}</div>
                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>60-79</div>
                          </div>
                          <div style={{ flex: 1, padding: 12, borderRadius: 8, background: '#fef2f2', textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>{commandData.quality.needsWorkPages}</div>
                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>&lt;60</div>
                          </div>
                        </div>
                        {/* Score Bars */}
                        {[
                          { label: 'Content', score: commandData.quality.avgContentScore },
                          { label: 'Technical', score: commandData.quality.avgTechnicalScore },
                        ].map(({ label, score }) => (
                          <div key={label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: intelScoreColor(score) }}>{score}</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 3, transition: 'width 0.3s',
                                background: intelScoreBarBg(score),
                                width: `${score}%`,
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Topic Clusters */}
                  <div className="team-section">
                    <div className="team-section-header">
                      <h3 className="team-section-title">Topic Clusters</h3>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{commandData.clusters.length} clusters</span>
                    </div>
                    {commandData.clusters.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: 32 }}>No clusters yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {commandData.clusters.map((cluster) => (
                          <div key={cluster.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{cluster.name}</span>
                              <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{cluster.currentPosts}/{cluster.targetPosts}</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 3, transition: 'width 0.3s',
                                background: cluster.completion >= 80 ? '#10b981' : cluster.completion >= 50 ? '#f59e0b' : cluster.completion > 0 ? '#3b82f6' : '#e5e7eb',
                                width: `${Math.max(cluster.completion, 2)}%`,
                              }} />
                            </div>
                            <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{cluster.pillarKeyword}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Pipeline Runs */}
                  <div className="team-section">
                    <div className="team-section-header">
                      <h3 className="team-section-title">Recent Runs</h3>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{commandData.recentRuns.length} runs</span>
                    </div>
                    {commandData.recentRuns.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                        <p style={{ fontSize: 13 }}>No pipeline runs yet</p>
                        <p style={{ fontSize: 11, marginTop: 4 }}>Click "Generate New Content" to start</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {commandData.recentRuns.slice(0, 6).map((run) => {
                          const sts = statusStyle(run.status);
                          return (
                            <div key={run.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#f9fafb' }}>
                              <span style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, background: sts.background, color: sts.color }}>
                                {run.status === 'completed' ? '✓' : run.status === 'running' ? '↻' : run.status === 'failed' ? '✕' : '⏳'}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 12, fontWeight: 500, color: '#111827', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.type.replace(/_/g, ' ')}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{timeAgo(run.startedAt)}</span>
                                  {run.itemsCreated > 0 && <span style={{ fontSize: 10, color: '#059669' }}>+{run.itemsCreated} new</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Published Posts */}
                {commandData.topPosts.length > 0 && (
                  <div className="team-section" style={{ marginTop: 16 }}>
                    <div className="team-section-header">
                      <h3 className="team-section-title">Published Posts</h3>
                      <Link to="/blog" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>View blog →</Link>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <th style={{ textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', paddingLeft: 16 }}>Post</th>
                          <th style={{ textAlign: 'center', fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', width: 80 }}>SEO Score</th>
                          <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', width: 80 }}>Words</th>
                          <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', width: 100 }}>Published</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commandData.topPosts.map((post) => {
                          const sBg = intelScoreBg(post.seoScore);
                          return (
                            <tr key={post.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                              <td style={{ padding: '10px 16px' }}>
                                <Link to={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                                  <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{post.title}</p>
                                </Link>
                                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{post.primaryKeyword || '—'}</p>
                              </td>
                              <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                                <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: sBg.background, color: sBg.color }}>{post.seoScore}</span>
                              </td>
                              <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>{post.wordCount.toLocaleString()}</span>
                              </td>
                              <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>{post.publishedAt ? timeAgo(post.publishedAt) : '—'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════ INTELLIGENCE TAB ═══════════════ */}
        {activeTab === 'intelligence' && (
          <>
            {/* Pipeline Message */}
            {pipelineMessage && (
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 8,
                ...(pipelineMessage.includes('failed') || pipelineMessage.includes('Failed')
                  ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
                  : { background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' })
              }}>
                <span>{pipelineMessage.includes('failed') || pipelineMessage.includes('Failed') ? '✕' : '✓'}</span>
                {pipelineMessage}
              </div>
            )}

            {/* Error banner */}
            {intelError && (
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14,
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span>{intelError}</span>
                <button onClick={fetchIntelData} className="team-action-btn" style={{ fontSize: 12 }}>Retry</button>
              </div>
            )}

            {intelLoading ? (
              <div className="team-section" style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Loading intelligence data...</div>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="team-stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
                  <div className="team-stat-card">
                    <div className="team-stat-label">Total Pages</div>
                    <div className="team-stat-value">{intelOverview?.totalPages ?? 0}</div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>indexed pages</p>
                  </div>
                  <div className="team-stat-card">
                    <div className="team-stat-label">Avg Score</div>
                    <div className="team-stat-value" style={{ color: intelScoreColor(intelOverview?.avgScore ?? 0) }}>
                      {intelOverview?.avgScore ?? 0}
                    </div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      {(intelOverview?.avgScore ?? 0) >= 80 ? 'Excellent' : (intelOverview?.avgScore ?? 0) >= 60 ? 'Good' : (intelOverview?.avgScore ?? 0) >= 40 ? 'Needs work' : 'Critical'}
                    </p>
                  </div>
                  <div className="team-stat-card">
                    <div className="team-stat-label">Need Review</div>
                    <div className="team-stat-value" style={{ color: (intelOverview?.pendingReview ?? 0) > 0 ? '#d97706' : '#111827' }}>
                      {intelOverview?.pendingReview ?? 0}
                    </div>
                    {criticalPages > 0 && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{criticalPages} critical</p>}
                  </div>
                  <div className="team-stat-card">
                    <div className="team-stat-label">New This Week</div>
                    <div className="team-stat-value">{intelOverview?.weeklyGenerated ?? 0}</div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>pages generated</p>
                  </div>
                  <div className="team-stat-card">
                    <div className="team-stat-label">Weekly Clicks</div>
                    <div className="team-stat-value">{(intelOverview?.estimatedTraffic ?? 0).toLocaleString()}</div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>from organic</p>
                  </div>
                </div>

                {/* Action bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['overview', 'pages', 'competitors', 'templates', 'clusters', 'gaps'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setIntelSubTab(tab)}
                        className={`team-nav-btn ${intelSubTab === tab ? 'active' : ''}`}
                        style={{ fontSize: 13, padding: '7px 14px' }}
                      >
                        {tab === 'overview' ? 'Overview' :
                         tab === 'pages' ? `Pages${intelPages.length > 0 ? ` (${intelPages.length})` : ''}` :
                         tab === 'competitors' ? `Competitors${intelCompetitors.length > 0 ? ` (${intelCompetitors.length})` : ''}` :
                         tab === 'templates' ? `Templates${intelTemplates.length > 0 ? ` (${intelTemplates.length})` : ''}` :
                         tab === 'clusters' ? `Clusters${clusters.length > 0 ? ` (${clusters.length})` : ''}` :
                         `Gaps${gaps.length > 0 ? ` (${gaps.length})` : ''}`}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {intelHealth && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                        ...statusStyle(intelHealth.status)
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: intelHealth.status === 'healthy' ? '#10b981' : intelHealth.status === 'warning' ? '#f59e0b' : '#ef4444' }} />
                        {intelHealth.status === 'healthy' ? 'Healthy' : intelHealth.status === 'warning' ? 'Warning' : 'Critical'}
                      </span>
                    )}
                    {lastRun && (
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>Last run: {timeAgo(lastRun.startedAt)}</span>
                    )}
                    <button onClick={fetchIntelData} disabled={intelLoading} className="team-action-btn" style={{ fontSize: 12, opacity: intelLoading ? 0.5 : 1 }}>
                      {intelLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button onClick={handleRunPipeline} disabled={runningPipeline} className="team-action-btn" style={{ background: '#111827', color: '#fff', border: 'none', fontSize: 12, opacity: runningPipeline ? 0.5 : 1 }}>
                      {runningPipeline ? 'Running...' : '▶ Run Pipeline'}
                    </button>
                  </div>
                </div>

                {/* ── Overview sub-tab ── */}
                {intelSubTab === 'overview' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="team-section">
                      <div className="team-section-header">
                        <h3 className="team-section-title">System Health</h3>
                        {intelHealth && (
                          <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 6, ...statusStyle(intelHealth.status) }}>
                            {intelHealth.checks.filter(c => c.status === 'healthy').length}/{intelHealth.checks.length} passing
                          </span>
                        )}
                      </div>
                      {!intelHealth || intelHealth.checks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                          <p style={{ fontSize: 14 }}>No health data yet</p>
                          <p style={{ fontSize: 12, marginTop: 4 }}>Run the pipeline to generate health checks</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {intelHealth.checks.map((check) => (
                            <div key={check.name} style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
                              background: check.status === 'healthy' ? '#f0fdf4' : check.status === 'warning' ? '#fffbeb' : '#fef2f2'
                            }}>
                              <span style={{
                                width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0,
                                background: check.status === 'healthy' ? '#dcfce7' : check.status === 'warning' ? '#fef3c7' : '#fecaca',
                                color: check.status === 'healthy' ? '#16a34a' : check.status === 'warning' ? '#d97706' : '#dc2626'
                              }}>
                                {check.status === 'healthy' ? '✓' : check.status === 'warning' ? '!' : '✕'}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', textTransform: 'capitalize' }}>{check.name.replace(/_/g, ' ')}</p>
                                <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{check.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="team-section">
                      <div className="team-section-header">
                        <h3 className="team-section-title">Recent Runs</h3>
                        {intelHealth && intelHealth.recentRuns.length > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>{intelHealth.recentRuns.length} runs</span>}
                      </div>
                      {!intelHealth || intelHealth.recentRuns.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
                          <p style={{ fontSize: 14 }}>No pipeline runs yet</p>
                          <p style={{ fontSize: 12, marginTop: 4 }}>Click "Run Pipeline" to start</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {intelHealth.recentRuns.slice(0, 8).map((run) => (
                            <div key={run.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#f9fafb' }}>
                              <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, ...statusStyle(run.status) }}>
                                {run.status === 'completed' ? '✓' : run.status === 'running' ? '↻' : run.status === 'failed' ? '✕' : '⏳'}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', textTransform: 'capitalize' }}>{run.type.replace(/_/g, ' ')}</span>
                                  <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4, ...statusStyle(run.status) }}>{run.status}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(run.startedAt)}</span>
                                  {run.duration != null && <span style={{ fontSize: 11, color: '#9ca3af' }}>{run.duration}s</span>}
                                  {run.itemsProcessed > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>{run.itemsProcessed} processed{run.itemsCreated > 0 ? `, ${run.itemsCreated} new` : ''}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {intelHealth && (intelHealth.errorLog.length > 0 || (intelHealth.infoLog && intelHealth.infoLog.length > 0)) && (
                      <div className="team-section" style={{ gridColumn: '1 / -1' }}>
                        <div className="team-section-header">
                          <h3 className="team-section-title">Pipeline Log</h3>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {intelHealth.errorLog.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: '#fef2f2', color: '#dc2626' }}>{intelHealth.errorLog.length} error{intelHealth.errorLog.length > 1 ? 's' : ''}</span>}
                            {intelHealth.infoLog && intelHealth.infoLog.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: '#eff6ff', color: '#2563eb' }}>{intelHealth.infoLog.length} info</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {intelHealth.errorLog.slice(0, 4).map((entry) => (
                            <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#fef2f2' }}>
                              <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, background: '#fecaca', color: '#dc2626' }}>✕</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', textTransform: 'capitalize' }}>{entry.type.replace(/_/g, ' ')}</span>
                                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(entry.startedAt)}</span>
                                </div>
                                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.error}>{entry.error}</p>
                              </div>
                            </div>
                          ))}
                          {(intelHealth.infoLog ?? []).slice(0, 4).map((entry) => (
                            <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, background: '#eff6ff' }}>
                              <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, background: '#dbeafe', color: '#2563eb' }}>i</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', textTransform: 'capitalize' }}>{entry.type.replace(/_/g, ' ')}</span>
                                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(entry.startedAt)}</span>
                                </div>
                                <p style={{ fontSize: 12, color: '#1e40af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.error}>{entry.error}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!intelHealth?.errorLog?.length && !intelHealth?.infoLog?.length && (
                      <div className="team-section" style={{ gridColumn: '1 / -1' }}>
                        <div className="team-section-header"><h3 className="team-section-title">Quick Summary</h3></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                          <div style={{ padding: 16, borderRadius: 10, background: intelPages.length > 0 ? '#fef2f2' : '#f0fdf4', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: intelPages.length > 0 ? '#dc2626' : '#059669' }}>{intelPages.length}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Pages Need Attention</div>
                          </div>
                          <div style={{ padding: 16, borderRadius: 10, background: '#eff6ff', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>{intelCompetitors.filter(c => c.positionStatus === 'winning').length}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Keywords Winning</div>
                          </div>
                          <div style={{ padding: 16, borderRadius: 10, background: '#fef2f2', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{intelCompetitors.filter(c => c.positionStatus === 'losing').length}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Keywords Losing</div>
                          </div>
                          <div style={{ padding: 16, borderRadius: 10, background: '#ecfdf5', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{intelTemplates.reduce((s, t) => s + t.published, 0)}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Templates Published</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Pages sub-tab ── */}
                {intelSubTab === 'pages' && (
                  <div className="team-section">
                    <div className="team-section-header">
                      <h3 className="team-section-title">Pages Needing Attention</h3>
                      {intelPages.length > 0 && (
                        <div style={{ display: 'flex', gap: 12 }}>
                          {criticalPages > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />{criticalPages} critical</span>}
                          {warningPages > 0 && <span style={{ fontSize: 11, fontWeight: 500, color: '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />{warningPages} warning</span>}
                        </div>
                      )}
                    </div>
                    {intelPages.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 48 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20 }}>✓</div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>All pages are healthy</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>No pages need attention right now</p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                              {['Page', 'Score', 'Content / Technical', 'Status', 'Issue'].map((h, i) => (
                                <th key={h} style={{ textAlign: i === 1 || i === 3 ? 'center' : 'left', fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', ...(i === 0 ? { paddingLeft: 16 } : {}), ...(i === 1 ? { width: 70 } : {}), ...(i === 2 ? { width: 160 } : {}), ...(i === 3 ? { width: 80 } : {}) }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {intelPages.map((page) => {
                              const sBg = intelScoreBg(page.score);
                              const stSt = statusStyle(page.issues.status);
                              return (
                                <tr key={page.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                  <td style={{ padding: '10px 16px' }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{page.title}</p>
                                    <p style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260, marginTop: 2 }}>{page.slug}</p>
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                                    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: sBg.background, color: sBg.color }}>{page.score}</span>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    {(['contentScore', 'technicalScore'] as const).map((key, idx) => (
                                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, ...(idx > 0 ? { marginTop: 6 } : {}) }}>
                                        <span style={{ fontSize: 10, color: '#9ca3af', width: 14 }}>{idx === 0 ? 'C' : 'T'}</span>
                                        <div style={{ flex: 1, height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
                                          <div style={{ height: '100%', borderRadius: 2, background: intelScoreBarBg(page.issues[key]), width: `${page.issues[key]}%`, transition: 'width 0.4s' }} />
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 500, color: intelScoreColor(page.issues[key]), width: 20, textAlign: 'right' }}>{page.issues[key]}</span>
                                      </div>
                                    ))}
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 500, background: stSt.background, color: stSt.color }}>
                                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: stSt.color }} />{page.issues.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <p style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }} title={page.issues.reason}>{page.issues.reason}</p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Competitors sub-tab ── */}
                {intelSubTab === 'competitors' && (
                  <div className="team-section">
                    <div className="team-section-header">
                      <h3 className="team-section-title">Competitor Performance</h3>
                      {intelCompetitors.length > 0 && (
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#059669' }}>{intelCompetitors.filter(c => c.positionStatus === 'winning').length} winning</span>
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#dc2626' }}>{intelCompetitors.filter(c => c.positionStatus === 'losing').length} losing</span>
                        </div>
                      )}
                    </div>
                    {intelCompetitors.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 48 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, color: '#9ca3af' }}>⊘</div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>No competitor data yet</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Run the pipeline to start tracking competitors</p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                              {[{ t: 'Competitor', a: 'left' }, { t: 'Keyword', a: 'left' }, { t: 'Us', a: 'center', w: 60 }, { t: 'Them', a: 'center', w: 60 }, { t: 'Opportunity', a: 'center', w: 80 }, { t: 'Status', a: 'center', w: 90 }].map((col, i) => (
                                <th key={col.t} style={{ textAlign: col.a as 'left' | 'center', fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', ...(i === 0 ? { paddingLeft: 16 } : {}), ...(col.w ? { width: col.w } : {}) }}>{col.t}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {intelCompetitors.map((c, i) => {
                              const oppBg = intelScoreBg(c.opportunityScore);
                              const sts = statusStyle(c.positionStatus);
                              return (
                                <tr key={`${c.competitor}-${c.keyword}-${i}`} style={{ borderBottom: '1px solid #f9fafb' }}>
                                  <td style={{ padding: '10px 16px' }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{c.competitor}</p>
                                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{c.domain}</p>
                                  </td>
                                  <td style={{ padding: '10px 12px' }}><p style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{c.keyword}</p></td>
                                  <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: c.ranking && c.ranking <= 3 ? '#059669' : c.ranking && c.ranking <= 10 ? '#2563eb' : '#9ca3af' }}>{c.ranking ? `#${c.ranking}` : '—'}</span>
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                                    <span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>{c.theirRanking ? `#${c.theirRanking}` : '—'}</span>
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                                    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: oppBg.background, color: oppBg.color }}>{c.opportunityScore}</span>
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 500, background: sts.background, color: sts.color }}>
                                      {c.positionStatus === 'winning' ? '↑' : c.positionStatus === 'losing' ? '↓' : c.positionStatus === 'opportunity' ? '★' : '~'}{c.positionStatus}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Templates sub-tab ── */}
                {intelSubTab === 'templates' && (
                  <div className="team-section">
                    <div className="team-section-header">
                      <h3 className="team-section-title">Programmatic SEO Templates</h3>
                      {intelTemplates.length > 0 && <span style={{ fontSize: 11, color: '#9ca3af' }}>{intelTemplates.reduce((s, t) => s + t.published, 0)} published total</span>}
                    </div>
                    {intelTemplates.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 48 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, color: '#9ca3af' }}>⊘</div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>No templates yet</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Templates will appear after pipeline runs</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {intelTemplates.map((t, i) => {
                          const avgBg = intelScoreBg(t.avgScore);
                          const sts = statusStyle(t.status);
                          const publishPct = t.generated > 0 ? Math.round((t.published / t.generated) * 100) : 0;
                          return (
                            <div key={`${t.templateName}-${i}`} style={{ padding: 16, borderRadius: 10, background: '#f9fafb' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div>
                                  <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{t.templateName}</h4>
                                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#e5e7eb', color: '#6b7280' }}>{t.templateType}</span>
                                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 500, background: sts.background, color: sts.color }}>{t.status}</span>
                                  </div>
                                </div>
                                <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 14, fontWeight: 700, background: avgBg.background, color: avgBg.color }}>{t.avgScore.toFixed(0)}</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: t.generated > 0 ? 12 : 0 }}>
                                {[
                                  { label: 'Generated', val: t.generated, color: '#111827' },
                                  { label: 'Published', val: t.published, color: '#059669' },
                                  { label: 'Review', val: t.needsReview, color: t.needsReview > 0 ? '#d97706' : '#9ca3af' },
                                  { label: 'Views', val: t.totalViews.toLocaleString(), color: '#374151' },
                                  { label: 'Clicks', val: t.totalClicks.toLocaleString(), color: '#374151' },
                                ].map(m => (
                                  <div key={m.label}>
                                    <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
                                    <p style={{ fontSize: 16, fontWeight: 600, color: m.color, marginTop: 2 }}>{m.val}</p>
                                  </div>
                                ))}
                              </div>
                              {t.generated > 0 && (
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Publish rate</span>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#374151' }}>{publishPct}%</span>
                                  </div>
                                  <div style={{ width: '100%', height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: 3, background: '#10b981', width: `${publishPct}%`, transition: 'width 0.4s' }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Clusters sub-tab ── */}
                {intelSubTab === 'clusters' && (
                  <div>
                    {clusterMessage && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
                        background: clusterMessage.startsWith('Error') ? '#fef2f2' : '#f0fdf4',
                        color: clusterMessage.startsWith('Error') ? '#dc2626' : '#059669',
                        border: `1px solid ${clusterMessage.startsWith('Error') ? '#fecaca' : '#bbf7d0'}`,
                      }}>
                        {clusterMessage}
                      </div>
                    )}

                    {clustersLoading ? (
                      <div className="team-section" style={{ textAlign: 'center', padding: 60 }}>
                        <div style={{ fontSize: 14, color: '#6b7280' }}>Loading clusters...</div>
                      </div>
                    ) : clusters.length === 0 ? (
                      <div className="team-section" style={{ textAlign: 'center', padding: 48 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, color: '#9ca3af' }}>&#x2B22;</div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>No content clusters yet</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Create clusters via the database to start generating topic-linked content</p>
                      </div>
                    ) : (
                      <>
                        {/* Cluster summary stats */}
                        <div className="team-stats-grid" style={{ marginBottom: 16 }}>
                          <div className="team-stat-card">
                            <div className="team-stat-label">Total Clusters</div>
                            <div className="team-stat-value">{clusters.length}</div>
                          </div>
                          <div className="team-stat-card">
                            <div className="team-stat-label">Articles Generated</div>
                            <div className="team-stat-value" style={{ color: '#2563eb' }}>{clusters.reduce((s, c) => s + c.completed_articles, 0)}</div>
                          </div>
                          <div className="team-stat-card">
                            <div className="team-stat-label">Target Total</div>
                            <div className="team-stat-value" style={{ color: '#6b7280' }}>{clusters.reduce((s, c) => s + c.target_articles, 0)}</div>
                          </div>
                          <div className="team-stat-card">
                            <div className="team-stat-label">Est. Monthly Traffic</div>
                            <div className="team-stat-value" style={{ color: '#059669' }}>{clusters.reduce((s, c) => s + (c.estimated_monthly_traffic ?? 0), 0).toLocaleString()}</div>
                          </div>
                        </div>

                        {/* Cluster cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {clusters.map(cluster => {
                            const progress = cluster.target_articles > 0 ? Math.round((cluster.completed_articles / cluster.target_articles) * 100) : 0;
                            const isComplete = cluster.cluster_status === 'completed';
                            const isGenerating = generatingClusterId === cluster.id;
                            const statusColors: Record<string, { bg: string; color: string }> = {
                              planned: { bg: '#dbeafe', color: '#2563eb' },
                              in_progress: { bg: '#fef3c7', color: '#d97706' },
                              completed: { bg: '#dcfce7', color: '#16a34a' },
                            };
                            const sc = statusColors[cluster.cluster_status] ?? { bg: '#f3f4f6', color: '#6b7280' };

                            return (
                              <div key={cluster.id} className="team-section" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                      <h4 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>{cluster.cluster_name}</h4>
                                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                                        {cluster.cluster_status.replace('_', ' ')}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: 11, color: '#6b7280' }}>Pillar: <strong style={{ color: '#111827' }}>{cluster.pillar_keyword}</strong></span>
                                      {cluster.estimated_monthly_traffic > 0 && (
                                        <span style={{ fontSize: 11, color: '#059669' }}>~{cluster.estimated_monthly_traffic.toLocaleString()} traffic/mo</span>
                                      )}
                                    </div>
                                  </div>
                                  {!isComplete && (
                                    <button
                                      onClick={() => handleGenerateClusterArticle(cluster.id)}
                                      disabled={isGenerating || !!generatingClusterId}
                                      style={{
                                        fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: isGenerating ? 'wait' : 'pointer',
                                        background: isGenerating ? '#d1d5db' : '#111827', color: '#fff', fontWeight: 500,
                                        opacity: (generatingClusterId && !isGenerating) ? 0.4 : 1,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {isGenerating ? 'Generating...' : `Generate Next Article`}
                                    </button>
                                  )}
                                </div>

                                {/* Progress bar */}
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Progress</span>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: progress >= 100 ? '#059669' : '#374151' }}>
                                      {cluster.completed_articles}/{cluster.target_articles} articles ({progress}%)
                                    </span>
                                  </div>
                                  <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{
                                      height: '100%', borderRadius: 3, transition: 'width 0.4s',
                                      background: progress >= 100 ? '#10b981' : progress >= 50 ? '#3b82f6' : '#f59e0b',
                                      width: `${Math.min(progress, 100)}%`,
                                    }} />
                                  </div>
                                </div>

                                {/* Supporting keywords preview */}
                                {Array.isArray(cluster.supporting_keywords) && cluster.supporting_keywords.length > 0 && (
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {cluster.supporting_keywords.slice(0, 8).map((kw, i) => (
                                      <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#f3f4f6', color: '#6b7280' }}>{kw}</span>
                                    ))}
                                    {cluster.supporting_keywords.length > 8 && (
                                      <span style={{ fontSize: 10, padding: '2px 8px', color: '#9ca3af' }}>+{cluster.supporting_keywords.length - 8} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── Gaps sub-tab ── */}
                {intelSubTab === 'gaps' && (
                  <div>
                    {gapMessage && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
                        background: gapMessage.startsWith('Error') ? '#fef2f2' : '#f0fdf4',
                        color: gapMessage.startsWith('Error') ? '#dc2626' : '#059669',
                        border: `1px solid ${gapMessage.startsWith('Error') ? '#fecaca' : '#bbf7d0'}`,
                      }}>
                        {gapMessage}
                      </div>
                    )}

                    {/* Analyze competitor buttons */}
                    <div className="team-section" style={{ padding: 14, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>Analyze Competitor Gaps</h4>
                          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Run AI-powered gap analysis to discover content opportunities</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {['HoneyBook', 'Aisle Planner', 'Planning Pod', 'Dubsado'].map(name => (
                            <button
                              key={name}
                              onClick={() => handleAnalyzeCompetitor(name)}
                              disabled={!!analyzingCompetitor}
                              style={{
                                fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: analyzingCompetitor ? 'wait' : 'pointer',
                                background: analyzingCompetitor === name ? '#111827' : '#fff',
                                color: analyzingCompetitor === name ? '#fff' : '#374151',
                                fontWeight: 500, opacity: (analyzingCompetitor && analyzingCompetitor !== name) ? 0.4 : 1,
                              }}
                            >
                              {analyzingCompetitor === name ? 'Analyzing...' : name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {gapsLoading ? (
                      <div className="team-section" style={{ textAlign: 'center', padding: 60 }}>
                        <div style={{ fontSize: 14, color: '#6b7280' }}>Loading gaps...</div>
                      </div>
                    ) : gaps.length === 0 ? (
                      <div className="team-section" style={{ textAlign: 'center', padding: 48 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, color: '#9ca3af' }}>&#x1F50D;</div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>No content gaps discovered yet</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Click a competitor above to run gap analysis</p>
                      </div>
                    ) : (
                      <>
                        {/* Gap summary stats */}
                        <div className="team-stats-grid" style={{ marginBottom: 16 }}>
                          <div className="team-stat-card">
                            <div className="team-stat-label">Total Gaps</div>
                            <div className="team-stat-value">{gaps.length}</div>
                          </div>
                          <div className="team-stat-card">
                            <div className="team-stat-label">High Priority</div>
                            <div className="team-stat-value" style={{ color: '#dc2626' }}>{gaps.filter(g => g.priority === 'high').length}</div>
                          </div>
                          <div className="team-stat-card">
                            <div className="team-stat-label">Content Created</div>
                            <div className="team-stat-value" style={{ color: '#059669' }}>{gaps.filter(g => g.status === 'content_created').length}</div>
                          </div>
                          <div className="team-stat-card">
                            <div className="team-stat-label">Avg Opportunity</div>
                            <div className="team-stat-value" style={{ color: '#2563eb' }}>{gaps.length > 0 ? Math.round(gaps.reduce((s, g) => s + g.opportunity_score, 0) / gaps.length) : 0}</div>
                          </div>
                        </div>

                        {/* Gap table */}
                        <div className="team-section" style={{ padding: 0, overflow: 'hidden' }}>
                          {/* Table header */}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 100px 120px', gap: 8,
                            padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6',
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase' }}>Keyword</span>
                            <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase' }}>Competitor</span>
                            <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Score</span>
                            <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Priority</span>
                            <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Status</span>
                            <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'right' }}>Action</span>
                          </div>

                          {/* Gap rows */}
                          {gaps.map(gap => {
                            const priorityColors: Record<string, { bg: string; color: string }> = {
                              high: { bg: '#fef2f2', color: '#dc2626' },
                              medium: { bg: '#fffbeb', color: '#d97706' },
                              low: { bg: '#f3f4f6', color: '#6b7280' },
                            };
                            const pc = priorityColors[gap.priority] ?? { bg: '#f3f4f6', color: '#6b7280' };
                            const gapStatusColors: Record<string, { bg: string; color: string }> = {
                              identified: { bg: '#dbeafe', color: '#2563eb' },
                              targeted: { bg: '#fef3c7', color: '#d97706' },
                              content_created: { bg: '#dcfce7', color: '#16a34a' },
                            };
                            const gsc = gapStatusColors[gap.status] ?? { bg: '#f3f4f6', color: '#6b7280' };
                            const isGen = generatingGapId === gap.id;
                            const canGenerate = gap.status === 'identified';

                            return (
                              <div
                                key={gap.id}
                                style={{
                                  display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 100px 120px', gap: 8,
                                  padding: '10px 14px', alignItems: 'center', borderBottom: '1px solid #f9fafb',
                                  background: isGen ? '#eff6ff' : '#fff',
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{gap.keyword_primary}</div>
                                  <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280' }}>{gap.topic}</span>
                                    {gap.their_word_count > 0 && (
                                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{gap.their_word_count.toLocaleString()} words</span>
                                    )}
                                  </div>
                                </div>
                                <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{gap.competitor_name}</div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{
                                    display: 'inline-block', padding: '3px 8px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                    background: gap.opportunity_score >= 80 ? '#ecfdf5' : gap.opportunity_score >= 60 ? '#fffbeb' : '#f3f4f6',
                                    color: gap.opportunity_score >= 80 ? '#059669' : gap.opportunity_score >= 60 ? '#d97706' : '#6b7280',
                                  }}>
                                    {gap.opportunity_score}
                                  </span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: pc.bg, color: pc.color, textTransform: 'capitalize' }}>
                                    {gap.priority}
                                  </span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: gsc.bg, color: gsc.color }}>
                                    {gap.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  {canGenerate && (
                                    <button
                                      onClick={() => handleGenerateGapContent(gap.id)}
                                      disabled={isGen || !!generatingGapId}
                                      style={{
                                        fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: isGen ? 'wait' : 'pointer',
                                        background: isGen ? '#d1d5db' : '#111827', color: '#fff', fontWeight: 500,
                                        opacity: (generatingGapId && !isGen) ? 0.4 : 1,
                                      }}
                                    >
                                      {isGen ? 'Writing...' : 'Generate'}
                                    </button>
                                  )}
                                  {gap.status === 'content_created' && (
                                    <span style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>Done</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════ CONTENT REVIEW TAB ═══════════════ */}
        {activeTab === 'content' && (
          <>
            {contentError && (
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14,
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span>{contentError}</span>
                <button onClick={fetchContentPosts} className="team-action-btn" style={{ fontSize: 12 }}>Retry</button>
              </div>
            )}

            {contentLoading ? (
              <div className="team-section" style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Loading content review...</div>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="team-stats-grid">
                  <div className="team-stat-card">
                    <div className="team-stat-label">Total Posts</div>
                    <div className="team-stat-value">{contentStats.total}</div>
                  </div>
                  <div className="team-stat-card">
                    <div className="team-stat-label">Drafts</div>
                    <div className="team-stat-value" style={{ color: '#2563eb' }}>{contentStats.draft}</div>
                  </div>
                  <div className="team-stat-card">
                    <div className="team-stat-label">In Review</div>
                    <div className="team-stat-value" style={{ color: '#d97706' }}>{contentStats.inReview}</div>
                  </div>
                  <div className="team-stat-card">
                    <div className="team-stat-label">Published</div>
                    <div className="team-stat-value" style={{ color: '#059669' }}>{contentStats.published}</div>
                  </div>
                </div>

                {/* Filter & Sort Bar */}
                <div className="team-section" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['all', 'draft', 'in_review', 'published'] as const).map(f => (
                      <button
                        key={f}
                        className={`team-nav-btn ${contentFilter === f ? 'active' : ''}`}
                        onClick={() => setContentFilter(f)}
                        style={{ fontSize: 12, padding: '4px 12px' }}
                      >
                        {f === 'all' ? 'All' : f === 'draft' ? 'Draft' : f === 'in_review' ? 'In Review' : 'Published'}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Sort:</span>
                    {(['date', 'score', 'title'] as const).map(s => (
                      <button
                        key={s}
                        className={`team-nav-btn ${contentSort === s ? 'active' : ''}`}
                        onClick={() => setContentSort(s)}
                        style={{ fontSize: 11, padding: '3px 10px' }}
                      >
                        {s === 'date' ? 'Newest' : s === 'score' ? 'SEO Score' : 'Title'}
                      </button>
                    ))}
                    <button onClick={() => { setContentFetched(false); }} className="team-action-btn" style={{ fontSize: 11, marginLeft: 8 }}>
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Post List */}
                {filteredPosts.length === 0 ? (
                  <div className="team-section" style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      {contentFilter === 'all' ? 'No posts yet. Run the pipeline to generate content.' : `No ${contentFilter.replace('_', ' ')} posts.`}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredPosts.map(post => {
                      const isExpanded = expandedPostId === post.id;
                      const isUpdating = updatingPostId === post.id;
                      const isDeleting = deletingPostId === post.id;
                      const scoreBg = intelScoreBg(post.seoScore);
                      const postStatusStyle = post.status === 'published'
                        ? { background: '#ecfdf5', color: '#059669' }
                        : post.status === 'in_review'
                        ? { background: '#fffbeb', color: '#d97706' }
                        : { background: '#eff6ff', color: '#2563eb' };

                      return (
                        <div key={post.id} className="team-section" style={{ padding: 0, overflow: 'hidden' }}>
                          {/* Card Header */}
                          <div style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            {/* SEO Score Circle */}
                            <div style={{ flexShrink: 0, width: 56, height: 56, position: 'relative' }}>
                              <svg width="56" height="56" viewBox="0 0 56 56">
                                <circle cx="28" cy="28" r="24" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                                <circle
                                  cx="28" cy="28" r="24" fill="none"
                                  stroke={intelScoreColor(post.seoScore)}
                                  strokeWidth="4"
                                  strokeDasharray={`${(post.seoScore / 100) * 150.8} 150.8`}
                                  strokeLinecap="round"
                                  transform="rotate(-90 28 28)"
                                />
                              </svg>
                              <div style={{
                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14, fontWeight: 700, color: intelScoreColor(post.seoScore)
                              }}>
                                {post.seoScore}
                              </div>
                            </div>

                            {/* Post Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {post.title}
                                </h3>
                                <span style={{
                                  ...postStatusStyle,
                                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px'
                                }}>
                                  {post.status.replace('_', ' ')}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>{post.urlPath}</div>
                              {post.metaDescription && (
                                <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {post.metaDescription}
                                </p>
                              )}

                              {/* Meta row */}
                              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                {post.primaryKeyword && (
                                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#f3f4f6', color: '#374151' }}>
                                    {post.primaryKeyword}
                                  </span>
                                )}
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>{post.wordCount} words</span>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(post.createdAt)}</span>

                                {/* Score pills */}
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, ...intelScoreBg(post.contentScore) }}>
                                    Content: {post.contentScore}
                                  </span>
                                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, ...intelScoreBg(post.technicalScore) }}>
                                    Technical: {post.technicalScore}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
                              <button
                                className="team-action-btn"
                                onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                                style={{ fontSize: 11 }}
                              >
                                {isExpanded ? 'Collapse' : 'Preview'}
                              </button>

                              {post.status === 'draft' && (
                                <button
                                  className="team-action-btn"
                                  onClick={() => handleUpdatePostStatus(post.id, 'in_review')}
                                  disabled={isUpdating}
                                  style={{ fontSize: 11, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}
                                >
                                  {isUpdating ? '...' : 'Move to Review'}
                                </button>
                              )}

                              {post.status === 'in_review' && (
                                <>
                                  <button
                                    className="team-action-btn"
                                    onClick={() => handleUpdatePostStatus(post.id, 'draft')}
                                    disabled={isUpdating}
                                    style={{ fontSize: 11 }}
                                  >
                                    {isUpdating ? '...' : 'Back to Draft'}
                                  </button>
                                  <button
                                    className="team-action-btn"
                                    onClick={() => handleUpdatePostStatus(post.id, 'published')}
                                    disabled={isUpdating}
                                    style={{ fontSize: 11, background: '#111827', color: '#fff', border: 'none' }}
                                  >
                                    {isUpdating ? '...' : 'Approve & Publish'}
                                  </button>
                                </>
                              )}

                              {post.status === 'published' && (
                                <button
                                  className="team-action-btn"
                                  onClick={() => handleUpdatePostStatus(post.id, 'in_review')}
                                  disabled={isUpdating}
                                  style={{ fontSize: 11 }}
                                >
                                  {isUpdating ? '...' : 'Unpublish'}
                                </button>
                              )}

                              <button
                                className="team-action-btn danger"
                                onClick={() => handleDeletePost(post.id)}
                                disabled={isDeleting}
                                style={{ fontSize: 11 }}
                              >
                                {isDeleting ? '...' : 'Delete'}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Preview */}
                          {isExpanded && (
                            <div style={{ borderTop: '1px solid #f3f4f6' }}>
                              {/* SEO Score Breakdown */}
                              <div style={{ padding: '16px 20px', background: '#fafafa', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                <div>
                                  <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Overall SEO</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 100, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', borderRadius: 3, background: intelScoreBarBg(post.seoScore), width: `${post.seoScore}%` }} />
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: intelScoreColor(post.seoScore) }}>{post.seoScore}/100</span>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Content</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 100, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', borderRadius: 3, background: intelScoreBarBg(post.contentScore), width: `${post.contentScore}%` }} />
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: intelScoreColor(post.contentScore) }}>{post.contentScore}/100</span>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Technical</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 100, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', borderRadius: 3, background: intelScoreBarBg(post.technicalScore), width: `${post.technicalScore}%` }} />
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: intelScoreColor(post.technicalScore) }}>{post.technicalScore}/100</span>
                                  </div>
                                </div>
                                {post.keywordVariations.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Keywords</div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                      {post.keywordVariations.map((kw, i) => (
                                        <span key={i} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280' }}>{kw}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Content Preview */}
                              <div style={{
                                padding: '20px', maxHeight: 500, overflow: 'auto',
                                fontSize: 14, lineHeight: 1.7, color: '#374151',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                              }}>
                                {post.content}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════ PIPELINE TAB ═══════════════ */}
        {activeTab === 'pipeline' && (
          <>
            {pipelineLoading ? (
              <div className="team-section" style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Loading pipeline...</div>
              </div>
            ) : pipelineError ? (
              <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {pipelineError}
                <button onClick={fetchPipelineTopics} style={{ marginLeft: 12, fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer' }}>Retry</button>
              </div>
            ) : (
              <>
                {/* Funnel Visualization */}
                <div className="team-section" style={{ marginBottom: 16 }}>
                  <div className="team-section-header">
                    <h3 className="team-section-title">Topic Pipeline</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{pipelineTopics.length} total topics</span>
                      <button onClick={fetchPipelineTopics} className="team-action-btn" style={{ fontSize: 12 }}>Refresh</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', padding: '8px 0' }}>
                    {pipelineStatuses.map((status, i) => {
                      const count = pipelineFunnel[status] ?? 0;
                      const maxCount = Math.max(...Object.values(pipelineFunnel), 1);
                      const heightPct = Math.max(count / maxCount * 100, 8);
                      const colors: Record<string, { bg: string; color: string; label: string }> = {
                        discovered: { bg: '#dbeafe', color: '#2563eb', label: 'Discovered' },
                        validated: { bg: '#e0e7ff', color: '#4f46e5', label: 'Validated' },
                        brief_created: { bg: '#fef3c7', color: '#d97706', label: 'Brief Created' },
                        in_production: { bg: '#fed7aa', color: '#ea580c', label: 'In Production' },
                        in_review: { bg: '#fce7f3', color: '#db2777', label: 'In Review' },
                        published: { bg: '#dcfce7', color: '#16a34a', label: 'Published' },
                      };
                      const c = colors[status] ?? { bg: '#f3f4f6', color: '#6b7280', label: status };
                      return (
                        <button
                          key={status}
                          onClick={() => setPipelineFilter(pipelineFilter === status ? 'all' : status)}
                          style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            opacity: pipelineFilter !== 'all' && pipelineFilter !== status ? 0.4 : 1,
                            transition: 'opacity 0.15s',
                          }}
                        >
                          <span style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{count}</span>
                          <div style={{
                            width: '100%', borderRadius: 6, background: c.bg,
                            height: `${Math.max(heightPct * 0.8, 12)}px`,
                            minHeight: 12, transition: 'height 0.3s',
                          }} />
                          <span style={{ fontSize: 10, fontWeight: 600, color: c.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{c.label}</span>
                          {i < pipelineStatuses.length - 1 && (
                            <span style={{ position: 'absolute', right: -6, top: '40%', fontSize: 10, color: '#d1d5db' }}>→</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {pipelineStatuses.map((status) => {
                      const colors: Record<string, string> = {
                        discovered: '#2563eb', validated: '#4f46e5', brief_created: '#d97706',
                        in_production: '#ea580c', in_review: '#db2777', published: '#16a34a',
                      };
                      const total = pipelineTopics.length || 1;
                      const count = pipelineFunnel[status] ?? 0;
                      return (
                        <div key={status} style={{
                          flex: count / total, height: 4, borderRadius: 2,
                          background: colors[status] ?? '#d1d5db',
                          minWidth: count > 0 ? 4 : 0,
                          transition: 'flex 0.3s',
                        }} />
                      );
                    })}
                  </div>
                </div>

                {/* Smart Discovery + Manual Discover + Bulk Actions */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div className="team-section" style={{ flex: 2 }}>
                    {/* Smart Discovery */}
                    <div style={{ padding: '16px', borderRadius: 10, background: 'linear-gradient(135deg, #eef2ff 0%, #f0fdf4 100%)', marginBottom: 16, border: '1px solid #e0e7ff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Smart Discovery</div>
                          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                            AI analyzes your clusters, competitors, published content, and gaps to find the highest-impact topics automatically. No seed keywords needed.
                          </p>
                        </div>
                        <button
                          onClick={handleSmartDiscover}
                          disabled={smartDiscovering}
                          style={{
                            padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: smartDiscovering ? '#9ca3af' : 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                            color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                          }}
                        >
                          {smartDiscovering ? 'Analyzing...' : 'Find Best Topics'}
                        </button>
                      </div>
                    </div>

                    {/* Manual Discovery */}
                    <div className="team-section-header">
                      <h3 className="team-section-title">Manual Discovery</h3>
                    </div>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
                      Or enter your own seed keywords (comma-separated) to discover specific topics.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={discoverKeywords}
                        onChange={e => setDiscoverKeywords(e.target.value)}
                        placeholder="e.g. wedding CRM, event planning tools, wedding seating chart"
                        onKeyDown={e => e.key === 'Enter' && handleDiscoverTopics()}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                          fontSize: 13, outline: 'none', background: '#f9fafb',
                        }}
                      />
                      <button
                        onClick={handleDiscoverTopics}
                        disabled={discovering || !discoverKeywords.trim()}
                        style={{
                          padding: '10px 20px', borderRadius: 8, background: '#111827', color: '#fff',
                          border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                          opacity: discovering || !discoverKeywords.trim() ? 0.5 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {discovering ? 'Discovering...' : 'Discover'}
                      </button>
                    </div>
                    {discoverMessage && (
                      <div style={{
                        marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                        background: discoverMessage.startsWith('Error') ? '#fef2f2' : '#f0fdf4',
                        color: discoverMessage.startsWith('Error') ? '#dc2626' : '#059669',
                      }}>
                        {discoverMessage}
                      </div>
                    )}
                    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['wedding planner tools', 'wedding CRM software', 'event planning automation', 'wedding budget calculator', 'wedding vendor management', 'seating chart software', 'wedding timeline planner'].map(kw => (
                        <button
                          key={kw}
                          onClick={() => setDiscoverKeywords(prev => prev ? `${prev}, ${kw}` : kw)}
                          style={{
                            fontSize: 11, padding: '4px 10px', borderRadius: 20, border: '1px solid #e5e7eb',
                            background: '#fff', color: '#6b7280', cursor: 'pointer',
                          }}
                        >
                          + {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="team-section" style={{ flex: 1 }}>
                    <div className="team-section-header">
                      <h3 className="team-section-title">Bulk Actions</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(pipelineFunnel['discovered'] ?? 0) > 0 && (
                        <button
                          onClick={() => {
                            const discoveredIds = pipelineTopics.filter(t => t.status === 'discovered').map(t => t.id);
                            setSelectedTopicIds(new Set(discoveredIds));
                          }}
                          style={{
                            padding: '10px 14px', borderRadius: 8, background: '#eff6ff',
                            color: '#2563eb', border: '1px solid #bfdbfe', fontSize: 13, fontWeight: 500,
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          Select All Discovered ({pipelineFunnel['discovered'] ?? 0})
                        </button>
                      )}
                      <button
                        onClick={handleBulkValidate}
                        disabled={selectedTopicIds.size === 0}
                        style={{
                          padding: '10px 14px', borderRadius: 8, background: selectedTopicIds.size > 0 ? '#4f46e5' : '#e5e7eb',
                          color: selectedTopicIds.size > 0 ? '#fff' : '#9ca3af', border: 'none',
                          fontSize: 13, fontWeight: 500, cursor: selectedTopicIds.size > 0 ? 'pointer' : 'default',
                        }}
                      >
                        Validate Selected ({selectedTopicIds.size})
                      </button>
                      <button
                        onClick={handleRunPipeline}
                        disabled={runningPipeline}
                        style={{
                          padding: '10px 14px', borderRadius: 8, background: '#111827', color: '#fff',
                          border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                          opacity: runningPipeline ? 0.5 : 1,
                        }}
                      >
                        {runningPipeline ? 'Running...' : 'Run Pipeline Now'}
                      </button>
                      <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
                        Pipeline flow: Validated topics → generate content brief → produce article → review → publish
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pipeline Message */}
                {pipelineMessage && (
                  <div style={{
                    padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 8,
                    ...(pipelineMessage.includes('failed') || pipelineMessage.includes('Failed')
                      ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
                      : { background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' })
                  }}>
                    <span>{pipelineMessage.includes('failed') || pipelineMessage.includes('Failed') ? '✕' : '✓'}</span>
                    {pipelineMessage}
                  </div>
                )}

                {/* Filter Bar */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setPipelineFilter('all')}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      border: '1px solid', transition: 'all 0.15s',
                      ...(pipelineFilter === 'all'
                        ? { background: '#111827', color: '#fff', borderColor: '#111827' }
                        : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }),
                    }}
                  >
                    All ({pipelineTopics.length})
                  </button>
                  {pipelineStatuses.map(status => {
                    const count = pipelineFunnel[status] ?? 0;
                    if (count === 0) return null;
                    const colors: Record<string, { bg: string; color: string; activeBg: string }> = {
                      discovered: { bg: '#eff6ff', color: '#2563eb', activeBg: '#2563eb' },
                      validated: { bg: '#eef2ff', color: '#4f46e5', activeBg: '#4f46e5' },
                      brief_created: { bg: '#fffbeb', color: '#d97706', activeBg: '#d97706' },
                      in_production: { bg: '#fff7ed', color: '#ea580c', activeBg: '#ea580c' },
                      in_review: { bg: '#fdf2f8', color: '#db2777', activeBg: '#db2777' },
                      published: { bg: '#f0fdf4', color: '#16a34a', activeBg: '#16a34a' },
                    };
                    const c = colors[status] ?? { bg: '#f3f4f6', color: '#6b7280', activeBg: '#6b7280' };
                    const labels: Record<string, string> = {
                      discovered: 'Discovered', validated: 'Validated', brief_created: 'Brief Created',
                      in_production: 'In Production', in_review: 'In Review', published: 'Published',
                    };
                    return (
                      <button
                        key={status}
                        onClick={() => setPipelineFilter(pipelineFilter === status ? 'all' : status)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                          border: '1px solid', transition: 'all 0.15s',
                          ...(pipelineFilter === status
                            ? { background: c.activeBg, color: '#fff', borderColor: c.activeBg }
                            : { background: c.bg, color: c.color, borderColor: 'transparent' }),
                        }}
                      >
                        {labels[status] ?? status} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Topic List */}
                <div className="team-section">
                  <div className="team-section-header">
                    <h3 className="team-section-title">Topics ({filteredTopics.length})</h3>
                  </div>
                  {filteredTopics.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>No topics in this stage</p>
                      <p style={{ fontSize: 12, marginTop: 4 }}>Use "Discover Topics" to generate ideas, then validate them to start the pipeline</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 80px 100px 120px', gap: 8, padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                        <span />
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase' }}>Keyword</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Volume</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Difficulty</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Priority</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'center' }}>Status</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'right' }}>Actions</span>
                      </div>
                      {filteredTopics.map(topic => {
                        const statusColors: Record<string, { bg: string; color: string }> = {
                          discovered: { bg: '#dbeafe', color: '#2563eb' },
                          validated: { bg: '#e0e7ff', color: '#4f46e5' },
                          brief_created: { bg: '#fef3c7', color: '#d97706' },
                          in_production: { bg: '#fed7aa', color: '#ea580c' },
                          in_review: { bg: '#fce7f3', color: '#db2777' },
                          published: { bg: '#dcfce7', color: '#16a34a' },
                        };
                        const sc = statusColors[topic.status] ?? { bg: '#f3f4f6', color: '#6b7280' };
                        const diffColor = topic.difficulty < 30 ? '#16a34a' : topic.difficulty < 60 ? '#d97706' : '#dc2626';
                        const priorityColor = topic.priority >= 85 ? '#16a34a' : topic.priority >= 70 ? '#2563eb' : '#d97706';
                        const statusLabels: Record<string, string> = {
                          discovered: 'Discovered', validated: 'Validated', brief_created: 'Brief',
                          in_production: 'Producing', in_review: 'Review', published: 'Published',
                        };

                        return (
                          <div
                            key={topic.id}
                            style={{
                              display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px 80px 100px 120px', gap: 8,
                              padding: '10px 12px', borderRadius: 8, alignItems: 'center',
                              background: selectedTopicIds.has(topic.id) ? '#eff6ff' : '#fff',
                              borderBottom: '1px solid #f9fafb',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              {topic.status === 'discovered' && (
                                <input
                                  type="checkbox"
                                  checked={selectedTopicIds.has(topic.id)}
                                  onChange={() => toggleTopicSelection(topic.id)}
                                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                                />
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{topic.keyword}</div>
                              <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280' }}>{topic.category}</span>
                                {topic.clusterName && (
                                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#eff6ff', color: '#2563eb' }}>{topic.clusterName}</span>
                                )}
                                {topic.variations.length > 0 && (
                                  <span style={{ fontSize: 10, color: '#9ca3af' }}>+{topic.variations.length} variations</span>
                                )}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#111827' }}>
                              {topic.volume > 0 ? topic.volume.toLocaleString() : '—'}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: diffColor }}>{topic.difficulty}</span>
                              <span style={{ fontSize: 10, color: '#9ca3af' }}>/100</span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: priorityColor }}>{topic.priority}</span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 10,
                                background: sc.bg, color: sc.color,
                              }}>
                                {statusLabels[topic.status] ?? topic.status}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              {topic.status === 'discovered' && (
                                <button
                                  onClick={() => handleValidateTopic(topic.id)}
                                  style={{
                                    fontSize: 11, padding: '4px 10px', borderRadius: 6,
                                    background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer',
                                  }}
                                >
                                  Validate
                                </button>
                              )}
                              {(topic.status === 'discovered' || topic.status === 'validated') && (
                                <button
                                  onClick={() => handleDeleteTopic(topic.id)}
                                  style={{
                                    fontSize: 11, padding: '4px 8px', borderRadius: 6,
                                    background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer',
                                  }}
                                >
                                  ✕
                                </button>
                              )}
                              {topic.postId && (
                                <Link
                                  to={`/blog/${topic.keyword.toLowerCase().replace(/\s+/g, '-')}`}
                                  style={{
                                    fontSize: 11, padding: '4px 10px', borderRadius: 6,
                                    background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0',
                                    textDecoration: 'none',
                                  }}
                                >
                                  View
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* How It Works */}
                <div className="team-section" style={{ marginTop: 16 }}>
                  <div className="team-section-header">
                    <h3 className="team-section-title">How The Pipeline Works</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                    {[
                      { step: '1', title: 'Discover', desc: 'AI generates topic ideas from seed keywords', color: '#2563eb' },
                      { step: '2', title: 'Validate', desc: 'You approve which topics to write about', color: '#4f46e5' },
                      { step: '3', title: 'Brief', desc: 'Pipeline creates content briefs automatically', color: '#d97706' },
                      { step: '4', title: 'Produce', desc: 'AI writes SEO-optimized articles', color: '#ea580c' },
                      { step: '5', title: 'Review', desc: 'Articles land in Content Review for approval', color: '#db2777' },
                      { step: '6', title: 'Publish', desc: 'Approved posts go live on your blog', color: '#16a34a' },
                    ].map(s => (
                      <div key={s.step} style={{ padding: 14, borderRadius: 10, background: '#f9fafb', textAlign: 'center' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, margin: '0 auto 8px' }}>{s.step}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{s.title}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>{s.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default SEODashboard;
