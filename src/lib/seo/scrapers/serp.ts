// Google SERP analyzer - scrapes search results for competitor analysis
import * as cheerio from 'cheerio';

interface SERPResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

interface SERPAnalysis {
  keyword: string;
  results: SERPResult[];
  featuredSnippet: { text: string; url: string } | null;
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  totalResults: string;
}

interface CompetitorContent {
  url: string;
  title: string;
  wordCount: number;
  headings: string[];
  hasImages: boolean;
  hasTables: boolean;
  hasVideo: boolean;
  internalLinkCount: number;
  externalLinkCount: number;
}

async function fetchWithRetry(url: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Fetch failed after retries');
}

export async function analyzeSERP(keyword: string): Promise<SERPAnalysis> {
  const analysis: SERPAnalysis = {
    keyword,
    results: [],
    featuredSnippet: null,
    peopleAlsoAsk: [],
    relatedSearches: [],
    totalResults: '0',
  };

  try {
    const encoded = encodeURIComponent(keyword);
    const html = await fetchWithRetry(`https://www.google.com/search?q=${encoded}&hl=en&gl=us&num=10`);
    const $ = cheerio.load(html);

    // Extract organic results
    $('div.g').each((i, el) => {
      if (i >= 10) return;
      const titleEl = $(el).find('h3').first();
      const linkEl = $(el).find('a').first();
      const snippetEl = $(el).find('[data-sncf], .VwiC3b, span.st').first();

      const title = titleEl.text().trim();
      const url = linkEl.attr('href') || '';
      const snippet = snippetEl.text().trim();

      if (title && url && url.startsWith('http')) {
        const domain = new URL(url).hostname.replace('www.', '');
        analysis.results.push({ position: i + 1, title, url, snippet, domain });
      }
    });

    // Featured snippet
    const featuredEl = $('[data-attrid="wa:/description"], .xpdopen .LGOjhe, .IZ6rdc');
    if (featuredEl.length) {
      const text = featuredEl.first().text().trim();
      const url = featuredEl.closest('.g').find('a').first().attr('href') || '';
      if (text) analysis.featuredSnippet = { text, url };
    }

    // People Also Ask
    $('[data-q]').each((_i, el) => {
      const question = $(el).attr('data-q') || $(el).text().trim();
      if (question) analysis.peopleAlsoAsk.push(question);
    });

    // Related searches
    $('a.k8XOCe, .brs_col a').each((_i, el) => {
      const text = $(el).text().trim();
      if (text) analysis.relatedSearches.push(text);
    });

    // Total results
    const statsEl = $('#result-stats').text();
    const match = statsEl.match(/About ([\d,]+) results/);
    if (match?.[1]) analysis.totalResults = match[1];
  } catch (err) {
    console.error(`SERP analysis failed for "${keyword}":`, err);
  }

  return analysis;
}

export async function analyzeCompetitorContent(url: string): Promise<CompetitorContent | null> {
  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, aside, .sidebar, .comments').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(/\s+/).length;

    const headings: string[] = [];
    $('h1, h2, h3').each((_i, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(`${el.tagName.toUpperCase()}: ${text}`);
    });

    const domain = new URL(url).hostname;
    let internalLinkCount = 0;
    let externalLinkCount = 0;
    $('a[href]').each((_i, el) => {
      const href = $(el).attr('href') || '';
      if (href.startsWith('http')) {
        try {
          const linkDomain = new URL(href).hostname;
          if (linkDomain.includes(domain)) internalLinkCount++;
          else externalLinkCount++;
        } catch { /* skip invalid urls */ }
      } else if (href.startsWith('/')) {
        internalLinkCount++;
      }
    });

    return {
      url,
      title,
      wordCount,
      headings,
      hasImages: $('img').length > 2,
      hasTables: $('table').length > 0,
      hasVideo: $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0,
      internalLinkCount,
      externalLinkCount,
    };
  } catch (err) {
    console.error(`Competitor analysis failed for "${url}":`, err);
    return null;
  }
}

export async function analyzeTopCompetitors(keyword: string, limit = 5): Promise<{
  serp: SERPAnalysis;
  competitors: CompetitorContent[];
}> {
  const serp = await analyzeSERP(keyword);
  const topUrls = serp.results.slice(0, limit).map((r) => r.url);

  const competitors: CompetitorContent[] = [];
  for (const url of topUrls) {
    const content = await analyzeCompetitorContent(url);
    if (content) competitors.push(content);
    await new Promise((r) => setTimeout(r, 500));
  }

  return { serp, competitors };
}

export type { SERPResult, SERPAnalysis, CompetitorContent };
