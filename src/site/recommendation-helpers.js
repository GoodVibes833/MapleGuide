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
