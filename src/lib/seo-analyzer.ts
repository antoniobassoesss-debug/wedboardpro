// Real SEO Analysis Engine for Blog Posts

interface SEOAnalysis {
  score: number;
  titleScore: number;
  contentScore: number;
  metaScore: number;
  keywordScore: number;
  issues: SEOIssue[];
  suggestions: string[];
  wordCount: number;
  readabilityScore: number;
  keywordDensity: number;
}

interface SEOIssue {
  type: 'error' | 'warning' | 'success' | 'info';
  field: string;
  message: string;
}

// Calculate readability (Flesch Reading Ease simplified)
const calculateReadability = (text: string): number => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
  const words = text.split(/\s+/).filter(w => w.length > 0).length || 1;
  const syllables = text.split(/[aeiouy]+/).filter(s => s.length > 0).length || words;
  
  const avgSentenceLength = words / sentences;
  const avgSyllablesPerWord = syllables / words;
  
  // Flesch Reading Ease formula (simplified)
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, score));
};

// Count images without alt text
const countImagesWithoutAlt = (content: string): number => {
  const imgMatches = content.match(/<img[^>]*>/gi) || [];
  const withoutAlt = imgMatches.filter(img => !img.includes('alt=') || img.includes('alt=""'));
  return withoutAlt.length;
};

// Check if keyword appears in title
const keywordInTitle = (title: string, keyword: string): boolean => {
  if (!keyword) return false;
  return title.toLowerCase().includes(keyword.toLowerCase());
};

// Check if keyword appears in meta description
const keywordInMeta = (meta: string, keyword: string): boolean => {
  if (!keyword) return false;
  return meta.toLowerCase().includes(keyword.toLowerCase());
};

// Calculate keyword density
const calculateKeywordDensity = (content: string, keyword: string): number => {
  if (!keyword) return 0;
  const words = content.replace(/<[^>]*>/g, '').toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const keywordCount = words.filter(w => w.includes(keyword.toLowerCase())).length;
  return words.length > 0 ? (keywordCount / words.length) * 100 : 0;
};

// Main SEO Analysis Function
export const analyzeSEO = (
  title: string,
  content: string,
  metaDescription: string,
  keyword: string
): SEOAnalysis => {
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];
  const cleanContent = content.replace(/<[^>]*>/g, '');
  const wordCount = cleanContent.split(/\s+/).filter(w => w.length > 0).length;
  const readabilityScore = calculateReadability(cleanContent);
  const keywordDensity = calculateKeywordDensity(content, keyword);

  // Title Analysis (25 points)
  let titleScore = 0;
  
  if (!title) {
    issues.push({ type: 'error', field: 'title', message: 'Title is missing' });
  } else if (title.length < 30) {
    issues.push({ type: 'warning', field: 'title', message: `Title is too short (${title.length} chars). Aim for 50-60.` });
    titleScore += 10;
  } else if (title.length > 60) {
    issues.push({ type: 'warning', field: 'title', message: `Title is too long (${title.length} chars). May be truncated in SERPs.` });
    titleScore += 15;
  } else {
    issues.push({ type: 'success', field: 'title', message: 'Title length is optimal' });
    titleScore += 25;
  }

  if (keyword && !keywordInTitle(title, keyword)) {
    issues.push({ type: 'error', field: 'title', message: 'Primary keyword not found in title' });
    titleScore -= 10;
  } else if (keyword && keywordInTitle(title, keyword)) {
    suggestions.push('✓ Primary keyword in title');
    titleScore += 5;
  }

  // Content Analysis (35 points)
  let contentScore = 0;

  if (wordCount < 300) {
    issues.push({ type: 'error', field: 'content', message: `Content too short (${wordCount} words). Aim for 1500+.` });
    contentScore += 5;
  } else if (wordCount < 1000) {
    issues.push({ type: 'warning', field: 'content', message: `Content is short (${wordCount} words). 1500+ words rank better.` });
    contentScore += 15;
  } else if (wordCount >= 1500 && wordCount <= 3000) {
    issues.push({ type: 'success', field: 'content', message: `Excellent content length (${wordCount} words)` });
    contentScore += 35;
  } else if (wordCount > 3000) {
    issues.push({ type: 'warning', field: 'content', message: 'Long content. Ensure quality over quantity.' });
    contentScore += 25;
  } else {
    issues.push({ type: 'info', field: 'content', message: `Good length (${wordCount} words). Consider expanding.` });
    contentScore += 20;
  }

  // Headings
  const hasH2 = /<h2/i.test(content);
  const hasH3 = /<h3/i.test(content);
  if (!hasH2) {
    issues.push({ type: 'warning', field: 'content', message: 'No H2 headings found. Add structure with subheadings.' });
  } else {
    contentScore += 5;
  }

  // Images
  const imagesWithoutAlt = countImagesWithoutAlt(content);
  if (imagesWithoutAlt > 0) {
    issues.push({ type: 'warning', field: 'content', message: `${imagesWithoutAlt} image(s) missing alt text.` });
  } else if (content.includes('<img')) {
    contentScore += 5;
  }

  // Paragraphs
  const paragraphs = content.split('</p>').filter(p => p.trim().length > 0 && p.includes('<p')).length;
  if (paragraphs < 3 && wordCount > 500) {
    issues.push({ type: 'warning', field: 'content', message: 'Consider breaking content into more paragraphs.' });
  }

  // Meta Description Analysis (20 points)
  let metaScore = 0;

  if (!metaDescription) {
    issues.push({ type: 'error', field: 'meta', message: 'Meta description is missing' });
  } else if (metaDescription.length < 120) {
    issues.push({ type: 'warning', field: 'meta', message: `Meta description is short (${metaDescription.length} chars). Aim for 150-160.` });
    metaScore += 10;
  } else if (metaDescription.length > 160) {
    issues.push({ type: 'warning', field: 'meta', message: `Meta description is too long (${metaDescription.length} chars).` });
    metaScore += 15;
  } else {
    issues.push({ type: 'success', field: 'meta', message: 'Meta description length is optimal' });
    metaScore += 20;
  }

  if (keyword && !keywordInMeta(metaDescription, keyword)) {
    issues.push({ type: 'warning', field: 'meta', message: 'Primary keyword not in meta description' });
  } else if (keyword && keywordInMeta(metaDescription, keyword)) {
    suggestions.push('✓ Primary keyword in meta description');
    metaScore += 5;
  }

  // Keyword Analysis (20 points)
  let keywordScore = 0;

  if (!keyword) {
    issues.push({ type: 'error', field: 'keyword', message: 'No primary keyword specified' });
  } else if (keywordDensity === 0) {
    issues.push({ type: 'warning', field: 'keyword', message: 'Keyword not found in content' });
  } else if (keywordDensity < 0.5) {
    issues.push({ type: 'warning', field: 'keyword', message: `Low keyword density (${keywordDensity.toFixed(2)}%). Aim for 0.5-1.5%.` });
    keywordScore += 10;
  } else if (keywordDensity > 2.5) {
    issues.push({ type: 'warning', field: 'keyword', message: `High keyword density (${keywordDensity.toFixed(2)}%). May appear spammy.` });
    keywordScore += 10;
  } else {
    issues.push({ type: 'success', field: 'keyword', message: `Optimal keyword density (${keywordDensity.toFixed(2)}%)` });
    keywordScore += 20;
  }

  // Readability
  if (readabilityScore < 50) {
    issues.push({ type: 'warning', field: 'readability', message: `Hard to read (score: ${Math.round(readabilityScore)}). Aim for 60+.` });
  } else if (readabilityScore >= 60) {
    suggestions.push(`✓ Good readability (${Math.round(readabilityScore)}/100)`);
  }

  // Calculate Total Score
  const totalScore = Math.max(0, Math.min(100, titleScore + contentScore + metaScore + keywordScore));

  // Color coding
  if (totalScore >= 80) {
    issues.push({ type: 'success', field: 'overall', message: '🎉 Excellent SEO! Ready to publish.' });
  } else if (totalScore >= 60) {
    issues.push({ type: 'warning', field: 'overall', message: '📈 Good SEO! A few improvements needed.' });
  } else {
    issues.push({ type: 'error', field: 'overall', message: '⚠️ SEO needs work. Fix the issues above.' });
  }

  return {
    score: totalScore,
    titleScore,
    contentScore,
    metaScore,
    keywordScore,
    issues,
    suggestions,
    wordCount,
    readabilityScore: Math.round(readabilityScore),
    keywordDensity: Math.round(keywordDensity * 100) / 100
  };
};

// Get SEO score color
export const getSeoScoreColor = (score: number): string => {
  if (score >= 80) return '#10b981'; // Green
  if (score >= 60) return '#f59e0b'; // Yellow
  return '#ef4444'; // Red
};

// Get SEO score label
export const getSeoScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
};

// Get SEO progress percentage
export const getSeoProgress = (score: number): number => score;

export default {
  analyzeSEO,
  getSeoScoreColor,
  getSeoScoreLabel,
  getSeoProgress
};
