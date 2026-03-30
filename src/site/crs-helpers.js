export function countsCanadianExperienceForCrs(answers) {
  return answers.canadianExp !== "0" && answers.canadianJobSkill === "skilled";
}

export function estimateCanadianExperienceCrsPoints(answers, withSpouse) {
  if (!countsCanadianExperienceForCrs(answers)) {
    return 0;
  }

  const points = withSpouse
    ? { "0": 0, "1": 35, "2": 46, "3": 56, "4": 63, "5": 70 }
    : { "0": 0, "1": 40, "2": 53, "3": 64, "4": 72, "5": 80 };

  return points[answers.canadianExp] ?? 0;
}

export function describeCanadianExperienceCrsTreatment(answers) {
  if (answers.canadianExp === "0") {
    return null;
  }

  if (answers.canadianJobSkill === "skilled") {
    return "입력한 캐나다 skilled 경력은 CRS에 반영했습니다.";
  }

  if (answers.canadianJobSkill === "non-skilled") {
    return "입력한 캐나다 경력은 TEER 4-5 기준이라 CRS 캐나다 경력 점수에는 넣지 않았습니다.";
  }

  if (answers.canadianJobSkill === "mixed") {
    return "캐나다 경력의 NOC·TEER가 아직 불명확해서 CRS 캐나다 경력 점수에는 보수적으로 넣지 않았습니다.";
  }

  return "캐나다 경력 연수는 입력했지만 경력 성격이 설정되지 않아 CRS 캐나다 경력 점수에는 넣지 않았습니다.";
}
