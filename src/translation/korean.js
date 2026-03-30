const GLOSSARY = [
  ["Express Entry", "익스프레스 엔트리"],
  ["Expression of Interest", "관심의사표현"],
  ["Ontario Immigrant Nominee Program", "온타리오 이민 후보 프로그램"],
  ["Provincial Nominee Program", "주정부 이민 후보 프로그램"],
  ["British Columbia", "브리티시컬럼비아"],
  ["Manitoba", "매니토바"],
  ["New Brunswick", "뉴브런즈윅"],
  ["Prince Edward Island", "프린스에드워드아일랜드"],
  ["Expression of Interest draws", "관심의사표현 드로우"],
  ["invitation and selection rounds", "초청 및 선발 라운드"],
  ["Rounds of invitations", "초청 라운드"],
  ["rounds of invitations", "초청 라운드"],
  ["Invitations to apply", "신청 초청"],
  ["invitations to apply", "신청 초청"],
  ["draws", "드로우"],
  ["draw", "드로우"],
  ["Draw", "드로우"],
  ["Updates", "업데이트"],
  ["Minimum score", "최저 점수"],
  ["Invitations", "초청 수"],
  ["Category", "카테고리"],
  ["Tech", "테크"],
  ["Childcare", "보육"],
  ["Construction", "건설"],
  ["Skilled Worker Overseas", "해외 숙련인력"],
  ["Labour & Express Entry", "노동시장·익스프레스 엔트리"],
  ["Business Work Permit Entrepreneur", "사업가 워크퍼밋"],
  ["Employment in New Brunswick", "뉴브런즈윅 취업"],
  ["New Brunswick Interests", "뉴브런즈윅 관심군"],
  ["Strategic Initiative", "전략 이니셔티브"],
  ["Healthcare", "보건의료"],
  ["trades", "기술직"],
  ["updates", "업데이트"]
];

const FIELD_LABELS = {
  roundDate: "라운드 날짜",
  cutoffScore: "최저 CRS 점수",
  invitationsIssued: "초청장 수",
  rankNeeded: "필요 순위",
  date: "발표일",
  category: "카테고리",
  minimumScore: "최저 점수",
  invitations: "초청 수",
  stream: "스트림",
  rankingScore: "최저 랭킹 점수",
  labourExpressEntryInvitations: "노동시장·익스프레스 엔트리 초청 수",
  entrepreneurInvitations: "사업가 초청 수",
  candidatesInvited: "초청 인원",
  notes: "비고"
};

const PROGRAM_LABELS = {
  "express-entry": "익스프레스 엔트리",
  oinp: "OINP",
  "bc-pnp": "BC PNP",
  mpnp: "MPNP",
  "pei-pnp": "PEI PNP",
  nbpnp: "뉴브런즈윅 PNP"
};

const EVENT_LABELS = {
  draw: "초청 라운드",
  "program-update": "프로그램 업데이트",
  "intake-update": "접수 업데이트",
  "page-refresh": "페이지 갱신"
};

function translatePhrase(value = "") {
  let translated = value;
  for (const [source, target] of GLOSSARY) {
    translated = translated.replaceAll(source, target);
  }
  return translated;
}

function translateFactLine(fact = "") {
  const separatorIndex = fact.indexOf(":");
  if (separatorIndex === -1) {
    return translatePhrase(fact);
  }

  const key = fact.slice(0, separatorIndex).trim();
  const value = fact.slice(separatorIndex + 1).trim();
  const label = FIELD_LABELS[key] ?? key;
  return `${label}: ${translatePhrase(value)}`;
}

function formatMetricSentence(metrics) {
  const parts = [];
  for (const [key, value] of Object.entries(metrics)) {
    if (!value) {
      continue;
    }
    const label = FIELD_LABELS[key] ?? key;
    parts.push(`${label}: ${translatePhrase(value)}`);
  }
  return parts;
}

function buildLead(update) {
  const programLabel = PROGRAM_LABELS[update.program] ?? translatePhrase(update.sourceName);
  const eventLabel = EVENT_LABELS[update.eventType] ?? "업데이트";
  return `${programLabel} ${eventLabel}입니다.`;
}

export function buildKoreanSummary(update) {
  const metricLines = formatMetricSentence(update.metrics);
  const translatedFacts = update.facts.slice(0, 3).map((fact) => translateFactLine(fact));

  const summaryParts = [buildLead(update)];
  if (update.publishedAt) {
    summaryParts.push(`발표일은 ${update.publishedAt}입니다.`);
  }

  if (metricLines.length > 0) {
    summaryParts.push(metricLines.join(" / "));
  } else if (translatedFacts.length > 0) {
    summaryParts.push(`핵심 내용: ${translatedFacts.join(" / ")}`);
  } else if (update.summaryEn) {
    summaryParts.push(translatePhrase(update.summaryEn));
  }

  return {
    titleKo: translatePhrase(update.title),
    summaryKo: summaryParts.join(" "),
    metricLinesKo: metricLines,
    bulletsKo: translatedFacts,
    disclaimerKo: "세부 자격요건과 예외사항은 반드시 원문 공지를 확인하세요."
  };
}
