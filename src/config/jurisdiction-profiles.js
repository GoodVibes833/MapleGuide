export const jurisdictionProfiles = {
  federal: {
    summaryKo:
      "Express Entry는 연방의 온라인 선발 시스템으로, CEC·FSWP·FSTP를 관리하고 일반·프로그램별·카테고리 기반 초청을 운영합니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
    officialOverviewLabel: "IRCC Express Entry overview",
    quickFacts: [
      { labelKo: "관리 프로그램", valueKo: "CEC · FSWP · FSTP" },
      { labelKo: "선발 방식", valueKo: "CRS 점수 + 초청 라운드" },
      { labelKo: "중요 포인트", valueKo: "일반 · 프로그램별 · 카테고리 기반 초청" }
    ],
    streamGroups: [
      {
        titleKo: "관리되는 프로그램",
        descriptionKo: "Express Entry 풀에 들어가려면 아래 3개 연방 프로그램 중 하나 자격을 먼저 만족해야 합니다.",
        streams: [
          {
            nameKo: "Canadian Experience Class",
            audienceKo: "캐나다 내 적격 경력을 가진 숙련직 근로자",
            noteKo: "캐나다 경력을 기반으로 EE 풀에 들어가는 대표 경로입니다.",
            officialUrl:
              "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/become-candidate/eligibility/canadian-experience-class.html"
          },
          {
            nameKo: "Federal Skilled Worker Program",
            audienceKo: "해외 또는 캐나다의 숙련 경력을 가진 지원자",
            noteKo: "학력·경력·언어를 종합 평가해 연방 숙련인력으로 선발합니다.",
            officialUrl:
              "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/become-candidate/eligibility/federal-skilled-workers.html"
          },
          {
            nameKo: "Federal Skilled Trades Program",
            audienceKo: "숙련기술직 종사자",
            noteKo: "기술직 중심 경로로, 자격증 또는 유효한 잡오퍼 요건이 핵심입니다.",
            officialUrl:
              "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/skilled-trades.html"
          }
        ]
      },
      {
        titleKo: "초청 라운드 구조",
        descriptionKo: "실제 초청은 라운드 유형에 따라 달라집니다.",
        streams: [
          {
            nameKo: "General rounds",
            audienceKo: "EE 풀 상위 점수자 전반",
            noteKo: "3개 관리 프로그램 대상 상위 점수자를 폭넓게 초청합니다.",
            officialUrl:
              "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html"
          },
          {
            nameKo: "Program-specific rounds",
            audienceKo: "특정 프로그램 대상",
            noteKo: "예를 들어 PNP 대상 또는 특정 연방 프로그램 대상 초청이 여기에 해당합니다.",
            officialUrl:
              "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds.html"
          },
          {
            nameKo: "Category-based selection",
            audienceKo: "직군·프랑스어 등 경제 목표별 대상",
            noteKo: "카테고리 자격과 CRS를 함께 보며 초청합니다.",
            officialUrl:
              "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations/category-based-selection.html"
          }
        ]
      }
    ],
    notesKo: [
      "카테고리 기반 선발 기준과 대상 직군은 라운드별 지침에서 다시 확인해야 합니다.",
      "연방 EE 구조는 2026년 3월 30일 기준 IRCC 공식 페이지를 기준으로 정리했습니다."
    ]
  },
  ontario: {
    summaryKo:
      "온타리오는 OINP를 통해 EOI 시스템과 Express Entry 연계 스트림을 함께 운영합니다. 고용주 오퍼형, 대학원 졸업형, EE 연계형으로 이해하면 가장 쉽습니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl: "https://www.ontario.ca/page/ontario-immigrant-nominee-program-streams",
    officialOverviewLabel: "Ontario OINP streams",
    quickFacts: [
      { labelKo: "운영 방식", valueKo: "EOI + Express Entry 연계" },
      { labelKo: "대표 축", valueKo: "잡오퍼 · 석박사 · EE" },
      { labelKo: "최근 공지", valueKo: "직군별 초청과 REDI 파일럿 공지가 잦음" }
    ],
    streamGroups: [
      {
        titleKo: "EOI 시스템 스트림",
        descriptionKo: "온타리오 내부 Expression of Interest 등록 후 초청을 받는 구조입니다.",
        streams: [
          {
            nameKo: "Employer Job Offer: Foreign Worker",
            audienceKo: "온타리오 고용주 잡오퍼가 있는 숙련 인력",
            noteKo: "의사 초청, 특정 직군 타깃 초청 등 최근 라운드 공지와 함께 자주 보입니다.",
            officialUrl:
              "https://www.ontario.ca/page/ontario-immigrant-nominee-program-streams"
          },
          {
            nameKo: "Employer Job Offer: International Student",
            audienceKo: "잡오퍼가 있는 최근 졸업자",
            noteKo: "졸업 후 고용 연계형으로 이해하면 쉽습니다.",
            officialUrl:
              "https://www.ontario.ca/page/ontario-immigrant-nominee-program-streams"
          },
          {
            nameKo: "Employer Job Offer: In-Demand Skills",
            audienceKo: "온타리오 수요직군 잡오퍼 보유자",
            noteKo: "특정 수요직군 중심으로 초청이 나옵니다.",
            officialUrl:
              "https://www.ontario.ca/page/ontario-immigrant-nominee-program-streams"
          },
          {
            nameKo: "Masters Graduate",
            audienceKo: "온타리오 대학 석사 졸업자",
            noteKo: "온타리오 학위 기반으로 접근하는 대표 경로입니다.",
            officialUrl:
              "https://www.ontario.ca/page/ontario-immigrant-nominee-program-expression-interest-system-streams"
          },
          {
            nameKo: "PhD Graduate",
            audienceKo: "온타리오 대학 박사 졸업자",
            noteKo: "석사와 별개 풀로 이해하는 게 좋습니다.",
            officialUrl:
              "https://www.ontario.ca/page/ontario-immigrant-nominee-program-expression-interest-system-streams"
          }
        ]
      },
      {
        titleKo: "Express Entry 연계 스트림",
        descriptionKo: "연방 EE 프로필이 있어야 하고 온타리오의 NOI를 받아야 합니다.",
        streams: [
          {
            nameKo: "Human Capital Priorities",
            audienceKo: "학력·경력·언어 점수를 갖춘 EE 후보자",
            noteKo: "온타리오 Tech Draws도 이 축에서 이해하면 편합니다.",
            officialUrl: "https://www.ontario.ca/page/ontario-immigrant-nominee-program-streams"
          },
          {
            nameKo: "Skilled Trades",
            audienceKo: "온타리오 경력이 있는 기술직 근로자",
            noteKo: "기술직·현장직 성격이 강한 EE 연계 경로입니다.",
            officialUrl: "https://www.ontario.ca/page/ontario-immigrant-nominee-program-streams"
          },
          {
            nameKo: "French-Speaking Skilled Worker",
            audienceKo: "프랑스어 중심 EE 후보자",
            noteKo: "불어 + 영어 능력을 갖춘 숙련 인력 대상입니다.",
            officialUrl: "https://www.ontario.ca/page/ontario-immigrant-nominee-program-streams"
          }
        ]
      }
    ],
    notesKo: [
      "온타리오의 직군별·파일럿 공지는 업데이트 페이지에서 함께 추적하는 것이 안전합니다.",
      "공식 구조는 2026년 3월 30일 기준 OINP streams 페이지와 2026 업데이트 페이지를 바탕으로 정리했습니다."
    ]
  },
  "british-columbia": {
    summaryKo:
      "BC PNP는 크게 Skills Immigration과 Entrepreneur Immigration 두 축으로 보면 이해가 쉽습니다. 근로자·졸업자·보건인력과 창업자 경로가 분리돼 있습니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl:
      "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/about-the-bc-provincial-nominee-program",
    officialOverviewLabel: "BC PNP program overview",
    quickFacts: [
      { labelKo: "주요 축", valueKo: "Skills Immigration · Entrepreneur Immigration" },
      { labelKo: "근로자 쪽 핵심", valueKo: "Skilled Worker · ELSS · Health Authority" },
      { labelKo: "사업 쪽 핵심", valueKo: "Base · Regional · Strategic Projects" }
    ],
    streamGroups: [
      {
        titleKo: "Skills Immigration",
        descriptionKo: "근로자·일부 졸업자 중심의 경로입니다. 등록, 초청, 신청, 결정 순으로 진행됩니다.",
        streams: [
          {
            nameKo: "Skilled Worker",
            audienceKo: "숙련직·전문직·기술직",
            noteKo: "Express Entry BC 옵션을 함께 볼 수 있는 핵심 근로자 경로입니다.",
            officialUrl: "https://www.welcomebc.ca/Immigrate-to-B-C/Skills-Immigration"
          },
          {
            nameKo: "Entry Level and Semi-Skilled",
            audienceKo: "초급 또는 중간 숙련 직군",
            noteKo: "업종·지역 조건을 함께 봐야 하는 경로입니다.",
            officialUrl: "https://www.welcomebc.ca/Immigrate-to-B-C/Skills-Immigration"
          },
          {
            nameKo: "Health Authority",
            audienceKo: "BC 보건기관 고용 인력",
            noteKo: "보건기관 고용 기반으로 보는 전용 축입니다.",
            officialUrl: "https://www.welcomebc.ca/Immigrate-to-B-C/Skills-Immigration"
          }
        ]
      },
      {
        titleKo: "Entrepreneur Immigration",
        descriptionKo: "창업·사업 인수·지역 커뮤니티 연계 창업 경로입니다.",
        streams: [
          {
            nameKo: "Base stream",
            audienceKo: "BC 어디서든 사업을 시작하거나 인수하려는 창업자",
            noteKo: "광역권 포함 일반 사업 경로입니다.",
            officialUrl: "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
          },
          {
            nameKo: "Regional stream",
            audienceKo: "메트로 밴쿠버 외 지역 커뮤니티 중심 창업자",
            noteKo: "참여 커뮤니티 우선산업과 연결해 보는 게 중요합니다.",
            officialUrl:
              "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration-regional-communities"
          },
          {
            nameKo: "Strategic Projects",
            audienceKo: "BC 진출을 추진하는 외국 법인",
            noteKo: "개인 창업과는 다른 법인 기반 경로입니다.",
            officialUrl: "https://www.welcomebc.ca/immigrate-to-b-c/entrepreneur-immigration"
          }
        ]
      }
    ],
    notesKo: [
      "BC 공식 근로자 페이지는 2025년 9월 10일 기준 Skills Immigration 구조를 안내합니다.",
      "기업·창업자는 Entrepreneur Immigration 페이지와 지역 커뮤니티 우선산업 표를 함께 보는 편이 좋습니다."
    ]
  },
  alberta: {
    summaryKo:
      "AAIP는 근로자 스트림과 기업가 스트림으로 나뉩니다. 알버타는 직군 우선순위와 지역 커뮤니티 기반 경로가 비교적 분명한 편입니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl: "https://www.alberta.ca/alberta-advantage-immigration-program",
    officialOverviewLabel: "AAIP overview",
    quickFacts: [
      { labelKo: "근로자 스트림", valueKo: "4개" },
      { labelKo: "기업가 스트림", valueKo: "4개" },
      { labelKo: "특징", valueKo: "Rural Renewal·AAIP EE·전용 경로 병행" }
    ],
    streamGroups: [
      {
        titleKo: "근로자 스트림",
        descriptionKo: "알버타에 이미 근무 중이거나 알버타 노동시장 우선순위와 맞는 인력을 대상으로 합니다.",
        streams: [
          {
            nameKo: "Tourism and Hospitality Stream",
            audienceKo: "관광·호스피탈리티 업종 종사자",
            noteKo: "업종이 분명한 전용 근로자 스트림입니다.",
            officialUrl: "https://www.alberta.ca/aaip-application-streams"
          },
          {
            nameKo: "Alberta Opportunity Stream",
            audienceKo: "알버타 고용 기반 일반 근로자",
            noteKo: "잡오퍼 기반의 넓은 근로자 축으로 이해하면 쉽습니다.",
            officialUrl: "https://www.alberta.ca/aaip-application-streams"
          },
          {
            nameKo: "Alberta Express Entry Stream",
            audienceKo: "EE 풀에 있는 지원자",
            noteKo: "보건·기술·경찰 전용 경로가 이 스트림 안에서 운영됩니다.",
            officialUrl: "https://www.alberta.ca/aaip-application-streams"
          },
          {
            nameKo: "Rural Renewal Stream",
            audienceKo: "지정 커뮤니티 추천을 받은 지역 정착 희망자",
            noteKo: "커뮤니티 지정과 추천이 핵심입니다.",
            officialUrl: "https://www.alberta.ca/aaip-application-streams"
          }
        ]
      },
      {
        titleKo: "기업가 스트림",
        descriptionKo: "지역 창업과 사업 운영 역량을 중심으로 보는 축입니다.",
        streams: [
          {
            nameKo: "Rural Entrepreneur Stream",
            audienceKo: "농촌 지역 창업자",
            noteKo: "지역 커뮤니티와 사업계획 연결이 중요합니다.",
            officialUrl: "https://www.alberta.ca/aaip-application-streams"
          },
          {
            nameKo: "Graduate Entrepreneur Stream",
            audienceKo: "알버타 승인 교육기관 졸업자",
            noteKo: "알버타 내 졸업자 창업 경로입니다.",
            officialUrl: "https://www.alberta.ca/aaip-application-streams"
          },
          {
            nameKo: "Farm Stream",
            audienceKo: "농장 운영 계획이 있는 지원자",
            noteKo: "일반 사업과 달리 농업 운영 역량을 별도로 봅니다.",
            officialUrl: "https://www.alberta.ca/aaip-application-streams"
          },
          {
            nameKo: "Foreign Graduate Entrepreneur Stream",
            audienceKo: "해외 졸업 기반 스타트업 창업자",
            noteKo: "지정 기관과 함께 진행하는 방식으로 이해하면 쉽습니다.",
            officialUrl: "https://www.alberta.ca/aaip-application-streams"
          }
        ]
      }
    ],
    notesKo: [
      "AAIP 공식 스트림 구조는 2026년 3월 30일 기준 Alberta.ca overview와 application streams 페이지를 기준으로 정리했습니다."
    ]
  },
  manitoba: {
    summaryKo:
      "MPNP는 Skilled Worker, International Education, Business Investor 세 갈래로 이해하면 가장 명확합니다. 각 갈래 안에 세부 pathway가 있습니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl: "https://immigratemanitoba.com/immigrate/",
    officialOverviewLabel: "MPNP overview",
    quickFacts: [
      { labelKo: "주요 스트림", valueKo: "Skilled Worker · International Education · Business Investor" },
      { labelKo: "EOI 구조", valueKo: "Skilled Worker/IES 중심" },
      { labelKo: "사업 경로", valueKo: "Entrepreneur · Farm Investor" }
    ],
    streamGroups: [
      {
        titleKo: "Skilled Worker Stream",
        descriptionKo: "매니토바 고용시장 수요와 연결되는 근로자 중심 축입니다.",
        streams: [
          {
            nameKo: "Skilled Worker in Manitoba",
            audienceKo: "매니토바 내 고용·경력 기반 지원자",
            noteKo: "현지 고용 연결성이 강한 경로입니다.",
            officialUrl: "https://immigratemanitoba.com/immigrate/skilled-worker/"
          },
          {
            nameKo: "Skilled Worker Overseas",
            audienceKo: "해외 거주 지원자",
            noteKo: "주와의 연결성과 노동시장 적합성을 함께 봅니다.",
            officialUrl: "https://immigratemanitoba.com/immigrate/skilled-worker/"
          }
        ]
      },
      {
        titleKo: "International Education Stream",
        descriptionKo: "매니토바 지정 교육기관 졸업자를 위한 빠른 경로입니다.",
        streams: [
          {
            nameKo: "Career Employment Pathway",
            audienceKo: "졸업 후 수요직군 취업 연계자",
            noteKo: "현지 취업 연결이 분명할 때 보는 경로입니다.",
            officialUrl: "https://immigratemanitoba.com/immigrate/ies/"
          },
          {
            nameKo: "Graduate Internship Pathway",
            audienceKo: "석박사 연구·인턴십 기반 졸업자",
            noteKo: "연구형·고급인재 축으로 이해하면 쉽습니다.",
            officialUrl: "https://immigratemanitoba.com/immigrate/ies/"
          },
          {
            nameKo: "International Student Entrepreneur Pilot",
            audienceKo: "학생 창업자",
            noteKo: "졸업자 창업 실험형 경로입니다.",
            officialUrl: "https://immigratemanitoba.com/immigrate/ies/"
          }
        ]
      },
      {
        titleKo: "Business Investor Stream",
        descriptionKo: "사업 설립·인수 또는 농업 투자자를 위한 축입니다.",
        streams: [
          {
            nameKo: "Entrepreneur Pathway",
            audienceKo: "매니토바 창업 또는 사업 인수 예정자",
            noteKo: "일반 사업 운영 중심 경로입니다.",
            officialUrl: "https://immigratemanitoba.com/immigrate/bis/"
          },
          {
            nameKo: "Farm Investor Pathway",
            audienceKo: "농업 운영 투자자",
            noteKo: "농촌 기반 농업 운영 계획이 핵심입니다.",
            officialUrl: "https://immigratemanitoba.com/immigrate/bis/"
          }
        ]
      }
    ],
    notesKo: [
      "MPNP는 공식 overview 페이지와 각 stream page를 기준으로 2026년 3월 30일 구조를 반영했습니다."
    ]
  },
  "prince-edward-island": {
    summaryKo:
      "PEI는 Express Entry, Workforce Category, Business Impact Category로 나눠 보면 이해가 쉽습니다. 실제 초청은 노동시장 우선순위에 따라 크게 달라집니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl: "https://www.princeedwardisland.ca/en/topic/office-immigration",
    officialOverviewLabel: "PEI Office of Immigration",
    quickFacts: [
      { labelKo: "주요 축", valueKo: "Express Entry · Workforce · Business Impact" },
      { labelKo: "현재 경향", valueKo: "보건·기술직·보육·수요직군 우선" },
      { labelKo: "사업 쪽", valueKo: "현재 Work Permit Stream 중심" }
    ],
    streamGroups: [
      {
        titleKo: "Express Entry",
        descriptionKo: "연방 EE 풀과 연결된 PEI 지명 경로입니다.",
        streams: [
          {
            nameKo: "PEI Express Entry",
            audienceKo: "연방 EE 프로필 보유자",
            noteKo: "PEI는 현재 수요가 큰 직군을 더 우선하는 경향을 공식적으로 안내하고 있습니다.",
            officialUrl: "https://www.princeedwardisland.ca/en/information/office-of-immigration/pei-express-entry"
          }
        ]
      },
      {
        titleKo: "Workforce Category",
        descriptionKo: "PEI 고용주 기반 취업 이민 경로들을 묶어서 보면 편합니다.",
        streams: [
          {
            nameKo: "Skilled Worker in PEI",
            audienceKo: "PEI 고용주와 고숙련 잡오퍼가 있는 지원자",
            noteKo: "현지 고용 중심의 대표 skilled worker 경로입니다.",
            officialUrl: "https://www.princeedwardisland.ca/en/information/office-of-immigration/skilled-workers-in-pei"
          },
          {
            nameKo: "Skilled Worker Outside Canada",
            audienceKo: "해외 거주 skilled worker",
            noteKo: "PEI 고용주 승인과 채용 연계가 중요합니다.",
            officialUrl: "https://www.princeedwardisland.ca/en/information/office-of-immigration/skilled-workers-outside-canada"
          },
          {
            nameKo: "International Graduates",
            audienceKo: "PEI 공공 지원 교육기관 졸업자",
            noteKo: "현지 졸업 후 고용 연계형입니다.",
            officialUrl: "https://www.princeedwardisland.ca/en/information/office-of-immigration/international-graduates"
          },
          {
            nameKo: "Critical Worker / Intermediate Experience / Occupations in Demand",
            audienceKo: "중간숙련 또는 수요직군",
            noteKo: "TEER와 직군 우선순위를 같이 봐야 하는 workforce 하위 경로들입니다.",
            officialUrl: "https://www.princeedwardisland.ca/en/information/office-of-immigration/critical-workers"
          }
        ]
      },
      {
        titleKo: "Business Impact Category",
        descriptionKo: "현재 사업 쪽은 Work Permit Stream 중심으로 이해하면 가장 명확합니다.",
        streams: [
          {
            nameKo: "Work Permit Stream",
            audienceKo: "사업 운영·경영 경험이 있는 창업자",
            noteKo: "사업을 운영한 뒤 영주권 단계로 가는 구조입니다.",
            officialUrl: "https://www.princeedwardisland.ca/en/information/office-of-immigration/work-permit-stream"
          }
        ]
      }
    ],
    notesKo: [
      "PEI Office of Immigration는 2026년 1월 13일자 각 stream page에서 수요직군 우선 원칙을 반복해 안내하고 있습니다.",
      "Business Impact Category는 2025년 기준 Work Permit Stream 중심으로 운영됩니다."
    ]
  },
  "new-brunswick": {
    summaryKo:
      "뉴브런즈윅은 Skilled Worker, Express Entry, Strategic Initiative, Business Immigration 축으로 이해하면 쉽고, 별도 파일럿도 같이 봐야 합니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl:
      "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/nb-immigration-program-streams.html",
    officialOverviewLabel: "NBPNP overview",
    quickFacts: [
      { labelKo: "주요 스트림", valueKo: "Skilled Worker · Express Entry · Strategic Initiative · Business" },
      { labelKo: "추가 파일럿", valueKo: "Critical Worker · Private Career College Graduate" },
      { labelKo: "Express Entry 특징", valueKo: "Employment in NB · NB Interests" }
    ],
    streamGroups: [
      {
        titleKo: "주요 프로그램",
        descriptionKo: "이민 목적과 고용 연결 방식에 따라 갈래가 분리됩니다.",
        streams: [
          {
            nameKo: "New Brunswick Skilled Worker",
            audienceKo: "NB 고용주 잡오퍼 또는 현지 고용 연계자",
            noteKo: "풀타임 비계절성 고용 연결이 핵심입니다.",
            officialUrl:
              "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/nb-immigration-program-streams/nb-skilled-worker-stream.html"
          },
          {
            nameKo: "New Brunswick Express Entry",
            audienceKo: "연방 EE 후보자",
            noteKo: "현재는 Employment in New Brunswick와 New Brunswick Interests 두 경로로 설명됩니다.",
            officialUrl:
              "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/nb-express-entry-stream.html"
          },
          {
            nameKo: "New Brunswick Strategic Initiative",
            audienceKo: "특정 정착 목표와 연결된 후보자",
            noteKo: "프랑코폰 등 특정 타깃 성격을 함께 확인해야 합니다.",
            officialUrl:
              "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/nb-immigration-program-streams.html"
          },
          {
            nameKo: "New Brunswick Business Immigration",
            audienceKo: "사업 운영 계획이 있는 창업자",
            noteKo: "고용 기반 스트림과 분리해서 보는 게 이해에 좋습니다.",
            officialUrl:
              "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/nb-immigration-program-streams.html"
          }
        ]
      },
      {
        titleKo: "파일럿 프로그램",
        descriptionKo: "정규 스트림 외에 별도 우선정책이나 파일럿이 함께 운영됩니다.",
        streams: [
          {
            nameKo: "Critical Worker Pilot",
            audienceKo: "지정 고용주와 연결되는 핵심 노동력",
            noteKo: "정규 PNP와 별도 파일럿 성격입니다.",
            officialUrl:
              "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/nb-immigration-program-streams.html"
          },
          {
            nameKo: "Private Career College Graduate Pilot Program",
            audienceKo: "특정 사립 직업교육 졸업자",
            noteKo: "졸업자 타깃 파일럿으로 이해하면 쉽습니다.",
            officialUrl:
              "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/nb-immigration-program-streams.html"
          }
        ]
      }
    ],
    notesKo: [
      "NB Express Entry는 공식 페이지 기준 2개 pathway 구조로 설명되고 있습니다.",
      "2026년 3월 30일 기준 ImmigrationNB 공식 program streams 페이지를 반영했습니다."
    ]
  },
  saskatchewan: {
    summaryKo:
      "SINP는 크게 International Skilled Worker와 Saskatchewan Experience가 현재 핵심이고, Entrepreneur and Farm 경로는 2025년 3월 27일부로 신규 접수가 종료됐습니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl:
      "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/how-to-apply-to-the-sinp",
    officialOverviewLabel: "SINP how to apply",
    quickFacts: [
      { labelKo: "현재 핵심", valueKo: "International Skilled Worker · Saskatchewan Experience" },
      { labelKo: "2026 운영 포인트", valueKo: "부문별 nomination allocation과 우선산업" },
      { labelKo: "주의", valueKo: "Entrepreneur/Farm 신규 접수 종료" }
    ],
    streamGroups: [
      {
        titleKo: "현재 주요 카테고리",
        descriptionKo: "SINP는 카테고리와 하위 pathway를 함께 보는 방식이 이해하기 쉽습니다.",
        streams: [
          {
            nameKo: "International Skilled Worker",
            audienceKo: "주 밖 또는 해외에 있는 skilled worker",
            noteKo: "사스카츄완 취업과 정착을 목표로 하는 기본 축입니다.",
            officialUrl:
              "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/procedures-and-guidelines"
          },
          {
            nameKo: "Saskatchewan Experience",
            audienceKo: "이미 사스카츄완에서 일하고 사는 지원자",
            noteKo: "학생, 기존 워크퍼밋 보유자 등 현지 체류자 중심입니다.",
            officialUrl:
              "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-with-saskatchewan-experience/procedures-and-guidelines"
          }
        ]
      },
      {
        titleKo: "자주 보는 2026 pathway",
        descriptionKo: "공식 eligibility 안내에서 현재 많이 보이는 pathway들입니다.",
        streams: [
          {
            nameKo: "Agriculture Talent Pathway",
            audienceKo: "농업·식품 가공 관련 종사자",
            noteKo: "일부는 사스카츄완 밖 지원자도 대상이 될 수 있습니다.",
            officialUrl:
              "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/assess-your-eligibility"
          },
          {
            nameKo: "Health Talent Pathway",
            audienceKo: "의료 인력",
            noteKo: "의사·간호사 등 보건 인력 채용과 연계해 봐야 합니다.",
            officialUrl:
              "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/assess-your-eligibility"
          },
          {
            nameKo: "Innovation and Tech Talent Pathway",
            audienceKo: "혁신·기술 직군",
            noteKo: "2026년 1월 1일 기준 eligible NOC가 확대됐습니다.",
            officialUrl:
              "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/sinp-tech-talent-pathway"
          },
          {
            nameKo: "Students / Existing Work Permit",
            audienceKo: "현지 졸업자와 워크퍼밋 보유자",
            noteKo: "Sector-based nomination 운영을 같이 확인해야 합니다.",
            officialUrl:
              "https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-with-saskatchewan-experience/students"
          }
        ]
      }
    ],
    notesKo: [
      "Entrepreneur and Farm pathways는 2025년 3월 27일부로 신규 신청·EOI·초청이 종료됐다고 Saskatchewan 공식 가이드가 밝히고 있습니다.",
      "2026 overview와 pathway 설명은 2026년 3월 30일 기준 Saskatchewan 공식 페이지를 기준으로 정리했습니다."
    ]
  },
  "nova-scotia": {
    summaryKo:
      "노바스코샤는 2026년 2월 18일부터 NSNP를 4개 통합 스트림으로 재구성했습니다. 예전 여러 stream 이름보다 지금은 통합 구조로 이해하는 게 맞습니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl: "https://liveinnovascotia.com/nova-scotia-nominee-program",
    officialOverviewLabel: "Nova Scotia Nominee Program",
    quickFacts: [
      { labelKo: "개편일", valueKo: "2026-02-18" },
      { labelKo: "현재 구조", valueKo: "4개 consolidated streams" },
      { labelKo: "이전 구조와 관계", valueKo: "기존 요건은 하위 sub-criteria로 반영" }
    ],
    streamGroups: [
      {
        titleKo: "2026 통합 스트림",
        descriptionKo: "현재는 아래 4개 스트림으로 보는 것이 공식 구조입니다.",
        streams: [
          {
            nameKo: "Nova Scotia Graduate",
            audienceKo: "노바스코샤 졸업자 중심",
            noteKo: "이전 International Graduates in Demand 요건이 이 안으로 들어갔습니다.",
            officialUrl: "https://liveinnovascotia.com/resources/nsnp-update-four-consolidated-streams"
          },
          {
            nameKo: "Skilled Worker",
            audienceKo: "고용주 연계 근로자",
            noteKo: "Construction Worker와 Physician sub-criteria가 포함됩니다.",
            officialUrl: "https://liveinnovascotia.com/resources/nsnp-update-four-consolidated-streams"
          },
          {
            nameKo: "Entrepreneur",
            audienceKo: "사업 운영자·창업자",
            noteKo: "이전 International Graduate Entrepreneur 요건이 이 안으로 들어갔습니다.",
            officialUrl: "https://liveinnovascotia.com/resources/nsnp-update-four-consolidated-streams"
          },
          {
            nameKo: "Nova Scotia: Express Entry",
            audienceKo: "연방 EE 후보자",
            noteKo: "기존 Nova Scotia Experience: Express Entry, Labour Market Priorities, Labour Market Priorities for Physicians가 통합됐습니다.",
            officialUrl: "https://liveinnovascotia.com/resources/nsnp-update-four-consolidated-streams"
          }
        ]
      }
    ],
    notesKo: [
      "노바스코샤 프로그램 구조는 2026년 2월 18일 공식 업데이트를 기준으로 크게 바뀌었습니다.",
      "이 페이지는 2026년 3월 30일 기준 Live in NS 공식 사이트를 바탕으로 구성했습니다."
    ]
  },
  "newfoundland-and-labrador": {
    summaryKo:
      "뉴펀들랜드 래브라도의 NLPNP는 고용 기반 3개 카테고리와 기업가 2개 카테고리로 나눠 보면 이해하기 쉽습니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl:
      "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/overview/",
    officialOverviewLabel: "NLPNP overview",
    quickFacts: [
      { labelKo: "고용 기반", valueKo: "Express Entry Skilled Worker · Skilled Worker · International Graduate" },
      { labelKo: "사업 기반", valueKo: "International Entrepreneur · International Graduate Entrepreneur" },
      { labelKo: "특징", valueKo: "Immigration Accelerator Portal 사용" }
    ],
    streamGroups: [
      {
        titleKo: "고용 기반 카테고리",
        descriptionKo: "현지 고용주·잡오퍼·학업 경력과 연결되는 축입니다.",
        streams: [
          {
            nameKo: "NLPNP Express Entry Skilled Worker",
            audienceKo: "EE 풀에 있는 고숙련 지원자",
            noteKo: "가속형 EE 연계 경로입니다.",
            officialUrl:
              "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/express-entry-skilled-worker/"
          },
          {
            nameKo: "NLPNP Skilled Worker",
            audienceKo: "현지 노동시장에 필요한 국제 근로자",
            noteKo: "고용주 잡오퍼 기반의 기본 skilled worker 카테고리입니다.",
            officialUrl: "https://www.gov.nl.ca/immigration/1-overview/"
          },
          {
            nameKo: "NLPNP International Graduate",
            audienceKo: "PGWP 보유 졸업자",
            noteKo: "주 내 고용주와 연결된 졸업자 경로입니다.",
            officialUrl:
              "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/international-graduate/"
          }
        ]
      },
      {
        titleKo: "기업가 카테고리",
        descriptionKo: "사업 설립 또는 운영 실적 기반으로 영주권을 노리는 축입니다.",
        streams: [
          {
            nameKo: "International Entrepreneur",
            audienceKo: "사업주 또는 고위 경영자",
            noteKo: "사업을 시작하거나 인수해 운영한 뒤 nomination을 받는 구조입니다.",
            officialUrl:
              "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/entrepreneurs/international-entrepreneur/overview/"
          },
          {
            nameKo: "International Graduate Entrepreneur",
            audienceKo: "뉴펀들랜드 래브라도 졸업자 창업자",
            noteKo: "Memorial University 또는 CNA 졸업 기반 창업 경로입니다.",
            officialUrl:
              "https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/entrepreneurs/international-graduate-entrepreneur/overview/"
          }
        ]
      }
    ],
    notesKo: [
      "뉴펀들랜드 래브라도는 최근 online portal 기반 구조 설명이 비교적 정리되어 있어 카테고리 이해에 좋습니다."
    ]
  },
  yukon: {
    summaryKo:
      "유콘은 현재 YNP worker streams 3개와 별도의 Yukon Business Nominee Program으로 이해하는 것이 가장 쉽습니다. 2026년에는 초청 우선순위 기반 intake가 강조됩니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl: "https://yukon.ca/en/doing-business/yukon-nominee-program",
    officialOverviewLabel: "Yukon Nominee Program",
    quickFacts: [
      { labelKo: "노동자 스트림", valueKo: "Critical Impact Worker · Skilled Worker · Express Entry" },
      { labelKo: "2026 특징", valueKo: "EOI intake + priority scoring" },
      { labelKo: "사업 경로", valueKo: "Yukon Business Nominee Program 별도 운영" }
    ],
    streamGroups: [
      {
        titleKo: "YNP worker streams",
        descriptionKo: "유콘 고용주가 신청 주체라는 점을 먼저 이해해야 합니다.",
        streams: [
          {
            nameKo: "Critical Impact Worker",
            audienceKo: "TEER 4·5 entry-level jobs",
            noteKo: "초급·중간 숙련 직군에 해당합니다.",
            officialUrl:
              "https://yukon.ca/en/doing-business/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire"
          },
          {
            nameKo: "Skilled Worker",
            audienceKo: "TEER 0~3 고숙련 직군",
            noteKo: "관리직·전문직·숙련직을 이 축으로 보면 됩니다.",
            officialUrl:
              "https://yukon.ca/en/doing-business/yukon-nominee-program/apply-skilled-worker-and-critical-impact-worker-streams-hire"
          },
          {
            nameKo: "Express Entry",
            audienceKo: "연방 EE 풀에 있는 지원자",
            noteKo: "유콘 고용주 스폰서와 EE 조건이 동시에 맞아야 합니다.",
            officialUrl:
              "https://yukon.ca/en/doing-business/yukon-nominee-program/apply-hire-foreign-worker-through-yukon-community-program"
          }
        ]
      },
      {
        titleKo: "사업 경로",
        descriptionKo: "노동자 지명과는 별도 흐름으로 이해하는 편이 좋습니다.",
        streams: [
          {
            nameKo: "Yukon Business Nominee Program",
            audienceKo: "유콘 경제 다양화에 기여할 창업자",
            noteKo: "유콘은 사업 이민을 worker streams와 분리해 설명합니다.",
            officialUrl: "https://yukon.ca/en/immigrate-yukon"
          }
        ]
      }
    ],
    notesKo: [
      "유콘 2026 intake는 1월·7월 두 차례 EOI 접수와 우선순위 점수 방식을 공식 안내하고 있습니다."
    ]
  },
  "northwest-territories": {
    summaryKo:
      "NWT는 Employer-Driven, Francophone, Business 세 스트림으로 이해하면 가장 쉽습니다. 2026년에는 Employer-Driven에 EOI 방식이 도입됐습니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl: "https://www.ece.gov.nt.ca/en/services/immigration-and-nominee-program",
    officialOverviewLabel: "NWT Nominee Program overview",
    quickFacts: [
      { labelKo: "주요 스트림", valueKo: "Employer-Driven · Francophone · Business" },
      { labelKo: "2026 특징", valueKo: "Employer-Driven에 EOI 도입" },
      { labelKo: "사업 쪽", valueKo: "open/purchase/invest business" }
    ],
    streamGroups: [
      {
        titleKo: "노동시장 기반 스트림",
        descriptionKo: "고용주와 노동시장 수요 중심으로 이해하면 쉽습니다.",
        streams: [
          {
            nameKo: "Employer-Driven Stream",
            audienceKo: "NWT 고용주가 필요로 하는 인력",
            noteKo: "역사적으로 Skilled Worker, NWT Express Entry, Entry Level/Semi-Skilled를 이 축에서 이해해 왔습니다.",
            officialUrl: "https://www.ece.gov.nt.ca/en/services/immigration-and-nominee-program"
          },
          {
            nameKo: "Francophone Stream",
            audienceKo: "영불 이중언어 인력",
            noteKo: "영어·불어 요건과 잡오퍼를 함께 봐야 합니다.",
            officialUrl: "https://www.ece.gov.nt.ca/en/services/immigration-and-nominee-program"
          }
        ]
      },
      {
        titleKo: "사업 스트림",
        descriptionKo: "사업 투자·설립·인수를 통한 정착 경로입니다.",
        streams: [
          {
            nameKo: "Business Stream",
            audienceKo: "NWT에서 사업을 시작·구매·투자하려는 지원자",
            noteKo: "지역 사업환경과 exploratory visit를 함께 고려하는 편이 좋습니다.",
            officialUrl: "https://www.iti.gov.nt.ca/en/services/immigration-and-nominee-program"
          }
        ]
      }
    ],
    notesKo: [
      "NWT는 2026년 3월 9일부터 Employer-Driven·Francophone stream에 새 selection process를 적용한다고 공식 발표했습니다."
    ]
  },
  quebec: {
    summaryKo:
      "퀘벡은 PNP가 아니라 별도 퀘벡 이민 체계로 운영됩니다. 현재는 PSTQ를 중심으로 보고, 4개 stream과 일부 파일럿을 같이 이해하는 게 좋습니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl: "https://www.quebec.ca/en/immigration/permanent/skilled-workers",
    officialOverviewLabel: "Quebec skilled worker programs",
    quickFacts: [
      { labelKo: "중심 프로그램", valueKo: "PSTQ" },
      { labelKo: "PSTQ 구조", valueKo: "4개 stream" },
      { labelKo: "주의", valueKo: "PEQ는 2025-11-19 종료" }
    ],
    streamGroups: [
      {
        titleKo: "PSTQ 4개 stream",
        descriptionKo: "현재 퀘벡 숙련인력 이민은 PSTQ 4개 stream으로 이해하는 것이 핵심입니다.",
        streams: [
          {
            nameKo: "Stream 1: Highly qualified and specialized skills",
            audienceKo: "FEER 0·1·2 중심 직군",
            noteKo: "고숙련·전문직 축입니다.",
            officialUrl:
              "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/requirements"
          },
          {
            nameKo: "Stream 2: Intermediate and manual skills",
            audienceKo: "FEER 3·4·5 중심 직군",
            noteKo: "중간숙련·실무형 직군을 위한 축입니다.",
            officialUrl:
              "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/requirements"
          },
          {
            nameKo: "Stream 3: Regulated professions",
            audienceKo: "면허·규제 직종",
            noteKo: "퀘벡 내 규제 직종 자격과 연결해서 봐야 합니다.",
            officialUrl:
              "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/requirements"
          },
          {
            nameKo: "Stream 4: Exceptional talent",
            audienceKo: "특별 재능 인력",
            noteKo: "일반 skilled worker와는 성격이 다릅니다.",
            officialUrl:
              "https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/requirements"
          }
        ]
      },
      {
        titleKo: "함께 봐야 할 기타 프로그램",
        descriptionKo: "숙련인력 외 파일럿과 종료된 제도도 같이 확인하는 편이 이해에 좋습니다.",
        streams: [
          {
            nameKo: "Permanent immigration pilot programs",
            audienceKo: "식품가공·orderlies·AI/IT/visual effects 등 특정 분야",
            noteKo: "일반 PSTQ와 별개로 특정 산업군을 겨냥합니다.",
            officialUrl: "https://www.quebec.ca/en/immigration/permanent/skilled-workers"
          },
          {
            nameKo: "Programme de l’expérience québécoise (PEQ)",
            audienceKo: "과거 퀘벡 경력·유학 기반 지원자",
            noteKo: "이 프로그램은 2025년 11월 19일 종료됐습니다.",
            officialUrl:
              "https://www.quebec.ca/en/immigration/permanent/skilled-workers/quebec-experience-program"
          }
        ]
      }
    ],
    notesKo: [
      "IRCC 공식 페이지도 Quebec는 PNP가 없고 별도 immigration programs를 보라고 안내합니다."
    ]
  },
  nunavut: {
    summaryKo:
      "누나붓은 territorial nominee program을 운영하지 않습니다. 이 지역을 목표로 한다면 연방 경로를 먼저 이해하는 것이 맞습니다.",
    verifiedOn: "2026-03-30",
    officialOverviewUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees/non-express-entry/eligibility.html",
    officialOverviewLabel: "IRCC PNP eligibility",
    quickFacts: [
      { labelKo: "Territorial nominee program", valueKo: "없음" },
      { labelKo: "대신 보는 경로", valueKo: "Express Entry 등 연방 경로" },
      { labelKo: "공식 안내", valueKo: "IRCC가 Nunavut has no PNP라고 명시" }
    ],
    streamGroups: [
      {
        titleKo: "연방 경로부터 보기",
        descriptionKo: "누나붓 정착을 생각한다면 별도 지명 프로그램이 아니라 연방 프로그램을 우선 봐야 합니다.",
        streams: [
          {
            nameKo: "Express Entry",
            audienceKo: "CEC·FSWP·FSTP 대상자",
            noteKo: "누나붓만의 별도 nomination 없이 연방 경제이민 경로를 사용합니다.",
            officialUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html"
          },
          {
            nameKo: "Settlement information for Nunavut",
            audienceKo: "정착 정보 확인이 필요한 지원자",
            noteKo: "IRCC의 Nunavut 소개와 정착 리소스를 함께 보는 편이 좋습니다.",
            officialUrl:
              "https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/provinces-territories/nunavut.html"
          }
        ]
      }
    ],
    notesKo: [
      "IRCC non-Express Entry eligibility 페이지는 Nunavut does not have a provincial nominee program이라고 안내합니다."
    ]
  }
};

export function getJurisdictionProfile(jurisdictionId) {
  return jurisdictionProfiles[jurisdictionId] ?? null;
}
