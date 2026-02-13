// AI-Powered SEO Analyzer using Gemini API
import { analyzeSEO as ruleBasedAnalyze, SEOAnalysis } from './seo-analyzer';

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

interface GeminiCandidate {
  content: {
    parts: Array<{ text: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

// Analyze SEO using Gemini AI
export const analyzeWithAI = async (
  title: string,
  content: string,
  metaDescription: string,
  keyword: string,
  targetAudience: string = 'wedding planners'
): Promise<AIAnalysis | null> => {
  const apiKey = localStorage.getItem('gemini_api_key');

  if (!apiKey) {
    console.log('No Gemini API key found, skipping AI analysis');
    return null;
  }

  const cleanContent = content.replace(/<[^>]*>/g, '');
  const wordCount = cleanContent.split(/\s+/).filter(w => w.length > 0).length;

  const prompt = `You are an expert SEO consultant for wedding planning blogs. Analyze this blog post and provide detailed SEO feedback.

POST DETAILS:
- Title: ${title}
- Primary Keyword: ${keyword || 'Not specified'}
- Target Audience: ${targetAudience}
- Word Count: ${wordCount}
- Meta Description: ${metaDescription || 'Not provided'}

CONTENT (first 3000 chars):
${cleanContent.substring(0, 3000)}

Please analyze and respond with ONLY valid JSON (no markdown, no explanations):

{
  "score": (overall SEO score 0-100),
  "overallAssessment": (2-3 sentence summary),
  "strengths": [3-4 things the post does well],
  "weaknesses": [3-4 things that need improvement],
  "recommendations": [4-5 specific actionable suggestions],
  "contentQuality": {
    "clarity": (1-10),
    "depth": (1-10),
    "engagement": (1-10),
    "tone": "professional/casual/authoritative/friendly"
  },
  "keywordAnalysis": {
    "relevance": (1-10),
    "placement": "brief assessment",
    "suggestions": [2-3 suggestions]
  },
  "competitorInsights": "brief insight",
  "viralPotential": (1-10)
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const data: GeminiResponse = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      const cleanJson = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      try {
        return JSON.parse(cleanJson) as AIAnalysis;
      } catch {
        console.error('Failed to parse AI response:', cleanJson);
        return null;
      }
    }
  } catch (error) {
    console.error('AI analysis error:', error);
  }

  return null;
};

// Hybrid analysis: Rule-based + AI
export const hybridAnalyze = async (
  title: string,
  content: string,
  metaDescription: string,
  keyword: string
): Promise<{ ruleBased: SEOAnalysis; aiAnalysis: AIAnalysis | null; finalScore: number; isAIAvailable: boolean }> => {
  const ruleBased = ruleBasedAnalyze(title, content, metaDescription, keyword);
  const aiAnalysis = await analyzeWithAI(title, content, metaDescription, keyword);

  return {
    ruleBased,
    aiAnalysis,
    finalScore: aiAnalysis
      ? Math.round((ruleBased.score + aiAnalysis.score) / 2)
      : ruleBased.score,
    isAIAvailable: aiAnalysis !== null
  };
};

export default {
  analyzeWithAI,
  hybridAnalyze
};
