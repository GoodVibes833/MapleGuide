export const provinceStreamRules = {
  ontario: {
    overviewKo: "온타리오는 EE NOI, Employer Job Offer, In-Demand Skills, 학생/졸업 경로를 스트림별로 나눠서 보는 편이 이해가 쉽습니다.",
    spouseKo: "배우자와 같이 가면 Ontario는 주신청자/배우자를 바꿔 EE 점수와 Employer Job Offer 가능성을 같이 비교하는 편이 좋아요.",
    schoolKo: "온타리오는 학교를 간다면 과정 이름보다 PGWP 가능 여부, 졸업 후 local employer 연결, International Student 또는 Masters/PhD 경로를 같이 봐야 합니다.",
    regulatedKo: "간호, ECE, 교사, 일부 기술직은 온타리오 registration·licensing 준비를 병행해야 실제 employer job offer와 stream 연결이 더 자연스러워집니다.",
    rules: [
      {
        id: "oinp-ee-noi",
        labelKo: "EE NOI / Human Capital 계열",
        entryKo: "EE 프로필 + NOI 대상 직군/점수대",
        noteKo: "온타리오는 CRS만 보는 게 아니라 NOI를 주는 직군, 학력, 점수대와 맞는지가 중요합니다.",
        tokens: ["ee", "professional", "health", "trades", "french", "local-skilled"]
      },
      {
        id: "oinp-employer",
        labelKo: "Employer Job Offer",
        entryKo: "온타리오 고용주 job offer + EOI",
        noteKo: "사무·보건·기술직은 local employer job offer가 붙으면 OINP 해석이 훨씬 선명해질 수 있습니다.",
        tokens: ["job-offer", "professional", "health", "trades", "local-skilled"]
      },
      {
        id: "oinp-indemand",
        labelKo: "In-Demand Skills",
        entryKo: "특정 TEER 4/5 NOC + 온타리오 고용주",
        noteKo: "care, warehouse, 일부 service/support 직무는 일반 skilled 점수형보다 In-Demand Skills 예외 경로부터 확인하는 편이 현실적입니다.",
        tokens: ["low-skill", "care-support", "warehouse", "service-entry", "job-offer"]
      },
      {
        id: "oinp-student",
        labelKo: "학생/졸업 경로",
        entryKo: "Ontario study + 졸업 후 local employer 또는 graduate 경로",
        noteKo: "직무가 애매하면 학교 -> PGWP -> Ontario local employer 흐름으로 다시 설계하는 편이 더 현실적일 수 있습니다.",
        tokens: ["school", "student", "graduate"]
      }
    ]
  },
  alberta: {
    overviewKo: "알버타는 worker EOI, priority sector, Tourism and Hospitality, Rural Renewal처럼 worker와 community 축을 같이 읽는 편이 맞습니다.",
    spouseKo: "배우자와 같이 가면 알버타는 주신청자 한 명을 local worker 축으로 두고, 다른 한 명은 EE 또는 school 보조 전략으로 두는 편이 자주 쓰입니다.",
    schoolKo: "알버타 학교 경로는 PGWP 뒤 local skilled work를 붙이는 흐름이 중요하고, 단순 졸업보다 어떤 지역/sector employer로 이어지는지가 더 중요합니다.",
    regulatedKo: "trade, mechanic, 일부 healthcare 직군은 알버타 certification·registration 여부가 employer-driven과 worker EOI 해석에 직접 영향을 줄 수 있습니다.",
    rules: [
      {
        id: "aaip-worker-eoi",
        labelKo: "AAIP Worker EOI",
        entryKo: "알버타 local work + 우선 sector + worker profile",
        noteKo: "알버타는 현재 Alberta 근무, sector priority, local connection이 붙을 때 worker EOI가 더 현실적으로 읽힙니다.",
        tokens: ["professional", "health", "trades", "local-skilled", "job-offer"]
      },
      {
        id: "aaip-hospitality",
        labelKo: "Tourism and Hospitality",
        entryKo: "hospitality employer + Alberta worker 조건",
        noteKo: "server, front-line hospitality는 그대로보다 cook·food service supervisor 또는 hospitality worker 조건으로 읽히는지 먼저 확인해야 합니다.",
        tokens: ["hospitality", "service-entry", "job-offer", "low-skill"]
      },
      {
        id: "aaip-rural",
        labelKo: "Rural Renewal / 지역 employer",
        entryKo: "community endorsement + employer + 지역 정착",
        noteKo: "도시만 고집하지 않으면 community endorsement, 지역 employer, Rural Renewal이 실제 우회로가 될 수 있습니다.",
        tokens: ["regional", "job-offer", "trades", "health", "low-skill"]
      },
      {
        id: "aaip-graduate",
        labelKo: "학교 -> local worker",
        entryKo: "Alberta study + PGWP + local skilled work",
        noteKo: "현재 직무가 애매하면 알버타 학업 후 local skilled work로 다시 들어가는 플랜이 더 선명할 수 있습니다.",
        tokens: ["school", "student", "graduate"]
      }
    ]
  },
  "nova-scotia": {
    overviewKo: "노바스코샤는 stream 자격, targeted sector, local employer, AIP를 함께 읽는 구조라 점수 하나로 설명되지 않습니다.",
    spouseKo: "배우자와 같이 가면 노바스코샤는 local employer/AIP 축과 EE 보조 전략을 나눠 보는 편이 이해하기 쉽습니다.",
    schoolKo: "노바스코샤는 학교를 간다면 PGWP 뒤 local employer, AIP, local experience로 이어지는 흐름을 같이 봐야 합니다.",
    regulatedKo: "보건, ECE, 교사처럼 규제 가능성이 있는 직군은 노바스코샤 registration과 local employer 수요를 같이 확인해야 합니다.",
    rules: [
      {
        id: "ns-targeted",
        labelKo: "Targeted / sector 초청",
        entryKo: "보건·교육·기술·transport 등 우선 sector",
        noteKo: "노바스코샤는 타깃 직군이면 local employer나 experience와 결합해서 빨리 열릴 수 있습니다.",
        tokens: ["health", "education", "trades", "transport", "professional", "local-skilled"]
      },
      {
        id: "ns-employer-aip",
        labelKo: "AIP / local employer",
        entryKo: "Atlantic employer + local experience",
        noteKo: "대서양권은 EE보다 employer-driven이 먼저인 경우가 많아 AIP와 local employer를 같이 보는 편이 맞습니다.",
        tokens: ["job-offer", "hospitality", "health", "low-skill", "atlantic"]
      },
      {
        id: "ns-graduate",
        labelKo: "학교/졸업 경로",
        entryKo: "Nova Scotia study + PGWP + local employer",
        noteKo: "직무가 애매하면 학교 후 현지 취업으로 다시 들어가는 쪽이 더 현실적일 수 있습니다.",
        tokens: ["school", "student", "graduate"]
      }
    ]
  },
  "prince-edward-island": {
    overviewKo: "PEI는 EOI를 두더라도 실제로는 노동시장 우선순위와 employer 연결이 강하게 작동하는 편입니다.",
    spouseKo: "배우자와 같이 가면 PEI는 local employer와 EE 보조 전략을 동시에 두고, 누가 job offer를 더 현실적으로 붙일지 보는 편이 좋습니다.",
    schoolKo: "PEI 학교 경로는 학위 자체보다 졸업 후 employer 연결과 local retention이 더 중요합니다.",
    regulatedKo: "규제직이면 작은 주 특성상 local employer, license 준비, 지역 정착 의사를 같이 보여주는 편이 더 설득력 있습니다.",
    rules: [
      {
        id: "pei-labour-eoi",
        labelKo: "Labour / Express Entry EOI",
        entryKo: "PEI employer + labour market priority + EOI",
        noteKo: "PEI는 현재 직무와 employer 연결이 보일수록 EOI 해석이 훨씬 선명해집니다.",
        tokens: ["job-offer", "professional", "health", "hospitality", "transport", "local-skilled"]
      },
      {
        id: "pei-atlantic",
        labelKo: "Atlantic employer-driven",
        entryKo: "AIP designated employer + 정착 의사",
        noteKo: "PEI는 AIP를 같이 보면 employer-driven 경로가 실제로 더 빠른 경우가 많습니다.",
        tokens: ["job-offer", "atlantic", "low-skill", "hospitality"]
      },
      {
        id: "pei-graduate",
        labelKo: "국제학생/졸업 경로",
        entryKo: "PEI study + local employer + 졸업 후 정착",
        noteKo: "현재 직무가 약하면 PEI에서 학교 후 local employer를 붙이는 흐름이 더 자연스러울 수 있습니다.",
        tokens: ["school", "student", "graduate"]
      }
    ]
  },
  saskatchewan: {
    overviewKo: "사스카츄완은 점수 하나보다 pathway 자격, 직군, 고용주, 지역 연결을 먼저 읽는 편이 맞습니다.",
    spouseKo: "배우자와 같이 가면 사스카츄완은 한 명의 local worker 또는 employer 축과, 다른 한 명의 학교/EE 보조 전략을 비교하는 편이 좋습니다.",
    schoolKo: "사스카츄완 학교 경로는 졸업 후 local employer와 regional 정착을 같이 볼 때 더 현실적으로 읽힙니다.",
    regulatedKo: "trade, mechanic, healthcare 같은 직군은 자격증/registration이 pathway 적합도에 직접 영향을 줄 수 있습니다.",
    rules: [
      {
        id: "sinp-worker",
        labelKo: "Worker / occupation pathway",
        entryKo: "local worker 또는 targeted occupation 자격",
        noteKo: "사스카츄완은 현재 직무가 targeted occupation이나 local worker 자격과 맞는지가 먼저입니다.",
        tokens: ["professional", "health", "trades", "transport", "local-skilled"]
      },
      {
        id: "sinp-employer",
        labelKo: "Employer / hard-to-fill 성격",
        entryKo: "고용주 연결 + semi-skilled 또는 service 예외",
        noteKo: "service·warehouse·retail 쪽은 employer와 pathway 예외를 먼저 봐야 하는 경우가 많습니다.",
        tokens: ["job-offer", "low-skill", "service-entry", "warehouse", "regional"]
      },
      {
        id: "sinp-student",
        labelKo: "학교 -> local 경로",
        entryKo: "Saskatchewan study + 졸업 후 local work",
        noteKo: "지금 직무로 바로 안 풀리면 사스카츄완 학교 -> local worker 흐름이 더 깔끔할 수 있습니다.",
        tokens: ["school", "student", "graduate"]
      }
    ]
  },
  "newfoundland-and-labrador": {
    overviewKo: "뉴펀들랜드 래브라도는 2단계 EOI 구조에서 employer, occupation priority, AIP/NLPNP 연결을 같이 읽는 편이 맞습니다.",
    spouseKo: "배우자와 같이 가면 뉴펀들랜드는 한 명의 employer 연결과 다른 한 명의 school·settlement 보조 전략을 같이 두는 편이 좋습니다.",
    schoolKo: "뉴펀들랜드 학교 경로는 local employer, graduation, settlement story가 같이 보일수록 더 설득력이 생깁니다.",
    regulatedKo: "health, education, 일부 trade는 뉴펀들랜드 licensing과 employer 연결을 같이 준비해야 실제 경로 판단이 쉬워집니다.",
    rules: [
      {
        id: "nl-eoi",
        labelKo: "2단계 EOI / 우선 sector",
        entryKo: "EOI 제출 + occupation/education/employer priority",
        noteKo: "뉴펀들랜드는 점수보다 occupation priority와 employer 연결이 더 직접적인 경우가 많습니다.",
        tokens: ["professional", "health", "trades", "education", "local-skilled"]
      },
      {
        id: "nl-aip",
        labelKo: "AIP / designated employer",
        entryKo: "AIP employer + local settlement",
        noteKo: "대서양권 특성상 employer-driven 경로가 실제 우회로가 되기 쉬워 AIP를 같이 봐야 합니다.",
        tokens: ["job-offer", "atlantic", "hospitality", "low-skill"]
      },
      {
        id: "nl-graduate",
        labelKo: "학교/졸업 경로",
        entryKo: "뉴펀들랜드 학업 후 local employer",
        noteKo: "직무가 애매하면 학교 -> 졸업 -> local employer -> EOI 재비교 흐름이 더 선명할 수 있습니다.",
        tokens: ["school", "student", "graduate"]
      }
    ]
  }
};

export const sourceExpansionWatchlist = [
  {
    id: "aaip-processing-information",
    jurisdiction: "alberta",
    labelKo: "AAIP worker / priority sector draw 정보",
    reasonKo: "알버타 worker EOI, priority sector, Rural Renewal 변화를 공식 draw 페이지 기준으로 더 세밀하게 반영하기 위한 watchlist입니다."
  },
  {
    id: "nova-scotia-stream-updates",
    jurisdiction: "nova-scotia",
    labelKo: "노바스코샤 프로그램 / targeted stream 공지",
    reasonKo: "노바스코샤의 타깃 초청, stream 개편, sector 우선순위 변화를 더 자주 확인하기 위한 watchlist입니다."
  },
  {
    id: "saskatchewan-worker-pathways",
    jurisdiction: "saskatchewan",
    labelKo: "SINP worker / employer pathway 공지",
    reasonKo: "사스카츄완 worker, employer, hard-to-fill 성격 경로의 세부 변화를 rules DB와 같이 갱신하기 위한 watchlist입니다."
  },
  {
    id: "newfoundland-eoi-updates",
    jurisdiction: "newfoundland-and-labrador",
    labelKo: "뉴펀들랜드 2단계 EOI 운영 공지",
    reasonKo: "EOI 운영 방식, 우선 sector, employer 연결 변화가 크기 때문에 별도 watchlist로 두고 다시 확인해야 합니다."
  }
];
