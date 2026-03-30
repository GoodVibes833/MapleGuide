import test from "node:test";
import assert from "node:assert/strict";
import { getLanguageImprovementActions } from "../src/site/recommendation-helpers.js";

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
