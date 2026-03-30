import test from "node:test";
import assert from "node:assert/strict";
import {
  countsCanadianExperienceForCrs,
  describeCanadianExperienceCrsTreatment,
  estimateCanadianExperienceCrsPoints
} from "../src/site/crs-helpers.js";

test("skilled Canadian experience counts for CRS even if current base is outside Canada", () => {
  const answers = {
    base: "outside",
    canadianExp: "1",
    canadianJobSkill: "skilled"
  };

  assert.equal(countsCanadianExperienceForCrs(answers), true);
  assert.equal(estimateCanadianExperienceCrsPoints(answers, false), 40);
  assert.match(describeCanadianExperienceCrsTreatment(answers), /CRS에 반영/);
});

test("non-skilled Canadian experience does not count for CRS", () => {
  const answers = {
    base: "worker",
    canadianExp: "2",
    canadianJobSkill: "non-skilled"
  };

  assert.equal(countsCanadianExperienceForCrs(answers), false);
  assert.equal(estimateCanadianExperienceCrsPoints(answers, false), 0);
  assert.match(describeCanadianExperienceCrsTreatment(answers), /TEER 4-5/);
});

test("entered Canadian years without experience type stays out of CRS", () => {
  const answers = {
    base: "working-holiday",
    canadianExp: "1",
    canadianJobSkill: "not-working"
  };

  assert.equal(countsCanadianExperienceForCrs(answers), false);
  assert.equal(estimateCanadianExperienceCrsPoints(answers, true), 0);
  assert.match(describeCanadianExperienceCrsTreatment(answers), /경력 성격이 설정되지 않아/);
});
