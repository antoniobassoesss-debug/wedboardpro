// Topic Discovery Orchestrator - combines all scrapers to find and score topics

import { scrapeAutocomplete, type AutocompleteSuggestion } from './autocomplete';
import { fetchTrendData, type TrendData } from './trends';
import { analyzeSERP, type SERPAnalysis } from './serp';

interface DiscoveredTopic {
  keyword_primary: string;
  keyword_variations: string[];
  search_volume: number;
  keyword_difficulty: number;
  current_top_urls: string[];
  competitor_word_counts: number[];
  content_gaps: {
    peopleAlsoAsk: string[];
    relatedSearches: string[];
    trendDirection: string;
    relatedQueries: string[];
  };
  priority_score: number;
  estimated_monthly_traffic: number;
  category: string;
  status: 'discovered';
}

// Estimate search volume from Google Trends interest (rough proxy)
function estimateSearchVolume(trendInterest: number): number {
  // Scale: 0-100 trend interest → rough monthly search volume
  if (trendInterest >= 80) return 5000 + trendInterest * 50;
  if (trendInterest >= 50) return 2000 + trendInterest * 30;
  if (trendInterest >= 20) return 500 + trendInterest * 20;
  return 100 + trendInterest * 10;
}

// Estimate difficulty from SERP competition
function estimateDifficulty(serp: SERPAnalysis): number {
  let difficulty = 30; // baseline

  const highAuthDomains = ['weddingwire.com', 'theknot.com', 'brides.com', 'vogue.com', 'martha steweddings'];
  const topDomains = serp.results.slice(0, 5).map((r) => r.domain);

  // More authority sites = higher difficulty
  const authCount = topDomains.filter((d) => highAuthDomains.some((a) => d.includes(a))).length;
  difficulty += authCount * 12;

  // Featured snippet present = harder
  if (serp.featuredSnippet) difficulty += 10;

  // Many PAA questions = content opportunity (slight decrease)
  if (serp.peopleAlsoAsk.length > 4) difficulty -= 5;

  return Math.min(100, Math.max(1, difficulty));
}

// Score priority (0-100) based on opportunity
function calculatePriorityScore(
  searchVolume: number,
  difficulty: number,
  trendDirection: string,
  competitorCount: number
): number {
  let score = 50;

  // High volume = higher priority
  if (searchVolume > 5000) score += 20;
  else if (searchVolume > 2000) score += 15;
  else if (searchVolume > 500) score += 10;
  else score += 5;

  // Low difficulty = higher priority
  if (difficulty < 30) score += 20;
  else if (difficulty < 50) score += 10;
  else if (difficulty > 70) score -= 10;

  // Rising trend = bonus
  if (trendDirection === 'rising') score += 15;
  else if (trendDirection === 'declining') score -= 10;

  // Few strong competitors = opportunity
  if (competitorCount < 3) score += 10;

  return Math.min(100, Math.max(1, score));
}

function categorizeKeyword(keyword: string): string {
  const kw = keyword.toLowerCase();
  if (kw.includes('budget') || kw.includes('cost') || kw.includes('price') || kw.includes('cheap')) return 'Budgets & Pricing';
  if (kw.includes('venue') || kw.includes('location') || kw.includes('place')) return 'Venues';
  if (kw.includes('vendor') || kw.includes('photographer') || kw.includes('caterer') || kw.includes('florist')) return 'Vendors';
  if (kw.includes('guest') || kw.includes('seating') || kw.includes('invitation') || kw.includes('rsvp')) return 'Guests & Seating';
  if (kw.includes('timeline') || kw.includes('checklist') || kw.includes('schedule') || kw.includes('planning')) return 'Planning & Organization';
  if (kw.includes('design') || kw.includes('decoration') || kw.includes('theme') || kw.includes('style')) return 'Design & Decor';
  if (kw.includes('business') || kw.includes('client') || kw.includes('lead') || kw.includes('marketing')) return 'Business Growth';
  if (kw.includes('software') || kw.includes('tool') || kw.includes('app') || kw.includes('technology')) return 'Tools & Software';
  return 'General';
}

export async function discoverTopics(
  seedKeywords: string[],
  options: { maxTopics?: number; skipTrends?: boolean } = {}
): Promise<DiscoveredTopic[]> {
  const { maxTopics = 50, skipTrends = false } = options;
  const topics: DiscoveredTopic[] = [];
  const processedKeywords = new Set<string>();

  for (const seed of seedKeywords) {
    // Step 1: Get autocomplete suggestions
    const suggestions = await scrapeAutocomplete(seed);
    const allKeywords = [seed, ...suggestions.map((s) => s.keyword)];

    // Deduplicate and limit
    const uniqueKeywords = allKeywords.filter((kw) => {
      const norm = kw.toLowerCase().trim();
      if (processedKeywords.has(norm)) return false;
      processedKeywords.add(norm);
      return true;
    });

    // Step 2: Process each keyword (limit per seed to avoid overload)
    const toProcess = uniqueKeywords.slice(0, 15);

    for (const keyword of toProcess) {
      if (topics.length >= maxTopics) break;

      try {
        // Step 3: Get trend data
        let trendData: TrendData = {
          keyword,
          averageInterest: 50,
          trendDirection: 'stable',
          relatedQueries: [],
          relatedTopics: [],
          peakMonth: null,
        };
        if (!skipTrends) {
          trendData = await fetchTrendData(keyword);
          await new Promise((r) => setTimeout(r, 300));
        }

        // Step 4: Analyze SERP
        const serp = await analyzeSERP(keyword);
        await new Promise((r) => setTimeout(r, 500));

        // Step 5: Calculate metrics
        const searchVolume = estimateSearchVolume(trendData.averageInterest);
        const difficulty = estimateDifficulty(serp);
        const priorityScore = calculatePriorityScore(
          searchVolume,
          difficulty,
          trendData.trendDirection,
          serp.results.length
        );

        // Gather keyword variations from related queries and suggestions
        const variations = [
          ...suggestions.filter((s) => s.keyword.includes(keyword) || keyword.includes(s.keyword)).map((s) => s.keyword),
          ...trendData.relatedQueries.slice(0, 5),
        ].filter((v, i, arr) => v !== keyword && arr.indexOf(v) === i).slice(0, 10);

        topics.push({
          keyword_primary: keyword,
          keyword_variations: variations,
          search_volume: searchVolume,
          keyword_difficulty: difficulty,
          current_top_urls: serp.results.slice(0, 5).map((r) => r.url),
          competitor_word_counts: [],
          content_gaps: {
            peopleAlsoAsk: serp.peopleAlsoAsk,
            relatedSearches: serp.relatedSearches,
            trendDirection: trendData.trendDirection,
            relatedQueries: trendData.relatedQueries,
          },
          priority_score: priorityScore,
          estimated_monthly_traffic: Math.round(searchVolume * 0.3),
          category: categorizeKeyword(keyword),
          status: 'discovered',
        });
      } catch (err) {
        console.error(`Failed to process keyword "${keyword}":`, err);
      }
    }

    if (topics.length >= maxTopics) break;
  }

  // Sort by priority score
  topics.sort((a, b) => b.priority_score - a.priority_score);

  return topics.slice(0, maxTopics);
}

export type { DiscoveredTopic };
