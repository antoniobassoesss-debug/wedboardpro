import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../team.css';

// ── Interfaces ───────────────────────────────────────────────────────

interface TeamUser {
  email: string;
  name: string;
  role: string;
}

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

interface ClusterDetail extends ClusterData {
  articles: Array<{
    id: string;
    article_role: 'pillar' | 'supporting';
    internal_links_to: string[] | null;
    internal_links_from: string[] | null;
    blog_posts: {
      id: string;
      title: string;
      slug: string;
      status: string;
      actual_word_count: number | null;
      content_grade: string | null;
      created_at: string;
    } | null;
  }>;
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

interface PerformanceData {
  totalPosts: number;
  drafts: number;
  inReview: number;
  published: number;
  totalWords: number;
  postsThisWeek: number;
  publishedThisMonth: number;
  avgSeoScore?: number;
  estimatedTraffic?: number;
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
}

interface ArticleData {
  id: string;
  title: string;
  slug: string;
  status: string;
  content: string;
  meta_description: string;
  primary_keyword: string | null;
  actual_word_count: number;
  total_views: number;
  total_clicks: number;
  created_at: string;
  published_at: string | null;
  excerpt: string;
  seo_score: number;
}

// ── InfoTooltip ──────────────────────────────────────────────────────

function InfoTooltip({ title, text }: { title?: string; text: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        style={{
          width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: '#dbeafe', color: '#2563eb', fontSize: 12, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ?
      </button>
      {isOpen && (
        <div style={{
          position: 'absolute', zIndex: 50, width: 320, padding: 16,
          background: '#111827', color: '#fff', fontSize: 13, lineHeight: 1.6,
          borderRadius: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          top: -8, left: 28,
        }}>
          {title && <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{title}</div>}
          <div style={{ whiteSpace: 'pre-line', color: '#d1d5db' }}>{text}</div>
          <div style={{
            position: 'absolute', width: 10, height: 10, background: '#111827',
            transform: 'rotate(45deg)', left: -5, top: 14,
          }} />
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getWeekDay(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

function formatWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Write Article Modal ──────────────────────────────────────────────

function WriteArticleModal({
  clusters,
  token,
  onClose,
  onSuccess,
}: {
  clusters: ClusterData[];
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [topic, setTopic] = useState('');
  const [intent, setIntent] = useState('informational');
  const [wordCount, setWordCount] = useState(1500);
  const [cluster, setCluster] = useState('none');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ title?: string; slug?: string; word_count?: number; seo_score?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/seo/intelligence/generate-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          keyword: topic,
          intent,
          target_word_count: wordCount,
          cluster_id: cluster !== 'none' ? cluster : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to generate article');
      } else {
        setResult(data);
      }
    } catch {
      setError('Failed to generate article. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  const intentOptions = [
    { value: 'informational', label: 'Educational', desc: 'How-to guides, tips, best practices' },
    { value: 'commercial', label: 'Comparison', desc: 'Software reviews, alternatives, vs articles' },
    { value: 'transactional', label: 'Conversion', desc: 'Drive trials, demos, signups' },
  ];

  const lengthOptions = [
    { value: 800, label: 'Short', desc: '~800 words, quick read' },
    { value: 1500, label: 'Standard', desc: '~1500 words, recommended' },
    { value: 3000, label: 'Deep Dive', desc: '~3000 words, comprehensive' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 14, maxWidth: 640, width: '100%', padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>Write New Article</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Choose your topic and let AI write a fully optimized article</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer' }}>{'\u2715'}</button>
        </div>

        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Topic Input */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Topic / Keyword *
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. how to create a wedding seating chart"
                disabled={isGenerating}
                style={{
                  width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 8,
                  fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Be specific. The more specific the topic, the better the article.</p>
            </div>

            {/* Intent */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Article Intent
                <InfoTooltip text="Informational = educational how-to guide. Commercial = comparing options/software. Transactional = driving signups/trials." />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {intentOptions.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setIntent(o.value)}
                    style={{
                      padding: 12, borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                      border: `2px solid ${intent === o.value ? '#3b82f6' : '#e5e7eb'}`,
                      background: intent === o.value ? '#eff6ff' : '#fff',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Word Count */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Target Length</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {lengthOptions.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setWordCount(o.value)}
                    style={{
                      padding: 12, borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                      border: `2px solid ${wordCount === o.value ? '#3b82f6' : '#e5e7eb'}`,
                      background: wordCount === o.value ? '#eff6ff' : '#fff',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cluster */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Add to Cluster (Optional)
                <InfoTooltip text="Optionally link this article to a content cluster for better internal linking." />
              </label>
              <select
                value={cluster}
                onChange={e => setCluster(e.target.value)}
                disabled={isGenerating}
                style={{
                  width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 8,
                  fontSize: 14, color: '#374151', outline: 'none', boxSizing: 'border-box', background: '#fff',
                }}
              >
                <option value="none">No cluster (standalone article)</option>
                {clusters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.cluster_name} ({c.completed_articles}/{c.target_articles})
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13, border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || isGenerating}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', fontSize: 16, fontWeight: 600,
                cursor: !topic.trim() || isGenerating ? 'not-allowed' : 'pointer',
                background: !topic.trim() || isGenerating ? '#e5e7eb' : '#2563eb',
                color: !topic.trim() || isGenerating ? '#9ca3af' : '#fff',
                transition: 'all 0.15s',
              }}
            >
              {isGenerating ? 'Generating Article... (2-3 minutes)' : 'Generate Article'}
            </button>

            {isGenerating && (
              <div style={{ padding: 14, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: 13, color: '#1d4ed8', margin: 0, lineHeight: 1.6 }}>
                  AI is writing your article with:
                  <br />- WedBoardPro product knowledge
                  <br />- Strategic CTAs for {intent} intent
                  <br />- Full SEO optimization
                  <br />- Internal linking suggestions
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Success state */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              fontSize: 28,
            }}>
              {'\u2713'}
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Article Created!</h3>
            <div style={{ padding: 14, background: '#f9fafb', borderRadius: 8, textAlign: 'left', marginBottom: 20 }}>
              <p style={{ fontWeight: 600, color: '#111827', margin: '0 0 4px', fontSize: 14 }}>{result.title}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                {result.word_count ?? wordCount} words {'\u00B7'} Saved as In Review
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setResult(null); setTopic(''); setError(null); }}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8, border: '2px solid #e5e7eb',
                  background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Write Another
              </button>
              <button
                onClick={() => { onSuccess(); onClose(); }}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                  background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit Article Modal ───────────────────────────────────────────────

function EditArticleModal({
  article,
  token,
  onClose,
  onSave,
}: {
  article: ArticleData;
  token: string;
  onClose: () => void;
  onSave: (updated: ArticleData) => void;
}) {
  const [title, setTitle] = useState(article.title);
  const [content, setContent] = useState(article.content);
  const [metaDescription, setMetaDescription] = useState(article.meta_description || '');
  const [status, setStatus] = useState(article.status);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'preview'>('content');

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/seo/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          content,
          meta_description: metaDescription,
          status,
          actual_word_count: content.split(/\s+/).filter(Boolean).length,
        }),
      });
      const updated = await res.json();
      if (res.ok) {
        onSave({ ...article, ...updated, meta_description: updated.meta_description || '', total_views: article.total_views, total_clicks: article.total_clicks, seo_score: article.seo_score });
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  const wordCountVal = content.split(/\s+/).filter(Boolean).length;

  const seoChecks = [
    { check: title.length >= 30 && title.length <= 60, label: `Title length (${title.length} chars, ideal 30-60)` },
    { check: metaDescription.length >= 130 && metaDescription.length <= 160, label: `Meta description (${metaDescription.length} chars, ideal 130-160)` },
    { check: wordCountVal >= 800, label: `Word count (${wordCountVal.toLocaleString()} words, minimum 800)` },
    { check: content.includes('## ') || content.includes('# '), label: 'Has headings (H1/H2 structure)' },
    { check: content.includes('WedBoardPro'), label: 'Mentions WedBoardPro' },
    { check: content.includes('[') && content.includes('](/'), label: 'Has internal links' },
  ];

  const tabs: Array<{ key: typeof activeTab; label: string }> = [
    { key: 'content', label: 'Content' },
    { key: 'seo', label: 'SEO' },
    { key: 'preview', label: 'Preview' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 1000, maxHeight: '95vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Edit Article</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
            >
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="published">Published</option>
            </select>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
                background: '#2563eb', color: '#fff', cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer' }}>{'\u2715'}</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: 'none', background: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? '#2563eb' : 'transparent'}`,
                color: activeTab === tab.key ? '#2563eb' : '#6b7280',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {activeTab === 'content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 8,
                    fontSize: 16, fontWeight: 500, color: '#111827', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{title.length}/60 characters</p>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Content (Markdown)</label>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{wordCountVal.toLocaleString()} words</span>
                </div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={25}
                  style={{
                    width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 8,
                    fontSize: 13, fontFamily: 'monospace', color: '#111827', outline: 'none', boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Meta Description
                  <InfoTooltip text="The description shown in Google search results. Aim for 130-160 characters." />
                </label>
                <textarea
                  value={metaDescription}
                  onChange={e => setMetaDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description for search engines..."
                  style={{
                    width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: 8,
                    fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>Ideal: 130-160 characters</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: metaDescription.length >= 130 && metaDescription.length <= 160 ? '#059669'
                      : metaDescription.length > 160 ? '#dc2626' : '#d97706',
                  }}>
                    {metaDescription.length}/160
                  </span>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>SEO Checklist</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {seoChecks.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, color: item.check ? '#059669' : '#d1d5db' }}>
                        {item.check ? '\u2713' : '\u25CB'}
                      </span>
                      <span style={{ fontSize: 13, color: item.check ? '#111827' : '#9ca3af' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 16 }}>{title}</h1>
              <div
                style={{ fontSize: 16, lineHeight: 1.8, color: '#374151' }}
                dangerouslySetInnerHTML={{
                  __html: content
                    .replace(/^# .+\n/, '')
                    .replace(/## (.+)/g, '<h2 style="font-size:20px;font-weight:700;color:#111827;margin:24px 0 12px">$1</h2>')
                    .replace(/### (.+)/g, '<h3 style="font-size:17px;font-weight:600;color:#111827;margin:16px 0 8px">$1</h3>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/\n\n/g, '</p><p style="margin-bottom:12px">')
                    .replace(/^/, '<p style="margin-bottom:12px">')
                    .replace(/$/, '</p>'),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────

const SEOIntelligence: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<TeamUser | null>(null);
  const token = sessionStorage.getItem('team_token');

  // Page-level tab
  const [pageTab, setPageTab] = useState<'dashboard' | 'articles'>('dashboard');

  // Write Article Modal
  const [showWriteModal, setShowWriteModal] = useState(false);

  // Data
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [gaps, setGaps] = useState<GapData[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  // Weekly planner
  const [weeklyGoal, setWeeklyGoal] = useState<'clusters' | 'gaps' | 'mixed'>('mixed');

  // Cluster modal
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [clusterDetail, setClusterDetail] = useState<ClusterDetail | null>(null);
  const [clusterDetailLoading, setClusterDetailLoading] = useState(false);

  // Action states
  const [generatingClusterId, setGeneratingClusterId] = useState<string | null>(null);
  const [generatingGapId, setGeneratingGapId] = useState<string | null>(null);
  const [analyzingCompetitor, setAnalyzingCompetitor] = useState<string | null>(null);
  const [todaysWorkRunning, setTodaysWorkRunning] = useState(false);
  const [publishingArticleId, setPublishingArticleId] = useState<string | null>(null);

  // Messages
  const [clusterMessage, setClusterMessage] = useState<string | null>(null);
  const [gapMessage, setGapMessage] = useState<string | null>(null);
  const [weeklyMessage, setWeeklyMessage] = useState<string | null>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);

  // ── Articles tab state ──
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesSearch, setArticlesSearch] = useState('');
  const [articlesStatus, setArticlesStatus] = useState('all');
  const [articlesSort, setArticlesSort] = useState('created_at');
  const [articlesSortOrder, setArticlesSortOrder] = useState<'desc' | 'asc'>('desc');
  const [articlesPage, setArticlesPage] = useState(1);
  const [articlesTotalPages, setArticlesTotalPages] = useState(1);
  const [articlesTotal, setArticlesTotal] = useState(0);
  const [editingArticle, setEditingArticle] = useState<ArticleData | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // ── Auth ──

  useEffect(() => {
    if (!token) { navigate('/team-login'); return; }
    try {
      const userData = sessionStorage.getItem('team_user');
      if (userData) setUser(JSON.parse(userData));
    } catch { navigate('/team-login'); }
  }, [navigate, token]);

  // ── Data fetching ──

  const fetchClusters = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/seo/intelligence/clusters', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setClusters(await res.json());
    } catch { /* ignore */ }
  }, [token]);

  const fetchGaps = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/seo/intelligence/gaps', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setGaps(await res.json());
    } catch { /* ignore */ }
  }, [token]);

  const fetchPerformance = useCallback(async () => {
    if (!token) return;
    try {
      const [cmdRes, ovRes] = await Promise.all([
        fetch('/api/seo/command-center', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/seo/overview', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const perf: PerformanceData = {
        totalPosts: 0, drafts: 0, inReview: 0, published: 0,
        totalWords: 0, postsThisWeek: 0, publishedThisMonth: 0, topPosts: [],
      };
      if (cmdRes.ok) {
        const cmd = await cmdRes.json();
        perf.totalPosts = cmd.pipeline?.totalPosts ?? 0;
        perf.drafts = cmd.pipeline?.drafts ?? 0;
        perf.inReview = cmd.pipeline?.inReview ?? 0;
        perf.published = cmd.pipeline?.published ?? 0;
        perf.totalWords = cmd.pipeline?.totalWords ?? 0;
        perf.postsThisWeek = cmd.pipeline?.postsThisWeek ?? 0;
        perf.publishedThisMonth = cmd.pipeline?.publishedThisMonth ?? 0;
        perf.topPosts = cmd.topPosts ?? [];
        perf.avgSeoScore = cmd.quality?.avgSeoScore;
      }
      if (ovRes.ok) {
        const ov = await ovRes.json();
        perf.estimatedTraffic = ov.estimatedTraffic;
      }
      setPerformance(perf);
    } catch { /* ignore */ }
  }, [token]);

  const fetchArticles = useCallback(async () => {
    if (!token) return;
    setArticlesLoading(true);
    try {
      const params = new URLSearchParams({
        status: articlesStatus,
        sort: articlesSort,
        order: articlesSortOrder,
        page: articlesPage.toString(),
        per_page: '20',
        search: articlesSearch,
      });
      const res = await fetch(`/api/seo/articles?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        setArticlesTotalPages(data.total_pages || 1);
        setArticlesTotal(data.total || 0);
      }
    } catch { /* ignore */ }
    finally { setArticlesLoading(false); }
  }, [token, articlesStatus, articlesSort, articlesSortOrder, articlesPage, articlesSearch]);

  // Initial load
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchClusters(), fetchGaps(), fetchPerformance()])
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load articles when switching to articles tab or filter changes
  useEffect(() => {
    if (pageTab === 'articles') {
      fetchArticles();
    }
  }, [pageTab, fetchArticles]);

  // Cluster detail load
  useEffect(() => {
    if (!selectedClusterId || !token) { setClusterDetail(null); return; }
    setClusterDetailLoading(true);
    fetch(`/api/seo/intelligence/clusters/${selectedClusterId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setClusterDetail(data); })
      .catch(() => {})
      .finally(() => setClusterDetailLoading(false));
  }, [selectedClusterId, token]);

  // ── Action handlers ──

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
        setClusterMessage(`Generated "${data.article_generated?.title ?? 'article'}" (${data.article_generated?.word_count ?? 0} words) \u2014 ${data.remaining} remaining`);
        fetchClusters();
        if (selectedClusterId === clusterId) {
          const dr = await fetch(`/api/seo/intelligence/clusters/${clusterId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (dr.ok) setClusterDetail(await dr.json());
        }
      } else {
        setClusterMessage(`Error: ${data.error}`);
      }
    } catch { setClusterMessage('Failed to generate article.'); }
    finally { setGeneratingClusterId(null); }
  };

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
        setGapMessage(`Found ${data.total_gaps} gaps for ${competitorName} (${data.gaps_from_tracking} tracking, ${data.gaps_from_ai} AI)`);
        fetchGaps();
      } else {
        setGapMessage(`Error: ${data.error}`);
      }
    } catch { setGapMessage('Failed to analyze competitor.'); }
    finally { setAnalyzingCompetitor(null); }
  };

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
        setGapMessage(`Created "${data.title}" (${data.word_count} words) for "${data.keyword}"`);
        fetchGaps();
      } else {
        setGapMessage(`Error: ${data.error}`);
      }
    } catch { setGapMessage('Failed to generate content.'); }
    finally { setGeneratingGapId(null); }
  };

  const handlePublishArticle = async (articleId: string) => {
    if (!token) return;
    setPublishingArticleId(articleId);
    try {
      const res = await fetch(`/api/seo/content-review/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'published' }),
      });
      if (res.ok && selectedClusterId) {
        const dr = await fetch(`/api/seo/intelligence/clusters/${selectedClusterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (dr.ok) setClusterDetail(await dr.json());
        fetchPerformance();
      }
    } catch { /* ignore */ }
    finally { setPublishingArticleId(null); }
  };

  const handlePublishFromList = async (articleId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/seo/articles/${articleId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchArticles();
        fetchPerformance();
      }
    } catch { /* ignore */ }
  };

  const handleStartTodaysWork = async () => {
    if (!token) return;
    setTodaysWorkRunning(true);
    setWeeklyMessage(null);
    try {
      if (weeklyGoal === 'clusters' || weeklyGoal === 'mixed') {
        const incomplete = clusters.find(c => c.cluster_status !== 'completed');
        if (incomplete) {
          const res = await fetch(`/api/seo/intelligence/clusters/${incomplete.id}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            setWeeklyMessage(`Generated "${data.article_generated?.title ?? 'article'}" (${data.article_generated?.word_count ?? 0} words) \u2014 ${data.remaining} remaining in cluster`);
            fetchClusters();
            fetchPerformance();
          } else {
            setWeeklyMessage(`Error: ${data.error}`);
          }
        } else if (weeklyGoal === 'mixed') {
          const topGap = gaps.find(g => g.status === 'identified');
          if (topGap) {
            const res = await fetch(`/api/seo/intelligence/gaps/${topGap.id}/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
              setWeeklyMessage(`Created "${data.title}" (${data.word_count} words) targeting "${data.keyword}"`);
              fetchGaps();
              fetchPerformance();
            } else {
              setWeeklyMessage(`Error: ${data.error}`);
            }
          } else {
            setWeeklyMessage('All clusters done and no gaps found. Run competitor analysis first.');
          }
        } else {
          setWeeklyMessage('All clusters complete! Switch to "Steal Traffic" strategy.');
        }
      } else {
        const topGap = gaps.find(g => g.status === 'identified');
        if (topGap) {
          const res = await fetch(`/api/seo/intelligence/gaps/${topGap.id}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            setWeeklyMessage(`Created "${data.title}" (${data.word_count} words) targeting "${data.keyword}"`);
            fetchGaps();
            fetchPerformance();
          } else {
            setWeeklyMessage(`Error: ${data.error}`);
          }
        } else {
          setWeeklyMessage('No gaps found. Run competitor analysis first.');
        }
      }
    } catch {
      setWeeklyMessage('Something went wrong. Try again.');
    } finally {
      setTodaysWorkRunning(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('team_token');
    sessionStorage.removeItem('team_user');
    navigate('/team-login');
  };

  // ── Computed ──

  const weeklyProgress = performance?.postsThisWeek ?? 0;
  const weeklyTarget = 15;
  const weeklyPct = Math.min(Math.round((weeklyProgress / weeklyTarget) * 100), 100);
  const todayIndex = getWeekDay();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const highPriorityGaps = gaps.filter(g => g.priority === 'high').length;
  const gapsAddressed = gaps.filter(g => g.status === 'content_created').length;

  // Article stats (from loaded articles — these only reflect current page, but good enough for summary)
  const articleStats = {
    published: articles.filter(a => a.status === 'published').length,
    drafts: articles.filter(a => a.status === 'draft').length,
    inReview: articles.filter(a => a.status === 'in_review').length,
    totalViews: articles.reduce((sum, a) => sum + (a.total_views || 0), 0),
    avgWords: articles.length > 0 ? Math.round(articles.reduce((sum, a) => sum + (a.actual_word_count || 0), 0) / articles.length) : 0,
  };

  if (!user) return null;

  // ── Render ──

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{user.name}</span>
          <button onClick={handleLogout} className="team-nav-btn" style={{ fontSize: 12 }}>Logout</button>
        </div>
      </header>

      <main className="team-main-content" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Page header with Write Article button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>SEO Dashboard</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Manage your content strategy</p>
          </div>
          <button
            onClick={() => setShowWriteModal(true)}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600,
              background: '#2563eb', color: '#fff', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            Write Article
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #e5e7eb', paddingBottom: 0 }}>
          {([
            { key: 'dashboard' as const, label: 'Dashboard' },
            { key: 'articles' as const, label: 'My Articles' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setPageTab(tab.key)}
              style={{
                padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                border: 'none', background: 'none',
                borderBottom: `3px solid ${pageTab === tab.key ? '#2563eb' : 'transparent'}`,
                color: pageTab === tab.key ? '#2563eb' : '#6b7280',
                transition: 'all 0.15s', marginBottom: -2,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════ DASHBOARD TAB ═══════════════ */}
        {pageTab === 'dashboard' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <div style={{ fontSize: 14, color: '#6b7280' }}>Loading your SEO dashboard...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

              {/* SECTION 1: YOUR WEEK */}
              <section style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)',
                borderRadius: 14, padding: 24, border: '1px solid #bfdbfe',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Your Week</h2>
                    <InfoTooltip text="Plan your weekly content generation strategy. We recommend 12-15 articles per week for steady growth." />
                  </div>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Week of {formatWeekStart()}</span>
                </div>

                {weeklyMessage && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
                    background: weeklyMessage.includes('Error') || weeklyMessage.includes('wrong') ? '#fef2f2' : '#f0fdf4',
                    color: weeklyMessage.includes('Error') || weeklyMessage.includes('wrong') ? '#dc2626' : '#059669',
                    border: `1px solid ${weeklyMessage.includes('Error') || weeklyMessage.includes('wrong') ? '#fecaca' : '#bbf7d0'}`,
                  }}>
                    {weeklyMessage}
                  </div>
                )}

                {/* Progress */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Weekly Progress</span>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{weeklyProgress}/{weeklyTarget} articles</span>
                  </div>
                  <div style={{ width: '100%', height: 10, background: '#fff', borderRadius: 6, border: '1px solid #bfdbfe', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 5, transition: 'width 0.4s',
                      background: weeklyPct >= 100 ? '#10b981' : '#3b82f6',
                      width: `${weeklyPct}%`,
                    }} />
                  </div>
                </div>

                {/* Strategy Selector */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 10 }}>
                    This Week&apos;s Strategy:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {([
                      { key: 'clusters' as const, title: 'Build Authority', desc: 'Complete 1 topic cluster' },
                      { key: 'gaps' as const, title: 'Steal Traffic', desc: 'Target competitor gaps' },
                      { key: 'mixed' as const, title: 'Balanced', desc: 'Mix of both strategies' },
                    ]).map(s => (
                      <button
                        key={s.key}
                        onClick={() => setWeeklyGoal(s.key)}
                        style={{
                          padding: 16, borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                          border: `2px solid ${weeklyGoal === s.key ? '#3b82f6' : '#e5e7eb'}`,
                          background: weeklyGoal === s.key ? '#eff6ff' : '#fff',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{s.title}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Schedule */}
                <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>This Week&apos;s Plan</h3>
                    <InfoTooltip text="Suggested daily schedule based on your strategy. Click 'Start Today's Work' to begin generating." />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {days.map((day, index) => {
                      const dayNum = index + 1;
                      const isToday = dayNum === todayIndex;
                      const isPast = dayNum < todayIndex;
                      const dayDesc = weeklyGoal === 'clusters'
                        ? 'Generate 2 cluster articles'
                        : weeklyGoal === 'gaps'
                          ? 'Generate 3 competitor gap articles'
                          : index === 0
                            ? 'Analyze 1 competitor + generate 3'
                            : 'Generate 1 cluster + 2 gap articles';

                      return (
                        <div key={day} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: 8,
                          background: isToday ? '#eff6ff' : '#f9fafb',
                          border: isToday ? '2px solid #3b82f6' : '1px solid transparent',
                          opacity: isPast ? 0.5 : 1,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: isToday ? '#2563eb' : '#374151', minWidth: 80 }}>{day}</span>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>{dayDesc}</span>
                          </div>
                          {isToday && (
                            <button
                              onClick={handleStartTodaysWork}
                              disabled={todaysWorkRunning}
                              style={{
                                fontSize: 12, padding: '6px 16px', borderRadius: 8, border: 'none',
                                cursor: todaysWorkRunning ? 'wait' : 'pointer',
                                background: todaysWorkRunning ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {todaysWorkRunning ? 'Working...' : "Start Today's Work \u2192"}
                            </button>
                          )}
                          {isPast && <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>{'\u2713'} Done</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* SECTION 2: CONTENT CLUSTERS */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Content Clusters</h2>
                  <InfoTooltip
                    title="What are Content Clusters?"
                    text={`A content cluster is like a book with chapters:\n\u2022 1 PILLAR PAGE (3000 words) \u2014 The comprehensive guide\n\u2022 9 SUPPORTING ARTICLES (1500 words each) \u2014 Deep dives\n\u2022 All articles link to each other\n\nWhy this works:\n\u2713 Google sees topical authority\n\u2713 Rank for ALL related keywords\n\u2713 Better than 100 random articles`}
                  />
                </div>

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

                {clusters.length === 0 ? (
                  <div className="team-section" style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>No content clusters yet</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Create clusters in the database to start building topical authority</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                      {[
                        { label: 'Clusters', value: clusters.length, color: '#111827' },
                        { label: 'Articles Done', value: clusters.reduce((s, c) => s + c.completed_articles, 0), color: '#2563eb' },
                        { label: 'Target', value: clusters.reduce((s, c) => s + c.target_articles, 0), color: '#6b7280' },
                        { label: 'Est. Traffic/mo', value: clusters.reduce((s, c) => s + (c.estimated_monthly_traffic ?? 0), 0).toLocaleString(), color: '#059669' },
                      ].map(s => (
                        <div key={s.label} className="team-stat-card">
                          <div className="team-stat-label">{s.label}</div>
                          <div className="team-stat-value" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {clusters.map(cluster => {
                        const progress = cluster.target_articles > 0 ? Math.round((cluster.completed_articles / cluster.target_articles) * 100) : 0;
                        const isComplete = cluster.cluster_status === 'completed';
                        const isGenerating = generatingClusterId === cluster.id;

                        return (
                          <div key={cluster.id} className="team-section" style={{ padding: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>{cluster.cluster_name}</h3>
                                  <span style={{
                                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, textTransform: 'capitalize',
                                    background: isComplete ? '#dcfce7' : cluster.cluster_status === 'in_progress' ? '#fef3c7' : '#dbeafe',
                                    color: isComplete ? '#16a34a' : cluster.cluster_status === 'in_progress' ? '#d97706' : '#2563eb',
                                  }}>
                                    {cluster.cluster_status.replace('_', ' ')}
                                  </span>
                                </div>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                  Pillar: <strong style={{ color: '#374151' }}>{cluster.pillar_keyword}</strong>
                                  {cluster.estimated_monthly_traffic > 0 && (
                                    <> {'\u00B7'} ~{cluster.estimated_monthly_traffic.toLocaleString()} traffic/mo</>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div style={{ marginBottom: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>Progress</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: progress >= 100 ? '#059669' : '#374151' }}>
                                  {cluster.completed_articles}/{cluster.target_articles} ({progress}%)
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

                            {Array.isArray(cluster.supporting_keywords) && cluster.supporting_keywords.length > 0 && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
                                {cluster.supporting_keywords.slice(0, 6).map((kw, i) => (
                                  <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#f3f4f6', color: '#6b7280' }}>{kw}</span>
                                ))}
                                {cluster.supporting_keywords.length > 6 && (
                                  <span style={{ fontSize: 10, padding: '2px 8px', color: '#9ca3af' }}>+{cluster.supporting_keywords.length - 6} more</span>
                                )}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: 8 }}>
                              {!isComplete && (
                                <button
                                  onClick={() => handleGenerateClusterArticle(cluster.id)}
                                  disabled={isGenerating || !!generatingClusterId}
                                  style={{
                                    flex: 1, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: 'none',
                                    cursor: isGenerating ? 'wait' : 'pointer',
                                    background: isGenerating ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 600,
                                    opacity: (generatingClusterId && !isGenerating) ? 0.4 : 1,
                                  }}
                                >
                                  {isGenerating ? 'Generating...' : 'Generate Next Article'}
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedClusterId(cluster.id)}
                                style={{
                                  flex: isComplete ? 1 : 0, fontSize: 13, padding: '8px 16px', borderRadius: 8,
                                  cursor: 'pointer', background: '#fff', color: '#374151', fontWeight: 500,
                                  border: '2px solid #e5e7eb', whiteSpace: 'nowrap',
                                }}
                              >
                                View Articles ({cluster.completed_articles})
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>

              {/* SECTION 3: COMPETITOR GAPS */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Competitor Gap Analysis</h2>
                  <InfoTooltip
                    title="What is Gap Analysis?"
                    text={`Find keywords your competitors rank for that YOU don't.\n\nHow it works:\n1. Click a competitor name \u2192 AI analyzes their content\n2. System finds 10-15 gaps (keywords they have, you don't)\n3. Click "Generate" \u2192 Creates content to outrank them\n\nBest for: Quick wins and fast traffic growth`}
                  />
                </div>

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

                <div className="team-section" style={{ padding: 14, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>Run Analysis</h4>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>AI discovers keywords competitors rank for that you don&apos;t cover</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['HoneyBook', 'Aisle Planner', 'Planning Pod', 'Dubsado'].map(name => (
                        <button
                          key={name}
                          onClick={() => handleAnalyzeCompetitor(name)}
                          disabled={!!analyzingCompetitor}
                          style={{
                            fontSize: 11, padding: '6px 14px', borderRadius: 6,
                            cursor: analyzingCompetitor ? 'wait' : 'pointer',
                            background: analyzingCompetitor === name ? '#111827' : '#fff',
                            color: analyzingCompetitor === name ? '#fff' : '#374151',
                            border: `1px solid ${analyzingCompetitor === name ? '#111827' : '#e5e7eb'}`,
                            fontWeight: 500,
                            opacity: (analyzingCompetitor && analyzingCompetitor !== name) ? 0.4 : 1,
                          }}
                        >
                          {analyzingCompetitor === name ? 'Analyzing...' : name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {gaps.length === 0 ? (
                  <div className="team-section" style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>No gaps discovered yet</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Click a competitor above to run AI-powered gap analysis</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                      {[
                        { label: 'Total Gaps', value: gaps.length, color: '#111827' },
                        { label: 'High Priority', value: highPriorityGaps, color: '#dc2626' },
                        { label: 'Content Created', value: gapsAddressed, color: '#059669' },
                        { label: 'Avg Opportunity', value: gaps.length > 0 ? Math.round(gaps.reduce((s, g) => s + g.opportunity_score, 0) / gaps.length) : 0, color: '#2563eb' },
                      ].map(s => (
                        <div key={s.label} className="team-stat-card">
                          <div className="team-stat-label">{s.label}</div>
                          <div className="team-stat-value" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="team-section" style={{ padding: 0, overflow: 'hidden' }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 110px 70px 70px 90px 100px', gap: 8,
                        padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6',
                      }}>
                        {['Keyword', 'Competitor', 'Score', 'Priority', 'Status', 'Action'].map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase' }}>{h}</span>
                        ))}
                      </div>
                      {gaps.map(gap => {
                        const pc = gap.priority === 'high' ? { bg: '#fef2f2', color: '#dc2626' }
                          : gap.priority === 'medium' ? { bg: '#fffbeb', color: '#d97706' }
                            : { bg: '#f3f4f6', color: '#6b7280' };
                        const gsc = gap.status === 'content_created' ? { bg: '#dcfce7', color: '#16a34a' }
                          : gap.status === 'targeted' ? { bg: '#fef3c7', color: '#d97706' }
                            : { bg: '#dbeafe', color: '#2563eb' };
                        const isGen = generatingGapId === gap.id;

                        return (
                          <div key={gap.id} style={{
                            display: 'grid', gridTemplateColumns: '1fr 110px 70px 70px 90px 100px', gap: 8,
                            padding: '10px 14px', alignItems: 'center', borderBottom: '1px solid #f9fafb',
                            background: isGen ? '#eff6ff' : '#fff',
                          }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{gap.keyword_primary}</div>
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280' }}>{gap.topic}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{gap.competitor_name}</div>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 8, fontSize: 13, fontWeight: 700,
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
                              {gap.status === 'identified' && (
                                <button
                                  onClick={() => handleGenerateGapContent(gap.id)}
                                  disabled={isGen || !!generatingGapId}
                                  style={{
                                    fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none',
                                    cursor: isGen ? 'wait' : 'pointer',
                                    background: isGen ? '#93c5fd' : '#111827', color: '#fff', fontWeight: 500,
                                    opacity: (generatingGapId && !isGen) ? 0.4 : 1,
                                  }}
                                >
                                  {isGen ? 'Writing...' : 'Generate'}
                                </button>
                              )}
                              {gap.status === 'content_created' && (
                                <span style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>{'\u2713'} Done</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>

              {/* SECTION 4: PERFORMANCE */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Performance</h2>
                  <InfoTooltip text="Track how your SEO content is performing. Metrics come from your blog analytics and pipeline data." />
                </div>

                {performance ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                      {[
                        { label: 'Published Articles', value: performance.published, color: '#059669' },
                        { label: 'Total Words', value: performance.totalWords.toLocaleString(), color: '#2563eb' },
                        { label: 'Avg SEO Score', value: performance.avgSeoScore?.toFixed(0) ?? '\u2014', color: '#d97706' },
                        { label: 'Est. Traffic/mo', value: performance.estimatedTraffic?.toLocaleString() ?? '\u2014', color: '#059669' },
                      ].map(s => (
                        <div key={s.label} className="team-stat-card">
                          <div className="team-stat-label">{s.label}</div>
                          <div className="team-stat-value" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="team-section" style={{ padding: 14 }}>
                      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                        {[
                          { label: 'Drafts', value: performance.drafts, color: '#2563eb' },
                          { label: 'In Review', value: performance.inReview, color: '#d97706' },
                          { label: 'Published', value: performance.published, color: '#059669' },
                          { label: 'This Week', value: performance.postsThisWeek, color: '#111827' },
                        ].map((m, i) => (
                          <React.Fragment key={m.label}>
                            {i > 0 && <div style={{ width: 1, height: 32, background: '#e5e7eb' }} />}
                            <div>
                              <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</span>
                              <div style={{ fontSize: 20, fontWeight: 600, color: m.color }}>{m.value}</div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {performance.topPosts.length > 0 && (
                      <div className="team-section" style={{ marginTop: 14 }}>
                        <div className="team-section-header">
                          <h3 className="team-section-title">Top Performing Articles</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {performance.topPosts.slice(0, 5).map((post, i) => (
                            <div key={post.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '10px 0',
                              borderBottom: i < Math.min(performance!.topPosts.length, 5) - 1 ? '1px solid #f3f4f6' : 'none',
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                  <span style={{ fontSize: 11, color: '#6b7280' }}>{post.wordCount.toLocaleString()} words</span>
                                  {post.publishedAt && <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(post.publishedAt)}</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{post.views}</div>
                                  <div style={{ fontSize: 10, color: '#9ca3af' }}>views</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2563eb' }}>{post.clicks}</div>
                                  <div style={{ fontSize: 10, color: '#9ca3af' }}>clicks</div>
                                </div>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                  background: post.seoScore >= 80 ? '#ecfdf5' : post.seoScore >= 60 ? '#fffbeb' : '#fef2f2',
                                  color: post.seoScore >= 80 ? '#059669' : post.seoScore >= 60 ? '#d97706' : '#dc2626',
                                }}>
                                  {post.seoScore}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="team-section" style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ fontSize: 14, color: '#6b7280' }}>Loading performance data...</p>
                  </div>
                )}
              </section>

              {/* SECTION 5: SETTINGS */}
              <section>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderRadius: 10, border: '1px solid #e5e7eb',
                    background: '#f9fafb', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#6b7280',
                  }}
                >
                  <span>Settings & Advanced</span>
                  <span style={{ transform: showSettings ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>{'\u25BE'}</span>
                </button>
                {showSettings && (
                  <div style={{ marginTop: 12, padding: 18, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link to="/team" style={{
                        fontSize: 12, padding: '6px 14px', borderRadius: 6, background: '#f3f4f6', color: '#374151',
                        textDecoration: 'none', fontWeight: 500,
                      }}>
                        {'\u2190'} Back to Team Dashboard
                      </Link>
                      <button
                        onClick={() => { fetchClusters(); fetchGaps(); fetchPerformance(); }}
                        style={{
                          fontSize: 12, padding: '6px 14px', borderRadius: 6, background: '#f3f4f6', color: '#374151',
                          border: 'none', cursor: 'pointer', fontWeight: 500,
                        }}
                      >
                        Refresh All Data
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )
        )}

        {/* ═══════════════ MY ARTICLES TAB ═══════════════ */}
        {pageTab === 'articles' && (
          <div>
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>My Articles</h2>
                <InfoTooltip
                  title="My Articles"
                  text="Complete list of all your blog articles. Filter by status, sort by performance, and edit content directly. Publish drafts or update existing articles here."
                />
              </div>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{articlesTotal} total articles</span>
            </div>

            {/* Filters Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 20, padding: 14, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={articlesSearch}
                  onChange={e => {
                    const val = e.target.value;
                    setArticlesSearch(val);
                    setArticlesPage(1);
                    clearTimeout(searchTimeout.current);
                    searchTimeout.current = setTimeout(() => {
                      // fetchArticles will be called by the useEffect
                    }, 300);
                  }}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <select
                value={articlesStatus}
                onChange={e => { setArticlesStatus(e.target.value); setArticlesPage(1); }}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff' }}
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
              </select>
              <select
                value={articlesSort}
                onChange={e => setArticlesSort(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff' }}
              >
                <option value="created_at">Date Created</option>
                <option value="published_at">Date Published</option>
                <option value="total_views">Views</option>
                <option value="actual_word_count">Word Count</option>
              </select>
              <button
                onClick={() => setArticlesSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                style={{
                  padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8,
                  background: '#fff', cursor: 'pointer', fontSize: 13,
                }}
              >
                {articlesSortOrder === 'desc' ? '\u2193 Newest' : '\u2191 Oldest'}
              </button>
            </div>

            {/* Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Published', value: performance?.published ?? articleStats.published, bg: '#f0fdf4', border: '#bbf7d0', color: '#059669' },
                { label: 'Drafts', value: performance?.drafts ?? articleStats.drafts, bg: '#fffbeb', border: '#fde68a', color: '#d97706' },
                { label: 'Total Views', value: articleStats.totalViews.toLocaleString(), bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' },
                { label: 'Avg Words', value: articleStats.avgWords.toLocaleString(), bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed' },
              ].map(s => (
                <div key={s.label} style={{ padding: 14, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: s.color, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Articles Table */}
            {articlesLoading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Loading articles...</div>
              </div>
            ) : articles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, background: '#f9fafb', borderRadius: 10, border: '2px dashed #d1d5db' }}>
                <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 4px' }}>No articles found</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Try adjusting your filters or write a new article</p>
              </div>
            ) : (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                {/* Table Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 90px 80px 70px 80px 120px', gap: 8,
                  padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
                }}>
                  {['Article', 'Status', 'Words', 'Views', 'Score', 'Actions'].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>

                {/* Table Rows */}
                {articles.map(article => {
                  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
                    published: { bg: '#dcfce7', color: '#16a34a', label: 'Published' },
                    draft: { bg: '#fef3c7', color: '#d97706', label: 'Draft' },
                    in_review: { bg: '#dbeafe', color: '#2563eb', label: 'In Review' },
                  };
                  const sc = statusColors[article.status] || { bg: '#f3f4f6', color: '#6b7280', label: article.status };

                  return (
                    <div key={article.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 90px 80px 70px 80px 120px', gap: 8,
                      padding: '12px 14px', alignItems: 'center', borderBottom: '1px solid #f3f4f6',
                      background: '#fff',
                    }}>
                      {/* Title + Keyword */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {article.title}
                        </div>
                        {article.primary_keyword && (
                          <div style={{ fontSize: 11, color: '#2563eb', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {article.primary_keyword}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                          background: sc.bg, color: sc.color,
                        }}>
                          {sc.label}
                        </span>
                      </div>

                      {/* Words */}
                      <div style={{ fontSize: 13, color: '#6b7280' }}>
                        {article.actual_word_count ? article.actual_word_count.toLocaleString() : '\u2014'}
                      </div>

                      {/* Views */}
                      <div style={{ fontSize: 13, color: article.total_views > 0 ? '#111827' : '#d1d5db' }}>
                        {article.total_views > 0 ? article.total_views.toLocaleString() : '\u2014'}
                      </div>

                      {/* SEO Score */}
                      <div>
                        {article.seo_score > 0 ? (
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                            background: article.seo_score >= 80 ? '#ecfdf5' : article.seo_score >= 60 ? '#fffbeb' : '#fef2f2',
                            color: article.seo_score >= 80 ? '#059669' : article.seo_score >= 60 ? '#d97706' : '#dc2626',
                          }}>
                            {article.seo_score}
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: '#d1d5db' }}>{'\u2014'}</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => setEditingArticle(article)}
                          style={{
                            fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                            border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 500,
                          }}
                        >
                          Edit
                        </button>
                        {(article.status === 'draft' || article.status === 'in_review') && (
                          <button
                            onClick={() => handlePublishFromList(article.id)}
                            style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                              border: 'none', background: '#059669', color: '#fff', fontWeight: 500,
                            }}
                          >
                            Publish
                          </button>
                        )}
                        {article.status === 'published' && (
                          <a
                            href={`/blog/${article.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 6,
                              color: '#2563eb', fontWeight: 500, textDecoration: 'none',
                              display: 'flex', alignItems: 'center',
                            }}
                          >
                            View {'\u2192'}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {articlesTotalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setArticlesPage(p => Math.max(1, p - 1))}
                  disabled={articlesPage === 1}
                  style={{
                    padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer',
                    background: '#fff', fontSize: 13, opacity: articlesPage === 1 ? 0.5 : 1,
                  }}
                >
                  {'\u2190'} Previous
                </button>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  Page {articlesPage} of {articlesTotalPages}
                </span>
                <button
                  onClick={() => setArticlesPage(p => Math.min(articlesTotalPages, p + 1))}
                  disabled={articlesPage === articlesTotalPages}
                  style={{
                    padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer',
                    background: '#fff', fontSize: 13, opacity: articlesPage === articlesTotalPages ? 0.5 : 1,
                  }}
                >
                  Next {'\u2192'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ CLUSTER ARTICLES MODAL ═══════════════ */}
        {selectedClusterId && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedClusterId(null); }}
          >
            <div style={{
              background: '#fff', borderRadius: 14, maxWidth: 800, width: '100%',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}>
              {clusterDetailLoading || !clusterDetail ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Loading cluster details...</div>
              ) : (
                <>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>{clusterDetail.cluster_name}</h2>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                          {clusterDetail.completed_articles}/{clusterDetail.target_articles} articles
                          {clusterDetail.estimated_monthly_traffic > 0 && <> {'\u00B7'} Est. {clusterDetail.estimated_monthly_traffic.toLocaleString()} visits/mo</>}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedClusterId(null)}
                        style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af', lineHeight: 1 }}
                      >
                        {'\u2715'}
                      </button>
                    </div>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Pillar */}
                    {(() => {
                      const pillar = clusterDetail.articles?.find(a => a.article_role === 'pillar');
                      if (!pillar?.blog_posts) return null;
                      const bp = pillar.blog_posts;
                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Pillar Page</h3>
                            <InfoTooltip text="The main comprehensive guide that all supporting articles link to" />
                          </div>
                          <div style={{ padding: 14, borderRadius: 10, border: '2px solid #bfdbfe', background: '#eff6ff' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <div>
                                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 4px 0' }}>{bp.title}</h4>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <span style={{ fontSize: 11, color: '#6b7280' }}>{bp.actual_word_count?.toLocaleString() ?? '~3000'} words</span>
                                  <span style={{
                                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                                    background: bp.status === 'published' ? '#dcfce7' : '#fef3c7',
                                    color: bp.status === 'published' ? '#16a34a' : '#d97706',
                                  }}>
                                    {bp.status}
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {bp.status !== 'published' && (
                                  <button
                                    onClick={() => handlePublishArticle(bp.id)}
                                    disabled={publishingArticleId === bp.id}
                                    style={{
                                      fontSize: 11, padding: '4px 12px', borderRadius: 6, border: 'none',
                                      background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 500,
                                    }}
                                  >
                                    {publishingArticleId === bp.id ? '...' : 'Publish'}
                                  </button>
                                )}
                                {bp.status === 'published' && (
                                  <Link
                                    to={`/blog/${bp.slug}`}
                                    style={{
                                      fontSize: 11, padding: '4px 12px', borderRadius: 6,
                                      background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0',
                                      textDecoration: 'none', fontWeight: 500,
                                    }}
                                  >
                                    View {'\u2192'}
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Supporting */}
                    {(() => {
                      const supporting = clusterDetail.articles?.filter(a => a.article_role === 'supporting') ?? [];
                      if (supporting.length === 0) return null;
                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Supporting Articles ({supporting.length})</h3>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {supporting.map((article, i) => {
                              if (!article.blog_posts) return null;
                              const bp = article.blog_posts;
                              return (
                                <div key={article.id} style={{ padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>#{i + 1}</span>
                                        <h4 style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{bp.title}</h4>
                                      </div>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, color: '#6b7280' }}>{bp.actual_word_count?.toLocaleString() ?? '~1500'} words</span>
                                        <span style={{
                                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                                          background: bp.status === 'published' ? '#dcfce7' : '#fef3c7',
                                          color: bp.status === 'published' ? '#16a34a' : '#d97706',
                                        }}>
                                          {bp.status}
                                        </span>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      {bp.status !== 'published' && (
                                        <button
                                          onClick={() => handlePublishArticle(bp.id)}
                                          disabled={publishingArticleId === bp.id}
                                          style={{
                                            fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none',
                                            background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 500,
                                          }}
                                        >
                                          {publishingArticleId === bp.id ? '...' : 'Publish'}
                                        </button>
                                      )}
                                      {bp.status === 'published' && (
                                        <Link
                                          to={`/blog/${bp.slug}`}
                                          style={{
                                            fontSize: 11, padding: '4px 10px', borderRadius: 6,
                                            background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0',
                                            textDecoration: 'none', fontWeight: 500,
                                          }}
                                        >
                                          View {'\u2192'}
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Remaining keywords */}
                    {(() => {
                      const keywords = Array.isArray(clusterDetail.supporting_keywords) ? clusterDetail.supporting_keywords : [];
                      const supportingCount = (clusterDetail.articles ?? []).filter(a => a.article_role === 'supporting').length;
                      const remaining = keywords.slice(supportingCount);
                      if (remaining.length === 0) return null;
                      return (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Up Next ({remaining.length})</h3>
                            <InfoTooltip text="Topics that will be covered when you click 'Generate Next Article'" />
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {remaining.map((kw, i) => (
                              <span key={i} style={{ padding: '4px 12px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280', fontSize: 12 }}>{kw}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 10 }}>
                    {(() => {
                      const drafts = (clusterDetail.articles ?? []).filter(a => a.blog_posts && a.blog_posts.status !== 'published');
                      if (drafts.length > 0) {
                        return (
                          <button
                            onClick={async () => {
                              for (const d of drafts) {
                                if (d.blog_posts) await handlePublishArticle(d.blog_posts.id);
                              }
                            }}
                            style={{
                              flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                              background: '#059669', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            Publish All {drafts.length} Drafts
                          </button>
                        );
                      }
                      return null;
                    })()}
                    <button
                      onClick={() => setSelectedClusterId(null)}
                      style={{
                        flex: 1, padding: '10px 16px', borderRadius: 8,
                        background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ WRITE ARTICLE MODAL ═══════════════ */}
        {showWriteModal && token && (
          <WriteArticleModal
            clusters={clusters}
            token={token}
            onClose={() => setShowWriteModal(false)}
            onSuccess={() => { fetchPerformance(); if (pageTab === 'articles') fetchArticles(); }}
          />
        )}

        {/* ═══════════════ EDIT ARTICLE MODAL ═══════════════ */}
        {editingArticle && token && (
          <EditArticleModal
            article={editingArticle}
            token={token}
            onClose={() => setEditingArticle(null)}
            onSave={(updated) => {
              setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
              setEditingArticle(null);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default SEOIntelligence;
