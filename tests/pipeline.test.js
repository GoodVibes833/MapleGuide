import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractTables } from "../src/core/html.js";
import { runPipeline } from "../src/core/pipeline.js";

test("extractTables parses headers and rows", () => {
  const html = `
    <table>
      <tr><th>Date</th><th>Invitations</th></tr>
      <tr><td>2026-03-24</td><td>15</td></tr>
    </table>
  `;

  const tables = extractTables(html);
  assert.equal(tables.length, 1);
  assert.deepEqual(tables[0].headers, ["date", "invitations"]);
  assert.deepEqual(tables[0].rows[0], ["2026-03-24", "15"]);
});

test("fixture pipeline writes feed and dashboard", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "mapleguide-"));
  const result = await runPipeline({ useFixtures: true, outputDir });

  assert.equal(result.reports.length, 6);
  assert.ok(result.updateCount >= 10);

  const eeUpdate = result.updates.find((update) => update.sourceId === "ee-rounds");
  assert.equal(eeUpdate.metrics.cutoffScore, "492");
  assert.match(eeUpdate.translation.summaryKo, /최저 CRS 점수/);

  const nbUpdate = result.updates.find(
    (update) => update.sourceId === "new-brunswick-invitations"
  );
  assert.equal(nbUpdate.metrics.candidatesInvited, "52");

  const feed = JSON.parse(await readFile(path.join(outputDir, "feed.json"), "utf8"));
  assert.equal(feed.sourceCount, 6);

  const dashboardHtml = await readFile(path.join(outputDir, "dashboard.html"), "utf8");
  assert.match(dashboardHtml, /캐나다 이민/);
  assert.match(dashboardHtml, /내 상황으로 먼저 찾기/);
  assert.match(dashboardHtml, /나이/);
  assert.match(dashboardHtml, /최종 학력/);
  assert.match(dashboardHtml, /현재 직군/);
  assert.match(dashboardHtml, /언어시험 종류/);
  assert.match(dashboardHtml, /ECA \/ 학력평가 상태/);
  assert.match(dashboardHtml, /학비·생활비 부담/);
  assert.match(dashboardHtml, /정착 선호/);
  assert.match(dashboardHtml, /먼저 볼 지역 5곳/);
  assert.match(dashboardHtml, /예상 적합도/);
  assert.match(dashboardHtml, /캐나다 한눈에 비교/);
  assert.match(dashboardHtml, /연방 \/ Express Entry/);
  assert.match(dashboardHtml, /Map Explorer/);
  assert.match(dashboardHtml, /MAP_REGION_DEFS/);
  assert.match(dashboardHtml, /id="CA-ON"/);
  assert.match(dashboardHtml, /Wikimedia Commons/);

  const ontarioRegionPage = await readFile(
    path.join(outputDir, "region", "ontario", "index.html"),
    "utf8"
  );
  assert.match(ontarioRegionPage, /온타리오/);
  assert.match(ontarioRegionPage, /이 지역을 볼지 말지 먼저 판단/);
  assert.match(ontarioRegionPage, /먼저 읽어야 할 대표 경로/);
  assert.match(ontarioRegionPage, /이 지역 프로그램 구조/);
  assert.match(ontarioRegionPage, /Human Capital Priorities/);
  assert.match(ontarioRegionPage, /Employer Job Offer: Foreign Worker/);
  assert.match(ontarioRegionPage, /연결된 공식 소스/);
  assert.match(ontarioRegionPage, /Ontario Immigrant Nominee Program updates/);

  const federalRegionPage = await readFile(
    path.join(outputDir, "region", "federal", "index.html"),
    "utf8"
  );
  assert.match(federalRegionPage, /Canadian Experience Class/);
  assert.match(federalRegionPage, /Category-based selection/);
});
