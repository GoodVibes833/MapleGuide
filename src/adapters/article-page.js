import {
  extractBullets,
  extractFirstDate,
  extractMetaDescription,
  extractPageTitle,
  extractParagraphs,
  normalizeWhitespace,
  stripTags
} from "../core/html.js";

function inferEventType(title, text) {
  const haystack = `${title} ${text}`.toLowerCase();
  if (haystack.includes("draw") || haystack.includes("invitation")) {
    return "draw";
  }
  if (haystack.includes("intake") || haystack.includes("open") || haystack.includes("close")) {
    return "intake-update";
  }
  return "program-update";
}

function extractConfiguredMetrics(cleanText, source) {
  const metrics = {};
  for (const [key, pattern] of Object.entries(source.metricPatterns ?? {})) {
    const match = cleanText.match(pattern);
    if (!match) {
      continue;
    }

    if (match[1]) {
      metrics[key] = normalizeWhitespace(match[1]);
      continue;
    }

    metrics[key] = normalizeWhitespace(match[0]);
  }
  return metrics;
}

function buildSummary(paragraphs, bullets, metaDescription) {
  const parts = [];
  if (metaDescription) {
    parts.push(metaDescription);
  }
  if (paragraphs[0]) {
    parts.push(paragraphs[0]);
  }
  if (bullets.length > 0) {
    parts.push(`Highlights: ${bullets.slice(0, 3).join("; ")}`);
  }
  return normalizeWhitespace(parts.join(" "));
}

export function parseArticlePage(source, html) {
  const title = extractPageTitle(html);
  const cleanText = stripTags(html);
  const paragraphs = extractParagraphs(html);
  const bullets = extractBullets(html);
  const metaDescription = extractMetaDescription(html);
  const metrics = extractConfiguredMetrics(cleanText, source);
  const publishedAt = extractFirstDate(cleanText);

  return [
    {
      title,
      eventType: source.eventType ?? inferEventType(title, cleanText),
      publishedAt,
      summaryEn: buildSummary(paragraphs, bullets, metaDescription),
      facts: bullets,
      metrics
    }
  ];
}
