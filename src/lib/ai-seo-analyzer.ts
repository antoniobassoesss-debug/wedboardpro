// AI-Powered SEO Analyzer using OpenAI API - 5-Pillar Framework

interface ScoreBreakdown {
  score: number;
  hasKeywordInTitle?: boolean;
  hasKeywordInFirstSentence?: boolean;
  hasKeywordInSlug?: boolean;
  hasUSEnglish?: boolean;
  usTermsFound?: string[];
  issues?: string[];
  hasEmotionalHook?: boolean;
  hasLongParagraphs?: boolean;
  bulletCount?: number;
  boldCount?: number;
  hasSoftCTA?: boolean;
  hasHardCTA?: boolean;
  softCTAsFound?: string[];
  hardCTAsFound?: string[];
  productIntegration?: 'strong' | 'moderate' | 'weak' | 'none';
  hasKnotCitation?: boolean;
  hasWeddingWireCitation?: boolean;
  hasVogueCitation?: boolean;
  hasExternalSources?: boolean;
  toneExpert?: boolean;
  metaDescriptionLength?: number;
  hasMetaDescription?: boolean;
  internalLinks?: string[];
  featureLinks?: string[];
}

interface AIAnalysis {
  keywordScore: number;
  hookScore: number;
  conversionScore: number;
  authorityScore: number;
  technicalScore: number;
  finalScore: number;
  status: 'FAIL' | 'PUBLISH';
  scores: {
    keyword: ScoreBreakdown;
    hookReadability: ScoreBreakdown;
    conversion: ScoreBreakdown;
    authority: ScoreBreakdown;
    technical: ScoreBreakdown;
  };
  actionItems: Array<{
    category: string;
    issue: string;
    action: string;
  }>;
  summary: string;
}

export const getAIScoreColor = (score: number): string => {
  if (score >= 90) return '#10b981';
  if (score >= 70) return '#f59e0b';
  return '#ef4444';
};

export const getAIScoreLabel = (score: number): string => {
  if (score >= 90) return 'PUBLISH';
  if (score >= 70) return 'NEARLY THERE';
  return 'NEEDS WORK';
};

export const getCategoryScoreColor = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return '#10b981';
  if (percentage >= 70) return '#f59e0b';
  return '#ef4444';
};

export type { AIAnalysis, ScoreBreakdown };
