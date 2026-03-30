import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function cloneFallback(fallbackValue) {
  return JSON.parse(JSON.stringify(fallbackValue));
}

export async function readJsonFile(filePath, fallbackValue = null) {
  try {
    const contents = await readFile(filePath, "utf8");
    return JSON.parse(contents);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return fallbackValue === null ? null : cloneFallback(fallbackValue);
    }
    throw error;
  }
}

export async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2));
}
