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
