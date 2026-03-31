import test from "node:test";
import assert from "node:assert/strict";
import {
  DASHBOARD_REQUIRED_FIELD_LABELS,
  DASHBOARD_OPTIONAL_DEFAULTS,
  buildCompletedDashboardRawAnswers,
  canRenderDashboardRecommendations,
  hasDashboardAnswerValue,
  getDashboardAnsweredRequiredFieldCount,
  getDashboardMissingRequiredFieldLabels,
  readDashboardRawAnswersFromControls,
  normalizeDashboardDependentAnswers
} from "../src/site/render-dashboard.js";

const COMPLETE_REQUIRED_ANSWERS = {
  path: "working-holiday",
  base: "working-holiday",
  age: "32",
  household: "single",
  education: "bachelor",
  languageProfile: "official:clb7",
  foreignExp: "3",
  canadianExp: "1",
  canadianJobSkill: "non-skilled",
  ecaStatus: "completed"
};

test("required field helpers treat selected age as answered", () => {
  assert.deepEqual(getDashboardMissingRequiredFieldLabels(COMPLETE_REQUIRED_ANSWERS), []);
  assert.equal(
    getDashboardAnsweredRequiredFieldCount(COMPLETE_REQUIRED_ANSWERS),
    Object.keys(DASHBOARD_REQUIRED_FIELD_LABELS).length
  );
});

test("required field helpers treat string zero values as answered", () => {
  const zeroValueAnswers = {
    ...COMPLETE_REQUIRED_ANSWERS,
    foreignExp: "0",
    canadianExp: "0",
    canadianJobSkill: "not-working"
  };

  assert.equal(hasDashboardAnswerValue("0"), true);
  assert.deepEqual(getDashboardMissingRequiredFieldLabels(zeroValueAnswers), []);
});

test("required field helpers still flag empty age as missing", () => {
  const missingAgeAnswers = {
    ...COMPLETE_REQUIRED_ANSWERS,
    age: ""
  };

  assert.deepEqual(getDashboardMissingRequiredFieldLabels(missingAgeAnswers), ["나이"]);
  assert.equal(
    getDashboardAnsweredRequiredFieldCount(missingAgeAnswers),
    Object.keys(DASHBOARD_REQUIRED_FIELD_LABELS).length - 1
  );
});

test("required-only answers are enough to render recommendations once optional defaults are applied", () => {
  const completed = buildCompletedDashboardRawAnswers(COMPLETE_REQUIRED_ANSWERS);

  assert.equal(canRenderDashboardRecommendations(COMPLETE_REQUIRED_ANSWERS), true);
  assert.equal(canRenderDashboardRecommendations(completed), true);
  assert.equal(completed.ee, DASHBOARD_OPTIONAL_DEFAULTS.ee);
  assert.equal(completed.jobOffer, DASHBOARD_OPTIONAL_DEFAULTS.jobOffer);
  assert.equal(completed.targetOccupationPlan, DASHBOARD_OPTIONAL_DEFAULTS.targetOccupationPlan);
});

test("dependent normalization forces no-work experience to not-working", () => {
  const normalized = normalizeDashboardDependentAnswers({
    ...COMPLETE_REQUIRED_ANSWERS,
    canadianExp: "0",
    canadianJobSkill: "skilled",
    permitRemaining: "unsure"
  });

  assert.equal(normalized.canadianJobSkill, "not-working");
});

test("dependent normalization trims titles and clears outside-canada permit mismatch", () => {
  const normalized = normalizeDashboardDependentAnswers({
    ...COMPLETE_REQUIRED_ANSWERS,
    base: "outside",
    permitRemaining: "unsure",
    koreaJobTitle: "  Office Administrator  ",
    canadaJobTitle: "  Server  "
  });

  assert.equal(normalized.permitRemaining, "not-applicable");
  assert.equal(normalized.koreaJobTitle, "Office Administrator");
  assert.equal(normalized.canadaJobTitle, "Server");
});

test("readDashboardRawAnswersFromControls captures required select values including age", () => {
  const rawAnswers = readDashboardRawAnswersFromControls([
    { tagName: "SELECT", name: "path", value: "working-holiday", disabled: false },
    { tagName: "SELECT", name: "base", value: "working-holiday", disabled: false },
    { tagName: "SELECT", name: "age", value: "32", disabled: false },
    { tagName: "SELECT", name: "household", value: "single", disabled: false },
    { tagName: "SELECT", name: "education", value: "bachelor", disabled: false },
    { tagName: "SELECT", name: "languageProfile", value: "official:clb7", disabled: false },
    { tagName: "SELECT", name: "foreignExp", value: "3", disabled: false },
    { tagName: "SELECT", name: "canadianExp", value: "1", disabled: false },
    { tagName: "SELECT", name: "canadianJobSkill", value: "non-skilled", disabled: false },
    { tagName: "SELECT", name: "ecaStatus", value: "completed", disabled: false }
  ]);

  assert.equal(rawAnswers.age, "32");
  assert.deepEqual(getDashboardMissingRequiredFieldLabels(rawAnswers), []);
  assert.equal(canRenderDashboardRecommendations(rawAnswers), true);
});

test("readDashboardRawAnswersFromControls ignores disabled and unchecked controls", () => {
  const rawAnswers = readDashboardRawAnswersFromControls([
    { tagName: "SELECT", name: "path", value: "working-holiday", disabled: false },
    { tagName: "SELECT", name: "base", value: "working-holiday", disabled: false },
    { tagName: "SELECT", name: "age", value: "32", disabled: false },
    { tagName: "SELECT", name: "household", value: "single", disabled: false },
    { tagName: "SELECT", name: "education", value: "bachelor", disabled: false },
    { tagName: "SELECT", name: "languageProfile", value: "official:clb7", disabled: false },
    { tagName: "SELECT", name: "foreignExp", value: "3", disabled: false },
    { tagName: "SELECT", name: "canadianExp", value: "1", disabled: false },
    { tagName: "SELECT", name: "canadianJobSkill", value: "non-skilled", disabled: false },
    { tagName: "SELECT", name: "ecaStatus", value: "completed", disabled: false },
    { tagName: "INPUT", type: "checkbox", name: "ghostChecked", value: "yes", checked: false, disabled: false },
    { tagName: "INPUT", type: "radio", name: "ghostRadio", value: "yes", checked: false, disabled: false },
    { tagName: "SELECT", name: "disabledField", value: "ignored", disabled: true }
  ]);

  assert.equal(rawAnswers.ghostChecked, undefined);
  assert.equal(rawAnswers.ghostRadio, undefined);
  assert.equal(rawAnswers.disabledField, undefined);
  assert.equal(rawAnswers.age, "32");
});

test("required recommendations still render when ECA is canadian-degree", () => {
  const rawAnswers = {
    ...COMPLETE_REQUIRED_ANSWERS,
    ecaStatus: "canadian-degree"
  };

  assert.deepEqual(getDashboardMissingRequiredFieldLabels(rawAnswers), []);
  assert.equal(canRenderDashboardRecommendations(rawAnswers), true);
});

test("required recommendations still render when ECA is unsure", () => {
  const rawAnswers = {
    ...COMPLETE_REQUIRED_ANSWERS,
    ecaStatus: "unsure"
  };

  assert.deepEqual(getDashboardMissingRequiredFieldLabels(rawAnswers), []);
  assert.equal(canRenderDashboardRecommendations(rawAnswers), true);
});
