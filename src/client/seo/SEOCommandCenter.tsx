import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Target,
  FileText,
  Zap,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Search,
} from 'lucide-react';
import SEOLayout from './SEOLayout';

interface HealthSnapshot {
  id: string;
  date: string;
  health_score: number;
  keywords_top_3: number;
  keywords_top_10: number;
  keywords_top_20: number;
  keywords_tracked: number;
  total_organic_sessions: number;
  total_organic_clicks: number;
  traffic_growth_30d: number;
  total_posts: number;
  posts_published_30d: number;
  total_trials_from_organic: number;
  conversion_rate: number;
  featured_snippets_won: number;
  total_backlinks: number;
  new_backlinks_30d: number;
  avg_page_speed_score: number;
  mobile_friendly_score: number;
}

interface TopicCluster {
  id: string;
  name: string;
  pillar_keyword: string;
  target_post_count: number;
  current_post_count: number;
  completion_percentage: number;
  total_estimated_traffic: number;
  total_actual_traffic: number;
  status: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  primary_keyword: string;
  total_views: number;
  total_clicks: number;
  avg_position: number;
  conversion_count: number;
  status: string;
  published_at: string;
}

function calculateHealthScore(h: HealthSnapshot): number {
  const rankingsScore = Math.min(100, ((h.keywords_top_3 * 3 + h.keywords_top_10 * 2 + h.keywords_top_20) / Math.max(1, h.keywords_tracked)) * 100);
  const trafficScore = Math.min(100, (h.total_organic_sessions / 1000) * 100);
  const contentVelocity = Math.min(100, (h.posts_published_30d / 8) * 100);
  const conversions = Math.min(100, (h.total_trials_from_organic / 20) * 100);
  const snippets = Math.min(100, (h.featured_snippets_won / 5) * 100);
  const backlinks = Math.min(100, (h.total_backlinks / 100) * 100);
  const technical = Math.min(100, ((h.avg_page_speed_score || 0 + (h.mobile_friendly_score || 0)) / 2));

  return Math.round(
    rankingsScore * 0.25 +
    trafficScore * 0.20 +
    contentVelocity * 0.15 +
    conversions * 0.15 +
    snippets * 0.10 +
    backlinks * 0.10 +
    technical * 0.05
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return 'stroke-emerald-500';
  if (score >= 60) return 'stroke-amber-500';
  if (score >= 40) return 'stroke-orange-500';
  return 'stroke-red-500';
}

function generateActionItems(health: HealthSnapshot, clusters: TopicCluster[]): Array<{ type: 'warning' | 'success' | 'info'; message: string }> {
  const items: Array<{ type: 'warning' | 'success' | 'info'; message: string }> = [];

  if (health.posts_published_30d < 4) items.push({ type: 'warning', message: `Only ${health.posts_published_30d} posts published this month. Target: 8+` });
  if (health.keywords_top_3 > 0) items.push({ type: 'success', message: `${health.keywords_top_3} keywords ranking in top 3!` });
  if ((health.traffic_growth_30d || 0) < 0) items.push({ type: 'warning', message: `Organic traffic declined ${Math.abs(health.traffic_growth_30d || 0).toFixed(1)}% in 30 days` });
  if ((health.traffic_growth_30d || 0) > 10) items.push({ type: 'success', message: `Organic traffic grew ${(health.traffic_growth_30d || 0).toFixed(1)}% in 30 days` });
  if (health.featured_snippets_won > 0) items.push({ type: 'success', message: `Won ${health.featured_snippets_won} featured snippets` });
  if (health.new_backlinks_30d > 0) items.push({ type: 'info', message: `${health.new_backlinks_30d} new backlinks acquired this month` });
  if ((health.avg_page_speed_score || 0) < 70) items.push({ type: 'warning', message: `Page speed score is ${health.avg_page_speed_score}. Optimize for 90+` });

  const incompleteClusters = clusters.filter((c) => c.completion_percentage < 100);
  if (incompleteClusters.length > 0) {
    items.push({ type: 'info', message: `${incompleteClusters.length} topic clusters need more content` });
  }

  if (items.length === 0) items.push({ type: 'info', message: 'No data yet. Run topic discovery to get started.' });
  return items;
}

const SEOCommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [clusters, setClusters] = useState<TopicCluster[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [discoveryKeywords, setDiscoveryKeywords] = useState('');
  const [discovering, setDiscovering] = useState(false);

  const token = sessionStorage.getItem('team_token');

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [healthRes, clustersRes, postsRes] = await Promise.all([
        fetch('/api/v1/seo/health', { headers }),
        fetch('/api/v1/seo/clusters', { headers }),
        fetch('/api/v1/seo/blog-posts', { headers }),
      ]);
      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data.health);
      }
      if (clustersRes.ok) {
        const data = await clustersRes.json();
        setClusters(data.clusters || []);
      }
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch SEO data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDiscovery = async () => {
    if (!discoveryKeywords.trim() || !token) return;
    setDiscovering(true);
    try {
      const seeds = discoveryKeywords.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await fetch('/api/v1/seo/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ seedKeywords: seeds, maxTopics: 20, skipTrends: true }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Discovered ${data.count} topics! View them in the Topic Pipeline.`);
        setDiscoveryKeywords('');
      } else {
        const err = await res.json();
        alert(`Discovery failed: ${err.error}`);
      }
    } catch (err) {
      console.error('Discovery failed:', err);
    } finally {
      setDiscovering(false);
    }
  };

  const score = health ? calculateHealthScore(health) : 0;
  const actionItems = health ? generateActionItems(health, clusters) : [{ type: 'info' as const, message: 'No data yet. Run topic discovery to get started.' }];

  if (loading) {
    return (
      <SEOLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-200" />
            <div className="w-48 h-4 rounded bg-gray-200" />
            <div className="w-32 h-3 rounded bg-gray-100" />
          </div>
        </div>
      </SEOLayout>
    );
  }

  return (
    <SEOLayout>
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SEO Command Center</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {health ? `Last updated: ${new Date(health.date).toLocaleDateString()}` : 'No health data yet'}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Topic Discovery */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Topic Discovery</h3>
              <p className="text-xs text-gray-500">Enter seed keywords to discover new content opportunities</p>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                value={discoveryKeywords}
                onChange={(e) => setDiscoveryKeywords(e.target.value)}
                placeholder="wedding planner, venue management, wedding budget..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                onKeyDown={(e) => e.key === 'Enter' && handleDiscovery()}
              />
              <button
                onClick={handleDiscovery}
                disabled={discovering || !discoveryKeywords.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {discovering ? 'Discovering...' : 'Discover Topics'}
              </button>
            </div>
          </div>
        </div>

        {/* Top row: Health Score + KPI Cards */}
        <div className="grid grid-cols-12 gap-4">
          {/* Health Score */}
          <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center justify-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Health Score</p>
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8" className="stroke-gray-100" />
                <circle
                  cx="60" cy="60" r="54" fill="none" strokeWidth="8"
                  className={getScoreRingColor(score)}
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 339.3} 339.3`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
                <span className="text-[10px] text-gray-400">/ 100</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Work' : 'Critical'}
            </p>
          </div>

          {/* KPI Cards */}
          <div className="col-span-9 grid grid-cols-4 gap-4">
            {/* Rankings */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-[10px] text-gray-400 uppercase">Rankings</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Top 3</span>
                  <span className="text-sm font-semibold text-gray-900">{health?.keywords_top_3 || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Top 10</span>
                  <span className="text-sm font-semibold text-gray-900">{health?.keywords_top_10 || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Top 20</span>
                  <span className="text-sm font-semibold text-gray-900">{health?.keywords_top_20 || 0}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-1.5">
                  <span className="text-xs text-gray-500">Tracked</span>
                  <span className="text-sm font-medium text-gray-600">{health?.keywords_tracked || 0}</span>
                </div>
              </div>
            </div>

            {/* Traffic */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-[10px] text-gray-400 uppercase">Traffic</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{(health?.total_organic_sessions || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Organic sessions</p>
              <div className="flex items-center gap-1 mt-2">
                {(health?.traffic_growth_30d || 0) > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                ) : (health?.traffic_growth_30d || 0) < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-gray-400" />
                )}
                <span className={`text-xs font-medium ${(health?.traffic_growth_30d || 0) > 0 ? 'text-emerald-600' : (health?.traffic_growth_30d || 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {Math.abs(health?.traffic_growth_30d || 0).toFixed(1)}% 30d
                </span>
              </div>
            </div>

            {/* Conversions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-violet-600" />
                </div>
                <span className="text-[10px] text-gray-400 uppercase">Conversions</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{health?.total_trials_from_organic || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Trials from organic</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs font-medium text-gray-500">
                  {(health?.conversion_rate || 0).toFixed(1)}% rate
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-[10px] text-gray-400 uppercase">Content</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{health?.total_posts || posts.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total posts</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs font-medium text-emerald-600">
                  +{health?.posts_published_30d || 0} this month
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row: Action Items + Clusters + Top Posts */}
        <div className="grid grid-cols-12 gap-4">
          {/* Action Items */}
          <div className="col-span-4 bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Action Items</h3>
            </div>
            <div className="p-3 space-y-2 max-h-[360px] overflow-auto">
              {actionItems.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg ${
                    item.type === 'warning' ? 'bg-amber-50' : item.type === 'success' ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}
                >
                  {item.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  ) : item.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Zap className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-xs text-gray-700 leading-relaxed">{item.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cluster Progress */}
          <div className="col-span-4 bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Cluster Progress</h3>
              <span className="text-xs text-gray-400">{clusters.length} clusters</span>
            </div>
            <div className="p-3 space-y-3 max-h-[360px] overflow-auto">
              {clusters.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-400">No clusters yet</p>
                  <p className="text-[10px] text-gray-300 mt-1">Create topic clusters to track progress</p>
                </div>
              ) : (
                clusters.map((cluster) => (
                  <div key={cluster.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[180px]">{cluster.name}</span>
                      <span className="text-[10px] text-gray-500">
                        {cluster.current_post_count}/{cluster.target_post_count}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreBg(cluster.completion_percentage)}`}
                        style={{ width: `${cluster.completion_percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">{cluster.pillar_keyword}</span>
                      <span className="text-[10px] font-medium text-gray-500">{cluster.completion_percentage}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Posts */}
          <div className="col-span-4 bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Top Posts</h3>
              <span className="text-xs text-gray-400">Last 30 days</span>
            </div>
            <div className="max-h-[360px] overflow-auto">
              {posts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-400">No posts yet</p>
                  <p className="text-[10px] text-gray-300 mt-1">Publish content to see performance</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left text-[10px] font-medium text-gray-400 uppercase px-3 py-2">Post</th>
                      <th className="text-right text-[10px] font-medium text-gray-400 uppercase px-3 py-2">Views</th>
                      <th className="text-right text-[10px] font-medium text-gray-400 uppercase px-3 py-2">Pos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.slice(0, 10).map((post) => (
                      <tr key={post.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <p className="text-xs text-gray-700 truncate max-w-[160px]">{post.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">{post.primary_keyword || '—'}</p>
                        </td>
                        <td className="text-right px-3 py-2">
                          <span className="text-xs font-medium text-gray-900">{(post.total_views || 0).toLocaleString()}</span>
                        </td>
                        <td className="text-right px-3 py-2">
                          <span className={`text-xs font-medium ${(post.avg_position || 0) <= 3 ? 'text-emerald-600' : (post.avg_position || 0) <= 10 ? 'text-amber-600' : 'text-gray-500'}`}>
                            {post.avg_position ? `#${Math.round(post.avg_position)}` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </SEOLayout>
  );
};

export default SEOCommandCenter;
