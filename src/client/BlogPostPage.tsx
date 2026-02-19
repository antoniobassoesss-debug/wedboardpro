import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { trackPageView, trackBlogPostView, trackArticleRead, trackScrollDepth, trackCTAClick } from '../lib/analytics';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  category: string;
  primaryKeyword: string | null;
  keywordVariations: string[];
  tags: string[];
  wordCount: number;
  readingTime: number;
  publishedAt: string | null;
  heroImage: string | null;
  heroImageAlt: string | null;
  seoScore: number;
  contentScore: number;
  technicalScore: number;
  relatedPosts: RelatedPost[];
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  readingTime: number;
  publishedAt: string | null;
  heroImage: string | null;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readProgress, setReadProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('');
  const [tocOpen, setTocOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const hasTrackedRead = useRef(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const originals = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      rootPosition: root?.style.position,
      rootOverflow: root?.style.overflow,
      rootHeight: root?.style.height,
    };

    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) {
      root.style.position = 'relative';
      root.style.overflow = 'visible';
      root.style.height = 'auto';
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
      html.style.overflow = originals.htmlOverflow;
      body.style.overflow = originals.bodyOverflow;
      body.style.height = originals.bodyHeight;
      if (root) {
        root.style.position = originals.rootPosition || '';
        root.style.overflow = originals.rootOverflow || '';
        root.style.height = originals.rootHeight || '';
      }
    };
  }, []);

  useEffect(() => {
    if (!slug) return;
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/seo/blog/posts/${slug}`);
        if (res.status === 404) {
          setError('not_found');
          return;
        }
        if (!res.ok) throw new Error('Failed to load post');
        const data = await res.json();
        setPost(data);
        document.title = `${data.title} | WedBoardPro Blog`;
        trackPageView(`/blog/${slug}`, `${data.title} | WedBoardPro Blog`);
        trackBlogPostView(data.id, data.title, data.category);
        startTime.current = Date.now();
        hasTrackedRead.current = false;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
    window.scrollTo(0, 0);
  }, [slug]);

  // Reading progress + scroll depth tracking
  useEffect(() => {
    const handleScroll = () => {
      const article = articleRef.current;
      if (!article) return;

      const rect = article.getBoundingClientRect();
      const scrolled = -rect.top;
      const total = rect.height - window.innerHeight;
      const progress = Math.min(100, Math.max(0, (scrolled / total) * 100));
      setReadProgress(progress);

      trackScrollDepth(Math.round(progress), `/blog/${slug}`);

      if (progress > 90 && !hasTrackedRead.current && post) {
        hasTrackedRead.current = true;
        const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
        trackArticleRead(post.id, post.title, Math.round(progress), timeSpent);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [slug, post]);

  // TOC from markdown headings
  const toc = useMemo((): TocItem[] => {
    if (!post?.content) return [];
    const headingRegex = /^(#{2,3})\s+(.+)$/gm;
    const items: TocItem[] = [];
    let match;
    while ((match = headingRegex.exec(post.content)) !== null) {
      const text = match[2]?.trim() ?? '';
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      items.push({ id, text, level: match[1]?.length ?? 2 });
    }
    return items;
  }, [post?.content]);

  // Intersection Observer for active section
  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    const timer = setTimeout(() => {
      toc.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [toc]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTocOpen(false);
    }
  }, []);

  // Custom markdown components
  const markdownComponents = useMemo(() => ({
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = String(children);
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return <h1 id={id} style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 700, color: '#111827', lineHeight: 1.2, margin: '48px 0 24px 0', letterSpacing: '-0.03em' }} {...props}>{children}</h1>;
    },
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = String(children);
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return <h2 id={id} style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 600, color: '#111827', lineHeight: 1.3, margin: '40px 0 16px 0', letterSpacing: '-0.02em' }} {...props}>{children}</h2>;
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
      const text = String(children);
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return <h3 id={id} style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 600, color: '#111827', lineHeight: 1.4, margin: '32px 0 12px 0', letterSpacing: '-0.01em' }} {...props}>{children}</h3>;
    },
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p style={{ fontSize: isMobile ? '16px' : '18px', color: '#374151', lineHeight: 1.8, margin: '0 0 24px 0' }} {...props}>{children}</p>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
      <ul style={{ fontSize: isMobile ? '16px' : '18px', color: '#374151', lineHeight: 1.8, margin: '0 0 24px 0', paddingLeft: '24px' }} {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
      <ol style={{ fontSize: isMobile ? '16px' : '18px', color: '#374151', lineHeight: 1.8, margin: '0 0 24px 0', paddingLeft: '24px' }} {...props}>{children}</ol>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
      <li style={{ marginBottom: '8px' }} {...props}>{children}</li>
    ),
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote style={{
        borderLeft: '3px solid #111827',
        paddingLeft: '20px',
        margin: '32px 0',
        fontStyle: 'italic',
        color: '#4b5563',
        fontSize: isMobile ? '16px' : '18px',
        lineHeight: 1.7,
      }} {...props}>{children}</blockquote>
    ),
    a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={href} style={{ color: '#111827', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '3px' }} target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined} {...props}>{children}</a>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <strong style={{ fontWeight: 600, color: '#111827' }} {...props}>{children}</strong>
    ),
    code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
      const isBlock = className?.includes('language-');
      if (isBlock) {
        return (
          <code style={{
            display: 'block',
            padding: '20px',
            backgroundColor: '#1f2937',
            color: '#e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            lineHeight: 1.6,
            overflowX: 'auto',
            margin: '24px 0',
            fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
          }} {...props}>{children}</code>
        );
      }
      return (
        <code style={{
          padding: '2px 6px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          fontSize: '0.9em',
          color: '#111827',
          fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
        }} {...props}>{children}</code>
      );
    },
    pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
      <pre style={{ margin: '24px 0', overflow: 'auto' }} {...props}>{children}</pre>
    ),
    table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
      <div style={{ overflowX: 'auto', margin: '24px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? '14px' : '16px' }} {...props}>{children}</table>
      </div>
    ),
    th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#111827', borderBottom: '2px solid #e5e7eb', backgroundColor: '#fafafa' }} {...props}>{children}</th>
    ),
    td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', color: '#374151' }} {...props}>{children}</td>
    ),
    hr: () => (
      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '40px 0' }} />
    ),
    img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
      <img src={src} alt={alt || ''} style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', margin: '24px 0' }} loading="lazy" {...props} />
    ),
  }), [isMobile]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: isMobile ? '100px 20px 60px' : '120px 32px 80px' }}>
          <div style={{ width: '80px', height: '22px', borderRadius: '4px', backgroundColor: '#f3f4f6', marginBottom: '16px', animation: 'pulse 2s ease infinite' }} />
          <div style={{ width: '100%', height: '36px', borderRadius: '4px', backgroundColor: '#f3f4f6', marginBottom: '12px', animation: 'pulse 2s ease infinite' }} />
          <div style={{ width: '70%', height: '36px', borderRadius: '4px', backgroundColor: '#f3f4f6', marginBottom: '24px', animation: 'pulse 2s ease infinite' }} />
          <div style={{ width: '200px', height: '16px', borderRadius: '4px', backgroundColor: '#f3f4f6', marginBottom: '48px', animation: 'pulse 2s ease infinite' }} />
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ width: '100%', height: '18px', borderRadius: '4px', backgroundColor: '#f3f4f6', marginBottom: '12px', animation: 'pulse 2s ease infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error === 'not_found' || !post) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>404</h1>
          <p style={{ fontSize: '18px', color: '#6b7280', margin: '0 0 32px 0' }}>This article doesn't exist or hasn't been published yet.</p>
          <Link to="/blog" style={{ display: 'inline-block', padding: '12px 28px', fontSize: '14px', fontWeight: 500, color: '#fff', backgroundColor: '#111827', borderRadius: '8px', textDecoration: 'none' }}>
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: '18px', color: '#ef4444', margin: '0 0 24px 0' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 28px', fontSize: '14px', fontWeight: 500, color: '#fff', backgroundColor: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Reading Progress Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${readProgress}%`,
        height: '3px',
        background: 'linear-gradient(90deg, #10b981 0%, #0d9488 100%)',
        zIndex: 100,
        transition: 'width 0.1s ease-out',
      }} />

      {/* Header */}
      <header style={{
        position: 'fixed',
        top: '3px',
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
          height: isMobile ? '56px' : '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', textDecoration: 'none' }}>
              <img src="/logo/iconlogo.png" alt="WedBoardPro" style={{ width: isMobile ? '24px' : '32px', height: isMobile ? '24px' : '32px', objectFit: 'contain' }} />
              {!isMobile && <span style={{ fontSize: '18px', fontWeight: 600, color: '#111827', letterSpacing: '-0.025em' }}>WedBoardPro</span>}
            </Link>
            <span style={{ color: '#d1d5db', fontSize: '14px' }}>/</span>
            <Link to="/blog" style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280', textDecoration: 'none' }}>Blog</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/login" style={{ padding: isMobile ? '6px 10px' : '8px 16px', fontSize: '13px', fontWeight: 500, color: '#374151', textDecoration: 'none', borderRadius: '6px' }}>Log in</Link>
            <Link to="/signup" style={{ padding: isMobile ? '6px 12px' : '8px 16px', fontSize: '13px', fontWeight: 500, color: '#fff', textDecoration: 'none', borderRadius: '6px', backgroundColor: '#111827' }}>{isMobile ? 'Try free' : 'Start free trial'}</Link>
          </div>
        </div>
      </header>

      <main style={{ paddingTop: isMobile ? '75px' : '83px' }}>
        {/* Article + TOC Layout */}
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: isMobile ? '0 20px' : '0 32px',
          display: isMobile ? 'block' : 'flex',
          gap: '60px',
          alignItems: 'flex-start',
        }}>
          {/* TOC Sidebar (desktop) */}
          {!isMobile && toc.length > 2 && (
            <aside style={{
              position: 'sticky',
              top: '100px',
              width: '220px',
              flexShrink: 0,
              paddingTop: '40px',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: '0 0 12px 0' }}>
                On this page
              </p>
              <nav>
                {toc.map(item => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '4px 0',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      color: activeSection === item.id ? '#111827' : '#9ca3af',
                      fontWeight: activeSection === item.id ? 500 : 400,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.15s ease',
                      borderLeft: activeSection === item.id ? '2px solid #111827' : '2px solid transparent',
                      marginLeft: '-2px',
                      paddingLeft: item.level === 3 ? '16px' : item.level === 2 ? '12px' : '0',
                    }}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </aside>
          )}

          {/* Article Content */}
          <article ref={articleRef} style={{ flex: 1, maxWidth: '720px', paddingBottom: '80px' }}>
            {/* Article Header */}
            <header style={{ paddingTop: isMobile ? '24px' : '40px', marginBottom: isMobile ? '32px' : '48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <Link to={`/blog?category=${encodeURIComponent(post.category)}`} style={{
                  padding: '4px 12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#4b5563',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textDecoration: 'none',
                }}>{post.category}</Link>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>{post.readingTime} min read</span>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>{formatDate(post.publishedAt)}</span>
              </div>
              <h1 style={{
                fontSize: isMobile ? '28px' : '42px',
                fontWeight: 700,
                color: '#111827',
                lineHeight: 1.15,
                margin: '0 0 20px 0',
                letterSpacing: '-0.035em',
              }}>{post.title}</h1>
              {post.excerpt && (
                <p style={{
                  fontSize: isMobile ? '16px' : '20px',
                  color: '#6b7280',
                  lineHeight: 1.6,
                  margin: '0 0 24px 0',
                }}>{post.excerpt}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>WedBoardPro Team</p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{post.wordCount.toLocaleString()} words</p>
                </div>
              </div>
            </header>

            {/* Mobile TOC */}
            {isMobile && toc.length > 2 && (
              <div style={{
                marginBottom: '32px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setTocOpen(!tocOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    backgroundColor: '#fafafa',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span>Table of Contents</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: tocOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {tocOpen && (
                  <nav style={{ padding: '8px 16px 16px' }}>
                    {toc.map(item => (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 0',
                          paddingLeft: item.level === 3 ? '16px' : '0',
                          fontSize: '14px',
                          color: '#374151',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {item.text}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            )}

            {/* Markdown Content */}
            <div>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Article Footer */}
            <footer style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #e5e7eb' }}>
              {/* Tags */}
              {post.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                  {post.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '4px 12px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '100px',
                      fontSize: '12px',
                      color: '#4b5563',
                      fontWeight: 500,
                    }}>{tag}</span>
                  ))}
                </div>
              )}

              {/* Share */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Share this article</span>
                <button
                  onClick={handleCopyLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: copied ? '#10b981' : '#374151',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                      Copy link
                    </>
                  )}
                </button>
              </div>
            </footer>
          </article>
        </div>

        {/* Related Posts */}
        {post.relatedPosts.length > 0 && (
          <section style={{ padding: isMobile ? '48px 0' : '80px 0', backgroundColor: '#fafafa', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 20px' : '0 32px' }}>
              <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 600, color: '#111827', letterSpacing: '-0.025em', margin: '0 0 32px 0' }}>
                Continue Reading
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(post.relatedPosts.length, 3)}, 1fr)`,
                gap: isMobile ? '16px' : '24px'
              }}>
                {post.relatedPosts.map(rp => (
                  <Link
                    key={rp.id}
                    to={`/blog/${rp.slug}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                    onClick={() => trackBlogPostView(rp.id, rp.title, rp.category)}
                  >
                    <article style={{
                      borderRadius: '12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: 'pointer',
                      height: '100%',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{
                        height: isMobile ? '160px' : '180px',
                        backgroundColor: '#f3f4f6',
                        backgroundImage: rp.heroImage ? `url(${rp.heroImage})` : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {!rp.heroImage && (
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                          </svg>
                        )}
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
                            letterSpacing: '0.05em',
                          }}>{rp.category}</span>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{rp.readingTime} min read</span>
                        </div>
                        <h3 style={{
                          fontSize: isMobile ? '17px' : '18px',
                          fontWeight: 600,
                          color: '#111827',
                          lineHeight: 1.4,
                          margin: '0 0 12px 0',
                          letterSpacing: '-0.01em',
                        }}>{rp.title}</h3>
                        <p style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          lineHeight: 1.6,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>{rp.excerpt}</p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Newsletter CTA */}
        <section style={{ padding: isMobile ? '48px 0' : '80px 0', backgroundColor: post.relatedPosts.length > 0 ? '#ffffff' : '#fafafa', borderTop: '1px solid #e5e7eb' }}>
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
                onClick={() => trackCTAClick('blog-post-newsletter', 'Newsletter Signup', 'subscribe', 'Subscribe')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
            &copy; {new Date().getFullYear()} WedBoardPro
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BlogPostPage;
