import { parseArticlePage } from "./article-page.js";
import { parseMetricLabels } from "./metric-labels.js";
import { parseTablePage } from "./table-page.js";

const registry = {
  "article-page": parseArticlePage,
  "metric-labels": parseMetricLabels,
  "table-page": parseTablePage
};

export function getAdapter(name) {
  const adapter = registry[name];
  if (!adapter) {
    throw new Error(`Unknown adapter: ${name}`);
  }
  return adapter;
}
