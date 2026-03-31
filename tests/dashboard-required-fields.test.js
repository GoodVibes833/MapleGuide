import test from "node:test";
import assert from "node:assert/strict";
import {
  DASHBOARD_REQUIRED_FIELD_LABELS,
  hasDashboardAnswerValue,
  getDashboardAnsweredRequiredFieldCount,
  getDashboardMissingRequiredFieldLabels
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
