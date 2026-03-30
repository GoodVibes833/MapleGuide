import { extractFirstDate, extractPageTitle, normalizeWhitespace, stripTags } from "../core/html.js";

function buildFacts(metrics) {
  return Object.entries(metrics)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`);
}

function buildSummary(source, metrics) {
  const pieces = [];
  if (metrics.roundDate) {
    pieces.push(`Round date: ${metrics.roundDate}`);
  }
  if (metrics.invitationsIssued) {
    pieces.push(`Invitations issued: ${metrics.invitationsIssued}`);
  }
  if (metrics.cutoffScore) {
    pieces.push(`Lowest invited score: ${metrics.cutoffScore}`);
  }

  if (pieces.length === 0) {
    return `${source.name} page was fetched, but the latest round values were not present in the static HTML. Use browser rendering in production for this source.`;
  }

  return normalizeWhitespace(pieces.join(". "));
}

export function parseMetricLabels(source, html) {
  const title = extractPageTitle(html);
  const cleanText = stripTags(html);
  const metrics = {};

  for (const [key, pattern] of Object.entries(source.metricPatterns ?? {})) {
    const match = cleanText.match(pattern);
    if (match) {
      metrics[key] = normalizeWhitespace(match[1] ?? match[0]);
    }
  }

  const publishedAt = extractFirstDate(cleanText) ?? extractFirstDate(metrics.roundDate);
  const hasStructuredMetrics = Object.keys(metrics).length > 0;

  return [
    {
      title,
      eventType: hasStructuredMetrics ? source.eventType ?? "draw" : "page-refresh",
      publishedAt,
      summaryEn: buildSummary(source, metrics),
      facts: hasStructuredMetrics
        ? buildFacts(metrics)
        : [
            "Static HTML did not contain the latest round values.",
            "Add a Playwright-based collector for production."
          ],
      metrics,
      crawlingHint: hasStructuredMetrics ? null : "browser_recommended"
    }
  ];
}
