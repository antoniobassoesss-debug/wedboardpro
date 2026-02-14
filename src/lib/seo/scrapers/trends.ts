// Google Trends API integration - fetch trend data for keywords

// @ts-expect-error google-trends-api has no types
import googleTrends from 'google-trends-api';

interface TrendData {
  keyword: string;
  averageInterest: number;
  trendDirection: 'rising' | 'stable' | 'declining';
  relatedQueries: string[];
  relatedTopics: string[];
  peakMonth: string | null;
}

function calculateTrendDirection(timeline: number[]): 'rising' | 'stable' | 'declining' {
  if (timeline.length < 4) return 'stable';
  const recent = timeline.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const older = timeline.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
  if (older === 0) return recent > 0 ? 'rising' : 'stable';
  const change = (recent - older) / older;
  if (change > 0.15) return 'rising';
  if (change < -0.15) return 'declining';
  return 'stable';
}

export async function fetchTrendData(keyword: string): Promise<TrendData> {
  const result: TrendData = {
    keyword,
    averageInterest: 0,
    trendDirection: 'stable',
    relatedQueries: [],
    relatedTopics: [],
    peakMonth: null,
  };

  try {
    // Interest over time (last 12 months)
    const interestRaw = await googleTrends.interestOverTime({
      keyword,
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      geo: 'US',
    });
    const interestData = JSON.parse(interestRaw);
    const timeline = interestData?.default?.timelineData || [];

    if (timeline.length > 0) {
      const values = timeline.map((t: { value: number[] }) => t.value[0]);
      result.averageInterest = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
      result.trendDirection = calculateTrendDirection(values);

      // Find peak
      let peakIdx = 0;
      let peakVal = 0;
      values.forEach((v: number, i: number) => {
        if (v > peakVal) { peakVal = v; peakIdx = i; }
      });
      if (timeline[peakIdx]?.formattedAxisTime) {
        result.peakMonth = timeline[peakIdx].formattedAxisTime;
      }
    }
  } catch {
    // Trends API can fail silently - return defaults
  }

  try {
    const relatedRaw = await googleTrends.relatedQueries({ keyword, geo: 'US' });
    const relatedData = JSON.parse(relatedRaw);
    const queries = relatedData?.default?.rankedList || [];

    if (queries[0]?.rankedKeyword) {
      result.relatedQueries = queries[0].rankedKeyword
        .slice(0, 10)
        .map((q: { query: string }) => q.query);
    }
    if (queries[1]?.rankedKeyword) {
      result.relatedQueries.push(
        ...queries[1].rankedKeyword.slice(0, 5).map((q: { query: string }) => q.query)
      );
    }
  } catch {
    // Related queries can fail
  }

  try {
    const topicsRaw = await googleTrends.relatedTopics({ keyword, geo: 'US' });
    const topicsData = JSON.parse(topicsRaw);
    const topics = topicsData?.default?.rankedList || [];

    if (topics[0]?.rankedKeyword) {
      result.relatedTopics = topics[0].rankedKeyword
        .slice(0, 8)
        .map((t: { topic: { title: string } }) => t.topic.title);
    }
  } catch {
    // Related topics can fail
  }

  return result;
}

export async function fetchBulkTrends(keywords: string[]): Promise<TrendData[]> {
  const results: TrendData[] = [];
  // Process 3 at a time to avoid rate limits
  for (let i = 0; i < keywords.length; i += 3) {
    const batch = keywords.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map(fetchTrendData));
    results.push(...batchResults);
    if (i + 3 < keywords.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return results;
}

export type { TrendData };
