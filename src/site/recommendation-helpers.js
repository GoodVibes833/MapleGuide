export function getLanguageImprovementActions(answers) {
  const actions = [];

  if (answers.languageScoreStatus === "none" || answers.languageScoreStatus === "booked") {
    actions.push("language-proof");
  }

  if (["clb6", "clb7", "clb8"].includes(answers.english)) {
    actions.push("language-clb9");
  }

  return actions;
}

export function shouldSuggestSkilledSwitch(answers) {
  return answers.canadianJobSkill === "non-skilled"
    && (
      answers.canadianExp !== "0"
      || ["working-holiday", "pgwp", "worker"].includes(answers.base)
      || ["working-holiday", "pgwp-pr", "canadian-worker"].includes(answers.path)
    );
}

export function getNextCanadianExperienceYear(answers) {
  if (answers.canadianJobSkill !== "skilled") {
    return null;
  }

  const currentYears = Number.parseInt(answers.canadianExp, 10) || 0;

  if (currentYears < 1 || currentYears >= 5) {
    return null;
  }

  return String(currentYears + 1);
}
