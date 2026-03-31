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

### Region Pages

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
- questionnaire should separate:
  - Korean previous job
  - current Canadian job
  - which career axis the user wants to anchor the application on
  - actual job titles for both Korea and Canada, because category labels alone are too broad
- beginners should see:
  - current fit
  - missing requirements
  - concrete next steps
  - alternate plans
- too much explanation at once hurts usability

## Current Data Mode

- local preview usually runs in fixture mode
- fixtures live in `/Users/alexhan/Documents/Alex_dev/Canada Imigration/fixtures`
- generated output goes to `/Users/alexhan/Documents/Alex_dev/Canada Imigration/out`
- GitHub Pages is static and currently relies on generated output
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
- `recommendations_rendered`
- `recommendation_detail_opened`
- `recommendation_region_clicked`
- `latest_update_opened`
- `older_updates_opened`

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

## Current Recommendation Output

Province recommendations currently show:

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

## Important Current Implementation Detail

Province cards should not look like they are scored by federal CRS directly.

Correct behavior:

- province card = province selection logic first
- province card may include a separate `연방/EE 연계` block
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
