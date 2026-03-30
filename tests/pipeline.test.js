import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractTables } from "../src/core/html.js";
import { parseArticlePage } from "../src/adapters/article-page.js";
import { parseTablePage } from "../src/adapters/table-page.js";
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

test("article parser ignores svg path and head link markup", () => {
  const html = `
    <html>
      <head>
        <title>Ontario update</title>
        <link rel="stylesheet" href="/app.css" />
      </head>
      <body>
        <svg><path d="M0 0h24v24" /></svg>
        <main>
          <p>Published date: March 25, 2026</p>
          <p>Ontario opened a new intake window.</p>
          <ul>
            <li>New intake opens April 2, 2026.</li>
          </ul>
        </main>
      </body>
    </html>
  `;

  const update = parseArticlePage({ metricPatterns: {} }, html)[0];
  assert.equal(update.publishedAt, "2026-03-25");
  assert.equal(update.facts[0], "New intake opens April 2, 2026.");
  assert.doesNotMatch(update.summaryEn, /<path|stylesheet|href=/i);
});

test("table parser strips nested html from cells", () => {
  const html = `
    <main>
      <table>
        <tr>
          <th>Date</th>
          <th>Stream</th>
          <th>Candidates invited</th>
        </tr>
        <tr>
          <td><p><b>March 18, 2026</b></p></td>
          <td><p>Employment in New Brunswick</p></td>
          <td><strong>52</strong></td>
        </tr>
      </table>
    </main>
  `;

  const updates = parseTablePage(
    {
      name: "New Brunswick invitation and selection rounds",
      fieldMap: {
        date: ["date"],
        stream: ["stream"],
        candidatesInvited: ["candidates invited"]
      }
    },
    html
  );

  assert.equal(updates[0].metrics.date, "March 18, 2026");
  assert.equal(updates[0].metrics.stream, "Employment in New Brunswick");
  assert.equal(updates[0].metrics.candidatesInvited, "52");
});

test("pipeline falls back to fixtures when a live source looks blocked", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "mapleguide-fallback-"));
  const result = await runPipeline({
    sourceIds: ["pei-eoi-draws"],
    outputDir,
    fetchImpl: async () =>
      new Response(
        `<!doctype html><html><head><title>Radware Page</title></head><body>Access denied</body></html>`,
        { status: 200, headers: { "content-type": "text/html" } }
      )
  });

  assert.equal(result.reports.length, 1);
  assert.equal(result.reports[0].mode, "fixture-quality-fallback");
  assert.match(result.reports[0].warning ?? "", /fixture fallback/i);
  assert.equal(result.updates[0].sourceId, "pei-eoi-draws");
  assert.equal(result.updates[0].metrics.date, "2026-03-20");
  assert.equal(result.updates[0].metrics.labourExpressEntryInvitations, "124");
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
  assert.match(dashboardHtml, /캐나다에 먼저 와서 현지 경력 쌓는 방향이에요/);
  assert.match(dashboardHtml, /유학부터 시작해 PR까지 같이 보고 있어요/);
  assert.match(dashboardHtml, /졸업 후 현지 취업으로 PR까지 보고 있어요/);
  assert.match(dashboardHtml, /지금 캐나다 경력으로 바로 PR을 보고 있어요/);
  assert.match(dashboardHtml, /관심 지역 필터/);
  assert.match(dashboardHtml, /동그란 지역 버튼으로 여러 주를 같이 고를 수 있습니다/);
  assert.match(dashboardHtml, /quick-coin/);
  assert.match(dashboardHtml, /British Columbia/);
  assert.match(dashboardHtml, /Federal \/ EE/);
  assert.match(dashboardHtml, /전체 선택됨 · 모든 지역 비교/);
  assert.match(dashboardHtml, /연방 \/ EE/);
  assert.match(dashboardHtml, /필수\*/);
  assert.match(dashboardHtml, /data-required-field="path"/);
  assert.match(dashboardHtml, /작성 필요/);
  assert.match(dashboardHtml, /필수\* 항목을 먼저 골라주세요/);
  assert.match(dashboardHtml, /최종 학력/);
  assert.match(dashboardHtml, /현재 직군/);
  assert.match(dashboardHtml, /영어 상태/);
  assert.match(dashboardHtml, /캐나다 경력의 성격/);
  assert.match(dashboardHtml, /현재 비자 \/ 퍼밋 남은 기간/);
  assert.match(dashboardHtml, /ECA \/ 학력평가 상태/);
  assert.match(dashboardHtml, /학비·생활비 부담/);
  assert.match(dashboardHtml, /정착 선호/);
  assert.match(dashboardHtml, /현재 조건에서 먼저 볼 주정부 추천 순위/);
  assert.match(dashboardHtml, /주정부 추천은 아래 순위로 보고, 연방 EE는 따로 비교합니다|지금 조건에서 먼저 볼 주정부 순서를 1순위부터 정리했습니다/);
  assert.match(dashboardHtml, /연방 \/ EE는 따로 보기/);
  assert.match(dashboardHtml, /예상 적합도/);
  assert.match(dashboardHtml, /입력한 캐나다 skilled 경력은 CRS에 반영했습니다/);
  assert.match(dashboardHtml, /update-flash-chevron/);
  assert.match(dashboardHtml, /업데이트 더보기/);
  assert.match(dashboardHtml, /id="older-updates-list" hidden/);
  assert.match(dashboardHtml, /mini-region-map/);
  assert.match(dashboardHtml, /선발 방식/);
  assert.match(dashboardHtml, /이 지역은 이렇게 뽑아요/);
  assert.doesNotMatch(dashboardHtml, /<strong>연방 EE 참고<\/strong>/);
  assert.doesNotMatch(dashboardHtml, /이 주 자체 점수 아님/);
  assert.match(dashboardHtml, /EOI \+ 노동시장 우선/);
  assert.match(dashboardHtml, /왜 이 순위인가/);
  assert.match(dashboardHtml, /이 경로가 실제로 보는 것/);
  assert.match(dashboardHtml, /자세히 보기/);
  assert.match(dashboardHtml, /최저 CRS는 492점이고 4,200명에게 초청장이 나왔습니다/);
  assert.match(dashboardHtml, /언어점수 CLB 9 이상 목표/);
  assert.match(dashboardHtml, /TEER 0-3 직무로 옮겨 skilled 경력 1년 만들기/);
  assert.match(dashboardHtml, /이 지역의 EE-linked nomination 노리기/);
  assert.match(dashboardHtml, /캐나다 skilled 경력 .*년까지 늘리기/);
  assert.match(dashboardHtml, /지역을 다른 곳으로 넓혀보세요/);
  assert.match(dashboardHtml, /캐나다 한눈에 비교/);
  assert.match(dashboardHtml, /원할 때만 펼쳐서 보는 전체 비교표입니다/);
  assert.doesNotMatch(dashboardHtml, /Map Explorer/);
  assert.doesNotMatch(dashboardHtml, /지역 탐색은 필요할 때만 열기/);

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

test("fixture pipeline supports a GitHub Pages base path", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "mapleguide-pages-"));
  await runPipeline({ useFixtures: true, outputDir, basePath: "/MapleGuide" });

  const indexHtml = await readFile(path.join(outputDir, "index.html"), "utf8");
  assert.match(indexHtml, /href="\/MapleGuide\/"/);
  assert.match(indexHtml, /href="\/MapleGuide\/region\/ontario"/);
  assert.ok(indexHtml.includes('const BASE_PATH = "/MapleGuide";'));

  const regionHtml = await readFile(
    path.join(outputDir, "region", "ontario", "index.html"),
    "utf8"
  );
  assert.match(regionHtml, /href="\/MapleGuide\/"/);
  assert.match(regionHtml, /href="\/MapleGuide\/region\/federal"/);

  await access(path.join(outputDir, ".nojekyll"));
});
