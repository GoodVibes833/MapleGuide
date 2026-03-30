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
  assert.match(dashboardResponse.body, /업데이트 허브/);
  assert.match(dashboardResponse.body, /내 상황으로 먼저 찾기/);
  assert.match(dashboardResponse.body, /나이/);
  assert.match(dashboardResponse.body, /캐나다 밖에서 바로 EE\/취업이민을 보고 있어요/);
  assert.match(dashboardResponse.body, /워홀·오픈퍼밋으로 현지 경력 쌓아 이민을 보려 해요/);
  assert.match(dashboardResponse.body, /관심 지역 지도 필터/);
  assert.match(dashboardResponse.body, /선택된 지역 없음 · 전체 추천/);
  assert.match(dashboardResponse.body, /필수\*/);
  assert.match(dashboardResponse.body, /최종 학력/);
  assert.match(dashboardResponse.body, /영어 상태/);
  assert.match(dashboardResponse.body, /캐나다 경력의 성격/);
  assert.match(dashboardResponse.body, /ECA \/ 학력평가 상태/);
  assert.match(dashboardResponse.body, /학비·생활비 부담/);
  assert.match(dashboardResponse.body, /정착 선호/);
  assert.match(dashboardResponse.body, /완료 시 예상 CRS \+/);
  assert.match(dashboardResponse.body, /캐나다 한눈에 비교/);

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
