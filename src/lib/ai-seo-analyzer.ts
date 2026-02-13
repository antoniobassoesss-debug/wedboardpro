// AI-Powered SEO Analyzer using OpenAI API

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

// The actual AI analysis is done server-side via /api/v1/blog/ai-seo-analyze
// This file provides type definitions and helpers for the frontend

export const getAIScoreColor = (score: number): string => {
  if (score >= 80) return '#10b981'; // Green
  if (score >= 60) return '#f59e0b'; // Yellow
  return '#ef4444'; // Red
};

export const getAIScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
};

export type { AIAnalysis };
