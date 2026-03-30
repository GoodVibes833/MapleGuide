export const sources = [
  {
    id: "ee-rounds",
    name: "Express Entry rounds of invitations",
    jurisdiction: "federal",
    program: "express-entry",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html",
    adapter: "metric-labels",
    eventType: "draw",
    fetchMode: "browser_preferred",
    fixtureName: "ee-rounds",
    metricPatterns: {
      roundDate: /Date and time:\s*([A-Za-z]+\s+\d{1,2},\s+20\d{2})/i,
      cutoffScore: /CRS score of lowest-ranked candidate invited:\s*([\d,]+)/i,
      invitationsIssued: /Number of invitations issued:\s*([\d,]+)/i,
      rankNeeded: /Rank needed:\s*([\d,]+)/i
    }
  },
  {
    id: "ontario-oinp-updates",
    name: "Ontario Immigrant Nominee Program updates",
    jurisdiction: "ontario",
    program: "oinp",
    url: "https://www.ontario.ca/page/2026-ontario-immigrant-nominee-program-updates",
    adapter: "article-page",
    eventType: "program-update",
    fixtureName: "ontario-oinp-updates"
  },
  {
    id: "bc-pnp-invitations",
    name: "BC Provincial Nominee Program invitations to apply",
    jurisdiction: "british-columbia",
    program: "bc-pnp",
    url: "https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/invitations-to-apply",
    adapter: "table-page",
    eventType: "draw",
    fixtureName: "bc-pnp-invitations",
    fieldMap: {
      date: ["date", "draw date"],
      category: ["category"],
      minimumScore: ["minimum score", "score"],
      invitations: ["invitations", "number of invitations"]
    },
    maxRows: 3
  },
  {
    id: "manitoba-eoi-draw",
    name: "Manitoba Expression of Interest draw",
    jurisdiction: "manitoba",
    program: "mpnp",
    url: "https://immigratemanitoba.com/",
    adapter: "article-page",
    eventType: "draw",
    fixtureName: "manitoba-eoi-draw",
    metricPatterns: {
      stream: /(?:Skilled Worker Overseas|Skilled Worker in Manitoba|International Education Stream)/i,
      invitationsIssued: /Number of Letters of Advice to Apply issued:\s*([\d,]+)/i,
      rankingScore: /Ranking score of lowest-ranked candidate invited:\s*([\d,]+)/i
    }
  },
  {
    id: "pei-eoi-draws",
    name: "PEI Expression of Interest draws",
    jurisdiction: "prince-edward-island",
    program: "pei-pnp",
    url: "https://www.princeedwardisland.ca/en/information/office-of-immigration/expression-of-interest-draws",
    adapter: "table-page",
    eventType: "draw",
    fixtureName: "pei-eoi-draws",
    fieldMap: {
      date: ["date"],
      labourExpressEntryInvitations: [
        "labour & express entry invitations",
        "labour and express entry invitations"
      ],
      entrepreneurInvitations: [
        "business work permit entrepreneur invitations",
        "entrepreneur invitations"
      ],
      minimumScore: ["minimum points threshold for business invitations", "minimum points"]
    },
    maxRows: 3
  },
  {
    id: "new-brunswick-invitations",
    name: "New Brunswick invitation and selection rounds",
    jurisdiction: "new-brunswick",
    program: "nbpnp",
    url: "https://www2.gnb.ca/content/gnb/en/corporate/promo/immigration/immigrating-to-nb/invitations-to-apply.html",
    adapter: "table-page",
    eventType: "draw",
    fixtureName: "new-brunswick-invitations",
    fieldMap: {
      date: ["date"],
      stream: ["stream", "pathway"],
      candidatesInvited: ["candidates invited", "invitations"],
      notes: ["notes", "details"]
    },
    maxRows: 3
  }
];
