import { extractFirstDate, extractPageTitle, extractTables, normalizeWhitespace, stripTags } from "../core/html.js";

function findHeaderIndex(headers, aliases) {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase().trim());
  return headers.findIndex((header) => {
    const normalizedHeader = header.toLowerCase().trim();
    return normalizedAliases.some(
      (alias) => normalizedHeader === alias || normalizedHeader.includes(alias)
    );
  });
}

function selectBestTable(tables, source) {
  let bestTable = null;
  let bestScore = -1;
  const headerGroups = Object.values(source.fieldMap ?? {});

  for (const table of tables) {
    let score = 0;
    for (const aliases of headerGroups) {
      if (findHeaderIndex(table.headers, aliases) >= 0) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestTable = table;
    }
  }

  return bestScore > 0 ? bestTable : null;
}

function pickFields(table, row, source) {
  const metrics = {};

  for (const [field, aliases] of Object.entries(source.fieldMap ?? {})) {
    const index = findHeaderIndex(table.headers, aliases);
    if (index >= 0 && row[index]) {
      metrics[field] = normalizeWhitespace(row[index]);
    }
  }

  return metrics;
}

function buildSummary(source, metrics) {
  const orderedFields = Object.entries(metrics).map(([key, value]) => `${key}: ${value}`);
  return normalizeWhitespace(`${source.name}. ${orderedFields.join(". ")}`);
}

export function parseTablePage(source, html) {
  const title = extractPageTitle(html);
  const pageDate = extractFirstDate(stripTags(html));
  const tables = extractTables(html);
  const table = selectBestTable(tables, source);

  if (!table) {
    return [
      {
        title,
        eventType: "page-refresh",
        publishedAt: pageDate,
        summaryEn: `${source.name} page was fetched, but no table matching the configured headers was found.`,
        facts: [],
        metrics: {}
      }
    ];
  }

  return table.rows.slice(0, source.maxRows ?? 1).map((row, index) => {
    const metrics = pickFields(table, row, source);
    const publishedAt = extractFirstDate(metrics.date) ?? pageDate;
    const contextLabel =
      metrics.category ??
      metrics.stream ??
      metrics.date ??
      `${index + 1}`;

    return {
      title: index === 0 ? title : `${title} - ${contextLabel}`,
      eventType: source.eventType ?? "draw",
      publishedAt,
      summaryEn: buildSummary(source, metrics),
      facts: Object.entries(metrics).map(([key, value]) => `${key}: ${value}`),
      metrics
    };
  });
}
