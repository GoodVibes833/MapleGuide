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
  assert.match(dashboardHtml, /캐나다 밖에서 바로 EE\/취업이민을 보고 있어요/);
  assert.match(dashboardHtml, /워홀·오픈퍼밋으로 현지 경력 쌓아 이민을 보려 해요/);
  assert.match(dashboardHtml, /유학 시작부터 이민 경로를 같이 보고 있어요/);
  assert.match(dashboardHtml, /캐나다 졸업 후 PGWP\/현지 취업으로 이민을 보고 있어요/);
  assert.match(dashboardHtml, /현재 캐나다 skilled 경력으로 바로 PR을 노리고 있어요/);
  assert.match(dashboardHtml, /관심 지역 필터/);
  assert.match(dashboardHtml, /동그란 지역 버튼으로 여러 주를 같이 고를 수 있습니다/);
  assert.match(dashboardHtml, /quick-coin/);
  assert.match(dashboardHtml, /British Columbia/);
  assert.match(dashboardHtml, /Federal \/ EE/);
  assert.match(dashboardHtml, /선택된 지역 없음 · 전체 추천/);
  assert.match(dashboardHtml, /연방 \/ EE/);
  assert.match(dashboardHtml, /필수\*/);
  assert.match(dashboardHtml, /data-required-field="path"/);
  assert.match(dashboardHtml, /작성 필요/);
  assert.match(dashboardHtml, /필수\* 항목을 먼저 골라주세요/);
  assert.match(dashboardHtml, /최종 학력/);
  assert.match(dashboardHtml, /현재 직군/);
  assert.match(dashboardHtml, /영어 상태/);
  assert.match(dashboardHtml, /캐나다 경력의 성격/);
  assert.match(dashboardHtml, /ECA \/ 학력평가 상태/);
  assert.match(dashboardHtml, /학비·생활비 부담/);
  assert.match(dashboardHtml, /정착 선호/);
  assert.match(dashboardHtml, /먼저 볼 지역 5곳/);
  assert.match(dashboardHtml, /예상 적합도/);
  assert.match(dashboardHtml, /완료 시 예상 CRS \+/);
  assert.match(dashboardHtml, /입력한 캐나다 skilled 경력은 CRS에 반영했습니다/);
  assert.match(dashboardHtml, /update-flash-chevron/);
  assert.match(dashboardHtml, /업데이트 더보기/);
  assert.match(dashboardHtml, /id="older-updates-list" hidden/);
  assert.match(dashboardHtml, /최저 CRS는 492점이고 4,200명에게 초청장이 나왔습니다/);
  assert.match(dashboardHtml, /언어점수 CLB 9 이상 목표/);
  assert.match(dashboardHtml, /TEER 0-3 직무로 옮겨 skilled 경력 1년 만들기/);
  assert.match(dashboardHtml, /이 지역의 EE-linked nomination 노리기/);
  assert.match(dashboardHtml, /캐나다 skilled 경력 .*년까지 늘리기/);
  assert.match(dashboardHtml, /지역을 다른 곳으로 넓혀보세요/);
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
