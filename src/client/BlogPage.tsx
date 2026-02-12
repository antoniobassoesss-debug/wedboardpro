import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackPageView, trackBlogPostView, trackCTAClick, trackScrollDepth } from '../lib/analytics';

interface BlogPost {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  content?: string;
  readTime: string;
  date: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  image?: string;
  featured?: boolean;
}

const blogPosts: BlogPost[] = [
  {
    id: 'pricing-strategy',
    category: 'Business Growth',
    title: 'How to Raise Your Wedding Planning Prices by 30% (Without Losing Clients)',
    excerpt: 'A step-by-step framework for positioning your services as premium and commanding higher fees while maintaining client trust.',
    readTime: '8 min read',
    date: 'Feb 8, 2026',
    author: {
      name: 'Sarah Mitchell',
      role: 'Industry Expert'
    },
    featured: true
  },
  {
    id: 'tech-stack-2026',
    category: 'Operations',
    title: 'The Complete Tech Stack for Modern Wedding Planners in 2026',
    excerpt: 'From CRM to floor planning — the exact tools top planners use to manage 20+ weddings simultaneously without burnout.',
    readTime: '12 min read',
    date: 'Feb 3, 2026',
    author: {
      name: 'Marcus Chen',
      role: 'Tech Consultant'
    }
  },
  {
    id: 'wow-moments',
    category: 'Client Experience',
    title: 'Creating Wow Moments: The Small Details That Lead to Big Referrals',
    excerpt: 'How to exceed expectations at every touchpoint and turn satisfied clients into your biggest brand advocates.',
    readTime: '6 min read',
    date: 'Jan 28, 2026',
    author: {
      name: 'Emma Rodriguez',
      role: 'Client Success Expert'
    }
  },
  {
    id: 'vendor-management',
    category: 'Operations',
    title: 'Building Your Dream Vendor Network: A Strategic Approach',
    excerpt: 'How to identify, vet, and build lasting relationships with the vendors who will make your clients happy.',
    readTime: '9 min read',
    date: 'Jan 22, 2026',
    author: {
      name: 'James Wheeler',
      role: 'Vendor Relations Specialist'
    }
  },
  {
    id: 'wedding-season-prep',
    category: 'Planning Tips',
    title: 'Pre-Season Checklist: Get Your Business Ready for Peak Wedding Season',
    excerpt: 'The comprehensive setup guide that top planners use to ensure smooth operations during the busiest months.',
    readTime: '11 min read',
    date: 'Jan 15, 2026',
    author: {
      name: 'Lisa Thompson',
      role: 'Seasoned Planner'
    }
  },
  {
    id: 'contracts-legal',
    category: 'Business Growth',
    title: 'Contract Essentials: Protecting Your Business Without Scaring Away Clients',
    excerpt: 'Must-have clauses every wedding planner needs, plus language that keeps clients feeling confident and secure.',
    readTime: '10 min read',
    date: 'Jan 8, 2026',
    author: {
      name: 'David Park',
      role: 'Legal Consultant'
    }
  },
  {
    id: 'social-media-marketing',
    category: 'Marketing',
    title: 'Instagram for Wedding Planners: Building a Portfolio That Books Clients',
    excerpt: 'A practical guide to creating content that showcases your work and attracts your ideal wedding clients.',
    readTime: '7 min read',
    date: 'Jan 3, 2026',
    author: {
      name: 'Nina Patel',
      role: 'Marketing Specialist'
    }
  },
  {
    id: 'lead-qualification',
    category: 'Sales',
    title: 'Qualifying Leads Without Being Pushy: The Art of Effortless Booking',
    excerpt: 'How to identify serious prospects and gently disqualify time-wasters while building genuine connections.',
    readTime: '8 min read',
    date: 'Dec 28, 2025',
    author: {
      name: 'Rachel Adams',
      role: 'Sales Trainer'
    }
  },
  {
    id: 'timeline-management',
    category: 'Operations',
    title: 'Mastering the Wedding Day Timeline: From First Touch to Last Dance',
    excerpt: 'Creating detailed day-of schedules that keep everyone on track and reduce your stress levels significantly.',
    readTime: '14 min read',
    date: 'Dec 20, 2025',
    author: {
      name: 'Michael Brooks',
      role: 'Timeline Expert'
    }
  }
];

const categories = [
  { name: 'All Posts', count: 9 },
  { name: 'Business Growth', count: 2 },
  { name: 'Operations', count: 3 },
  { name: 'Client Experience', count: 1 },
  { name: 'Planning Tips', count: 1 },
  { name: 'Marketing', count: 1 },
  { name: 'Sales', count: 1 }
];

const BlogPage: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All Posts');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const originalHtmlOverflow = html.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    const originalBodyHeight = body.style.height;
    const originalRootPosition = root?.style.position;
    const originalRootOverflow = root?.style.overflow;
    const originalRootHeight = root?.style.height;

    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) {
      root.style.position = 'relative';
      root.style.overflow = 'visible';
      root.style.height = 'auto';
    }

    trackPageView('/blog', 'Blog - WedBoardPro');

    return () => {
      window.removeEventListener('resize', checkMobile);
      html.style.overflow = originalHtmlOverflow;
      body.style.overflow = originalBodyOverflow;
      body.style.height = originalBodyHeight;
      if (root) {
        root.style.position = originalRootPosition || '';
        root.style.overflow = originalRootOverflow || '';
        root.style.height = originalRootHeight || '';
      }
    };
  }, []);

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = activeCategory === 'All Posts' || post.category === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredPost = blogPosts.find(post => post.featured);
  const regularPosts = filteredPosts.filter(post => !post.featured || activeCategory !== 'All Posts' || searchQuery);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 32px',
          height: isMobile ? '60px' : '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', textDecoration: 'none' }}>
            <img src="/logo/iconlogo.png" alt="WedBoardPro" style={{ width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', objectFit: 'contain' }} />
            {!isMobile && <span style={{ fontSize: '20px', fontWeight: 600, color: '#111827', letterSpacing: '-0.025em' }}>WedBoardPro</span>}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '8px' }}>
            <Link
              to="/login"
              style={{
                padding: isMobile ? '8px 12px' : '10px 20px',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 500,
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '8px'
              }}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              style={{
                padding: isMobile ? '8px 14px' : '10px 20px',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: 500,
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '8px',
                backgroundColor: '#111827'
              }}
            >
              {isMobile ? 'Start trial' : 'Start free trial'}
            </Link>
          </div>
        </div>
      </header>

      <main style={{ paddingTop: isMobile ? '60px' : '72px' }}>
        {/* Hero */}
        <section style={{ paddingBottom: isMobile ? '48px' : '64px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px' }}>
            <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
              <span style={{
                display: 'inline-block',
                padding: '6px 14px',
                backgroundColor: '#f3f4f6',
                borderRadius: '100px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#4b5563',
                marginBottom: '20px'
              }}>
                Wedding Planner Resources
              </span>
              <h1 style={{
                fontSize: isMobile ? '32px' : '48px',
                fontWeight: 600,
                color: '#111827',
                letterSpacing: '-0.035em',
                lineHeight: 1.1,
                margin: '0 0 20px 0'
              }}>
                Insights to grow your wedding planning business
              </h1>
              <p style={{
                fontSize: isMobile ? '16px' : '18px',
                color: '#6b7280',
                lineHeight: 1.6,
                maxWidth: '540px',
                margin: '0 auto'
              }}>
                Expert strategies, practical guides, and proven tactics from industry leaders who have been in your shoes.
              </p>
            </div>
          </div>
        </section>

        {/* Search & Filter */}
        <section style={{ paddingBottom: isMobile ? '32px' : '48px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px' }}>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '16px' : '24px',
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between'
            }}>
              {/* Category Filter */}
              <div style={{
                display: 'flex',
                gap: isMobile ? '8px' : '12px',
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'flex-start' : 'flex-start'
              }}>
                {categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    style={{
                      padding: isMobile ? '8px 14px' : '10px 18px',
                      fontSize: isMobile ? '13px' : '14px',
                      fontWeight: 500,
                      color: activeCategory === cat.name ? '#ffffff' : '#374151',
                      backgroundColor: activeCategory === cat.name ? '#111827' : '#ffffff',
                      border: activeCategory === cat.name ? 'none' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat.name}
                    <span style={{
                      marginLeft: '6px',
                      fontSize: '12px',
                      color: activeCategory === cat.name ? '#9ca3af' : '#9ca3af'
                    }}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div style={{ position: 'relative', width: isMobile ? '100%' : '280px' }}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: isMobile ? '12px 14px 12px 44px' : '12px 16px 12px 44px',
                    fontSize: '14px',
                    color: '#111827',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Post */}
        {activeCategory === 'All Posts' && !searchQuery && featuredPost && (
          <section style={{ paddingBottom: isMobile ? '48px' : '64px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: isMobile ? '20px' : '32px',
                backgroundColor: '#fafafa',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  height: isMobile ? '220px' : '400px',
                  backgroundColor: '#e5e7eb',
                  backgroundImage: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <div style={{ padding: isMobile ? '24px' : '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{
                      padding: '5px 12px',
                      backgroundColor: '#111827',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Featured
                    </span>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{featuredPost.readTime}</span>
                  </div>
                  <h2 style={{
                    fontSize: isMobile ? '22px' : '28px',
                    fontWeight: 600,
                    color: '#111827',
                    lineHeight: 1.3,
                    margin: '0 0 16px 0',
                    letterSpacing: '-0.02em'
                  }}>
                    {featuredPost.title}
                  </h2>
                  <p style={{
                    fontSize: isMobile ? '14px' : '16px',
                    color: '#6b7280',
                    lineHeight: 1.6,
                    margin: '0 0 24px 0'
                  }}>
                    {featuredPost.excerpt}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>
                        {featuredPost.author.name}
                      </p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                        {featuredPost.date}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Blog Grid */}
        <section style={{ paddingBottom: isMobile ? '64px' : '100px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px' }}>
            {filteredPosts.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: isMobile ? '16px' : '24px'
              }}>
                {filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    style={{
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => trackBlogPostView(post.id, post.title, post.category)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      height: isMobile ? '160px' : '180px',
                      backgroundColor: '#f3f4f6',
                      backgroundImage: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                    <div style={{ padding: isMobile ? '20px' : '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#4b5563',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {post.category}
                        </span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{post.readTime}</span>
                      </div>
                      <h3 style={{
                        fontSize: isMobile ? '17px' : '18px',
                        fontWeight: 600,
                        color: '#111827',
                        lineHeight: 1.4,
                        margin: '0 0 12px 0',
                        letterSpacing: '-0.01em'
                      }}>
                        {post.title}
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        lineHeight: 1.6,
                        margin: '0 0 16px 0'
                      }}>
                        {post.excerpt}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0 }}>
                            {post.author.name}
                          </p>
                          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                            {post.date}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ marginBottom: '24px' }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
                  No articles found
                </h3>
                <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section style={{ padding: isMobile ? '48px 0' : '80px 0', backgroundColor: '#fafafa', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 600, color: '#111827', letterSpacing: '-0.025em', margin: '0 0 12px 0' }}>
              Get insights delivered to your inbox
            </h2>
            <p style={{ fontSize: isMobile ? '15px' : '16px', color: '#6b7280', lineHeight: 1.6, margin: '0 0 24px 0' }}>
              Weekly tips, strategies, and guides for wedding planners who want to grow their business.
            </p>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', maxWidth: isMobile ? '100%' : '420px', margin: '0 auto' }}>
              <input
                type="email"
                placeholder="Enter your email"
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  fontSize: '15px',
                  color: '#111827',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
              <Link
                to="/signup"
                onClick={() => trackCTAClick('blog-newsletter', 'Newsletter Signup', 'subscribe', 'Subscribe')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 28px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#111827'
                }}
              >
                Subscribe
              </Link>
            </div>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '16px' }}>
              Join 10,000+ planners. Unsubscribe anytime.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #f3f4f6' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '24px 20px' : '40px 32px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '20px' : '24px',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo/iconlogo.png" alt="WedBoardPro" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>WedBoardPro</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '32px', fontSize: '14px' }}>
            <Link to="/about" style={{ color: '#111827', textDecoration: 'none', fontWeight: 500 }}>About</Link>
            <Link to="/privacy" style={{ color: '#6b7280', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/terms" style={{ color: '#6b7280', textDecoration: 'none' }}>Terms</Link>
            <Link to="/contact" style={{ color: '#6b7280', textDecoration: 'none' }}>Contact</Link>
          </div>
          <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#9ca3af', margin: 0 }}>
            © {new Date().getFullYear()} WedBoardPro
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BlogPage;
