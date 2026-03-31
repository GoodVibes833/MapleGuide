#!/usr/bin/env node
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJsonFile } from "./core/json-store.js";
import { runPipeline } from "./core/pipeline.js";
import { KNOWN_JURISDICTION_IDS, renderDashboard } from "./site/render-dashboard.js";

function parseArgs(argv) {
  const options = {
    host: "127.0.0.1",
    port: 3000,
    outputDir: path.join(process.cwd(), "out"),
    useFixtures: false,
    analyticsMeasurementId: process.env.MAPLEGUIDE_GA_MEASUREMENT_ID ?? ""
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fixtures") {
      options.useFixtures = true;
      continue;
    }

    if (arg === "--port" && argv[index + 1]) {
      options.port = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--host" && argv[index + 1]) {
      options.host = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--out" && argv[index + 1]) {
      options.outputDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--ga-id" && argv[index + 1]) {
      options.analyticsMeasurementId = argv[index + 1];
      index += 1;
    }
  }

  return options;
}

async function parseJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function respondJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function respondHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    "content-type": "text/html; charset=utf-8"
  });
  response.end(html);
}

async function loadSiteState(outputDir) {
  const feed = await readJsonFile(path.join(outputDir, "feed.json"), null);
  return { feed };
}

async function ensureInitialBuild({ outputDir, useFixtures, analyticsMeasurementId }) {
  const feed = await readJsonFile(path.join(outputDir, "feed.json"), null);
  if (!feed) {
    await runPipeline({ outputDir, useFixtures, analyticsMeasurementId });
  }
}

export async function createRequestHandler({
  host = "127.0.0.1",
  port = 3000,
  outputDir = path.join(process.cwd(), "out"),
  useFixtures = false,
  analyticsMeasurementId = process.env.MAPLEGUIDE_GA_MEASUREMENT_ID ?? ""
} = {}) {
  await ensureInitialBuild({ outputDir, useFixtures, analyticsMeasurementId });

  return async function handleRequest(request, response) {
    try {
      const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);

      if (request.method === "GET" && url.pathname === "/health") {
        return respondJson(response, 200, { ok: true });
      }

      if (request.method === "POST" && url.pathname === "/api/refresh") {
        const body = await parseJsonBody(request);
        const result = await runPipeline({
          outputDir,
          useFixtures: typeof body.useFixtures === "boolean" ? body.useFixtures : useFixtures,
          analyticsMeasurementId
        });

        return respondJson(response, 200, {
          ok: true,
          generatedAt: result.generatedAt,
          updateCount: result.updateCount
        });
      }

      if (request.method === "GET" && url.pathname === "/") {
        const state = await loadSiteState(outputDir);

        return respondHtml(
          response,
          200,
          renderDashboard({
            generatedAt: state.feed.generatedAt,
            updates: state.feed.updates,
            reports: state.feed.reports,
            page: "dashboard",
            analyticsMeasurementId
          })
        );
      }

      const regionMatch = url.pathname.match(/^\/region\/([^/]+)\/?$/);
      if (request.method === "GET" && regionMatch) {
        const jurisdictionId = decodeURIComponent(regionMatch[1]);
        if (!KNOWN_JURISDICTION_IDS.has(jurisdictionId)) {
          return respondJson(response, 404, {
            ok: false,
            error: "Unknown jurisdiction"
          });
        }

        const state = await loadSiteState(outputDir);
        return respondHtml(
          response,
          200,
          renderDashboard({
            generatedAt: state.feed.generatedAt,
            updates: state.feed.updates,
            reports: state.feed.reports,
            page: "jurisdiction",
            jurisdictionId,
            analyticsMeasurementId
          })
        );
      }

      return respondJson(response, 404, {
        ok: false,
        error: "Not found"
      });
    } catch (error) {
      return respondJson(response, 500, {
        ok: false,
        error: String(error)
      });
    }
  };
}

export async function startServer({
  host = "127.0.0.1",
  port = 3000,
  outputDir = path.join(process.cwd(), "out"),
  useFixtures = false,
  analyticsMeasurementId = process.env.MAPLEGUIDE_GA_MEASUREMENT_ID ?? ""
} = {}) {
  const handler = await createRequestHandler({
    host,
    port,
    outputDir,
    useFixtures,
    analyticsMeasurementId
  });
  const server = http.createServer((request, response) => {
    handler(request, response);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const baseUrl = `http://${host}:${actualPort}`;

  return {
    server,
    baseUrl,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      })
  };
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  const options = parseArgs(process.argv.slice(2));
  const app = await startServer(options);
  console.log(
    JSON.stringify(
      {
        ok: true,
        url: app.baseUrl,
        outputDir: options.outputDir,
        fixtureMode: options.useFixtures,
        analyticsEnabled: Boolean(options.analyticsMeasurementId)
      },
      null,
      2
    )
  );
}
