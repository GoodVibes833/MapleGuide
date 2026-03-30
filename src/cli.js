#!/usr/bin/env node
import path from "node:path";
import { runPipeline } from "./core/pipeline.js";

function parseArgs(argv) {
  const options = {
    useFixtures: false,
    outputDir: path.join(process.cwd(), "out"),
    sourceIds: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fixtures") {
      options.useFixtures = true;
      continue;
    }

    if (arg === "--out" && argv[index + 1]) {
      options.outputDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--source" && argv[index + 1]) {
      options.sourceIds = argv[index + 1]
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
    }
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));
const result = await runPipeline(options);

console.log(
  JSON.stringify(
    {
      generatedAt: result.generatedAt,
      sourcesProcessed: result.reports.length,
      updatesWritten: result.updateCount,
      outputDir: options.outputDir,
      fixtureMode: options.useFixtures
    },
    null,
    2
  )
);
