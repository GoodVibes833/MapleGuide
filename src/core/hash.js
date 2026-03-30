import { createHash } from "node:crypto";

export function contentHash(value) {
  return createHash("sha256").update(value).digest("hex");
}
