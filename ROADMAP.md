# MapleGuide Completion Roadmap

이 문서는 MapleGuide를 `지금의 MVP`에서 `실제로 한국인 사용자가 방향을 얻고 움직일 수 있는 캐나다 이민 가이드`로 완성하기 위한 상세 로드맵입니다.

중요:

- 이 문서는 단순 아이디어 메모가 아닙니다.
- 새 세션에서 작업을 이어갈 때 `무엇을 먼저 해야 하는지`, `무엇이 아직 미완성인지`, `어떤 순서로 밀어야 하는지`를 바로 판단할 수 있도록 작성합니다.
- 구현 중 방향이 흔들리면 이 문서를 기준으로 다시 정렬합니다.

## 1. 최종 제품 목표

MapleGuide의 완성형 목표는 아래 3가지를 동시에 만족하는 것입니다.

1. 초보자도 1-2분 안에 `연방 vs 주정부 vs 특수경로` 방향을 이해할 수 있어야 한다.
2. 현실적인 사용자 케이스, 특히 `한국 경력과 캐나다 현재 일이 다른 사람`, `현재 일이 non-skilled인 사람`, `학교를 다시 가야 하는 사람`까지 커버해야 한다.
3. 최신 공식 정보가 반영되어 있어야 하고, 사용자에게 `이 경로는 지금도 열려 있는지`, `무엇이 바뀌었는지`를 신뢰성 있게 보여줘야 한다.

## 2. 지금까지 구현된 것

현재 이미 있는 핵심 기능:

- 최신 업데이트 카드
- 한국어 중심 질문 폼
- 주정부 추천 1-3순위
- 연방 / EE 별도 카드
- 한국 직무 / 캐나다 직무 / 주력 경력 축 분리
- 실제 job title 입력과 직군 추론
- 일부 starter persona presets
- province card 안의:
  - 선발 방식 요약
  - 직무 현실 체크
  - 직무 lens
  - 연방/EE bridge
  - concrete plan A/B/C
  - timeline
- GitHub Pages 배포
- GA4 준비
- 프로젝트 컨텍스트 문서화

현재 wired official sources:

- Express Entry rounds
- Ontario OINP updates
- BC invitations
- Manitoba draw
- PEI draws
- New Brunswick invitation rounds

## 3. 지금 가장 부족한 부분

### A. 직무/NOC 정밀도 부족

현재는 직군을 많이 늘렸지만, 아직도 `직군군` 중심입니다.

부족한 점:

- 사용자의 실제 title을 NOC 후보 2-3개로 강하게 좁혀주지 못함
- 주별로 `이 NOC는 된다 / 안 된다 / 예외 stream이 있다` 수준의 rules DB가 부족함
- `server`, `retail sales`, `warehouse associate`, `PSW`, `front desk`처럼 애매한 직무에서 현실 판단이 아직 거칠다

### B. 주별 rules DB 부족

현재는 주별 selection model 설명은 있지만, 아직 스트림 단위 공식 규칙 DB가 충분하지 않습니다.

예:

- Ontario In-Demand Skills
- Alberta Tourism and Hospitality
- Alberta Rural Renewal
- Atlantic employer-driven
- Saskatchewan pathway logic
- Newfoundland 2-step EOI
- Nova Scotia targeted stream logic

위 항목들은 UX에는 반영됐지만, 아직 구조화된 규칙엔진 수준은 아닙니다.

### C. 학교 경로 구체화 부족

지금은 `학교 -> PGWP -> skilled 경력`까지는 말하지만,

- 어느 주에서
- 어떤 성격의 과정
- 왜 그 주가 더 좋은지
- 졸업 후 어느 stream과 연결되는지

까지는 아직 충분히 구체적이지 않습니다.

### D. live data coverage 부족

현재 GitHub Pages 기준으로는 anti-bot이나 동적 페이지 문제 때문에 fixture fallback을 쓰는 소스가 생길 수 있습니다.

즉:

- 화면은 깨끗하지만
- 완전한 실시간성은 아직 부족할 수 있음

## 4. 완성 정의

MapleGuide를 `완성에 가깝다`고 볼 기준은 아래입니다.

### 사용자 경험 기준

- 사용자가 질문 폼만 보고도 헷갈리지 않는다
- 추천 1-3이 왜 나왔는지 한 번에 이해된다
- 연방/주정부/특수경로 차이를 혼동하지 않는다
- 현재 직무가 안 되는 경우 `왜 안 되는지`와 `그럼 무엇을 하면 되는지`를 바로 이해한다

### 데이터 기준

- 주요 연방 + 주요 주정부 소스가 공식 페이지 기준으로 최신화된다
- 각 추천 카드의 근거가 공식 구조와 크게 어긋나지 않는다
- broken HTML, anti-bot 응답, head/meta markup 노출이 없다

### 추천 로직 기준

- 한국 경력축
- 캐나다 현재 직무축
- 학교 경유축
- employer-driven 축
- regional/rural 축
- French 축

이 6개가 각기 별도 전략으로 설명 가능해야 한다.

### 분석 기준

- 최소한 아래는 GA4에서 볼 수 있어야 한다:
  - 폼 시작
  - 폼 완료
  - 추천 카드 열람
  - 상세 펼침
  - 지역 페이지 이동
  - 최신 업데이트 펼침

## 5. 추천 개발 순서

아래 순서대로 가는 것이 가장 효율적입니다.

## Phase 1. 직무/NOC 해석 강화

목표:

- 직군군 -> 실제 title -> 후보 NOC/role interpretation 수준으로 끌어올리기

해야 할 일:

1. `한국에서 실제로 하던 job title`
2. `지금 캐나다에서 실제로 하는 job title`

두 입력을 기반으로 후보 NOC-like 해석 2-3개를 제안하는 레이어 추가

예:

- `Server`
  - Server
  - Food counter attendant
  - Food service supervisor (upgrade target)

- `Office Administrator`
  - Administrative assistant
  - Office administrator
  - Administrative coordinator

완료 조건:

- 폼 단계에서 title만 넣어도 candidate role이 보임
- 추천 카드에서 `현재 role`, `upgrade target`, `school path target`이 분리됨

## Phase 2. 주별 rules DB 1차

목표:

- 가장 많이 쓰는 주를 스트림 단위로 현실적으로 읽게 만들기

우선 주:

1. Ontario
2. Alberta
3. Nova Scotia
4. PEI
5. Saskatchewan
6. Newfoundland and Labrador

각 주마다 최소한 아래 필드를 구조화:

- stream name
- selection_model
- requires_job_offer
- accepts_EE_link
- allows_low_skill_or_sector_exception
- prefers_local_experience
- prefers_graduates
- rural_or_regional_bias
- occupation_notes
- school_route_relevance

완료 조건:

- 추천 카드에서 “이 주에서 왜 이 직무가 되는지/안 되는지”가 rule 기반으로 보임
- service-entry / retail / care / warehouse 같은 애매한 케이스도 설명 가능

## Phase 3. non-skilled 현실 플랜 엔진

목표:

- 가장 현실적으로 많은 사용자층을 제대로 커버

대표 대상:

- server
- barista
- cashier
- retail sales
- warehouse associate
- housekeeping
- front desk
- PSW/caregiver

필수 출력:

- 지금 직무 그대로 밀기
- 같은 업종 안에서 supervisor로 올리기
- 한국 경력축으로 재구성
- 학교 -> PGWP
- employer-driven / regional

완료 조건:

- `왜 안 되는지`와 `그럼 무엇을 하면 되는지`가 짧고 구체적으로 설명됨

## Phase 4. 학교 경로 구체화

목표:

- 학교를 가야 하는 사람에게 추상적인 말이 아니라 실전형 제안을 주기

필수 구조:

- 왜 학교가 필요한지
- 학교 가면 어떤 축이 열리는지
- 졸업 후 어떤 stream을 보는지
- 이 주를 고르는 이유
- 대도시/지역 trade-off

예:

- Ontario school route
- Atlantic school + employer route
- Alberta regional school route
- BC high-cost metro route vs regional alternative

완료 조건:

- `학교 -> PGWP -> skilled 1년`이 단순 문구가 아니라 주별 플랜으로 보임

## Phase 5. live official data 확장

목표:

- “최신 정보” 신뢰도를 높이기

추가 우선 소스:

- AIP official pages
- RCIP / FCIP
- Alberta Rural Renewal
- Newfoundland EOI
- Saskatchewan updated stream pages
- Nova Scotia integrated stream updates

주의:

- GitHub Pages만으로는 anti-bot 한계가 있으니, long-term으로는 서버/cron/Playwright가 필요할 수 있음

완료 조건:

- 최신 업데이트 카드에 깨진 raw HTML이 나오지 않음
- 주요 특수경로도 공식 기준으로 최신 반영됨

## Phase 6. analytics / product iteration

목표:

- 실제 사용자 행동 기반으로 폼과 카드 개선

우선 지표:

- 어떤 persona preset이 가장 많이 쓰이는지
- 어떤 질문에서 이탈하는지
- 어떤 추천 카드가 가장 많이 열리는지
- 주정부 vs 연방 중 무엇을 더 많이 클릭하는지

완료 조건:

- UX 변경이 감으로만 아니라 실제 사용 데이터 기반으로 돌아감

## 6. 다음 세션에서 바로 할 일

새 세션에서 `계속 진행해`가 오면 이 순서로 들어가는 것이 좋습니다.

1. `PROJECT_CONTEXT.md` 확인
2. `ROADMAP.md` 확인
3. `PERSONAS.md` 확인
4. 현재 `src/site/render-dashboard.js`의 직무 판정 레이어부터 읽기
5. 직무 -> NOC 후보 해석 강화부터 진행

## 7. “정보 업데이트해” 요청이 왔을 때의 별도 절차

정보 업데이트는 UX 작업과 별개입니다.

반드시 아래 순서:

1. 공식 소스 재확인
2. 파이프라인 재실행
3. anti-bot / broken HTML 확인
4. fixture fallback 상태 확인
5. 한국어 요약 확인
6. 테스트
7. Pages 결과 확인

즉:

- 문구 수정 먼저 금지
- 공식 정보 재검증 먼저

## 8. 현재 추천하는 바로 다음 작업

지금 시점에서 가장 가치가 큰 다음 작업은 아래입니다.

1. 실제 job title -> 후보 role/NOC 제안 강화
2. Ontario / Alberta / Nova Scotia / PEI / Saskatchewan / Newfoundland rules DB 1차
3. non-skilled 사용자에게 `직무전환 vs 학교 vs regional employer`를 더 강하게 구분

## 9. 하지 말아야 할 것

- 주정부 카드 메인에 연방 CRS를 다시 전면 배치하지 말 것
- 긴 설명형 히어로 섹션 부활시키지 말 것
- 지도를 다시 메인 핵심 기능으로 올리지 말 것
- persona preset을 너무 많이 늘려 폼보다 더 커지게 만들지 말 것
- raw HTML이 보이는 live update 상태를 그냥 두지 말 것

## 10. 최종 그림

완성된 MapleGuide는 아래처럼 보여야 합니다.

- 사용자는 자기 상황을 한국어로 입력한다
- 앱은 `연방`, `주정부`, `특수경로`를 헷갈리지 않게 분리해 보여준다
- 현재 직무가 안 되면 `왜 안 되는지`를 말한다
- 그 대신 `직무전환`, `학교`, `고용주`, `지역이동`, `불어`, `nomination` 중 어떤 전략이 맞는지 구체적으로 보여준다
- 최신 정책 변화도 함께 반영된다
- 운영자는 GA4로 어디서 사람들이 막히는지 본다

이 상태가 MapleGuide의 목표 완성형이다.
