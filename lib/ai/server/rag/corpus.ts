import "server-only";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { buildIndex, type IndexedChunk } from "./index";

export const APPROVED_RAG_SOURCES = Object.freeze([
  "docs/ai/README.md",
  "docs/ai/PRIVACY.md",
  "docs/ai/THREAT_MODEL.md",
  "docs/ai/RAG_SOURCES.md",
  "docs/ai/OPERATIONS.md",
  "docs/ai/ROLLOUT.md",
]);

export function assertApprovedSource(root: string, path: string): string {
  const absolute = resolve(root, path);
  const rel = relative(resolve(root), absolute).replace(/\\/g, "/");
  if (isAbsolute(rel) || rel.startsWith("../") || !APPROVED_RAG_SOURCES.includes(rel)) {
    throw new Error("Unapproved RAG source");
  }
  return absolute;
}

let cached: Promise<IndexedChunk[]> | undefined;
export function loadApprovedCorpus(root = process.cwd()): Promise<IndexedChunk[]> {
  if (!cached) cached = Promise.all(APPROVED_RAG_SOURCES.map(async (sourcePath) => {
    const content = await readFile(assertApprovedSource(root, sourcePath), "utf8");
    const version = createHash("sha256").update(content).digest("hex").slice(0, 16);
    return { documentId: sourcePath.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase(), version, sourcePath, content };
  })).then(buildIndex);
  return cached;
}

export function resetCorpusCacheForTests() { cached = undefined; }
