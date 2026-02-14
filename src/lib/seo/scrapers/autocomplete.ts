// Google Autocomplete keyword scraper - fetches keyword suggestions

interface AutocompleteSuggestion {
  keyword: string;
  type: 'autocomplete';
  source: string;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

async function fetchGoogleSuggestions(query: string): Promise<string[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encoded}&hl=en&gl=us`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data[1]) ? data[1] : [];
  } catch {
    return [];
  }
}

export async function scrapeAutocomplete(seedKeyword: string): Promise<AutocompleteSuggestion[]> {
  const results: AutocompleteSuggestion[] = [];
  const seen = new Set<string>();

  // Base query
  const baseSuggestions = await fetchGoogleSuggestions(seedKeyword);
  for (const kw of baseSuggestions) {
    const normalized = kw.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      results.push({ keyword: normalized, type: 'autocomplete', source: 'google-base' });
    }
  }

  // Alphabet expansion: "seed keyword a", "seed keyword b", etc.
  const letterBatches = [];
  for (let i = 0; i < ALPHABET.length; i += 5) {
    letterBatches.push(ALPHABET.slice(i, i + 5));
  }

  for (const batch of letterBatches) {
    const promises = batch.map((letter) => fetchGoogleSuggestions(`${seedKeyword} ${letter}`));
    const batchResults = await Promise.all(promises);
    for (const suggestions of batchResults) {
      for (const kw of suggestions) {
        const normalized = kw.toLowerCase().trim();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          results.push({ keyword: normalized, type: 'autocomplete', source: 'google-alpha' });
        }
      }
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  // Question modifiers
  const questionPrefixes = ['how to', 'what is', 'why do', 'when to', 'best', 'top'];
  for (const prefix of questionPrefixes) {
    const suggestions = await fetchGoogleSuggestions(`${prefix} ${seedKeyword}`);
    for (const kw of suggestions) {
      const normalized = kw.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        results.push({ keyword: normalized, type: 'autocomplete', source: `google-${prefix.replace(/\s/g, '-')}` });
      }
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return results;
}

export type { AutocompleteSuggestion };
