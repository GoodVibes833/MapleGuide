# MapleGuide Project Context

## Product Goal

MapleGuide is a Korean-first Canada immigration guidance site.

The product goal is not just "show immigration info".
It should help a beginner answer these questions quickly:

1. Should I look at federal or provincial first?
2. Which province should I look at first?
3. What do I already have?
4. What is missing right now?
5. If I change my language score, job, school path, or region choice, what path opens up?

## Quick Snapshot

Current repo status:

- public GitHub Pages deployment is live
- recommendation engine is centered in `src/site/render-dashboard.js`
- province stream rule overlays now live in `src/config/province-stream-rules.js`
- province recommendations are primary, federal/EE is separate
- typed Korea/Canada job titles now feed occupation inference
- typed titles now also use a structured title-profile layer, so exact inputs like `Food Service Supervisor`, `Dispatcher`, `Bookkeeper`, `Office Administrator` can override the broader occupation bucket
- questionnaire answers can now be saved, loaded, and reset inside the same browser session
- dashboard recommendation snapshots now persist in session storage, so jurisdiction pages can restore a user-specific top plan block from the latest main-page answers
- visible save/load/reset controls were removed again; session persistence remains internal for browser back-navigation and dashboard -> jurisdiction -> back continuity
- GA4 is prepared but only active if `MAPLEGUIDE_GA_MEASUREMENT_ID` is configured

If a future session needs the full long-range build plan, read:

- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/ROADMAP.md`

If a future session needs persona sanity checks, read:

- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/PERSONAS.md`

## Recent Milestones

Recent high-signal progress already completed:

- split Korea job vs Canada job vs anchor career axis
- added province occupation lens and NOC-like examples
- added job reality checks and route reality badges
- added richer occupation families for hospitality, retail, warehouse, care, beauty, manufacturing, trades
- added live title interpretation hints under Korea/Canada job title inputs
- added a shared `입력한 직무를 이렇게 읽고 있어요` summary block above recommendations
- added a `지금 주력으로 보기` anchor summary so users can see whether MapleGuide currently prefers:
  - Korea experience
  - current Canadian work
  - transition / school route
  - or still needs more detail
- added `title 단계` interpretation and wired actual typed job titles into recommendation scoring, so `Server`, `Administrative Assistant`, `Bookkeeper`, `Dispatcher`-type differences affect both ranking and route wording instead of only the broad occupation bucket
- added structured title-role profiles so exact typed titles now change:
  - the `정밀 title 후보` shown in the title interpretation block
  - the skill-band explanation shown for the title
  - the province occupation lens NOC examples / candidate profiles
  - the province rules DB token hits used by `주별 stream 현실 가이드`
- weighted exact-title token hits more heavily inside `주별 stream 현실 가이드`, so `Food Service Supervisor`, `Dispatcher`, `Bookkeeper`, `Office Administrator`-type titles now influence which province stream cards rise to the top
- added a `맞는 이유:` line inside each province stream guide card so users can see whether the match came from:
  - the exact typed title
  - school / PGWP
  - employer / job offer
  - EE linkage
  - local skilled work
  - regional or other route tokens
- added `NOC-like 후보` to the title interpretation block and `정밀 title 기준 NOC-like` to province/federal occupation lens cards, so typed titles now show a more precise candidate-role translation instead of only a broad occupation family
- added `exact title -> 먼저 붙는 stream` guidance inside `주별 stream 현실 가이드`, so users can see which province rules their exact typed title is hitting first
- added mismatch handling for cases where the user marks the role as skilled but the typed title still looks broad or entry-level; these now shift province plans toward title upgrade / school / exception routes instead of over-trusting the broad category
- changed `해외 숙련 경력` handling so MapleGuide no longer treats any foreign work history as usable skilled experience by default
- foreign experience is now counted conservatively only when:
  - the Korea-side role/title is specific enough
  - the Korea-side role does not still read as clear entry / TEER 4-5 style work
  - the user says that experience is actually connected to the occupation they want to immigrate with
- this means examples like `한국 manager -> 현재 캐나다 server` or `한국 알바/서비스만 함` should no longer automatically behave like direct foreign skilled experience
- changed province quick actions so non-skilled or ambiguous roles prioritize route steps before generic score boosting
- added low-cost action nudges for budget-sensitive users, so MapleGuide can prefer:
  - language + document + NOC tightening first
  - employer-based permit extension checks when remaining time is short
  - school routes later when they are clearly the more expensive fallback
- federal and EE-linked cards now expose an `가능한 점수/경로 옵션 전체 보기` panel
  - users can see more than the top 2 actions
  - language / French / school / job-offer / nomination style options can be checked together
  - the panel shows a rough selected-score summary like `예상 CRS 378점 +89점 → 467점`
- Canadian skilled experience options inside that panel are now staged by remaining milestone year, e.g. `4년까지`, `5년까지`
  - if the user is already at 3 years, MapleGuide should expose both 4-year and 5-year options
  - these staged options must not double-count against each other in the selected-score summary; same-family score options should collapse to the best checked milestone instead of summing every step
- score option summaries now also show the gap against the latest EE cutoff when `ee-rounds` cutoff data is available
  - expected phrasing is plain-language Korean, e.g. `최근 EE 컷오프 492점 기준 아직 40점 모자라요` or `최근 EE 컷오프 492점보다 10점 높아요`
- changed the federal improvement summary so the header shows the summed lift from the currently proposed actions, e.g. `예상 CRS 423점 +89점 → 512점`, instead of hiding the delta inside only the sub-actions
- added recommendation snapshot persistence from the main dashboard so recommendation cards can hand a user-specific action bundle to the matching jurisdiction page
- added a new jurisdiction top panel, `메인에서 보던 내 상황 기준으로 이 주에서 먼저 할 것`, that restores:
  - why this jurisdiction was recommended
  - what the user already has
  - immediate quick actions
  - EE bridge info when relevant
  - stream guide cards
  - concrete plan variants
  - short timeline
- current intended UX direction for jurisdiction pages:
  - keep the generic province page structure
  - but always lead with the personalized top block when the user arrived from the main recommendation flow
  - this preserves official program context without breaking the feeling of continuity between dashboard and region page
- added occupation-specific planner focus for common ambiguous personas:
  - `server / barista / cashier -> food service supervisor or cook`
  - `retail sales -> retail supervisor or office coordinator`
  - `warehouse associate -> inventory coordinator or dispatcher`
  - `PSW / caregiver -> exception stream or employer-driven path`
  - `office admin / customer service -> coordinator / administrator NOC tightening`
- added more route-specific plan variants like `전환형`, `예외형`, `도시형`, `현직유지형` so recommendation details stop collapsing into the same generic language-score advice
- changed required-field detection and recommendation rendering to read live form control values directly instead of relying on `FormData`, because browser-side select values could otherwise be misread and block results
- removed the starter persona preset strip from the questionnaire to keep the top of the page simpler
- extracted a shared raw-answer reader for dashboard form controls and added regression tests around selected age / disabled / unchecked inputs
- added `input`-event re-rendering on the questionnaire form so the last required select, including ECA status, updates recommendations immediately in the browser
- added regression coverage that treats `completed`, `canadian-degree`, and `unsure` ECA selections as answered required states
- fixed a second, more subtle regression where all required fields were actually answered but the browser still showed `작성 필요` because recommendation rendering crashed later in the federal card path
- added `pageshow`-time questionnaire resync so browser back-navigation restores not only form values, but also missing-field highlighting, quick region selected state, and recommendation results
- added a regression test for the browser-history case where the user comes back with preserved values and the app must clear stale `is-missing` highlighting after re-reading the current controls
- added session-scoped questionnaire persistence so dashboard answers and selected regions can be restored from `sessionStorage` instead of relying only on browser BFCache timing
- storage restore now prefers live control values when the browser already restored them, so an older saved snapshot does not overwrite visibly restored answers
- added explicit questionnaire save/load/reset controls in the form header instead of relying only on silent browser restore
- added a dedicated province stream rules layer in `src/config/province-stream-rules.js` for:
  - Ontario
  - Alberta
  - Nova Scotia
  - Prince Edward Island
  - Saskatchewan
  - Newfoundland and Labrador
- added `주별 stream 현실 가이드` inside province cards so each recommendation can show:
  - which stream family fits now
  - what the likely entry shape is
  - whether employer / school / sector / local worker logic matters more
- added spouse strategy, school-route guidance, and regulated-job guidance blocks inside detailed recommendation cards
- added a `sourceExpansionWatchlist` so future sessions know which official pages should be wired next instead of rediscovering them from scratch
- added explicit regression coverage for save/load/reset browser behavior so empty-state persistence bugs are caught by tests
- updated required-field labels to match the current questionnaire wording (`지금 생각하는 큰 방향`, `현재 실제 체류 상태`) so the warning list and field headings stay consistent
- root cause of that ECA-looking bug:
  - `buildProvinceOccupationLens()` returned too early for the federal case without `titleLensLines` / `candidateProfiles`
  - `renderRecommendationCard()` assumed those arrays always existed and threw while rendering the federal occupation lens
  - a separate guard bug used `routeTitleStage?.scoreAdjustment !== 0`, which still evaluates true when `routeTitleStage` is undefined and then crashes when reading `.scoreAdjustment`
- added a browser-level regression test with a fake DOM + `vm` script execution so this class of issue is caught even when the required-field helpers themselves pass
- wrapped the main post-required recommendation render path in a `try/catch` so future downstream render bugs surface as `결과 계산 오류` instead of leaving stale `작성 필요` UI on screen

Recent commit trail worth checking:

- `bed5666` Add required field regression tests
- `f00ae9f` Fix required field live-value bug
- `b336563` Improve starter persona UX and add tests
- `b418bab` Refine occupation-specific route planning
- `94ea7d5` Add occupation anchor guidance
- `064c6a0` Add title hints and route-first province actions
- `7d1f7a4` Add richer occupation routes and feasibility badges
- `1d5f471` Use job title inference throughout occupation scoring
- `39e2676` Add province occupation lens and NOC guidance
- `fb0ee2b` Split Korea and Canada job paths with concrete province plans
- `ef2504b` Add Korean immigration persona library

## Current Site Shape

### Home

- compact latest-updates block at the top
- `내 상황으로 먼저 찾기` questionnaire
- province recommendations shown first
- federal / EE shown as a separate card, not mixed into province ranking
- province cards include:
  - why this rank
  - what the user already has
  - immediate next actions
  - detailed view with:
    - current eligibility snapshot
    - how the province selects
    - federal / EE bridge when relevant
    - career recognition notes
    - concrete action list
    - multiple plan variants
    - timeline
    - occupation-specific planner focus for common ambiguous jobs

### Region Pages

- personalized top block when arriving from the main dashboard flow:
  - `메인에서 보던 내 상황 기준으로 이 주에서 먼저 할 것`
  - route-reality summary
  - fit/chance pills
  - why this jurisdiction / what the user already has / immediate actions
  - EE bridge and stream guide excerpts
  - concrete plan variants and short timeline
- objective province overview first
- stream structure
- official links
- tracked updates

## Current UX Direction

These are intentional decisions. Do not casually undo them in a new session.

- keep the top of the page compact
- avoid long explanatory hero text
- recommendation cards should be the main product surface
- federal / EE must stay visually separate from province ranking
- province cards can mention EE linkage, but must label it clearly as federal reference logic
- province cards should not lead with raw federal point deltas in the main action area; point math belongs mainly to the federal card or a clearly labeled EE-bridge section
- when showing federal score improvement in the main recommendation flow, the summary should show the current score, the summed lift from the currently suggested actions, and the projected result in one line
- jurisdiction pages should feel like a continuation of the recommendation flow, not a disconnected encyclopedia entry
- the personalized jurisdiction block should stay above the generic province explainer content unless product direction explicitly changes
- when the current role is non-skilled or ambiguous, province quick actions should prioritize route steps like job-title upgrade, school/PGWP, employer-driven, or local connection before generic score boosting
- the most common ambiguous Korean personas should currently read like this unless a future session replaces them with tighter official rules:
  - `server / barista / cashier`: direct EE weak, prefer food service supervisor or cook pivot
  - `retail sales`: direct EE weak, prefer retail supervisor / assistant manager / office coordinator pivot
  - `warehouse associate`: check exception streams, otherwise inventory / shipping / dispatch pivot
  - `PSW / caregiver`: prefer Ontario In-Demand, AIP, or local employer-driven before generic EE-first advice
  - `office admin / customer service`: broad office titles need coordinator / administrator / specialist duties, not just the word "office"
- questionnaire should separate:
  - Korean previous job
  - current Canadian job
  - which career axis the user wants to anchor the application on
- actual job titles for both Korea and Canada, because category labels alone are too broad
- live helper hints under both title fields should explain how the typed title is currently being interpreted
- required field checks should use the current control values directly, not a more fragile serialized form snapshot
- beginners should see:
  - current fit
  - missing requirements
  - concrete next steps
  - alternate plans
- too much explanation at once hurts usability
- save/load/reset should stay session-scoped and lightweight; do not turn it into account-based persistence unless the product direction changes
- keep browser-state continuity, but do not re-introduce visible save/load/reset controls unless the product direction changes
- province rules should remain transparent: show rule-family guidance, not fake certainty
- spouse / school / regulated guidance should support the main recommendation, not replace it with a second full results page

## Current Data Mode

- local preview usually runs in fixture mode
- fixtures live in `/Users/alexhan/Documents/Alex_dev/Canada Imigration/fixtures`
- generated output goes to `/Users/alexhan/Documents/Alex_dev/Canada Imigration/out`
- GitHub Pages is static and currently relies on generated output
- province stream rule scaffolding lives in `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/config/province-stream-rules.js`
- when a live source is blocked or looks like anti-bot HTML, pipeline falls back to fixture-quality content instead of showing broken markup

## Current Analytics Mode

- free analytics path is Google Analytics 4
- env / repo variable name: `MAPLEGUIDE_GA_MEASUREMENT_ID`
- if the value is missing, the site should render with no analytics side effects
- GitHub Pages workflow reads the ID from GitHub Actions repository variables
- local preview can use:
  - `MAPLEGUIDE_GA_MEASUREMENT_ID=G-XXXX npm run demo`
  - `MAPLEGUIDE_GA_MEASUREMENT_ID=G-XXXX npm run dev`

### Current Tracked Events

- `form_started`
- `form_completed`
- `field_answered`
- `recommendations_rendered`
- `recommendation_detail_opened`
- `recommendation_region_clicked`
- `latest_update_opened`
- `older_updates_opened`
- `questionnaire_saved`
- `questionnaire_loaded`
- `questionnaire_reset`
- `comparison_table_opened`

### When User Asks About Traffic / Usage

The intended dashboard is GA4, not a custom in-app dashboard yet.
The first things to check are:

1. Realtime
2. Pages and screens
3. Events
4. Traffic acquisition
5. Engagement time

For MapleGuide specifically, pay attention to:

- how many users start the questionnaire
- how many finish required fields
- which recommendation cards get opened
- which province pages get clicked
- whether users expand latest-updates content

## Current Official Sources Wired In Code

These are the sources currently configured in `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/config/sources.js`.

1. Federal Express Entry rounds of invitations
2. Ontario OINP updates
3. BC PNP invitations to apply
4. Manitoba EOI draw
5. PEI EOI draws
6. New Brunswick invitation and selection rounds

## Important Non-Wired Official Directions Already Researched

These are important route families the product already references in logic or UX direction, even if not all of them are fully crawled yet.

- federal category-based selection
- Atlantic Immigration Program
- Rural Community Immigration Pilot
- Francophone Community Immigration Pilot
- Alberta Rural Renewal Stream
- Newfoundland and Labrador 2-step EOI model
- provincial EE-linked nomination logic

Additional watchlist already scaffolded in code:

- Alberta worker / priority sector draw pages
- Nova Scotia targeted stream / program updates
- Saskatchewan worker / employer pathway updates
- Newfoundland EOI operational updates

When future sessions expand the data layer, these are high-priority official directions to revisit.

## When User Says "정보 업데이트해"

If a future session is asked to update information, do not only tweak copy.
Redo the update process end to end:

1. re-check current official sources
2. rerun the pipeline with live fetch where possible
3. inspect whether any source returned anti-bot or broken HTML
4. refresh fixtures if the live parser is blocked but the official page structure changed
5. verify translated summaries still read cleanly in Korean
6. rerun tests and demo build
7. check GitHub Pages output so broken raw HTML is not exposed

In other words:
- refresh the official information first
- then refresh generated output
- then refresh UX wording

## Current Recommendation Logic

The recommendation engine currently considers:

- federal vs provincial direction
- province selection models
- EE linkage
- language status
- ECA / Canadian degree
- foreign skilled experience
- Canadian experience
- TEER 0-3 vs non-skilled Canadian work
- current immigration intent
- current actual status in Canada
- permit remaining time
- job offer possibility
- metro vs regional preference
- Korean previous occupation
- current Canadian occupation
- active anchor occupation
- Korea experience alignment
- degree usage plan
- typed Korea / Canada job titles with inferred occupation candidates
- live Korea / Canada title interpretation hints under the form fields
- expanded service / hospitality / retail / manufacturing role families

## Current Recommendation Output

Province recommendations currently show:

- a shared typed-title interpretation summary above the recommendation cards
- ranked province order
- policy fit
- current entry chance
- province selection model
- what the user already has
- immediate actions
- occupation lens:
  - whether the current role is immediately usable
  - whether the province reads it as targeted / employer-driven / exception route
  - whether school / PGWP or supervisor pivot is more realistic
  - NOC-like example job titles for explanation
  - actual typed job title hints, even when the user did not choose a perfect category
  - candidate role interpretations with TEER-like guidance (for example current role vs upgrade target)
- concrete province plans:
  - direct current-job route
  - same-industry upgrade / supervisor / skilled pivot
  - Korea-experience anchor route
  - school -> PGWP -> local skilled route when needed
- detailed eligibility snapshot
- job reality check
- a top-level reality badge that should answer one of these quickly:
  - can compare directly now
  - exception stream first
  - same-industry upgrade needed
  - school / PGWP route more realistic
  - Korea-experience route stronger
- federal / EE bridge section when the province has EE linkage
- multiple concrete plan variants:
  - score route
  - French route
  - job / employer route
  - study / graduate route
  - regional route

Federal recommendation currently shows:

- CRS estimate
- latest EE cutoff
- score gap
- direct CRS-improvement actions

## Important Bug Pattern

If the page still shows `작성 필요 N개` after the visible required fields look complete, do not assume the required-field helper is wrong first.

Check these in order:

1. confirm the raw answers are actually complete with `getDashboardMissingRequiredFieldLabels()` and `canRenderDashboardRecommendations()`
2. if those pass, inspect the browser console because the real issue may be a downstream render exception in recommendation card generation
3. rerun `tests/dashboard-client-render.test.js` because it exercises the embedded browser script rather than only pure helper functions
4. verify the federal card path specifically, because that path has already produced one stale-required-state regression after all fields were answered

## Important Current Implementation Detail

Province cards should not look like they are scored by federal CRS directly.

Correct behavior:

- province card = province selection logic first
- province card may include a separate `연방/EE 연계` block
- province quick actions should talk in route terms like `직무`, `학교`, `고용주`, `EE 연계`, not look like raw CRS ranking by default
- that block can show:
  - current federal reference score
  - latest EE cutoff
  - what happens if nomination is received
  - how CLB 9 or more Canadian experience affects the federal side

## Important Files

- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/PERSONAS.md`
  - 30 common Korea-to-Canada immigration personas for product design and recommendation sanity checks
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/site/render-dashboard.js`
  - main UI, recommendation logic, questionnaire, score logic, detailed cards
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/config/sources.js`
  - official source registry
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/core/pipeline.js`
  - source fetch, normalize, output build
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/core/html.js`
  - HTML cleanup and anti-broken-markup protections
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/src/server.js`
  - local preview server
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/tests/pipeline.test.js`
  - output and dashboard regression checks
- `/Users/alexhan/Documents/Alex_dev/Canada Imigration/tests/server.test.js`
  - server rendering checks

## Commands

```bash
npm test
npm run demo
node src/server.js --fixtures --port 3012
```

## Preview / Deploy

- local preview URL: `http://127.0.0.1:3012/`
- GitHub repo: `https://github.com/GoodVibes833/MapleGuide`
- GitHub Pages: `https://goodvibes833.github.io/MapleGuide/`
- repository is public right now because GitHub Pages is enabled

## Known Limitations

- CRS is still an estimate, not a full official calculator
- IELTS/CELPIP section-level input is not yet fully collected
- spouse scoring is still shallow
- provincial rules are not a full stream-by-stream rules database yet
- province-specific occupation-to-stream matching is still heuristic, not a full official NOC rules DB
- some official sources still block static cloud fetches, which is why fixture fallback exists
- GitHub Pages cannot run the full dynamic refresh flow by itself

## High-Priority Next Steps

1. make province stream requirements more explicit
   - required
   - preferred
   - scored
2. move from occupation heuristics to stream-by-stream NOC rules
   - what counts as immediately usable
   - what needs supervisor / TEER 0-3 pivot
   - what needs school / PGWP first
   - disqualifier

2. improve detailed plans
   - exact language targets
   - more concrete school route conditions
   - more concrete occupation / NOC pivots
   - province-specific "if not eligible now, do this first" flows

3. expand official source coverage
   - Alberta
   - Newfoundland and Labrador
   - Nova Scotia
   - special route sources

4. improve live-update workflow
   - better parser resilience
   - clearer health reporting for blocked sources

5. analytics follow-up
   - review whether event naming stays stable
   - consider adding compare-table open / province-page CTA events
   - if needed later, build an in-app summary page from GA exports

6. persona-to-form follow-up
   - convert `PERSONAS.md` into preset scenarios
   - split Korea job / Canada job more explicitly
   - improve non-skilled guidance for the most common Korean working holiday / PGWP cases
   - use personas to test whether recommendation order feels realistic

## Session Notes

- if a new session sees weird raw HTML in updates, first check source blocking and parser health before changing UI copy
- if users complain that a province recommendation conflicts with their metro preference, inspect lifestyle weighting first
- if users complain about province cards showing federal scores, keep federal scores only in explicitly labeled EE-linkage sections
- if users say the job options are too broad, keep expanding occupation cases with real-world examples like cook, server, office admin, bookkeeping, warehouse, retail supervisor
- for non-skilled Canadian work, prefer explaining three branches explicitly:
  - province-specific low-skill or TEER 4 exceptions
  - TEER 0-3 job pivot
  - school -> PGWP -> skilled work route
