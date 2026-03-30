import { access, readFile } from "node:fs/promises";
import path from "node:path";

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadSourceContent(
  source,
  { useFixtures = false, fixtureDir = path.join(process.cwd(), "fixtures"), fetchImpl = fetch } = {}
) {
  const fetchedAt = new Date().toISOString();
  const fixturePath = path.join(fixtureDir, `${source.fixtureName ?? source.id}.html`);

  if (useFixtures) {
    const html = await readFile(fixturePath, "utf8");
    return {
      html,
      fetchedAt,
      mode: "fixture",
      fixturePath
    };
  }

  try {
    const response = await fetchImpl(source.url, {
      headers: {
        "user-agent": "canada-immigration-monitor/0.1 (+https://example.local)"
      },
      signal: AbortSignal.timeout(30_000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return {
      html: await response.text(),
      fetchedAt,
      mode: "network"
    };
  } catch (error) {
    if (await fileExists(fixturePath)) {
      const html = await readFile(fixturePath, "utf8");
      return {
        html,
        fetchedAt,
        mode: "fixture-fallback",
        fixturePath,
        warning: String(error)
      };
    }

    return {
      error,
      fetchedAt,
      mode: "network-error"
    };
  }
}
