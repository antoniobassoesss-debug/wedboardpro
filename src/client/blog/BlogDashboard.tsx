import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';

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
  seoTitle: string;
  metaDescription: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledDate: string | null;
  publishedAt: string | null;
  createdAt: string;
  seoScore: number;
  views: number;
  leadsGenerated: number;
}

const CATEGORIES = ['Business Growth', 'Operations', 'Client Experience', 'Planning Tips', 'Marketing', 'Sales', 'Industry News'];
const COMMON_TAGS = ['wedding planning', 'client management', 'vendor relations', 'pricing strategy', 'workflow automation', 'lead generation'];

const BlogDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'editor' | 'settings'>('overview');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState({ totalPosts: 0, publishedPosts: 0, scheduledPosts: 0, avgSeoScore: 0, viewsThisWeek: 0, leadsThisWeek: 0 });
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [editorData, setEditorData] = useState({
    title: '', content: '', excerpt: '', category: '', tags: [] as string[], primaryKeyword: '',
    seoTitle: '', metaDescription: '', slug: '', scheduledDate: '', status: 'draft' as 'draft' | 'scheduled' | 'published'
  });

  useEffect(() => {
    const token = sessionStorage.getItem('team_token');
    const userData = sessionStorage.getItem('team_user');
    if (!token || !userData) { navigate('/team-login'); return; }
    try { setUser(JSON.parse(userData)); } catch { navigate('/team-login'); }
    loadPosts();
  }, [navigate]);

  const loadPosts = () => {
    const mockPosts: BlogPost[] = [
      { id: '1', title: 'How to Raise Your Wedding Planning Prices by 30%', slug: 'raise-wedding-planning-prices', content: '<p>Premium pricing...</p>', excerpt: 'Framework for premium positioning.', category: 'Business Growth', tags: ['pricing strategy'], primaryKeyword: 'wedding planning prices', secondaryKeywords: [], seoTitle: 'Raise Wedding Planning Prices', metaDescription: 'Learn to increase rates.', status: 'published', scheduledDate: null, publishedAt: '2026-02-08', createdAt: '2026-02-05', seoScore: 92, views: 2450, leadsGenerated: 45 },
      { id: '2', title: 'The Complete Tech Stack for Wedding Planners in 2026', slug: 'tech-stack-wedding-planners-2026', content: '<p>Modern tools...</p>', excerpt: 'Tools top planners use.', category: 'Operations', tags: ['workflow automation'], primaryKeyword: 'wedding planner software', secondaryKeywords: [], seoTitle: 'Best Wedding Planner Software', metaDescription: 'Complete tech stack guide.', status: 'scheduled', scheduledDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'), publishedAt: null, createdAt: '2026-02-01', seoScore: 88, views: 0, leadsGenerated: 0 },
      { id: '3', title: 'Creating Wow Moments That Drive Referrals', slug: 'wow-moments-wedding-referrals', content: '<p>Client experience...</p>', excerpt: 'Exceed expectations.', category: 'Client Experience', tags: ['client management'], primaryKeyword: 'wedding client referrals', secondaryKeywords: [], seoTitle: 'Create Wow Moments', metaDescription: 'Drive referrals.', status: 'draft', scheduledDate: null, publishedAt: null, createdAt: '2026-02-10', seoScore: 72, views: 0, leadsGenerated: 0 }
    ];
    setPosts(mockPosts);
    setStats({ totalPosts: 3, publishedPosts: 1, scheduledPosts: 1, avgSeoScore: 84, viewsThisWeek: 735, leadsThisWeek: 11 });
  };

  const getSeoScoreColor = (score: number) => score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  const resetEditor = () => {
    setEditorData({ title: '', content: '', excerpt: '', category: '', tags: [], primaryKeyword: '', seoTitle: '', metaDescription: '', slug: '', scheduledDate: '', status: 'draft' });
  };

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
          <button className={`team-nav-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); resetEditor(); }}>Blog Overview</button>
          <button className={`team-nav-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => { setActiveTab('posts'); resetEditor(); }}>All Posts</button>
          <button className={`team-nav-btn ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => { resetEditor(); setActiveTab('editor'); }}>Editor</button>
          <button className={`team-nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); resetEditor(); }}>Settings</button>
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
                <button className="team-action-btn" style={{ background: '#111827', color: '#fff' }} onClick={() => { resetEditor(); setActiveTab('editor'); }}>+ New Post</button>
              </div>
            </div>

            <div className="team-stats-grid" style={{ marginBottom: 24 }}>
              <div className="team-stat-card"><div className="team-stat-label">Total Posts</div><div className="team-stat-value">{stats.totalPosts}</div><div style={{ fontSize: 11, color: '#6b7280' }}>{stats.publishedPosts} published</div></div>
              <div className="team-stat-card"><div className="team-stat-label">Avg. SEO Score</div><div className="team-stat-value" style={{ color: getSeoScoreColor(stats.avgSeoScore) }}>{stats.avgSeoScore}%</div></div>
              <div className="team-stat-card"><div className="team-stat-label">Views This Week</div><div className="team-stat-value">{stats.viewsThisWeek.toLocaleString()}</div><div style={{ fontSize: 11, color: '#10b981' }}>+12%</div></div>
              <div className="team-stat-card"><div className="team-stat-label">Leads This Week</div><div className="team-stat-value">{stats.leadsThisWeek}</div><div style={{ fontSize: 11, color: '#10b981' }}>+8%</div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="team-section">
                <div className="team-section-header"><h3 className="team-section-title">Quick Actions</h3></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button className="team-action-btn" style={{ justifyContent: 'flex-start', padding: '16px 20px' }} onClick={() => { resetEditor(); setEditorData(prev => ({ ...prev, scheduledDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'), status: 'scheduled' })); setActiveTab('editor'); }}>📅 Schedule Next Week's Post</button>
                  <button className="team-action-btn" style={{ justifyContent: 'flex-start', padding: '16px 20px' }} onClick={() => setActiveTab('posts')}>📊 View Performance</button>
                  <button className="team-action-btn" style={{ justifyContent: 'flex-start', padding: '16px 20px' }} onClick={() => setActiveTab('settings')}>⚙️ Blog Settings</button>
                  <div style={{ background: '#f3f4f6', padding: 16, borderRadius: 8, marginTop: 8 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>💡 SEO Tip</h4>
                    <p style={{ fontSize: 13, color: '#6b7280' }}>Posts on Mondays get 23% more traffic.</p>
                  </div>
                </div>
              </div>
              <div className="team-section">
                <div className="team-section-header"><h3 className="team-section-title">Recent Posts</h3></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {posts.slice(0, 3).map(post => (
                    <div key={post.id} style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => { setEditorData({ title: post.title, content: post.content, excerpt: post.excerpt, category: post.category, tags: post.tags, primaryKeyword: post.primaryKeyword, seoTitle: post.seoTitle, metaDescription: post.metaDescription, slug: post.slug, scheduledDate: post.scheduledDate || '', status: post.status }); setActiveTab('editor'); }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{post.title.substring(0, 40)}...</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: post.status === 'published' ? '#dcfce7' : post.status === 'scheduled' ? '#fef3c7' : '#f3f4f6', color: post.status === 'published' ? '#166534' : post.status === 'scheduled' ? '#92400e' : '#6b7280' }}>{post.status}</span>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>SEO: {post.seoScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'posts' && (
          <div className="team-section">
            <div className="team-section-header">
              <h2 className="team-section-title">All Posts</h2>
              <button className="team-action-btn" onClick={() => { resetEditor(); setActiveTab('editor'); }}>+ New Post</button>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Title</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>SEO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Views</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Leads</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Actions</th>
                </tr></thead>
                <tbody>
                  {posts.map(post => (
                    <tr key={post.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '16px' }}><div style={{ fontWeight: 500, fontSize: 14 }}>{post.title}</div><div style={{ fontSize: 12, color: '#6b7280' }}>/{post.slug}</div></td>
                      <td style={{ padding: '16px' }}><span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: post.status === 'published' ? '#dcfce7' : post.status === 'scheduled' ? '#fef3c7' : '#f3f4f6', color: post.status === 'published' ? '#166534' : post.status === 'scheduled' ? '#92400e' : '#6b7280' }}>{post.status}</span></td>
                      <td style={{ padding: '16px' }}><div style={{ width: 32, height: 32, borderRadius: '50%', background: getSeoScoreColor(post.seoScore), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{post.seoScore}</div></td>
                      <td style={{ padding: '16px' }}>{post.views.toLocaleString()}</td>
                      <td style={{ padding: '16px' }}>{post.leadsGenerated}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}><button className="team-action-btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => { setEditorData({ title: post.title, content: post.content, excerpt: post.excerpt, category: post.category, tags: post.tags, primaryKeyword: post.primaryKeyword, seoTitle: post.seoTitle, metaDescription: post.metaDescription, slug: post.slug, scheduledDate: post.scheduledDate || '', status: post.status }); setActiveTab('editor'); }}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
            <div className="team-section">
              <div className="team-section-header">
                <button className="team-action-btn" onClick={() => setActiveTab('posts')}>← Back</button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="team-action-btn" onClick={() => alert('Draft saved!')}>Save Draft</button>
                  <button className="team-action-btn" style={{ background: '#111827', color: '#fff' }} onClick={() => { alert('Published!'); setActiveTab('posts'); }}>Publish</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input type="text" placeholder="Post title..." value={editorData.title} onChange={(e) => setEditorData(prev => ({ ...prev, title: e.target.value, slug: prev.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} style={{ width: '100%', padding: '16px 20px', fontSize: 24, fontWeight: 600, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
                <textarea placeholder="Write content (HTML supported)..." value={editorData.content} onChange={(e) => setEditorData(prev => ({ ...prev, content: e.target.value }))} style={{ width: '100%', minHeight: 300, padding: 20, fontSize: 15, lineHeight: 1.7, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                <textarea placeholder="Short excerpt..." value={editorData.excerpt} onChange={(e) => setEditorData(prev => ({ ...prev, excerpt: e.target.value }))} style={{ width: '100%', height: 80, padding: 12, fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>SEO Score</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: getSeoScoreColor(editorData.title ? 75 : 0), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>{editorData.title ? 75 : 0}</div>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Add title & keywords to improve score</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Primary Keyword *</label>
                <input type="text" placeholder="e.g., wedding planning" value={editorData.primaryKeyword} onChange={(e) => setEditorData(prev => ({ ...prev, primaryKeyword: e.target.value }))} style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Category</label>
                <select value={editorData.category} onChange={(e) => setEditorData(prev => ({ ...prev, category: e.target.value }))} style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', background: '#fff' }}>
                  <option value="">Select...</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginTop: 12, marginBottom: 8 }}>Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {COMMON_TAGS.map(tag => (
                    <button key={tag} onClick={() => setEditorData(prev => ({ ...prev, tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag] }))} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 4, border: 'none', background: editorData.tags.includes(tag) ? '#111827' : '#f3f4f6', color: editorData.tags.includes(tag) ? '#fff' : '#374151', cursor: 'pointer' }}>{tag}</button>
                  ))}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>SEO Title ({editorData.seoTitle.length}/60)</label>
                <input type="text" placeholder="SEO title..." value={editorData.seoTitle} onChange={(e) => setEditorData(prev => ({ ...prev, seoTitle: e.target.value }))} style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginTop: 12, marginBottom: 8 }}>Meta Description ({editorData.metaDescription.length}/160)</label>
                <textarea placeholder="Meta description..." value={editorData.metaDescription} onChange={(e) => setEditorData(prev => ({ ...prev, metaDescription: e.target.value }))} style={{ width: '100%', height: 70, padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'none' }} />
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginTop: 12, marginBottom: 8 }}>URL Slug</label>
                <input type="text" placeholder="/post-slug" value={editorData.slug} onChange={(e) => setEditorData(prev => ({ ...prev, slug: e.target.value }))} style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Schedule</label>
                <input type="date" value={editorData.scheduledDate} onChange={(e) => setEditorData(prev => ({ ...prev, scheduledDate: e.target.value }))} style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="team-section">
            <div className="team-section-header">
              <h2 className="team-section-title">Blog Settings</h2>
              <button className="team-action-btn" onClick={() => setActiveTab('overview')}>← Back</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>General</h3>
                <div style={{ marginBottom: 16 }}><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Blog Title</label><input type="text" defaultValue="WedBoardPro Blog" style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8 }} /></div>
                <div style={{ marginBottom: 16 }}><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Description</label><textarea defaultValue="Expert insights for wedding planners" style={{ width: '100%', height: 80, padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, resize: 'none' }} /></div>
                <button className="team-action-btn" style={{ background: '#111827', color: '#fff' }}>Save</button>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Integrations</h3>
                <div style={{ marginBottom: 16 }}><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Google Analytics</label><input type="text" placeholder="G-XXXXXXXXXX" style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8 }} /></div>
                <div style={{ marginBottom: 16 }}><label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>Slack Webhook</label><input type="text" placeholder="https://hooks.slack.com/..." style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8 }} /></div>
                <button className="team-action-btn" style={{ background: '#111827', color: '#fff' }}>Save</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BlogDashboard;
