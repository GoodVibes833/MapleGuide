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
