import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { createRequestHandler } from "../src/server.js";

function createMockRequest({ method, url, body = null }) {
  const payload = body ? [Buffer.from(JSON.stringify(body))] : [];
  const request = Readable.from(payload);
  request.method = method;
  request.url = url;
  request.headers = {
    host: "local.test"
  };
  return request;
}

function createMockResponse() {
  let statusCode = 200;
  let headers = {};
  let body = "";

  return {
    writeHead(nextStatusCode, nextHeaders) {
      statusCode = nextStatusCode;
      headers = nextHeaders;
    },
    end(chunk = "") {
      body += chunk;
    },
    snapshot() {
      return {
        statusCode,
        headers,
        body
      };
    }
  };
}

async function invoke(handler, requestOptions) {
  const request = createMockRequest(requestOptions);
  const response = createMockResponse();
  await handler(request, response);
  return response.snapshot();
}

test("request handler renders dashboard, region page, and refresh endpoint", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "canada-immigration-server-"));
  const handler = await createRequestHandler({
    outputDir,
    useFixtures: true
  });

  const dashboardResponse = await invoke(handler, {
    method: "GET",
    url: "/"
  });
  assert.equal(dashboardResponse.statusCode, 200);
  assert.match(dashboardResponse.body, /최신정보/);
  assert.match(dashboardResponse.body, /전체비교/);
  assert.match(dashboardResponse.body, /내 상황으로 먼저 찾기/);
  assert.match(dashboardResponse.body, /나이/);
  assert.match(dashboardResponse.body, /캐나다 밖에서 바로 EE\/취업이민을 보고 있어요/);
  assert.match(dashboardResponse.body, /캐나다에 먼저 와서 현지 경력 쌓는 방향이에요/);
  assert.match(dashboardResponse.body, /관심 지역 필터/);
  assert.match(dashboardResponse.body, /quick-coin/);
  assert.match(dashboardResponse.body, /British Columbia/);
  assert.match(dashboardResponse.body, /전체 선택됨 · 모든 지역 비교/);
  assert.match(dashboardResponse.body, /필수\*/);
  assert.match(dashboardResponse.body, /data-required-field="path"/);
  assert.match(dashboardResponse.body, /작성 필요/);
  assert.match(dashboardResponse.body, /최종 학력/);
  assert.match(dashboardResponse.body, /영어 상태/);
  assert.match(dashboardResponse.body, /캐나다 경력의 성격/);
  assert.match(dashboardResponse.body, /한국에서 주로 하던 일/);
  assert.match(dashboardResponse.body, /한국에서 실제로 하던 job title/);
  assert.match(dashboardResponse.body, /지금 캐나다에서 하는 일/);
  assert.match(dashboardResponse.body, /지금 캐나다에서 실제로 하는 job title/);
  assert.match(dashboardResponse.body, /이민에 쓸 주력 경력 축/);
  assert.match(dashboardResponse.body, /현재 비자 \/ 퍼밋 남은 기간/);
  assert.match(dashboardResponse.body, /ECA \/ 학력평가 상태/);
  assert.match(dashboardResponse.body, /먼저 꼭 필요한 정보/);
  assert.match(dashboardResponse.body, /추가로 알려주면 더 정확해요/);
  assert.ok(dashboardResponse.body.indexOf("먼저 꼭 필요한 정보") < dashboardResponse.body.indexOf("추가로 알려주면 더 정확해요"));
  assert.match(dashboardResponse.body, /학비·생활비 부담/);
  assert.match(dashboardResponse.body, /정착 선호/);
  assert.match(dashboardResponse.body, /현재 조건에서 먼저 볼 주정부 추천 순위/);
  assert.match(dashboardResponse.body, /연방 \/ EE는 따로 보기/);
  assert.match(dashboardResponse.body, /대도시가 우선이어도, 지역 정착까지 열면 PR 기회가 더 좋아질 수 있어요/);
  assert.match(dashboardResponse.body, /업데이트 더보기/);
  assert.match(dashboardResponse.body, /update-flash-chevron/);
  assert.match(dashboardResponse.body, /id="older-updates-list" hidden/);
  assert.match(dashboardResponse.body, /mini-region-map/);
  assert.match(dashboardResponse.body, /선발 방식/);
  assert.match(dashboardResponse.body, /이 지역은 이렇게 뽑아요/);
  assert.doesNotMatch(dashboardResponse.body, /<strong>연방 EE 참고<\/strong>/);
  assert.doesNotMatch(dashboardResponse.body, /이 주 자체 점수 아님/);
  assert.match(dashboardResponse.body, /왜 이 순위인가/);
  assert.match(dashboardResponse.body, /이 직무를 이 주에서 보면/);
  assert.match(dashboardResponse.body, /NOC 예시:/);
  assert.match(dashboardResponse.body, /해석 후보:/);
  assert.match(dashboardResponse.body, /이 주에서 가능한 현실 플랜/);
  assert.match(dashboardResponse.body, /이 경로가 실제로 보는 것/);
  assert.match(dashboardResponse.body, /자세히 보기/);
  assert.match(dashboardResponse.body, /캐나다 한눈에 비교/);
  assert.match(dashboardResponse.body, /원할 때만 펼쳐서 보는 전체 비교표입니다/);

  const ontarioRegionResponse = await invoke(handler, {
    method: "GET",
    url: "/region/ontario"
  });
  assert.equal(ontarioRegionResponse.statusCode, 200);
  assert.match(ontarioRegionResponse.body, /온타리오/);
  assert.match(ontarioRegionResponse.body, /이 지역을 볼지 말지 먼저 판단/);
  assert.match(ontarioRegionResponse.body, /연결된 공식 소스/);

  const unknownRegionResponse = await invoke(handler, {
    method: "GET",
    url: "/region/unknown-place"
  });
  assert.equal(unknownRegionResponse.statusCode, 404);

  const refreshResponse = await invoke(handler, {
    method: "POST",
    url: "/api/refresh",
    body: {}
  });
  assert.equal(refreshResponse.statusCode, 200);
  const refreshPayload = JSON.parse(refreshResponse.body);
  assert.equal(refreshPayload.ok, true);
  assert.ok(refreshPayload.updateCount >= 10);
});

test("request handler injects GA4 when configured", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "canada-immigration-server-ga-"));
  const handler = await createRequestHandler({
    outputDir,
    useFixtures: true,
    analyticsMeasurementId: "G-TEST123456"
  });

  const dashboardResponse = await invoke(handler, {
    method: "GET",
    url: "/"
  });

  assert.equal(dashboardResponse.statusCode, 200);
  assert.match(dashboardResponse.body, /googletagmanager\.com\/gtag\/js\?id=G-TEST123456/);
  assert.ok(dashboardResponse.body.includes('const ANALYTICS_MEASUREMENT_ID = "G-TEST123456";'));
});
