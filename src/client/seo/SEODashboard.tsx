import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import '../team.css';

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

interface TeamUser {
  email: string;
  name: string;
  role: string;
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

const SEODashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'command' | 'pipeline' | 'production'>('command');
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [clusters, setClusters] = useState<TopicCluster[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [discoveryKeywords, setDiscoveryKeywords] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [user, setUser] = useState<TeamUser | null>(null);

  const token = sessionStorage.getItem('team_token');

  useEffect(() => {
    if (!token) {
      navigate('/team-login');
      return;
    }
    try {
      const userData = sessionStorage.getItem('team_user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch {
      navigate('/team-login');
    }
  }, [navigate, token]);

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

  const handleLogout = () => {
    sessionStorage.removeItem('team_token');
    sessionStorage.removeItem('team_user');
    navigate('/team-login');
  };

  const score = health ? calculateHealthScore(health) : 0;

  if (!user) return null;

  return (
    <div className="team-dashboard-page">
      <header className="team-header">
        <div className="team-header-left">
          <Link to="/" className="team-header-logo">
            <img src="/logo/iconlogo.png" alt="WedBoardPro" />
            <span>WedBoardPro</span>
          </Link>
          <span style={{ fontSize: 14, color: '#6b7280' }}>SEO Intelligence</span>
        </div>
        <nav className="team-header-nav">
          <button
            className={`team-nav-btn ${activeTab === 'command' ? 'active' : ''}`}
            onClick={() => setActiveTab('command')}
          >
            Command Center
          </button>
          <button
            className={`team-nav-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            Topic Pipeline
          </button>
          <button
            className={`team-nav-btn ${activeTab === 'production' ? 'active' : ''}`}
            onClick={() => setActiveTab('production')}
          >
            Content Production
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
            <div className="team-user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="team-user-name">{user.name}</span>
          </div>
          <button className="team-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="team-content">
        {activeTab === 'command' && (
          <>
            {loading ? (
              <div className="team-section">
                <div className="team-section-header">
                  <h2 className="team-section-title">Loading...</h2>
                </div>
              </div>
            ) : (
              <>
                <div className="team-stats-grid">
                  <div className="team-stat-card" style={{ textAlign: 'center' }}>
                    <div className="team-stat-label">Health Score</div>
                    <div className={`team-stat-value ${getScoreColor(score)}`}>{score}</div>
                    <p className="text-xs text-gray-500 mt-1">
                      {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Work' : 'Critical'}
                    </p>
                  </div>
                  <div className="team-stat-card">
                    <div className="team-stat-label">Top 3 Rankings</div>
                    <div className="team-stat-value">{health?.keywords_top_3 || 0}</div>
                    <p className="text-xs text-gray-500 mt-1">{health?.keywords_top_10 || 0} in top 10</p>
                  </div>
                  <div className="team-stat-card">
                    <div className="team-stat-label">Organic Sessions</div>
                    <div className="team-stat-value">{(health?.total_organic_sessions || 0).toLocaleString()}</div>
                    <p className={`text-xs mt-1 ${(health?.traffic_growth_30d || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {(health?.traffic_growth_30d || 0) >= 0 ? '+' : ''}{(health?.traffic_growth_30d || 0).toFixed(1)}% 30d
                    </p>
                  </div>
                  <div className="team-stat-card">
                    <div className="team-stat-label">Trials from SEO</div>
                    <div className="team-stat-value">{health?.total_trials_from_organic || 0}</div>
                    <p className="text-xs text-gray-500 mt-1">{(health?.conversion_rate || 0).toFixed(1)}% rate</p>
                  </div>
                </div>

                <div className="team-section">
                  <div className="team-section-header">
                    <h2 className="team-section-title">Topic Discovery</h2>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={discoveryKeywords}
                      onChange={(e) => setDiscoveryKeywords(e.target.value)}
                      placeholder="wedding planner, venue management, wedding budget..."
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        fontSize: 14,
                        outline: 'none'
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleDiscovery()}
                    />
                    <button
                      onClick={handleDiscovery}
                      disabled={discovering || !discoveryKeywords.trim()}
                      className="team-action-btn"
                      style={{ background: '#111827', color: 'white', border: 'none' }}
                    >
                      {discovering ? 'Discovering...' : 'Discover Topics'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                  <div className="team-section">
                    <div className="team-section-header">
                      <h3 className="team-section-title">Action Items</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {health?.posts_published_30d || 0 < 4 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#fef3c7', borderRadius: 8 }}>
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span className="text-xs text-amber-800">Only {health?.posts_published_30d} posts published this month. Target: 8+</span>
                        </div>
                      )}
                      {(health?.traffic_growth_30d || 0) < 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#fef2f2', borderRadius: 8 }}>
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-xs text-red-800">Organic traffic declined {Math.abs(health?.traffic_growth_30d || 0).toFixed(1)}%</span>
                        </div>
                      )}
                      {(health?.traffic_growth_30d || 0) > 10 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f0fdf4', borderRadius: 8 }}>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs text-emerald-800">Organic traffic grew {(health?.traffic_growth_30d || 0).toFixed(1)}%</span>
                        </div>
                      )}
                      {(health?.keywords_top_3 || 0) > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f0fdf4', borderRadius: 8 }}>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs text-emerald-800">{health?.keywords_top_3} keywords ranking in top 3!</span>
                        </div>
                      )}
                      {clusters.filter(c => c.completion_percentage < 100).length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f3f4f6', borderRadius: 8 }}>
                          <Zap className="w-4 h-4 text-gray-600" />
                          <span className="text-xs text-gray-700">{clusters.filter(c => c.completion_percentage < 100).length} topic clusters need more content</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="team-section">
                    <div className="team-section-header">
                      <h3 className="team-section-title">Cluster Progress</h3>
                      <span className="text-xs text-gray-400">{clusters.length} clusters</span>
                    </div>
                    {clusters.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No clusters yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {clusters.slice(0, 5).map((cluster) => (
                          <div key={cluster.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span className="text-xs font-medium text-gray-700 truncate" style={{ maxWidth: 150 }}>{cluster.name}</span>
                              <span className="text-xs text-gray-500">{cluster.current_post_count}/{cluster.target_post_count}</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  borderRadius: 3,
                                  background: cluster.completion_percentage >= 80 ? '#10b981' : cluster.completion_percentage >= 50 ? '#f59e0b' : '#ef4444',
                                  width: `${cluster.completion_percentage}%`,
                                  transition: 'width 0.3s'
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="team-section">
                    <div className="team-section-header">
                      <h3 className="team-section-title">Top Posts</h3>
                      <span className="text-xs text-gray-400">Last 30 days</span>
                    </div>
                    {posts.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No posts yet</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <th className="text-left text-[10px] font-medium text-gray-400 uppercase px-2 py-2">Post</th>
                            <th className="text-right text-[10px] font-medium text-gray-400 uppercase px-2 py-2">Views</th>
                            <th className="text-right text-[10px] font-medium text-gray-400 uppercase px-2 py-2">Pos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {posts.slice(0, 5).map((post) => (
                            <tr key={post.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                              <td className="px-2 py-2">
                                <p className="text-xs text-gray-700 truncate" style={{ maxWidth: 120 }}>{post.title}</p>
                                <p className="text-[10px] text-gray-400 truncate">{post.primary_keyword || '—'}</p>
                              </td>
                              <td className="text-right px-2 py-2">
                                <span className="text-xs font-medium text-gray-900">{(post.total_views || 0).toLocaleString()}</span>
                              </td>
                              <td className="text-right px-2 py-2">
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
              </>
            )}
          </>
        )}

        {activeTab === 'pipeline' && (
          <div className="team-section">
            <div className="team-section-header">
              <h2 className="team-section-title">Topic Pipeline</h2>
              <p className="text-xs text-gray-500">Manage your content topics through the workflow</p>
            </div>
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              <p className="text-sm">Kanban view coming soon...</p>
              <p className="text-xs text-gray-400 mt-2">Navigate to this page later to manage topics</p>
            </div>
          </div>
        )}

        {activeTab === 'production' && (
          <div className="team-section">
            <div className="team-section-header">
              <h2 className="team-section-title">Content Production</h2>
              <p className="text-xs text-gray-500">Create and publish SEO-optimized content</p>
            </div>
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              <p className="text-sm">Content editor coming soon...</p>
              <p className="text-xs text-gray-400 mt-2">Navigate to this page later to create content</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SEODashboard;
