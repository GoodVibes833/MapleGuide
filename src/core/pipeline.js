import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAdapter } from "../adapters/index.js";
import { sources } from "../config/sources.js";
import { contentHash } from "./hash.js";
import { loadSourceContent } from "./fetcher.js";
import { parsedUpdatesLookHealthy } from "./source-health.js";
import { buildKoreanSummary } from "../translation/korean.js";
import { JURISDICTION_META, renderDashboard } from "../site/render-dashboard.js";

function toComparableDate(update) {
  return update.publishedAt ?? update.fetchedAt.slice(0, 10);
}

function normalizeUpdate(source, fetchResult, parsedUpdate, index) {
  const canonicalText = [
    parsedUpdate.title,
    parsedUpdate.summaryEn,
    ...(parsedUpdate.facts ?? []),
    JSON.stringify(parsedUpdate.metrics ?? {})
  ].join("\n");

  const baseUpdate = {
    id: `${source.id}:${index}:${contentHash(canonicalText).slice(0, 12)}`,
    sourceId: source.id,
    sourceName: source.name,
    jurisdiction: source.jurisdiction,
    program: source.program,
    sourceUrl: source.url,
    fetchedAt: fetchResult.fetchedAt,
    fetchMode: fetchResult.mode,
    title: parsedUpdate.title,
    eventType: parsedUpdate.eventType,
    publishedAt: parsedUpdate.publishedAt,
    summaryEn: parsedUpdate.summaryEn,
    facts: parsedUpdate.facts ?? [],
    metrics: parsedUpdate.metrics ?? {},
    contentHash: contentHash(canonicalText),
    crawlingHint: parsedUpdate.crawlingHint ?? null
  };

  const translation = buildKoreanSummary(baseUpdate);

  return {
    ...baseUpdate,
    translation
  };
}

async function removeIfExists(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
}

export async function runPipeline({
  useFixtures = false,
  sourceIds = null,
  outputDir = path.join(process.cwd(), "out"),
  basePath = "",
  analyticsMeasurementId = "",
  fetchImpl
} = {}) {
  const selectedSources = Array.isArray(sourceIds) && sourceIds.length > 0
    ? sources.filter((source) => sourceIds.includes(source.id))
    : sources;

  const updates = [];
  const reports = [];

  for (const source of selectedSources) {
    let fetchResult = await loadSourceContent(source, { useFixtures, fetchImpl });
    if (fetchResult.error) {
      reports.push({
        sourceId: source.id,
        ok: false,
        fetchedAt: fetchResult.fetchedAt,
        mode: fetchResult.mode,
        error: String(fetchResult.error)
      });
      continue;
    }

    const adapter = getAdapter(source.adapter);
    let parsedUpdates = adapter(source, fetchResult.html);

    if (!useFixtures && !parsedUpdatesLookHealthy(source, parsedUpdates)) {
      const fixtureResult = await loadSourceContent(source, { useFixtures: true, fetchImpl });
      const fixtureUpdates = adapter(source, fixtureResult.html);

      if (parsedUpdatesLookHealthy(source, fixtureUpdates)) {
        parsedUpdates = fixtureUpdates;
        fetchResult = {
          ...fixtureResult,
          mode: "fixture-quality-fallback",
          warning: `Network response for ${source.id} looked invalid. Used fixture fallback.`
        };
      }
    }

    const normalizedUpdates = parsedUpdates.map((parsedUpdate, index) =>
      normalizeUpdate(source, fetchResult, parsedUpdate, index)
    );

    updates.push(...normalizedUpdates);
    reports.push({
      sourceId: source.id,
      ok: true,
      fetchedAt: fetchResult.fetchedAt,
      mode: fetchResult.mode,
      updateCount: normalizedUpdates.length,
      warning: fetchResult.warning ?? null
    });
  }

  updates.sort((left, right) => toComparableDate(right).localeCompare(toComparableDate(left)));

  const generatedAt = new Date().toISOString();
  const payload = {
    generatedAt,
    sourceCount: selectedSources.length,
    updateCount: updates.length,
    reports,
    updates
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "feed.json"), JSON.stringify(payload, null, 2));
  await writeFile(path.join(outputDir, ".nojekyll"), "");
  await removeIfExists(path.join(outputDir, "instagram-drafts.json"));
  await removeIfExists(path.join(outputDir, "instagram-queue.json"));
  await removeIfExists(path.join(outputDir, "instagram-export.json"));
  await removeIfExists(path.join(outputDir, "instagram.html"));
  const dashboardHtml = renderDashboard({
    generatedAt,
    updates,
    reports,
    basePath,
    analyticsMeasurementId
  });
  await writeFile(path.join(outputDir, "index.html"), dashboardHtml);
  await writeFile(path.join(outputDir, "dashboard.html"), dashboardHtml);
  await mkdir(path.join(outputDir, "region"), { recursive: true });
  for (const jurisdiction of JURISDICTION_META) {
    const regionDir = path.join(outputDir, "region", jurisdiction.id);
    await mkdir(regionDir, { recursive: true });
    await writeFile(
      path.join(regionDir, "index.html"),
      renderDashboard({
        generatedAt,
        updates,
        reports,
        page: "jurisdiction",
        jurisdictionId: jurisdiction.id,
        basePath,
        analyticsMeasurementId
      })
    );
  }

  return payload;
}
