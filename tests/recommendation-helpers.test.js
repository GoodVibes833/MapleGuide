import test from "node:test";
import assert from "node:assert/strict";
import {
  getLanguageImprovementActions,
  getNextCanadianExperienceYear,
  shouldSuggestSkilledSwitch
} from "../src/site/recommendation-helpers.js";

test("booked CLB 8 shows both proof and CLB 9 upgrade actions", () => {
  const actions = getLanguageImprovementActions({
    languageScoreStatus: "booked",
    english: "clb8"
  });

  assert.deepEqual(actions, ["language-proof", "language-clb9"]);
});

test("official CLB 8 still suggests CLB 9 upgrade", () => {
  const actions = getLanguageImprovementActions({
    languageScoreStatus: "official",
    english: "clb8"
  });

  assert.deepEqual(actions, ["language-clb9"]);
});

test("unknown English only suggests proof, not CLB 9 upgrade", () => {
  const actions = getLanguageImprovementActions({
    languageScoreStatus: "none",
    english: "unknown"
  });

  assert.deepEqual(actions, ["language-proof"]);
});

test("pgwp profile with non-skilled Canadian work still suggests skilled switch", () => {
  assert.equal(
    shouldSuggestSkilledSwitch({
      base: "pgwp",
      path: "pgwp-pr",
      canadianExp: "2",
      canadianJobSkill: "non-skilled"
    }),
    true
  );
});

test("already skilled Canadian work does not suggest skilled switch", () => {
  assert.equal(
    shouldSuggestSkilledSwitch({
      base: "worker",
      path: "canadian-worker",
      canadianExp: "2",
      canadianJobSkill: "skilled"
    }),
    false
  );
});

test("skilled Canadian work suggests the next year milestone until 5 years", () => {
  assert.equal(
    getNextCanadianExperienceYear({
      canadianExp: "2",
      canadianJobSkill: "skilled"
    }),
    "3"
  );

  assert.equal(
    getNextCanadianExperienceYear({
      canadianExp: "5",
      canadianJobSkill: "skilled"
    }),
    null
  );
});
