# MapleGuide

A Canadian immigration news aggregator that collects official announcements from federal and provincial sources, generates Korean-language summaries, and renders them as a map-based web dashboard.

## Overview

MapleGuide scrapes immigration updates from Express Entry, Ontario, BC, Manitoba, PEI, New Brunswick, and more — then normalizes the data into a JSON feed and builds static HTML pages per region.

## Tech Stack

- **Runtime**: Node.js
- **Frontend**: Vanilla HTML/CSS/JS
- **Testing**: Fixture-based test suite
- **Output**: Static HTML + JSON feed

## Key Features

- Multi-source scraper (label pages, article pages, draw/invite tables)
- Rule-based Korean summary generation
- Map-centered landing page with province drill-downs
- Browser session state (save/load/reset user inputs)
- `out/feed.json` — normalized immigration event feed
- `out/dashboard.html` — aggregated dashboard view

## Run Locally

```bash
npm install
npm test       # Run fixture-based tests
npm run demo   # Generate output files
npm run dev    # Local web server
```

## Target Users

Korean immigrants and prospective immigrants to Canada who need immigration news in Korean.
