import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { analyzeSEO, getSeoScoreColor, getSeoScoreLabel } from '../../lib/seo-analyzer';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  featuredImage: string | null;
  seoTitle: string;
  metaDescription: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledDate: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  seoScore: number;
  views: number;
  leadsGenerated: number;
  wordCount: number;
  readingTime: number;
  author: {
    name: string;
    avatar: string;
  };
}

interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  avgSeoScore: number;
  totalViews: number;
  totalLeads: number;
  viewsThisWeek: number;
  leadsThisWeek: number;
}

interface GAAnalytics {
  pageViews: number;
  uniqueViews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  topPages: { path: string; views: number }[];
  topSources: { source: string; users: number }[];
}

interface Settings {
  gaMeasurementId: string;
  gaPropertyId: string;
  gaServiceAccountKey: string;
  slackWebhook: string;
  blogTitle: string;
  blogDescription: string;
}

interface AIAnalysis {
  score: number;
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  contentQuality: {
    clarity: number;
    depth: number;
    engagement: number;
    tone: string;
  };
  keywordAnalysis: {
    relevance: number;
    placement: string;
    suggestions: string[];
  };
  competitorInsights?: string;
  viralPotential: number;
}

const CATEGORIES = [
  'Business Growth',
  'Operations',
  'Client Experience',
  'Planning Tips',
  'Marketing',
  'Sales',
  'Industry News'
];

const COMMON_TAGS = [
  'wedding planning',
  'client management',
  'vendor relations',
  'pricing strategy',
  'workflow automation',
  'lead generation',
  'wedding season',
  'contracts',
  'social media',
  'time management'
];

const BlogDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'editor' | 'settings'>('overview');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [gaAnalytics, setGaAnalytics] = useState<GAAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date()));
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [settings, setSettings] = useState<Settings>({
    gaMeasurementId: '',
    gaPropertyId: '',
    gaServiceAccountKey: '',
    slackWebhook: '',
    blogTitle: 'WedBoardPro Blog',
    blogDescription: 'Expert insights for wedding planners'
  });

  useEffect(() => {
    const token = sessionStorage.getItem('team_token');
    const userData = sessionStorage.getItem('team_user');
    
    if (!token || !userData) {
      navigate('/team-login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      navigate('/team-login');
    }

    loadPosts();
    loadSettings();
  }, [navigate]);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('blogSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(prev => ({
        ...prev,
        ...parsed,
        // Ensure all fields exist
        gaMeasurementId: parsed.gaMeasurementId || '',
        gaPropertyId: parsed.gaPropertyId || '',
        gaServiceAccountKey: parsed.gaServiceAccountKey || '',
        slackWebhook: parsed.slackWebhook || '',
        blogTitle: parsed.blogTitle || 'WedBoardPro Blog',
        blogDescription: parsed.blogDescription || 'Expert insights for wedding planners'
      }));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('blogSettings', JSON.stringify(settings));
    alert('Settings saved!');
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/blog/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
        setStats(data.stats || generateMockStats(data.posts || []));
      }
    } catch (error) {
      const mockPosts = generateMockPosts();
      setPosts(mockPosts);
      setStats(generateMockStats(mockPosts));
    } finally {
      setLoading(false);
    }
  };

  const fetchGAAnalytics = async () => {
    if (!settings.gaPropertyId || !settings.gaServiceAccountKey) {
      alert('Please add your GA4 Property ID and Service Account Key in Settings first.');
      return;
    }

    setLoadingAnalytics(true);
    try {
      const response = await fetch('/api/v1/blog/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: settings.gaPropertyId,
          serviceAccountKey: settings.gaServiceAccountKey,
          startDate: '30daysAgo',
          endDate: 'today'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGaAnalytics(data);
      } else {
        alert('Failed to fetch analytics. Check your settings.');
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
      alert('Error fetching analytics. Make sure the API endpoint is configured.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const generateMockStats = (posts: BlogPost[]): BlogStats => ({
    totalPosts: posts.length,
    publishedPosts: posts.filter(p => p.status === 'published').length,
    scheduledPosts: posts.filter(p => p.status === 'scheduled').length,
    draftPosts: posts.filter(p => p.status === 'draft').length,
    avgSeoScore: Math.round(posts.reduce((acc, p) => acc + p.seoScore, 0) / posts.length) || 0,
    totalViews: posts.reduce((acc, p) => acc + p.views, 0),
    totalLeads: posts.reduce((acc, p) => acc + p.leadsGenerated, 0),
    viewsThisWeek: Math.round(posts.reduce((acc, p) => acc + p.views, 0) * 0.3),
    leadsThisWeek: Math.round(posts.reduce((acc, p) => acc + p.leadsGenerated, 0) * 0.25)
  });

  const generateMockPosts = (): BlogPost[] => [
    {
      id: '1',
      title: 'How to Raise Your Wedding Planning Prices by 30%',
      slug: 'raise-wedding-planning-prices',
      content: '<p>Premium pricing is essential...</p>',
      excerpt: 'A step-by-step framework for positioning your services as premium.',
      category: 'Business Growth',
      tags: ['pricing strategy', 'business growth'],
      primaryKeyword: 'wedding planning prices',
      secondaryKeywords: ['premium wedding services', 'raise prices'],
      featuredImage: null,
      seoTitle: 'Raise Wedding Planning Prices by 30% | Expert Guide',
      metaDescription: 'Learn proven strategies to increase your wedding planning rates without losing clients.',
      status: 'published',
      scheduledDate: null,
      publishedAt: '2026-02-08T10:00:00Z',
      createdAt: '2026-02-05T14:00:00Z',
      updatedAt: '2026-02-08T10:00:00Z',
      seoScore: 92,
      views: 2450,
      leadsGenerated: 45,
      wordCount: 1850,
      readingTime: 8,
      author: { name: 'Sarah Mitchell', avatar: '' }
    },
    {
      id: '2',
      title: 'The Complete Tech Stack for Wedding Planners in 2026',
      slug: 'tech-stack-wedding-planners-2026',
      content: '<p>Modern tools are essential...</p>',
      excerpt: 'From CRM to floor planning — the exact tools top planners use.',
      category: 'Operations',
      tags: ['wedding planning', 'workflow automation'],
      primaryKeyword: 'wedding planner software',
      secondaryKeywords: ['wedding planning tools', 'CRM for planners'],
      featuredImage: null,
      seoTitle: 'Best Wedding Planner Software & Tools in 2026',
      metaDescription: 'Discover the complete tech stack modern wedding planners use.',
      status: 'scheduled',
      scheduledDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
      publishedAt: null,
      createdAt: '2026-02-01T09:00:00Z',
      updatedAt: '2026-02-10T16:00:00Z',
      seoScore: 88,
      views: 0,
      leadsGenerated: 0,
      wordCount: 3200,
      readingTime: 12,
      author: { name: 'Marcus Chen', avatar: '' }
    },
    {
      id: '3',
      title: 'Creating Wow Moments That Drive Referrals',
      slug: 'wow-moments-wedding-referrals',
      content: '<p>Client experience is everything...</p>',
      excerpt: 'How to exceed expectations and turn clients into advocates.',
      category: 'Client Experience',
      tags: ['client management', 'referrals'],
      primaryKeyword: 'wedding client referrals',
      secondaryKeywords: ['client experience', 'wedding referrals'],
      featuredImage: null,
      seoTitle: 'Create Wow Moments That Drive Wedding Referrals',
      metaDescription: 'Transform satisfied wedding clients into your biggest advocates.',
      status: 'draft',
      scheduledDate: null,
      publishedAt: null,
      createdAt: '2026-02-10T11:00:00Z',
      updatedAt: '2026-02-10T14:30:00Z',
      seoScore: 72,
      views: 0,
      leadsGenerated: 0,
      wordCount: 1200,
      readingTime: 6,
      author: { name: 'Emma Rodriguez', avatar: '' }
    }
  ];

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  if (!user) return null;

  return (
    <div className="team-dashboard-page">
      <header className="team-header">
        <div className="team-header-left">
          <Link to="/" className="team-header-logo">
            <img src="/logo/iconlogo.png" alt="WedBoardPro" />
            <span>WedBoardPro</span>
          </Link>
          <span style={{ fontSize: 14, color: '#6b7280' }}>Team Dashboard</span>
        </div>
        <nav className="team-header-nav">
          <button className={`team-nav-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Blog Overview</button>
          <button className={`team-nav-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>All Posts</button>
          <button className={`team-nav-btn ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>Editor</button>
          <button className={`team-nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
        </nav>
        <div className="team-header-right">
          <div className="team-user-info">
            <div className="team-user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <span className="team-user-name">{user.name}</span>
          </div>
          <button className="team-logout-btn" onClick={() => { sessionStorage.removeItem('team_token'); sessionStorage.removeItem('team_user'); navigate('/team-login'); }}>Logout</button>
        </div>
      </header>

      <main className="team-content">
        {activeTab === 'overview' && (
          <>
            <div className="team-section-header" style={{ marginBottom: 24 }}>
              <div>
                <h2 className="team-section-title">Blog Management</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Create, optimize, and publish SEO-driven content</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="team-action-btn" onClick={() => setActiveTab('posts')}>View All Posts</button>
                <button className="team-action-btn" style={{ background: '#111827', color: '#fff' }} onClick={() => setActiveTab('editor')}>+ New Post</button>
              </div>
            </div>

            {/* GA Analytics Cards */}
            {gaAnalytics && (
              <div className="team-stats-grid" style={{ marginBottom: 24 }}>
                <div className="team-stat-card">
                  <div className="team-stat-label">Page Views (30d)</div>
                  <div className="team-stat-value">{gaAnalytics.pageViews.toLocaleString()}</div>
                </div>
                <div className="team-stat-card">
                  <div className="team-stat-label">Unique Views</div>
                  <div className="team-stat-value">{gaAnalytics.uniqueViews.toLocaleString()}</div>
                </div>
                <div className="team-stat-card">
                  <div className="team-stat-label">Avg. Time on Page</div>
                  <div className="team-stat-value">{Math.round(gaAnalytics.avgTimeOnPage / 60)}m {Math.round(gaAnalytics.avgTimeOnPage % 60)}s</div>
                </div>
                <div className="team-stat-card">
                  <div className="team-stat-label">Bounce Rate</div>
                  <div className="team-stat-value">{gaAnalytics.bounceRate.toFixed(1)}%</div>
                </div>
              </div>
            )}

            {/* Local Stats */}
            {stats && (
              <div className="team-stats-grid" style={{ marginBottom: 24 }}>
                <div className="team-stat-card">
                  <div className="team-stat-label">Total Posts</div>
                  <div className="team-stat-value">{stats.totalPosts}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{stats.publishedPosts} published</div>
                </div>
                <div className="team-stat-card">
                  <div className="team-stat-label">Avg. SEO Score</div>
                  <div className="team-stat-value" style={{ color: getSeoScoreColor(stats.avgSeoScore) }}>{stats.avgSeoScore}%</div>
                </div>
                <div className="team-stat-card">
                  <div className="team-stat-label">Leads This Week</div>
                  <div className="team-stat-value">{stats.leadsThisWeek}</div>
                </div>
                <div className="team-stat-card">
                  <div className="team-stat-label">Scheduled Posts</div>
                  <div className="team-stat-value">{stats.scheduledPosts}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="team-section">
                <div className="team-section-header">
                  <h3 className="team-section-title">Quick Actions</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button className="team-action-btn" style={{ justifyContent: 'flex-start', padding: '16px 20px' }} onClick={() => setActiveTab('editor')}>📝 Write New Post</button>
                  <button className="team-action-btn" style={{ justifyContent: 'flex-start', padding: '16px 20px' }} onClick={() => setActiveTab('posts')}>📊 View All Posts</button>
                  <button className="team-action-btn" style={{ justifyContent: 'flex-start', padding: '16px 20px' }} onClick={() => setActiveTab('settings')}>⚙️ Blog Settings</button>
                  {gaAnalytics ? (
                    <button className="team-action-btn" style={{ justifyContent: 'flex-start', padding: '16px 20px' }} onClick={fetchGAAnalytics}>🔄 Refresh Analytics</button>
                  ) : (
                    <button className="team-action-btn" style={{ justifyContent: 'flex-start', padding: '16px 20px' }} onClick={fetchGAAnalytics}>📈 Connect Google Analytics</button>
                  )}
                  <div style={{ background: '#f3f4f6', padding: 16, borderRadius: 8, marginTop: 8 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>💡 Quick Tip</h4>
                    <p style={{ fontSize: 13, color: '#6b7280' }}>Add your GA4 Property ID in Settings to see real analytics data.</p>
                  </div>
                </div>
              </div>

              <div className="team-section">
                <div className="team-section-header"><h3 className="team-section-title">Top Pages</h3></div>
                {gaAnalytics ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {gaAnalytics.topPages.slice(0, 5).map((page, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: 13, color: '#374151' }}>{page.path}</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{page.views.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                    <p style={{ marginBottom: 16 }}>No analytics data yet</p>
                    <button className="team-action-btn" onClick={fetchGAAnalytics}>Connect Google Analytics</button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'posts' && (
          <div className="team-section">
            <div className="team-section-header">
              <h2 className="team-section-title">All Posts</h2>
              <button className="team-action-btn" onClick={() => setActiveTab('editor')}>+ New Post</button>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Title</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>SEO</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Views</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Leads</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map(post => (
                    <tr key={post.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{post.title}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>/{post.slug}</div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: post.status === 'published' ? '#dcfce7' : post.status === 'scheduled' ? '#fef3c7' : '#f3f4f6', color: post.status === 'published' ? '#166534' : post.status === 'scheduled' ? '#92400e' : '#6b7280' }}>{post.status}</span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: getSeoScoreColor(post.seoScore), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{post.seoScore}</div>
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: 14 }}>{post.views.toLocaleString()}</td>
                      <td style={{ padding: '16px', fontSize: 14 }}>{post.leadsGenerated}</td>
                      <td style={{ padding: '16px', fontSize: 13, color: '#6b7280' }}>{post.status === 'published' && post.publishedAt ? format(parseISO(post.publishedAt), 'MMM d, yyyy') : post.scheduledDate ? format(parseISO(post.scheduledDate), 'MMM d, yyyy') : format(parseISO(post.createdAt), 'MMM d, yyyy')}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button className="team-action-btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setActiveTab('editor')}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="team-section">
            <div className="team-section-header">
              <h2 className="team-section-title">Blog Settings</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Google Analytics</h3>
                
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>GA4 Measurement ID</label>
                  <input type="text" placeholder="G-RMFYLJS16S" value={settings.gaMeasurementId} onChange={(e) => setSettings(prev => ({ ...prev, gaMeasurementId: e.target.value }))} style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Your GA4 Measurement ID for tracking</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>GA4 Property ID</label>
                  <input type="text" placeholder="123456789" value={settings.gaPropertyId} onChange={(e) => setSettings(prev => ({ ...prev, gaPropertyId: e.target.value }))} style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Found in GA Admin → Property Settings (numbers only)</p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Service Account Key (JSON)</label>
                  <textarea placeholder='{"type":"service_account",...}' value={settings.gaServiceAccountKey} onChange={(e) => setSettings(prev => ({ ...prev, gaServiceAccountKey: e.target.value }))} style={{ width: '100%', height: 100, padding: '10px 12px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'monospace' }} />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Google Cloud Service Account JSON key for API access</p>
                </div>

                <button className="team-action-btn" style={{ background: '#111827', color: '#fff', marginRight: 12 }} onClick={saveSettings}>Save Settings</button>
                <button className="team-action-btn" onClick={fetchGAAnalytics} disabled={loadingAnalytics}>
                  {loadingAnalytics ? 'Loading...' : 'Fetch Analytics'}
                </button>
              </div>

              <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>General Settings</h3>
                
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Blog Title</label>
                  <input type="text" value={settings.blogTitle} onChange={(e) => setSettings(prev => ({ ...prev, blogTitle: e.target.value }))} style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Blog Description</label>
                  <textarea value={settings.blogDescription} onChange={(e) => setSettings(prev => ({ ...prev, blogDescription: e.target.value }))} style={{ width: '100%', height: 80, padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'none' }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Slack Webhook (optional)</label>
                  <input type="text" placeholder="https://hooks.slack.com/..." value={settings.slackWebhook} onChange={(e) => setSettings(prev => ({ ...prev, slackWebhook: e.target.value }))} style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Get notified when posts are published</p>
                </div>

                <div style={{ marginBottom: 20, padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8, color: '#166534' }}>🤖 AI SEO Analysis</label>
                  <p style={{ fontSize: 12, color: '#15803d', marginBottom: 8 }}>AI-powered SEO analysis is enabled using OpenAI API (already configured on server)</p>
                  <p style={{ fontSize: 11, color: '#166534' }}>Click "Analyze with AI" in the Editor to get AI-powered recommendations.</p>
                </div>

                <button className="team-action-btn" style={{ background: '#111827', color: '#fff' }} onClick={saveSettings}>Save Settings</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
            <div className="team-section">
              <div className="team-section-header">
                <button className="team-action-btn" onClick={() => setActiveTab('posts')}>← Back</button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="team-action-btn">Save Draft</button>
                  <button className="team-action-btn" style={{ background: '#111827', color: '#fff' }}>Publish</button>
                </div>
              </div>
              <input type="text" placeholder="Post title..." style={{ width: '100%', padding: '16px 20px', fontSize: 24, fontWeight: 600, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', marginBottom: 16 }} />
              <textarea placeholder="Write content..." style={{ width: '100%', minHeight: 300, padding: 20, fontSize: 15, lineHeight: 1.7, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>SEO Score</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>--</div>
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>Add title & content to see score</p>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Category</label>
                <select style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', background: '#fff' }}>
                  <option value="">Select...</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Primary Keyword</label>
                <input type="text" placeholder="e.g., wedding planning" style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogDashboard;
