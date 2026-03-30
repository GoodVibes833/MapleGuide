export const specialPathways = [
  {
    id: "federal-ee",
    titleKo: "연방 Express Entry",
    shortKo: "EE",
    directionKo: "연방 점수형",
    regionIds: ["federal"],
    selectionModelKo: "CRS + 라운드 컷오프",
    updatedOn: "2025-08-21",
    verifiedOn: "2026-03-30",
    summaryKo:
      "연방 Express Entry는 CRS 점수와 라운드 컷오프로 직접 비교하는 대표 경제이민 경로입니다.",
    criteria: [
      { id: "ee-eligible", label: "EE 기본 자격" },
      { id: "official-language", label: "공인 언어점수" },
      { id: "education-ready", label: "ECA 또는 캐나다 학위" },
      { id: "skilled-experience", label: "숙련 경력" },
      { id: "competitive-crs", label: "최근 CRS 컷오프와 차이" },
      { id: "category-fit", label: "카테고리 기반 선발 해당 여부" }
    ],
    requiredKo: [
      "CEC · FSWP · FSTP 중 1개 프로그램 자격",
      "공인 언어점수",
      "ECA 또는 캐나다 학위",
      "숙련 경력"
    ],
    scoredKo: [
      "나이",
      "학력",
      "언어점수",
      "해외·캐나다 숙련 경력",
      "카테고리 기반 선발 해당 여부"
    ],
    preferredKo: [
      "CLB 9 이상",
      "캐나다 skilled 경력",
      "카테고리 직군 해당"
    ],
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
    officialLabel: "IRCC Express Entry overview"
  },
  {
    id: "federal-trades",
    titleKo: "기술직 중심 연방 경로",
    shortKo: "Trades",
    directionKo: "연방 직군형",
    regionIds: ["federal"],
    selectionModelKo: "EE category + FSTP",
    updatedOn: "2025-08-21",
    verifiedOn: "2026-03-30",
    summaryKo:
      "기술직은 연방 EE의 Trade category와 Federal Skilled Trades Program(FSTP)을 같이 보는 편이 좋습니다.",
    criteria: [
      { id: "trade-occupation", label: "Trade 직군·NOC 정리" },
      { id: "official-language", label: "공인 언어점수" },
      { id: "skilled-experience", label: "기술직 숙련 경력" },
      { id: "ee-eligible", label: "EE 또는 FSTP 기본 자격" },
      { id: "trade-certification", label: "캐나다 자격증·오퍼·관련 준비" }
    ],
    requiredKo: [
      "기술직 숙련 경력",
      "공인 언어점수",
      "EE 자격 또는 FSTP 자격",
      "직군 NOC 정리"
    ],
    scoredKo: [
      "카테고리 해당 여부",
      "최근 EE 컷오프와 차이",
      "기술직 경력 기간"
    ],
    preferredKo: [
      "Trade occupation 일치",
      "캐나다 경력 또는 자격증",
      "CLB 5 이상"
    ],
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations/category-based-selection.html",
    officialLabel: "IRCC Category-based selection"
  },
  {
    id: "atlantic-aip",
    titleKo: "Atlantic Immigration Program",
    shortKo: "AIP",
    directionKo: "연방 지역경로",
    regionIds: ["new-brunswick", "prince-edward-island", "nova-scotia", "newfoundland-and-labrador"],
    selectionModelKo: "designated employer + endorsement",
    updatedOn: "2025-10-10",
    verifiedOn: "2026-03-30",
    summaryKo:
      "AIP는 대서양 4개 주에서 designated employer job offer, settlement plan, provincial endorsement로 가는 employer-driven PR 경로입니다.",
    criteria: [
      { id: "employer-offer", label: "Atlantic designated employer job offer" },
      { id: "official-language", label: "공인 언어점수" },
      { id: "education-ready", label: "학력/ECA 또는 캐나다 학위" },
      { id: "relevant-experience", label: "관련 경력 또는 Atlantic 졸업자 예외" },
      { id: "atlantic-settlement", label: "Atlantic 정착 의사와 settlement plan" }
    ],
    requiredKo: [
      "Atlantic designated employer job offer",
      "언어점수",
      "학력/ECA 또는 캐나다 학위",
      "경력 또는 Atlantic 졸업자 예외",
      "endorsement"
    ],
    scoredKo: [
      "점수표보다 고용주 연결",
      "정착 가능성",
      "서류 준비 속도"
    ],
    preferredKo: [
      "대서양 4개 주 정착 의사",
      "캐나다 체류 중이면 proof of funds 면제 가능",
      "Atlantic 졸업자 또는 관련 경력"
    ],
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/how-to-immigrate.html",
    officialLabel: "IRCC Atlantic Immigration Program"
  },
  {
    id: "rural-community-pilot",
    titleKo: "Rural Community Immigration Pilot",
    shortKo: "RCIP",
    directionKo: "연방 지역경로",
    regionIds: ["nova-scotia", "ontario", "manitoba", "saskatchewan", "alberta", "british-columbia"],
    selectionModelKo: "designated employer + community recommendation",
    updatedOn: "2025-08-13",
    verifiedOn: "2026-03-30",
    summaryKo:
      "RCIP는 참여 커뮤니티 안의 designated employer job offer와 community recommendation이 핵심인 rural·community 경로입니다.",
    criteria: [
      { id: "employer-offer", label: "커뮤니티 안 designated employer job offer" },
      { id: "community-recommendation", label: "community recommendation" },
      { id: "relevant-experience", label: "관련 경력 또는 community graduate 예외" },
      { id: "official-language", label: "공인 언어점수" },
      { id: "education-ready", label: "학력/ECA" },
      { id: "regional-intent", label: "시골·지역 정착 의사" }
    ],
    requiredKo: [
      "participating community 안의 designated employer job offer",
      "community recommendation",
      "1년 관련 경력 또는 community graduate 예외",
      "언어점수",
      "학력/ECA"
    ],
    scoredKo: [
      "점수보다 community fit",
      "우선 sector 또는 occupation",
      "지역 정착 의사"
    ],
    preferredKo: [
      "시골·지역 정착 가능",
      "community 안 직무 연결",
      "캐나다 근무 중이면 proof of funds 면제 가능"
    ],
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration.html",
    officialLabel: "IRCC Rural Community Immigration Pilot"
  },
  {
    id: "francophone-community-pilot",
    titleKo: "Francophone Community Immigration Pilot",
    shortKo: "FCIP",
    directionKo: "연방 지역경로",
    regionIds: ["new-brunswick", "ontario", "manitoba", "british-columbia"],
    selectionModelKo: "French + designated employer + recommendation",
    updatedOn: "2026-01-30",
    verifiedOn: "2026-03-30",
    summaryKo:
      "FCIP는 프랑스어와 community recommendation을 같이 보는 Francophone-minority community 경로입니다.",
    criteria: [
      { id: "french-ability", label: "프랑스어 NCLC 5 이상" },
      { id: "employer-offer", label: "designated employer job offer" },
      { id: "community-recommendation", label: "community recommendation" },
      { id: "relevant-experience", label: "관련 경력 또는 community graduate 예외" },
      { id: "education-ready", label: "학력/ECA" }
    ],
    requiredKo: [
      "프랑스어 NCLC 5 이상",
      "designated employer job offer",
      "community recommendation",
      "경력 또는 community graduate 예외",
      "학력/ECA"
    ],
    scoredKo: [
      "점수보다 French + community fit",
      "priority sector/occupation",
      "정착 의사"
    ],
    preferredKo: [
      "프랑스어 강점",
      "Francophone community 정착 의사",
      "캐나다 근무 중이면 proof of funds 면제 가능"
    ],
    officialUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration.html",
    officialLabel: "IRCC Francophone Community Immigration Pilot"
  },
  {
    id: "alberta-rural-renewal",
    titleKo: "Alberta Rural Renewal Stream",
    shortKo: "AAIP Rural",
    directionKo: "주정부 지역경로",
    regionIds: ["alberta"],
    selectionModelKo: "community endorsement + worker EOI",
    updatedOn: null,
    verifiedOn: "2026-03-30",
    summaryKo:
      "알버타 Rural Renewal은 designated community endorsement 뒤 Worker EOI와 신청으로 이어지는 community-driven 주정부 경로입니다.",
    criteria: [
      { id: "alberta-community-endorsement", label: "Designated Community endorsement" },
      { id: "employer-offer", label: "eligible occupation full-time job offer" },
      { id: "relevant-experience", label: "최근 18개월 안 12개월 관련 경력" },
      { id: "official-language", label: "공인 언어점수" },
      { id: "education-ready", label: "학력/ECA 또는 캐나다 학위" },
      { id: "regional-intent", label: "알버타 지역 정착 의사" }
    ],
    requiredKo: [
      "Designated Community endorsement letter",
      "eligible occupation full-time job offer",
      "최근 18개월 안 12개월 경력",
      "언어점수",
      "학력/ECA 또는 캐나다 학위"
    ],
    scoredKo: [
      "community fit",
      "occupation eligibility",
      "EOI selection"
    ],
    preferredKo: [
      "알버타 지역 정착 의사",
      "trade는 Alberta certification 확인",
      "캐나다 내 합법 체류 또는 충분한 정착자금"
    ],
    officialUrl: "https://www.alberta.ca/aaip-rural-renewal-stream-eligibility",
    officialLabel: "Alberta Rural Renewal Stream"
  },
  {
    id: "newfoundland-eoi",
    titleKo: "뉴펀들랜드 2단계 EOI",
    shortKo: "NL EOI",
    directionKo: "주정부 운영체계",
    regionIds: ["newfoundland-and-labrador"],
    selectionModelKo: "2단계 EOI + ITA",
    updatedOn: "2025-07-11",
    verifiedOn: "2026-03-30",
    summaryKo:
      "뉴펀들랜드 래브라도는 2025년부터 선착순이 아니라 2단계 EOI 모델로 NLPNP와 AIP를 운영합니다.",
    criteria: [
      { id: "nl-eoi-ready", label: "EOI 제출 준비" },
      { id: "employer-offer", label: "뉴펀들랜드 employer 또는 job 연결" },
      { id: "priority-occupation", label: "우선 sector 또는 occupation" },
      { id: "education-ready", label: "교육·학력 자료" },
      { id: "nl-intent", label: "뉴펀들랜드 정착 의사" }
    ],
    requiredKo: [
      "EOI 제출",
      "직업·학력·정착 의사 정보",
      "대부분 job 또는 job offer identified",
      "ITA 후 full application"
    ],
    scoredKo: [
      "노동시장 우선순위",
      "직업군",
      "교육",
      "뉴펀들랜드 정착 의사"
    ],
    preferredKo: [
      "뉴펀들랜드 employer 연결",
      "보건·교육 등 우선 sector",
      "AIP 또는 NLPNP 요건 병행 충족"
    ],
    officialUrl: "https://www.gov.nl.ca/immigration/expression-of-interest-model-overview/",
    officialLabel: "NL Expression of Interest model"
  }
];
