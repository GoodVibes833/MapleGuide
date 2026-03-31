import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { renderDashboard } from "../src/site/render-dashboard.js";

class DummyClassList {
  constructor() {
    this.values = new Set();
  }
  add(...tokens) {
    tokens.forEach((token) => this.values.add(token));
  }
  remove(...tokens) {
    tokens.forEach((token) => this.values.delete(token));
  }
  toggle(token, force) {
    if (force === true) {
      this.values.add(token);
      return true;
    }

    if (force === false) {
      this.values.delete(token);
      return false;
    }

    if (this.values.has(token)) {
      this.values.delete(token);
      return false;
    }

    this.values.add(token);
    return true;
  }
  contains(token) {
    return this.values.has(token);
  }
}

function makeNode(overrides = {}) {
  const listeners = new Map();
  return {
    dataset: {},
    style: {},
    hidden: false,
    open: false,
    value: "",
    innerHTML: "",
    textContent: "",
    classList: new DummyClassList(),
    addEventListener(type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      if (!listeners.has(type)) {
        return;
      }
      listeners.set(
        type,
        listeners.get(type).filter((candidate) => candidate !== handler)
      );
    },
    dispatchEvent(event = {}) {
      const payload = {
        target: this,
        currentTarget: this,
        type: event.type ?? "",
        ...event
      };
      for (const handler of listeners.get(payload.type) || []) {
        handler(payload);
      }
      return true;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute() {},
    getAttribute() {
      return null;
    },
    removeAttribute() {},
    closest() {
      return null;
    },
    appendChild() {},
    scrollIntoView() {},
    focus() {},
    click() {
      this.dispatchEvent({ type: "click" });
    },
    matches() {
      return false;
    },
    ...overrides
  };
}

function buildDashboardClientHarness(rawControlValues, options = {}) {
  const html = renderDashboard({
    generatedAt: "2026-03-31",
    updates: [],
    reports: [],
    basePath: ""
  });
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "expected embedded dashboard script");

  const controls = Object.entries(rawControlValues).map(([name, value]) =>
    makeNode({
      name,
      value,
      tagName: name.endsWith("JobTitle") ? "INPUT" : "SELECT",
      type: name.endsWith("JobTitle") ? "text" : undefined,
      disabled: false
    })
  );
  const controlByName = Object.fromEntries(controls.map((control) => [control.name, control]));
  const formElements = {
    namedItem(name) {
      return controlByName[name] ?? null;
    },
    [Symbol.iterator]: function* iterate() {
      yield* controls;
    }
  };

  const requiredFieldNodes = [
    "path",
    "base",
    "age",
    "household",
    "education",
    "languageProfile",
    "foreignExp",
    "canadianExp",
    "canadianJobSkill",
    "ecaStatus"
  ].map((fieldName) =>
    makeNode({
      dataset: { requiredField: fieldName },
      querySelector() {
        return controlByName[fieldName] ?? null;
      }
    })
  );

  const quickStartResults = makeNode({
    querySelectorAll() {
      return [];
    }
  });
  const quickRegionFederalButton = makeNode();
  const quickRegionClearButton = makeNode();
  const quickFormStatus = makeNode();
  const compareTableDetails = makeNode();
  const quickStartForm = makeNode({
    elements: formElements,
    querySelectorAll(selector) {
      if (selector === "select, input, textarea") {
        return controls;
      }
      return [];
    }
  });

  const genericNode = () => makeNode();
  const idMap = new Proxy(
    {
      "quick-start-form": quickStartForm,
      "quick-start-results": quickStartResults,
      "quick-save-button": makeNode(),
      "quick-load-button": makeNode(),
      "quick-reset-button": makeNode(),
      "quick-form-status": quickFormStatus,
      "compare-table-details": compareTableDetails,
      "quick-region-selection": genericNode(),
      "map-tooltip": genericNode(),
      "canada-title-hint": genericNode(),
      "korea-title-hint": genericNode(),
      "quick-start-title-interpretation": genericNode(),
      "section-overview": genericNode(),
      "section-start": genericNode(),
      "section-compare": genericNode(),
      "section-latest": genericNode()
    },
    {
      get(target, prop) {
        if (!(prop in target)) {
          target[prop] = genericNode();
        }
        return target[prop];
      }
    }
  );

  const document = {
    getElementById(id) {
      return idMap[id] ?? null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-required-field]") {
        return requiredFieldNodes;
      }
      return [];
    },
    querySelector(selector) {
      if (selector === "[data-quick-region-toggle='federal']") {
        return quickRegionFederalButton;
      }
      if (selector === "[data-quick-region-clear]") {
        return quickRegionClearButton;
      }
      return null;
    },
    createElement() {
      return makeNode();
    },
    body: makeNode(),
    documentElement: makeNode()
  };

  const windowListeners = new Map();
  const sessionStore = new Map(Object.entries(options.sessionStorage ?? {}));
  const sessionStorage = {
    getItem(key) {
      return sessionStore.has(key) ? sessionStore.get(key) : null;
    },
    setItem(key, value) {
      sessionStore.set(key, String(value));
    },
    removeItem(key) {
      sessionStore.delete(key);
    }
  };
  const addWindowListener = (type, handler) => {
    if (!windowListeners.has(type)) {
      windowListeners.set(type, []);
    }
    windowListeners.get(type).push(handler);
  };
  const dispatchWindowEvent = (type, event = {}) => {
    for (const handler of windowListeners.get(type) || []) {
      handler({ type, ...event });
    }
  };

  const context = {
    console,
    document,
    window: {
      location: { hash: "" },
      addEventListener: addWindowListener,
      removeEventListener() {},
      innerWidth: 1440,
      sessionStorage,
      scrollTo() {},
      requestAnimationFrame(fn) {
        fn();
      },
      dispatchEvent(event) {
        dispatchWindowEvent(event.type, event);
      }
    },
    location: { hash: "" },
    history: { replaceState() {} },
    navigator: { userAgent: "node" },
    requestAnimationFrame(fn) {
      fn();
    },
    sessionStorage,
    setTimeout,
    clearTimeout,
    Set,
    Map,
    URL,
    URLSearchParams,
    Intl,
    Date,
    Math
  };
  context.globalThis = context;

  vm.runInNewContext(script, context, { timeout: 5000 });
  return {
    html: quickStartResults.innerHTML,
    quickStartResults,
    controlByName,
    requiredFieldNodes,
    dispatchWindowEvent,
    sessionStorage,
    saveButton: idMap["quick-save-button"],
    loadButton: idMap["quick-load-button"],
    resetButton: idMap["quick-reset-button"],
    quickFormStatus,
    compareTableDetails
  };
}

function buildJurisdictionClientHarness(jurisdictionId, options = {}) {
  const html = renderDashboard({
    generatedAt: "2026-03-31",
    updates: [],
    reports: [],
    page: "jurisdiction",
    jurisdictionId,
    basePath: ""
  });
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "expected embedded jurisdiction script");

  const personalizedRegionPlan = makeNode({
    dataset: {
      jurisdictionId,
      jurisdictionLabel: jurisdictionId
    }
  });

  const sessionStore = new Map(Object.entries(options.sessionStorage ?? {}));
  const sessionStorage = {
    getItem(key) {
      return sessionStore.has(key) ? sessionStore.get(key) : null;
    },
    setItem(key, value) {
      sessionStore.set(key, String(value));
    },
    removeItem(key) {
      sessionStore.delete(key);
    }
  };

  const document = {
    getElementById(id) {
      if (id === "jurisdiction-personalized-plan") {
        return personalizedRegionPlan;
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    createElement() {
      return makeNode();
    },
    body: makeNode(),
    documentElement: makeNode()
  };

  const context = {
    console,
    document,
    window: {
      location: { hash: "" },
      addEventListener() {},
      removeEventListener() {},
      innerWidth: 1440,
      sessionStorage,
      scrollTo() {},
      requestAnimationFrame(fn) {
        fn();
      }
    },
    location: { hash: "" },
    history: { replaceState() {} },
    navigator: { userAgent: "node" },
    requestAnimationFrame(fn) {
      fn();
    },
    sessionStorage,
    setTimeout,
    clearTimeout,
    Set,
    Map,
    URL,
    URLSearchParams,
    Intl,
    Date,
    Math
  };
  context.globalThis = context;

  vm.runInNewContext(script, context, { timeout: 5000 });
  return {
    personalizedRegionPlan,
    sessionStorage
  };
}

function renderClientResults(rawControlValues) {
  return buildDashboardClientHarness(rawControlValues).html;
}

function buildCompleteControls(overrides = {}) {
  return {
    path: "working-holiday",
    base: "student",
    age: "20-29",
    household: "with-spouse",
    education: "two-year",
    languageProfile: "guess:clb7",
    foreignExp: "1",
    canadianExp: "2",
    canadianJobSkill: "skilled",
    ee: "",
    jobOffer: "",
    ecaStatus: "completed",
    permitRemaining: "",
    budget: "",
    setting: "",
    advantage: "",
    koreaOccupation: "",
    koreaJobTitle: "",
    canadaOccupation: "",
    canadaJobTitle: "",
    targetOccupationPlan: "",
    foreignExpAlignment: "",
    degreeCareerPlan: "",
    ...overrides
  };
}

test("client render shows recommendations when ECA completed is the last required field", () => {
  const html = renderClientResults(buildCompleteControls());

  assert.doesNotMatch(html, /작성 필요|결과 계산 오류/);
  assert.match(html, /현재 조건에서 먼저 볼 주정부 추천 순위/);
  assert.match(html, /연방 \/ EE는 따로 보기/);
});

test("pageshow resync clears stale missing state and rerenders recommendations after browser restores values", () => {
  const harness = buildDashboardClientHarness(buildCompleteControls({
    ecaStatus: ""
  }));

  assert.match(harness.quickStartResults.innerHTML, /작성 필요/);
  const ecaFieldNode = harness.requiredFieldNodes.find((fieldNode) => fieldNode.dataset.requiredField === "ecaStatus");
  assert.ok(ecaFieldNode?.classList.contains("is-missing"));

  harness.controlByName.ecaStatus.value = "completed";
  harness.dispatchWindowEvent("pageshow", { persisted: true });

  assert.doesNotMatch(harness.quickStartResults.innerHTML, /작성 필요|결과 계산 오류/);
  assert.match(harness.quickStartResults.innerHTML, /현재 조건에서 먼저 볼 주정부 추천 순위/);
  assert.equal(ecaFieldNode?.classList.contains("is-missing"), false);
});

test("saved questionnaire state restores recommendations and required markers on fresh load", () => {
  const savedState = {
    controlValues: {
      ...buildCompleteControls()
    },
    activeQuickRegions: [
      "federal",
      "ontario",
      "alberta"
    ]
  };

  const harness = buildDashboardClientHarness(buildCompleteControls({
    path: "",
    base: "",
    age: "",
    household: "",
    education: "",
    languageProfile: "",
    foreignExp: "",
    canadianExp: "",
    canadianJobSkill: "",
    ecaStatus: ""
  }), {
    sessionStorage: {
      "mapleguide.dashboard.state.v2": JSON.stringify(savedState)
    }
  });

  assert.equal(harness.controlByName.ecaStatus.value, "completed");
  assert.doesNotMatch(harness.quickStartResults.innerHTML, /작성 필요|결과 계산 오류/);
  assert.match(harness.quickStartResults.innerHTML, /현재 조건에서 먼저 볼 주정부 추천 순위/);
});

test("typed supervisor title overrides broad service bucket with direct candidate guidance", () => {
  const html = renderClientResults(
    buildCompleteControls({
      canadaOccupation: "server-counter",
      canadaJobTitle: "Food Service Supervisor",
      targetOccupationPlan: "current-canada-job"
    })
  );

  assert.doesNotMatch(html, /작성 필요|결과 계산 오류/);
  assert.match(html, /정밀 title 후보: Food service supervisor \(TEER 2\)/);
  assert.match(html, /NOC-like 후보: Food service supervisors/);
  assert.match(html, /직군 축 후보: 서버 \/ 캐셔 \/ 바리스타 \/ food counter/);
  assert.match(html, /현재 title 기준으로는 lead \/ supervisor \/ coordinator 축으로 읽혀 비교가 쉬움/);
  assert.match(html, /food service supervisor는 front-line service보다 훨씬 직접 비교 가능한 title이에요/);
  assert.match(html, /Food service supervisor title 기준으로는 .* 쪽이 먼저 맞아요/);
  assert.match(html, /맞는 이유: 현재 title Food service supervisor/);
});

test("broad Korea service history is not treated as usable foreign skilled experience", () => {
  const html = renderClientResults(
    buildCompleteControls({
      koreaOccupation: "server-counter",
      koreaJobTitle: "Server",
      targetOccupationPlan: "previous-korea-job",
      foreignExp: "5",
      foreignExpAlignment: "same-skilled",
      canadaOccupation: "general",
      canadaJobTitle: ""
    })
  );

  assert.doesNotMatch(html, /작성 필요|결과 계산 오류/);
  assert.match(html, /해외 경력은 입력됐지만, 한국 role이 entry\/broad로 읽혀서 숙련 경력으로 바로 넣지 않고 있어요/);
  assert.doesNotMatch(html, /해외 숙련 경력 5년/);
});

test("dispatcher title narrows warehouse planning toward direct logistics route", () => {
  const html = renderClientResults(
    buildCompleteControls({
      canadaOccupation: "warehouse-logistics",
      canadaJobTitle: "Dispatcher",
      targetOccupationPlan: "current-canada-job"
    })
  );

  assert.doesNotMatch(html, /작성 필요|결과 계산 오류/);
  assert.match(html, /정밀 title 후보: Dispatcher \(TEER 2\)/);
  assert.match(html, /NOC-like 후보: Dispatchers/);
  assert.match(html, /해석 후보: Dispatcher \(TEER 2, direct candidate, NOC-like: Dispatchers \/ Transportation route and crew schedulers\)/);
  assert.match(html, /dispatcher는 warehouse broad role보다 훨씬 직접 비교 가능한 title이에요/);
  assert.match(html, /Dispatcher title 기준으로는 .* 쪽이 먼저 맞아요/);
  assert.match(html, /맞는 이유: 현재 title Dispatcher/);
});

test("tight budget plus expiring permit favors low-cost and employer extension actions", () => {
  const html = renderClientResults(
    buildCompleteControls({
      budget: "tight",
      jobOffer: "yes",
      permitRemaining: "6to12",
      base: "worker",
      path: "canadian-worker"
    })
  );

  assert.doesNotMatch(html, /작성 필요|결과 계산 오류/);
  assert.match(html, /가장 저비용 플랜부터: 영어·서류·직무 정리 먼저/);
  assert.match(html, /고용주 기반 비자 연장 가능성부터 확인/);
  assert.match(html, /비용 낮음|고용주 부담 중심/);
});

test("federal render exposes expanded score options for a skilled worker profile", () => {
  const html = renderClientResults(
    buildCompleteControls({
      path: "canadian-worker",
      base: "working-holiday",
      household: "with-spouse",
      age: "32",
      languageProfile: "official:clb6",
      foreignExp: "1",
      canadianExp: "2",
      canadianJobSkill: "skilled",
      ecaStatus: "completed",
      canadaOccupation: "cook-chef",
      canadaJobTitle: "Cook",
      targetOccupationPlan: "current-canada-job"
    })
  );

  assert.doesNotMatch(html, /작성 필요|결과 계산 오류/);
  assert.match(html, /점수 올리는 옵션 직접 체크해보기/);
  assert.match(html, /선택한 옵션 기준 대략 예상 CRS/);
  assert.match(html, /언어점수 CLB 9 이상 목표/);
  assert.match(html, /프랑스어 점수도 선택지에 포함/);
  assert.match(html, /캐나다 학교 1-2년 \+ 졸업 후 경력 플랜 같이 보기/);
  assert.match(html, /data-score-option/);
  assert.ok(html.indexOf("점수 올리는 옵션 직접 체크해보기") < html.indexOf("자세히 보기"));
});

test("score option panel exposes staged Canadian experience milestones without double-grouping metadata loss", () => {
  const html = renderClientResults(
    buildCompleteControls({
      path: "canadian-worker",
      base: "working-holiday",
      household: "single",
      age: "30-39",
      languageProfile: "official:clb8",
      foreignExp: "5",
      canadianExp: "3",
      canadianJobSkill: "skilled",
      ecaStatus: "completed",
      ee: "yes"
    })
  );

  assert.doesNotMatch(html, /작성 필요|결과 계산 오류/);
  assert.match(html, /캐나다 skilled 경력 4년까지 늘리기/);
  assert.match(html, /캐나다 skilled 경력 5년까지 늘리기/);
  assert.match(html, /선택한 옵션 기준 대략 (예상 CRS|연방 EE 참고점수) \d+점 \+\d+점 → \d+점/);
});

test("complete render persists recommendation snapshots with summed CRS lift", () => {
  const harness = buildDashboardClientHarness(buildCompleteControls({
    languageProfile: "official:clb7",
    foreignExp: "5",
    canadianExp: "4",
    canadianJobSkill: "skilled",
    ee: "yes"
  }));

  const savedState = JSON.parse(harness.sessionStorage.getItem("mapleguide.dashboard.state.v2"));
  assert.ok(savedState.recommendationSnapshots);
  assert.match(
    savedState.recommendationSnapshots.federal.improvementSummaryLabel,
    /예상 CRS \d+점 \+\d+점 → \d+점/
  );
});

test("jurisdiction page restores personalized plan from saved dashboard recommendations", () => {
  const dashboardHarness = buildDashboardClientHarness(buildCompleteControls({
    canadaOccupation: "office-admin",
    canadaJobTitle: "Administrative Assistant",
    targetOccupationPlan: "current-canada-job",
    ecaStatus: "completed"
  }));
  const savedState = dashboardHarness.sessionStorage.getItem("mapleguide.dashboard.state.v2");
  assert.ok(savedState, "expected saved dashboard state");
  const parsedState = JSON.parse(savedState);
  const recommendationId = Object.keys(parsedState.recommendationSnapshots || {}).find((id) => id !== "federal")
    || Object.keys(parsedState.recommendationSnapshots || {})[0];
  assert.ok(recommendationId, "expected at least one saved recommendation snapshot");

  const regionHarness = buildJurisdictionClientHarness(recommendationId, {
    sessionStorage: {
      "mapleguide.dashboard.state.v2": savedState
    }
  });

  assert.equal(regionHarness.personalizedRegionPlan.hidden, false);
  assert.match(regionHarness.personalizedRegionPlan.innerHTML, /메인에서 보던 내 상황 기준으로 이 주에서 먼저 할 것/);
  assert.match(regionHarness.personalizedRegionPlan.innerHTML, /지금 먼저 할 것/);
  assert.match(regionHarness.personalizedRegionPlan.innerHTML, /메인 추천으로 돌아가기/);
});
