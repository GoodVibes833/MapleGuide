import { parseLooseDate } from "./html.js";

const BLOCK_PAGE_PATTERN =
  /radware|stormcaster|access denied|attention required|bot manager|enable javascript|log in to continue/i;

function collectValues(update) {
  return [
    update.title,
    update.summaryEn,
    ...(update.facts ?? []),
    ...Object.values(update.metrics ?? {})
  ]
    .filter(Boolean)
    .map((value) => String(value));
}

function hasHtmlFragment(value = "") {
  return /<\/?[a-z][^>]*>/i.test(value) || value.includes("<?xml") || value.includes("<!DOCTYPE");
}

function isPlainTextUpdate(update) {
  return collectValues(update).every((value) => !hasHtmlFragment(value));
}

function hitsBlockPage(update) {
  return BLOCK_PAGE_PATTERN.test(collectValues(update).join(" "));
}

function hasMetric(update, key) {
  const value = update.metrics?.[key];
  return typeof value === "string" && value.trim().length > 0;
}

function hasDateishMetric(update, key = "date") {
  const value = update.metrics?.[key];
  return typeof value === "string" && Boolean(parseLooseDate(value));
}

const SOURCE_HEALTH_CHECKS = {
  "ee-rounds": (updates) =>
    updates.length > 0 &&
    hasMetric(updates[0], "cutoffScore") &&
    hasMetric(updates[0], "invitationsIssued"),
  "ontario-oinp-updates": (updates) =>
    updates.length > 0 &&
    isPlainTextUpdate(updates[0]) &&
    !hitsBlockPage(updates[0]) &&
    (updates[0].facts?.length ?? 0) > 0,
  "bc-pnp-invitations": (updates) =>
    updates.length > 0 &&
    updates.every(
      (update) =>
        isPlainTextUpdate(update) &&
        !hitsBlockPage(update) &&
        hasDateishMetric(update) &&
        hasMetric(update, "category") &&
        hasMetric(update, "minimumScore") &&
        hasMetric(update, "invitations")
    ),
  "manitoba-eoi-draw": (updates) =>
    updates.length > 0 &&
    isPlainTextUpdate(updates[0]) &&
    !hitsBlockPage(updates[0]) &&
    hasMetric(updates[0], "stream") &&
    hasMetric(updates[0], "invitationsIssued") &&
    hasMetric(updates[0], "rankingScore"),
  "pei-eoi-draws": (updates) =>
    updates.length > 0 &&
    updates.every(
      (update) =>
        isPlainTextUpdate(update) &&
        !hitsBlockPage(update) &&
        !/radware page/i.test(update.title) &&
        hasDateishMetric(update) &&
        hasMetric(update, "labourExpressEntryInvitations")
    ),
  "new-brunswick-invitations": (updates) =>
    updates.length > 0 &&
    updates.every(
      (update) =>
        isPlainTextUpdate(update) &&
        !hitsBlockPage(update) &&
        hasDateishMetric(update) &&
        hasMetric(update, "stream") &&
        hasMetric(update, "candidatesInvited")
    )
};

export function parsedUpdatesLookHealthy(source, updates) {
  const checker = SOURCE_HEALTH_CHECKS[source.id];
  if (!checker) {
    return updates.length > 0;
  }

  return checker(updates);
}
