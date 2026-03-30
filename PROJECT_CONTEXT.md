# MapleGuide Project Context

## What This Is

MapleGuide is a Canada immigration guidance web app for Korean-speaking users.
It has two core goals:

- help beginners understand which province or federal path to look at first
- track official immigration updates and explain them in a simpler, structured way

## Current Product Shape

- Home page:
  - compact `가장 최신 업데이트` strip at the top
  - `내 상황으로 먼저 찾기` questionnaire
  - recommendation cards with:
    - 예상 적합도
    - 이민 가능성
    - 예상 CRS
    - 최신 EE 컷오프
    - 현재 차이
    - 경력 인정 체크
    - 가능성 올리는 다음 액션
- Region pages:
  - objective overview first
  - stream categories
  - official source links
  - latest updates

## Current Data Mode

- local preview usually runs in `fixture` mode
- fixtures live in `/Users/alexhan/Documents/Alex_dev/Canada Imigration/fixtures`
- generated output goes to `/Users/alexhan/Documents/Alex_dev/Canada Imigration/out`

## Important Files

- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/site/render-dashboard.js`
  - main UI, questionnaire rendering, CRS estimate UI, latest updates strip
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/site/jurisdiction-ux.js`
  - jurisdiction normalization and beginner-friendly summaries
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/config/jurisdiction-profiles.js`
  - stream structure by province/federal
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/config/sources.js`
  - official sources registry
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/core/pipeline.js`
  - fetch/normalize/build pipeline
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/server.js`
  - local preview server

## Commands

```bash
npm test
npm run demo
node src/server.js --fixtures --port 3012
```

Preview URL commonly used:

- `http://127.0.0.1:3012/`

## Git / Repo

- GitHub repo: `https://github.com/GoodVibes833/MapleGuide`
- branch: `main`
- repo is intended to stay private for now

## Current UX Decisions

- top intro was intentionally reduced
- latest updates should stay visually compact and horizontal
- action buttons belong in the sticky top bar, not in the hero body
- users want direct number comparison, not vague EE wording
- career alignment matters:
  - working holiday
  - TEER 0-3 vs non-skilled work
  - Korean experience aligned or not aligned with target NOC
  - degree used vs not used

## Known Limitations

- CRS is still an estimate, not a full official calculator
- exact IELTS/CELPIP section scores are not yet collected
- spouse factors are only lightly reflected
- provincial rules are not yet a full rules database

## Best Next Steps

1. add precise CRS inputs:
   - IELTS/CELPIP section scores
   - spouse details
   - Canadian study / sibling / French bonus details
2. build province rules DB:
   - Ontario
   - BC
   - Alberta first
3. keep home page dense but compact:
   - update strip
   - better comparison cards
   - less explanatory filler
