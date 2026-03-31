import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { renderDashboard } from "../src/site/render-dashboard.js";

class DummyClassList {
  add() {}
  remove() {}
  toggle() {}
  contains() {
    return false;
  }
}

function makeNode(overrides = {}) {
  return {
    dataset: {},
    style: {},
    hidden: false,
    open: false,
    value: "",
    innerHTML: "",
    textContent: "",
    classList: new DummyClassList(),
    addEventListener() {},
    removeEventListener() {},
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
    matches() {
      return false;
    },
    ...overrides
  };
}

function renderClientResults(rawControlValues) {
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
  return quickStartResults.innerHTML;
}

test("client render shows recommendations when ECA completed is the last required field", () => {
  const html = renderClientResults({
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
    degreeCareerPlan: ""
  });

  assert.doesNotMatch(html, /작성 필요|결과 계산 오류/);
  assert.match(html, /현재 조건에서 먼저 볼 주정부 추천 순위/);
  assert.match(html, /연방 \/ EE는 따로 보기/);
});
