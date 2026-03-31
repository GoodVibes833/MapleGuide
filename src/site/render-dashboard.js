import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml } from "../core/html.js";
import { getJurisdictionProfile } from "../config/jurisdiction-profiles.js";
import { specialPathways } from "../config/pathway-rules.js";
import { sources } from "../config/sources.js";
import {
  buildJurisdictionInsight,
  deriveStreamTags,
  flattenProfileStreams
} from "./jurisdiction-ux.js";
import {
  countsCanadianExperienceForCrs,
  describeCanadianExperienceCrsTreatment,
  estimateCanadianExperienceCrsPoints
} from "./crs-helpers.js";
import {
  getLanguageImprovementActions,
  getNextCanadianExperienceYear,
  shouldSuggestSkilledSwitch
} from "./recommendation-helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANADA_MAP_ASSET_PATH = path.join(__dirname, "assets", "canada_labelled_map.svg");

export const DASHBOARD_REQUIRED_FIELD_LABELS = {
  path: "가장 가까운 현재 상황",
  base: "현재 캐나다 체류 상태",
  age: "나이",
  household: "배우자 포함 여부",
  education: "최종 학력",
  languageProfile: "영어 상태",
  foreignExp: "해외 숙련 경력",
  canadianExp: "캐나다 경력",
  canadianJobSkill: "캐나다 경력의 성격",
  ecaStatus: "ECA / 학력평가 상태"
};

export const DASHBOARD_OPTIONAL_DEFAULTS = {
  ee: "unsure",
  jobOffer: "unsure",
  permitRemaining: "unsure",
  budget: "medium",
  setting: "balanced",
  advantage: "none",
  koreaJobTitle: "",
  canadaJobTitle: "",
  koreaOccupation: "general",
  canadaOccupation: "general",
  occupation: "general",
  targetOccupationPlan: "unsure",
  foreignExpAlignment: "none",
  degreeCareerPlan: "unsure"
};

export function hasDashboardAnswerValue(value) {
  return !(typeof value === "undefined" || value === null || String(value).trim() === "");
}

export function getDashboardMissingRequiredFieldLabels(
  rawAnswers,
  requiredFieldLabels = DASHBOARD_REQUIRED_FIELD_LABELS
) {
  return Object.entries(requiredFieldLabels)
    .filter(([field]) => !hasDashboardAnswerValue(rawAnswers[field]))
    .map(([, label]) => label);
}

export function getDashboardAnsweredRequiredFieldCount(
  rawAnswers,
  requiredFieldLabels = DASHBOARD_REQUIRED_FIELD_LABELS
) {
  return Object.keys(requiredFieldLabels).filter((field) => hasDashboardAnswerValue(rawAnswers[field])).length;
}

export function normalizeDashboardDependentAnswers(rawAnswers) {
  const normalized = { ...rawAnswers };

  normalized.koreaJobTitle = (normalized.koreaJobTitle || "").trim();
  normalized.canadaJobTitle = (normalized.canadaJobTitle || "").trim();

  if (normalized.canadianExp === "0") {
    normalized.canadianJobSkill = "not-working";
  } else if (normalized.canadianExp && normalized.canadianExp !== "0" && normalized.canadianJobSkill === "not-working") {
    normalized.canadianJobSkill = "mixed";
  }

  if (normalized.base === "outside" && (!normalized.permitRemaining || normalized.permitRemaining === "unsure")) {
    normalized.permitRemaining = "not-applicable";
  }

  if (normalized.base !== "outside" && normalized.permitRemaining === "not-applicable") {
    normalized.permitRemaining = "";
  }

  if (normalized.canadianExp === "0") {
    normalized.canadaOccupation = normalized.canadaOccupation || "general";
  }

  if (normalized.foreignExp === "0") {
    normalized.koreaOccupation = normalized.koreaOccupation || "general";
  }

  return normalized;
}

export function readDashboardRawAnswersFromControls(
  controls,
  normalizeAnswers = normalizeDashboardDependentAnswers
) {
  const rawAnswers = {};

  Array.from(controls ?? []).forEach((control) => {
    if (!control || !("name" in control) || !("tagName" in control)) {
      return;
    }

    const tagName = String(control.tagName || "").toLowerCase();
    if (!["select", "input", "textarea"].includes(tagName)) {
      return;
    }

    if (!control.name || control.disabled) {
      return;
    }

    const controlType = String(control.type || "").toLowerCase();
    if ((controlType === "checkbox" || controlType === "radio") && !control.checked) {
      return;
    }

    rawAnswers[control.name] = control.value;
  });

  return normalizeAnswers(rawAnswers);
}

export function buildCompletedDashboardRawAnswers(
  rawAnswers,
  optionalDefaults = DASHBOARD_OPTIONAL_DEFAULTS
) {
  const completed = { ...rawAnswers };

  for (const [field, value] of Object.entries(optionalDefaults)) {
    if (!completed[field]) {
      completed[field] = value;
    }
  }

  return normalizeDashboardDependentAnswers(completed);
}

export function canRenderDashboardRecommendations(
  rawAnswers,
  requiredFieldLabels = DASHBOARD_REQUIRED_FIELD_LABELS
) {
  return getDashboardMissingRequiredFieldLabels(rawAnswers, requiredFieldLabels).length === 0;
}

export const JURISDICTION_META = [
  { id: "federal", labelKo: "연방 / EE", labelEn: "Federal / EE", chipLabelEn: "Federal / EE", shortLabel: "EE", svgId: null },
  { id: "yukon", labelKo: "유콘", labelEn: "Yukon", chipLabelEn: "Yukon", shortLabel: "YT", svgId: "CA-YT" },
  { id: "northwest-territories", labelKo: "노스웨스트 준주", labelEn: "Northwest Terr.", chipLabelEn: "NWT", shortLabel: "NT", svgId: "CA-NT" },
  { id: "nunavut", labelKo: "누나붓", labelEn: "Nunavut", chipLabelEn: "Nunavut", shortLabel: "NU", svgId: "CA-NU" },
  { id: "british-columbia", labelKo: "브리티시컬럼비아", labelEn: "British Columbia", chipLabelEn: "B.C.", shortLabel: "BC", svgId: "CA-BC" },
  { id: "alberta", labelKo: "알버타", labelEn: "Alberta", chipLabelEn: "Alberta", shortLabel: "AB", svgId: "CA-AB" },
  { id: "saskatchewan", labelKo: "사스카츄완", labelEn: "Saskatchewan", chipLabelEn: "Sask.", shortLabel: "SK", svgId: "CA-SK" },
  { id: "manitoba", labelKo: "매니토바", labelEn: "Manitoba", chipLabelEn: "Manitoba", shortLabel: "MB", svgId: "CA-MB" },
  { id: "ontario", labelKo: "온타리오", labelEn: "Ontario", chipLabelEn: "Ontario", shortLabel: "ON", svgId: "CA-ON" },
  { id: "quebec", labelKo: "퀘벡", labelEn: "Quebec", chipLabelEn: "Quebec", shortLabel: "QC", svgId: "CA-QC" },
  { id: "new-brunswick", labelKo: "뉴브런즈윅", labelEn: "New Brunswick", chipLabelEn: "N.B.", shortLabel: "NB", svgId: "CA-NB" },
  { id: "prince-edward-island", labelKo: "프린스에드워드아일랜드", labelEn: "Prince Edward Isl.", chipLabelEn: "PEI", shortLabel: "PE", svgId: "CA-PE" },
  { id: "nova-scotia", labelKo: "노바스코샤", labelEn: "Nova Scotia", chipLabelEn: "Nova Scotia", shortLabel: "NS", svgId: "CA-NS" },
  { id: "newfoundland-and-labrador", labelKo: "뉴펀들랜드 래브라도", labelEn: "Newfoundland & Labrador", chipLabelEn: "Newfoundland", shortLabel: "NL", svgId: "CA-NL" }
];

const OCCUPATION_OPTIONS = [
  { value: "general", labelKo: "기타 / 아직 직군을 좁히지 못했어요" },
  { value: "office-admin", labelKo: "사무행정 / 오피스 / 코디네이터" },
  { value: "accounting-bookkeeping", labelKo: "북키핑 / 회계보조 / payroll" },
  { value: "accountant-finance", labelKo: "회계사 / 재무 / 재무전문직" },
  { value: "sales-marketing", labelKo: "세일즈 / 마케팅 / account management" },
  { value: "customer-service", labelKo: "고객지원 / 콜센터 / CS" },
  { value: "software-it", labelKo: "소프트웨어 / 개발 / IT" },
  { value: "engineer-tech", labelKo: "엔지니어링 / 기술전문직" },
  { value: "nurse-allied-health", labelKo: "간호 / allied health / 임상전문직" },
  { value: "caregiver-psw", labelKo: "케어기버 / PSW / 지원돌봄" },
  { value: "ece-childcare", labelKo: "ECE / 보육 / childcare" },
  { value: "teacher-education-support", labelKo: "교사 / 교육지원 / school support" },
  { value: "cook-chef", labelKo: "요리사 / cook / chef" },
  { value: "baker-pastry", labelKo: "제빵 / 파티시에 / bakery" },
  { value: "restaurant-manager", labelKo: "레스토랑 매니저 / restaurant manager" },
  { value: "food-service-supervisor", labelKo: "푸드서비스 슈퍼바이저 / shift lead" },
  { value: "server-counter", labelKo: "서버 / 캐셔 / 바리스타 / food counter" },
  { value: "hotel-front-desk", labelKo: "호텔 프론트 / guest service / front desk" },
  { value: "housekeeping-cleaning", labelKo: "하우스키핑 / 클리닝 / room attendant" },
  { value: "retail-supervisor", labelKo: "리테일 슈퍼바이저 / 매장리더" },
  { value: "retail-sales", labelKo: "리테일 판매 / 매장서비스" },
  { value: "beauty-salon", labelKo: "네일 / 헤어 / 뷰티 서비스" },
  { value: "warehouse-logistics", labelKo: "창고 / 물류 / warehouse associate" },
  { value: "shipping-dispatch", labelKo: "shipping / receiving / dispatch" },
  { value: "manufacturing-production", labelKo: "제조 / production / factory worker" },
  { value: "truck-driver", labelKo: "트럭 / 배송 / 운송기사" },
  { value: "construction-trade", labelKo: "건설 / 전기 / 배관 / carpentry" },
  { value: "industrial-trade", labelKo: "용접 / machinist / industrial trade" },
  { value: "mechanic-technician", labelKo: "자동차 정비 / mechanic / technician" },
  { value: "physician-canada", labelKo: "의사 + 캐나다 경력" },
  { value: "senior-manager-canada", labelKo: "시니어 매니저 + 캐나다 경력" },
  { value: "researcher-canada", labelKo: "연구자 + 캐나다 경력" }
];

function renderOccupationSelectOptions() {
  return OCCUPATION_OPTIONS.map(
    (option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.labelKo)}</option>`
  ).join("");
}

function buildCanadaMapSvg({ idPrefix = "", className = "canada-map actual-map", ariaLabel = "캐나다 주 및 준주 지도" } = {}) {
  let rawSvg = readFileSync(CANADA_MAP_ASSET_PATH, "utf8");

  if (idPrefix) {
    rawSvg = rawSvg
      .replace(/\bid="([^"]+)"/g, (_match, id) => `id="${idPrefix}${id}"`)
      .replace(/url\(#([^)]+)\)/g, (_match, id) => `url(#${idPrefix}${id})`)
      .replace(/\b(xlink:href|href)="#([^"]+)"/g, (_match, attr, id) => `${attr}="#${idPrefix}${id}"`);
  }

  return rawSvg
    .replace(/<\?xml[\s\S]*?\?>\s*/i, "")
    .replace(/<!--[\s\S]*?-->\s*/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>\s*/i, "")
    .replace(/<sodipodi:namedview[\s\S]*?\/>\s*/i, "")
    .replace(/\swidth="[^"]*"/i, "")
    .replace(/\sheight="[^"]*"/i, "")
    .replace(
      /<svg/i,
      `<svg class="${className}" viewBox="0 0 1320 1145" role="img" aria-label="${ariaLabel}" preserveAspectRatio="xMidYMid meet"`
    );
}

const CANADA_MAP_SVG = buildCanadaMapSvg();

function buildMiniRegionMapSvg(jurisdictionId) {
  const prefix = `mini-${jurisdictionId}-`;
  const activeRegionIds = jurisdictionId === "federal"
    ? new Set(JURISDICTION_META.filter((region) => region.svgId).map((region) => region.id))
    : new Set([jurisdictionId]);
  let svg = buildCanadaMapSvg({
    idPrefix: prefix,
    className: "canada-map mini-region-map",
    ariaLabel: `${getJurisdictionMeta(jurisdictionId).labelKo} 위치 미리보기`
  });

  JURISDICTION_META.filter((region) => region.svgId).forEach((region) => {
    const prefixedId = `${prefix}${region.svgId}`;
    const className = activeRegionIds.has(region.id) ? "mini-region-shape is-active" : "mini-region-shape";
    svg = svg.replace(`id="${prefixedId}"`, `id="${prefixedId}" class="${className}"`);
  });

  return svg;
}

const MINI_REGION_MAP_SVGS = Object.fromEntries(
  JURISDICTION_META.map((region) => [region.id, buildMiniRegionMapSvg(region.id)])
);

function renderQuickFilterCoins() {
  const quickRegionCount = JURISDICTION_META.filter((region) => region.id !== "federal").length;
  return `
    <div
      class="quick-filter-coins"
      role="group"
      aria-label="관심 지역 선택"
      style="--quick-region-count:${quickRegionCount}"
    >
      ${JURISDICTION_META
        .filter((region) => region.id !== "federal")
        .map(
          (region) => `
            <button
              type="button"
              class="quick-coin is-selected"
              data-quick-map-region="${escapeHtml(region.id)}"
              aria-label="${escapeHtml(region.labelEn ?? region.labelKo)} 선택"
              title="${escapeHtml(region.labelEn ?? region.labelKo)}"
            >
              <span class="quick-coin-label">${escapeHtml(region.chipLabelEn ?? region.labelEn ?? region.labelKo)}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

export const KNOWN_JURISDICTION_IDS = new Set(JURISDICTION_META.map((region) => region.id));

function normalizeBasePath(basePath = "") {
  if (!basePath || basePath === "/") {
    return "";
  }

  const trimmed = String(basePath).trim();
  if (!trimmed) {
    return "";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function withBasePath(basePath, pathname = "/") {
  const normalizedBasePath = normalizeBasePath(basePath);
  if (!normalizedBasePath) {
    return pathname;
  }

  if (!pathname || pathname === "/") {
    return `${normalizedBasePath}/`;
  }

  return `${normalizedBasePath}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function getJurisdictionMeta(jurisdictionId) {
  return JURISDICTION_META.find((region) => region.id === jurisdictionId) ?? {
    id: jurisdictionId,
    labelKo: jurisdictionId,
    shortLabel: jurisdictionId.slice(0, 2).toUpperCase(),
    svgId: null
  };
}

function getJurisdictionHref(jurisdictionId, basePath = "") {
  return withBasePath(basePath, `/region/${jurisdictionId}`);
}

function getSourceDefinitionsForJurisdiction(jurisdictionId) {
  return sources.filter((source) => source.jurisdiction === jurisdictionId);
}

function getUpdatesForJurisdiction(updates, jurisdictionId) {
  return updates.filter((update) => update.jurisdiction === jurisdictionId);
}

function getReportMap(reports = []) {
  return new Map(reports.map((report) => [report.sourceId, report]));
}

function getLatestUpdateDate(updates, fallbackDate) {
  return updates[0]?.publishedAt ?? fallbackDate.slice(0, 10);
}

function getProgramList(updates) {
  return [...new Set(updates.map((update) => update.program))];
}

function describeSourceReport(report) {
  if (!report) {
    return {
      badgeClass: "status-draft",
      badgeLabel: "대기",
      detail: "아직 수집 이력이 없습니다."
    };
  }

  if (!report.ok) {
    return {
      badgeClass: "status-rejected",
      badgeLabel: "점검 필요",
      detail: report.error ?? "수집 중 오류가 발생했습니다."
    };
  }

  const detailParts = [`최근 확인 ${report.fetchedAt.slice(0, 10)}`];

  if (typeof report.updateCount === "number") {
    detailParts.push(`감지 ${report.updateCount}건`);
  }

  if (report.mode) {
    detailParts.push(report.mode);
  }

  return {
    badgeClass: "status-approved",
    badgeLabel: "정상",
    detail: detailParts.join(" · ")
  };
}

function serializeForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function renderNav(page, basePath = "") {
  const homeHref = withBasePath(basePath, "/");
  const latestHref = page === "dashboard" ? "#latest-updates" : `${homeHref}#latest-updates`;
  const situationsHref = page === "dashboard" ? "#situations" : `${homeHref}#situations`;
  const compareHref = page === "dashboard" ? "#compare-table" : `${homeHref}#compare-table`;

  return `
    <header class="site-header">
      <a class="brand" href="${homeHref}" aria-label="MapleGuide 홈">
        <span class="brand-mark">MP</span>
        <span class="brand-copy">
          <strong>MapleGuide</strong>
          <span>캐나다 이민 길찾기 허브</span>
        </span>
      </a>
      <div class="site-header-tools">
        <nav class="site-nav" aria-label="주요 메뉴">
          <a href="${latestHref}">최신정보</a>
          <a href="${situationsHref}">내 상황</a>
          <a href="${compareHref}">전체비교</a>
        </nav>
      </div>
    </header>
  `;
}

function renderMetricList(update) {
  const metricLines = update.translation.metricLinesKo?.length
    ? update.translation.metricLinesKo
    : update.translation.bulletsKo?.length
      ? update.translation.bulletsKo
      : Object.entries(update.metrics).map(([key, value]) => `${key}: ${value}`);

  return metricLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

function renderDashboardCards(updates, { showRegionLink = false, basePath = "" } = {}) {
  return updates
    .map(
      (update) => `
        <article
          class="news-card"
          data-program="${escapeHtml(update.program)}"
          data-jurisdiction="${escapeHtml(update.jurisdiction)}"
        >
          <div class="card-topline">
            <span class="eyebrow">${escapeHtml(update.jurisdiction.toUpperCase())}</span>
            <span class="tag">${escapeHtml(update.program.toUpperCase())}</span>
          </div>
          <h2>${escapeHtml(update.translation.titleKo)}</h2>
          <p class="summary">${escapeHtml(update.translation.summaryKo)}</p>
          <ul class="fact-list">${renderMetricList(update)}</ul>
          <div class="card-footer">
            <span>${escapeHtml(update.publishedAt ?? update.fetchedAt.slice(0, 10))}</span>
            <div class="card-links">
              ${showRegionLink ? `<a href="${escapeHtml(getJurisdictionHref(update.jurisdiction, basePath))}">지역 페이지</a>` : ""}
              <a href="${escapeHtml(update.sourceUrl)}" target="_blank" rel="noreferrer">원문 보기</a>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function buildJurisdictionStats(updates) {
  const stats = new Map();

  for (const meta of JURISDICTION_META) {
    stats.set(meta.id, {
      ...meta,
      updateCount: 0,
      latestDate: null,
      programs: new Set()
    });
  }

  for (const update of updates) {
    if (!stats.has(update.jurisdiction)) {
      continue;
    }

    const entry = stats.get(update.jurisdiction);
    entry.updateCount += 1;
    entry.programs.add(update.program);
    if (!entry.latestDate || (update.publishedAt ?? "") > entry.latestDate) {
      entry.latestDate = update.publishedAt ?? entry.latestDate;
    }
  }

  return JURISDICTION_META.map((meta) => {
    const entry = stats.get(meta.id);
    return {
      ...entry,
      programs: [...entry.programs]
    };
  });
}

function buildJurisdictionInsights(updates) {
  return JURISDICTION_META.map((meta) =>
    buildJurisdictionInsight(meta, getJurisdictionProfile(meta.id), getUpdatesForJurisdiction(updates, meta.id))
  );
}

function renderSituationSection(insights) {
  return `
    <section class="section panel">
      <div class="panel-head">
        <div>
          <p class="panel-kicker">Start Here</p>
          <h2>내 상황으로 먼저 찾기</h2>
        </div>
        <p class="panel-note">질문 몇 개만 답하면 먼저 볼 지역을 바로 좁혀줍니다.</p>
      </div>
      <div class="wizard-filter-bar">
        <div class="wizard-filter-copy">
          <strong>관심 지역 필터</strong>
          <span>동그란 지역 버튼으로 여러 주를 같이 고를 수 있습니다. 선택하지 않으면 전체 지역을 추천합니다.</span>
        </div>
        <div class="wizard-filter-shell">
          <div class="wizard-filter-toolbar">
            <button type="button" class="chip active" data-quick-region-toggle="federal">연방 / EE</button>
            <button type="button" class="chip" data-quick-region-clear>전체 보기</button>
          </div>
          ${renderQuickFilterCoins()}
          <div class="wizard-filter-selection" id="quick-region-selection">전체 선택됨 · 모든 지역 비교</div>
        </div>
      </div>
      <div class="wizard-layout">
        <form class="wizard-form" id="quick-start-form">
          <div class="wizard-section-heading wizard-form-group-heading">
            <div>
              <h3>먼저 꼭 필요한 정보</h3>
              <p class="panel-note">필수* 항목을 먼저 고르면 추천이 바로 열립니다.</p>
            </div>
          </div>
          <label class="wizard-field" data-required-field="path">
            <span class="wizard-field-label">지금 생각하는 큰 방향 <em class="required-mark">필수*</em></span>
            <select name="path">
              <option value="">선택하세요</option>
              <option value="unsure">아직 잘 모르겠어요</option>
              <option value="outside-worker">캐나다 밖에서 바로 EE/취업이민을 보고 있어요</option>
              <option value="working-holiday">캐나다에 먼저 와서 현지 경력 쌓는 방향이에요</option>
              <option value="study-plan">유학부터 시작해 PR까지 같이 보고 있어요</option>
              <option value="pgwp-pr">졸업 후 현지 취업으로 PR까지 보고 있어요</option>
              <option value="canadian-worker">지금 캐나다 경력으로 바로 PR을 보고 있어요</option>
              <option value="business">사업·창업 경로를 보고 있어요</option>
            </select>
          </label>
          <label class="wizard-field" data-required-field="base">
            <span class="wizard-field-label">현재 실제 체류 상태 <em class="required-mark">필수*</em></span>
            <select name="base">
              <option value="">선택하세요</option>
              <option value="outside">현재 캐나다 밖에 있어요</option>
              <option value="student">캐나다에서 학생 상태예요</option>
              <option value="working-holiday">워홀(IEC open work permit)로 일하고 있어요</option>
              <option value="pgwp">PGWP 또는 졸업 후 취업 상태예요</option>
              <option value="worker">캐나다에서 일반 취업 상태예요</option>
              <option value="unsure">설명하기 애매해요</option>
            </select>
          </label>
          <label class="wizard-field" data-required-field="age">
            <span class="wizard-field-label">나이 <em class="required-mark">필수*</em></span>
            <select name="age">
              <option value="">선택하세요</option>
              <option value="18">18세</option>
              <option value="19">19세</option>
              <option value="20-29">20-29세</option>
              <option value="30">30세</option>
              <option value="31">31세</option>
              <option value="32">32세</option>
              <option value="33">33세</option>
              <option value="34">34세</option>
              <option value="35">35세</option>
              <option value="36">36세</option>
              <option value="37">37세</option>
              <option value="38">38세</option>
              <option value="39">39세</option>
              <option value="40">40세</option>
              <option value="41">41세</option>
              <option value="42">42세</option>
              <option value="43">43세</option>
              <option value="44">44세</option>
              <option value="45+">45세 이상</option>
            </select>
          </label>
          <label class="wizard-field" data-required-field="household">
            <span class="wizard-field-label">배우자 포함 여부 <em class="required-mark">필수*</em></span>
            <select name="household">
              <option value="">선택하세요</option>
              <option value="single">단독 지원 기준으로 볼게요</option>
              <option value="with-spouse">배우자와 함께 갈 가능성이 커요</option>
              <option value="unsure">아직 잘 모르겠어요</option>
            </select>
          </label>
          <label class="wizard-field" data-required-field="education">
            <span class="wizard-field-label">최종 학력 <em class="required-mark">필수*</em></span>
            <select name="education">
              <option value="">선택하세요</option>
              <option value="high-school">고등학교</option>
              <option value="one-year">1년 과정 컬리지/수료</option>
              <option value="two-year">2년 과정 컬리지</option>
              <option value="bachelor">학사 또는 3년 이상 학위</option>
              <option value="two-plus">2개 이상 학위/자격</option>
              <option value="master">석사</option>
              <option value="professional">전문직 학위</option>
              <option value="doctorate">박사</option>
            </select>
          </label>
          <label class="wizard-field" data-required-field="languageProfile">
            <span class="wizard-field-label">영어 상태 <em class="required-mark">필수*</em></span>
            <select name="languageProfile">
              <option value="">선택하세요</option>
              <option value="guess:unknown">시험은 안 봤고 지금은 잘 모르겠어요</option>
              <option value="guess:clb6">시험은 안 봤고 지금은 CLB 6 이하 같아요</option>
              <option value="guess:clb7">시험은 안 봤고 지금은 CLB 7 정도 같아요</option>
              <option value="guess:clb8">시험은 안 봤고 지금은 CLB 8 정도 같아요</option>
              <option value="target:clb7">공인 점수는 없지만 CLB 7까지는 딸 수 있을 것 같아요</option>
              <option value="target:clb8">공인 점수는 없지만 CLB 8까지는 딸 수 있을 것 같아요</option>
              <option value="target:clb9plus">공인 점수는 없지만 CLB 9 이상도 노려볼 수 있을 것 같아요</option>
              <option value="official:clb6">공인 영어점수는 CLB 6 이하예요</option>
              <option value="official:clb7">공인 영어점수는 CLB 7 정도예요</option>
              <option value="official:clb8">공인 영어점수는 CLB 8 정도예요</option>
              <option value="official:clb9plus">공인 영어점수는 CLB 9 이상이에요</option>
            </select>
          </label>
          <label class="wizard-field" data-required-field="foreignExp">
            <span class="wizard-field-label">해외 숙련 경력 <em class="required-mark">필수*</em></span>
            <select name="foreignExp">
              <option value="">선택하세요</option>
              <option value="0">없음</option>
              <option value="1">1년</option>
              <option value="2">2년</option>
              <option value="3">3년</option>
              <option value="4">4년</option>
              <option value="5">5년 이상</option>
            </select>
          </label>
          <label class="wizard-field" data-required-field="canadianExp">
            <span class="wizard-field-label">캐나다 경력 <em class="required-mark">필수*</em></span>
            <select name="canadianExp">
              <option value="">선택하세요</option>
              <option value="0">없음</option>
              <option value="1">1년</option>
              <option value="2">2년</option>
              <option value="3">3년</option>
              <option value="4">4년</option>
              <option value="5">5년 이상</option>
            </select>
          </label>
          <label class="wizard-field" data-required-field="canadianJobSkill">
            <span class="wizard-field-label">캐나다 경력의 성격 <em class="required-mark">필수*</em></span>
            <select name="canadianJobSkill">
              <option value="">선택하세요</option>
              <option value="not-working">캐나다 경력은 없어요</option>
              <option value="skilled">캐나다 경력이 있고 TEER 0-3 쪽이에요</option>
              <option value="non-skilled">캐나다 경력은 있지만 TEER 4-5 또는 단순 서비스 쪽이에요</option>
              <option value="mixed">캐나다 경력은 있는데 TEER를 아직 잘 모르겠어요</option>
            </select>
          </label>
          <label class="wizard-field">
            <span>Express Entry</span>
            <select name="ee">
              <option value="">잘 모르겠어요</option>
              <option value="yes">EE 프로필이 있거나 만들 예정이에요</option>
              <option value="no">EE 경로는 우선순위가 아니에요</option>
            </select>
          </label>
          <label class="wizard-field">
            <span>캐나다 잡오퍼</span>
            <select name="jobOffer">
              <option value="">잘 모르겠어요</option>
              <option value="yes">있거나 받을 가능성이 있어요</option>
              <option value="no">없어요</option>
            </select>
          </label>
          <label class="wizard-field" data-required-field="ecaStatus">
            <span class="wizard-field-label">ECA / 학력평가 상태 <em class="required-mark">필수*</em></span>
            <select name="ecaStatus">
              <option value="">선택하세요</option>
              <option value="canadian-degree">캐나다 학위라 ECA가 필요 없어요</option>
              <option value="completed">이민용 ECA 완료</option>
              <option value="in-progress">ECA 진행 중</option>
              <option value="needed">해외 학력인데 아직 안 했어요</option>
              <option value="unsure">잘 모르겠어요</option>
            </select>
          </label>
          <div class="wizard-section-heading wizard-form-group-heading wizard-form-group-heading-subtle">
            <div>
              <h3>추가로 알려주면 더 정확해요</h3>
              <p class="panel-note">아래 항목은 추천 순서와 다음 액션을 더 구체적으로 잡는 데 씁니다.</p>
            </div>
          </div>
          <label class="wizard-field">
            <span>현재 비자 / 퍼밋 남은 기간</span>
            <select name="permitRemaining">
              <option value="">잘 모르겠어요</option>
              <option value="not-applicable">아직 캐나다 밖이거나 해당 없어요</option>
              <option value="lt6">6개월 미만 남았어요</option>
              <option value="6to12">6-12개월 남았어요</option>
              <option value="12to24">1-2년 정도 남았어요</option>
              <option value="24plus">2년 이상 남았어요</option>
            </select>
          </label>
          <label class="wizard-field">
            <span>학비·생활비 부담</span>
            <select name="budget">
              <option value="">잘 모르겠어요</option>
              <option value="tight">가능하면 비용 부담이 낮은 쪽이 좋아요</option>
              <option value="medium">보통이에요</option>
              <option value="flexible">비용보다 경로 적합성이 더 중요해요</option>
            </select>
          </label>
          <label class="wizard-field">
            <span>정착 선호</span>
            <select name="setting">
              <option value="">아직 잘 모르겠어요</option>
              <option value="balanced">아직 정하지 못했어요</option>
              <option value="metro">대도시 접근성이 중요해요</option>
              <option value="regional">시골·지역 정착도 괜찮아요</option>
            </select>
          </label>
          <label class="wizard-field">
            <span>추가 강점</span>
            <select name="advantage">
              <option value="">아직 잘 모르겠어요</option>
              <option value="none">없음</option>
              <option value="french">프랑스어</option>
              <option value="regional">지역·커뮤니티 경로도 가능</option>
              <option value="health">보건의료 직군</option>
              <option value="trades">기술직·trade 직군</option>
            </select>
          </label>
          <label class="wizard-field">
            <span>한국에서 주로 하던 일</span>
            <select name="koreaOccupation">
              <option value="">아직 잘 모르겠어요</option>
              ${renderOccupationSelectOptions()}
            </select>
          </label>
          <label class="wizard-field">
            <span>한국에서 실제로 하던 job title</span>
            <input type="text" name="koreaJobTitle" placeholder="예: Cook, Office Administrator, Accountant, Warehouse Associate" />
            <small class="wizard-helper" id="korea-title-hint">실제 title을 적으면 어떤 직무군으로 읽히는지 바로 보여줍니다.</small>
          </label>
          <label class="wizard-field">
            <span>지금 캐나다에서 하는 일</span>
            <select name="canadaOccupation">
              <option value="">아직 잘 모르겠어요</option>
              ${renderOccupationSelectOptions()}
            </select>
          </label>
          <label class="wizard-field">
            <span>지금 캐나다에서 실제로 하는 job title</span>
            <input type="text" name="canadaJobTitle" placeholder="예: Server, Food Service Supervisor, Retail Sales Associate, Bookkeeper" />
            <small class="wizard-helper" id="canada-title-hint">실제 title을 적으면 TEER 해석과 전환 후보를 같이 보여줍니다.</small>
          </label>
          <label class="wizard-field">
            <span>이민에 쓸 주력 경력 축</span>
            <select name="targetOccupationPlan">
              <option value="">아직 잘 모르겠어요</option>
              <option value="current-canada-job">지금 캐나다에서 하는 일 기준</option>
              <option value="previous-korea-job">한국에서 하던 일 기준</option>
              <option value="degree-field">전공 살린 새 직무 기준</option>
            </select>
          </label>
          <label class="wizard-field">
            <span>한국 경력과 이민에 쓸 직군의 연결성</span>
            <select name="foreignExpAlignment">
              <option value="">아직 잘 모르겠어요</option>
              <option value="same-skilled">같은 NOC 또는 매우 비슷한 숙련 경력이에요</option>
              <option value="related-skilled">비슷한 분야지만 직무가 완전히 같진 않아요</option>
              <option value="unrelated">지금 목표 직군과 거의 관련 없어요</option>
              <option value="none">해외 숙련 경력은 거의 없어요</option>
            </select>
          </label>
          <label class="wizard-field">
            <span>한국 학사 / 전공 활용 계획</span>
            <select name="degreeCareerPlan">
              <option value="">아직 모르겠어요</option>
              <option value="use-degree">전공을 살려 취업하는 것도 고려해요</option>
              <option value="not-use-degree">전공은 점수용으로만 보고 다른 일로 갈 가능성이 커요</option>
            </select>
          </label>
        </form>
        <div class="wizard-results" id="quick-start-results">
          <div class="wizard-empty">
            <strong>필수* 항목부터 고르면 먼저 볼 지역 3곳을 추천합니다.</strong>
            <span>지역 필터를 먼저 고른 뒤 필수 정보를 채우면 결과가 바로 좁혀집니다.</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderComparisonTable(insights, basePath = "") {
  const rows = insights.filter((insight) => insight.id !== "nunavut");

  return `
    <section class="section panel">
      <details class="panel-collapsible">
        <summary class="panel-collapsible-summary">
          <div>
            <p class="panel-kicker">Compare</p>
            <h2>캐나다 한눈에 비교</h2>
            <p class="panel-note">원할 때만 펼쳐서 보는 전체 비교표입니다.</p>
          </div>
          <div class="panel-collapsible-side">
            <span class="compare-pill">전체 주 비교</span>
            <span class="panel-collapsible-chevron" aria-hidden="true">▾</span>
          </div>
        </summary>
        <div class="panel-collapsible-body table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th>지역</th>
              <th>운영 체계</th>
              <th>선발 방식</th>
              <th>EE</th>
              <th>잡오퍼</th>
              <th>졸업자</th>
              <th>사업/창업</th>
              <th>프랑스어</th>
              <th>지역 경로</th>
              <th>먼저 볼 사람</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (insight) => `
                  <tr>
                    <td>
                      <a class="table-link" href="${escapeHtml(getJurisdictionHref(insight.id, basePath))}">
                        ${escapeHtml(insight.labelKo)}
                      </a>
                    </td>
                    <td>${escapeHtml(insight.system)}</td>
                    <td><span class="compare-pill">${escapeHtml(insight.selectionModel.badgeKo)}</span></td>
                    <td><span class="compare-pill">${escapeHtml(insight.statuses.ee)}</span></td>
                    <td><span class="compare-pill">${escapeHtml(insight.statuses.jobOffer)}</span></td>
                    <td><span class="compare-pill">${escapeHtml(insight.statuses.graduate)}</span></td>
                    <td><span class="compare-pill">${escapeHtml(insight.statuses.entrepreneur)}</span></td>
                    <td><span class="compare-pill">${escapeHtml(insight.statuses.french)}</span></td>
                    <td><span class="compare-pill">${escapeHtml(insight.statuses.regional)}</span></td>
                    <td>${escapeHtml(insight.whoFor.join(" / "))}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
        </div>
      </details>
    </section>
  `;
}

function renderLatestUpdateCards(updates, basePath = "") {
  const sortedUpdates = [...updates].sort((left, right) =>
    (right.publishedAt ?? right.fetchedAt).localeCompare(left.publishedAt ?? left.fetchedAt)
  );
  const latestUpdates = sortedUpdates.slice(0, 4);
  const olderUpdates = sortedUpdates.slice(4);

  if (latestUpdates.length === 0) {
    return `
      <div class="empty-state">
        아직 표시할 최신 업데이트가 없습니다. 소스를 새로고침하면 가장 최근 변경이 여기 먼저 보입니다.
      </div>
    `;
  }

  const buildHeadline = (update) => {
    const metrics = update.metrics ?? {};
    const bullets = update.translation.bulletsKo ?? [];

    if (update.sourceId === "ee-rounds") {
      const cutoff = metrics.cutoffScore;
      const invitations = metrics.invitationsIssued;
      if (cutoff && invitations) {
        return `EE 컷오프 ${cutoff}점, ${invitations}명 초청됐어요`;
      }
    }

    if (update.sourceId === "manitoba-eoi-draw") {
      const stream = metrics.stream;
      const invitations = metrics.invitationsIssued;
      const rankingScore = metrics.rankingScore;
      if (stream && invitations && rankingScore) {
        return `${stream}에서 ${invitations}명 초청, 최저 ${rankingScore}점이 나왔어요`;
      }
    }

    if (update.sourceId === "bc-pnp-invitations") {
      const category = metrics.category;
      const invitations = metrics.invitations;
      const minimumScore = metrics.minimumScore;
      if (category && invitations && minimumScore) {
        return `${category} 카테고리에서 ${invitations}명 초청, 최저 ${minimumScore}점이 나왔어요`;
      }
    }

    if (update.sourceId === "ontario-oinp-updates") {
      const firstBullet = bullets[0];
      const secondBullet = bullets[1];

      if (firstBullet && secondBullet) {
        return `${firstBullet} 보건의료·기술직 우선 기조도 유지됐어요`;
      }

      if (firstBullet) {
        return firstBullet;
      }
    }

    if (update.eventType === "draw") {
      const firstLine = update.translation.metricLinesKo?.[0];
      if (firstLine) {
        return `${firstLine} 관련 초청이 나왔어요`;
      }
    }

    const fallback = update.translation.summaryKo
      .replace(/^.*?발표일은\s+\d{4}-\d{2}-\d{2}입니다\.\s*/u, "")
      .split(" / ")[0]
      .trim();

    return fallback || update.translation.titleKo;
  };

  const buildDetailSummary = (update) => {
    const metrics = update.metrics ?? {};
    const updateDate = update.publishedAt ?? update.fetchedAt.slice(0, 10);

    if (update.sourceId === "ee-rounds") {
      const cutoff = metrics.cutoffScore;
      const invitations = metrics.invitationsIssued;
      if (cutoff && invitations) {
        return `${updateDate} 발표 기준 익스프레스 엔트리 초청 라운드예요. 최저 CRS는 ${cutoff}점이고 ${invitations}명에게 초청장이 나왔습니다.`;
      }
    }

    if (update.sourceId === "manitoba-eoi-draw") {
      const stream = metrics.stream;
      const invitations = metrics.invitationsIssued;
      const rankingScore = metrics.rankingScore;
      if (stream && invitations && rankingScore) {
        return `${updateDate} 발표 기준 매니토바 드로우예요. ${stream}에서 ${invitations}명을 초청했고 최저 점수는 ${rankingScore}점입니다.`;
      }
    }

    if (update.sourceId === "bc-pnp-invitations") {
      const category = metrics.category;
      const invitations = metrics.invitations;
      const minimumScore = metrics.minimumScore;
      if (category && invitations && minimumScore) {
        return `${updateDate} 발표 기준 BC PNP 초청이에요. ${category} 카테고리에서 ${invitations}명을 초청했고 최저 점수는 ${minimumScore}점입니다.`;
      }
    }

    return update.translation.summaryKo;
  };

  const buildDetailLines = (update) => {
    const rawLines = update.translation.metricLinesKo?.length
      ? update.translation.metricLinesKo
      : update.translation.bulletsKo?.length
        ? update.translation.bulletsKo
        : [];

    return [...new Set(rawLines.map((line) => line.trim()).filter(Boolean))].slice(0, 4);
  };

  const renderUpdateFlashGrid = (items) => `
    <div class="update-flash-grid">
      ${items
        .map((update) => {
          const headline = buildHeadline(update);
          const detailSummary = buildDetailSummary(update);
          const detailLines = buildDetailLines(update);
          const updateDate = update.publishedAt ?? update.fetchedAt.slice(0, 10);

          return `
            <details
              class="update-flash-card"
              data-analytics-jurisdiction="${escapeHtml(update.jurisdiction)}"
              data-analytics-headline="${escapeHtml(headline)}"
            >
              <summary class="update-flash-summary">
                <span class="update-flash-jurisdiction">${escapeHtml(getJurisdictionMeta(update.jurisdiction).labelKo)}</span>
                <span class="update-flash-date">${escapeHtml(updateDate)}</span>
                <strong>${escapeHtml(headline)}</strong>
                <span class="update-flash-chevron" aria-hidden="true">▾</span>
              </summary>
              <div class="update-flash-detail">
                <p class="update-flash-original">${escapeHtml(update.translation.titleKo)}</p>
                <p class="update-flash-description">${escapeHtml(detailSummary)}</p>
                ${detailLines.length
                  ? `
                    <ul class="update-flash-list">
                      ${detailLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
                    </ul>
                  `
                  : ""}
                <div class="card-footer">
                  <span>${escapeHtml(update.program.toUpperCase())}</span>
                  <div class="card-links">
                    <a href="${escapeHtml(getJurisdictionHref(update.jurisdiction, basePath))}">지역 보기</a>
                    <a href="${escapeHtml(update.sourceUrl)}" target="_blank" rel="noreferrer">원문</a>
                  </div>
                </div>
              </div>
            </details>
          `;
        })
        .join("")}
    </div>
  `;

  return `
    ${renderUpdateFlashGrid(latestUpdates)}
    ${olderUpdates.length
      ? `
        <div class="update-flash-more">
          <button
            type="button"
            class="btn ghost update-more-button"
            id="updates-more-toggle"
            data-open-label="업데이트 더보기"
            data-close-label="업데이트 접기"
            aria-expanded="false"
            aria-controls="older-updates-list"
          >
            업데이트 더보기
          </button>
          <div class="update-flash-more-list" id="older-updates-list" hidden>
            <p class="update-flash-more-note">이전 공지와 드로우도 한국어 요약과 함께 펼쳐서 볼 수 있어요.</p>
            ${renderUpdateFlashGrid(olderUpdates)}
          </div>
        </div>
      `
      : ""}
  `;
}

function renderHomeHero(updates, basePath = "") {

  return `
    <section class="section home-latest-section" id="latest-updates">
      <div class="panel-head panel-head-tight">
        <div>
          <p class="panel-kicker">Latest Changes</p>
          <h2>가장 최신 업데이트</h2>
        </div>
      </div>
      ${renderLatestUpdateCards(updates, basePath)}
    </section>
  `;
}

function renderCanadaMapSection(updates, { minimal = false, basePath = "" } = {}) {
  const regions = buildJurisdictionStats(updates);
  const federalCount = regions.find((region) => region.id === "federal")?.updateCount ?? 0;

  if (minimal) {
    return `
      <section class="map-landing" aria-label="캐나다 지도 탐색">
        <div class="map-landing-shell">
          <a
            class="map-floating-chip"
            href="${getJurisdictionHref("federal", basePath)}"
            data-jurisdiction-link="federal"
          >
            <strong>EE / Federal</strong>
            <span>${federalCount}건</span>
          </a>
          <div class="map-frame map-frame-landing">
            ${CANADA_MAP_SVG}
          </div>
          <div class="map-tooltip" id="map-tooltip" hidden></div>
        </div>
        <p class="map-attribution">
          Map base adapted from
          <a href="https://commons.wikimedia.org/wiki/File:Canada_labelled_map.svg" target="_blank" rel="noreferrer">Wikimedia Commons</a>
          under CC BY-SA 2.5.
        </p>
      </section>
    `;
  }

  const activeRegions = regions
    .filter((region) => region.id !== "federal" && region.updateCount > 0)
    .sort((left, right) => right.updateCount - left.updateCount || left.labelKo.localeCompare(right.labelKo));
  const standbyRegions = regions.filter((region) => region.id !== "federal" && region.updateCount === 0).slice(0, 5);

  return `
    <section class="section map-section">
      <details class="panel-collapsible">
        <summary class="panel-collapsible-summary">
          <div>
            <p class="panel-kicker">Map Explorer</p>
            <h2>지역 탐색은 필요할 때만 열기</h2>
            <p class="panel-note">비교와 추천을 본 뒤, 마지막에 지도에서 지역 페이지로 들어가면 훨씬 덜 헷갈립니다.</p>
          </div>
          <div class="panel-collapsible-side">
            <span class="compare-pill">지도 탐색</span>
            <span class="panel-collapsible-chevron" aria-hidden="true">▾</span>
          </div>
        </summary>

        <div class="panel-collapsible-body map-layout">
        <div class="map-shell">
          <div class="federal-jump-row">
            <a
              class="map-index-item federal-jump"
              href="${getJurisdictionHref("federal", basePath)}"
              data-jurisdiction-link="federal"
            >
              <strong>연방 / Express Entry</strong>
              <span>${regions.find((region) => region.id === "federal")?.updateCount ?? 0}건 · express-entry</span>
            </a>
          </div>
          <div class="map-frame">
            ${CANADA_MAP_SVG}
          </div>
          <div class="map-tooltip" id="map-tooltip" hidden></div>
          <p class="map-attribution">
            Map base adapted from
            <a href="https://commons.wikimedia.org/wiki/File:Canada_labelled_map.svg" target="_blank" rel="noreferrer">Wikimedia Commons</a>
            under CC BY-SA 2.5.
          </p>
        </div>

        <aside class="map-sidebar">
          <div class="map-focus-card">
            <p class="panel-label">Hover Preview</p>
            <h3 id="map-selection-label">지역을 선택해 보세요</h3>
            <p id="map-selection-meta" class="map-selection-meta">
              비교표로 감을 잡았다면 여기서 지역을 고르세요. 호버로 최근 공지 현황을 보고, 클릭하면 EE 또는 각 주 상세 페이지로 이동합니다.
            </p>
            <a class="btn ghost" id="map-selection-link" href="${getJurisdictionHref("federal", basePath)}">연방 / EE 먼저 보기</a>
          </div>

          <div class="map-index">
            <div class="map-index-group">
              <p class="panel-kicker">Active Regions</p>
              ${activeRegions
                .map(
                  (region) => `
                    <a
                      class="map-index-item"
                      href="${escapeHtml(getJurisdictionHref(region.id, basePath))}"
                      data-jurisdiction-link="${escapeHtml(region.id)}"
                    >
                      <strong>${escapeHtml(region.labelKo)}</strong>
                      <span>${region.updateCount}건 · ${escapeHtml(region.programs.join(", "))}</span>
                    </a>
                  `
                )
                .join("")}
            </div>

            <div class="map-index-group subtle">
              <p class="panel-kicker">Standby</p>
              <div class="map-standby-list">
                ${standbyRegions
                  .map(
                    (region) => `
                      <a
                        class="standby-chip"
                        href="${escapeHtml(getJurisdictionHref(region.id, basePath))}"
                        data-jurisdiction-link="${escapeHtml(region.id)}"
                      >
                        ${escapeHtml(region.labelKo)}
                      </a>
                    `
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </aside>
        </div>
      </details>
    </section>
  `;
}

function renderDashboardPage({ updates, basePath = "" }) {
  const insights = buildJurisdictionInsights(updates);

  return `
    ${renderHomeHero(updates, basePath)}
    <div id="situations">
      ${renderSituationSection(insights)}
    </div>
    <div id="compare-table">
      ${renderComparisonTable(insights, basePath)}
    </div>
  `;
}

function renderSourceCards(sourceDefs, reportMap) {
  if (sourceDefs.length === 0) {
    return `
      <div class="empty-state">
        이 지역은 아직 공식 소스를 연결하는 중입니다. 먼저 메인 지도에서 다른 지역을 둘러보거나,
        원문 구조가 안정적인 주부터 순차적으로 확장할 수 있습니다.
      </div>
    `;
  }

  return `
    <div class="source-grid">
      ${sourceDefs
        .map((source) => {
          const report = reportMap.get(source.id);
          const status = describeSourceReport(report);

          return `
            <article class="source-card">
              <div class="card-topline">
                <span class="status-badge ${escapeHtml(status.badgeClass)}">${escapeHtml(status.badgeLabel)}</span>
                <span class="tag">${escapeHtml(source.program.toUpperCase())}</span>
              </div>
              <h3>${escapeHtml(source.name)}</h3>
              <p class="summary">${escapeHtml(status.detail)}</p>
              <div class="source-meta">
                <span>수집 방식: ${escapeHtml(source.fetchMode ?? source.adapter)}</span>
                <span>이벤트: ${escapeHtml(source.eventType)}</span>
              </div>
              <div class="card-footer">
                <span>${escapeHtml(source.jurisdiction)}</span>
                <div class="card-links">
                  <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">공식 원문</a>
                </div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderQuickFacts(profile) {
  if (!profile?.quickFacts?.length) {
    return "";
  }

  return `
    <div class="overview-grid" aria-label="공식 페이지 핵심 포인트">
      ${profile.quickFacts
        .map(
          (fact) => `
            <article class="overview-card">
              <span>${escapeHtml(fact.labelKo)}</span>
              <strong>${escapeHtml(fact.valueKo)}</strong>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderStreamTagRow(stream) {
  const tags = deriveStreamTags(stream);

  if (tags.length === 0) {
    return "";
  }

  return `
    <div class="stream-tag-row">
      ${tags.map((tag) => `<span class="stream-tag">${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

function renderBeginnerGlossary(profile) {
  const streams = flattenProfileStreams(profile);
  const glossaryDefinitions = {
    "EE 연계": "연방 Express Entry 프로필이 먼저 있어야 하거나 EE 풀과 연결되는 경로입니다.",
    "잡오퍼": "해당 주 고용주의 오퍼 또는 현재 고용 상태가 핵심인 경로입니다.",
    "졸업자": "주로 캐나다 또는 해당 주 학위 취득자를 대상으로 하는 경로입니다.",
    "사업/창업": "근로자 이민이 아니라 사업 설립·인수·운영을 보는 경로입니다.",
    "프랑스어": "프랑스어 능력이 핵심 조건이거나 우선 요소인 경로입니다.",
    "보건": "보건의료 직군 또는 보건기관 고용과 연결된 경로입니다.",
    "기술직": "trade 또는 특정 기술직군을 중심으로 한 경로입니다.",
    "지역/커뮤니티": "특정 지역, 농촌, 참여 커뮤니티 기준이 붙는 경로입니다.",
    "현지경력": "해당 주 또는 캐나다 내 근무 경험이 중요한 경로입니다."
  };
  const tagOrder = Object.keys(glossaryDefinitions);
  const tags = tagOrder.filter((tag) =>
    streams.some((stream) => deriveStreamTags(stream).includes(tag))
  );

  if (tags.length === 0) {
    return "";
  }

  return `
    <div class="glossary-panel">
      <div class="panel-head panel-head-tight">
        <div>
          <p class="panel-kicker">How To Read</p>
          <h3>처음 보는 사람을 위한 읽는 법</h3>
        </div>
        <p class="panel-note">아래 태그는 각 스트림 카드에 같이 표시됩니다.</p>
      </div>
      <div class="glossary-grid">
        ${tags
          .map(
            (tag) => `
              <article class="glossary-card">
                <span class="stream-tag">${escapeHtml(tag)}</span>
                <p>${escapeHtml(glossaryDefinitions[tag])}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderStreamGroups(profile) {
  if (!profile?.streamGroups?.length) {
    return `
      <div class="empty-state">
        이 지역의 스트림 구조 요약은 준비 중입니다. 아래 공식 소스와 최신 업데이트 카드부터 먼저 확인할 수 있습니다.
      </div>
    `;
  }

  return `
    <div class="stream-group-list">
      ${profile.streamGroups
        .map(
          (group) => `
            <section class="stream-group">
              <div class="stream-group-head">
                <div>
                  <p class="panel-kicker">Category</p>
                  <h3>${escapeHtml(group.titleKo)}</h3>
                </div>
                <p class="stream-group-copy">${group.streams.length}개 스트림</p>
              </div>
              <div class="stream-card-grid">
                ${group.streams
                  .map(
                    (stream) => `
                      <article class="stream-card">
                        <h4>${escapeHtml(stream.nameKo)}</h4>
                        ${renderStreamTagRow(stream)}
                        <p class="stream-meta">
                          <strong>공식 분류</strong>
                          <span>${escapeHtml(group.titleKo)}</span>
                        </p>
                        <p class="stream-meta">
                          <strong>대상</strong>
                          <span>${escapeHtml(stream.audienceKo)}</span>
                        </p>
                        <a
                          class="panel-link stream-link"
                          href="${escapeHtml(stream.officialUrl)}"
                          target="_blank"
                          rel="noreferrer"
                        >
                          공식 설명 보기
                        </a>
                      </article>
                    `
                  )
                  .join("")}
              </div>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProfileNotes(profile) {
  if (!profile?.notesKo?.length) {
    return "";
  }

  return `
    <div class="profile-note-panel">
      <p class="panel-kicker">Official Notes</p>
      <ul class="note-list">
        ${profile.notesKo.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderRegionDecisionSection(insight) {
  return `
    <section class="section panel">
      <div class="panel-head">
        <div>
          <p class="panel-kicker">5-Second Summary</p>
          <h2>이 지역을 볼지 말지 먼저 판단</h2>
        </div>
        <p class="panel-note">복잡한 설명 대신 먼저 판단에 필요한 항목만 모았습니다.</p>
      </div>
      <div class="overview-grid" aria-label="지역 판단 요약">
        <article class="overview-card">
          <span>운영 체계</span>
          <strong>${escapeHtml(insight.system)}</strong>
        </article>
        <article class="overview-card">
          <span>EE 연계</span>
          <strong>${escapeHtml(insight.statuses.ee)}</strong>
        </article>
        <article class="overview-card">
          <span>잡오퍼 성격</span>
          <strong>${escapeHtml(insight.statuses.jobOffer)}</strong>
        </article>
        <article class="overview-card">
          <span>졸업자 경로</span>
          <strong>${escapeHtml(insight.statuses.graduate)}</strong>
        </article>
        <article class="overview-card">
          <span>사업/창업</span>
          <strong>${escapeHtml(insight.statuses.entrepreneur)}</strong>
        </article>
        <article class="overview-card">
          <span>프랑스어</span>
          <strong>${escapeHtml(insight.statuses.french)}</strong>
        </article>
      </div>
      <div class="decision-grid">
        <article class="decision-card">
          <p class="panel-kicker">Who Should Start Here</p>
          <h3>이런 사람이 먼저 보면 좋습니다</h3>
          <ul class="note-list">
            ${insight.whoFor.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
        <article class="decision-card">
          <p class="panel-kicker">Check First</p>
          <h3>처음 들어오면 먼저 확인할 것</h3>
          <ul class="note-list">
            ${insight.firstChecks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </article>
      </div>
    </section>
  `;
}

function renderKeyStreams(insight) {
  if (insight.keyStreams.length === 0) {
    return "";
  }

  return `
    <section class="section panel">
      <div class="panel-head">
        <div>
          <p class="panel-kicker">Start With</p>
          <h2>먼저 읽어야 할 대표 경로</h2>
        </div>
        <p class="panel-note">전체 스트림을 보기 전에 대표 경로부터 훑어보면 이해가 빨라집니다.</p>
      </div>
      <div class="stream-card-grid">
        ${insight.keyStreams
          .map(
            (stream) => `
              <article class="stream-card">
                <h4>${escapeHtml(stream.nameKo)}</h4>
                ${renderStreamTagRow(stream)}
                <p class="stream-meta">
                  <strong>공식 분류</strong>
                  <span>${escapeHtml(stream.groupTitleKo)}</span>
                </p>
                <p class="stream-meta">
                  <strong>대상</strong>
                  <span>${escapeHtml(stream.audienceKo)}</span>
                </p>
                <a
                  class="panel-link stream-link"
                  href="${escapeHtml(stream.officialUrl)}"
                  target="_blank"
                  rel="noreferrer"
                >
                  공식 설명 보기
                </a>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderJurisdictionOverview(meta, profile) {
  if (!profile) {
    return `
      <section class="section panel">
        <div class="panel-head">
          <div>
            <p class="panel-kicker">Program Structure</p>
            <h2>이 지역 프로그램 구조</h2>
          </div>
          <p class="panel-note">공식 기준 요약을 준비 중입니다.</p>
        </div>
        <div class="empty-state">
          ${escapeHtml(meta.labelKo)}의 스트림 구조 요약은 아직 정리 중입니다. 아래 공식 소스와 최신 업데이트를 먼저 확인해 주세요.
        </div>
      </section>
    `;
  }

  return `
    <section class="section panel">
      <div class="panel-head">
        <div>
          <p class="panel-kicker">Program Structure</p>
          <h2>이 지역 프로그램 구조</h2>
        </div>
        <p class="panel-note">공식 기준 확인일 ${escapeHtml(profile.verifiedOn)}</p>
      </div>
      <div class="section-intro">
        <p>
          이 페이지는 ${escapeHtml(meta.labelKo)}의 공식 이민 구조를 초보자도 바로 읽을 수 있게
          운영 체계 → 큰 카테고리 → 스트림 대상 → 공식 링크 순서로 정리했습니다.
        </p>
        <a
          class="source-link"
          href="${escapeHtml(profile.officialOverviewUrl)}"
          target="_blank"
          rel="noreferrer"
        >
          ${escapeHtml(profile.officialOverviewLabel)}
        </a>
      </div>
      ${renderQuickFacts(profile)}
      ${renderBeginnerGlossary(profile)}
      ${renderStreamGroups(profile)}
      ${renderProfileNotes(profile)}
    </section>
  `;
}

function renderJurisdictionPage({ jurisdictionId, generatedAt, updates, reports = [], basePath = "" }) {
  const meta = getJurisdictionMeta(jurisdictionId);
  const profile = getJurisdictionProfile(jurisdictionId);
  const regionUpdates = getUpdatesForJurisdiction(updates, jurisdictionId);
  const insight = buildJurisdictionInsight(meta, profile, regionUpdates);
  const sourceDefs = getSourceDefinitionsForJurisdiction(jurisdictionId);
  const reportMap = getReportMap(reports);
  const latestDate = getLatestUpdateDate(regionUpdates, generatedAt);
  const programs = getProgramList(regionUpdates);
  const okSourceCount = sourceDefs.filter((source) => reportMap.get(source.id)?.ok).length;
  const statusSummary = regionUpdates.length > 0
    ? `현재 최신 공지 ${regionUpdates.length}건을 추적 중이고 최근 발표일은 ${latestDate}입니다.`
    : sourceDefs.length > 0
      ? "공식 소스는 연결되어 있으며, 카드형 업데이트는 순차적으로 채워지고 있습니다."
      : "공식 소스와 카드형 업데이트를 같은 구조로 순차 연결하고 있습니다.";
  const heroText = `${meta.labelKo} 페이지에서는 이 지역의 프로그램 구조, 연결된 공식 소스, 최신 공지를 한 화면에서 정리합니다. ${statusSummary}`;

  return `
    <section class="hero hero-region">
      <div class="hero-copy">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="${withBasePath(basePath, "/")}">지도 허브</a>
          <span>/</span>
          <span>${escapeHtml(meta.labelKo)}</span>
        </nav>
        <p class="eyebrow">Jurisdiction Brief</p>
        <h1>${escapeHtml(meta.labelKo)}</h1>
        <p class="hero-text">${escapeHtml(heroText)}</p>
        <div class="hero-actions">
          <a class="btn ghost" href="${withBasePath(basePath, "/")}">지도 허브로 돌아가기</a>
          ${sourceDefs[0]
            ? `<a class="btn tone-blue" href="${escapeHtml(sourceDefs[0].url)}" target="_blank" rel="noreferrer">대표 공식 소스</a>`
            : ""}
        </div>
      </div>
      <aside class="hero-panel">
        <p class="panel-label">Region Snapshot</p>
        <h2>지금 이 지역에서 볼 것</h2>
        <dl class="hero-stats" aria-label="${escapeHtml(meta.labelKo)} 상태">
          <div>
            <dt>업데이트 카드</dt>
            <dd>${regionUpdates.length}</dd>
          </div>
          <div>
            <dt>연결 소스</dt>
            <dd>${okSourceCount}/${sourceDefs.length}</dd>
          </div>
          <div>
            <dt>프로그램</dt>
            <dd>${programs.length > 0 ? escapeHtml(programs.join(", ")) : "준비 중"}</dd>
          </div>
          <div>
            <dt>최근 발표일</dt>
            <dd>${escapeHtml(latestDate)}</dd>
          </div>
        </dl>
        <a class="panel-link" href="${getJurisdictionHref("federal", basePath)}">연방 / EE 보기</a>
      </aside>
    </section>

    ${renderRegionDecisionSection(insight)}
    ${renderKeyStreams(insight)}
    ${renderJurisdictionOverview(meta, profile)}

    <section class="section panel">
      <div class="panel-head">
        <div>
          <p class="panel-kicker">Official Sources</p>
          <h2>연결된 공식 소스</h2>
        </div>
        <p class="panel-note">지역 상세 페이지에서는 공지 카드와 함께 연결 상태도 바로 확인할 수 있게 했습니다.</p>
      </div>
      ${renderSourceCards(sourceDefs, reportMap)}
    </section>

    <section class="section panel">
      <div class="panel-head">
        <div>
          <p class="panel-kicker">Latest Updates</p>
          <h2>${escapeHtml(meta.labelKo)} 업데이트</h2>
        </div>
        <p class="panel-note">원문 링크와 한국어 요약을 함께 제공합니다.</p>
      </div>
      ${regionUpdates.length > 0
        ? `<section class="news-grid">${renderDashboardCards(regionUpdates, { basePath })}</section>`
        : `
          <div class="empty-state">
            아직 표시할 카드가 없습니다. 이 지역은 소스 연결 또는 파서 안정화가 끝나면 메인 지도에서 바로 들어와 볼 수 있도록 준비해두었습니다.
          </div>
        `}
    </section>
  `;
}

function renderClientScript({ page, updates, basePath = "", analyticsMeasurementId = "" }) {
  return `
    <script>
      const PAGE = ${JSON.stringify(page)};
      const BASE_PATH = ${serializeForScript(normalizeBasePath(basePath))};
      const ANALYTICS_MEASUREMENT_ID = ${serializeForScript(analyticsMeasurementId)};
      const ANALYTICS_ENABLED = Boolean(ANALYTICS_MEASUREMENT_ID);
      const UPDATES = ${serializeForScript(updates)};
      const MAP_REGION_DEFS = ${serializeForScript(JURISDICTION_META)};
      const MINI_REGION_MAPS = ${serializeForScript(MINI_REGION_MAP_SVGS)};
      const SPECIAL_PATHWAYS = ${serializeForScript(page === "dashboard" ? specialPathways : [])};
      const DASHBOARD_INSIGHTS = ${serializeForScript(
        page === "dashboard" ? buildJurisdictionInsights(updates) : []
      )};
      ${readDashboardRawAnswersFromControls.toString()}
      let hasTrackedFormStarted = false;
      let hasTrackedFormCompleted = false;
      let lastRenderedRecommendationSignature = "";

      function trackAnalytics(eventName, params = {}) {
        if (!ANALYTICS_ENABLED || typeof window.gtag !== "function") {
          return;
        }

        const payload = {
          page_kind: PAGE,
          ...params
        };

        if (typeof window.location?.pathname === "string") {
          payload.page_path = window.location.pathname;
        }

        window.gtag("event", eventName, payload);
      }

      window.MapleGuideAnalytics = {
        enabled: ANALYTICS_ENABLED,
        measurementId: ANALYTICS_MEASUREMENT_ID,
        track: trackAnalytics
      };

      if (PAGE === "dashboard") {
        const quickStartForm = document.getElementById("quick-start-form");
        const quickStartResults = document.getElementById("quick-start-results");
        const koreaJobTitleInput = quickStartForm?.elements?.namedItem("koreaJobTitle");
        const canadaJobTitleInput = quickStartForm?.elements?.namedItem("canadaJobTitle");
        const koreaOccupationSelect = quickStartForm?.elements?.namedItem("koreaOccupation");
        const canadaOccupationSelect = quickStartForm?.elements?.namedItem("canadaOccupation");
        const koreaTitleHint = document.getElementById("korea-title-hint");
        const canadaTitleHint = document.getElementById("canada-title-hint");
        const requiredFieldNodes = Array.from(document.querySelectorAll("[data-required-field]"));
        const updatesMoreToggle = document.getElementById("updates-more-toggle");
        const olderUpdatesList = document.getElementById("older-updates-list");
        const quickRegionFederalButton = document.querySelector("[data-quick-region-toggle='federal']");
        const quickRegionClearButton = document.querySelector("[data-quick-region-clear]");
        const quickRegionSelection = document.getElementById("quick-region-selection");
        const canadianExpSelect = quickStartForm?.elements?.namedItem("canadianExp");
        const canadianJobSkillSelect = quickStartForm?.elements?.namedItem("canadianJobSkill");
        const baseSelect = quickStartForm?.elements?.namedItem("base");
        const permitRemainingSelect = quickStartForm?.elements?.namedItem("permitRemaining");
        const mapSelectionLabel = document.getElementById("map-selection-label");
        const mapSelectionMeta = document.getElementById("map-selection-meta");
        const mapSelectionLink = document.getElementById("map-selection-link");
        const mapTooltip = document.getElementById("map-tooltip");
        const hoverableJumpLinks = Array.from(document.querySelectorAll("[data-jurisdiction-link]"));
        const allQuickRegionIds = MAP_REGION_DEFS.map((region) => region.id);
        const activeQuickRegions = new Set(allQuickRegionIds);
        const defaultSelection = {
          label: "지역을 선택해 보세요",
          meta: "비교표와 상황별 카드를 먼저 보고 범위를 좁힌 뒤, 여기서 지역 상세 페이지로 이동하면 훨씬 덜 헷갈립니다.",
          href: (BASE_PATH || "") + "/region/federal",
          linkText: "연방 / EE 먼저 보기"
        };

        function hasAnswerValue(value) {
          return !(typeof value === "undefined" || value === null || String(value).trim() === "");
        }

        function escapeHtmlClient(value) {
          return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
        }

        function statusSupports(status) {
          return !["없음", "낮음", "해당 없음"].includes(status);
        }

        function hasCanadianWorkBase(base) {
          return ["working-holiday", "pgwp", "worker"].includes(base);
        }

        const REQUIRED_FIELD_LABELS = ${JSON.stringify(DASHBOARD_REQUIRED_FIELD_LABELS)};
        const OPTIONAL_ANSWER_DEFAULTS = ${JSON.stringify(DASHBOARD_OPTIONAL_DEFAULTS)};

        function getMissingRequiredFields(rawAnswers) {
          return Object.entries(REQUIRED_FIELD_LABELS)
            .filter(([field]) => !hasAnswerValue(rawAnswers[field]))
            .map(([, label]) => label);
        }

        function getAnsweredRequiredFieldCount(rawAnswers) {
          return Object.keys(REQUIRED_FIELD_LABELS).filter((field) => hasAnswerValue(rawAnswers[field])).length;
        }

        function trackFormStarted(rawAnswers) {
          if (hasTrackedFormStarted || getAnsweredRequiredFieldCount(rawAnswers) === 0) {
            return;
          }

          hasTrackedFormStarted = true;
          trackAnalytics("form_started", {
            answered_required_fields: getAnsweredRequiredFieldCount(rawAnswers)
          });
        }

        function trackFormCompleted(answers) {
          if (hasTrackedFormCompleted) {
            return;
          }

          hasTrackedFormCompleted = true;
          trackAnalytics("form_completed", {
            path: answers.path,
            base: answers.base,
            setting: answers.setting,
            selected_region_count: activeQuickRegions.size || MAP_REGION_DEFS.length
          });
        }

        function bindRecommendationInteractions() {
          if (!quickStartResults) {
            return;
          }

          quickStartResults
            .querySelectorAll(".result-details")
            .forEach((detailsNode) => {
              detailsNode.addEventListener("toggle", () => {
                if (!detailsNode.open) {
                  return;
                }

                const cardNode = detailsNode.closest(".wizard-result-card");
                trackAnalytics("recommendation_detail_opened", {
                  recommendation_id: cardNode?.dataset.recommendationId ?? "",
                  route_type: cardNode?.dataset.routeType ?? ""
                });
              });
            });

          quickStartResults
            .querySelectorAll("[data-recommendation-link]")
            .forEach((linkNode) => {
              linkNode.addEventListener("click", () => {
                trackAnalytics("recommendation_region_clicked", {
                  recommendation_id: linkNode.dataset.recommendationId ?? "",
                  route_type: linkNode.dataset.routeType ?? ""
                });
              });
            });
        }

        function syncMissingRequiredStates(rawAnswers) {
          requiredFieldNodes.forEach((fieldNode) => {
            const fieldName = fieldNode.dataset.requiredField;
            const missing = Boolean(fieldName && !hasAnswerValue(rawAnswers[fieldName]));
            fieldNode.classList.toggle("is-missing", missing);

            const control = fieldNode.querySelector("select, input, textarea");
            if (control) {
              control.setAttribute("aria-invalid", String(missing));
            }
          });
        }

        function applyOptionalAnswerDefaults(rawAnswers) {
          const completed = { ...rawAnswers };

          for (const [field, value] of Object.entries(OPTIONAL_ANSWER_DEFAULTS)) {
            if (!completed[field]) {
              completed[field] = value;
            }
          }

          return completed;
        }

        function normalizeDependentAnswers(rawAnswers) {
          const normalized = { ...rawAnswers };

          normalized.koreaJobTitle = (normalized.koreaJobTitle || "").trim();
          normalized.canadaJobTitle = (normalized.canadaJobTitle || "").trim();

          if (normalized.canadianExp === "0") {
            normalized.canadianJobSkill = "not-working";
          } else if (normalized.canadianExp && normalized.canadianExp !== "0" && normalized.canadianJobSkill === "not-working") {
            normalized.canadianJobSkill = "mixed";
          }

          if (normalized.base === "outside" && (!normalized.permitRemaining || normalized.permitRemaining === "unsure")) {
            normalized.permitRemaining = "not-applicable";
          }

          if (normalized.base !== "outside" && normalized.permitRemaining === "not-applicable") {
            normalized.permitRemaining = "";
          }

          if (normalized.canadianExp === "0") {
            normalized.canadaOccupation = normalized.canadaOccupation || "general";
          }

          if (normalized.foreignExp === "0") {
            normalized.koreaOccupation = normalized.koreaOccupation || "general";
          }

          return normalized;
        }

        function readQuickStartRawAnswers() {
          if (!quickStartForm) {
            return {};
          }

          return readDashboardRawAnswersFromControls(quickStartForm.elements, normalizeDependentAnswers);
        }

        function toggleQuickRegion(regionId) {
          if (activeQuickRegions.has(regionId)) {
            activeQuickRegions.delete(regionId);
          } else {
            activeQuickRegions.add(regionId);
          }
        }

        function syncDependentSelects() {
          if (canadianExpSelect && canadianJobSkillSelect) {
            if (canadianExpSelect.value === "0") {
              canadianJobSkillSelect.value = "not-working";
            } else if (canadianExpSelect.value && canadianJobSkillSelect.value === "not-working") {
              canadianJobSkillSelect.value = "";
            }
          }

          if (baseSelect && permitRemainingSelect) {
            if (baseSelect.value === "outside") {
              permitRemainingSelect.value = "not-applicable";
            } else if (permitRemainingSelect.value === "not-applicable") {
              permitRemainingSelect.value = "";
            }
          }
        }

        function selectAllQuickRegions() {
          activeQuickRegions.clear();
          allQuickRegionIds.forEach((regionId) => activeQuickRegions.add(regionId));
        }

        function updateQuickRegionSummary() {
          if (!quickRegionSelection) {
            return;
          }

          if (activeQuickRegions.size === 0) {
            quickRegionSelection.textContent = "선택된 지역 없음 · 전체 추천";
            return;
          }

          if (activeQuickRegions.size === allQuickRegionIds.length) {
            quickRegionSelection.textContent = "전체 선택됨 · 모든 지역 비교";
            return;
          }

          if (activeQuickRegions.size === allQuickRegionIds.length - 1 && !activeQuickRegions.has("federal")) {
            quickRegionSelection.textContent = "주정부 전체 선택 · Federal / EE 제외";
            return;
          }

          const labels = [...activeQuickRegions]
            .map((regionId) => {
              const region = MAP_REGION_DEFS.find((entry) => entry.id === regionId);
              return region?.labelEn ?? region?.labelKo ?? regionId;
            })
            .join(" / ");
          quickRegionSelection.textContent = "선택된 지역: " + labels;
        }

        function isWorkerIntent(path) {
          return ["worker", "outside-worker", "working-holiday", "canadian-worker"].includes(path);
        }

        function isGraduateIntent(path) {
          return ["graduate", "study-plan", "pgwp-pr"].includes(path);
        }

        function isStudyStartIntent(path) {
          return path === "study-plan";
        }

        function isPgwpIntent(path) {
          return ["pgwp-pr", "graduate"].includes(path);
        }

        function isCanadianExperienceIntent(path) {
          return ["working-holiday", "pgwp-pr", "canadian-worker"].includes(path);
        }

        function getRecommendationMiniMapMarkup(jurisdictionId) {
          return MINI_REGION_MAPS[jurisdictionId] || MINI_REGION_MAPS.federal || "";
        }

        if (updatesMoreToggle && olderUpdatesList) {
          updatesMoreToggle.addEventListener("click", () => {
            const expanded = updatesMoreToggle.getAttribute("aria-expanded") === "true";
            const nextExpanded = !expanded;
            updatesMoreToggle.setAttribute("aria-expanded", String(nextExpanded));
            updatesMoreToggle.textContent = nextExpanded
              ? updatesMoreToggle.dataset.closeLabel || "업데이트 접기"
              : updatesMoreToggle.dataset.openLabel || "업데이트 더보기";
            olderUpdatesList.hidden = !nextExpanded;
            if (nextExpanded) {
              trackAnalytics("older_updates_opened", {
                older_update_count: olderUpdatesList.querySelectorAll(".update-flash-card").length
              });
            }
          });
        }

        document.querySelectorAll(".update-flash-card").forEach((updateNode) => {
          updateNode.addEventListener("toggle", () => {
            if (!updateNode.open) {
              return;
            }

            trackAnalytics("latest_update_opened", {
              jurisdiction: updateNode.dataset.analyticsJurisdiction ?? "",
              headline: updateNode.dataset.analyticsHeadline ?? ""
            });
          });
        });

        if (canadianExpSelect) {
          canadianExpSelect.addEventListener("change", () => {
            syncDependentSelects();
            renderQuickStartResults();
          });
        }

        if (baseSelect) {
          baseSelect.addEventListener("change", () => {
            syncDependentSelects();
            renderQuickStartResults();
          });
        }

        ${countsCanadianExperienceForCrs.toString()}
        ${describeCanadianExperienceCrsTreatment.toString()}
        ${estimateCanadianExperienceCrsPoints.toString()}
        ${getLanguageImprovementActions.toString()}
        ${getNextCanadianExperienceYear.toString()}
        ${shouldSuggestSkilledSwitch.toString()}

        function hasSkilledCanadianTrack(answers) {
          return countsCanadianExperienceForCrs(answers);
        }

        function normalizeLanguageAnswers(rawAnswers) {
          const [evidence = "guess", english = "unknown"] = (rawAnswers.languageProfile || "guess:unknown").split(":");
          const labelMap = {
            "guess:unknown": "시험은 안 봤고 지금은 잘 모르겠어요",
            "guess:clb6": "시험은 안 봤고 지금은 CLB 6 이하 같아요",
            "guess:clb7": "시험은 안 봤고 지금은 CLB 7 정도 같아요",
            "guess:clb8": "시험은 안 봤고 지금은 CLB 8 정도 같아요",
            "target:clb7": "공인 점수는 없지만 CLB 7까지는 딸 수 있을 것 같아요",
            "target:clb8": "공인 점수는 없지만 CLB 8까지는 딸 수 있을 것 같아요",
            "target:clb9plus": "공인 점수는 없지만 CLB 9 이상도 노려볼 수 있을 것 같아요",
            "official:clb6": "공인 영어점수는 CLB 6 이하예요",
            "official:clb7": "공인 영어점수는 CLB 7 정도예요",
            "official:clb8": "공인 영어점수는 CLB 8 정도예요",
            "official:clb9plus": "공인 영어점수는 CLB 9 이상이에요"
          };

          return {
            english,
            languageScoreStatus: evidence === "official" ? "official" : evidence === "target" ? "booked" : "none",
            languageTest: evidence === "guess" ? "none" : "english",
            languageEvidence: evidence,
            languageProfileLabelKo: labelMap[rawAnswers.languageProfile] ?? labelMap["guess:unknown"]
          };
        }

        function getLifestylePreferenceSortScore(insight, answers) {
          let score = 0;

          if (answers.setting === "metro") {
            score += (insight.lifestyle.metroLevel || 0) * 3;
            score -= (insight.lifestyle.regionalLevel || 0) * 2;
          }

          if (answers.setting === "regional") {
            score += (insight.lifestyle.regionalLevel || 0) * 3;
            score -= (insight.lifestyle.metroLevel || 0) * 2;
          }

          if (answers.budget === "tight") {
            score -= (insight.lifestyle.costLevel || 0) * 2;

            if (isGraduateIntent(answers.path)) {
              score -= (insight.lifestyle.tuitionLevel || 0) * 2;
            }
          }

          return score;
        }

        function scoreInsight(insight, answers) {
          let score = 0;
          const policyReasons = [];
          const lifestyleReasons = [];
          const occupationLens = buildProvinceOccupationLens(answers, insight);

          function add(points, reason) {
            score += points;
            policyReasons.push(reason);
          }

          function addLifestyle(points, reason) {
            score += points;
            lifestyleReasons.push(reason);
          }

          if (isWorkerIntent(answers.path) && (statusSupports(insight.statuses.ee) || statusSupports(insight.statuses.jobOffer))) {
            add(2, "취업형 경로로 볼 수 있는 주");
          }
          if (isGraduateIntent(answers.path) && statusSupports(insight.statuses.graduate)) {
            add(4, "졸업자 경로가 있는 지역");
          }
          if (answers.path === "business" && statusSupports(insight.statuses.entrepreneur)) {
            add(4, "사업·창업 경로가 있는 지역");
          }
          if (answers.path === "outside-worker" && statusSupports(insight.statuses.ee)) {
            add(2, "캐나다 밖에서 바로 EE 또는 취업형 경로를 보기 좋은 지역");
          }
          if (answers.path === "working-holiday" && statusSupports(insight.statuses.localExperience)) {
            add(3, "워홀·오픈퍼밋 경력을 현지경력 경로로 연결하기 좋은 지역");
          }
          if (isStudyStartIntent(answers.path) && statusSupports(insight.statuses.graduate)) {
            add(3, "유학 시작 단계에서 졸업 후 경로를 같이 보기 좋은 지역");
          }
          if (isPgwpIntent(answers.path) && (statusSupports(insight.statuses.graduate) || statusSupports(insight.statuses.localExperience))) {
            add(3, "PGWP 또는 졸업 후 현지경력과 이어 보기 좋은 지역");
          }
          if (answers.path === "canadian-worker" && statusSupports(insight.statuses.localExperience)) {
            add(4, "현재 캐나다 skilled 경력으로 바로 PR을 이어보기 좋은 지역");
          }
          if (answers.base === "student" && statusSupports(insight.statuses.graduate)) {
            add(3, "현재 학생 상태와 연결되는 졸업자 경로가 있음");
          }
          if (hasCanadianWorkBase(answers.base) && statusSupports(insight.statuses.localExperience)) {
            add(3, "현재 캐나다 근무 경험을 활용할 수 있는 편");
          }
          if (answers.base === "working-holiday") {
            if (answers.canadianJobSkill === "skilled") {
              add(2, "워홀이어도 현재 캐나다 skilled 경력이면 연결 가능한 경로가 있음");
            } else if (answers.canadianJobSkill === "non-skilled") {
              add(-2, "워홀 자체보다 현재 캐나다 일이 skilled 경력인지가 더 중요함");
            }
          }
          if (answers.base === "pgwp" && statusSupports(insight.statuses.graduate)) {
            add(2, "PGWP 이후 연결하기 쉬운 졸업자/현지경력 경로가 있음");
          }

          if (answers.age === "20-29") {
            add(3, "연령대가 경제이민 점수 구조에 가장 유리한 편");
          } else if (["30", "31"].includes(answers.age)) {
            add(2, "연령대가 아직 강점으로 작동하는 편");
          } else if (["32", "33", "34"].includes(answers.age)) {
            add(1, "연령대가 아직 경쟁력 있는 편");
          } else if (["40", "41"].includes(answers.age)) {
            add(-1, "연령 점수는 보수적으로 봐야 함");
          } else if (["42", "43", "44", "45+"].includes(answers.age)) {
            add(-2, "EE 점수 구조상 연령은 불리할 수 있음");
          }

          if (["bachelor", "two-plus", "master", "professional", "doctorate"].includes(answers.education)) {
            add(2, "학력 요소가 비교적 좋은 편");
          }
          if (["master", "professional", "doctorate"].includes(answers.education)) {
            add(1, "상위 학력 기반 점수 여지가 있음");
          }
          if (answers.ecaStatus === "completed" || answers.ecaStatus === "canadian-degree") {
            add(2, "학력 점수화에 필요한 ECA 또는 캐나다 학위 상태가 준비됨");
          } else if (answers.ecaStatus === "in-progress") {
            add(0, "ECA 진행 상태라 다음 단계로 이어갈 수 있음");
          } else if (answers.ecaStatus === "needed") {
            add(-2, "해외 학력 점수화 전 ECA 준비가 먼저 필요함");
          }

          if (answers.english === "clb9plus") {
            add(3, "영어 점수가 잘 나오면 EE와 주정부 모두에서 강점이 큼");
          } else if (answers.english === "clb8") {
            add(2, "언어 점수가 준수한 편");
          } else if (answers.english === "clb7") {
            add(1, "언어 점수 개선 여지가 있음");
          } else if (answers.english === "clb6") {
            add(-1, "언어 점수 보완이 먼저 필요할 수 있음");
          }

          if (["2", "3", "4", "5"].includes(answers.foreignExp)) {
            add(2, "해외 숙련 경력이 활용될 수 있음");
          }
          if (["1", "2", "3", "4", "5"].includes(answers.canadianExp)) {
            add(3, "캐나다 경력은 많은 경로에서 직접 강점이 됨");
          }
          if (hasSkilledCanadianTrack(answers) && answers.canadianExp !== "0") {
            add(3, "현재 캐나다 skilled 경력이 CEC 또는 주정부 경로에 직접 연결될 수 있음");
          } else if (hasCanadianWorkBase(answers.base) && answers.canadianJobSkill === "non-skilled") {
            add(-2, "현재 캐나다 일이 TEER 4-5 쪽이면 연방 skilled 경로 연결은 약할 수 있음");
          }
          if (answers.languageScoreStatus === "official") {
            add(2, "실제 언어점수가 있어 프로필 판단 정확도가 높음");
          } else if (answers.languageScoreStatus === "booked") {
            add(1, "목표 영어점수가 분명해 다음 단계 계획을 세우기 쉬움");
          } else if (answers.languageScoreStatus === "none" && answers.ee === "yes") {
            add(-2, "EE 방향이면 실제 언어점수가 먼저 필요함");
          }
          if (answers.targetOccupationPlan === "current-canada-job") {
            if (hasSkilledCanadianTrack(answers) && answers.canadianExp !== "0") {
              add(3, "현재 캐나다 직무 기준으로 이민 방향을 잡기 쉬움");
            } else if (answers.canadianJobSkill === "non-skilled") {
              add(-2, "현재 직무 기준 이민이면 skilled 직무 전환이 먼저 중요할 수 있음");
            }
          }
          if (answers.targetOccupationPlan === "previous-korea-job") {
            if (answers.foreignExpAlignment === "same-skilled" && answers.foreignExp !== "0") {
              add(3, "한국 경력을 primary occupation으로 정리하기 좋은 상태");
            } else if (answers.foreignExpAlignment === "related-skilled") {
              add(1, "한국 경력은 활용 가능하지만 NOC 정리를 더 정확히 해야 함");
            } else if (answers.foreignExpAlignment === "unrelated") {
              add(-2, "한국 경력과 목표 직군이 다르면 그대로 쓰기 어려울 수 있음");
            }
          }
          if (answers.targetOccupationPlan === "degree-field" && answers.degreeCareerPlan === "use-degree") {
            add(1, "전공을 살린 직군으로 가면 경력 스토리를 다시 짜기 쉬울 수 있음");
          }
          if (answers.degreeCareerPlan === "not-use-degree") {
            add(0, "전공보다 실제 job duties와 목표 NOC 정리가 더 중요함");
          }

          if (answers.ee === "yes") {
            if (["핵심", "중심", "많음", "있음", "일부"].includes(insight.statuses.ee)) {
              add(3, "EE와 연결해 보기 쉬움");
            } else if (insight.statuses.ee === "별도 체계") {
              add(-1, "EE보다 별도 체계를 먼저 봐야 함");
            }
          }

          if (answers.ee === "no" && insight.id === "federal") {
            add(-2, "연방 EE 자체가 중심");
          }

          if (answers.jobOffer === "yes") {
            if (insight.statuses.jobOffer === "중심") {
              add(3, "잡오퍼 중심 경로가 많음");
            } else if (["있음", "일부"].includes(insight.statuses.jobOffer)) {
              add(2, "잡오퍼 활용 경로가 있음");
            } else {
              add(-1, "잡오퍼 강점이 직접적이지 않음");
            }
          }

          if (answers.jobOffer === "no" && insight.statuses.jobOffer === "중심") {
            add(-1, "잡오퍼 비중이 큰 편");
          }

          if (answers.advantage === "french" && statusSupports(insight.statuses.french)) {
            add(2, "프랑스어 강점을 살릴 수 있음");
          }
          if (answers.advantage === "regional" && statusSupports(insight.statuses.regional)) {
            add(2, "지역·커뮤니티 경로가 있음");
          }
          if (answers.advantage === "health" && statusSupports(insight.statuses.health)) {
            add(2, "보건의료 관련 경로를 볼 수 있음");
          }
          if (answers.advantage === "trades" && statusSupports(insight.statuses.trades)) {
            add(2, "기술직·trade 경로와 연결 가능");
          }

          if (occupationLens.scoreAdjustment !== 0) {
            add(occupationLens.scoreAdjustment, occupationLens.rankReasonKo);
          }

          if (answers.occupation === "physician-canada" && insight.id === "federal" && answers.canadianExp !== "0") {
            add(3, "현재 연방 category-based selection의 의사 + 캐나다 경력 축과 연결됨");
          }
          if (answers.occupation === "senior-manager-canada" && insight.id === "federal" && answers.canadianExp !== "0") {
            add(3, "현재 연방 category-based selection의 senior manager + 캐나다 경력 축과 연결됨");
          }
          if (answers.occupation === "researcher-canada" && insight.id === "federal" && answers.canadianExp !== "0") {
            add(3, "현재 연방 category-based selection의 researcher + 캐나다 경력 축과 연결됨");
          }

          if (answers.path === "unsure" && score === 0 && insight.updateCount > 0) {
            add(1, "현재 업데이트와 구조 정보가 비교적 풍부함");
          }

          if (answers.budget === "tight") {
            if (insight.lifestyle.costLevel <= 1) {
              addLifestyle(2, "비용 부담이 상대적으로 낮은 쪽");
            } else if (insight.lifestyle.costLevel === 2) {
              addLifestyle(1, "비용 부담이 아주 높지는 않음");
            } else {
              addLifestyle(-2, "비용 부담이 큰 편");
            }

            if (isGraduateIntent(answers.path)) {
              if (insight.lifestyle.tuitionLevel <= 1) {
                addLifestyle(2, "학비 부담도 비교적 낮은 편");
              } else if (insight.lifestyle.tuitionLevel >= 3) {
                addLifestyle(-1, "유학생 비용 부담은 큰 편");
              }
            }
          }

          if (answers.setting === "metro") {
            if (insight.lifestyle.metroLevel >= 3) {
              addLifestyle(6, "대도시 접근성이 강한 지역");
            } else if (insight.lifestyle.metroLevel === 2) {
              addLifestyle(1, "대도시 접근성은 보통인 편");
            } else if (insight.lifestyle.metroLevel === 1) {
              addLifestyle(-6, "대도시 중심 선호와는 거리가 있음");
            }

            if (insight.lifestyle.regionalLevel >= 3) {
              addLifestyle(-2, "지역 정착 성격이 강해 대도시 선호와는 결이 다를 수 있음");
            }
          }

          if (answers.setting === "regional") {
            if (insight.lifestyle.regionalLevel >= 3) {
              addLifestyle(2, "지역·시골 정착과 잘 맞는 편");
            } else if (insight.lifestyle.regionalLevel === 1) {
              addLifestyle(-1, "지역 정착 중심으로 보긴 어려움");
            }
          }

          if (answers.ecaStatus === "needed") {
            addLifestyle(0, "해외 학력이라면 ECA 비용과 준비 기간도 고려 필요");
          }

          return {
            score,
            policyReasons: policyReasons.slice(0, 3),
            lifestyleReasons: lifestyleReasons.slice(0, 3)
          };
        }

        function estimateFitPercent(answers, evaluation, insight) {
          let base = 52 + evaluation.score * 4;

          if (answers.english === "unknown") {
            base -= 8;
          }
          if (answers.languageScoreStatus !== "official") {
            base -= 4;
          }
          if (answers.ee === "unsure") {
            base -= 4;
          }
          if (["42", "43", "44", "45+"].includes(answers.age)) {
            base -= 6;
          }
          if (answers.ecaStatus === "needed") {
            base -= 5;
          }
          if (answers.targetOccupationPlan === "current-canada-job" && answers.canadianJobSkill === "non-skilled") {
            base -= 5;
          }
          if (answers.targetOccupationPlan === "previous-korea-job" && answers.foreignExpAlignment === "unrelated") {
            base -= 6;
          }

          if (answers.setting === "metro") {
            if (insight.lifestyle.metroLevel >= 3) {
              base += 5;
            } else if (insight.lifestyle.metroLevel === 1) {
              base -= 10;
            }
          }

          if (answers.setting === "regional") {
            if (insight.lifestyle.regionalLevel >= 3) {
              base += 5;
            } else if (insight.lifestyle.regionalLevel === 1) {
              base -= 8;
            }
          }

          return Math.max(18, Math.min(92, base));
        }

        function estimateImmigrationChancePercent(answers, evaluation, insight) {
          const crsSnapshot = estimateCrsSnapshot(answers);
          const hasJobOfferRoute = answers.jobOffer === "yes" && ["중심", "있음", "일부"].includes(insight.statuses.jobOffer);
          const hasLocalExperienceRoute = answers.canadianExp !== "0" && (
            statusSupports(insight.statuses.localExperience) ||
            statusSupports(insight.statuses.graduate) ||
            insight.id === "federal"
          );
          const hasRegionalFallback = answers.setting === "regional" && ["많음", "중심", "있음", "일부"].includes(insight.statuses.regional);
          let chance = estimateFitPercent(answers, evaluation, insight) - 30;

          if (answers.languageScoreStatus === "official") {
            chance += 4;
          } else if (answers.languageScoreStatus === "none") {
            chance -= 6;
          }

          if (answers.ecaStatus === "completed" || answers.ecaStatus === "canadian-degree") {
            chance += 4;
          } else if (answers.ecaStatus === "needed") {
            chance -= 8;
          } else if (answers.ecaStatus === "in-progress") {
            chance -= 2;
          }

          if (answers.canadianExp !== "0") {
            chance += 4;
          }

          if (answers.ee === "yes" && !statusSupports(insight.statuses.ee)) {
            chance -= 6;
          }

          if (hasJobOfferRoute) {
            chance += 4;
          }

          if (insight.updateCount <= 0) {
            chance -= 2;
          }

          if (answers.targetOccupationPlan === "current-canada-job" && answers.canadianJobSkill === "skilled" && answers.canadianExp !== "0") {
            chance += 4;
          } else if (answers.targetOccupationPlan === "current-canada-job" && answers.canadianJobSkill === "non-skilled") {
            chance -= 7;
          }

          if (answers.targetOccupationPlan === "previous-korea-job") {
            if (answers.foreignExpAlignment === "same-skilled" && answers.foreignExp !== "0") {
              chance += 4;
            } else if (answers.foreignExpAlignment === "unrelated") {
              chance -= 8;
            }
          }

          if (hasCanadianWorkBase(answers.base) && answers.permitRemaining === "lt6") {
            chance -= hasJobOfferRoute || hasLocalExperienceRoute ? 4 : 10;
          } else if (hasCanadianWorkBase(answers.base) && answers.permitRemaining === "6to12") {
            chance -= hasJobOfferRoute || hasLocalExperienceRoute ? 1 : 4;
          } else if (hasCanadianWorkBase(answers.base) && ["12to24", "24plus"].includes(answers.permitRemaining) && hasLocalExperienceRoute) {
            chance += 2;
          }

          if (crsSnapshot.gap != null) {
            if (insight.id === "federal") {
              if (crsSnapshot.gap >= 20) {
                chance += 18;
              } else if (crsSnapshot.gap >= 0) {
                chance += 10;
              } else if (crsSnapshot.gap >= -20) {
                chance -= 8;
              } else if (crsSnapshot.gap >= -50) {
                chance -= 18;
              } else if (crsSnapshot.gap >= -80) {
                chance -= 30;
              } else if (crsSnapshot.gap >= -100) {
                chance -= 40;
              } else {
                chance -= 50;
              }
            } else if (statusSupports(insight.statuses.ee)) {
              if (crsSnapshot.gap >= 20) {
                chance += 8;
              } else if (crsSnapshot.gap >= 0) {
                chance += 4;
              } else if (crsSnapshot.gap >= -20) {
                chance -= 4;
              } else if (crsSnapshot.gap >= -50) {
                chance -= 12;
              } else if (crsSnapshot.gap >= -80) {
                chance -= 22;
              } else if (crsSnapshot.gap >= -100) {
                chance -= 30;
              } else {
                chance -= 36;
              }
            }
          }

          if (hasLocalExperienceRoute) {
            chance += 4;
          }

          if (hasRegionalFallback) {
            chance += 3;
          }

          if (answers.setting === "metro") {
            if (insight.lifestyle.metroLevel >= 3) {
              chance += 5;
            } else if (insight.lifestyle.metroLevel === 1) {
              chance -= 8;
            }
          }

          if (answers.setting === "regional") {
            if (insight.lifestyle.regionalLevel >= 3) {
              chance += 4;
            } else if (insight.lifestyle.regionalLevel === 1) {
              chance -= 6;
            }
          }

          if (crsSnapshot.gap != null && insight.id === "federal" && crsSnapshot.gap <= -100) {
            chance = Math.min(chance, 28);
          }

          if (crsSnapshot.gap != null && insight.id !== "federal" && crsSnapshot.gap <= -100 && !hasJobOfferRoute && !hasLocalExperienceRoute) {
            chance = Math.min(chance, 35);
          }

          return Math.max(10, Math.min(84, chance));
        }

        function sortEvaluatedEntries(entries, answers) {
          return [...entries].sort((left, right) => {
            if (right.evaluation.score !== left.evaluation.score) {
              return right.evaluation.score - left.evaluation.score;
            }

            const rightPreferenceScore = getLifestylePreferenceSortScore(right.insight, answers);
            const leftPreferenceScore = getLifestylePreferenceSortScore(left.insight, answers);

            if (rightPreferenceScore !== leftPreferenceScore) {
              return rightPreferenceScore - leftPreferenceScore;
            }

            return right.insight.updateCount - left.insight.updateCount;
          });
        }

        function buildRegionalFallbackHint(answers, allEvaluated) {
          if (answers.setting !== "metro") {
            return "";
          }

          const regionalAnswers = { ...answers, setting: "regional" };
          const lifts = allEvaluated
            .filter(({ insight }) => insight.id !== "federal")
            .map((entry) => {
              const currentChance = estimateImmigrationChancePercent(answers, entry.evaluation, entry.insight);
              const regionalEvaluation = scoreInsight(entry.insight, regionalAnswers);
              const regionalChance = estimateImmigrationChancePercent(regionalAnswers, regionalEvaluation, entry.insight);

              return {
                insight: entry.insight,
                lift: regionalChance - currentChance,
                regionalChance
              };
            })
            .filter((entry) => entry.lift >= 4)
            .sort((left, right) => {
              if (right.lift !== left.lift) {
                return right.lift - left.lift;
              }

              if (right.regionalChance !== left.regionalChance) {
                return right.regionalChance - left.regionalChance;
              }

              return right.insight.updateCount - left.insight.updateCount;
            })
            .slice(0, 3);

          if (lifts.length === 0) {
            return "";
          }

          const liftText = lifts
            .map((entry) => entry.insight.labelKo + " (+" + entry.lift + "%p)")
            .join(" / ");

          return [
            '<div class="metro-fallback-note">',
            '<strong>대도시가 우선이어도, 지역 정착까지 열면 PR 기회가 더 좋아질 수 있어요.</strong>',
            '<span>지금 입력값 기준으로는 ' + escapeHtmlClient(liftText) + ' 쪽이 지역·시골 정착까지 열었을 때 더 유리해집니다.</span>',
            '</div>'
          ].join("");
        }

        function estimateAgeCrsPoints(answers, withSpouse) {
          const points = withSpouse
            ? {
                "18": 90,
                "19": 95,
                "20-29": 100,
                "30": 95,
                "31": 90,
                "32": 85,
                "33": 80,
                "34": 75,
                "35": 70,
                "36": 65,
                "37": 60,
                "38": 55,
                "39": 50,
                "40": 45,
                "41": 35,
                "42": 25,
                "43": 15,
                "44": 5,
                "45+": 0
              }
            : {
                "18": 99,
                "19": 105,
                "20-29": 110,
                "30": 105,
                "31": 99,
                "32": 94,
                "33": 88,
                "34": 83,
                "35": 77,
                "36": 72,
                "37": 66,
                "38": 61,
                "39": 55,
                "40": 50,
                "41": 39,
                "42": 28,
                "43": 17,
                "44": 6,
                "45+": 0
              };

          return points[answers.age] ?? 0;
        }

        function estimateEducationCrsPoints(answers, withSpouse) {
          if (!["completed", "canadian-degree"].includes(answers.ecaStatus)) {
            return 0;
          }

          const points = withSpouse
            ? {
                "high-school": 28,
                "one-year": 84,
                "two-year": 91,
                "bachelor": 112,
                "two-plus": 119,
                "master": 126,
                "professional": 126,
                "doctorate": 140
              }
            : {
                "high-school": 30,
                "one-year": 90,
                "two-year": 98,
                "bachelor": 120,
                "two-plus": 128,
                "master": 135,
                "professional": 135,
                "doctorate": 150
              };

          return points[answers.education] ?? 0;
        }

        function estimateLanguageCrsPoints(answers, withSpouse) {
          const points = withSpouse
            ? {
                unknown: 0,
                clb6: 32,
                clb7: 64,
                clb8: 88,
                clb9plus: 116
              }
            : {
                unknown: 0,
                clb6: 36,
                clb7: 68,
                clb8: 92,
                clb9plus: 124
              };

          return points[answers.english] ?? 0;
        }

        function estimateCanadianEducationBonus(answers) {
          if (answers.ecaStatus !== "canadian-degree") {
            return 0;
          }

          if (["one-year", "two-year"].includes(answers.education)) {
            return 15;
          }

          if (["bachelor", "two-plus", "master", "professional", "doctorate"].includes(answers.education)) {
            return 30;
          }

          return 0;
        }

        function estimateSkillTransferabilityPoints(answers) {
          const hasEducation = ["completed", "canadian-degree"].includes(answers.ecaStatus);
          const educationStrong = ["bachelor", "two-plus", "master", "professional", "doctorate"].includes(answers.education);
          const educationMedium = ["one-year", "two-year"].includes(answers.education);
          const hasMediumLanguage = ["clb7", "clb8"].includes(answers.english);
          const hasStrongLanguage = answers.english === "clb9plus";
          const foreignYears = Number.parseInt(answers.foreignExp, 10) || 0;
          const canadianYears = hasSkilledCanadianTrack(answers) ? Number.parseInt(answers.canadianExp, 10) || 0 : 0;
          let total = 0;

          if (hasEducation) {
            if (educationStrong && hasStrongLanguage) {
              total += 50;
            } else if (educationStrong && hasMediumLanguage) {
              total += 25;
            } else if (educationMedium && hasStrongLanguage) {
              total += 25;
            } else if (educationMedium && hasMediumLanguage) {
              total += 13;
            }
          }

          if (foreignYears > 0) {
            if (hasStrongLanguage) {
              total += foreignYears >= 3 ? 50 : 25;
            } else if (hasMediumLanguage) {
              total += foreignYears >= 3 ? 25 : 13;
            }
          }

          if (foreignYears > 0 && canadianYears > 0) {
            total += foreignYears >= 3 ? 25 : 13;
          }

          return Math.min(100, total);
        }

        function estimateProjectedCrsLift(answers, overrides) {
          const baselineScore = estimateCrsSnapshot(answers).score;
          const projectedScore = estimateCrsSnapshot({
            ...answers,
            ...overrides
          }).score;

          return Math.max(0, projectedScore - baselineScore);
        }

        function estimateCrsSnapshot(answers) {
          const latestCutoff = getLatestEECutoff();
          const withSpouse = answers.household === "with-spouse";
          const assumedSingle = answers.household !== "with-spouse";
          const agePoints = estimateAgeCrsPoints(answers, withSpouse);
          const educationPoints = estimateEducationCrsPoints(answers, withSpouse);
          const languagePoints = estimateLanguageCrsPoints(answers, withSpouse);
          const canadianPoints = estimateCanadianExperienceCrsPoints(answers, withSpouse);
          const transferabilityPoints = estimateSkillTransferabilityPoints(answers);
          const canadianEducationBonus = estimateCanadianEducationBonus(answers);
          const frenchBonus = 0;
          const score = agePoints + educationPoints + languagePoints + canadianPoints + transferabilityPoints + canadianEducationBonus + frenchBonus;
          const gap = latestCutoff ? score - Number(latestCutoff) : null;
          const notes = [];

          if (assumedSingle && answers.household === "unsure") {
            notes.push("배우자 없음 기준 추정");
          }
          if (answers.languageScoreStatus !== "official") {
            notes.push("공식 언어점수 전 추정");
          }
          if (!["completed", "canadian-degree"].includes(answers.ecaStatus)) {
            notes.push("ECA 미완료라 학력점수 보수 반영");
          }
          const canadianExperienceNote = describeCanadianExperienceCrsTreatment(answers);
          if (canadianExperienceNote) {
            notes.push(canadianExperienceNote);
          }

          return {
            score,
            cutoff: latestCutoff ? Number(latestCutoff) : null,
            gap,
            gapLabel: gap == null ? "비교 대기" : (gap >= 0 ? "+" + gap : String(gap)),
            notes
          };
        }

        function getLatestEECutoff() {
          const eeRound = UPDATES.find((update) => update.sourceId === "ee-rounds");
          return eeRound?.metrics?.cutoffScore ?? null;
        }

        function getEESnapshot(answers, insight) {
          const latestCutoff = getLatestEECutoff();
          const hasOfficialLanguageScore = answers.languageScoreStatus === "official";
          const hasEeReadyEca = answers.ecaStatus === "completed" || answers.ecaStatus === "canadian-degree";
          const crsSnapshot = estimateCrsSnapshot(answers);
          const isFederal = insight.id === "federal";
          const supportsEePath = insight.statuses.ee === "핵심" || statusSupports(insight.statuses.ee);
          const scoreLabel = isFederal
            ? (insight.selectionModel?.eeScoreLabelKo || "예상 CRS")
            : "연방 EE 참고점수";
          const readinessPoints =
            (answers.age === "20-29" ? 4 : ["30", "31"].includes(answers.age) ? 3 : ["32", "33", "34"].includes(answers.age) ? 2 : ["35", "36", "37", "38", "39"].includes(answers.age) ? 1 : 0) +
            (answers.education === "doctorate" ? 4 : ["master", "professional"].includes(answers.education) ? 4 : answers.education === "two-plus" ? 3 : answers.education === "bachelor" ? 3 : answers.education === "two-year" ? 2 : answers.education === "one-year" ? 1 : 0) +
            (answers.english === "clb9plus" ? 4 : answers.english === "clb8" ? 3 : answers.english === "clb7" ? 2 : 0) +
            (["4", "5"].includes(answers.foreignExp) ? 3 : answers.foreignExp === "3" ? 3 : answers.foreignExp === "2" ? 2 : answers.foreignExp === "1" ? 1 : 0) +
            (["4", "5"].includes(answers.canadianExp) ? 4 : answers.canadianExp === "3" ? 4 : answers.canadianExp === "2" ? 3 : answers.canadianExp === "1" ? 2 : 0) +
            (answers.advantage === "french" ? 2 : 0);

          const band = crsSnapshot.gap == null ? (readinessPoints >= 14 ? "상" : readinessPoints >= 9 ? "중" : "하")
            : crsSnapshot.gap >= 0 ? "컷오프 이상"
            : crsSnapshot.gap >= -20 ? "근접"
            : "차이 있음";
          let comparison = "최신 EE 컷오프 데이터가 연결되면 여기서 함께 비교합니다.";

          if (latestCutoff && crsSnapshot.cutoff != null) {
            comparison = scoreLabel + " " + crsSnapshot.score + "점 · 최근 EE 컷오프 " + crsSnapshot.cutoff + "점 · 현재 " + crsSnapshot.gapLabel + "점";
          }

          const explain = isFederal
            ? "연방 Express Entry 컷오프와 직접 비교하는 영역입니다."
            : supportsEePath
              ? "이 숫자는 이 주 자체 선발점수가 아니라, 연방 EE나 EE-linked 주정부 경로를 같이 볼 때 참고하는 점수입니다."
              : "이 지역은 주 자체 경로가 먼저이고, 연방 EE 점수는 보조 참고만 가능합니다.";

          return {
            band,
            comparison,
            explain,
            scoreLabel,
            crsSnapshot,
            isFederal,
            supportsEePath
          };
        }

        function pushUniqueCriterion(criteria, id, label) {
          if (!criteria.some((criterion) => criterion.id === id)) {
            criteria.push({ id, label });
          }
        }

        function buildPathwayCriteria(answers, insight) {
          const selectionModel = insight.selectionModel || {};
          const criteria = [];
          const isFederal = insight.id === "federal";
          const scoreView = selectionModel.scoreViewKo || "";
          const focusText = (selectionModel.focusKo || "") + " " + (selectionModel.detailKo || "");
          const scoreLedProvince =
            !isFederal &&
            (
              ["EOI 드로우", "EOI + 노동시장 우선", "등록점수 + 타깃 초청", "EOI + EE NOI", "EOI intake + 우선점수"].includes(selectionModel.badgeKo) ||
              /최저점 공개|컷오프와 직접 비교|점수 일부 공개|드로우 결과 공개|우선점수형/.test(scoreView)
            );

          if (isFederal) {
            pushUniqueCriterion(criteria, "ee-profile", "EE 프로필과 연방 자격");
            pushUniqueCriterion(criteria, "official-language", "공인 영어·불어 점수");
            pushUniqueCriterion(criteria, "education-proof", "ECA 또는 캐나다 학위");
            pushUniqueCriterion(criteria, "skilled-experience", "숙련 경력");
            pushUniqueCriterion(criteria, "competitive-crs", "최근 컷오프와 점수 차이");
            pushUniqueCriterion(criteria, "category-fit", "카테고리 기반 선발 해당 여부");

            return {
              modeLabel: "연방 점수형",
              summary: "연방은 CRS와 라운드 컷오프로 직접 비교하고, 카테고리 기반 선발 해당 여부를 함께 봅니다.",
              criteria
            };
          }

          pushUniqueCriterion(criteria, "stream-choice", "어느 스트림으로 갈지 먼저 정리");
          pushUniqueCriterion(criteria, "official-language", "공인 언어점수");
          pushUniqueCriterion(criteria, "skilled-experience", "숙련 경력");

          if (statusSupports(insight.statuses.ee)) {
            pushUniqueCriterion(criteria, "ee-profile", "EE 프로필 또는 EE-linked 가능성");
          }
          if (["중심", "있음", "일부"].includes(insight.statuses.jobOffer)) {
            pushUniqueCriterion(criteria, "employer-offer", "고용주 오퍼 또는 현재 근무 연결");
          }
          if (statusSupports(insight.statuses.graduate)) {
            pushUniqueCriterion(criteria, "local-graduate", "캐나다 또는 해당 주 학위/졸업 연결");
          }
          if (statusSupports(insight.statuses.localExperience)) {
            pushUniqueCriterion(criteria, "provincial-connection", "현지 경력 또는 주 연결성");
          }
          if (/직군|카테고리|우선산업|sector|타깃|파일럿|고용주|포털|community|커뮤니티|지역추천/u.test(focusText)) {
            pushUniqueCriterion(criteria, "priority-occupation", "직군·우선산업·타깃 조건");
          }
          if (statusSupports(insight.statuses.regional)) {
            pushUniqueCriterion(criteria, "regional-intent", "지역 정착 의사 또는 커뮤니티 조건");
          }
          if (answers.path === "business" && statusSupports(insight.statuses.entrepreneur)) {
            pushUniqueCriterion(criteria, "business-funds", "사업 자금·계획·운영 준비");
          }
          return {
            modeLabel: scoreLedProvince ? "점수·랭킹형" : "요건·타깃형",
            summary: scoreLedProvince
              ? "이 주는 EOI·등록점수·공개 드로우 결과를 함께 보는 편이라, 점수와 연결 조건을 같이 읽는 게 좋습니다."
              : "이 주는 점수 하나보다 stream 자격, 고용·직군·지역 조건, 신청 구조를 먼저 보는 편입니다.",
            criteria: criteria.slice(0, 6)
          };
        }

        function evaluatePathwayCriterion(criterion, answers, insight, eeSnapshot) {
          switch (criterion.id) {
            case "ee-profile":
              if (answers.ee === "yes") {
                return { state: "has", detail: "EE 프로필이 있거나 만들 예정이에요." };
              }
              if (answers.ee === "unsure") {
                return { state: "partial", detail: "EE를 같이 볼지는 아직 미정이에요." };
              }
              return { state: "missing", detail: "EE를 같이 봐야 하는 경로라면 프로필 확인이 먼저예요." };
            case "official-language":
              if (answers.languageScoreStatus === "official") {
                return { state: "has", detail: "공인 점수로 바로 비교할 수 있어요." };
              }
              if (answers.languageScoreStatus === "booked") {
                return { state: "partial", detail: "목표 점수는 있지만 실제 점수표가 더 필요해요." };
              }
              return { state: "missing", detail: "공식 언어점수표가 있어야 판단이 선명해져요." };
            case "education-proof":
              if (["completed", "canadian-degree"].includes(answers.ecaStatus)) {
                return { state: "has", detail: "학력 점수화 또는 학위 증명이 준비됐어요." };
              }
              if (answers.ecaStatus === "in-progress") {
                return { state: "partial", detail: "ECA는 진행 중이지만 완료가 더 필요해요." };
              }
              return { state: "missing", detail: "ECA 또는 캐나다 학위 확인이 더 필요해요." };
            case "skilled-experience":
              if ((answers.foreignExp && answers.foreignExp !== "0") || (hasSkilledCanadianTrack(answers) && answers.canadianExp !== "0")) {
                return { state: "has", detail: "숙련 경력을 현재 경로에 연결해 볼 수 있어요." };
              }
              if (answers.canadianExp !== "0") {
                return { state: "partial", detail: "캐나다 경력은 있지만 skilled 기준 확인이 더 필요해요." };
              }
              return { state: "missing", detail: "숙련 경력 축이 약해서 경력 설계가 먼저예요." };
            case "competitive-crs":
              if (eeSnapshot.crsSnapshot.gap == null) {
                return { state: "partial", detail: "최신 EE 컷오프와 직접 비교 중이에요." };
              }
              if (eeSnapshot.crsSnapshot.gap >= 0) {
                return { state: "has", detail: "최근 컷오프 기준으로는 점수 경쟁력이 있어요." };
              }
              if (eeSnapshot.crsSnapshot.gap >= -20) {
                return { state: "partial", detail: "컷오프와 가깝지만 조금 더 보완이 필요해요." };
              }
              return { state: "missing", detail: "최근 컷오프와 차이가 커서 다른 축도 같이 봐야 해요." };
            case "category-fit":
              if (occupationHasAnyTag(answers, ["health", "trades", "education", "transport"]) || ["physician-canada", "senior-manager-canada", "researcher-canada"].includes(answers.occupation) || answers.advantage === "french") {
                return { state: "has", detail: "현재 입력상 카테고리 기반 선발 축을 같이 볼 수 있어요." };
              }
              if (hasResolvedCanadaOccupation(answers) || hasResolvedKoreaOccupation(answers)) {
                return { state: "partial", detail: "직군 축은 있지만 카테고리 직접 해당은 더 확인이 필요해요." };
              }
              return { state: "missing", detail: "카테고리 기반 선발 강점은 아직 뚜렷하지 않아요." };
            case "stream-choice":
              if (answers.targetOccupationPlan && answers.targetOccupationPlan !== "unsure") {
                return { state: "has", detail: "어느 경력 축으로 볼지 방향이 정해져 있어요." };
              }
              if (hasResolvedCanadaOccupation(answers) || hasResolvedKoreaOccupation(answers)) {
                return { state: "partial", detail: "직무 축은 있지만 한국 경력과 캐나다 현재 일 중 어느 축이 주력인지 더 정해야 해요." };
              }
              if (answers.path && answers.path !== "unsure") {
                return { state: "partial", detail: "큰 방향은 있지만 세부 스트림 선택은 아직 열려 있어요." };
              }
              return { state: "missing", detail: "먼저 어떤 스트림으로 갈지 정해야 비교가 쉬워져요." };
            case "employer-offer":
              if (answers.jobOffer === "yes") {
                return { state: "has", detail: "잡오퍼 또는 고용 연결 가능성이 있어요." };
              }
              if (answers.jobOffer === "unsure") {
                return { state: "partial", detail: "고용 연결 여부를 더 확인해야 해요." };
              }
              return { state: "missing", detail: "이 주는 고용주 연결이 있으면 훨씬 유리할 수 있어요." };
            case "local-graduate":
              if (answers.ecaStatus === "canadian-degree" || ["student", "pgwp"].includes(answers.base) || ["study-plan", "pgwp-pr"].includes(answers.path)) {
                return { state: "has", detail: "캐나다 학위·학생·PGWP 축을 활용할 수 있어요." };
              }
              return { state: "missing", detail: "졸업자 축은 현재 입력상 직접 연결이 약해요." };
            case "provincial-connection":
              if (answers.canadianExp !== "0" || answers.ecaStatus === "canadian-degree" || answers.jobOffer === "yes") {
                return { state: "has", detail: "현지 경력·학위·고용 연결 중 하나는 있어요." };
              }
              if (["student", "working-holiday", "pgwp", "worker"].includes(answers.base)) {
                return { state: "partial", detail: "캐나다 체류 기반은 있지만 직접 연결은 더 필요해요." };
              }
              return { state: "missing", detail: "이 주와 연결되는 현지 요소를 더 만들어야 할 수 있어요." };
            case "priority-occupation":
              if (hasResolvedCanadaOccupation(answers) && hasResolvedKoreaOccupation(answers)) {
                return { state: "has", detail: "한국 직무와 캐나다 현재 직무가 둘 다 있어 어느 축이 열리는지 비교하기 쉬워요." };
              }
              if (hasResolvedCanadaOccupation(answers) || hasResolvedKoreaOccupation(answers)) {
                return { state: "has", detail: "직군 축이 잡혀 있어 타깃 초청과 비교하기 쉬워요." };
              }
              if (answers.targetOccupationPlan && answers.targetOccupationPlan !== "unsure") {
                return { state: "partial", detail: "경력 방향은 있지만 주력 직군 정리가 더 필요해요." };
              }
              return { state: "missing", detail: "직군·우선산업 기준으로는 아직 방향이 넓어요." };
            case "regional-intent":
              if (answers.setting === "regional") {
                return { state: "has", detail: "지역 정착 의사가 분명해요." };
              }
              if (answers.setting === "balanced") {
                return { state: "partial", detail: "지역 정착도 열어둘 수는 있어요." };
              }
              return { state: "missing", detail: "대도시 우선이면 지역 경로 활용은 제한될 수 있어요." };
            case "business-funds":
              return { state: "missing", detail: "사업 자금·순자산·운영계획 정보는 아직 안 받아서 별도 확인이 필요해요." };
            default:
              return { state: "partial", detail: "현재 입력으로는 추가 확인이 필요해요." };
          }
        }

        function buildEvaluatedPathwayGuide(answers, insight, eeSnapshot) {
          const guide = buildPathwayCriteria(answers, insight);
          const evaluated = guide.criteria.map((criterion) => ({
            ...criterion,
            ...evaluatePathwayCriterion(criterion, answers, insight, eeSnapshot)
          }));

          return { guide, evaluated };
        }

        function renderPathwayGuidePanel(insight, guideBundle) {
          const { guide, evaluated } = guideBundle;

          return [
            '<section class="pathway-guide-panel">',
            '<div class="pathway-guide-head">',
            '<strong>' + escapeHtmlClient(insight.id === "federal" ? "연방 방향에서 주로 보는 것" : "이 주에서 실제로 보는 것") + '</strong>',
            '<span class="pathway-guide-badge">' + escapeHtmlClient(guide.modeLabel) + '</span>',
            '</div>',
            '<p class="pathway-guide-copy">' + escapeHtmlClient(guide.summary) + '</p>',
            '<div class="pathway-guide-grid">',
            '<div class="pathway-guide-block">',
            '<span class="pathway-guide-label">' + escapeHtmlClient(insight.id === "federal" ? "연방이 주로 보는 항목" : "이 주가 주로 보는 항목") + '</span>',
            '<ul class="pathway-factor-list">'
              + guide.criteria.map((criterion) => '<li>' + escapeHtmlClient(criterion.label) + '</li>').join("")
              + '</ul>',
            '</div>',
            '<div class="pathway-guide-block">',
            '<span class="pathway-guide-label">내 정보 비교</span>',
            '<ul class="pathway-compare-list">'
              + evaluated.map((criterion) => [
                '<li class="pathway-compare-item is-' + escapeHtmlClient(criterion.state) + '">',
                '<span class="pathway-compare-state">' + escapeHtmlClient(
                  criterion.state === "has" ? "있음" : criterion.state === "partial" ? "진행/확인" : "더 필요"
                ) + '</span>',
                '<div class="pathway-compare-copy">',
                '<strong>' + escapeHtmlClient(criterion.label) + '</strong>',
                '<p>' + escapeHtmlClient(criterion.detail) + '</p>',
                '</div>',
                '</li>'
              ].join("")).join("")
              + '</ul>',
            '</div>',
            '</div>',
            '</section>'
          ].join("");
        }

        function buildProfileStrengths(answers) {
          const items = [];

          if (answers.languageScoreStatus === "official") {
            items.push("공인 언어점수");
          }
          if (["completed", "canadian-degree"].includes(answers.ecaStatus)) {
            items.push("ECA 또는 캐나다 학위");
          }
          if (answers.foreignExp !== "0" || answers.canadianExp !== "0") {
            items.push("숙련 경력");
          }
          if (hasSkilledCanadianTrack(answers) && answers.canadianExp !== "0") {
            items.push("캐나다 skilled 경력");
          }
          if (answers.jobOffer === "yes") {
            items.push("고용주 연결 가능성");
          }
          if (answers.advantage === "french") {
            items.push("프랑스어 강점");
          }
          if (hasResolvedCanadaOccupation(answers)) {
            items.push("캐나다 현재 직무 축");
          }
          if (hasResolvedKoreaOccupation(answers)) {
            items.push("한국 경력 직무 축");
          }

          return items.slice(0, 4);
        }

        function buildRecommendationLeadSummary(answers, insight, evaluation, eeSnapshot) {
          const firstPolicyReason = evaluation.policyReasons[0];
          const occupationLens = buildProvinceOccupationLens(answers, insight);

          if (eeSnapshot.isFederal) {
            return firstPolicyReason
              ? firstPolicyReason + " 연방 EE 컷오프와 직접 비교하는 쪽이 맞아요."
              : "연방 EE는 점수와 컷오프를 직접 비교하는 방향이에요.";
          }

          if (insight.selectionModel.badgeKo.includes("요건")) {
            return (firstPolicyReason ?? "현재 조건상 이 주정부 경로도 볼 만해요.")
              + " " + occupationLens.summary;
          }

          if (insight.selectionModel.badgeKo.includes("EOI")) {
            return (firstPolicyReason ?? "현재 조건상 이 주정부 경로도 볼 만해요.")
              + " " + occupationLens.summary;
          }

          return (firstPolicyReason ?? "현재 조건상 이 주정부 경로도 볼 만해요.")
            + " " + occupationLens.summary;
        }

        function buildConclusionSummaryHtml(answers, ranked) {
          const topEntry = ranked[0];
          if (!topEntry) {
            return "";
          }

          const topInsight = topEntry.insight;
          const topEESnapshot = getEESnapshot(answers, topInsight);
          const topActions = buildImprovementPlan(answers, topInsight, estimateImmigrationChancePercent(answers, topEntry.evaluation, topInsight));
          const primaryDirection = topInsight.id === "federal" ? "연방 EE가 먼저" : "주정부가 먼저";
          const topNames = ranked.slice(0, 3).map((entry) => entry.insight.labelKo).join(" / ");
          const specialNames = SPECIAL_PATHWAYS
            .map((pathway) => scoreSpecialPathwayEntry(pathway, answers))
            .filter(Boolean)
            .sort((left, right) => right.score - left.score)
            .slice(0, 2)
            .map((entry) => entry.pathway.shortKo)
            .join(" / ");
          const strengths = buildProfileStrengths(answers);
          const nextItems = topActions.items.slice(0, 2).map((item) => item.title);

          return [
            '<section class="conclusion-summary-section">',
            '<div class="wizard-section-heading">',
            '<div>',
            '<p class="panel-kicker">결론</p>',
            '<h3>지금은 이 방향이 먼저예요</h3>',
            '</div>',
            '</div>',
            '<article class="conclusion-summary-card">',
            '<div class="conclusion-summary-head">',
            '<div>',
            '<p class="panel-kicker">Primary Direction</p>',
            '<h3>' + escapeHtmlClient(primaryDirection) + '</h3>',
            '</div>',
            '<span class="direction-summary-badge">' + escapeHtmlClient(topInsight.id === "federal" ? "Express Entry" : topInsight.labelKo) + '</span>',
            '</div>',
            '<p class="conclusion-summary-copy">'
              + escapeHtmlClient(
                topInsight.id === "federal"
                  ? "현재 입력상 연방 EE를 직접 비교할 수 있는 상태예요. "
                  : "현재 입력상 주정부 쪽이 더 현실적이에요. "
              )
              + escapeHtmlClient(
                topInsight.id === "federal"
                  ? (topEESnapshot.crsSnapshot.gap == null
                    ? "최신 컷오프와 직접 비교하면서 다음 보완점을 보는 편이 좋아요."
                    : "최근 EE 컷오프와 " + topEESnapshot.crsSnapshot.gapLabel + "점 차이예요.")
                  : "추천 지역은 " + topNames + " 순서로 먼저 보는 편이 좋아요."
              )
              + (specialNames ? " " + escapeHtmlClient("같이 볼 특별 경로는 " + specialNames + "입니다.") : "")
              + '</p>',
            '<div class="direction-summary-pill-row">'
              + (topInsight.id === "federal"
                ? '<span class="compare-pill">현재 ' + escapeHtmlClient(topEESnapshot.crsSnapshot.score) + '점</span>'
                  + '<span class="compare-pill">최근 컷오프 ' + escapeHtmlClient(topEESnapshot.crsSnapshot.cutoff ?? "대기") + '점</span>'
                : '<span class="compare-pill">추천 1순위 ' + escapeHtmlClient(topInsight.labelKo) + '</span>'
                  + '<span class="compare-pill">선발 방식 ' + escapeHtmlClient(topInsight.selectionModel.badgeKo) + '</span>')
              + '</div>',
            '<div class="direction-summary-grid">',
            '<div class="direction-summary-block">',
            '<span class="direction-summary-label">지금 가진 강점</span>',
            '<ul class="direction-summary-list">'
              + (strengths.length
                ? strengths.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join("")
                : '<li>아직 강점 정리가 더 필요해요.</li>')
              + '</ul>',
            '</div>',
            '<div class="direction-summary-block">',
            '<span class="direction-summary-label">지금 먼저 할 것</span>',
            '<ul class="direction-summary-list">'
              + (nextItems.length
                ? nextItems.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join("")
                : '<li>최신 공지와 스트림 구조를 먼저 확인해 보세요.</li>')
              + '</ul>',
            '</div>',
            '</div>',
            '</article>',
            '</section>'
          ].join("");
        }

        function getRegionDisplayLabel(regionId) {
          const region = MAP_REGION_DEFS.find((entry) => entry.id === regionId);
          return region?.labelEn ?? region?.labelKo ?? regionId;
        }

        function pathwayMatchesSelectedRegions(pathway) {
          if (!Array.isArray(pathway.regionIds) || pathway.regionIds.length === 0) {
            return true;
          }

          if (activeQuickRegions.size === 0 || activeQuickRegions.size === allQuickRegionIds.length) {
            return true;
          }

          return pathway.regionIds.some((regionId) => activeQuickRegions.has(regionId));
        }

        function summarizeSpecialPathwayRegions(pathway) {
          if (!Array.isArray(pathway.regionIds) || pathway.regionIds.length === 0) {
            return "전국";
          }

          if (pathway.id === "atlantic-aip") {
            return "Atlantic 4개 주";
          }

          const labels = pathway.regionIds.map((regionId) => getRegionDisplayLabel(regionId));

          if (labels.length === 1) {
            return labels[0];
          }

          if (labels.length === 2) {
            return labels.join(" / ");
          }

          return labels[0] + " 외 " + (labels.length - 1) + "곳";
        }

        function evaluateSpecialPathwayCriterion(criterion, answers, pathway, crsSnapshot) {
          const hasEducationReady = ["completed", "canadian-degree"].includes(answers.ecaStatus);
          const hasSkilledExperience = answers.foreignExp !== "0" || hasSkilledCanadianTrack(answers);
          const hasAnyExperience = answers.foreignExp !== "0" || answers.canadianExp !== "0";
          const hasAtlanticSelection = pathway.regionIds?.some((regionId) => activeQuickRegions.has(regionId));
          const hasNlSelection = activeQuickRegions.has("newfoundland-and-labrador");
          const hasAlbertaSelection = activeQuickRegions.has("alberta");

          switch (criterion.id) {
            case "ee-eligible":
              if (hasSkilledExperience && answers.languageScoreStatus !== "none" && hasEducationReady) {
                return { state: "has", detail: "EE 기본 비교에 필요한 언어·학력·경력 축이 대부분 준비돼 있어요." };
              }
              if ((hasSkilledExperience && answers.languageScoreStatus !== "none") || (hasSkilledExperience && hasEducationReady)) {
                return { state: "partial", detail: "EE 기본 자격은 가까워 보이지만 언어 또는 학력 축 한 가지를 더 확인해야 해요." };
              }
              return { state: "missing", detail: "EE 쪽은 숙련 경력, 언어, 학력 준비를 같이 갖춰야 비교가 안정적이에요." };
            case "official-language":
              if (answers.languageScoreStatus === "official") {
                return { state: "has", detail: "공인 언어점수가 있어 실제 자격 비교에 바로 넣을 수 있어요." };
              }
              if (answers.languageScoreStatus === "booked") {
                return { state: "partial", detail: "목표 점수는 있지만 공인 점수표가 있어야 실제 자격 판정이 선명해져요." };
              }
              return { state: "missing", detail: "이 경로는 공인 언어점수가 거의 필수라 먼저 시험 계획이 필요해요." };
            case "education-ready":
              if (hasEducationReady) {
                return { state: "has", detail: "학력/ECA 또는 캐나다 학위 축은 바로 쓸 수 있어요." };
              }
              if (answers.ecaStatus === "in-progress") {
                return { state: "partial", detail: "학력 준비는 진행 중이라 결과만 나오면 비교가 훨씬 쉬워져요." };
              }
              return { state: "missing", detail: "학력/ECA 상태가 정리돼야 이 경로 자격을 더 정확히 볼 수 있어요." };
            case "skilled-experience":
              if (hasSkilledExperience) {
                return { state: "has", detail: "숙련 경력 축이 있어 연방 또는 기술직 경로 비교에 넣을 수 있어요." };
              }
              if (hasAnyExperience) {
                return { state: "partial", detail: "경력은 있지만 skilled 기준 또는 직군 정리가 더 필요해요." };
              }
              return { state: "missing", detail: "이 경로는 숙련 경력 축이 핵심이라 경력 설계가 먼저예요." };
            case "competitive-crs":
              if (crsSnapshot.gap == null) {
                return { state: "partial", detail: "최신 EE 컷오프와 직접 비교 중이에요." };
              }
              if (crsSnapshot.gap >= 0) {
                return { state: "has", detail: "최근 EE 컷오프와 직접 붙여볼 수 있는 점수예요." };
              }
              if (crsSnapshot.gap >= -20) {
                return { state: "partial", detail: "점수 차이는 있지만 아직 연방 축을 같이 볼 수 있어요." };
              }
              return { state: "missing", detail: "최근 EE 컷오프와 차이가 커서 다른 경로나 nomination 축을 같이 봐야 해요." };
            case "category-fit":
              if (occupationHasAnyTag(answers, ["health", "trades", "education", "transport"]) || ["physician-canada", "senior-manager-canada", "researcher-canada"].includes(answers.occupation) || answers.advantage === "french") {
                return { state: "has", detail: "현재 입력상 category-based selection 축을 같이 볼 수 있어요." };
              }
              if (hasResolvedCanadaOccupation(answers) || hasResolvedKoreaOccupation(answers)) {
                return { state: "partial", detail: "직군 축은 있지만 현재 category 직접 해당 여부는 더 확인이 필요해요." };
              }
              return { state: "missing", detail: "카테고리 기반 선발과 바로 맞물리는 강점은 아직 뚜렷하지 않아요." };
            case "trade-occupation":
              if (occupationHasTag(answers, "trades") || answers.advantage === "trades") {
                return { state: "has", detail: "현재 입력상 기술직·trade 축이 분명해 이 경로와 잘 맞아요." };
              }
              if (answers.targetOccupationPlan && answers.targetOccupationPlan !== "unsure") {
                return { state: "partial", detail: "주력 직군은 잡히지만 trade NOC로 갈지 더 구체화가 필요해요." };
              }
              return { state: "missing", detail: "Trade 경로는 어떤 기술직 NOC로 갈지부터 정하는 게 중요해요." };
            case "trade-certification":
              if ((occupationHasTag(answers, "trades") || answers.advantage === "trades") && answers.jobOffer === "yes") {
                return { state: "partial", detail: "직군과 고용 연결은 있지만 캐나다 자격증·레드실 여부는 별도 확인이 필요해요." };
              }
              if (occupationHasTag(answers, "trades") || answers.advantage === "trades") {
                return { state: "partial", detail: "Trade 직군 자체는 맞지만 자격증·오퍼 같은 실무 조건은 더 필요할 수 있어요." };
              }
              return { state: "missing", detail: "기술직 연방 경로는 trade 직군 확인과 캐나다 실무 조건 점검이 같이 필요해요." };
            case "employer-offer":
              if (answers.jobOffer === "yes") {
                return { state: "has", detail: "잡오퍼 또는 고용 연결 가능성이 있어 employer-driven 경로와 잘 맞아요." };
              }
              if (answers.jobOffer === "unsure") {
                return { state: "partial", detail: "고용 연결 여부를 더 확인하면 이 경로 현실성이 바로 달라질 수 있어요." };
              }
              return { state: "missing", detail: "이 경로는 지정 고용주나 고용 연결이 사실상 핵심이에요." };
            case "relevant-experience":
              if (hasSkilledExperience || hasAnyExperience) {
                return { state: "has", detail: "관련 경력 축이 있어 예외 여부와 함께 실제 자격을 검토할 수 있어요." };
              }
              return { state: "missing", detail: "관련 경력 또는 졸업자 예외 여부를 먼저 확인해야 해요." };
            case "atlantic-settlement":
              if (answers.setting === "regional" || hasAtlanticSelection) {
                return { state: "has", detail: "대서양 4개 주 정착 의사와 지역 선택이 비교적 분명한 편이에요." };
              }
              if (answers.setting === "balanced") {
                return { state: "partial", detail: "대서양 정착도 열어둘 수는 있지만 생활 선호를 더 좁히면 좋아요." };
              }
              return { state: "missing", detail: "AIP는 Atlantic 정착 의사와 settlement plan 설명이 중요해요." };
            case "community-recommendation":
              if (answers.jobOffer === "yes" && answers.setting === "regional") {
                return { state: "partial", detail: "지역 정착 의사와 고용 연결이 있어 community recommendation 단계로 갈 여지는 있어요." };
              }
              if (answers.setting === "regional" || answers.setting === "balanced") {
                return { state: "partial", detail: "지역 정착 의사는 있지만 실제 community recommendation 요건은 더 확인해야 해요." };
              }
              return { state: "missing", detail: "이 경로는 지역 커뮤니티 추천 축이 중요해서 지역 정착 의사가 분명해야 해요." };
            case "regional-intent":
              if (answers.setting === "regional") {
                return { state: "has", detail: "시골·지역 정착 의사가 분명해요." };
              }
              if (answers.setting === "balanced") {
                return { state: "partial", detail: "지역 정착도 열어둘 수 있지만 우선순위는 더 확인이 필요해요." };
              }
              return { state: "missing", detail: "대도시 우선이면 rural·community 경로 활용 폭이 줄어들 수 있어요." };
            case "french-ability":
              if (answers.advantage === "french") {
                return { state: "has", detail: "프랑스어 강점이 있어 Francophone 경로를 실제 후보로 볼 수 있어요." };
              }
              return { state: "missing", detail: "이 경로는 프랑스어가 핵심이라 불어 점수 여부가 가장 중요해요." };
            case "alberta-community-endorsement":
              if (answers.jobOffer === "yes" && (answers.setting === "regional" || hasAlbertaSelection)) {
                return { state: "partial", detail: "알버타 지역 고용 연결과 정착 의사는 있지만 community endorsement 자체는 따로 받아야 해요." };
              }
              if (answers.setting === "regional" || hasAlbertaSelection) {
                return { state: "partial", detail: "알버타 지역 정착 방향은 맞지만 endorsement와 job 연결이 더 필요해요." };
              }
              return { state: "missing", detail: "이 경로는 알버타 designated community endorsement가 사실상 출발점이에요." };
            case "nl-eoi-ready":
              if (getMissingRequiredFields(answers).length === 0) {
                return { state: "has", detail: "기본 프로필 정보는 있어 NL EOI 쪽 운영 체계를 같이 보는 데 무리가 없어요." };
              }
              return { state: "partial", detail: "EOI 비교 전 기본 프로필 입력을 더 채우면 좋아요." };
            case "priority-occupation":
              if (hasResolvedCanadaOccupation(answers) && hasResolvedKoreaOccupation(answers)) {
                return { state: "has", detail: "한국 직무와 캐나다 현재 직무를 같이 놓고 우선 sector·occupation과 비교하기 쉬워요." };
              }
              if (hasResolvedCanadaOccupation(answers) || hasResolvedKoreaOccupation(answers)) {
                return { state: "has", detail: "직군 축이 잡혀 있어 우선 sector·occupation과 비교하기 쉬워요." };
              }
              if (answers.targetOccupationPlan && answers.targetOccupationPlan !== "unsure") {
                return { state: "partial", detail: "큰 방향은 있지만 우선 sector에 맞는 주력 직군 정리가 더 필요해요." };
              }
              return { state: "missing", detail: "직군 방향이 넓으면 우선 sector 중심 경로를 읽기 어려워져요." };
            case "nl-intent":
              if (hasNlSelection || answers.setting === "regional") {
                return { state: "has", detail: "뉴펀들랜드 정착 의사를 설명하기 좋은 상태예요." };
              }
              if (answers.setting === "balanced") {
                return { state: "partial", detail: "뉴펀들랜드 정착도 열어둘 수 있지만 선호 지역을 더 좁히면 좋아요." };
              }
              return { state: "missing", detail: "뉴펀들랜드 EOI는 지역 정착 의사를 구체적으로 설명하는 게 중요해요." };
            default:
              return { state: "partial", detail: "현재 입력으로는 추가 확인이 필요해요." };
          }
        }

        function scoreSpecialPathwayEntry(pathway, answers) {
          if (pathway.id === "federal-ee") {
            return null;
          }

          if (!pathwayMatchesSelectedRegions(pathway)) {
            return null;
          }

          const crsSnapshot = estimateCrsSnapshot(answers);
          const compared = (pathway.criteria || []).map((criterion) => ({
            ...criterion,
            ...evaluateSpecialPathwayCriterion(criterion, answers, pathway, crsSnapshot)
          }));
          let score = compared.reduce((sum, criterion) => (
            sum + (criterion.state === "has" ? 3 : criterion.state === "partial" ? 1 : -1)
          ), 0);

          if (pathway.id === "federal-trades") {
            score += occupationHasTag(answers, "trades") || answers.advantage === "trades" ? 5 : -3;
          }

          if (pathway.id === "atlantic-aip") {
            score += answers.jobOffer === "yes" ? 3 : answers.jobOffer === "unsure" ? 1 : -2;
            score += answers.setting === "regional" ? 3 : answers.setting === "balanced" ? 1 : -1;
          }

          if (pathway.id === "rural-community-pilot") {
            score += answers.setting === "regional" ? 4 : answers.setting === "balanced" ? 1 : -2;
            score += answers.jobOffer === "yes" ? 2 : 0;
          }

          if (pathway.id === "francophone-community-pilot") {
            score += answers.advantage === "french" ? 6 : -4;
          }

          if (pathway.id === "alberta-rural-renewal") {
            score += activeQuickRegions.has("alberta") ? 2 : 0;
            score += answers.setting === "regional" ? 3 : answers.setting === "balanced" ? 1 : -1;
          }

          if (pathway.id === "newfoundland-eoi") {
            score += activeQuickRegions.has("newfoundland-and-labrador") ? 3 : 0;
            score += answers.jobOffer === "yes" ? 2 : 0;
            score += hasResolvedCanadaOccupation(answers) || hasResolvedKoreaOccupation(answers) ? 1 : 0;
          }

          const currentItems = compared
            .filter((criterion) => criterion.state === "has" || criterion.state === "partial")
            .map((criterion) => criterion.label)
            .slice(0, 3);
          const nextItems = compared
            .filter((criterion) => criterion.state === "missing")
            .map((criterion) => criterion.label)
            .slice(0, 3);

          let fitLabel = "준비 필요";
          let fitTone = "neutral";

          if (score >= 14) {
            fitLabel = "지금 같이 보기 좋음";
            fitTone = "positive";
          } else if (score >= 8) {
            fitLabel = "조건 맞춰 볼만함";
            fitTone = "partial";
          }

          return {
            pathway,
            compared,
            score,
            currentItems,
            nextItems,
            fitLabel,
            fitTone,
            regionSummary: summarizeSpecialPathwayRegions(pathway),
            crsSnapshot
          };
        }

        function renderSpecialPathwayCard(entry) {
          const requiredItems = (entry.pathway.requiredKo || [])
            .slice(0, 4)
            .map((item) => '<li>' + escapeHtmlClient(item) + '</li>')
            .join("");
          const scoredItems = (entry.pathway.scoredKo || [])
            .slice(0, 4)
            .map((item) => '<li>' + escapeHtmlClient(item) + '</li>')
            .join("");
          const preferredPills = (entry.pathway.preferredKo || [])
            .slice(0, 3)
            .map((item) => '<span class="compare-pill">' + escapeHtmlClient(item) + '</span>')
            .join("");
          const compareItems = entry.compared
            .map((criterion) => [
              '<li class="pathway-compare-item is-' + escapeHtmlClient(criterion.state) + '">',
              '<span class="pathway-compare-state">' + escapeHtmlClient(
                criterion.state === "has" ? "있음" : criterion.state === "partial" ? "진행/확인" : "더 필요"
              ) + '</span>',
              '<div class="pathway-compare-copy">',
              '<strong>' + escapeHtmlClient(criterion.label) + '</strong>',
              '<p>' + escapeHtmlClient(criterion.detail) + '</p>',
              '</div>',
              '</li>'
            ].join(""))
            .join("");

          return [
            '<article class="special-pathway-card">',
            '<div class="special-pathway-head">',
            '<div>',
            '<p class="panel-kicker">특별 경로</p>',
            '<h3>' + escapeHtmlClient(entry.pathway.titleKo) + '</h3>',
            '</div>',
            '<span class="special-pathway-fit is-' + escapeHtmlClient(entry.fitTone) + '">' + escapeHtmlClient(entry.fitLabel) + '</span>',
            '</div>',
            '<p class="special-pathway-copy">' + escapeHtmlClient(entry.pathway.summaryKo) + '</p>',
            '<div class="special-pathway-pill-row">',
            '<span class="compare-pill">' + escapeHtmlClient(entry.pathway.directionKo) + '</span>',
            '<span class="compare-pill">' + escapeHtmlClient(entry.pathway.selectionModelKo) + '</span>',
            '<span class="compare-pill">대상 ' + escapeHtmlClient(entry.regionSummary) + '</span>',
            '</div>',
            '<div class="special-pathway-grid">',
            '<div class="special-pathway-block">',
            '<span class="special-pathway-label">이 경로에서 실제로 필요한 것</span>',
            '<ul class="special-pathway-list">' + requiredItems + '</ul>',
            '</div>',
            '<div class="special-pathway-block">',
            '<span class="special-pathway-label">' + escapeHtmlClient(
              entry.pathway.directionKo.includes("점수") ? "점수·우선순위에 들어가는 것" : "우선순위로 같이 보는 것"
            ) + '</span>',
            '<ul class="special-pathway-list">' + scoredItems + '</ul>',
            '</div>',
            '</div>',
            preferredPills
              ? '<div class="special-pathway-pill-row">' + preferredPills + '</div>'
              : "",
            '<div class="special-pathway-compare-wrap">',
            '<span class="special-pathway-label">내 정보 비교</span>',
            '<ul class="pathway-compare-list">' + compareItems + '</ul>',
            '</div>',
            '<div class="special-pathway-foot">',
            '<p class="wizard-freshness">공식 확인 ' + escapeHtmlClient(entry.pathway.verifiedOn) + (entry.pathway.updatedOn ? ' · 제도 업데이트 ' + escapeHtmlClient(entry.pathway.updatedOn) : '') + '</p>',
            '<a class="source-link" href="' + escapeHtmlClient(entry.pathway.officialUrl) + '" target="_blank" rel="noreferrer">' + escapeHtmlClient(entry.pathway.officialLabel) + '</a>',
            '</div>',
            '</article>'
          ].join("");
        }

        function buildSpecialPathwaySectionHtml(answers) {
          const ranked = SPECIAL_PATHWAYS
            .map((pathway) => scoreSpecialPathwayEntry(pathway, answers))
            .filter(Boolean)
            .sort((left, right) => right.score - left.score)
            .slice(0, 4);

          if (ranked.length === 0) {
            return "";
          }

          const compactList = ranked
            .slice(0, 2)
            .map((entry) => '<span class="compare-pill">' + escapeHtmlClient(entry.pathway.shortKo + " · " + entry.fitLabel) + '</span>')
            .join("");

          return [
            '<section class="special-pathway-section">',
            '<details class="panel-collapsible compact-collapsible">',
            '<summary class="panel-collapsible-summary">',
            '<div>',
            '<p class="panel-kicker">특별 경로</p>',
            '<h3>같이 보면 좋은 특별 경로</h3>',
            '<p class="panel-note">Trade, Atlantic, Rural, Francophone처럼 일반 연방/주정부 카드 밖에서 따로 봐야 하는 경로입니다.</p>',
            '</div>',
            '<div class="panel-collapsible-side">' + compactList + '<span class="panel-collapsible-chevron" aria-hidden="true">▾</span></div>',
            '</summary>',
            '<div class="panel-collapsible-body">',
            '<div class="special-pathway-cards">',
            ranked.map((entry) => renderSpecialPathwayCard(entry)).join(""),
            '</div>',
            '</div>',
            '</details>',
            '</section>'
          ].join("");
        }

        function buildDirectionOverviewCardHtml(card) {
          const currentList = card.currentItems.length > 0
            ? card.currentItems.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join("")
            : '<li>아직 강점이 뚜렷하지 않아요.</li>';
          const nextList = card.nextItems.length > 0
            ? card.nextItems.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join("")
            : '<li>추가 준비보다 최신 공지 추적이 더 중요해요.</li>';

          return [
            '<article class="direction-summary-card">',
            '<div class="direction-summary-head">',
            '<div>',
            '<p class="panel-kicker">' + escapeHtmlClient(card.kicker) + '</p>',
            '<h3>' + escapeHtmlClient(card.title) + '</h3>',
            '</div>',
            '<span class="direction-summary-badge">' + escapeHtmlClient(card.badge) + '</span>',
            '</div>',
            '<p class="direction-summary-copy">' + escapeHtmlClient(card.copy) + '</p>',
            '<div class="direction-summary-pill-row">' + card.pills.map((pill) => '<span class="compare-pill">' + escapeHtmlClient(pill) + '</span>').join("") + '</div>',
            '<div class="direction-summary-grid">',
            '<div class="direction-summary-block">',
            '<span class="direction-summary-label">현재 갖고 있는 것</span>',
            '<ul class="direction-summary-list">' + currentList + '</ul>',
            '</div>',
            '<div class="direction-summary-block">',
            '<span class="direction-summary-label">다음으로 더 필요한 것</span>',
            '<ul class="direction-summary-list">' + nextList + '</ul>',
            '</div>',
            '</div>',
            '</article>'
          ].join("");
        }

        function buildDirectionOverviewHtml(answers, allEvaluated) {
          const cards = [];
          const federalEntry = allEvaluated.find((entry) => entry.insight.id === "federal");
          const provincialEntries = allEvaluated.filter((entry) => entry.insight.id !== "federal");

          if (federalEntry) {
            const federalSnapshot = getEESnapshot(answers, federalEntry.insight);
            const federalCriteria = buildPathwayCriteria(answers, federalEntry.insight).criteria
              .map((criterion) => ({
                ...criterion,
                ...evaluatePathwayCriterion(criterion, answers, federalEntry.insight, federalSnapshot)
              }));

            cards.push(buildDirectionOverviewCardHtml({
              kicker: "Direction 1",
              title: "연방으로 먼저 보기",
              badge: "Express Entry",
              copy: "연방은 EE 자격과 CRS를 기준으로 바로 비교합니다. 주정부와 달리 점수와 라운드 컷오프를 직접 읽는 방향이에요.",
              pills: [
                "연방 점수형",
                "현재 " + federalSnapshot.crsSnapshot.score + "점",
                federalSnapshot.crsSnapshot.cutoff != null
                  ? "최근 컷오프 " + federalSnapshot.crsSnapshot.cutoff + "점"
                  : "컷오프 대기"
              ],
              currentItems: federalCriteria.filter((criterion) => criterion.state === "has").map((criterion) => criterion.label).slice(0, 3),
              nextItems: federalCriteria.filter((criterion) => criterion.state !== "has").map((criterion) => criterion.label).slice(0, 3)
            }));
          }

          if (provincialEntries.length > 0) {
            const bestProvince = provincialEntries[0];
            const provinceSnapshot = getEESnapshot(answers, bestProvince.insight);
            const provinceCriteria = buildPathwayCriteria(answers, bestProvince.insight).criteria
              .map((criterion) => ({
                ...criterion,
                ...evaluatePathwayCriterion(criterion, answers, bestProvince.insight, provinceSnapshot)
              }));
            const provinceNames = provincialEntries.slice(0, 3).map((entry) => entry.insight.labelKo).join(" / ");

            cards.push(buildDirectionOverviewCardHtml({
              kicker: "Direction 2",
              title: "주정부로 먼저 보기",
              badge: bestProvince.insight.selectionModel.badgeKo,
              copy: provinceNames + " 쪽이 현재 조건과 더 가까워 보여요. 주정부는 점수 하나보다 stream 자격, 직군, 고용 연결, 지역 조건을 함께 읽어야 합니다.",
              pills: [
                "현재 1순위 " + bestProvince.insight.labelKo,
                "선발 방식 " + bestProvince.insight.selectionModel.badgeKo,
                "EE " + bestProvince.insight.statuses.ee
              ],
              currentItems: provinceCriteria.filter((criterion) => criterion.state === "has").map((criterion) => criterion.label).slice(0, 3),
              nextItems: provinceCriteria.filter((criterion) => criterion.state !== "has").map((criterion) => criterion.label).slice(0, 3)
            }));
          }

          if (cards.length === 0) {
            return "";
          }

          return [
            '<section class="direction-summary-section">',
            '<div class="wizard-section-heading">',
            '<div>',
            '<p class="panel-kicker">큰 방향</p>',
            '<h3>연방 vs 주정부 먼저 정리</h3>',
            '</div>',
            '<p class="panel-note">연방은 점수와 컷오프를 직접 비교하고, 주정부는 주마다 다른 선발 방식과 요구 조건을 같이 봅니다.</p>',
            '</div>',
            '<div class="direction-summary-cards">',
            cards.join(""),
            '</div>',
            '</section>'
          ].join("");
        }

        function buildCareerRecognitionItems(answers, insight) {
          const items = [];
          const canadaMeta = getCanadaOccupationMeta(answers);
          const koreaMeta = getKoreaOccupationMeta(answers);

          if (answers.base === "working-holiday") {
            items.push("워홀은 open work permit이라 비자 이름보다 현재 캐나다 경력이 어떤 NOC·TEER인지가 더 중요합니다.");
          }

          if (hasSkilledCanadianTrack(answers) && answers.canadianExp !== "0") {
            if (hasResolvedCanadaOccupation(answers)) {
              items.push("현재 캐나다 " + canadaMeta.labelKo + " skilled 경력이 있으면 CEC와 일부 주정부 경로를 현실적으로 같이 볼 수 있습니다.");
            } else {
              items.push("현재 캐나다 skilled 경력이 있으면 CEC와 일부 주정부 경로를 현실적으로 같이 볼 수 있습니다.");
            }
          } else if (hasCanadianWorkBase(answers.base) && answers.canadianJobSkill === "non-skilled") {
            if (hasResolvedCanadaOccupation(answers)) {
              items.push("현재 캐나다 " + canadaMeta.labelKo + " 일이 TEER 4-5 쪽이면 CEC 연결은 약할 수 있어 " + canadaMeta.upgradeKo + " 쪽 전환이 핵심입니다.");
            } else {
              items.push("현재 캐나다 일이 TEER 4-5 쪽이면 CEC 연결은 약할 수 있어 skilled 직무 전환이 핵심입니다.");
            }
          }

          if (answers.targetOccupationPlan === "previous-korea-job") {
            if (answers.foreignExpAlignment === "same-skilled" && answers.foreignExp !== "0") {
              items.push("한국 " + koreaMeta.labelKo + " 경력으로 갈 경우, 목표 primary occupation과 같은 NOC의 숙련 경력을 기준으로 정리하는 편이 유리합니다.");
            } else if (answers.foreignExpAlignment === "related-skilled") {
              items.push("한국 경력과 목표 직군이 비슷해도 NOC가 다르면 설명을 더 정교하게 해야 할 수 있습니다.");
            } else if (answers.foreignExpAlignment === "unrelated") {
              items.push("한국 경력이 목표 직군과 거의 다르면 연방 FSW의 주력 경력으로 바로 쓰기 어려울 수 있습니다.");
            }
          }

          if (answers.degreeCareerPlan === "use-degree" && answers.targetOccupationPlan === "degree-field") {
            items.push("한국 전공을 살린 직군으로 가면 경력 스토리를 연결하기는 쉬워질 수 있지만, 결국 실제 직무와 NOC가 더 중요합니다.");
          } else if (answers.degreeCareerPlan === "not-use-degree") {
            items.push("전공을 안 살려도 이민은 가능하지만, 학력은 점수용으로 보고 실제 경력은 현재 또는 목표 직무 NOC 기준으로 정리하는 편이 좋습니다.");
          }

          if (items.length === 0) {
            items.push("대부분의 경제이민은 전공 일치 자체보다 실제 job duties, NOC, 언어점수, 경력 기간을 더 직접적으로 봅니다.");
          }

          if (insight.id === "federal" && answers.targetOccupationPlan === "previous-korea-job" && answers.foreignExpAlignment === "unrelated") {
            items.push("연방 EE 쪽은 현재 지역보다도 primary occupation을 어떤 NOC로 잡을지부터 다시 정리하는 게 좋습니다.");
          }

          return items.slice(0, 3);
        }

        function describeActionScoreImpact(answers, insight, actionId) {
          const supportsEeReference = insight.id === "federal" || statusSupports(insight.statuses.ee);

          if (!supportsEeReference) {
            return null;
          }

          const scorePlanLabel = insight.id === "federal" ? "예상 CRS" : "연방 EE 참고점수";
          const noDirectScoreLabel = insight.id === "federal" ? "CRS 직접 변화 없음" : "연방 EE 직접 변화 없음";

          function exactLift(overrides) {
            const lift = estimateProjectedCrsLift(answers, overrides);
            return lift > 0
              ? {
                  lift,
                  badge: "+" + lift + "점",
                  label: "완료 시 " + scorePlanLabel + " +" + lift + "점",
                  tone: "positive"
                }
              : {
                  lift: 0,
                  badge: "변화 없음",
                  label: noDirectScoreLabel,
                  tone: "neutral"
                };
          }

          switch (actionId) {
            case "language-proof":
              return answers.english === "unknown"
                ? { lift: null, badge: "계산 대기", label: "실제 점수표가 나와야 계산 가능", tone: "neutral" }
                : { lift: 0, badge: "변화 없음", label: "현재 추정 " + scorePlanLabel + "와 동일", tone: "neutral" };
            case "language-clb9":
              return exactLift({
                english: "clb9plus",
                languageScoreStatus: "official",
                languageEvidence: "official"
              });
            case "eca-complete":
            case "eca-finish":
              return exactLift({ ecaStatus: "completed" });
            case "eca-check":
              return { lift: null, badge: "계산 대기", label: "학력 종류 확인 후 계산 가능", tone: "neutral" };
            case "ee-profile":
            case "focus-occupation":
            case "korea-primary-noc":
            case "korea-noc-detail":
            case "regional-setting":
              return { lift: 0, badge: "변화 없음", label: noDirectScoreLabel, tone: "neutral" };
            case "teer-upgrade":
              {
                const futureLift = estimateProjectedCrsLift({
                  ...answers,
                  canadianExp: "0"
                }, {
                  canadianJobSkill: "skilled",
                  canadianExp: "1"
                });

                return futureLift > 0
                  ? {
                      lift: null,
                      futureLift,
                      badge: "1년 후 +" + futureLift + "점",
                      label: "새 skilled 경력 1년이 쌓이면 " + scorePlanLabel + " +" + futureLift + "점",
                      tone: "deferred"
                    }
                  : { lift: null, badge: "나중에 반영", label: "경력 누적 후 점수 반영", tone: "deferred" };
              }
            case "degree-experience":
            case "study-route":
              return { lift: null, badge: "나중에 반영", label: "경력 누적 후 점수 반영", tone: "deferred" };
            case "job-offer":
              return { lift: 0, badge: "변화 없음", label: noDirectScoreLabel, tone: "neutral" };
            case "pnp-nomination":
              return {
                lift: null,
                futureLift: 600,
                badge: "+600점",
                label: "EE-linked nomination 되면 " + scorePlanLabel + " +600점",
                tone: "deferred"
              };
            case "canadian-exp-next":
              {
                const nextCanadianYear = getNextCanadianExperienceYear(answers);

                return nextCanadianYear
                  ? exactLift({
                      canadianJobSkill: "skilled",
                      canadianExp: nextCanadianYear
                    })
                  : { lift: 0, badge: "변화 없음", label: noDirectScoreLabel, tone: "neutral" };
              }
            case "canadian-exp-1":
              return exactLift({
                canadianJobSkill: "skilled",
                canadianExp: "1"
              });
            case "canadian-exp-2":
              return exactLift({
                canadianJobSkill: "skilled",
                canadianExp: "2"
              });
            case "foreign-exp-1":
              return exactLift({ foreignExp: "1" });
            case "french":
              return { lift: null, futureLift: 50, badge: "최대 +50점", label: "NCLC 7+면 " + scorePlanLabel + " 최대 +50점", tone: "deferred" };
            case "expand-regions":
              return { lift: 0, badge: "선택 확장", label: "점수는 그대로, 선택지는 확장", tone: "neutral" };
            default:
              return null;
          }
        }

        function describeReferenceScoreImpact(answers, actionId) {
          function exactLift(overrides) {
            const lift = estimateProjectedCrsLift(answers, overrides);

            return lift > 0
              ? "+" + lift + "점"
              : "변화 없음";
          }

          switch (actionId) {
            case "language-clb9":
              return exactLift({
                english: "clb9plus",
                languageScoreStatus: "official",
                languageEvidence: "official"
              });
            case "canadian-exp-next":
              {
                const nextCanadianYear = getNextCanadianExperienceYear(answers);
                return nextCanadianYear
                  ? exactLift({
                      canadianJobSkill: "skilled",
                      canadianExp: nextCanadianYear
                    })
                  : "변화 없음";
              }
            case "canadian-exp-1":
              return exactLift({
                canadianJobSkill: "skilled",
                canadianExp: "1"
              });
            case "french":
              return "최대 +50점";
            case "pnp-nomination":
              return "+600점";
            default:
              return "";
          }
        }

        function getTaggedStreamNames(insight, tag, limit = 2) {
          return (insight.streamRows ?? [])
            .filter((stream) => Array.isArray(stream.tags) && stream.tags.includes(tag))
            .slice(0, limit)
            .map((stream) => stream.nameKo);
        }

        function getEnglishUpgradeTarget(answers) {
          switch (answers.english) {
            case "clb6":
              return "CLB 6 -> CLB 9";
            case "clb7":
              return "CLB 7 -> CLB 9";
            case "clb8":
              return "CLB 8 -> CLB 9";
            case "clb9plus":
              return "현재 점수 유지";
            default:
              return "공인점수 확보 후 CLB 9";
          }
        }

        function hasOccupationSelection(occupation) {
          return Boolean(occupation && occupation !== "general");
        }

        const OCCUPATION_TITLE_HINTS = [
          { occupation: "cook-chef", keywords: ["cook", "chef", "line cook", "kitchen", "요리", "주방"] },
          { occupation: "restaurant-manager", keywords: ["restaurant manager", "restaurant gm", "restaurant general manager", "f&b manager", "매니저", "지배인"] },
          { occupation: "food-service-supervisor", keywords: ["food service supervisor", "restaurant supervisor", "shift lead", "shift supervisor", "kitchen supervisor", "슈퍼바이저", "매니저"] },
          { occupation: "server-counter", keywords: ["server", "waiter", "waitress", "barista", "cashier", "food counter", "counter", "서빙", "바리스타", "캐셔"] },
          { occupation: "hotel-front-desk", keywords: ["front desk", "guest service", "guest services", "front office", "hotel receptionist", "receptionist", "프론트", "리셉션", "게스트 서비스"] },
          { occupation: "housekeeping-cleaning", keywords: ["housekeeping", "housekeeper", "room attendant", "cleaner", "janitor", "클리너", "청소", "하우스키핑"] },
          { occupation: "retail-supervisor", keywords: ["retail supervisor", "assistant manager", "store manager", "store supervisor", "점장", "매장관리"] },
          { occupation: "retail-sales", keywords: ["retail", "sales associate", "store clerk", "salesperson", "판매", "매장", "샵"] },
          { occupation: "beauty-salon", keywords: ["nail", "esthetician", "hair stylist", "beauty", "salon", "네일", "미용", "헤어", "살롱"] },
          { occupation: "office-admin", keywords: ["office", "administrator", "administrative assistant", "coordinator", "admin", "사무", "행정", "오피스", "코디네이터", "총무"] },
          { occupation: "accounting-bookkeeping", keywords: ["bookkeeper", "bookkeeping", "payroll", "accounts payable", "accounts receivable", "북키핑", "회계보조", "급여", "경리"] },
          { occupation: "accountant-finance", keywords: ["accountant", "financial analyst", "finance", "controller", "회계사", "재무", "finance manager"] },
          { occupation: "sales-marketing", keywords: ["marketing", "sales representative", "account manager", "business development", "영업", "마케팅"] },
          { occupation: "customer-service", keywords: ["customer service", "call centre", "call center", "csr", "client service", "고객지원", "콜센터", "cs"] },
          { occupation: "software-it", keywords: ["developer", "software", "programmer", "it support", "it specialist", "개발", "프로그래머", "it"] },
          { occupation: "engineer-tech", keywords: ["engineer", "technologist", "technician", "quality engineer", "process engineer", "엔지니어", "품질", "공정"] },
          { occupation: "nurse-allied-health", keywords: ["nurse", "rn", "lpn", "rpn", "physiotherapist", "hygienist", "간호", "물리치료", "치위생"] },
          { occupation: "caregiver-psw", keywords: ["caregiver", "psw", "home support", "support worker", "요양", "돌봄", "케어기버"] },
          { occupation: "ece-childcare", keywords: ["ece", "childcare", "daycare", "early childhood", "보육", "유치원", "어린이집"] },
          { occupation: "teacher-education-support", keywords: ["teacher", "education assistant", "school support", "교사", "강사", "교육지원"] },
          { occupation: "baker-pastry", keywords: ["baker", "bakery", "pastry", "제빵", "파티시에"] },
          { occupation: "warehouse-logistics", keywords: ["warehouse", "material handler", "forklift", "picker", "packer", "창고", "물류", "포크리프트", "피커", "패커"] },
          { occupation: "shipping-dispatch", keywords: ["shipping", "receiving", "dispatcher", "dispatch", "logistics coordinator", "입출고", "배차", "디스패치", "출하"] },
          { occupation: "manufacturing-production", keywords: ["production", "factory", "assembler", "machine operator", "fabrication", "생산", "제조", "공장", "조립", "오퍼레이터"] },
          { occupation: "truck-driver", keywords: ["truck", "driver", "delivery", "기사", "운전", "트럭", "배송"] },
          { occupation: "construction-trade", keywords: ["electrician", "plumber", "carpenter", "construction", "전기", "배관", "목수", "건설"] },
          { occupation: "industrial-trade", keywords: ["welder", "machinist", "millwright", "welding", "용접", "machinist", "산업"] },
          { occupation: "mechanic-technician", keywords: ["mechanic", "automotive", "service technician", "technician", "정비", "메카닉"] },
          { occupation: "physician-canada", keywords: ["physician", "doctor", "family doctor", "의사"] },
          { occupation: "senior-manager-canada", keywords: ["director", "senior manager", "operations manager", "head of", "시니어 매니저", "디렉터"] },
          { occupation: "researcher-canada", keywords: ["researcher", "scientist", "research associate", "postdoctoral", "연구원", "연구자"] }
        ];

        function inferOccupationCandidatesFromTitle(title) {
          const normalizedTitle = (title || "").trim().toLowerCase();
          if (!normalizedTitle) {
            return [];
          }

          return OCCUPATION_TITLE_HINTS
            .filter((rule) => rule.keywords.some((keyword) => normalizedTitle.includes(keyword.toLowerCase())))
            .map((rule) => rule.occupation)
            .filter((occupation, index, list) => list.indexOf(occupation) === index)
            .slice(0, 3);
        }

        function resolveOccupationId(selectedOccupation, title) {
          if (hasOccupationSelection(selectedOccupation)) {
            return selectedOccupation;
          }

          return inferOccupationCandidatesFromTitle(title)[0] || selectedOccupation || "general";
        }

        function hasResolvedCanadaOccupation(answers) {
          return hasOccupationSelection(resolveOccupationId(answers.canadaOccupation, answers.canadaJobTitle));
        }

        function hasResolvedKoreaOccupation(answers) {
          return hasOccupationSelection(resolveOccupationId(answers.koreaOccupation, answers.koreaJobTitle));
        }

        function getOccupationInferenceSummary(selectedOccupation, title) {
          const candidates = inferOccupationCandidatesFromTitle(title);

          if (!title || candidates.length === 0) {
            return null;
          }

          const labels = candidates.map((candidate) => getOccupationMeta(candidate).labelKo);
          const selectedLabel = hasOccupationSelection(selectedOccupation) ? getOccupationMeta(selectedOccupation).labelKo : null;

          return {
            title,
            labels,
            selectedLabel
          };
        }

        function buildOccupationTitleHint(selectedOccupation, title, side = "canada") {
          const resolvedOccupation = resolveOccupationId(selectedOccupation, title);
          const inference = getOccupationInferenceSummary(selectedOccupation, title);
          const profiles = getOccupationCandidateProfiles(resolvedOccupation).slice(0, 2);

          if (inference) {
            return "해석 후보: " + inference.labels.join(" / ")
              + " · "
              + profiles.map((profile) => profile.label + " (" + profile.teer + ", " + profile.note + ")").join(" / ");
          }

          if (hasOccupationSelection(selectedOccupation) && resolvedOccupation !== "general") {
            return "현재 선택 기준: "
              + getOccupationMeta(resolvedOccupation).labelKo
              + " · "
              + profiles.map((profile) => profile.label + " (" + profile.teer + ")").join(" / ");
          }

          return side === "korea"
            ? "예: Cook, Bookkeeper, Office Administrator처럼 실제 job title을 적어보세요."
            : "예: Server, Food Service Supervisor, Administrative Coordinator처럼 실제 job title을 적어보세요.";
        }

        function syncOccupationTitleHints() {
          if (koreaTitleHint) {
            koreaTitleHint.textContent = buildOccupationTitleHint(
              koreaOccupationSelect?.value || "",
              koreaJobTitleInput?.value || "",
              "korea"
            );
          }

          if (canadaTitleHint) {
            canadaTitleHint.textContent = buildOccupationTitleHint(
              canadaOccupationSelect?.value || "",
              canadaJobTitleInput?.value || "",
              "canada"
            );
          }
        }

        function getPrimaryOccupationId(answers) {
          const resolvedCanadaOccupation = resolveOccupationId(answers.canadaOccupation, answers.canadaJobTitle);
          const resolvedKoreaOccupation = resolveOccupationId(answers.koreaOccupation, answers.koreaJobTitle);

          if (answers.targetOccupationPlan === "current-canada-job" && hasOccupationSelection(resolvedCanadaOccupation)) {
            return resolvedCanadaOccupation;
          }

          if (answers.targetOccupationPlan === "previous-korea-job" && hasOccupationSelection(resolvedKoreaOccupation)) {
            return resolvedKoreaOccupation;
          }

          if (answers.targetOccupationPlan === "degree-field" && hasOccupationSelection(resolvedKoreaOccupation)) {
            return resolvedKoreaOccupation;
          }

          if (hasOccupationSelection(resolvedCanadaOccupation)) {
            return resolvedCanadaOccupation;
          }

          if (hasOccupationSelection(resolvedKoreaOccupation)) {
            return resolvedKoreaOccupation;
          }

          return answers.occupation || "general";
        }

        function getActiveOccupationMeta(answers) {
          return getOccupationMeta(getPrimaryOccupationId(answers));
        }

        function getCanadaOccupationMeta(answers) {
          return getOccupationMeta(resolveOccupationId(answers.canadaOccupation, answers.canadaJobTitle));
        }

        function getKoreaOccupationMeta(answers) {
          return getOccupationMeta(resolveOccupationId(answers.koreaOccupation, answers.koreaJobTitle));
        }

        function getCanadaOccupationTitleStage(answers) {
          const occupationId = resolveOccupationId(answers.canadaOccupation, answers.canadaJobTitle);
          if (!hasOccupationSelection(occupationId)) {
            return null;
          }

          return getOccupationTitleStage(occupationId, answers.canadaJobTitle);
        }

        function getKoreaOccupationTitleStage(answers) {
          const occupationId = resolveOccupationId(answers.koreaOccupation, answers.koreaJobTitle);
          if (!hasOccupationSelection(occupationId)) {
            return null;
          }

          return getOccupationTitleStage(occupationId, answers.koreaJobTitle);
        }

        function hasDirectCanadaSkilledTrack(answers) {
          const canadaTitleStage = getCanadaOccupationTitleStage(answers);
          return hasResolvedCanadaOccupation(answers)
            && hasSkilledCanadianTrack(answers)
            && answers.canadianExp !== "0"
            && (!canadaTitleStage || canadaTitleStage.scoreAdjustment >= 0);
        }

        function canadaTitleNeedsUpgrade(answers) {
          const canadaTitleStage = getCanadaOccupationTitleStage(answers);
          return Boolean(canadaTitleStage && canadaTitleStage.scoreAdjustment < 0);
        }

        function getOccupationMeta(occupation) {
          switch (occupation) {
            case "office-admin":
              return {
                labelKo: "사무행정 / 오피스 / 코디네이터",
                tags: ["office", "business-admin", "skilled-likely"],
                pivotKo: "오피스·코디네이터·관리지원 skilled 직무",
                upgradeKo: "coordinator·analyst·administrator급으로 명확히 정리"
              };
            case "accounting-bookkeeping":
              return {
                labelKo: "북키핑 / 회계보조 / payroll",
                tags: ["office", "business-admin", "skilled-likely"],
                pivotKo: "북키핑·payroll·재무지원 skilled 직무",
                upgradeKo: "bookkeeper·payroll·accounting technician 축으로 정리"
              };
            case "accountant-finance":
              return {
                labelKo: "회계사 / 재무 / 재무전문직",
                tags: ["office", "business-admin", "skilled-likely"],
                pivotKo: "accountant·finance skilled 직무",
                upgradeKo: "accountant·financial analyst 축으로 강화"
              };
            case "sales-marketing":
              return {
                labelKo: "세일즈 / 마케팅 / account management",
                tags: ["sales", "business-admin", "mixed-skill"],
                pivotKo: "세일즈·마케팅·account management 직무",
                upgradeKo: "account manager·business development·coordinator급으로 정리"
              };
            case "customer-service":
              return {
                labelKo: "고객지원 / 콜센터 / CS",
                tags: ["sales", "office", "mixed-skill"],
                pivotKo: "고객지원·client service·coordinator 직무",
                upgradeKo: "client service coordinator·office admin·team lead 쪽으로 전환"
              };
            case "software-it":
              return {
                labelKo: "소프트웨어 / 개발 / IT",
                tags: ["stem", "skilled-likely"],
                pivotKo: "소프트웨어·IT skilled 직무",
                upgradeKo: "현재 직무 그대로 또는 senior/devops/data 축으로 강화"
              };
            case "engineer-tech":
              return {
                labelKo: "엔지니어링 / 기술전문직",
                tags: ["stem", "skilled-likely"],
                pivotKo: "엔지니어링·기술전문직",
                upgradeKo: "engineer와 technologist 중 어떤 NOC인지 더 좁히기"
              };
            case "nurse-allied-health":
              return {
                labelKo: "간호 / allied health / 임상전문직",
                tags: ["health", "skilled-likely", "regulated"],
                pivotKo: "간호·allied health 직무",
                upgradeKo: "면허·등록을 보완해 healthcare category와 같이 보기"
              };
            case "caregiver-psw":
              return {
                labelKo: "케어기버 / PSW / 지원돌봄",
                tags: ["health", "care-support", "mixed-skill", "ontario-indemand"],
                pivotKo: "caregiver·PSW·지원돌봄 직무",
                upgradeKo: "PSW·support worker 예외 stream 또는 healthcare support 축 확인"
              };
            case "ece-childcare":
              return {
                labelKo: "ECE / 보육 / childcare",
                tags: ["education", "mixed-skill", "regulated"],
                pivotKo: "ECE·childcare 직무",
                upgradeKo: "ECE 자격과 local license를 맞춰 교육축으로 연결"
              };
            case "teacher-education-support":
              return {
                labelKo: "교사 / 교육지원 / school support",
                tags: ["education", "mixed-skill", "regulated"],
                pivotKo: "교사·교육지원 직무",
                upgradeKo: "education assistant·ECE·school support로 현실 경로 좁히기"
              };
            case "cook-chef":
              return {
                labelKo: "요리사 / cook / chef",
                tags: ["hospitality", "trades", "skilled-likely"],
                pivotKo: "cook·chef skilled 직무",
                upgradeKo: "cook·chef 그대로 또는 kitchen lead로 강화"
              };
            case "baker-pastry":
              return {
                labelKo: "제빵 / 파티시에 / bakery",
                tags: ["hospitality", "trades", "mixed-skill"],
                pivotKo: "baker·pastry·production bakery 직무",
                upgradeKo: "production baker·lead baker로 정리"
              };
            case "restaurant-manager":
              return {
                labelKo: "레스토랑 매니저 / restaurant manager",
                tags: ["hospitality", "management", "skilled-likely"],
                pivotKo: "restaurant manager·F&B manager 직무",
                upgradeKo: "restaurant manager duty와 team management를 더 명확히 정리"
              };
            case "food-service-supervisor":
              return {
                labelKo: "푸드서비스 슈퍼바이저 / shift lead",
                tags: ["hospitality", "supervisor", "skilled-likely"],
                pivotKo: "food service supervisor 직무",
                upgradeKo: "현재 직무 그대로 또는 duty를 supervisor로 더 명확히 정리"
              };
            case "server-counter":
              return {
                labelKo: "서버 / 캐셔 / 바리스타 / food counter",
                tags: ["hospitality", "service-entry", "non-skilled-likely"],
                pivotKo: "front-line service에서 supervisor·cook 쪽으로 전환",
                upgradeKo: "food service supervisor·cook·shift lead 쪽으로 이동"
              };
            case "hotel-front-desk":
              return {
                labelKo: "호텔 프론트 / guest service / front desk",
                tags: ["hospitality", "office", "mixed-skill"],
                pivotKo: "front desk·guest service·hotel supervisor 직무",
                upgradeKo: "guest service supervisor·front office supervisor 쪽으로 정리"
              };
            case "housekeeping-cleaning":
              return {
                labelKo: "하우스키핑 / 클리닝 / room attendant",
                tags: ["hospitality", "service-entry", "non-skilled-likely"],
                pivotKo: "housekeeping에서 supervisor·inspection 쪽으로 전환",
                upgradeKo: "housekeeping supervisor·lead room attendant 쪽으로 이동"
              };
            case "retail-supervisor":
              return {
                labelKo: "리테일 슈퍼바이저 / 매장리더",
                tags: ["retail", "supervisor", "skilled-likely"],
                pivotKo: "retail supervisor·store lead 직무",
                upgradeKo: "현재 supervisor duty를 더 명확히 문서화"
              };
            case "retail-sales":
              return {
                labelKo: "리테일 판매 / 매장서비스",
                tags: ["retail", "service-entry", "non-skilled-likely"],
                pivotKo: "매장서비스에서 supervisor·coordinator로 전환",
                upgradeKo: "retail supervisor·office coordinator로 전환"
              };
            case "beauty-salon":
              return {
                labelKo: "네일 / 헤어 / 뷰티 서비스",
                tags: ["service-entry", "mixed-skill", "regulated"],
                pivotKo: "personal service에서 manager·trainer·licensed role 쪽으로 전환",
                upgradeKo: "salon manager·licensed esthetician·stylist 쪽으로 정리"
              };
            case "warehouse-logistics":
              return {
                labelKo: "창고 / 물류 / warehouse associate",
                tags: ["transport", "warehouse", "mixed-skill", "ontario-indemand"],
                pivotKo: "물류·warehouse·shipping 쪽 직무",
                upgradeKo: "shipping lead·inventory coordinator·dispatcher로 전환"
              };
            case "shipping-dispatch":
              return {
                labelKo: "shipping / receiving / dispatch",
                tags: ["transport", "warehouse", "mixed-skill"],
                pivotKo: "shipping·receiving·dispatcher 직무",
                upgradeKo: "dispatcher·logistics coordinator·lead 축으로 정리"
              };
            case "manufacturing-production":
              return {
                labelKo: "제조 / production / factory worker",
                tags: ["trades", "warehouse", "mixed-skill"],
                pivotKo: "machine operator·production lead·manufacturing technician 직무",
                upgradeKo: "machine operator·lead hand·technician 쪽으로 정리"
              };
            case "truck-driver":
              return {
                labelKo: "트럭 / 배송 / 운송기사",
                tags: ["transport", "skilled-likely"],
                pivotKo: "운송기사·driver 직무",
                upgradeKo: "현재 driver 직무 그대로 + regional 경로까지 열기"
              };
            case "construction-trade":
              return {
                labelKo: "건설 / 전기 / 배관 / carpentry",
                tags: ["trades", "skilled-likely"],
                pivotKo: "건설 trade skilled 직무",
                upgradeKo: "trade certification과 고용주 연결을 같이 맞추기"
              };
            case "industrial-trade":
              return {
                labelKo: "용접 / machinist / industrial trade",
                tags: ["trades", "skilled-likely"],
                pivotKo: "산업 trade skilled 직무",
                upgradeKo: "산업벨트 지역과 certification 축을 같이 보기"
              };
            case "mechanic-technician":
              return {
                labelKo: "자동차 정비 / mechanic / technician",
                tags: ["trades", "skilled-likely", "regulated"],
                pivotKo: "mechanic·technician 직무",
                upgradeKo: "mechanic certification과 dealership/garage job offer를 같이 맞추기"
              };
            case "physician-canada":
              return {
                labelKo: "의사 + 캐나다 경력",
                tags: ["health", "physician", "skilled-likely"],
                pivotKo: "의사 + 캐나다 경력",
                upgradeKo: "현재 category-based selection 축을 직접 확인"
              };
            case "senior-manager-canada":
              return {
                labelKo: "시니어 매니저 + 캐나다 경력",
                tags: ["management", "skilled-likely"],
                pivotKo: "시니어 매니저 직무",
                upgradeKo: "senior manager duty와 Canadian exp를 더 명확히 정리"
              };
            case "researcher-canada":
              return {
                labelKo: "연구자 + 캐나다 경력",
                tags: ["research", "skilled-likely", "stem"],
                pivotKo: "연구자 직무",
                upgradeKo: "researcher 경력과 publication/job title 축을 정리"
              };
            default:
              return {
                labelKo: "기타 / 아직 직군을 좁히지 못했어요",
                tags: ["general"],
                pivotKo: "지금 경력과 가장 가까운 skilled NOC 1개",
                upgradeKo: "지금 경력에서 가장 가까운 skilled NOC 1개를 먼저 찾기"
              };
          }
        }

        function getOccupationSkillBand(occupation) {
          const meta = getOccupationMeta(occupation);

          if (meta.tags.includes("skilled-likely")) {
            return "skilled";
          }

          if (meta.tags.includes("non-skilled-likely")) {
            return "entry";
          }

          return "mixed";
        }

        function getOccupationNocExamples(occupation) {
          switch (occupation) {
            case "office-admin":
              return ["office administrator / administrative assistant", "operations coordinator / office coordinator"];
            case "accounting-bookkeeping":
              return ["bookkeeper", "payroll administrator", "accounting technician"];
            case "accountant-finance":
              return ["accountant", "financial analyst", "controller / finance manager"];
            case "sales-marketing":
              return ["account manager", "sales representative", "marketing coordinator"];
            case "customer-service":
              return ["client service coordinator", "customer service representative", "office support / service lead"];
            case "software-it":
              return ["software developer", "programmer / analyst", "IT specialist"];
            case "engineer-tech":
              return ["engineer", "engineering technologist", "quality / process specialist"];
            case "nurse-allied-health":
              return ["registered nurse", "licensed practical nurse", "allied health practitioner"];
            case "caregiver-psw":
              return ["personal support worker", "home support worker", "care aide"];
            case "ece-childcare":
              return ["early childhood educator", "childcare worker", "ECE assistant"];
            case "teacher-education-support":
              return ["teacher assistant", "education assistant", "school support worker"];
            case "cook-chef":
              return ["cook", "chef", "line cook / kitchen lead"];
            case "baker-pastry":
              return ["baker", "pastry baker", "production baker"];
            case "restaurant-manager":
              return ["restaurant manager", "food service manager", "front of house manager"];
            case "food-service-supervisor":
              return ["food service supervisor", "shift supervisor", "restaurant supervisor"];
            case "server-counter":
              return ["server / bartender", "food counter attendant", "barista / cashier"];
            case "hotel-front-desk":
              return ["hotel front desk clerk", "guest service agent", "front office supervisor"];
            case "housekeeping-cleaning":
              return ["room attendant", "housekeeper", "housekeeping supervisor"];
            case "retail-supervisor":
              return ["retail supervisor", "store supervisor", "assistant store manager"];
            case "retail-sales":
              return ["retail salesperson", "sales associate", "store clerk"];
            case "beauty-salon":
              return ["hair stylist", "esthetician", "salon manager / beauty supervisor"];
            case "warehouse-logistics":
              return ["warehouse associate", "material handler", "inventory / shipping support"];
            case "shipping-dispatch":
              return ["dispatcher", "shipping / receiving clerk", "logistics coordinator"];
            case "manufacturing-production":
              return ["production worker", "machine operator", "manufacturing technician / lead hand"];
            case "truck-driver":
              return ["transport truck driver", "delivery driver", "commercial driver"];
            case "construction-trade":
              return ["electrician / plumber / carpenter", "construction trade worker", "apprentice / journeyperson"];
            case "industrial-trade":
              return ["welder", "machinist", "industrial mechanic"];
            case "mechanic-technician":
              return ["automotive service technician", "mechanic", "service advisor / diagnostic technician"];
            case "physician-canada":
              return ["physician", "family doctor", "specialist with Canadian experience"];
            case "senior-manager-canada":
              return ["senior manager", "operations director", "department head"];
            case "researcher-canada":
              return ["research scientist", "research associate", "postdoctoral / lab researcher"];
            default:
              return ["가장 가까운 NOC 1-2개를 먼저 찾아야 함"];
          }
        }

        function getOccupationCandidateProfiles(occupation) {
          switch (occupation) {
            case "office-admin":
              return [
                { label: "Office administrator", teer: "TEER 3", note: "현재 직무 그대로" },
                { label: "Administrative assistant", teer: "TEER 3", note: "현재 직무 그대로" },
                { label: "Office coordinator", teer: "TEER 2-3", note: "한 단계 업그레이드" }
              ];
            case "accounting-bookkeeping":
              return [
                { label: "Bookkeeper", teer: "TEER 2", note: "현재 직무 그대로" },
                { label: "Payroll administrator", teer: "TEER 2", note: "현재 직무 그대로" },
                { label: "Accounting technician", teer: "TEER 2", note: "한 단계 업그레이드" }
              ];
            case "accountant-finance":
              return [
                { label: "Accountant", teer: "TEER 1", note: "현재 직무 그대로" },
                { label: "Financial analyst", teer: "TEER 1", note: "현재 직무 그대로" },
                { label: "Finance manager", teer: "TEER 0-1", note: "경력 확장" }
              ];
            case "sales-marketing":
              return [
                { label: "Account manager", teer: "TEER 1-2", note: "직무 좁히기" },
                { label: "Sales representative", teer: "TEER 2", note: "현재 직무 그대로" },
                { label: "Marketing coordinator", teer: "TEER 2", note: "현재 직무 그대로" }
              ];
            case "customer-service":
              return [
                { label: "Customer service representative", teer: "TEER 3-4", note: "직무 확인 필요" },
                { label: "Client service coordinator", teer: "TEER 2-3", note: "업그레이드 후보" },
                { label: "Office support lead", teer: "TEER 2-3", note: "업그레이드 후보" }
              ];
            case "software-it":
              return [
                { label: "Software developer", teer: "TEER 1", note: "현재 직무 그대로" },
                { label: "Programmer / analyst", teer: "TEER 1", note: "현재 직무 그대로" },
                { label: "IT specialist", teer: "TEER 1-2", note: "현재 직무 그대로" }
              ];
            case "engineer-tech":
              return [
                { label: "Engineer", teer: "TEER 1", note: "현재 직무 그대로" },
                { label: "Engineering technologist", teer: "TEER 2", note: "기술직 축" },
                { label: "Quality / process specialist", teer: "TEER 1-2", note: "현재 직무 그대로" }
              ];
            case "nurse-allied-health":
              return [
                { label: "Registered nurse", teer: "TEER 1", note: "면허 필요" },
                { label: "Licensed practical nurse", teer: "TEER 2", note: "면허 필요" },
                { label: "Allied health practitioner", teer: "TEER 1-2", note: "면허 필요" }
              ];
            case "caregiver-psw":
              return [
                { label: "Personal support worker", teer: "TEER 4", note: "주 예외 stream 확인" },
                { label: "Home support worker", teer: "TEER 4", note: "employer-driven 확인" },
                { label: "Care aide", teer: "TEER 4", note: "주 예외 stream 확인" }
              ];
            case "ece-childcare":
              return [
                { label: "Early childhood educator", teer: "TEER 2", note: "자격 필요" },
                { label: "ECE assistant", teer: "TEER 3-4", note: "지역별 다름" },
                { label: "Childcare worker", teer: "TEER 3-4", note: "지역별 다름" }
              ];
            case "teacher-education-support":
              return [
                { label: "Teacher assistant", teer: "TEER 3", note: "현실적 우회로" },
                { label: "Education assistant", teer: "TEER 3", note: "현실적 우회로" },
                { label: "School support worker", teer: "TEER 3-4", note: "현실적 우회로" }
              ];
            case "cook-chef":
              return [
                { label: "Cook", teer: "TEER 3", note: "현재 직무 그대로" },
                { label: "Chef", teer: "TEER 2", note: "현재 직무 그대로" },
                { label: "Kitchen lead", teer: "TEER 2-3", note: "업그레이드 후보" }
              ];
            case "baker-pastry":
              return [
                { label: "Baker", teer: "TEER 3", note: "현재 직무 그대로" },
                { label: "Pastry baker", teer: "TEER 3", note: "현재 직무 그대로" },
                { label: "Production baker", teer: "TEER 2-3", note: "업그레이드 후보" }
              ];
            case "restaurant-manager":
              return [
                { label: "Restaurant manager", teer: "TEER 0-1", note: "현재 직무 그대로" },
                { label: "Food service manager", teer: "TEER 0-1", note: "현재 직무 그대로" },
                { label: "Front of house manager", teer: "TEER 1-2", note: "현재 직무 그대로" }
              ];
            case "food-service-supervisor":
              return [
                { label: "Food service supervisor", teer: "TEER 2", note: "현재 직무 그대로" },
                { label: "Restaurant supervisor", teer: "TEER 2", note: "현재 직무 그대로" },
                { label: "Shift supervisor", teer: "TEER 2-3", note: "현재 직무 그대로" }
              ];
            case "server-counter":
              return [
                { label: "Server / bartender", teer: "TEER 4-5", note: "현재 role" },
                { label: "Food counter attendant", teer: "TEER 5", note: "현재 role" },
                { label: "Food service supervisor", teer: "TEER 2", note: "전환 목표" }
              ];
            case "hotel-front-desk":
              return [
                { label: "Front desk clerk", teer: "TEER 3-4", note: "현재 직무 확인" },
                { label: "Guest service agent", teer: "TEER 3", note: "현재 직무 그대로" },
                { label: "Front office supervisor", teer: "TEER 2", note: "전환 목표" }
              ];
            case "housekeeping-cleaning":
              return [
                { label: "Room attendant", teer: "TEER 5", note: "현재 role" },
                { label: "Cleaner / housekeeper", teer: "TEER 5", note: "현재 role" },
                { label: "Housekeeping supervisor", teer: "TEER 2", note: "전환 목표" }
              ];
            case "retail-supervisor":
              return [
                { label: "Retail supervisor", teer: "TEER 2", note: "현재 직무 그대로" },
                { label: "Store supervisor", teer: "TEER 2", note: "현재 직무 그대로" },
                { label: "Assistant store manager", teer: "TEER 1-2", note: "업그레이드 후보" }
              ];
            case "retail-sales":
              return [
                { label: "Retail salesperson", teer: "TEER 4", note: "현재 role" },
                { label: "Sales associate", teer: "TEER 4", note: "현재 role" },
                { label: "Retail supervisor", teer: "TEER 2", note: "전환 목표" }
              ];
            case "beauty-salon":
              return [
                { label: "Hair stylist", teer: "TEER 3", note: "license 확인" },
                { label: "Esthetician", teer: "TEER 3", note: "license 확인" },
                { label: "Salon manager", teer: "TEER 0-2", note: "전환 목표" }
              ];
            case "warehouse-logistics":
              return [
                { label: "Warehouse associate", teer: "TEER 4", note: "현재 role" },
                { label: "Material handler", teer: "TEER 4", note: "현재 role" },
                { label: "Inventory coordinator", teer: "TEER 2-3", note: "전환 목표" }
              ];
            case "shipping-dispatch":
              return [
                { label: "Dispatcher", teer: "TEER 2", note: "현재 직무 그대로" },
                { label: "Shipping / receiving clerk", teer: "TEER 3-4", note: "직무 확인 필요" },
                { label: "Logistics coordinator", teer: "TEER 2", note: "업그레이드 후보" }
              ];
            case "manufacturing-production":
              return [
                { label: "Production worker", teer: "TEER 4-5", note: "현재 role" },
                { label: "Machine operator", teer: "TEER 3-4", note: "업그레이드 후보" },
                { label: "Manufacturing technician / lead hand", teer: "TEER 2-3", note: "전환 목표" }
              ];
            case "truck-driver":
              return [
                { label: "Transport truck driver", teer: "TEER 3", note: "현재 직무 그대로" },
                { label: "Delivery driver", teer: "TEER 3-4", note: "직무 확인 필요" },
                { label: "Commercial driver", teer: "TEER 3", note: "현재 직무 그대로" }
              ];
            case "construction-trade":
              return [
                { label: "Electrician / plumber / carpenter", teer: "TEER 2-3", note: "인증 중요" },
                { label: "Construction trade worker", teer: "TEER 2-3", note: "인증 중요" },
                { label: "Journeyperson / apprentice", teer: "TEER 2-3", note: "인증 중요" }
              ];
            case "industrial-trade":
              return [
                { label: "Welder", teer: "TEER 2-3", note: "현재 직무 그대로" },
                { label: "Machinist", teer: "TEER 2-3", note: "현재 직무 그대로" },
                { label: "Industrial mechanic", teer: "TEER 2-3", note: "현재 직무 그대로" }
              ];
            case "mechanic-technician":
              return [
                { label: "Automotive service technician", teer: "TEER 2", note: "인증 중요" },
                { label: "Mechanic", teer: "TEER 2-3", note: "현재 직무 그대로" },
                { label: "Diagnostic technician", teer: "TEER 2", note: "업그레이드 후보" }
              ];
            case "physician-canada":
              return [
                { label: "Physician", teer: "TEER 1", note: "현재 직무 그대로" },
                { label: "Family doctor", teer: "TEER 1", note: "현재 직무 그대로" },
                { label: "Specialist physician", teer: "TEER 1", note: "현재 직무 그대로" }
              ];
            case "senior-manager-canada":
              return [
                { label: "Senior manager", teer: "TEER 0", note: "현재 직무 그대로" },
                { label: "Operations director", teer: "TEER 0-1", note: "현재 직무 그대로" },
                { label: "Department head", teer: "TEER 0-1", note: "현재 직무 그대로" }
              ];
            case "researcher-canada":
              return [
                { label: "Research scientist", teer: "TEER 1", note: "현재 직무 그대로" },
                { label: "Research associate", teer: "TEER 1-2", note: "현재 직무 그대로" },
                { label: "Postdoctoral researcher", teer: "TEER 1", note: "현재 직무 그대로" }
              ];
            default:
              return [
                { label: "가장 가까운 NOC 1개", teer: "확인 필요", note: "직무 좁히기 필요" },
                { label: "같은 업종 안의 supervisor / technician", teer: "확인 필요", note: "업그레이드 후보" }
              ];
          }
        }

        function getOccupationFederalReadiness(occupation) {
          switch (getOccupationSkillBand(occupation)) {
            case "skilled":
              return "연방 EE/CEC 기준으로는 대체로 TEER 0-3 skilled 축으로 읽힐 가능성이 큰 편입니다.";
            case "entry":
              return "현재 직무 title 그대로는 연방 EE/CEC skilled 경력으로 바로 안 읽힐 가능성이 큽니다.";
            default:
              return "job title과 실제 duties에 따라 skilled 여부가 갈릴 수 있어 NOC를 더 좁혀야 합니다.";
          }
        }

        function getOccupationTitleStage(occupation, title) {
          const normalizedTitle = (title || "").trim().toLowerCase();

          if (!normalizedTitle) {
            return {
              label: "title 미입력",
              scoreAdjustment: 0,
              reason: "실제 title을 적으면 현재 role이 바로 비교 가능한지 더 정확히 읽을 수 있어요."
            };
          }

          function hasAny(keywords) {
            return keywords.some((keyword) => normalizedTitle.includes(keyword));
          }

          switch (occupation) {
            case "office-admin":
              if (hasAny(["coordinator", "administrator", "administrative assistant", "admin assistant", "office manager"])) {
                return { label: "direct skilled 쪽", scoreAdjustment: 2, reason: "office administrator·coordinator처럼 바로 비교 가능한 title로 읽혀요." };
              }
              if (hasAny(["assistant", "clerk", "reception"])) {
                return { label: "broad office 쪽", scoreAdjustment: 0, reason: "office 쪽이긴 하지만 duties를 더 명확히 써야 skilled로 읽히는 title이에요." };
              }
              break;
            case "accounting-bookkeeping":
              if (hasAny(["bookkeeper", "payroll", "accounting technician", "ap", "ar"])) {
                return { label: "direct skilled 쪽", scoreAdjustment: 2, reason: "bookkeeper·payroll처럼 직무 축이 비교적 선명한 title이에요." };
              }
              break;
            case "customer-service":
              if (hasAny(["coordinator", "lead", "team lead", "office admin"])) {
                return { label: "upgrade-ready", scoreAdjustment: 1, reason: "client service coordinator·lead 쪽으로 읽히면 더 유리한 title이에요." };
              }
              if (hasAny(["customer service", "call centre", "call center", "representative", "agent"])) {
                return { label: "entry/broad 쪽", scoreAdjustment: -1, reason: "customer service rep·agent는 그대로보다 coordinator·lead 쪽으로 좁혀야 더 선명해져요." };
              }
              break;
            case "server-counter":
              if (hasAny(["supervisor", "shift lead", "lead", "cook", "kitchen"])) {
                return { label: "upgrade-ready", scoreAdjustment: 2, reason: "server 자체보다 food service supervisor·cook 쪽에 가까운 title로 읽혀요." };
              }
              if (hasAny(["server", "barista", "cashier", "bartender", "counter"])) {
                return { label: "entry-level 쪽", scoreAdjustment: -2, reason: "front-line service title이라 대부분 주에서 그대로는 약하게 읽혀요." };
              }
              break;
            case "hotel-front-desk":
              if (hasAny(["supervisor", "front office supervisor"])) {
                return { label: "upgrade-ready", scoreAdjustment: 2, reason: "front office supervisor 쪽이면 바로 비교가 훨씬 쉬워져요." };
              }
              if (hasAny(["front desk", "guest service", "receptionist", "front office"])) {
                return { label: "mixed direct", scoreAdjustment: 0, reason: "guest service agent는 가능한 편이지만 supervisor duty가 붙으면 더 유리해져요." };
              }
              break;
            case "housekeeping-cleaning":
              if (hasAny(["supervisor", "inspector", "lead"])) {
                return { label: "upgrade-ready", scoreAdjustment: 2, reason: "housekeeping supervisor·inspection 쪽이면 훨씬 선명해져요." };
              }
              if (hasAny(["room attendant", "housekeeper", "cleaner", "janitor"])) {
                return { label: "entry-level 쪽", scoreAdjustment: -2, reason: "cleaner·room attendant는 그대로보다 supervisor 쪽으로 올라가야 해요." };
              }
              break;
            case "retail-sales":
              if (hasAny(["supervisor", "assistant manager", "lead", "keyholder"])) {
                return { label: "upgrade-ready", scoreAdjustment: 2, reason: "retail supervisor·assistant manager에 가까운 title이면 더 유리해져요." };
              }
              if (hasAny(["sales associate", "salesperson", "store clerk", "cashier"])) {
                return { label: "entry-level 쪽", scoreAdjustment: -2, reason: "retail sales 자체는 그대로보다 supervisor 쪽으로 올라가야 읽히기 쉬워요." };
              }
              break;
            case "warehouse-logistics":
              if (hasAny(["dispatcher", "coordinator", "inventory", "shipping", "receiving", "lead"])) {
                return { label: "upgrade-ready", scoreAdjustment: 2, reason: "dispatcher·inventory·shipping 쪽이면 창고 기본 role보다 훨씬 선명해져요." };
              }
              if (hasAny(["warehouse", "material handler", "forklift", "picker", "packer"])) {
                return { label: "entry-level 쪽", scoreAdjustment: -1, reason: "warehouse associate·picker·packer는 그대로보다 dispatch·coordinator 쪽이 더 유리해요." };
              }
              break;
            case "shipping-dispatch":
              if (hasAny(["dispatcher", "logistics coordinator"])) {
                return { label: "direct skilled 쪽", scoreAdjustment: 2, reason: "dispatcher·logistics coordinator는 바로 비교 가능한 쪽으로 읽혀요." };
              }
              if (hasAny(["shipping", "receiving clerk"])) {
                return { label: "mixed direct", scoreAdjustment: 0, reason: "shipping/receiving clerk는 duties에 따라 TEER 해석이 갈릴 수 있어요." };
              }
              break;
            case "caregiver-psw":
              if (hasAny(["psw", "personal support worker", "home support", "support worker", "care aide"])) {
                return { label: "예외 stream direct", scoreAdjustment: 1, reason: "PSW·home support worker 쪽이면 예외 stream이나 employer-driven 경로와 바로 비교해 볼 수 있어요." };
              }
              if (hasAny(["caregiver", "care worker"])) {
                return { label: "broad care 쪽", scoreAdjustment: 0, reason: "caregiver만으로는 넓어서 PSW / support worker duties를 더 붙이는 게 좋아요." };
              }
              break;
            case "cook-chef":
              if (hasAny(["chef", "sous chef", "head cook", "kitchen lead"])) {
                return { label: "direct skilled 쪽", scoreAdjustment: 2, reason: "chef·kitchen lead 쪽이면 skilled 축으로 바로 읽히기 좋은 title이에요." };
              }
              if (hasAny(["cook", "line cook"])) {
                return { label: "direct skilled 쪽", scoreAdjustment: 1, reason: "cook·line cook도 충분히 비교 가능한 쪽이지만 duty를 더 선명하게 쓰면 더 좋아져요." };
              }
              break;
            case "food-service-supervisor":
              if (hasAny(["food service supervisor", "restaurant supervisor", "shift supervisor", "shift lead"])) {
                return { label: "direct skilled 쪽", scoreAdjustment: 2, reason: "food service supervisor duty가 바로 보이는 title이라 비교하기 좋아요." };
              }
              break;
          }

          return {
            label: "duty 확인 필요",
            scoreAdjustment: 0,
            reason: "job title만으로는 부족해서 실제 duties와 NOC를 같이 봐야 해요."
          };
        }

        function getOccupationPlannerFocus(occupation) {
          const meta = getOccupationMeta(occupation);

          switch (occupation) {
            case "server-counter":
              return {
                transitionTarget: "food service supervisor 또는 cook",
                transitionSummary: "server·barista·cashier 같은 front-line service는 대부분 주에서 그대로보다 supervisor나 cook으로 올라갈 때 훨씬 선명해집니다.",
                schoolTrack: "culinary·hospitality 과정 -> cook / food service supervisor"
              };
            case "retail-sales":
              return {
                transitionTarget: "retail supervisor 또는 office coordinator",
                transitionSummary: "retail sales는 그대로보다 supervisor나 coordinator로 올라가야 skilled 쪽으로 읽히기 쉬워집니다.",
                schoolTrack: "business·office admin 과정 -> retail supervisor / office coordinator"
              };
            case "warehouse-logistics":
              return {
                transitionTarget: "inventory coordinator 또는 dispatcher",
                transitionSummary: "warehouse associate 자체보다 inventory·shipping·dispatch 쪽으로 옮길 때 주정부와 연방에서 더 선명해집니다.",
                schoolTrack: "supply chain / logistics 과정 -> dispatcher / coordinator"
              };
            case "caregiver-psw":
              return {
                transitionTarget: "PSW 예외 stream 또는 healthcare support employer path",
                transitionSummary: "PSW·caregiver는 연방 direct보다 Ontario In-Demand, AIP, local employer 예외 경로를 먼저 보는 편이 현실적입니다.",
                schoolTrack: "PSW·health support 과정 -> local employer / healthcare support"
              };
            case "office-admin":
              return {
                transitionTarget: "office administrator 또는 office coordinator",
                transitionSummary: "사무직은 broad title 그대로보다 administrator·coordinator duties가 보일수록 skilled로 더 안정적으로 읽힙니다.",
                schoolTrack: "business admin / office admin 과정 -> administrator / coordinator"
              };
            case "customer-service":
              return {
                transitionTarget: "client service coordinator 또는 office admin lead",
                transitionSummary: "고객지원은 그대로보다 coordinator·lead 성격이 붙어야 많은 주에서 더 선명하게 읽힙니다.",
                schoolTrack: "business / office support 과정 -> coordinator / lead"
              };
            case "cook-chef":
              return {
                transitionTarget: "cook 그대로 유지 또는 kitchen lead·chef 강화",
                transitionSummary: "cook·chef는 skilled 축으로 그대로 갈 수 있지만, kitchen lead·chef duty까지 보이면 더 안정적입니다.",
                schoolTrack: "culinary / hospitality management -> cook / chef"
              };
            case "food-service-supervisor":
              return {
                transitionTarget: "food service supervisor duty 명확화",
                transitionSummary: "이 직군은 title보다 실제 supervisor duty와 팀 관리 범위를 문서화하는 게 중요합니다.",
                schoolTrack: "hospitality management -> food service supervisor / restaurant supervisor"
              };
            case "hotel-front-desk":
              return {
                transitionTarget: "guest service supervisor 또는 front office supervisor",
                transitionSummary: "front desk는 그대로보다 guest service supervisor·front office supervisor로 올라갈 때 더 선명합니다.",
                schoolTrack: "hospitality / hotel operations 과정 -> guest service supervisor"
              };
            case "housekeeping-cleaning":
              return {
                transitionTarget: "housekeeping supervisor",
                transitionSummary: "room attendant·cleaner는 대부분 supervisor나 inspection 성격이 붙어야 더 현실적인 경로가 열립니다.",
                schoolTrack: "hospitality / accommodation 과정 -> housekeeping supervisor"
              };
            case "manufacturing-production":
              return {
                transitionTarget: "machine operator 또는 lead hand / technician",
                transitionSummary: "production worker는 그대로보다 machine operator·lead hand·technician으로 옮겨야 skilled 또는 mixed-skill 해석이 쉬워집니다.",
                schoolTrack: "manufacturing technician 과정 -> machine operator / technician"
              };
            default:
              return {
                transitionTarget: meta.upgradeKo,
                transitionSummary: "같은 업종 안에서 skilled로 읽히는 title을 먼저 만드는 편이 현실적입니다.",
                schoolTrack: meta.pivotKo + "와 연결되는 PGWP 가능한 과정"
              };
          }
        }

        function buildProvinceOccupationLens(answers, insight) {
          const routeOccupationId = getPrimaryOccupationId(answers);
          const routeMeta = getOccupationMeta(routeOccupationId);
          const canadaMeta = getCanadaOccupationMeta(answers);
          const koreaInference = getOccupationInferenceSummary(answers.koreaOccupation, answers.koreaJobTitle);
          const canadaInference = getOccupationInferenceSummary(answers.canadaOccupation, answers.canadaJobTitle);
          const usingKoreaRoute = answers.targetOccupationPlan === "previous-korea-job" && hasResolvedKoreaOccupation(answers);
          const routeLabel = usingKoreaRoute
            ? "한국 " + routeMeta.labelKo
            : hasResolvedCanadaOccupation(answers)
              ? "현재 캐나다 " + routeMeta.labelKo
              : routeMeta.labelKo;
          const routeTags = routeMeta.tags;
          const nocExamples = getOccupationNocExamples(routeOccupationId);
          const candidateProfiles = getOccupationCandidateProfiles(routeOccupationId);
          const koreaTitleStage = getKoreaOccupationTitleStage(answers);
          const canadaTitleStage = getCanadaOccupationTitleStage(answers);
          const canUseKoreaSkilled = hasResolvedKoreaOccupation(answers) && answers.foreignExp !== "0" && answers.foreignExpAlignment !== "unrelated";
          const hasCurrentCanadaSkill = hasSkilledCanadianTrack(answers) && answers.canadianExp !== "0";
          const canadaIsNonSkilled = answers.canadianJobSkill === "non-skilled";
          const isServiceEntry = routeTags.some((tag) => ["service-entry", "retail"].includes(tag));
          const isHospitality = routeTags.includes("hospitality");
          const isTrades = routeTags.includes("trades");
          const isTransport = routeTags.includes("transport");
          const isHealth = routeTags.includes("health") || routeTags.includes("care-support");
          const isEducation = routeTags.includes("education");
          const isBusiness = routeTags.some((tag) => ["office", "business-admin", "sales", "stem"].includes(tag));
          const routeTitleStage = usingKoreaRoute
            ? koreaTitleStage
            : hasResolvedCanadaOccupation(answers)
              ? canadaTitleStage
              : null;
          const titleLensLines = [];
          let badge = "직무 축 확인";
          let tone = "neutral";
          let summary = routeLabel + " 기준으로 어느 stream이 열리는지 먼저 비교해야 합니다.";
          let primaryRoute = insight.labelKo + "에서 맞는 stream 1개를 먼저 좁히기";
          let fallbackRoute = "직접 연결이 약하면 같은 업종 안의 supervisor / skilled 직무 전환이나 학교 경유도 같이 봅니다.";
          let rankReasonKo = "현재 직무를 이 주 구조에 넣어봤을 때 완전히 동떨어지지는 않아요.";
          let scoreAdjustment = 0;

          if (routeTitleStage) {
            titleLensLines.push("현재 주력 title 단계: " + routeTitleStage.label);
            titleLensLines.push("현재 주력 title 메모: " + routeTitleStage.reason);
          }

          if (canadaInference) {
            titleLensLines.push('캐나다 title "' + answers.canadaJobTitle + '"로는 ' + canadaInference.labels.join(" / ") + " 쪽 후보를 먼저 비교할 수 있어요.");
          }

          if (koreaInference) {
            titleLensLines.push('한국 title "' + answers.koreaJobTitle + '"로는 ' + koreaInference.labels.join(" / ") + " 쪽 후보를 먼저 비교할 수 있어요.");
          }

          if (insight.id === "federal") {
            if (getOccupationSkillBand(routeOccupationId) === "skilled" && (hasCurrentCanadaSkill || usingKoreaRoute || answers.foreignExp !== "0")) {
              badge = "연방 skilled 축";
              tone = "positive";
              summary = routeLabel + "은 연방 EE/CEC에서 대체로 skilled 축으로 바로 비교할 수 있는 편입니다.";
              primaryRoute = "CRS 점수 + category-based selection + CEC/FSW 자격 같이 보기";
              fallbackRoute = "점수가 약하면 CLB 9, 캐나다 skilled 경력 추가, EE-linked nomination을 같이 계산합니다.";
              rankReasonKo = routeLabel + "을 연방 EE skilled 축으로 바로 비교할 수 있어요.";
              scoreAdjustment = 2;
            } else if (getOccupationSkillBand(routeOccupationId) === "entry") {
              badge = "연방 direct 약함";
              tone = "negative";
              summary = routeLabel + "은 연방 EE/CEC 기준으로는 직접 연결이 약한 편이라, 직무 전환이나 한국 경력 축 재정리가 더 중요합니다.";
              primaryRoute = "현재 role 그대로보다 supervisor / skilled 전환 또는 한국 경력 축 정리";
              fallbackRoute = canUseKoreaSkilled
                ? "한국 경력을 primary occupation으로 다시 잡아 EE를 비교해 볼 수 있습니다."
                : "그게 아니면 학교 -> PGWP -> skilled 경력 1년 경유가 더 현실적일 수 있습니다.";
              rankReasonKo = "현재 직무 title 그대로는 연방 EE skilled로 읽히기 약해요.";
              scoreAdjustment = -3;
            } else {
              badge = "연방 NOC 확인";
              tone = "neutral";
              summary = routeLabel + "은 duties를 어떻게 쓰느냐에 따라 연방 skilled 여부가 갈릴 수 있어 NOC를 먼저 좁혀야 합니다.";
              primaryRoute = "현재 job title보다 실제 duties 기준으로 NOC 재확인";
              fallbackRoute = "애매하면 같은 업종 안에서 coordinator / supervisor / technician급으로 올리는 게 더 안전합니다.";
              rankReasonKo = "이 직무는 연방 기준으로 NOC를 더 좁혀야 판단이 선명해집니다.";
              scoreAdjustment = 0;
            }

            return {
              badge,
              tone,
              summary,
              primaryRoute,
              fallbackRoute,
              rankReasonKo,
              scoreAdjustment,
              nocExamples,
              candidateProfiles,
              federalReadiness: getOccupationFederalReadiness(routeOccupationId),
              titleLensLines
            };
          }

          if (insight.id === "ontario") {
            if (isHealth || routeOccupationId === "caregiver-psw" || routeOccupationId === "warehouse-logistics") {
              badge = "예외 stream 확인";
              tone = "positive";
              summary = routeLabel + "은 온타리오에서는 일반 점수형보다 Employer Job Offer 또는 In-Demand Skills 예외 stream부터 확인하는 편이 현실적입니다.";
              primaryRoute = "Employer Job Offer / In-Demand Skills / targeted NOI";
              fallbackRoute = "NOC가 목록에 안 맞으면 같은 업종 안에서 supervisor·technician·regulated 경로로 올리는 게 좋습니다.";
              rankReasonKo = "온타리오 예외 stream이나 targeted 직군과 비교해 볼 수 있어요.";
              scoreAdjustment = 2;
            } else if (isBusiness || isTrades || isTransport) {
              badge = "도시형 취업 경로";
              tone = "positive";
              summary = routeLabel + "은 온타리오에서 Employer Job Offer 또는 EE NOI 쪽과 같이 읽는 편이 맞습니다.";
              primaryRoute = "Employer Job Offer / EE NOI / local skilled work";
              fallbackRoute = "job title이 broad하면 coordinator·lead·specialist duties로 더 좁혀야 읽히기 쉬워집니다.";
              rankReasonKo = "온타리오 대도시 취업형 또는 EE NOl 쪽과 연결할 수 있는 직무예요.";
              scoreAdjustment = 2;
            } else if (isServiceEntry || routeOccupationId === "server-counter") {
              badge = "직접 연결 약함";
              tone = "negative";
              summary = routeLabel + "은 온타리오에서 그대로는 약할 수 있어, supervisor 전환이나 학교 -> PGWP 경유가 더 현실적입니다.";
              primaryRoute = "food service supervisor / retail supervisor / school route";
              fallbackRoute = "현재 직무 그대로보다 같은 업종 안에서 한 단계 위 title을 만드는 쪽이 중요합니다.";
              rankReasonKo = "온타리오에서는 현재 role 그대로보다 직무 업그레이드가 더 중요합니다.";
              scoreAdjustment = -3;
            }
          } else if (insight.id === "alberta") {
            if (isHospitality) {
              badge = "알버타 hospitality";
              tone = "positive";
              summary = routeLabel + "은 알버타에서 hospitality worker, local employer, rural 연결과 함께 볼 때 현실성이 올라갑니다.";
              primaryRoute = "Tourism and Hospitality / worker streams / Rural Renewal";
              fallbackRoute = canadaIsNonSkilled
                ? "server·counter 쪽이면 supervisor·cook 쪽으로 올리거나 지역 employer 연결이 중요합니다."
                : "고용주와 지역 커뮤니티 연결을 붙이면 더 강해집니다.";
              rankReasonKo = "알버타는 hospitality 쪽을 예외적으로 같이 볼 수 있는 편이에요.";
              scoreAdjustment = routeOccupationId === "server-counter" ? 1 : 3;
            } else if (isTrades || isTransport || routeOccupationId === "mechanic-technician") {
              badge = "worker / rural 강함";
              tone = "positive";
              summary = routeLabel + "은 알버타 worker EOI, priority sector, Rural Renewal과 비교하기 좋은 직무군입니다.";
              primaryRoute = "worker EOI / priority sector / Rural Renewal";
              fallbackRoute = "trade certification, local employer, community endorsement를 같이 준비하면 더 현실적입니다.";
              rankReasonKo = "알버타에서 실제 worker / rural 쪽으로 잘 읽히는 직무예요.";
              scoreAdjustment = 3;
            } else if (isBusiness || isHealth || isEducation) {
              badge = "worker EOI";
              tone = "neutral";
              summary = routeLabel + "은 알버타 worker EOI 또는 local employer 연결과 같이 봐야 합니다.";
              primaryRoute = "worker EOI / employer connection";
              fallbackRoute = "직군 타깃이 약하면 지역 커뮤니티나 학교·현지경력 경유를 같이 봅니다.";
              rankReasonKo = "알버타에서 worker EOI와 같이 비교할 수 있는 직무예요.";
              scoreAdjustment = 1;
            } else if (isServiceEntry) {
              badge = "전환 먼저";
              tone = "negative";
              summary = routeLabel + "은 알버타에서도 바로 PR보다 supervisor 전환 또는 지역 고용주 연결이 먼저일 수 있습니다.";
              primaryRoute = "regional employer / hospitality exception / supervisor pivot";
              fallbackRoute = "직무 전환이 어렵다면 학교 -> PGWP 경유가 더 선명할 수 있습니다.";
              rankReasonKo = "알버타에서도 현재 role 그대로보다 직무 전환이 먼저일 수 있어요.";
              scoreAdjustment = -2;
            }
          } else if (insight.id === "nova-scotia") {
            if (isHealth || isEducation || isTrades || isTransport) {
              badge = "타깃 초청형";
              tone = "positive";
              summary = routeLabel + "은 노바스코샤에서 targeted stream, category, local employer 연결과 같이 읽기 좋습니다.";
              primaryRoute = "targeted invitation / occupation-based stream / local experience";
              fallbackRoute = "지역 정착 의사를 열어두면 더 현실적인 케이스가 많습니다.";
              rankReasonKo = "노바스코샤의 타깃 초청 구조와 비교하기 좋은 직무예요.";
              scoreAdjustment = 2;
            } else if (isBusiness || isHospitality) {
              badge = "고용주 / AIP";
              tone = "neutral";
              summary = routeLabel + "은 노바스코샤 local employer나 AIP, local experience 쪽과 같이 보는 편이 맞습니다.";
              primaryRoute = "AIP / local employer / local experience";
              fallbackRoute = "직접 약하면 같은 업종 안에서 supervisor·lead로 올리거나 지역 정착까지 여는 게 좋습니다.";
              rankReasonKo = "노바스코샤에서는 employer-driven 또는 local experience와 같이 봐야 합니다.";
              scoreAdjustment = 1;
            } else if (isServiceEntry) {
              badge = "학교/전환 권장";
              tone = "negative";
              summary = routeLabel + "은 노바스코샤에서도 현재 role 그대로보다 supervisor 전환이나 학교 경유가 더 현실적일 수 있습니다.";
              primaryRoute = "school -> PGWP / supervisor pivot / AIP employer";
              fallbackRoute = "같은 업종 안에서 leader급으로 올리거나 지역 employer를 먼저 찾는 게 좋습니다.";
              rankReasonKo = "노바스코샤에서는 현재 role 그대로로는 약할 수 있어요.";
              scoreAdjustment = -2;
            }
          } else if (insight.id === "prince-edward-island") {
            if (isHospitality || isHealth || isTransport || routeTags.includes("supervisor")) {
              badge = "EOI + 고용주형";
              tone = "positive";
              summary = routeLabel + "은 PEI에서 노동시장 우선순위 + 고용주 연결 + EOI로 읽히는 편입니다.";
              primaryRoute = "EOI + labour market priority + employer connection";
              fallbackRoute = "도시만 고집하기보다 지역 정착 의사와 employer 연결을 같이 보여주는 게 중요합니다.";
              rankReasonKo = "PEI는 현재 직무와 고용주 연결을 같이 볼 때 현실성이 올라갑니다.";
              scoreAdjustment = 2;
            } else if (isBusiness || isTrades) {
              badge = "EOI 비교 가능";
              tone = "neutral";
              summary = routeLabel + "은 PEI EOI에서 직군 우선순위와 employer 연결을 같이 확인해야 합니다.";
              primaryRoute = "EOI + employer / EE-linked";
              fallbackRoute = "직군 우선순위가 약하면 Atlantic employer-driven 경로도 같이 검토하는 게 좋습니다.";
              rankReasonKo = "PEI EOI와 employer 연결형으로 비교할 수 있어요.";
              scoreAdjustment = 1;
            } else if (isServiceEntry) {
              badge = "고용주/업그레이드";
              tone = "negative";
              summary = routeLabel + "은 PEI에서도 현재 role 그대로보다 supervisor·cook 전환이나 employer 연결이 먼저일 수 있습니다.";
              primaryRoute = "employer-driven + title upgrade";
              fallbackRoute = "직접 안 되면 Atlantic school / PGWP / employer route를 같이 보세요.";
              rankReasonKo = "PEI에서는 현재 role 그대로보다 업그레이드가 더 중요합니다.";
              scoreAdjustment = -2;
            }
          } else if (insight.id === "saskatchewan") {
            if (isTrades || isTransport || isHealth || routeOccupationId === "cook-chef" || routeOccupationId === "food-service-supervisor") {
              badge = "경로형 적합";
              tone = "positive";
              summary = routeLabel + "은 사스카츄완에서 occupation / pathway 자격과 연결해 보기 좋은 편입니다.";
              primaryRoute = "worker / occupation / regional pathway";
              fallbackRoute = "현지 고용주 또는 지역 연결이 있으면 더 강해집니다.";
              rankReasonKo = "사스카츄완의 pathway 자격과 비교하기 좋은 직무예요.";
              scoreAdjustment = 2;
            } else if (isServiceEntry || routeOccupationId === "retail-sales") {
              badge = "직접 약함";
              tone = "negative";
              summary = routeLabel + "은 사스카츄완에서도 현재 role 그대로보다 supervisor·trade·school 경유가 더 현실적일 수 있습니다.";
              primaryRoute = "title upgrade / school / regional employer";
              fallbackRoute = canUseKoreaSkilled
                ? "현재 캐나다 role보다 한국 경력 축으로 다시 짜는 방법도 같이 보세요."
                : "직무 업그레이드가 어렵다면 학교 -> PGWP 경유를 같이 보세요.";
              rankReasonKo = "사스카츄완에서도 현재 role 그대로로는 약할 수 있어요.";
              scoreAdjustment = -2;
            }
          } else if (insight.id === "manitoba") {
            if (hasCurrentCanadaSkill || isHealth || isTrades || isTransport) {
              badge = "현지 연결형";
              tone = "positive";
              summary = routeLabel + "은 매니토바 local connection, employer, local work history와 연결할 때 현실성이 올라갑니다.";
              primaryRoute = "local connection / employer / local work history";
              fallbackRoute = "직접 연결이 약하면 학교나 지역 고용주 축을 같이 붙이는 게 좋습니다.";
              rankReasonKo = "매니토바는 현지 연결이 붙을수록 잘 읽히는 직무예요.";
              scoreAdjustment = 2;
            } else if (isServiceEntry) {
              badge = "연결 먼저";
              tone = "negative";
              summary = routeLabel + "은 매니토바에서도 단순 role보다 지역 고용주나 학교 연결이 먼저 필요할 수 있습니다.";
              primaryRoute = "local employer / school / family or community connection";
              fallbackRoute = "같은 업종 안에서 supervisor·lead로 올라가면 다시 비교하기 쉬워집니다.";
              rankReasonKo = "매니토바는 직무보다 현지 연결이 먼저일 수 있어요.";
              scoreAdjustment = -1;
            }
          } else if (insight.id === "british-columbia") {
            if (routeTags.includes("stem") || isHealth || isTrades || isEducation) {
              badge = "타깃/등록점수형";
              tone = "positive";
              summary = routeLabel + "은 BC에서 registration score + targeted invitation 쪽과 비교하기 좋은 직무군입니다.";
              primaryRoute = "registration score + targeted invitation";
              fallbackRoute = "직군 타깃에 안 들어가면 local employer와 experience 축을 더 붙여야 합니다.";
              rankReasonKo = "BC의 타깃 초청 구조와 잘 맞는 직무예요.";
              scoreAdjustment = 2;
            } else if (isBusiness || isTransport || routeOccupationId === "cook-chef") {
              badge = "등록점수 비교";
              tone = "neutral";
              summary = routeLabel + "은 BC registration score와 employer 연결을 같이 봐야 합니다.";
              primaryRoute = "registration score + employer / experience";
              fallbackRoute = "메트로 경쟁이 세면 지역까지 같이 열어보는 편이 좋습니다.";
              rankReasonKo = "BC에서는 점수와 고용주 연결을 같이 봐야 하는 직무예요.";
              scoreAdjustment = 1;
            } else if (isServiceEntry) {
              badge = "전환 권장";
              tone = "negative";
              summary = routeLabel + "은 BC에서도 현재 role 그대로보다 supervisor 전환이나 학교 경유가 더 현실적입니다.";
              primaryRoute = "title upgrade / school / employer pivot";
              fallbackRoute = "같은 업종 안에서 skilled로 읽히는 title을 먼저 만드는 게 중요합니다.";
              rankReasonKo = "BC에서는 현재 role 그대로보다 전환이 더 중요해요.";
              scoreAdjustment = -2;
            }
          } else if (isAtlanticProvinceId(insight.id)) {
            if (answers.jobOffer === "yes" || isHospitality || isHealth || isTrades || isTransport) {
              badge = "employer-driven";
              tone = "positive";
              summary = routeLabel + "은 이 지역에서 AIP 또는 local employer-driven 경로와 같이 보는 편이 맞습니다.";
              primaryRoute = "AIP / local employer / local work";
              fallbackRoute = "지역 정착 의사와 employer 연결을 함께 보여주면 훨씬 현실적입니다.";
              rankReasonKo = "대서양권은 employer-driven으로 읽기 좋은 직무예요.";
              scoreAdjustment = 2;
            } else if (isServiceEntry) {
              badge = "고용주 먼저";
              tone = "negative";
              summary = routeLabel + "은 대서양권에서도 designated employer나 title upgrade가 없으면 바로는 약할 수 있습니다.";
              primaryRoute = "designated employer + title upgrade";
              fallbackRoute = "학교 -> 졸업자 또는 supervisor / cook 전환을 같이 봐야 합니다.";
              rankReasonKo = "대서양권도 현재 role 그대로보다 employer와 title이 더 중요합니다.";
              scoreAdjustment = -2;
            }
          }

          if (usingKoreaRoute && canUseKoreaSkilled) {
            badge = badge === "직무 축 확인" ? "한국 경력 축" : badge;
            summary = "이 주는 현재 캐나다 role보다 한국 " + routeMeta.labelKo + " 경력 축으로 읽는 편이 더 현실적입니다. " + summary;
            fallbackRoute = "현재 캐나다 일은 보조 축으로 두고, 한국 경력 NOC와 job duties를 primary occupation 기준으로 정리합니다.";
            rankReasonKo = "한국 경력 축으로 다시 짜면 이 주에서 더 선명하게 읽힐 수 있어요.";
            scoreAdjustment += 1;
          }

          if (canadaIsNonSkilled && statusSupports(insight.statuses.graduate) && !canUseKoreaSkilled && (isServiceEntry || routeTags.includes("mixed-skill"))) {
            badge = "학교 경유 가능";
            tone = "deferred";
            summary = routeLabel + "은 지금 바로보다, 이 주에서 학교 -> PGWP -> local skilled 경력으로 이어가는 플랜이 더 현실적일 수 있습니다.";
            primaryRoute = insight.labelKo + " 학교 / graduate / local experience";
            fallbackRoute = "학교를 가지 않는다면 supervisor·technician·coordinator급 전환을 같이 봐야 합니다.";
            rankReasonKo = "이 주는 학교 -> PGWP 플랜으로 읽는 게 더 현실적일 수 있어요.";
            scoreAdjustment = Math.min(scoreAdjustment, 0);
          }

          if (routeTitleStage && routeTitleStage.scoreAdjustment !== 0) {
            scoreAdjustment += routeTitleStage.scoreAdjustment;
            rankReasonKo = routeTitleStage.reason + " " + rankReasonKo;
          }

          return {
            badge,
            tone,
            summary,
            primaryRoute,
            fallbackRoute,
            rankReasonKo,
            scoreAdjustment,
            nocExamples,
            candidateProfiles,
            federalReadiness: getOccupationFederalReadiness(routeOccupationId),
            titleLensLines
          };
        }

        function occupationHasTag(answers, tag) {
          return getActiveOccupationMeta(answers).tags.includes(tag);
        }

        function occupationHasAnyTag(answers, tags) {
          return tags.some((tag) => occupationHasTag(answers, tag));
        }

        function isAtlanticProvinceId(provinceId) {
          return ["new-brunswick", "prince-edward-island", "nova-scotia", "newfoundland-and-labrador"].includes(provinceId);
        }

        function getOccupationPivotLabel(answers, insight) {
          if (answers.targetOccupationPlan === "current-canada-job" && hasResolvedCanadaOccupation(answers)) {
            return getCanadaOccupationMeta(answers).pivotKo;
          }

          if (answers.targetOccupationPlan === "previous-korea-job" && hasResolvedKoreaOccupation(answers)) {
            return getKoreaOccupationMeta(answers).pivotKo;
          }

          if (occupationHasTag(answers, "service-entry") && statusSupports(insight.statuses.jobOffer)) {
            return "현장 서비스직보다 supervisor·cook·coordinator급";
          }

          return getActiveOccupationMeta(answers).pivotKo;
        }

        function buildOccupationContextSummary(answers) {
          const anchorGuidance = buildOccupationAnchorGuidance(answers);
          const parts = [];

          if (anchorGuidance.summary) {
            parts.push(anchorGuidance.summary);
          }

          if (anchorGuidance.detail) {
            parts.push(anchorGuidance.detail);
          }

          if (parts.length === 0) {
            return "직무 축을 아직 좁히지 못했어요.";
          }

          return parts.join(" · ");
        }

        function getOccupationSkillBandExplanation(occupation) {
          switch (getOccupationSkillBand(occupation)) {
            case "skilled":
              return "대체로 skilled 축으로 바로 비교 가능";
            case "entry":
              return "현재 title 그대로는 non-skilled 가능성이 큼";
            default:
              return "NOC와 주별 예외 stream을 같이 확인해야 함";
          }
        }

        function buildTitleInterpretationEntries(answers) {
          const entries = [];

          function pushEntry(side) {
            const isKoreaSide = side === "korea";
            const title = (isKoreaSide ? answers.koreaJobTitle : answers.canadaJobTitle) || "";
            const selectedOccupation = isKoreaSide ? answers.koreaOccupation : answers.canadaOccupation;

            if (!title && !hasOccupationSelection(selectedOccupation)) {
              return;
            }

            const resolvedOccupation = resolveOccupationId(selectedOccupation, title);

            if (!hasOccupationSelection(resolvedOccupation)) {
              return;
            }

            const meta = getOccupationMeta(resolvedOccupation);
            const profiles = getOccupationCandidateProfiles(resolvedOccupation).slice(0, 3);
            const upgradeTarget = profiles.find((profile) => /전환 목표|업그레이드 후보|한 단계 업그레이드/.test(profile.note)) || profiles[0];
            const inferredByTitle = getOccupationInferenceSummary(selectedOccupation, title);
            const titleStage = getOccupationTitleStage(resolvedOccupation, title);
            const isAnchor = isKoreaSide
              ? ["previous-korea-job", "degree-field"].includes(answers.targetOccupationPlan)
              : answers.targetOccupationPlan === "current-canada-job";

            entries.push({
              sideLabel: isKoreaSide ? "한국 경력" : "캐나다 현재 직무",
              heading: title || meta.labelKo,
              summary: title
                ? ('"' + title + '"는 지금 ' + meta.labelKo + " 축으로 읽고 있어요.")
                : (meta.labelKo + " 축으로 읽고 있어요."),
              metaLabel: meta.labelKo,
              bandLabel: getOccupationSkillBandExplanation(resolvedOccupation),
              candidateLine: profiles.map((profile) => profile.label + " (" + profile.teer + ")").join(" / "),
              targetLine: upgradeTarget
                ? (upgradeTarget.label + " 쪽이 이민용으로 더 유리할 수 있어요.")
                : "현재 title 그대로 밀 수 있는지 먼저 확인합니다.",
              inferredLine: inferredByTitle ? inferredByTitle.labels.join(" / ") : meta.labelKo,
              titleStageLabel: titleStage.label,
              titleStageReason: titleStage.reason,
              isAnchor
            });
          }

          pushEntry("korea");
          pushEntry("canada");

          return entries;
        }

        function buildOccupationAnchorGuidance(answers) {
          const hasKoreaOccupation = hasResolvedKoreaOccupation(answers);
          const hasCanadaOccupation = hasResolvedCanadaOccupation(answers);
          const koreaMeta = getKoreaOccupationMeta(answers);
          const canadaMeta = getCanadaOccupationMeta(answers);
          const koreaTitleStage = getKoreaOccupationTitleStage(answers);
          const canadaTitleStage = getCanadaOccupationTitleStage(answers);
          const hasCanadaSkilled = hasCanadaOccupation && hasSkilledCanadianTrack(answers) && answers.canadianExp !== "0";
          const canUseKoreaSkilled = hasKoreaOccupation && answers.foreignExp !== "0" && answers.foreignExpAlignment !== "unrelated";
          const canadaNonSkilled = answers.canadianJobSkill === "non-skilled";

          if (answers.targetOccupationPlan === "current-canada-job" && hasCanadaOccupation) {
            return {
              anchorLabel: "캐나다 현재 직무 축",
              summary: "지금은 캐나다 현재 직무 축을 주력으로 보는 쪽이 맞아요.",
              detail: canadaNonSkilled
                ? canadaMeta.labelKo + "은 그대로보다 " + getOccupationPlannerFocus(resolveOccupationId(answers.canadaOccupation, answers.canadaJobTitle)).transitionTarget + "로 올라가는 플랜을 같이 봐야 해요."
                : (canadaTitleStage && canadaTitleStage.scoreAdjustment < 0
                    ? canadaTitleStage.reason + " 그래서 현재 직무 축을 쓰더라도 전환 플랜을 같이 보여주는 게 좋아요."
                    : canadaMeta.labelKo + " 경력을 이민용 주력 축으로 설명할 수 있어요.")
            };
          }

          if (answers.targetOccupationPlan === "previous-korea-job" && hasKoreaOccupation) {
            return {
              anchorLabel: "한국 경력 축",
              summary: "지금은 한국 경력 축을 주력으로 보는 쪽이 맞아요.",
              detail: canUseKoreaSkilled
                ? koreaMeta.labelKo + " 경력을 primary occupation으로 다시 정리하면 설명이 더 선명해질 수 있어요."
                : koreaMeta.labelKo + " 경력은 있지만 NOC와 job duties 정리를 더 해야 해요."
            };
          }

          if (hasCanadaSkilled && !canadaNonSkilled && (!canadaTitleStage || canadaTitleStage.scoreAdjustment >= 0)) {
            return {
              anchorLabel: "캐나다 현재 직무 축",
              summary: "현재는 캐나다 현재 직무 축이 가장 자연스러워요.",
              detail: canadaMeta.labelKo + " 경력이 이미 skilled 축이라 EE와 주정부 둘 다 여기서 출발하기 좋아요."
            };
          }

          if (canUseKoreaSkilled && (canadaNonSkilled || !hasCanadaSkilled || (canadaTitleStage && canadaTitleStage.scoreAdjustment < 0))) {
            return {
              anchorLabel: "한국 경력 축",
              summary: "현재 캐나다 일보다 한국 경력 축이 더 유리해 보여요.",
              detail: koreaMeta.labelKo + " 경력을 primary occupation으로 두고, 현재 캐나다 일은 보조 축으로 설명하는 편이 더 현실적일 수 있어요."
            };
          }

          if ((canadaNonSkilled || (canadaTitleStage && canadaTitleStage.scoreAdjustment < 0)) && hasCanadaOccupation) {
            const plannerFocus = getOccupationPlannerFocus(resolveOccupationId(answers.canadaOccupation, answers.canadaJobTitle));
            return {
              anchorLabel: "전환/학교 축",
              summary: "지금 직무 그대로보다 전환이나 학교 경유를 먼저 보는 편이 맞아요.",
              detail: (canadaTitleStage && canadaTitleStage.scoreAdjustment < 0 ? canadaTitleStage.reason + " " : "")
                + canadaMeta.labelKo + "은 보통 그대로보다 " + plannerFocus.transitionTarget + " 또는 " + plannerFocus.schoolTrack + " 쪽이 더 현실적이에요."
            };
          }

          if (hasCanadaOccupation || hasKoreaOccupation) {
            return {
              anchorLabel: "비교 진행 중",
              summary: "한국 경력과 캐나다 현재 직무 중 어느 축이 더 유리한지 계속 비교하는 단계예요.",
              detail: "job title, duties, NOC를 조금 더 구체적으로 넣으면 주력 축이 더 분명해집니다."
            };
          }

          return {
            anchorLabel: "직무 축 미정",
            summary: "직무 축을 아직 좁히지 못했어요.",
            detail: "한국과 캐나다 job title을 더 구체적으로 적으면 주력 경력 축을 바로 제안할 수 있어요."
          };
        }

        function renderTitleInterpretationSection(answers) {
          const entries = buildTitleInterpretationEntries(answers);
          const anchorGuidance = buildOccupationAnchorGuidance(answers);

          if (entries.length === 0) {
            return "";
          }

          return [
            '<section class="title-interpretation-panel">',
            '<div class="selection-model-head">',
            '<strong>입력한 직무를 이렇게 읽고 있어요</strong>',
            '<span class="selection-model-badge">job title 해석</span>',
            '</div>',
            '<p class="wizard-freshness">지금 주력으로 보기: '
              + escapeHtmlClient(anchorGuidance.anchorLabel)
              + " · "
              + escapeHtmlClient(anchorGuidance.summary)
              + (anchorGuidance.detail ? " · " + escapeHtmlClient(anchorGuidance.detail) : "")
              + '</p>',
            '<div class="title-interpretation-grid">',
            entries.map((entry) => [
              '<article class="title-interpretation-card">',
              '<div class="plan-variant-topline">',
              '<span class="compare-pill">' + escapeHtmlClient(entry.sideLabel) + '</span>',
              entry.isAnchor ? '<span class="plan-variant-highlight">현재 주력 축</span>' : '',
              '</div>',
              '<strong>' + escapeHtmlClient(entry.heading) + '</strong>',
              '<p>' + escapeHtmlClient(entry.summary) + '</p>',
              '<ul class="reason-list">',
              '<li>현재 해석: ' + escapeHtmlClient(entry.metaLabel) + '</li>',
              '<li>title 후보: ' + escapeHtmlClient(entry.inferredLine) + '</li>',
              '<li>title 단계: ' + escapeHtmlClient(entry.titleStageLabel) + '</li>',
              '<li>title 해석 메모: ' + escapeHtmlClient(entry.titleStageReason) + '</li>',
              '<li>직무 상태: ' + escapeHtmlClient(entry.bandLabel) + '</li>',
              '<li>주요 후보: ' + escapeHtmlClient(entry.candidateLine) + '</li>',
              '<li>더 유리한 방향: ' + escapeHtmlClient(entry.targetLine) + '</li>',
              '</ul>',
              '</article>'
            ].join("")).join(""),
            '</div>',
            '</section>'
          ].join("");
        }

        function getStudyPlanLabel(insight) {
          if (insight.id === "ontario") {
            return "온타리오에서 PGWP 가능한 학위·졸업자 경로";
          }
          if (insight.id === "british-columbia") {
            return "BC에서 학위 후 현지경력 연결";
          }
          if (insight.id === "alberta") {
            return "알버타에서 학위 후 현지경력 연결";
          }
          return insight.labelKo + "에서 졸업자·현지경력 경로";
        }

        function buildAlternativePlans(answers, insight) {
          const plans = [];
          const routeOccupationId = getPrimaryOccupationId(answers);
          const routeMeta = getOccupationMeta(routeOccupationId);
          const canadaOccupationId = resolveOccupationId(answers.canadaOccupation, answers.canadaJobTitle);
          const canadaMeta = getCanadaOccupationMeta(answers);
          const koreaMeta = getKoreaOccupationMeta(answers);
          const occupationLens = buildProvinceOccupationLens(answers, insight);
          const plannerFocus = getOccupationPlannerFocus(hasResolvedCanadaOccupation(answers) ? canadaOccupationId : routeOccupationId);
          const canUseKoreaSkilled = hasResolvedKoreaOccupation(answers) && answers.foreignExp !== "0" && answers.foreignExpAlignment !== "unrelated";
          const canadaIsNonSkilled = answers.canadianJobSkill === "non-skilled";
          const needsTitleUpgrade = canadaTitleNeedsUpgrade(answers);
          const routeTags = routeMeta.tags;

          function addPlan(priority, plan) {
            plans.push({ priority, ...plan });
          }

          const eeStreamNames = getTaggedStreamNames(insight, "EE 연계");
          const frenchStreamNames = getTaggedStreamNames(insight, "프랑스어");
          const graduateStreamNames = getTaggedStreamNames(insight, "졸업자");
          const jobOfferStreamNames = getTaggedStreamNames(insight, "잡오퍼");
          const regionalStreamNames = getTaggedStreamNames(insight, "지역/커뮤니티");
          const healthStreamNames = getTaggedStreamNames(insight, "보건");
          const tradeStreamNames = getTaggedStreamNames(insight, "기술직");

          if ((canadaIsNonSkilled || needsTitleUpgrade) && hasResolvedCanadaOccupation(answers)) {
            addPlan(12, {
              type: "전환형",
              title: "같은 업종 안에서 " + plannerFocus.transitionTarget + "로 올리는 플랜",
              highlight: plannerFocus.transitionTarget,
              summary: (needsTitleUpgrade ? "현재 title 해석상 direct가 약해서, " : "") + plannerFocus.transitionSummary,
              streamLine: "같이 볼 경로: " + buildProvinceSpecificPlanLabel(answers, insight),
              steps: [
                "현재 " + canadaMeta.labelKo + "에서 실제로 맡는 duty 중 leader·coordinator·cook·supervisor 성격을 먼저 정리합니다.",
                plannerFocus.transitionTarget + " 쪽 job title로 옮긴 뒤, " + insight.labelKo + "에서 " + occupationLens.primaryRoute + "와 맞는지 다시 계산합니다.",
                statusSupports(insight.statuses.graduate)
                  ? "전환이 어렵다면 " + plannerFocus.schoolTrack + " 경로도 같이 열어둡니다."
                  : "전환 후 6-12개월 경력 또는 잡오퍼를 붙여 다시 비교합니다."
              ]
            });
          }

          if (canUseKoreaSkilled && canadaIsNonSkilled) {
            addPlan(11, {
              type: "한국경력형",
              title: "한국 " + koreaMeta.labelKo + " 경력으로 다시 짜는 플랜",
              highlight: "primary occupation 재정리",
              summary: "현재 캐나다 일보다 한국 경력 축이 더 깔끔하면, 이민 설명의 주력 축을 한국 경력으로 다시 잡는 편이 더 현실적일 수 있습니다.",
              streamLine: "같이 볼 경로: " + occupationLens.primaryRoute,
              steps: [
                "한국 " + koreaMeta.labelKo + " 경력의 NOC와 job duties를 primary occupation 기준으로 다시 정리합니다.",
                "현재 캐나다 일은 보조 축으로 두고, " + insight.labelKo + "에서 한국 경력으로 읽히는 stream부터 다시 좁힙니다.",
                "그 위에 언어점수, 고용주 연결, nomination 가능성을 얹어 다시 계산합니다."
              ]
            });
          }

          if (["caregiver-psw", "warehouse-logistics"].includes(routeOccupationId)) {
            const exceptionTrack = insight.id === "ontario"
              ? "In-Demand Skills / Employer Job Offer"
              : isAtlanticProvinceId(insight.id)
                ? "AIP / designated employer"
                : buildProvinceSpecificPlanLabel(answers, insight);
            addPlan(10, {
              type: "예외형",
              title: "점수형보다 예외 stream부터 확인하는 플랜",
              highlight: exceptionTrack,
              summary: routeOccupationId === "caregiver-psw"
                ? "PSW·caregiver는 연방 direct보다 주정부 예외 stream이나 employer-driven 경로에서 먼저 풀리는 경우가 많습니다."
                : "warehouse·logistics는 role 자체보다 In-Demand Skills, local employer, dispatcher·coordinator 전환을 함께 보는 편이 더 현실적입니다.",
              streamLine: "같이 볼 경로: " + exceptionTrack,
              steps: [
                "현재 NOC가 " + exceptionTrack + "와 맞는지 먼저 확인합니다.",
                "직접 안 맞으면 " + plannerFocus.transitionTarget + "로 옮기는 플랜을 같이 둡니다.",
                "예외 stream과 직무 전환 중 어느 쪽이 더 빠른지 6-12개월 기준으로 비교합니다."
              ]
            });
          }

          if (answers.setting === "metro" && routeTags.some((tag) => ["office", "business-admin", "sales", "stem"].includes(tag))) {
            addPlan(9, {
              type: "도시형",
              title: "대도시형 취업 플랜",
              highlight: routeMeta.pivotKo,
              summary: "이 직군은 메트로 노동시장, local employer, EE/NOI 연계가 붙는 쪽이 훨씬 자연스럽습니다.",
              streamLine: "같이 볼 경로: " + buildProvinceSpecificPlanLabel(answers, insight),
              steps: [
                "현재 title보다 실제 duties가 coordinator / administrator / specialist 쪽으로 읽히는지 먼저 확인합니다.",
                "대도시 고용시장 기준으로 employer job offer 또는 EE-linked stream을 같이 봅니다.",
                "job title이 broad하면 " + plannerFocus.transitionTarget + "처럼 더 선명한 title로 좁혀 다시 계산합니다."
              ]
            });
          }

          if (["cook-chef", "food-service-supervisor"].includes(routeOccupationId)) {
            addPlan(9, {
              type: "현직유지형",
              title: "현재 직무를 그대로 살리는 플랜",
              highlight: plannerFocus.transitionTarget,
              summary: plannerFocus.transitionSummary,
              streamLine: "같이 볼 경로: " + buildProvinceSpecificPlanLabel(answers, insight),
              steps: [
                "현재 job title, duty, 팀 관리 범위를 서류상으로 더 선명하게 정리합니다.",
                "현재 고용주 또는 지역 employer 연결을 이 주 stream 조건에 맞게 다시 묶습니다.",
                "언어점수와 EE-linked nomination은 보조 축으로 같이 계산합니다."
              ]
            });
          }

          if ((insight.id === "federal" || statusSupports(insight.statuses.ee)) && (answers.english !== "clb9plus" || answers.ee !== "yes")) {
            addPlan(10, {
              type: "점수형",
              title: "영어·EE 점수 플랜",
              highlight: (describeReferenceScoreImpact(answers, "language-clb9") || "변화 확인") + " · " + getEnglishUpgradeTarget(answers),
              summary: "영어를 CLB 9 이상으로 맞추고 EE 프로필까지 열어두면 연방과 EE-linked 주정부를 같이 노릴 수 있는 플랜입니다.",
              streamLine: eeStreamNames.length > 0
                ? "같이 볼 경로: " + eeStreamNames.join(" / ")
                : "같이 볼 경로: Express Entry 또는 EE-linked stream",
              steps: [
                "IELTS/CELPIP를 다시 준비해 " + getEnglishUpgradeTarget(answers) + " 구간을 목표로 합니다.",
                answers.ee === "yes"
                  ? "EE 프로필을 최신 경력·학력·언어 기준으로 바로 업데이트합니다."
                  : "EE 자격을 확인하고 프로필을 열어 점수형 경로를 같이 둡니다.",
                eeStreamNames.length > 0
                  ? "이 지역에서는 " + eeStreamNames.join(" / ") + "처럼 EE와 연결되는 stream을 같이 봅니다."
                  : "연방 초청 라운드와 EE-linked nomination 기회를 같이 추적합니다."
              ]
            });
          }

          if (insight.id === "federal" || statusSupports(insight.statuses.french)) {
            addPlan(8, {
              type: "불어형",
              title: "불어 점수 플랜",
              highlight: (describeReferenceScoreImpact(answers, "french") || "변화 확인") + " · NCLC 7+",
              summary: "불어 점수를 추가로 만들면 연방 EE와 일부 불어 중심 주정부 경로에서 생각보다 큰 차이를 만들 수 있습니다.",
              streamLine: frenchStreamNames.length > 0
                ? "같이 볼 경로: " + frenchStreamNames.join(" / ")
                : "같이 볼 경로: French category 또는 francophone stream",
              steps: [
                "TEF Canada 또는 TCF Canada 준비를 시작하고 NCLC 7 이상, 가능하면 8-9 구간을 목표로 둡니다.",
                "영어 점수와 함께 불어 점수표를 만들어 EE 프로필이나 불어 stream 비교에 바로 넣습니다.",
                frenchStreamNames.length > 0
                  ? frenchStreamNames.join(" / ") + " 같은 불어 경로를 같이 검토합니다."
                  : "연방 French category, francophone pilot, 불어 우대 stream을 같이 검토합니다."
              ]
            });
          }

          if (statusSupports(insight.statuses.jobOffer) || statusSupports(insight.statuses.health) || statusSupports(insight.statuses.trades)) {
            const focusStreams = healthStreamNames.length > 0
              ? healthStreamNames
              : tradeStreamNames.length > 0
                ? tradeStreamNames
                : jobOfferStreamNames;
            const focusLabel = healthStreamNames.length > 0
              ? "보건직"
              : tradeStreamNames.length > 0
                ? "기술직"
                : "고용주 연결";
            const occupationPivot = getOccupationPivotLabel(answers, insight);

            addPlan(7, {
              type: "직무형",
              title: "직무·고용주 연결 플랜",
              highlight: focusLabel + " · " + occupationPivot,
              summary: "이 지역은 점수만 보는 곳이 아니라, 우선직군이나 고용주 연결이 붙을 때 실제 체감이 훨씬 좋아질 수 있습니다.",
              streamLine: focusStreams.length > 0
                ? "같이 볼 경로: " + focusStreams.join(" / ")
                : "같이 볼 경로: 우선직군 또는 고용주 연결형 stream",
              steps: [
                "지금 경력을 기준으로 " + occupationPivot + " 쪽 NOC 1개를 정하고, 그 NOC가 이 지역 우선직군과 맞는지 먼저 확인합니다.",
                statusSupports(insight.statuses.jobOffer)
                  ? "이 지역 고용주 오퍼를 붙이거나 현재 고용 연결을 지역 기준으로 다시 정리합니다."
                  : "이 지역에서 실제로 선호하는 sector·occupation 쪽으로 직무를 맞출 수 있는지 검토합니다.",
                focusStreams.length > 0
                  ? focusStreams.join(" / ") + " 중 어디가 가장 현실적인지 먼저 좁힙니다."
                  : "점수보다 직무, 고용주, 노동시장 타깃을 먼저 맞춥니다."
              ]
            });
          }

          if (statusSupports(insight.statuses.graduate)) {
            addPlan(6, {
              type: "학교형",
              title: "학교·졸업자 플랜",
              highlight: "학교 -> 졸업자",
              summary: "이 주에서 학교를 거쳐 졸업자/PGWP 경로로 들어가면, 바로 취업이민보다 더 선명한 루트가 나오는 경우가 있습니다.",
              streamLine: graduateStreamNames.length > 0
                ? "같이 볼 경로: " + graduateStreamNames.join(" / ")
                : "같이 볼 경로: graduate 또는 현지경력 stream",
              steps: [
                getStudyPlanLabel(insight) + "를 기준으로, PGWP 가능한 과정인지부터 먼저 확인합니다.",
                "학교를 간다면 학과보다도 졸업 후 남는 체류기간, 지역 고용시장, 현지경력 연결까지 같이 보고 고릅니다.",
                "졸업 후 PGWP 또는 현지 취업으로 1년 안팎 경력을 만들고, 이 주 졸업자 경로를 다시 계산합니다.",
                graduateStreamNames.length > 0
                  ? graduateStreamNames.join(" / ") + "처럼 학위 기반 경로를 중심으로 봅니다."
                  : "이 주의 graduate·local experience 경로를 중심으로 다시 봅니다."
              ]
            });
          }

          if (statusSupports(insight.statuses.regional) && answers.setting !== "regional") {
            addPlan(5, {
              type: "지역형",
              title: "지역 정착 플랜",
              highlight: "지역 열기",
              summary: "대도시만 보지 않고 이 주의 지역·커뮤니티 경로까지 열어두면 nomination 기회가 더 넓어질 수 있습니다.",
              streamLine: regionalStreamNames.length > 0
                ? "같이 볼 경로: " + regionalStreamNames.join(" / ")
                : "같이 볼 경로: rural/community 경로",
              steps: [
                "이 주 안에서도 커뮤니티 조건이 붙는 smaller city나 지역 경로가 있는지 먼저 확인합니다.",
                "지역 정착 의사, 고용주 연결, 커뮤니티 참여 조건을 같이 준비합니다.",
                regionalStreamNames.length > 0
                  ? regionalStreamNames.join(" / ") + " 같은 지역 경로를 병행 검토합니다."
                  : "지역 정착형 stream이나 community-driven 경로를 같이 검토합니다."
              ]
            });
          }

          return plans
            .sort((left, right) => right.priority - left.priority)
            .slice(0, 3);
        }

        function buildEligibilitySnapshot(answers, insight, guideBundle) {
          const evaluated = guideBundle.evaluated;
          const missing = evaluated.filter((criterion) => criterion.state === "missing");
          const partial = evaluated.filter((criterion) => criterion.state === "partial");
          const has = evaluated.filter((criterion) => criterion.state === "has");

          let badge = "조건 일부 확인 필요";
          let summary = "지금 당장 신청 여부보다, 이 주에서 어느 stream으로 갈지 먼저 좁히는 편이 좋아요.";

          if (missing.length === 0 && partial.length <= 1) {
            badge = "지금 바로 검토 가능";
            summary = "핵심 축은 이미 갖추고 있어 이 주의 맞는 stream을 바로 비교해 볼 수 있어요.";
          } else if (statusSupports(insight.statuses.graduate) && !has.some((criterion) => criterion.id === "local-graduate")) {
            badge = "학교·현지경력 경유가 자연스러움";
            summary = "지금 바로보다 학교 또는 졸업 후 현지경력 경로를 거쳐 들어가는 편이 더 자연스러워 보여요.";
          } else if ((statusSupports(insight.statuses.localExperience) || statusSupports(insight.statuses.ee)) && !hasSkilledCanadianTrack(answers)) {
            badge = "현지 skilled 경력 보완 필요";
            summary = "이 주는 현지 skilled 경력이나 EE-linked 연결이 붙을 때 훨씬 읽기 쉬운 구조예요.";
          } else if (missing.length >= 3) {
            badge = "준비 후 다시 계산";
            summary = "핵심 자격 몇 가지가 비어 있어, 지금은 준비를 먼저 하고 다시 계산하는 편이 정확해요.";
          }

          let nextTrack = "맞는 stream 선택 후 서류를 정리";

          if (statusSupports(insight.statuses.graduate) && !has.some((criterion) => criterion.id === "local-graduate")) {
            nextTrack = "학교 -> 졸업자 경로 -> 현지경력";
          } else if (["중심", "있음"].includes(insight.statuses.jobOffer) && answers.jobOffer !== "yes") {
            nextTrack = "고용주 오퍼 확보 -> 주정부 stream";
          } else if ((statusSupports(insight.statuses.localExperience) || statusSupports(insight.statuses.ee)) && !hasSkilledCanadianTrack(answers)) {
            nextTrack = "TEER 0-3 경력 -> EE/주정부 재계산";
          } else if (statusSupports(insight.statuses.ee)) {
            nextTrack = "EE-linked stream 또는 nomination";
          }

          return {
            badge,
            summary,
            currentLine: has.length > 0
              ? has.slice(0, 3).map((criterion) => criterion.label).join(" / ")
              : "핵심 강점 정리가 더 필요해요.",
            blockerLine: (missing.length > 0 ? missing : partial).slice(0, 3).map((criterion) => criterion.label).join(" / "),
            nextTrack
          };
        }

        function buildJobRealityCheck(answers, insight) {
          const primaryMeta = getActiveOccupationMeta(answers);
          const canadaMeta = getCanadaOccupationMeta(answers);
          const koreaMeta = getKoreaOccupationMeta(answers);
          const canadaOccupationId = resolveOccupationId(answers.canadaOccupation, answers.canadaJobTitle);
          const canadaTitleStage = getCanadaOccupationTitleStage(answers);
          const plannerFocus = getOccupationPlannerFocus(canadaOccupationId);
          const items = [];

          if (!hasResolvedKoreaOccupation(answers) && !hasResolvedCanadaOccupation(answers)) {
            items.push("한국 직무와 캐나다 현재 직무를 더 구체적으로 고르면, 이 직무가 skilled인지와 어떤 주 예외 경로가 있는지 훨씬 정확히 설명할 수 있어요.");
          }

          if (answers.canadianJobSkill === "skilled" && answers.canadianExp !== "0" && hasResolvedCanadaOccupation(answers) && hasDirectCanadaSkilledTrack(answers)) {
            items.push("지금 캐나다 " + canadaMeta.labelKo + " 경력은 EE/CEC 기준 skilled 경력으로 읽힐 가능성이 커요.");

            if (getCanadaOccupationMeta(answers).tags.some((tag) => ["office", "business-admin", "sales"].includes(tag))) {
              items.push("사무·세일즈 계열은 broad title보다 administrator·coordinator·specialist duties가 보일수록 many province streams에서 더 안정적으로 읽혀요.");
            }

            if (getCanadaOccupationMeta(answers).tags.includes("hospitality")) {
              items.push("호스피탈리티 안에서도 cook·chef·food service supervisor처럼 skilled로 읽히는 직무는 그대로 밀어볼 수 있어요.");
            }

            if (canadaOccupationId === "warehouse-logistics") {
              items.push("창고 쪽도 inventory coordinator·dispatcher처럼 duties가 더 명확해질수록 skilled 또는 mixed-skill 해석이 쉬워집니다.");
            }
          } else if (answers.canadianJobSkill === "skilled" && answers.canadianExp !== "0" && hasResolvedCanadaOccupation(answers) && canadaTitleNeedsUpgrade(answers)) {
            items.push("선택한 직군은 skilled 쪽이지만, 입력한 title은 아직 broad해서 전환 플랜을 같이 보는 게 좋아요.");
            items.push(canadaTitleStage.reason);
            items.push("지금 title 그대로 밀기보다 " + plannerFocus.transitionTarget + "처럼 더 선명한 title로 옮기면 주정부와 연방 해석이 안정됩니다.");
          } else if (answers.canadianJobSkill === "non-skilled") {
            if (hasResolvedCanadaOccupation(answers) && getCanadaOccupationMeta(answers).tags.some((tag) => ["service-entry", "retail"].includes(tag))) {
              items.push(canadaMeta.labelKo + " 같은 front-line service 일은 보통 연방 EE skilled 경력으로는 안 잡힐 수 있어요.");
            } else {
              items.push("지금 캐나다 일은 연방 EE/CEC 기준 skilled 경력으로는 바로 안 들어갈 가능성이 커요.");
            }

            if (canadaOccupationId === "server-counter") {
              items.push("server·barista·cashier는 대부분 주에서 그대로보다 food service supervisor나 cook으로 올라갈 때 경로가 훨씬 선명해집니다.");
            }

            if (canadaOccupationId === "retail-sales") {
              items.push("retail sales는 그대로보다 retail supervisor·assistant manager·office coordinator 쪽으로 옮겨야 skilled 쪽으로 읽히기 쉬워요.");
            }

            if (canadaOccupationId === "warehouse-logistics") {
              items.push("warehouse associate는 주마다 TEER 4로 읽히는 경우가 많아 dispatcher·inventory coordinator 전환이나 예외 stream 확인이 중요해요.");
            }

            if (canadaOccupationId === "caregiver-psw") {
              items.push("PSW·caregiver는 연방 direct보다 Ontario In-Demand, Atlantic employer-driven, local health support 경로가 더 현실적인 경우가 많아요.");
            }

            if (insight.id === "alberta" && hasResolvedCanadaOccupation(answers) && getCanadaOccupationMeta(answers).tags.some((tag) => ["hospitality", "service-entry"].includes(tag))) {
              items.push("알버타는 Tourism and Hospitality 또는 worker streams에서 현재 직무를 바로 볼 수 있는지 먼저 확인해 볼 만해요.");
            }

            if (insight.id === "ontario" && hasResolvedCanadaOccupation(answers) && getCanadaOccupationMeta(answers).tags.some((tag) => ["care-support", "warehouse"].includes(tag))) {
              items.push("온타리오는 In-Demand Skills처럼 일부 TEER 4/5 직무를 별도 stream으로 보니, 현재 NOC가 목록에 들어가는지 확인해 볼 만해요.");
            }

            if (isAtlanticProvinceId(insight.id) && answers.jobOffer === "yes") {
              items.push("Atlantic 쪽은 designated employer + TEER 4 job offer로 볼 수 있는 경우가 있어 AIP 가능성을 따로 확인할 만해요.");
            }

            if (hasResolvedKoreaOccupation(answers) && answers.foreignExp !== "0" && answers.foreignExpAlignment !== "unrelated") {
              items.push("현재 캐나다 일은 non-skilled여도 한국 " + koreaMeta.labelKo + " 경력이 맞다면, 한국 경력 기준 primary occupation으로 다시 짜는 방법도 있어요.");
            } else if (statusSupports(insight.statuses.graduate)) {
              items.push("그게 아니면 " + plannerFocus.schoolTrack + "처럼 학교 -> PGWP -> skilled 직무 1년 경유가 더 현실적인 플랜이 될 수 있어요.");
            } else {
              items.push("지금 일을 그대로 밀기 어렵다면 " + plannerFocus.transitionTarget + " 쪽으로 움직이는 게 더 현실적인 플랜일 수 있어요.");
            }
          } else if (answers.canadianJobSkill === "mixed") {
            items.push("같은 직무군 안에서도 NOC와 job duties에 따라 skilled 여부가 달라져요. 현재 일의 NOC·TEER를 먼저 확인해야 해요.");
          } else if (answers.canadianExp !== "0") {
            items.push("캐나다 경력은 있지만 skilled 여부가 아직 안 정해져 있어, 먼저 현재 일의 NOC와 TEER를 확인해야 해요.");
          }

          if (answers.targetOccupationPlan === "previous-korea-job" && hasResolvedKoreaOccupation(answers)) {
            if (answers.foreignExpAlignment === "same-skilled") {
              items.push("한국 " + koreaMeta.labelKo + " 경력을 primary occupation으로 바로 설명하기 좋은 편이에요.");
            } else if (answers.foreignExpAlignment === "related-skilled") {
              items.push("한국 " + koreaMeta.labelKo + " 경력은 비슷한 분야라 쓸 수 있지만, NOC와 job duties를 더 정교하게 맞춰야 해요.");
            }
          }

          if (primaryMeta.tags.includes("regulated")) {
            items.push(primaryMeta.labelKo + " 쪽은 점수보다 면허·등록·자격 인정이 먼저 병목이 되는 경우가 많아요.");
          }

          return items.slice(0, 4);
        }

        function buildProvinceSpecificPlanLabel(answers, insight) {
          const occupationLens = buildProvinceOccupationLens(answers, insight);

          if (occupationLens.primaryRoute) {
            return occupationLens.primaryRoute;
          }

          if (insight.id === "ontario" && hasResolvedCanadaOccupation(answers) && getCanadaOccupationMeta(answers).tags.some((tag) => ["care-support", "warehouse"].includes(tag))) {
            return "Ontario In-Demand Skills 또는 Employer Job Offer 쪽부터 확인";
          }

          if (insight.id === "alberta" && hasResolvedCanadaOccupation(answers) && getCanadaOccupationMeta(answers).tags.some((tag) => ["hospitality", "service-entry"].includes(tag))) {
            return "Alberta Tourism and Hospitality / worker 축부터 확인";
          }

          if (isAtlanticProvinceId(insight.id) && answers.jobOffer === "yes") {
            return "AIP designated employer + employer-driven 경로부터 확인";
          }

          if (statusSupports(insight.statuses.regional) && answers.setting !== "regional") {
            return insight.labelKo + " 지역·커뮤니티 경로 같이 열기";
          }

          return insight.selectionModel.focusKo + "부터 확인";
        }

        function buildConcreteProvincePlans(answers, insight) {
          const plans = [];
          const canadaMeta = getCanadaOccupationMeta(answers);
          const koreaMeta = getKoreaOccupationMeta(answers);
          const occupationLens = buildProvinceOccupationLens(answers, insight);
          const routeOccupationId = getPrimaryOccupationId(answers);
          const canadaOccupationId = resolveOccupationId(answers.canadaOccupation, answers.canadaJobTitle);
          const plannerFocus = getOccupationPlannerFocus(hasResolvedCanadaOccupation(answers) ? canadaOccupationId : routeOccupationId);
          const hasCanadaOccupation = hasResolvedCanadaOccupation(answers);
          const hasKoreaOccupation = hasResolvedKoreaOccupation(answers);
          const canadaTitleStage = getCanadaOccupationTitleStage(answers);
          const hasDirectCanadaSkilled = hasDirectCanadaSkilledTrack(answers);
          const canUseKoreaSkilled = hasKoreaOccupation && answers.foreignExp !== "0" && answers.foreignExpAlignment !== "unrelated";
          const canadaIsServiceEntry = hasCanadaOccupation && canadaMeta.tags.some((tag) => ["service-entry", "retail", "warehouse"].includes(tag));
          const needsTitleUpgrade = canadaTitleNeedsUpgrade(answers);

          function addPlan(priority, badge, title, summary, steps) {
            plans.push({ priority, badge, title, summary, steps });
          }

          if (hasDirectCanadaSkilled) {
            addPlan(
              10,
              "지금 가능",
              "현재 캐나다 " + canadaMeta.labelKo + " 경력 그대로 먼저 보기",
              "현재 캐나다 경력이 이미 skilled 축이면, 이 주에서는 " + buildProvinceSpecificPlanLabel(answers, insight) + " 쪽을 먼저 비교하는 게 현실적입니다.",
              [
                "현재 job title, job duties, 근무시간을 NOC 기준으로 다시 정리합니다.",
                insight.labelKo + "에서 " + occupationLens.primaryRoute + " 쪽으로 맞는 stream 1개를 먼저 좁힙니다.",
                "그 다음 언어점수, 추가 경력, nomination 가능성을 같이 계산합니다."
              ]
            );
          }

          if ((answers.canadianJobSkill === "non-skilled" || needsTitleUpgrade) && hasCanadaOccupation) {
            if (["caregiver-psw", "warehouse-logistics"].includes(canadaOccupationId)) {
              addPlan(
                10,
                "예외 stream",
                plannerFocus.transitionTarget + "부터 확인",
                canadaOccupationId === "caregiver-psw"
                  ? "PSW·caregiver는 많은 경우 연방 direct보다 예외 stream이나 employer-driven 경로를 먼저 보는 편이 더 현실적입니다."
                  : "warehouse·logistics는 그대로보다 In-Demand Skills, local employer, dispatcher·coordinator 전환을 함께 보는 편이 더 현실적입니다.",
                [
                  "현재 NOC가 이 주의 예외 stream이나 employer-driven 경로와 맞는지 먼저 확인합니다.",
                  "직접 안 맞으면 " + plannerFocus.transitionTarget + "로 옮겨 다시 비교합니다.",
                  "6-12개월 안에 예외 stream과 직무 전환 중 어느 쪽이 더 빠른지 비교합니다."
                ]
              );
            }

            addPlan(
              needsTitleUpgrade ? 10 : 9,
              "전환 필요",
              "현재 캐나다 " + canadaMeta.labelKo + "에서 " + plannerFocus.transitionTarget,
              (needsTitleUpgrade && canadaTitleStage ? canadaTitleStage.reason + " " : "") + plannerFocus.transitionSummary,
              [
                canadaMeta.labelKo + "가 이 주에서 바로 읽히는지 먼저 확인하고, 안 되면 " + plannerFocus.transitionTarget + " 쪽 job title을 찾습니다.",
                "전환한 직무가 이 주의 " + occupationLens.primaryRoute + "와 맞는지 확인합니다.",
                "전환 후 6-12개월 경력을 만들거나 잡오퍼를 붙여 다시 계산합니다."
              ]
            );
          }

          if (canUseKoreaSkilled) {
            addPlan(
              8,
              "한국 경력",
              "한국 " + koreaMeta.labelKo + " 경력 기준으로 다시 짜기",
              "현재 캐나다 일이 약해도 한국 경력이 맞으면 primary occupation을 한국 직무 기준으로 정리해서 보는 방법이 있습니다.",
              [
                "한국 " + koreaMeta.labelKo + " 경력의 NOC와 job duties를 먼저 정리합니다.",
                "현재 캐나다 일은 생계용으로 두더라도, 이민용 주력 경력은 한국 축으로 설명할 수 있는지 확인합니다.",
                "이 주에서 해당 직군의 job offer, 우선직군, EE-linked 연결이 있는지 다시 비교합니다."
              ]
            );
          }

          if ((answers.canadianJobSkill === "non-skilled" || needsTitleUpgrade || !hasDirectCanadaSkilled) && statusSupports(insight.statuses.graduate)) {
            addPlan(
              7,
              "학교 경유",
              insight.labelKo + "에서 " + plannerFocus.schoolTrack,
              "현재 직무가 애매하면 학교를 통해 현지 학위와 PGWP를 만든 뒤, 그 주에서 실제로 읽히는 skilled 직무로 들어가는 플랜이 더 현실적일 수 있습니다.",
              [
                insight.labelKo + "에서 PGWP 가능한 과정과 졸업자 경로를 먼저 확인합니다.",
                "졸업 후 " + plannerFocus.transitionTarget + " 쪽으로 직무를 잡아 1년 경력을 만듭니다.",
                "graduate stream, local experience stream, EE-linked nomination을 다시 계산합니다."
              ]
            );
          }

          if (!hasDirectCanadaSkilled && !canUseKoreaSkilled && !statusSupports(insight.statuses.graduate)) {
            addPlan(
              6,
              "고용주 연결",
              "이 주 employer-driven 또는 지역 경로 먼저 보기",
              "지금 당장 점수보다 고용주 오퍼, 지역 정착, community 연결이 더 현실적인 우회로가 될 수 있습니다.",
              [
                insight.labelKo + "에서 employer-driven 또는 community-driven 경로가 열리는지 먼저 확인합니다.",
                "지역 정착 의사와 고용주 연결을 먼저 만들고, 그 다음 nomination 또는 EE 연결을 계산합니다.",
                "도시만 보던 경우라면 지역까지 열었을 때 어느 직무가 더 잘 읽히는지도 같이 확인합니다."
              ]
            );
          }

          return plans.sort((left, right) => right.priority - left.priority).slice(0, 3);
        }

        function buildRouteRealitySnapshot(answers, insight, occupationLens, concreteProvincePlans, isFederalCard) {
          const leadPlan = concreteProvincePlans[0] || null;
          const hasKoreaRoute = answers.targetOccupationPlan === "previous-korea-job" && hasResolvedKoreaOccupation(answers);
          const hasCanadaSkilled = hasDirectCanadaSkilledTrack(answers);
          const isCanadaNonSkilled = answers.canadianJobSkill === "non-skilled" || canadaTitleNeedsUpgrade(answers);
          const provinceFallback = leadPlan?.summary || occupationLens.summary;

          if (isFederalCard) {
            if (occupationLens.badge === "연방 skilled 축") {
              return {
                badge: "바로 비교 가능",
                tone: "positive",
                title: "현재 직무나 경력을 기준으로 연방 EE와 바로 비교할 수 있어요.",
                summary: occupationLens.summary
              };
            }

            if (hasKoreaRoute) {
              return {
                badge: "한국 경력 활용",
                tone: "neutral",
                title: "캐나다 현재 일보다 한국 경력 축으로 다시 짜는 편이 더 현실적일 수 있어요.",
                summary: occupationLens.fallbackRoute
              };
            }

            return {
              badge: "전환/학교 먼저",
              tone: "negative",
              title: "지금 직무 그대로는 연방 skilled 비교가 약해서 직무 전환이나 학교 경유를 먼저 보는 편이 좋아요.",
              summary: occupationLens.fallbackRoute
            };
          }

          if (leadPlan?.badge === "지금 가능" || (hasCanadaSkilled && occupationLens.tone === "positive")) {
            return {
              badge: "지금 직무 가능",
              tone: "positive",
              title: "현재 직무나 경력 그대로 이 주의 stream과 비교해 볼 수 있어요.",
              summary: provinceFallback
            };
          }

          if (leadPlan?.badge === "한국 경력" || hasKoreaRoute) {
            return {
              badge: "한국 경력 재구성",
              tone: "neutral",
              title: "현재 캐나다 일보다 한국 경력 축으로 다시 짜면 이 주에서 열리는 길이 더 분명해질 수 있어요.",
              summary: provinceFallback
            };
          }

          if (leadPlan?.badge === "학교 경유") {
            return {
              badge: "학교 경유 권장",
              tone: "neutral",
              title: "지금 직무 그대로보다 학교 -> PGWP -> local skilled 경력 경유가 더 현실적일 수 있어요.",
              summary: leadPlan.summary
            };
          }

          if (leadPlan?.badge === "예외 stream") {
            return {
              badge: "예외 stream 우선",
              tone: "neutral",
              title: "이 주에서는 일반 점수형보다 예외 stream이나 employer-driven 경로를 먼저 보는 편이 더 맞아요.",
              summary: leadPlan.summary
            };
          }

          if (leadPlan?.badge === "고용주 연결") {
            return {
              badge: "고용주/지역 먼저",
              tone: "neutral",
              title: "점수보다 employer-driven 또는 지역 경로를 먼저 보는 편이 더 맞아요.",
              summary: leadPlan.summary
            };
          }

          if (leadPlan?.badge === "전환 필요" || isCanadaNonSkilled) {
            return {
              badge: "직무 전환 필요",
              tone: "negative",
              title: "현재 직무 그대로보다 같은 업종 안에서 supervisor·skilled 쪽으로 올려야 이 주에서 훨씬 잘 읽혀요.",
              summary: leadPlan?.summary || occupationLens.fallbackRoute
            };
          }

          return {
            badge: "stream 확인",
            tone: occupationLens.tone || "neutral",
            title: "이 주는 점수 하나보다 stream 자격과 직무 연결을 먼저 보는 편이에요.",
            summary: provinceFallback
          };
        }

        function buildProvinceEeBridge(answers, insight, eeSnapshot) {
          if (insight.id === "federal" || !statusSupports(insight.statuses.ee)) {
            return null;
          }

          const currentScore = eeSnapshot.crsSnapshot.score;
          const cutoff = eeSnapshot.crsSnapshot.cutoff;
          const nominationScore = currentScore + 600;
          const clb9Lift = estimateProjectedCrsLift(answers, {
            english: "clb9plus",
            languageScoreStatus: "official",
            languageEvidence: "official"
          });
          const clb9Score = clb9Lift > 0 ? currentScore + clb9Lift : currentScore;
          const nextCanadianYear = getNextCanadianExperienceYear(answers);
          const nextCanadianLift = nextCanadianYear
            ? estimateProjectedCrsLift(answers, {
                canadianJobSkill: "skilled",
                canadianExp: nextCanadianYear
              })
            : 0;
          const nextCanadianScore = nextCanadianLift > 0 ? currentScore + nextCanadianLift : currentScore;

          return {
            currentLine: "지금 기준 연방 EE 참고점수 " + currentScore + "점"
              + (cutoff != null ? " / 최근 컷오프 " + cutoff + "점" : ""),
            nominationLine: "이 주 nomination 되면 대략 " + nominationScore + "점까지 뛰어오를 수 있어요.",
            clb9Line: clb9Lift > 0
              ? "영어를 CLB 9 이상으로 올리면 약 " + clb9Score + "점까지 볼 수 있어요."
              : "영어 점수는 이미 반영된 상태예요.",
            canadianExpLine: nextCanadianLift > 0
              ? "캐나다 skilled 경력을 " + nextCanadianYear + "년까지 채우면 약 " + nextCanadianScore + "점까지 볼 수 있어요."
              : "지금 단계에서는 경력 증가보다 nomination·직군 선택 영향이 더 커요."
          };
        }

        function buildImprovementPlan(answers, insight, immigrationChancePercent) {
          const actions = [];
          const canadaOccupationId = resolveOccupationId(answers.canadaOccupation, answers.canadaJobTitle);
          const canadaMeta = getCanadaOccupationMeta(answers);
          const plannerFocus = getOccupationPlannerFocus(canadaOccupationId);

          function addAction(delta, title, detail, actionId, priority = 0) {
            if (actions.some((action) => action.title === title)) {
              return;
            }

            actions.push({
              actionId,
              delta,
              priority,
              title,
              detail,
              scoreImpact: actionId ? describeActionScoreImpact(answers, insight, actionId) : null
            });
          }

          if (answers.path === "business" && statusSupports(insight.statuses.entrepreneur)) {
            addAction(8, "사업계획서와 자금 증빙 정리", "사업·창업 stream은 운영 계획, 투자금, 순자산 증빙 준비도가 실제 체감에 크게 작용합니다.");
            addAction(5, "해당 지역 사업성 검토 또는 탐방 준비", "지역 시장성과 운영 가능성을 미리 정리하면 entrepreneur 심사 준비가 훨씬 쉬워집니다.");
          }

          if (answers.canadianJobSkill === "non-skilled" && hasResolvedCanadaOccupation(answers)) {
            if (canadaOccupationId === "server-counter") {
              addAction(13, "food service supervisor 또는 cook으로 직무 올리기", "server·barista·cashier는 그대로보다 food service supervisor나 cook으로 올라갈 때 주정부와 EE 연결이 훨씬 선명해집니다.", "teer-upgrade", 6);
            } else if (canadaOccupationId === "retail-sales") {
              addAction(12, "retail supervisor 또는 office coordinator로 옮기기", "retail sales는 supervisor·assistant manager·office coordinator 쪽으로 올라가야 많은 주에서 skilled로 읽히기 쉬워요.", "teer-upgrade", 6);
            } else if (canadaOccupationId === "warehouse-logistics") {
              addAction(12, "inventory coordinator 또는 dispatcher로 옮기기", "warehouse associate 자체보다 inventory·shipping·dispatch 쪽으로 옮겨야 주정부와 연방에서 더 선명해집니다.", "teer-upgrade", 6);
            } else if (canadaOccupationId === "caregiver-psw") {
              if (insight.id === "ontario") {
                addAction(12, "Ontario In-Demand Skills 대상 NOC인지 먼저 확인", "PSW·caregiver는 온타리오에서 예외 stream으로 먼저 풀리는 경우가 많아, 현재 NOC가 목록과 지역 조건에 맞는지부터 봐야 합니다.", "ontario-indemand", 6);
              } else if (isAtlanticProvinceId(insight.id)) {
                addAction(12, "AIP designated employer + TEER 4 가능 여부 확인", "Atlantic 쪽은 designated employer job offer와 현재 NOC가 맞으면 PSW·caregiver를 employer-driven으로 먼저 풀 수 있는 경우가 있습니다.", "aip-teer4", 6);
              } else {
                addAction(11, "healthcare support employer path부터 확인", "PSW·caregiver는 일반 점수형보다 local employer나 health support 예외 경로를 먼저 보는 편이 현실적입니다.", "job-offer", 5);
              }
            } else if (canadaOccupationId === "housekeeping-cleaning") {
              addAction(11, "housekeeping supervisor 쪽으로 role 올리기", "room attendant·cleaner는 supervisor·inspection duty가 생겨야 skilled로 읽히는 길이 더 넓어질 수 있습니다.", "teer-upgrade", 6);
            } else if (canadaOccupationId === "hotel-front-desk") {
              addAction(10, "guest service supervisor 또는 front office supervisor로 옮기기", "front desk는 supervisor duty가 붙을수록 many province streams에서 더 선명하게 읽힙니다.", "teer-upgrade", 6);
            } else if (canadaOccupationId === "manufacturing-production") {
              addAction(11, "machine operator 또는 lead hand / technician으로 옮기기", "production worker는 그대로보다 machine operator·lead hand·technician으로 올라가야 skilled 또는 mixed-skill 해석이 쉬워집니다.", "teer-upgrade", 6);
            }
          }

          if (hasResolvedCanadaOccupation(answers) && answers.canadianJobSkill === "skilled" && ["office-admin", "customer-service", "sales-marketing"].includes(canadaOccupationId)) {
            addAction(9, canadaMeta.labelKo + " duties를 coordinator / administrator NOC로 정리", "사무·세일즈 계열은 broad title보다 실제 duties가 coordinator·administrator·specialist 쪽으로 읽히는지가 중요합니다.", "focus-occupation", 6);
          }

          const languageActions = getLanguageImprovementActions(answers);

          if (languageActions.includes("language-proof")) {
            const delta = answers.english === "unknown"
              ? 12
              : answers.english === "clb6"
                ? 11
                : answers.english === "clb7"
                  ? 9
                  : answers.english === "clb8"
                    ? 7
                    : 6;

            addAction(
              delta,
              answers.languageEvidence === "guess" ? "언어시험 응시 후 공식 점수표 확보" : "생각하는 목표 점수를 실제 공인 점수로 확인",
              "EE와 대부분의 주정부 경로는 공식 언어점수가 있어야 실제 비교와 프로필 판단이 정확해집니다.",
              "language-proof",
              answers.canadianJobSkill === "non-skilled" && insight.id !== "federal" ? 1 : 0
            );
          }

          if (languageActions.includes("language-clb9")) {
            const delta = answers.english === "clb8" ? 9 : answers.english === "clb7" ? 12 : 14;
            addAction(
              delta,
              "언어점수 CLB 9 이상 목표",
              "특히 EE와 점수형 주정부 경로는 CLB 9 전후에서 체감 차이가 커질 수 있습니다.",
              "language-clb9",
              answers.canadianJobSkill === "non-skilled" && insight.id !== "federal" ? 1 : 0
            );
          }

          if (answers.ecaStatus === "needed") {
            addAction(8, "ECA 완료", "해외 학력을 점수 구조에 올리려면 ECA가 먼저 정리돼야 합니다.", "eca-complete");
          } else if (answers.ecaStatus === "in-progress") {
            addAction(4, "ECA 결과 수령까지 마무리", "진행 중 상태보다 완료 상태가 되어야 실제 비교와 프로필 제출이 쉬워집니다.", "eca-finish");
          } else if (answers.ecaStatus === "unsure") {
            addAction(5, "ECA 필요 여부 먼저 확인", "해외 학위인지 캐나다 학위인지에 따라 준비 서류와 점수 계산이 크게 달라집니다.", "eca-check");
          }

          if (answers.ee !== "yes" && statusSupports(insight.statuses.ee)) {
            const delta = insight.statuses.ee === "핵심" ? 6 : 4;
            addAction(
              delta,
              "EE 자격 확인 후 프로필 열기",
              "이 지역은 EE와 같이 볼 때 선택지가 넓어지고 초청 연결이 쉬워질 수 있습니다.",
              "ee-profile",
              insight.id === "federal" ? 3 : 1
            );
          }

          if (hasCanadianWorkBase(answers.base) && answers.permitRemaining === "lt6") {
            addAction(
              14,
              "남은 퍼밋 6개월 미만 기준으로 경로 1개로 좁히기",
              insight.id === "federal"
                ? "남은 기간이 짧으면 연방 EE만 볼지, 주정부·고용주 경로까지 같이 볼지 4-8주 안에 먼저 확정하는 편이 좋습니다."
                : "남은 기간이 짧으면 이 주에서 바로 쓸 stream, 고용주 연결, 제출 순서를 먼저 확정하는 편이 좋습니다.",
              "permit-urgent",
              3
            );
            addAction(
              10,
              "현재 체류 유지·연장 가능성도 같이 점검",
              "남은 기간이 짧으면 경력 계획만 보지 말고 현재 신분 유지와 접수 타이밍도 같이 확인해야 움직이기 편합니다.",
              "permit-status",
              2
            );
          } else if (hasCanadianWorkBase(answers.base) && answers.permitRemaining === "6to12") {
            addAction(
              7,
              "남은 퍼밋 안에 실행할 순서 정리",
              "6-12개월 안에 언어점수, 직군 정리, 고용주 연결, stream 선택 중 무엇을 먼저 할지 달력을 기준으로 정리하는 편이 좋습니다.",
              "permit-plan",
              2
            );
          }

          if (activeQuickRegions.size > 0 && activeQuickRegions.size <= 2) {
            addAction(
              9,
              "지역을 다른 곳으로 넓혀보세요",
              "지금은 몇 개 지역만 골라서 보고 있어 비슷한 조건의 주정부 기회를 놓칠 수 있습니다. 인접 권역이나 Atlantic 전체처럼 조금 넓혀보는 편이 좋습니다.",
              "expand-regions",
              1
            );
          }

          if (insight.id !== "federal" && statusSupports(insight.statuses.ee)) {
            addAction(
              18,
              "이 지역의 EE-linked nomination 노리기",
              "해당 주의 enhanced 또는 EE-linked nomination을 받으면 EE 점수가 크게 뛰어 초청 가능성이 완전히 달라질 수 있습니다.",
              "pnp-nomination",
              answers.canadianJobSkill === "non-skilled" ? 1 : 3
            );
          }

          if (answers.targetOccupationPlan === "unsure") {
            addAction(
              7,
              "이민에 쓸 주력 직군 1개 정하기",
              "현재 캐나다 일, 한국 경력, 전공 기반 직군 중 무엇으로 갈지 먼저 정해야 점수와 전략 계산이 정확해집니다.",
              "focus-occupation",
              4
            );
          }

          if (shouldSuggestSkilledSwitch(answers)) {
            addAction(
              11,
              "TEER 0-3 직무로 옮겨 skilled 경력 1년 만들기",
              "지금 입력된 TEER 4-5 경력은 CRS에 안 들어가서, 새 skilled 경력 1년이 쌓이기 시작해야 점수 반영이 열립니다.",
              "teer-upgrade",
              5
            );
          }

          if (answers.canadianJobSkill === "non-skilled") {
            if (statusSupports(insight.statuses.graduate)) {
              addAction(
                7,
                "학교 -> PGWP -> skilled 직무 1년 경로 계산",
                "현재 일이 non-skilled면 이 주의 학교·졸업자 경로를 거쳐 skilled 직무 1년으로 들어가는 편이 더 현실적인 경우가 많습니다.",
                "study-route",
                5
              );
            }

            if (isAtlanticProvinceId(insight.id) && answers.jobOffer === "yes") {
              addAction(8, "AIP designated employer + TEER 4 가능 여부 확인", "Atlantic 쪽은 designated employer job offer와 현재 NOC가 맞으면 TEER 4 축으로 들어가는 경우도 있어 AIP 가능성을 먼저 확인해 볼 만합니다.", "aip-teer4", 4);
            }

            if (insight.id === "ontario" && getCanadaOccupationMeta(answers).tags.some((tag) => ["care-support", "warehouse"].includes(tag))) {
              addAction(8, "Ontario In-Demand Skills 대상 NOC인지 확인", "온타리오는 일부 TEER 4/5 직무를 별도 stream으로 보니, 현재 NOC가 목록과 지역 조건에 맞는지 먼저 확인해 볼 만합니다.", "ontario-indemand", 4);
            }

            if (insight.id === "alberta" && getCanadaOccupationMeta(answers).tags.some((tag) => ["hospitality", "service-entry"].includes(tag))) {
              addAction(8, "알버타 Tourism and Hospitality 또는 worker stream 확인", "알버타는 관광·호스피탈리티 쪽 예외 경로가 있어, 현재 고용주와 직무가 조건에 맞는지 바로 확인해 볼 수 있어요.", "alberta-hospitality", 4);
            }
          }

          if (answers.targetOccupationPlan === "previous-korea-job" && answers.foreignExpAlignment === "unrelated") {
            addAction(9, "한국 경력과 맞는 primary occupation 다시 정리", "연방 FSW 쪽은 목표 직군과 같은 NOC의 숙련 경력으로 설명이 되어야 훨씬 안정적입니다.", "korea-primary-noc");
          } else if (answers.targetOccupationPlan === "previous-korea-job" && answers.foreignExpAlignment === "related-skilled") {
            addAction(6, "한국 경력의 NOC와 job duties 정교하게 정리", "비슷한 분야라도 직무 설명이 맞아야 primary occupation으로 설득력이 생깁니다.", "korea-noc-detail");
          }

          if (answers.targetOccupationPlan === "degree-field" && answers.degreeCareerPlan === "use-degree") {
            addAction(5, "전공 기반 직무로 실제 경력 만들기", "전공을 살린 직군으로 실제 경력이 생기면 경력 연결성과 설명력이 좋아질 수 있습니다.", "degree-experience");
          }

          if (answers.jobOffer !== "yes" && ["중심", "있음", "일부"].includes(insight.statuses.jobOffer)) {
            const delta = insight.statuses.jobOffer === "중심" ? 9 : insight.statuses.jobOffer === "있음" ? 7 : 5;
            addAction(
              delta,
              "해당 주 고용주 잡오퍼 확보",
              "이 지역은 고용주 오퍼가 있으면 지원 가능한 stream 수와 실제 속도가 함께 올라갈 수 있습니다.",
              "job-offer",
              answers.canadianJobSkill === "non-skilled" && insight.id !== "federal" ? 4 : 2
            );
          }

          if (answers.canadianExp === "0" && (statusSupports(insight.statuses.localExperience) || statusSupports(insight.statuses.graduate) || answers.base === "student")) {
            const delta = statusSupports(insight.statuses.localExperience) ? 10 : 7;
            addAction(delta, "캐나다 경력 1년 만들기", "현지 경력 1년은 CEC와 여러 주정부 경로에서 직접적인 체감 차이를 만드는 경우가 많습니다.", "canadian-exp-1");
          } else {
            const nextCanadianYear = getNextCanadianExperienceYear(answers);

            if (nextCanadianYear && statusSupports(insight.statuses.localExperience)) {
              addAction(
                8,
                "캐나다 skilled 경력 " + nextCanadianYear + "년까지 늘리기",
                "캐나다 skilled 경력은 해가 하나 늘 때마다 CRS와 일부 경로 안정성이 같이 올라가는 편입니다.",
                "canadian-exp-next",
                insight.id === "federal" ? 2 : 1
              );
            }
          }

          if (["worker", "outside-worker"].includes(answers.path) && answers.foreignExp === "0") {
            addAction(5, "숙련 경력 1년 채우기", "해외 숙련 경력 1년은 EE와 취업형 주정부 경로의 최소 판단선이 되는 경우가 많습니다.", "foreign-exp-1");
          }

          if (isStudyStartIntent(answers.path) && answers.base === "outside") {
            addAction(7, "학교와 주를 같이 고른 유학 경로 설계", "유학은 학교보다 지역과 졸업 후 경로를 먼저 같이 봐야 실제 이민 연결이 좋아집니다.", "study-route");
          }

          if (answers.advantage !== "french" && statusSupports(insight.statuses.french)) {
            addAction(4, "프랑스어 점수도 선택지에 포함", "프랑스어 점수는 연방과 일부 주에서 예상보다 큰 차별점이 될 수 있습니다.", "french", 1);
          }

          if (answers.setting !== "regional" && ["많음", "중심"].includes(insight.statuses.regional)) {
            addAction(4, "지역 정착 옵션도 열어두기", "이 지역은 대도시보다 지역·커뮤니티 경로에서 실제 선택지가 더 넓을 수 있습니다.", "regional-setting");
          }

          if (actions.length === 0) {
            addAction(3, "최신 컷오프와 공지 변동 계속 추적", "현재는 큰 약점보다 draw 시점, 직군 선발, 주별 intake 열림 여부의 영향이 더 큽니다.");
          }

          const crsSnapshot = estimateCrsSnapshot(answers);
          const topActions = actions
            .sort((left, right) => {
              if ((right.priority ?? 0) !== (left.priority ?? 0)) {
                return (right.priority ?? 0) - (left.priority ?? 0);
              }

              const rightLift = right.scoreImpact?.lift ?? -1;
              const leftLift = left.scoreImpact?.lift ?? -1;

              if (rightLift !== leftLift) {
                return rightLift - leftLift;
              }

              const rightFutureLift = right.scoreImpact?.futureLift ?? -1;
              const leftFutureLift = left.scoreImpact?.futureLift ?? -1;

              if (rightFutureLift !== leftFutureLift) {
                return rightFutureLift - leftFutureLift;
              }

              return right.delta - left.delta;
            })
            .slice(0, 3);
          const projectedScoreLift = topActions.reduce((sum, action) => sum + Math.max(0, action.scoreImpact?.lift ?? 0), 0);
          const bestFutureScoreLift = topActions.reduce((max, action) => Math.max(max, action.scoreImpact?.futureLift ?? 0), 0);

          return {
            items: topActions,
            baseScore: crsSnapshot.score,
            projectedScoreLift,
            projectedScore: crsSnapshot.score + projectedScoreLift,
            bestFutureScoreLift
          };
        }

        function getProvinceActionPresentation(action) {
          if (action.scoreImpact) {
            return {
              badge: action.scoreImpact.badge,
              tone: action.scoreImpact.tone ?? "neutral",
              label: action.scoreImpact.label ?? action.detail,
              note: action.detail
            };
          }

          const actionId = action.actionId ?? "";
          const groups = {
            urgent: new Set(["permit-urgent", "permit-status"]),
            route: new Set(["job-offer", "pnp-nomination", "ee-profile", "aip-teer4", "ontario-indemand", "alberta-hospitality"]),
            document: new Set(["language-proof", "language-clb9", "eca-complete", "eca-finish", "eca-check", "french"]),
            experience: new Set(["teer-upgrade", "canadian-exp-next", "canadian-exp-1", "canadian-exp-2", "foreign-exp-1", "degree-experience"]),
            strategy: new Set(["focus-occupation", "korea-primary-noc", "korea-noc-detail", "regional-setting", "expand-regions", "study-route"])
          };

          if (groups.urgent.has(actionId)) {
            return { badge: "시급", tone: "positive", label: action.detail };
          }
          if (groups.route.has(actionId)) {
            return { badge: "경로", tone: "positive", label: action.detail };
          }
          if (groups.document.has(actionId)) {
            return { badge: "서류", tone: "neutral", label: action.detail };
          }
          if (groups.experience.has(actionId)) {
            return { badge: "경력", tone: "positive", label: action.detail };
          }
          if (groups.strategy.has(actionId)) {
            return { badge: "전략", tone: "deferred", label: action.detail };
          }

          return { badge: "준비", tone: "neutral", label: action.detail };
        }

        function getProvinceScenarioFocus(insight) {
          switch (insight.id) {
            case "prince-edward-island":
              return "PEI라면 International Graduate, Skilled Worker, EE 연결 중 어떤 stream으로 갈지 먼저 정리합니다.";
            case "alberta":
              return "알버타라면 일반 worker 경로, EE-linked 후보, Rural Renewal까지 같이 놓고 우선순위를 정합니다.";
            case "saskatchewan":
              return "사스카츄완이라면 job offer 기반인지, pathway 자격형인지 먼저 나눠서 봅니다.";
            case "ontario":
              return "온타리오라면 Human Capital 쪽인지 Employer Job Offer 쪽인지 먼저 갈라서 보는 편이 좋습니다.";
            case "nova-scotia":
              return "노바스코샤라면 통합 스트림 안에서 지금 직군이 타깃 초청과 맞는지부터 확인합니다.";
            case "newfoundland-and-labrador":
              return "뉴펀들랜드는 먼저 EOI 제출 구조와 employer 연결 여부부터 정리합니다.";
            case "manitoba":
              return "매니토바는 현지 연결성, 고용주, 교육 이력 중 어떤 축으로 설명할지 먼저 정리합니다.";
            case "new-brunswick":
              return "뉴브런즈윅은 고용주 연결과 직군 타깃 여부를 같이 놓고 보는 편이 좋습니다.";
            default:
              return "이 지역은 " + (insight.selectionModel?.focusKo || "stream 자격") + "을 먼저 맞추는 편이 좋습니다.";
          }
        }

        function buildScenarioTimeline(answers, insight) {
          let steps;

          if (answers.path === "business") {
            steps = [
              "사업 계획, 순자산, 자금 증빙을 먼저 정리합니다: 2-4개월",
              "해당 지역 사업·창업 stream 확인 및 EOI/사전 접촉을 합니다: 1-6개월",
              "사업 시작 또는 인수 후 운영 요건을 채웁니다: 6-18개월",
              "nomination 뒤 PR 단계로 넘어갑니다: 추가 6-12개월+"
            ];
          } else if (answers.base === "student" || isStudyStartIntent(answers.path)) {
            steps = [
              "학비와 지역을 기준으로 학교·주를 먼저 고릅니다: 1-3개월",
              "학업 후 졸업자 경로 또는 PGWP 연결을 준비합니다: 1-2년+",
              "현지 경력 1년 전후를 확보한 뒤 EE/PNP를 다시 봅니다",
              "nomination 또는 ITA 후 PR 접수로 넘어갑니다: 추가 6개월+"
            ];
          } else if (answers.base === "pgwp" || isPgwpIntent(answers.path)) {
            steps = [
              "현재 학위와 PGWP 남은 기간을 기준으로 주와 직무 우선순위를 정리합니다: 2-4주",
              "현지 skilled 경력, 언어점수, ECA 상태를 기준으로 맞는 stream을 추립니다: 1-2개월",
              "졸업자 또는 현지경력 stream 등록/초청 대기를 시작합니다: 1-6개월",
              "nomination 또는 ITA 후 PR 접수로 넘어갑니다: 추가 6개월+"
            ];
          } else if (answers.base === "working-holiday" && answers.canadianJobSkill === "non-skilled") {
            steps = [
              "현재 캐나다 일의 NOC·TEER를 먼저 확인합니다: 1-2주",
              "가능하면 TEER 0-3 직무나 관련 잡오퍼로 옮깁니다: 1-6개월",
              "언어점수·ECA와 함께 EE/주정부 연결이 가능한지 다시 점검합니다",
              "경력 전환 뒤 초청 또는 nomination 흐름으로 넘어갑니다: 추가 6개월+"
            ];
          } else if (answers.base === "working-holiday" && answers.canadianJobSkill === "skilled") {
            steps = [
              "현재 캐나다 skilled 경력의 NOC, 근무시간, 합법 체류 기록을 정리합니다: 2-4주",
              "언어시험·ECA 준비와 함께 1년 경력 충족 시점을 계산합니다: 1-3개월",
              "CEC 또는 주정부 현지경력 stream을 비교합니다: 1-6개월",
              "초청 후 PR 서류 접수와 심사로 넘어갑니다: 추가 6개월+"
            ];
          } else if (answers.targetOccupationPlan === "previous-korea-job" && answers.foreignExpAlignment !== "same-skilled") {
            steps = [
              "한국 경력 기준으로 사용할 primary occupation NOC를 다시 정리합니다: 2-4주",
              "경력증명서와 실제 job duties가 맞는지 점검합니다: 2-6주",
              "언어시험·ECA 준비 뒤 EE/주정부 적합성을 재계산합니다: 1-3개월",
              "맞는 경로가 나오면 프로필 생성과 초청 대기를 시작합니다: 추가 1-6개월+"
            ];
          } else if (hasCanadianWorkBase(answers.base) || answers.canadianExp !== "0" || isCanadianExperienceIntent(answers.path)) {
            steps = [
              "현재 NOC, 근무시간, 합법 체류 상태를 정리합니다: 2-4주",
              "언어시험과 필요한 서류를 정리합니다: 1-3개월",
              "주정부 또는 EE-linked stream 등록/초청 대기를 시작합니다: 1-6개월",
              "초청 후 PR 서류 접수와 심사로 넘어갑니다: 추가 6개월+"
            ];
          } else if (answers.jobOffer === "yes") {
            steps = [
              "고용주 오퍼 조건과 직무 코드를 먼저 확인합니다: 2-4주",
              "해당 지역 고용주 중심 stream 또는 연계 경로를 검토합니다: 1-2개월",
              "EOI/NOI/초청 대기 또는 바로 신청을 시작합니다: 1-6개월",
              "nomination 또는 ITA 후 PR 단계로 넘어갑니다: 추가 6개월+"
            ];
          } else if (insight.statuses.regional === "많음" || insight.statuses.regional === "중심") {
            steps = [
              "지역 커뮤니티 참여 조건과 생활 가능성을 먼저 확인합니다: 2-6주",
              "언어시험·학력평가·경력을 정리합니다: 1-3개월",
              "지역 stream 또는 EOI 등록 후 초청 대기를 시작합니다: 1-6개월",
              "nomination 후 PR 접수로 넘어갑니다: 추가 6개월+"
            ];
          } else {
            steps = [
              "언어시험과 학력평가(ECA)를 준비합니다: 1-3개월",
              "맞는 EE 또는 주정부 stream을 점검하고 프로필을 엽니다",
              "초청 또는 nomination을 기다립니다: 1-6개월+",
              "PR 신청서 접수와 심사로 넘어갑니다: 추가 6개월+"
            ];
          }

          if (insight.id !== "federal") {
            steps.unshift(getProvinceScenarioFocus(insight));
          }

          if (hasCanadianWorkBase(answers.base) && answers.permitRemaining === "lt6") {
            steps.unshift("남은 비자/퍼밋이 6개월 미만이면 4-8주 안에 갈 주, 주력 직군, 잡오퍼 가능성을 먼저 확정합니다.");
          } else if (hasCanadianWorkBase(answers.base) && answers.permitRemaining === "6to12") {
            steps.unshift("남은 비자/퍼밋 6-12개월 안에 언어점수, 직군 정리, 고용주 연결 중 무엇을 먼저 할지 달력 기준으로 정합니다.");
          } else if (hasCanadianWorkBase(answers.base) && ["12to24", "24plus"].includes(answers.permitRemaining)) {
            steps.unshift("남은 비자/퍼밋 기간이 비교적 있어 경력 1년·2년 채우기 전략을 같이 설계해 볼 수 있습니다.");
          }

          return steps.slice(0, 4).map((step, index) => (index + 1) + ". " + step);
        }

        function renderQuickStartResults() {
          if (!quickStartForm || !quickStartResults) {
            return;
          }

          const rawAnswers = readQuickStartRawAnswers();
          const missingRequiredFields = getMissingRequiredFields(rawAnswers);
          trackFormStarted(rawAnswers);
          syncMissingRequiredStates(rawAnswers);

          if (missingRequiredFields.length > 0) {
            quickStartResults.innerHTML = [
              '<div class="wizard-empty wizard-empty-warning">',
              '<span class="wizard-empty-badge">작성 필요 ' + missingRequiredFields.length + '개</span>',
              '<strong>필수* 항목을 먼저 골라주세요.</strong>',
              '<span>아직 선택하지 않은 필수 항목이에요. 아래 강조된 항목부터 채우면 바로 추천이 열립니다.</span>',
              '<ul class="wizard-empty-list">'
                + missingRequiredFields.slice(0, 5).map((field) => '<li>' + escapeHtmlClient(field) + '</li>').join("")
                + '</ul>',
              '</div>'
            ].join("");
            return;
          }

          try {
            const completedRawAnswers = normalizeDependentAnswers(applyOptionalAnswerDefaults(rawAnswers));
            const answers = {
              ...completedRawAnswers,
              ...normalizeLanguageAnswers(completedRawAnswers)
            };
            answers.occupation = getPrimaryOccupationId(answers);
            const allEvaluated = DASHBOARD_INSIGHTS
              .filter((insight) => insight.id !== "nunavut")
              .filter((insight) => activeQuickRegions.size === 0 || activeQuickRegions.has(insight.id))
              .map((insight) => ({
                insight,
                evaluation: scoreInsight(insight, answers)
              }));
            const sortedEvaluated = sortEvaluatedEntries(allEvaluated, answers);
            const federalEntry = sortedEvaluated.find(({ insight }) => insight.id === "federal") ?? null;
            const provinceRanked = sortedEvaluated
              .filter(({ insight }) => insight.id !== "federal")
              .slice(0, 3);
            const regionalFallbackHint = buildRegionalFallbackHint(answers, allEvaluated);
            trackFormCompleted(answers);
            const recommendationSignature = [
              ...provinceRanked.map(({ insight }) => insight.id),
              federalEntry?.insight.id ?? "none",
              answers.path,
              answers.base,
              answers.setting
            ].join("|");

          function renderRecommendationCard(entry, index = null, mode = "province") {
            const { insight, evaluation } = entry;
            const isFederalCard = mode === "federal";
            const fitPercent = estimateFitPercent(answers, evaluation, insight);
            const immigrationChancePercent = estimateImmigrationChancePercent(answers, evaluation, insight);
            const improvementPlan = buildImprovementPlan(answers, insight, immigrationChancePercent);
            const eeSnapshot = getEESnapshot(answers, insight);
            const crsSnapshot = eeSnapshot.crsSnapshot;
            const selectionModel = insight.selectionModel;
            const careerRecognitionItems = buildCareerRecognitionItems(answers, insight);
            const timeline = buildScenarioTimeline(answers, insight);
            const alternativePlans = buildAlternativePlans(answers, insight);
            const pathwayGuideBundle = buildEvaluatedPathwayGuide(answers, insight, eeSnapshot);
            const eligibilitySnapshot = buildEligibilitySnapshot(answers, insight, pathwayGuideBundle);
            const jobRealityItems = buildJobRealityCheck(answers, insight);
            const occupationLens = buildProvinceOccupationLens(answers, insight);
            const concreteProvincePlans = isFederalCard ? [] : buildConcreteProvincePlans(answers, insight);
            const routeReality = buildRouteRealitySnapshot(answers, insight, occupationLens, concreteProvincePlans, isFederalCard);
            const provinceEeBridge = buildProvinceEeBridge(answers, insight, eeSnapshot);
            const profileStrengthItems = buildProfileStrengths(answers);
            const occupationContextLine = buildOccupationContextSummary(answers);
            const pathwayCurrentItems = pathwayGuideBundle.evaluated
              .filter((criterion) => criterion.state === "has")
              .map((criterion) => criterion.label)
              .slice(0, 3);
            const pathwayNeedItems = pathwayGuideBundle.evaluated
              .filter((criterion) => criterion.state !== "has")
              .map((criterion) => criterion.label)
              .slice(0, 3);
            const topActionItems = improvementPlan.items.slice(0, 2);
            const leadSummary = buildRecommendationLeadSummary(answers, insight, evaluation, eeSnapshot);
            const routeTypeLabel = isFederalCard ? "연방" : "주정부";
            const routeSummaryLabel = isFederalCard
              ? "연방 / EE · " + selectionModel.badgeKo
              : "주정부 경로 · " + selectionModel.badgeKo;
            const whyRankItems = [
              occupationLens.rankReasonKo,
              ...evaluation.policyReasons.slice(0, 1),
              isFederalCard
                ? "연방은 EE 점수와 최근 컷오프를 직접 비교합니다."
                : "이 지역은 " + selectionModel.focusKo + "을 먼저 보는 편이에요."
            ].filter(Boolean).slice(0, 3);
            const policyReasonsHtml = evaluation.policyReasons.length > 0
              ? evaluation.policyReasons.map((reason) => "<li>" + escapeHtmlClient(reason) + "</li>").join("")
              : "<li>현재 조건에서 정책 구조를 먼저 확인해 볼 만한 지역입니다.</li>";
            const lifestyleReasonsHtml = evaluation.lifestyleReasons.length > 0
              ? evaluation.lifestyleReasons.map((reason) => "<li>" + escapeHtmlClient(reason) + "</li>").join("")
              : "<li>생활 선호는 중립적으로 반영됐습니다.</li>";
            const freshnessText = "구조 " + escapeHtmlClient(insight.verifiedOn)
              + (insight.latestPublishedAt ? " · 최신 공지 " + escapeHtmlClient(insight.latestPublishedAt) : " · 최신 공지 없음");
            const timelineTitle = isFederalCard ? "연방으로 간다면 이런 순서" : "이 주라면 이런 순서로 준비";
            const timelineHtml = timeline.map((item) => "<li>" + escapeHtmlClient(item) + "</li>").join("");
            const alternativePlanHtml = alternativePlans.length > 0
              ? alternativePlans
                  .map((plan, planIndex) => [
                    '<article class="plan-variant-card">',
                    '<div class="plan-variant-topline">',
                    '<span class="compare-pill">플랜 ' + escapeHtmlClient(String.fromCharCode(65 + planIndex)) + " · " + escapeHtmlClient(plan.type) + '</span>',
                    plan.highlight ? '<span class="plan-variant-highlight">' + escapeHtmlClient(plan.highlight) + '</span>' : "",
                    '</div>',
                    '<strong>' + escapeHtmlClient(plan.title) + '</strong>',
                    '<p>' + escapeHtmlClient(plan.summary) + '</p>',
                    plan.streamLine ? '<p class="plan-variant-stream">' + escapeHtmlClient(plan.streamLine) + '</p>' : "",
                    '<ul class="reason-list">' + plan.steps.map((step) => '<li>' + escapeHtmlClient(step) + '</li>').join("") + '</ul>',
                    '</article>'
                  ].join(""))
                  .join("")
              : "";
            const careerRecognitionHtml = careerRecognitionItems.map((item) => "<li>" + escapeHtmlClient(item) + "</li>").join("");
            const crsNoteText = crsSnapshot.notes.length > 0
              ? crsSnapshot.notes.join(" · ")
              : "현재 입력값 기준으로 바로 비교했습니다.";
            const readinessLine = "영어 상태: " + escapeHtmlClient(answers.languageProfileLabelKo)
              + " / ECA: " + escapeHtmlClient(answers.ecaStatus)
              + (answers.permitRemaining && answers.permitRemaining !== "unsure"
                ? " / 남은 퍼밋: " + escapeHtmlClient(
                  answers.permitRemaining === "not-applicable" ? "해당 없음" :
                  answers.permitRemaining === "lt6" ? "6개월 미만" :
                  answers.permitRemaining === "6to12" ? "6-12개월" :
                  answers.permitRemaining === "12to24" ? "1-2년" : "2년 이상"
                )
                : "");
            const comparePillLabel = isFederalCard
              ? "연방 EE 경쟁력 " + eeSnapshot.band
              : "선발 방식 " + selectionModel.badgeKo;
            const quickActionCards = [
              ...(!isFederalCard && concreteProvincePlans.length > 0 ? [{ mode: "plan", plan: concreteProvincePlans[0] }] : []),
              ...topActionItems.slice(0, !isFederalCard && concreteProvincePlans.length > 0 ? 1 : 2).map((item) => ({ mode: "action", item }))
            ];
            const quickActionsHtml = quickActionCards.length > 0
              ? quickActionCards
                  .map((entry) => {
                    if (entry.mode === "plan") {
                      return [
                        '<li class="compact-action-item">',
                        '<span class="improvement-delta is-positive">' + escapeHtmlClient(entry.plan.badge) + '</span>',
                        '<div class="compact-action-copy">',
                        '<strong>' + escapeHtmlClient(entry.plan.title) + '</strong>',
                        '<p>' + escapeHtmlClient(entry.plan.summary) + '</p>',
                        '</div>',
                        '</li>'
                      ].join("");
                    }

                    const item = entry.item;
                    const actionView = isFederalCard
                      ? {
                          badge: item.scoreImpact?.badge ?? "준비",
                          tone: item.scoreImpact?.tone ?? "neutral",
                          label: item.scoreImpact?.label ?? item.detail
                        }
                      : getProvinceActionPresentation(item);

                    return [
                      '<li class="compact-action-item">',
                      '<span class="improvement-delta is-' + escapeHtmlClient(actionView.tone) + '">' + escapeHtmlClient(actionView.badge) + '</span>',
                      '<div class="compact-action-copy">',
                      '<strong>' + escapeHtmlClient(item.title) + '</strong>',
                      '<p>' + escapeHtmlClient(actionView.label) + '</p>',
                      (!isFederalCard && actionView.note && actionView.note !== actionView.label
                        ? '<p>' + escapeHtmlClient(actionView.note) + '</p>'
                        : ""),
                      '</div>',
                      '</li>'
                    ].join("");
                  })
                  .join("")
              : '<li class="compact-action-item"><span class="improvement-delta is-neutral">준비</span><div class="compact-action-copy"><strong>최신 공지 계속 확인</strong><p>draw, intake, 직군 우선순위 변화가 실제 체감에 더 크게 작용할 수 있어요.</p></div></li>';
            const improvementHtml = improvementPlan.items
              .map((item) => {
                const actionView = isFederalCard
                  ? {
                      badge: item.scoreImpact?.badge ?? "준비",
                      tone: item.scoreImpact?.tone ?? "neutral",
                      label: item.scoreImpact?.label,
                      showImpact: Boolean(item.scoreImpact)
                    }
                  : {
                      ...getProvinceActionPresentation(item),
                      showImpact: Boolean(item.actionId === "pnp-nomination"),
                      impactLabel: item.scoreImpact?.label ?? ""
                    };

                return [
                  '<li class="improvement-item">',
                  '<span class="improvement-delta is-' + escapeHtmlClient(actionView.tone) + '">' + escapeHtmlClient(actionView.badge) + '</span>',
                  '<div class="improvement-copy">',
                  '<div class="improvement-title-row">',
                  '<strong>' + escapeHtmlClient(item.title) + '</strong>',
                  actionView.showImpact
                    ? '<span class="improvement-score-impact is-' + escapeHtmlClient(actionView.tone) + '">' + escapeHtmlClient(actionView.impactLabel || actionView.label) + '</span>'
                    : "",
                  '</div>',
                  '<p>' + escapeHtmlClient(item.detail) + '</p>',
                  '</div>',
                  '</li>'
                ].join("");
              })
              .join("");
            const improvementSummaryLabel = isFederalCard
              ? (
                  improvementPlan.projectedScoreLift > 0
                    ? "예상 CRS " + improvementPlan.baseScore + "점 → " + improvementPlan.projectedScore + "점"
                    : improvementPlan.bestFutureScoreLift > 0
                      ? "지금 " + improvementPlan.baseScore + "점 · 나중에 최대 " + (improvementPlan.baseScore + improvementPlan.bestFutureScoreLift) + "점"
                      : "예상 CRS " + improvementPlan.baseScore + "점 유지"
                )
              : (
                  concreteProvincePlans.length > 0
                    ? "현실 플랜 + 우선 액션"
                    : topActionItems.some((item) => Boolean(item.scoreImpact))
                      ? "주 액션 " + Math.max(1, topActionItems.length) + "개 · EE 연계 포함"
                      : "주 기준 우선 액션 " + Math.max(1, topActionItems.length) + "개"
                );
            const pathwayGuideHtml = renderPathwayGuidePanel(insight, pathwayGuideBundle);
            const provinceEeBridgeHtml = provinceEeBridge
              ? [
                  '<section class="ee-bridge-panel">',
                  '<div class="selection-model-head">',
                  '<strong>연방/EE 연계</strong>',
                  '<span class="selection-model-badge">EE-linked</span>',
                  '</div>',
                  '<ul class="reason-list">',
                  '<li>' + escapeHtmlClient(provinceEeBridge.currentLine) + '</li>',
                  '<li>' + escapeHtmlClient(provinceEeBridge.nominationLine) + '</li>',
                  '<li>' + escapeHtmlClient(provinceEeBridge.clb9Line) + '</li>',
                  '<li>' + escapeHtmlClient(provinceEeBridge.canadianExpLine) + '</li>',
                  '</ul>',
                  '</section>'
                ].join("")
              : "";

            return [
              '<article class="wizard-result-card" data-recommendation-id="' + escapeHtmlClient(insight.id) + '" data-route-type="' + escapeHtmlClient(routeTypeLabel) + '">',
              '<div class="wizard-card-header">',
              '<div class="wizard-card-title-stack">',
              '<div class="card-topline">',
              '<span class="status-badge status-approved">' + escapeHtmlClient(
                isFederalCard ? "연방 / EE" : "추천 " + (index + 1)
              ) + "</span>",
              '<span class="tag">' + escapeHtmlClient(routeTypeLabel) + "</span>",
              "</div>",
              "<h3>" + escapeHtmlClient(insight.labelKo) + "</h3>",
              '<p class="wizard-result-system">' + escapeHtmlClient(routeSummaryLabel) + "</p>",
              "</div>",
              '<div class="wizard-card-mini-map" aria-hidden="true">' + getRecommendationMiniMapMarkup(insight.id) + "</div>",
              "</div>",
              '<p class="wizard-result-lead">' + escapeHtmlClient(leadSummary) + "</p>",
              '<div class="fit-band-row">',
              '<span class="fit-score">예상 적합도 ' + escapeHtmlClient(fitPercent) + '%</span>',
              '<span class="chance-score">현재 진입 가능성 ' + escapeHtmlClient(immigrationChancePercent) + '%</span>',
              '<span class="compare-pill">' + escapeHtmlClient(comparePillLabel) + "</span>",
              "</div>",
              (isFederalCard
                ? '<div class="ee-score-row">'
                  + '<span class="ee-score-pill">예상 CRS ' + escapeHtmlClient(crsSnapshot.score) + '점</span>'
                  + '<span class="ee-cutoff-pill">최근 EE 컷오프 ' + escapeHtmlClient(crsSnapshot.cutoff ?? "대기") + '점</span>'
                  + '<span class="ee-gap-pill ' + (crsSnapshot.gap == null ? "is-neutral" : crsSnapshot.gap >= 0 ? "is-positive" : "is-negative") + '">현재 ' + escapeHtmlClient(crsSnapshot.gapLabel) + '점</span>'
                  + "</div>"
                : ""),
              '<div class="scenario-chip-row">',
              '<span class="compare-pill">EE ' + escapeHtmlClient(insight.statuses.ee) + "</span>",
              '<span class="compare-pill">잡오퍼 ' + escapeHtmlClient(insight.statuses.jobOffer) + "</span>",
              '<span class="compare-pill">졸업자 ' + escapeHtmlClient(insight.statuses.graduate) + "</span>",
              '<span class="compare-pill">비용 ' + escapeHtmlClient(insight.lifestyle.costLabelKo) + "</span>",
              '<span class="compare-pill">지역정착 ' + escapeHtmlClient(insight.lifestyle.regionalLabelKo) + "</span>",
              "</div>",
              (!isFederalCard
                ? '<p class="wizard-freshness">직무 기준: ' + escapeHtmlClient(occupationContextLine) + "</p>"
                : ""),
              '<div class="route-reality-banner is-' + escapeHtmlClient(routeReality.tone) + '">',
              '<span class="route-reality-badge">' + escapeHtmlClient(routeReality.badge) + '</span>',
              '<div class="route-reality-copy">',
              '<strong>' + escapeHtmlClient(routeReality.title) + '</strong>',
              '<p>' + escapeHtmlClient(routeReality.summary) + '</p>',
              '</div>',
              '</div>',
              '<div class="result-summary-stack">',
              '<div class="result-summary-card">',
              '<strong>왜 이 순위인가</strong>',
              '<ul class="result-summary-list">' + whyRankItems.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join("") + '</ul>',
              '</div>',
              '<div class="result-summary-card">',
              '<strong>내가 이미 가진 것</strong>',
              '<ul class="result-summary-list">'
                + (profileStrengthItems.length
                  ? profileStrengthItems.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join("")
                  : pathwayCurrentItems.length
                    ? pathwayCurrentItems.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join("")
                  : '<li>강점 정리를 더 해보는 게 좋아요.</li>')
                + '</ul>',
              '</div>',
              '<div class="result-summary-card">',
              '<div class="improvement-head">',
              '<strong>지금 할 것</strong>',
              '<span class="improvement-total">' + escapeHtmlClient(improvementSummaryLabel) + '</span>',
              '</div>',
              '<ul class="compact-action-list">' + quickActionsHtml + '</ul>',
              '</div>',
              '</div>',
              '<details class="result-details">',
              '<summary>자세히 보기</summary>',
              '<p class="wizard-freshness">정책 반영 기준: ' + freshnessText + "</p>",
              '<p class="wizard-freshness">서류 준비 상태: ' + readinessLine + "</p>",
              (!isFederalCard
                ? '<section class="result-summary-block detail-summary-block">'
                  + '<strong>현재 자격상태</strong>'
                  + '<div class="eligibility-snapshot">'
                  + '<span class="compare-pill">' + escapeHtmlClient(eligibilitySnapshot.badge) + '</span>'
                  + '<p>' + escapeHtmlClient(eligibilitySnapshot.summary) + '</p>'
                  + '<ul class="reason-list">'
                  + '<li>지금 가진 축: ' + escapeHtmlClient(eligibilitySnapshot.currentLine) + '</li>'
                  + (eligibilitySnapshot.blockerLine ? '<li>더 확인할 것: ' + escapeHtmlClient(eligibilitySnapshot.blockerLine) + '</li>' : '')
                  + '<li>이 주에서 들어가는 기본 흐름: ' + escapeHtmlClient(eligibilitySnapshot.nextTrack) + '</li>'
                  + '</ul>'
                  + '</div>'
                  + '</section>'
                : ""),
              (!isFederalCard && jobRealityItems.length > 0
                ? '<section class="career-check-panel">'
                  + '<strong>직무 현실 체크</strong>'
                  + '<ul class="reason-list career-check-list">' + jobRealityItems.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join("") + '</ul>'
                  + '</section>'
                : ""),
              '<section class="career-check-panel">'
                + '<strong>' + escapeHtmlClient(isFederalCard ? "연방 기준으로 이 직무를 보면" : "이 직무를 이 주에서 보면") + '</strong>'
                + '<div class="eligibility-snapshot">'
                + '<span class="compare-pill">' + escapeHtmlClient(occupationLens.badge) + '</span>'
                + '<p>' + escapeHtmlClient(occupationLens.summary) + '</p>'
                + '<ul class="reason-list">'
                + (occupationLens.titleLensLines || []).map((line) => '<li>' + escapeHtmlClient(line) + '</li>').join("")
                + '<li>연방 기준: ' + escapeHtmlClient(occupationLens.federalReadiness) + '</li>'
                + '<li>NOC 예시: ' + escapeHtmlClient((occupationLens.nocExamples || []).join(" / ")) + '</li>'
                + '<li>해석 후보: ' + escapeHtmlClient((occupationLens.candidateProfiles || []).map((candidate) => candidate.label + " (" + candidate.teer + ", " + candidate.note + ")").join(" / ")) + '</li>'
                + '<li>' + escapeHtmlClient(isFederalCard ? "지금 먼저 볼 것" : "이 주에서 먼저 볼 것") + ': ' + escapeHtmlClient(occupationLens.primaryRoute) + '</li>'
                + '<li>직접 안 되면: ' + escapeHtmlClient(occupationLens.fallbackRoute) + '</li>'
                + '</ul>'
                + '</div>'
                + '</section>',
              (!isFederalCard && concreteProvincePlans.length > 0
                ? '<section class="plan-variants-panel">'
                  + '<div class="plan-variants-head"><strong>이 주에서 가능한 현실 플랜</strong><p class="wizard-freshness">지금 직무 그대로 가는지, 같은 업종 안에서 올려야 하는지, 학교가 먼저인지 비교해 보세요.</p></div>'
                  + '<div class="plan-variant-grid">'
                  + concreteProvincePlans.map((plan, planIndex) => [
                      '<article class="plan-variant-card">',
                      '<div class="plan-variant-topline">',
                      '<span class="compare-pill">플랜 ' + escapeHtmlClient(String.fromCharCode(65 + planIndex)) + '</span>',
                      '<span class="plan-variant-highlight">' + escapeHtmlClient(plan.badge) + '</span>',
                      '</div>',
                      '<strong>' + escapeHtmlClient(plan.title) + '</strong>',
                      '<p>' + escapeHtmlClient(plan.summary) + '</p>',
                      '<ul class="reason-list">' + plan.steps.map((step) => '<li>' + escapeHtmlClient(step) + '</li>').join("") + '</ul>',
                      '</article>'
                    ].join("")).join("")
                  + '</div>'
                  + '</section>'
                : ""),
              '<section class="result-summary-block detail-summary-block">',
              '<strong>이 경로가 실제로 보는 것</strong>',
              '<ul class="result-summary-list">'
                + (pathwayNeedItems.length
                  ? pathwayNeedItems.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join("")
                  : pathwayCurrentItems.map((item) => '<li>' + escapeHtmlClient(item) + '</li>').join(""))
                + '</ul>',
              '</section>',
              '<section class="selection-model-panel">',
              '<div class="selection-model-head">',
              '<strong>' + escapeHtmlClient(isFederalCard ? "연방은 이렇게 봐요" : "이 지역은 이렇게 뽑아요") + '</strong>',
              '<span class="selection-model-badge">' + escapeHtmlClient(selectionModel.badgeKo) + '</span>',
              '</div>',
              '<p class="selection-model-detail">' + escapeHtmlClient(selectionModel.detailKo) + '</p>',
              '<div class="selection-model-grid">',
              '<div class="selection-model-stat"><span>점수 읽는 법</span><strong>' + escapeHtmlClient(selectionModel.scoreViewKo) + '</strong></div>',
              '<div class="selection-model-stat"><span>지금 먼저 볼 것</span><strong>' + escapeHtmlClient(selectionModel.focusKo) + '</strong></div>',
              '<div class="selection-model-stat"><span>신청 흐름</span><strong>' + escapeHtmlClient(selectionModel.intakeKo) + '</strong></div>',
              '</div>',
              '</section>',
              (isFederalCard
                ? '<p class="wizard-freshness">' + escapeHtmlClient(eeSnapshot.explain) + "</p>"
                  + '<p class="wizard-freshness">' + escapeHtmlClient(eeSnapshot.comparison) + "</p>"
                  + '<p class="wizard-freshness">' + escapeHtmlClient(crsNoteText) + "</p>"
                : ""),
              provinceEeBridgeHtml,
              pathwayGuideHtml,
              '<section class="career-check-panel">',
              '<strong>경력 인정 체크</strong>',
              '<ul class="reason-list career-check-list">' + careerRecognitionHtml + '</ul>',
              '</section>',
              '<section class="improvement-panel">',
              '<div class="improvement-head">',
              '<strong>' + escapeHtmlClient(isFederalCard ? "가능성 올리는 다음 액션" : "이 주 기준으로 먼저 할 것") + '</strong>',
              '<span class="improvement-total">' + escapeHtmlClient(improvementSummaryLabel) + '</span>',
              '</div>',
              '<p class="wizard-freshness">' + escapeHtmlClient(
                isFederalCard
                  ? (
                    improvementPlan.projectedScoreLift > 0
                      ? "직접 점수에 반영되는 액션은 CRS 기준으로 먼저 정렬했습니다. 점수는 안 오르지만 경로를 넓히는 액션도 같이 남겼습니다."
                      : improvementPlan.bestFutureScoreLift > 0
                        ? "바로 오르는 점수는 없지만, 아래처럼 시간이 필요한 액션은 나중에 실제 CRS 상승으로 이어질 수 있습니다."
                        : "점수는 안 오르지만 경로를 넓히거나 서류를 정리하는 액션을 먼저 보여줍니다."
                  )
                  : "이 주는 점수 하나보다 stream 자격, 고용주 연결, 서류 순서를 먼저 정리하는 편이 이해가 쉽습니다."
              ) + '</p>',
              (isFederalCard ? '<p class="wizard-freshness">EE 각 액션 아래에는 CRS 직접 변화도 같이 표시합니다.</p>' : ""),
              '<ul class="improvement-list">' + improvementHtml + '</ul>',
              '</section>',
              (alternativePlanHtml
                ? '<section class="plan-variants-panel">'
                  + '<div class="plan-variants-head"><strong>가능한 플랜 A/B/C</strong><p class="wizard-freshness">한 가지 길만 보지 말고, 점수형·불어형·직무형·학교형 중 어떤 방식이 더 현실적인지도 같이 비교해 보세요.</p></div>'
                  + '<div class="plan-variant-grid">' + alternativePlanHtml + '</div>'
                  + '</section>'
                : ""),
              '<div class="reason-columns">',
              '<div><strong>정책 적합</strong><ul class="reason-list">' + policyReasonsHtml + "</ul></div>",
              '<div><strong>생활 선호</strong><ul class="reason-list">' + lifestyleReasonsHtml + "</ul></div>",
              "</div>",
              '<div><strong>' + escapeHtmlClient(timelineTitle) + '</strong><ul class="reason-list">' + timelineHtml + "</ul></div>",
              '</details>',
              '<a class="btn ghost" data-recommendation-link data-recommendation-id="' + escapeHtmlClient(insight.id) + '" data-route-type="' + escapeHtmlClient(routeTypeLabel) + '" href="' + ((BASE_PATH || "") + '/region/' + encodeURIComponent(insight.id)) + '">이 지역 먼저 보기</a>',
              "</article>"
            ].join("");
          }

            const provinceHeaderNote = federalEntry
              ? "주정부 추천은 아래 순위로 보고, 연방 EE는 따로 비교합니다."
              : "지금 조건에서 먼저 볼 주정부 순서를 1순위부터 정리했습니다.";
            const resultsSections = [];

            if (provinceRanked.length > 0) {
              resultsSections.push(
                [
                  '<div class="wizard-section-heading">',
                  '<div>',
                  '<p class="panel-kicker">Recommendations</p>',
                  '<h3>현재 조건에서 먼저 볼 주정부 추천 순위</h3>',
                  '</div>',
                  '<p class="panel-note">' + escapeHtmlClient(provinceHeaderNote) + '</p>',
                  '</div>'
                ].join("")
              );
              if (regionalFallbackHint) {
                resultsSections.push(regionalFallbackHint);
              }
              const titleInterpretationSection = renderTitleInterpretationSection(answers);
              if (titleInterpretationSection) {
                resultsSections.push(titleInterpretationSection);
              }
              resultsSections.push(provinceRanked.map((entry, index) => renderRecommendationCard(entry, index, "province")).join(""));
            }

            if (federalEntry) {
              resultsSections.push(
                [
                  '<div class="wizard-section-heading federal-side-heading">',
                  '<div>',
                  '<p class="panel-kicker">Federal</p>',
                  '<h3>연방 / EE는 따로 보기</h3>',
                  '</div>',
                  '<p class="panel-note">연방은 주정부와 다르게 CRS와 최근 컷오프를 따로 비교하는 편이 이해하기 쉽습니다.</p>',
                  '</div>'
                ].join("")
              );
              resultsSections.push(renderRecommendationCard(federalEntry, null, "federal"));
            }

            quickStartResults.innerHTML = resultsSections.join("");
            bindRecommendationInteractions();

            if (recommendationSignature !== lastRenderedRecommendationSignature) {
              lastRenderedRecommendationSignature = recommendationSignature;
              trackAnalytics("recommendations_rendered", {
                top_province: provinceRanked[0]?.insight.id ?? "none",
                has_federal_card: Boolean(federalEntry),
                selected_region_count: activeQuickRegions.size || MAP_REGION_DEFS.length,
                metro_preference: answers.setting
              });
            }
          } catch (error) {
            console.error("MapleGuide quick-start render failed", error, rawAnswers);
            quickStartResults.innerHTML = [
              '<div class="wizard-empty wizard-empty-warning">',
              '<span class="wizard-empty-badge">결과 계산 오류</span>',
              '<strong>입력값은 읽었지만 결과를 그리는 중 문제가 생겼어요.</strong>',
              '<span>다시 선택해도 계속 같다면, 마지막으로 고른 항목과 함께 알려주시면 바로 수정할게요.</span>',
              '</div>'
            ].join("");
          }
        }

        if (quickStartForm) {
          quickStartForm.addEventListener("change", renderQuickStartResults);
          quickStartForm.addEventListener("input", renderQuickStartResults);
          quickStartForm.addEventListener("change", syncOccupationTitleHints);
          [koreaJobTitleInput, canadaJobTitleInput].forEach((inputNode) => {
            inputNode?.addEventListener("input", () => {
              syncOccupationTitleHints();
              renderQuickStartResults();
            });
          });
          syncDependentSelects();
          syncOccupationTitleHints();
          renderQuickStartResults();
        }

        const quickFilterMapEntries = Array.from(document.querySelectorAll("[data-quick-map-region]"))
          .map((regionNode) => {
            const regionId = regionNode.dataset.quickMapRegion;

            function syncSelectedState() {
              const selected = activeQuickRegions.has(regionId);
              regionNode.classList.toggle("is-selected", selected);
            }

            function onToggle() {
              toggleQuickRegion(regionId);
              syncSelectedState();
              updateQuickRegionSummary();
              renderQuickStartResults();
            }

            regionNode.addEventListener("click", onToggle);
            syncSelectedState();

            return {
              regionId,
              syncSelectedState
            };
          });

        if (quickRegionFederalButton) {
          quickRegionFederalButton.addEventListener("click", () => {
            toggleQuickRegion("federal");
            quickRegionFederalButton.classList.toggle("active", activeQuickRegions.has("federal"));
            updateQuickRegionSummary();
            renderQuickStartResults();
          });
        }

        if (quickRegionClearButton) {
          quickRegionClearButton.addEventListener("click", () => {
            selectAllQuickRegions();
            if (quickRegionFederalButton) {
              quickRegionFederalButton.classList.add("active");
            }
            quickFilterMapEntries.forEach((entry) => entry.syncSelectedState());
            updateQuickRegionSummary();
            renderQuickStartResults();
          });
        }

        updateQuickRegionSummary();

        const svgRegionEntries = MAP_REGION_DEFS
          .filter((region) => region.svgId)
          .map((region) => {
            const regionNode = document.getElementById(region.svgId);
            const labelNode = document.getElementById(region.svgId + " Label");
            const regionUpdates = UPDATES.filter((update) => update.jurisdiction === region.id);
            const programs = [...new Set(regionUpdates.map((update) => update.program))];
            const latestDate = regionUpdates
              .map((update) => update.publishedAt)
              .filter(Boolean)
              .sort()
              .at(-1) || "업데이트 없음";
            const tooltip = region.labelKo
              + " · "
              + (regionUpdates.length > 0 ? "업데이트 " + regionUpdates.length + "건" : "준비 중")
              + " · "
              + (programs.length > 0 ? programs.join(", ") : "source pending")
              + " · "
              + latestDate;

            if (!regionNode) {
              return null;
            }

            regionNode.classList.add("map-region");
            regionNode.classList.add(regionUpdates.length > 0 ? "is-available" : "is-empty");
            regionNode.dataset.jurisdiction = region.id;
            regionNode.dataset.labelKo = region.labelKo;
            regionNode.dataset.tooltip = tooltip;
            regionNode.setAttribute("tabindex", "0");
            regionNode.setAttribute("role", "button");
            regionNode.setAttribute("aria-label", region.labelKo);

            if (labelNode) {
              labelNode.classList.add("map-region-label");
            }

            return {
              id: region.id,
              regionNode,
              labelNode
            };
          })
          .filter(Boolean);

        const entryById = new Map(svgRegionEntries.map((entry) => [entry.id, entry]));
        let activeEntry = null;

        function regionHref(jurisdictionId) {
          return (BASE_PATH || "") + "/region/" + encodeURIComponent(jurisdictionId);
        }

        function setSelectionCard(jurisdictionId) {
          const region = MAP_REGION_DEFS.find((candidate) => candidate.id === jurisdictionId);
          if (!region) {
            if (mapSelectionLabel) {
              mapSelectionLabel.textContent = defaultSelection.label;
            }
            if (mapSelectionMeta) {
              mapSelectionMeta.textContent = defaultSelection.meta;
            }
            if (mapSelectionLink) {
              mapSelectionLink.href = defaultSelection.href;
              mapSelectionLink.textContent = defaultSelection.linkText;
            }
            return;
          }

          const regionUpdates = UPDATES.filter((update) => update.jurisdiction === jurisdictionId);
          const programs = [...new Set(regionUpdates.map((update) => update.program))];
          const latestDate = regionUpdates
            .map((update) => update.publishedAt)
            .filter(Boolean)
            .sort()
            .at(-1);

          if (mapSelectionLabel) {
            mapSelectionLabel.textContent = region.labelKo;
          }
          if (mapSelectionMeta) {
            mapSelectionMeta.textContent = regionUpdates.length > 0
              ? region.labelKo + " 업데이트 " + regionUpdates.length + "건 · "
                + (programs.length > 0 ? programs.join(", ") : "program pending")
                + (latestDate ? " · 최신 발표 " + latestDate : "")
              : region.labelKo + " 상세 페이지로 이동합니다. 아직 카드가 없으면 준비 중 상태와 연결 소스를 먼저 보여줍니다.";
          }
          if (mapSelectionLink) {
            mapSelectionLink.href = regionHref(jurisdictionId);
            mapSelectionLink.textContent = region.labelKo + " 페이지 열기";
          }
        }

        function clearHighlight() {
          if (!activeEntry) {
            return;
          }

          activeEntry.regionNode.classList.remove("is-selected");
          if (activeEntry.labelNode) {
            activeEntry.labelNode.classList.remove("is-selected");
          }
          activeEntry = null;
        }

        function highlightJurisdiction(jurisdictionId) {
          clearHighlight();
          const entry = entryById.get(jurisdictionId);
          if (!entry) {
            return;
          }

          entry.regionNode.classList.add("is-selected");
          if (entry.labelNode) {
            entry.labelNode.classList.add("is-selected");
          }
          activeEntry = entry;
        }

        function showTooltip(event, region) {
          if (!mapTooltip) {
            return;
          }

          mapTooltip.hidden = false;
          mapTooltip.textContent = region.dataset.tooltip;
          mapTooltip.style.left = event.clientX + 16 + "px";
          mapTooltip.style.top = event.clientY + 16 + "px";
        }

        function hideTooltip() {
          if (mapTooltip) {
            mapTooltip.hidden = true;
          }
        }

        function resetSelectionState() {
          clearHighlight();
          setSelectionCard(null);
        }

        svgRegionEntries.forEach((entry) => {
          const region = entry.regionNode;
          region.addEventListener("mouseenter", (event) => {
            highlightJurisdiction(entry.id);
            setSelectionCard(entry.id);
            showTooltip(event, region);
          });
          region.addEventListener("mousemove", (event) => showTooltip(event, region));
          region.addEventListener("mouseleave", () => {
            hideTooltip();
            resetSelectionState();
          });
          region.addEventListener("focus", () => {
            highlightJurisdiction(entry.id);
            setSelectionCard(entry.id);
            if (!mapTooltip) {
              return;
            }
            mapTooltip.hidden = false;
            mapTooltip.textContent = region.dataset.tooltip;
            const rect = region.getBoundingClientRect();
            mapTooltip.style.left = rect.left + rect.width / 2 + "px";
            mapTooltip.style.top = rect.top - 8 + "px";
          });
          region.addEventListener("blur", () => {
            hideTooltip();
            resetSelectionState();
          });
          region.addEventListener("click", () => {
            window.location.assign(regionHref(entry.id));
          });
          region.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              window.location.assign(regionHref(entry.id));
            }
          });
        });

        hoverableJumpLinks.forEach((link) => {
          const jurisdictionId = link.dataset.jurisdictionLink;

          link.addEventListener("mouseenter", () => {
            highlightJurisdiction(jurisdictionId);
            setSelectionCard(jurisdictionId);
          });
          link.addEventListener("focus", () => {
            highlightJurisdiction(jurisdictionId);
            setSelectionCard(jurisdictionId);
          });
          link.addEventListener("mouseleave", resetSelectionState);
          link.addEventListener("blur", resetSelectionState);
        });

        setSelectionCard(null);
      }
    </script>
  `;
}

function renderLayout({ title, page, body, updates, basePath = "", analyticsMeasurementId = "" }) {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link
      href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css"
      rel="stylesheet"
    />
    ${analyticsMeasurementId
      ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(analyticsMeasurementId)}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag("js", new Date());
      gtag("config", ${serializeForScript(analyticsMeasurementId)}, {
        page_title: ${serializeForScript(title)},
        page_path: window.location.pathname + window.location.search
      });
    </script>`
      : ""}
    <style>
      :root {
        --bg: #edf4fc;
        --bg-strong: #dde9f7;
        --surface: rgba(248, 251, 255, 0.84);
        --surface-strong: #f9fbff;
        --text: #10233f;
        --muted: #52647f;
        --line: rgba(15, 61, 127, 0.12);
        --accent: #0f3d7f;
        --accent-deep: #0a2c5d;
        --accent-soft: #d9e6f8;
        --accent-strong: #2f6ec4;
        --green: #215f4f;
        --green-soft: #d3ebe3;
        --blue: #2f6ec4;
        --blue-soft: #dbe8fb;
        --amber: #b57c2e;
        --amber-soft: #f2e4cb;
        --shadow: 0 20px 60px rgba(15, 61, 127, 0.14);
        --radius-xl: 32px;
        --radius-lg: 24px;
        --radius-md: 18px;
        --radius-sm: 14px;
      }

      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(255, 255, 255, 0.95), transparent 28%),
          radial-gradient(circle at top right, rgba(73, 129, 211, 0.16), transparent 24%),
          linear-gradient(180deg, #f5f9ff 0%, var(--bg) 52%, #e8f0fa 100%);
        font-family:
          "SUIT Variable",
          "Pretendard Variable",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          sans-serif;
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(15, 61, 127, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(15, 61, 127, 0.06) 1px, transparent 1px);
        background-size: 36px 36px;
        mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 88%);
        opacity: 0.5;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      button,
      input,
      textarea,
      select {
        font: inherit;
      }

      button,
      a {
        -webkit-tap-highlight-color: transparent;
      }

      .page-shell {
        position: relative;
        width: min(calc(100% - 32px), 1180px);
        margin: 0 auto;
        padding: 22px 0 72px;
      }

      .site-header {
        position: sticky;
        top: 14px;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 20px;
        padding: 14px 18px;
        margin-bottom: 24px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(248, 251, 255, 0.84);
        backdrop-filter: blur(16px);
        box-shadow: 0 8px 28px rgba(15, 61, 127, 0.09);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border-radius: var(--radius-sm);
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: #fff;
        font-size: 0.95rem;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      .brand-copy {
        display: grid;
      }

      .brand-copy strong {
        font-size: 0.98rem;
      }

      .brand-copy span {
        color: var(--muted);
        font-size: 0.82rem;
      }

      .site-nav {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .site-header-tools {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .site-nav a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        padding: 0 18px;
        border: 1px solid rgba(15, 61, 127, 0.14);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        color: var(--accent-deep);
        font-size: 0.92rem;
        font-weight: 700;
        transition:
          transform 180ms ease,
          box-shadow 180ms ease,
          background 180ms ease,
          border-color 180ms ease;
      }

      .site-nav a:hover,
      .site-nav a:focus-visible {
        transform: translateY(-1px);
        border-color: rgba(15, 61, 127, 0.24);
        box-shadow: 0 10px 24px rgba(15, 61, 127, 0.08);
        background: rgba(255, 255, 255, 0.92);
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
        gap: 20px;
        margin-bottom: 20px;
      }

      .hero-copy,
      .hero-panel,
      .section,
      .news-card,
      .studio-card {
        position: relative;
        overflow: hidden;
        padding: 28px;
        border: 1px solid var(--line);
        border-radius: var(--radius-xl);
        background: linear-gradient(180deg, rgba(252, 254, 255, 0.94), rgba(245, 249, 255, 0.8));
        box-shadow: var(--shadow);
      }

      .hero-copy::before,
      .hero-panel::before,
      .section::before,
      .news-card::before,
      .studio-card::before {
        content: "";
        position: absolute;
        inset: auto -10% -48% 42%;
        height: 320px;
        background: radial-gradient(circle, rgba(15, 61, 127, 0.16), transparent 66%);
        pointer-events: none;
      }

      .eyebrow,
      .panel-kicker {
        margin: 0 0 14px;
        color: var(--accent-deep);
        font-size: 0.82rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.16em;
      }

      h1 {
        margin: 0 0 14px;
        font-weight: 800;
        font-size: clamp(2.5rem, 4vw, 4.5rem);
        line-height: 1.05;
        letter-spacing: -0.045em;
      }

      .hero-text {
        max-width: 60ch;
        margin: 20px 0 0;
        color: var(--muted);
        font-size: 1.08rem;
        line-height: 1.8;
      }

      .crumbs {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 20px;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .hero-actions,
      .studio-actions,
      .chip-row,
      .pill-row,
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .btn,
      .chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        padding: 0 22px;
        border: 1px solid rgba(15, 61, 127, 0.14);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.62);
        color: var(--text);
        font-weight: 700;
        cursor: pointer;
        transition:
          transform 180ms ease,
          box-shadow 180ms ease,
          background 180ms ease;
      }

      .btn:hover,
      .btn:focus-visible,
      .chip:hover,
      .chip:focus-visible,
      .news-card:hover,
      .studio-card:hover {
        transform: translateY(-2px);
      }

      .chip.active {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: #fff9f5;
        box-shadow: 0 16px 32px rgba(15, 61, 127, 0.18);
      }

      .btn.ghost {
        background: rgba(255, 255, 255, 0.62);
      }

      .btn.tone-red {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: #fff9f5;
        box-shadow: 0 16px 32px rgba(15, 61, 127, 0.24);
      }

      .btn.tone-amber {
        background: var(--amber-soft);
        color: #78511a;
      }

      .btn.tone-green {
        background: var(--green);
        color: #f3fff5;
      }

      .btn.tone-blue {
        background: var(--blue);
        color: #f3f8ff;
      }

      .hero-panel {
        align-self: end;
      }

      .map-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
        gap: 18px;
        align-items: start;
      }

      .map-landing {
        display: grid;
        gap: 12px;
        min-height: calc(100vh - 156px);
        align-content: center;
      }

      .map-landing-shell {
        position: relative;
        padding: 22px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: 36px;
        background:
          radial-gradient(circle at top right, rgba(47, 110, 196, 0.12), transparent 26%),
          linear-gradient(180deg, rgba(252, 254, 255, 0.94), rgba(245, 249, 255, 0.82));
        box-shadow: var(--shadow);
      }

      .map-floating-chip {
        position: absolute;
        top: 20px;
        left: 20px;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 48px;
        padding: 0 18px;
        border: 1px solid rgba(15, 61, 127, 0.14);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.84);
        box-shadow: 0 16px 28px rgba(15, 61, 127, 0.12);
        backdrop-filter: blur(10px);
      }

      .map-floating-chip strong {
        font-size: 0.95rem;
      }

      .map-floating-chip span {
        color: var(--muted);
        font-size: 0.92rem;
      }

      .map-shell,
      .map-focus-card,
      .map-index {
        position: relative;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: var(--surface);
        backdrop-filter: blur(10px);
      }

      .map-shell {
        padding: 20px;
      }

      .map-sidebar {
        display: grid;
        gap: 14px;
      }

      .map-focus-card,
      .map-index {
        padding: 20px;
      }

      .map-focus-card h3 {
        margin: 0 0 10px;
        font-size: 1.5rem;
        line-height: 1.3;
      }

      .map-selection-meta,
      .results-helper,
      .panel-note {
        color: var(--muted);
        line-height: 1.75;
      }

      .canada-map {
        width: 100%;
        height: auto;
        display: block;
      }

      .map-frame {
        border: 1px solid rgba(15, 61, 127, 0.08);
        border-radius: var(--radius-lg);
        background:
          radial-gradient(circle at top right, rgba(47, 110, 196, 0.12), transparent 28%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(245, 249, 255, 0.74));
        overflow: hidden;
      }

      .map-frame-landing {
        min-height: min(72vh, 860px);
        padding: 40px 42px 30px;
        display: grid;
        place-items: center;
        overflow: visible;
      }

      .federal-jump-row {
        margin-bottom: 14px;
      }

      .federal-jump {
        width: 100%;
      }

      .actual-map {
        width: 100%;
        height: auto;
        max-height: min(68vh, 780px);
      }

      .actual-map text {
        fill: var(--accent-deep);
        font-family:
          "SUIT Variable",
          "Pretendard Variable",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          sans-serif;
        font-weight: 700;
        pointer-events: none;
        user-select: none;
      }

      .actual-map .map-region,
      .actual-map path.map-region {
        cursor: pointer;
        outline: none;
      }

      .actual-map .map-region path,
      .actual-map path.map-region {
        fill: rgba(255, 255, 255, 0.78);
        stroke: rgba(15, 61, 127, 0.18);
        stroke-width: 1.4;
        transition:
          fill 180ms ease,
          stroke 180ms ease,
          filter 180ms ease;
      }

      .actual-map .map-region.is-empty path,
      .actual-map path.map-region.is-empty {
        fill: rgba(245, 249, 255, 0.72);
        stroke: rgba(15, 61, 127, 0.12);
      }

      .actual-map .map-region.is-available:hover path,
      .actual-map .map-region.is-available:focus path,
      .actual-map .map-region.is-selected path,
      .actual-map path.map-region.is-available:hover,
      .actual-map path.map-region.is-available:focus,
      .actual-map path.map-region.is-selected {
        fill: rgba(47, 110, 196, 0.24);
        stroke: rgba(15, 61, 127, 0.52);
        filter: drop-shadow(0 12px 24px rgba(15, 61, 127, 0.18));
      }

      .actual-map .map-region.is-empty:hover path,
      .actual-map .map-region.is-empty:focus path,
      .actual-map path.map-region.is-empty:hover,
      .actual-map path.map-region.is-empty:focus {
        fill: rgba(217, 230, 248, 0.95);
        stroke: rgba(15, 61, 127, 0.22);
      }

      .actual-map .map-region-label {
        fill: rgba(10, 44, 93, 0.86);
        transition: fill 180ms ease, transform 180ms ease;
      }

      .actual-map .map-region-label.is-selected {
        fill: var(--accent-strong);
      }

      .map-tooltip {
        position: fixed;
        z-index: 40;
        max-width: 280px;
        padding: 10px 12px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-sm);
        background: rgba(16, 35, 63, 0.92);
        color: #f8fbff;
        font-size: 0.92rem;
        line-height: 1.5;
        pointer-events: none;
        box-shadow: 0 20px 40px rgba(15, 61, 127, 0.2);
      }

      .map-attribution {
        margin: 12px 0 0;
        color: var(--muted);
        font-size: 0.85rem;
        line-height: 1.6;
      }

      .map-attribution a {
        color: var(--accent-deep);
        text-decoration: underline;
      }

      .map-index {
        display: grid;
        gap: 18px;
      }

      .map-index-group {
        display: grid;
        gap: 10px;
      }

      .map-index-group.subtle {
        gap: 12px;
      }

      .map-index-item {
        display: grid;
        gap: 4px;
        width: 100%;
        padding: 14px 16px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.7);
        text-align: left;
        cursor: pointer;
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          box-shadow 180ms ease;
      }

      .map-index-item strong {
        font-size: 1rem;
      }

      .map-index-item span {
        color: var(--muted);
        font-size: 0.92rem;
      }

      .map-index-item:hover,
      .map-index-item:focus-visible {
        transform: translateY(-2px);
        border-color: rgba(15, 61, 127, 0.24);
        box-shadow: 0 16px 30px rgba(15, 61, 127, 0.12);
      }

      .map-standby-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .standby-chip {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(217, 230, 248, 0.7);
        color: var(--accent-deep);
        font-size: 0.86rem;
        font-weight: 700;
      }

      .panel-label,
      .tag,
      .eyebrow,
      .status-badge,
      .mini-flag,
      .pill {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        min-height: 32px;
        padding: 0 12px;
        border-radius: 999px;
      }

      .panel-label,
      .tag,
      .pill {
        background: var(--accent-soft);
        color: var(--accent-deep);
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .hero-panel h2,
      .panel-head h2 {
        margin: 0;
        font-size: clamp(1.85rem, 2.6vw, 3rem);
        line-height: 1.22;
        letter-spacing: -0.05em;
      }

      .hero-stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin: 20px 0 24px;
      }

      .hero-stats div,
      .export-preview,
      .pill,
      .studio-card,
      .news-card {
        border: 1px solid rgba(15, 61, 127, 0.12);
        background: var(--surface);
        backdrop-filter: blur(10px);
      }

      .hero-stats div {
        padding: 18px;
        border-radius: var(--radius-md);
      }

      .hero-stats dt,
      .hero-stats dd {
        margin: 0;
      }

      .hero-stats dt {
        color: var(--muted);
        font-size: 0.92rem;
      }

      .hero-stats dd {
        display: block;
        margin-top: 10px;
        font-size: 1rem;
        font-weight: 800;
      }

      .hero-panel-note {
        margin: 0 0 18px;
        color: var(--muted);
        line-height: 1.7;
      }

      .home-latest-section {
        display: grid;
        gap: 8px;
      }

      .update-flash-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 6px;
      }

      .update-flash-card {
        display: block;
        padding: 0;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: rgba(255, 255, 255, 0.76);
      }

      .update-flash-summary {
        display: grid;
        grid-template-columns: 116px 92px minmax(0, 1fr) 18px;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        cursor: pointer;
        list-style: none;
      }

      .update-flash-summary::-webkit-details-marker {
        display: none;
      }

      .update-flash-jurisdiction {
        color: var(--accent-deep);
        font-size: 0.83rem;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
      }

      .update-flash-date {
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
      }

      .update-flash-summary strong {
        min-width: 0;
        font-size: 0.91rem;
        line-height: 1.1;
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .update-flash-chevron {
        flex: 0 0 auto;
        color: var(--muted);
        font-size: 0.94rem;
        transition: transform 160ms ease, color 160ms ease;
      }

      .update-flash-card[open] .update-flash-chevron {
        transform: rotate(180deg);
        color: var(--accent-deep);
      }

      .update-flash-detail {
        display: grid;
        gap: 10px;
        padding: 0 16px 16px;
        border-top: 1px solid rgba(15, 61, 127, 0.08);
      }

      .update-flash-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .update-flash-description {
        color: var(--text);
      }

      .update-flash-list {
        display: grid;
        gap: 6px;
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
      }

      .update-flash-list li {
        line-height: 1.55;
      }

      .update-flash-more {
        display: grid;
        gap: 12px;
        margin-top: 12px;
      }

      .update-more-button {
        min-height: 42px;
        padding: 0 18px;
        justify-self: start;
      }

      .update-flash-more-note {
        margin: 0 0 2px;
        color: var(--muted);
        font-size: 0.92rem;
      }

      .update-flash-more-list {
        display: grid;
        gap: 10px;
      }

      .update-flash-more-list[hidden] {
        display: none;
      }

      .update-flash-original {
        font-size: 0.88rem;
        color: var(--accent-deep);
        font-weight: 700;
      }

      .hero-home .hero-copy,
      .hero-home .hero-panel {
        min-height: 100%;
      }

      .panel-head-tight {
        margin-bottom: 12px;
      }

      .section-intro {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 18px;
      }

      .section-intro p {
        margin: 0;
        max-width: 72ch;
        color: var(--muted);
        line-height: 1.8;
      }

      .panel-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--accent-deep);
        font-weight: 800;
      }

      .panel-link::after {
        content: "→";
      }

      .export-preview ul {
        margin: 0;
        padding: 18px 18px 0;
        list-style: none;
      }

      .export-preview li {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 0;
        border-top: 1px solid var(--line);
      }

      .export-preview li:first-child {
        border-top: 0;
        padding-top: 0;
      }

      .panel {
        margin-bottom: 20px;
      }

      .results-panel {
        margin-top: 20px;
      }

      .empty-state {
        margin-top: 14px;
        padding: 18px;
        border: 1px dashed rgba(15, 61, 127, 0.18);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.46);
        color: var(--muted);
        line-height: 1.75;
      }

      .muted-note {
        color: var(--muted);
        line-height: 1.7;
      }

      .panel-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-end;
        margin-bottom: 16px;
      }

      .scenario-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }

      .wizard-layout {
        display: grid;
        grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }

      .starter-persona-panel {
        display: grid;
        gap: 10px;
        margin-bottom: 16px;
      }

      .starter-persona-copy {
        display: grid;
        gap: 4px;
      }

      .starter-persona-copy strong {
        color: var(--accent-deep);
        font-size: 0.96rem;
      }

      .starter-persona-copy span {
        color: var(--muted);
        line-height: 1.7;
      }

      .starter-persona-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px;
      }

      .starter-persona-chip {
        display: grid;
        gap: 4px;
        padding: 12px 14px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.86);
        text-align: left;
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          background 180ms ease;
      }

      .starter-persona-chip:hover,
      .starter-persona-chip:focus-visible {
        transform: translateY(-1px);
        border-color: rgba(15, 61, 127, 0.24);
        background: rgba(239, 246, 255, 0.92);
      }

      .starter-persona-chip strong {
        color: var(--accent-deep);
        font-size: 0.92rem;
        line-height: 1.45;
      }

      .starter-persona-chip span {
        color: var(--muted);
        font-size: 0.82rem;
        line-height: 1.55;
      }

      .wizard-filter-bar {
        display: grid;
        gap: 12px;
        margin-bottom: 16px;
      }

      .wizard-filter-copy {
        display: grid;
        gap: 4px;
      }

      .wizard-filter-copy strong {
        color: var(--accent-deep);
        font-size: 0.96rem;
      }

      .wizard-filter-copy span {
        color: var(--muted);
        line-height: 1.7;
      }

      .wizard-filter-shell {
        display: grid;
        justify-items: start;
        gap: 8px;
        width: 100%;
        padding: 10px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: rgba(255, 255, 255, 0.78);
      }

      .wizard-filter-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        max-width: 100%;
      }

      .wizard-filter-toolbar .chip {
        background: rgba(255, 255, 255, 0.96);
        box-shadow: none;
      }

      .wizard-filter-toolbar .chip.active {
        background: var(--accent-deep);
        box-shadow: none;
      }

      .quick-filter-coins {
        display: grid;
        grid-template-columns: repeat(var(--quick-region-count), minmax(0, 1fr));
        align-items: center;
        gap: 4px;
        width: 100%;
        max-width: 100%;
        overflow: hidden;
      }

      .quick-coin {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-width: 0;
        min-height: 40px;
        padding: 0 8px;
        border: 1px solid rgba(15, 61, 127, 0.14);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.96);
        color: var(--accent-deep);
        text-align: center;
        white-space: nowrap;
        flex: 0 0 auto;
        cursor: pointer;
        transition:
          transform 160ms ease,
          border-color 160ms ease,
          background 160ms ease;
      }

      .quick-coin:hover,
      .quick-coin:focus-visible {
        transform: translateY(-1px);
        border-color: rgba(15, 61, 127, 0.24);
      }

      .quick-coin.is-selected {
        border-color: rgba(10, 44, 93, 0.88);
        background: var(--accent-deep);
        color: #fff9f5;
      }

      .quick-coin-label {
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.01em;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .quick-coin.is-selected .quick-coin-label {
        color: #fff9f5;
      }

      .wizard-filter-selection {
        max-width: 100%;
        color: var(--muted);
        font-size: 0.92rem;
        line-height: 1.7;
      }

      .wizard-form,
      .wizard-results {
        display: grid;
        gap: 14px;
      }

      .wizard-section-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 2px;
      }

      .wizard-section-heading h3 {
        margin: 0;
        font-size: 1.14rem;
      }

      .wizard-form-group-heading {
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(15, 61, 127, 0.08);
      }

      .wizard-form-group-heading .panel-note {
        margin: 4px 0 0;
      }

      .wizard-form-group-heading-subtle {
        margin-top: 6px;
      }

      .direction-summary-section {
        display: grid;
        gap: 14px;
      }

      .direction-summary-cards {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .direction-summary-card {
        display: grid;
        gap: 12px;
        padding: 18px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: linear-gradient(180deg, rgba(252, 254, 255, 0.94), rgba(245, 249, 255, 0.82));
      }

      .direction-summary-head {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .direction-summary-head h3 {
        margin: 2px 0 0;
        font-size: 1.18rem;
      }

      .direction-summary-badge {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(15, 61, 127, 0.08);
        color: var(--accent-deep);
        font-size: 0.8rem;
        font-weight: 800;
      }

      .direction-summary-copy {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .direction-summary-pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .direction-summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .direction-summary-block {
        display: grid;
        gap: 8px;
        padding: 12px 14px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.78);
      }

      .direction-summary-label {
        color: var(--accent-deep);
        font-size: 0.82rem;
        font-weight: 800;
      }

      .direction-summary-list {
        display: grid;
        gap: 8px;
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
        line-height: 1.65;
      }

      .conclusion-summary-section {
        display: grid;
        gap: 14px;
      }

      .conclusion-summary-card {
        display: grid;
        gap: 12px;
        padding: 20px;
        border: 1px solid rgba(15, 61, 127, 0.14);
        border-radius: var(--radius-lg);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(243, 248, 255, 0.9));
      }

      .conclusion-summary-head {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .conclusion-summary-head h3 {
        margin: 2px 0 0;
        font-size: 1.28rem;
      }

      .conclusion-summary-copy {
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
      }

      .panel-collapsible {
        display: grid;
        gap: 0;
      }

      .panel-collapsible[open] .panel-collapsible-chevron {
        transform: rotate(180deg);
      }

      .panel-collapsible-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        list-style: none;
        cursor: pointer;
      }

      .panel-collapsible-summary::-webkit-details-marker {
        display: none;
      }

      .panel-collapsible-side {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .panel-collapsible-chevron {
        color: var(--accent-deep);
        font-size: 1rem;
        transition: transform 160ms ease;
      }

      .panel-collapsible-body {
        display: grid;
        gap: 14px;
        margin-top: 14px;
      }

      .special-pathway-section {
        display: grid;
        gap: 14px;
      }

      .special-pathway-cards {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .special-pathway-card {
        display: grid;
        gap: 12px;
        padding: 18px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: linear-gradient(180deg, rgba(251, 253, 255, 0.95), rgba(244, 248, 255, 0.88));
      }

      .special-pathway-head {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .special-pathway-head h3 {
        margin: 2px 0 0;
        font-size: 1.12rem;
      }

      .special-pathway-fit {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 800;
      }

      .special-pathway-fit.is-positive {
        background: rgba(33, 95, 79, 0.1);
        color: #215f4f;
      }

      .special-pathway-fit.is-partial {
        background: rgba(47, 110, 196, 0.1);
        color: var(--accent-deep);
      }

      .special-pathway-fit.is-neutral {
        background: rgba(181, 124, 46, 0.12);
        color: #8c4f00;
      }

      .special-pathway-copy {
        margin: 0;
        color: var(--muted);
        line-height: 1.68;
      }

      .special-pathway-pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .special-pathway-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .special-pathway-block,
      .special-pathway-compare-wrap {
        display: grid;
        gap: 8px;
        padding: 12px 14px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.8);
      }

      .special-pathway-label {
        color: var(--accent-deep);
        font-size: 0.82rem;
        font-weight: 800;
      }

      .special-pathway-list {
        display: grid;
        gap: 8px;
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
        line-height: 1.65;
      }

      .special-pathway-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .wizard-form {
        padding: 20px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: var(--surface);
        backdrop-filter: blur(10px);
      }

      .wizard-field {
        display: grid;
        gap: 8px;
        position: relative;
      }

      .wizard-field span {
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--accent-deep);
      }

      .wizard-field-label {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .required-mark {
        color: var(--accent);
        font-style: normal;
        font-size: 0.82rem;
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 52px;
        min-height: 26px;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(15, 61, 127, 0.08);
        border: 1px solid transparent;
        transition:
          background 160ms ease,
          color 160ms ease,
          border-color 160ms ease,
          box-shadow 160ms ease;
      }

      .wizard-field.is-missing .required-mark {
        color: #8c4f00;
        background: rgba(181, 124, 46, 0.14);
        border-color: rgba(181, 124, 46, 0.34);
        box-shadow: 0 0 0 3px rgba(181, 124, 46, 0.1);
      }

      .wizard-field select {
        width: 100%;
        padding: 14px 16px;
        border: 1px solid rgba(15, 61, 127, 0.14);
        border-radius: var(--radius-sm);
        background: rgba(255, 255, 255, 0.82);
        color: var(--text);
      }

      .wizard-field input {
        width: 100%;
        padding: 14px 16px;
        border: 1px solid rgba(15, 61, 127, 0.14);
        border-radius: var(--radius-sm);
        background: rgba(255, 255, 255, 0.82);
        color: var(--text);
      }

      .wizard-helper {
        color: var(--muted);
        font-size: 0.78rem;
        line-height: 1.55;
      }

      .wizard-empty,
      .wizard-result-card {
        display: grid;
        gap: 12px;
        padding: 22px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: var(--surface);
        backdrop-filter: blur(10px);
      }

      .wizard-empty strong {
        font-size: 1.06rem;
        line-height: 1.5;
      }

      .wizard-empty-warning {
        border-color: rgba(181, 124, 46, 0.24);
        background: linear-gradient(180deg, rgba(255, 249, 239, 0.96), rgba(255, 243, 222, 0.9));
      }

      .wizard-empty-badge {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(181, 124, 46, 0.16);
        color: #8c4f00;
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0.04em;
      }

      .wizard-empty-list {
        display: grid;
        gap: 6px;
        margin: 0;
        padding-left: 18px;
        color: var(--text);
      }

      .wizard-empty span,
      .wizard-result-system {
        color: var(--muted);
        line-height: 1.7;
      }

      .metro-fallback-note {
        display: grid;
        gap: 6px;
        padding: 14px 16px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-md);
        background: rgba(241, 247, 255, 0.92);
      }

      .metro-fallback-note strong {
        color: var(--accent-deep);
        font-size: 0.95rem;
      }

      .metro-fallback-note span {
        color: var(--muted);
        line-height: 1.7;
      }

      .wizard-freshness {
        margin: 0;
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.7;
      }

      .wizard-result-card h3 {
        margin: 0;
        font-size: 1.24rem;
        line-height: 1.4;
      }

      .wizard-result-lead {
        margin: 0;
        color: var(--text);
        line-height: 1.72;
        font-weight: 600;
      }

      .result-summary-stack {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 12px;
      }

      .result-summary-stack > * {
        width: 100% !important;
      }

      .route-reality-banner {
        display: grid;
        gap: 10px;
        align-items: start;
        padding: 14px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.82);
      }

      .route-reality-banner.is-positive {
        border-color: rgba(33, 95, 79, 0.18);
        background: linear-gradient(180deg, rgba(223, 240, 233, 0.82), rgba(255, 255, 255, 0.92));
      }

      .route-reality-banner.is-negative {
        border-color: rgba(138, 99, 42, 0.16);
        background: linear-gradient(180deg, rgba(248, 239, 224, 0.82), rgba(255, 255, 255, 0.92));
      }

      .route-reality-badge {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(15, 61, 127, 0.08);
        color: var(--accent-deep);
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.02em;
      }

      .route-reality-copy {
        display: grid;
        gap: 4px;
      }

      .route-reality-copy strong {
        color: var(--accent-deep);
        font-size: 0.95rem;
        line-height: 1.55;
      }

      .route-reality-copy p {
        margin: 0;
        color: var(--muted);
        line-height: 1.68;
      }

      .result-summary-card,
      .result-summary-block {
        display: grid;
        gap: 8px;
        width: 100%;
        padding: 14px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.78);
      }

      .result-summary-card strong,
      .result-summary-block strong {
        color: var(--accent-deep);
        font-size: 0.88rem;
      }

      .plan-variants-panel {
        display: grid;
        gap: 12px;
      }

      .plan-variants-head {
        display: grid;
        gap: 4px;
      }

      .plan-variant-grid {
        display: grid;
        gap: 12px;
      }

      .plan-variant-card {
        display: grid;
        gap: 8px;
        padding: 14px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.76);
      }

      .plan-variant-card strong {
        color: var(--accent-deep);
        font-size: 0.96rem;
      }

      .plan-variant-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
      }

      .plan-variant-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }

      .plan-variant-highlight {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(16, 128, 166, 0.1);
        color: #13607c;
        font-size: 0.82rem;
        font-weight: 800;
      }

      .plan-variant-stream {
        font-weight: 700;
        color: var(--accent-deep);
      }

      .eligibility-snapshot {
        display: grid;
        gap: 10px;
      }

      .eligibility-snapshot p {
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
      }

      .result-summary-list,
      .compact-action-list {
        display: grid;
        gap: 8px;
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
        line-height: 1.65;
      }

      .compact-action-list {
        list-style: none;
        padding-left: 0;
      }

      .compact-action-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        align-items: start;
      }

      .compact-action-copy {
        display: grid;
        gap: 3px;
      }

      .compact-action-copy strong {
        color: var(--text);
        font-size: 0.92rem;
      }

      .compact-action-copy p {
        margin: 0;
        color: var(--muted);
        font-size: 0.88rem;
        line-height: 1.55;
      }

      .result-details {
        display: grid;
        gap: 12px;
        padding-top: 4px;
        border-top: 1px solid rgba(15, 61, 127, 0.1);
      }

      .result-details summary {
        list-style: none;
        cursor: pointer;
        color: var(--accent-deep);
        font-weight: 800;
      }

      .result-details summary::-webkit-details-marker {
        display: none;
      }

      .wizard-card-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 126px;
        gap: 14px;
        align-items: start;
      }

      .wizard-card-title-stack {
        display: grid;
        min-width: 0;
      }

      .wizard-card-mini-map {
        justify-self: end;
        width: 126px;
        padding: 8px 10px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.9);
      }

      .mini-region-map {
        display: block;
        width: 100%;
        height: auto;
      }

      .mini-region-map text {
        display: none;
      }

      .mini-region-map .mini-region-shape,
      .mini-region-map .mini-region-shape path {
        fill: rgba(15, 61, 127, 0.08) !important;
        stroke: rgba(15, 61, 127, 0.2) !important;
        stroke-width: 8 !important;
        vector-effect: non-scaling-stroke;
      }

      .mini-region-map .mini-region-shape.is-active,
      .mini-region-map .mini-region-shape.is-active path {
        fill: var(--accent-strong) !important;
        stroke: var(--accent-deep) !important;
      }

      .selection-model-panel {
        display: grid;
        gap: 10px;
        padding: 16px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.72);
      }

      .title-interpretation-panel {
        display: grid;
        gap: 12px;
        padding: 16px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.76);
      }

      .title-interpretation-grid {
        display: grid;
        gap: 12px;
      }

      .title-interpretation-card {
        display: grid;
        gap: 8px;
        padding: 14px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(248, 251, 255, 0.88);
      }

      .title-interpretation-card strong {
        color: var(--accent-deep);
        font-size: 0.96rem;
      }

      .title-interpretation-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .selection-model-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .selection-model-head strong {
        color: var(--accent-deep);
        font-size: 0.96rem;
      }

      .selection-model-badge {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(15, 61, 127, 0.08);
        color: var(--accent-deep);
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.02em;
      }

      .selection-model-detail {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .selection-model-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .pathway-guide-panel {
        display: grid;
        gap: 10px;
        padding: 16px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.78);
      }

      .pathway-guide-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .pathway-guide-head strong {
        color: var(--accent-deep);
        font-size: 0.96rem;
      }

      .pathway-guide-badge {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(47, 110, 196, 0.1);
        color: var(--accent-deep);
        font-size: 0.8rem;
        font-weight: 800;
      }

      .pathway-guide-copy {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .pathway-guide-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .pathway-guide-block {
        display: grid;
        gap: 8px;
        padding: 12px 14px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.82);
      }

      .pathway-guide-label {
        color: var(--accent-deep);
        font-size: 0.82rem;
        font-weight: 800;
      }

      .pathway-factor-list,
      .pathway-compare-list {
        display: grid;
        gap: 8px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .pathway-factor-list {
        padding-left: 18px;
        list-style: disc;
        color: var(--muted);
        line-height: 1.65;
      }

      .pathway-compare-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        align-items: start;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(248, 251, 255, 0.88);
      }

      .pathway-compare-item.is-has {
        border: 1px solid rgba(33, 95, 79, 0.12);
      }

      .pathway-compare-item.is-partial {
        border: 1px solid rgba(15, 61, 127, 0.12);
      }

      .pathway-compare-item.is-missing {
        border: 1px solid rgba(181, 124, 46, 0.16);
      }

      .pathway-compare-state {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 62px;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 0.76rem;
        font-weight: 800;
      }

      .pathway-compare-item.is-has .pathway-compare-state {
        background: rgba(33, 95, 79, 0.12);
        color: var(--green);
      }

      .pathway-compare-item.is-partial .pathway-compare-state {
        background: rgba(15, 61, 127, 0.08);
        color: var(--accent-deep);
      }

      .pathway-compare-item.is-missing .pathway-compare-state {
        background: rgba(181, 124, 46, 0.14);
        color: #8c4f00;
      }

      .pathway-compare-copy {
        display: grid;
        gap: 4px;
      }

      .pathway-compare-copy strong {
        color: var(--text);
        font-size: 0.92rem;
      }

      .pathway-compare-copy p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .selection-model-stat {
        display: grid;
        gap: 4px;
        min-height: 74px;
        padding: 12px 14px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.82);
      }

      .selection-model-stat span {
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 700;
      }

      .selection-model-stat strong {
        color: var(--text);
        font-size: 0.92rem;
        line-height: 1.35;
      }

      .fit-band-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .ee-score-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .ee-reference-panel {
        display: grid;
        gap: 10px;
        padding: 16px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: linear-gradient(180deg, rgba(217, 230, 248, 0.5), rgba(255, 255, 255, 0.9));
      }

      .ee-reference-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .ee-reference-head strong {
        color: var(--accent-deep);
        font-size: 0.96rem;
      }

      .ee-reference-badge {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(15, 61, 127, 0.12);
        color: var(--accent-deep);
        font-weight: 800;
        white-space: nowrap;
      }

      .ee-reference-copy {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .fit-score {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        color: #fff;
        font-weight: 800;
      }

      .chance-score {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        background: var(--green-soft);
        color: var(--green);
        border: 1px solid rgba(33, 95, 79, 0.16);
        font-weight: 800;
      }

      .ee-score-pill,
      .ee-cutoff-pill,
      .ee-gap-pill {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        font-weight: 800;
      }

      .ee-score-pill {
        background: rgba(217, 230, 248, 0.76);
        color: var(--accent-deep);
      }

      .ee-cutoff-pill {
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(15, 61, 127, 0.12);
        color: var(--text);
      }

      .ee-gap-pill {
        border: 1px solid transparent;
      }

      .ee-gap-pill.is-positive {
        background: var(--green-soft);
        color: var(--green);
        border-color: rgba(33, 95, 79, 0.14);
      }

      .ee-gap-pill.is-negative {
        background: rgba(242, 228, 203, 0.72);
        color: #7a5515;
        border-color: rgba(122, 85, 21, 0.12);
      }

      .ee-gap-pill.is-neutral {
        background: rgba(255, 255, 255, 0.82);
        color: var(--muted);
        border-color: rgba(15, 61, 127, 0.12);
      }

      .career-check-panel {
        display: grid;
        gap: 8px;
        padding: 16px;
        border: 1px solid rgba(15, 61, 127, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.72);
      }

      .career-check-panel strong {
        color: var(--accent-deep);
        font-size: 0.96rem;
      }

      .career-check-list {
        margin-top: 0;
      }

      .improvement-panel {
        display: grid;
        gap: 10px;
        padding: 16px;
        border: 1px solid rgba(33, 95, 79, 0.14);
        border-radius: var(--radius-md);
        background: linear-gradient(180deg, rgba(211, 235, 227, 0.74), rgba(255, 255, 255, 0.9));
      }

      .improvement-head {
        display: grid;
        gap: 8px;
        justify-items: start;
      }

      .improvement-head strong {
        color: var(--green);
        font-size: 0.96rem;
      }

      .improvement-total {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.78);
        border: 1px solid rgba(33, 95, 79, 0.14);
        color: var(--green);
        font-weight: 800;
        max-width: 100%;
      }

      .improvement-list {
        display: grid;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .improvement-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        padding: 12px 14px;
        border: 1px solid rgba(33, 95, 79, 0.1);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.72);
      }

      .improvement-delta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 84px;
        min-height: 34px;
        padding: 0 10px;
        border-radius: 999px;
        font-weight: 800;
      }

      .improvement-delta.is-positive {
        background: var(--green);
        color: #f3fff5;
      }

      .improvement-delta.is-neutral {
        background: rgba(28, 61, 108, 0.08);
        color: var(--accent-deep);
      }

      .improvement-delta.is-deferred {
        background: rgba(191, 143, 68, 0.12);
        color: #8b611e;
      }

      .improvement-copy {
        display: grid;
        gap: 4px;
      }

      .improvement-title-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      .improvement-copy strong {
        color: var(--text);
        font-size: 0.95rem;
      }

      .improvement-score-impact {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 0.77rem;
        font-weight: 800;
        letter-spacing: -0.01em;
      }

      .improvement-score-impact.is-positive {
        background: rgba(33, 95, 79, 0.12);
        color: var(--green);
      }

      .improvement-score-impact.is-neutral {
        background: rgba(28, 61, 108, 0.08);
        color: var(--accent-deep);
      }

      .improvement-score-impact.is-deferred {
        background: rgba(191, 143, 68, 0.12);
        color: #8b611e;
      }

      .improvement-copy p {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .reason-columns {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .reason-columns strong {
        display: block;
        margin-bottom: 6px;
        color: var(--accent-deep);
        font-size: 0.9rem;
      }

      .reason-list {
        display: grid;
        gap: 8px;
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
        line-height: 1.7;
      }

      .scenario-card,
      .decision-card {
        display: grid;
        gap: 12px;
        padding: 22px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: var(--surface);
        backdrop-filter: blur(10px);
      }

      .scenario-card h3,
      .decision-card h3 {
        margin: 0;
        font-size: 1.22rem;
        line-height: 1.45;
      }

      .scenario-card p,
      .decision-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.75;
      }

      .scenario-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .scenario-chip {
        display: grid;
        gap: 4px;
        min-width: 150px;
        padding: 12px 14px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.76);
        transition:
          transform 180ms ease,
          border-color 180ms ease,
          box-shadow 180ms ease;
      }

      .scenario-chip:hover,
      .scenario-chip:focus-visible {
        transform: translateY(-2px);
        border-color: rgba(15, 61, 127, 0.24);
        box-shadow: 0 16px 30px rgba(15, 61, 127, 0.12);
      }

      .scenario-chip strong {
        font-size: 0.98rem;
      }

      .scenario-chip span {
        color: var(--muted);
        font-size: 0.86rem;
        line-height: 1.5;
      }

      .table-wrap {
        overflow-x: auto;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: rgba(255, 255, 255, 0.6);
      }

      .compare-table {
        width: 100%;
        min-width: 980px;
        border-collapse: collapse;
      }

      .compare-table th,
      .compare-table td {
        padding: 16px 18px;
        border-bottom: 1px solid rgba(15, 61, 127, 0.1);
        text-align: left;
        vertical-align: top;
      }

      .compare-table th {
        position: sticky;
        top: 0;
        z-index: 1;
        background: rgba(237, 244, 252, 0.96);
        font-size: 0.88rem;
        letter-spacing: 0.04em;
      }

      .compare-table tbody tr:hover {
        background: rgba(217, 230, 248, 0.2);
      }

      .table-link {
        color: var(--accent-deep);
        font-weight: 800;
      }

      .compare-pill {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(15, 61, 127, 0.08);
        color: var(--accent-deep);
        font-size: 0.82rem;
        font-weight: 800;
        white-space: nowrap;
      }

      .news-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }

      .news-card {
        display: grid;
        gap: 16px;
        border-radius: var(--radius-lg);
        transition:
          transform 180ms ease,
          box-shadow 180ms ease,
          border-color 180ms ease;
      }

      .card-topline,
      .status-line {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        margin-bottom: 12px;
      }

      .status-badge {
        background: rgba(15, 61, 127, 0.1);
        color: var(--accent-deep);
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .status-approved {
        background: var(--green-soft);
        color: var(--green);
      }

      .status-scheduled {
        background: var(--blue-soft);
        color: var(--blue);
      }

      .status-draft {
        background: rgba(181, 124, 46, 0.15);
        color: #8c5d1d;
      }

      .status-published {
        background: rgba(15, 61, 127, 0.12);
        color: var(--accent-deep);
      }

      .status-rejected {
        background: rgba(181, 124, 46, 0.18);
        color: #8c5d1d;
      }

      .mini-flag {
        background: rgba(47, 110, 196, 0.1);
        color: var(--blue);
      }

      .mini-flag.warning {
        background: rgba(181, 124, 46, 0.16);
        color: #8c5d1d;
      }

      .news-card h2,
      .studio-card h2 {
        margin: 0 0 12px;
        font-size: 1.35rem;
        line-height: 1.5;
      }

      .summary,
      .fact-list,
      .field span,
      .toolbar-field span {
        color: var(--muted);
      }

      .summary {
        min-height: 96px;
        margin: 0;
        line-height: 1.8;
      }

      .source-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
      }

      .overview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
        margin-bottom: 18px;
      }

      .decision-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .overview-card,
      .stream-group,
      .stream-card,
      .profile-note-panel {
        border: 1px solid rgba(15, 61, 127, 0.12);
        background: var(--surface);
        backdrop-filter: blur(10px);
      }

      .overview-card {
        display: grid;
        gap: 10px;
        padding: 18px;
        border-radius: var(--radius-md);
      }

      .overview-card span {
        color: var(--muted);
        font-size: 0.9rem;
      }

      .overview-card strong {
        font-size: 1.08rem;
        line-height: 1.5;
      }

      .stream-group-list {
        display: grid;
        gap: 16px;
      }

      .stream-group {
        padding: 22px;
        border-radius: var(--radius-lg);
      }

      .stream-group-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .stream-group h3,
      .profile-note-panel h3 {
        margin: 0;
        font-size: 1.45rem;
        line-height: 1.35;
      }

      .stream-group-copy {
        margin: 0;
        color: var(--muted);
        line-height: 1.75;
      }

      .stream-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 14px;
      }

      .stream-card {
        display: grid;
        gap: 12px;
        padding: 20px;
        border-radius: var(--radius-md);
      }

      .stream-card h4 {
        margin: 0;
        font-size: 1.08rem;
        line-height: 1.5;
      }

      .stream-tag-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .stream-tag {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(15, 61, 127, 0.08);
        color: var(--accent-deep);
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.04em;
      }

      .stream-meta {
        display: grid;
        gap: 4px;
        margin: 0;
      }

      .stream-meta strong {
        font-size: 0.82rem;
        color: var(--accent-deep);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .stream-meta span {
        color: var(--muted);
        line-height: 1.7;
      }

      .stream-link {
        margin-top: auto;
      }

      .glossary-panel {
        margin: 2px 0 18px;
        padding: 20px 22px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: rgba(255, 255, 255, 0.62);
      }

      .glossary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }

      .glossary-card {
        display: grid;
        gap: 10px;
        padding: 16px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-md);
        background: rgba(248, 251, 255, 0.84);
      }

      .glossary-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
      }

      .profile-note-panel {
        margin-top: 16px;
        padding: 20px 22px;
        border-radius: var(--radius-lg);
      }

      .note-list {
        display: grid;
        gap: 10px;
        margin: 12px 0 0;
        padding-left: 18px;
        color: var(--muted);
        line-height: 1.75;
      }

      .source-card {
        display: grid;
        gap: 16px;
        padding: 24px;
        border: 1px solid rgba(15, 61, 127, 0.12);
        border-radius: var(--radius-lg);
        background: var(--surface);
        backdrop-filter: blur(10px);
        box-shadow: 0 16px 40px rgba(15, 61, 127, 0.08);
      }

      .source-card h3 {
        margin: 0;
        font-size: 1.18rem;
        line-height: 1.5;
      }

      .source-meta {
        display: grid;
        gap: 6px;
        color: var(--muted);
        font-size: 0.94rem;
      }

      .fact-list {
        margin: 0 0 14px;
        padding-left: 18px;
        line-height: 1.7;
      }

      .card-footer {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding-top: 14px;
        border-top: 1px solid var(--line);
        color: var(--muted);
      }

      .card-links {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .card-links a {
        color: var(--accent-deep);
        font-weight: 700;
      }

      .pill-row {
        margin-bottom: 12px;
      }

      .pill {
        min-width: 120px;
        padding: 12px 14px;
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        background: var(--surface);
      }

      .pill span {
        display: block;
        color: var(--muted);
        font-size: 0.9rem;
      }

      .pill strong {
        display: block;
        margin-top: 4px;
        font-size: 1.3rem;
      }

      .toolbar-field,
      .field {
        display: grid;
        gap: 8px;
      }

      .toolbar-field select,
      .field input,
      .field textarea {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid rgba(15, 61, 127, 0.14);
        border-radius: var(--radius-sm);
        background: rgba(255, 255, 255, 0.84);
        color: var(--text);
      }

      .studio-list {
        display: grid;
        gap: 16px;
      }

      .studio-card {
        border-radius: var(--radius-lg);
        transition:
          transform 180ms ease,
          box-shadow 180ms ease,
          border-color 180ms ease;
      }

      .studio-card.stale {
        opacity: 0.82;
      }

      .studio-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 18px;
      }

      .source-link {
        align-self: flex-start;
        padding: 10px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        color: var(--accent-deep);
        background: rgba(255, 255, 255, 0.58);
      }

      .studio-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 16px;
      }

      .field.wide {
        grid-column: 1 / -1;
      }

      @media (max-width: 960px) {
        .hero,
        .studio-grid,
        .map-layout,
        .decision-grid,
        .wizard-layout {
          grid-template-columns: 1fr;
        }

        .direction-summary-cards,
        .special-pathway-cards,
        .direction-summary-grid,
        .special-pathway-grid,
        .result-summary-stack,
        .pathway-guide-grid,
        .reason-columns {
          grid-template-columns: 1fr;
        }

        .site-header {
          border-radius: 28px;
          padding: 18px;
        }

        .site-header-tools {
          width: 100%;
          justify-content: flex-start;
        }

        .site-nav {
          width: 100%;
          flex-wrap: nowrap;
          overflow-x: auto;
          padding-bottom: 2px;
        }
      }

      @media (max-width: 700px) {
        .page-shell {
          width: min(calc(100% - 20px), 1180px);
          padding: 16px 0 44px;
        }

        .panel-head,
        .card-footer,
        .studio-head,
        .section-intro,
        .stream-group-head {
          flex-direction: column;
          align-items: flex-start;
        }

        .summary {
          min-height: auto;
        }

        .hero-copy,
        .hero-panel,
        .section,
        .news-card,
        .studio-card {
          padding: 22px;
        }

        .hero-stats {
          grid-template-columns: 1fr;
        }

        .map-shell {
          padding: 12px;
        }

        .map-landing {
          min-height: auto;
        }

        .map-landing-shell {
          padding: 14px;
          border-radius: 26px;
        }

        .map-frame-landing {
          min-height: auto;
          padding: 20px 16px 16px;
        }

        .map-floating-chip {
          position: static;
          margin-bottom: 12px;
          width: fit-content;
        }

        .actual-map text {
          font-size: 0.86em;
        }

        .compare-table {
          min-width: 760px;
        }

        .update-flash-summary {
          grid-template-columns: 1fr auto 18px;
          grid-template-areas:
            "jurisdiction date chevron"
            "title title title";
          row-gap: 8px;
        }

        .update-flash-jurisdiction {
          grid-area: jurisdiction;
        }

        .update-flash-date {
          grid-area: date;
          justify-self: end;
        }

        .update-flash-summary strong {
          grid-area: title;
        }

        .update-flash-chevron {
          grid-area: chevron;
          justify-self: end;
        }

        .wizard-card-header {
          grid-template-columns: 1fr;
        }

        .wizard-card-mini-map {
          justify-self: start;
          width: 112px;
        }

        .wizard-section-heading {
          align-items: flex-start;
        }

        .panel-collapsible-summary {
          align-items: flex-start;
          flex-direction: column;
        }

        .panel-collapsible-side {
          justify-content: flex-start;
        }

        .selection-model-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="page-shell">
      ${renderNav(page, basePath)}
      ${body}
    </div>
    ${renderClientScript({ page, updates, basePath, analyticsMeasurementId })}
  </body>
</html>`;
}

export function renderDashboard({
  generatedAt,
  updates,
  reports = [],
  page = "dashboard",
  jurisdictionId = null,
  basePath = "",
  analyticsMeasurementId = ""
}) {
  if (page === "jurisdiction") {
    const meta = getJurisdictionMeta(jurisdictionId ?? "federal");

    return renderLayout({
      title: `MapleGuide | ${meta.labelKo}`,
      page,
      body: renderJurisdictionPage({
        jurisdictionId: meta.id,
        generatedAt,
        updates,
        reports,
        basePath
      }),
      updates,
      basePath,
      analyticsMeasurementId
    });
  }

  return renderLayout({
    title: "MapleGuide | Dashboard",
    page: "dashboard",
    body: renderDashboardPage({
      generatedAt,
      updates,
      reports,
      basePath
    }),
    updates,
    basePath,
    analyticsMeasurementId
  });
}
