import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Target,
  Link2,
  ImageIcon,
  Check,
  Loader2,
  Edit3,
  Save,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import SEOLayout from './SEOLayout';

interface Topic {
  id: string;
  keyword_primary: string;
  keyword_variations: string[];
  search_volume: number;
  keyword_difficulty: number;
  priority_score: number;
  estimated_monthly_traffic: number;
  current_top_urls: string[];
  content_gaps: {
    peopleAlsoAsk?: string[];
    relatedSearches?: string[];
    trendDirection?: string;
    relatedQueries?: string[];
  };
  status: string;
  brief_id: string | null;
}

interface ContentBrief {
  id: string;
  topic_id: string;
  target_word_count: number;
  target_reading_level: string;
  required_sections: Array<{ heading: string; description: string; target_words: number }>;
  keyword_density_target: number;
  internal_links_required: string[];
  external_authority_links: string[];
  competitor_analysis: Record<string, unknown>;
  unique_angles: string[];
  target_featured_snippet: boolean;
  featured_snippet_format: string;
  product_features_to_mention: string[];
  cta_placements: string[];
  ai_prompt_template: string;
  status: string;
}

interface CompetitorData {
  url: string;
  title: string;
  wordCount: number;
  headings: string[];
  hasImages: boolean;
  hasTables: boolean;
  hasVideo: boolean;
}

const BriefGenerator: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const token = sessionStorage.getItem('team_token');

  const fetchData = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch topic
      const topicRes = await fetch(`/api/v1/seo/topics/${id}`, { headers });
      if (topicRes.ok) {
        const data = await topicRes.json();
        setTopic(data.topic);
      }

      // Try to fetch existing brief
      const briefRes = await fetch(`/api/v1/seo/briefs/topic/${id}`, { headers });
      if (briefRes.ok) {
        const data = await briefRes.json();
        if (data.brief) {
          setBrief(data.brief);
          setPromptText(data.brief.ai_prompt_template || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAnalyzeCompetitors = async () => {
    if (!topic || !token) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/v1/seo/analyze-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ keyword: topic.keyword_primary }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data.competitors || []);
      }
    } catch (err) {
      console.error('Competitor analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateBrief = async () => {
    if (!topic || !token) return;
    setGenerating(true);
    try {
      // Step 1: Generate brief with AI
      const generateRes = await fetch('/api/v1/seo/briefs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          keyword: topic.keyword_primary,
          topUrls: topic.current_top_urls,
          peopleAlsoAsk: topic.content_gaps?.peopleAlsoAsk || [],
          relatedSearches: topic.content_gaps?.relatedSearches || [],
        }),
      });

      if (!generateRes.ok) {
        const err = await generateRes.json();
        alert(`Generation failed: ${err.error}`);
        return;
      }

      const generatedData = await generateRes.json();
      const briefPayload = generatedData.brief;

      // Step 2: Save to database
      const saveRes = await fetch('/api/v1/seo/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          topic_id: id,
          ...briefPayload,
          competitor_analysis: competitors.length > 0 ? { competitors } : null,
          status: 'ready',
        }),
      });

      if (saveRes.ok) {
        const savedData = await saveRes.json();
        setBrief(savedData.brief);
        setPromptText(savedData.brief.ai_prompt_template || briefPayload.ai_prompt_template || '');
        // Refresh topic to get updated status
        setTopic((prev) => prev ? { ...prev, status: 'brief_created', brief_id: savedData.brief.id } : prev);
      }
    } catch (err) {
      console.error('Brief generation failed:', err);
      alert('Failed to generate brief. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!brief || !token) return;
    try {
      const res = await fetch(`/api/v1/seo/briefs/${brief.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ai_prompt_template: promptText }),
      });
      if (res.ok) {
        const data = await res.json();
        setBrief(data.brief);
        setEditingPrompt(false);
      }
    } catch (err) {
      console.error('Failed to save prompt:', err);
    }
  };

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
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

  if (!topic) {
    return (
      <SEOLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm text-gray-500">Topic not found</p>
            <button onClick={() => navigate('/team/seo/topics')} className="text-sm text-blue-600 mt-2 hover:underline">
              Back to Pipeline
            </button>
          </div>
        </div>
      </SEOLayout>
    );
  }

  return (
    <SEOLayout>
      <div className="h-full overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/team/seo/topics')}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Pipeline
              </button>
              <div className="w-px h-4 bg-gray-200" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">{topic.keyword_primary}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {(topic.search_volume || 0).toLocaleString()} vol
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                    KD {topic.keyword_difficulty || 0}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">
                    Priority {topic.priority_score || 0}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!brief && (
                <button
                  onClick={handleAnalyzeCompetitors}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Target className="w-3.5 h-3.5" />}
                  {analyzing ? 'Analyzing...' : 'Analyze Competitors'}
                </button>
              )}
              {!brief && (
                <button
                  onClick={handleGenerateBrief}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {generating ? 'Generating Brief...' : 'Generate Brief'}
                </button>
              )}
              {brief && (
                <button
                  onClick={() => navigate(`/team/seo/production?topic=${id}`)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Start Writing
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 max-w-[1200px] mx-auto space-y-6">
          {/* Competitor analysis results */}
          {competitors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Competitor Analysis</h3>
                <p className="text-xs text-gray-500 mt-0.5">Top {competitors.length} ranking pages</p>
              </div>
              <div className="divide-y divide-gray-100">
                {competitors.map((comp, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">{comp.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{comp.url}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-900">{comp.wordCount.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">words</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-900">{comp.headings.length}</p>
                        <p className="text-[10px] text-gray-400">headings</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {comp.hasImages && <ImageIcon className="w-3.5 h-3.5 text-gray-400" />}
                        {comp.hasVideo && <span className="text-[10px] text-gray-400">Video</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Brief content */}
          {brief ? (
            <div className="space-y-4">
              {/* Overview cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] text-gray-500 uppercase">Target Words</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{(brief.target_word_count || 1500).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] text-gray-500 uppercase">Sections</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{(brief.required_sections || []).length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] text-gray-500 uppercase">KW Density</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{brief.keyword_density_target || 1.5}%</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-[10px] text-gray-500 uppercase">Snippet</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{brief.target_featured_snippet ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {/* Required sections */}
              {brief.required_sections && brief.required_sections.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Required Sections</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {brief.required_sections.map((section, i) => (
                      <div key={i} className="px-4 py-3">
                        <button
                          onClick={() => toggleSection(i)}
                          className="flex items-center gap-2 w-full text-left"
                        >
                          {expandedSections.has(i) ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span className="text-xs font-medium text-gray-900">{section.heading}</span>
                          <span className="text-[10px] text-gray-400 ml-auto">~{section.target_words} words</span>
                        </button>
                        {expandedSections.has(i) && (
                          <p className="text-xs text-gray-600 mt-2 pl-5 leading-relaxed">{section.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links and features */}
              <div className="grid grid-cols-2 gap-4">
                {brief.unique_angles && brief.unique_angles.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-2">Unique Angles</h4>
                    <ul className="space-y-1.5">
                      {brief.unique_angles.map((angle, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-600">{angle}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {brief.product_features_to_mention && brief.product_features_to_mention.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-2">Product Features to Mention</h4>
                    <ul className="space-y-1.5">
                      {brief.product_features_to_mention.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* CTA placements */}
              {brief.cta_placements && brief.cta_placements.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 className="text-xs font-semibold text-gray-900 mb-2">CTA Placements</h4>
                  <div className="flex flex-wrap gap-2">
                    {brief.cta_placements.map((cta, i) => (
                      <span key={i} className="text-[10px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {cta}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Prompt */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">AI Prompt Template</h3>
                  <button
                    onClick={() => {
                      if (editingPrompt) handleSavePrompt();
                      else setEditingPrompt(true);
                    }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {editingPrompt ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                    {editingPrompt ? 'Save' : 'Edit'}
                  </button>
                </div>
                <div className="p-4">
                  {editingPrompt ? (
                    <textarea
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      className="w-full h-64 text-xs text-gray-700 font-mono leading-relaxed border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y"
                    />
                  ) : (
                    <pre className="text-xs text-gray-700 font-mono leading-relaxed whitespace-pre-wrap max-h-64 overflow-auto bg-gray-50 rounded-lg p-3">
                      {brief.ai_prompt_template || 'No prompt generated yet.'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* No brief yet - show generation prompt */
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Generate Content Brief</h2>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                Analyze competitors, find content gaps, and generate a comprehensive brief for
                <span className="font-medium text-gray-700"> "{topic.keyword_primary}"</span>
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={handleAnalyzeCompetitors}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                  {analyzing ? 'Analyzing...' : '1. Analyze Competitors'}
                </button>
                <button
                  onClick={handleGenerateBrief}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generating ? 'Generating...' : '2. Generate Brief'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SEOLayout>
  );
};

export default BriefGenerator;
