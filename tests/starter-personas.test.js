import test from "node:test";
import assert from "node:assert/strict";
import {
  DASHBOARD_REQUIRED_FIELD_LABELS,
  STARTER_PERSONAS,
  getDashboardMissingRequiredFieldLabels
} from "../src/site/render-dashboard.js";

test("starter personas fill all required dashboard fields", () => {
  for (const persona of STARTER_PERSONAS) {
    const missing = getDashboardMissingRequiredFieldLabels(persona.fields, DASHBOARD_REQUIRED_FIELD_LABELS);
    assert.deepEqual(
      missing,
      [],
      `${persona.id} starter persona should not leave required fields empty`
    );
  }
});

test("office-to-office starter persona keeps recommendation-critical fields populated", () => {
  const persona = STARTER_PERSONAS.find((item) => item.id === "office-to-office");
  assert.ok(persona);
  assert.equal(persona.fields.path, "canadian-worker");
  assert.equal(persona.fields.base, "worker");
  assert.equal(persona.fields.age, "33");
  assert.equal(persona.fields.canadianJobSkill, "skilled");
  assert.equal(persona.fields.koreaOccupation, "office-admin");
  assert.equal(persona.fields.canadaOccupation, "office-admin");
  assert.equal(persona.fields.targetOccupationPlan, "current-canada-job");
});
