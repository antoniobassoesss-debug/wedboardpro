export interface ExtractedHeaders {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
}

export interface ExtractedImage {
  url: string;
  alt: string | null;
}

/**
 * Strips markdown formatting to get plain text for analysis.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1") // links → keep text
    .replace(/^#{1,6}\s+/gm, "") // headers
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2") // bold/italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // inline/block code
    .replace(/^[\s]*[-*+]\s+/gm, "") // list markers
    .replace(/^>\s+/gm, "") // blockquotes
    .replace(/---+/g, "") // horizontal rules
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function countWords(text: string): number {
  const plain = stripMarkdown(text);
  if (!plain) return 0;
  return plain.split(/\s+/).filter((w) => w.length > 0).length;
}

export function calculateKeywordDensity(
  content: string,
  keyword: string,
): number {
  if (!content || !keyword) return 0;

  const plain = stripMarkdown(content).toLowerCase();
  const normalizedKeyword = keyword.toLowerCase().trim();
  const totalWords = countWords(content);

  if (totalWords === 0) return 0;

  // Count occurrences of the keyword phrase in the text
  let count = 0;
  let searchFrom = 0;
  while (true) {
    const idx = plain.indexOf(normalizedKeyword, searchFrom);
    if (idx === -1) break;
    count++;
    searchFrom = idx + 1;
  }

  // Keyword density = (occurrences * words-in-keyword / total words) * 100
  const keywordWordCount = normalizedKeyword.split(/\s+/).length;
  return Number(((count * keywordWordCount) / totalWords * 100).toFixed(2));
}

export function extractHeaders(content: string): ExtractedHeaders {
  const headers: ExtractedHeaders = {
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
  };

  const regex = /^(#{1,6})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
    const text = match[2].trim();
    headers[`h${level}`].push(text);
  }

  return headers;
}

export function extractLinks(
  content: string,
  type: "internal" | "external",
): string[] {
  // Match markdown links but not images (negative lookbehind for !)
  const regex = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const url = match[2].trim();

    const isInternal =
      url.startsWith("/") ||
      url.startsWith("#") ||
      url.includes("wedboardpro.com");

    if (type === "internal" && isInternal) {
      links.push(url);
    } else if (type === "external" && !isInternal) {
      links.push(url);
    }
  }

  return links;
}

export function extractImages(content: string): ExtractedImage[] {
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: ExtractedImage[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    images.push({
      url: match[2].trim(),
      alt: match[1].trim() || null,
    });
  }

  return images;
}

/**
 * Flesch-Kincaid Reading Ease score (0-100, higher = more readable).
 * Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
 */
export function calculateFleschKincaid(text: string): number {
  const plain = stripMarkdown(text);
  if (!plain) return 0;

  const words = plain.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  if (wordCount === 0) return 0;

  // Split on sentence-ending punctuation
  const sentences = plain
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);

  let totalSyllables = 0;
  for (const word of words) {
    totalSyllables += countSyllables(word);
  }

  const score =
    206.835 -
    1.015 * (wordCount / sentenceCount) -
    84.6 * (totalSyllables / wordCount);

  // Clamp to 0-100
  return Number(Math.max(0, Math.min(100, score)).toFixed(1));
}

/**
 * Estimates syllable count for an English word.
 */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return 1;

  // Remove trailing silent-e
  const trimmed = w.replace(/e$/, "");

  // Count vowel groups
  const vowelGroups = trimmed.match(/[aeiouy]+/g);
  const count = vowelGroups ? vowelGroups.length : 1;

  return Math.max(1, count);
}
