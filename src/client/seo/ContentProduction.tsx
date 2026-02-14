import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Check,
  X,
  Loader2,
  Send,
  Eye,
  Edit3,
  Save,
  ChevronRight,
  Link2,
  Image,
  Hash,
  Type,
  AlignLeft,
  Globe,
} from 'lucide-react';
import SEOLayout from './SEOLayout';

interface Topic {
  id: string;
  keyword_primary: string;
  keyword_variations: string[];
  search_volume: number;
  status: string;
  brief_id: string | null;
}

interface ContentBrief {
  id: string;
  topic_id: string;
  target_word_count: number;
  required_sections: Array<{ heading: string; description: string; target_words: number }>;
  keyword_density_target: number;
  internal_links_required: string[];
  external_authority_links: string[];
  ai_prompt_template: string;
  product_features_to_mention: string[];
}

interface QualityCheck {
  label: string;
  icon: React.ReactNode;
  check: (content: string, title: string, keyword: string) => boolean;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countH2(content: string): number {
  return (content.match(/^## /gm) || []).length;
}

function hasInternalLinks(content: string): boolean {
  return /\[.*?\]\(\/.*?\)/.test(content) || /href="\//.test(content);
}

function hasExternalLinks(content: string): boolean {
  return /\[.*?\]\(https?:\/\/.*?\)/.test(content) || /href="https?:\/\//.test(content);
}

function hasImages(content: string): boolean {
  return /!\[.*?\]\(.*?\)/.test(content) || /<img/.test(content);
}

function keywordInFirst100Words(content: string, keyword: string): boolean {
  const first100 = content.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
  return first100.includes(keyword.toLowerCase());
}

const ContentProduction: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicIdFromUrl = searchParams.get('topic');

  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(topicIdFromUrl);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Editor state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const token = sessionStorage.getItem('team_token');

  // Fetch topics that are ready for production
  const fetchTopics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/seo/topics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const productionTopics = (data.topics || []).filter(
          (t: Topic) => ['brief_created', 'in_production', 'review'].includes(t.status)
        );
        setTopics(productionTopics);
      }
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  // When a topic is selected, fetch its brief
  useEffect(() => {
    if (!selectedTopicId || !token) return;

    const topic = topics.find((t) => t.id === selectedTopicId);
    if (topic) setSelectedTopic(topic);

    (async () => {
      try {
        const res = await fetch(`/api/v1/seo/briefs/topic/${selectedTopicId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBrief(data.brief || null);
        }
      } catch (err) {
        console.error('Failed to fetch brief:', err);
      }
    })();
  }, [selectedTopicId, token, topics]);

  // Quality checks
  const qualityChecks: QualityCheck[] = useMemo(() => [
    {
      label: `Word count target (${brief?.target_word_count || 1500}+)`,
      icon: <Hash className="w-3.5 h-3.5" />,
      check: (c) => countWords(c) >= (brief?.target_word_count || 1500),
    },
    {
      label: 'Keyword in title',
      icon: <Type className="w-3.5 h-3.5" />,
      check: (_c, t, kw) => t.toLowerCase().includes(kw.toLowerCase()),
    },
    {
      label: 'Keyword in first 100 words',
      icon: <AlignLeft className="w-3.5 h-3.5" />,
      check: (c, _t, kw) => keywordInFirst100Words(c, kw),
    },
    {
      label: '5+ H2 headings',
      icon: <Hash className="w-3.5 h-3.5" />,
      check: (c) => countH2(c) >= 5,
    },
    {
      label: 'Internal links',
      icon: <Link2 className="w-3.5 h-3.5" />,
      check: (c) => hasInternalLinks(c),
    },
    {
      label: 'External links',
      icon: <Globe className="w-3.5 h-3.5" />,
      check: (c) => hasExternalLinks(c),
    },
    {
      label: 'Images included',
      icon: <Image className="w-3.5 h-3.5" />,
      check: (c) => hasImages(c),
    },
  ], [brief]);

  const keyword = selectedTopic?.keyword_primary || '';

  const checkResults = qualityChecks.map((qc) => ({
    ...qc,
    passed: qc.check(content, title, keyword),
  }));

  const passedCount = checkResults.filter((r) => r.passed).length;
  const allPassed = passedCount === checkResults.length;

  const handleGenerateContent = async () => {
    if (!brief?.ai_prompt_template || !token) return;
    setGeneratingContent(true);
    try {
      const res = await fetch('/api/v1/seo/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: brief.ai_prompt_template }),
      });
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || '');

        // Auto-extract title from content (first H1)
        const titleMatch = data.content?.match(/^#\s+(.+)$/m);
        if (titleMatch && !title) {
          setTitle(titleMatch[1]);
          setSlug(titleMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
        }

        // Update topic status
        if (selectedTopicId) {
          await fetch(`/api/v1/seo/topics/${selectedTopicId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: 'in_production' }),
          });
          setTopics((prev) =>
            prev.map((t) => (t.id === selectedTopicId ? { ...t, status: 'in_production' } : t))
          );
        }
      }
    } catch (err) {
      console.error('Content generation failed:', err);
    } finally {
      setGeneratingContent(false);
    }
  };

  const handlePublish = async () => {
    if (!title || !content || !slug || !token) {
      alert('Please fill in title, slug, and content.');
      return;
    }

    setPublishing(true);
    try {
      const wordCount = countWords(content);
      const res = await fetch('/api/v1/seo/blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          slug,
          content,
          meta_description: metaDescription,
          excerpt: excerpt || content.slice(0, 200),
          primary_keyword: keyword,
          keyword_variations: selectedTopic?.keyword_variations || [],
          target_word_count: brief?.target_word_count || 1500,
          actual_word_count: wordCount,
          category,
          tags: [],
          status: 'published',
          topic_pipeline_id: selectedTopicId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert('Post published successfully!');
        navigate('/team/seo');
      } else {
        const err = await res.json();
        alert(`Publish failed: ${err.error}`);
      }
    } catch (err) {
      console.error('Publish failed:', err);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <SEOLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-200" />
            <div className="w-48 h-4 rounded bg-gray-200" />
          </div>
        </div>
      </SEOLayout>
    );
  }

  // Topic list view
  if (!selectedTopicId) {
    return (
      <SEOLayout>
        <div className="p-6 max-w-[900px] mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Content Production</h1>
            <p className="text-sm text-gray-500 mt-0.5">Topics ready for content creation</p>
          </div>

          {topics.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">No topics ready</h2>
              <p className="text-sm text-gray-500 mt-2">Generate briefs for topics in the pipeline first.</p>
              <button
                onClick={() => navigate('/team/seo/topics')}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Go to Pipeline
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all text-left flex items-center justify-between group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {topic.keyword_primary}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        topic.status === 'brief_created' ? 'bg-violet-100 text-violet-700' :
                        topic.status === 'in_production' ? 'bg-amber-100 text-amber-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {topic.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {(topic.search_volume || 0).toLocaleString()} monthly searches
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </SEOLayout>
    );
  }

  // Editor view
  return (
    <SEOLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedTopicId(null); setContent(''); setTitle(''); setBrief(null); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <span className="text-sm font-medium text-gray-900">{keyword}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {countWords(content).toLocaleString()} words
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {passedCount}/{qualityChecks.length} checks
            </span>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                previewMode ? 'bg-blue-50 text-blue-600 border-blue-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            {brief && (
              <button
                onClick={handleGenerateContent}
                disabled={generatingContent}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {generatingContent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generatingContent ? 'Generating...' : 'Generate with AI'}
              </button>
            )}
            <button
              onClick={handlePublish}
              disabled={publishing || !title || !content}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Publish
            </button>
          </div>
        </div>

        {/* Editor + Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor area */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-[800px] mx-auto space-y-4">
              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                  }
                }}
                placeholder="Post title..."
                className="w-full text-2xl font-bold text-gray-900 placeholder-gray-300 border-0 focus:outline-none focus:ring-0 bg-transparent"
              />

              {/* Slug */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>/blog/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-slug"
                  className="flex-1 border-0 border-b border-dashed border-gray-200 focus:outline-none focus:border-gray-400 bg-transparent text-gray-600"
                />
              </div>

              {/* Meta description */}
              <div>
                <input
                  type="text"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Meta description (155 chars recommended)..."
                  maxLength={160}
                  className="w-full text-sm text-gray-600 placeholder-gray-300 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">{metaDescription.length}/160</span>
              </div>

              {/* Category */}
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (e.g., Planning Tips, Business Growth)..."
                className="w-full text-sm text-gray-600 placeholder-gray-300 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />

              {/* Content editor / preview */}
              {previewMode ? (
                <div className="prose prose-sm max-w-none bg-white rounded-xl border border-gray-200 p-6">
                  <div dangerouslySetInnerHTML={{ __html: markdownToHTML(content) }} />
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your content in Markdown...

# Title

## Introduction
Start writing your article here...

## Section 1
..."
                  className="w-full min-h-[500px] text-sm text-gray-800 font-mono leading-relaxed border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y bg-white"
                />
              )}
            </div>
          </div>

          {/* Quality Checklist Sidebar */}
          <div className="w-64 bg-white border-l border-gray-200 overflow-auto p-4 flex-shrink-0">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Quality Checklist</h3>
            <div className="space-y-2">
              {checkResults.map((check, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    check.passed ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    check.passed ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}>
                    {check.passed ? (
                      <Check className="w-2.5 h-2.5 text-white" />
                    ) : (
                      <X className="w-2.5 h-2.5 text-white" />
                    )}
                  </div>
                  <span className={`text-[11px] ${check.passed ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Stats</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Words</span>
                  <span className="text-xs font-medium text-gray-900">{countWords(content).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">H2 Headings</span>
                  <span className="text-xs font-medium text-gray-900">{countH2(content)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Read time</span>
                  <span className="text-xs font-medium text-gray-900">{Math.max(1, Math.ceil(countWords(content) / 200))} min</span>
                </div>
                {keyword && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">KW density</span>
                    <span className="text-xs font-medium text-gray-900">
                      {content ? ((content.toLowerCase().split(keyword.toLowerCase()).length - 1) / Math.max(1, countWords(content)) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Brief sections reference */}
            {brief?.required_sections && brief.required_sections.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Brief Sections</h4>
                {brief.required_sections.map((section, i) => {
                  const isPresent = content.toLowerCase().includes(section.heading.toLowerCase());
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 p-1.5 rounded text-[10px] ${
                        isPresent ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-50'
                      }`}
                    >
                      {isPresent ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      <span className="truncate">{section.heading}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </SEOLayout>
  );
};

// Simple markdown to HTML for preview
function markdownToHTML(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return `<p>${match}</p>`;
    });
}

// Missing import
function Minus(props: { className?: string }) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  );
}

export default ContentProduction;
