export const STREAM_TAGS = {
  ee: "EE 연계",
  jobOffer: "잡오퍼",
  graduate: "졸업자",
  entrepreneur: "사업/창업",
  french: "프랑스어",
  health: "보건",
  trades: "기술직",
  regional: "지역/커뮤니티",
  localExperience: "현지경력"
};

const JURISDICTION_LIFESTYLE = {
  federal: { costLevel: 2, tuitionLevel: 2, metroLevel: 2, regionalLevel: 2 },
  ontario: { costLevel: 3, tuitionLevel: 3, metroLevel: 3, regionalLevel: 1 },
  "british-columbia": { costLevel: 3, tuitionLevel: 3, metroLevel: 3, regionalLevel: 2 },
  alberta: { costLevel: 2, tuitionLevel: 2, metroLevel: 2, regionalLevel: 2 },
  saskatchewan: { costLevel: 1, tuitionLevel: 1, metroLevel: 1, regionalLevel: 3 },
  manitoba: { costLevel: 1, tuitionLevel: 1, metroLevel: 2, regionalLevel: 3 },
  quebec: { costLevel: 2, tuitionLevel: 2, metroLevel: 3, regionalLevel: 2 },
  "new-brunswick": { costLevel: 1, tuitionLevel: 1, metroLevel: 1, regionalLevel: 3 },
  "prince-edward-island": { costLevel: 2, tuitionLevel: 2, metroLevel: 1, regionalLevel: 3 },
  "nova-scotia": { costLevel: 2, tuitionLevel: 2, metroLevel: 2, regionalLevel: 2 },
  "newfoundland-and-labrador": { costLevel: 1, tuitionLevel: 1, metroLevel: 1, regionalLevel: 3 },
  yukon: { costLevel: 3, tuitionLevel: 2, metroLevel: 1, regionalLevel: 3 },
  "northwest-territories": { costLevel: 3, tuitionLevel: 2, metroLevel: 1, regionalLevel: 3 },
  nunavut: { costLevel: 3, tuitionLevel: 2, metroLevel: 1, regionalLevel: 3 }
};

const JURISDICTION_SELECTION_MODELS = {
  federal: {
    badgeKo: "CRS 점수제",
    detailKo: "자격이 되면 EE 풀에 들어가고 CRS 순위와 라운드 유형으로 초청되는 구조입니다.",
    scoreViewKo: "컷오프와 직접 비교",
    focusKo: "CRS · category-based selection",
    intakeKo: "라운드 초청",
    eeScoreLabelKo: "예상 CRS"
  },
  ontario: {
    badgeKo: "EOI + EE NOI",
    detailKo: "Employer/Graduate는 OINP EOI, EE 연계 스트림은 NOI 방식이라 stream별로 보는 법이 다릅니다.",
    scoreViewKo: "일부는 점수, 일부는 stream 조건",
    focusKo: "스트림 구분 · 직군 타깃",
    intakeKo: "stream별 draw/NOI",
    eeScoreLabelKo: "EE 참고점수"
  },
  "british-columbia": {
    badgeKo: "등록점수 + 타깃 초청",
    detailKo: "Skills Immigration는 등록 후 초청과 최소점수가 있고, 카테고리 타깃 초청이 함께 작동합니다.",
    scoreViewKo: "최저점 공개",
    focusKo: "등록점수 · 카테고리 타깃",
    intakeKo: "초청 라운드",
    eeScoreLabelKo: "EE 참고점수"
  },
  alberta: {
    badgeKo: "EOI + 우선순위",
    detailKo: "AAIP는 EOI나 EE를 보더라도 알버타 우선산업, 지역, 고용 연결을 함께 보는 혼합형에 가깝습니다.",
    scoreViewKo: "점수 일부 공개",
    focusKo: "우선산업 · 지역추천 · EE",
    intakeKo: "EOI/우선 초청",
    eeScoreLabelKo: "EE 참고점수"
  },
  saskatchewan: {
    badgeKo: "요건형 + 일부 배정",
    detailKo: "현재는 pathway별 자격과 sector allocation이 더 중요하고, 모든 경로를 한 점수제로 보면 안 됩니다.",
    scoreViewKo: "항상 단일 점수제 아님",
    focusKo: "pathway 자격 · sector allocation",
    intakeKo: "경로별 상이",
    eeScoreLabelKo: "EE 참고점수"
  },
  manitoba: {
    badgeKo: "EOI 드로우",
    detailKo: "EOI 점수와 주 연결성으로 랭킹되고, 드로우마다 전략적 초청 조건이 붙을 수 있습니다.",
    scoreViewKo: "최저점 공개",
    focusKo: "EOI 점수 · 주 연결성",
    intakeKo: "EOI draw",
    eeScoreLabelKo: "EE 참고점수"
  },
  quebec: {
    badgeKo: "퀘벡 별도 체계",
    detailKo: "연방 EE가 아니라 퀘벡 자체 selection program과 pilot 기준으로 봐야 하는 별도 시스템입니다.",
    scoreViewKo: "CRS 직접 미사용",
    focusKo: "PSTQ/파일럿 자격",
    intakeKo: "별도 공고형",
    eeScoreLabelKo: "연방 참고점수"
  },
  "new-brunswick": {
    badgeKo: "경로별 별도 선발",
    detailKo: "Skilled Worker, EE, Strategic Initiative, pilot마다 신청 구조와 타깃 조건이 달라 한 방식으로 보면 안 됩니다.",
    scoreViewKo: "공개 기준 다양함",
    focusKo: "고용주 · EE pathway · 파일럿",
    intakeKo: "stream별 상이",
    eeScoreLabelKo: "EE 참고점수"
  },
  "prince-edward-island": {
    badgeKo: "EOI + 노동시장 우선",
    detailKo: "PEI는 EOI 풀을 두고도 실제 초청은 보건·기술·수요직군 같은 노동시장 우선순위를 강하게 반영합니다.",
    scoreViewKo: "드로우 결과 공개",
    focusKo: "우선직군 · 고용주 · EOI",
    intakeKo: "EOI draw",
    eeScoreLabelKo: "EE 참고점수"
  },
  "nova-scotia": {
    badgeKo: "통합 스트림 + 타깃 선발",
    detailKo: "2026 통합 스트림 체계에서 stream 자격과 정책 우선순위가 함께 작동해 점수 하나로 설명되지 않습니다.",
    scoreViewKo: "점수보다 stream 자격",
    focusKo: "통합 스트림 · 타깃 초청",
    intakeKo: "정책/stream 중심",
    eeScoreLabelKo: "EE 참고점수"
  },
  "newfoundland-and-labrador": {
    badgeKo: "2단계 EOI",
    detailKo: "먼저 EOI를 제출하고 초청받은 뒤 정식 신청하는 구조라, 포털 초청 여부와 고용 연결이 중요합니다.",
    scoreViewKo: "점수보다 초청 구조",
    focusKo: "EOI 초청 · 포털 · 고용주",
    intakeKo: "EOI 후 초청",
    eeScoreLabelKo: "EE 참고점수"
  },
  yukon: {
    badgeKo: "EOI intake + 우선점수",
    detailKo: "정해진 intake 기간에 EOI를 받고 우선순위 점수로 초청하는 구조입니다.",
    scoreViewKo: "우선점수형",
    focusKo: "intake 시기 · 고용주 · 우선점수",
    intakeKo: "기간제 intake",
    eeScoreLabelKo: "EE 참고점수"
  },
  "northwest-territories": {
    badgeKo: "EOI + intake 혼합",
    detailKo: "Employer-Driven는 EOI selection process, 다른 stream은 intake 구조가 달라 혼합형으로 봐야 합니다.",
    scoreViewKo: "stream별 다름",
    focusKo: "Employer-Driven EOI · intake",
    intakeKo: "혼합형",
    eeScoreLabelKo: "EE 참고점수"
  },
  nunavut: {
    badgeKo: "주정부 경로 없음",
    detailKo: "누나붓 자체 nominee program이 없어 연방 경로나 다른 연방 프로그램을 먼저 봐야 합니다.",
    scoreViewKo: "연방 기준 참고",
    focusKo: "연방 경로",
    intakeKo: "주정부 없음",
    eeScoreLabelKo: "연방 참고점수"
  }
};

function levelToLabel(level) {
  if (level <= 1) {
    return "낮음";
  }

  if (level >= 3) {
    return "높음";
  }

  return "보통";
}

function getLifestyleProfile(meta) {
  const profile = JURISDICTION_LIFESTYLE[meta.id] ?? JURISDICTION_LIFESTYLE.federal;

  return {
    ...profile,
    costLabelKo: levelToLabel(profile.costLevel),
    tuitionLabelKo: levelToLabel(profile.tuitionLevel),
    metroLabelKo: levelToLabel(profile.metroLevel),
    regionalLabelKo: levelToLabel(profile.regionalLevel)
  };
}

export const SCENARIOS = [
  {
    id: "ee",
    titleKo: "EE 프로필이 있거나 만들 예정",
    descriptionKo: "연방 Express Entry와 직접 연결되는 주를 먼저 보세요.",
    tag: STREAM_TAGS.ee
  },
  {
    id: "job-offer",
    titleKo: "캐나다 잡오퍼가 있거나 받을 수 있음",
    descriptionKo: "고용주 오퍼가 중요한 주를 먼저 비교하세요.",
    tag: STREAM_TAGS.jobOffer
  },
  {
    id: "graduate",
    titleKo: "캐나다 유학 후 이민을 보고 있음",
    descriptionKo: "졸업자 전용 또는 졸업자 친화 경로가 있는 주를 먼저 보세요.",
    tag: STREAM_TAGS.graduate
  },
  {
    id: "entrepreneur",
    titleKo: "사업·창업 쪽을 보고 있음",
    descriptionKo: "근로자 이민이 아니라 사업 운영 기준으로 보는 주입니다.",
    tag: STREAM_TAGS.entrepreneur
  },
  {
    id: "french",
    titleKo: "프랑스어 강점이 있음",
    descriptionKo: "프랑스어가 직접 강점이 되는 경로를 먼저 확인하세요.",
    tag: STREAM_TAGS.french
  },
  {
    id: "regional",
    titleKo: "대도시보다 지역·커뮤니티 경로를 찾는 중",
    descriptionKo: "지역 커뮤니티 또는 rural 성격이 있는 경로를 모아봅니다.",
    tag: STREAM_TAGS.regional
  }
];

export function flattenProfileStreams(profile) {
  return (profile?.streamGroups ?? []).flatMap((group) =>
    group.streams.map((stream) => ({
      ...stream,
      groupTitleKo: group.titleKo
    }))
  );
}

export function deriveProgramSystem(meta) {
  if (meta.id === "federal") {
    return "연방 Express Entry 선발 시스템";
  }

  if (meta.id === "quebec") {
    return "퀘벡 별도 경제이민 체계";
  }

  if (meta.id === "nunavut") {
    return "별도 주정부·준주 nomination program 없음";
  }

  return `${meta.labelKo} 주정부·준주 이민 프로그램`;
}

export function deriveStreamTags(stream) {
  const haystack = `${stream.nameKo} ${stream.audienceKo} ${stream.noteKo ?? ""}`.toLowerCase();
  const tags = [];

  const maybePush = (label, patterns) => {
    if (tags.includes(label)) {
      return;
    }

    if (patterns.some((pattern) => haystack.includes(pattern))) {
      tags.push(label);
    }
  };

  maybePush(STREAM_TAGS.ee, ["express entry", " ee", "ee ", "human capital priorities"]);
  maybePush(STREAM_TAGS.jobOffer, ["employer", "job offer", "work permit", "고용주", "잡오퍼"]);
  maybePush(STREAM_TAGS.graduate, ["graduate", "student", "졸업"]);
  maybePush(STREAM_TAGS.entrepreneur, [
    "entrepreneur",
    "business",
    "strategic project",
    "farm",
    "창업",
    "사업"
  ]);
  maybePush(STREAM_TAGS.french, ["french", "francophone", "프랑스어"]);
  maybePush(STREAM_TAGS.health, ["health", "physician", "nurse", "보건"]);
  maybePush(STREAM_TAGS.trades, ["trade", "trades", "tech", "기술직", "기술"]);
  maybePush(STREAM_TAGS.regional, [
    "regional",
    "rural",
    "community",
    "communities",
    "지역",
    "rural renewal"
  ]);
  maybePush(STREAM_TAGS.localExperience, [
    "canadian experience",
    "saskatchewan experience",
    "experience",
    "opportunity",
    "current worker"
  ]);

  return tags.slice(0, 4);
}

function summarizePresence(count, total, { none = "없음", one = "일부", many = "많음" } = {}) {
  if (count <= 0) {
    return none;
  }

  if (count === 1) {
    return one;
  }

  if (count >= Math.max(2, Math.ceil(total * 0.4))) {
    return many;
  }

  return "있음";
}

function buildTagCounts(streams) {
  const counts = new Map(Object.values(STREAM_TAGS).map((tag) => [tag, 0]));

  for (const stream of streams) {
    for (const tag of deriveStreamTags(stream)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return counts;
}

function buildWhoFor(meta, statuses, streams) {
  if (meta.id === "nunavut") {
    return ["주정부 nomination보다 연방 경로를 먼저 보려는 사람", "북부 정착 정보를 함께 확인하려는 사람"];
  }

  if (meta.id === "federal") {
    return ["EE 풀 진입 가능 여부를 먼저 확인하려는 사람", "주정부보다 연방 경제이민부터 보고 싶은 사람"];
  }

  if (meta.id === "quebec") {
    return ["퀘벡 별도 체계로 지원하려는 사람", "PSTQ와 파일럿 프로그램 차이를 먼저 이해하려는 사람"];
  }

  const items = [];

  if (statuses.jobOffer !== "없음") {
    items.push("해당 주 고용주 오퍼가 있거나 받을 수 있는 사람");
  }
  if (statuses.graduate !== "없음") {
    items.push("캐나다 또는 해당 주 학위 기반 경로를 찾는 사람");
  }
  if (statuses.ee !== "없음") {
    items.push("Express Entry와 연결되는 주를 찾는 사람");
  }
  if (statuses.entrepreneur !== "없음") {
    items.push("사업·창업 경로를 찾는 사람");
  }
  if (statuses.french !== "없음") {
    items.push("프랑스어 강점을 활용하려는 사람");
  }
  if (statuses.regional !== "없음") {
    items.push("대도시 외 지역·커뮤니티 경로를 보고 싶은 사람");
  }

  if (items.length === 0 && streams[0]?.audienceKo) {
    items.push(streams[0].audienceKo);
  }

  return items.slice(0, 3);
}

function buildFirstChecks(meta, statuses) {
  if (meta.id === "nunavut") {
    return [
      "Nunavut 자체 nominee program이 없다는 점을 먼저 확인",
      "연방 Express Entry 또는 기타 연방 경로가 맞는지 검토",
      "정착 가능 지역과 생활 정보는 별도 확인"
    ];
  }

  if (meta.id === "federal") {
    return [
      "CEC · FSWP · FSTP 중 어떤 프로그램 자격이 되는지 확인",
      "CRS 점수와 최근 라운드 컷오프 비교",
      "카테고리 기반 선발 대상에 해당하는지 검토"
    ];
  }

  if (meta.id === "quebec") {
    return [
      "퀘벡은 별도 체계라는 점부터 이해",
      "PSTQ 4개 stream 중 어디에 해당하는지 확인",
      "일반 skilled worker와 파일럿 프로그램을 구분해서 보기"
    ];
  }

  const checks = [];

  if (statuses.ee !== "없음") {
    checks.push("Express Entry 프로필이 필요한지 여부");
  }
  if (statuses.jobOffer !== "없음") {
    checks.push("해당 주 고용주 오퍼 또는 현재 근무 요건");
  }
  if (statuses.graduate !== "없음") {
    checks.push("캐나다 또는 해당 주 학위 요건");
  }
  if (statuses.regional !== "없음") {
    checks.push("지역·커뮤니티 참여 조건이 있는지");
  }
  if (statuses.entrepreneur !== "없음") {
    checks.push("사업 자금, 순자산, 운영 계획 요건");
  }
  if (statuses.french !== "없음") {
    checks.push("프랑스어 점수 또는 불어 사용 능력");
  }

  return checks.slice(0, 3);
}

function pickKeyStreams(profile) {
  const result = [];

  for (const group of profile?.streamGroups ?? []) {
    for (const stream of group.streams) {
      result.push({
        groupTitleKo: group.titleKo,
        nameKo: stream.nameKo,
        audienceKo: stream.audienceKo,
        officialUrl: stream.officialUrl,
        tags: deriveStreamTags(stream)
      });

      if (result.length >= 4) {
        return result;
      }
    }
  }

  return result;
}

export function buildJurisdictionInsight(meta, profile, updates = []) {
  const streams = flattenProfileStreams(profile);
  const tagCounts = buildTagCounts(streams);
  const total = Math.max(streams.length, 1);
  const lifestyle = getLifestyleProfile(meta);
  const latestPublishedAt = updates[0]?.publishedAt ?? null;

  const statuses = {
    ee:
      meta.id === "federal"
        ? "핵심"
        : meta.id === "quebec"
          ? "별도 체계"
          : meta.id === "nunavut"
            ? "연방 경로만"
            : summarizePresence(tagCounts.get(STREAM_TAGS.ee) ?? 0, total),
    jobOffer:
      meta.id === "nunavut"
        ? "해당 없음"
        : summarizePresence(tagCounts.get(STREAM_TAGS.jobOffer) ?? 0, total, {
            none: "낮음",
            one: "일부",
            many: "중심"
          }),
    graduate: summarizePresence(tagCounts.get(STREAM_TAGS.graduate) ?? 0, total),
    entrepreneur: summarizePresence(tagCounts.get(STREAM_TAGS.entrepreneur) ?? 0, total),
    french:
      meta.id === "quebec"
        ? "중요"
        : summarizePresence(tagCounts.get(STREAM_TAGS.french) ?? 0, total),
    regional: summarizePresence(tagCounts.get(STREAM_TAGS.regional) ?? 0, total),
    localExperience: summarizePresence(tagCounts.get(STREAM_TAGS.localExperience) ?? 0, total),
    health: summarizePresence(tagCounts.get(STREAM_TAGS.health) ?? 0, total),
    trades: summarizePresence(tagCounts.get(STREAM_TAGS.trades) ?? 0, total)
  };
  const selectionModel = JURISDICTION_SELECTION_MODELS[meta.id] ?? JURISDICTION_SELECTION_MODELS.federal;

  return {
    id: meta.id,
    labelKo: meta.labelKo,
    system: deriveProgramSystem(meta),
    streamCount: streams.length,
    groupCount: profile?.streamGroups?.length ?? 0,
    verifiedOn: profile?.verifiedOn ?? "확인 중",
    updateCount: updates.length,
    latestPublishedAt,
    statuses,
    selectionModel,
    lifestyle,
    whoFor: buildWhoFor(meta, statuses, streams),
    firstChecks: buildFirstChecks(meta, statuses),
    keyStreams: pickKeyStreams(profile),
    streamRows: streams.map((stream) => ({
      ...stream,
      tags: deriveStreamTags(stream)
    }))
  };
}

export function buildScenarioCards(insights) {
  return SCENARIOS.map((scenario) => {
    const matched = insights
      .filter((insight) => insight.streamRows.some((stream) => stream.tags.includes(scenario.tag)))
      .sort((left, right) => {
        if (right.updateCount !== left.updateCount) {
          return right.updateCount - left.updateCount;
        }

        return left.labelKo.localeCompare(right.labelKo);
      })
      .slice(0, 6);

    return {
      ...scenario,
      matches: matched
    };
  });
}
