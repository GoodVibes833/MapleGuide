# MapleGuide Persona Library

이 문서는 MapleGuide의 제품 설계용 페르소나 30개를 정리한 라이브러리입니다.

중요:

- 공식 통계 문서가 아니라, 한국인 사용자가 캐나다 이민을 준비할 때 자주 보이는 패턴을 제품 관점에서 정리한 가설 페르소나입니다.
- 목적은 `질문 설계`, `추천 로직 검증`, `설명 문구`, `플랜 A/B/C` 품질 점검입니다.
- 새 세션에서 이민 정보 업데이트를 하더라도, 이 페르소나 라이브러리는 계속 기준점으로 유지합니다.

## 공통으로 봐야 할 질문

각 페르소나를 평가할 때는 최소한 아래를 같이 봅니다.

1. 한국 경력과 캐나다 경력이 같은 NOC/TEER 축인지
2. 현재 캐나다 일이 연방 EE/CEC 기준으로 skilled인지
3. 주정부에서 low-skill 또는 sector-specific 예외가 있는지
4. 잡오퍼가 필요한지, 있으면 어느 정도 도움이 되는지
5. 언어점수가 CLB 7인지, CLB 9까지 올릴 수 있는지
6. 학교를 가야 하는 사람인지, 바로 경력형으로 가도 되는지
7. 도시 선호와 지역 정착 가능성 사이에서 어떤 trade-off가 있는지

제품 구현 메모:

- 질문에서는 `한국에서 하던 일`과 `지금 캐나다에서 하는 일`을 반드시 분리해서 받아야 합니다.
- 가능한 한 `실제 job title`도 같이 받아야 합니다. 예: cook / kitchen helper / server / office administrator / bookkeeper
- 많은 사용자는 한국 경력은 skilled인데 캐나다 현재 일은 non-skilled이거나, 반대로 한국 경력과 현재 일이 완전히 다릅니다.
- 그래서 추천은 `현재 캐나다 직무 그대로`, `한국 경력 축`, `같은 업종 안에서 직무 업그레이드`, `학교 -> PGWP`를 분리해서 제시해야 합니다.

## A. 한국 경력 그대로 이어지는 유형

### P01. 한국 개발자 -> 캐나다 개발자

- 배경: 한국에서 소프트웨어 개발 4-8년, 캐나다에서도 개발 또는 엔지니어 직무 희망
- 현재 상태: 한국 거주 또는 워홀/PGWP 초기
- 목표: EE 또는 Ontario/BC tech 축
- 자주 막히는 지점: 언어점수, ECA, 캐나다 경력 1년 부족
- 먼저 볼 것: Federal EE, Ontario HCP, BC tech 성격 경로
- 제품에서 해줘야 할 말: `직무는 skilled로 읽힐 가능성이 높고, CLB 9 여부가 체감 차이를 크게 만듭니다`

### P02. 한국 엔지니어 -> 캐나다 엔지니어/테크니션

- 배경: 기계/전기/화공/품질 엔지니어
- 현재 상태: 한국 경력은 깊지만 캐나다 현지 라이선스·직무 연결이 약함
- 목표: Alberta, Ontario, BC
- 자주 막히는 지점: 직무 title이 넓어서 NOC를 못 정함
- 먼저 볼 것: 현 직무를 engineer로 갈지 technologist로 갈지 정리
- 제품에서 해줘야 할 말: `전공과 경력이 좋아도 NOC를 좁히지 않으면 추천이 흐려집니다`

### P03. 한국 회계/북키핑 -> 캐나다 북키퍼/회계보조

- 배경: 한국 사무직이나 재무·회계 경력
- 현재 상태: 캐나다에서는 admin / bookkeeping / payroll로 이어지려 함
- 목표: Ontario, Alberta, Atlantic
- 자주 막히는 지점: 한국 경력은 office인데 캐나다 job title이 bookkeeping인지 admin인지 애매함
- 먼저 볼 것: 한국 경력과 캐나다 직무의 NOC 연결성
- 제품에서 해줘야 할 말: `같은 사무직이어도 회계/북키핑과 일반 admin은 경로 해석이 달라질 수 있습니다`

### P04. 한국 사무직 -> 캐나다 사무직

- 배경: 일반 사무행정, 코디네이터, 운영지원
- 현재 상태: 캐나다에서도 office admin 쪽으로 일함
- 목표: 대도시 선호, Ontario/BC 선호
- 자주 막히는 지점: 직무가 broad해서 skilled인지 체감이 약함
- 먼저 볼 것: TEER/NOC 확인, 직무 범위가 supervisor/coordination까지 가는지
- 제품에서 해줘야 할 말: `사무직은 skilled 축으로 잡히면 괜찮지만, title과 업무 범위 확인이 중요합니다`

### P05. 한국 마케팅/세일즈 -> 캐나다 세일즈/마케팅

- 배경: 한국 영업, 고객관리, 마케팅
- 현재 상태: 캐나다에서는 sales associate부터 다시 시작하는 경우가 많음
- 목표: 온타리오/BC 도시 취업 후 PR
- 자주 막히는 지점: 한국 경력은 skilled인데 캐나다 현재 일은 retail sales일 수 있음
- 먼저 볼 것: 지금 캐나다 일이 supervisor 이상인지, 아니면 한국 경력 축으로 갈지
- 제품에서 해줘야 할 말: `한국 경력과 현재 캐나다 job title이 다르면 어느 축을 주력으로 쓸지 먼저 정해야 합니다`

### P06. 한국 디자이너/콘텐츠 직군

- 배경: UI/UX, 그래픽, 콘텐츠 제작
- 현재 상태: 한국 경력은 있지만 캐나다에서는 계약직/프리랜서 비중이 큼
- 목표: EE 또는 도시권 취업
- 자주 막히는 지점: 경력 증빙, skilled full-time 연속성
- 먼저 볼 것: 연속 경력 인정과 language 점수
- 제품에서 해줘야 할 말: `직군 자체보다 경력 인정 형태와 고용 형태가 더 중요할 수 있습니다`

## B. 요리/서비스/리테일 계열

### P07. 한국 요리사 -> 캐나다 cook/chef

- 배경: 한국에서 요리사 5년, 캐나다에서도 cook/chef로 일함
- 현재 상태: 워홀/closed permit/PGWP 다양
- 목표: Alberta, Atlantic, Manitoba, Saskatchewan
- 자주 막히는 지점: cook은 주별로 유리한 곳이 다르고, 도시 선호면 선택지가 줄어듦
- 먼저 볼 것: 해당 주 employer-driven, hospitality, regional 경로
- 제품에서 해줘야 할 말: `요리 경력은 현실적으로 strong case가 될 수 있지만, 어느 주가 cook을 실제로 열어주는지 봐야 합니다`

### P08. 한국 제빵/파티시에 -> 캐나다 bakery/pastry

- 배경: 한국 bakery, pastry, dessert 카페 경력
- 현재 상태: 캐나다 F&B 매장 근무
- 목표: Alberta, Manitoba, Atlantic
- 자주 막히는 지점: title이 baker인지 food service worker인지 섞임
- 먼저 볼 것: 직무가 skilled trade인지 일반 food service인지
- 제품에서 해줘야 할 말: `같은 베이커리라도 production baker와 counter/service는 이민 해석이 크게 다릅니다`

### P09. 한국 요리사 -> 캐나다 food service supervisor

- 배경: 한국에서 kitchen lead, 캐나다에서 shift lead/supervisor
- 현재 상태: 현지 경력 누적 중
- 목표: 주정부 우선
- 자주 막히는 지점: supervisor title이 실제 duty와 맞는지
- 먼저 볼 것: supervisor 경력 인정, job offer, 지역 경로
- 제품에서 해줘야 할 말: `supervisor로 인정되면 서비스직 중에서는 경로가 훨씬 넓어질 수 있습니다`

### P10. 한국 서버/카페 -> 캐나다 서버/바리스타

- 배경: 한국 서비스업, 캐나다에서도 server/barista
- 현재 상태: 워홀에서 가장 흔한 초기 패턴
- 목표: PR 가능성 확인
- 자주 막히는 지점: 현재 일이 보통 EE skilled로 바로 안 잡힘
- 먼저 볼 것: supervisor 전환, 학교 경로, 지역/hospitality 예외
- 제품에서 해줘야 할 말: `지금 일만으로 바로 EE skilled가 안 될 수 있어, 전환 플랜이 더 중요합니다`

### P11. 한국 리테일 판매 -> 캐나다 retail sales

- 배경: 한국 매장 판매, 캐나다 retail associate
- 현재 상태: 도시권 선호
- 목표: Ontario/BC 선호 but PR 불안
- 자주 막히는 지점: sales floor는 low-skill로 해석될 가능성
- 먼저 볼 것: supervisor 전환, office pivot, school pivot
- 제품에서 해줘야 할 말: `리테일 판매는 그냥 오래 일한다고 바로 쉬워지지 않고, role change가 중요합니다`

### P12. 한국 매장 관리자 -> 캐나다 retail supervisor

- 배경: 한국 매니저 경력, 캐나다 supervisor
- 현재 상태: 현지 경력은 있지만 문서 정리가 약함
- 목표: Ontario, Alberta, Atlantic
- 자주 막히는 지점: 실제 duty 증빙, wage, employer 조건
- 먼저 볼 것: supervisor NOC, job duties, 고용주 조건
- 제품에서 해줘야 할 말: `리더 역할이 문서로 증명되면 판매직보다 훨씬 읽기 쉬운 케이스가 됩니다`

## C. 물류/운송/산업/트레이드

### P13. 한국 창고/물류 -> 캐나다 warehouse

- 배경: 한국 물류센터, shipping/receiving
- 현재 상태: 캐나다 warehouse associate
- 목표: 주정부 위주
- 자주 막히는 지점: 현재 role이 low-skill일 수 있음
- 먼저 볼 것: forklift lead, inventory coordinator, shipping supervisor 전환
- 제품에서 해줘야 할 말: `warehouse는 직무 단계가 중요해서 supervisor/coordinator로 올라가야 읽히는 경우가 많습니다`

### P14. 한국 트럭/배송 -> 캐나다 truck driver

- 배경: 한국 운송업 또는 캐나다에서 장거리 운전 직무
- 현재 상태: 캐나다 license/experience 확보 중
- 목표: Prairie, Atlantic, regional
- 자주 막히는 지점: license, employer, 지역 정착 의사
- 먼저 볼 것: 운송 카테고리, regional routes, employer-driven
- 제품에서 해줘야 할 말: `운송은 도시보다 지역 경로를 같이 볼 때 기회가 더 커질 수 있습니다`

### P15. 한국 전기/배관/목수 -> 캐나다 trade

- 배경: 한국 기능직/건설 trade
- 현재 상태: 캐나다 apprentice/helper 또는 closed permit
- 목표: Alberta, Saskatchewan, Manitoba
- 자주 막히는 지점: certification, apprenticeship 단계
- 먼저 볼 것: trade certification, employer, provincial trade 경로
- 제품에서 해줘야 할 말: `trade는 점수보다 자격·인증·고용 연결이 훨씬 중요합니다`

### P16. 한국 용접/정비/머시니스트 -> 캐나다 industrial trade

- 배경: 제조/공장 skilled trade
- 현재 상태: 캐나다 산업현장 취업 가능
- 목표: Prairie, Northern, regional
- 자주 막히는 지점: 어느 주가 해당 occupation을 실제로 열어주는지 모름
- 먼저 볼 것: Alberta, Saskatchewan, Manitoba, NWT
- 제품에서 해줘야 할 말: `industrial trade는 메트로보다 지역/산업벨트 쪽에서 더 강하게 읽힐 수 있습니다`

### P17. 한국 자동차 정비 -> 캐나다 mechanic

- 배경: 한국 정비소, dealership 경력
- 현재 상태: 캐나다 apprentice/technician
- 목표: Alberta, Atlantic, Ontario 외곽
- 자주 막히는 지점: certification, employer sponsorship
- 먼저 볼 것: occupation eligibility, trade certification
- 제품에서 해줘야 할 말: `정비는 경력 자체는 강하지만 certification 여부가 실제 진입 장벽이 됩니다`

## D. 보건/돌봄/교육

### P18. 한국 간호사 -> 캐나다 healthcare path

- 배경: 한국 RN 경력
- 현재 상태: 캐나다에서는 바로 RN으로 못 일하고 bridging이 필요할 수 있음
- 목표: healthcare category, PNP, study-bridge
- 자주 막히는 지점: license, 영어, local registration
- 먼저 볼 것: healthcare category, bridging school, allied health 대안
- 제품에서 해줘야 할 말: `간호는 장기적으로 강하지만, 초반엔 license gap을 어떻게 메우는지가 핵심입니다`

### P19. 한국 간병/요양보호 -> 캐나다 caregiver/PSW

- 배경: 한국 돌봄 경력
- 현재 상태: 캐나다 caregiver/PSW 취업 희망
- 목표: employer-driven 또는 sector-specific
- 자주 막히는 지점: 최근 프로그램 pause 여부, employer 조건
- 먼저 볼 것: 주정부 healthcare/support worker, school + PSW
- 제품에서 해줘야 할 말: `이 직군은 제도 변화가 잦아서 최신 소스 반영이 특히 중요합니다`

### P20. 한국 유치원/보육 -> 캐나다 ECE

- 배경: 한국 보육·유아교육 경력
- 현재 상태: 캐나다 daycare/ECE 진입 희망
- 목표: 교육 category, regional, provincial
- 자주 막히는 지점: 자격인정, local license
- 먼저 볼 것: ECE 자격, local demand, school/bridging
- 제품에서 해줘야 할 말: `교육축은 category-based selection과 주별 수요를 같이 보면 좋습니다`

### P21. 한국 교사 -> 캐나다 학교/교육지원

- 배경: 한국 학교 교사 또는 학원 강사
- 현재 상태: 캐나다 정규교사 진입은 어려워 교육지원으로 우회 가능
- 목표: education category, school route
- 자주 막히는 지점: teacher license, 경력 전환
- 먼저 볼 것: education-related jobs, school plan
- 제품에서 해줘야 할 말: `정규 교사만 생각하면 막히고, 교육 관련 지원직이나 재학 경로도 같이 봐야 합니다`

## E. 학생 / PGWP / 워홀

### P22. 한국 유학생 시작형

- 배경: 아직 캐나다 경력 없음, 학교부터 시작
- 현재 상태: 한국 거주
- 목표: 학업 -> PGWP -> skilled 경력 -> PR
- 자주 막히는 지점: 학교 선택만 하고 지역 경로를 안 봄
- 먼저 볼 것: tuition, PGWP eligibility, 졸업자 경로가 있는 주
- 제품에서 해줘야 할 말: `학교 이름보다 어느 주에서 졸업 후 경로가 열리는지가 더 중요할 수 있습니다`

### P23. 온타리오/BC 유학생인데 비용이 부담되는 유형

- 배경: 도시 선호 강함
- 현재 상태: 대도시만 보고 있음
- 목표: 토론토/밴쿠버 근처 정착
- 자주 막히는 지점: 높은 비용과 강한 경쟁
- 먼저 볼 것: 도시 생활 vs regional PR chance 비교
- 제품에서 해줘야 할 말: `대도시만 고집하면 경로가 좁아질 수 있어, regional fallback을 같이 보여줘야 합니다`

### P24. Atlantic college -> 졸업 후 PR

- 배경: 학비와 PR 둘 다 고려
- 현재 상태: Atlantic 학교 고려 또는 재학 중
- 목표: AIP, provincial graduate route
- 자주 막히는 지점: school만 보고 designated employer를 안 봄
- 먼저 볼 것: AIP employer, Atlantic graduate advantage
- 제품에서 해줘야 할 말: `Atlantic은 학교만이 아니라 졸업 뒤 employer 연결까지 같이 봐야 강합니다`

### P25. 워홀로 와서 아직 서비스직인 유형

- 배경: 한국 경력은 있지만 캐나다 현재 일은 server/cashier/barista
- 현재 상태: IEC open permit
- 목표: 워홀에서 PR로 연결
- 자주 막히는 지점: 현재 일은 non-skilled인데 시간만 지나면 될 거라 생각함
- 먼저 볼 것: supervisor 전환, 다른 skilled pivot, 학교 경로
- 제품에서 해줘야 할 말: `워홀은 비자 이름보다 지금 하는 일이 skilled인지가 핵심입니다`

### P26. PGWP인데 skilled 1년 직전 유형

- 배경: 캐나다 학위 있음
- 현재 상태: PGWP로 skilled 경력 8-10개월
- 목표: CEC, EE-linked PNP
- 자주 막히는 지점: 정확한 1년 계산과 서류 정리
- 먼저 볼 것: full-time equivalency, paystub, reference letter
- 제품에서 해줘야 할 말: `이 케이스는 점수보다 경력 인정일과 서류 정리가 중요합니다`

### P27. PGWP인데 현재 일이 non-skilled인 유형

- 배경: 캐나다 학위는 있지만 job title이 server, cashier, sales, helper
- 현재 상태: PGWP 남은 기간이 제한적
- 목표: PR 가능성 찾기
- 자주 막히는 지점: 지금 일로는 EE/CEC가 바로 안 됨
- 먼저 볼 것: role change, school extension, regional employer path
- 제품에서 해줘야 할 말: `현실적으로 가장 많은 유형 중 하나라, '학교 다시 가기 vs 직무 전환'을 구체적으로 비교해줘야 합니다`

## F. 불어 / 지역 / 특수 전략형

### P28. 영어는 보통인데 불어를 올릴 수 있는 유형

- 배경: 한국에서 불어 전공 또는 캐나다에서 불어 학습 의지 높음
- 현재 상태: 영어는 CLB 7 전후
- 목표: EE category, francophone path
- 자주 막히는 지점: 불어가 실제로 얼마나 체감 있는지 모름
- 먼저 볼 것: NCLC 7 목표, FCIP, Ontario/Atlantic francophone 요소
- 제품에서 해줘야 할 말: `불어는 일부 케이스에서 점수보다 구조를 바꾸는 강한 카드가 될 수 있습니다`

### P29. 대도시 선호지만 지역 정착도 열 수 있는 유형

- 배경: 처음엔 Toronto/Vancouver 선호
- 현재 상태: 점수나 경력이 애매함
- 목표: 가능하면 도시, 안 되면 regional
- 자주 막히는 지점: 지역 경로를 '패배 옵션'으로만 생각함
- 먼저 볼 것: Alberta Rural, RCIP, Atlantic, Prairie
- 제품에서 해줘야 할 말: `도시가 우선이어도 regional을 열면 PR chance가 실제로 커질 수 있습니다`

### P30. 30대 후반/40대 중반 경력자

- 배경: 한국 경력은 깊지만 CRS age factor가 불리함
- 현재 상태: 캐나다 경력 없거나 적음
- 목표: 점수만이 아닌 구조형 경로 찾기
- 자주 막히는 지점: EE 점수만 보고 포기함
- 먼저 볼 것: employer-driven, regional, school reset, business 일부
- 제품에서 해줘야 할 말: `이 유형은 점수형보다 주정부·지역·고용주 연결 플랜을 먼저 보여줘야 합니다`

## 이 문서를 나중에 어떻게 쓸지

다음 세션에서 아래 작업을 할 때 이 페르소나를 기준으로 삼습니다.

- 질문 폼 프리셋 만들기
- 추천 결과 sanity check
- 직업군 세분화
- `학교 가야 함 / 직무 전환 필요 / 바로 EE 가능` 같은 현실 설명 개선
- 추천 카드 예시 시나리오 만들기

좋은 다음 단계:

1. 이 30개를 `preset cards`로 줄이기
2. 각 페르소나에 `예상 첫 추천 3개` 달기
3. `현재 직군`과 `한국 직군`을 따로 받아 persona match를 자동화하기
