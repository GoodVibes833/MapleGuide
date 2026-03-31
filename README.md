# MapleGuide MVP

캐나다 이민 공지를 공식 소스에서 수집하고, 한국어 요약과 지역별 상세 페이지로 보여주는 초기 MVP입니다.

## 포함된 기능

- `EE`, `Ontario`, `BC`, `Manitoba`, `PEI`, `New Brunswick` 소스 레지스트리
- 정적 HTML 기반 파서 3종
  - 라벨형 메트릭 페이지
  - 기사형 업데이트 페이지
  - 표 기반 초청/드로우 페이지
- 정규화된 JSON 피드 생성
- 규칙 기반 한국어 요약 생성
- 지도 중심 메인 랜딩 페이지
- 주/연방 상세 HTML 페이지 생성
- fixture 기반 테스트

## 빠른 시작

```bash
npm test
npm run demo
npm run dev
```

실행 후 결과물:

- `out/feed.json`
- `out/dashboard.html`
- `out/index.html`
- `out/region/*/index.html`

로컬 웹 앱:

- `http://127.0.0.1:3000/`
- `http://127.0.0.1:3000/region/ontario`

## GitHub Pages 배포

이 저장소에는 GitHub Pages 배포 workflow가 포함되어 있습니다.

- workflow 파일: `.github/workflows/deploy-pages.yml`
- 동작:
  - `main` push 시 배포
  - 수동 실행 가능
  - 6시간마다 최신 공지 재수집 후 재배포

한 번만 할 일:

1. GitHub 저장소 `Settings > Pages`로 이동합니다.
2. `Build and deployment`의 source를 `GitHub Actions`로 설정합니다.
3. 첫 배포가 끝나면 Pages URL을 친구에게 공유하면 됩니다.

참고:

- GitHub Pages 경로 아래에서도 링크가 깨지지 않도록 `--base-path` 대응이 들어 있습니다.
- 배포 workflow는 fixture가 아니라 실제 수집(`npm run fetch`)으로 사이트를 생성합니다.
- 로컬에서 Pages 경로를 흉내 내고 싶다면 `npm run demo -- --base-path /MapleGuide`처럼 실행할 수 있습니다.

## 무료 방문자 추적 붙이기

MapleGuide는 무료인 `Google Analytics 4 (GA4)`를 바로 붙일 수 있게 준비되어 있습니다.

필요한 것:

1. Google Analytics에서 웹 데이터 스트림을 만들고 `G-XXXXXXXXXX` 형태의 Measurement ID를 확인합니다.
2. GitHub 저장소에서 `Settings > Secrets and variables > Actions > Variables`로 들어갑니다.
3. Repository variable 이름을 `MAPLEGUIDE_GA_MEASUREMENT_ID`로 만들고 값에 위 `G-...` ID를 넣습니다.
4. `main`에 다시 push하면 GitHub Pages에 자동 반영됩니다.

로컬에서도 확인할 수 있습니다:

```bash
MAPLEGUIDE_GA_MEASUREMENT_ID=G-XXXXXXXXXX npm run demo
MAPLEGUIDE_GA_MEASUREMENT_ID=G-XXXXXXXXXX npm run dev
```

현재 자동/커스텀으로 보는 이벤트:

- 기본 page view
- `form_started`
- `form_completed`
- `recommendations_rendered`
- `recommendation_detail_opened`
- `recommendation_region_clicked`
- `latest_update_opened`
- `older_updates_opened`

## 실제 운영 구조

1. `src/config/sources.js`에서 공식 소스를 관리합니다.
2. `src/core/fetcher.js`가 HTML을 가져옵니다.
3. `src/adapters/*`가 소스별 구조를 정규화합니다.
4. `src/translation/korean.js`가 한국어 요약을 만듭니다.
5. `src/site/render-dashboard.js`가 메인 지도와 지역 상세 HTML을 생성합니다.
6. `src/server.js`가 로컬 웹 서버와 새로고침 API를 제공합니다.
7. `MAPLEGUIDE_GA_MEASUREMENT_ID`가 있으면 GA4 스크립트와 주요 UX 이벤트를 같이 보냅니다.

## 운영 시 다음으로 붙일 것

- `Playwright` 추가: `canada.ca`나 JS 렌더링 페이지 대응
- DB 추가: `PostgreSQL` 또는 `Supabase`
- 스케줄러 추가: GitHub Actions, cron, Cloud Run Jobs
- 번역/요약 모델 추가: OpenAI 또는 DeepL
- 알림 기능: 이메일, 카카오톡, 텔레그램 등

## 웹 흐름

1. `POST /api/refresh`로 소스를 다시 수집합니다.
2. 메인 `/`에서 지도로 주나 연방을 선택합니다.
3. `/region/:id`에서 해당 지역의 공식 소스와 최신 공지를 확인합니다.

## 소스 추가 방법

`src/config/sources.js`에 항목을 추가하고 적합한 `adapter`를 지정하면 됩니다.

- `metric-labels`: EE 같은 라벨형 요약 페이지
- `article-page`: 공지/업데이트 기사 페이지
- `table-page`: BC/PEI/NB처럼 표 기반 공지 페이지

## 주의

- 현재 한국어 출력은 규칙 기반 MVP입니다.
- 실제 운영에서는 번역 모델과 사람 검수를 두는 것이 안전합니다.
- EE는 프로덕션에서 브라우저 렌더링 수집을 같이 두는 것이 좋습니다.
