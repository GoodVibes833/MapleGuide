const MONTHS_PATTERN =
  "January|February|March|April|May|June|July|August|September|October|November|December";

const ENTITY_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " "
};

export function decodeHtmlEntities(value = "") {
  return value
    .replace(/&(amp|lt|gt|quot|nbsp);|&#39;/g, (match) => ENTITY_MAP[match] ?? match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function normalizeWhitespace(value = "") {
  return decodeHtmlEntities(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function stripTags(html = "") {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|tr|div|section|article|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function extractFirstMatch(html, regex) {
  const match = html.match(regex);
  return match ? normalizeWhitespace(match[1]) : null;
}

export function extractPageTitle(html = "") {
  const rawTitle =
    extractFirstMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    extractFirstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ??
    extractFirstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ??
    "Untitled update";

  return rawTitle
    .replace(/\s*-\s*Canada\.ca$/i, "")
    .replace(/\s*\|\s*Government of.*$/i, "")
    .trim();
}

export function extractMetaDescription(html = "") {
  return extractFirstMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
  );
}

function extractSection(html = "", tagName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = html.match(regex);
  return match ? match[1] : null;
}

export function extractContentRoot(html = "") {
  return extractSection(html, "main") ?? extractSection(html, "article") ?? extractSection(html, "body") ?? html;
}

export function extractParagraphs(html = "", limit = 4) {
  const paragraphs = [];
  const regex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = regex.exec(html)) && paragraphs.length < limit) {
    const text = normalizeWhitespace(match[1]);
    if (text) {
      paragraphs.push(text);
    }
  }
  return paragraphs;
}

export function extractBullets(html = "", limit = 6) {
  const bullets = [];
  const regex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = regex.exec(html)) && bullets.length < limit) {
    const text = normalizeWhitespace(match[1]);
    if (text) {
      bullets.push(text);
    }
  }
  return bullets;
}

export function parseLooseDate(value) {
  if (!value) {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  const isoMatch = normalized.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const monthMatch = normalized.match(
    new RegExp(`\\b(${MONTHS_PATTERN})\\s+\\d{1,2},\\s+20\\d{2}\\b`, "i")
  );
  if (monthMatch) {
    const timestamp = Date.parse(monthMatch[0]);
    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp).toISOString().slice(0, 10);
    }
  }

  const timestamp = Date.parse(normalized);
  if (!Number.isNaN(timestamp)) {
    return new Date(timestamp).toISOString().slice(0, 10);
  }

  return null;
}

export function extractFirstDate(value = "") {
  const lines = decodeHtmlEntities(value).split(/\n+/);
  for (const line of lines) {
    const parsed = parseLooseDate(line);
    if (parsed) {
      return parsed;
    }
  }

  return parseLooseDate(value);
}

export function extractTables(html = "") {
  const tables = [];
  const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(html))) {
    const rows = [];
    const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableMatch[1]))) {
      const cells = [];
      const cellRegex = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
        const value = stripTags(cellMatch[1]);
        cells.push(value);
      }

      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length > 1) {
      tables.push({
        headers: rows[0].map((header) => header.toLowerCase()),
        rows: rows.slice(1)
      });
    }
  }

  return tables;
}

export function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
