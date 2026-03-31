import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractTables } from "../src/core/html.js";
import { parseArticlePage } from "../src/adapters/article-page.js";
import { parseTablePage } from "../src/adapters/table-page.js";
import { runPipeline } from "../src/core/pipeline.js";
import { DASHBOARD_REQUIRED_FIELD_LABELS } from "../src/site/render-dashboard.js";

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
  assert.doesNotMatch(dashboardHtml, /흔한 케이스로 바로 시작/);
  assert.doesNotMatch(dashboardHtml, /한국 요리사 -> 캐나다 cook/);
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
  assert.match(dashboardHtml, /function readQuickStartRawAnswers\(\)/);
  assert.match(dashboardHtml, /function readDashboardRawAnswersFromControls\(/);
  assert.match(dashboardHtml, /return readDashboardRawAnswersFromControls\(quickStartForm\.elements, normalizeDependentAnswers\)/);
  assert.match(dashboardHtml, /trackFieldChange\(event\.target\);/);
  assert.match(dashboardHtml, /필수\* 항목을 먼저 골라주세요/);
  assert.match(dashboardHtml, /최종 학력/);
  assert.match(dashboardHtml, /현재 입력 저장/);
  assert.match(dashboardHtml, /저장값 불러오기/);
  assert.match(dashboardHtml, /초기화/);
  assert.match(dashboardHtml, /현재 입력은 이 브라우저 안에서만 저장됩니다/);
  assert.match(dashboardHtml, /questionnaire_saved/);
  assert.match(dashboardHtml, /questionnaire_loaded/);
  assert.match(dashboardHtml, /questionnaire_reset/);
  assert.match(dashboardHtml, /comparison_table_opened/);
  assert.match(dashboardHtml, /한국에서 주로 하던 일/);
  assert.match(dashboardHtml, /한국에서 실제로 하던 job title/);
  assert.match(dashboardHtml, /지금 캐나다에서 하는 일/);
  assert.match(dashboardHtml, /지금 캐나다에서 실제로 하는 job title/);
  assert.match(dashboardHtml, /id="korea-title-hint"/);
  assert.match(dashboardHtml, /id="canada-title-hint"/);
  assert.match(dashboardHtml, /실제 title을 적으면 어떤 직무군으로 읽히는지 바로 보여줍니다/);
  assert.match(dashboardHtml, /실제 title을 적으면 TEER 해석과 전환 후보를 같이 보여줍니다/);
  assert.match(dashboardHtml, /이민에 쓸 주력 경력 축/);
  assert.match(dashboardHtml, /요리사 \/ cook \/ chef/);
  assert.match(dashboardHtml, /레스토랑 매니저 \/ restaurant manager/);
  assert.match(dashboardHtml, /서버 \/ 캐셔 \/ 바리스타 \/ food counter/);
  assert.match(dashboardHtml, /호텔 프론트 \/ guest service \/ front desk/);
  assert.match(dashboardHtml, /하우스키핑 \/ 클리닝 \/ room attendant/);
  assert.match(dashboardHtml, /사무행정 \/ 오피스 \/ 코디네이터/);
  assert.match(dashboardHtml, /네일 \/ 헤어 \/ 뷰티 서비스/);
  assert.match(dashboardHtml, /제조 \/ production \/ factory worker/);
  assert.match(dashboardHtml, /제빵 \/ 파티시에 \/ bakery/);
  assert.match(dashboardHtml, /자동차 정비 \/ mechanic \/ technician/);
  assert.match(dashboardHtml, /영어 상태/);
  assert.match(dashboardHtml, /캐나다 경력의 성격/);
  assert.match(dashboardHtml, /현재 비자 \/ 퍼밋 남은 기간/);
  assert.match(dashboardHtml, /ECA \/ 학력평가 상태/);
  assert.match(dashboardHtml, /먼저 꼭 필요한 정보/);
  assert.match(dashboardHtml, /추가로 알려주면 더 정확해요/);
  assert.ok(dashboardHtml.indexOf("먼저 꼭 필요한 정보") < dashboardHtml.indexOf("추가로 알려주면 더 정확해요"));
  assert.match(dashboardHtml, /학비·생활비 부담/);
  assert.match(dashboardHtml, /정착 선호/);
  assert.match(dashboardHtml, /현재 조건에서 먼저 볼 주정부 추천 순위/);
  assert.match(dashboardHtml, /주정부 추천은 아래 순위로 보고, 연방 EE는 따로 비교합니다|지금 조건에서 먼저 볼 주정부 순서를 1순위부터 정리했습니다/);
  assert.match(dashboardHtml, /입력한 직무를 이렇게 읽고 있어요/);
  assert.match(dashboardHtml, /job title 해석/);
  assert.match(dashboardHtml, /지금 주력으로 보기:/);
  assert.match(dashboardHtml, /캐나다 현재 직무 축|한국 경력 축|전환\/학교 축|비교 진행 중/);
  assert.match(dashboardHtml, /현재 해석:/);
  assert.match(dashboardHtml, /정밀 title 후보:/);
  assert.match(dashboardHtml, /title 후보:/);
  assert.match(dashboardHtml, /직군 축 후보:/);
  assert.match(dashboardHtml, /title 단계:/);
  assert.match(dashboardHtml, /title 해석 메모:/);
  assert.match(dashboardHtml, /직무 상태:/);
  assert.match(dashboardHtml, /주요 후보:/);
  assert.match(dashboardHtml, /더 유리한 방향:/);
  assert.match(dashboardHtml, /연방 \/ EE는 따로 보기/);
  assert.match(dashboardHtml, /대도시가 우선이어도, 지역 정착까지 열면 PR 기회가 더 좋아질 수 있어요/);
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
  assert.match(dashboardHtml, /바로 비교 가능|직무 전환 필요|학교 경유 권장|고용주\/지역 먼저|한국 경력 재구성|지금 직무 가능/);
  assert.match(dashboardHtml, /현재 자격상태/);
  assert.match(dashboardHtml, /직무 현실 체크/);
  assert.match(dashboardHtml, /이 직무를 이 주에서 보면/);
  assert.match(dashboardHtml, /NOC 예시:/);
  assert.match(dashboardHtml, /해석 후보:/);
  assert.match(dashboardHtml, /현재 주력 title 단계:/);
  assert.match(dashboardHtml, /현재 주력 title 메모:/);
  assert.match(dashboardHtml, /캐나다 title "/);
  assert.match(dashboardHtml, /이 주에서 가능한 현실 플랜/);
  assert.match(dashboardHtml, /이 경로가 실제로 보는 것/);
  assert.match(dashboardHtml, /연방\/EE 연계/);
  assert.match(dashboardHtml, /nomination 되면 대략 .*점까지 뛰어오를 수 있어요/);
  assert.match(dashboardHtml, /주별 stream 현실 가이드/);
  assert.match(dashboardHtml, /맞는 이유:/);
  assert.match(dashboardHtml, /정밀 title 기준 NOC-like:/);
  assert.match(dashboardHtml, /배우자와 같이 본다면/);
  assert.match(dashboardHtml, /학교 경유를 같이 보면/);
  assert.match(dashboardHtml, /규제직 \/ 자격증 체크/);
  assert.match(dashboardHtml, /자세히 보기/);
  assert.match(dashboardHtml, /최저 CRS는 492점이고 4,200명에게 초청장이 나왔습니다/);
  assert.match(dashboardHtml, /언어점수 CLB 9 이상 목표/);
  assert.match(dashboardHtml, /TEER 0-3 직무로 옮겨 skilled 경력 1년 만들기/);
  assert.match(dashboardHtml, /이 지역의 EE-linked nomination 노리기/);
  assert.match(dashboardHtml, /캐나다 skilled 경력 .*년까지 늘리기/);
  assert.match(dashboardHtml, /지역을 다른 곳으로 넓혀보세요/);
  assert.match(dashboardHtml, /가능한 플랜 A\/B\/C/);
  assert.match(dashboardHtml, /영어·EE 점수 플랜/);
  assert.match(dashboardHtml, /불어 점수 플랜/);
  assert.match(dashboardHtml, /직무·고용주 연결 플랜/);
  assert.match(dashboardHtml, /학교·졸업자 플랜/);
  assert.match(dashboardHtml, /지역 정착 플랜/);
  assert.match(dashboardHtml, /food service supervisor 또는 cook/);
  assert.match(dashboardHtml, /inventory coordinator 또는 dispatcher/);
  assert.match(dashboardHtml, /점수형보다 예외 stream부터 확인하는 플랜/);
  assert.match(dashboardHtml, /대도시형 취업 플랜/);
  assert.match(dashboardHtml, /PSW·caregiver는 연방 direct보다 Ontario In-Demand, AIP, local employer 예외 경로를 먼저 보는 편이 현실적입니다/);
  assert.match(dashboardHtml, /front-line service title이라 대부분 주에서 그대로는 약하게 읽혀요/);
  assert.match(dashboardHtml, /선택한 직군은 skilled 쪽이지만, 입력한 title은 아직 broad해서 전환 플랜을 같이 보는 게 좋아요/);
  assert.match(dashboardHtml, /현재 title 해석상 direct가 약해서/);
  assert.match(
    dashboardHtml,
    /improvementPlan\.baseScore \+ "점 \+" \+ improvementPlan\.projectedScoreLift \+ "점 → " \+ improvementPlan\.projectedScore \+ "점"/
  );
  assert.match(dashboardHtml, /캐나다 한눈에 비교/);
  assert.match(dashboardHtml, /원할 때만 펼쳐서 보는 전체 비교표입니다/);
  assert.doesNotMatch(dashboardHtml, /Map Explorer/);
  assert.doesNotMatch(dashboardHtml, /지역 탐색은 필요할 때만 열기/);

  const requiredFieldMatches = [...dashboardHtml.matchAll(/data-required-field="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(
    [...new Set(requiredFieldMatches)].sort(),
    Object.keys(DASHBOARD_REQUIRED_FIELD_LABELS).sort()
  );

  const ontarioRegionPage = await readFile(
    path.join(outputDir, "region", "ontario", "index.html"),
    "utf8"
  );
  assert.match(ontarioRegionPage, /온타리오/);
  assert.match(ontarioRegionPage, /id="jurisdiction-personalized-plan"/);
  assert.match(ontarioRegionPage, /메인에서 보던 내 상황 기준으로 이 주에서 먼저 할 것/);
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

test("fixture pipeline injects GA4 when a measurement ID is provided", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "mapleguide-ga-"));
  await runPipeline({
    useFixtures: true,
    outputDir,
    analyticsMeasurementId: "G-TEST123456"
  });

  const indexHtml = await readFile(path.join(outputDir, "index.html"), "utf8");
  assert.match(indexHtml, /googletagmanager\.com\/gtag\/js\?id=G-TEST123456/);
  assert.ok(indexHtml.includes('const ANALYTICS_MEASUREMENT_ID = "G-TEST123456";'));
  assert.match(indexHtml, /form_started/);
  assert.match(indexHtml, /recommendation_detail_opened/);
});
